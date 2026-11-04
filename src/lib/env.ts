export type Env = {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_PUBLISHABLE_KEY: string;
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/** https everywhere, except the local Supabase stack (`npm run db:start`), which is plain http. */
function isAllowedUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname));
  } catch {
    return false;
  }
}

/**
 * The browser's configuration. Both values are public by design; the secret key never reaches
 * the browser. Throws, naming what is wrong, rather than letting the app start half-wired.
 */
export function readEnv(source: Record<string, unknown> = import.meta.env): Env {
  const bad: string[] = [];
  const url = source.VITE_SUPABASE_URL;
  const key = source.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!isAllowedUrl(url)) bad.push("VITE_SUPABASE_URL");
  if (typeof key !== "string" || key === "") bad.push("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (bad.length > 0) {
    throw new Error(
      `Missing or invalid environment variables: ${bad.join(", ")}. See .env.example.`,
    );
  }
  return { VITE_SUPABASE_URL: url as string, VITE_SUPABASE_PUBLISHABLE_KEY: key as string };
}
