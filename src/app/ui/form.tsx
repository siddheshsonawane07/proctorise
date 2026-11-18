import type {
  ButtonHTMLAttributes,
  ComponentPropsWithRef,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";
import { Button as BoardButton } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { useWaiting } from "./busy";
import { inputClass } from "./inputClass";

/*
 * The app's shared form parts, in BoardUI's look. Fields copy BoardUI's input styling onto plain
 * elements rather than using its React Aria input, which would add to every page's first load.
 */
const fieldClass = cx("mt-1.5 block w-full", inputClass);

export function Field({
  label,
  hint,
  ...input
}: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-body-medium text-text-primary">{label}</span>
      <input {...input} className={fieldClass} />
      {hint && <span className="mt-1 block text-caption-1-regular text-text-muted">{hint}</span>}
    </label>
  );
}

export function TextArea({
  label,
  ...input
}: { label: string } & ComponentPropsWithRef<"textarea">) {
  return (
    <label className="block">
      <span className="text-body-medium text-text-primary">{label}</span>
      <textarea rows={3} {...input} className={fieldClass} />
    </label>
  );
}

export function Select({
  label,
  children,
  ...select
}: { label: string } & ComponentPropsWithRef<"select">) {
  return (
    <label className="block">
      <span className="text-body-medium text-text-primary">{label}</span>
      <select {...select} className={fieldClass}>
        {children}
      </select>
    </label>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "plain" | "danger";
};

export function Button({ variant = "primary", ...props }: ButtonProps) {
  return <BoardButton variant={variant === "plain" ? "secondary" : variant} {...props} />;
}

/** A message the person needs to read: an error (role=alert) or a confirmation (role=status). */
export function Message({ kind, children }: { kind: "error" | "ok"; children: ReactNode }) {
  const Icon = kind === "error" ? RiErrorWarningFill : RiCheckboxCircleFill;
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={cx(
        "flex items-start gap-2 rounded-2xl border p-3 text-body-regular",
        kind === "error"
          ? "border-high/40 bg-high/5 text-high"
          : "border-border bg-surface-muted text-text",
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/**
 * What a page shows when its data could not load. The reason is in the corner (the QueryCache in
 * `src/main.tsx`); the page keeps only the way to try again.
 */
export function LoadFailed({ retry }: { retry: () => unknown }) {
  return (
    <Button variant="plain" onClick={() => void retry()}>
      Try again
    </Button>
  );
}

/** A part of a page: a heading in the grotesk under a thin rule. Not a box. */
export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border pt-6">
      <h2 className="section-title text-text-primary">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

/**
 * Something is loading. The line across the top of the window shows it (LoadingBar); here are
 * only the words, for a screen reader.
 */
export function Loading() {
  useWaiting();
  return (
    <p role="status" className="sr-only">
      Loading…
    </p>
  );
}
