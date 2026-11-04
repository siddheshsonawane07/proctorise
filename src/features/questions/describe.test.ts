import { describeAnswer } from "./describe";

const choice = {
  type: "multiple" as const,
  options: [
    { id: "a", text: "2" },
    { id: "b", text: "4" },
    { id: "c", text: "5" },
  ],
};

describe("describeAnswer", () => {
  it("names options by letter and text", () =>
    expect(describeAnswer(choice, ["a", "c"])).toBe("A. 2 and C. 5"));
  it("says when there is no answer", () => expect(describeAnswer(choice, null)).toBe("no answer"));
  it("reads a short-answer key", () =>
    expect(describeAnswer({ type: "short_text", options: [] }, ["Paris", "paris"])).toBe(
      "Paris or paris",
    ));
  it("reads true and false", () =>
    expect(describeAnswer({ type: "true_false", options: [] }, false)).toBe("False"));
});
