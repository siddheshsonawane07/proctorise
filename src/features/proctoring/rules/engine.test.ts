import { Rules, type Action, type FaceSignal } from "./engine";

/** A rules engine with predictable ids: e1, e2, … */
function rules(preset: "light" | "standard" | "strict" = "standard") {
  let n = 0;
  return new Rules(preset, () => `e${++n}`);
}

/** Face frames every `stepMs` from `from` to `to`, all the same. */
function faces(from: number, to: number, f: Omit<FaceSignal, "t">, stepMs = 250): FaceSignal[] {
  const out: FaceSignal[] = [];
  for (let t = from; t <= to; t += stepMs) out.push({ t, ...f });
  return out;
}

const ONE_FACE = { faces: 1, yaw: 0, pitch: 0 };
const NO_FACE = { faces: 0, yaw: null, pitch: null };

function run(r: Rules, frames: FaceSignal[]): Action[] {
  return frames.flatMap((f) => r.face(f));
}

describe("face_missing", () => {
  it("does not fire on a single lost frame", () => {
    const r = rules();
    const actions = run(r, [
      ...faces(0, 2000, ONE_FACE),
      { t: 2250, ...NO_FACE },
      ...faces(2500, 10_000, ONE_FACE),
    ]);
    expect(actions).toEqual([]);
  });

  it("opens after 5 s with no face, dated from when the face went", () => {
    const r = rules();
    const actions = run(r, [...faces(0, 1000, ONE_FACE), ...faces(1250, 6500, NO_FACE)]);
    expect(actions).toEqual([
      {
        type: "open",
        id: "e1",
        kind: "face_missing",
        severity: "warn",
        startedAt: 1250,
        confidence: null,
        details: {},
      },
    ]);
  });

  it("becomes high after 30 s, and closes once the face is back for a second", () => {
    const r = rules();
    const actions = run(r, [...faces(0, 31_000, NO_FACE), ...faces(31_250, 33_000, ONE_FACE)]);
    expect(actions.map((a) => a.type)).toEqual(["open", "escalate", "close"]);
    expect(actions[2]).toEqual({ type: "close", id: "e1", endedAt: 31_000 });
  });

  it("is stricter under the strict preset", () => {
    const actions = run(rules("strict"), faces(0, 3_000, NO_FACE));
    expect(actions).toHaveLength(1);
  });

  it("is off under the light preset", () => {
    expect(run(rules("light"), faces(0, 60_000, NO_FACE))).toEqual([]);
  });
});

describe("multiple_faces", () => {
  it("is high after two faces for 2 s", () => {
    const actions = run(rules(), faces(0, 2_000, { faces: 2, yaw: 0, pitch: 0 }));
    expect(actions).toMatchObject([{ type: "open", kind: "multiple_faces", severity: "high" }]);
  });

  it("ignores a second face for under 2 s", () => {
    const actions = run(rules(), [
      ...faces(0, 1_500, { faces: 2, yaw: 0, pitch: 0 }),
      ...faces(1_750, 6_000, ONE_FACE),
    ]);
    expect(actions).toEqual([]);
  });
});

describe("looking_away", () => {
  it("adds up looking away across a 30 s window", () => {
    const r = rules();
    const away = { faces: 1, yaw: 50, pitch: 0 };
    const actions = run(r, [
      ...faces(0, 4_000, away),
      ...faces(4_250, 8_000, ONE_FACE),
      ...faces(8_250, 13_000, away),
    ]);
    expect(actions).toMatchObject([{ type: "open", kind: "looking_away" }]);
  });

  it("does not count a glance", () => {
    const actions = run(rules(), [
      ...faces(0, 2_000, { faces: 1, yaw: 50, pitch: 0 }),
      ...faces(2_250, 20_000, ONE_FACE),
    ]);
    expect(actions).toEqual([]);
  });
});

describe("objects", () => {
  it("needs a phone in two of three frames", () => {
    const r = rules();
    expect(r.objects({ t: 0, phone: 0.9, book: 0 })).toEqual([]);
    expect(r.objects({ t: 1000, phone: 0.1, book: 0 })).toEqual([]);
    expect(r.objects({ t: 2000, phone: 0.8, book: 0 })).toMatchObject([
      { type: "open", kind: "object_phone", severity: "high", confidence: 0.9 },
    ]);
  });

  it("ignores a low-confidence phone", () => {
    const r = rules();
    const actions = [0, 1000, 2000, 3000].flatMap((t) => r.objects({ t, phone: 0.4, book: 0 }));
    expect(actions).toEqual([]);
  });
});

describe("browser conditions", () => {
  it("opens and closes at once, with exact times", () => {
    const r = rules("light");
    expect(r.browser("tab_hidden", true, 1000)).toMatchObject([
      { type: "open", kind: "tab_hidden", severity: "warn", startedAt: 1000 },
    ]);
    expect(r.browser("tab_hidden", false, 4000)).toEqual([
      { type: "close", id: "e1", endedAt: 4000 },
    ]);
  });

  it("treats screen sharing stopping as high", () => {
    expect(rules().browser("screen_share_stopped", true, 0)).toMatchObject([{ severity: "high" }]);
  });

  it("records a paste as a closed info event", () => {
    expect(
      rules()
        .instant("copy_paste", 500)
        .map((a) => a.type),
    ).toEqual(["open", "close"]);
  });
});

describe("ending", () => {
  it("closes whatever is open", () => {
    const r = rules();
    run(r, faces(0, 6_000, NO_FACE));
    r.browser("fullscreen_exit", true, 6_000);
    expect(r.end(7_000)).toEqual([
      { type: "close", id: "e1", endedAt: 7_000 },
      { type: "close", id: "e2", endedAt: 7_000 },
    ]);
  });
});
