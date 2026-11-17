import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { RiCloseLine } from "@remixicon/react";

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), textarea, select";

/**
 * A small window over the page, for one short task. Not the browser's own modal dialog: that
 * would make the corner notifications unreachable while it is open. Holds the focus, closes on
 * Escape or a press outside, and gives the focus back.
 */
export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    // The first field, not the close button, is where the task starts.
    (ref.current?.querySelector<HTMLElement>("input, textarea, select") ?? ref.current)?.focus();
    return () => before?.focus();
  }, []);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") return onClose();
    if (event.key !== "Tab") return;
    const stops = [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    const first = stops[0];
    const last = stops.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-[#141b2d]/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-surface p-6 shadow-xl focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-title-2-semibold tracking-tight text-text">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text"
          >
            <RiCloseLine aria-hidden className="size-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
