import { expect, test, type Page } from "@playwright/test";
import { createUser, hasStack, uniqueEmail } from "./support/supabase";
import { CSV_TEMPLATE } from "../src/features/bank/question";

// Phase 3, through the screens, against the local Supabase stack.
test.skip(!hasStack, "needs the local Supabase stack (npm run db:start)");

const PASSWORD = "correct-horse-battery";

async function signInAs(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /^Hello/ })).toBeVisible();
}

test("a teacher builds and publishes a test; a student joins and sees it", async ({ browser }) => {
  const teacherEmail = uniqueEmail("teacher");
  const studentEmail = uniqueEmail("student");
  await createUser({
    email: teacherEmail,
    password: PASSWORD,
    fullName: "Tess Teacher",
    teacher: true,
  });
  await createUser({ email: studentEmail, password: PASSWORD, fullName: "Sam Student" });

  const teacher = await (await browser.newContext()).newPage();
  await signInAs(teacher, teacherEmail);

  // A class.
  await teacher.getByLabel("New class").fill("Physics 1");
  await teacher.getByRole("button", { name: "Create" }).click();
  await expect(teacher.getByRole("heading", { name: "Physics 1" })).toBeVisible();
  const code = (await teacher.locator("strong.font-mono").textContent())!.trim();
  expect(code).toMatch(/^[A-Z2-9]{8}$/);

  // Six questions of five types, from the CSV template.
  await teacher.goto("/app/bank");
  await teacher.getByLabel("CSV file").setInputFiles({
    name: "questions.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(CSV_TEMPLATE),
  });
  await expect(teacher.getByText("Added 6 questions.")).toBeVisible();

  // A test with three of them, open now.
  await teacher.goto("/app");
  await teacher.getByRole("link", { name: "Physics 1" }).click();
  await teacher.getByRole("button", { name: "New test" }).click();
  await expect(teacher.getByRole("heading", { name: "Untitled test" })).toBeVisible();
  await teacher.getByLabel("Title", { exact: true }).fill("Week 1 quiz");
  const now = new Date(Date.now() - 60_000);
  const later = new Date(Date.now() + 86_400_000);
  const local = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  await teacher.getByLabel("Opens", { exact: true }).fill(local(now));
  await teacher.getByLabel("Closes", { exact: true }).fill(local(later));
  await teacher.getByRole("button", { name: "Save details" }).click();
  await expect(teacher.getByText("Saved.")).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await teacher.getByRole("button", { name: "Add", exact: true }).first().click();
    await expect(
      teacher.getByRole("heading", { name: `Questions (${i + 1},`, exact: false }),
    ).toBeVisible();
  }
  await teacher.getByLabel("A phone as a side camera").check();
  await expect(teacher.getByLabel("A phone as a side camera")).toBeChecked();
  await teacher.getByRole("button", { name: "Publish to the class" }).click();
  await expect(teacher.getByRole("heading", { name: "Published" })).toBeVisible();

  // The student joins and sees it open.
  const student = await (await browser.newContext()).newPage();
  await signInAs(student, studentEmail);
  await student.getByLabel("Join a class").fill(code.toLowerCase());
  await student.getByRole("button", { name: "Join" }).click();
  await expect(student.getByText("You joined Physics 1.")).toBeVisible();
  await student.getByRole("link", { name: "Physics 1" }).click();
  await expect(student.getByRole("heading", { name: "Open now" })).toBeVisible();
  await expect(student.getByText("Week 1 quiz")).toBeVisible();

  // And cannot open the builder.
  await student.goto(teacher.url());
  await expect(student.getByRole("heading", { name: "You don't have access" })).toBeVisible();
});
