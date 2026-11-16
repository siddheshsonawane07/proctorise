import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "./support/test";
import { createUser, hasStack, rpcAs, signIn, uniqueEmail } from "./support/supabase";

// WCAG 2.2 AA on signed-in pages, against the local stack.
test.skip(!hasStack, "needs the local Supabase stack (npm run db:start)");
test.setTimeout(90_000);

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PASSWORD = "correct-horse-battery";

async function check(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForLoadState("networkidle");
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
  ).toEqual([]);
}

test("student and teacher pages have no accessibility violations", async ({ browser }) => {
  const teacherEmail = uniqueEmail("teacher");
  await createUser({
    email: teacherEmail,
    password: PASSWORD,
    fullName: "Ali Teacher",
    teacher: true,
  });
  const token = (await signIn(teacherEmail, PASSWORD)).access_token;
  const classId = await rpcAs<string>(token, "create_class", { p_name: "Accessible class" });

  const page = await (await browser.newContext()).newPage();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(teacherEmail);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Without this the first goto races the sign-in, and every check below reads the sign-in page.
  await expect(page.getByRole("heading", { name: /^(Classes|Admin)$/ })).toBeVisible();
  for (const path of [
    "/app",
    `/app/classes/${classId}`,
    "/app/bank",
    "/app/my-data",
    "/app/identity",
  ]) {
    await page.goto(path);
    await check(page);
  }

  // The window for a new class, open over the page.
  await page.goto("/app");
  await page.getByRole("button", { name: "Create class" }).click();
  await expect(page.getByRole("dialog", { name: "Create a class" })).toBeVisible();
  await check(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // The student side of a teacher's account, and a confirmation open on the class's settings.
  await page.getByRole("complementary").getByRole("button", { name: "Student" }).click();
  await expect(page.getByRole("button", { name: "Join class" })).toBeVisible();
  await check(page);
  await page.getByRole("complementary").getByRole("button", { name: "Teacher" }).click();
  await page.goto(`/app/classes/${classId}`);
  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Delete this class" }).click();
  await expect(page.getByRole("button", { name: "Delete the class" })).toBeVisible();
  await check(page);
});

test("the admin's pages have no accessibility violations", async ({ page }) => {
  const email = uniqueEmail("admin");
  await createUser({ email, password: PASSWORD, fullName: "Ada Admin", admin: true });
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /^(Classes|Admin)$/ })).toBeVisible();
  for (const path of ["/app", "/app/admin/classes", "/app/admin/teachers", "/app/admin/usage"]) {
    await page.goto(path);
    await check(page);
  }
});
