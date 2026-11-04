import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { readEnv } from "./env";

const env = readEnv();

/**
 * The one Supabase client. It is the only holder of the session (Phase-2-Critic #4): nothing
 * copies the session into React state or storage of its own.
 */
export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
