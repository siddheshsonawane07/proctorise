import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { messageFrom } from "../../lib/errors";
import { Button, Card, Field, Message } from "../../app/ui/form";
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
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Your data</h1>
      <Card title="Download">
        <p className="text-text-muted">
          Your profile, classes, attempts, answers and every event recorded during your tests, as
          one file. Pictures are listed but not included.
        </p>
        {download.isError && <Message kind="error">{messageFrom(download.error)}</Message>}
        <Button onClick={() => download.mutate()} disabled={download.isPending}>
          Download my data
        </Button>
      </Card>
      <Card title="Delete my account">
        {profile?.deletion_requested_at ? (
          <>
            <p>
              Your account will be deleted within a day: your photo, your pictures, your attempts
              and your sign-in.
            </p>
            <Button variant="plain" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
              Keep my account
            </Button>
          </>
        ) : (
          <>
            <p className="text-text-muted">
              This deletes your photo, every picture from your tests, your attempts and scores, and
              your sign-in, within a day. Your teachers lose your results.
            </p>
            <Field
              label="Type DELETE to confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
            />
            {remove.isError && <Message kind="error">{messageFrom(remove.error)}</Message>}
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
