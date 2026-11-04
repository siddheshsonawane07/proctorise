import { expect, test } from "@playwright/test";
import {
  asUser,
  createUser,
  hasStack,
  latestEmailLink,
  signIn,
  uniqueEmail,
} from "./support/supabase";

// Phase 2's gate, against the local Supabase stack. Skipped where no stack is running.
test.skip(!hasStack, "needs the local Supabase stack (npm run db:start)");

const PASSWORD = "correct-horse-battery";

test("sign up, confirm by email, ask to teach, get approved by the admin", async ({ browser }) => {
  const studentEmail = uniqueEmail("student");
  const adminEmail = uniqueEmail("admin");
  await createUser({ email: adminEmail, password: PASSWORD, fullName: "Ada Admin", admin: true });

  const student = await (await browser.newContext()).newPage();
  await student.goto("/sign-up");
  await student.getByLabel("Your name").fill("Asha Student");
  await student.getByLabel("Email").fill(studentEmail);
  await student.getByLabel("Password").fill(PASSWORD);
  await student.getByLabel("I am 18 or older.").check();
  await student.getByRole("button", { name: "Create account" }).click();
  await expect(student.getByRole("heading", { name: "Check your email" })).toBeVisible();

  await student.goto(await latestEmailLink(studentEmail));
  await expect(student.getByRole("heading", { name: "Hello, Asha" })).toBeVisible();

  await student.getByLabel("School or institution").fill("City School");
  await student.getByRole("button", { name: "Ask for teacher access" }).click();
  await expect(student.getByText(/Your request is with the admin/)).toBeVisible();

  const admin = await (await browser.newContext()).newPage();
  await admin.goto("/sign-in?next=/app/admin/teachers");
  await admin.getByLabel("Email").fill(adminEmail);
  await admin.getByLabel("Password").fill(PASSWORD);
  await admin.getByRole("button", { name: "Sign in" }).click();
  const row = admin.getByRole("listitem").filter({ hasText: studentEmail });
  await row.getByRole("button", { name: "Approve" }).click();
  await expect(row.getByText("Make Asha Student a teacher?")).toBeVisible();
  await row.getByRole("button", { name: "Yes, approve" }).click();
  await expect(row).toBeHidden();

  await student.reload();
  await expect(student.getByText("Classes you teach will appear here.")).toBeVisible();
});

test("a student who rewrites their own role through the API is refused", async () => {
  const email = uniqueEmail("rewrite");
  await createUser({ email, password: PASSWORD, fullName: "Rita Rewrite" });
  const { access_token, user } = await signIn(email, PASSWORD);

  const patch = await asUser(access_token, `/rest/v1/profiles?id=eq.${user.id}`, {
    method: "PATCH",
    body: JSON.stringify({ role: "admin" }),
  });
  expect(patch.ok).toBe(false);

  const approve = await asUser(access_token, "/rest/v1/rpc/admin_set_teacher_status", {
    method: "POST",
    body: JSON.stringify({ p_user_id: user.id, p_status: "approved" }),
  });
  expect(approve.ok).toBe(false);

  const read = await asUser(access_token, `/rest/v1/profiles?id=eq.${user.id}&select=role`);
  expect(await read.json()).toEqual([{ role: "student" }]);
});

test("signing out in one tab signs out the other", async ({ browser }) => {
  const email = uniqueEmail("tabs");
  await createUser({ email, password: PASSWORD, fullName: "Tara Tabs" });
  const context = await browser.newContext();
  const first = await context.newPage();
  await first.goto("/sign-in");
  await first.getByLabel("Email").fill(email);
  await first.getByLabel("Password").fill(PASSWORD);
  await first.getByRole("button", { name: "Sign in" }).click();
  await expect(first.getByRole("heading", { name: "Hello, Tara" })).toBeVisible();

  const second = await context.newPage();
  await second.goto("/app");
  await expect(second.getByRole("heading", { name: "Hello, Tara" })).toBeVisible();

  await first.getByRole("button", { name: "Sign out" }).click();
  await expect(second.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await second.goBack();
  await expect(second.getByRole("heading", { name: "Hello, Tara" })).toBeHidden();
});
