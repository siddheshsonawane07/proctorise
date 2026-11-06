import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { messageFrom } from "../../lib/errors";
import { formatRemaining } from "../../lib/time";
import { Button, Card, Field, Loading, Message } from "../../app/ui/form";
import { useTest } from "../builder/api";
import { EVENT_LABEL } from "../proctoring/labels";
import { MAX_LIVE_STUDENTS } from "../../lib/limits";
import { Flags } from "./Flags";
import { requestView } from "./liveView";
import type { Summary } from "./useAttemptChannel";
import { useExtend, useOverview, useSnapshots, useTerminate, useWarn, type Overview } from "./api";

const WARNINGS = [
  "Please keep your face in view of the camera.",
  "Please put your phone away.",
  "Please don't talk during the test.",
  "Please stay on the test page.",
];

/** The teacher's live view of a running test (PHASE_7 § 4–7). */
export function LiveGrid() {
  const { testId = "" } = useParams();
  const test = useTest(testId);
  const overview = useOverview(testId);
  const queryClient = useQueryClient();
  const [summaries, setSummaries] = useState<Record<string, Summary>>({});
  const [connected, setConnected] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // New flags by broadcast from the database; summaries from each student every 10 s.
  useEffect(() => {
    let refetch: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase.channel(`test:${testId}`, { config: { private: true } });
    channel
      .on("broadcast", { event: "event" }, () => {
        if (refetch) clearTimeout(refetch);
        refetch = setTimeout(() => {
          void queryClient.invalidateQueries({ queryKey: ["overview", testId] });
          void queryClient.invalidateQueries({ queryKey: ["flags"] });
        }, 500);
      })
      .on("broadcast", { event: "summary" }, ({ payload }) => {
        const s = payload as Summary;
        setSummaries((prev) => ({ ...prev, [s.attempt_id]: { ...s, at: Date.now() } }));
      })
      .subscribe((status) => {
        const ok = status === "SUBSCRIBED";
        setConnected(ok);
        // After a reconnect, catch up on whatever was missed (Phase-7-Critic #7).
        if (ok) void queryClient.invalidateQueries({ queryKey: ["overview", testId] });
      });
    return () => {
      if (refetch) clearTimeout(refetch);
      void supabase.removeChannel(channel);
    };
  }, [testId, queryClient]);

  if (overview.isPending || test.isPending) return <Loading />;
  if (overview.isError) return <Message kind="error">{messageFrom(overview.error)}</Message>;

  // Needs attention first: unreviewed high flags, then unreviewed warnings, then the rest.
  const rows = [...overview.data].sort(
    (a, b) =>
      Number(b.status === "in_progress") - Number(a.status === "in_progress") ||
      Math.min(b.unreviewed, b.high_count) - Math.min(a.unreviewed, a.high_count) ||
      b.unreviewed - a.unreviewed ||
      a.full_name.localeCompare(b.full_name),
  );
  const live = rows.filter((r) => r.status === "in_progress").length;
  const selected = rows.find((r) => r.attempt_id === open);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to={`/app/tests/${testId}/edit`} className="text-body-medium text-accent">
            ← Back to the test
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-title-1-bold tracking-tight text-text">
            Live: {test.data?.title}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-high/10 px-2.5 py-1 text-caption-1-semibold text-high">
              <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-high" />
              Live
            </span>
          </h1>
          <p className="text-body-regular text-text-muted">
            {live} taking it now · {rows.length} started
            {live > MAX_LIVE_STUDENTS * 0.8 && ` · near the free plan's ${MAX_LIVE_STUDENTS}`}
          </p>
        </div>
        <Link
          to={`/app/tests/${testId}/review`}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-body-medium text-text no-underline shadow-xs hover:bg-surface-muted"
        >
          Review flags
        </Link>
      </div>
      {!connected && (
        <p
          role="status"
          className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-body-medium text-warn"
        >
          Live updates paused, reconnecting. The list still refreshes every 15 seconds.
        </p>
      )}
      {rows.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-text-muted">
          No one has started yet.
        </p>
      )}
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => (
          <Tile
            key={r.attempt_id}
            row={r}
            summary={summaries[r.attempt_id]}
            now={now}
            onOpen={() => setOpen(r.attempt_id)}
          />
        ))}
      </ul>
      {selected && <AttemptPanel row={selected} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Tile({
  row,
  summary,
  now,
  onOpen,
}: {
  row: Overview;
  summary: Summary | undefined;
  now: number;
  onOpen: () => void;
}) {
  const fresh = summary && now - summary.at < 30_000;
  const attention = Math.min(row.unreviewed, row.high_count) > 0;
  const writing = row.status === "in_progress";
  const badge = attention
    ? { text: "Needs a look", cls: "bg-high/10 text-high" }
    : writing
      ? { text: "Writing", cls: "bg-accent/10 text-accent" }
      : { text: STATUS[row.status], cls: "bg-surface-muted text-text-muted" };
  const name = row.full_name || "Student";
  return (
    <li
      className={`space-y-3 rounded-2xl border bg-surface p-4 shadow-xs transition-shadow hover:shadow-md ${
        attention ? "border-high/60 ring-1 ring-high/30" : "border-border"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/10 text-body-semibold text-accent"
        >
          {name
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-semibold text-text">{name}</p>
          <span
            className={`mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-caption-1-medium ${badge.cls}`}
          >
            {badge.text}
          </span>
        </div>
        {writing && (
          <p className="rounded-full bg-surface-muted px-2.5 py-1 font-mono text-caption-1-semibold tabular-nums text-text">
            {formatRemaining(Date.parse(row.deadline_at) - now)}
          </p>
        )}
      </div>
      {writing && fresh && summary.total > 0 && (
        <div aria-hidden className="h-1.5 rounded-full bg-surface-muted">
          <div
            className="h-1.5 rounded-full bg-accent transition-all"
            style={{ width: `${(summary.answered / summary.total) * 100}%` }}
          />
        </div>
      )}
      {row.status === "in_progress" && (
        <p className="text-caption-1-regular text-text-muted">
          {fresh
            ? [
                `${summary.answered} of ${summary.total} answered`,
                summary.camera === false ? "camera off" : summary.camera ? "camera on" : null,
                summary.screen === "stopped" ? "screen not shared" : null,
                summary.phone === "gone"
                  ? "phone disconnected"
                  : summary.phone === "connected"
                    ? "phone on"
                    : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : "No recent signal from this computer"}
        </p>
      )}
      <p className="text-body-regular">
        <span className={row.high_count ? "font-semibold text-high" : "text-text-muted"}>
          {row.high_count} high
        </span>
        {" · "}
        <span className={row.warn_count ? "text-warn" : "text-text-muted"}>
          {row.warn_count} warn
        </span>
        {row.unreviewed > 0 && (
          <span className="text-text-muted"> · {row.unreviewed} to review</span>
        )}
      </p>
      {row.last_kind && (
        <p className="text-caption-1-regular text-text-muted">
          Latest: {EVENT_LABEL[row.last_kind] ?? row.last_kind}
        </p>
      )}
      <Button variant="plain" onClick={onOpen}>
        Open
      </Button>
    </li>
  );
}

const STATUS: Record<Overview["status"], string> = {
  in_progress: "Taking it",
  submitted: "Submitted",
  auto_submitted: "Time ran out",
  terminated: "Ended",
  voided: "Voided",
};

function AttemptPanel({ row, onClose }: { row: Overview; onClose: () => void }) {
  const [showSnapshots, setShowSnapshots] = useState(false);
  const snapshots = useSnapshots(row.attempt_id, showSnapshots);
  const warn = useWarn();
  const extend = useExtend();
  const terminate = useTerminate();
  const [ending, setEnding] = useState(false);
  const running = row.status === "in_progress";
  const error = warn.error ?? extend.error ?? terminate.error;

  function onWarn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = String(new FormData(event.currentTarget).get("message"));
    warn.mutate({ attemptId: row.attempt_id, message });
  }
  function onExtend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    extend.mutate({
      attemptId: row.attempt_id,
      minutes: Number(f.get("minutes")),
      reason: String(f.get("reason")),
    });
  }
  function onEnd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    terminate.mutate({
      attemptId: row.attempt_id,
      reason: String(new FormData(event.currentTarget).get("reason")),
    });
  }

  return (
    <Card title={row.full_name || "Student"}>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link to={`/app/attempts/${row.attempt_id}/report`} className="text-accent underline">
          Integrity report
        </Link>
        <button type="button" className="text-accent underline" onClick={onClose}>
          Close
        </button>
      </div>
      {error && <Message kind="error">{messageFrom(error)}</Message>}
      {warn.isSuccess && <Message kind="ok">Warning sent.</Message>}
      {extend.isSuccess && <Message kind="ok">Time added.</Message>}

      {running && (
        <div className="grid gap-4 md:grid-cols-2">
          <form onSubmit={onWarn} className="space-y-2">
            <label className="block">
              <span className="text-sm font-medium">Send a warning</span>
              <select
                name="message"
                className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2"
              >
                {WARNINGS.map((w) => (
                  <option key={w}>{w}</option>
                ))}
              </select>
            </label>
            <Button type="submit" variant="plain" disabled={warn.isPending}>
              Send
            </Button>
          </form>
          <form onSubmit={onExtend} className="space-y-2">
            <div className="flex gap-2">
              <label className="block">
                <span className="text-sm font-medium">Add time</span>
                <select
                  name="minutes"
                  className="mt-1 block rounded-md border border-border bg-surface px-3 py-2"
                >
                  {[5, 10, 15, 30].map((m) => (
                    <option key={m} value={m}>
                      {m} minutes
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex-1">
                <Field label="Why" name="reason" required maxLength={200} />
              </div>
            </div>
            <Button type="submit" variant="plain" disabled={extend.isPending}>
              Add time
            </Button>
          </form>
          <LiveViewer attemptId={row.attempt_id} />
          <div className="space-y-2">
            {ending ? (
              <form onSubmit={onEnd} className="space-y-2">
                <Field
                  label="Why are you ending this attempt?"
                  name="reason"
                  required
                  maxLength={300}
                />
                <p className="text-sm text-text-muted">
                  It is graded as it stands, and the student is told.
                </p>
                <div className="flex gap-2">
                  <Button type="submit" disabled={terminate.isPending}>
                    End the attempt
                  </Button>
                  <Button variant="plain" onClick={() => setEnding(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <Button variant="plain" onClick={() => setEnding(true)}>
                End this attempt…
              </Button>
            )}
          </div>
        </div>
      )}

      <h3 className="pt-2 font-medium">Flags</h3>
      <Flags attemptId={row.attempt_id} />

      <h3 className="pt-2 font-medium">Snapshots</h3>
      {!showSnapshots ? (
        <Button variant="plain" onClick={() => setShowSnapshots(true)}>
          Show the latest snapshots
        </Button>
      ) : snapshots.isPending ? (
        <Loading />
      ) : (
        <ul className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {snapshots.data?.map((s) => (
            <li key={s.path}>
              {s.url && (
                <img
                  src={s.url}
                  alt={`${s.device} ${s.source}, ${s.reason}`}
                  className="aspect-video w-full rounded object-cover"
                />
              )}
              <p className="text-xs text-text-muted">
                {s.device === "phone" ? "Phone" : s.source === "screen" ? "Screen" : "Laptop"} ·{" "}
                {new Date(s.created_at).toLocaleTimeString()}
              </p>
            </li>
          ))}
          {snapshots.data?.length === 0 && <p className="text-sm text-text-muted">None yet.</p>}
        </ul>
      )}
    </Card>
  );
}

/** Two minutes of the student's camera, on request; they see that it is on (Phase-7-Critic #5). */
function LiveViewer({ attemptId }: { attemptId: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"off" | "connecting" | "on">("off");
  const stop = useRef<(() => void) | null>(null);
  const channel = useRef<RealtimeChannel | null>(null);

  useEffect(
    () => () => {
      stop.current?.();
      if (channel.current) void supabase.removeChannel(channel.current);
    },
    [],
  );

  async function start() {
    setState("connecting");
    const ch = supabase.channel(`attempt:${attemptId}`, { config: { private: true } });
    channel.current = ch;
    await new Promise<void>((resolve) => ch.subscribe((s) => s === "SUBSCRIBED" && resolve()));
    stop.current = await requestView(
      ch,
      (stream) => {
        if (video.current) {
          video.current.srcObject = stream;
          void video.current.play().catch(() => {});
        }
        setState("on");
      },
      () => {
        setState("off");
        void supabase.removeChannel(ch);
        channel.current = null;
      },
    );
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">Camera</span>
      <video
        ref={video}
        muted
        playsInline
        aria-label="The student's camera"
        className={`w-full rounded-lg bg-surface-muted ${state === "off" ? "hidden" : ""}`}
      />
      {state === "off" ? (
        <Button variant="plain" onClick={() => void start()}>
          View camera for 2 minutes
        </Button>
      ) : (
        <Button variant="plain" onClick={() => stop.current?.()}>
          {state === "connecting" ? "Connecting… (cancel)" : "Stop viewing"}
        </Button>
      )}
      <p className="text-xs text-text-muted">
        The student sees that you are viewing. Nothing is recorded.
      </p>
    </div>
  );
}
