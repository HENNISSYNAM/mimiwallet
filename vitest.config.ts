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
    // Mặc định 5 giây của vitest quá ngắn cho máy chạy dự án này. Khi chạy cả bộ, nhiều tệp
    // được biên dịch song song nên riêng phần transform + render lần đầu của một tệp trang đã
    // ăn gần hết 5 giây, và hàng chục ca "quá thời gian" — chạy riêng từng tệp thì đều đạt.
    // Nới thời gian chờ để kết quả cả bộ nói đúng tình trạng mã, không nói tình trạng tải máy.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: { "@": path.resolve(rootDir, "src") },
  },
});
