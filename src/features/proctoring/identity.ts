/**
 * Face identity with Human (@vladmandic/human, maintained; face-api was archived 2025-02-05).
 * Loaded only when a check runs, never in the first page load. The reference embedding is computed
 * in the browser each time and never stored (PHASE_5 § 5.3).
 *
 * A mismatch is evidence for the teacher, never an action (D7). The threshold is Human's own
 * guidance until the spike measures it on a varied set of faces (Phase-5-Critic #5).
 */
import type { Human } from "@vladmandic/human";

export const MATCH_THRESHOLD = 0.5;
export const CONSENT_VERSION = "2026-11-04";

let loading: Promise<Human> | null = null;

function human(): Promise<Human> {
  loading ??= import("@vladmandic/human").then(async ({ Human }) => {
    const instance = new Human({
      modelBasePath: "/vendor/human/3.3.6/",
      backend: "webgl",
      debug: false,
      cacheSensitivity: 0,
      filter: { enabled: false },
      face: {
        enabled: true,
        detector: { enabled: true, maxDetected: 2, rotation: false },
        mesh: { enabled: true },
        iris: { enabled: false },
        description: { enabled: true },
        emotion: { enabled: false },
        antispoof: { enabled: false },
        liveness: { enabled: false },
        attention: { enabled: false },
      },
      body: { enabled: false },
      hand: { enabled: false },
      object: { enabled: false },
      gesture: { enabled: false },
      segmentation: { enabled: false },
    });
    await instance.load();
    // No instance.warmup(): it fetches a data: URL, which the CSP's connect-src refuses, and then
    // never resolves, so every identity check would hang in production. The first detection
    // compiles the shaders instead (found 2026-11-04 under wrangler with the real _headers).
    return instance;
  });
  return loading;
}

export type Embedding = number[];

/** The one face in an image or video frame, or why there isn't one. */
export async function embed(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
): Promise<Embedding | "no_face" | "several_faces"> {
  const h = await human();
  const result = await h.detect(input);
  if (result.face.length === 0) return "no_face";
  if (result.face.length > 1) return "several_faces";
  const embedding = result.face[0]!.embedding;
  return embedding && embedding.length ? Array.from(embedding) : "no_face";
}

export async function similarity(a: Embedding, b: Embedding): Promise<number> {
  return (await human()).match.similarity(a, b);
}

/** Loads an image from a blob, for the reference photo. */
export function imageFrom(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read the photo"));
    img.src = URL.createObjectURL(blob);
  });
}

/** Starts loading the models early, e.g. while the student reads the lobby. */
export function preloadIdentity(): void {
  void human();
}
