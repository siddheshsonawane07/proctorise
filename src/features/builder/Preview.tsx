import { useState } from "react";
import { useParams } from "react-router";
import { LoadFailed, Loading, Message } from "../../app/ui/form";
import { Markdown } from "../../app/ui/Markdown";
import type { Json } from "../../lib/database.types";
import { QuestionView } from "../questions/QuestionView";
import { Stage } from "../../app/ui/Stage";
import { classSet } from "../classes/colour";
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
  if (test.isError) return <LoadFailed retry={test.refetch} />;
  if (!test.data) return <Message kind="error">Test not found.</Message>;

  return (
    <div className="space-y-6">
      <Stage
        set={classSet(test.data.class_id)}
        back={{ to: `/app/tests/${testId}/edit`, label: "Back to the test" }}
        title={test.data.title}
        turn="As a student will see it."
        className="mb-6"
      >
        <p role="status" className="caption mt-5 on-wall-muted">
          Preview. Answers here are not saved, and proctoring is off.
        </p>
      </Stage>
      {test.data.instructions && <Markdown>{test.data.instructions}</Markdown>}
      <ol className="space-y-8">
        {(items.data ?? []).map((item, i) => (
          <li
            key={item.id}
            className="rounded-3xl border border-border bg-white p-6 dark:bg-surface-muted"
          >
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
