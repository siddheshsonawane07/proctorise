import { useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { RiAddLine, RiCheckLine } from "@remixicon/react";
import { Button, Card, Field, Loading, LoadFailed } from "../../app/ui/form";
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
  // The tools for adding many at once: open by themselves only while the bank is empty.
  const [bulk, setBulk] = useState<boolean | null>(null);
  if (bulk === null && bank.data) setBulk(bank.data.length === 0);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const remove = useMutation({
    meta: { ok: "Question deleted." },
    mutationFn: async (id: string) =>
      unwrap(await supabase.from("questions").delete().eq("id", id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bank"] }),
  });
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = (bank.data ?? []).filter((q) => {
    const text = `${q.prompt} ${q.tags.join(" ")} ${TYPE_LABEL[q.type]}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-page text-text">Question bank</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="plain" aria-expanded={bulk === true} onClick={() => setBulk(!bulk)}>
            Add many at once
          </Button>
          <Button onClick={() => setEditing("new")}>
            <RiAddLine aria-hidden className="mr-1 -ml-0.5 size-4" />
            New question
          </Button>
        </div>
      </div>
      <p className="text-text-muted">
        Your questions, for any of your tests. Changing one here never changes a test that is
        already published.
      </p>
      {editing === "new" && (
        <QuestionEditor question={null} another onDone={() => setEditing(null)} />
      )}
      {bulk && <AddQuestions />}
      {bank.isPending && <Loading />}
      {bank.isError && <LoadFailed retry={bank.refetch} />}
      {bank.data && bank.data.length > 0 && (
        <section aria-labelledby="your-questions" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="your-questions" className="text-title-3-semibold text-text">
              Your questions ({bank.data.length})
            </h2>
            <div className="w-full sm:w-80">
              <Field
                label="Search your questions"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Words, a tag, or a kind of answer"
              />
            </div>
          </div>
          {shown.length === 0 && <p className="text-text-muted">No question matches that.</p>}
          <ul className="space-y-3">
            {shown.map((q) =>
              editing !== "new" && editing?.id === q.id ? (
                <li key={q.id}>
                  <QuestionEditor question={q} onDone={() => setEditing(null)} />
                </li>
              ) : (
                <li
                  key={q.id}
                  className="rounded-2xl border border-border bg-surface p-4 shadow-xs sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Markdown>{q.prompt}</Markdown>
                    </div>
                    <div className="flex gap-2">
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
                  </div>
                  <Answer question={q} />
                  <p className="mt-3 text-caption-1-regular text-text-muted">
                    {TYPE_LABEL[q.type]}, {Number(q.points)}{" "}
                    {Number(q.points) === 1 ? "point" : "points"}
                    {q.tags.length > 0 && `. Tags: ${q.tags.join(", ")}`}
                  </p>
                </li>
              ),
            )}
          </ul>
        </section>
      )}
    </div>
  );
}

/** What counts as right, under the question, so the bank can be read without opening each one. */
function Answer({ question: q }: { question: BankQuestion }) {
  const correct = q.key?.correct;
  if (q.type === "single" || q.type === "multiple") {
    const right = new Set((Array.isArray(correct) ? correct : [correct]).map(String));
    return (
      <ul className="mt-3 space-y-1">
        {q.options.map((o) => (
          <li key={o.id} className="flex items-start gap-2 text-body-regular">
            {right.has(o.id) ? (
              <RiCheckLine aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
            ) : (
              <span aria-hidden className="size-4 shrink-0" />
            )}
            <span className={right.has(o.id) ? "text-body-medium text-text" : "text-text-muted"}>
              {o.text}
              {right.has(o.id) && <span className="sr-only"> (correct)</span>}
            </span>
          </li>
        ))}
      </ul>
    );
  }
  const answer =
    q.type === "true_false"
      ? correct === true
        ? "True"
        : "False"
      : q.type === "numeric"
        ? `${String(correct)}${q.key?.tolerance ? `, give or take ${q.key.tolerance}` : ""}`
        : Array.isArray(correct) && correct.length > 0
          ? correct.join(", ")
          : null;
  return (
    <p className="mt-3 text-body-regular text-text-muted">
      {answer === null ? (
        "You mark this one yourself."
      ) : (
        <>
          Answer: <span className="text-body-medium text-text">{answer}</span>
        </>
      )}
    </p>
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
        <Button
          variant="plain"
          onClick={() => {
            setName("sample");
            setRows(readQuestionsCsv(CSV_TEMPLATE));
          }}
        >
          Try the sample questions
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
