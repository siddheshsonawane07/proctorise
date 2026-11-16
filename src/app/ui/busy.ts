import { useEffect, useSyncExternalStore } from "react";

/*
 * How many parts of the page are waiting for something. The bar across the top of the window
 * (LoadingBar) shows while it is above zero, so waiting looks the same everywhere and nothing on
 * the page moves when the wait ends.
 */
let waiting = 0;
const listeners = new Set<() => void>();

function change(by: number) {
  waiting += by;
  for (const listener of listeners) listener();
}

/** Counts this component as waiting for as long as it is on the page. */
export function useWaiting() {
  useEffect(() => {
    change(1);
    return () => change(-1);
  }, []);
}

export function useAnyWaiting(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => waiting > 0,
  );
}
