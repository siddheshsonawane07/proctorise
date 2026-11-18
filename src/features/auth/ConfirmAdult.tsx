import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { Button } from "../../app/ui/form";
import { Stage } from "../../app/ui/Stage";

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
      <div>
        <Stage set="tomato" title="Proctorise is for adults for now" className="mb-6" />
        <p className="max-w-xl text-text-muted">
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
    <div>
      <Stage
        set="pink"
        title="One question before you start"
        notes={["tests here use your camera, so for now Proctorise is only for people 18 or older"]}
        prop="plant"
        className="mb-6"
      />
      <div className="flex gap-3">
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
