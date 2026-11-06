import { useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { messageFrom } from "../../lib/errors";
import { Button, Card, Loading, Message } from "../../app/ui/form";
import { Markdown } from "../../app/ui/Markdown";
import { unwrap } from "../classes/api";
import { QuestionEditor } from "./QuestionEditor";
import { CSV_TEMPLATE, TYPE_LABEL } from "./question";
import { readQuestionsCsv, type ImportRow } from "./prompt";
import { ImportPreview } from "./ImportPreview";
import { PromptBuilder } from "./PromptBuilder";
import { useBank, type BankQuestion } from "./api";

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
        <h1 className="text-title-1-bold tracking-tight text-text">Question bank</h1>
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
      <AddQuestions />
      {bank.isPending && <Loading />}
      {bank.isError && <Message kind="error">{messageFrom(bank.error)}</Message>}
      {bank.data?.length === 0 && <p className="text-text-muted">No questions yet.</p>}
      {remove.isError && <Message kind="error">{messageFrom(remove.error)}</Message>}
      <ul className="space-y-3">
        {bank.data?.map((q) => (
          <li key={q.id} className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
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

function AddQuestions() {
  const [mode, setMode] = useState<"ai" | "file">("ai");
  return (
    <section aria-labelledby="add-questions" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="add-questions" className="text-title-3-semibold text-text">
          Add questions in bulk
        </h2>
        <div className="flex rounded-xl bg-surface-muted p-1" role="group" aria-label="How to add">
          {(
            [
              ["ai", "Ask your AI"],
              ["file", "Import a spreadsheet"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`rounded-lg px-3 py-1.5 text-body-medium ${
                mode === value
                  ? "bg-surface text-text shadow-xs"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {mode === "ai" ? <PromptBuilder /> : <CsvImport />}
    </section>
  );
}

function CsvImport() {
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [name, setName] = useState("");

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
    setName(file.name);
    setRows(readQuestionsCsv(await file.text()));
  }

  return (
    <Card title="Import from a spreadsheet">
      <p className="text-body-regular text-text-muted">
        Save a sheet as CSV with the columns in the template, then choose the file. You will see
        every question before anything is saved.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="plain" onClick={downloadTemplate}>
          Download the template
        </Button>
        <label className="text-body-regular">
          <span className="sr-only">CSV file</span>
          <input type="file" accept=".csv,text/csv" onChange={onFile} />
        </label>
      </div>
      {rows && <ImportPreview key={name + rows.length} rows={rows} extraTags={[]} />}
    </Card>
  );
}
