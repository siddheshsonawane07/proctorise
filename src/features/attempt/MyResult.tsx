import { Link, useParams } from "react-router";
import { Card, Loading, Message } from "../../app/ui/form";
import { Markdown } from "../../app/ui/Markdown";
import { messageFrom } from "../../lib/errors";
import { describeAnswer } from "../questions/describe";
import { useMyResult } from "./api";

export function MyResult() {
  const { attemptId = "" } = useParams();
  const result = useMyResult(attemptId);
  if (result.isPending) return <Loading />;
  if (result.isError) return <Message kind="error">{messageFrom(result.error)}</Message>;
  const r = result.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">
        {r.status === "auto_submitted"
          ? "Submitted when time ran out"
          : r.status === "terminated"
            ? "Your teacher ended this attempt"
            : "Submitted"}
      </h1>
      {!r.released ? (
        <p className="text-text-muted">
          Your answers are in. Your teacher will release the results.
        </p>
      ) : (
        <Card title="Your result">
          <p className="text-3xl font-semibold">
            {Number(r.score)}{" "}
            <span className="text-lg text-text-muted">out of {Number(r.max_score)}</span>
          </p>
          {r.waiting_for_marking && (
            <p className="text-text-muted">Some answers are still being marked by your teacher.</p>
          )}
        </Card>
      )}
      {r.released && r.items && (
        <ol className="space-y-4">
          {r.items.map((item, i) => (
            <li key={item.id} className="rounded-lg border border-border p-4">
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
      <Link to="/app" className="inline-block text-accent underline">
        Back to your classes
      </Link>
    </div>
  );
}
