import { expect, test } from "./support/test";

test("the phone page opens on a phone", async ({ page }) => {
  await page.goto("/pair");
  await expect(page.getByRole("heading", { name: "Connect your phone" })).toBeVisible();
});

test("sign-in works on a phone", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("the landing page works on a phone", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Create an account" })).toBeVisible();
});
