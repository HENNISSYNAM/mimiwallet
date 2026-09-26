/**
 * Tầng nhà cung cấp mô hình — Prompt 4 mục 35–37.
 *
 * LOGIC NGHIỆP VỤ KHÔNG BIẾT HÃNG NÀO. Trợ lý nói bằng `TinNhan`, `CongCu`, `PhanHoi` của file này; mỗi
 * hãng là một bộ chuyển đổi dịch qua lại khuôn riêng của hãng. Đổi hãng = thêm bộ chuyển + đổi một dòng
 * trong `DINH_TUYEN`, không sửa trợ lý.
 *
 * CHẤT LƯỢNG TRƯỚC LÒNG TRUNG THÀNH (mục 37). `DINH_TUYEN` hôm nay trỏ MỌI mục đích về đúng một cổng và
 * một mô hình — cổng duy nhất máy chủ đang có khoá (`LOVABLE_API_KEY`). Chưa có bộ chấm so sánh mô hình
 * (`_shared/eval`) cho từng loại việc, nên chưa có căn cứ đổi. Đổi một dòng phải kèm kết quả eval.
 *
 * Bộ chuyển Anthropic/OpenAI trực tiếp: khi thêm, dùng SDK chính thức của hãng — không tự đoán khuôn.
 */

export type VaiTinNhan = 'he_thong' | 'nguoi_dung' | 'tro_ly' | 'cong_cu';
export interface GoiCongCu { id: string; ten: string }
export interface TinNhan { vai: VaiTinNhan; noi_dung: string | null; goi_cong_cu?: GoiCongCu[]; id_goi?: string }
export interface CongCu { ten: string; mo_ta: string }
export interface PhanHoi { noi_dung: string | null; goi_cong_cu: GoiCongCu[]; token_vao: number | null; token_ra: number | null }

export class LoiNhaCungCap extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'LoiNhaCungCap';
  }
}

export interface NhaCungCap {
  ten: string;
  hoi(o: { mo_hinh: string; tin: TinNhan[]; cong_cu?: CongCu[] }): Promise<PhanHoi>;
}

type Goi = (url: string, init: RequestInit) => Promise<Response>;

/** Bộ chuyển cho cổng dạng OpenAI Chat Completions (Lovable AI gateway, OpenRouter…). */
export function congKieuOpenAI(o: { ten: string; url: string; khoa: string; goi?: Goi; dauThem?: Record<string, string> }): NhaCungCap {
  const goi = o.goi ?? ((u, i) => fetch(u, i));
  return {
    ten: o.ten,
    async hoi({ mo_hinh, tin, cong_cu }) {
      const messages = tin.map((m) =>
        m.vai === 'cong_cu' ? { role: 'tool', tool_call_id: m.id_goi, content: m.noi_dung ?? '' }
          : m.vai === 'tro_ly' && m.goi_cong_cu?.length
            ? { role: 'assistant', content: m.noi_dung, tool_calls: m.goi_cong_cu.map((g) => ({ id: g.id, type: 'function', function: { name: g.ten, arguments: '{}' } })) }
            : { role: m.vai === 'he_thong' ? 'system' : m.vai === 'tro_ly' ? 'assistant' : 'user', content: m.noi_dung ?? '' });
      const res = await goi(o.url, {
        method: 'POST',
        headers: { ...(o.dauThem ?? {}), Authorization: `Bearer ${o.khoa}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: mo_hinh, messages,
          ...(cong_cu?.length ? {
            tools: cong_cu.map((c) => ({ type: 'function', function: { name: c.ten, description: c.mo_ta, parameters: { type: 'object', properties: {}, additionalProperties: false } } })),
            tool_choice: 'auto',
          } : {}),
        }),
      });
      if (!res.ok) {
        const cau = res.status === 429 ? 'Cổng mô hình đang giới hạn tần suất.'
          : res.status === 402 ? 'Cổng mô hình hết hạn mức sử dụng.'
            : `Cổng mô hình trả lỗi ${res.status}.`;
        throw new LoiNhaCungCap(res.status, cau);
      }
      const j = await res.json().catch(() => null) as { choices?: Array<{ message?: Record<string, unknown> }>; usage?: { prompt_tokens?: number; completion_tokens?: number } } | null;
      const msg = j?.choices?.[0]?.message;
      if (!msg) throw new LoiNhaCungCap(502, 'Phản hồi của cổng mô hình không đúng khuôn.');
      const goiCC = Array.isArray(msg.tool_calls) ? msg.tool_calls as Array<{ id?: string; function?: { name?: string } }> : [];
      return {
        noi_dung: typeof msg.content === 'string' ? msg.content : null,
        goi_cong_cu: goiCC.map((g) => ({ id: String(g.id ?? g.function?.name ?? ''), ten: String(g.function?.name ?? '') })),
        token_vao: j?.usage?.prompt_tokens ?? null,
        token_ra: j?.usage?.completion_tokens ?? null,
      };
    },
  };
}

// ── Định tuyến theo loại việc (mục 35) ───────────────────────────────────────────────────────────
export const MUC_DICH = ['y_dinh', 'trich_xuat', 'phan_loai', 'dien_dat', 'phan_tich', 'tong_hop_phap_ly', 'doc_anh'] as const;
export type MucDich = (typeof MUC_DICH)[number];

export interface Tuyen { nha_cung_cap: 'lovable'; mo_hinh: string; hang: 'nhanh' | 'manh'; ly_do: string }

// ── Cổng mô hình máy chủ đang có khoá (26/09/2026) ───────────────────────────────────────────────
export const DIEM_GOI_OPENROUTER = 'https://openrouter.ai/api/v1/chat/completions';
/** Mô hình mặc định trên OpenRouter: cùng họ Gemini Flash với cổng Lovable, gọi công cụ và đọc ảnh được. */
export const MO_HINH_OPENROUTER_MAC_DINH = 'google/gemini-2.5-flash';
const TEN_MO_HINH = /^[a-z0-9][a-z0-9._-]{0,60}\/[a-z0-9][a-z0-9._:-]{0,80}$/i;

export interface CongMoHinh {
  ten: 'lovable' | 'lovable_trung_gian' | 'openrouter';
  url: string;
  khoa: string;
  mo_hinh: string;
  /** Đầu thêm của cổng (OpenRouter: tên ứng dụng gọi). Không chứa khoá. */
  dau_them: Record<string, string>;
}

/** Địa chỉ trung gian hợp lệ: function `ai-trung-gian` của một dự án Supabase (https). */
const URL_TRUNG_GIAN = /^https:\/\/[a-z0-9]{20}\.supabase\.co\/functions\/v1\/ai-trung-gian$/;
export const DO_DAI_KHOA_TRUNG_GIAN = 32;

/**
 * Chọn cổng theo cấu hình máy chủ, theo thứ tự:
 *   1. `LOVABLE_API_KEY` — gọi thẳng Lovable AI (chỉ có trong dự án Lovable Cloud);
 *   2. trung gian Lovable (`AI_TRUNG_GIAN_URL` + `AI_TRUNG_GIAN_KEY`) — máy chủ thật gọi function
 *      `ai-trung-gian` chạy trong dự án Lovable Cloud, function đó gọi Lovable AI;
 *   3. `OPENROUTER_API_KEY` (mô hình đổi bằng OPENROUTER_MODEL; tên sai khuôn thì bỏ qua).
 * Không có gì → `null`, trợ lý chạy bộ hiểu câu cố định.
 */
export function chonCongMoHinh(env: {
  lovable?: string | null; trungGianUrl?: string | null; trungGianKhoa?: string | null;
  openrouter?: string | null; moHinhOpenRouter?: string | null;
}): CongMoHinh | null {
  const lv = env.lovable?.trim();
  if (lv) return { ten: 'lovable', url: DIEM_GOI_LOVABLE, khoa: lv, mo_hinh: MO_HINH_MAC_DINH, dau_them: {} };
  const tgUrl = env.trungGianUrl?.trim() ?? '';
  const tgKhoa = env.trungGianKhoa?.trim() ?? '';
  if (URL_TRUNG_GIAN.test(tgUrl) && tgKhoa.length >= DO_DAI_KHOA_TRUNG_GIAN) {
    return { ten: 'lovable_trung_gian', url: tgUrl, khoa: tgKhoa, mo_hinh: MO_HINH_MAC_DINH, dau_them: {} };
  }
  const or = env.openrouter?.trim();
  if (or) {
    const m = env.moHinhOpenRouter?.trim();
    return {
      ten: 'openrouter', url: DIEM_GOI_OPENROUTER, khoa: or,
      mo_hinh: m && TEN_MO_HINH.test(m) ? m : MO_HINH_OPENROUTER_MAC_DINH,
      dau_them: { 'HTTP-Referer': 'https://www.mimiwallet.online', 'X-Title': 'MIMI Wallet' },
    };
  }
  return null;
}

/** Nhà cung cấp của một cổng. */
export const nhaCungCapCua = (c: CongMoHinh, goi?: Goi): NhaCungCap =>
  congKieuOpenAI({ ten: c.ten, url: c.url, khoa: c.khoa, dauThem: c.dau_them, goi });

export const MO_HINH_MAC_DINH = 'google/gemini-3-flash-preview';
const NHANH = (ly_do: string): Tuyen => ({ nha_cung_cap: 'lovable', mo_hinh: MO_HINH_MAC_DINH, hang: 'nhanh', ly_do });

/**
 * Mục đích → mô hình. Việc "mạnh" (phân tích nhiều tài liệu, tổng hợp pháp lý) CHƯA có mô hình mạnh hơn
 * được đo trên eval tài chính của MIMI — nên vẫn dùng mô hình nhanh, và số liệu/kết luận vẫn do bộ máy
 * tất định tính; mô hình chỉ chọn công cụ và diễn đạt.
 */
export const DINH_TUYEN: Record<MucDich, Tuyen> = {
  y_dinh: NHANH('Chọn công cụ: việc ngắn, cần nhanh.'),
  trich_xuat: NHANH('Trích trường từ văn bản ngắn.'),
  phan_loai: NHANH('Phân loại đơn giản; kết quả luôn cần người xác nhận.'),
  dien_dat: NHANH('Viết lại kết quả tất định thành lời.'),
  phan_tich: { ...NHANH('Chưa có mô hình mạnh hơn qua eval tài chính của MIMI.'), hang: 'manh' },
  tong_hop_phap_ly: { ...NHANH('Chưa có mô hình mạnh hơn qua eval; căn cứ pháp lý chỉ lấy từ kho đã đối chiếu.'), hang: 'manh' },
  doc_anh: NHANH('Đọc ảnh chứng từ; người dùng xác nhận từng trường.'),
};

export const DIEM_GOI_LOVABLE = 'https://ai.gateway.lovable.dev/v1/chat/completions';

export function chonNhaCungCap(mucDich: MucDich, khoa: { lovable?: string }, goi?: Goi): { ncc: NhaCungCap; tuyen: Tuyen } {
  const tuyen = DINH_TUYEN[mucDich];
  if (!khoa.lovable) throw new LoiNhaCungCap(503, 'Máy chủ chưa có khoá mô hình.');
  return { ncc: congKieuOpenAI({ ten: 'lovable', url: DIEM_GOI_LOVABLE, khoa: khoa.lovable, goi }), tuyen };
}

// ── Đo từng lần gọi (mục 36) ─────────────────────────────────────────────────────────────────────
export interface LanGoi {
  nha_cung_cap: string; mo_hinh: string; muc_dich: MucDich; do_tre_ms: number;
  token_vao: number | null; token_ra: number | null; thanh_cong: boolean; ma_loi: number | null;
}

/** Bọc một nhà cung cấp để đo độ trễ và token mỗi lần gọi, không đổi hành vi. */
export function coDo(ncc: NhaCungCap, mucDich: MucDich, ghi: (l: LanGoi) => void, bayGio: () => number = () => Date.now()): NhaCungCap {
  return {
    ten: ncc.ten,
    async hoi(o) {
      const bd = bayGio();
      try {
        const r = await ncc.hoi(o);
        ghi({ nha_cung_cap: ncc.ten, mo_hinh: o.mo_hinh, muc_dich: mucDich, do_tre_ms: bayGio() - bd, token_vao: r.token_vao, token_ra: r.token_ra, thanh_cong: true, ma_loi: null });
        return r;
      } catch (e) {
        ghi({ nha_cung_cap: ncc.ten, mo_hinh: o.mo_hinh, muc_dich: mucDich, do_tre_ms: bayGio() - bd, token_vao: null, token_ra: null, thanh_cong: false, ma_loi: e instanceof LoiNhaCungCap ? e.status : null });
        throw e;
      }
    },
  };
}
