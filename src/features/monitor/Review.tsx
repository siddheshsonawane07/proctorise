import { Link, useParams } from "react-router";
import { Stage } from "../../app/ui/Stage";
import { Button, Card, Loading, LoadFailed } from "../../app/ui/form";
import { useTest } from "../builder/api";
import { Flags } from "./Flags";
import { useOverview, useSetIntegrity } from "./api";

const VERDICT: Record<string, string> = {
  clean: "No flags",
  flagged: "Flagged, not judged yet",
  reviewed_ok: "Judged fine",
  reviewed_violation: "Judged a violation",
};

/**
 * After the test (PHASE_7 § 8): every attempt with flags, worst first. The attempt's verdict is
 * only ever the teacher's choice, made after looking at the evidence.
 */
export function Review() {
  const { testId = "" } = useParams();
  const test = useTest(testId);
  const overview = useOverview(testId);
  const setIntegrity = useSetIntegrity();

  if (overview.isPending || test.isPending) return <Loading />;
  if (overview.isError) return <LoadFailed retry={overview.refetch} />;
  const flagged = overview.data
    .filter((r) => r.warn_count + r.high_count > 0)
    .sort((a, b) => b.high_count - a.high_count || b.unreviewed - a.unreviewed);

  return (
    <div className="space-y-6">
      <Stage
        set="mustard"
        back={{ to: `/app/tests/${testId}/edit`, label: "Back to the test" }}
        title={`Review flags: ${test.data?.title ?? ""}`}
        turn={
          flagged.length === 0
            ? "Nothing to look at."
            : flagged.length === 1
              ? "One attempt to look at."
              : `${flagged.length} attempts to look at.`
        }
        notes={[
          "a flag is something the software noticed, not proof",
          "look at each one before you decide",
        ]}
        prop="lamp"
        className="mb-6"
      />
      {flagged.length === 0 && <p className="text-text-muted">No attempt has any flags.</p>}
      {flagged.map((r) => (
        <Card key={r.attempt_id} title={r.full_name || "Student"}>
          <p className="text-sm text-text-muted">
            {r.high_count} high · {r.warn_count} warn · {r.unreviewed} to review ·{" "}
            {VERDICT[r.integrity]}
          </p>
          <Flags attemptId={r.attempt_id} />
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <span className="text-sm">Your verdict on this attempt:</span>
            <Button
              variant="plain"
              disabled={setIntegrity.isPending}
              onClick={() =>
                setIntegrity.mutate({ attemptId: r.attempt_id, verdict: "reviewed_ok" })
              }
            >
              Fine
            </Button>
            <Button
              variant="plain"
              disabled={setIntegrity.isPending}
              onClick={() =>
                setIntegrity.mutate({ attemptId: r.attempt_id, verdict: "reviewed_violation" })
              }
            >
              A violation
            </Button>
            <Link
              to={`/app/attempts/${r.attempt_id}/report`}
              className="text-sm text-accent underline"
            >
              Integrity report
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
