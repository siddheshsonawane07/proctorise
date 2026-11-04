import { expect, test } from "@playwright/test";
import {
  asService,
  asUser,
  createUser,
  hasStack,
  rpcAs,
  signIn,
  uniqueEmail,
} from "./support/supabase";

// Phase 4's gate, against the local Supabase stack.
test.skip(!hasStack, "needs the local Supabase stack (npm run db:start)");
test.setTimeout(120_000);

const PASSWORD = "correct-horse-battery";

/** A class with one student and a published three-question test, made through the API. */
async function setUp(durationMin: number) {
  const teacherEmail = uniqueEmail("teacher");
  const studentEmail = uniqueEmail("student");
  await createUser({
    email: teacherEmail,
    password: PASSWORD,
    fullName: "Tom Teacher",
    teacher: true,
  });
  await createUser({ email: studentEmail, password: PASSWORD, fullName: "Sue Student" });
  const teacher = (await signIn(teacherEmail, PASSWORD)).access_token;
  const student = await signIn(studentEmail, PASSWORD);

  const classId = await rpcAs<string>(teacher, "create_class", { p_name: "Chemistry" });
  const ask = (args: object) =>
    rpcAs<string>(teacher, "save_question", { p_id: null, p_tags: [], ...args });
  const q1 = await ask({
    p_type: "single",
    p_prompt: "Water is",
    p_options: [
      { id: "a", text: "H2O" },
      { id: "b", text: "CO2" },
    ],
    p_points: 1,
    p_correct: "a",
  });
  const q2 = await ask({
    p_type: "true_false",
    p_prompt: "Ice floats",
    p_options: [],
    p_points: 1,
    p_correct: true,
  });
  const q3 = await ask({
    p_type: "numeric",
    p_prompt: "Protons in carbon",
    p_options: [],
    p_points: 1,
    p_correct: 6,
  });
  const created = await asUser(teacher, "/rest/v1/tests", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      class_id: classId,
      title: "Atoms",
      duration_min: durationMin,
      opens_at: new Date(Date.now() - 60_000).toISOString(),
      closes_at: new Date(Date.now() + 86_400_000).toISOString(),
    }),
  });
  const testId = ((await created.json()) as { id: string }[])[0]!.id;
  await asUser(teacher, "/rest/v1/test_questions", {
    method: "POST",
    body: JSON.stringify(
      [q1, q2, q3].map((question_id, position) => ({ test_id: testId, question_id, position })),
    ),
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
  return { teacher, student, studentEmail, testId };
}

test("answers survive closing the browser, and the server keeps the time", async ({ browser }) => {
  const { studentEmail, testId } = await setUp(3);

  const first = await (await browser.newContext()).newPage();
  // Every response the student's browser receives, to check no key ever arrives (Phase-4-Critic #2).
  const bodies: string[] = [];
  const record = (page: typeof first) =>
    page.on("response", async (response) => {
      if (response.url().includes("/rest/v1/")) bodies.push(await response.text().catch(() => ""));
    });
  record(first);
  await first.goto("/sign-in");
  await first.getByLabel("Email").fill(studentEmail);
  await first.getByLabel("Password").fill(PASSWORD);
  await first.getByRole("button", { name: "Sign in" }).click();
  await expect(first.getByRole("heading", { name: /^Hello/ })).toBeVisible();
  await first.goto(`/app/take/${testId}`);
  await first.getByRole("button", { name: "Start the test" }).click();
  await first.getByLabel("H2O").check();
  await first.getByRole("button", { name: "Next" }).click();
  await first.getByLabel("True").check();
  await expect(first.getByText("All answers saved")).toBeVisible();
  const storage = await first.context().storageState();
  await first.context().close();

  // Later, a new browser with the same sign-in: the attempt resumes.
  await new Promise((resolve) => setTimeout(resolve, 5_000));
  const second = await (await browser.newContext({ storageState: storage })).newPage();
  record(second);
  await second.goto(`/app/take/${testId}`);
  await second.getByRole("button", { name: "Continue the test" }).click();
  await expect(second.getByLabel("H2O")).toBeChecked();
  const label = await second.getByLabel(/^Time left/).getAttribute("aria-label");
  const [, mm, ss] = label!.match(/(\d\d):(\d\d)/)!;
  const left = Number(mm) * 60 + Number(ss);
  expect(left).toBeLessThanOrEqual(175); // 3 minutes, less the 5 s away and the time before
  expect(left).toBeGreaterThan(120);

  await second.getByRole("button", { name: "Question 3, not answered" }).click();
  await second.getByRole("spinbutton").fill("6");
  await expect(second.getByText("All answers saved")).toBeVisible();
  await second.getByRole("button", { name: "Submit the test" }).click();
  await second.getByRole("button", { name: "Yes, submit" }).click();
  await expect(second.getByText("Your teacher will release the results.")).toBeVisible();

  expect(bodies.length).toBeGreaterThan(5);
  for (const body of bodies) {
    expect(body).not.toContain('"correct"');
    expect(body).not.toContain('"points_awarded"');
  }
});

test("a late answer is refused, and a closed browser is submitted on time", async ({ browser }) => {
  const { teacher, student, testId } = await setUp(30);
  const payload = await rpcAs<{ attempt_id: string; items: { id: string }[] }>(
    student.access_token,
    "start_attempt",
    { p_test_id: testId, p_session: "api" },
  );
  await rpcAs(student.access_token, "save_answer", {
    p_attempt_id: payload.attempt_id,
    p_item_id: payload.items[0]!.id,
    p_response: "a",
  });

  // The deadline passes with no browser open.
  await asService(`/rest/v1/attempts?id=eq.${payload.attempt_id}`, {
    method: "PATCH",
    body: JSON.stringify({ deadline_at: new Date(Date.now() - 60_000).toISOString() }),
  });
  await expect(
    rpcAs(student.access_token, "save_answer", {
      p_attempt_id: payload.attempt_id,
      p_item_id: payload.items[1]!.id,
      p_response: true,
    }),
  ).rejects.toThrow(/Time is up/);

  // The every-minute job submits and grades it.
  await expect
    .poll(
      async () =>
        (
          await rpcAs<{ attempt_id: string; status: string; score: number }[]>(
            teacher,
            "test_results",
            { p_test_id: testId },
          )
        ).find((r) => r.attempt_id === payload.attempt_id),
      { timeout: 75_000, intervals: [2_000] },
    )
    .toMatchObject({ status: "auto_submitted", score: 1 });

  // Held until released, then shown.
  const held = await rpcAs<{ released: boolean }>(student.access_token, "my_result", {
    p_attempt_id: payload.attempt_id,
  });
  expect(held.released).toBe(false);
  await rpcAs(teacher, "release_results", { p_test_id: testId });
  const shown = await rpcAs<{ released: boolean; score: number }>(
    student.access_token,
    "my_result",
    {
      p_attempt_id: payload.attempt_id,
    },
  );
  expect(shown).toMatchObject({ released: true, score: 1 });
  void browser;
});
