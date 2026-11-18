import { useParams } from "react-router";
import { Stage } from "../../app/ui/Stage";
import { Card, Loading, LoadFailed } from "../../app/ui/form";
import { Markdown } from "../../app/ui/Markdown";
import { describeAnswer } from "../questions/describe";
import { useMyResult } from "./api";

export function MyResult() {
  const { attemptId = "" } = useParams();
  const result = useMyResult(attemptId);
  if (result.isPending) return <Loading />;
  if (result.isError) return <LoadFailed retry={result.refetch} />;
  const r = result.data;

  return (
    <div className="space-y-6">
      <Stage
        set="sky"
        back={{ to: "/app", label: "Back to your classes" }}
        title={
          r.status === "auto_submitted"
            ? "Submitted when time ran out"
            : r.status === "terminated"
              ? "Your teacher ended this attempt"
              : "Submitted"
        }
        turn={
          r.released
            ? "Your result is out."
            : "Your answers are in. Your teacher will release the results."
        }
        prop="plant"
        className="mb-6"
      />
      {r.released && (
        <Card title="Your result">
          <p className="font-display text-[4rem] leading-none font-extrabold tracking-[-0.04em]">
            {Number(r.score)}{" "}
            <span className="font-serif text-[2rem] font-normal tracking-normal text-text-muted italic">
              out of {Number(r.max_score)}
            </span>
          </p>
          {r.waiting_for_marking && (
            <p className="text-text-muted">Some answers are still being marked by your teacher.</p>
          )}
        </Card>
      )}
      {r.released && r.items && (
        <ol className="space-y-4">
          {r.items.map((item, i) => (
            <li
              key={item.id}
              className="rounded-3xl border border-border bg-white p-5 dark:bg-surface-muted"
            >
              <p className="text-sm text-text-muted">
                Question {i + 1} ·{" "}
                {item.points_awarded === null
                  ? "not marked yet"
                  : `${Number(item.points_awarded)} of ${Number(item.points)} points`}
              </p>
              <Markdown>{item.prompt}</Markdown>
              <p className="mt-2 text-sm">Your answer: {describeAnswer(item, item.response)}</p>
              <p className="text-sm">Correct answer: {describeAnswer(item, item.correct)}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
