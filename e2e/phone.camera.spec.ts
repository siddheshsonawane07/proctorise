import { expect, test } from "./support/test";

// The object detector on real pixels, through the whole engine: the worker, its delegate, the
// zoomed views and the rules. The camera is a photograph of someone holding a phone
// (e2e/fixtures/SOURCES.txt). Every other test's camera is Chromium's test pattern, which has no
// phone in it, so for two weeks nothing noticed that the detector returned nothing at all on the
// GPU delegate.
test("a phone in a hand is flagged within a few seconds", async ({ page }) => {
  await page.addInitScript(() => {
    speechSynthesis.speak = () => {};
  });
  await page.goto("/demo");
  await page.getByRole("button", { name: "Turn on camera and microphone" }).click();
  await expect(page.getByRole("status")).toHaveText(/Checks running/, { timeout: 60_000 });

  const teacher = page.getByRole("region", { name: "What your teacher would see" });
  await expect(teacher).toContainText("Phone in view", { timeout: 15_000 });
  await expect(page.getByText("A phone is in view. Put it away from your desk.")).toBeVisible();
});
