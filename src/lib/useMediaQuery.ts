import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
  );
}

/** A laptop or desktop window wide enough for a test beside its status strip. */
export const DESKTOP_QUERY = "(min-width: 1024px)";

/** A phone or tablet: the primary pointer is a finger. */
export const PHONE_QUERY = "(pointer: coarse)";
