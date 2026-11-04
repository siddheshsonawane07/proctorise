/**
 * A tiny greyscale copy of a frame, for telling whether the phone has been moved: compared by
 * correlation, so the room getting lighter or darker does not count as moving. No model needed.
 */
export const SIG_W = 32;
export const SIG_H = 24;

export function signatureFromPixels(rgba: Uint8ClampedArray): Float32Array {
  const out = new Float32Array(SIG_W * SIG_H);
  for (let i = 0; i < out.length; i++) {
    const r = rgba[i * 4]!;
    const g = rgba[i * 4 + 1]!;
    const b = rgba[i * 4 + 2]!;
    out[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return out;
}

export function signature(video: HTMLVideoElement): Float32Array | null {
  if (video.readyState < 2) return null;
  const canvas = document.createElement("canvas");
  canvas.width = SIG_W;
  canvas.height = SIG_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, SIG_W, SIG_H);
  return signatureFromPixels(ctx.getImageData(0, 0, SIG_W, SIG_H).data);
}

/** Pearson correlation of two signatures: 1 for the same view, near 0 for an unrelated one. */
export function similarityOf(a: Float32Array, b: Float32Array): number {
  const n = a.length;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i]!;
    mb += b[i]!;
  }
  ma /= n;
  mb /= n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i]! - ma;
    const y = b[i]! - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  return da === 0 || db === 0 ? 0 : num / Math.sqrt(da * db);
}
