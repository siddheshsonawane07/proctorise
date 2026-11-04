import type { BrowserCondition } from "./rules/engine";

export type IntegrityHandlers = {
  condition: (kind: BrowserCondition, on: boolean) => void;
  instant: (
    kind: "copy_paste" | "context_menu" | "shortcut",
    details: Record<string, unknown>,
  ) => void;
};

/** Keys a student might use to leave or copy the test. They are recorded, not blocked by the OS. */
function shortcutName(event: KeyboardEvent): string | null {
  const mod = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  if (mod && ["c", "v", "x", "p", "s", "u", "a"].includes(key))
    return `${event.metaKey ? "Cmd" : "Ctrl"}+${key.toUpperCase()}`;
  if (key === "f12") return "F12";
  if (key === "printscreen") return "PrintScreen";
  if (mod && event.shiftKey && ["i", "j", "c"].includes(key)) return "DevTools";
  return null;
}

/**
 * Listens for the browser facts the rules engine records: leaving the tab or window, leaving full
 * screen, a second display, copy and paste, right-click and shortcuts. Copy, paste and the context
 * menu are blocked inside the test page itself; the rest can only be recorded (Phase-5-Critic #6).
 * Returns a function that removes every listener.
 */
export function watchIntegrity(handlers: IntegrityHandlers): () => void {
  const onVisibility = () =>
    handlers.condition("tab_hidden", document.visibilityState === "hidden");
  const onBlur = () => handlers.condition("window_blur", true);
  const onFocus = () => handlers.condition("window_blur", false);
  const onFullscreen = () => handlers.condition("fullscreen_exit", !document.fullscreenElement);
  const onClipboard = (event: ClipboardEvent) => {
    event.preventDefault();
    handlers.instant("copy_paste", { action: event.type });
  };
  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    handlers.instant("context_menu", {});
  };
  const onKey = (event: KeyboardEvent) => {
    const name = shortcutName(event);
    if (!name) return;
    event.preventDefault();
    handlers.instant("shortcut", { key: name });
  };

  // A second display (Chromium only, D8): `screen.isExtended`, which fires "change" on screen.
  const screenWithExtended = window.screen as Screen & { isExtended?: boolean };
  const onScreenChange = () => {
    if (typeof screenWithExtended.isExtended === "boolean") {
      handlers.condition("second_display", screenWithExtended.isExtended);
    }
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("blur", onBlur);
  window.addEventListener("focus", onFocus);
  document.addEventListener("fullscreenchange", onFullscreen);
  document.addEventListener("copy", onClipboard);
  document.addEventListener("cut", onClipboard);
  document.addEventListener("paste", onClipboard);
  document.addEventListener("contextmenu", onContextMenu);
  document.addEventListener("keydown", onKey);
  const screenEvents = window.screen as unknown as EventTarget;
  screenEvents.addEventListener?.("change", onScreenChange);
  onScreenChange();

  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("fullscreenchange", onFullscreen);
    document.removeEventListener("copy", onClipboard);
    document.removeEventListener("cut", onClipboard);
    document.removeEventListener("paste", onClipboard);
    document.removeEventListener("contextmenu", onContextMenu);
    document.removeEventListener("keydown", onKey);
    screenEvents.removeEventListener?.("change", onScreenChange);
  };
}

/** True when a second display is attached and the browser can tell (Chromium); null if it can't. */
export function hasSecondDisplay(): boolean | null {
  const extended = (window.screen as Screen & { isExtended?: boolean }).isExtended;
  return typeof extended === "boolean" ? extended : null;
}
