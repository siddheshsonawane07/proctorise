// The daily maintenance job, called by pg_cron through pg_net (migration 20261106000003). It runs
// inside Supabase with the service key Supabase gives every function, so no secret is ever on
// GitHub. It answers only a request carrying the token pg_cron reads from the database's vault;
// the token is made inside the database and never leaves Supabase.
import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { runMaintenance, type AdminClient } from "./run.ts";

function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Not allowed", { status: 405 });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const { data: token, error } = await admin.rpc("maintenance_token");
  const given = req.headers.get("x-maintenance-token") ?? "";
  if (error || typeof token !== "string" || !token || !same(given, token)) {
    return new Response("Not allowed", { status: 403 });
  }
  try {
    const report = await runMaintenance(admin as unknown as AdminClient);
    const body = { at: new Date().toISOString(), ...report };
    console.log(JSON.stringify(body));
    return Response.json(body);
  } catch (e) {
    console.error(e);
    return new Response("Maintenance failed", { status: 500 });
  }
});
