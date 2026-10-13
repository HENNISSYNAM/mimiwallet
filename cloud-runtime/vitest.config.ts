import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Runtime là mã Node (Vercel Function): kiểm thử trong môi trường node, tách khỏi cấu hình jsdom của web
// (vitest.config.ts gốc chỉ quét src/ và supabase/, không đụng thư mục này). Chạy:
//   npx vitest run --config cloud-runtime/vitest.config.ts
//   MIMI_KIEM_TRINH_DUYET=1 … (thêm test Chrome thật)   MIMI_KIEM_WEB_THAT=1 … (thêm test website công khai)
const goc = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root: goc,
  test: { environment: 'node', include: ['**/*.test.ts'], testTimeout: 90_000, hookTimeout: 90_000 },
});
