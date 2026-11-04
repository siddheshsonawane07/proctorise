import type { Json } from "../../lib/database.types";
import { LETTERS } from "../bank/question";
import type { ViewItem } from "./QuestionView";

/** An answer or key in words: "B. 4", "A. 2 and C. 5", "True", "Paris or paris", "3.14". */
export function describeAnswer(item: Pick<ViewItem, "type" | "options">, value: Json): string {
  if (value === null || value === undefined || value === "") return "no answer";
  const option = (id: string) => {
    const i = item.options.findIndex((o) => o.id === id);
    return i < 0 ? id : `${LETTERS[i]}. ${item.options[i]!.text}`;
  };
  switch (item.type) {
    case "single":
      return option(String(value));
    case "multiple":
      return Array.isArray(value) && value.length
        ? value.map((v) => option(String(v))).join(" and ")
        : "no answer";
    case "true_false":
      return value === true ? "True" : "False";
    case "short_text":
      if (Array.isArray(value)) return value.length ? value.join(" or ") : "marked by your teacher";
      return String(value);
    case "numeric":
      return String(value);
  }
}
