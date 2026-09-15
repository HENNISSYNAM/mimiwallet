/**
 * Thư viện chứng từ: gộp hoá đơn điện tử (Tổng cục Thuế) và chứng từ chụp thành một danh
 * sách, lọc, và xuất CSV cho kế toán — hàm thuần, có test.
 *
 * Theo cách Ramp giữ biên lai: mỗi chứng từ nói rõ nó gắn với khoản chi nào, và phần chưa
 * gắn phải lộ ra để đi xử lý trước khi chốt sổ.
 */

export interface ChungTuQuetDong {
  id: string;
  loai: string;
  so_hoa_don: string | null;
  ky_hieu: string | null;
  ngay: string | null;
  ben_ban: string | null;
  ma_so_thue_ben_ban: string | null;
  tien_thue: number | null;
  tong_tien: number;
  giao_dich_id: string | null;
  anh_path: string | null;
  created_at: string;
}

export interface HoaDonDienTuDong {
  id: string;
  invoice_number: string | null;
  invoice_serial: string | null;
  counterparty_name: string | null;
  counterparty_tax_code: string | null;
  total_amount: number;
  tax_amount: number | null;
  issued_at: string | null;
}

export interface GiaoDichGan {
  id: string;
  transaction_date: string;
  ten: string | null;
  so_tien: number;
}

export type NguonChungTu = 'chup' | 'hoa_don_dien_tu';

export interface MucThuVien {
  khoa: string;
  id: string;
  nguon: NguonChungTu;
  ben_ban: string;
  so: string | null;
  ky_hieu: string | null;
  ngay: string | null;
  mst: string | null;
  tien_thue: number | null;
  tong_tien: number;
  anh_path: string | null;
  giao_dich: GiaoDichGan | null;
}

export function gopThuVien(quet: ChungTuQuetDong[], hddt: HoaDonDienTuDong[], giaoDich: GiaoDichGan[]): MucThuVien[] {
  const gd = new Map(giaoDich.map((g) => [g.id, g]));
  const ds: MucThuVien[] = [
    ...quet.map((q): MucThuVien => ({
      khoa: `chup:${q.id}`,
      id: q.id,
      nguon: 'chup',
      ben_ban: q.ben_ban?.trim() || 'Chưa rõ bên bán',
      so: q.so_hoa_don,
      ky_hieu: q.ky_hieu,
      ngay: q.ngay ?? q.created_at.slice(0, 10),
      mst: q.ma_so_thue_ben_ban,
      tien_thue: q.tien_thue === null ? null : Number(q.tien_thue),
      tong_tien: Number(q.tong_tien),
      anh_path: q.anh_path,
      giao_dich: q.giao_dich_id ? gd.get(q.giao_dich_id) ?? null : null,
    })),
    ...hddt.map((h): MucThuVien => ({
      khoa: `hddt:${h.id}`,
      id: h.id,
      nguon: 'hoa_don_dien_tu',
      ben_ban: h.counterparty_name?.trim() || 'Chưa rõ bên bán',
      so: h.invoice_number,
      ky_hieu: h.invoice_serial,
      ngay: h.issued_at ? h.issued_at.slice(0, 10) : null,
      mst: h.counterparty_tax_code,
      tien_thue: h.tax_amount === null ? null : Number(h.tax_amount),
      tong_tien: Number(h.total_amount),
      anh_path: null,
      giao_dich: null,
    })),
  ];
  return ds.sort((a, b) => (b.ngay ?? '').localeCompare(a.ngay ?? ''));
}

export type LocThuVien = 'tat_ca' | 'chup' | 'hoa_don_dien_tu' | 'chua_gan';

const boDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

export function locThuVien(ds: MucThuVien[], loc: LocThuVien, tuKhoa: string): MucThuVien[] {
  const k = boDau(tuKhoa.trim());
  return ds.filter((m) => {
    if (loc === 'chup' && m.nguon !== 'chup') return false;
    if (loc === 'hoa_don_dien_tu' && m.nguon !== 'hoa_don_dien_tu') return false;
    // "Chưa gắn" chỉ có nghĩa với chứng từ chụp: hoá đơn điện tử ghép ở màn Chứng từ chi phí.
    if (loc === 'chua_gan' && (m.nguon !== 'chup' || m.giao_dich)) return false;
    if (!k) return true;
    return boDau(`${m.ben_ban} ${m.so ?? ''} ${m.mst ?? ''}`).includes(k);
  });
}

/**
 * Một ô CSV. Chữ bắt đầu bằng = + - @ bị Excel hiểu là công thức — tên bên bán lấy từ ảnh
 * hay sao kê có thể là "=HYPERLINK(...)" do kẻ gian cài. Thêm dấu nháy đơn để Excel coi là chữ.
 */
const o = (v: string | number | null) => {
  let s = v === null ? '' : String(v);
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const ngayVN = (ymd: string | null) => (ymd ? ymd.slice(0, 10).split('-').reverse().join('/') : '');

/** CSV UTF-8 có BOM để Excel đọc đúng tiếng Việt. Số tiền để số nguyên, không định dạng. */
export function csvChoKeToan(ds: MucThuVien[]): string {
  const dau = ['Ngày', 'Loại', 'Số hoá đơn', 'Ký hiệu', 'Bên bán', 'Mã số thuế bên bán', 'Tiền thuế', 'Tổng tiền', 'Ngày khoản chi đã gắn', 'Số tiền khoản chi', 'Có ảnh gốc'];
  const dong = ds.map((m) => [
    ngayVN(m.ngay),
    m.nguon === 'chup' ? 'Chứng từ chụp' : 'Hoá đơn điện tử',
    m.so, m.ky_hieu, m.ben_ban, m.mst, m.tien_thue, m.tong_tien,
    m.giao_dich ? ngayVN(m.giao_dich.transaction_date) : '',
    m.giao_dich ? m.giao_dich.so_tien : '',
    m.anh_path ? 'Có' : '',
  ].map(o).join(','));
  return `﻿${[dau.join(','), ...dong].join('\r\n')}`;
}
