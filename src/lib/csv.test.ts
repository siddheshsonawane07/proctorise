import { toCsv } from "./csv";

describe("toCsv", () => {
  it("quotes every cell and doubles quotes", () => {
    expect(toCsv([["a", 'say "hi"', 3, null]])).toBe('"a","say ""hi""","3",""');
  });

  it("stops a cell from running as a formula", () => {
    const csv = toCsv([['=HYPERLINK("http://x")', "+1", "-2", "@SUM(A1)", "\tx", "ok"]]);
    expect(csv).toBe('"\'=HYPERLINK(""http://x"")","\'+1","\'-2","\'@SUM(A1)","\'\tx","ok"');
  });
});
