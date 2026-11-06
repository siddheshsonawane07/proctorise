import { Detector, type Detection } from "../proctoring/detector";
import { watchIntegrity } from "../proctoring/integrity";
import { watchSpeech } from "../proctoring/speech";
import { Rules, type Action, type EventKind } from "../proctoring/rules/engine";
import { readObjects } from "../proctoring/objects";
import { STUDENT_MESSAGE } from "../proctoring/messages";
import { voice } from "../proctoring/voice";
import { applyActions, type DemoEvent } from "./events";

/** What the checks see right now; null until the first reading. */
export type Signals = {
  faces: number | null;
  yaw: number | null;
  pitch: number | null;
  phone: number | null;
  book: number | null;
  speaking: boolean;
};

export type DemoState = {
  engine: "loading" | "running" | "unavailable";
  signals: Signals;
  events: DemoEvent[];
  /** Every kind seen since the start, kept when the list is cleared. */
  seen: EventKind[];
};

/**
 * The checks a real test runs on the laptop (the detector worker, the rules on the standard
 * preset, the browser and microphone watchers) with nowhere to send them: no event sink, no
 * snapshots, no Supabase. What they notice lives in this object and goes when the page closes.
 * The camera stream belongs to the page (useCamera), which releases it.
 */
export class DemoSession {
  private readonly rules = new Rules("standard");
  private readonly video = document.createElement("video");
  private readonly detector = new Detector({
    withFace: true,
    fps: 3,
    objectsEvery: 3,
    now: () => Date.now(),
    onResult: (result) => this.onDetection(result),
  });
  private readonly cleanups: (() => void)[] = [];
  private stopped = false;
  /** Read warnings aloud, as a test does unless the teacher turned it off. */
  speak = true;
  private state: DemoState = {
    engine: "loading",
    signals: { faces: null, yaw: null, pitch: null, phone: null, book: null, speaking: false },
    events: [],
    seen: [],
  };

  constructor(
    private readonly stream: MediaStream,
    private readonly onChange: (state: DemoState) => void,
  ) {}

  async start(): Promise<void> {
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.srcObject = this.stream;
    void this.video.play().catch(() => {});

    this.cleanups.push(
      watchIntegrity({
        condition: (kind, on) => this.set({}, this.rules.browser(kind, on, Date.now())),
        instant: (kind, details) =>
          this.set({}, this.rules.instant(kind, Date.now(), "info", details)),
      }),
    );
    if (this.stream.getAudioTracks().length) {
      this.cleanups.push(
        // While the laptop reads a warning, its own voice is not the visitor talking.
        watchSpeech(this.stream, (heard) => {
          const speaking = heard && !voice.isTalking();
          this.set(
            { signals: { ...this.state.signals, speaking } },
            this.rules.speech({ t: Date.now(), speaking }),
          );
        }),
      );
    }
    try {
      await this.detector.start(this.video);
      this.set({ engine: "running" });
    } catch {
      this.set({ engine: "unavailable" });
    }
  }

  /** Ends the checks. Safe to call twice. */
  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.detector.stop();
    voice.stop();
    for (const cleanup of this.cleanups) cleanup();
    this.video.srcObject = null;
  }

  /** Empties the teacher's list; open events that close later are simply not shown. */
  clear(): void {
    this.set({ events: [] });
  }

  private onDetection(result: Detection) {
    const actions = this.rules.face({
      t: result.t,
      faces: result.faces,
      yaw: result.yaw,
      pitch: result.pitch,
    });
    let { phone, book } = this.state.signals;
    if (result.objects) {
      ({ phone, book } = readObjects(result.objects));
      actions.push(...this.rules.objects({ t: result.t, phone, book }));
    }
    const { faces, yaw, pitch } = result;
    this.set({ signals: { ...this.state.signals, faces, yaw, pitch, phone, book } }, actions);
  }

  private set(patch: Partial<DemoState>, actions: Action[] = []) {
    if (this.stopped) return;
    const next = { ...this.state, ...patch };
    if (actions.length) {
      next.events = applyActions(next.events, actions);
      const opened = actions.flatMap((a) => (a.type === "open" ? [a] : []));
      next.seen = [...new Set([...next.seen, ...opened.map((a) => a.kind)])];
      for (const a of opened) {
        const text = STUDENT_MESSAGE[a.kind];
        if (this.speak && text && a.severity !== "info") voice.warn(a.kind, text);
      }
    }
    this.state = next;
    this.onChange(next);
  }
}
