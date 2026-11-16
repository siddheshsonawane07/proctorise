import { expect, test, type Page } from "./support/test";
import { asUser, createUser, hasStack, rpcAs, signIn, uniqueEmail } from "./support/supabase";

// Managing what exists, through the screens, against the local Supabase stack: a teacher edits,
// cancels, reopens, copies and deletes a test and a class; a student leaves; a teacher uses the
// student side; the admin has only the admin's pages.
test.skip(!hasStack, "needs the local Supabase stack (npm run db:start)");
test.setTimeout(120_000);

const PASSWORD = "correct-horse-battery";

async function signInAs(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /^(Classes|Admin)$/ })).toBeVisible();
}

/** A teacher with a class, made through the API; returns the teacher's token and the class. */
async function teacherWithClass(className: string) {
  const email = uniqueEmail("teacher");
  await createUser({ email, password: PASSWORD, fullName: "Tess Teacher", teacher: true });
  const token = (await signIn(email, PASSWORD)).access_token;
  const classId = await rpcAs<string>(token, "create_class", { p_name: className });
  const rows = (await (
    await asUser(token, `/rest/v1/classes?id=eq.${classId}&select=join_code`)
  ).json()) as { join_code: string }[];
  return { email, token, classId, code: rows[0]!.join_code };
}

test("a teacher manages a published test and the class; a student leaves", async ({ browser }) => {
  const { email: teacherEmail, token, classId, code } = await teacherWithClass("Chemistry 10");
  const studentEmail = uniqueEmail("student");
  await createUser({ email: studentEmail, password: PASSWORD, fullName: "Sam Student" });
  const student = (await signIn(studentEmail, PASSWORD)).access_token;
  await rpcAs(student, "join_class", { p_code: code });

  const question = await rpcAs<string>(token, "save_question", {
    p_id: null,
    p_type: "true_false",
    p_prompt: "Water is H2O.",
    p_options: [],
    p_points: 1,
    p_tags: [],
    p_correct: true,
  });
  const created = await asUser(token, "/rest/v1/tests", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      class_id: classId,
      title: "Unit quiz",
      opens_at: new Date(Date.now() - 60_000).toISOString(),
      closes_at: new Date(Date.now() + 86_400_000).toISOString(),
    }),
  });
  const testId = ((await created.json()) as { id: string }[])[0]!.id;
  await asUser(token, "/rest/v1/test_questions", {
    method: "POST",
    body: JSON.stringify({ test_id: testId, question_id: question, position: 0 }),
  });
  await rpcAs(token, "publish_test", { p_test_id: testId });

  const teacher = await (await browser.newContext()).newPage();
  const pupil = await (await browser.newContext()).newPage();
  await signInAs(teacher, teacherEmail);
  await signInAs(pupil, studentEmail);

  // Edit a published test's details.
  await teacher.goto(`/app/tests/${testId}/edit`);
  await expect(teacher.getByRole("heading", { name: "Published" })).toBeVisible();
  await teacher.getByLabel("Title", { exact: true }).fill("Unit quiz (moved)");
  await teacher.getByLabel("Time allowed (minutes)").fill("45");
  await teacher.getByRole("button", { name: "Save details" }).click();
  await expect(teacher.getByText("Saved.")).toBeVisible();
  await expect(teacher.getByRole("heading", { name: "Unit quiz (moved)" })).toBeVisible();

  // The student sees the new title, open.
  await pupil.getByRole("main").getByRole("link", { name: "Chemistry 10" }).click();
  await expect(pupil.getByRole("heading", { name: "Chemistry 10" })).toBeVisible();
  await expect(pupil.getByRole("heading", { name: "Open now" })).toBeVisible();
  await expect(pupil.getByText("Unit quiz (moved)", { exact: true })).toBeVisible();
  await expect(pupil.getByText(/45\s+minutes/)).toBeVisible();

  // Cancel: the student can no longer start it.
  await teacher.getByRole("button", { name: "Cancel this test" }).click();
  await teacher.getByRole("button", { name: "Yes, cancel it" }).click();
  await expect(teacher.getByRole("heading", { name: "Cancelled" })).toBeVisible();
  await pupil.reload();
  await expect(pupil.getByRole("heading", { name: "Cancelled by your teacher" })).toBeVisible();
  await expect(pupil.getByRole("link", { name: "Start" })).toHaveCount(0);
  await pupil.goto(`/app/take/${testId}`);
  await expect(pupil.getByText("Your teacher cancelled this test.")).toBeVisible();

  // Reopen: it is open again.
  await teacher.getByRole("button", { name: "Reopen this test" }).click();
  await expect(teacher.getByRole("heading", { name: "Published" })).toBeVisible();
  await pupil.goto(`/app/classes/${classId}`);
  await expect(pupil.getByRole("link", { name: "Start" })).toBeVisible();

  // A copy is a draft; deleting it returns to the class.
  await teacher.getByRole("button", { name: "Make a copy" }).click();
  await expect(teacher.getByRole("heading", { name: "Copy of Unit quiz (moved)" })).toBeVisible();
  await expect(teacher.getByRole("heading", { name: "Questions (1, 1 points)" })).toBeVisible();
  await teacher.getByRole("button", { name: "Delete", exact: true }).click();
  await teacher.getByRole("button", { name: "Yes, delete it" }).click();
  await expect(teacher.getByRole("heading", { name: "Chemistry 10" })).toBeVisible();
  await expect(teacher.getByText("Copy of Unit quiz (moved)")).toHaveCount(0);

  // Delete the published test from the class's list.
  const row = teacher.getByRole("listitem").filter({ hasText: "Unit quiz (moved)" });
  await row.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(row.getByText(/answers, results and pictures/)).toBeVisible();
  await row.getByRole("button", { name: "Yes, delete it" }).click();
  await expect(teacher.getByText("No tests yet.")).toBeVisible();

  // The student leaves; the teacher's list keeps them, marked as left.
  await pupil.reload();
  await pupil.getByRole("button", { name: "Leave this class" }).click();
  await pupil.getByRole("button", { name: "Yes, leave" }).click();
  await expect(pupil.getByText("Classes you join will appear here.")).toBeVisible();
  await teacher.getByRole("tab", { name: "People" }).click();
  await teacher.getByRole("button", { name: /^Left/ }).click();
  await expect(teacher.getByRole("row").filter({ hasText: "Sam Student" })).toBeVisible();

  // Rename the class, then delete it by typing its name.
  await teacher.getByRole("tab", { name: "Settings" }).click();
  await teacher.getByLabel("Class name").fill("Chemistry 10 B");
  await teacher.getByLabel("Description for students (optional)").fill("Tuesdays, room 4");
  await teacher.getByRole("button", { name: "Save", exact: true }).click();
  await expect(teacher.getByRole("heading", { name: "Chemistry 10 B" })).toBeVisible();
  await expect(teacher.getByText("Tuesdays, room 4").first()).toBeVisible();
  await teacher.getByRole("button", { name: "Delete this class" }).click();
  const gone = teacher.getByRole("button", { name: "Delete the class" });
  await expect(gone).toBeDisabled();
  await teacher.getByLabel(/to confirm/).fill("Chemistry 10 B");
  await gone.click();
  await expect(teacher.getByText("Classes you teach will appear here.")).toBeVisible();
});

test("a teacher switches to the student side to join another teacher's class", async ({ page }) => {
  const other = await teacherWithClass("History 9");
  const email = uniqueEmail("both");
  await createUser({ email, password: PASSWORD, fullName: "Bo Both", teacher: true });
  await signInAs(page, email);

  await expect(page.getByRole("button", { name: "Create class" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Join class" })).toHaveCount(0);
  const menu = page.getByRole("complementary");
  await menu.getByRole("button", { name: "Student" }).click();
  await expect(page.getByRole("button", { name: "Create class" })).toHaveCount(0);
  await page.getByRole("button", { name: "Join class" }).click();
  await page.getByLabel("Class code").fill(other.code);
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page.getByText("You joined History 9.")).toBeVisible();

  // The choice survives a reload, and switching back shows only the teaching side.
  await page.reload();
  await expect(page.getByRole("main").getByRole("link", { name: "History 9" })).toBeVisible();
  await menu.getByRole("button", { name: "Teacher" }).click();
  await expect(page.getByText("Classes you teach will appear here.")).toBeVisible();
  await expect(page.getByRole("link", { name: "History 9" })).toHaveCount(0);

  // Added as a co-teacher elsewhere, they can take themselves off again.
  await rpcAs(other.token, "add_co_teacher", { p_class_id: other.classId, p_email: email });
  await page.reload();
  await expect(page.getByText("Co-teacher")).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "History 9" }).click();
  await page.getByRole("tab", { name: "People" }).click();
  await page.getByRole("button", { name: "Leave this class" }).click();
  await page.getByRole("button", { name: "Yes, leave" }).click();
  await expect(page.getByText("Classes you teach will appear here.")).toBeVisible();

  // The owner cannot join their own class as a student.
  const refused = await rpcAs<{ joined: boolean; reason: string }>(other.token, "join_class", {
    p_code: other.code,
  });
  expect(refused).toEqual({ joined: false, reason: "teacher" });
});

test("the admin has only the admin's pages, and hands over or deletes any class", async ({
  page,
}) => {
  const owner = await teacherWithClass("Orphaned class");
  const heirEmail = uniqueEmail("heir");
  await createUser({ email: heirEmail, password: PASSWORD, fullName: "Hari Heir", teacher: true });
  const adminEmail = uniqueEmail("admin");
  await createUser({ email: adminEmail, password: PASSWORD, fullName: "Ada Admin", admin: true });

  // The database, not the menu, is what stops the admin teaching.
  const admin = (await signIn(adminEmail, PASSWORD)).access_token;
  await expect(rpcAs(admin, "create_class", { p_name: "Mine" })).rejects.toThrow(/403/);
  await expect(rpcAs(admin, "join_class", { p_code: owner.code })).rejects.toThrow(/403/);

  await signInAs(page, adminEmail);
  const menu = page.getByRole("complementary");
  await expect(menu.getByRole("link", { name: "Classes" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Question bank" })).toHaveCount(0);
  await expect(menu.getByRole("link", { name: "Your photo" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Join class" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Create class" })).toHaveCount(0);

  await menu.getByRole("link", { name: "Classes" }).click();
  const item = page.getByRole("listitem").filter({ hasText: "Orphaned class" });
  const mine = item.filter({ hasText: owner.email });
  await expect(mine).toBeVisible();
  await mine.getByRole("button", { name: "Hand over to another teacher" }).click();
  await mine.getByLabel(/New owner's email/).fill(heirEmail);
  await mine.getByRole("button", { name: "Hand over", exact: true }).click();
  const theirs = item.filter({ hasText: heirEmail });
  await expect(theirs).toBeVisible();

  await theirs.getByRole("button", { name: "Delete", exact: true }).click();
  await theirs.getByLabel(/to confirm/).fill("Orphaned class");
  await theirs.getByRole("button", { name: "Delete the class" }).click();
  await expect(item.filter({ hasText: heirEmail })).toHaveCount(0);
});
