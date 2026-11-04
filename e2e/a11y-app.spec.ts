import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createUser, hasStack, rpcAs, signIn, uniqueEmail } from "./support/supabase";

// WCAG 2.2 AA on signed-in pages, against the local stack.
test.skip(!hasStack, "needs the local Supabase stack (npm run db:start)");

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
});
