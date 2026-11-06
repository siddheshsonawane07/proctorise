import { execFileSync } from "node:child_process";
import { expect, test } from "./support/test";
import {
  API_URL,
  asService,
  asUser,
  createUser,
  hasStack,
  rpcAs,
  signIn,
  uniqueEmail,
} from "./support/supabase";

// Phase 8's retention and deletion, against the local stack: the files leave the bucket, not just
// the rows (Phase-8-Critic #2).
test.skip(!hasStack, "needs the local Supabase stack (npm run db:start)");

const PASSWORD = "correct-horse-battery";

function maintain(): Record<string, number> {
  const out = execFileSync("node", ["scripts/maintenance.mjs"], {
    env: {
      ...process.env,
      SUPABASE_URL: API_URL,
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    },
  }).toString();
  return JSON.parse(out.trim().split("\n").at(-1)!);
}

async function listEvidence(prefix: string): Promise<string[]> {
  const res = await asService("/storage/v1/object/list/evidence", {
    method: "POST",
    body: JSON.stringify({ prefix, limit: 100 }),
  });
  return ((await res.json()) as { name: string }[]).map((o) => o.name);
}

test("snapshots past retention leave the bucket, and a deleted account is gone", async () => {
  const teacherEmail = uniqueEmail("teacher");
  const studentEmail = uniqueEmail("student");
  await createUser({ email: teacherEmail, password: PASSWORD, fullName: "Tia", teacher: true });
  const studentId = await createUser({ email: studentEmail, password: PASSWORD, fullName: "Sam" });
  const teacher = (await signIn(teacherEmail, PASSWORD)).access_token;
  const student = (await signIn(studentEmail, PASSWORD)).access_token;
  const classId = await rpcAs<string>(teacher, "create_class", { p_name: "Retention" });
  const q = await rpcAs<string>(teacher, "save_question", {
    p_id: null,
    p_type: "true_false",
    p_prompt: "Kept?",
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
      title: "Short retention",
      retention_days: 7,
      opens_at: new Date(Date.now() - 60_000).toISOString(),
      closes_at: new Date(Date.now() + 86_400_000).toISOString(),
    }),
  });
  const testId = ((await created.json()) as { id: string }[])[0]!.id;
  await asUser(teacher, "/rest/v1/test_questions", {
    method: "POST",
    body: JSON.stringify({ test_id: testId, question_id: q, position: 0 }),
  });
  await rpcAs(teacher, "publish_test", { p_test_id: testId });
  const code = (
    (await (
      await asUser(teacher, `/rest/v1/classes?id=eq.${classId}&select=join_code`)
    ).json()) as { join_code: string }[]
  )[0]!.join_code;
  await rpcAs(student, "join_class", { p_code: code });
  const { attempt_id } = await rpcAs<{ attempt_id: string }>(student, "start_attempt", {
    p_test_id: testId,
    p_session: "m",
  });

  // One snapshot, uploaded the way the app uploads one.
  const path = await rpcAs<string>(student, "reserve_evidence", {
    p_attempt_id: attempt_id,
    p_source: "camera",
    p_reason: "event",
  });
  const upload = await fetch(`${API_URL}/storage/v1/object/evidence/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${student}`,
      apikey: process.env.SUPABASE_PUBLISHABLE_KEY!,
      "Content-Type": "image/jpeg",
    },
    body: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
  });
  expect(upload.ok).toBe(true);
  await rpcAs(student, "submit_attempt", { p_attempt_id: attempt_id });
  expect(await listEvidence(attempt_id)).toHaveLength(1);

  // Not yet past retention: kept.
  maintain();
  expect(await listEvidence(attempt_id)).toHaveLength(1);

  // Eight days later (a 7-day test): gone from the bucket and from the index.
  await asService(`/rest/v1/attempts?id=eq.${attempt_id}`, {
    method: "PATCH",
    body: JSON.stringify({ submitted_at: new Date(Date.now() - 8 * 86_400_000).toISOString() }),
  });
  expect(maintain().purged_snapshots).toBeGreaterThanOrEqual(1);
  expect(await listEvidence(attempt_id)).toHaveLength(0);
  const index = await (
    await asService(`/rest/v1/evidence?attempt_id=eq.${attempt_id}&select=path`)
  ).json();
  expect(index).toEqual([]);

  // The student asks to delete their account; the next run does it.
  await rpcAs(student, "request_account_deletion", { p_confirm: "DELETE" });
  expect(maintain().deleted_accounts).toBeGreaterThanOrEqual(1);
  const user = await asService(`/auth/v1/admin/users/${studentId}`);
  expect(user.status).toBe(404);
});
