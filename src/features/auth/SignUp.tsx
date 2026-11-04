import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { messageFrom } from "../../lib/errors";
import { Button, Field, Loading, Message } from "../../app/ui/form";
import { useSession } from "./session";
import { GoogleButton } from "./GoogleButton";

export function SignUp() {
  const state = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (state.status === "loading") return <Loading />;
  if (state.session) return <Navigate to="/app" replace />;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: String(form.get("password")),
      options: {
        // The name and the 18+ statement are the person's own (ADR 005). A role is never sent.
        data: { full_name: String(form.get("full_name")).trim(), adult_confirmed: "true" },
        emailRedirectTo: `${window.location.origin}/app`,
      },
    });
    setBusy(false);
    if (error) setError(messageFrom(error));
    else if (data.session) navigate("/app", { replace: true });
    else setSentTo(email);
  }

  if (sentTo) {
    return (
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="mt-3 text-text-muted">
          We sent a link to <strong className="text-text">{sentTo}</strong>. Open it to finish
          creating your account.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">Create an account</h1>
      <p className="mt-2 text-sm text-text-muted">
        Everyone starts as a student. Teachers ask for teacher access after signing up.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Your name" name="full_name" autoComplete="name" required maxLength={120} />
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint="At least 8 characters."
        />
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="adult" required className="mt-1" />
          <span>I am 18 or older.</span>
        </label>
        {error && <Message kind="error">{error}</Message>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Creating…" : "Create account"}
        </Button>
      </form>
      <GoogleButton next="/app" />
      <p className="mt-6 text-sm text-text-muted">
        Already have an account?{" "}
        <Link to="/sign-in" className="text-accent underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
