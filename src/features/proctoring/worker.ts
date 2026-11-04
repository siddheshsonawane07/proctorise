/// <reference lib="webworker" />
/**
 * Runs the models off the main thread, so typing in the test never waits on them
 * (Phase-5-Critic #8). Models load once, at "init" (Phase-5-Critic #1); each "frame" is one
 * ImageBitmap in, one result out.
 */
import {
  FaceLandmarker,
  FilesetResolver,
  ObjectDetector,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { headPose } from "./pose";

export type InitMessage = {
  type: "init";
  wasmBase: string;
  faceModel: string;
  objectModel: string;
  /** The phone needs no face model (phase 6). */
  withFace: boolean;
};
export type FrameMessage = { type: "frame"; bitmap: ImageBitmap; t: number; objects: boolean };

export type WorkerResult =
  | { type: "ready"; delegate: "GPU" | "CPU"; loadMs: number }
  | { type: "error"; message: string }
  | {
      type: "result";
      t: number;
      faces: number;
      yaw: number | null;
      pitch: number | null;
      blink: number | null;
      objects: { label: string; score: number }[] | null;
      ms: number;
    };

let face: FaceLandmarker | null = null;
let objects: ObjectDetector | null = null;
let lastTimestamp = 0;

const post = (message: WorkerResult) => self.postMessage(message);

// MediaPipe's loader sets self.ModuleFactory, and each task deletes it once created. In a module
// worker the loader is an ES module, so importing it again is a cached no-op and the second task
// finds no factory ("ModuleFactory not set"). Keep the first one and hand it back each time.
type WithFactory = typeof self & { ModuleFactory?: unknown };
let factory: unknown;

async function restoreFactory(loaderPath: string) {
  if (!factory) {
    await import(/* @vite-ignore */ loaderPath);
    factory = (self as WithFactory).ModuleFactory;
  }
  (self as WithFactory).ModuleFactory = factory;
}

async function init(message: InitMessage) {
  const started = performance.now();
  const fileset = await FilesetResolver.forVisionTasks(message.wasmBase, true);
  const make = async (delegate: "GPU" | "CPU") => {
    await restoreFactory(fileset.wasmLoaderPath);
    face = message.withFace
      ? await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: message.faceModel, delegate },
          runningMode: "VIDEO",
          numFaces: 3,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        })
      : null;
    await restoreFactory(fileset.wasmLoaderPath);
    objects = await ObjectDetector.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: message.objectModel, delegate },
      runningMode: "VIDEO",
      scoreThreshold: 0.3,
      maxResults: 5,
      categoryAllowlist: ["cell phone", "book", "person", "laptop", "keyboard"],
    });
  };
  try {
    await make("GPU");
    post({ type: "ready", delegate: "GPU", loadMs: performance.now() - started });
  } catch {
    await make("CPU");
    post({ type: "ready", delegate: "CPU", loadMs: performance.now() - started });
  }
}

function readFace(result: FaceLandmarkerResult) {
  const faces = result.faceLandmarks.length;
  if (faces !== 1) return { faces, yaw: null, pitch: null, blink: null };
  const matrix = result.facialTransformationMatrixes?.[0]?.data;
  const pose = matrix ? headPose(Array.from(matrix)) : { yaw: null, pitch: null };
  const shapes = result.faceBlendshapes?.[0]?.categories ?? [];
  const score = (name: string) => shapes.find((c) => c.categoryName === name)?.score ?? 0;
  return { faces, ...pose, blink: Math.min(score("eyeBlinkLeft"), score("eyeBlinkRight")) };
}

function frame(message: FrameMessage) {
  const started = performance.now();
  // VIDEO mode needs strictly increasing timestamps.
  const timestamp = Math.max(message.t, lastTimestamp + 1);
  lastTimestamp = timestamp;
  try {
    const f = face ? readFace(face.detectForVideo(message.bitmap, timestamp)) : null;
    const o =
      message.objects && objects
        ? objects.detectForVideo(message.bitmap, timestamp).detections.flatMap((d) => {
            const top = d.categories[0];
            return top ? [{ label: top.categoryName, score: top.score }] : [];
          })
        : null;
    post({
      type: "result",
      t: message.t,
      faces: f?.faces ?? 0,
      yaw: f?.yaw ?? null,
      pitch: f?.pitch ?? null,
      blink: f?.blink ?? null,
      objects: o,
      ms: performance.now() - started,
    });
  } finally {
    message.bitmap.close();
  }
}

self.onmessage = (event: MessageEvent<InitMessage | FrameMessage>) => {
  const message = event.data;
  if (message.type === "init") {
    init(message).catch((error: unknown) =>
      post({ type: "error", message: error instanceof Error ? error.message : String(error) }),
    );
  } else {
    frame(message);
  }
};
