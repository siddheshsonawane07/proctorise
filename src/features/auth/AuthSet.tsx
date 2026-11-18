import type { ReactNode } from "react";
import { cx } from "@/utils/cx";
import { setClass, type SetName } from "../classes/colour";

/**
 * Signing in and its neighbours: a whole set, the title on the wall and the form on a card of
 * paper in front of it, standing on the floor.
 */
export function AuthSet({
  set,
  title,
  turn,
  notes,
  children,
}: {
  set: SetName;
  title: string;
  turn?: ReactNode;
  notes?: string[];
  children?: ReactNode;
}) {
  return (
    <div className={cx(setClass(set), "bleed relative")}>
      <div className="grid items-center gap-8 pt-8 pb-10 lg:grid-cols-[1fr_minmax(0,27rem)] lg:gap-16 lg:pt-14 lg:pb-0">
        <div className="stage-in on-wall lg:pb-24">
          <h1 className="font-display text-page text-balance">
            {title}
            <span aria-hidden className="stage-dot" />
          </h1>
          {turn && (
            <p className="mt-2 font-serif text-[clamp(1.6rem,1.2rem+1.6vw,2.5rem)] leading-[1.1] italic">
              {turn}
            </p>
          )}
          {notes && (
            <ul className="caption mt-5 space-y-0.5 on-wall-muted">
              {notes.map((note) => (
                <li key={note} className="flex gap-3">
                  <span aria-hidden className="text-[var(--dot)]">
                    &gt;
                  </span>
                  {note}
                </li>
              ))}
            </ul>
          )}
        </div>
        {children && (
          <div className="relative z-10 rounded-3xl bg-surface p-7 text-text shadow-[0_28px_36px_-28px_rgb(0_0_0/0.5)] sm:p-9 lg:translate-y-10">
            {children}
          </div>
        )}
      </div>
      <div aria-hidden className="floor h-8 lg:h-24" />
    </div>
  );
}
