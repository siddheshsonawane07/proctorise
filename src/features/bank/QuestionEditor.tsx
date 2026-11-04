import { useState, type FormEvent } from "react";
import { Button, Card, Field, Message, TextArea } from "../../app/ui/form";
import { Markdown } from "../../app/ui/Markdown";
import { messageFrom } from "../../lib/errors";
import { LETTERS, optionsFrom, TYPE_LABEL, type QuestionType } from "./question";
import { useSaveQuestion, type BankQuestion } from "./api";

type Draft = {
  type: QuestionType;
  prompt: string;
  options: string[];
  correctIndexes: number[];
  trueFalse: boolean;
  accepted: string;
  number: string;
  tolerance: string;
  caseSensitive: boolean;
  points: string;
  tags: string;
};

function draftFrom(q: BankQuestion | null): Draft {
  const blank: Draft = {
    type: "single",
    prompt: "",
    options: ["", ""],
    correctIndexes: [],
    trueFalse: true,
    accepted: "",
    number: "",
    tolerance: "0",
    caseSensitive: false,
    points: "1",
    tags: "",
  };
  if (!q) return blank;
  const correct = q.key?.correct;
  const ids = q.options.map((o) => o.id);
  return {
    ...blank,
    type: q.type,
    prompt: q.prompt,
    options: q.options.length ? q.options.map((o) => o.text) : blank.options,
    correctIndexes: (Array.isArray(correct) ? correct : [correct])
      .map((c) => ids.indexOf(String(c)))
      .filter((i) => i >= 0),
    trueFalse: correct === true,
    accepted: Array.isArray(correct) && q.type === "short_text" ? correct.join("\n") : "",
    number: q.type === "numeric" ? String(correct) : "",
    tolerance: String(q.key?.tolerance ?? 0),
    caseSensitive: q.key?.case_sensitive ?? false,
    points: String(q.points),
    tags: q.tags.join(", "),
  };
}

export function QuestionEditor({
  question,
  onDone,
}: {
  question: BankQuestion | null;
  onDone: () => void;
}) {
  const [d, setD] = useState<Draft>(() => draftFrom(question));
  const save = useSaveQuestion();
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const choice = d.type === "single" || d.type === "multiple";

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const options = choice ? optionsFrom(d.options) : [];
    const keys = d.correctIndexes.flatMap((i) => (options[i] ? [options[i].id] : []));
    const correct =
      d.type === "single"
        ? (keys[0] ?? "")
        : d.type === "multiple"
          ? keys
          : d.type === "true_false"
            ? d.trueFalse
            : d.type === "short_text"
              ? d.accepted
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : Number(d.number);
    save.mutate(
      {
        id: question?.id ?? null,
        input: {
          type: d.type,
          prompt: d.prompt,
          options,
          points: Number(d.points),
          tags: d.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          correct: d.type === "numeric" && d.number.trim() === "" ? null : correct,
          tolerance: Number(d.tolerance) || 0,
          caseSensitive: d.caseSensitive,
        },
      },
      { onSuccess: onDone },
    );
  }

  function toggleCorrect(i: number) {
    if (d.type === "single") set({ correctIndexes: [i] });
    else
      set({
        correctIndexes: d.correctIndexes.includes(i)
          ? d.correctIndexes.filter((x) => x !== i)
          : [...d.correctIndexes, i],
      });
  }

  return (
    <Card title={question ? "Edit question" : "New question"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Type</span>
          <select
            value={d.type}
            onChange={(e) => set({ type: e.target.value as QuestionType, correctIndexes: [] })}
            className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2"
          >
            {Object.entries(TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <TextArea
          label="Question"
          value={d.prompt}
          onChange={(e) => set({ prompt: e.target.value })}
          required
          maxLength={5000}
        />
        {d.prompt.trim() && (
          <div className="rounded-md bg-surface-muted p-3 text-sm">
            <p className="mb-1 text-text-muted">Students will see:</p>
            <Markdown>{d.prompt}</Markdown>
          </div>
        )}

        {choice && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              Options, and tick {d.type === "single" ? "the correct one" : "every correct one"}
            </legend>
            {d.options.map((text, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type={d.type === "single" ? "radio" : "checkbox"}
                  name="correct"
                  aria-label={`Option ${LETTERS[i]} is correct`}
                  checked={d.correctIndexes.includes(i)}
                  onChange={() => toggleCorrect(i)}
                />
                <span className="w-5 text-text-muted">{LETTERS[i]}</span>
                <input
                  aria-label={`Option ${LETTERS[i]}`}
                  value={text}
                  required
                  onChange={(e) =>
                    set({ options: d.options.map((o, j) => (j === i ? e.target.value : o)) })
                  }
                  className="flex-1 rounded-md border border-border bg-surface px-3 py-1.5"
                />
                {d.options.length > 2 && (
                  <Button
                    variant="plain"
                    onClick={() =>
                      set({
                        options: d.options.filter((_, j) => j !== i),
                        correctIndexes: d.correctIndexes
                          .filter((x) => x !== i)
                          .map((x) => (x > i ? x - 1 : x)),
                      })
                    }
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            {d.options.length < 10 && (
              <Button variant="plain" onClick={() => set({ options: [...d.options, ""] })}>
                Add an option
              </Button>
            )}
          </fieldset>
        )}

        {d.type === "true_false" && (
          <fieldset className="flex gap-4">
            <legend className="text-sm font-medium">The statement is</legend>
            {[true, false].map((value) => (
              <label key={String(value)} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="tf"
                  checked={d.trueFalse === value}
                  onChange={() => set({ trueFalse: value })}
                />
                {value ? "True" : "False"}
              </label>
            ))}
          </fieldset>
        )}

        {d.type === "short_text" && (
          <>
            <TextArea
              label="Accepted answers, one per line"
              value={d.accepted}
              onChange={(e) => set({ accepted: e.target.value })}
            />
            <p className="text-sm text-text-muted">Leave empty to mark answers yourself.</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={d.caseSensitive}
                onChange={(e) => set({ caseSensitive: e.target.checked })}
              />
              Capital letters must match
            </label>
          </>
        )}

        {d.type === "numeric" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Correct number"
              type="number"
              step="any"
              value={d.number}
              required
              onChange={(e) => set({ number: e.target.value })}
            />
            <Field
              label="Accept within ±"
              type="number"
              step="any"
              min="0"
              value={d.tolerance}
              onChange={(e) => set({ tolerance: e.target.value })}
            />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Points"
            type="number"
            min="0.25"
            max="100"
            step="0.25"
            value={d.points}
            required
            onChange={(e) => set({ points: e.target.value })}
          />
          <Field
            label="Tags (optional, comma separated)"
            value={d.tags}
            onChange={(e) => set({ tags: e.target.value })}
          />
        </div>

        {save.isError && <Message kind="error">{messageFrom(save.error)}</Message>}
        <div className="flex gap-2">
          <Button type="submit" disabled={save.isPending}>
            Save question
          </Button>
          <Button variant="plain" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
