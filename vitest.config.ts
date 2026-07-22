import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";

// package.json sets "type": "module", so __dirname does not exist here. Vitest
// bundles this config before evaluating it, and the shim it substitutes pointed
// one directory too high — setupFiles and the "@" alias both resolved against
// the parent folder. Deriving the directory from import.meta.url pins them to
// this file's real location no matter where vitest is invoked from.
const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: rootDir,
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [path.resolve(rootDir, "src/test/setup.ts")],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "supabase/functions/**/*.{test,spec}.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(rootDir, "src") },
  },
});
