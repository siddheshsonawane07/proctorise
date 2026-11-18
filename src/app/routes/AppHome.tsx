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
import { classSet, setClass } from "../../features/classes/colour";
import { formatWhen, testWindow } from "../../lib/time";
import { cx } from "@/utils/cx";
import { buttonClass } from "../ui/buttonClass";
import { Dialog } from "../ui/Dialog";
import { Button, Field, Loading, TextArea } from "../ui/form";
import { toast } from "../ui/toast";
import { Stage } from "../ui/Stage";

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

/** The sidebar holds the switch on a wide screen; on a narrow one it is on the wall. */
function Switching() {
  return <ViewSwitch className="mt-5 max-w-xs lg:hidden" />;
}

/** "No tests open", "One test open", "3 tests open": the italic line on the wall. */
function openLine(tests: CardTest[]): string {
  const n = tests.filter(
    (t) => t.status === "published" && testWindow(t.opens_at, t.closes_at) === "open",
  ).length;
  if (n === 0) return "Nothing open right now.";
  return n === 1 ? "One test open right now." : `${n} tests open right now.`;
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

const ADMIN_SETS = ["sky", "sage", "mustard"] as const;

function AdminHome() {
  return (
    <div>
      <Stage
        set="ink"
        title="Admin"
        turn="Looks after the site."
        notes={["doesn't teach or take tests", "use a separate account for those"]}
        prop="papers"
      />
      <ul className={REGISTER}>
        {ADMIN_PAGES.map((page, i) => (
          <li
            key={page.to}
            className="relative flex items-center gap-5 py-5 hover:bg-surface-muted"
          >
            <span
              aria-hidden
              className={cx(
                "size-12 shrink-0 rounded-2xl bg-[var(--wall)]",
                setClass(ADMIN_SETS[i]!),
              )}
            />
            <div className="min-w-0">
              <Link
                to={page.to}
                className="font-display text-title-2-bold tracking-[-0.02em] text-text no-underline after:absolute after:inset-0 hover:underline"
              >
                {page.title}
              </Link>
              <p className="text-body-regular text-text-muted">{page.text}</p>
            </div>
          </li>
        ))}
      </ul>
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
 * One class in the register: a swatch of its set with its initial, its name in the grotesk, one
 * line about its tests, and on the right what a teacher reaches for (the count, the code). The
 * whole row opens the class; the copy button sits above that link.
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
    <li className="relative flex items-center hover:bg-surface-muted">
      <span
        aria-hidden
        className={cx(
          "grid size-14 shrink-0 place-items-center rounded-2xl bg-[var(--wall)] font-display text-[1.5rem] font-extrabold on-wall",
          setClass(classSet(id)),
        )}
      >
        {name.trim()[0]?.toUpperCase()}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-8 gap-y-2 py-5 pl-5">
        <div className="min-w-0 flex-1 basis-72">
          <Link
            to={`/app/classes/${id}`}
            className="font-display text-title-2-bold tracking-[-0.02em] text-text no-underline after:absolute after:inset-0 hover:underline"
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

const REGISTER = "divide-y divide-border border-y border-border";

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
      <Stage
        title="Classes"
        turn={classes.data ? openLine(current.flatMap((c) => c.tests)) : undefined}
        notes={[
          "you're using Proctorise as a teacher",
          "to take a test in someone else's class, switch to Student",
        ]}
        prop="lamp"
        actions={
          <Button onClick={() => setCreating(true)}>
            <RiAddLine aria-hidden className="mr-1 -ml-0.5 size-4" />
            Create class
          </Button>
        }
      >
        <Switching />
      </Stage>
      <div className="space-y-6">
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
      <Stage
        set="sky"
        title="Classes"
        turn={
          todo.length === 0
            ? "Nothing to sit right now."
            : todo.length === 1
              ? "One test is open for you."
              : `${todo.length} tests are open for you.`
        }
        notes={
          teacher
            ? [
                "you're using Proctorise as a student",
                "to run your own classes and tests, switch to Teacher",
              ]
            : ["your teacher gives you a class code", "join with it, then your tests appear here"]
        }
        prop="plant"
        actions={
          <Button onClick={() => setJoining(true)}>
            <RiAddLine aria-hidden className="mr-1 -ml-0.5 size-4" />
            Join class
          </Button>
        }
      >
        {teacher && <Switching />}
      </Stage>
      <div className="space-y-8">
        {todo.length > 0 && (
          <section
            aria-labelledby="open-now"
            className="set-mustard rounded-3xl bg-mustard px-6 py-5 on-wall"
          >
            <h2 id="open-now" className="font-display text-title-2-bold tracking-[-0.02em]">
              Open now
              <span aria-hidden className="stage-dot" />
            </h2>
            <ul className="mt-2 divide-y divide-black/15">
              {todo.map(({ test, className, going, again }) => (
                <li
                  key={test.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-headline-semibold">{test.title}</p>
                    <p className="text-body-regular on-wall-muted">
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
