import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { messageFrom } from "../../lib/errors";
import { Button, Message } from "../../app/ui/form";

/** Asked once of anyone who signed up without the 18+ box, e.g. with Google (ADR 005). */
export function ConfirmAdult() {
  const queryClient = useQueryClient();
  const [under18, setUnder18] = useState(false);
  const confirm = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("confirm_adult");
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  if (under18) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold">Proctorise is for adults for now</h1>
        <p className="mt-3 text-text-muted">
          We can't take tests for people under 18 yet. You can delete this account by asking your
          teacher or the site's admin.
        </p>
        <Button variant="plain" className="mt-4" onClick={() => void supabase.auth.signOut()}>
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">One question before you start</h1>
      <p className="mt-3 text-text-muted">
        Tests here use your camera, so for now Proctorise is only for people aged 18 or older.
      </p>
      {confirm.isError && <Message kind="error">{messageFrom(confirm.error)}</Message>}
      <div className="mt-6 flex gap-3">
        <Button onClick={() => confirm.mutate()} disabled={confirm.isPending}>
          I am 18 or older
        </Button>
        <Button variant="plain" onClick={() => setUnder18(true)}>
          I'm under 18
        </Button>
      </div>
    </div>
  );
}
