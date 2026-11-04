import type { ReactNode } from "react";

export function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-md rounded-lg border border-border bg-surface-muted p-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-text-muted">{children}</p>
    </section>
  );
}
