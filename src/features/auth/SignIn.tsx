import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { supabase } from "../../lib/supabase";
import { messageFrom, safeNext } from "../../lib/errors";
import { Button, Field, Loading } from "../../app/ui/form";
import { toast } from "../../app/ui/toast";
import { useSession } from "./session";
import { GoogleButton } from "./GoogleButton";
import { AuthSet } from "./AuthSet";

export function SignIn() {
  const state = useSession();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (state.status === "loading") return <Loading />;
  if (state.session) return <Navigate to={next} replace />;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setBusy(false);
    if (error) toast.error(messageFrom(error));
    else navigate(next, { replace: true });
  }

  return (
    <AuthSet
      set="sky"
      title="Sign in"
      turn="Welcome back."
      notes={["taking a test? sign in, then join your class with its code"]}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
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
    </AuthSet>
  );
}
