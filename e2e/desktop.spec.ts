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

test("the test page opens on a desktop", async ({ page }) => {
  await page.goto("/app/attempt/123");
  await expect(page.getByRole("heading", { name: "Test", exact: true })).toBeVisible();
});

test("the phone page asks a desktop to use a phone", async ({ page }) => {
  await page.goto("/pair/abc");
  await expect(page.getByRole("heading", { name: "Open this on your phone" })).toBeVisible();
});
