import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "react-router";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { phoneClient } from "../../lib/phoneClient";
import { messageFrom } from "../../lib/errors";
import { Button, Field, Message } from "../../app/ui/form";
import { Detector, type Detection } from "../proctoring/detector";
import { EventSink } from "../proctoring/sink";
import { uploadSnapshot } from "../proctoring/evidence";
import { PhoneRules } from "../proctoring/rules/phone";
import type { Action } from "../proctoring/rules/engine";
import { signature, similarityOf } from "../proctoring/signature";
import { pairingChannel, send } from "./channel";

type Stage =
  | { kind: "code" }
  | { kind: "connecting" }
  | { kind: "error"; message: string }
  | { kind: "connected"; student: string; title: string }
  | { kind: "setup" }
  | { kind: "waiting" }
  | { kind: "live" }
  | { kind: "ended" };

type Status = {
  paired: boolean;
  pairing_id?: string;
  ready?: boolean;
  attempt_id?: string | null;
  attempt_status?: string | null;
  snapshot_interval_s?: number;
  server_now?: string;
};

async function status(): Promise<Status> {
  const { data, error } = await phoneClient.rpc("phone_status");
  if (error) throw error;
  return data as unknown as Status;
}

function deviceLabel(): string {
  const ua = navigator.userAgent;
  const device = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : "Phone";
  const browser = /CriOS|Chrome/.test(ua)
    ? "Chrome"
    : /FxiOS|Firefox/.test(ua)
      ? "Firefox"
      : /Safari/.test(ua)
        ? "Safari"
        : "browser";
  return `${device}, ${browser}`;
}

/**
 * The phone as a side camera (PHASE_6 § 4–5). No account: an anonymous session claims the
 * one-time token, then the page sets up the view, waits for the test, and watches until it ends.
 */
export function PhonePage() {
  const { token } = useParams();
  const [stage, setStage] = useState<Stage>(token ? { kind: "connecting" } : { kind: "code" });
  const [pairingId, setPairingId] = useState<string | null>(null);
  // Stable, so the camera's effect does not restart on every render.
  const onStage = useCallback((kind: "waiting" | "live" | "ended") => setStage({ kind }), []);

  async function connect(secret: { token?: string; code?: string }) {
    setStage({ kind: "connecting" });
    try {
      const { data } = await phoneClient.auth.getSession();
      if (!data.session) {
        const signIn = await phoneClient.auth.signInAnonymously();
        if (signIn.error) throw signIn.error;
      }
      // A reload of a phone that is already paired: carry on, don't claim again.
      const now = await status();
      if (now.paired && now.pairing_id) {
        setPairingId(now.pairing_id);
        setStage({ kind: "setup" });
        return;
      }
      const { data: claimed, error } = await phoneClient.rpc("claim_pairing", {
        p_token: secret.token ?? (null as unknown as string),
        p_code: secret.code ?? (null as unknown as string),
        p_device_label: deviceLabel(),
      });
      if (error) throw error;
      const c = claimed as { pairing_id: string; student: string; test_title: string };
      setPairingId(c.pairing_id);
      setStage({ kind: "connected", student: c.student, title: c.test_title });
    } catch (error) {
      setStage({ kind: "error", message: messageFrom(error) });
    }
  }

  const tokenOnce = useRef(false);
  useEffect(() => {
    if (token && !tokenOnce.current) {
      tokenOnce.current = true;
      void connect({ token });
    }
  }, [token]);

  if (stage.kind === "code" || stage.kind === "error") {
    return (
      <CodeEntry
        error={stage.kind === "error" ? stage.message : null}
        onCode={(code) => void connect({ code })}
      />
    );
  }
  if (stage.kind === "connecting") return <Big title="Connecting…" />;
  if (stage.kind === "connected") {
    return (
      <div className="space-y-4">
        <Big title={`Connected to ${stage.student}'s test`} text={stage.title} />
        <p className="text-text-muted">
          This phone will be a side camera. Prop it up to your left or right, about an arm and a
          half away, so it sees your hands, keyboard and screen. Plug it in if you can.
        </p>
        <Button className="w-full" onClick={() => setStage({ kind: "setup" })}>
          Start the camera
        </Button>
      </div>
    );
  }
  if (stage.kind === "ended") {
    return <Big title="The test is over" text="Thank you. You can close this page." />;
  }
  return <Camera pairingId={pairingId!} stage={stage.kind} onStage={onStage} />;
}

function CodeEntry({ error, onCode }: { error: string | null; onCode: (code: string) => void }) {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCode(String(new FormData(event.currentTarget).get("code")));
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-2xl font-semibold">Connect your phone</h1>
      <p className="text-text-muted">Type the 6-character code from your test screen.</p>
      <Field
        label="Code"
        name="code"
        required
        maxLength={8}
        autoComplete="off"
        autoCapitalize="characters"
      />
      {error && <Message kind="error">{error}</Message>}
      <Button type="submit" className="w-full">
        Connect
      </Button>
    </form>
  );
}

function Big({ title, text }: { title: string; text?: string }) {
  return (
    <div className="space-y-2 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {text && <p className="text-text-muted">{text}</p>}
    </div>
  );
}

const SETUP_FRAMES = 3;

/** The camera from setup to the end of the test. */
function Camera({
  pairingId,
  stage,
  onStage,
}: {
  pairingId: string;
  stage: "setup" | "waiting" | "live";
  onStage: (kind: "waiting" | "live" | "ended") => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [setupHint, setSetupHint] = useState("Looking for you and your laptop…");
  // The check is a help, not a gate (D7): after 15 s the student may go on, and the teacher is told.
  const [canSkip, setCanSkip] = useState(false);
  const skip = useRef<() => void>(() => {});
  useEffect(() => {
    if (stage !== "setup") return;
    const timer = setTimeout(() => setCanSkip(true), 15_000);
    return () => clearTimeout(timer);
  }, [stage]);
  const stageRef = useRef(stage);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let wakeLock: { release: () => Promise<void> } | null = null;
    let channel: RealtimeChannel | null = null;
    let offset = 0;
    let attemptId: string | null = null;
    let reference: Float32Array | null = null;
    let goodFrames = 0;
    let hiddenAt: number | null = null;
    let setupUnconfirmed = false;
    const timers: ReturnType<typeof setInterval>[] = [];
    const sink = new EventSink(5_000, phoneClient);
    const rules = new PhoneRules();
    const now = () => Date.now() + offset;

    const apply = (actions: Action[]) => {
      for (const a of actions) {
        if (!attemptId) return;
        if (a.type === "open") {
          sink.add({
            client_id: a.id,
            attempt_id: attemptId,
            device: "phone",
            kind: a.kind,
            severity: a.severity,
            started_at: new Date(a.startedAt).toISOString(),
            confidence: a.confidence,
            details: a.details as Record<string, string>,
          });
          if (a.severity !== "info" && video.current) {
            const id = a.id;
            void uploadSnapshot(attemptId, video.current, "camera", "event", phoneClient).then(
              (path) => {
                if (path) sink.update({ client_id: id, snapshot_path: path });
              },
            );
          }
        } else if (a.type === "escalate") sink.update({ client_id: a.id, severity: a.severity });
        else sink.update({ client_id: a.id, ended_at: new Date(a.endedAt).toISOString() });
      }
    };

    async function startCamera() {
      stream?.getTracks().forEach((t) => t.stop());
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (!video.current) return;
      video.current.srcObject = stream;
      await video.current.play().catch(() => {});
      for (const track of stream.getVideoTracks()) {
        track.addEventListener("ended", () => apply(rules.cameraLost(true, now())));
      }
    }

    async function keepAwake() {
      try {
        const lock = (
          navigator as Navigator & {
            wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
          }
        ).wakeLock;
        wakeLock = (await lock?.request("screen")) ?? null;
      } catch {
        wakeLock = null;
      }
    }

    const detector = new Detector({
      withFace: false,
      fps: 1,
      objectsEvery: 1,
      now,
      onResult: (r: Detection) => {
        const objects = r.objects ?? [];
        const count = (label: string, min: number) =>
          objects.filter((o) => o.label === label && o.score >= min).length;
        const best = (label: string) =>
          Math.max(0, ...objects.filter((o) => o.label === label).map((o) => o.score));
        if (stageRef.current === "setup") {
          const person = count("person", 0.5) >= 1;
          const desk = count("laptop", 0.4) + count("keyboard", 0.4) >= 1;
          setSetupHint(
            person && desk
              ? "Hold still…"
              : !person
                ? "Make sure the camera can see you."
                : "Turn the phone so it also sees your laptop or keyboard.",
          );
          goodFrames = person && desk ? goodFrames + 1 : 0;
          if (goodFrames >= SETUP_FRAMES) ready();
        } else if (stageRef.current === "live") {
          apply(
            rules.objects({
              t: r.t,
              persons: count("person", 0.5),
              phone: best("cell phone"),
              book: best("book"),
            }),
          );
          if (reference && video.current) {
            const current = signature(video.current);
            if (current) apply(rules.view(r.t, similarityOf(reference, current)));
          }
        }
      },
    });

    function ready() {
      if (stageRef.current !== "setup" || !video.current) return;
      stageRef.current = "waiting";
      reference = signature(video.current);
      void phoneClient.rpc("mark_phone_ready").then(() => {
        if (channel) send(channel, { event: "ready" });
        onStage("waiting");
      });
    }
    skip.current = () => {
      setupUnconfirmed = true;
      ready();
    };

    async function begin() {
      try {
        await startCamera();
      } catch {
        setCameraError("The camera could not start. Allow it for this page, then reload.");
        return;
      }
      await keepAwake();
      channel = pairingChannel(phoneClient, pairingId, "phone", {});
      if (video.current) void detector.start(video.current);

      // During setup, a small picture to the laptop every 1.5 s, so the student can see the view.
      timers.push(
        setInterval(() => {
          if (stageRef.current !== "setup" || !video.current || !channel) return;
          const canvas = document.createElement("canvas");
          canvas.width = 200;
          canvas.height = Math.round(
            (200 * video.current.videoHeight) / (video.current.videoWidth || 1),
          );
          canvas.getContext("2d")?.drawImage(video.current, 0, 0, canvas.width, canvas.height);
          send(channel, { event: "preview", image: canvas.toDataURL("image/jpeg", 0.5) });
        }, 1_500),
      );

      // Waiting for the test to start, then watching until it ends.
      timers.push(
        setInterval(async () => {
          const s = await status().catch(() => null);
          if (!s || stopped) return;
          if (s.server_now) offset = Date.parse(s.server_now) - Date.now();
          if (!s.paired) return onStage("ended");
          if (s.attempt_id && s.attempt_status !== "in_progress") return onStage("ended");
          if (s.attempt_id && !attemptId && stageRef.current !== "setup") {
            attemptId = s.attempt_id;
            sink.start();
            onStage("live");
            if (video.current)
              void uploadSnapshot(attemptId, video.current, "camera", "setup", phoneClient);
            if (setupUnconfirmed) {
              const id = crypto.randomUUID();
              apply([
                {
                  type: "open",
                  id,
                  kind: "phone_setup_unconfirmed",
                  severity: "warn",
                  startedAt: now(),
                  confidence: null,
                  details: {},
                },
                { type: "close", id, endedAt: now() },
              ]);
            }
            const every = (s.snapshot_interval_s ?? 60) * 1000;
            timers.push(
              setInterval(() => {
                if (attemptId && video.current)
                  void uploadSnapshot(attemptId, video.current, "camera", "thumbnail", phoneClient);
              }, every),
            );
          }
        }, 3_000),
      );
    }

    // On iOS a hidden page loses its camera: record the gap, then start the camera again.
    const onVisibility = async () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = now();
        return;
      }
      if (hiddenAt !== null && attemptId) apply(rules.hidden(hiddenAt, now()));
      hiddenAt = null;
      await keepAwake();
      if (!stream || stream.getVideoTracks().every((t) => t.readyState === "ended")) {
        await startCamera().catch(() => {});
        apply(rules.cameraLost(false, now()));
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    void begin();

    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisibility);
      timers.forEach(clearInterval);
      detector.stop();
      apply(rules.end(now()));
      void sink.stop();
      if (channel) void phoneClient.removeChannel(channel);
      void wakeLock?.release().catch(() => {});
      stream?.getTracks().forEach((t) => t.stop());
    };
    // The camera restarts when the student switches between front and back.
  }, [pairingId, facing, onStage]);

  return (
    <div className="space-y-4">
      {stage === "setup" && <Big title="Set up the view" text={setupHint} />}
      {stage === "waiting" && (
        <Big title="Ready" text="Start the test on your laptop. Keep this page open." />
      )}
      {stage === "live" && (
        <Big
          title="Test in progress"
          text="Keep this page open. Don't touch your phone until the test ends."
        />
      )}
      {cameraError && <Message kind="error">{cameraError}</Message>}
      <video
        ref={video}
        muted
        playsInline
        autoPlay
        aria-label="What this phone sees"
        className="w-full rounded-lg bg-surface-muted"
      />
      {stage === "setup" && canSkip && (
        <Button className="w-full" onClick={() => skip.current()}>
          Continue anyway
        </Button>
      )}
      {stage === "setup" && (
        <Button
          variant="plain"
          className="w-full"
          onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
        >
          Switch to the {facing === "user" ? "back" : "front"} camera
        </Button>
      )}
    </div>
  );
}
