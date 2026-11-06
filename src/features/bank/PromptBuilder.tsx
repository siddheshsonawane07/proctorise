import { useId, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { RiFileCopyLine, RiSparkling2Line } from "@remixicon/react";
import { Button, Card, Field, TextArea } from "../../app/ui/form";
import { BOARDS } from "./syllabus";
import { buildPrompt, readQuestionsCsv, selectionTags, type Difficulty } from "./prompt";
import { TYPE_LABEL, type QuestionType } from "./question";
import { ImportPreview } from "./ImportPreview";

const selectClass =
  "mt-1.5 block w-full rounded-2lg bg-background-tertiary-default px-3 py-2 text-body-regular text-text-primary ring-2 ring-transparent ring-inset hover:ring-border-button-hover focus:ring-border-button-active focus:outline-none";

const ALL_TYPES: QuestionType[] = ["single", "multiple", "true_false", "short_text", "numeric"];

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-body-medium text-text-primary">{label}</span>
      <select
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
        className={selectClass}
      >
        {children}
      </select>
    </label>
  );
}

/**
 * Step 1: choose what to ask for and copy the prompt into your own AI. Step 2: paste its reply,
 * check the preview, and save. The app never calls an AI itself, so this costs nothing to run.
 */
export function PromptBuilder() {
  const board = BOARDS[0]!;
  const [classId, setClassId] = useState(board.classes[0]!.id);
  const klass = board.classes.find((c) => c.id === classId) ?? board.classes[0]!;
  const [subjectId, setSubjectId] = useState(klass.subjects[0]!.id);
  const subject = klass.subjects.find((s) => s.id === subjectId) ?? klass.subjects[0]!;
  const [chapter, setChapter] = useState(subject.chapters[0] ?? "");
  const [count, setCount] = useState(10);
  const [types, setTypes] = useState<QuestionType[]>(["single", "true_false", "numeric"]);
  const [difficulty, setDifficulty] = useState<Difficulty>("balanced");
  const [copied, setCopied] = useState(false);
  const [reply, setReply] = useState("");
  const [checked, setChecked] = useState<string | null>(null);
  const chapterListId = useId();
  const promptBox = useRef<HTMLTextAreaElement>(null);

  const prompt = buildPrompt({
    board: board.name,
    className: klass.name,
    subject: subject.name,
    chapter,
    count,
    types,
    difficulty,
  });
  const tags = selectionTags(board.id, klass.id, subject.id, chapter);
  const rows = useMemo(() => (checked === null ? null : readQuestionsCsv(checked)), [checked]);

  function chooseSubject(id: string) {
    setSubjectId(id);
    setChapter(klass.subjects.find((s) => s.id === id)?.chapters[0] ?? "");
  }

  function toggle(type: QuestionType) {
    setTypes((t) => (t.includes(type) ? t.filter((x) => x !== type) : [...t, type]));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // No clipboard permission: select the text so the teacher can copy it by hand.
      promptBox.current?.select();
    }
  }

  return (
    <div className="space-y-5">
      <Card title="1. Choose what to ask for">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Board" value={board.id} onChange={() => undefined}>
            {BOARDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select label="Class" value={klass.id} onChange={setClassId}>
            {board.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select label="Subject" value={subject.id} onChange={chooseSubject}>
            {klass.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <div>
            <Field
              label="Chapter or topic"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              list={chapterListId}
              placeholder={subject.chapters.length ? "Choose or type" : "Type the chapter or topic"}
            />
            <datalist id={chapterListId}>
              {subject.chapters.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <Field
            label="How many questions"
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
          />
          <Select
            label="Difficulty"
            value={difficulty}
            onChange={(v) => setDifficulty(v as Difficulty)}
          >
            <option value="easy">Mostly easy</option>
            <option value="balanced">Balanced</option>
            <option value="hard">Mostly hard</option>
          </Select>
        </div>
        <fieldset>
          <legend className="text-body-medium text-text-primary">Kinds of question</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {ALL_TYPES.map((t) => (
              <label
                key={t}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-body-regular has-checked:border-accent has-checked:bg-accent/5"
              >
                <input
                  type="checkbox"
                  checked={types.includes(t)}
                  onChange={() => toggle(t)}
                  className="accent-[var(--color-accent)]"
                />
                {TYPE_LABEL[t]}
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card title="2. Copy the prompt into your AI">
        <p className="text-body-regular text-text-muted">
          Paste it into Claude, ChatGPT, Gemini or any AI you use. Read the questions it writes
          before you use them: an AI can be wrong.
        </p>
        <TextArea label="The prompt" value={prompt} readOnly rows={12} ref={promptBox} />
        <Button onClick={copy} disabled={types.length === 0}>
          <span className="inline-flex items-center gap-1.5">
            {copied ? (
              <RiSparkling2Line aria-hidden className="size-4" />
            ) : (
              <RiFileCopyLine aria-hidden className="size-4" />
            )}
            {copied ? "Copied. Paste it into your AI" : "Copy the prompt"}
          </span>
        </Button>
      </Card>

      <Card title="3. Paste the AI's answer">
        <TextArea
          label="The AI's answer, with the CSV"
          value={reply}
          onChange={(e) => {
            setReply(e.target.value);
            setChecked(null);
          }}
          rows={8}
          placeholder={"type,prompt,options,correct,points,tags,tolerance\nsingle,…"}
        />
        <Button variant="plain" onClick={() => setChecked(reply)} disabled={!reply.trim()}>
          Check the questions
        </Button>
        {rows && <ImportPreview key={checked} rows={rows} extraTags={tags} />}
      </Card>
    </div>
  );
}
