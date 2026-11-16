import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { RiAddLine } from "@remixicon/react";
import { BecomeTeacher } from "../../features/account/BecomeTeacher";
import { useProfile } from "../../features/auth/useProfile";
import { isAdmin, isTeacher } from "../../features/auth/roles";
import { useView } from "../../features/auth/view";
import { ViewSwitch } from "../../features/auth/ViewSwitch";
import { useMyAttempts } from "../../features/attempt/api";
import {
  useCreateClass,
  useJoinClass,
  useJoinedClasses,
  useTeachingClasses,
  type CardTest,
  type JoinResult,
} from "../../features/classes/api";
import { ClassArt } from "../../features/classes/ClassArt";
import { ClassCode } from "../../features/classes/ClassCode";
import { classBand } from "../../features/classes/colour";
import { formatWhen, testWindow } from "../../lib/time";
import { buttonClass } from "../ui/buttonClass";
import { Dialog } from "../ui/Dialog";
import { Button, Field, Loading, TextArea } from "../ui/form";
import { toast } from "../ui/toast";

const JOIN_REASONS: Record<Exclude<JoinResult, { joined: true }>["reason"], string> = {
  no_match: "That code didn't match an open class. Check it with your teacher.",
  too_many: "Too many wrong codes. Try again in an hour.",
  removed: "Your teacher removed you from this class. Ask them to add you back.",
  teacher: "You teach this class, so you can't join it as a student.",
};

/** One home per role: the admin's, a teacher's, or a student's. Never two at once. */
export function AppHome() {
  const { data: profile } = useProfile();
  const view = useView(profile);
  if (!profile) return null; // RequireAuth renders this only once the profile has loaded.
  if (isAdmin(profile)) return <AdminHome />;
  return view === "teacher" ? (
    <TeacherHome />
  ) : (
    <>
      <StudentHome teacher={isTeacher(profile)} />
      {profile.role === "student" && (
        <div className="mt-10 max-w-xl">
          <BecomeTeacher profile={profile} />
        </div>
      )}
    </>
  );
}

function PageHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-title-1-bold tracking-tight text-text">{title}</h1>
      {children}
    </div>
  );
}

/** The sidebar holds the switch on a wide screen; on a narrow one it is here. */
function Switching({ children }: { children: string }) {
  return (
    <div className="mt-2 space-y-3">
      <p className="text-text-muted">{children}</p>
      <ViewSwitch className="max-w-xs lg:hidden" />
    </div>
  );
}

const ADMIN_PAGES = [
  {
    to: "/app/admin/teachers",
    title: "Teachers",
    text: "Approve or decline requests for teacher access, and pause a teacher.",
  },
  {
    to: "/app/admin/classes",
    title: "Classes",
    text: "Every class on the site. Hand one to another teacher, or delete it.",
  },
  {
    to: "/app/admin/usage",
    title: "Usage",
    text: "Database, file storage and activity against the free plan.",
  },
];

function AdminHome() {
  return (
    <div className="space-y-6">
      <PageHead title="Admin" />
      <p className="text-text-muted">
        This is the admin account. It looks after the site and doesn't teach or take tests; use a
        separate account for those.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {ADMIN_PAGES.map((page) => (
          <Link
            key={page.to}
            to={page.to}
            className="rounded-2xl border border-border-table bg-background-primary-default p-5 no-underline shadow-xs hover:border-accent"
          >
            <span className="text-headline-semibold text-accent">{page.title}</span>
            <span className="mt-1 block text-body-regular text-text-muted">{page.text}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** One line about a class's tests: what is open, else what is next, else what is unfinished. */
function testLine(tests: CardTest[]): string {
  const live = tests.filter((t) => t.status === "published");
  const open = live.filter((t) => testWindow(t.opens_at, t.closes_at) === "open");
  if (open.length === 1) return `Open now: ${open[0]!.title}`;
  if (open.length > 1) return `${open.length} tests open now`;
  const next = live
    .filter((t) => testWindow(t.opens_at, t.closes_at) === "upcoming")
    .sort((a, b) => a.opens_at.localeCompare(b.opens_at))[0];
  if (next) return `Next test: ${next.title}, ${formatWhen(next.opens_at)}`;
  const drafts = tests.filter((t) => t.status === "draft").length;
  if (drafts > 0) return `${count(drafts, "draft")}, not published yet`;
  return tests.length === 0 ? "No tests yet" : "No tests coming up";
}

function ClassCard({
  id,
  name,
  note,
  children,
  footer,
}: {
  id: string;
  name: string;
  note?: string | undefined;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xs transition-shadow hover:shadow-md">
      <Link
        to={`/app/classes/${id}`}
        className={`${classBand(id)} relative flex h-28 flex-col justify-end overflow-hidden px-4 py-3 text-white no-underline hover:underline focus-visible:outline-offset-[-3px] focus-visible:outline-white`}
      >
        <ClassArt classId={id} />
        <span className="relative line-clamp-2 text-headline-semibold">{name}</span>
        {note && <span className="relative text-caption-1-regular text-white">{note}</span>}
      </Link>
      <div className="flex-1 space-y-1 px-4 py-3 text-body-regular text-text">{children}</div>
      {footer && (
        <div className="border-t border-border px-4 py-1.5 text-body-regular">{footer}</div>
      )}
    </li>
  );
}

const GRID = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3";

function TeacherHome() {
  const classes = useTeachingClasses(true);
  const [creating, setCreating] = useState(false);
  const current = classes.data?.filter((c) => !c.archived_at) ?? [];
  const archived = classes.data?.filter((c) => c.archived_at) ?? [];
  const card = (c: (typeof current)[number]) => (
    <ClassCard
      key={c.id}
      id={c.id}
      name={c.name}
      note={c.kind === "co_teacher" ? "Co-teacher" : undefined}
      footer={<ClassCode code={c.join_code} />}
    >
      <p>{count(c.students, "student")}</p>
      <p className="text-text-muted">{testLine(c.tests)}</p>
    </ClassCard>
  );

  return (
    <div>
      <PageHead title="Classes">
        <Button onClick={() => setCreating(true)}>
          <RiAddLine aria-hidden className="mr-1 -ml-0.5 size-4" />
          Create class
        </Button>
      </PageHead>
      <Switching>
        You're using Proctorise as a teacher. To take a test in someone else's class, switch to
        Student.
      </Switching>
      <div className="mt-6 space-y-6">
        {classes.isPending && <Loading />}
        {classes.data?.length === 0 && (
          <Empty title="Classes you teach will appear here.">
            Create a class, then give its code to your students so they can join.
          </Empty>
        )}
        <ul className={GRID}>{current.map(card)}</ul>
        {archived.length > 0 && (
          <details>
            <summary className="cursor-pointer text-body-medium text-text-muted">
              Archived classes ({archived.length})
            </summary>
            <ul className={`${GRID} mt-4`}>{archived.map(card)}</ul>
          </details>
        )}
      </div>
      {creating && <CreateClass onClose={() => setCreating(false)} />}
    </div>
  );
}

function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center">
      <p className="text-body-medium text-text">{title}</p>
      <p className="mt-1 text-text-muted">{children}</p>
    </div>
  );
}

function CreateClass({ onClose }: { onClose: () => void }) {
  const create = useCreateClass();
  const navigate = useNavigate();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    create.mutate(
      { name: String(f.get("name")).trim(), description: String(f.get("description")).trim() },
      { onSuccess: (id) => navigate(`/app/classes/${id}`) },
    );
  }

  return (
    <Dialog title="Create a class" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label="Class name"
          name="name"
          required
          maxLength={120}
          placeholder="e.g. Physics, Year 2"
        />
        <TextArea
          label="Description for students (optional)"
          name="description"
          maxLength={500}
          placeholder="e.g. Tuesdays and Thursdays, room 4"
        />
        <div className="flex justify-end gap-2">
          <Button variant="plain" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            Create class
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function StudentHome({ teacher }: { teacher: boolean }) {
  const classes = useJoinedClasses();
  const attempts = useMyAttempts();
  const [joining, setJoining] = useState(false);

  // Tests this student can sit down to right now, across every class.
  const todo = (classes.data ?? []).flatMap((c) =>
    c.tests.flatMap((test) => {
      const mine = (attempts.data ?? []).filter((a) => a.test_id === test.id);
      const going = mine.some((a) => a.status === "in_progress");
      const open =
        test.status === "published" && testWindow(test.opens_at, test.closes_at) === "open";
      if (!open || (!going && mine.length >= test.max_attempts)) return [];
      return [{ test, className: c.name, going, again: mine.length > 0 }];
    }),
  );

  return (
    <div>
      <PageHead title="Classes">
        <Button onClick={() => setJoining(true)}>
          <RiAddLine aria-hidden className="mr-1 -ml-0.5 size-4" />
          Join class
        </Button>
      </PageHead>
      {teacher && (
        <Switching>
          You're using Proctorise as a student. To run your own classes and tests, switch to
          Teacher.
        </Switching>
      )}
      <div className="mt-6 space-y-6">
        {todo.length > 0 && (
          <section
            aria-labelledby="open-now"
            className="rounded-2xl border border-accent/40 bg-surface p-5 shadow-xs"
          >
            <h2 id="open-now" className="text-headline-semibold text-text">
              Open now
            </h2>
            <ul className="mt-2 divide-y divide-border">
              {todo.map(({ test, className, going, again }) => (
                <li
                  key={test.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-body-medium text-text">{test.title}</p>
                    <p className="text-body-regular text-text-muted">
                      {className}. {test.duration_min} minutes, closes {formatWhen(test.closes_at)}
                    </p>
                  </div>
                  <Link to={`/app/take/${test.id}`} className={buttonClass("primary")}>
                    {going ? "Continue" : again ? "Try again" : "Start"}
                    <span className="sr-only">: {test.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {classes.isPending && <Loading />}
        {classes.data?.length === 0 && (
          <Empty title="Classes you join will appear here.">
            Ask your teacher for the class code, then choose Join class.
          </Empty>
        )}
        <ul className={GRID}>
          {classes.data?.map((c) => (
            <ClassCard key={c.id} id={c.id} name={c.name}>
              {c.description && <p className="line-clamp-2">{c.description}</p>}
              <p className="text-text-muted">{testLine(c.tests)}</p>
            </ClassCard>
          ))}
        </ul>
      </div>
      {joining && <JoinClass onClose={() => setJoining(false)} />}
    </div>
  );
}

function JoinClass({ onClose }: { onClose: () => void }) {
  const join = useJoinClass();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code"));
    join.mutate(code, {
      onSuccess: (result) => {
        if (!result.joined) return toast.error(JOIN_REASONS[result.reason]);
        toast.ok(`You joined ${result.name}.`);
        onClose();
      },
    });
  }

  return (
    <Dialog title="Join a class" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label="Class code"
          name="code"
          required
          autoComplete="off"
          hint="Your teacher has it. It is 8 letters and numbers."
        />
        <div className="flex justify-end gap-2">
          <Button variant="plain" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={join.isPending}>
            Join
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
