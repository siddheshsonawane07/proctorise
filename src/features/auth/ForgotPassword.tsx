import { useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { messageFrom } from "../../lib/errors";
import { Button, Field } from "../../app/ui/form";
import { toast } from "../../app/ui/toast";

export function ForgotPassword() {
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email"));
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(messageFrom(error));
    else setDone(true);
  }

  return (
    <div className="sheet sheet-blank sheet-x mx-auto max-w-lg py-8 sm:mt-6">
      <h1 className="text-page text-text">Reset your password</h1>
      {done ? (
        <p className="mt-3 text-text-muted">
          If an account uses that email, we've sent it a link to set a new password.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <Button type="submit" className="w-full">
            Send the link
          </Button>
        </form>
      )}
    </div>
  );
}
