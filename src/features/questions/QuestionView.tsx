import type { ReactNode } from "react";
import { cx } from "@/utils/cx";
import { inputClass } from "../../app/ui/inputClass";
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
    <fieldset className="space-y-5">
      <legend className="sr-only">Question {number}</legend>
      <p className="text-body-medium text-text-muted">
        Question {number}, {Number(item.points)} {Number(item.points) === 1 ? "point" : "points"}
      </p>
      <div className="text-title-3-regular leading-8 text-text">
        <Markdown>{item.prompt}</Markdown>
      </div>

      <div className="space-y-2.5">
        {item.type === "single" &&
          item.options.map((o, i) => (
            <Choice
              key={o.id}
              type="radio"
              name={name}
              mark={LETTERS[i]!}
              checked={value === o.id}
              onChange={() => onChange(o.id)}
            >
              {o.text}
            </Choice>
          ))}

        {item.type === "multiple" &&
          item.options.map((o, i) => {
            const chosen = Array.isArray(value) ? (value as string[]) : [];
            return (
              <Choice
                key={o.id}
                type="checkbox"
                mark={LETTERS[i]!}
                checked={chosen.includes(o.id)}
                onChange={() =>
                  onChange(
                    chosen.includes(o.id) ? chosen.filter((c) => c !== o.id) : [...chosen, o.id],
                  )
                }
              >
                {o.text}
              </Choice>
            );
          })}

        {item.type === "true_false" &&
          [true, false].map((v) => (
            <Choice
              key={String(v)}
              type="radio"
              name={name}
              mark={v ? "T" : "F"}
              checked={value === v}
              onChange={() => onChange(v)}
            >
              {v ? "True" : "False"}
            </Choice>
          ))}
      </div>

      {item.type === "short_text" && (
        <label className="block">
          <span className="sr-only">Your answer</span>
          <input
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            maxLength={500}
            className={cx("block w-full text-headline-regular", inputClass)}
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
            className={cx("block w-48 text-headline-regular", inputClass)}
          />
        </label>
      )}
    </fieldset>
  );
}

/**
 * One answer, drawn like a bubble on a paper answer sheet: the letter in a circle (a square when
 * more than one may be chosen) that fills with ink when chosen. The real input lies invisibly over
 * the whole row, so a click anywhere on it is a click on the input, and the keyboard works as usual.
 */
function Choice({
  type,
  name,
  mark,
  checked,
  onChange,
  children,
}: {
  type: "radio" | "checkbox";
  name?: string;
  mark: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={cx(
        "relative flex items-center gap-4 rounded-xl border px-4 py-3.5 text-headline-regular text-text",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
        checked
          ? "border-accent bg-accent/8"
          : "border-border-button-default hover:border-text-muted/60 hover:bg-surface-muted",
      )}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className="absolute inset-0 m-0 size-full cursor-pointer appearance-none opacity-0"
      />
      <span
        aria-hidden
        className={cx(
          "grid size-8 shrink-0 place-items-center border-2 text-body-semibold",
          type === "radio" ? "rounded-full" : "rounded-md",
          checked
            ? "border-accent bg-accent text-accent-text"
            : "border-text-muted/45 text-text-muted",
        )}
      >
        {mark}
      </span>
      <span className="min-w-0">{children}</span>
    </label>
  );
}
