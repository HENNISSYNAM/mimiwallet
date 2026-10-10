/**
 * Web MIMI ↔ bộ chạy tại máy (`helper/`). Gọi http://127.0.0.1:47321 — chỉ chạy được khi người dùng đang mở bộ chạy
 * trên chính máy này. Mỗi yêu cầu sau khi ghép mang token + nonce + thời điểm (bộ chạy chặn phát lại).
 *
 * Token ghép giữ trong sessionStorage của tab MIMI (đóng tab là phải ghép lại). JWT MIMI chỉ gửi cho bộ chạy lúc bắt
 * đầu/tiếp tục một phiên để bộ chạy hỏi lại máy chủ; bộ chạy không gửi nó đi đâu khác.
 */
export const DIA_CHI_BO_CHAY = 'http://127.0.0.1:47321';
const KHOA_TOKEN = 'mimi.dien_ho.token';

export class LoiBoChay extends Error {
  constructor(message: string, public status: number) { super(message); }
}

function docToken(): string | null {
  try { return sessionStorage.getItem(KHOA_TOKEN); } catch { return null; }
}
function ghiToken(t: string | null) {
  try { if (t) sessionStorage.setItem(KHOA_TOKEN, t); else sessionStorage.removeItem(KHOA_TOKEN); } catch { /* chế độ riêng tư */ }
}

async function goi(duong: string, o: { method?: 'GET' | 'POST'; than?: unknown; canToken?: boolean } = {}) {
  const tieuDe: Record<string, string> = { 'Content-Type': 'application/json' };
  if (o.canToken !== false) {
    const tk = docToken();
    if (!tk) throw new LoiBoChay('Chưa ghép nối với bộ chạy.', 401);
    tieuDe.Authorization = `Bearer ${tk}`;
    tieuDe['X-Mimi-Nonce'] = crypto.randomUUID();
    tieuDe['X-Mimi-Thoi-Diem'] = String(Date.now());
  }
  let r: Response;
  try {
    r = await fetch(`${DIA_CHI_BO_CHAY}${duong}`, {
      method: o.method ?? 'POST', headers: tieuDe, body: (o.method ?? 'POST') === 'POST' ? JSON.stringify(o.than ?? {}) : undefined,
    });
  } catch {
    throw new LoiBoChay('Không thấy bộ chạy MIMI Điền hộ trên máy này. Mở bộ chạy rồi thử lại.', 0);
  }
  const than = await r.json().catch(() => ({}));
  if (r.status === 401) ghiToken(null);
  if (!r.ok) throw new LoiBoChay(typeof than?.loi === 'string' ? than.loi : `Bộ chạy trả lỗi ${r.status}.`, r.status);
  return than;
}

export interface TrangThaiBoChay { co: boolean; da_ghep: boolean }

export async function kiemBoChay(): Promise<TrangThaiBoChay> {
  try {
    const r = await goi('/trang-thai', { method: 'GET', canToken: false });
    return { co: true, da_ghep: !!r.da_ghep && !!docToken() };
  } catch {
    return { co: false, da_ghep: false };
  }
}

export async function ghepBoChay(ma: string) {
  const r = await goi('/ghep', { than: { ma }, canToken: false });
  ghiToken(String(r.token));
}

export async function huyGhepBoChay() {
  try { await goi('/huy-ghep'); } finally { ghiToken(null); }
}

export const moTrinhDuyet = (kenh: 'chrome' | 'msedge') => goi('/mo-trinh-duyet', { than: { kenh } });

export interface TabBoChay { ma: string; dia_chi: string; tieu_de?: string }
export async function dsTab(): Promise<{ tab: TabBoChay[]; trinh_duyet_mo: boolean }> {
  return goi('/tab', { method: 'GET' });
}

export const batDauDien = (o: { phien_id: string; cong_ty_id: string; jwt: string; tab_ma: string }) => goi('/phien/bat-dau', { than: o });

export interface KetQuaODien { khoa: string; mong_doi: string; doc_lai: string | null; khop: boolean }
export interface TienDoDien {
  trang_thai: 'khong_co' | 'cho' | 'dang_dien' | 'tam_dung' | 'da_doi_chieu' | 'lech' | 'ban_giao' | 'dung' | 'loi';
  thong_diep?: string;
  ket_qua?: KetQuaODien[];
  nhat_ky?: { luc: string; hanh_dong: string; khoa_truong: string | null; ket_qua: string; ghi_chu: string }[];
}
export const docTienDo = (): Promise<TienDoDien> => goi('/phien', { method: 'GET' });
export const dungDien = () => goi('/phien/dung');
export const tiepTucDien = (jwt: string) => goi('/phien/tiep-tuc', { than: { jwt } });
export const banGiaoDien = () => goi('/phien/ban-giao');
