import { cx } from "@/utils/cx";

/** A box to type in: white with a clear edge, so it reads as a field and never as a disabled one. */
export const inputClass = cx(
  "rounded-lg border border-text-muted/60 bg-surface px-3 py-2",
  "text-body-regular text-text placeholder:text-text-muted/80",
  "transition-[box-shadow,border-color] duration-150",
  "hover:border-text-muted focus:border-accent focus:ring-2 focus:ring-accent/25 focus:outline-none",
  "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60",
);
