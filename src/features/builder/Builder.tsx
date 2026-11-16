import { useState, type ButtonHTMLAttributes, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { RiAddLine, RiArrowDownLine, RiArrowUpLine } from "@remixicon/react";
import { Button, Card, Field, Loading, Message, Select, TextArea } from "../../app/ui/form";
import { toast } from "../../app/ui/toast";
import { Confirm } from "../../app/ui/Confirm";
import { Notice } from "../../app/ui/Notice";
import { messageFrom } from "../../lib/errors";
import { MAX_LIVE_STUDENTS } from "../../lib/limits";
import { formatWhen, fromLocalInput, toLocalInput } from "../../lib/time";
import { useBank, type BankQuestion } from "../bank/api";
import { QuestionEditor } from "../bank/QuestionEditor";
import { TYPE_LABEL } from "../bank/question";
import { TEST_STATUS_LABEL, useDeleteTest, useDuplicateTest, type TestRow } from "../classes/api";
import { DeleteTest } from "../classes/DeleteTest";
import {
  useAddQuestion,
  useCancelTest,
  useDraftQuestions,
  usePublish,
  usePublishedItems,
  useRemoveQuestion,
  useReopenTest,
  useReorder,
  useSetPoints,
  useTest,
  useUnpublish,
  useUpdateTest,
  type DraftQuestion,
} from "./api";
import {
  PRESETS,
  SNAPSHOT_INTERVALS,
  speaksWarnings,
  type Preset,
  type Proctoring,
} from "./proctoring";

export function Builder() {
  const { testId = "" } = useParams();
  const test = useTest(testId);
  if (test.isPending) return <Loading />;
  if (test.isError) return <Message kind="error">{messageFrom(test.error)}</Message>;
  if (!test.data)
    return <Notice title="Test not found">It doesn't exist, or it isn't yours.</Notice>;
  return test.data.status === "draft" ? (
    <DraftBuilder test={test.data} />
  ) : (
    <PublishedTest test={test.data} />
  );
}

function Header({ test }: { test: TestRow }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <Link to={`/app/classes/${test.class_id}`} className="text-sm text-accent underline">
          Back to the class
        </Link>
        <h1 className="mt-1 text-title-1-bold tracking-tight text-text">{test.title}</h1>
        {test.status === "draft" && (
          <p className="text-body-regular text-text-muted">{TEST_STATUS_LABEL.draft}</p>
        )}
      </div>
      <Link to={`/app/tests/${test.id}/preview`} className="text-accent underline">
        Preview as a student
      </Link>
    </div>
  );
}

function DraftBuilder({ test }: { test: TestRow }) {
  const draft = useDraftQuestions(test.id, true);
  const publish = usePublish(test.id);
  return (
    <div className="space-y-6">
      <Header test={test} />
      <Questions testId={test.id} draft={draft.data ?? []} loading={draft.isPending} />
      <Details test={test} />
      <ProctoringSettings test={test} />
      <Card title="Publish">
        <p className="text-text-muted">
          Publishing freezes the questions: editing your bank afterwards won't change this test.
          Students in the class see it at once, and can start it from {formatWhen(test.opens_at)}.
        </p>
        <p className="text-body-regular text-text-muted">
          On the free plan, about {MAX_LIVE_STUDENTS} students can take a test at the same time.
        </p>
        <Button onClick={() => publish.mutate(undefined)} disabled={publish.isPending}>
          Publish to the class
        </Button>
      </Card>
      <CopyOrDelete test={test} />
    </div>
  );
}

/** For any test, draft or not: a copy to change freely, or gone altogether. */
function CopyOrDelete({ test }: { test: TestRow }) {
  const copy = useDuplicateTest(test.class_id);
  const remove = useDeleteTest(test.class_id);
  const navigate = useNavigate();
  return (
    <Card title="Copy or delete">
      <p className="text-body-regular text-text-muted">
        A copy is a new draft in this class with the same questions and settings.
      </p>
      <div className="flex flex-wrap items-start gap-2">
        <Button
          variant="plain"
          disabled={copy.isPending}
          onClick={() =>
            copy.mutate(test.id, { onSuccess: (id) => navigate(`/app/tests/${id}/edit`) })
          }
        >
          Make a copy
        </Button>
        <DeleteTest
          test={test}
          busy={remove.isPending}
          onConfirm={() =>
            remove.mutate(test.id, { onSuccess: () => navigate(`/app/classes/${test.class_id}`) })
          }
        />
      </div>
    </Card>
  );
}

function Details({ test }: { test: TestRow }) {
  const live = test.status !== "draft";
  const update = useUpdateTest(test.id);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    update.mutate(
      {
        title: String(f.get("title")),
        instructions: String(f.get("instructions")),
        duration_min: Number(f.get("duration_min")),
        opens_at: fromLocalInput(String(f.get("opens_at"))),
        closes_at: fromLocalInput(String(f.get("closes_at"))),
        max_attempts: Number(f.get("max_attempts")),
        shuffle_items: f.get("shuffle_items") === "on",
        shuffle_options: f.get("shuffle_options") === "on",
        results_release: String(f.get("results_release")) as TestRow["results_release"],
        reveal_answers: f.get("reveal_answers") === "on",
        retention_days: Number(f.get("retention_days")),
      },
      { onSuccess: () => toast.ok("Saved.") },
    );
  }

  return (
    <Card title="Details">
      {live && (
        <p className="text-body-regular text-text-muted">
          You can still change these. Students already taking the test keep the time they started
          with.
        </p>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Title" name="title" defaultValue={test.title} required maxLength={200} />
        <TextArea
          label="Instructions for students (optional)"
          name="instructions"
          defaultValue={test.instructions}
          maxLength={5000}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label="Time allowed (minutes)"
            name="duration_min"
            type="number"
            min="1"
            max="600"
            defaultValue={test.duration_min}
            required
          />
          <Field
            label="Opens"
            name="opens_at"
            type="datetime-local"
            defaultValue={toLocalInput(test.opens_at)}
            required
          />
          <Field
            label="Closes"
            name="closes_at"
            type="datetime-local"
            defaultValue={toLocalInput(test.closes_at)}
            required
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label="Attempts allowed"
            name="max_attempts"
            type="number"
            min="1"
            max="10"
            defaultValue={test.max_attempts}
            required
          />
          <Select label="Results" name="results_release" defaultValue={test.results_release}>
            <option value="manual">When I release them</option>
            <option value="after_close">When the test closes</option>
            <option value="immediate">As soon as each student submits</option>
          </Select>
          <Select
            label="Keep camera snapshots for"
            name="retention_days"
            defaultValue={String(test.retention_days)}
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </Select>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="shuffle_items" defaultChecked={test.shuffle_items} />
          Shuffle the order of questions for each student
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="shuffle_options" defaultChecked={test.shuffle_options} />
          Shuffle the order of options
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="reveal_answers" defaultChecked={test.reveal_answers} />
          With their results, show students the right answers
        </label>
        <Button type="submit" disabled={update.isPending}>
          Save details
        </Button>
      </form>
    </Card>
  );
}

function Questions({
  testId,
  draft,
  loading,
}: {
  testId: string;
  draft: DraftQuestion[];
  loading: boolean;
}) {
  const bank = useBank();
  const add = useAddQuestion(testId);
  const remove = useRemoveQuestion(testId);
  const reorder = useReorder(testId);
  const setPoints = useSetPoints(testId);
  const queryClient = useQueryClient();
  // One thing open at a time: writing a new question, picking from the bank, or changing one.
  const [panel, setPanel] = useState<"write" | "bank" | { edit: BankQuestion } | null>(null);
  const inTest = new Set(draft.map((q) => q.id));
  const available = (bank.data ?? []).filter((q) => !inTest.has(q.id));
  const busy = add.isPending || remove.isPending || reorder.isPending || setPoints.isPending;
  const total = draft.reduce((sum, q) => sum + q.points, 0);
  // After the last one, whatever gaps removing has left: two rows may never share a position.
  const nextPosition = Math.max(-1, ...draft.map((q) => q.sortOrder)) + 1;

  function move(index: number, by: number) {
    const ids = draft.map((q) => q.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + by, 0, moved!);
    reorder.mutate(ids);
  }

  return (
    <Card title={`Questions (${draft.length}, ${total} points)`}>
      {loading && <Loading />}
      {draft.length === 0 && !loading && (
        <p className="text-text-muted">
          No questions yet. Write one here, or add ones you've already written.
        </p>
      )}
      <ol className="space-y-2">
        {draft.map((q, i) => {
          const mine = bank.data?.find((b) => b.id === q.id);
          if (typeof panel === "object" && panel?.edit.id === q.id) {
            return (
              <li key={q.id} className="space-y-2">
                <p className="text-body-regular text-text-muted">
                  Changing question {i + 1} changes it in your bank too, and in any other draft that
                  uses it. Published tests keep their own copy.
                </p>
                <QuestionEditor
                  question={panel.edit}
                  onDone={() => setPanel(null)}
                  onSaved={async () => {
                    await queryClient.invalidateQueries({ queryKey: ["test", testId, "draft"] });
                    toast.ok("Question saved.");
                  }}
                />
              </li>
            );
          }
          return (
            <li
              key={q.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3"
            >
              <span className="w-6 text-text-muted">{i + 1}.</span>
              <div className="min-w-40 flex-1">
                <p className="truncate text-text">{q.prompt}</p>
                <p className="text-caption-1-regular text-text-muted">{TYPE_LABEL[q.type]}</p>
              </div>
              <label className="flex items-center gap-1.5 text-body-regular">
                <span className="sr-only">Points for question {i + 1}</span>
                <input
                  type="number"
                  min="0.25"
                  max="100"
                  step="0.25"
                  defaultValue={q.points}
                  disabled={busy}
                  onBlur={(e) => {
                    const value = Number(e.target.value);
                    if (value > 0 && value !== q.points) {
                      setPoints.mutate({
                        questionId: q.id,
                        points: value === q.bankPoints ? null : value,
                      });
                    }
                  }}
                  className="w-20 rounded-lg bg-background-tertiary-default px-2 py-1.5 focus:outline-2 focus:outline-accent"
                />
                points
              </label>
              <IconButton
                label={`Move question ${i + 1} up`}
                disabled={busy || i === 0}
                onClick={() => move(i, -1)}
              >
                <RiArrowUpLine aria-hidden className="size-4" />
              </IconButton>
              <IconButton
                label={`Move question ${i + 1} down`}
                disabled={busy || i === draft.length - 1}
                onClick={() => move(i, 1)}
              >
                <RiArrowDownLine aria-hidden className="size-4" />
              </IconButton>
              {mine && (
                <Button variant="plain" disabled={busy} onClick={() => setPanel({ edit: mine })}>
                  Edit<span className="sr-only"> question {i + 1}</span>
                </Button>
              )}
              <Button variant="plain" disabled={busy} onClick={() => remove.mutate(q.id)}>
                Remove<span className="sr-only"> question {i + 1}</span>
              </Button>
            </li>
          );
        })}
      </ol>

      {panel === null && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button onClick={() => setPanel("write")}>
            <RiAddLine aria-hidden className="mr-1 -ml-0.5 size-4" />
            Write a question
          </Button>
          <Button variant="plain" onClick={() => setPanel("bank")}>
            Add from your bank
          </Button>
          <Link to="/app/bank" className="px-2 text-accent underline">
            Add many at once
          </Link>
        </div>
      )}
      {panel === "write" && (
        <QuestionEditor
          question={null}
          another
          onDone={() => setPanel(null)}
          onSaved={async (id) => {
            await add.mutateAsync({ questionId: id, position: nextPosition });
            toast.ok("Question added to the test.");
          }}
        />
      )}
      {panel === "bank" && (
        <BankPicker
          questions={available}
          empty={bank.data?.length === 0}
          busy={busy}
          onAdd={(id) => add.mutate({ questionId: id, position: nextPosition })}
          onClose={() => setPanel(null)}
        />
      )}
    </Card>
  );
}

function IconButton({
  label,
  children,
  ...button
}: { label: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...button}
      className="grid size-8 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text disabled:opacity-40"
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}

/** Questions already written, to add to this test one press at a time. */
function BankPicker({
  questions,
  empty,
  busy,
  onAdd,
  onClose,
}: {
  questions: BankQuestion[];
  empty: boolean;
  busy: boolean;
  onAdd: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = questions.filter((q) => {
    const text = `${q.prompt} ${q.tags.join(" ")}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
  return (
    <section
      aria-label="Add from your bank"
      className="space-y-3 rounded-2xl border border-accent/50 p-4"
    >
      <Field
        label="Search your bank"
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Words from the question, or a tag"
      />
      {shown.length === 0 && (
        <p className="text-text-muted">
          {empty
            ? "Your bank is empty. Write a question here, or add many at once."
            : questions.length === 0
              ? "Every question in your bank is already in this test."
              : "No question matches those words."}
        </p>
      )}
      <ul className="max-h-80 divide-y divide-border overflow-y-auto">
        {shown.map((q) => (
          <li key={q.id} className="flex items-center gap-3 py-2">
            <Button variant="plain" disabled={busy} onClick={() => onAdd(q.id)}>
              Add
            </Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-text">{q.prompt}</p>
              <p className="text-caption-1-regular text-text-muted">
                {TYPE_LABEL[q.type]}
                {q.tags.length > 0 && `, ${q.tags.join(", ")}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex justify-end">
        <Button variant="plain" onClick={onClose}>
          Done
        </Button>
      </div>
    </section>
  );
}

function ProctoringSettings({ test }: { test: TestRow }) {
  const update = useUpdateTest(test.id);
  // Local, so a click shows at once; saved in the background and put back if refused.
  const [p, setP] = useState(test.proctoring as Proctoring);
  const set = (patch: Partial<Proctoring>) => {
    const before = p;
    const next = { ...p, ...patch };
    setP(next);
    update.mutate({ proctoring: next }, { onError: () => setP(before) });
  };

  return (
    <Card title="Proctoring">
      <fieldset className="space-y-2">
        <legend className="text-body-medium text-text-primary">How closely to watch</legend>
        {(Object.keys(PRESETS) as Preset[]).map((preset) => (
          <label key={preset} className="flex items-start gap-2">
            <input
              type="radio"
              name="preset"
              checked={p.preset === preset}
              onChange={() => set({ preset })}
              className="mt-1"
            />
            <span>
              <span className="font-medium">{PRESETS[preset].label}</span>
              <span className="block text-sm text-text-muted">{PRESETS[preset].text}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-body-medium text-text-primary">Also require</legend>
        <Toggle
          checked={p.identity_check}
          onChange={(v) => set({ identity_check: v })}
          label="Check the student's face against their photo"
        />
        <Toggle
          checked={p.phone_required}
          onChange={(v) => set({ phone_required: v })}
          label="A phone as a side camera"
        />
        <Toggle
          checked={p.screen_share_required}
          onChange={(v) => set({ screen_share_required: v })}
          label="Sharing the whole screen"
        />
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-body-medium text-text-primary">Sound</legend>
        <Toggle
          checked={speaksWarnings(p)}
          onChange={(v) => set({ spoken_warnings: v })}
          label="Read the rules aloud at the start, and speak a short warning when something is flagged"
        />
      </fieldset>
      <div className="max-w-xs">
        <Select
          label="Camera snapshot every"
          value={p.snapshot_interval_s}
          onChange={(e) => set({ snapshot_interval_s: Number(e.target.value) })}
        >
          {SNAPSHOT_INTERVALS.map((s) => (
            <option key={s} value={s}>
              {s < 60 ? `${s} seconds` : `${s / 60} ${s === 60 ? "minute" : "minutes"}`}
            </option>
          ))}
        </Select>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-body-medium text-text-primary">Ending a test on its own</legend>
        <p className="text-body-regular text-text-muted">
          Off unless you turn it on. Camera checks never end a test by themselves; you review them.
        </p>
        <Toggle
          checked={p.auto_submit_screen_share_s !== null}
          onChange={(v) => set({ auto_submit_screen_share_s: v ? 60 : null })}
          label="Submit the test if screen sharing stays off for 1 minute"
          disabled={!p.screen_share_required}
        />
        <Toggle
          checked={p.auto_submit_phone_gone_min !== null}
          onChange={(v) => set({ auto_submit_phone_gone_min: v ? 2 : null })}
          label="Submit the test if the phone camera is gone for 2 minutes"
          disabled={!p.phone_required}
        />
      </fieldset>
    </Card>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center gap-2 ${disabled ? "text-text-muted" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function PublishedTest({ test }: { test: TestRow }) {
  const items = usePublishedItems(test.id, true);
  const unpublish = useUnpublish(test.id);
  const cancel = useCancelTest(test.id);
  const reopen = useReopenTest(test.id);
  const cancelled = test.status === "closed";
  return (
    <div className="space-y-6">
      <Header test={test} />
      <Card title={cancelled ? "Cancelled" : "Published"}>
        <p className="text-text-muted">
          {cancelled
            ? "No one can start this test. Attempts made before it was cancelled are kept."
            : `Open from ${formatWhen(test.opens_at)} to ${formatWhen(test.closes_at)}`}{" "}
          · {test.duration_min} minutes · {items.data?.length ?? "…"} questions
        </p>
        <div className="flex flex-wrap gap-4">
          <Link to={`/app/tests/${test.id}/live`} className="font-medium text-accent underline">
            Watch live
          </Link>
          <Link to={`/app/tests/${test.id}/review`} className="font-medium text-accent underline">
            Review flags
          </Link>
        </div>
        <Link
          to={`/app/tests/${test.id}/results`}
          className="inline-block font-medium text-accent underline"
        >
          Results and marking
        </Link>
      </Card>
      <Details test={test} />
      <Card title="Questions and proctoring">
        <p className="text-body-regular text-text-muted">
          These are fixed once a test is published. To change them, take the test back to a draft
          (only possible until a student starts it), or make a copy and publish that.
        </p>
        {!cancelled && (
          <Button
            variant="plain"
            onClick={() => unpublish.mutate(undefined)}
            disabled={unpublish.isPending}
          >
            Back to draft
          </Button>
        )}
      </Card>
      <Card title={cancelled ? "Reopen the test" : "Cancel the test"}>
        <p className="text-body-regular text-text-muted">
          {cancelled
            ? "Reopening publishes it again with the window above. Check the dates first."
            : "Calls the test off. No one can start it, and anyone taking it now is handed in as they stand. Attempts and results are kept, and you can reopen it."}
        </p>
        {cancelled ? (
          <Button
            variant="plain"
            onClick={() => reopen.mutate(undefined)}
            disabled={reopen.isPending}
          >
            Reopen this test
          </Button>
        ) : (
          <Confirm
            label="Cancel this test"
            question={`Cancel “${test.title}”? Students taking it right now are handed in at once.`}
            yes="Yes, cancel it"
            busy={cancel.isPending}
            onConfirm={() => cancel.mutate(undefined)}
          />
        )}
      </Card>
      <CopyOrDelete test={test} />
    </div>
  );
}
