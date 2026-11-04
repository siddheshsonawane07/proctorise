import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { BecomeTeacher } from "../../features/account/BecomeTeacher";
import { useProfile } from "../../features/auth/useProfile";
import { isTeacher } from "../../features/auth/roles";
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
};

export function AppHome() {
  const { data: profile } = useProfile();
  if (!profile) return null; // RequireAuth renders this only once the profile has loaded.
  const teacher = isTeacher(profile);
  const firstName = profile.full_name.split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Hello, {firstName}</h1>
      {profile.role === "admin" && (
        <Card title="Admin">
          <Link to="/app/admin/teachers" className="text-accent underline">
            Teacher requests and teachers
          </Link>
        </Card>
      )}
      {teacher && <TeachingClasses />}
      <JoinedClasses showEmpty={!teacher} />
      <Card title="Your photo for tests">
        <p className="text-text-muted">
          Some tests check it's you by comparing your face with a photo you take here.
        </p>
        <Link to="/app/identity" className="text-accent underline">
          Set up or replace your photo
        </Link>
      </Card>
      {profile.role === "student" && <BecomeTeacher profile={profile} />}
    </div>
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

function JoinedClasses({ showEmpty }: { showEmpty: boolean }) {
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

  if (!showEmpty && classes.data?.length === 0) return null;
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
