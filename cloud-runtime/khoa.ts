/**
 * Khoá công khai Ed25519 của Orchestrator (`agent-dieu-phoi`), dạng 32 byte thô base64url.
 *
 * Vì sao nằm trong code mà không ở biến môi trường: runtime "không giữ bí mật" và khoá công khai không phải bí mật —
 * đặt trong code thì đổi khoá là một lần sửa có dấu vết (review được), không ai đổi lặng lẽ qua bảng điều khiển Vercel.
 *
 * Sinh cặp khoá thật: `node scripts/sinh-khoa-runtime.mjs --ghi` — script ghi khoá công khai vào đây và khoá riêng ra
 * `.env.runtime.local` (bị .gitignore `*.local` loại), rồi chủ dự án chạy
 * `npx supabase secrets set --env-file .env.runtime.local`.
 *
 * Còn rỗng → runtime trả 503 "chưa cấu hình khoá", KHÔNG chạy lệnh nào (không có đường lùi về khoá DEV).
 */
export const KHOA_CONG_KHAI_ORCHESTRATOR = 'LP3ViRNbu3h6q8dKpVSvsCDgbOtXZjbcKxs4Q3RRGHQ';
