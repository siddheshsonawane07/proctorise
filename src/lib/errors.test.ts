import { messageFrom, safeNext } from "./errors";

describe("safeNext", () => {
  it("keeps a same-site path", () =>
    expect(safeNext("/app/admin/teachers")).toBe("/app/admin/teachers"));
  it("refuses another site", () => expect(safeNext("//evil.example")).toBe("/app"));
  it("refuses a full URL", () => expect(safeNext("https://evil.example")).toBe("/app"));
  it("defaults to the app", () => expect(safeNext(null)).toBe("/app"));
});

describe("messageFrom", () => {
  it("explains a wrong password", () =>
    expect(messageFrom({ message: "Invalid login credentials" })).toBe(
      "That email and password don't match.",
    ));
  it("passes a database message through", () =>
    expect(messageFrom({ message: "Say which school or institution you teach at" })).toBe(
      "Say which school or institution you teach at",
    ));
  it("has a fallback", () => expect(messageFrom(undefined)).toMatch(/try again/));
});
