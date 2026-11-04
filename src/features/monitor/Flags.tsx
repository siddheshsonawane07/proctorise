import { Button, Loading, Message } from "../../app/ui/form";
import { messageFrom } from "../../lib/errors";
import { EVENT_LABEL } from "../proctoring/labels";
import { useDismissKind, useFlags, useReview } from "./api";

/**
 * An attempt's flags, each with its evidence, to dismiss or confirm one at a time. The only bulk
 * action dismisses (Phase-7-Critic #4).
 */
export function Flags({ attemptId }: { attemptId: string }) {
  const flags = useFlags(attemptId);
  const review = useReview();
  const dismissKind = useDismissKind();

  if (flags.isPending) return <Loading />;
  if (flags.isError) return <Message kind="error">{messageFrom(flags.error)}</Message>;
  if (flags.data.length === 0)
    return <p className="text-sm text-text-muted">Nothing was flagged.</p>;

  const kinds = [...new Set(flags.data.filter((f) => f.verdict === null).map((f) => f.kind))];
  return (
    <div className="space-y-3">
      {(review.isError || dismissKind.isError) && (
        <Message kind="error">{messageFrom(review.error ?? dismissKind.error)}</Message>
      )}
      <ul className="space-y-3">
        {flags.data.map((f) => {
          const seconds = f.ended_at
            ? Math.round((Date.parse(f.ended_at) - Date.parse(f.started_at)) / 1000)
            : null;
          return (
            <li
              key={f.id}
              className="flex flex-wrap gap-3 rounded-md border border-border p-3 text-sm"
            >
              {f.url ? (
                <a href={f.url} target="_blank" rel="noreferrer">
                  <img
                    src={f.url}
                    alt={`Snapshot: ${EVENT_LABEL[f.kind] ?? f.kind}`}
                    className="h-24 w-32 rounded object-cover"
                  />
                </a>
              ) : (
                <div className="flex h-24 w-32 items-center justify-center rounded bg-surface-muted text-xs text-text-muted">
                  No snapshot
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <p>
                  <span
                    className={`font-medium ${f.severity === "high" ? "text-high" : "text-warn"}`}
                  >
                    {f.severity === "high" ? "High" : "Warn"}
                  </span>{" "}
                  {EVENT_LABEL[f.kind] ?? f.kind}
                  {f.device === "phone" && <span className="text-text-muted"> (phone)</span>}
                </p>
                <p className="text-text-muted">
                  {new Date(f.started_at).toLocaleTimeString()}
                  {seconds !== null && seconds > 0 && `, for ${seconds} s`}
                </p>
                {f.verdict ? (
                  <p>
                    {f.verdict === "confirmed" ? "Confirmed" : "Dismissed"}
                    {f.note && <span className="text-text-muted">: {f.note}</span>}
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="plain"
                      disabled={review.isPending}
                      onClick={() => review.mutate({ eventId: f.id, verdict: "dismissed" })}
                    >
                      Dismiss
                    </Button>
                    <Button
                      variant="plain"
                      disabled={review.isPending}
                      onClick={() => review.mutate({ eventId: f.id, verdict: "confirmed" })}
                    >
                      Confirm
                    </Button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {kinds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-text-muted">Dismiss every open flag of one kind:</span>
          {kinds.map((kind) => (
            <Button
              key={kind}
              variant="plain"
              disabled={dismissKind.isPending}
              onClick={() => dismissKind.mutate({ attemptId, kind })}
            >
              {EVENT_LABEL[kind] ?? kind}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
