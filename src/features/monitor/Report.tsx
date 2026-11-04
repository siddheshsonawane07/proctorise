import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { messageFrom } from "../../lib/errors";
import { Button, Loading, Message } from "../../app/ui/form";
import { unwrap } from "../classes/api";
import { EVENT_LABEL } from "../proctoring/labels";
import { useFlags } from "./api";

/** One attempt's record, to print or save as PDF (PHASE_7 § 9). */
export function Report() {
  const { attemptId = "" } = useParams();
  const attempt = useQuery({
    queryKey: ["report", attemptId],
    queryFn: async () => {
      const { data: a, error } = await supabase
        .from("attempts")
        .select("id, test_id, status, started_at, submitted_at, deadline_at, integrity")
        .eq("id", attemptId)
        .maybeSingle();
      if (error) throw error;
      if (!a) throw new Error("That attempt was not found.");
      // A teacher reads students' names through live_overview, not the profiles table.
      const [test, overview, actions] = await Promise.all([
        supabase.from("tests").select("title").eq("id", a.test_id).single(),
        supabase.rpc("live_overview", { p_test_id: a.test_id }),
        supabase
          .from("audit_log")
          .select("action, details, at")
          .eq("target_type", "attempt")
          .eq("target_id", attemptId)
          .order("at"),
      ]);
      return {
        a,
        title: test.data?.title ?? "",
        name: unwrap(overview).find((r) => r.attempt_id === attemptId)?.full_name ?? "",
        actions: unwrap(actions),
      };
    },
  });
  const flags = useFlags(attemptId);

  if (attempt.isPending || flags.isPending) return <Loading />;
  if (attempt.isError) return <Message kind="error">{messageFrom(attempt.error)}</Message>;
  const { a, actions, title, name } = attempt.data;

  return (
    <article className="mx-auto max-w-3xl space-y-6 print:max-w-none">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Integrity report</h1>
        <p>
          {name} · {title}
        </p>
        <p className="text-sm text-text-muted">
          Started {new Date(a.started_at).toLocaleString()}
          {a.submitted_at && `, finished ${new Date(a.submitted_at).toLocaleString()}`} ·{" "}
          {a.status.replace("_", " ")} · verdict: {a.integrity.replace("_", " ")}
        </p>
        <Button variant="plain" className="print:hidden" onClick={() => window.print()}>
          Print or save as PDF
        </Button>
      </header>
      <section>
        <h2 className="font-semibold">Flags</h2>
        <table className="mt-2 w-full text-left text-sm">
          <thead className="text-text-muted">
            <tr>
              <th className="py-1 font-medium">Time</th>
              <th className="py-1 font-medium">What</th>
              <th className="py-1 font-medium">Severity</th>
              <th className="py-1 font-medium">Teacher's review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {flags.data?.map((f) => (
              <tr key={f.id}>
                <td className="py-1">{new Date(f.started_at).toLocaleTimeString()}</td>
                <td className="py-1">
                  {EVENT_LABEL[f.kind] ?? f.kind}
                  {f.device === "phone" && " (phone)"}
                </td>
                <td className="py-1">{f.severity}</td>
                <td className="py-1">
                  {f.verdict ? `${f.verdict}${f.note ? `: ${f.note}` : ""}` : "not reviewed"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h2 className="font-semibold">Actions by teachers</h2>
        {actions.length === 0 ? (
          <p className="text-sm text-text-muted">None.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {actions.map((x, i) => (
              <li key={i}>
                {new Date(x.at).toLocaleTimeString()}:{" "}
                {x.action.replace("attempt.", "").replace("flag.", "flag ")}
                {typeof x.details === "object" &&
                  x.details &&
                  "reason" in x.details &&
                  ` (${String(x.details.reason)})`}
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
