import type { FrameMessage, InitMessage, WorkerResult } from "./worker";

/** Where the engine's files are served from (copied at build; ADR 002). */
export const ASSETS = {
  wasmBase: "/vendor/mediapipe/1.2.2",
  faceModel: "/models/mediapipe/v1/face_landmarker.task",
  // float16, not int8: the GPU delegate returns nothing at all from the int8 file (v2/SOURCES.txt).
  objectModel: "/models/mediapipe/v2/efficientdet_lite0.tflite",
};

export type Detection = Extract<WorkerResult, { type: "result" }>;

/**
 * The views the object detector takes in turn, as parts of the frame (x, y, width, height); null
 * is the whole frame. The two zoomed views overlap in the middle and cover the desk and hands.
 */
const VIEWS: (readonly [number, number, number, number] | null)[] = [
  [0, 0.3, 0.6, 0.7],
  [0.4, 0.3, 0.6, 0.7],
  null,
];

type Options = {
  withFace: boolean;
  /** Target face frames a second; lowered when the machine is slow. */
  fps: number;
  /** Run the object detector on every Nth frame. */
  objectsEvery: number;
  /**
   * Look for objects three ways in turn (the whole frame, then the lower left and lower right
   * zoomed in) and report the best of the three every third frame. A phone in a hand is a few
   * pixels of the whole frame; zoomed in it scored 0.34 to 0.52 where the whole frame scored 0 to
   * 0.17 (Research: Detection Models 2026-11-17). Replaces `objectsEvery`.
   */
  tiles?: boolean;
  /** The time to stamp signals with: server-aligned milliseconds. */
  now: () => number;
  onResult: (result: Detection) => void;
};

/**
 * Feeds camera frames to the worker one at a time: the next frame is taken only after the last
 * result, so a slow machine never builds a backlog. If frames take longer than the budget, the
 * rate drops (to no less than one a second).
 */
export class Detector {
  private worker: Worker | null = null;
  private video: HTMLVideoElement | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private frameCount = 0;
  private intervalMs: number;
  private stopped = false;
  private busy = false;
  /** With `tiles`: the best score for each label over the views of this round. */
  private round = new Map<string, number>();
  private view = 0;
  readonly ready: Promise<{ delegate: "GPU" | "CPU"; loadMs: number }>;
  private resolveReady!: (value: { delegate: "GPU" | "CPU"; loadMs: number }) => void;
  private rejectReady!: (error: Error) => void;
  /** Milliseconds per frame, smoothed. */
  frameMs = 0;

  constructor(private readonly options: Options) {
    this.intervalMs = 1000 / options.fps;
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
  }

  load(): Promise<{ delegate: "GPU" | "CPU"; loadMs: number }> {
    if (this.worker) return this.ready;
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (event: MessageEvent<WorkerResult>) => this.onMessage(event.data);
    this.worker.onerror = (event) => this.rejectReady(new Error(event.message || "Worker failed"));
    const init: InitMessage = { type: "init", withFace: this.options.withFace, ...ASSETS };
    this.worker.postMessage(init);
    return this.ready;
  }

  /** Starts sending frames from this video once the models are loaded. */
  async start(video: HTMLVideoElement): Promise<void> {
    this.video = video;
    this.stopped = false;
    await this.load();
    this.schedule(0);
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.worker?.terminate();
    this.worker = null;
  }

  private schedule(delayMs: number) {
    if (this.stopped) return;
    this.timer = setTimeout(() => void this.send(), delayMs);
  }

  private async send() {
    const video = this.video;
    if (!video || !this.worker || this.busy) return;
    if (video.readyState < 2 || video.videoWidth === 0) {
      this.schedule(250);
      return;
    }
    this.busy = true;
    try {
      const bitmap = await createImageBitmap(video, {
        resizeWidth: 640,
        resizeHeight: Math.round((640 * video.videoHeight) / video.videoWidth),
      });
      this.frameCount++;
      this.view = this.options.tiles ? this.frameCount % VIEWS.length : 0;
      const zoom = VIEWS[this.view];
      const message: FrameMessage = {
        type: "frame",
        bitmap,
        t: this.options.now(),
        objects: this.options.tiles || this.frameCount % this.options.objectsEvery === 0,
      };
      if (zoom) {
        const [x, y, w, h] = zoom.map((part, i) =>
          Math.round(part * (i % 2 === 0 ? video.videoWidth : video.videoHeight)),
        ) as [number, number, number, number];
        message.zoom = await createImageBitmap(video, x, y, w, h, {
          resizeWidth: 512,
          resizeHeight: Math.round((512 * h) / w),
        });
      }
      this.worker.postMessage(message, message.zoom ? [bitmap, message.zoom] : [bitmap]);
    } catch {
      this.busy = false;
      this.schedule(this.intervalMs);
    }
  }

  /** Keeps each label's best score across a round of views; hands the round over on its last. */
  private merged(result: Detection): Detection {
    for (const o of result.objects ?? []) {
      this.round.set(o.label, Math.max(o.score, this.round.get(o.label) ?? 0));
    }
    if (this.view !== VIEWS.length - 1) return { ...result, objects: null };
    const objects = [...this.round].map(([label, score]) => ({ label, score }));
    this.round.clear();
    return { ...result, objects };
  }

  private onMessage(message: WorkerResult) {
    if (message.type === "ready") this.resolveReady(message);
    else if (message.type === "error") this.rejectReady(new Error(message.message));
    else {
      this.busy = false;
      this.frameMs = this.frameMs ? this.frameMs * 0.8 + message.ms * 0.2 : message.ms;
      // Keep the worker under about a third of the time (the CPU budget, PHASE_5 § Verification).
      const minInterval = Math.min(1000, Math.max(1000 / this.options.fps, this.frameMs * 3));
      this.intervalMs = minInterval;
      this.options.onResult(this.options.tiles ? this.merged(message) : message);
      this.schedule(Math.max(0, this.intervalMs - message.ms));
    }
  }
}
