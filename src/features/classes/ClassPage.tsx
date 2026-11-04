import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button, Card, Field, Loading, Message } from "../../app/ui/form";
import { Notice } from "../../app/ui/Notice";
import { messageFrom } from "../../lib/errors";
import { formatWhen, testWindow } from "../../lib/time";
import {
  useTeachingClasses,
  useAddCoTeacher,
  useClass,
  useClassTeachers,
  useClassTests,
  useCreateTest,
  useRemoveCoTeacher,
  useRotateCode,
  useRoster,
  useSetMember,
  useUpdateClass,
  type ClassRow,
  type TestRow,
} from "./api";
import { useProfile } from "../auth/useProfile";
import { useMyAttempts, type MyAttempt } from "../attempt/api";
import { isTeacher } from "../auth/roles";

const MULTIPLIERS = [1, 1.25, 1.5, 2];

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
  const groups = { open: [] as TestRow[], upcoming: [] as TestRow[], closed: [] as TestRow[] };
  for (const test of tests.data ?? []) groups[testWindow(test.opens_at, test.closes_at)].push(test);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{cls.name}</h1>
      {tests.isPending && <Loading />}
      {tests.data?.length === 0 && <p className="text-text-muted">No tests yet.</p>}
      <TestGroup title="Open now" tests={groups.open} />
      <TestGroup title="Coming up" tests={groups.upcoming} />
      <TestGroup title="Closed" tests={groups.closed} />
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
    testWindow(test.opens_at, test.closes_at) === "open" && attempts.length < test.max_attempts;
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
      <h1 className="text-2xl font-semibold">{cls.name}</h1>
      <p className="mt-1 text-text-muted">
        Join code: <strong className="font-mono text-text">{cls.join_code}</strong>
        {!cls.join_open && " (joining is closed)"}
      </p>
      <div role="tablist" aria-label="Class" className="mt-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === t.id ? "bg-accent text-accent-text" : "border border-border"
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
        {tab === "settings" && <Settings cls={cls} />}
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<TestRow["status"], string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
};

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
          <li key={test.id} className="flex items-center justify-between py-2">
            <div>
              <Link to={`/app/tests/${test.id}/edit`} className="font-medium text-accent">
                {test.title}
              </Link>
              <p className="text-sm text-text-muted">
                {STATUS_LABEL[test.status]} · opens {formatWhen(test.opens_at)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Roster({ classId }: { classId: string }) {
  const roster = useRoster(classId, true);
  const setMember = useSetMember(classId);

  function downloadCsv() {
    const rows = [["Name", "Email", "Status", "Extra time", "Joined"]];
    for (const r of roster.data ?? []) {
      rows.push([r.full_name, r.email, r.status, `${r.time_multiplier}x`, r.joined_at]);
    }
    const csv = rows
      .map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "students.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (roster.isPending) return <Loading />;
  if (roster.isError) return <Message kind="error">{messageFrom(roster.error)}</Message>;
  if (roster.data.length === 0) {
    return <p className="text-text-muted">No students yet. Share the join code with your class.</p>;
  }
  return (
    <div className="space-y-4">
      <Button variant="plain" onClick={downloadCsv}>
        Download as CSV
      </Button>
      {setMember.isError && <Message kind="error">{messageFrom(setMember.error)}</Message>}
      <table className="w-full text-left text-sm">
        <thead className="text-text-muted">
          <tr>
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 font-medium">Email</th>
            <th className="py-2 font-medium">Extra time</th>
            <th className="py-2 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {roster.data.map((r) => (
            <tr key={r.student_id} className={r.status === "removed" ? "text-text-muted" : ""}>
              <td className="py-2">{r.full_name || "—"}</td>
              <td className="py-2">{r.email}</td>
              <td className="py-2">
                <label>
                  <span className="sr-only">Extra time for {r.full_name}</span>
                  <select
                    value={Number(r.time_multiplier)}
                    disabled={r.status === "removed" || setMember.isPending}
                    onChange={(e) =>
                      setMember.mutate({
                        studentId: r.student_id,
                        status: r.status,
                        timeMultiplier: Number(e.target.value),
                      })
                    }
                    className="rounded border border-border bg-surface px-2 py-1"
                  >
                    {MULTIPLIERS.map((m) => (
                      <option key={m} value={m}>
                        {m === 1 ? "None" : `${m}× time`}
                      </option>
                    ))}
                  </select>
                </label>
              </td>
              <td className="py-2 text-right">
                <Button
                  variant="plain"
                  disabled={setMember.isPending}
                  onClick={() =>
                    setMember.mutate({
                      studentId: r.student_id,
                      status: r.status === "active" ? "removed" : "active",
                      timeMultiplier: Number(r.time_multiplier),
                    })
                  }
                >
                  {r.status === "active" ? "Remove" : "Add back"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Teachers({ classId, owner }: { classId: string; owner: boolean }) {
  const teachers = useClassTeachers(classId, true);
  const add = useAddCoTeacher(classId);
  const remove = useRemoveCoTeacher(classId);

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
        <p className="text-sm text-text-muted">Only the owner can add or remove teachers.</p>
      )}
      {add.isError && <Message kind="error">{messageFrom(add.error)}</Message>}
      {remove.isError && <Message kind="error">{messageFrom(remove.error)}</Message>}
    </div>
  );
}

function Settings({ cls }: { cls: ClassRow }) {
  const update = useUpdateClass(cls.id);
  const rotate = useRotateCode(cls.id);
  return (
    <div className="space-y-4">
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
    </div>
  );
}
