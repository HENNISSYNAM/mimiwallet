/**
 * Đọc SỐ TOKEN thật từ nhà cung cấp — để biết model nào ngốn nhiều và so giá.
 *
 * Đã đối chiếu tài liệu ngày 15/09/2026:
 *
 *   Anthropic — GET https://api.anthropic.com/v1/organizations/usage_report/messages
 *     Admin API key. `bucket_width=1d`, tối đa 31 bucket một trang, `group_by[]=model`.
 *     Mỗi dòng: `uncached_input_tokens`, `cache_creation.ephemeral_1h_input_tokens`,
 *     `cache_creation.ephemeral_5m_input_tokens`, `cache_read_input_tokens`,
 *     `output_tokens`. Không có số lần gọi. Phân trang `has_more` + `next_page`.
 *     https://platform.claude.com/docs/en/api/beta/organization/usage_report/retrieve_messages
 *
 *   OpenAI — GET https://api.openai.com/v1/organization/usage/completions
 *     Admin key. `start_time` (giây Unix), `bucket_width=1d`, `group_by=model`.
 *     Mỗi dòng: `input_tokens`, `input_cached_tokens`, `output_tokens`,
 *     `num_model_requests`, `model`. Phân trang `next_page`.
 *     https://developers.openai.com/cookbook/examples/completions_usage_api
 *
 *   OpenRouter — GET https://openrouter.ai/api/v1/activity (Management key)
 *     30 ngày UTC gần nhất đã xong. Mỗi dòng: `date`, `model`, `usage` (USD),
 *     `requests`, `prompt_tokens`, `completion_tokens`, `reasoning_tokens`.
 *     https://openrouter.ai/docs/api/api-reference/analytics/get-user-activity
 *
 * QUY ƯỚC MIMI: `token_vao` là TẤT CẢ token đầu vào (kể cả phần đọc từ cache và phần
 * ghi cache); `token_vao_cache` là phần đọc từ cache, nằm trong `token_vao`.
 */
import { LoiNhaCungCap, type DongChiPhi } from './nguon.ts';

export interface DongTokenNgay {
  ngay: string;
  model: string;
  token_vao: number;
  token_vao_cache: number;
  token_ra: number;
  so_lan_goi: number;
}

const chuoi = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const so = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
};
const laNgay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

export function docTokenAnthropic(json: unknown): { dong: DongTokenNgay[]; tiep: string | null } {
  const j = json as { data?: unknown; has_more?: unknown; next_page?: unknown } | null;
  if (!j || !Array.isArray(j.data)) throw new LoiNhaCungCap(502, 'Phản hồi usage_report của Anthropic không đúng khuôn.');
  const dong: DongTokenNgay[] = [];
  for (const b of j.data as Array<Record<string, unknown>>) {
    const ngay = chuoi(b.starting_at).slice(0, 10);
    if (!laNgay(ngay)) throw new LoiNhaCungCap(502, 'Anthropic trả bucket token không có ngày hợp lệ.');
    for (const r of (Array.isArray(b.results) ? b.results : []) as Array<Record<string, unknown>>) {
      const ghi = (r.cache_creation ?? {}) as Record<string, unknown>;
      const doc = so(r.cache_read_input_tokens);
      const vao = so(r.uncached_input_tokens) + so(ghi.ephemeral_1h_input_tokens) + so(ghi.ephemeral_5m_input_tokens) + doc;
      dong.push({ ngay, model: chuoi(r.model) || 'Không rõ', token_vao: vao, token_vao_cache: doc, token_ra: so(r.output_tokens), so_lan_goi: 0 });
    }
  }
  return { dong, tiep: j.has_more === true && typeof j.next_page === 'string' ? j.next_page : null };
}

export function docTokenOpenAI(json: unknown): { dong: DongTokenNgay[]; tiep: string | null } {
  const j = json as { data?: unknown; has_more?: unknown; next_page?: unknown } | null;
  if (!j || !Array.isArray(j.data)) throw new LoiNhaCungCap(502, 'Phản hồi usage của OpenAI không đúng khuôn.');
  const dong: DongTokenNgay[] = [];
  for (const b of j.data as Array<Record<string, unknown>>) {
    const giay = Number(b.start_time);
    if (!Number.isFinite(giay)) throw new LoiNhaCungCap(502, 'OpenAI trả bucket token không có thời điểm hợp lệ.');
    const ngay = new Date(giay * 1000).toISOString().slice(0, 10);
    for (const r of (Array.isArray(b.results) ? b.results : []) as Array<Record<string, unknown>>) {
      const vao = so(r.input_tokens);
      dong.push({
        ngay,
        model: chuoi(r.model) || 'Không rõ',
        token_vao: vao,
        // Phần cache nằm trong input_tokens; không để nó lớn hơn tổng khi dữ liệu lệch.
        token_vao_cache: Math.min(so(r.input_cached_tokens), vao),
        token_ra: so(r.output_tokens),
        so_lan_goi: so(r.num_model_requests),
      });
    }
  }
  const tiep = typeof j.next_page === 'string' && j.next_page ? j.next_page : null;
  return { dong, tiep: j.has_more === false ? null : tiep };
}

/** OpenRouter trả cả tiền lẫn token trong một dòng hoạt động. */
export function docHoatDongOpenRouter(json: unknown): { token: DongTokenNgay[]; chi_phi: DongChiPhi[] } {
  const ds = (json as { data?: unknown } | null)?.data;
  if (!Array.isArray(ds)) throw new LoiNhaCungCap(502, 'Phản hồi activity của OpenRouter không đúng khuôn.');
  const token: DongTokenNgay[] = [];
  const chi_phi: DongChiPhi[] = [];
  for (const r of ds as Array<Record<string, unknown>>) {
    const ngay = chuoi(r.date).slice(0, 10);
    if (!laNgay(ngay)) throw new LoiNhaCungCap(502, 'OpenRouter trả dòng hoạt động không có ngày hợp lệ.');
    const model = chuoi(r.model) || chuoi(r.model_permaslug) || 'Không rõ';
    token.push({
      ngay,
      model,
      token_vao: so(r.prompt_tokens),
      token_vao_cache: 0,
      // Token suy luận được tính tiền như token đầu ra.
      token_ra: so(r.completion_tokens) + so(r.reasoning_tokens),
      so_lan_goi: so(r.requests),
    });
    const tien = Number(r.usage ?? 0);
    if (!Number.isFinite(tien)) throw new LoiNhaCungCap(502, 'OpenRouter trả số tiền không đọc được.');
    chi_phi.push({ ngay, hang_muc: model, du_an: 'OpenRouter', so_tien_usd: tien });
  }
  return { token, chi_phi };
}

export function urlTokenAnthropic(tu: Date, den: Date, trang?: string): string {
  const q = new URLSearchParams({ starting_at: tu.toISOString(), ending_at: den.toISOString(), bucket_width: '1d', limit: '31' });
  q.append('group_by[]', 'model');
  if (trang) q.set('page', trang);
  return `https://api.anthropic.com/v1/organizations/usage_report/messages?${q}`;
}

export function urlTokenOpenAI(tu: Date, den: Date, trang?: string): string {
  const q = new URLSearchParams({
    start_time: String(Math.floor(tu.getTime() / 1000)),
    end_time: String(Math.floor(den.getTime() / 1000)),
    bucket_width: '1d',
  });
  q.append('group_by', 'model');
  if (trang) q.set('page', trang);
  return `https://api.openai.com/v1/organization/usage/completions?${q}`;
}

type Goi = (url: string, init: RequestInit) => Promise<Response>;

const TEN = { anthropic: 'Anthropic', openai: 'OpenAI', openrouter: 'OpenRouter' } as const;

function thongDiep(ncc: keyof typeof TEN, status: number, body: unknown): string {
  const b = body as { error?: { message?: unknown } | string } | null;
  const goc = typeof b?.error === 'string' ? b.error : chuoi((b?.error as { message?: unknown } | undefined)?.message);
  const kem = goc ? ` (${goc.slice(0, 200)})` : '';
  if (status === 401 || status === 403) return `${TEN[ncc]} từ chối khoá: cần khoá quản trị còn hiệu lực.${kem}`;
  if (status === 429) return `${TEN[ncc]} đang giới hạn tần suất — thử lại sau một phút.`;
  return `${TEN[ncc]} trả lỗi ${status}.${kem}`;
}

/** Tải mọi trang token trong [tu, den) cho Anthropic hoặc OpenAI. */
export async function taiToken(
  ncc: 'anthropic' | 'openai',
  khoa: string,
  tu: Date,
  den: Date,
  goi: Goi = (url, init) => fetch(url, init),
): Promise<DongTokenNgay[]> {
  const headers: Record<string, string> = ncc === 'anthropic'
    ? { 'x-api-key': khoa, 'anthropic-version': '2023-06-01', 'User-Agent': 'MIMIWallet/1.0' }
    : { Authorization: `Bearer ${khoa}`, 'Content-Type': 'application/json' };
  const tatCa: DongTokenNgay[] = [];
  let trang: string | undefined;
  for (let lan = 0; lan < 50; lan++) {
    const res = await goi(ncc === 'anthropic' ? urlTokenAnthropic(tu, den, trang) : urlTokenOpenAI(tu, den, trang), { headers });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new LoiNhaCungCap(res.status, thongDiep(ncc, res.status, body));
    const { dong, tiep } = ncc === 'anthropic' ? docTokenAnthropic(body) : docTokenOpenAI(body);
    tatCa.push(...dong);
    if (!tiep) return tatCa;
    trang = tiep;
  }
  throw new LoiNhaCungCap(502, 'Quá nhiều trang dữ liệu token.');
}

export async function taiHoatDongOpenRouter(khoa: string, goi: Goi = (url, init) => fetch(url, init)) {
  const res = await goi('https://openrouter.ai/api/v1/activity', { headers: { Authorization: `Bearer ${khoa}` } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new LoiNhaCungCap(res.status, thongDiep('openrouter', res.status, body));
  return docHoatDongOpenRouter(body);
}

/** Cộng các dòng trùng ngày + model (Anthropic có thể tách theo tầng dịch vụ). */
export function gopToken(ds: DongTokenNgay[]): DongTokenNgay[] {
  const m = new Map<string, DongTokenNgay>();
  for (const d of ds) {
    const k = `${d.ngay} ${d.model}`;
    const cu = m.get(k);
    if (cu) {
      cu.token_vao += d.token_vao;
      cu.token_vao_cache += d.token_vao_cache;
      cu.token_ra += d.token_ra;
      cu.so_lan_goi += d.so_lan_goi;
    } else m.set(k, { ...d });
  }
  return [...m.values()];
}
