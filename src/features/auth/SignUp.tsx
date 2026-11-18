import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { messageFrom } from "../../lib/errors";
import { Button, Field, Loading } from "../../app/ui/form";
import { toast } from "../../app/ui/toast";
import { useSession } from "./session";
import { GoogleButton } from "./GoogleButton";
import { AuthSet } from "./AuthSet";

export function SignUp() {
  const state = useSession();
  const navigate = useNavigate();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (state.status === "loading") return <Loading />;
  if (state.session) return <Navigate to="/app" replace />;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    setBusy(true);
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
    if (error) toast.error(messageFrom(error));
    else if (data.session) navigate("/app", { replace: true });
    else setSentTo(email);
  }

  if (sentTo) {
    return (
      <AuthSet set="pink" title="Check your email" turn="One more step.">
        <p className="text-text-muted">
          We sent a link to <strong className="text-text">{sentTo}</strong>. Open it to finish
          creating your account.
        </p>
      </AuthSet>
    );
  }

  return (
    <AuthSet
      set="cobalt"
      title="Create an account"
      turn="Everyone starts as a student."
      notes={["teachers ask for teacher access after signing up"]}
    >
      <form onSubmit={onSubmit} className="space-y-4">
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
    </AuthSet>
  );
}
