import { defineConfig, devices } from "@playwright/test";

const desktop = /desktop\.spec\.ts/;
const phone = /phone\.spec\.ts/;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", testMatch: desktop, use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", testMatch: desktop, use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", testMatch: desktop, use: { ...devices["Desktop Safari"] } },
    { name: "android", testMatch: phone, use: { ...devices["Pixel 7"] } },
    { name: "iphone", testMatch: phone, use: { ...devices["iPhone 15"] } },
  ],
});
