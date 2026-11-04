/**
 * The side camera's rules (PHASE_6 § 5), on the same Condition as the laptop's: minimum
 * durations, two-of-three votes, and a second of clear before closing.
 */
import { Condition, type Action } from "./engine";

export const PHONE = {
  personMs: 2_000,
  objectScore: 0.6,
  /** Below this correlation with the setup view, the phone is pointing somewhere else. */
  movedBelow: 0.6,
  movedMs: 10_000,
};

export type PhoneObjects = { t: number; persons: number; phone: number; book: number };

export class PhoneRules {
  private readonly person: Condition;
  private readonly object: Condition;
  private readonly moved: Condition;
  private readonly camera: Condition;
  private votes: PhoneObjects[] = [];

  constructor(newId: () => string = () => crypto.randomUUID()) {
    this.person = new Condition("phone_person", "high", PHONE.personMs, newId);
    this.object = new Condition("phone_object", "high", 0, newId);
    this.moved = new Condition("phone_moved", "warn", PHONE.movedMs, newId);
    this.camera = new Condition("phone_camera_lost", "high", 3_000, newId);
  }

  objects(s: PhoneObjects): Action[] {
    this.votes = [...this.votes, s].slice(-3);
    const thing =
      this.votes.filter((v) => Math.max(v.phone, v.book) >= PHONE.objectScore).length >= 2;
    const best = Math.max(...this.votes.map((v) => Math.max(v.phone, v.book)));
    return [
      ...this.person.update(s.persons >= 2, s.t, null, { persons: s.persons }),
      ...this.object.update(thing, s.t, best),
    ];
  }

  view(t: number, similarity: number): Action[] {
    return this.moved.update(similarity < PHONE.movedBelow, t, null, {
      similarity: Math.round(similarity * 100) / 100,
    });
  }

  cameraLost(on: boolean, t: number): Action[] {
    return on ? this.camera.update(true, t) : this.camera.end(t);
  }

  /** The page was hidden (app switched, screen locked) from `from` to `to`: one closed event. */
  hidden(from: number, to: number, newId: () => string = () => crypto.randomUUID()): Action[] {
    const id = newId();
    return [
      {
        type: "open",
        id,
        kind: "phone_hidden",
        severity: "high",
        startedAt: from,
        confidence: null,
        details: { seconds: Math.round((to - from) / 1000) },
      },
      { type: "close", id, endedAt: to },
    ];
  }

  end(t: number): Action[] {
    return [this.person, this.object, this.moved, this.camera].flatMap((c) => c.end(t));
  }
}

/**
 * On the laptop: the phone's presence on the pairing channel. Gone for 20 s is a warning, two
 * minutes is high (PHASE_6 § 5).
 */
export class PhonePresence {
  private readonly gone: Condition;
  private goneSince: number | null = null;

  constructor(newId: () => string = () => crypto.randomUUID()) {
    this.gone = new Condition("phone_gone", "warn", 20_000, newId, 120_000);
  }

  /** Called on a timer and on every presence change. */
  update(present: boolean, t: number): Action[] {
    if (present) this.goneSince = null;
    else this.goneSince ??= t;
    return this.gone.update(!present, t);
  }

  /** How long the phone has been gone, for the teacher's optional automatic submit. */
  goneForMs(t: number): number {
    return this.goneSince === null ? 0 : t - this.goneSince;
  }

  end(t: number): Action[] {
    return this.gone.end(t);
  }
}
