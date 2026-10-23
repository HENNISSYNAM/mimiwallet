/**
 * PHẠM VI CƠ SỞ (23/10/2026): kế toán phụ trách một cơ sở chỉ thấy số của cơ sở đó.
 *
 * Hai lớp, cùng một quy tắc:
 *   - CSDL: policy RESTRICTIVE trên `transactions` và `invoices` (migration 20261023090000_pham_vi_co_so.sql) cho
 *     mọi lần đọc thẳng từ trình duyệt.
 *   - Edge function: service role đi vòng RLS, nên trợ lý gọi `apPhamVi` lên dữ liệu đã đọc trước khi bất kỳ năng lực
 *     nào chạy. Quy tắc nằm ở đây, có test, để hai lớp không lệch nhau.
 *
 * Ai bị giới hạn: thành viên có `co_so_id` và vai trò KHÔNG phải chủ sở hữu / quản trị. Chủ và quản trị luôn thấy cả
 * công ty (cong-ty cũng từ chối gán họ vào một cơ sở).
 *
 * Giao dịch thuộc cơ sở khi số tài khoản của nó đã gán cho cơ sở. Giao dịch không có số tài khoản, hoặc tài khoản chưa
 * gán, KHÔNG hiện cho kế toán cơ sở: đoán sai là lộ số của nơi khác. Nguồn không gắn được với một cơ sở (hoá đơn đầu vào,
 * chứng từ, yêu cầu chi, chi phí AI, thuế, lịch thuế...) bị để trống — đó là số của cả công ty.
 */
import type { DuLieu } from '../tro-ly/tinh-toan.ts';
import { chuanSoTaiKhoan } from './kiem.ts';

export interface PhamViCoSo { co_so_id: string; ten: string | null; tai_khoan: string[] }

export const VAI_TRO_THAY_CA_CONG_TY = ['chu_so_huu', 'quan_tri'] as const;

/** Thành viên này có bị giới hạn vào một cơ sở không. */
export const biGioiHan = (vaiTro: string, coSoId: string | null | undefined): boolean =>
  !!coSoId && !(VAI_TRO_THAY_CA_CONG_TY as readonly string[]).includes(vaiTro);

/** Các nguồn số của cả công ty, không gắn được với một cơ sở: kế toán cơ sở không đọc. */
export const NGUON_CA_CONG_TY = [
  'hoa_don_vao', 'chung_tu_quet', 'yeu_cau', 'chi_phi_ai', 'token_ai', 'thue', 'lich_thue', 'bat_thuong', 'thuc_thi',
] as const;

export function apPhamVi(d: DuLieu, p: PhamViCoSo | null): DuLieu {
  if (!p) return d;
  const tk = new Set(p.tai_khoan.map(chuanSoTaiKhoan).filter(Boolean));
  const thuoc = (so: unknown) => { const s = chuanSoTaiKhoan(so); return !!s && tk.has(s); };

  d.giaoDich = d.giaoDich.filter((t) => thuoc(t.account_number));
  const conId = new Set(d.giaoDich.map((t) => String(t.id)));
  d.hoaDonBan = d.hoaDonBan.filter((h) => h.co_so_id === p.co_so_id);
  d.ketNoiNganHang = d.ketNoiNganHang.filter((k) => thuoc(k.account_number));
  if (d.phanLoaiTienVao) d.phanLoaiTienVao = Object.fromEntries(Object.entries(d.phanLoaiTienVao).filter(([id]) => conId.has(id)));
  if (d.chiCaNhan) d.chiCaNhan = d.chiCaNhan.filter((id) => conId.has(id));
  if (d.quyetDinhChungTu) d.quyetDinhChungTu = d.quyetDinhChungTu.filter((q) => conId.has(String(q.transaction_id)));
  if (d.coSo) d.coSo = d.coSo.filter((c) => c.id === p.co_so_id);
  if (d.taiKhoanCoSo) d.taiKhoanCoSo = Object.fromEntries(Object.entries(d.taiKhoanCoSo).filter(([, id]) => id === p.co_so_id));
  if (d.vatCoSo) d.vatCoSo = d.vatCoSo.filter((v) => v.co_so_id === p.co_so_id);

  d.hoaDonVao = []; d.chungTuQuet = []; d.yeuCau = []; d.tacTu = []; d.chinhSach = [];
  d.chiPhiAi = []; d.tokenAi = []; d.nganSachAi = null; d.ketNoiAi = []; d.nhapFileAi = [];
  d.thue = null; d.batThuong = null;
  d.lichThue = null; d.thucThi = null; d.viecCanLam = null;
  for (const n of NGUON_CA_CONG_TY) delete (d.doDay as Record<string, unknown>)[n];
  d.phamViCoSo = { co_so_id: p.co_so_id, ten: p.ten };
  return d;
}

/** Thao tác lên MỘT giao dịch theo mã: kế toán cơ sở chỉ được đụng giao dịch của tài khoản thuộc cơ sở mình. */
export const trongPhamVi = (p: PhamViCoSo | null, soTaiKhoan: unknown): boolean =>
  !p || (() => { const s = chuanSoTaiKhoan(soTaiKhoan); return !!s && p.tai_khoan.map(chuanSoTaiKhoan).includes(s); })();
