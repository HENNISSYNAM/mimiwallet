/**
 * Đọc chi phí AI THẬT từ nhà cung cấp — không ước tính từ số token.
 *
 * Đã đối chiếu tài liệu ngày 15/09/2026:
 *
 *   Anthropic — GET https://api.anthropic.com/v1/organizations/cost_report
 *     Header `x-api-key` (Admin API key) + `anthropic-version: 2023-06-01`.
 *     Bucket theo ngày (UTC). `results[].amount` là CHUỖI thập phân tính bằng
 *     đơn vị nhỏ nhất: "123.45" USD = $1.2345. `currency` hiện luôn "USD".
 *     Phân trang: `has_more` + `next_page` → tham số `page`.
 *     https://platform.claude.com/docs/en/api/beta/organization/cost_report/retrieve
 *
 *   OpenAI — GET https://api.openai.com/v1/organization/costs
 *     Header `Authorization: Bearer <Admin key>`. `start_time`/`end_time` là giây
 *     Unix, `bucket_width=1d`. `results[].amount.value` tính bằng ĐÔ LA, `currency`
 *     "usd"; `line_item` dạng "gpt-4o-2024-08-06, input"; `project_id`.
 *     Phân trang: `next_page` → tham số `page`.
 *     https://developers.openai.com/cookbook/examples/completions_usage_api
 *
 *   Gemini — không có API chi phí (chỉ AI Studio và Cloud Billing), nên không
 *     có adapter ở đây; người dùng xuất file.
 *
 * Hàm gọi mạng nhận `goi` từ ngoài vào để test không cần mạng hay Deno.
 */

export type NhaCungCapApi = 'anthropic' | 'openai';
export const NHA_CUNG_CAP_API: readonly string[] = ['anthropic', 'openai'];
/** Kết nối bằng khoá được: hai nhà cung cấp có Cost API, cộng OpenRouter (Activity API, `token.ts`). */
export const NHA_CUNG_CAP_KET_NOI: readonly string[] = ['anthropic', 'openai', 'openrouter'];
export const NHA_CUNG_CAP_NHAP: readonly string[] = ['anthropic', 'openai', 'gemini', 'openrouter', 'khac'];

const TEN: Record<NhaCungCapApi, string> = { anthropic: 'Anthropic', openai: 'OpenAI' };
const NGAY_MS = 86_400_000;

export interface DongChiPhi {
  /** YYYY-MM-DD theo UTC. */
  ngay: string;
  hang_muc: string;
  du_an: string;
  so_tien_usd: number;
}

export class LoiNhaCungCap extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'LoiNhaCungCap';
  }
  /** Khoá sai, hết hiệu lực, hoặc không phải khoá quản trị. */
  get khoaHong(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

const chuoi = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const laNgay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

export function docChiPhiAnthropic(json: unknown): { dong: DongChiPhi[]; tiep: string | null } {
  const j = json as { data?: unknown; has_more?: unknown; next_page?: unknown } | null;
  if (!j || !Array.isArray(j.data)) throw new LoiNhaCungCap(502, 'Phản hồi cost_report của Anthropic không đúng khuôn.');
  const dong: DongChiPhi[] = [];
  for (const b of j.data as Array<Record<string, unknown>>) {
    const ngay = chuoi(b.starting_at).slice(0, 10);
    if (!laNgay(ngay)) throw new LoiNhaCungCap(502, 'Anthropic trả bucket không có ngày hợp lệ.');
    for (const r of (Array.isArray(b.results) ? b.results : []) as Array<Record<string, unknown>>) {
      const tienTe = chuoi(r.currency).toUpperCase();
      // Cộng lặng lẽ một đồng tiền khác vào tổng USD là sai số không ai thấy.
      if (tienTe !== 'USD') throw new LoiNhaCungCap(502, `Anthropic trả tiền tệ ${tienTe || 'không rõ'}; MIMI chỉ nhận USD.`);
      const donViNho = Number(chuoi(r.amount));
      if (!Number.isFinite(donViNho)) throw new LoiNhaCungCap(502, 'Anthropic trả số tiền không đọc được.');
      dong.push({
        ngay,
        hang_muc: chuoi(r.model) || chuoi(r.description) || chuoi(r.cost_type) || 'Khác',
        du_an: chuoi(r.workspace_id) || 'Workspace mặc định',
        so_tien_usd: donViNho / 100,
      });
    }
  }
  return { dong, tiep: j.has_more === true && typeof j.next_page === 'string' ? j.next_page : null };
}

export function docChiPhiOpenAI(json: unknown): { dong: DongChiPhi[]; tiep: string | null } {
  const j = json as { data?: unknown; has_more?: unknown; next_page?: unknown } | null;
  if (!j || !Array.isArray(j.data)) throw new LoiNhaCungCap(502, 'Phản hồi costs của OpenAI không đúng khuôn.');
  const dong: DongChiPhi[] = [];
  for (const b of j.data as Array<Record<string, unknown>>) {
    const giay = Number(b.start_time);
    if (!Number.isFinite(giay)) throw new LoiNhaCungCap(502, 'OpenAI trả bucket không có thời điểm hợp lệ.');
    const ngay = new Date(giay * 1000).toISOString().slice(0, 10);
    for (const r of (Array.isArray(b.results) ? b.results : []) as Array<Record<string, unknown>>) {
      const tien = (r.amount ?? {}) as { value?: unknown; currency?: unknown };
      const tienTe = chuoi(tien.currency).toUpperCase();
      if (tienTe !== 'USD') throw new LoiNhaCungCap(502, `OpenAI trả tiền tệ ${tienTe || 'không rõ'}; MIMI chỉ nhận USD.`);
      const so = Number(tien.value);
      if (!Number.isFinite(so)) throw new LoiNhaCungCap(502, 'OpenAI trả số tiền không đọc được.');
      // "gpt-4o-2024-08-06, input" và ", output" là cùng một mô hình: gộp theo phần trước dấu phẩy.
      const lineItem = chuoi(r.line_item);
      dong.push({
        ngay,
        hang_muc: lineItem ? lineItem.split(',')[0].trim() || lineItem : 'Khác',
        du_an: chuoi(r.project_name) || chuoi(r.project_id) || 'Dự án mặc định',
        so_tien_usd: so,
      });
    }
  }
  return { dong, tiep: j.has_more === true && typeof j.next_page === 'string' ? j.next_page : null };
}

export function urlAnthropic(tu: Date, den: Date, trang?: string): string {
  const q = new URLSearchParams({ starting_at: tu.toISOString(), ending_at: den.toISOString(), limit: '31' });
  q.append('group_by[]', 'workspace_id');
  q.append('group_by[]', 'description');
  if (trang) q.set('page', trang);
  return `https://api.anthropic.com/v1/organizations/cost_report?${q}`;
}

export function urlOpenAI(tu: Date, den: Date, trang?: string): string {
  const q = new URLSearchParams({
    start_time: String(Math.floor(tu.getTime() / 1000)),
    end_time: String(Math.floor(den.getTime() / 1000)),
    bucket_width: '1d',
  });
  q.append('group_by', 'line_item');
  q.append('group_by', 'project_id');
  if (trang) q.set('page', trang);
  return `https://api.openai.com/v1/organization/costs?${q}`;
}

function thongDiepLoi(ncc: NhaCungCapApi, status: number, body: unknown): string {
  const goc = chuoi((body as { error?: { message?: unknown } } | null)?.error?.message);
  const kem = goc ? ` (${goc.slice(0, 200)})` : '';
  if (status === 401 || status === 403) return `${TEN[ncc]} từ chối khoá: cần Admin API key còn hiệu lực.${kem}`;
  if (status === 429) return `${TEN[ncc]} đang giới hạn tần suất — thử lại sau một phút.`;
  return `${TEN[ncc]} trả lỗi ${status}.${kem}`;
}

type Goi = (url: string, init: RequestInit) => Promise<Response>;

/** Tải mọi trang chi phí trong [tu, den). Khoá không bao giờ xuất hiện trong thông điệp lỗi. */
export async function taiChiPhi(
  ncc: NhaCungCapApi,
  khoa: string,
  tu: Date,
  den: Date,
  goi: Goi = (url, init) => fetch(url, init),
): Promise<DongChiPhi[]> {
  const headers: Record<string, string> = ncc === 'anthropic'
    ? { 'x-api-key': khoa, 'anthropic-version': '2023-06-01', 'User-Agent': 'MIMIWallet/1.0' }
    : { Authorization: `Bearer ${khoa}`, 'Content-Type': 'application/json' };
  const tatCa: DongChiPhi[] = [];
  let trang: string | undefined;
  for (let lan = 0; lan < 50; lan++) {
    const res = await goi(ncc === 'anthropic' ? urlAnthropic(tu, den, trang) : urlOpenAI(tu, den, trang), { headers });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new LoiNhaCungCap(res.status, thongDiepLoi(ncc, res.status, body));
    const { dong, tiep } = ncc === 'anthropic' ? docChiPhiAnthropic(body) : docChiPhiOpenAI(body);
    tatCa.push(...dong);
    if (!tiep) return tatCa;
    trang = tiep;
  }
  throw new LoiNhaCungCap(502, 'Quá nhiều trang dữ liệu chi phí.');
}

/** Cộng các dòng trùng ngày + hạng mục + dự án (Anthropic tách từng loại token thành dòng riêng). */
export function gopDong(ds: DongChiPhi[]): DongChiPhi[] {
  const m = new Map<string, DongChiPhi>();
  for (const d of ds) {
    const k = `${d.ngay} ${d.hang_muc} ${d.du_an}`;
    const cu = m.get(k);
    if (cu) cu.so_tien_usd += d.so_tien_usd;
    else m.set(k, { ...d });
  }
  return [...m.values()].map((d) => ({ ...d, so_tien_usd: Math.round(d.so_tien_usd * 1e6) / 1e6 }));
}

/** Kiểm một dòng file người dùng gửi lên. Máy chủ không tin bản đã kiểm ở trình duyệt. */
export function kiemDongNhap(v: unknown, homNay: Date): { dong: DongChiPhi; loi?: undefined } | { loi: string; dong?: undefined } {
  if (!v || typeof v !== 'object') return { loi: 'dòng không đúng khuôn' };
  const r = v as Record<string, unknown>;
  const ngay = chuoi(r.ngay);
  if (!laNgay(ngay)) return { loi: `ngày "${ngay.slice(0, 30)}" không hợp lệ` };
  if (new Date(`${ngay}T00:00:00Z`).getTime() > homNay.getTime() + NGAY_MS) return { loi: `ngày ${ngay} nằm ở tương lai` };
  const so = r.so_tien_usd;
  if (typeof so !== 'number' || !Number.isFinite(so) || Math.abs(so) >= 1e9) return { loi: 'số tiền không hợp lệ' };
  return {
    dong: {
      ngay,
      hang_muc: chuoi(r.hang_muc).slice(0, 200) || 'Khác',
      du_an: chuoi(r.du_an).slice(0, 200) || 'Không rõ',
      so_tien_usd: so,
    },
  };
}

/** Kiểm khuôn trước khi gọi thử. Gọi thử mới là phép kiểm thật (khoá thường sẽ bị từ chối). */
export function laKhoaAdmin(ncc: string, khoa: string): boolean {
  if (ncc === 'anthropic') return /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(khoa);
  if (ncc === 'openai') return /^sk-(?!ant-|or-)[A-Za-z0-9_-]{20,}$/.test(khoa);
  if (ncc === 'openrouter') return /^sk-or-[A-Za-z0-9_-]{20,}$/.test(khoa);
  return false;
}

/** Phần hiện được của khoá: loại khoá + 4 ký tự cuối. */
export function hienKhoa(khoa: string): string {
  const dau = khoa.startsWith('sk-ant-') ? khoa.slice(0, 14) : khoa.startsWith('sk-or-') ? khoa.slice(0, 9) : khoa.slice(0, 9);
  return `${dau}…${khoa.slice(-4)}`;
}
