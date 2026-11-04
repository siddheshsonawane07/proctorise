import { Detector, type Detection } from "./detector";
import { EventSink } from "./sink";
import { uploadSnapshot } from "./evidence";
import { watchIntegrity } from "./integrity";
import { watchSpeech } from "./speech";
import {
  Rules,
  type Action,
  type BrowserCondition,
  type EventKind,
  type Severity,
} from "./rules/engine";
import { embed, similarity, MATCH_THRESHOLD, type Embedding } from "./identity";
import { STUDENT_MESSAGE } from "./messages";
import type { Proctoring } from "../builder/proctoring";

export type SessionStatus = {
  engine: "loading" | "running" | "unavailable";
  camera: boolean;
  screen: "shared" | "stopped" | "not_required";
  fullscreen: boolean;
  /** Open events the student should know about, newest first, in plain words. */
  warnings: { id: string; kind: EventKind; text: string }[];
};

type Options = {
  attemptId: string;
  proctoring: Proctoring;
  /** None under the light preset with no identity check: browser checks only. */
  camera: MediaStream | null;
  screen: MediaStream | null;
  /** Server time minus local time, in ms. */
  offsetMs: number;
  reference: Embedding | null;
  onStatus: (status: SessionStatus) => void;
};

const IDENTITY_RECHECK_MS = 3 * 60_000;

/**
 * One proctored attempt on the laptop. Owns the camera and screen streams, the detector worker,
 * the microphone, every listener and every timer, and releases them all in stop()
 * (Phase-5-Critic #2).
 */
export class ProctorSession {
  private readonly rules: Rules;
  private readonly sink = new EventSink();
  private readonly detector: Detector;
  private readonly cameraVideo = document.createElement("video");
  private readonly screenVideo = document.createElement("video");
  private readonly cleanups: (() => void)[] = [];
  private readonly open = new Map<string, { kind: EventKind; severity: Severity }>();
  private status: SessionStatus;
  private stopped = false;

  constructor(private options: Options) {
    this.rules = new Rules(options.proctoring.preset);
    this.detector = new Detector({
      withFace: true,
      fps: options.proctoring.preset === "strict" ? 4 : 3,
      objectsEvery: 3,
      now: () => this.now(),
      onResult: (result) => this.onDetection(result),
    });
    this.status = {
      engine: options.proctoring.preset === "light" ? "running" : "loading",
      camera: !!options.camera,
      screen: options.screen ? "shared" : "not_required",
      fullscreen: !!document.fullscreenElement,
      warnings: [],
    };
  }

  /** Server-aligned now, in ms: every event's time comes from here. */
  now(): number {
    return Date.now() + this.options.offsetMs;
  }

  async start(): Promise<void> {
    const { camera, screen, proctoring } = this.options;
    if (camera) this.attach(this.cameraVideo, camera);
    if (screen) this.attach(this.screenVideo, screen);
    this.sink.start();

    this.cleanups.push(
      watchIntegrity({
        condition: (kind, on) => this.browser(kind, on),
        instant: (kind, details) =>
          this.apply(this.rules.instant(kind, this.now(), "info", details)),
      }),
    );
    for (const track of camera?.getVideoTracks() ?? []) this.watchTrack(track, "camera_lost");
    if (screen)
      for (const track of screen.getVideoTracks()) this.watchTrack(track, "screen_share_stopped");
    if (!document.fullscreenElement) this.browser("fullscreen_exit", true);

    if (camera) {
      const thumbnails = setInterval(
        () => void uploadSnapshot(this.options.attemptId, this.cameraVideo, "camera", "thumbnail"),
        proctoring.snapshot_interval_s * 1000,
      );
      this.cleanups.push(() => clearInterval(thumbnails));
    }

    if (camera && proctoring.preset !== "light") {
      if (camera.getAudioTracks().length) {
        this.cleanups.push(
          watchSpeech(camera, (speaking) =>
            this.apply(this.rules.speech({ t: this.now(), speaking })),
          ),
        );
      }
      try {
        await this.detector.start(this.cameraVideo);
        this.setStatus({ engine: "running" });
      } catch {
        // The test goes on with browser checks only; the teacher sees that the engine was off.
        this.setStatus({ engine: "unavailable" });
      }
    }

    if (proctoring.identity_check && this.options.reference) {
      const recheck = setInterval(() => void this.checkIdentity(), IDENTITY_RECHECK_MS);
      this.cleanups.push(() => clearInterval(recheck));
    }
  }

  /** Ends everything. Safe to call twice. */
  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    this.apply(this.rules.end(this.now()));
    this.detector.stop();
    for (const cleanup of this.cleanups) cleanup();
    for (const stream of [this.options.camera, this.options.screen]) {
      stream?.getTracks().forEach((track) => track.stop());
    }
    this.cameraVideo.srcObject = null;
    this.screenVideo.srcObject = null;
    await this.sink.stop();
  }

  /** Records an identity result from the start-of-test check. */
  recordIdentity(passed: boolean, score: number | null) {
    const t = this.now();
    if (passed) {
      this.sink.add(this.row("identity_passed", "info", t, score));
    } else {
      this.apply(this.rules.instant("identity_mismatch", t, "high", { score, at: "start" }));
    }
  }

  /** A new screen share after the old one stopped. */
  replaceScreen(stream: MediaStream) {
    this.options.screen?.getTracks().forEach((t) => t.stop());
    this.options.screen = stream;
    this.attach(this.screenVideo, stream);
    for (const track of stream.getVideoTracks()) this.watchTrack(track, "screen_share_stopped");
    this.browser("screen_share_stopped", false);
  }

  get cameraElement(): HTMLVideoElement {
    return this.cameraVideo;
  }

  private attach(video: HTMLVideoElement, stream: MediaStream) {
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    void video.play().catch(() => {});
  }

  private watchTrack(track: MediaStreamTrack, kind: "camera_lost" | "screen_share_stopped") {
    const lost = () => this.browser(kind, true);
    track.addEventListener("ended", lost);
    if (kind === "camera_lost") {
      track.addEventListener("mute", lost);
      track.addEventListener("unmute", () => this.browser(kind, false));
    }
    this.cleanups.push(() => track.removeEventListener("ended", lost));
  }

  private browser(kind: BrowserCondition, on: boolean) {
    if (kind === "fullscreen_exit") this.setStatus({ fullscreen: !on });
    if (kind === "camera_lost") this.setStatus({ camera: !on });
    if (kind === "screen_share_stopped" && this.options.screen) {
      this.setStatus({ screen: on ? "stopped" : "shared" });
    }
    this.apply(this.rules.browser(kind, on, this.now()));
  }

  private onDetection(result: Detection) {
    const actions = this.rules.face({
      t: result.t,
      faces: result.faces,
      yaw: result.yaw,
      pitch: result.pitch,
    });
    if (result.objects) {
      const best = (label: string) =>
        Math.max(0, ...result.objects!.filter((o) => o.label === label).map((o) => o.score));
      actions.push(
        ...this.rules.objects({ t: result.t, phone: best("cell phone"), book: best("book") }),
      );
    }
    this.apply(actions);
  }

  private async checkIdentity() {
    const reference = this.options.reference;
    if (!reference || this.stopped) return;
    const live = await embed(this.cameraVideo).catch(() => null);
    if (!Array.isArray(live)) return; // No single face now: face_missing / multiple_faces cover it.
    const score = await similarity(reference, live);
    if (score < MATCH_THRESHOLD) {
      this.apply(
        this.rules.instant("identity_mismatch", this.now(), "warn", { score, at: "recheck" }),
      );
    }
  }

  private row(kind: EventKind, severity: Severity, t: number, confidence: number | null) {
    return {
      client_id: crypto.randomUUID(),
      attempt_id: this.options.attemptId,
      device: "laptop" as const,
      kind,
      severity,
      started_at: new Date(t).toISOString(),
      confidence,
    };
  }

  private apply(actions: Action[]) {
    for (const action of actions) {
      if (action.type === "open") {
        this.open.set(action.id, { kind: action.kind, severity: action.severity });
        const row = {
          client_id: action.id,
          attempt_id: this.options.attemptId,
          device: "laptop" as const,
          kind: action.kind,
          severity: action.severity,
          started_at: new Date(action.startedAt).toISOString(),
          confidence:
            action.confidence === null ? null : Math.min(1, Math.max(0, action.confidence)),
          details: action.details as Record<string, string>,
        };
        this.sink.add(row);
        if (action.severity !== "info") {
          void this.snapshot(action.id);
          const text = STUDENT_MESSAGE[action.kind];
          if (text)
            this.setStatus({
              warnings: [{ id: action.id, kind: action.kind, text }, ...this.status.warnings],
            });
        }
      } else if (action.type === "escalate") {
        this.sink.update({ client_id: action.id, severity: action.severity });
      } else {
        this.open.delete(action.id);
        this.sink.update({
          client_id: action.id,
          ended_at: new Date(action.endedAt).toISOString(),
        });
        this.setStatus({ warnings: this.status.warnings.filter((w) => w.id !== action.id) });
      }
    }
  }

  /** A still of the moment from the camera (and the screen, if shared), attached to the event. */
  private async snapshot(clientId: string) {
    if (!this.options.camera) return;
    const path = await uploadSnapshot(this.options.attemptId, this.cameraVideo, "camera", "event");
    if (path) this.sink.update({ client_id: clientId, snapshot_path: path });
    if (this.options.screen && this.status.screen === "shared") {
      void uploadSnapshot(this.options.attemptId, this.screenVideo, "screen", "event");
    }
  }

  private setStatus(patch: Partial<SessionStatus>) {
    this.status = { ...this.status, ...patch };
    this.options.onStatus(this.status);
  }
}
