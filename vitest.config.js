import { defineConfig } from "vitest/config";

/**
 * Keeps fast unit and API tests in Node while excluding browser journeys,
 * which are run separately by Playwright.
 */
export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["shared/**/*.js", "server/**/*.js"],
    },
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
});
