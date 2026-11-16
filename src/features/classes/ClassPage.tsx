import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { RiAddLine } from "@remixicon/react";
import { Button, Card, Field, Loading, Message, TextArea } from "../../app/ui/form";
import { buttonClass } from "../../app/ui/buttonClass";
import { Confirm } from "../../app/ui/Confirm";
import { Notice } from "../../app/ui/Notice";
import { toast } from "../../app/ui/toast";
import { messageFrom } from "../../lib/errors";
import { formatWhen, testWindow } from "../../lib/time";
import {
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
import { ClassCode } from "./ClassCode";
import { classBand } from "./colour";

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
      <Banner cls={cls} />
      {tests.isPending && <Loading />}
      {tests.data?.length === 0 && <p className="text-text-muted">No tests yet.</p>}
      <TestGroup title="Open now" tests={groups.open} />
      <TestGroup title="Coming up" tests={groups.upcoming} />
      <TestGroup title="Closed" tests={groups.closed} />
      <TestGroup title="Cancelled by your teacher" tests={groups.cancelled} />
      <Card title="Leave this class">
        <p className="text-body-regular text-text-muted">
          You'll stop seeing this class and its tests. Your teacher keeps the results of tests
          you've taken. You can join again with the class code.
        </p>
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
          <li key={test.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="text-body-medium text-text">{test.title}</p>
              <p className="text-body-regular text-text-muted">
                {formatWhen(test.opens_at)} to {formatWhen(test.closes_at)}, {test.duration_min}{" "}
                minutes
              </p>
            </div>
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
    <div className="flex flex-wrap items-center gap-3">
      {(open || canStart) && (
        <Link to={`/app/take/${test.id}`} className={buttonClass("primary")}>
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

/** The top of a class page, in the class's colour. */
function Banner({ cls, children }: { cls: ClassRow; children?: ReactNode }) {
  return (
    <div className={`${classBand(cls.id)} rounded-2xl px-5 py-6 text-white sm:px-7`}>
      <h1 className="text-title-1-bold tracking-tight text-white">{cls.name}</h1>
      {cls.description && <p className="mt-1 max-w-2xl text-white">{cls.description}</p>}
      {children}
    </div>
  );
}

const TABS = [
  { id: "tests", label: "Tests" },
  { id: "people", label: "People" },
  { id: "settings", label: "Settings" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function TeacherClass({ cls, owner }: { cls: ClassRow; owner: boolean }) {
  // The tab is in the address, so Back and a shared link both land on it.
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.find((t) => t.id === params.get("tab"))?.id ?? "tests";
  return (
    <div>
      <Banner cls={cls}>
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
          <ClassCode code={cls.join_code} onBand />
          {!cls.join_open && <span className="text-white">Joining is closed</span>}
          {cls.archived_at && <span className="text-white">Archived</span>}
        </p>
      </Banner>
      <div role="tablist" aria-label="Class" className="mt-4 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setParams(t.id === "tests" ? {} : { tab: t.id }, { replace: true })}
            className={`-mb-px border-b-2 px-4 py-2.5 text-body-medium ${
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
        {tab === "people" && (
          <div className="space-y-8">
            <section aria-labelledby="teachers-title" className="space-y-3">
              <h2 id="teachers-title" className="text-title-3-semibold text-text">
                Teachers
              </h2>
              <Teachers classId={cls.id} owner={owner} />
            </section>
            <section aria-labelledby="students-title" className="space-y-3">
              <h2 id="students-title" className="text-title-3-semibold text-text">
                Students
              </h2>
              <Roster classId={cls.id} />
            </section>
          </div>
        )}
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
        <RiAddLine aria-hidden className="mr-1 -ml-0.5 size-4" />
        New test
      </Button>
      {tests.isPending && <Loading />}
      {tests.data?.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border px-5 py-8 text-center text-text-muted">
          No tests yet. A new test starts as a draft: add its questions, then publish it to the
          class.
        </p>
      )}
      <ul className="space-y-3">
        {tests.data?.map((test) => (
          <TeacherTest key={test.id} test={test} />
        ))}
      </ul>
    </div>
  );
}

/** Where a test stands, in a word. The word carries it; the colour only helps. */
function testState(test: TestRow): { label: string; className: string } {
  const quiet = "bg-surface-muted text-text-muted";
  if (test.status === "draft") return { label: "Draft", className: quiet };
  if (test.status === "closed") return { label: "Cancelled", className: quiet };
  const window = testWindow(test.opens_at, test.closes_at);
  if (window === "open") return { label: "Open now", className: "bg-accent/10 text-accent" };
  if (window === "upcoming") return { label: "Scheduled", className: "bg-info/10 text-info" };
  return { label: "Closed", className: quiet };
}

function TeacherTest({ test }: { test: TestRow }) {
  const remove = useDeleteTest(test.class_id);
  const copy = useDuplicateTest(test.class_id);
  const navigate = useNavigate();
  const state = testState(test);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2">
          <Link to={`/app/tests/${test.id}/edit`} className="text-body-semibold text-accent">
            {test.title}
          </Link>
          <span className={`rounded-full px-2 py-0.5 text-caption-1-semibold ${state.className}`}>
            {state.label}
          </span>
        </p>
        <p className="mt-0.5 text-body-regular text-text-muted">
          {formatWhen(test.opens_at)} to {formatWhen(test.closes_at)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {state.label === "Open now" && (
          <Link to={`/app/tests/${test.id}/live`} className={buttonClass("plain")}>
            Watch live
          </Link>
        )}
        {test.status !== "draft" && (
          <Link to={`/app/tests/${test.id}/results`} className={buttonClass("plain")}>
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
        <DeleteTest test={test} busy={remove.isPending} onConfirm={() => remove.mutate(test.id)} />
      </div>
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
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-xs">
      {teachers.isPending && <Loading />}
      <ul className="divide-y divide-border">
        {teachers.data?.map((t) => (
          <li key={t.teacher_id} className="flex items-center justify-between py-2">
            <span>
              {t.full_name || t.email}{" "}
              <span className="ml-1 text-body-regular text-text-muted">
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
          <p className="text-body-regular text-text-muted">
            Only the owner can add or remove teachers.
          </p>
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
    </div>
  );
}

function Settings({ cls, owner }: { cls: ClassRow; owner: boolean }) {
  const update = useUpdateClass(cls.id);
  const rotate = useRotateCode(cls.id);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    update.mutate(
      { name: String(f.get("name")).trim(), description: String(f.get("description")).trim() },
      { onSuccess: () => toast.ok("Saved.") },
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
            onChange={(e) => {
              const open = e.target.checked;
              update.mutate(
                { join_open: open },
                {
                  onSuccess: () =>
                    toast.ok(open ? "Students can join with the code." : "Joining is closed."),
                },
              );
            }}
          />
          <span>Students can join with the code</span>
        </label>
        <p className="text-body-regular text-text-muted">
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
        <p className="text-body-regular text-text-muted">
          An archived class keeps its tests and results, and no one new can join.
        </p>
        <Button
          variant="plain"
          disabled={update.isPending}
          onClick={() =>
            update.mutate(
              { archived_at: cls.archived_at ? null : new Date().toISOString() },
              {
                onSuccess: () => toast.ok(cls.archived_at ? "Class restored." : "Class archived."),
              },
            )
          }
        >
          {cls.archived_at ? "Restore class" : "Archive class"}
        </Button>
      </Card>
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
      <p className="text-body-regular text-text-muted">
        Make another approved teacher the owner. You stay on as a co-teacher.
      </p>
      <Field
        label="New owner's email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
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
      <p className="text-body-regular text-text-muted">
        Deletes the class with every test in it, and every student's answers, results and pictures.
        This can't be undone. To keep the results and only stop new students joining, archive it
        instead.
      </p>
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
