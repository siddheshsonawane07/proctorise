import type { ReactNode } from "react";

/**
 * What a list shows before it has anything in it: what will appear here, and what to do about it,
 * on a patch of sand with the red-orange dot. Not a dashed placeholder.
 */
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-3xl bg-surface-muted px-6 py-12 text-center">
      <span aria-hidden className="mx-auto block size-3 rounded-full bg-dot" />
      <p className="mt-4 font-display text-title-2-bold tracking-[-0.02em] text-text">{title}</p>
      {children && (
        <p className="mx-auto mt-1 max-w-md text-body-regular text-pretty text-text-muted">
          {children}
        </p>
      )}
    </div>
  );
}
