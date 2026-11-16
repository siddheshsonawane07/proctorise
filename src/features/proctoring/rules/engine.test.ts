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

  it("opens after 3 s with no face, dated from when the face went", () => {
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

  it("becomes high after 20 s, and closes once the face is back for a second", () => {
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
  it("is high after two faces for 1.5 s", () => {
    const actions = run(rules(), faces(0, 2_000, { faces: 2, yaw: 0, pitch: 0 }));
    expect(actions).toMatchObject([{ type: "open", kind: "multiple_faces", severity: "high" }]);
  });

  it("ignores a second face for under 1.5 s", () => {
    const actions = run(rules(), [
      ...faces(0, 1_250, { faces: 2, yaw: 0, pitch: 0 }),
      ...faces(1_500, 6_000, ONE_FACE),
    ]);
    expect(actions).toEqual([]);
  });
});

describe("looking_away", () => {
  const turned = (yaw: number) => ({ faces: 1, yaw, pitch: 0 });

  it("measures from where the student rests, not from the camera", () => {
    // A camera well to one side of the screen: reading the screen is a steady 25° turn to it.
    const reading = run(rules(), faces(0, 30_000, turned(25)));
    expect(reading).toEqual([]);

    // From there, a further turn is what counts.
    const actions = run(rules(), [
      ...faces(0, 3_000, turned(25)),
      ...faces(3_250, 9_000, turned(60)),
    ]);
    expect(actions).toMatchObject([{ type: "open", kind: "looking_away", severity: "warn" }]);
  });

  it("adds up looking away across the window", () => {
    const actions = run(rules(), [
      ...faces(0, 3_000, ONE_FACE),
      ...faces(3_250, 5_500, turned(45)),
      ...faces(5_750, 8_000, ONE_FACE),
      ...faces(8_250, 11_000, turned(45)),
    ]);
    expect(actions).toMatchObject([{ type: "open", kind: "looking_away" }]);
  });

  it("does not count a glance", () => {
    const actions = run(rules(), [
      ...faces(0, 3_000, ONE_FACE),
      ...faces(3_250, 5_000, turned(45)),
      ...faces(5_250, 20_000, ONE_FACE),
    ]);
    expect(actions).toEqual([]);
  });

  it("counts eyes held far to one side with the head still", () => {
    const actions = run(rules(), [
      ...faces(0, 3_000, { ...ONE_FACE, gazeX: 0.05 }),
      ...faces(3_250, 9_000, { ...ONE_FACE, gazeX: 0.8 }),
    ]);
    expect(actions).toMatchObject([{ type: "open", kind: "looking_away" }]);
  });

  it("never takes a long look away as the new normal", () => {
    const actions = run(rules(), [
      ...faces(0, 3_000, ONE_FACE),
      ...faces(3_250, 90_000, turned(45)),
    ]);
    expect(actions.map((a) => a.type)).toEqual(["open"]);
  });

  it("does not learn its resting place from a head turned right away", () => {
    // Starting the test turned 70° from the camera is still looking away.
    const actions = run(rules(), faces(0, 9_000, turned(70)));
    expect(actions).toMatchObject([{ type: "open", kind: "looking_away" }]);
  });

  it("follows a slow change of posture", () => {
    // Twelve degrees further round, a degree every two seconds: never a look away.
    const frames: FaceSignal[] = [];
    for (let t = 0; t <= 60_000; t += 250) {
      frames.push({ t, faces: 1, yaw: Math.min(12, t / 2_000) + 10, pitch: 0 });
    }
    expect(run(rules(), frames)).toEqual([]);
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
