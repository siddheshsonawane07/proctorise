import { devices, expect, test } from "@playwright/test";
import { asUser, createUser, hasStack, rpcAs, signIn, uniqueEmail } from "./support/supabase";

// Phase 6 through the screens: a laptop and an emulated phone, both on Chromium's fake camera.
// The real-device gate (an iPhone and an Android) is walked by hand.
test.skip(!hasStack, "needs the local Supabase stack (npm run db:start)");
test.setTimeout(180_000);

const PASSWORD = "correct-horse-battery";
const PHONE = { ...devices["Pixel 7"], permissions: ["camera"] };

type Event = { kind: string; device: string; severity: string };

test("pair a phone by code; one phone only; hidden and gone are recorded", async ({ browser }) => {
  const teacherEmail = uniqueEmail("teacher");
  const studentEmail = uniqueEmail("student");
  await createUser({
    email: teacherEmail,
    password: PASSWORD,
    fullName: "Pam Teacher",
    teacher: true,
  });
  await createUser({ email: studentEmail, password: PASSWORD, fullName: "Rob Student" });
  const teacher = (await signIn(teacherEmail, PASSWORD)).access_token;
  const student = await signIn(studentEmail, PASSWORD);
  const classId = await rpcAs<string>(teacher, "create_class", { p_name: "Art" });
  const question = await rpcAs<string>(teacher, "save_question", {
    p_id: null,
    p_type: "true_false",
    p_prompt: "Red is a colour",
    p_options: [],
    p_points: 1,
    p_tags: [],
    p_correct: true,
  });
  const created = await asUser(teacher, "/rest/v1/tests", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      class_id: classId,
      title: "Colours",
      duration_min: 10,
      opens_at: new Date(Date.now() - 60_000).toISOString(),
      closes_at: new Date(Date.now() + 86_400_000).toISOString(),
      proctoring: {
        preset: "light",
        identity_check: false,
        phone_required: true,
        screen_share_required: false,
        snapshot_interval_s: 300,
        auto_submit_screen_share_s: null,
        auto_submit_phone_gone_min: null,
      },
    }),
  });
  const testId = ((await created.json()) as { id: string }[])[0]!.id;
  await asUser(teacher, "/rest/v1/test_questions", {
    method: "POST",
    body: JSON.stringify({ test_id: testId, question_id: question, position: 0 }),
  });
  await rpcAs(teacher, "publish_test", { p_test_id: testId });
  const code = (
    (await (
      await asUser(teacher, `/rest/v1/classes?id=eq.${classId}&select=join_code`)
    ).json()) as { join_code: string }[]
  )[0]!.join_code;
  await rpcAs(student.access_token, "join_class", { p_code: code });
  const events = async () =>
    (await (
      await asUser(teacher, "/rest/v1/proctor_events?select=kind,device,severity")
    ).json()) as Event[];

  // The laptop asks for a phone.
  const laptop = await (await browser.newContext()).newPage();
  await laptop.goto("/sign-in");
  await laptop.getByLabel("Email").fill(studentEmail);
  await laptop.getByLabel("Password").fill(PASSWORD);
  await laptop.getByRole("button", { name: "Sign in" }).click();
  await expect(laptop.getByRole("heading", { name: /^Hello/ })).toBeVisible();
  await laptop.goto(`/app/take/${testId}`);
  await laptop.getByRole("button", { name: "Connect my phone" }).click();
  const pairCode = (await laptop.locator("strong.font-mono").textContent())!.trim();
  expect(pairCode).toMatch(/^[A-Z2-9]{6}$/);

  // The phone types it, starts its camera, and goes on past the setup check.
  const phoneContext = await browser.newContext(PHONE);
  const phone = await phoneContext.newPage();
  await phone.goto("/pair");
  await phone.getByLabel("Code").fill(pairCode.toLowerCase());
  await phone.getByRole("button", { name: "Connect" }).click();
  await expect(phone.getByRole("heading", { name: "Connected to Rob's test" })).toBeVisible();
  await phone.getByRole("button", { name: "Start the camera" }).click();
  await expect(phone.getByRole("heading", { name: "Set up the view" })).toBeVisible();
  await expect(laptop.getByText(/Phone connected/)).toBeVisible({ timeout: 10_000 });
  await phone.getByRole("button", { name: "Continue anyway" }).click({ timeout: 30_000 });
  await expect(phone.getByRole("heading", { name: "Ready" })).toBeVisible();

  // A second phone with the same code is refused.
  const other = await (await browser.newContext(PHONE)).newPage();
  await other.goto("/pair");
  await other.getByLabel("Code").fill(pairCode);
  await other.getByRole("button", { name: "Connect" }).click();
  await expect(other.getByRole("alert")).toContainText("no longer valid");

  // The laptop starts; the phone goes live.
  await expect(laptop.getByText("The phone is set up.")).toBeVisible({ timeout: 10_000 });
  await laptop.getByLabel("I understand and agree").check();
  await laptop.getByRole("button", { name: "Start the test" }).click();
  await expect(laptop.getByText("Red is a colour")).toBeVisible();
  await expect(phone.getByRole("heading", { name: "Test in progress" })).toBeVisible({
    timeout: 15_000,
  });
  await expect
    .poll(events, { timeout: 20_000 })
    .toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "phone_setup_unconfirmed", device: "phone" }),
      ]),
    );

  // The phone page is hidden for two seconds (as if the screen were locked), then back.
  const setVisibility = (state: "hidden" | "visible") =>
    phone.evaluate((s) => {
      Object.defineProperty(document, "visibilityState", { value: s, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    }, state);
  await setVisibility("hidden");
  await phone.waitForTimeout(2_000);
  await setVisibility("visible");
  await expect
    .poll(events, { timeout: 20_000 })
    .toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "phone_hidden", device: "phone", severity: "high" }),
      ]),
    );

  // The phone goes away: after 20 s the laptop records it, and asks to reconnect.
  await phoneContext.close();
  await expect(laptop.getByText("Your phone camera disconnected", { exact: false })).toBeVisible({
    timeout: 30_000,
  });
  await expect
    .poll(events, { timeout: 45_000 })
    .toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "phone_gone", device: "laptop", severity: "warn" }),
      ]),
    );
});
