import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@system-canvas/core": resolve(rootDir, "../core/src"),
      "@system-canvas/dsl": resolve(rootDir, "../dsl/src"),
      "@system-canvas/patterns": resolve(rootDir, "../patterns/src"),
      "@system-canvas/ui": resolve(rootDir, "../ui/src"),
    },
  },
  server: {
    port: 5173,
  },
});
