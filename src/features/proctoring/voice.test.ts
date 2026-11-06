import { COOLDOWN_MS, QUIET_AFTER_MS, Voice, startInstructions } from "./voice";

class FakeUtterance {
  lang = "";
  rate = 1;
  voice: unknown = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

function setup() {
  let t = 1_000_000;
  const spoken: FakeUtterance[] = [];
  const synth = {
    speaking: false,
    speak: (u: SpeechSynthesisUtterance) => {
      spoken.push(u as unknown as FakeUtterance);
    },
    cancel: () => {},
    getVoices: () => [] as SpeechSynthesisVoice[],
  };
  const voice = new Voice(synth, () => t);
  return {
    voice,
    spoken,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

beforeAll(() => {
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
});

describe("Voice", () => {
  it("speaks the same warning at most once per cool-down", () => {
    const { voice, spoken, advance } = setup();
    expect(voice.warn("looking_away", "Please keep your eyes on the test.")).toBe(true);
    advance(5_000);
    expect(voice.warn("looking_away", "Please keep your eyes on the test.")).toBe(false);
    expect(voice.warn("object_phone", "A phone is in view.")).toBe(true);
    advance(COOLDOWN_MS);
    expect(voice.warn("looking_away", "Please keep your eyes on the test.")).toBe(true);
    expect(spoken.map((u) => u.text)).toHaveLength(3);
  });

  it("counts as talking while it speaks and briefly after, so the speech detector ignores it", () => {
    const { voice, spoken, advance } = setup();
    expect(voice.isTalking()).toBe(false);
    voice.say("Please don't talk during the test.");
    advance(2_000);
    expect(voice.isTalking()).toBe(true);
    spoken[0]!.onend?.();
    advance(QUIET_AFTER_MS - 1);
    expect(voice.isTalking()).toBe(true);
    advance(2);
    expect(voice.isTalking()).toBe(false);
  });

  it("does nothing where the browser has no speech", () => {
    const voice = new Voice(null);
    expect(() => voice.say("hello")).not.toThrow();
    expect(voice.isTalking()).toBe(false);
  });
});

describe("startInstructions", () => {
  it("mentions the camera only when it is used", () => {
    expect(startInstructions(30, true)).toContain("30 minutes");
    expect(startInstructions(30, true)).toContain("camera");
    expect(startInstructions(30, false)).not.toContain("camera");
  });
});
