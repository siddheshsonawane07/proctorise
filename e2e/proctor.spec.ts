import { expect, test } from "./support/test";
import { asUser, createUser, hasStack, rpcAs, signIn, uniqueEmail } from "./support/supabase";

// Phase 5's pipeline, end to end: a fake camera (Chromium's test pattern, which has no face) →
// the detector worker → the rules → events and a snapshot in the database. The 12-behaviour script
// on real laptops is the gate; this proves the wiring in CI.
test.skip(!hasStack, "needs the local Supabase stack (npm run db:start)");
test.setTimeout(120_000);

const PASSWORD = "correct-horse-battery";

test("a proctored attempt records a missing face, with a snapshot, and a blocked shortcut", async ({
  browser,
}) => {
  const teacherEmail = uniqueEmail("teacher");
  const studentEmail = uniqueEmail("student");
  await createUser({
    email: teacherEmail,
    password: PASSWORD,
    fullName: "Pat Teacher",
    teacher: true,
  });
  await createUser({ email: studentEmail, password: PASSWORD, fullName: "Rob Student" });
  const teacher = (await signIn(teacherEmail, PASSWORD)).access_token;
  const student = await signIn(studentEmail, PASSWORD);

  const classId = await rpcAs<string>(teacher, "create_class", { p_name: "Physics" });
  const question = await rpcAs<string>(teacher, "save_question", {
    p_id: null,
    p_type: "true_false",
    p_prompt: "Light is fast",
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
      title: "Proctored quiz",
      duration_min: 10,
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
  await asUser(teacher, "/rest/v1/test_questions", {
    method: "POST",
    body: JSON.stringify({ test_id: testId, question_id: question, position: 0 }),
  });
  await rpcAs(teacher, "publish_test", { p_test_id: testId });
  const code = (
    (await (
      await asUser(teacher, `/rest/v1/classes?id=eq.${classId}&select=join_code`)
    ).json()) as {
      join_code: string;
    }[]
  )[0]!.join_code;
  await rpcAs(student.access_token, "join_class", { p_code: code });

  const context = await browser.newContext({ permissions: ["camera", "microphone"] });
  const page = await context.newPage();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(studentEmail);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /^Hello/ })).toBeVisible();

  await page.goto(`/app/take/${testId}`);
  await expect(page.getByText("Camera and microphone on")).toBeVisible({ timeout: 20_000 });
  // The test pattern has no face: the lobby says so, as a warning, not a block.
  await expect(page.getByText("We can't see your face.", { exact: false }).first()).toBeVisible({
    timeout: 60_000,
  });
  await page.getByLabel("I understand and agree").check();
  await page.getByRole("button", { name: "Start the test" }).click();
  await expect(page.getByText("Light is fast")).toBeVisible();

  // Headless Chromium may not grant full screen; the cover is then up, which is right.
  const cover = page.getByRole("button", { name: "Return to full screen" });
  if (await cover.isVisible()) await cover.click().catch(() => {});
  await page.keyboard.press("Control+c");

  // Within a few seconds: face_missing (5 s rule) with a snapshot, and the shortcut.
  await expect
    .poll(
      async () =>
        (await (
          await asUser(
            teacher,
            `/rest/v1/proctor_events?select=kind,severity,snapshot_path&order=started_at`,
          )
        ).json()) as { kind: string; severity: string; snapshot_path: string | null }[],
      { timeout: 60_000, intervals: [2_000] },
    )
    .toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "face_missing",
          severity: "warn",
          snapshot_path: expect.any(String),
        }),
        expect.objectContaining({ kind: "shortcut", severity: "info" }),
      ]),
    );
  await expect(page.getByRole("alert")).toContainText("We can't see your face");
  await context.close();
});
