/**
 * Helpers for tests that run against the local Supabase stack (`npm run db:start`).
 * The secret key is the local stack's fixed default, read from the test runner's environment
 * only; it is never part of the app's build.
 */
export const API_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:55321";
export const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:55324";
export const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";

export const hasStack = PUBLISHABLE_KEY !== "" && SECRET_KEY !== "";

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;
}

async function call(path: string, init: RequestInit & { key?: string; token?: string } = {}) {
  const { key = SECRET_KEY, token, ...rest } = init;
  const headers = new Headers(rest.headers);
  headers.set("apikey", key);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_URL}${path}`, { ...rest, headers });
}

/** A confirmed account, made with the admin API; optionally promoted to admin. */
export async function createUser(input: {
  email: string;
  password: string;
  fullName: string;
  admin?: boolean;
  teacher?: boolean;
}): Promise<string> {
  const res = await call("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName, adult_confirmed: "true" },
    }),
  });
  if (!res.ok) throw new Error(`createUser: ${res.status} ${await res.text()}`);
  const { id } = (await res.json()) as { id: string };
  if (input.admin || input.teacher) {
    const promote = await call(`/rest/v1/profiles?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify(
        input.admin ? { role: "admin" } : { role: "teacher", teacher_status: "approved" },
      ),
    });
    if (!promote.ok) throw new Error(`promote: ${promote.status} ${await promote.text()}`);
  }
  return id;
}

/** Signs in as the person would, with the public key: the token their browser would hold. */
export async function signIn(email: string, password: string) {
  const res = await call("/auth/v1/token?grant_type=password", {
    method: "POST",
    key: PUBLISHABLE_KEY,
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`signIn: ${res.status} ${await res.text()}`);
  return (await res.json()) as { access_token: string; user: { id: string } };
}

/** A REST call with a person's token and the public key, exactly as their browser could make. */
export function asUser(token: string, path: string, init: RequestInit = {}) {
  return call(path, { ...init, key: PUBLISHABLE_KEY, token });
}

/** The first link in the newest email to an address, from the local stack's Mailpit. */
export async function latestEmailLink(to: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
    );
    const { messages } = (await search.json()) as { messages: { ID: string }[] };
    const newest = messages[0];
    if (newest) {
      const message = await fetch(`${MAILPIT_URL}/api/v1/message/${newest.ID}`);
      const { HTML, Text } = (await message.json()) as { HTML: string; Text: string };
      const link = HTML.match(/href="([^"]+)"/)?.[1] ?? Text.match(/https?:\/\/\S+/)?.[0];
      if (link) return link.replaceAll("&amp;", "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No email reached ${to}`);
}

/** Calls a database function as a person, with their token. Throws on an error response. */
export async function rpcAs<T = unknown>(token: string, fn: string, args: object): Promise<T> {
  const res = await asUser(token, `/rest/v1/rpc/${fn}`, {
    method: "POST",
    body: JSON.stringify(args),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${fn}: ${res.status} ${body}`);
  return (body ? JSON.parse(body) : null) as T;
}

/** A REST call with the secret key: for setting up what a test needs, never for checking it. */
export function asService(path: string, init: RequestInit = {}) {
  return call(path, init);
}
