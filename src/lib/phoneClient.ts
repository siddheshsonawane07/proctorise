import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { readEnv } from "./env";

const env = readEnv();

/**
 * The phone page's own Supabase client, with its own storage key: its anonymous sign-in must not
 * replace an account someone is signed in with in the same phone browser.
 */
export const phoneClient = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { storageKey: "proctorise-phone", persistSession: true, autoRefreshToken: true } },
);
