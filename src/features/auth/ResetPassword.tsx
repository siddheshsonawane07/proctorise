import { type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { messageFrom } from "../../lib/errors";
import { Button, Field, Loading } from "../../app/ui/form";
import { toast } from "../../app/ui/toast";
import { useSession } from "./session";

/** Reached from the reset email; the client has already exchanged the link for a session. */
export function ResetPassword() {
  const state = useSession();
  const navigate = useNavigate();

  if (state.status === "loading") return <Loading />;
  if (!state.session) {
    return (
      <div className="sheet sheet-blank sheet-x mx-auto max-w-lg py-8 sm:mt-6">
        <h1 className="text-page text-text">This link has expired</h1>
        <p className="mt-3 text-text-muted">
          <Link to="/forgot-password" className="text-accent underline">
            Ask for a new link
          </Link>
          .
        </p>
      </div>
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
    <div className="sheet sheet-blank sheet-x mx-auto max-w-lg py-8 sm:mt-6">
      <h1 className="text-page text-text">Set a new password</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
    </div>
  );
}
