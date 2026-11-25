import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  // Relative asset paths: the build works from any folder, e.g. GitHub Pages' /catacomb-cats/.
  base: "./",
  plugins: [react()],
  test: { include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"] },
});
