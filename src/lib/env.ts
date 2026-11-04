import { z } from "zod";

const schema = z.object({
  VITE_SUPABASE_URL: z.url({ protocol: /^https$/ }),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type Env = z.infer<typeof schema>;

/**
 * The browser's configuration. Both values are public by design; the secret key never reaches
 * the browser. Throws, naming the missing variable, rather than letting the app start half-wired.
 * Called by the Supabase client from phase 2; nothing needs it before then.
 */
export function readEnv(source: Record<string, unknown> = import.meta.env): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const names = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Missing or invalid environment variables: ${names}. See .env.example.`);
  }
  return result.data;
}
