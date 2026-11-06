import {
  CSV_HEADER,
  parseCsv,
  rowToQuestion,
  type QuestionInput,
  type QuestionType,
} from "./question";

export type Difficulty = "easy" | "balanced" | "hard";

export type PromptRequest = {
  board: string;
  className: string;
  subject: string;
  chapter: string;
  count: number;
  types: QuestionType[];
  difficulty: Difficulty;
};

const TYPE_WORDS: Record<QuestionType, string> = {
  single: "one-correct-answer",
  multiple: "several-correct-answers",
  true_false: "true/false",
  short_text: "short written answer",
  numeric: "number answer",
};

const SPLIT: Record<Difficulty, [number, number, number]> = {
  easy: [0.6, 0.3, 0.1],
  balanced: [0.4, 0.4, 0.2],
  hard: [0.2, 0.4, 0.4],
};

/** Splits n into whole parts in proportion to the weights, so the parts always add up to n. */
export function share(n: number, weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / total) * n);
  const parts = raw.map(Math.floor);
  const left = n - parts.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < left; k++) parts[order[k]![1]]!++;
  return parts;
}

/** The prompt a teacher pastes into their own AI. Its CSV contract is the import's (question.ts). */
export function buildPrompt(r: PromptRequest): string {
  const types = r.types.length > 0 ? r.types : (["single"] as QuestionType[]);
  const perType = share(
    r.count,
    types.map(() => 1),
  );
  const mix = types.map((t, i) => `${perType[i]} ${TYPE_WORDS[t]}`).join(", ");
  const [easy, medium, hard] = share(r.count, SPLIT[r.difficulty]);
  const topic = r.chapter.trim() ? `, chapter "${r.chapter.trim()}"` : "";

  const rules = [
    "- type: one of single, multiple, true_false, short_text, numeric",
    "- prompt: the question in double quotes, on one line; write maths as plain text (x^2, sqrt(2), 3/4), no LaTeX",
    "- options: for single and multiple only, 2 to 6 choices joined by | ; empty for the other types",
    "- correct: single → one letter (B); multiple → letters joined by | (A|C); true_false → true or false; short_text → accepted answers joined by | ; numeric → a number only, no units",
    "- points: 1 for easy, 2 for medium, 3 for hard",
    "- tags: the difficulty and one topic word, joined by | , lower case with hyphens (medium|free-fall)",
    "- tolerance: numeric only, the error allowed (0.01); empty for the other types",
  ];
  rules[0] = `- type: one of ${types.join(", ")}`;

  return [
    `Write ${r.count} exam questions for ${r.board}, ${r.className}, ${r.subject}${topic}.`,
    "Stay within the current textbook for this board and class; do not go beyond the syllabus.",
    `Mix: ${mix}. Difficulty: ${easy} easy, ${medium} medium, ${hard} hard.`,
    "",
    "Reply with ONLY a CSV in one code block. The first line must be exactly:",
    CSV_HEADER.join(","),
    "",
    ...rules,
    "",
    "Put every text field in double quotes, and double any quote inside it.",
    'Each question has one clearly correct answer; wrong options are believable; no "all of the above"; vary which letter is correct; check every calculation.',
  ].join("\n");
}

/** The tags the app adds to every imported question, from the teacher's choice, never the AI's. */
export function selectionTags(
  boardId: string,
  classId: string,
  subjectId: string,
  chapter: string,
) {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return [boardId, `class-${classId}`, subjectId, slug(chapter)].filter(Boolean);
}

/** `row` counts questions from 1, skipping the header and blank lines. */
export type ImportRow = { row: number; result: QuestionInput | string };

/**
 * A CSV from a spreadsheet or pasted from an AI, as rows checked by rowToQuestion. An AI often wraps
 * the CSV in a ``` block or adds a sentence before it, so anything before the header is dropped.
 */
export function readQuestionsCsv(text: string): ImportRow[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const header = lines.findIndex((l) => l.trim().toLowerCase().startsWith("type,"));
  const body = (header >= 0 ? lines.slice(header + 1) : lines)
    .filter((l) => !l.trim().startsWith("```"))
    .join("\n");
  return parseCsv(body).map((row, i) => ({ row: i + 1, result: rowToQuestion(row) }));
}
