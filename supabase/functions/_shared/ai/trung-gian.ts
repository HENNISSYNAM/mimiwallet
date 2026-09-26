/**
 * Trung gian Lovable AI (26/09/2026) — phần thuần, để test không cần máy chủ.
 *
 * VÌ SAO CÓ. Khoá Lovable AI chỉ nằm trong dự án Lovable Cloud (Lovable tự cấp, không cho lấy ra). Web thật
 * chạy trên dự án Supabase khác. Function `ai-trung-gian` được Lovable deploy vào dự án Lovable Cloud: nó
 * nhận yêu cầu dạng OpenAI Chat Completions từ `tro-ly` của máy chủ thật và chuyển sang cổng Lovable AI.
 *
 * GIỮ HẸP. Chỉ nhận người gọi có mã bí mật chung (so sánh thời gian không đổi). Chỉ nhận các trường cần
 * thiết, chỉ các mô hình trong danh sách, không stream, giới hạn kích thước. Không ghi nội dung vào log.
 * Ai có mã bí mật dùng được hạn mức Lovable AI của bạn — nên mã phải dài, ngẫu nhiên, và đổi được.
 */

/** Mô hình Lovable AI cho phép chuyển tiếp. */
export const MO_HINH_CHO_PHEP = /^(google\/gemini-[a-z0-9.-]{1,40}|openai\/gpt-5[a-z0-9.-]{0,30})$/;
/** Ảnh chứng từ (base64) có thể tới vài MB; câu hỏi thường vài chục KB. */
export const TOI_DA_BYTE = 8 * 1024 * 1024;
export const DO_DAI_KHOA_TOI_THIEU = 32;
const TRUONG_GIU = ['model', 'messages', 'tools', 'tool_choice', 'temperature', 'max_tokens'] as const;

/** So sánh thời gian không phụ thuộc số ký tự khớp — không dò được khoá theo độ trễ. */
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export type KetQuaKiem =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; status: number; cau: string };

/** Kiểm và lọc thân yêu cầu trước khi chuyển tiếp. Không bao giờ chuyển tiếp trường lạ. */
export function kiemYeuCauTrungGian(tho: unknown): KetQuaKiem {
  if (!tho || typeof tho !== 'object' || Array.isArray(tho)) return { ok: false, status: 400, cau: 'Thân yêu cầu phải là một đối tượng JSON.' };
  const b = tho as Record<string, unknown>;
  if (typeof b.model !== 'string' || !MO_HINH_CHO_PHEP.test(b.model)) return { ok: false, status: 400, cau: 'Mô hình không được phép.' };
  if (!Array.isArray(b.messages) || b.messages.length < 1 || b.messages.length > 60) return { ok: false, status: 400, cau: 'Danh sách tin nhắn không hợp lệ.' };
  if (!b.messages.every((m) => m && typeof m === 'object' && typeof (m as { role?: unknown }).role === 'string')) {
    return { ok: false, status: 400, cau: 'Tin nhắn không hợp lệ.' };
  }
  if (b.tools !== undefined && (!Array.isArray(b.tools) || b.tools.length > 64)) return { ok: false, status: 400, cau: 'Danh sách công cụ không hợp lệ.' };
  const body: Record<string, unknown> = {};
  for (const k of TRUONG_GIU) if (b[k] !== undefined) body[k] = b[k];
  body.stream = false;
  return { ok: true, body };
}

/** Lấy khoá người gọi đưa lên: `Authorization: Bearer …`. */
export const khoaNguoiGoi = (tieuDe: string | null): string => (tieuDe ?? '').replace(/^Bearer\s+/i, '').trim();
