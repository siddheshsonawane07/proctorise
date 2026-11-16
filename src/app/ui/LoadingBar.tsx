import { useIsMutating } from "@tanstack/react-query";
import { useNavigation } from "react-router";
import { useAnyWaiting } from "./busy";

/**
 * A thin moving line across the top of the window while anything is loading, saving or a page is
 * being fetched. Screen readers get the words from <Loading>, so this is decoration to them.
 */
export function LoadingBar() {
  const waiting = useAnyWaiting();
  const saving = useIsMutating() > 0;
  const moving = useNavigation().state !== "idle";
  if (!waiting && !saving && !moving) return null;
  return (
    <div aria-hidden className="loading-bar fixed inset-x-0 top-0 z-50 h-1 overflow-hidden">
      <div className="h-full w-1/3 rounded-full bg-accent" />
    </div>
  );
}
