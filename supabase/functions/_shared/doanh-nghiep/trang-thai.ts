/**
 * Trạng thái doanh nghiệp / hộ kinh doanh, chuẩn hoá từ câu chữ của cơ quan thuế.
 *
 * GIỮ CÂU GỐC. Tra cứu MST trả một câu tiếng Việt ("NNT đang hoạt động (đã được cấp GCN ĐKT)"…),
 * lưu ở `companies.trang_thai_mst`. Ở đây chỉ DỊCH câu đó sang một trạng thái để máy dùng — câu gốc
 * không bao giờ bị thay hay bỏ, vì bảng dịch có thể sai và người đọc phải so được.
 *
 * Không khớp mẫu nào → 'chua_ro'. Không đoán "đang hoạt động" cho câu lạ: tờ khai của một mã số thuế
 * đã đóng là tờ khai sai.
 */

export const PHIEN_BAN_BANG_DICH = '2026-09-25.1';

export type TrangThaiDoanhNghiep =
  | 'dang_hoat_dong'
  | 'tam_ngung'
  | 'khong_o_dia_chi'
  | 'ngung_chua_dong_mst'
  | 'da_dong_mst'
  | 'chua_ro';

export const TEN_TRANG_THAI: Record<TrangThaiDoanhNghiep, string> = {
  dang_hoat_dong: 'Đang hoạt động',
  tam_ngung: 'Tạm ngừng kinh doanh',
  khong_o_dia_chi: 'Cơ quan thuế ghi nhận không hoạt động tại địa chỉ đăng ký',
  ngung_chua_dong_mst: 'Ngừng hoạt động, chưa hoàn tất thủ tục đóng mã số thuế',
  da_dong_mst: 'Đã chấm dứt hiệu lực mã số thuế',
  chua_ro: 'Chưa rõ',
};

const boDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/**
 * Thứ tự quan trọng. Câu "ngừng hoạt động nhưng CHƯA hoàn thành thủ tục chấm dứt hiệu lực MST" chứa
 * cả cụm "chấm dứt hiệu lực" — phải khớp "chưa hoàn thành" TRƯỚC, không thì một mã chưa đóng bị coi
 * là đã đóng (test bắt được lỗi này ngày 25/09/2026).
 */
const BANG: [RegExp, TrangThaiDoanhNghiep][] = [
  [/dang hoat dong/, 'dang_hoat_dong'],
  [/tam ngung/, 'tam_ngung'],
  [/khong hoat dong tai dia chi/, 'khong_o_dia_chi'],
  [/chua hoan thanh/, 'ngung_chua_dong_mst'],
  [/(da hoan thanh|cham dut hieu luc)/, 'da_dong_mst'],
  [/ngung hoat dong/, 'ngung_chua_dong_mst'],
];

export function chuanHoaTrangThai(cauGoc: string | null | undefined): { trang_thai: TrangThaiDoanhNghiep; cau_goc: string | null; phien_ban: string } {
  const goc = (cauGoc ?? '').trim();
  if (!goc) return { trang_thai: 'chua_ro', cau_goc: null, phien_ban: PHIEN_BAN_BANG_DICH };
  const s = boDau(goc);
  const hit = BANG.find(([re]) => re.test(s));
  return { trang_thai: hit ? hit[1] : 'chua_ro', cau_goc: goc, phien_ban: PHIEN_BAN_BANG_DICH };
}

/** Trạng thái nào thì KHÔNG được lập tờ khai kỳ thường như không có gì xảy ra. */
export const CHAN_KHAI_THUONG: TrangThaiDoanhNghiep[] = ['tam_ngung', 'khong_o_dia_chi', 'ngung_chua_dong_mst', 'da_dong_mst'];
