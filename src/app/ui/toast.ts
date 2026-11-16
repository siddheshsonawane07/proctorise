import { useSyncExternalStore } from "react";

/*
 * Notifications in the bottom right corner: what an action did, or why it failed. Anything a
 * person must keep reading (a page that failed to load, a rule of a test) stays on the page.
 */
export type Toast = { id: number; kind: "ok" | "error"; text: string };

const MAX_SHOWN = 3;
let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function set(next: Toast[]) {
  toasts = next;
  for (const listener of listeners) listener();
}

function show(kind: Toast["kind"], text: string) {
  // The same words twice in a row are one notification, not two.
  if (toasts.at(-1)?.text === text) return;
  set([...toasts, { id: nextId++, kind, text }].slice(-MAX_SHOWN));
}

export const toast = {
  ok: (text: string) => show("ok", text),
  error: (text: string) => show("error", text),
  dismiss: (id: number) => set(toasts.filter((t) => t.id !== id)),
};

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => toasts,
  );
}
