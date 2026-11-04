/**
 * A test's proctoring settings. The database is the authority: valid_proctoring() in
 * supabase/migrations/20261104000006_tests.sql checks exactly these keys and ranges
 * (Phase-3-Critic #6). proctoring.test.ts runs the same examples as classes.test.sql.
 */
export type Preset = "light" | "standard" | "strict";

export type Proctoring = {
  preset: Preset;
  identity_check: boolean;
  phone_required: boolean;
  screen_share_required: boolean;
  snapshot_interval_s: number;
  /** End the attempt when screen sharing has been off this long. Off when null (D7). */
  auto_submit_screen_share_s: number | null;
  /** End the attempt when the phone has been gone this long. Off when null (D7). */
  auto_submit_phone_gone_min: number | null;
};

export const PRESETS: Record<Preset, { label: string; text: string }> = {
  light: {
    label: "Light",
    text: "Browser checks only: leaving the test, full screen, copy and paste. No camera checks.",
  },
  standard: {
    label: "Standard",
    text: "Camera checks for a missing face, a second person, a phone or a book, and looking away for long.",
  },
  strict: {
    label: "Strict",
    text: "As Standard, with shorter limits before a flag. Expect more flags to review.",
  },
};

export const SNAPSHOT_INTERVALS = [30, 60, 120, 300];

/** The same rules as valid_proctoring(), for showing a problem before the database refuses it. */
export function isValidProctoring(value: unknown): value is Proctoring {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const p = value as Record<string, unknown>;
  const keys = Object.keys(p).sort().join(",");
  const expected = [
    "auto_submit_phone_gone_min",
    "auto_submit_screen_share_s",
    "identity_check",
    "phone_required",
    "preset",
    "screen_share_required",
    "snapshot_interval_s",
  ].join(",");
  const within = (v: unknown, lo: number, hi: number) =>
    typeof v === "number" && v >= lo && v <= hi;
  return (
    keys === expected &&
    (p.preset === "light" || p.preset === "standard" || p.preset === "strict") &&
    typeof p.identity_check === "boolean" &&
    typeof p.phone_required === "boolean" &&
    typeof p.screen_share_required === "boolean" &&
    within(p.snapshot_interval_s, 30, 300) &&
    (p.auto_submit_screen_share_s === null || within(p.auto_submit_screen_share_s, 10, 600)) &&
    (p.auto_submit_phone_gone_min === null || within(p.auto_submit_phone_gone_min, 1, 30))
  );
}
