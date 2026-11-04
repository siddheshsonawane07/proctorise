import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

export function Field({
  label,
  hint,
  ...input
}: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        {...input}
        className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
      />
      {hint && <span className="mt-1 block text-sm text-text-muted">{hint}</span>}
    </label>
  );
}

export function TextArea({
  label,
  ...input
}: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <textarea
        {...input}
        rows={3}
        className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
      />
    </label>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "plain" };

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const look =
    variant === "primary"
      ? "bg-accent text-accent-text hover:bg-accent-hover"
      : "border border-border text-text hover:bg-surface-muted";
  return (
    <button
      type="button"
      {...props}
      className={`rounded-md px-4 py-2 font-medium disabled:opacity-60 ${look} ${className}`}
    />
  );
}

/** A message the person needs to read: an error (role=alert) or a confirmation (role=status). */
export function Message({ kind, children }: { kind: "error" | "ok"; children: ReactNode }) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`rounded-md border p-3 text-sm ${
        kind === "error" ? "border-high text-high" : "border-border text-text"
      }`}
    >
      {children}
    </p>
  );
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function Loading() {
  return (
    <p role="status" className="text-text-muted">
      Loading…
    </p>
  );
}
