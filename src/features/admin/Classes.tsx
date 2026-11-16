import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { messageFrom } from "../../lib/errors";
import type { Database } from "../../lib/database.types";
import { Button, Field, Loading, Message } from "../../app/ui/form";
import { Confirm } from "../../app/ui/Confirm";
import { unwrap, useDeleteClass, useTransferClass } from "../classes/api";

type ClassSummary = Database["public"]["Functions"]["admin_list_classes"]["Returns"][number];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Every class on the site, for the admin: who owns it, how big it is, hand it over or delete it. */
export function Classes() {
  const classes = useQuery({
    queryKey: ["admin", "classes"],
    queryFn: async () => unwrap(await supabase.rpc("admin_list_classes")),
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Classes</h1>
      <p className="mt-1 text-text-muted">
        Every class on the site. You can't open a class or its tests from here; you can give it to
        another teacher, or delete it.
      </p>
      <div className="mt-6">
        {classes.isPending && <Loading />}
        {classes.isError && <Message kind="error">{messageFrom(classes.error)}</Message>}
        {classes.data?.length === 0 && <p className="text-text-muted">No classes yet.</p>}
        <ul className="space-y-3">
          {classes.data?.map((c) => (
            <ClassItem key={c.id} cls={c} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function ClassItem({ cls }: { cls: ClassSummary }) {
  const transfer = useTransferClass();
  const remove = useDeleteClass();
  const [handing, setHanding] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email"));
    transfer.mutate({ classId: cls.id, email }, { onSuccess: () => setHanding(false) });
  }

  return (
    <li className="space-y-3 rounded-lg border border-border p-4">
      <div>
        <p className="font-medium">
          {cls.name}
          {cls.archived_at && (
            <span className="ml-2 text-sm font-normal text-text-muted">Archived</span>
          )}
        </p>
        <p className="text-sm text-text-muted">
          {cls.owner_email ? `${cls.owner_name || "No name"} (${cls.owner_email})` : "No owner"} ·{" "}
          {plural(cls.students, "student")} · {plural(cls.tests, "test")} · made{" "}
          {new Date(cls.created_at).toLocaleDateString()}
        </p>
      </div>
      {handing ? (
        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
          <div className="min-w-56 flex-1">
            <Field
              label={`New owner's email for ${cls.name}`}
              name="email"
              type="email"
              required
              hint="They need an approved teacher account. The current owner stays as a co-teacher."
            />
          </div>
          <Button type="submit" disabled={transfer.isPending}>
            Hand over
          </Button>
          <Button variant="plain" onClick={() => setHanding(false)}>
            No, go back
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap items-start gap-2">
          <Button variant="plain" onClick={() => setHanding(true)}>
            Hand over to another teacher
          </Button>
          <Confirm
            label="Delete"
            question={`Delete ${cls.name} with every test in it, and every student's answers, results and pictures, for good?`}
            phrase={cls.name}
            yes="Delete the class"
            busy={remove.isPending}
            onConfirm={() => remove.mutate(cls.id)}
          />
        </div>
      )}
    </li>
  );
}
