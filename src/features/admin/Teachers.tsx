import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { messageFrom } from "../../lib/errors";
import type { Database } from "../../lib/database.types";
import { Button, Loading, Message } from "../../app/ui/form";

type Status = Database["public"]["Enums"]["teacher_status"];
type Person = Database["public"]["Functions"]["admin_list_people"]["Returns"][number];

const TABS: { status: Status; label: string; empty: string }[] = [
  { status: "requested", label: "Requests", empty: "No one is waiting." },
  { status: "approved", label: "Teachers", empty: "No teachers yet." },
  { status: "suspended", label: "Paused", empty: "No paused teachers." },
];

/** What the admin can do to a person in each state, matching admin_set_teacher_status. */
const ACTIONS: Record<Status, { to: Status; label: string; verb: string }[]> = {
  requested: [
    { to: "approved", label: "Approve", verb: "Make {name} a teacher?" },
    { to: "rejected", label: "Decline", verb: "Decline {name}'s request?" },
  ],
  approved: [{ to: "suspended", label: "Pause", verb: "Pause {name}'s teacher access?" }],
  suspended: [{ to: "approved", label: "Restore", verb: "Restore {name}'s teacher access?" }],
  none: [],
  rejected: [],
};

export function Teachers() {
  const [tab, setTab] = useState<Status>("requested");
  const people = useQuery({
    queryKey: ["admin", "people", tab],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_people", { p_status: tab });
      if (error) throw error;
      return data;
    },
  });
  const current = TABS.find((t) => t.status === tab)!;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Teachers</h1>
      <div role="tablist" aria-label="Teacher status" className="mt-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.status}
            role="tab"
            type="button"
            aria-selected={tab === t.status}
            onClick={() => setTab(t.status)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === t.status ? "bg-accent text-accent-text" : "border border-border"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-6">
        {people.isPending && <Loading />}
        {people.isError && <Message kind="error">{messageFrom(people.error)}</Message>}
        {people.data?.length === 0 && <p className="text-text-muted">{current.empty}</p>}
        <ul className="space-y-3">
          {people.data?.map((person) => (
            <PersonRow key={person.id} person={person} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function PersonRow({ person }: { person: Person }) {
  const queryClient = useQueryClient();
  const [asking, setAsking] = useState<Status | null>(null);
  const change = useMutation({
    mutationFn: async (to: Status) => {
      const { error } = await supabase.rpc("admin_set_teacher_status", {
        p_user_id: person.id,
        p_status: to,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "people"] }),
  });
  const name = person.full_name || person.email;
  const pending = ACTIONS[person.teacher_status].find((a) => a.to === asking);

  return (
    <li className="rounded-lg border border-border p-4">
      <p className="font-medium">
        {name} <span className="text-sm font-normal text-text-muted">{person.email}</span>
      </p>
      {person.institution && <p className="text-sm text-text-muted">{person.institution}</p>}
      {person.teacher_note && <p className="mt-1 text-sm">{person.teacher_note}</p>}
      {change.isError && <Message kind="error">{messageFrom(change.error)}</Message>}
      {pending ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm">{pending.verb.replace("{name}", name)}</span>
          <Button onClick={() => change.mutate(pending.to)} disabled={change.isPending}>
            Yes, {pending.label.toLowerCase()}
          </Button>
          <Button variant="plain" onClick={() => setAsking(null)}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          {ACTIONS[person.teacher_status].map((action) => (
            <Button key={action.to} variant="plain" onClick={() => setAsking(action.to)}>
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </li>
  );
}
