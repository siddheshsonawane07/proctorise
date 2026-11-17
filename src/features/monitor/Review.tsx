import { Link, useParams } from "react-router";
import { BackLink } from "../../app/ui/BackLink";
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
      <div>
        <BackLink to={`/app/tests/${testId}/edit`}>Back to the test</BackLink>
        <h1 className="mt-1 text-page text-text">Review flags: {test.data?.title}</h1>
        <p className="text-text-muted">
          A flag is something the software noticed, not proof. Look at each one before you decide.
        </p>
      </div>
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
