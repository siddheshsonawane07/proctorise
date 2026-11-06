import { expect, test } from "./support/test";

// The demo runs the real checks on Chromium's fake camera and microphone, and sends nothing.
test.setTimeout(90_000);

test("the demo runs the checks and sends nothing anywhere", async ({ page }) => {
  const sent: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (url.origin !== "http://localhost:4173" || r.method() !== "GET") sent.push(r.url());
  });

  // Records what the page reads aloud, instead of playing it.
  await page.addInitScript(() => {
    const said: string[] = [];
    (window as unknown as { __said: string[] }).__said = said;
    speechSynthesis.speak = (u: SpeechSynthesisUtterance) => void (u.text && said.push(u.text));
  });

  await page.goto("/demo");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Try the proctoring");
  await page.getByRole("button", { name: "Turn on camera and microphone" }).click();
  await expect(page.getByRole("status")).toHaveText(/Checks running/, { timeout: 60_000 });
  await expect(page.getByLabel("Your camera")).toBeVisible();

  // A browser fact goes straight into the teacher's list, and ticks its line.
  await page.keyboard.press("Control+KeyC");
  const teacher = page.getByRole("region", { name: "What your teacher would see" });
  await expect(teacher).toContainText("Used a keyboard shortcut");
  await expect(page.getByText("Press Ctrl+C, or right-click. Noticed.")).toBeVisible();

  // The fake camera shows no face: after five seconds the student's warning is read aloud.
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __said: string[] }).__said), {
      timeout: 15_000,
    })
    .toContain("We can't see your face. Sit in front of the camera, in good light.");

  expect(sent, "the demo sent something off the page").toEqual([]);
});
