import { Markdown } from "../../app/ui/Markdown";
import type { Json } from "../../lib/database.types";
import { LETTERS, type Option, type QuestionType } from "../bank/question";

export type ViewItem = {
  id: string;
  type: QuestionType;
  prompt: string;
  options: Option[];
  points: number;
};

/**
 * One question as a student answers it. `value` is the answer in the same shape as a key:
 * an option id, a list of ids, true/false, text, or a number. Used by the preview now and by
 * the test page in phase 4.
 */
export function QuestionView({
  item,
  number,
  value,
  onChange,
}: {
  item: ViewItem;
  number: number;
  value: Json | undefined;
  onChange: (value: Json) => void;
}) {
  const name = `q-${item.id}`;
  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Question {number}</legend>
      <p className="text-sm text-text-muted">
        Question {number} · {Number(item.points)} {Number(item.points) === 1 ? "point" : "points"}
      </p>
      <Markdown>{item.prompt}</Markdown>

      {item.type === "single" &&
        item.options.map((o, i) => (
          <label key={o.id} className="flex items-start gap-2">
            <input
              type="radio"
              name={name}
              checked={value === o.id}
              onChange={() => onChange(o.id)}
              className="mt-1"
            />
            <span>
              <span className="text-text-muted">{LETTERS[i]}.</span> {o.text}
            </span>
          </label>
        ))}

      {item.type === "multiple" &&
        item.options.map((o, i) => {
          const chosen = Array.isArray(value) ? (value as string[]) : [];
          return (
            <label key={o.id} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={chosen.includes(o.id)}
                onChange={() =>
                  onChange(
                    chosen.includes(o.id) ? chosen.filter((c) => c !== o.id) : [...chosen, o.id],
                  )
                }
                className="mt-1"
              />
              <span>
                <span className="text-text-muted">{LETTERS[i]}.</span> {o.text}
              </span>
            </label>
          );
        })}

      {item.type === "true_false" &&
        [true, false].map((v) => (
          <label key={String(v)} className="flex items-center gap-2">
            <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} />
            {v ? "True" : "False"}
          </label>
        ))}

      {item.type === "short_text" && (
        <label className="block">
          <span className="sr-only">Your answer</span>
          <input
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            maxLength={500}
            className="block w-full rounded-md border border-border bg-surface px-3 py-2"
          />
        </label>
      )}

      {item.type === "numeric" && (
        <label className="block">
          <span className="sr-only">Your answer</span>
          <input
            type="number"
            step="any"
            value={typeof value === "number" ? value : ""}
            onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
            className="block w-48 rounded-md border border-border bg-surface px-3 py-2"
          />
        </label>
      )}
    </fieldset>
  );
}
