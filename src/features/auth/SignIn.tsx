import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { supabase } from "../../lib/supabase";
import { messageFrom, safeNext } from "../../lib/errors";
import { Button, Field, Loading, Message } from "../../app/ui/form";
import { useSession } from "./session";
import { GoogleButton } from "./GoogleButton";

export function SignIn() {
  const state = useSession();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (state.status === "loading") return <Loading />;
  if (state.session) return <Navigate to={next} replace />;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setBusy(false);
    if (error) setError(messageFrom(error));
    else navigate(next, { replace: true });
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {error && <Message kind="error">{error}</Message>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <GoogleButton next={next} />
      <p className="mt-6 text-sm text-text-muted">
        <Link to="/forgot-password" className="text-accent underline">
          Forgot your password?
        </Link>
      </p>
      <p className="mt-2 text-sm text-text-muted">
        New here?{" "}
        <Link to="/sign-up" className="text-accent underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
