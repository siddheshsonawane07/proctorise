/*
 * Every class has one set, worked out from its id, that follows it everywhere: the wall its page
 * stands on, the spine of its row in the register and its dot in the menu. None is purple
 * (CLAUDE.md rule 9). Class names, not a style attribute: the CSP allows no inline style.
 */
const SETS = ["cobalt", "sky", "sage", "mustard", "pink", "tomato"] as const;
export type SetName = (typeof SETS)[number] | "ink";

/** Each wall colour as a background, spelt out so Tailwind finds the class names. */
const BANDS: Record<(typeof SETS)[number], string> = {
  cobalt: "bg-cobalt",
  sky: "bg-sky",
  sage: "bg-sage",
  mustard: "bg-mustard",
  pink: "bg-pink",
  tomato: "bg-tomato",
};

/** The set's class, spelt out so Tailwind generates every one of them. */
const SET_CLASS: Record<SetName, string> = {
  cobalt: "set-cobalt",
  sky: "set-sky",
  sage: "set-sage",
  mustard: "set-mustard",
  pink: "set-pink",
  tomato: "set-tomato",
  ink: "set-ink",
};

export function setClass(name: SetName): string {
  return SET_CLASS[name];
}

export function classHash(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
}

export function classSet(classId: string): (typeof SETS)[number] {
  return SETS[classHash(classId) % SETS.length]!;
}

/** The class's wall colour, for a spine or a dot. */
export function classBand(classId: string): string {
  return BANDS[classSet(classId)];
}
