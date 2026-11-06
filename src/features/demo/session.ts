import { Detector, type Detection } from "../proctoring/detector";
import { watchIntegrity } from "../proctoring/integrity";
import { watchSpeech } from "../proctoring/speech";
import { Rules, type Action, type EventKind } from "../proctoring/rules/engine";
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
        watchSpeech(this.stream, (speaking) =>
          this.set(
            { signals: { ...this.state.signals, speaking } },
            this.rules.speech({ t: Date.now(), speaking }),
          ),
        ),
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
    for (const cleanup of this.cleanups) cleanup();
    this.video.srcObject = null;
  }

  /** Empties the teacher's list; open events that close later are simply not shown. */
  clear(): void {
    this.set({ events: [] });
  }

  // The same reading of a detection as ProctorSession.onDetection.
  private onDetection(result: Detection) {
    const actions = this.rules.face({
      t: result.t,
      faces: result.faces,
      yaw: result.yaw,
      pitch: result.pitch,
    });
    let { phone, book } = this.state.signals;
    if (result.objects) {
      const best = (label: string) =>
        Math.max(0, ...result.objects!.filter((o) => o.label === label).map((o) => o.score));
      phone = best("cell phone");
      book = best("book");
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
      const opened = actions.flatMap((a) => (a.type === "open" ? [a.kind] : []));
      next.seen = [...new Set([...next.seen, ...opened])];
    }
    this.state = next;
    this.onChange(next);
  }
}
