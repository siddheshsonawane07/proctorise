import { CSV_TEMPLATE, parseCsv, rowToQuestion } from "./question";

describe("parseCsv", () => {
  it("handles quotes, commas inside quotes and doubled quotes", () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\nd,e,f\n')).toEqual([
      ["a", "b, c", 'say "hi"'],
      ["d", "e", "f"],
    ]);
  });

  it("drops blank lines", () => {
    expect(parseCsv("a,b\n\n,\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});

describe("rowToQuestion", () => {
  const rows = parseCsv(CSV_TEMPLATE).slice(1);

  it("reads every row of the template", () => {
    for (const row of rows) expect(typeof rowToQuestion(row)).toBe("object");
  });

  it("maps option letters to ids", () => {
    expect(rowToQuestion(rows[0]!)).toMatchObject({ type: "single", correct: "b" });
    expect(rowToQuestion(rows[1]!)).toMatchObject({ type: "multiple", correct: ["a", "c"] });
  });

  it("keeps an empty short-text key for marking by hand", () => {
    expect(rowToQuestion(rows[4]!)).toMatchObject({ type: "short_text", correct: [] });
  });

  it("reads a numeric tolerance", () => {
    expect(rowToQuestion(rows[5]!)).toMatchObject({ correct: 3.14, tolerance: 0.005 });
  });

  it("explains a letter outside the options", () => {
    expect(rowToQuestion(["single", "Q", "x|y", "C"])).toMatch(/option letters/);
  });

  it("explains an unknown type", () => {
    expect(rowToQuestion(["essay", "Q"])).toMatch(/Unknown type/);
  });

  it("refuses two letters for a single answer", () => {
    expect(rowToQuestion(["single", "Q", "x|y", "A|B"])).toMatch(/one letter/);
  });
});
