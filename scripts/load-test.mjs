// Simulates a class taking a test, to measure Realtime and database use against the free plan
// (PHASE_7 § 10). Each simulated student signs in, starts an attempt, sends the 10 s summary the
// real test page sends and a warning event now and then; one teacher listens to the grid.
//
//   SUPABASE_URL=… SUPABASE_PUBLISHABLE_KEY=… SUPABASE_SECRET_KEY=… \
//     node scripts/load-test.mjs --students 30 --minutes 30
//
// Run against staging, not production: it creates throwaway accounts (load-*@example.test).
import { createClient } from "@supabase/supabase-js";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? Number(process.argv[i + 1]) : fallback;
};
const STUDENTS = arg("students", 5);
const MINUTES = arg("minutes", 1);
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;
if (!URL || !KEY || !SECRET) {
  console.error("Set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const admin = createClient(URL, SECRET, { auth: { persistSession: false } });
const run = Date.now();
const password = `load-${run}-pw`;

async function person(name, teacher = false) {
  const email = `load-${run}-${name}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, adult_confirmed: "true" },
  });
  if (error) throw error;
  if (teacher) {
    await admin
      .from("profiles")
      .update({ role: "teacher", teacher_status: "approved" })
      .eq("id", data.user.id);
  }
  const client = createClient(URL, KEY, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  client.realtime.setAuth(signIn.data.session.access_token);
  return client;
}

const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

console.log(`Setting up ${STUDENTS} students…`);
const teacher = await person("teacher", true);
const classId = must(await teacher.rpc("create_class", { p_name: "Load test" }));
const q = must(
  await teacher.rpc("save_question", {
    p_id: null,
    p_type: "true_false",
    p_prompt: "Load",
    p_options: [],
    p_points: 1,
    p_tags: [],
    p_correct: true,
  }),
);
const test = must(
  await teacher
    .from("tests")
    .insert({
      class_id: classId,
      title: "Load test",
      duration_min: MINUTES + 5,
      opens_at: new Date(Date.now() - 60_000).toISOString(),
      closes_at: new Date(Date.now() + 86_400_000).toISOString(),
    })
    .select("id")
    .single(),
);
must(
  await teacher.from("test_questions").insert({ test_id: test.id, question_id: q, position: 0 }),
);
must(await teacher.rpc("publish_test", { p_test_id: test.id }));
const code = must(
  await teacher.from("classes").select("join_code").eq("id", classId).single(),
).join_code;

let received = 0;
const grid = teacher.channel(`test:${test.id}`, { config: { private: true } });
grid.on("broadcast", { event: "*" }, () => received++).subscribe();

let sent = 0;
let events = 0;
const timers = [];
const students = [];
for (let i = 0; i < STUDENTS; i++) {
  const s = await person(`student${i}`);
  must(await s.rpc("join_class", { p_code: code }));
  const attempt = must(
    await s.rpc("start_attempt", { p_test_id: test.id, p_session: `load-${i}` }),
  );
  const channel = s.channel(`test:${test.id}`, { config: { private: true } });
  channel.subscribe();
  students.push({ s, channel });
  timers.push(
    setInterval(() => {
      sent++;
      void channel.send({
        type: "broadcast",
        event: "summary",
        payload: { attempt_id: attempt.attempt_id, answered: 0, total: 1, at: Date.now() },
      });
    }, 10_000),
  );
  timers.push(
    setInterval(
      async () => {
        const { error } = await s.from("proctor_events").insert({
          client_id: crypto.randomUUID(),
          attempt_id: attempt.attempt_id,
          device: "laptop",
          kind: "looking_away",
          severity: "warn",
          started_at: new Date().toISOString(),
        });
        if (!error) events++;
      },
      60_000 + Math.random() * 60_000,
    ),
  );
}

console.log(`Running for ${MINUTES} minute(s)…`);
await new Promise((resolve) => setTimeout(resolve, MINUTES * 60_000));
timers.forEach(clearInterval);
for (const { s, channel } of students) await s.removeChannel(channel);
await teacher.removeChannel(grid);

const hours = (STUDENTS * MINUTES) / 60;
const perAttemptHour = (sent + received) / hours;
console.log(
  JSON.stringify(
    {
      students: STUDENTS,
      minutes: MINUTES,
      realtime_connections: STUDENTS + 1,
      summaries_sent: sent,
      grid_messages_received: received,
      events_inserted: events,
      realtime_messages_per_attempt_hour: Math.round(perAttemptHour),
      attempt_hours_per_month_at_2M_messages: Math.round(2_000_000 / perAttemptHour),
    },
    null,
    2,
  ),
);
process.exit(0);
