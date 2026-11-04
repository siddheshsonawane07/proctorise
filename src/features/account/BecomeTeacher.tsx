import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { messageFrom } from "../../lib/errors";
import { Button, Card, Field, Message, TextArea } from "../../app/ui/form";
import type { Profile } from "../auth/useProfile";

export function BecomeTeacher({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient();
  const request = useMutation({
    mutationFn: async (input: { institution: string; note: string }) => {
      const { error } = await supabase.rpc("request_teacher", {
        p_institution: input.institution,
        p_note: input.note,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  if (profile.teacher_status === "requested") {
    return (
      <Card title="Teacher access">
        <p className="text-text-muted">
          Your request is with the admin. You'll get teacher tools here once it's approved.
        </p>
      </Card>
    );
  }
  if (profile.teacher_status === "suspended") {
    return (
      <Card title="Teacher access">
        <p className="text-text-muted">Your teacher access is paused. Contact the site's admin.</p>
      </Card>
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    request.mutate({
      institution: String(form.get("institution")),
      note: String(form.get("note")),
    });
  }

  return (
    <Card title="Are you a teacher?">
      {profile.teacher_status === "rejected" && (
        <p className="text-text-muted">Your last request wasn't approved. You can ask again.</p>
      )}
      <p className="text-text-muted">Ask for teacher access to create classes and tests.</p>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="School or institution" name="institution" required maxLength={200} />
        <TextArea label="Anything the admin should know (optional)" name="note" maxLength={1000} />
        {request.isError && <Message kind="error">{messageFrom(request.error)}</Message>}
        <Button type="submit" disabled={request.isPending}>
          Ask for teacher access
        </Button>
      </form>
    </Card>
  );
}
