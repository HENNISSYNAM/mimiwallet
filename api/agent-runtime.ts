/**
 * Vercel Function (Node.js runtime) — Browser Agent Runtime của MIMI. Hợp đồng: `docs/CLOUD_AGENT_RUNTIME.md`.
 *
 *   GET  /api/agent-runtime  → kiểm sức khoẻ (không mở trình duyệt).
 *   POST /api/agent-runtime  → lệnh chạy đã ký Ed25519 từ Orchestrator `agent-dieu-phoi` + JWT người dùng.
 *
 * Toàn bộ logic ở `cloud-runtime/` (test được ngoài Vercel). Import có đuôi `.js` vì package.json là "type": "module" —
 * Node ESM trên Vercel không tự đoán đuôi tệp.
 */
import { xuLyYeuCau } from '../cloud-runtime/xuLy.js';
import { KHOA_CONG_KHAI_ORCHESTRATOR } from '../cloud-runtime/khoa.js';

export default {
  fetch(req: Request): Promise<Response> {
    return xuLyYeuCau(req, { khoaCongKhai: KHOA_CONG_KHAI_ORCHESTRATOR });
  },
};
