// The daily job (PHASE_8 § 8.1, 8.4), run by .github/workflows/maintenance.yml with the secret key:
// 1. deletes snapshots past their test's retention, through the Storage API (deleting rows in
//    storage.objects would leave the files behind, Phase-8-Critic #2), then forgets them;
// 2. deletes accounts whose owners asked, with their photo and snapshots;
// 3. by running at all, keeps a free Supabase project from pausing after a week idle.
//
//   SUPABASE_URL=… SUPABASE_SECRET_KEY=… node scripts/maintenance.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
if (!URL || !SECRET) {
  console.error("Set SUPABASE_URL and SUPABASE_SECRET_KEY.");
  process.exit(1);
}
const admin = createClient(URL, SECRET, { auth: { persistSession: false } });
const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

const report = { purged_snapshots: 0, deleted_accounts: 0, profiles: 0 };

// 1. Retention.
for (;;) {
  const rows = must(await admin.rpc("expired_evidence", { p_limit: 500 }));
  if (!rows.length) break;
  const paths = rows.map((r) => r.path);
  must(await admin.storage.from("evidence").remove(paths));
  report.purged_snapshots += must(await admin.rpc("forget_evidence", { p_paths: paths }));
}

// 2. Accounts asked to be deleted.
for (const { user_id, files } of must(await admin.rpc("accounts_to_delete"))) {
  if (files.enrolment.length) must(await admin.storage.from("enrolment").remove(files.enrolment));
  if (files.evidence.length) {
    must(await admin.storage.from("evidence").remove(files.evidence));
    must(await admin.rpc("forget_evidence", { p_paths: files.evidence }));
  }
  must(await admin.auth.admin.deleteUser(user_id));
  report.deleted_accounts++;
}

// 3. One cheap query: activity for the free plan's idle pause.
const { count } = await admin.from("profiles").select("id", { count: "exact", head: true });
report.profiles = count ?? 0;

console.log(JSON.stringify({ at: new Date().toISOString(), ...report }));
