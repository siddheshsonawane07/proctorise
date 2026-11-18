import { useEffect } from "react";
import { RiCheckboxCircleFill, RiCloseLine, RiErrorWarningFill } from "@remixicon/react";
import { cx } from "@/utils/cx";
import { toast, useToasts, type Toast } from "./toast";

/** How long each kind stays: an error is longer to read, and matters more. */
const STAYS_MS = { ok: 5_000, error: 10_000 };

export function Toaster() {
  const toasts = useToasts();
  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96 print:hidden"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastCard({ toast: t }: { toast: Toast }) {
  useEffect(() => {
    const timer = setTimeout(() => toast.dismiss(t.id), STAYS_MS[t.kind]);
    return () => clearTimeout(timer);
  }, [t.id, t.kind]);
  const Icon = t.kind === "error" ? RiErrorWarningFill : RiCheckboxCircleFill;

  return (
    <div
      role={t.kind === "error" ? "alert" : "status"}
      className="toast-in pointer-events-auto flex w-full items-start gap-3 rounded-2xl bg-ink py-3 pr-2 pl-4 text-[#fbf8f2] shadow-lg dark:bg-[#efe9de] dark:text-ink"
    >
      <Icon
        aria-hidden
        className={cx(
          "mt-0.5 size-5 shrink-0",
          t.kind === "error" ? "text-tomato" : "text-sage dark:text-ok",
        )}
      />
      <p className="min-w-0 flex-1 py-0.5 text-body-regular">{t.text}</p>
      <button
        type="button"
        onClick={() => toast.dismiss(t.id)}
        className="grid size-7 shrink-0 place-items-center rounded-full opacity-70 hover:bg-white/10 hover:opacity-100 dark:hover:bg-black/10"
      >
        <RiCloseLine aria-hidden className="size-4" />
        <span className="sr-only">Dismiss</span>
      </button>
    </div>
  );
}
