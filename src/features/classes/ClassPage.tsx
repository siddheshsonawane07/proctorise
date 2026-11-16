import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button, Card, Field, Loading, Message, TextArea } from "../../app/ui/form";
import { Confirm } from "../../app/ui/Confirm";
import { Notice } from "../../app/ui/Notice";
import { messageFrom } from "../../lib/errors";
import { formatWhen, testWindow } from "../../lib/time";
import {
  TEST_STATUS_LABEL,
  useTeachingClasses,
  useAddCoTeacher,
  useClass,
  useClassTeachers,
  useClassTests,
  useCreateTest,
  useDeleteClass,
  useDeleteTest,
  useDuplicateTest,
  useLeaveClass,
  useRemoveCoTeacher,
  useRotateCode,
  useStopTeaching,
  useTransferClass,
  useUpdateClass,
  type ClassRow,
  type TestRow,
} from "./api";
import { useProfile } from "../auth/useProfile";
import { useMyAttempts, type MyAttempt } from "../attempt/api";
import { isTeacher } from "../auth/roles";
import { Roster } from "./Roster";
import { DeleteTest } from "./DeleteTest";

export function ClassPage() {
  const { classId = "" } = useParams();
  const cls = useClass(classId);
  const { data: profile } = useProfile();
  const teaching = useTeachingClasses(isTeacher(profile));

  if (cls.isPending || (isTeacher(profile) && teaching.isPending)) return <Loading />;
  if (cls.isError) return <Message kind="error">{messageFrom(cls.error)}</Message>;
  if (!cls.data) {
    return <Notice title="Class not found">It doesn't exist, or you're not in it.</Notice>;
  }
  const mine = teaching.data?.find((c) => c.id === classId);
  return mine ? (
    <TeacherClass cls={cls.data} owner={mine.kind === "owner"} />
  ) : (
    <StudentClass cls={cls.data} />
  );
}

function StudentClass({ cls }: { cls: ClassRow }) {
  const tests = useClassTests(cls.id);
  const leave = useLeaveClass();
  const navigate = useNavigate();
  const groups = {
    open: [] as TestRow[],
    upcoming: [] as TestRow[],
    closed: [] as TestRow[],
    cancelled: [] as TestRow[],
  };
  for (const test of tests.data ?? []) {
    groups[test.status === "closed" ? "cancelled" : testWindow(test.opens_at, test.closes_at)].push(
      test,
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{cls.name}</h1>
        {cls.description && <p className="mt-1 text-text-muted">{cls.description}</p>}
      </div>
      {tests.isPending && <Loading />}
      {tests.data?.length === 0 && <p className="text-text-muted">No tests yet.</p>}
      <TestGroup title="Open now" tests={groups.open} />
      <TestGroup title="Coming up" tests={groups.upcoming} />
      <TestGroup title="Closed" tests={groups.closed} />
      <TestGroup title="Cancelled by your teacher" tests={groups.cancelled} />
      <Card title="Leave this class">
        <p className="text-sm text-text-muted">
          You'll stop seeing this class and its tests. Your teacher keeps the results of tests
          you've taken. You can join again with the class code.
        </p>
        {leave.isError && <Message kind="error">{messageFrom(leave.error)}</Message>}
        <Confirm
          label="Leave this class"
          question={`Leave ${cls.name}?`}
          yes="Yes, leave"
          busy={leave.isPending}
          onConfirm={() => leave.mutate(cls.id, { onSuccess: () => navigate("/app") })}
        />
      </Card>
    </div>
  );
}

function TestGroup({ title, tests }: { title: string; tests: TestRow[] }) {
  const attempts = useMyAttempts();
  if (tests.length === 0) return null;
  return (
    <Card title={title}>
      <ul className="divide-y divide-border">
        {tests.map((test) => (
          <li key={test.id} className="py-2">
            <p className="font-medium">{test.title}</p>
            <p className="text-sm text-text-muted">
              {formatWhen(test.opens_at)} to {formatWhen(test.closes_at)} · {test.duration_min}{" "}
              minutes
            </p>
            <TestAction
              test={test}
              attempts={(attempts.data ?? []).filter((a) => a.test_id === test.id)}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TestAction({ test, attempts }: { test: TestRow; attempts: MyAttempt[] }) {
  const open = attempts.find((a) => a.status === "in_progress");
  const done = attempts.filter((a) => a.status !== "in_progress");
  const canStart =
    test.status === "published" &&
    testWindow(test.opens_at, test.closes_at) === "open" &&
    attempts.length < test.max_attempts;
  return (
    <div className="mt-1 flex flex-wrap gap-3 text-sm">
      {(open || canStart) && (
        <Link to={`/app/take/${test.id}`} className="font-medium text-accent underline">
          {open ? "Continue" : done.length ? "Try again" : "Start"}
        </Link>
      )}
      {done.map((a) => (
        <Link key={a.id} to={`/app/results/${a.id}`} className="text-accent underline">
          {done.length > 1 ? `Result of attempt ${a.attempt_no}` : "Your result"}
        </Link>
      ))}
    </div>
  );
}

type Tab = "tests" | "students" | "teachers" | "settings";

function TeacherClass({ cls, owner }: { cls: ClassRow; owner: boolean }) {
  const [tab, setTab] = useState<Tab>("tests");
  const tabs: { id: Tab; label: string }[] = [
    { id: "tests", label: "Tests" },
    { id: "students", label: "Students" },
    { id: "teachers", label: "Teachers" },
    { id: "settings", label: "Settings" },
  ];
  return (
    <div>
      <h1 className="text-title-1-bold tracking-tight text-text">{cls.name}</h1>
      {cls.description && <p className="mt-1 text-text-muted">{cls.description}</p>}
      <p className="mt-1 text-text-muted">
        Join code:{" "}
        <strong className="rounded-md bg-surface-muted px-2 py-0.5 font-mono tracking-wider text-text">
          {cls.join_code}
        </strong>
        {!cls.join_open && " (joining is closed)"}
      </p>
      <div
        role="tablist"
        aria-label="Class"
        className="mt-5 flex flex-wrap gap-1 border-b border-border"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-body-medium ${
              tab === t.id
                ? "border-accent text-accent"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-6">
        {tab === "tests" && <TeacherTests classId={cls.id} />}
        {tab === "students" && <Roster classId={cls.id} />}
        {tab === "teachers" && <Teachers classId={cls.id} owner={owner} />}
        {tab === "settings" && <Settings cls={cls} owner={owner} />}
      </div>
    </div>
  );
}

function TeacherTests({ classId }: { classId: string }) {
  const tests = useClassTests(classId);
  const create = useCreateTest(classId);
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <Button
        onClick={() =>
          create.mutate(undefined, {
            onSuccess: (t) => navigate(`/app/tests/${t.id}/edit`),
          })
        }
        disabled={create.isPending}
      >
        New test
      </Button>
      {create.isError && <Message kind="error">{messageFrom(create.error)}</Message>}
      {tests.isPending && <Loading />}
      {tests.data?.length === 0 && <p className="text-text-muted">No tests yet.</p>}
      <ul className="divide-y divide-border">
        {tests.data?.map((test) => (
          <TeacherTest key={test.id} test={test} />
        ))}
      </ul>
    </div>
  );
}

function TeacherTest({ test }: { test: TestRow }) {
  const remove = useDeleteTest(test.class_id);
  const copy = useDuplicateTest(test.class_id);
  const navigate = useNavigate();
  const error = remove.error ?? copy.error;
  return (
    <li className="space-y-2 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to={`/app/tests/${test.id}/edit`} className="font-medium text-accent">
            {test.title}
          </Link>
          <p className="text-sm text-text-muted">
            {TEST_STATUS_LABEL[test.status]} · {formatWhen(test.opens_at)} to{" "}
            {formatWhen(test.closes_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {test.status !== "draft" && (
            <Link to={`/app/tests/${test.id}/results`} className="px-2 text-accent underline">
              Results
            </Link>
          )}
          <Button
            variant="plain"
            disabled={copy.isPending}
            onClick={() =>
              copy.mutate(test.id, { onSuccess: (id) => navigate(`/app/tests/${id}/edit`) })
            }
          >
            Copy
          </Button>
          <DeleteTest
            test={test}
            busy={remove.isPending}
            onConfirm={() => remove.mutate(test.id)}
          />
        </div>
      </div>
      {error && <Message kind="error">{messageFrom(error)}</Message>}
    </li>
  );
}

function Teachers({ classId, owner }: { classId: string; owner: boolean }) {
  const teachers = useClassTeachers(classId, true);
  const add = useAddCoTeacher(classId);
  const remove = useRemoveCoTeacher(classId);
  const stop = useStopTeaching();
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    add.mutate(String(new FormData(form).get("email")), { onSuccess: () => form.reset() });
  }

  return (
    <div className="space-y-4">
      {teachers.isPending && <Loading />}
      <ul className="divide-y divide-border">
        {teachers.data?.map((t) => (
          <li key={t.teacher_id} className="flex items-center justify-between py-2">
            <span>
              {t.full_name || t.email}{" "}
              <span className="text-sm text-text-muted">
                {t.kind === "owner" ? "Owner" : "Co-teacher"}
              </span>
            </span>
            {owner && t.kind === "co_teacher" && (
              <Button
                variant="plain"
                disabled={remove.isPending}
                onClick={() => remove.mutate(t.teacher_id)}
              >
                Remove
              </Button>
            )}
          </li>
        ))}
      </ul>
      {owner ? (
        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <div className="flex-1">
            <Field
              label="Add a co-teacher"
              name="email"
              type="email"
              required
              hint="They need an approved teacher account."
            />
          </div>
          <Button type="submit" disabled={add.isPending}>
            Add
          </Button>
        </form>
      ) : (
        <>
          <p className="text-sm text-text-muted">Only the owner can add or remove teachers.</p>
          <Confirm
            label="Leave this class"
            question="Stop teaching this class? Its tests and results stay with the other teachers."
            yes="Yes, leave"
            busy={stop.isPending}
            onConfirm={() =>
              profile &&
              stop.mutate({ classId, teacherId: profile.id }, { onSuccess: () => navigate("/app") })
            }
          />
        </>
      )}
      {add.isError && <Message kind="error">{messageFrom(add.error)}</Message>}
      {remove.isError && <Message kind="error">{messageFrom(remove.error)}</Message>}
      {stop.isError && <Message kind="error">{messageFrom(stop.error)}</Message>}
    </div>
  );
}

function Settings({ cls, owner }: { cls: ClassRow; owner: boolean }) {
  const update = useUpdateClass(cls.id);
  const rotate = useRotateCode(cls.id);
  const [saved, setSaved] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setSaved(false);
    update.mutate(
      { name: String(f.get("name")).trim(), description: String(f.get("description")).trim() },
      { onSuccess: () => setSaved(true) },
    );
  }

  return (
    <div className="space-y-4">
      <Card title="Name and description">
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="Class name" name="name" defaultValue={cls.name} required maxLength={120} />
          <TextArea
            label="Description for students (optional)"
            name="description"
            defaultValue={cls.description}
            maxLength={500}
          />
          {saved && <Message kind="ok">Saved.</Message>}
          <Button type="submit" disabled={update.isPending}>
            Save
          </Button>
        </form>
      </Card>
      <Card title="Joining">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={cls.join_open}
            disabled={update.isPending}
            onChange={(e) => update.mutate({ join_open: e.target.checked })}
          />
          <span>Students can join with the code</span>
        </label>
        <p className="text-sm text-text-muted">
          Turn this off once everyone has joined, so the code can't be passed on.
        </p>
        <Button
          variant="plain"
          onClick={() => rotate.mutate(undefined)}
          disabled={rotate.isPending}
        >
          Make a new code
        </Button>
      </Card>
      <Card title="Archive">
        <p className="text-sm text-text-muted">
          An archived class keeps its tests and results, and no one new can join.
        </p>
        <Button
          variant="plain"
          disabled={update.isPending}
          onClick={() =>
            update.mutate({ archived_at: cls.archived_at ? null : new Date().toISOString() })
          }
        >
          {cls.archived_at ? "Restore class" : "Archive class"}
        </Button>
      </Card>
      {(update.isError || rotate.isError) && (
        <Message kind="error">{messageFrom(update.error ?? rotate.error)}</Message>
      )}
      {owner && <HandOver cls={cls} />}
      {owner && <DeleteClass cls={cls} />}
    </div>
  );
}

function HandOver({ cls }: { cls: ClassRow }) {
  const transfer = useTransferClass();
  const [email, setEmail] = useState("");
  return (
    <Card title="Hand over this class">
      <p className="text-sm text-text-muted">
        Make another approved teacher the owner. You stay on as a co-teacher.
      </p>
      <Field
        label="New owner's email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {transfer.isError && <Message kind="error">{messageFrom(transfer.error)}</Message>}
      {transfer.isSuccess && <Message kind="ok">Handed over. You are now a co-teacher.</Message>}
      <Confirm
        label="Hand over"
        question={`Make ${email.trim()} the owner of ${cls.name}? Only they will be able to add teachers or delete it.`}
        yes="Yes, hand it over"
        disabled={email.trim() === ""}
        busy={transfer.isPending}
        onConfirm={() => transfer.mutate({ classId: cls.id, email })}
      />
    </Card>
  );
}

function DeleteClass({ cls }: { cls: ClassRow }) {
  const remove = useDeleteClass();
  const navigate = useNavigate();
  return (
    <Card title="Delete this class">
      <p className="text-sm text-text-muted">
        Deletes the class with every test in it, and every student's answers, results and pictures.
        This can't be undone. To keep the results and only stop new students joining, archive it
        instead.
      </p>
      {remove.isError && <Message kind="error">{messageFrom(remove.error)}</Message>}
      <Confirm
        label="Delete this class"
        question={`Delete ${cls.name} and everything in it, for good?`}
        phrase={cls.name}
        yes="Delete the class"
        busy={remove.isPending}
        onConfirm={() => remove.mutate(cls.id, { onSuccess: () => navigate("/app") })}
      />
    </Card>
  );
}
