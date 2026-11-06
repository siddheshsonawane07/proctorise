import { useState } from "react";
import { RiCheckLine, RiErrorWarningLine } from "@remixicon/react";
import { messageFrom } from "../../lib/errors";
import { Button, Message } from "../../app/ui/form";
import { describeAnswer } from "../questions/describe";
import { useSaveQuestion } from "./api";
import { TYPE_LABEL, type QuestionInput } from "./question";
import type { ImportRow } from "./prompt";

/**
 * Every row of an import, with what is wrong with it, before anything is saved (Phase-9-Critic #6).
 * The good rows are saved through save_question, which checks each one again.
 */
export function ImportPreview({ rows, extraTags }: { rows: ImportRow[]; extraTags: string[] }) {
  const save = useSaveQuestion();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{ added: number; errors: string[] } | null>(null);
  const good = rows.filter(
    (r): r is { row: number; result: QuestionInput } => typeof r.result !== "string",
  );
  const bad = rows.length - good.length;

  async function saveGood() {
    setBusy(true);
    const errors: string[] = [];
    let added = 0;
    for (const { row, result } of good) {
      const tags = [...new Set([...extraTags, ...result.tags])];
      try {
        await save.mutateAsync({ id: null, input: { ...result, tags } });
        added++;
      } catch (error) {
        errors.push(`Question ${row}: ${messageFrom(error)}`);
      }
    }
    setBusy(false);
    setReport({ added, errors });
  }

  if (rows.length === 0) {
    return (
      <Message kind="error">No questions found. Check the text has the CSV header line.</Message>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-body-medium text-text">
        {good.length} ready{bad > 0 && `, ${bad} need fixing (they will be left out)`}.
        {extraTags.length > 0 && (
          <span className="text-text-muted"> Each gets the tags {extraTags.join(", ")}.</span>
        )}
      </p>
      <div className="max-h-[28rem] overflow-auto rounded-xl border border-border">
        <table className="w-full text-left text-body-regular">
          <thead className="sticky top-0 bg-surface-muted text-caption-1-semibold text-text-muted">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Question</th>
              <th className="px-3 py-2">Answer</th>
              <th className="px-3 py-2">Check</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(({ row, result }) => (
              <tr key={row} className="align-top">
                <td className="px-3 py-2 text-text-muted">{row}</td>
                {typeof result === "string" ? (
                  <>
                    <td className="px-3 py-2 text-text-muted" colSpan={2}>
                      —
                    </td>
                    <td className="px-3 py-2 text-high">
                      <span className="flex items-start gap-1.5">
                        <RiErrorWarningLine aria-hidden className="mt-0.5 size-4 shrink-0" />
                        {result}
                      </span>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2">
                      <span className="block text-caption-1-regular text-text-muted">
                        {TYPE_LABEL[result.type]} · {result.points}{" "}
                        {result.points === 1 ? "point" : "points"}
                      </span>
                      {result.prompt}
                      {result.options.length > 0 && (
                        <span className="mt-1 block text-caption-1-regular text-text-muted">
                          {result.options.map((o, i) => `${"ABCDEFGHIJ"[i]}. ${o.text}`).join("  ")}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{describeAnswer(result, result.correct)}</td>
                    <td className="px-3 py-2 text-accent">
                      <span className="flex items-center gap-1.5">
                        <RiCheckLine aria-hidden className="size-4" />
                        Ready
                      </span>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {report ? (
        <Message kind={report.errors.length ? "error" : "ok"}>
          Saved {report.added} {report.added === 1 ? "question" : "questions"} to your bank.
          {report.errors.map((e) => (
            <span key={e} className="mt-1 block">
              {e}
            </span>
          ))}
        </Message>
      ) : (
        <Button onClick={saveGood} disabled={busy || good.length === 0}>
          {busy ? "Saving…" : `Save ${good.length} ${good.length === 1 ? "question" : "questions"}`}
        </Button>
      )}
    </div>
  );
}
