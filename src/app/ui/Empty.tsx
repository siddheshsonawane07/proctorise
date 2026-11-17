import type { ReactNode } from "react";
import { RiCheckboxBlankLine } from "@remixicon/react";

/**
 * What a list shows before it has anything in it: an empty answer box (the logo's box, not yet
 * ticked), what will appear here, and what to do about it. Not a dashed placeholder.
 */
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-muted px-6 py-12 text-center">
      <RiCheckboxBlankLine aria-hidden className="mx-auto size-7 text-text-muted/60" />
      <p className="mt-3 text-headline-semibold text-text">{title}</p>
      {children && (
        <p className="mx-auto mt-1 max-w-md text-body-regular text-pretty text-text-muted">
          {children}
        </p>
      )}
    </div>
  );
}
