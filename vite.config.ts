/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
});
