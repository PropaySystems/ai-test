import { defineConfig, devices } from "@playwright/test";

/**
 * Starts both local services and exercises the primary mobile-first journey in
 * a representative phone viewport.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://localhost:5178",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5178",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
