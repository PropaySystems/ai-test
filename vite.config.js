import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

/**
 * Configures the mobile web client and forwards API requests to Express during
 * local development so browser code can use same-origin relative URLs.
 */
export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    port: 5178,
    strictPort: true,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  build: {
    outDir: "dist",
  },
});
