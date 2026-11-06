import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";
import { Button as BoardButton } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

/*
 * The app's shared form parts, in BoardUI's look. Fields copy BoardUI's input styling onto plain
 * elements rather than using its React Aria input, which would add to every page's first load.
 */
const fieldClass = cx(
  "mt-1.5 block w-full rounded-2lg border-0 bg-background-tertiary-default px-3 py-2",
  "text-body-regular text-text-primary placeholder:text-text-tertiary",
  "ring-2 ring-transparent ring-inset transition-[box-shadow,background-color] duration-150",
  "hover:ring-border-button-hover focus:ring-border-button-active focus:outline-none",
  "disabled:cursor-not-allowed disabled:opacity-60",
);

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
}: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="text-body-medium text-text-primary">{label}</span>
      <textarea {...input} rows={3} className={fieldClass} />
    </label>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "plain" };

export function Button({ variant = "primary", ...props }: ButtonProps) {
  return <BoardButton variant={variant === "primary" ? "primary" : "secondary"} {...props} />;
}

/** A message the person needs to read: an error (role=alert) or a confirmation (role=status). */
export function Message({ kind, children }: { kind: "error" | "ok"; children: ReactNode }) {
  const Icon = kind === "error" ? RiErrorWarningFill : RiCheckboxCircleFill;
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={cx(
        "flex items-start gap-2 rounded-xl border p-3 text-body-regular",
        kind === "error"
          ? "border-high/40 bg-high/5 text-high"
          : "border-accent/30 bg-accent/5 text-text",
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border-table bg-background-primary-default p-5 shadow-xs">
      <h2 className="text-headline-semibold text-text-primary">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function Loading() {
  return (
    <p role="status" className="flex items-center gap-2 text-text-muted">
      <span
        aria-hidden
        className="size-4 animate-spin rounded-full border-2 border-border border-t-accent"
      />
      Loading…
    </p>
  );
}
