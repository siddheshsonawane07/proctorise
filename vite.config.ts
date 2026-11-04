/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * The headers Cloudflare Pages will send, read from public/_headers, so `vite preview` (and every
 * Playwright run on it) enforces the same CSP as production. The local Supabase stack is plain
 * http on 127.0.0.1, so its origin is added to connect-src and img-src here, and only here.
 */
function productionHeaders(supabaseUrl: string | undefined): Record<string, string> {
  const text = readFileSync("public/_headers", "utf8");
  const block = text.split(/^\/\*\s*$/m)[1]?.split(/^\S/m)[0] ?? "";
  const headers: Record<string, string> = {};
  for (const line of block.split("\n")) {
    const match = line.match(/^\s+([A-Za-z-]+):\s*(.+)$/);
    if (match) headers[match[1]!] = match[2]!.trim();
  }
  if (supabaseUrl?.startsWith("http://") && headers["Content-Security-Policy"]) {
    const origin = new URL(supabaseUrl).origin;
    const ws = origin.replace(/^http/, "ws");
    headers["Content-Security-Policy"] = headers["Content-Security-Policy"]
      .replace("connect-src 'self'", `connect-src 'self' ${origin} ${ws}`)
      .replace("img-src 'self'", `img-src 'self' ${origin}`);
  }
  return headers;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    plugins: [react(), tailwindcss()],
    preview: { headers: productionHeaders(env.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL) },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      // Unit tests never reach a server; these only satisfy readEnv().
      env: {
        VITE_SUPABASE_URL: "http://127.0.0.1:55321",
        VITE_SUPABASE_PUBLISHABLE_KEY: "test-key",
      },
    },
  };
});
