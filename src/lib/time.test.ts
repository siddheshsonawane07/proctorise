import { fromLocalInput, testWindow, toLocalInput } from "./time";

describe("local datetime inputs", () => {
  it("round-trips through the input format", () => {
    const iso = "2026-11-05T09:30:00.000Z";
    expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
  });
});

describe("testWindow", () => {
  const opens = "2026-11-05T09:00:00Z";
  const closes = "2026-11-05T10:00:00Z";
  it("is upcoming before it opens", () =>
    expect(testWindow(opens, closes, Date.parse("2026-11-05T08:59:59Z"))).toBe("upcoming"));
  it("is open inside the window", () =>
    expect(testWindow(opens, closes, Date.parse("2026-11-05T09:00:00Z"))).toBe("open"));
  it("is closed at the closing time", () =>
    expect(testWindow(opens, closes, Date.parse("2026-11-05T10:00:00Z"))).toBe("closed"));
});
