import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { toast, useToasts } from "./toast";

describe("corner notifications", () => {
  it("shows the newest three, says the same thing once, and lets one be dismissed", () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      toast.ok("Saved.");
      toast.ok("Saved.");
      toast.error("Can't reach the server.");
    });
    expect(result.current.map((t) => [t.kind, t.text])).toEqual([
      ["ok", "Saved."],
      ["error", "Can't reach the server."],
    ]);

    act(() => {
      toast.ok("Class created.");
      toast.ok("Test deleted.");
    });
    expect(result.current.map((t) => t.text)).toEqual([
      "Can't reach the server.",
      "Class created.",
      "Test deleted.",
    ]);

    act(() => toast.dismiss(result.current[0]!.id));
    expect(result.current.map((t) => t.text)).toEqual(["Class created.", "Test deleted."]);
  });
});
