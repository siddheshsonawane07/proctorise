import { isValidProctoring, type Proctoring } from "./proctoring";

const DEFAULT: Proctoring = {
  preset: "standard",
  identity_check: true,
  phone_required: false,
  screen_share_required: false,
  snapshot_interval_s: 60,
  auto_submit_screen_share_s: null,
  auto_submit_phone_gone_min: null,
};

describe("isValidProctoring (mirrors valid_proctoring in the database)", () => {
  it("accepts the database's default", () => expect(isValidProctoring(DEFAULT)).toBe(true));
  it("refuses a missing key", () => expect(isValidProctoring({ preset: "standard" })).toBe(false));
  it("refuses an extra key", () =>
    expect(isValidProctoring({ ...DEFAULT, record: true })).toBe(false));
  it("refuses an unknown preset", () =>
    expect(isValidProctoring({ ...DEFAULT, preset: "lax" })).toBe(false));
  it("refuses a snapshot interval out of range", () =>
    expect(isValidProctoring({ ...DEFAULT, snapshot_interval_s: 5 })).toBe(false));
  it("accepts settings with or without spoken warnings", () => {
    expect(isValidProctoring({ ...DEFAULT, spoken_warnings: false })).toBe(true);
    expect(isValidProctoring({ ...DEFAULT, spoken_warnings: "yes" })).toBe(false);
  });
  it("accepts an automatic action in range", () =>
    expect(isValidProctoring({ ...DEFAULT, auto_submit_phone_gone_min: 2 })).toBe(true));
});
