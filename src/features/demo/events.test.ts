import { describe, expect, it } from "vitest";
import { applyActions, MAX_EVENTS, type DemoEvent } from "./events";
import { Rules } from "../proctoring/rules/engine";

describe("applyActions", () => {
  it("opens, escalates and closes an event, newest first", () => {
    let events: DemoEvent[] = [];
    events = applyActions(events, [
      {
        type: "open",
        id: "a",
        kind: "face_missing",
        severity: "warn",
        startedAt: 1,
        confidence: null,
        details: {},
      },
    ]);
    events = applyActions(events, [
      {
        type: "open",
        id: "b",
        kind: "tab_hidden",
        severity: "warn",
        startedAt: 2,
        confidence: null,
        details: {},
      },
      { type: "escalate", id: "a", severity: "high" },
      { type: "close", id: "a", endedAt: 9 },
    ]);
    expect(events).toEqual([
      { id: "b", kind: "tab_hidden", severity: "warn", startedAt: 2, endedAt: null },
      { id: "a", kind: "face_missing", severity: "high", startedAt: 1, endedAt: 9 },
    ]);
  });

  it("keeps the newest events when the list is full", () => {
    const rules = new Rules("standard");
    let events: DemoEvent[] = [];
    for (let t = 0; t < MAX_EVENTS + 5; t++)
      events = applyActions(events, rules.instant("shortcut", t));
    expect(events).toHaveLength(MAX_EVENTS);
    expect(events[0]!.startedAt).toBe(MAX_EVENTS + 4);
  });

  it("follows the engine: one frame of a second face is not an event, two seconds is", () => {
    const rules = new Rules("standard");
    let events = applyActions([], rules.face({ t: 0, faces: 2, yaw: null, pitch: null }));
    expect(events).toEqual([]);
    events = applyActions(events, rules.face({ t: 2_100, faces: 2, yaw: null, pitch: null }));
    expect(events.map((e) => e.kind)).toEqual(["multiple_faces"]);
  });
});
