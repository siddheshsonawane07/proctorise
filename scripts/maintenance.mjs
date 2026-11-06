// Runs the daily job (supabase/functions/maintenance/run.ts) from this machine: for the e2e test
// against the local stack, or by hand. In production the Edge Function runs it every day.
//
//   SUPABASE_URL=… SUPABASE_SECRET_KEY=… node scripts/maintenance.mjs
import { createClient } from "@supabase/supabase-js";
import { runMaintenance } from "../supabase/functions/maintenance/run.ts";

const URL = process.env.SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
if (!URL || !SECRET) {
  console.error("Set SUPABASE_URL and SUPABASE_SECRET_KEY.");
  process.exit(1);
}
const admin = createClient(URL, SECRET, { auth: { persistSession: false } });
const report = await runMaintenance(admin);
console.log(JSON.stringify({ at: new Date().toISOString(), ...report }));
