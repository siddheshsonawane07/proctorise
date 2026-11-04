import { formatRemaining, fromLocalInput, testWindow, toLocalInput } from "./time";

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

describe("formatRemaining", () => {
  it("shows minutes and seconds", () => expect(formatRemaining(309_000)).toBe("05:09"));
  it("shows hours past an hour", () => expect(formatRemaining(3_909_000)).toBe("1:05:09"));
  it("rounds a part second up, so 00:00 means time is up", () =>
    expect(formatRemaining(400)).toBe("00:01"));
  it("never goes negative", () => expect(formatRemaining(-5_000)).toBe("00:00"));
});
