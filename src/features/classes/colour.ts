/*
 * Every class has one colour, worked out from its id, that follows it everywhere: its card, its
 * line in the menu and the top of its page. All six carry white text at 5.5:1 or better, and none
 * is purple (CLAUDE.md rule 9). Class names, not a style attribute: the CSP allows no inline style.
 */
const BANDS = [
  "bg-teal-700",
  "bg-blue-700",
  "bg-green-800",
  "bg-amber-800",
  "bg-rose-700",
  "bg-slate-700",
] as const;

export function classHash(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
}

export function classBand(classId: string): string {
  return BANDS[classHash(classId) % BANDS.length]!;
}
