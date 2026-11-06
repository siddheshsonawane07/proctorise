import { describe, expect, it } from "vitest";
import { readObjects } from "./objects";

describe("readObjects", () => {
  it("counts a phone's back, read as a remote, as a phone", () => {
    expect(readObjects([{ label: "remote", score: 0.68 }])).toEqual({ phone: 0.68, book: 0 });
  });

  it("takes the best of the phone labels", () => {
    const objects = [
      { label: "cell phone", score: 0.4 },
      { label: "remote", score: 0.7 },
      { label: "book", score: 0.55 },
    ];
    expect(readObjects(objects)).toEqual({ phone: 0.7, book: 0.55 });
  });

  it("does not count a mouse or a person", () => {
    const objects = [
      { label: "mouse", score: 0.9 },
      { label: "person", score: 0.95 },
    ];
    expect(readObjects(objects)).toEqual({ phone: 0, book: 0 });
  });
});
