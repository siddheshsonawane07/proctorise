/** A message a person can act on, from whatever Supabase threw. */
export function messageFrom(error: unknown): string {
  const text =
    error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message
      : "";
  if (/email not confirmed/i.test(text)) return "Confirm your email first. Check your inbox.";
  if (/invalid login credentials/i.test(text)) return "That email and password don't match.";
  if (/failed to fetch|network/i.test(text))
    return "Can't reach the server. Check your connection.";
  return text || "Something went wrong. Please try again.";
}

/** Only same-site paths, so a crafted `?next=` cannot send someone elsewhere after sign-in. */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/app";
  return next;
}
