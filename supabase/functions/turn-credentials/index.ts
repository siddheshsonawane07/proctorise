// Short-lived TURN credentials from Cloudflare Realtime, for live view when a direct connection
// fails (PHASE_7 § 7). The Cloudflare key lives only in this function's secrets:
//   supabase secrets set CLOUDFLARE_TURN_KEY_ID=… CLOUDFLARE_TURN_API_TOKEN=…
// Only signed-in people with an account get credentials (the phone's anonymous user does not).
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const authorization = req.headers.get("Authorization") ?? "";
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: hasProfile } = await client.rpc("has_profile");
  if (!hasProfile) return new Response("Not allowed", { status: 403, headers: CORS });

  const keyId = Deno.env.get("CLOUDFLARE_TURN_KEY_ID");
  const token = Deno.env.get("CLOUDFLARE_TURN_API_TOKEN");
  if (!keyId || !token) return Response.json({ iceServers: [] }, { headers: CORS });

  const res = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: 600 }),
    },
  );
  if (!res.ok) return Response.json({ iceServers: [] }, { headers: CORS });
  const body = await res.json();
  return Response.json({ iceServers: body.iceServers ?? [] }, { headers: CORS });
});
