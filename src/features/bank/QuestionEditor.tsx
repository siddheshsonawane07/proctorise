import { useRef, useState, type FormEvent } from "react";
import { RiCloseLine } from "@remixicon/react";
import { Button, Field, TextArea } from "../../app/ui/form";
import { Markdown } from "../../app/ui/Markdown";
import { toast } from "../../app/ui/toast";
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

const BLANK: Draft = {
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

function draftFrom(q: BankQuestion | null): Draft {
  if (!q) return BLANK;
  const correct = q.key?.correct;
  const ids = q.options.map((o) => o.id);
  return {
    ...BLANK,
    type: q.type,
    prompt: q.prompt,
    options: q.options.length ? q.options.map((o) => o.text) : BLANK.options,
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

const optionClass =
  "min-w-0 flex-1 rounded-2lg border-0 bg-background-tertiary-default px-3 py-2 text-body-regular text-text-primary ring-2 ring-transparent ring-inset hover:ring-border-button-hover focus:ring-border-button-active focus:outline-none";

/**
 * Writes or changes one question. `onSaved` gets the question's id once it is in the bank (a test
 * adds it to itself there). With `another`, a second button saves and starts the next question of
 * the same kind, for writing a run of them.
 */
export function QuestionEditor({
  question,
  onDone,
  onSaved,
  another = false,
}: {
  question: BankQuestion | null;
  onDone: () => void;
  onSaved?: (id: string) => Promise<unknown>;
  another?: boolean;
}) {
  const [d, setD] = useState<Draft>(() => draftFrom(question));
  const save = useSaveQuestion(onSaved ? {} : { ok: "Question saved." });
  const [finishing, setFinishing] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const choice = d.type === "single" || d.type === "multiple";
  const busy = save.isPending || finishing;

  async function submit(next: boolean) {
    if (!form.current?.reportValidity()) return;
    const options = choice ? optionsFrom(d.options) : [];
    const keys = d.correctIndexes.flatMap((i) => (options[i] ? [options[i].id] : []));
    if (choice && keys.length === 0) {
      return toast.error(
        d.type === "single" ? "Mark the correct option." : "Mark every correct option.",
      );
    }
    const correct =
      d.type === "single"
        ? keys[0]!
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
    setFinishing(true);
    try {
      const id = await save.mutateAsync({
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
      });
      await onSaved?.(id);
      if (!next) return onDone();
      // The next one keeps the kind, the points and the tags: a run of questions shares them.
      setD({ ...BLANK, type: d.type, points: d.points, tags: d.tags });
      form.current.querySelector("textarea")?.focus();
    } catch {
      // Already said in the corner; the form stays as it was, to fix and try again.
    } finally {
      setFinishing(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(false);
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

  function addOption() {
    if (d.options.length >= LETTERS.length) return;
    set({ options: [...d.options, ""] });
    // Once the new field is on the page, typing carries on in it.
    requestAnimationFrame(() => {
      const fields = form.current?.querySelectorAll<HTMLInputElement>(
        "[data-option] input[required]",
      );
      fields?.[fields.length - 1]?.focus();
    });
  }

  return (
    <section
      aria-label={question ? "Edit question" : "New question"}
      className="rounded-2xl border border-accent/50 bg-background-primary-default p-5 shadow-xs"
    >
      <form ref={form} onSubmit={onSubmit} className="space-y-5">
        <TextArea
          label="Question"
          value={d.prompt}
          onChange={(e) => set({ prompt: e.target.value })}
          required
          maxLength={5000}
          placeholder="Type the question"
        />
        {/[*_`#$\\[]/.test(d.prompt) && (
          <div className="rounded-xl bg-surface-muted p-3 text-body-regular">
            <p className="mb-1 text-text-muted">Students will see:</p>
            <Markdown>{d.prompt}</Markdown>
          </div>
        )}

        <fieldset>
          <legend className="text-body-medium text-text-primary">Kind of answer</legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(Object.keys(TYPE_LABEL) as QuestionType[]).map((type) => (
              <label
                key={type}
                className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-body-regular text-text has-checked:border-accent has-checked:bg-accent/10 has-checked:text-accent has-focus-visible:outline-2 has-focus-visible:outline-accent"
              >
                <input
                  type="radio"
                  name="type"
                  className="sr-only"
                  checked={d.type === type}
                  onChange={() => set({ type, correctIndexes: [] })}
                />
                {TYPE_LABEL[type]}
              </label>
            ))}
          </div>
        </fieldset>

        {choice && (
          <fieldset className="space-y-2">
            <legend className="text-body-medium text-text-primary">
              Options. Tick {d.type === "single" ? "the correct one" : "every correct one"}.
            </legend>
            {d.options.map((text, i) => (
              <div key={i} data-option className="flex items-center gap-2">
                <input
                  type={d.type === "single" ? "radio" : "checkbox"}
                  name="correct"
                  aria-label={`Option ${LETTERS[i]} is correct`}
                  checked={d.correctIndexes.includes(i)}
                  onChange={() => toggleCorrect(i)}
                  className="size-4 accent-accent"
                />
                <span aria-hidden className="w-4 text-text-muted">
                  {LETTERS[i]}
                </span>
                <input
                  aria-label={`Option ${LETTERS[i]}`}
                  value={text}
                  required
                  placeholder={`Option ${LETTERS[i]}`}
                  onChange={(e) =>
                    set({ options: d.options.map((o, j) => (j === i ? e.target.value : o)) })
                  }
                  onKeyDown={(e) => {
                    // Enter on the last option starts the next, as in a list.
                    if (e.key === "Enter" && i === d.options.length - 1 && text.trim()) {
                      e.preventDefault();
                      addOption();
                    }
                  }}
                  className={optionClass}
                />
                <button
                  type="button"
                  disabled={d.options.length <= 2}
                  onClick={() =>
                    set({
                      options: d.options.filter((_, j) => j !== i),
                      correctIndexes: d.correctIndexes
                        .filter((x) => x !== i)
                        .map((x) => (x > i ? x - 1 : x)),
                    })
                  }
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text disabled:invisible"
                >
                  <RiCloseLine aria-hidden className="size-4" />
                  <span className="sr-only">Remove option {LETTERS[i]}</span>
                </button>
              </div>
            ))}
            {d.options.length < LETTERS.length && (
              <Button variant="plain" onClick={addOption}>
                Add an option
              </Button>
            )}
          </fieldset>
        )}

        {d.type === "true_false" && (
          <fieldset>
            <legend className="text-body-medium text-text-primary">The statement is</legend>
            <div className="mt-1.5 flex gap-5">
              {[true, false].map((value) => (
                <label key={String(value)} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tf"
                    checked={d.trueFalse === value}
                    onChange={() => set({ trueFalse: value })}
                    className="size-4 accent-accent"
                  />
                  {value ? "True" : "False"}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {d.type === "short_text" && (
          <div className="space-y-2">
            <TextArea
              label="Accepted answers, one per line"
              value={d.accepted}
              onChange={(e) => set({ accepted: e.target.value })}
            />
            <p className="text-body-regular text-text-muted">
              Leave empty to mark answers yourself.
            </p>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={d.caseSensitive}
                onChange={(e) => set({ caseSensitive: e.target.checked })}
                className="size-4 accent-accent"
              />
              Capital letters must match
            </label>
          </div>
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

        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
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

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button variant="plain" onClick={onDone}>
            Cancel
          </Button>
          {another && (
            <Button variant="plain" disabled={busy} onClick={() => void submit(true)}>
              Save and write another
            </Button>
          )}
          <Button type="submit" disabled={busy}>
            Save question
          </Button>
        </div>
      </form>
    </section>
  );
}
