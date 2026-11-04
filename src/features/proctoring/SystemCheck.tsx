import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { supabase } from "../../lib/supabase";
import { Button, Card, Message } from "../../app/ui/form";
import { needsCamera, type Proctoring } from "../builder/proctoring";
import { Detector } from "./detector";
import { hasSecondDisplay } from "./integrity";
import { useCamera } from "./useCamera";
import { Preview } from "./Preview";
import { useEnrolment } from "./enrolmentApi";
import { preloadIdentity } from "./identity";
import { PhonePairing } from "../pairing/PhonePairing";

type Check = { label: string; state: "pass" | "warn" | "block" | "wait"; text: string };

export type CheckedDevices = {
  camera: MediaStream | null;
  screen: MediaStream | null;
  /** The connected phone's pairing, when the test needs one. */
  pairingId: string | null;
};

const MARK: Record<Check["state"], string> = { pass: "OK", warn: "Note", block: "Fix", wait: "…" };

function isChromium(): boolean {
  const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } })
    .userAgentData?.brands;
  return !!brands?.some((b) => /Chrom|Edge/.test(b.brand));
}

/**
 * The lobby's checks before a proctored test (PHASE_5 § 5.2). Each line passes, warns or blocks,
 * in plain words. Calls onChange with the camera (and screen) once nothing blocks.
 */
export function SystemCheck({
  testId,
  proctoring,
  onChange,
  handOver,
}: {
  testId: string;
  proctoring: Proctoring;
  onChange: (devices: CheckedDevices | null) => void;
  /** True once the test has taken the streams: leaving the lobby then must not stop them. */
  handOver: boolean;
}) {
  const camera = useCamera(proctoring.preset !== "light");
  const enrolment = useEnrolment();
  const [screen, setScreen] = useState<MediaStream | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [network, setNetwork] = useState<number | null>(null);
  const [faces, setFaces] = useState<number | null>(null);
  const [engine, setEngine] = useState<"loading" | "ok" | "slow" | "failed">("loading");
  const [oneScreen, setOneScreen] = useState(false);
  const [pairingId, setPairingId] = useState<string | null>(null);
  const videoBox = useRef<HTMLDivElement>(null);
  const screenRef = useRef<MediaStream | null>(null);
  const handedOver = useRef(false);

  // The test keeps the camera and screen; otherwise leaving the lobby releases them.
  useEffect(() => {
    if (handOver) {
      handedOver.current = true;
      camera.keep();
    }
  }, [handOver, camera]);
  useEffect(
    () => () => {
      setTimeout(() => {
        if (!handedOver.current) screenRef.current?.getTracks().forEach((t) => t.stop());
      }, 0);
    },
    [],
  );
  const cameraOn = camera.state.status === "on" ? camera.state.stream : null;
  const camerasNeeded = proctoring.preset !== "light";

  // Ask for the camera at once, and time a round trip to our own server.
  useEffect(() => {
    if (needsCamera(proctoring)) void camera.ask();
    const started = performance.now();
    void supabase
      .from("profiles")
      .select("id")
      .limit(1)
      .then(() => setNetwork(performance.now() - started));
    if (proctoring.identity_check) preloadIdentity();
    // Ask once, when the lobby opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the detector and watch the preview for a face.
  useEffect(() => {
    if (!cameraOn || !camerasNeeded) return;
    const video = videoBox.current?.querySelector("video");
    if (!video) return;
    const detector = new Detector({
      withFace: true,
      fps: 3,
      objectsEvery: 1_000_000,
      now: () => Date.now(),
      onResult: (r) => {
        setFaces(r.faces);
        setEngine(detector.frameMs > 300 ? "slow" : "ok");
      },
    });
    detector.start(video).catch(() => setEngine("failed"));
    return () => detector.stop();
  }, [cameraOn, camerasNeeded]);

  async function shareScreen() {
    setScreenError(null);
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" } as MediaTrackConstraints,
        audio: false,
      });
      const surface = s.getVideoTracks()[0]?.getSettings().displaySurface;
      if (surface && surface !== "monitor") {
        s.getTracks().forEach((t) => t.stop());
        setScreenError("Share your entire screen, not a window or a tab.");
        return;
      }
      screenRef.current = s;
      setScreen(s);
    } catch {
      setScreenError("Screen sharing was cancelled. The test needs it.");
    }
  }

  const second = hasSecondDisplay();
  const checks: Check[] = [
    isChromium()
      ? { label: "Browser", state: "pass", text: "Chrome or Edge" }
      : {
          label: "Browser",
          state: "warn",
          text: "This browser works, but can't check for a second screen. Chrome or Edge is best.",
        },
  ];
  if (needsCamera(proctoring)) {
    checks.push(
      camera.state.status === "on"
        ? {
            label: "Camera",
            state: "pass",
            text: camerasNeeded ? "Camera and microphone on" : "Camera on",
          }
        : camera.state.status === "refused"
          ? { label: "Camera", state: "block", text: camera.state.message }
          : { label: "Camera", state: "wait", text: "Starting the camera…" },
    );
  }
  if (camerasNeeded) {
    checks.push(
      engine === "failed"
        ? {
            label: "Checks",
            state: "block",
            text: "The camera checks couldn't start in this browser. Try Chrome or Edge.",
          }
        : engine === "loading"
          ? { label: "Checks", state: "wait", text: "Loading the camera checks…" }
          : faces === 1
            ? {
                label: "Your face",
                state: engine === "slow" ? "warn" : "pass",
                text:
                  engine === "slow"
                    ? "We can see you. This computer is slow, so checks will run less often."
                    : "We can see you clearly",
              }
            : faces === 0
              ? {
                  label: "Your face",
                  state: "warn",
                  text: "We can't see your face. Sit facing the camera, in good light.",
                }
              : faces && faces > 1
                ? {
                    label: "Your face",
                    state: "warn",
                    text: "More than one face is in view. You need to be alone.",
                  }
                : { label: "Your face", state: "wait", text: "Looking for your face…" },
    );
  }
  checks.push(
    second === true
      ? {
          label: "Screens",
          state: "block",
          text: "A second screen is connected. Disconnect it, then reload this page.",
        }
      : second === false
        ? { label: "Screens", state: "pass", text: "One screen" }
        : {
            label: "Screens",
            state: oneScreen ? "pass" : "block",
            text: "This browser can't check. Confirm below that you use one screen.",
          },
    document.fullscreenEnabled
      ? { label: "Full screen", state: "pass", text: "The test will open in full screen" }
      : { label: "Full screen", state: "block", text: "This browser can't go full screen." },
    network === null
      ? { label: "Connection", state: "wait", text: "Checking…" }
      : network > 1500
        ? {
            label: "Connection",
            state: "warn",
            text: "Slow. Answers will still save, and wait if it drops.",
          }
        : { label: "Connection", state: "pass", text: "Good" },
  );
  if (proctoring.screen_share_required) {
    checks.push(
      screen
        ? { label: "Screen sharing", state: "pass", text: "Your whole screen is shared" }
        : {
            label: "Screen sharing",
            state: "block",
            text: screenError ?? "The test needs your whole screen shared.",
          },
    );
  }
  if (proctoring.phone_required) {
    checks.push(
      pairingId
        ? { label: "Phone camera", state: "pass", text: "Connected and set up" }
        : { label: "Phone camera", state: "block", text: "Connect your phone below." },
    );
  }
  if (proctoring.identity_check) {
    checks.push(
      enrolment.data
        ? { label: "Your photo", state: "pass", text: "On file" }
        : {
            label: "Your photo",
            state: enrolment.isPending ? "wait" : "block",
            text: "Add your photo before this test.",
          },
    );
  }

  const ready =
    checks.every((c) => c.state === "pass" || c.state === "warn") &&
    (!needsCamera(proctoring) || cameraOn !== null);
  useEffect(() => {
    onChange(ready ? { camera: cameraOn, screen, pairingId } : null);
  }, [ready, cameraOn, screen, pairingId, onChange]);

  return (
    <Card title="Checking your computer">
      <div className="grid gap-4 md:grid-cols-2">
        <div ref={videoBox} hidden={!needsCamera(proctoring)}>
          {cameraOn ? (
            <Preview stream={cameraOn} />
          ) : (
            <div className="aspect-[4/3] rounded-lg bg-surface-muted" />
          )}
        </div>
        <ul className="space-y-2">
          {checks.map((c) => (
            <li key={c.label} className="flex gap-2 text-sm">
              <span
                className={`w-10 shrink-0 font-medium ${
                  c.state === "pass"
                    ? "text-accent"
                    : c.state === "block"
                      ? "text-high"
                      : c.state === "warn"
                        ? "text-warn"
                        : "text-text-muted"
                }`}
              >
                {MARK[c.state]}
              </span>
              <span>
                <span className="font-medium">{c.label}:</span> {c.text}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {camera.state.status === "refused" && (
        <Button variant="plain" onClick={() => void camera.ask()}>
          Try the camera again
        </Button>
      )}
      {second === null && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={oneScreen}
            onChange={(e) => setOneScreen(e.target.checked)}
          />
          I'm using one screen only
        </label>
      )}
      {proctoring.screen_share_required && !screen && (
        <Button variant="plain" onClick={() => void shareScreen()}>
          Share my screen
        </Button>
      )}
      {proctoring.phone_required && (
        <div className="border-t border-border pt-4">
          <h3 className="mb-2 font-medium">Your phone as a side camera</h3>
          <PhonePairing testId={testId} onReady={setPairingId} />
        </div>
      )}
      {proctoring.identity_check && !enrolment.isPending && !enrolment.data && (
        <Link to="/app/identity" className="text-accent underline">
          Add your photo
        </Link>
      )}
      {screenError && <Message kind="error">{screenError}</Message>}
    </Card>
  );
}
