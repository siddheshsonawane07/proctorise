import { Stage } from "../../app/ui/Stage";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { Button, Card, Field } from "../../app/ui/form";
import { unwrap } from "../classes/api";
import { useProfile } from "../auth/useProfile";

/** Everything held about a person, to download, and deleting the account (PHASE_8 § 8.1). */
export function MyData() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState("");
  const download = useMutation({
    mutationFn: async () => unwrap(await supabase.rpc("my_data")),
    onSuccess: (data) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      link.download = "my-proctorise-data.json";
      link.click();
      URL.revokeObjectURL(link.href);
    },
  });
  const remove = useMutation({
    mutationFn: async () =>
      unwrap(await supabase.rpc("request_account_deletion", { p_confirm: confirm })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
  const cancel = useMutation({
    mutationFn: async () => unwrap(await supabase.rpc("cancel_account_deletion")),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  return (
    <div className="space-y-8">
      <Stage
        set="sage"
        title="Your data"
        turn="Yours to take, or to delete."
        notes={["pictures are kept for days, not forever"]}
        prop="papers"
        className="mb-6"
      />
      <Card title="Download">
        <p className="text-text-muted">
          Your profile, classes, attempts, answers and every event recorded during your tests, as
          one file. Pictures are listed but not included.
        </p>
        <Button onClick={() => download.mutate()} disabled={download.isPending}>
          Download my data
        </Button>
      </Card>
      <Card title="Delete my account">
        {profile?.deletion_requested_at ? (
          <>
            <p>
              Your account will be deleted within a day: your photo, your pictures and your sign-in.
              Your teachers keep your scores, without your name.
            </p>
            <Button variant="plain" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
              Keep my account
            </Button>
          </>
        ) : (
          <>
            <p className="text-text-muted">
              This deletes your photo, every picture from your tests, your profile and your sign-in,
              within a day. Your teachers keep your scores and answers, shown as "Deleted student".
            </p>
            <Field
              label="Type DELETE to confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
            />
            <Button
              onClick={() => remove.mutate()}
              disabled={remove.isPending || confirm !== "DELETE"}
            >
              Delete my account
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
