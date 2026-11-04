import { useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { messageFrom } from "../../lib/errors";
import { formatWhen } from "../../lib/time";
import type { Database, Json } from "../../lib/database.types";
import { Button, Card, Loading, Message } from "../../app/ui/form";
import { Markdown } from "../../app/ui/Markdown";
import { unwrap } from "../classes/api";
import { useTest } from "../builder/api";
import { describeAnswer } from "../questions/describe";
import type { ResultItem } from "../attempt/api";
import { ProctorEvents } from "./ProctorEvents";

type Row = Database["public"]["Functions"]["test_results"]["Returns"][number];

const INTEGRITY: Record<Row["integrity"], string> = {
  clean: "No flags",
  flagged: "Flagged, not judged",
  reviewed_ok: "Judged fine",
  reviewed_violation: "Judged a violation",
};

const STATUS: Record<Row["status"], string> = {
  in_progress: "Taking it now",
  submitted: "Submitted",
  auto_submitted: "Submitted when time ran out",
  terminated: "Ended by a teacher",
  voided: "Voided",
};

export function Results() {
  const { testId = "" } = useParams();
  const test = useTest(testId);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const results = useQuery({
    queryKey: ["results", testId],
    queryFn: async () => unwrap(await supabase.rpc("test_results", { p_test_id: testId })),
  });
  const release = useMutation({
    mutationFn: async () => unwrap(await supabase.rpc("release_results", { p_test_id: testId })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["test", testId] }),
  });

  if (test.isPending || results.isPending) return <Loading />;
  if (results.isError) return <Message kind="error">{messageFrom(results.error)}</Message>;
  const t = test.data;
  const rows = results.data;
  const toMark = rows.reduce((sum, r) => sum + r.to_mark, 0);

  function downloadCsv() {
    const lines = [
      ["Name", "Email", "Attempt", "Status", "Started", "Submitted", "Score", "Out of"],
    ];
    for (const r of rows) {
      lines.push([
        r.full_name,
        r.email,
        String(r.attempt_no),
        STATUS[r.status],
        r.started_at,
        r.submitted_at ?? "",
        r.score === null ? "" : String(r.score),
        r.max_score === null ? "" : String(r.max_score),
        INTEGRITY[r.integrity],
      ]);
    }
    const csv = lines.map((l) => l.map((v) => `"${v.replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `${t?.title ?? "results"}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/app/tests/${testId}/edit`} className="text-sm text-accent underline">
          Back to the test
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Results: {t?.title}</h1>
      </div>
      <Card title="Releasing results">
        {t?.results_release === "manual" && !t.results_released_at && (
          <>
            <p className="text-text-muted">
              Students can't see their scores until you release them.
              {toMark > 0 && ` ${toMark} ${toMark === 1 ? "answer" : "answers"} still to mark.`}
            </p>
            {release.isError && <Message kind="error">{messageFrom(release.error)}</Message>}
            <Button onClick={() => release.mutate()} disabled={release.isPending}>
              Release results to students
            </Button>
          </>
        )}
        {t?.results_released_at && (
          <p className="text-text-muted">Released {formatWhen(t.results_released_at)}.</p>
        )}
        {t?.results_release === "immediate" && (
          <p className="text-text-muted">Each student sees their score as soon as they submit.</p>
        )}
        {t?.results_release === "after_close" && !t.results_released_at && (
          <p className="text-text-muted">Students see their scores once the test closes.</p>
        )}
      </Card>
      {rows.length === 0 ? (
        <p className="text-text-muted">No one has started this test yet.</p>
      ) : (
        <>
          <Button variant="plain" onClick={downloadCsv}>
            Download as CSV
          </Button>
          <table className="w-full text-left text-sm">
            <thead className="text-text-muted">
              <tr>
                <th className="py-2 font-medium">Student</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Score</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.attempt_id}>
                  <td className="py-2">
                    {r.full_name || r.email}
                    {r.attempt_no > 1 && (
                      <span className="text-text-muted"> (attempt {r.attempt_no})</span>
                    )}
                  </td>
                  <td className="py-2">{STATUS[r.status]}</td>
                  <td className="py-2">
                    {r.score === null ? "—" : `${Number(r.score)} / ${Number(r.max_score)}`}
                    {r.to_mark > 0 && <span className="text-warn"> · {r.to_mark} to mark</span>}
                  </td>
                  <td className="py-2 text-right">
                    {r.status !== "in_progress" && (
                      <Button
                        variant="plain"
                        onClick={() => setOpen(open === r.attempt_id ? null : r.attempt_id)}
                      >
                        {open === r.attempt_id ? "Close" : "Answers"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {open && (
            <>
              <Card title="Proctoring">
                <ProctorEvents attemptId={open} />
              </Card>
              <AttemptAnswers attemptId={open} testId={testId} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function AttemptAnswers({ attemptId, testId }: { attemptId: string; testId: string }) {
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: ["attempt-detail", attemptId],
    queryFn: async () =>
      unwrap(await supabase.rpc("attempt_detail", { p_attempt_id: attemptId })) as unknown as {
        items: ResultItem[];
      },
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["attempt-detail"] });
    await queryClient.invalidateQueries({ queryKey: ["results", testId] });
  };
  const mark = useMutation({
    mutationFn: async (args: { itemId: string; points: number }) =>
      unwrap(
        await supabase.rpc("mark_answer", {
          p_attempt_id: attemptId,
          p_item_id: args.itemId,
          p_points: args.points,
        }),
      ),
    onSuccess: refresh,
  });

  if (detail.isPending) return <Loading />;
  if (detail.isError) return <Message kind="error">{messageFrom(detail.error)}</Message>;

  return (
    <Card title="Answers">
      {mark.isError && <Message kind="error">{messageFrom(mark.error)}</Message>}
      <ol className="space-y-4">
        {detail.data.items.map((item, i) => (
          <li key={item.id} className="border-b border-border pb-4 last:border-0">
            <p className="text-sm text-text-muted">
              Question {i + 1} ·{" "}
              {item.points_awarded === null
                ? "to mark"
                : `${Number(item.points_awarded)} of ${Number(item.points)} points`}
              {item.marked_by_hand && " (marked by hand)"}
            </p>
            <Markdown>{item.prompt}</Markdown>
            <p className="mt-1 text-sm">Answer: {describeAnswer(item, item.response)}</p>
            <p className="text-sm text-text-muted">Key: {describeAnswer(item, item.correct)}</p>
            {item.type === "short_text" && (
              <MarkInput
                max={Number(item.points)}
                current={item.points_awarded}
                busy={mark.isPending}
                onMark={(points) => mark.mutate({ itemId: item.id, points })}
              />
            )}
            {item.type !== "short_text" && (
              <FixKey itemId={item.id} item={item} onFixed={refresh} />
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function MarkInput({
  max,
  current,
  busy,
  onMark,
}: {
  max: number;
  current: number | null;
  busy: boolean;
  onMark: (points: number) => void;
}) {
  const [value, setValue] = useState(current === null ? "" : String(current));
  return (
    <div className="mt-2 flex items-center gap-2 text-sm">
      <label className="flex items-center gap-2">
        Points
        <input
          type="number"
          min="0"
          max={max}
          step="0.25"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-20 rounded border border-border bg-surface px-2 py-1"
        />
        of {max}
      </label>
      <Button variant="plain" disabled={busy || value === ""} onClick={() => onMark(Number(value))}>
        Save mark
      </Button>
    </div>
  );
}

/** For a key that turns out wrong: changing it regrades every finished attempt. */
function FixKey({
  itemId,
  item,
  onFixed,
}: {
  itemId: string;
  item: ResultItem;
  onFixed: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<Json>(item.correct);
  const fix = useMutation({
    mutationFn: async () =>
      unwrap(await supabase.rpc("fix_item_key", { p_item_id: itemId, p_correct: value })),
    onSuccess: async () => {
      setEditing(false);
      await onFixed();
    },
  });
  if (!editing) {
    return (
      <Button variant="plain" className="mt-2" onClick={() => setEditing(true)}>
        Fix the key
      </Button>
    );
  }
  return (
    <div className="mt-2 space-y-2 rounded-md bg-surface-muted p-3 text-sm">
      <p>The right answer is:</p>
      {item.type === "single" &&
        item.options.map((o) => (
          <label key={o.id} className="flex items-center gap-2">
            <input type="radio" checked={value === o.id} onChange={() => setValue(o.id)} />
            {o.text}
          </label>
        ))}
      {item.type === "multiple" &&
        item.options.map((o) => {
          const chosen = Array.isArray(value) ? (value as string[]) : [];
          return (
            <label key={o.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={chosen.includes(o.id)}
                onChange={() =>
                  setValue(
                    chosen.includes(o.id) ? chosen.filter((c) => c !== o.id) : [...chosen, o.id],
                  )
                }
              />
              {o.text}
            </label>
          );
        })}
      {item.type === "true_false" &&
        [true, false].map((v) => (
          <label key={String(v)} className="flex items-center gap-2">
            <input type="radio" checked={value === v} onChange={() => setValue(v)} />
            {v ? "True" : "False"}
          </label>
        ))}
      {item.type === "numeric" && (
        <input
          type="number"
          step="any"
          value={typeof value === "number" ? value : ""}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-32 rounded border border-border bg-surface px-2 py-1"
        />
      )}
      <p className="text-text-muted">
        Every finished attempt is graded again. Marks you gave by hand stay.
      </p>
      {fix.isError && <Message kind="error">{messageFrom(fix.error)}</Message>}
      <div className="flex gap-2">
        <Button onClick={() => fix.mutate()} disabled={fix.isPending}>
          Save and regrade
        </Button>
        <Button variant="plain" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
