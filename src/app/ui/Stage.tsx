import type { ReactNode } from "react";
import { Link } from "react-router";
import { RiArrowLeftLine } from "@remixicon/react";
import { cx } from "@/utils/cx";
import { setClass, type SetName } from "../../features/classes/colour";
import { StageProp, type PropName } from "./props";

/**
 * The top of every page: a flat wall in one set colour standing on a floor, after HUMAN.md. The
 * title is the grotesk with the red-orange dot after it; `turn` is the line in the italic serif;
 * `notes` are mono captions. What can be done goes under them, on the left; a prop stands on
 * the right. Below the floor the page goes back to paper.
 */
export function Stage({
  set = "cobalt",
  back,
  title,
  turn,
  notes,
  actions,
  prop,
  children,
  className,
}: {
  set?: SetName;
  back?: { to: string; label: string } | undefined;
  title: ReactNode;
  turn?: ReactNode;
  notes?: ReactNode[] | undefined;
  actions?: ReactNode;
  prop?: PropName | undefined;
  children?: ReactNode;
  className?: string | undefined;
}) {
  return (
    <header className={cx(setClass(set), "bleed on-wall relative mb-10", className)}>
      {prop && <StageProp name={prop} />}
      <div
        className={cx(
          "relative pt-8 pb-10 lg:pt-12 lg:pb-14",
          prop && "md:min-h-64 md:pr-48 lg:min-h-76",
        )}
      >
        {back && (
          <Link
            to={back.to}
            className="pill mb-6 gap-1 border border-current/40 text-body-medium text-current no-underline hover:border-current"
          >
            <RiArrowLeftLine aria-hidden className="size-4" />
            {back.label}
          </Link>
        )}
        <div className="stage-in max-w-3xl">
          <h1 className="font-display text-page text-balance break-words">
            {title}
            <span aria-hidden className="stage-dot" />
          </h1>
          {turn && (
            <p className="mt-2 font-serif text-[clamp(1.6rem,1.2rem+1.6vw,2.5rem)] leading-[1.1] text-pretty italic">
              {turn}
            </p>
          )}
          {notes && notes.length > 0 && (
            <ul className="caption mt-5 space-y-0.5 on-wall-muted">
              {notes.map((note, i) => (
                <li key={i} className="flex gap-3">
                  <span aria-hidden className="text-[var(--dot)]">
                    &gt;
                  </span>
                  <span className="min-w-0">{note}</span>
                </li>
              ))}
            </ul>
          )}
          {children}
          {actions && <div className="mt-7 flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
      <div aria-hidden className="floor h-5 lg:h-7" />
    </header>
  );
}
