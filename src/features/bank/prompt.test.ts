import { buildPrompt, readQuestionsCsv, selectionTags, share } from "./prompt";
import { CSV_HEADER, CSV_TEMPLATE } from "./question";

describe("share", () => {
  it("always adds up to the whole", () => {
    for (const n of [1, 7, 10, 23, 50]) {
      expect(share(n, [0.4, 0.4, 0.2]).reduce((a, b) => a + b, 0)).toBe(n);
      expect(share(n, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(n);
    }
  });
});

describe("buildPrompt", () => {
  const prompt = buildPrompt({
    board: "Maharashtra State Board (SSC)",
    className: "Class 10",
    subject: "Science and Technology Part 1",
    chapter: "Gravitation",
    count: 10,
    types: ["single", "true_false", "numeric"],
    difficulty: "balanced",
  });

  it("carries the import's exact CSV header", () => {
    expect(prompt).toContain(`\n${CSV_HEADER.join(",")}\n`);
  });

  it("names the selection, the mix and the difficulty split", () => {
    expect(prompt).toContain('Science and Technology Part 1, chapter "Gravitation"');
    expect(prompt).toContain("4 one-correct-answer, 3 true/false, 3 number answer");
    expect(prompt).toContain("4 easy, 4 medium, 2 hard");
    expect(prompt).toContain("- type: one of single, true_false, numeric");
  });
});

describe("selectionTags", () => {
  it("makes tags from the teacher's choice", () => {
    expect(selectionTags("msbshse", "10", "science-1", "Refraction of Light")).toEqual([
      "msbshse",
      "class-10",
      "science-1",
      "refraction-of-light",
    ]);
    expect(selectionTags("msbshse", "10", "english", "")).toEqual([
      "msbshse",
      "class-10",
      "english",
    ]);
  });
});

describe("readQuestionsCsv", () => {
  it("reads an AI reply with a sentence and a code block around the CSV", () => {
    const reply = `Here are your questions:\n\n\`\`\`csv\n${CSV_TEMPLATE}\`\`\`\nGood luck!`;
    const rows = readQuestionsCsv(reply);
    expect(rows.map((r) => r.row)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(rows.slice(0, 6).every((r) => typeof r.result === "object")).toBe(true);
    expect(rows[6]!.result).toBe('Unknown type "Good luck!"');
  });

  it("gives each bad row its reason", () => {
    const rows = readQuestionsCsv(
      `${CSV_HEADER.join(",")}\nsingle,"Pick one",A|B,C,1,,\nnumeric,"How many?",,many,1,,`,
    );
    expect(rows[0]!.result).toMatch(/option letters/);
    expect(rows[1]!.result).toMatch(/not a number/);
  });
});
