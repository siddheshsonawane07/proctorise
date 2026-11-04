import { readEnv } from "./env";

describe("readEnv", () => {
  it("returns the two public values", () => {
    const env = readEnv({
      VITE_SUPABASE_URL: "https://abc.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
    });
    expect(env.VITE_SUPABASE_URL).toBe("https://abc.supabase.co");
  });

  it("names what is missing", () => {
    expect(() => readEnv({ VITE_SUPABASE_URL: "https://abc.supabase.co" })).toThrow(
      /VITE_SUPABASE_PUBLISHABLE_KEY/,
    );
  });

  it("refuses a URL that is not https", () => {
    expect(() =>
      readEnv({ VITE_SUPABASE_URL: "http://abc.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "k" }),
    ).toThrow(/VITE_SUPABASE_URL/);
  });
});
