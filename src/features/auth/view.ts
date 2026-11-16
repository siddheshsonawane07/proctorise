import { useSyncExternalStore } from "react";
import { isTeacher } from "./roles";
import type { Profile } from "./useProfile";

/**
 * Which side of the app a teacher is using. A teacher can also be a student in someone else's
 * class, and showing both sides at once made every screen ambiguous. For display only: the
 * database decides what each person may do.
 */
export type View = "teacher" | "student";

const KEY = "proctorise.view";
const listeners = new Set<() => void>();
let current: View | undefined;

function get(): View {
  if (current === undefined) {
    try {
      current = localStorage.getItem(KEY) === "student" ? "student" : "teacher";
    } catch {
      current = "teacher";
    }
  }
  return current;
}

export function setView(view: View) {
  current = view;
  try {
    localStorage.setItem(KEY, view);
  } catch {
    // No storage (private mode): the choice lasts until the page is reloaded.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The side to show. Someone who doesn't teach is always a student. */
export function useView(profile: Profile | undefined): View {
  const chosen = useSyncExternalStore(subscribe, get);
  return isTeacher(profile) ? chosen : "student";
}
