import { useState } from "react";
import { Link, useParams } from "react-router";
import { Loading, Message } from "../../app/ui/form";
import { Markdown } from "../../app/ui/Markdown";
import { messageFrom } from "../../lib/errors";
import type { Json } from "../../lib/database.types";
import { QuestionView } from "../questions/QuestionView";
import { useDraftQuestions, usePublishedItems, useTest } from "./api";

/** The test as a student will see it. Nothing is saved and no attempt is created. */
export function Preview() {
  const { testId = "" } = useParams();
  const test = useTest(testId);
  const draft = test.data?.status === "draft";
  const draftItems = useDraftQuestions(testId, test.isSuccess && draft);
  const published = usePublishedItems(testId, test.isSuccess && !draft);
  const items = draft ? draftItems : published;
  const [answers, setAnswers] = useState<Record<string, Json>>({});

  if (test.isPending || (test.data && items.isPending)) return <Loading />;
  if (test.isError) return <Message kind="error">{messageFrom(test.error)}</Message>;
  if (!test.data) return <Message kind="error">Test not found.</Message>;

  return (
    <div className="space-y-6">
      <p role="status" className="rounded-md border border-border bg-surface-muted p-3 text-sm">
        Preview. Answers here are not saved, and proctoring is off.{" "}
        <Link to={`/app/tests/${testId}/edit`} className="text-accent underline">
          Back to the test
        </Link>
      </p>
      <h1 className="text-2xl font-semibold">{test.data.title}</h1>
      {test.data.instructions && <Markdown>{test.data.instructions}</Markdown>}
      <ol className="space-y-8">
        {(items.data ?? []).map((item, i) => (
          <li key={item.id} className="rounded-lg border border-border p-5">
            <QuestionView
              item={item}
              number={i + 1}
              value={answers[item.id]}
              onChange={(value) => setAnswers((prev) => ({ ...prev, [item.id]: value }))}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
