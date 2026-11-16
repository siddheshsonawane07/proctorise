import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { BecomeTeacher } from "../../features/account/BecomeTeacher";
import { useProfile } from "../../features/auth/useProfile";
import { isAdmin, isTeacher } from "../../features/auth/roles";
import { useView } from "../../features/auth/view";
import { ViewSwitch } from "../../features/auth/ViewSwitch";
import {
  useCreateClass,
  useJoinClass,
  useJoinedClasses,
  useTeachingClasses,
  type JoinResult,
} from "../../features/classes/api";
import { messageFrom } from "../../lib/errors";
import { Button, Card, Field, Loading, Message } from "../ui/form";

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
  const firstName = profile.full_name.split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      <h1 className="text-title-1-bold tracking-tight text-text">Hello, {firstName}</h1>
      {isAdmin(profile) ? (
        <AdminHome />
      ) : view === "teacher" ? (
        <>
          <Switching>
            You're using Proctorise as a teacher. To take a test in someone else's class, switch to
            Student.
          </Switching>
          <TeachingClasses />
        </>
      ) : (
        <>
          {isTeacher(profile) && (
            <Switching>
              You're using Proctorise as a student. To run your own classes and tests, switch to
              Teacher.
            </Switching>
          )}
          <JoinedClasses />
          <Card title="Your photo for tests">
            <p className="text-text-muted">
              Some tests check it's you by comparing your face with a photo you take here.
            </p>
            <Link to="/app/identity" className="text-accent underline">
              Set up or replace your photo
            </Link>
          </Card>
          <Card title="Your data">
            <Link to="/app/my-data" className="text-accent underline">
              Download your data, or delete your account
            </Link>
          </Card>
          {profile.role === "student" && <BecomeTeacher profile={profile} />}
        </>
      )}
    </div>
  );
}

/** The sidebar holds the switch on a wide screen; on a narrow one it is here. */
function Switching({ children }: { children: string }) {
  return (
    <div className="space-y-3">
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
    <>
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
    </>
  );
}

function TeachingClasses() {
  const classes = useTeachingClasses(true);
  const create = useCreateClass();
  const navigate = useNavigate();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name"));
    create.mutate(name, { onSuccess: (id) => navigate(`/app/classes/${id}`) });
  }

  return (
    <Card title="Classes you teach">
      {classes.isPending && <Loading />}
      {classes.data?.length === 0 && (
        <p className="text-text-muted">Classes you teach will appear here.</p>
      )}
      <ul className="divide-y divide-border">
        {classes.data?.map((c) => (
          <li key={c.id} className="py-2">
            <Link to={`/app/classes/${c.id}`} className="font-medium text-accent">
              {c.name}
            </Link>
            {c.kind === "co_teacher" && (
              <span className="ml-2 text-sm text-text-muted">Co-teacher</span>
            )}
            {c.archived_at && <span className="ml-2 text-sm text-text-muted">Archived</span>}
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <Field
            label="New class"
            name="name"
            required
            maxLength={120}
            placeholder="e.g. Physics, Year 2"
          />
        </div>
        <Button type="submit" disabled={create.isPending}>
          Create
        </Button>
      </form>
      {create.isError && <Message kind="error">{messageFrom(create.error)}</Message>}
      <Link to="/app/bank" className="inline-block text-accent underline">
        Your question bank
      </Link>
    </Card>
  );
}

function JoinedClasses() {
  const classes = useJoinedClasses();
  const join = useJoinClass();
  const [result, setResult] = useState<JoinResult | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const code = String(new FormData(form).get("code"));
    join.mutate(code, {
      onSuccess: (r) => {
        setResult(r);
        if (r.joined) form.reset();
      },
    });
  }

  return (
    <Card title="Your classes">
      {classes.data?.length === 0 && (
        <p className="text-text-muted">Classes you join will appear here.</p>
      )}
      <ul className="divide-y divide-border">
        {classes.data?.map((c) => (
          <li key={c.id} className="py-2">
            <Link to={`/app/classes/${c.id}`} className="font-medium text-accent">
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <Field
            label="Join a class"
            name="code"
            required
            placeholder="Code from your teacher"
            autoComplete="off"
          />
        </div>
        <Button type="submit" disabled={join.isPending}>
          Join
        </Button>
      </form>
      {result?.joined && <Message kind="ok">You joined {result.name}.</Message>}
      {result && !result.joined && <Message kind="error">{JOIN_REASONS[result.reason]}</Message>}
      {join.isError && <Message kind="error">{messageFrom(join.error)}</Message>}
    </Card>
  );
}
