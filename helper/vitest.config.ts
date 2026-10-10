import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Bộ chạy tại máy là mã Node: chạy kiểm thử trong môi trường node, không dùng setup jsdom của web.
const goc = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root: goc,
  test: { environment: 'node', include: ['src/**/*.test.ts'], testTimeout: 60_000, hookTimeout: 60_000 },
  resolve: { alias: { '@': path.resolve(goc, '..', 'src') } },
});
