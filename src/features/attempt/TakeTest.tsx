import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button, Card, Loading, Message } from "../../app/ui/form";
import { Markdown } from "../../app/ui/Markdown";
import { Notice } from "../../app/ui/Notice";
import { messageFrom } from "../../lib/errors";
import type { Json } from "../../lib/database.types";
import { formatRemaining, formatWhen } from "../../lib/time";
import { useTest } from "../builder/api";
import { needsCamera, speaksWarnings, type Proctoring } from "../builder/proctoring";
import { startInstructions, voice } from "../proctoring/voice";
import { QuestionView } from "../questions/QuestionView";
import { SystemCheck, type CheckedDevices } from "../proctoring/SystemCheck";
import { IdentityGate, type IdentityResult } from "../proctoring/IdentityGate";
import { ProctorSession, type SessionStatus } from "../proctoring/session";
import { CONSENT_VERSION } from "../proctoring/identity";
import { PhonePairing } from "../pairing/PhonePairing";
import { useAttemptChannel } from "../monitor/useAttemptChannel";
import {
  recordConsent,
  saveAnswer,
  useMyAttempts,
  useStartAttempt,
  useSubmitAttempt,
  type AttemptPayload,
} from "./api";
import { SaveQueue, type SaveState } from "./saveQueue";

type ProctorDevices = CheckedDevices & { identity: IdentityResult | null };

export function TakeTest() {
  const { testId = "" } = useParams();
  const test = useTest(testId);
  const attempts = useMyAttempts();
  const start = useStartAttempt();
  const [payload, setPayload] = useState<AttemptPayload | null>(null);
  const [devices, setDevices] = useState<CheckedDevices | null>(null);
  const [handOver, setHandOver] = useState(false);
  const [consented, setConsented] = useState(false);
  const [identity, setIdentity] = useState<IdentityResult | null>(null);
  const clock = useClock(30_000);
  const onDevices = useCallback((d: CheckedDevices | null) => setDevices(d), []);

  if (payload) {
    const p = payload.proctoring;
    if (devices?.camera && p.identity_check && !identity) {
      return <IdentityGate camera={devices.camera} onDone={setIdentity} />;
    }
    return <TestScreen payload={payload} proctor={devices ? { ...devices, identity } : null} />;
  }
  if (test.isPending || attempts.isPending) return <Loading />;
  if (!test.data || test.data.status === "draft") {
    return <Notice title="Test not found">It doesn't exist, or it isn't open to you.</Notice>;
  }

  const t = test.data;
  const settings = t.proctoring as Proctoring;
  const mine = (attempts.data ?? []).filter((a) => a.test_id === testId);
  const open = mine.find((a) => a.status === "in_progress");
  const windowOpen = clock >= Date.parse(t.opens_at) && clock < Date.parse(t.closes_at);
  const left = t.max_attempts - mine.length;
  // Every test is watched at least in the browser; light just has no camera checks.
  const needsChecks = true;
  const canGo = !needsChecks || (devices !== null && consented);
  const willStart = !!open || (windowOpen && left > 0);

  function begin() {
    // Speech is allowed only after a tap, so it is unlocked here (Phase-9-Critic #8).
    if (speaksWarnings(settings)) voice.unlock();
    if (needsChecks) {
      // Full screen must be asked for inside the click itself.
      void document.documentElement.requestFullscreen?.().catch(() => {});
      setHandOver(true);
    }
    start.mutate(testId, {
      onSuccess: async (p) => {
        if (needsChecks) await recordConsent(p.attempt_id, CONSENT_VERSION).catch(() => {});
        if (speaksWarnings(p.proctoring)) {
          voice.say(startInstructions(t.duration_min, needsCamera(p.proctoring)));
        }
        setPayload(p);
      },
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      {t.instructions && <Markdown>{t.instructions}</Markdown>}
      <Card title="Before you start">
        <ul className="list-disc space-y-1 pl-5 text-text-muted">
          <li>
            You have {t.duration_min} minutes once you start. The clock keeps running if you close
            the page.
          </li>
          <li>Your answers save as you go. If the connection drops, they wait and send later.</li>
          <li>
            The test closes {formatWhen(t.closes_at)}. Anything open then is submitted for you.
          </li>
          <li>
            {left > 0 && !open
              ? `You can take it ${left === 1 ? "once" : `${left} times`}.`
              : `Attempts used: ${mine.length} of ${t.max_attempts}.`}
          </li>
        </ul>
      </Card>

      {needsChecks && willStart && (
        <>
          <SystemCheck
            testId={testId}
            proctoring={settings}
            onChange={onDevices}
            handOver={handOver}
          />
          <Card title="What is checked">
            <ul className="list-disc space-y-1 pl-5 text-sm text-text-muted">
              {settings.preset !== "light" && (
                <li>
                  Your camera and microphone are checked for a missing face, another person, a phone
                  or notes, and talking. Nothing is recorded but a still picture at those moments,
                  and one every {interval(settings.snapshot_interval_s)}. No sound is recorded.
                </li>
              )}
              {settings.identity_check && <li>Your face is compared with your photo.</li>}
              {settings.screen_share_required && <li>A still of your screen at those moments.</li>}
              <li>Leaving the test page or full screen is recorded.</li>
              <li>
                Your teacher reviews every flag. The software never fails or ends your test on its
                own. Pictures are deleted after {t.retention_days} days.
              </li>
            </ul>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
              />
              I understand and agree
            </label>
          </Card>
        </>
      )}

      {start.isError && <Message kind="error">{messageFrom(start.error)}</Message>}
      {open ? (
        <Button onClick={begin} disabled={start.isPending || !canGo}>
          Continue the test
        </Button>
      ) : !windowOpen ? (
        <Message kind="error">
          {clock < Date.parse(t.opens_at)
            ? `This test opens ${formatWhen(t.opens_at)}.`
            : "This test has closed."}
        </Message>
      ) : left <= 0 ? (
        <Message kind="ok">You've used all your attempts.</Message>
      ) : (
        <Button onClick={begin} disabled={start.isPending || !canGo}>
          {start.isPending ? "Starting…" : "Start the test"}
        </Button>
      )}
      {mine
        .filter((a) => a.status !== "in_progress")
        .map((a) => (
          <p key={a.id}>
            <Link to={`/app/results/${a.id}`} className="text-accent underline">
              Attempt {a.attempt_no}: see the result
            </Link>
          </p>
        ))}
    </div>
  );
}

function interval(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  return seconds === 60 ? "minute" : `${seconds / 60} minutes`;
}

const SAVE_TEXT: Record<SaveState["kind"], string> = {
  saved: "All answers saved",
  saving: "Saving…",
  offline: "Saved on this computer; will send when you're back online",
  refused: "An answer couldn't be saved",
};

function TestScreen({
  payload,
  proctor,
}: {
  payload: AttemptPayload;
  proctor: ProctorDevices | null;
}) {
  const navigate = useNavigate();
  const submit = useSubmitAttempt();
  const [answers, setAnswers] = useState<Record<string, Json>>(payload.answers);
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  const [index, setIndex] = useState(0);
  const [save, setSave] = useState<SaveState>({ kind: "saved" });
  const [confirming, setConfirming] = useState(false);
  const [flagged, setFlagged] = useState<Set<string>>(() => loadFlags(payload.attempt_id));
  // Server time minus local time, so the countdown follows the server's clock (Phase-4-Critic #1).
  // Measured at start and again after every save.
  const [offset, setOffset] = useState(() => Date.parse(payload.server_now) - Date.now());
  // The teacher can move it (extra time), so it is state, refreshed from the server.
  const [deadline, setDeadline] = useState(() => Date.parse(payload.deadline_at));
  const [teacherMessage, setTeacherMessage] = useState<string | null>(null);
  const remaining = deadline - (useClock(1000) + offset);
  // Set below, once `finish` exists: a teacher's automatic rule may end the attempt (D7).
  const autoSubmit = useRef<() => void>(() => {});
  const proctoring = useProctorSession(payload, proctor, offset, () => autoSubmit.current());

  // One queue for the life of this attempt's screen.
  const [queue] = useState(
    () =>
      new SaveQueue(
        payload.attempt_id,
        (itemId, response) => saveAnswer(payload.attempt_id, itemId, response),
        setSave,
        (iso) => setOffset(Date.parse(iso) - Date.now()),
      ),
  );

  // Answers still waiting from before a reload: show them, and send them.
  useEffect(() => {
    if (queue.size > 0) void queue.flush();
    const retry = () => void queue.flush();
    window.addEventListener("online", retry);
    const timer = setInterval(retry, 15_000);
    return () => {
      window.removeEventListener("online", retry);
      clearInterval(timer);
    };
  }, [queue]);

  const { stop } = proctoring;
  const finish = useCallback(async () => {
    await queue.flush();
    await stop();
    submit.mutate(payload.attempt_id, {
      onSuccess: () => navigate(`/app/results/${payload.attempt_id}`, { replace: true }),
    });
  }, [queue, stop, submit, payload.attempt_id, navigate]);

  useEffect(() => {
    autoSubmit.current = () => void finish();
  }, [finish]);

  const live = useAttemptChannel({
    attemptId: payload.attempt_id,
    testId: payload.test_id,
    camera: proctor?.camera ?? null,
    summary: () => ({
      attempt_id: payload.attempt_id,
      answered: payload.items.filter((i) => !isBlank(answersRef.current[i.id])).length,
      total: payload.items.length,
      camera: proctoring.value?.camera ?? null,
      screen: proctoring.value?.screen ?? null,
      phone: proctoring.value?.phone ?? null,
    }),
    onWarning: setTeacherMessage,
    onDeadline: (iso) => setDeadline(Date.parse(iso)),
    onEnded: () => {
      void proctoring.stop();
      navigate(`/app/results/${payload.attempt_id}`, { replace: true });
    },
  });

  const timeUp = remaining <= 0;
  const finishedOnce = useRef(false);
  useEffect(() => {
    if (timeUp && !finishedOnce.current) {
      finishedOnce.current = true;
      void finish();
    }
  }, [timeUp, finish]);

  function answer(itemId: string, value: Json) {
    setAnswers((prev) => ({ ...prev, [itemId]: value }));
    queue.enqueue(itemId, value);
  }

  function go(to: number) {
    void queue.flush();
    setIndex(to);
  }

  function toggleFlag(itemId: string) {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      saveFlags(payload.attempt_id, next);
      return next;
    });
  }

  const items = payload.items;
  const item = items[index]!;
  const unanswered = items.filter((i) => isBlank(answers[i.id])).length;
  const status = proctoring.value;

  if (timeUp) {
    return (
      <Notice title="Time is up">
        {submit.isError
          ? "We couldn't reach the server. Your saved answers count, and the test will be submitted for you."
          : "Submitting your answers…"}
      </Notice>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 px-4 py-3 shadow-xs backdrop-blur">
        <h1 className="text-headline-semibold text-text">{payload.title}</h1>
        <p role="status" aria-live="polite" className="text-caption-1-regular text-text-muted">
          {SAVE_TEXT[save.kind]}
          {status && ` · ${statusText(status)}`}
        </p>
        <p
          className={`rounded-full px-3 py-1 font-mono text-headline-semibold tabular-nums ${
            remaining < 60_000 ? "bg-high/10 text-high" : "bg-surface-muted text-text"
          }`}
          aria-label={`Time left: ${formatRemaining(remaining)}`}
        >
          {formatRemaining(remaining)}
        </p>
      </div>
      {save.kind === "refused" && <Message kind="error">{save.message}</Message>}
      {live.viewing && (
        <p role="status" className="rounded-md border border-info p-3 text-sm">
          Your teacher is viewing your camera right now.
        </p>
      )}
      {teacherMessage && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="teacher-message"
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface/95 p-6"
        >
          <div className="max-w-md space-y-4 text-center">
            <h2 id="teacher-message" className="text-xl font-semibold">
              A message from your teacher
            </h2>
            <p>{teacherMessage}</p>
            <Button onClick={() => setTeacherMessage(null)}>I understand</Button>
          </div>
        </div>
      )}
      {status?.warnings[0] && (
        <p
          role="alert"
          className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-body-medium text-warn"
        >
          {status.warnings[0].text}
        </p>
      )}
      {status?.phone === "gone" && (
        <section role="alert" className="space-y-3 rounded-md border border-warn p-4">
          <p className="font-medium">
            Your phone camera disconnected. Open the page on your phone again, or connect it anew.
            Keep answering meanwhile.
          </p>
          <PhonePairing testId={payload.test_id} onReady={proctoring.switchPairing} />
        </section>
      )}
      {status && !status.fullscreen && (
        <Cover
          title="Return to full screen"
          text="The test runs in full screen. Leaving it was recorded."
          action="Return to full screen"
          onAction={() => void document.documentElement.requestFullscreen?.().catch(() => {})}
        />
      )}
      {status?.screen === "stopped" && (
        <Cover
          title="Screen sharing stopped"
          text="This test needs your whole screen shared. That it stopped was recorded."
          action="Share my screen again"
          onAction={() => void proctoring.reshare()}
        />
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
            <QuestionView
              item={item}
              number={index + 1}
              value={answers[item.id]}
              onChange={(value) => answer(item.id, value)}
            />
            <label className="mt-4 flex items-center gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                checked={flagged.has(item.id)}
                onChange={() => toggleFlag(item.id)}
              />
              Mark to come back to
            </label>
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="plain" disabled={index === 0} onClick={() => go(index - 1)}>
              Previous
            </Button>
            {index < items.length - 1 && <Button onClick={() => go(index + 1)}>Next</Button>}
            <span className="flex-1" />
            {confirming ? (
              <>
                <span className="text-sm">
                  {unanswered > 0
                    ? `${unanswered} ${unanswered === 1 ? "question is" : "questions are"} not answered. Submit anyway?`
                    : "Submit your answers? You can't change them afterwards."}
                </span>
                <Button onClick={() => void finish()} disabled={submit.isPending}>
                  Yes, submit
                </Button>
                <Button variant="plain" onClick={() => setConfirming(false)}>
                  Keep going
                </Button>
              </>
            ) : (
              <Button variant="plain" onClick={() => setConfirming(true)}>
                Submit the test
              </Button>
            )}
          </div>
        </div>
        <aside className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-xs lg:sticky lg:top-24">
          <div>
            <p className="text-caption-1-semibold text-text-muted">
              {items.filter((it) => !isBlank(answers[it.id])).length} of {items.length} answered
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-surface-muted">
              <div
                className="h-1.5 rounded-full bg-accent transition-all"
                style={{
                  width: `${(items.filter((it) => !isBlank(answers[it.id])).length / items.length) * 100}%`,
                }}
              />
            </div>
          </div>
          <nav aria-label="Questions" className="grid grid-cols-5 gap-2">
            {items.map((it, i) => (
              <button
                key={it.id}
                type="button"
                onClick={() => go(i)}
                aria-current={i === index ? "step" : undefined}
                aria-label={`Question ${i + 1}${isBlank(answers[it.id]) ? ", not answered" : ", answered"}${
                  flagged.has(it.id) ? ", marked for review" : ""
                }`}
                className={`h-10 rounded-lg border text-body-medium transition-colors ${
                  i === index
                    ? "border-accent bg-accent text-accent-text"
                    : isBlank(answers[it.id])
                      ? "border-border hover:bg-surface-muted"
                      : "border-accent/40 bg-accent/10 text-accent"
                } ${flagged.has(it.id) ? "ring-2 ring-warn ring-offset-1" : ""}`}
              >
                {i + 1}
              </button>
            ))}
          </nav>
          <ul className="space-y-1 text-caption-1-regular text-text-muted">
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-3 rounded border border-accent/40 bg-accent/10" />
              Answered
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-3 rounded border border-border" />
              Not answered
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-3 rounded border border-border ring-2 ring-warn" />
              Marked to come back to
            </li>
          </ul>
        </aside>
      </div>
      {submit.isError && <Message kind="error">{messageFrom(submit.error)}</Message>}
    </div>
  );
}

function statusText(status: SessionStatus): string {
  return [
    status.camera ? "Camera on" : "Camera off",
    status.phone === "connected"
      ? "Phone connected"
      : status.phone === "gone"
        ? "Phone disconnected"
        : null,
    status.screen === "shared"
      ? "Screen shared"
      : status.screen === "stopped"
        ? "Screen not shared"
        : null,
    status.engine === "loading"
      ? "Starting checks"
      : status.engine === "unavailable"
        ? "Camera checks unavailable"
        : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Runs the proctoring session for the life of the test screen. The stop is deferred a tick so
 * React's development double-mount doesn't end the session it has just started.
 */
function useProctorSession(
  payload: AttemptPayload,
  proctor: ProctorDevices | null,
  offset: number,
  onAutoSubmit: () => void,
) {
  const [value, setValue] = useState<SessionStatus | null>(null);
  const [session] = useState(() =>
    proctor
      ? new ProctorSession({
          attemptId: payload.attempt_id,
          proctoring: payload.proctoring,
          camera: proctor.camera,
          screen: proctor.screen,
          offsetMs: offset,
          reference: proctor.identity?.reference ?? null,
          pairingId: proctor.pairingId,
          onStatus: setValue,
          onAutoSubmit,
        })
      : null,
  );
  const [identity] = useState(proctor?.identity ?? null);
  const started = useRef(false);
  const pendingStop = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!session) return;
    if (pendingStop.current) clearTimeout(pendingStop.current);
    if (!started.current) {
      started.current = true;
      void session.start().then(() => {
        if (identity) session.recordIdentity(identity.passed, identity.score);
      });
    }
    return () => {
      pendingStop.current = setTimeout(() => void session.stop(), 0);
    };
  }, [session, identity]);

  const stop = useCallback(async () => {
    await session?.stop();
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
  }, [session]);

  const switchPairing = useCallback((id: string) => session?.switchPairing(id), [session]);

  return {
    value,
    stop,
    switchPairing,
    reshare: async () => {
      const s = await navigator.mediaDevices
        .getDisplayMedia({ video: { displaySurface: "monitor" } as MediaTrackConstraints })
        .catch(() => null);
      if (s) session?.replaceScreen(s);
    },
  };
}

function Cover({
  title,
  text,
  action,
  onAction,
}: {
  title: string;
  text: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cover-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface p-6"
    >
      <div className="max-w-md space-y-4 text-center">
        <h2 id="cover-title" className="text-xl font-semibold">
          {title}
        </h2>
        <p className="text-text-muted">{text}</p>
        <Button onClick={onAction}>{action}</Button>
      </div>
    </div>
  );
}

/** The local clock, ticking every `ms`. */
function useClock(ms: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
}

function isBlank(value: Json | undefined): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function loadFlags(attemptId: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(`proctorise.flags.${attemptId}`) ?? "[]"));
  } catch {
    return new Set();
  }
}

function saveFlags(attemptId: string, flags: Set<string>) {
  try {
    localStorage.setItem(`proctorise.flags.${attemptId}`, JSON.stringify([...flags]));
  } catch {
    // Not saving a reminder flag is harmless.
  }
}
