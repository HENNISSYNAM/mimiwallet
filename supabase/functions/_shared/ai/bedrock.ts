/**
 * Cổng Amazon Bedrock (22/11/2026) — Converse API, xác thực bằng khoá API Bedrock (`Authorization: Bearer`).
 *
 * Khoá trong sandbox AWS của cuộc thi chỉ là khoá NGẮN HẠN (≤ 12 giờ; sandbox không cho tạo khoá dài hạn vì thiếu
 * `iam:CreateUser`). Nên Bedrock là cổng ƯU TIÊN, không phải cổng duy nhất: lỗi bất kỳ (hết hạn 403, giới hạn 429,
 * chậm) → `goiCoDuPhong` chuyển sang cổng dự phòng và nói rõ đã chạy trên cổng nào — không giả vờ.
 *
 * Chỉ văn bản (không công cụ): đủ cho Agent Phân loại. Chi phí: Converse không trả tiền đã trừ → `chi_phi_usd = null`,
 * xu tính theo bảng giá / mức cố định như mọi cổng không báo giá.
 */
import { LoiNhaCungCap, THOI_GIAN_CHO_MAC_DINH, type NhaCungCap, type PhanHoi, type TinNhan } from './nha-cung-cap.ts';

export const MO_HINH_BEDROCK_MAC_DINH = 'apac.amazon.nova-lite-v1:0';
export const VUNG_BEDROCK_MAC_DINH = 'ap-southeast-1';
const VUNG_RE = /^[a-z]{2}(-[a-z]+)+-\d$/;
const MO_HINH_RE = /^[a-z0-9][a-z0-9.:-]{2,120}$/i;

type Goi = (url: string, init: RequestInit) => Promise<Response>;

export interface CongBedrock { khoa: string; vung: string; mo_hinh: string }

/** Đọc cấu hình máy chủ. Thiếu khoá → null. Vùng / mô hình sai khuôn → dùng mặc định (không ghép chuỗi lạ vào URL). */
export function chonBedrock(env: { khoa?: string | null; vung?: string | null; mo_hinh?: string | null }): CongBedrock | null {
  const khoa = env.khoa?.trim();
  if (!khoa) return null;
  const vung = env.vung?.trim();
  const mh = env.mo_hinh?.trim();
  return {
    khoa,
    vung: vung && VUNG_RE.test(vung) ? vung : VUNG_BEDROCK_MAC_DINH,
    mo_hinh: mh && MO_HINH_RE.test(mh) ? mh : MO_HINH_BEDROCK_MAC_DINH,
  };
}

export const diemGoiBedrock = (vung: string, moHinh: string) =>
  `https://bedrock-runtime.${vung}.amazonaws.com/model/${encodeURIComponent(moHinh)}/converse`;

/** Dịch `TinNhan` sang khuôn Converse: tin hệ thống vào `system`, còn lại vào `messages` (gộp tin liền kề cùng vai). */
export function sangConverse(tin: TinNhan[]): { system: { text: string }[]; messages: { role: 'user' | 'assistant'; content: { text: string }[] }[] } {
  const system = tin.filter((m) => m.vai === 'he_thong' && m.noi_dung).map((m) => ({ text: m.noi_dung! }));
  const messages: { role: 'user' | 'assistant'; content: { text: string }[] }[] = [];
  for (const m of tin) {
    if (m.vai === 'he_thong' || !m.noi_dung) continue;
    const role = m.vai === 'tro_ly' ? 'assistant' : 'user';
    const cuoi = messages.at(-1);
    if (cuoi && cuoi.role === role) cuoi.content.push({ text: m.noi_dung });
    else messages.push({ role, content: [{ text: m.noi_dung }] });
  }
  return { system, messages };
}

export function congBedrock(c: CongBedrock, goi: Goi = (u, i) => fetch(u, i)): NhaCungCap {
  return {
    ten: 'bedrock',
    async hoi({ mo_hinh, tin, han_ms }): Promise<PhanHoi> {
      const han = Math.max(1000, han_ms ?? THOI_GIAN_CHO_MAC_DINH);
      const ctrl = new AbortController();
      let hetGio = false;
      const hen = setTimeout(() => { hetGio = true; ctrl.abort(); }, han);
      let res: Response;
      try {
        res = await goi(diemGoiBedrock(c.vung, mo_hinh || c.mo_hinh), {
          signal: ctrl.signal,
          method: 'POST',
          headers: { Authorization: `Bearer ${c.khoa}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...sangConverse(tin), inferenceConfig: { maxTokens: 1500, temperature: 0.2 } }),
        });
      } catch (e) {
        const ten = (e as { name?: string })?.name;
        if (hetGio || ten === 'TimeoutError' || ten === 'AbortError') throw new LoiNhaCungCap(504, 'Bedrock phản hồi quá chậm.');
        throw new LoiNhaCungCap(502, 'Không gọi được Bedrock.');
      } finally {
        clearTimeout(hen);
      }
      if (!res.ok) {
        const cau = res.status === 403 || res.status === 401 ? 'Khoá Bedrock hết hạn hoặc không đủ quyền.'
          : res.status === 429 ? 'Bedrock đang giới hạn tần suất.' : `Bedrock trả lỗi ${res.status}.`;
        throw new LoiNhaCungCap(res.status, cau);
      }
      const j = await res.json().catch(() => null) as { output?: { message?: { content?: { text?: string }[] } }; usage?: { inputTokens?: number; outputTokens?: number } } | null;
      const noi = j?.output?.message?.content;
      if (!Array.isArray(noi)) throw new LoiNhaCungCap(502, 'Phản hồi của Bedrock không đúng khuôn.');
      return {
        noi_dung: noi.map((x) => x.text ?? '').join('') || null,
        goi_cong_cu: [],
        token_vao: j?.usage?.inputTokens ?? null,
        token_ra: j?.usage?.outputTokens ?? null,
        chi_phi_usd: null,
      };
    },
  };
}

export interface CongThu { ten_hien_thi: string; ncc: NhaCungCap; mo_hinh: string }

/**
 * Thử lần lượt từng cổng; cổng đầu lỗi thì sang cổng sau. Trả phản hồi + cổng đã chạy thật + các lỗi gặp trên đường
 * (để luồng tin nói rõ "Bedrock lỗi, đã chạy trên cổng dự phòng"). Hết cổng → ném lỗi của cổng cuối.
 */
export async function goiCoDuPhong(
  cong: CongThu[], tin: TinNhan[], hanMs?: number,
): Promise<{ phan_hoi: PhanHoi; cong: string; loi_truoc: string[] }> {
  const loi: string[] = [];
  let cuoi: unknown = new LoiNhaCungCap(503, 'Chưa có cổng mô hình nào.');
  for (const c of cong) {
    try {
      const phan_hoi = await c.ncc.hoi({ mo_hinh: c.mo_hinh, tin, han_ms: hanMs });
      return { phan_hoi, cong: c.ten_hien_thi, loi_truoc: loi };
    } catch (e) {
      cuoi = e;
      loi.push(`${c.ten_hien_thi}: ${e instanceof LoiNhaCungCap ? e.message : 'lỗi không rõ'}`);
    }
  }
  throw cuoi;
}
