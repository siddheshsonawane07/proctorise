import { Link } from "react-router";
import { RiArrowLeftLine } from "@remixicon/react";

/** The way back from a page, one look everywhere: quiet, above the title. */
export function BackLink({ to, children }: { to: string; children: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-body-medium text-text-muted no-underline hover:text-text"
    >
      <RiArrowLeftLine aria-hidden className="size-4" />
      {children}
    </Link>
  );
}
