import { type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { messageFrom } from "../../lib/errors";
import { Button, Field, Loading } from "../../app/ui/form";
import { toast } from "../../app/ui/toast";
import { useSession } from "./session";
import { AuthSet } from "./AuthSet";

/** Reached from the reset email; the client has already exchanged the link for a session. */
export function ResetPassword() {
  const state = useSession();
  const navigate = useNavigate();

  if (state.status === "loading") return <Loading />;
  if (!state.session) {
    return (
      <AuthSet set="tomato" title="This link has expired">
        <p className="text-text-muted">
          <Link to="/forgot-password" className="text-accent underline">
            Ask for a new link
          </Link>
          .
        </p>
      </AuthSet>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password"));
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(messageFrom(error));
    else navigate("/app", { replace: true });
  }

  return (
    <AuthSet set="mustard" title="Set a new password" turn="One you'll remember.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <Button type="submit" className="w-full">
          Save password
        </Button>
      </form>
    </AuthSet>
  );
}
