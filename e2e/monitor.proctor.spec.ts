import { expect, test } from "@playwright/test";
import { asUser, createUser, hasStack, rpcAs, signIn, uniqueEmail } from "./support/supabase";

// Phase 7's gate through the screens: a teacher watching, a student on Chromium's fake camera.
test.skip(!hasStack, "needs the local Supabase stack (npm run db:start)");
test.setTimeout(180_000);

const PASSWORD = "correct-horse-battery";

function seconds(label: string | null): number {
  const parts = (label ?? "").match(/(\d+):(\d\d)(?::(\d\d))?/);
  if (!parts) return NaN;
  return parts[3]
    ? Number(parts[1]) * 3600 + Number(parts[2]) * 60 + Number(parts[3])
    : Number(parts[1]) * 60 + Number(parts[2]);
}

test("the teacher sees a flag in seconds, adds time, warns, views the camera, ends and reviews", async ({
  browser,
}) => {
  const teacherEmail = uniqueEmail("teacher");
  const studentEmail = uniqueEmail("student");
  await createUser({
    email: teacherEmail,
    password: PASSWORD,
    fullName: "Tom Teacher",
    teacher: true,
  });
  await createUser({ email: studentEmail, password: PASSWORD, fullName: "Sue Student" });
  const teacherToken = (await signIn(teacherEmail, PASSWORD)).access_token;
  const student = await signIn(studentEmail, PASSWORD);
  const classId = await rpcAs<string>(teacherToken, "create_class", { p_name: "Music" });
  const question = await rpcAs<string>(teacherToken, "save_question", {
    p_id: null,
    p_type: "true_false",
    p_prompt: "A piano has keys",
    p_options: [],
    p_points: 1,
    p_tags: [],
    p_correct: true,
  });
  const created = await asUser(teacherToken, "/rest/v1/tests", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      class_id: classId,
      title: "Instruments",
      duration_min: 20,
      opens_at: new Date(Date.now() - 60_000).toISOString(),
      closes_at: new Date(Date.now() + 86_400_000).toISOString(),
      proctoring: {
        preset: "standard",
        identity_check: false,
        phone_required: false,
        screen_share_required: false,
        snapshot_interval_s: 300,
        auto_submit_screen_share_s: null,
        auto_submit_phone_gone_min: null,
      },
    }),
  });
  const testId = ((await created.json()) as { id: string }[])[0]!.id;
  await asUser(teacherToken, "/rest/v1/test_questions", {
    method: "POST",
    body: JSON.stringify({ test_id: testId, question_id: question, position: 0 }),
  });
  await rpcAs(teacherToken, "publish_test", { p_test_id: testId });
  const code = (
    (await (
      await asUser(teacherToken, `/rest/v1/classes?id=eq.${classId}&select=join_code`)
    ).json()) as { join_code: string }[]
  )[0]!.join_code;
  await rpcAs(student.access_token, "join_class", { p_code: code });

  const signInPage = async (email: string, permissions: string[] = []) => {
    const page = await (await browser.newContext({ permissions })).newPage();
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: /^Hello/ })).toBeVisible();
    return page;
  };

  // The student starts.
  const s = await signInPage(studentEmail, ["camera", "microphone"]);
  await s.goto(`/app/take/${testId}`);
  await expect(s.getByText("Camera and microphone on")).toBeVisible({ timeout: 20_000 });
  await s.getByLabel("I understand and agree").check();
  await expect(s.getByRole("button", { name: "Start the test" })).toBeEnabled({ timeout: 60_000 });
  await s.getByRole("button", { name: "Start the test" }).click();
  await expect(s.getByText("A piano has keys")).toBeVisible();
  const attemptId = (
    (await (
      await asUser(student.access_token, `/rest/v1/attempts?select=id&test_id=eq.${testId}`)
    ).json()) as { id: string }[]
  )[0]!.id;

  // The teacher watches; the student's summary arrives within a 10 s beat.
  const t = await signInPage(teacherEmail);
  await t.goto(`/app/tests/${testId}/live`);
  await expect(t.getByText("Sue Student")).toBeVisible();
  await expect(t.getByText(/0 of 1 answered/)).toBeVisible({ timeout: 15_000 });

  // A high flag, sent exactly as the student's engine sends one, reaches the grid within 5 s.
  await asUser(student.access_token, "/rest/v1/proctor_events", {
    method: "POST",
    body: JSON.stringify({
      client_id: crypto.randomUUID(),
      attempt_id: attemptId,
      device: "laptop",
      kind: "object_phone",
      severity: "high",
      started_at: new Date().toISOString(),
    }),
  });
  await expect(t.getByText("1 high")).toBeVisible({ timeout: 5_000 });
  await expect(t.getByText("Latest: Phone in view")).toBeVisible();

  // Extra time reaches the student's clock.
  await t.getByRole("button", { name: "Open" }).click();
  const before = seconds(await s.getByLabel(/^Time left/).getAttribute("aria-label"));
  await t.getByLabel("Why").fill("Fire alarm");
  await t.getByRole("button", { name: "Add time" }).click();
  await expect(t.getByText("Time added.")).toBeVisible();
  await expect
    .poll(async () => seconds(await s.getByLabel(/^Time left/).getAttribute("aria-label")), {
      timeout: 5_000,
    })
    .toBeGreaterThan(before + 240);

  // A warning appears on the student's screen.
  await t.getByRole("button", { name: "Send", exact: true }).click();
  await expect(s.getByRole("alertdialog")).toContainText(
    "Please keep your face in view of the camera.",
  );
  await s.getByRole("button", { name: "I understand" }).click();

  // Live view: the student is told, and real frames arrive.
  await t.getByRole("button", { name: "View camera for 2 minutes" }).click();
  await expect(s.getByText("Your teacher is viewing your camera right now.")).toBeVisible({
    timeout: 15_000,
  });
  await expect
    .poll(
      () => t.getByLabel("The student's camera").evaluate((v: HTMLVideoElement) => v.videoWidth),
      { timeout: 15_000 },
    )
    .toBeGreaterThan(0);
  await t.getByRole("button", { name: "Stop viewing" }).click();

  // Ending, with a reason; the student is taken to the result.
  await t.getByRole("button", { name: "End this attempt…" }).click();
  await t.getByLabel("Why are you ending this attempt?").fill("Phone in hand");
  await t.getByRole("button", { name: "End the attempt" }).click();
  await expect(s.getByRole("heading", { name: "Your teacher ended this attempt" })).toBeVisible({
    timeout: 10_000,
  });

  // The review afterwards.
  await t.goto(`/app/tests/${testId}/review`);
  const phoneFlag = t.getByRole("listitem").filter({ hasText: "Phone in view" });
  await phoneFlag.getByRole("button", { name: "Confirm" }).click();
  await expect(phoneFlag.getByText("Confirmed")).toBeVisible();
  await t.getByRole("button", { name: "A violation" }).click();
  await expect(t.getByText("Judged a violation")).toBeVisible();
  await t.goto(`/app/attempts/${attemptId}/report`);
  await expect(t.getByRole("heading", { name: "Integrity report" })).toBeVisible();
  await expect(t.getByText("terminated (Phone in hand)")).toBeVisible();
});
