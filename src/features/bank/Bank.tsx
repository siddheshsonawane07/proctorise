import { useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { messageFrom } from "../../lib/errors";
import { Button, Card, Loading, Message } from "../../app/ui/form";
import { Markdown } from "../../app/ui/Markdown";
import { unwrap } from "../classes/api";
import { QuestionEditor } from "./QuestionEditor";
import { CSV_TEMPLATE, parseCsv, rowToQuestion, TYPE_LABEL } from "./question";
import { useBank, useSaveQuestion, type BankQuestion } from "./api";

export function Bank() {
  const bank = useBank();
  const [editing, setEditing] = useState<BankQuestion | "new" | null>(null);
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: async (id: string) =>
      unwrap(await supabase.from("questions").delete().eq("id", id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bank"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Question bank</h1>
        <Button onClick={() => setEditing("new")}>New question</Button>
      </div>
      <p className="text-text-muted">
        Your questions, for any of your tests. Changing one here never changes a test that is
        already published.
      </p>
      {editing && (
        <QuestionEditor
          key={editing === "new" ? "new" : editing.id}
          question={editing === "new" ? null : editing}
          onDone={() => setEditing(null)}
        />
      )}
      <CsvImport />
      {bank.isPending && <Loading />}
      {bank.isError && <Message kind="error">{messageFrom(bank.error)}</Message>}
      {bank.data?.length === 0 && <p className="text-text-muted">No questions yet.</p>}
      {remove.isError && <Message kind="error">{messageFrom(remove.error)}</Message>}
      <ul className="space-y-3">
        {bank.data?.map((q) => (
          <li key={q.id} className="rounded-lg border border-border p-4">
            <p className="text-sm text-text-muted">
              {TYPE_LABEL[q.type]} · {Number(q.points)}{" "}
              {Number(q.points) === 1 ? "point" : "points"}
              {q.tags.length > 0 && ` · ${q.tags.join(", ")}`}
            </p>
            <div className="mt-2">
              <Markdown>{q.prompt}</Markdown>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="plain" onClick={() => setEditing(q)}>
                Edit
              </Button>
              <Button
                variant="plain"
                disabled={remove.isPending}
                onClick={() => remove.mutate(q.id)}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CsvImport() {
  const save = useSaveQuestion();
  const [report, setReport] = useState<{ added: number; errors: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  function downloadTemplate() {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: "text/csv" }));
    link.download = "questions-template.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    const rows = parseCsv(await file.text());
    const body = rows[0]?.[0]?.trim().toLowerCase() === "type" ? rows.slice(1) : rows;
    const errors: string[] = [];
    let added = 0;
    for (const [i, row] of body.entries()) {
      const parsed = rowToQuestion(row);
      const line = i + (body === rows ? 1 : 2);
      if (typeof parsed === "string") {
        errors.push(`Row ${line}: ${parsed}`);
        continue;
      }
      try {
        await save.mutateAsync({ id: null, input: parsed });
        added++;
      } catch (error) {
        errors.push(`Row ${line}: ${messageFrom(error)}`);
      }
    }
    setReport({ added, errors });
    setBusy(false);
  }

  return (
    <Card title="Import from a spreadsheet">
      <p className="text-sm text-text-muted">
        Save a sheet as CSV with the columns in the template, then choose the file.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="plain" onClick={downloadTemplate}>
          Download the template
        </Button>
        <label className="text-sm">
          <span className="sr-only">CSV file</span>
          <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={busy} />
        </label>
      </div>
      {busy && <Loading />}
      {report && (
        <Message kind={report.errors.length ? "error" : "ok"}>
          Added {report.added} {report.added === 1 ? "question" : "questions"}.
          {report.errors.length > 0 && (
            <span className="mt-2 block">
              {report.errors.map((e) => (
                <span key={e} className="block">
                  {e}
                </span>
              ))}
            </span>
          )}
        </Message>
      )}
    </Card>
  );
}
