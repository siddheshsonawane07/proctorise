import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { Button, Card, Field, Loading, Message, TextArea } from "../../app/ui/form";
import { Notice } from "../../app/ui/Notice";
import { messageFrom } from "../../lib/errors";
import { MAX_LIVE_STUDENTS } from "../../lib/limits";
import { formatWhen, fromLocalInput, toLocalInput } from "../../lib/time";
import { useBank } from "../bank/api";
import { TYPE_LABEL } from "../bank/question";
import type { TestRow } from "../classes/api";
import {
  useAddQuestion,
  useDraftQuestions,
  usePublish,
  usePublishedItems,
  useRemoveQuestion,
  useReorder,
  useSetPoints,
  useTest,
  useUnpublish,
  useUpdateTest,
  type DraftQuestion,
} from "./api";
import { PRESETS, SNAPSHOT_INTERVALS, type Preset, type Proctoring } from "./proctoring";

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
        <h1 className="mt-1 text-2xl font-semibold">{test.title}</h1>
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
      <Details test={test} />
      <Questions testId={test.id} draft={draft.data ?? []} loading={draft.isPending} />
      <ProctoringSettings test={test} />
      <Card title="Publish">
        <p className="text-text-muted">
          Publishing freezes the questions: editing your bank afterwards won't change this test.
          Students in the class see it at once, and can start it from {formatWhen(test.opens_at)}.
        </p>
        <p className="text-sm text-text-muted">
          On the free plan, about {MAX_LIVE_STUDENTS} students can take a test at the same time.
        </p>
        {publish.isError && <Message kind="error">{messageFrom(publish.error)}</Message>}
        <Button onClick={() => publish.mutate(undefined)} disabled={publish.isPending}>
          Publish to the class
        </Button>
      </Card>
    </div>
  );
}

function Details({ test }: { test: TestRow }) {
  const update = useUpdateTest(test.id);
  const [saved, setSaved] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setSaved(false);
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
      { onSuccess: () => setSaved(true) },
    );
  }

  return (
    <Card title="Details">
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
          <Select
            label="Results"
            name="results_release"
            defaultValue={test.results_release}
            options={[
              ["manual", "When I release them"],
              ["after_close", "When the test closes"],
              ["immediate", "As soon as each student submits"],
            ]}
          />
          <Select
            label="Keep camera snapshots for"
            name="retention_days"
            defaultValue={String(test.retention_days)}
            options={[
              ["7", "7 days"],
              ["30", "30 days"],
              ["90", "90 days"],
            ]}
          />
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
        {update.isError && <Message kind="error">{messageFrom(update.error)}</Message>}
        {saved && <Message kind="ok">Saved.</Message>}
        <Button type="submit" disabled={update.isPending}>
          Save details
        </Button>
      </form>
    </Card>
  );
}

function Select({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: [string, string][];
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2"
      >
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
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
  const inTest = new Set(draft.map((q) => q.id));
  const available = (bank.data ?? []).filter((q) => !inTest.has(q.id));
  const busy = add.isPending || remove.isPending || reorder.isPending || setPoints.isPending;
  const error = add.error ?? remove.error ?? reorder.error ?? setPoints.error;
  const total = draft.reduce((sum, q) => sum + q.points, 0);

  function move(index: number, by: number) {
    const ids = draft.map((q) => q.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + by, 0, moved!);
    reorder.mutate(ids);
  }

  return (
    <Card title={`Questions (${draft.length}, ${total} points)`}>
      {loading && <Loading />}
      {error && <Message kind="error">{messageFrom(error)}</Message>}
      {draft.length === 0 && !loading && (
        <p className="text-text-muted">Add questions from your bank below.</p>
      )}
      <ol className="space-y-2">
        {draft.map((q, i) => (
          <li
            key={q.id}
            className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3"
          >
            <span className="w-6 text-text-muted">{i + 1}.</span>
            <span className="min-w-0 flex-1 truncate">{q.prompt}</span>
            <label className="flex items-center gap-1 text-sm">
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
                className="w-20 rounded border border-border bg-surface px-2 py-1"
              />
              points
            </label>
            <Button variant="plain" disabled={busy || i === 0} onClick={() => move(i, -1)}>
              <span aria-hidden>↑</span>
              <span className="sr-only">Move question {i + 1} up</span>
            </Button>
            <Button
              variant="plain"
              disabled={busy || i === draft.length - 1}
              onClick={() => move(i, 1)}
            >
              <span aria-hidden>↓</span>
              <span className="sr-only">Move question {i + 1} down</span>
            </Button>
            <Button variant="plain" disabled={busy} onClick={() => remove.mutate(q.id)}>
              Remove
            </Button>
          </li>
        ))}
      </ol>

      <h3 className="pt-2 font-medium">From your bank</h3>
      {bank.isPending && <Loading />}
      {bank.data?.length === 0 && (
        <p className="text-text-muted">
          Your bank is empty.{" "}
          <Link to="/app/bank" className="text-accent underline">
            Write some questions
          </Link>
          .
        </p>
      )}
      <ul className="space-y-2">
        {available.map((q) => (
          <li key={q.id} className="flex items-center gap-2">
            <Button
              variant="plain"
              disabled={busy}
              onClick={() => add.mutate({ questionId: q.id, position: draft.length })}
            >
              Add
            </Button>
            <span className="min-w-0 flex-1 truncate">{q.prompt}</span>
            <span className="text-sm text-text-muted">{TYPE_LABEL[q.type]}</span>
          </li>
        ))}
      </ul>
    </Card>
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
        <legend className="text-sm font-medium">How closely to watch</legend>
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
        <legend className="text-sm font-medium">Also require</legend>
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
      <label className="block">
        <span className="text-sm font-medium">Camera snapshot every</span>
        <select
          value={p.snapshot_interval_s}
          onChange={(e) => set({ snapshot_interval_s: Number(e.target.value) })}
          className="mt-1 block rounded-md border border-border bg-surface px-3 py-2"
        >
          {SNAPSHOT_INTERVALS.map((s) => (
            <option key={s} value={s}>
              {s < 60 ? `${s} seconds` : `${s / 60} ${s === 60 ? "minute" : "minutes"}`}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Ending a test on its own</legend>
        <p className="text-sm text-text-muted">
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
      {update.isError && <Message kind="error">{messageFrom(update.error)}</Message>}
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
  return (
    <div className="space-y-6">
      <Header test={test} />
      <Card title="Published">
        <p className="text-text-muted">
          Open from {formatWhen(test.opens_at)} to {formatWhen(test.closes_at)} ·{" "}
          {test.duration_min} minutes · {items.data?.length ?? "…"} questions
        </p>
        <Link
          to={`/app/tests/${test.id}/results`}
          className="inline-block font-medium text-accent underline"
        >
          Results and marking
        </Link>
        <p className="text-sm text-text-muted">
          To change it, take it back to a draft. That's only possible until a student starts it.
        </p>
        {unpublish.isError && <Message kind="error">{messageFrom(unpublish.error)}</Message>}
        <Button
          variant="plain"
          onClick={() => unpublish.mutate(undefined)}
          disabled={unpublish.isPending}
        >
          Back to draft
        </Button>
      </Card>
    </div>
  );
}
