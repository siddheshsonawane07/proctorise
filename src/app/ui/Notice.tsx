import type { ReactNode } from "react";

/** A page with one thing to say: a small pink set, the title in the grotesk with its dot. */
export function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="set-pink mx-auto mt-10 max-w-lg rounded-3xl bg-pink p-8 on-wall">
      <h1 className="font-display text-[2rem] leading-none font-extrabold tracking-[-0.03em]">
        {title}
        <span aria-hidden className="stage-dot" />
      </h1>
      <p className="mt-4 text-body-regular on-wall-muted [&_a]:text-ink">{children}</p>
    </section>
  );
}
