import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Button, Message } from "../../app/ui/form";
import { Preview } from "../proctoring/Preview";
import { useCamera } from "../proctoring/useCamera";
import { EVENT_LABEL } from "../proctoring/labels";
import { STUDENT_MESSAGE } from "../proctoring/messages";
import { voice } from "../proctoring/voice";
import { PRESET_THRESHOLDS, type EventKind } from "../proctoring/rules/engine";
import { QuestionView, type ViewItem } from "../questions/QuestionView";
import type { Json } from "../../lib/database.types";
import { DemoSession, type DemoState, type Signals } from "./session";
import type { DemoEvent } from "./events";

const LIMITS = PRESET_THRESHOLDS.standard;

const QUESTION: ViewItem = {
  id: "demo",
  type: "single",
  prompt: "Which gas do plants take in to make their food?",
  options: [
    { id: "a", text: "Oxygen" },
    { id: "b", text: "Carbon dioxide" },
    { id: "c", text: "Nitrogen" },
    { id: "d", text: "Hydrogen" },
  ],
  points: 1,
};

const TRY: { kinds: EventKind[]; text: string }[] = [
  {
    kinds: ["looking_away"],
    text: `Look away from the screen for about ${LIMITS.lookingAwayMs / 1000} seconds.`,
  },
  {
    kinds: ["face_missing"],
    text: `Step out of view, or cover the camera, for ${LIMITS.faceMissingMs / 1000} seconds.`,
  },
  { kinds: ["multiple_faces"], text: "Ask someone to lean into view." },
  { kinds: ["object_phone"], text: "Hold a phone up to the camera, screen or back first." },
  { kinds: ["object_book"], text: "Hold up a book." },
  { kinds: ["speech"], text: "Talk for a few seconds." },
  {
    kinds: ["tab_hidden", "window_blur"],
    text: "Switch to another tab or window, then come back.",
  },
  { kinds: ["copy_paste", "context_menu", "shortcut"], text: "Press Ctrl+C, or right-click." },
  { kinds: ["fullscreen_exit"], text: "Go full screen with the button below, then press Esc." },
];

/**
 * A public page that runs a test's real checks on the visitor's own camera and microphone, and
 * shows what the student and the teacher would each see. Nothing is sent or saved (DemoSession).
 */
export function Demo() {
  const camera = useCamera(true);
  const [state, setState] = useState<DemoState | null>(null);
  const [answer, setAnswer] = useState<Json | undefined>(undefined);
  const [speak, setSpeak] = useState(true);
  const speakRef = useRef(speak);
  const session = useRef<DemoSession | null>(null);
  const stream = camera.state.status === "on" ? camera.state.stream : null;

  useEffect(() => {
    speakRef.current = speak;
    if (session.current) session.current.speak = speak;
  }, [speak]);

  useEffect(() => {
    if (!stream) return;
    const s = new DemoSession(stream, setState);
    s.speak = speakRef.current;
    session.current = s;
    void s.start();
    return () => {
      s.stop();
      session.current = null;
    };
  }, [stream]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title-1-bold tracking-tight text-text">Try the proctoring</h1>
        <p className="mt-2 max-w-3xl text-body-regular text-text-muted">
          The same checks a test runs, on your own camera. Everything happens in this browser tab:
          no pictures, no sound and no events are sent or saved. Close the tab and it's gone.
        </p>
      </div>

      {!stream ? (
        <section className="max-w-xl space-y-4 rounded-2xl border border-border bg-surface-muted p-6">
          <p className="text-body-regular text-text">
            Turn on your camera and microphone to start. The first time, the browser downloads the
            checks (about 20 MB); after that they start at once.
          </p>
          {camera.state.status === "refused" && (
            <Message kind="error">{camera.state.message}</Message>
          )}
          <Button
            disabled={camera.state.status === "asking"}
            onClick={() => {
              // Browsers play sound only after a click; this is that click.
              voice.unlock();
              void camera.ask();
            }}
          >
            {camera.state.status === "asking"
              ? "Waiting for permission…"
              : "Turn on camera and microphone"}
          </Button>
        </section>
      ) : (
        <Running
          stream={stream}
          state={state}
          speak={speak}
          onSpeak={setSpeak}
          answer={answer}
          onAnswer={setAnswer}
          onClear={() => session.current?.clear()}
        />
      )}

      <p className="max-w-3xl text-body-regular text-text-muted">
        A real test can also check your face against your photo, and use your phone as a side
        camera. Those need an account.{" "}
        <Link to="/sign-up" className="text-accent underline">
          Create one
        </Link>{" "}
        or read{" "}
        <Link to="/privacy" className="text-accent underline">
          what a real test records
        </Link>
        .
      </p>
    </div>
  );
}

function Running({
  stream,
  state,
  speak,
  onSpeak,
  answer,
  onAnswer,
  onClear,
}: {
  stream: MediaStream;
  state: DemoState | null;
  speak: boolean;
  onSpeak: (on: boolean) => void;
  answer: Json | undefined;
  onAnswer: (value: Json) => void;
  onClear: () => void;
}) {
  const warning = state?.events.find(
    (e) => e.endedAt === null && e.severity !== "info" && STUDENT_MESSAGE[e.kind],
  );
  const engine =
    !state || state.engine === "loading"
      ? "Starting the checks…"
      : state.engine === "running"
        ? "Checks running"
        : "Camera checks couldn't start on this computer; browser checks are running";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-body-medium text-text-muted">
          Camera on · {engine}
        </p>
        <label className="flex items-center gap-2 text-body-regular text-text">
          <input type="checkbox" checked={speak} onChange={(e) => onSpeak(e.target.checked)} />
          Read warnings aloud
        </label>
      </div>
      {warning && (
        <p
          role="alert"
          className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-body-medium text-warn"
        >
          {STUDENT_MESSAGE[warning.kind]}
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section
            aria-label="What the student sees"
            className="rounded-2xl border border-border bg-surface p-6 shadow-xs"
          >
            <QuestionView item={QUESTION} number={1} value={answer} onChange={onAnswer} />
          </section>

          <section aria-labelledby="try" className="rounded-2xl border border-border p-5">
            <h2 id="try" className="text-headline-semibold text-text">
              Things to try
            </h2>
            <ul className="mt-3 space-y-2">
              {TRY.map((item) => {
                const done = item.kinds.some((k) => state?.seen.includes(k));
                return (
                  <li key={item.text} className="flex items-start gap-2.5 text-body-regular">
                    <span
                      aria-hidden
                      className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-caption-1-semibold ${done ? "bg-accent text-accent-text" : "border border-border"}`}
                    >
                      {done ? "✓" : ""}
                    </span>
                    <span className={done ? "text-text-muted" : "text-text"}>
                      {item.text}
                      {done && <span className="sr-only"> Noticed.</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
            <Button
              variant="plain"
              className="mt-4"
              onClick={() => void document.documentElement.requestFullscreen?.().catch(() => {})}
            >
              Go full screen
            </Button>
          </section>

          <TeacherList events={state?.events ?? []} onClear={onClear} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <Preview stream={stream} />
          {state && <SignalList signals={state.signals} />}
        </aside>
      </div>
    </div>
  );
}

function SignalList({ signals }: { signals: Signals }) {
  const deg = (v: number | null) => (v === null ? null : Math.round(Math.abs(v)));
  const pct = (v: number | null) => (v === null ? null : Math.round(v * 100));
  const objectLimit = Math.round(LIMITS.objectScore * 100);
  return (
    <section aria-labelledby="signals" className="rounded-2xl border border-border p-4">
      <h2 id="signals" className="text-headline-semibold text-text">
        What the checks see
      </h2>
      <dl className="mt-3 space-y-3">
        <Reading
          label="Faces in view"
          text={signals.faces === null ? "—" : String(signals.faces)}
          over={signals.faces !== null && signals.faces !== 1}
        />
        <Meter label="Head turned" value={deg(signals.yaw)} limit={LIMITS.yawDeg} unit="°" />
        <Meter label="Head tilted" value={deg(signals.pitch)} limit={LIMITS.pitchDeg} unit="°" />
        <Meter label="Phone" value={pct(signals.phone)} limit={objectLimit} unit="%" />
        <Meter label="Book or notes" value={pct(signals.book)} limit={objectLimit} unit="%" />
        <Reading label="Talking" text={signals.speaking ? "Yes" : "No"} over={signals.speaking} />
      </dl>
      <p className="mt-3 text-caption-1-regular text-text-muted">
        The line on each bar is where a check starts counting, on the standard setting. Nothing is
        flagged on one reading: each check needs it to last.
      </p>
    </section>
  );
}

function Reading({ label, text, over }: { label: string; text: string; over: boolean }) {
  return (
    <div className="flex items-center justify-between text-body-regular">
      <dt className="text-text-muted">{label}</dt>
      <dd className={`font-medium ${over ? "text-warn" : "text-text"}`}>{text}</dd>
    </div>
  );
}

/** A reading against its limit; the bar runs to twice the limit, with the limit marked. */
function Meter({
  label,
  value,
  limit,
  unit,
}: {
  label: string;
  value: number | null;
  limit: number;
  unit: string;
}) {
  const over = value !== null && value >= limit;
  const width = value === null ? 0 : Math.min(100, (value / (limit * 2)) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-body-regular">
        <dt className="text-text-muted">{label}</dt>
        <dd className={`font-medium ${over ? "text-warn" : "text-text"}`}>
          {value === null ? "—" : `${value}${unit}`}
          <span className="font-normal text-text-muted">
            {" "}
            / {limit}
            {unit}
          </span>
        </dd>
      </div>
      <div aria-hidden className="relative mt-1.5 h-1.5 rounded-full bg-surface-muted">
        <div
          className={`h-1.5 rounded-full ${over ? "bg-warn" : "bg-accent"}`}
          style={{ width: `${width}%` }}
        />
        <div className="absolute inset-y-[-3px] left-1/2 w-0.5 rounded bg-text-muted" />
      </div>
    </div>
  );
}

function TeacherList({ events, onClear }: { events: DemoEvent[]; onClear: () => void }) {
  return (
    <section aria-labelledby="teacher" className="rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 id="teacher" className="text-headline-semibold text-text">
          What your teacher would see
        </h2>
        {events.length > 0 && (
          <Button variant="plain" onClick={onClear}>
            Clear the list
          </Button>
        )}
      </div>
      {events.length === 0 ? (
        <p className="mt-2 text-body-regular text-text-muted">
          Nothing yet. Try something from the list above.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
              <span
                className={`text-body-medium ${e.severity === "high" ? "text-high" : e.severity === "warn" ? "text-warn" : "text-text-muted"}`}
              >
                {e.severity === "high" ? "High" : e.severity === "warn" ? "Warn" : "Info"}
              </span>
              <span className="text-body-regular text-text">{EVENT_LABEL[e.kind] ?? e.kind}</span>
              <span className="text-body-regular text-text-muted">
                {new Date(e.startedAt).toLocaleTimeString()}
                {duration(e)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-caption-1-regular text-text-muted">
        In a real test, a warning keeps one still picture of the moment, and your teacher confirms
        or dismisses each one. Nothing here fails a test on its own.
      </p>
    </section>
  );
}

function duration(e: DemoEvent): string {
  if (e.endedAt === null) return ", still going";
  const s = Math.round((e.endedAt - e.startedAt) / 1000);
  return s > 0 ? `, for ${s} s` : "";
}
