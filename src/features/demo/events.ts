import type { Action, EventKind, Severity } from "../proctoring/rules/engine";

export type DemoEvent = {
  id: string;
  kind: EventKind;
  severity: Severity;
  startedAt: number;
  endedAt: number | null;
};

/** The longest list the demo keeps; older events drop off the end. */
export const MAX_EVENTS = 50;

/** Folds the rules engine's actions into the list a teacher would see, newest first. */
export function applyActions(events: DemoEvent[], actions: Action[]): DemoEvent[] {
  let next = events;
  for (const action of actions) {
    if (action.type === "open") {
      const { id, kind, severity, startedAt } = action;
      next = [{ id, kind, severity, startedAt, endedAt: null }, ...next];
    } else if (action.type === "escalate") {
      next = next.map((e) => (e.id === action.id ? { ...e, severity: action.severity } : e));
    } else {
      next = next.map((e) => (e.id === action.id ? { ...e, endedAt: action.endedAt } : e));
    }
  }
  return next.slice(0, MAX_EVENTS);
}
