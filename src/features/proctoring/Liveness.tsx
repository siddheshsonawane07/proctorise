import { useEffect, useRef, useState } from "react";
import { Detector, type Detection } from "./detector";

type Step = "straight" | "turn" | "turn_back" | "blink" | "done" | "failed";

const PROMPT: Record<Step, string> = {
  straight: "Look straight at the camera.",
  turn: "Slowly turn your head to one side.",
  turn_back: "Now turn it to the other side.",
  blink: "Now blink.",
  done: "Thank you.",
  failed: "We couldn't complete the check. Make sure your face is well lit, then try again.",
};

const TURN_DEG = 20;
const TIMEOUT_MS = 30_000;

/**
 * Proves a live person is in front of the camera, not a photo: turn one way, then the other,
 * then blink (PHASE_5 § 5.3). Calls onDone(true) on success, onDone(false) after 30 s.
 */
export function Liveness({
  video,
  onDone,
}: {
  video: HTMLVideoElement | null;
  onDone: (passed: boolean) => void;
}) {
  const [step, setStep] = useState<Step>("straight");
  const state = useRef({ step: "straight" as Step, since: 0, firstSide: 0 });
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!video) return;
    const started = Date.now();
    const advance = (next: Step) => {
      state.current.step = next;
      setStep(next);
      if (next === "done") done.current(true);
      if (next === "failed") done.current(false);
    };
    const detector = new Detector({
      withFace: true,
      fps: 8,
      objectsEvery: 1_000_000,
      now: () => Date.now(),
      onResult: (r: Detection) => {
        const s = state.current;
        if (s.step === "done" || s.step === "failed") return;
        if (Date.now() - started > TIMEOUT_MS) return advance("failed");
        if (r.faces !== 1 || r.yaw === null) return;
        if (s.step === "straight" && Math.abs(r.yaw) < 10) {
          s.since ||= r.t;
          if (r.t - s.since > 800) advance("turn");
        } else if (s.step === "turn" && Math.abs(r.yaw) > TURN_DEG) {
          s.firstSide = Math.sign(r.yaw);
          advance("turn_back");
        } else if (
          s.step === "turn_back" &&
          Math.sign(r.yaw) === -s.firstSide &&
          Math.abs(r.yaw) > TURN_DEG
        ) {
          advance("blink");
        } else if (s.step === "blink" && (r.blink ?? 0) > 0.5) {
          advance("done");
        }
      },
    });
    void detector.start(video).catch(() => advance("failed"));
    return () => detector.stop();
  }, [video]);

  return (
    <p role="status" aria-live="assertive" className="text-lg font-medium">
      {PROMPT[step]}
    </p>
  );
}
