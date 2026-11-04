import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button, Card, Loading, Message } from "../../app/ui/form";
import { Markdown } from "../../app/ui/Markdown";
import { Notice } from "../../app/ui/Notice";
import { messageFrom } from "../../lib/errors";
import type { Json } from "../../lib/database.types";
import { formatRemaining, formatWhen } from "../../lib/time";
import { useTest } from "../builder/api";
import { QuestionView } from "../questions/QuestionView";
import {
  saveAnswer,
  useMyAttempts,
  useStartAttempt,
  useSubmitAttempt,
  type AttemptPayload,
} from "./api";
import { SaveQueue, type SaveState } from "./saveQueue";

export function TakeTest() {
  const { testId = "" } = useParams();
  const test = useTest(testId);
  const attempts = useMyAttempts();
  const start = useStartAttempt();
  const [payload, setPayload] = useState<AttemptPayload | null>(null);
  const clock = useClock(30_000);

  if (payload) return <TestScreen payload={payload} />;
  if (test.isPending || attempts.isPending) return <Loading />;
  if (!test.data || test.data.status === "draft") {
    return <Notice title="Test not found">It doesn't exist, or it isn't open to you.</Notice>;
  }

  const t = test.data;
  const mine = (attempts.data ?? []).filter((a) => a.test_id === testId);
  const open = mine.find((a) => a.status === "in_progress");
  const now = clock;
  const windowOpen = now >= Date.parse(t.opens_at) && now < Date.parse(t.closes_at);
  const left = t.max_attempts - mine.length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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
              ? `You can take it ${left === 1 ? "once more" : `${left} more times`}.`
              : `Attempts used: ${mine.length} of ${t.max_attempts}.`}
          </li>
        </ul>
      </Card>
      {start.isError && <Message kind="error">{messageFrom(start.error)}</Message>}
      {open ? (
        <Button
          onClick={() => start.mutate(testId, { onSuccess: setPayload })}
          disabled={start.isPending}
        >
          Continue the test
        </Button>
      ) : !windowOpen ? (
        <Message kind="error">
          {now < Date.parse(t.opens_at)
            ? `This test opens ${formatWhen(t.opens_at)}.`
            : "This test has closed."}
        </Message>
      ) : left <= 0 ? (
        <Message kind="ok">You've used all your attempts.</Message>
      ) : (
        <Button
          onClick={() => start.mutate(testId, { onSuccess: setPayload })}
          disabled={start.isPending}
        >
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

const SAVE_TEXT: Record<SaveState["kind"], string> = {
  saved: "All answers saved",
  saving: "Saving…",
  offline: "Saved on this computer; will send when you're back online",
  refused: "An answer couldn't be saved",
};

function TestScreen({ payload }: { payload: AttemptPayload }) {
  const navigate = useNavigate();
  const submit = useSubmitAttempt();
  const [answers, setAnswers] = useState<Record<string, Json>>(payload.answers);
  const [index, setIndex] = useState(0);
  const [save, setSave] = useState<SaveState>({ kind: "saved" });
  const [confirming, setConfirming] = useState(false);
  const [flagged, setFlagged] = useState<Set<string>>(() => loadFlags(payload.attempt_id));
  // Server time minus local time, so the countdown follows the server's clock (Phase-4-Critic #1).
  // Measured at start and again after every save.
  const [offset, setOffset] = useState(() => Date.parse(payload.server_now) - Date.now());
  const remaining = Date.parse(payload.deadline_at) - (useClock(1000) + offset);

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

  const finish = useCallback(async () => {
    await queue.flush();
    submit.mutate(payload.attempt_id, {
      onSuccess: () => navigate(`/app/results/${payload.attempt_id}`, { replace: true }),
    });
  }, [queue, submit, payload.attempt_id, navigate]);

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
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface py-3">
        <h1 className="text-lg font-semibold">{payload.title}</h1>
        <p role="status" aria-live="polite" className="text-sm text-text-muted">
          {SAVE_TEXT[save.kind]}
        </p>
        <p
          className={`font-mono text-lg ${remaining < 60_000 ? "text-high" : ""}`}
          aria-label={`Time left: ${formatRemaining(remaining)}`}
        >
          {formatRemaining(remaining)}
        </p>
      </div>
      {save.kind === "refused" && <Message kind="error">{save.message}</Message>}

      <nav aria-label="Questions" className="flex flex-wrap gap-2">
        {items.map((it, i) => (
          <button
            key={it.id}
            type="button"
            onClick={() => go(i)}
            aria-current={i === index ? "step" : undefined}
            aria-label={`Question ${i + 1}${isBlank(answers[it.id]) ? ", not answered" : ", answered"}${
              flagged.has(it.id) ? ", marked for review" : ""
            }`}
            className={`h-9 w-9 rounded-md border text-sm ${
              i === index
                ? "border-accent bg-accent text-accent-text"
                : isBlank(answers[it.id])
                  ? "border-border"
                  : "border-accent text-accent"
            } ${flagged.has(it.id) ? "ring-2 ring-warn" : ""}`}
          >
            {i + 1}
          </button>
        ))}
      </nav>

      <section className="rounded-lg border border-border p-5">
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
      {submit.isError && <Message kind="error">{messageFrom(submit.error)}</Message>}
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
