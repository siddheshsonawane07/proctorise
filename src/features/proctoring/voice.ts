/**
 * Spoken instructions and warnings, with the browser's own speech (nothing is downloaded or sent).
 *
 * - Browsers speak only after a tap, so unlock() is called from the Start button (Phase-9-Critic #8).
 * - The same warning is spoken at most once per COOLDOWN_MS, so it stays worth listening to.
 * - The laptop's speaker plays into its own microphone, so isTalking() is true while speaking and
 *   for QUIET_AFTER_MS after; the speech detector ignores those samples (Phase-9-Critic #7).
 */
export const COOLDOWN_MS = 20_000;
export const QUIET_AFTER_MS = 500;

type Synth = Pick<SpeechSynthesis, "speak" | "cancel" | "getVoices" | "speaking">;

export class Voice {
  private readonly last = new Map<string, number>();
  private talkingUntil = 0;
  private context: AudioContext | null = null;

  constructor(
    private readonly synth: Synth | null = typeof window !== "undefined" &&
    "speechSynthesis" in window
      ? window.speechSynthesis
      : null,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** Call inside a click: lets later speech and the chime play. */
  unlock(): void {
    if (!this.synth) return;
    this.synth.cancel();
    this.synth.speak(new SpeechSynthesisUtterance(""));
    try {
      this.context ??= new AudioContext();
      void this.context.resume();
    } catch {
      this.context = null;
    }
  }

  isTalking(): boolean {
    return (this.synth?.speaking ?? false) || this.now() < this.talkingUntil;
  }

  say(text: string): void {
    if (!this.synth) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    const voice = this.synth
      .getVoices()
      .find((v) => v.lang === "en-IN" || v.lang === "en-GB" || v.lang.startsWith("en"));
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;
    // Until it ends, count it as talking, with room for a long sentence.
    this.talkingUntil = this.now() + 15_000;
    utterance.onend = utterance.onerror = () => {
      this.talkingUntil = this.now() + QUIET_AFTER_MS;
    };
    this.synth.speak(utterance);
  }

  /** A chime and one sentence, unless the same kind was spoken in the last COOLDOWN_MS. */
  warn(kind: string, text: string): boolean {
    const t = this.now();
    const before = this.last.get(kind);
    if (before !== undefined && t - before < COOLDOWN_MS) return false;
    this.last.set(kind, t);
    this.chime();
    this.say(text);
    return true;
  }

  stop(): void {
    this.synth?.cancel();
    void this.context?.close().catch(() => {});
    this.context = null;
  }

  private chime(): void {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running") return;
    this.talkingUntil = Math.max(this.talkingUntil, this.now() + 400);
    for (const [freq, at] of [
      [880, 0],
      [660, 0.14],
    ] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.13);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + 0.14);
    }
  }
}

/** The one voice for the test page. */
export const voice = new Voice();

/** Read aloud when the test starts. */
export function startInstructions(minutes: number, camera: boolean): string {
  return [
    `Your test has started. You have ${minutes} minutes.`,
    camera ? "Keep your face in view of the camera, and don't talk." : "",
    "Stay on this page, in full screen. Your answers save as you go.",
  ]
    .filter(Boolean)
    .join(" ");
}
