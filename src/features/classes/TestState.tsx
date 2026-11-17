import type { TestRow } from "./api";
import { testState, type State } from "./stateOfTest";

const LOOK: Partial<Record<State, string>> = {
  "Open now": "bg-ok/10 text-ok",
  Scheduled: "bg-info/10 text-info",
};

/** Where a test stands, in a word. The word carries it; the colour only helps. */
export function TestState({ test }: { test: Pick<TestRow, "status" | "opens_at" | "closes_at"> }) {
  const state = testState(test);
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-caption-1-semibold whitespace-nowrap ${
        LOOK[state] ?? "bg-surface-muted text-text-muted ring-1 ring-border ring-inset"
      }`}
    >
      {state}
    </span>
  );
}
