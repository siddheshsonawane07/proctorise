/**
 * Turns detector and browser signals into proctoring events. Pure: no browser APIs, no clock of
 * its own (every signal carries its time), so it is tested from recorded traces.
 *
 * The fairness rules live here (Phase-5-Critic #3, #4): nothing fires on one frame; every rule has
 * a minimum duration or an n-of-m vote; a condition must stay clear for CLEAR_MS before an event
 * closes, so a flicker of detection neither starts nor ends one. Thresholds are per preset, from
 * PHASE_5 § 5.4, until the spike's measurements replace them.
 */
import type { Preset } from "../../builder/proctoring";

export type Severity = "info" | "warn" | "high";

export type EventKind =
  | "face_missing"
  | "multiple_faces"
  | "looking_away"
  | "object_phone"
  | "object_book"
  | "speech"
  | "identity_mismatch"
  | "identity_passed"
  | "tab_hidden"
  | "window_blur"
  | "fullscreen_exit"
  | "screen_share_stopped"
  | "second_display"
  | "camera_lost"
  | "copy_paste"
  | "context_menu"
  | "shortcut"
  | "phone_gone"
  | "phone_hidden"
  | "phone_moved"
  | "phone_person"
  | "phone_object"
  | "phone_camera_lost"
  | "phone_setup_unconfirmed";

/** Conditions that last: the browser reports them turning on and off. */
export type BrowserCondition =
  | "tab_hidden"
  | "window_blur"
  | "fullscreen_exit"
  | "screen_share_stopped"
  | "second_display"
  | "camera_lost";

export type FaceSignal = { t: number; faces: number; yaw: number | null; pitch: number | null };
export type ObjectSignal = { t: number; phone: number; book: number };
export type SpeechSignal = { t: number; speaking: boolean };

export type Action =
  | {
      type: "open";
      id: string;
      kind: EventKind;
      severity: Severity;
      startedAt: number;
      confidence: number | null;
      details: Record<string, unknown>;
    }
  | { type: "escalate"; id: string; severity: Severity }
  | { type: "close"; id: string; endedAt: number };

type Thresholds = {
  camera: boolean;
  faceMissingMs: number;
  faceMissingHighMs: number;
  multipleFacesMs: number;
  lookingAwayMs: number;
  lookingAwayWindowMs: number;
  yawDeg: number;
  pitchDeg: number;
  objectScore: number;
  speechMs: number;
};

const STANDARD: Thresholds = {
  camera: true,
  faceMissingMs: 5_000,
  faceMissingHighMs: 30_000,
  multipleFacesMs: 2_000,
  lookingAwayMs: 8_000,
  lookingAwayWindowMs: 30_000,
  yawDeg: 35,
  pitchDeg: 25,
  objectScore: 0.6,
  speechMs: 3_000,
};

export const PRESET_THRESHOLDS: Record<Preset, Thresholds> = {
  light: { ...STANDARD, camera: false },
  standard: STANDARD,
  strict: {
    ...STANDARD,
    faceMissingMs: 3_000,
    faceMissingHighMs: 15_000,
    multipleFacesMs: 1_000,
    lookingAwayMs: 5_000,
    objectScore: 0.5,
    speechMs: 2_000,
  },
};

/** How long a condition must stay clear before its event closes. */
export const CLEAR_MS = 1_000;

const BROWSER: Record<BrowserCondition, { severity: Severity; minMs: number }> = {
  tab_hidden: { severity: "warn", minMs: 0 },
  window_blur: { severity: "warn", minMs: 0 },
  fullscreen_exit: { severity: "warn", minMs: 0 },
  screen_share_stopped: { severity: "high", minMs: 0 },
  second_display: { severity: "high", minMs: 0 },
  camera_lost: { severity: "high", minMs: 3_000 },
};

/** One lasting condition: when it began, whether its event is open, and when it was last seen. */
export class Condition {
  private since: number | null = null;
  private lastActive = 0;
  private openId: string | null = null;
  private severity: Severity;

  constructor(
    private readonly kind: EventKind,
    private readonly startSeverity: Severity,
    private readonly minMs: number,
    private readonly newId: () => string,
    private readonly highAfterMs: number | null = null,
  ) {
    this.severity = startSeverity;
  }

  update(active: boolean, t: number, confidence: number | null = null, details = {}): Action[] {
    const actions: Action[] = [];
    if (active) {
      this.since ??= t;
      this.lastActive = t;
      if (!this.openId && t - this.since >= this.minMs) {
        this.openId = this.newId();
        this.severity = this.startSeverity;
        actions.push({
          type: "open",
          id: this.openId,
          kind: this.kind,
          severity: this.severity,
          startedAt: this.since,
          confidence,
          details,
        });
      }
      if (
        this.openId &&
        this.highAfterMs !== null &&
        this.severity !== "high" &&
        t - this.since >= this.highAfterMs
      ) {
        this.severity = "high";
        actions.push({ type: "escalate", id: this.openId, severity: "high" });
      }
    } else if (this.since !== null && t - this.lastActive >= CLEAR_MS) {
      if (this.openId) actions.push({ type: "close", id: this.openId, endedAt: this.lastActive });
      this.since = null;
      this.openId = null;
    }
    return actions;
  }

  end(t: number): Action[] {
    if (!this.openId) return [];
    const id = this.openId;
    this.openId = null;
    this.since = null;
    return [{ type: "close", id, endedAt: t }];
  }
}

export class Rules {
  private readonly th: Thresholds;
  private readonly faceMissing: Condition;
  private readonly multipleFaces: Condition;
  private readonly lookingAway: Condition;
  private readonly phone: Condition;
  private readonly book: Condition;
  private readonly speaking: Condition;
  private readonly browserConditions: Record<BrowserCondition, Condition>;
  private awaySamples: { t: number; away: boolean }[] = [];
  private objectVotes: ObjectSignal[] = [];

  constructor(
    preset: Preset,
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {
    this.th = PRESET_THRESHOLDS[preset];
    const th = this.th;
    this.faceMissing = new Condition(
      "face_missing",
      "warn",
      th.faceMissingMs,
      newId,
      th.faceMissingHighMs,
    );
    this.multipleFaces = new Condition("multiple_faces", "high", th.multipleFacesMs, newId);
    this.lookingAway = new Condition("looking_away", "warn", 0, newId);
    this.phone = new Condition("object_phone", "high", 0, newId);
    this.book = new Condition("object_book", "warn", 0, newId);
    this.speaking = new Condition("speech", "warn", th.speechMs, newId);
    this.browserConditions = Object.fromEntries(
      (Object.keys(BROWSER) as BrowserCondition[]).map((kind) => [
        kind,
        new Condition(kind, BROWSER[kind].severity, BROWSER[kind].minMs, newId),
      ]),
    ) as Record<BrowserCondition, Condition>;
  }

  face(s: FaceSignal): Action[] {
    if (!this.th.camera) return [];
    const away =
      s.faces === 1 &&
      s.yaw !== null &&
      s.pitch !== null &&
      (Math.abs(s.yaw) > this.th.yawDeg || Math.abs(s.pitch) > this.th.pitchDeg);
    return [
      ...this.faceMissing.update(s.faces === 0, s.t),
      ...this.multipleFaces.update(s.faces >= 2, s.t, null, { faces: s.faces }),
      ...this.lookingAway.update(this.awayFor(s.t, away) >= this.th.lookingAwayMs, s.t),
    ];
  }

  objects(s: ObjectSignal): Action[] {
    if (!this.th.camera) return [];
    // Two of the last three object frames (Phase-5-Critic #3).
    this.objectVotes = [...this.objectVotes, s].slice(-3);
    const votes = (key: "phone" | "book") =>
      this.objectVotes.filter((v) => v[key] >= this.th.objectScore).length >= 2;
    const best = (key: "phone" | "book") => Math.max(...this.objectVotes.map((v) => v[key]));
    return [
      ...this.phone.update(votes("phone"), s.t, best("phone")),
      ...this.book.update(votes("book"), s.t, best("book")),
    ];
  }

  speech(s: SpeechSignal): Action[] {
    if (!this.th.camera) return [];
    return this.speaking.update(s.speaking, s.t);
  }

  /** A browser condition turning on or off: leaving the tab, full screen, screen share… */
  browser(kind: BrowserCondition, on: boolean, t: number): Action[] {
    const condition = this.browserConditions[kind];
    // Browser facts are exact, so they close at once rather than after CLEAR_MS.
    return on ? condition.update(true, t) : condition.end(t);
  }

  /** Something that happens at a moment: a paste, a right-click, a blocked shortcut. */
  instant(
    kind: "copy_paste" | "context_menu" | "shortcut" | "identity_mismatch",
    t: number,
    severity: Severity = "info",
    details: Record<string, unknown> = {},
  ): Action[] {
    const id = this.newId();
    return [
      { type: "open", id, kind, severity, startedAt: t, confidence: null, details },
      { type: "close", id, endedAt: t },
    ];
  }

  /** Closes everything still open, when the attempt ends. */
  end(t: number): Action[] {
    return [
      this.faceMissing,
      this.multipleFaces,
      this.lookingAway,
      this.phone,
      this.book,
      this.speaking,
      ...Object.values(this.browserConditions),
    ].flatMap((c) => c.end(t));
  }

  /** Time spent looking away within the window, from the samples' spacing. */
  private awayFor(t: number, away: boolean): number {
    this.awaySamples.push({ t, away });
    this.awaySamples = this.awaySamples.filter((s) => s.t > t - this.th.lookingAwayWindowMs);
    let total = 0;
    for (let i = 1; i < this.awaySamples.length; i++) {
      const prev = this.awaySamples[i - 1]!;
      if (prev.away) total += this.awaySamples[i]!.t - prev.t;
    }
    return away ? total : 0;
  }
}
