import { testWindow } from "../../lib/time";
import type { TestRow } from "./api";

export type State = "Draft" | "Cancelled" | "Open now" | "Scheduled" | "Closed";

export function testState(test: Pick<TestRow, "status" | "opens_at" | "closes_at">): State {
  if (test.status === "draft") return "Draft";
  if (test.status === "closed") return "Cancelled";
  const window = testWindow(test.opens_at, test.closes_at);
  return window === "open" ? "Open now" : window === "upcoming" ? "Scheduled" : "Closed";
}
