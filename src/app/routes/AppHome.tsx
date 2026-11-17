import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { Empty } from "../ui/Empty";
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
import { ClassCode } from "../../features/classes/ClassCode";
import { classBand } from "../../features/classes/colour";
import { formatWhen, testWindow } from "../../lib/time";
import { cx } from "@/utils/cx";
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
      <h1 className="text-page text-text">{title}</h1>
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

/**
 * One class in the register: its colour as the spine of a booklet, its name, one line about its
 * tests, and on the right what a teacher reaches for (the count, the code). The whole row opens
 * the class; the copy button sits above that link.
 */
function ClassRow({
  id,
  name,
  note,
  children,
  aside,
}: {
  id: string;
  name: string;
  note?: string | undefined;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <li className="relative flex hover:bg-surface-muted">
      <span aria-hidden className={cx("my-3 ml-3 w-1.5 shrink-0 rounded-sm", classBand(id))} />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-8 gap-y-2 px-4 py-4">
        <div className="min-w-0 flex-1 basis-72">
          <Link
            to={`/app/classes/${id}`}
            className="text-title-3-semibold text-text no-underline after:absolute after:inset-0 hover:underline"
          >
            {name}
          </Link>
          {note && <span className="ml-2 text-body-regular text-text-muted">{note}</span>}
          <div className="mt-0.5 space-y-0.5 text-body-regular text-text-muted">{children}</div>
        </div>
        {aside && (
          <div className="relative flex flex-wrap items-center gap-x-8 gap-y-1 text-body-regular">
            {aside}
          </div>
        )}
      </div>
    </li>
  );
}

const REGISTER = "divide-y divide-border overflow-hidden rounded-2xl border border-border";

function TeacherHome() {
  const classes = useTeachingClasses(true);
  const [creating, setCreating] = useState(false);
  const current = classes.data?.filter((c) => !c.archived_at) ?? [];
  const archived = classes.data?.filter((c) => c.archived_at) ?? [];
  const card = (c: (typeof current)[number]) => (
    <ClassRow
      key={c.id}
      id={c.id}
      name={c.name}
      note={c.kind === "co_teacher" ? "Co-teacher" : undefined}
      aside={
        <>
          <span className="w-24 text-text tabular-nums">{count(c.students, "student")}</span>
          <ClassCode code={c.join_code} />
        </>
      }
    >
      <p>{testLine(c.tests)}</p>
    </ClassRow>
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
        {current.length > 0 && <ul className={REGISTER}>{current.map(card)}</ul>}
        {archived.length > 0 && (
          <details>
            <summary className="cursor-pointer text-body-medium text-text-muted">
              Archived classes ({archived.length})
            </summary>
            <ul className={`${REGISTER} mt-4`}>{archived.map(card)}</ul>
          </details>
        )}
      </div>
      {creating && <CreateClass onClose={() => setCreating(false)} />}
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
            className="rounded-2xl border border-border border-l-4 border-l-accent bg-surface px-5 py-4"
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
        {!!classes.data?.length && (
          <ul className={REGISTER}>
            {classes.data.map((c) => (
              <ClassRow key={c.id} id={c.id} name={c.name}>
                {c.description && <p className="line-clamp-1">{c.description}</p>}
                <p>{testLine(c.tests)}</p>
              </ClassRow>
            ))}
          </ul>
        )}
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
