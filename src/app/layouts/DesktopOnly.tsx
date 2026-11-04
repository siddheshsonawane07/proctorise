import { Outlet } from "react-router";
import { DESKTOP_QUERY, useMediaQuery } from "../../lib/useMediaQuery";
import { Notice } from "../ui/Notice";

/** Wraps the routes where a test is taken. Everything else works at any width. */
export function DesktopOnly() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  if (isDesktop) return <Outlet />;
  return (
    <Notice title="Please use a laptop or desktop">
      Tests are taken on a computer with a webcam, in Chrome or Edge. If you're on a computer, make
      this window wider.
    </Notice>
  );
}
