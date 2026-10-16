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

export function ghepPhuongAn(h: HoSoTaiTro): PhuongAn[] {
  const g = GIA_DINH;
  const ra: PhuongAn[] = [];

  // 1. Không vay: thu nợ quá hạn.
  ra.push(h.cong_no_qua_han > 0
    ? { khoa: 'thu_no_truoc', ten: 'Thu công nợ quá hạn trước khi vay', phu_hop: 'co_the', suc_chua: { thap: h.cong_no_qua_han, cao: h.cong_no_qua_han },
      ly_do: ['Không tốn lãi, không cần hồ sơ, và nếu thu được thì có thể không phải vay.'], con_thieu: [] }
    : { khoa: 'thu_no_truoc', ten: 'Thu công nợ quá hạn trước khi vay', phu_hop: 'khong_can', suc_chua: null, ly_do: ['Hiện không có hoá đơn bán ra nào quá hạn.'], con_thieu: [] });

  const duDuLieu = h.so_thang >= g.so_thang_toi_thieu;
  const dongTienDuong = h.rong_tb > 0;
  const onDinh = h.he_so_bien_dong_vao === null || h.he_so_bien_dong_vao < g.he_so_bien_dong_toi_da;
  const traThang = Math.max(0, h.rong_tb) * g.ty_le_tra_no_tren_dong_tien_rong;

  const conThieuChung: string[] = [];
  if (!duDuLieu) conThieuChung.push(`Mới có ${h.so_thang} tháng sao kê; tổ chức tín dụng thường cần ${g.so_thang_toi_thieu} tháng trở lên để đánh giá.`);
  if (!dongTienDuong) conThieuChung.push('Dòng tiền ròng trung bình đang không dương nên không có phần để trả nợ; vay lúc này làm hố sâu hơn.');
  if (!onDinh) conThieuChung.push('Tiền vào biến động mạnh giữa các tháng; hồ sơ sẽ bị đánh giá thấp nếu không giải thích được.');

  // 2. Hạn mức vốn lưu động.
  const hm = (laiNam: number) => sucChuaGoc(traThang, g.ky_han_von_luu_dong_thang, laiNam);
  ra.push({
    khoa: 'han_muc_von_luu_dong', ten: 'Hạn mức vốn lưu động',
    phu_hop: conThieuChung.length === 0 ? 'co_the' : 'chua_du',
    suc_chua: dongTienDuong ? { thap: Math.round(hm(g.lai_nam_cao)), cao: Math.round(hm(g.lai_nam_thap)) } : null,
    ly_do: ['Phù hợp khi thiếu tiền theo mùa hoặc chờ khách trả; trả lãi theo số đã rút.', `Tính trên dòng tiền kinh doanh đã làm sạch: bỏ ${h.tien_vao_bi_loai.so_khoan} khoản tiền vào nghi không phải doanh thu.`],
    con_thieu: conThieuChung,
  });

  // 3. Ứng vốn theo hoá đơn.
  ra.push({
    khoa: 'ung_von_hoa_don', ten: 'Ứng vốn theo hoá đơn chưa tới hạn',
    phu_hop: h.hoa_don_cho_chua_han.so > 0 ? 'co_the' : 'chua_du',
    suc_chua: h.hoa_don_cho_chua_han.so > 0 ? (() => { const x = Math.round(h.hoa_don_cho_chua_han.tong * g.ty_le_ung_von_hoa_don); return { thap: x, cao: x }; })() : null,
    ly_do: ['Tài trợ bằng chính khoản khách sắp trả, nên không đòi dòng tiền ròng dương; chi phí thường tính theo số ngày ứng.'],
    con_thieu: h.hoa_don_cho_chua_han.so > 0 ? [] : ['Chưa có hoá đơn bán ra nào còn trong hạn thanh toán.'],
  });

  // 4. Vay mua thiết bị / tài sản.
  const tb = (laiNam: number) => sucChuaGoc(traThang, g.ky_han_thiet_bi_thang, laiNam);
  ra.push({
    khoa: 'vay_thiet_bi', ten: 'Vay trả góp mua thiết bị',
    phu_hop: 'chua_du',
    suc_chua: dongTienDuong ? { thap: Math.round(tb(g.lai_nam_cao)), cao: Math.round(tb(g.lai_nam_thap)) } : null,
    ly_do: ['Hợp khi mua một tài sản cụ thể sinh ra tiền; kỳ hạn dài hơn nên mỗi tháng trả nhẹ hơn.'],
    con_thieu: ['Cần biết thiết bị gì, giá bao nhiêu và nó làm tăng thu hay giảm chi bao nhiêu — MIMI chưa có thông tin này.', ...conThieuChung],
  });
  return ra;
}
