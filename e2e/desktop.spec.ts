import { expect, test } from "@playwright/test";

test("the landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Online tests, checked fairly.");
});

test("a deep link opens the app, not a server 404", async ({ page }) => {
  const response = await page.goto("/app/some/deep/link");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

// The desktop-only gate itself is unit-tested (src/app/router.test.tsx), signed in.
test("the test page asks a signed-out visitor to sign in", async ({ page }) => {
  await page.goto("/app/take/123");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("next")).toBe("/app/take/123");
});

test("the phone page asks a desktop to use a phone", async ({ page }) => {
  await page.goto("/pair/abc");
  await expect(page.getByRole("heading", { name: "Open this on your phone" })).toBeVisible();
});
