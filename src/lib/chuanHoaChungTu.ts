/**
 * Nội dung chuẩn hoá của hoá đơn điện tử và chứng từ quét — BẢN SONG SINH của hai hàm SQL
 * `noi_dung_chuan_hoa_don` và `noi_dung_chuan_chung_tu` (migration 20260915230000).
 *
 * Dùng để kiểm bản sao lưu ngay trong trình duyệt: băm lại từng chứng từ và so với mã băm
 * sổ cái đi kèm, không cần hỏi MIMI. Hai bên phải cho cùng một chuỗi tới từng ký tự.
 */

const truong = (t: string | null | undefined) => (t ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
const so = (n: number | string | null | undefined) => (n === null || n === undefined || n === '' ? '' : String(n));

/** timestamptz từ PostgREST ("2026-09-11T00:00:00+00:00", có thể kèm phần lẻ giây) → "2026-09-11T00:00:00Z". */
export function thoiDiemUtc(v: string | null | undefined): string {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toISOString().slice(0, 19)}Z`;
}

export interface HoaDonGoc {
  company_id: string;
  gdt_id: string;
  direction: string;
  invoice_serial: string | null;
  invoice_number: string | null;
  counterparty_tax_code: string | null;
  total_amount: number;
  tax_amount: number;
  issued_at: string | null;
  invoice_status: number | null;
}

export interface ChungTuGoc {
  id: string;
  company_id: string;
  loai: string;
  so_hoa_don: string | null;
  ky_hieu: string | null;
  ngay: string | null;
  ben_ban: string | null;
  ma_so_thue_ben_ban: string | null;
  tien_truoc_thue: number | null;
  tien_thue: number | null;
  tong_tien: number;
  giao_dich_id: string | null;
  anh_sha256: string | null;
}

export function noiDungChuanHoaDon(g: HoaDonGoc): string {
  return [
    'v1', 'hddt', g.company_id, truong(g.gdt_id), g.direction, truong(g.invoice_serial), truong(g.invoice_number),
    truong(g.counterparty_tax_code), so(g.total_amount), so(g.tax_amount), thoiDiemUtc(g.issued_at), so(g.invoice_status),
  ].join('|');
}

export function noiDungChuanChungTu(c: ChungTuGoc): string {
  return [
    'v1', 'ctq', c.id, c.company_id, c.loai, truong(c.so_hoa_don), truong(c.ky_hieu), c.ngay ?? '', truong(c.ben_ban),
    truong(c.ma_so_thue_ben_ban), so(c.tien_truoc_thue), so(c.tien_thue), so(c.tong_tien), c.giao_dich_id ?? '', c.anh_sha256 ?? '',
  ].join('|');
}

export async function bamHex(s: string | Uint8Array): Promise<string> {
  const du = typeof s === 'string' ? new TextEncoder().encode(s) : s;
  const b = new Uint8Array(await crypto.subtle.digest('SHA-256', du));
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}
