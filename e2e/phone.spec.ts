import { expect, test } from "@playwright/test";

test("the phone page opens on a phone", async ({ page }) => {
  await page.goto("/pair/abc");
  await expect(page.getByRole("heading", { name: "Phone camera" })).toBeVisible();
});

test("the test page asks a phone for a computer", async ({ page }) => {
  await page.goto("/app/attempt/123");
  await expect(page.getByRole("heading", { name: "Please use a laptop or desktop" })).toBeVisible();
});

test("the landing page works on a phone", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Get started" })).toBeVisible();
});
