import { Outlet } from "react-router";
import { PHONE_QUERY, useMediaQuery } from "../../lib/useMediaQuery";
import { Notice } from "../ui/Notice";

/** Wraps the phone camera page, which only makes sense on a phone. */
export function PhoneOnly() {
  const isPhone = useMediaQuery(PHONE_QUERY);
  if (isPhone) return <Outlet />;
  return (
    <Notice title="Open this on your phone">
      Scan the code on your test screen with your phone's camera. This page turns your phone into a
      side camera for the test.
    </Notice>
  );
}
