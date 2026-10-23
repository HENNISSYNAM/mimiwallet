/**
 * GHÉP PHƯƠNG ÁN TÀI TRỢ CHO DOANH NGHIỆP NHỎ (16/10/2026) — hàm thuần.
 *
 * MIMI KHÔNG cho vay, không môi giới ăn hoa hồng, không hứa duyệt (xem docs/TINH_NANG_LOI_CHI_PHI.md, quyết định 17/08/2026).
 * Phần này trả lời câu hỏi người chủ thật sự có: "tôi có nên vay không, vay kiểu nào, được khoảng bao nhiêu mà không tự làm mình
 * ngộp, và còn thiếu gì trong hồ sơ". Nó khác công cụ ghép khoản vay thông thường ở ba điểm có chủ đích:
 *   1. SỨC TRẢ NỢ tính trên dòng tiền kinh doanh ĐÃ LÀM SẠCH: tiền vay cũ, góp vốn, người nhà chuyển, hoàn tiền bị loại khỏi tiền vào
 *      (xem `lamSachTienVao` ở nơi gọi). Tính trên tổng tiền vào thì khoản vay lần trước làm đẹp hồ sơ cho khoản vay lần sau.
 *   2. Có phương án "không vay": thu công nợ quá hạn trước — thường rẻ hơn mọi khoản vay.
 *   3. Nói rõ ĐIỀU KIỆN CÒN THIẾU của từng phương án thay vì chấm "đủ/không đủ" một cách vô hồn.
 *
 * CÁC GIẢ ĐỊNH ở `GIA_DINH` là ĐỀ XUẤT để minh hoạ sức chứa, KHÔNG phải điều kiện hay lãi suất của tổ chức nào. Mỗi con số xuất
 * ra mang nhãn "giả định" để người đọc thay bằng biểu thật của nơi họ định vay.
 */
import { LOI_TC, type NgonTC } from './loi.ts';

export const GIA_DINH = {
  /** Phần dòng tiền ròng trung bình mỗi tháng có thể dành trả nợ — ĐỀ XUẤT, thận trọng. */
  ty_le_tra_no_tren_dong_tien_rong: 0.3,
  /** Khoảng lãi suất năm dùng để ước sức chứa — ĐỀ XUẤT minh hoạ. */
  lai_nam_thap: 0.10,
  lai_nam_cao: 0.18,
  ky_han_von_luu_dong_thang: 12,
  ky_han_thiet_bi_thang: 24,
  /** Tỉ lệ ứng trước trên hoá đơn còn hạn — ĐỀ XUẤT. */
  ty_le_ung_von_hoa_don: 0.7,
  so_thang_toi_thieu: 6,
  he_so_bien_dong_toi_da: 0.5,
} as const;

/** Số tiền gốc có thể vay để mỗi tháng trả `tra` trong `n` tháng, lãi năm `lai` (trả đều gốc+lãi hàng tháng). */
export function sucChuaGoc(tra: number, n: number, laiNam: number): number {
  if (tra <= 0 || n <= 0) return 0;
  const r = laiNam / 12;
  if (r === 0) return tra * n;
  return tra * (1 - (1 + r) ** -n) / r;
}

export interface HoSoTaiTro {
  /** Số tháng đã khép sổ có dữ liệu. */
  so_thang: number;
  /** Trung bình tiền vào kinh doanh đã làm sạch / tiền ra / ròng mỗi tháng (các tháng đã khép sổ). */
  vao_lam_sach_tb: number;
  ra_tb: number;
  rong_tb: number;
  he_so_bien_dong_vao: number | null;
  /** Phần tiền vào bị loại vì nghi không phải doanh thu (vay, góp vốn, người nhà, hoàn tiền), để nói cho người dùng biết. */
  tien_vao_bi_loai: { so_tien: number; so_khoan: number };
  cong_no_qua_han: number;
  hoa_don_cho_chua_han: { tong: number; so: number };
}

export type MucPhuHop = 'co_the' | 'chua_du' | 'khong_can';
export interface PhuongAn {
  khoa: 'thu_no_truoc' | 'han_muc_von_luu_dong' | 'ung_von_hoa_don' | 'vay_thiet_bi';
  ten: string;
  phu_hop: MucPhuHop;
  /** Sức chứa ước tính (đồng) theo khoảng giả định; null khi không tính được. */
  suc_chua: { thap: number; cao: number } | null;
  ly_do: string[];
  con_thieu: string[];
}

export function ghepPhuongAn(h: HoSoTaiTro, ngon: NgonTC = 'vi'): PhuongAn[] {
  const g = GIA_DINH;
  const L = LOI_TC[ngon];
  const ra: PhuongAn[] = [];

  // 1. Không vay: thu nợ quá hạn.
  ra.push(h.cong_no_qua_han > 0
    ? { khoa: 'thu_no_truoc', ten: L.pa.thu_no_truoc, phu_hop: 'co_the', suc_chua: { thap: h.cong_no_qua_han, cao: h.cong_no_qua_han },
      ly_do: [L.lyThuNo], con_thieu: [] }
    : { khoa: 'thu_no_truoc', ten: L.pa.thu_no_truoc, phu_hop: 'khong_can', suc_chua: null, ly_do: [L.khongQuaHan], con_thieu: [] });

  const duDuLieu = h.so_thang >= g.so_thang_toi_thieu;
  const dongTienDuong = h.rong_tb > 0;
  const onDinh = h.he_so_bien_dong_vao === null || h.he_so_bien_dong_vao < g.he_so_bien_dong_toi_da;
  const traThang = Math.max(0, h.rong_tb) * g.ty_le_tra_no_tren_dong_tien_rong;

  const conThieuChung: string[] = [];
  if (!duDuLieu) conThieuChung.push(L.thieuThangPa(h.so_thang, g.so_thang_toi_thieu));
  if (!dongTienDuong) conThieuChung.push(L.rongKhongDuong);
  if (!onDinh) conThieuChung.push(L.bienDongPa);

  // 2. Hạn mức vốn lưu động.
  const hm = (laiNam: number) => sucChuaGoc(traThang, g.ky_han_von_luu_dong_thang, laiNam);
  ra.push({
    khoa: 'han_muc_von_luu_dong', ten: L.pa.han_muc_von_luu_dong,
    phu_hop: conThieuChung.length === 0 ? 'co_the' : 'chua_du',
    suc_chua: dongTienDuong ? { thap: Math.round(hm(g.lai_nam_cao)), cao: Math.round(hm(g.lai_nam_thap)) } : null,
    ly_do: [L.lyHanMuc, L.lyLamSach(h.tien_vao_bi_loai.so_khoan)],
    con_thieu: conThieuChung,
  });

  // 3. Ứng vốn theo hoá đơn.
  ra.push({
    khoa: 'ung_von_hoa_don', ten: L.pa.ung_von_hoa_don,
    phu_hop: h.hoa_don_cho_chua_han.so > 0 ? 'co_the' : 'chua_du',
    suc_chua: h.hoa_don_cho_chua_han.so > 0 ? (() => { const x = Math.round(h.hoa_don_cho_chua_han.tong * g.ty_le_ung_von_hoa_don); return { thap: x, cao: x }; })() : null,
    ly_do: [L.lyUngVon],
    con_thieu: h.hoa_don_cho_chua_han.so > 0 ? [] : [L.khongHoaDonConHan],
  });

  // 4. Vay mua thiết bị / tài sản.
  const tb = (laiNam: number) => sucChuaGoc(traThang, g.ky_han_thiet_bi_thang, laiNam);
  ra.push({
    khoa: 'vay_thiet_bi', ten: L.pa.vay_thiet_bi,
    phu_hop: 'chua_du',
    suc_chua: dongTienDuong ? { thap: Math.round(tb(g.lai_nam_cao)), cao: Math.round(tb(g.lai_nam_thap)) } : null,
    ly_do: [L.lyThietBi],
    con_thieu: [L.canThietBi, ...conThieuChung],
  });
  return ra;
}
