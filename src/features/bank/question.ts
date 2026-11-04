import type { Database, Json } from "../../lib/database.types";

export type QuestionType = Database["public"]["Enums"]["question_type"];
export type Option = { id: string; text: string };

/** What save_question takes, apart from the id. The database checks it again (check_question). */
export type QuestionInput = {
  type: QuestionType;
  prompt: string;
  options: Option[];
  points: number;
  tags: string[];
  correct: Json;
  tolerance: number;
  caseSensitive: boolean;
};

export const TYPE_LABEL: Record<QuestionType, string> = {
  single: "One correct answer",
  multiple: "Several correct answers",
  true_false: "True or false",
  short_text: "Short written answer",
  numeric: "Number",
};

export const LETTERS = "ABCDEFGHIJ";

/** Option ids are their letters, lower case, in order: a, b, c… */
export function optionsFrom(texts: string[]): Option[] {
  return texts.map((text, i) => ({ id: LETTERS[i]!.toLowerCase(), text: text.trim() }));
}

/** Splits a CSV document into rows of fields. Handles quotes, doubled quotes and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

export const CSV_HEADER = ["type", "prompt", "options", "correct", "points", "tags", "tolerance"];

export const CSV_TEMPLATE =
  CSV_HEADER.join(",") +
  "\n" +
  [
    'single,"What is 2 + 2?",3|4|5,B,1,arithmetic,',
    'multiple,"Which are prime?",2|4|5|9,A|C,2,primes,',
    'true_false,"The Earth orbits the Sun.",,true,1,,',
    'short_text,"Capital of France?",,Paris,1,geography,',
    'short_text,"Explain photosynthesis briefly.",,,3,biology,',
    'numeric,"Value of pi to two places?",,3.14,1,,0.005',
  ].join("\n") +
  "\n";

const TYPES = new Set<QuestionType>(["single", "multiple", "true_false", "short_text", "numeric"]);
const split = (value: string) =>
  value
    .split("|")
    .map((v) => v.trim())
    .filter(Boolean);

/** One CSV row as a question, or a message saying what is wrong with it. */
export function rowToQuestion(row: string[]): QuestionInput | string {
  const [
    rawType = "",
    prompt = "",
    options = "",
    correct = "",
    points = "",
    tags = "",
    tolerance = "",
  ] = row.map((f) => f.trim());
  const type = rawType.toLowerCase() as QuestionType;
  if (!TYPES.has(type)) return `Unknown type "${rawType}"`;
  if (!prompt) return "The question is empty";
  const pointsValue = points === "" ? 1 : Number(points);
  if (!Number.isFinite(pointsValue) || pointsValue <= 0)
    return `Points "${points}" is not a number`;
  const base = {
    type,
    prompt,
    points: pointsValue,
    tags: split(tags),
    tolerance: 0,
    caseSensitive: false,
  };

  if (type === "single" || type === "multiple") {
    const opts = optionsFrom(split(options));
    if (opts.length < 2) return "Give at least two options, separated by |";
    const letters = split(correct.toUpperCase());
    const ids = letters.map((l) => LETTERS.indexOf(l));
    if (ids.length === 0 || ids.some((i) => i < 0 || i >= opts.length)) {
      return `Correct "${correct}" should be option letters, like B or A|C`;
    }
    if (type === "single" && ids.length !== 1) return "One correct answer means one letter";
    const keys = ids.map((i) => opts[i]!.id);
    return { ...base, options: opts, correct: type === "single" ? keys[0]! : keys };
  }
  if (type === "true_false") {
    const value = correct.toLowerCase();
    if (value !== "true" && value !== "false") return 'Correct should be "true" or "false"';
    return { ...base, options: [], correct: value === "true" };
  }
  if (type === "short_text") return { ...base, options: [], correct: split(correct) };

  const number = Number(correct);
  if (correct === "" || !Number.isFinite(number)) return `Correct "${correct}" is not a number`;
  const tol = tolerance === "" ? 0 : Number(tolerance);
  if (!Number.isFinite(tol) || tol < 0) return `Tolerance "${tolerance}" is not a number`;
  return { ...base, options: [], correct: number, tolerance: tol };
}
