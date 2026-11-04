import { PhonePresence, PhoneRules } from "./phone";
import { similarityOf, signatureFromPixels, SIG_H, SIG_W } from "../signature";

function ids() {
  let n = 0;
  return () => `p${++n}`;
}

describe("PhoneRules", () => {
  it("flags a second person after 2 s", () => {
    const r = new PhoneRules(ids());
    const actions = [0, 1000, 2000].flatMap((t) => r.objects({ t, persons: 2, phone: 0, book: 0 }));
    expect(actions).toMatchObject([{ type: "open", kind: "phone_person", severity: "high" }]);
  });

  it("needs a phone or book in two of three frames", () => {
    const r = new PhoneRules(ids());
    expect(r.objects({ t: 0, persons: 1, phone: 0.9, book: 0 })).toEqual([]);
    expect(r.objects({ t: 2000, persons: 1, phone: 0, book: 0.8 })).toMatchObject([
      { type: "open", kind: "phone_object" },
    ]);
  });

  it("flags a moved phone only after 10 s away from the setup view", () => {
    const r = new PhoneRules(ids());
    const early = [0, 5000, 9000].flatMap((t) => r.view(t, 0.2));
    expect(early).toEqual([]);
    expect(r.view(10_000, 0.2)).toMatchObject([
      { type: "open", kind: "phone_moved", severity: "warn" },
    ]);
  });

  it("records a hidden page as one closed high event with its length", () => {
    const actions = new PhoneRules(ids()).hidden(1000, 31_000, () => "h1");
    expect(actions).toEqual([
      {
        type: "open",
        id: "h1",
        kind: "phone_hidden",
        severity: "high",
        startedAt: 1000,
        confidence: null,
        details: { seconds: 30 },
      },
      { type: "close", id: "h1", endedAt: 31_000 },
    ]);
  });
});

describe("PhonePresence", () => {
  it("warns after 20 s gone, raises at 2 minutes, closes when back", () => {
    const p = new PhonePresence(ids());
    expect(p.update(false, 0)).toEqual([]);
    expect(p.update(false, 20_000)).toMatchObject([
      { type: "open", kind: "phone_gone", severity: "warn" },
    ]);
    expect(p.update(false, 120_000)).toMatchObject([{ type: "escalate", severity: "high" }]);
    expect(p.goneForMs(120_000)).toBe(120_000);
    // Back, seen 5 s after it was last seen gone: closed at once, dated to the last gone sample.
    expect(p.update(true, 125_000)).toEqual([{ type: "close", id: "p1", endedAt: 120_000 }]);
    expect(p.goneForMs(125_000)).toBe(0);
  });

  it("ignores a few seconds' drop", () => {
    const p = new PhonePresence(ids());
    expect(
      [
        p.update(false, 0),
        p.update(false, 10_000),
        p.update(true, 12_000),
        p.update(true, 14_000),
      ].flat(),
    ).toEqual([]);
  });
});

describe("view similarity", () => {
  function frame(fn: (x: number, y: number) => number): Float32Array {
    const rgba = new Uint8ClampedArray(SIG_W * SIG_H * 4);
    for (let y = 0; y < SIG_H; y++)
      for (let x = 0; x < SIG_W; x++) {
        const v = fn(x, y);
        const i = (y * SIG_W + x) * 4;
        rgba[i] = rgba[i + 1] = rgba[i + 2] = v;
        rgba[i + 3] = 255;
      }
    return signatureFromPixels(rgba);
  }
  const desk = frame((x, y) => (x < 16 ? 200 : 40) + y);

  it("is 1 for the same view", () => expect(similarityOf(desk, desk)).toBeCloseTo(1));
  it("stays high when only the light changes", () =>
    expect(
      similarityOf(
        desk,
        frame((x, y) => ((x < 16 ? 200 : 40) + y) * 0.6),
      ),
    ).toBeGreaterThan(0.95));
  it("drops for a different view", () =>
    expect(
      similarityOf(
        desk,
        frame((x, y) => (y < 12 ? 220 : 30) + x),
      ),
    ).toBeLessThan(0.6));
});
