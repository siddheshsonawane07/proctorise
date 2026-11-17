/*
 * Every class has one colour, worked out from its id, that follows it everywhere: the spine of its
 * row in the register, its line in the menu and the edge of its page. A spine carries no text, so
 * in the dark it is a brighter step of the same hue, to stand out from the desk. None is purple
 * (CLAUDE.md rule 9). Class names, not a style attribute: the CSP allows no inline style.
 */
const BANDS = [
  "bg-teal-700 dark:bg-teal-400",
  "bg-blue-700 dark:bg-blue-400",
  "bg-green-800 dark:bg-green-400",
  "bg-amber-800 dark:bg-amber-400",
  "bg-rose-700 dark:bg-rose-400",
  "bg-slate-700 dark:bg-slate-400",
] as const;

export function classHash(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
}

export function classBand(classId: string): string {
  return BANDS[classHash(classId) % BANDS.length]!;
}
