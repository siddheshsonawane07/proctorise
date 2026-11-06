import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./support/test";

// WCAG 2.2 AA on the public pages (PHASE_8 § 8.3, step 10). Signed-in pages: a11y-app.spec.ts.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const path of [
  "/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/privacy",
  "/help/teachers",
  "/help/students",
]) {
  test(`no accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(
      violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
    ).toEqual([]);
  });
}
