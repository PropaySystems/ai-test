import eslint from "@eslint/js";
import globals from "globals";

/**
 * Applies recommended JavaScript checks while assigning browser, worker, and
 * Node globals only to the folders where they are valid.
 */
export default [
  {
    ignores: [
      "coverage/**",
      "data/**",
      "dist/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  eslint.configs.recommended,
  {
    files: ["src/**/*.js"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.worker },
    },
  },
  {
    files: [
      "server/**/*.js",
      "shared/**/*.js",
      "migrations/**/*.js",
      "tests/**/*.js",
      "*.config.js",
      "knexfile.js",
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    rules: {
      "no-console": "off",
    },
  },
];
