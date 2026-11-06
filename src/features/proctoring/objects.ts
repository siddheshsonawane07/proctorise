/**
 * What the object detector's labels mean for the rules. EfficientDet (trained on COCO) calls the
 * back of a phone, with a case or without, a "remote" about as often as a "cell phone", and never
 * labelled anything "remote" in photos without a phone (Research: Phone Detection 2026-11-06).
 * "mouse" is not counted: a real mouse sits on every desk.
 */
export const PHONE_LABELS = ["cell phone", "remote"];

/** Every label the worker reports; the rest are dropped there. */
export const DETECTED_LABELS = [...PHONE_LABELS, "book", "person", "laptop", "keyboard"];

type Detected = { label: string; score: number }[];

/** The highest score among these labels, or 0. */
export function bestScore(objects: Detected, labels: string[]): number {
  return Math.max(0, ...objects.filter((o) => labels.includes(o.label)).map((o) => o.score));
}

/** A frame's objects as the rules read them. */
export function readObjects(objects: Detected): { phone: number; book: number } {
  return { phone: bestScore(objects, PHONE_LABELS), book: bestScore(objects, ["book"]) };
}
