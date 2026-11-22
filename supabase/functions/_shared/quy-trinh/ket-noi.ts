/**
 * Kết nối công cụ ngay tại bước workflow (22/11/2026): người dùng dán Endpoint + API key (hoặc MCP server) NGAY trong
 * bảng bước, không chuyển trang. Khoá được mã hoá (ML-KEM-768 + AES-GCM, `pqcCrypto.ts` — cùng cách cất token ngân hàng),
 * chỉ hiện lại 4 ký tự cuối; trình duyệt không bao giờ đọc lại được khoá.
 *
 * Gọi thật:
 *   api — HTTPS tới endpoint người dùng cho, kèm `Authorization: Bearer <khoá>`; đọc → GET, còn lại → POST thân JSON
 *         mô tả bước. Chặn địa chỉ nội bộ (chống SSRF), 15 giây, cắt phản hồi.
 *   mcp — JSON-RPC: initialize rồi tools/call (công cụ người dùng chọn; chưa chọn → tools/list để thấy có gì).
 * Phản hồi từ dịch vụ ngoài là DỮ LIỆU, chỉ hiện cho người — không đưa vào lời nhắc mô hình như lệnh.
 */
import type { EncryptedBlob } from '../pqcCrypto.ts';
// Nạp bộ mã hoá khi thật cần (thư viện ML-KEM nạp qua URL — chỉ chạy được trong Deno).
const maHoa = () => import('../pqcCrypto.ts');
import type { NutHien } from './do-thi.ts';

// deno-lint-ignore no-explicit-any
type Db = any;
type Goi = (url: string, init: RequestInit) => Promise<Response>;

export interface KetNoi { cong_cu: string; kieu: 'api' | 'mcp'; url: string; khoa: EncryptedBlob | null; khoa_hien: string | null; cong_cu_mcp: string | null }

/** URL được phép: https, không phải máy nội bộ / IP riêng / tên miền nội bộ. */
export function urlAnToan(s: unknown): string | null {
  let u: URL;
  try { u = new URL(String(s ?? '').trim()); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password) return null;
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || !h.includes('.')) return null;
  if (/^(10|127|0)\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)) return null;
  if (h.includes(':')) return null; // IPv6 thô: chặn hết cho gọn.
  return u.toString();
}

export const tenCongCuHopLe = (s: unknown) => /^[a-z0-9_]{2,40}$/.test(String(s ?? ''));

export async function luuKetNoi(db: Db, companyId: string, userId: string, d: Record<string, unknown>, khoaCongKhai: string | undefined): Promise<void> {
  const cong_cu = String(d.cong_cu ?? '');
  const kieu = d.kieu === 'mcp' ? 'mcp' : 'api';
  const url = urlAnToan(d.url);
  if (!tenCongCuHopLe(cong_cu)) throw new Error('THAM_SO:Tên công cụ không hợp lệ.');
  if (!url) throw new Error('THAM_SO:Endpoint phải là https công khai.');
  const khoaTho = String(d.khoa ?? '').trim();
  if (khoaTho.length > 4000) throw new Error('THAM_SO:Khoá quá dài.');
  let khoa: EncryptedBlob | null = null;
  if (khoaTho) {
    if (!khoaCongKhai) throw new Error('THAM_SO:Máy chủ chưa cấu hình mã hoá — chưa lưu được khoá.');
    khoa = await (await maHoa()).encryptField(khoaTho, khoaCongKhai);
  }
  const mcp = d.cong_cu_mcp == null || d.cong_cu_mcp === '' ? null : String(d.cong_cu_mcp).slice(0, 80);
  const dong: Record<string, unknown> = { company_id: companyId, cong_cu, kieu, url, cong_cu_mcp: mcp, tao_boi: userId, cap_nhat_luc: new Date().toISOString() };
  // Không gửi khoá mới → giữ khoá cũ (chỉ đổi endpoint).
  if (khoaTho) { dong.khoa = khoa; dong.khoa_hien = `••••${khoaTho.slice(-4)}`; }
  const { error } = await db.from('ket_noi_quy_trinh').upsert(dong, { onConflict: 'company_id,cong_cu' });
  if (error) throw new Error(`Không lưu được kết nối: ${error.message}`);
}

export async function docKetNoi(db: Db, companyId: string): Promise<Map<string, KetNoi>> {
  const { data, error } = await db.from('ket_noi_quy_trinh').select('cong_cu, kieu, url, khoa, khoa_hien, cong_cu_mcp').eq('company_id', companyId);
  if (error) {
    if (/does not exist|could not find the table/i.test(error.message)) return new Map();
    throw new Error(`Không đọc được kết nối: ${error.message}`);
  }
  return new Map((data ?? []).map((k: KetNoi) => [k.cong_cu, k]));
}

/** Gọi công cụ đã kết nối cho một bước. Trả câu kết quả ngắn cho người đọc. */
export async function goiKetNoi(k: KetNoi, n: NutHien, cauGoc: string, khoaRieng: string | undefined, goi: Goi = (u, i) => fetch(u, i)): Promise<string> {
  const url = urlAnToan(k.url);
  if (!url) throw new Error('endpoint không còn hợp lệ');
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
  if (k.khoa) {
    if (!khoaRieng) throw new Error('máy chủ chưa cấu hình giải mã');
    headers.Authorization = `Bearer ${await (await maHoa()).decryptField(k.khoa, khoaRieng)}`;
  }
  const ctrl = new AbortController();
  const hen = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const gui = (body?: unknown, method = 'POST', h = headers) => goi(url, { method, headers: h, signal: ctrl.signal, redirect: 'error', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (k.kieu === 'api') {
      const doc = n.tac_dong === 'doc';
      const res = await gui(doc ? undefined : { buoc: n.ten, mo_ta: n.mo_ta, yeu_cau: cauGoc.slice(0, 500) }, doc ? 'GET' : 'POST');
      const t = (await res.text()).slice(0, 400);
      if (!res.ok) throw new Error(`dịch vụ trả ${res.status}`);
      return `Đã gọi ${k.cong_cu} (${res.status}). Phản hồi: ${t.replace(/\s+/g, ' ')}`;
    }
    const init = await gui({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'mimi-workflow', version: '1.0.0' } } });
    if (!init.ok) throw new Error(`MCP initialize trả ${init.status}`);
    const phien = init.headers.get('mcp-session-id');
    const h2 = phien ? { ...headers, 'mcp-session-id': phien } : headers;
    const res = await gui(k.cong_cu_mcp
      ? { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: k.cong_cu_mcp, arguments: { buoc: n.ten, yeu_cau: cauGoc.slice(0, 500) } } }
      : { jsonrpc: '2.0', id: 2, method: 'tools/list' }, 'POST', h2);
    const t = (await res.text()).slice(0, 400);
    if (!res.ok) throw new Error(`MCP trả ${res.status}`);
    return `${k.cong_cu_mcp ? `Đã gọi công cụ MCP "${k.cong_cu_mcp}"` : 'Đã nối MCP (chưa chọn công cụ — danh sách công cụ)'}: ${t.replace(/\s+/g, ' ')}`;
  } catch (e) {
    if ((e as { name?: string })?.name === 'AbortError') throw new Error('dịch vụ phản hồi quá 15 giây');
    throw e;
  } finally {
    clearTimeout(hen);
  }
}
