/**
 * Phân loại từng dòng chỉ tiêu của báo cáo tài chính / tờ khai thuế vào một bộ nhóm CHUẨN của MIMI.
 * Hàm thuần, tất định.
 *
 * PHÂN LOẠI THEO TÊN CHỈ TIÊU, KHÔNG THEO MÃ SỐ. Tên chỉ tiêu ("Giá vốn hàng bán", "Hàng tồn kho") ổn định
 * qua các thông tư; mã số có thể khác giữa Thông tư 200, 99/2025, 133… và kho của MIMI chưa có bảng mã số
 * chính thức để đối chiếu. Mã số chỉ hiện nguyên từ tệp cho người dùng dò.
 *
 * KHÔNG CHẮC THÌ KHÔNG XẾP. Dòng không khớp mẫu nào → `chua_phan_loai`, kèm lý do; không đoán nhóm gần nhất.
 * Thứ tự luật quan trọng: cụ thể trước chung ("tài sản ngắn hạn khác" trước "tài sản ngắn hạn",
 * "doanh thu hoạt động tài chính" trước "doanh thu").
 */
import { boDau, type DongChiTieu } from './doc-bang.ts';
import type { LoaiTaiLieu } from './nhan-dang.ts';

export interface NhomChuan { khoa: string; ten: string }
type Luat = readonly [RegExp, string, string];

const L = (re: RegExp, khoa: string, ten: string): Luat => [re, khoa, ten];

const KET_QUA_KINH_DOANH: Luat[] = [
  L(/cac khoan giam tru|giam tru doanh thu/, 'giam_tru_doanh_thu', 'Giảm trừ doanh thu'),
  L(/doanh thu thuan/, 'doanh_thu_thuan', 'Doanh thu thuần'),
  L(/doanh thu hoat dong tai chinh/, 'doanh_thu_tai_chinh', 'Doanh thu hoạt động tài chính'),
  L(/doanh thu ban hang|doanh thu .*cung cap dich vu/, 'doanh_thu_ban_hang', 'Doanh thu bán hàng và cung cấp dịch vụ'),
  L(/gia von/, 'gia_von', 'Giá vốn hàng bán'),
  L(/loi nhuan gop/, 'loi_nhuan_gop', 'Lợi nhuận gộp'),
  L(/chi phi lai vay/, 'chi_phi_lai_vay', 'Chi phí lãi vay (trong chi phí tài chính)'),
  L(/chi phi tai chinh/, 'chi_phi_tai_chinh', 'Chi phí tài chính'),
  L(/chi phi ban hang/, 'chi_phi_ban_hang', 'Chi phí bán hàng'),
  L(/chi phi quan ly (doanh nghiep|kinh doanh)/, 'chi_phi_quan_ly', 'Chi phí quản lý'),
  L(/loi nhuan thuan tu hoat dong kinh doanh/, 'loi_nhuan_thuan', 'Lợi nhuận thuần từ hoạt động kinh doanh'),
  L(/lai hoac lo trong cong ty lien (doanh|ket)/, 'lai_lo_lien_doanh', 'Lãi/lỗ công ty liên doanh, liên kết'),
  L(/thu nhap khac/, 'thu_nhap_khac', 'Thu nhập khác'),
  L(/chi phi khac/, 'chi_phi_khac', 'Chi phí khác'),
  L(/loi nhuan khac/, 'loi_nhuan_khac', 'Lợi nhuận khác'),
  L(/loi nhuan (ke toan )?truoc thue/, 'loi_nhuan_truoc_thue', 'Lợi nhuận trước thuế'),
  L(/thue (tndn|thu nhap doanh nghiep) hien hanh/, 'thue_tndn_hien_hanh', 'Chi phí thuế TNDN hiện hành'),
  L(/thue (tndn|thu nhap doanh nghiep) hoan lai/, 'thue_tndn_hoan_lai', 'Chi phí thuế TNDN hoãn lại'),
  L(/chi phi thue (tndn|thu nhap doanh nghiep)/, 'thue_tndn', 'Chi phí thuế TNDN'),
  L(/loi nhuan sau thue/, 'loi_nhuan_sau_thue', 'Lợi nhuận sau thuế'),
  L(/lai suy giam tren co phieu/, 'lai_suy_giam_co_phieu', 'Lãi suy giảm trên cổ phiếu'),
  L(/lai co ban tren co phieu/, 'lai_co_ban_co_phieu', 'Lãi cơ bản trên cổ phiếu'),
];

const CAN_DOI_KE_TOAN: Luat[] = [
  L(/tong cong tai san|tong tai san/, 'tong_tai_san', 'Tổng tài sản'),
  L(/tong cong nguon von|tong nguon von/, 'tong_nguon_von', 'Tổng nguồn vốn'),
  L(/tai san ngan han khac/, 'tai_san_ngan_han_khac', 'Tài sản ngắn hạn khác'),
  L(/tai san dai han khac/, 'tai_san_dai_han_khac', 'Tài sản dài hạn khác'),
  L(/tien va cac khoan tuong duong tien|tien va tuong duong tien/, 'tien', 'Tiền và tương đương tiền'),
  L(/^cac khoan tuong duong tien$|^tuong duong tien$/, 'tuong_duong_tien', 'Các khoản tương đương tiền'),
  L(/^tien$/, 'tien_mat_gui', 'Tiền'),
  L(/dau tu tai chinh ngan han/, 'dau_tu_tai_chinh_ngan_han', 'Đầu tư tài chính ngắn hạn'),
  L(/dau tu tai chinh dai han/, 'dau_tu_tai_chinh_dai_han', 'Đầu tư tài chính dài hạn'),
  L(/phai thu (ngan han )?cua khach hang/, 'phai_thu_khach_hang', 'Phải thu của khách hàng'),
  L(/tra truoc cho nguoi ban/, 'tra_truoc_nguoi_ban', 'Trả trước cho người bán'),
  L(/cac khoan phai thu ngan han|phai thu ngan han/, 'phai_thu_ngan_han', 'Các khoản phải thu ngắn hạn'),
  L(/cac khoan phai thu dai han|phai thu dai han/, 'phai_thu_dai_han', 'Các khoản phải thu dài hạn'),
  // Mẫu doanh nghiệp nhỏ và vừa (TT133) gọi chung, không tách ngắn/dài hạn.
  L(/^cac khoan phai thu$|^phai thu$/, 'phai_thu', 'Các khoản phải thu'),
  L(/^dau tu tai chinh$/, 'dau_tu_tai_chinh', 'Đầu tư tài chính'),
  L(/du phong giam gia hang ton kho/, 'du_phong_hang_ton_kho', 'Dự phòng giảm giá hàng tồn kho'),
  L(/hang ton kho/, 'hang_ton_kho', 'Hàng tồn kho'),
  L(/tai san ngan han/, 'tai_san_ngan_han', 'Tài sản ngắn hạn'),
  L(/tai san co dinh huu hinh/, 'tscd_huu_hinh', 'Tài sản cố định hữu hình'),
  L(/tai san co dinh vo hinh/, 'tscd_vo_hinh', 'Tài sản cố định vô hình'),
  L(/tai san co dinh thue tai chinh/, 'tscd_thue_tai_chinh', 'Tài sản cố định thuê tài chính'),
  L(/tai san co dinh/, 'tai_san_co_dinh', 'Tài sản cố định'),
  L(/nguyen gia/, 'nguyen_gia', 'Nguyên giá'),
  L(/gia tri hao mon luy ke/, 'hao_mon_luy_ke', 'Giá trị hao mòn luỹ kế'),
  L(/bat dong san dau tu/, 'bat_dong_san_dau_tu', 'Bất động sản đầu tư'),
  L(/tai san do dang dai han|chi phi xay dung co ban do dang/, 'tai_san_do_dang_dai_han', 'Tài sản dở dang dài hạn'),
  L(/tai san dai han/, 'tai_san_dai_han', 'Tài sản dài hạn'),
  L(/phai tra nguoi ban/, 'phai_tra_nguoi_ban', 'Phải trả người bán'),
  L(/nguoi mua tra tien truoc/, 'nguoi_mua_tra_truoc', 'Người mua trả tiền trước'),
  L(/thue va cac khoan phai nop nha nuoc/, 'thue_phai_nop_nha_nuoc', 'Thuế và các khoản phải nộp Nhà nước'),
  L(/phai tra nguoi lao dong/, 'phai_tra_nguoi_lao_dong', 'Phải trả người lao động'),
  L(/vay va no thue tai chinh|vay ngan han|vay dai han|vay va no/, 'vay', 'Vay và nợ thuê tài chính'),
  L(/no ngan han/, 'no_ngan_han', 'Nợ ngắn hạn'),
  L(/no dai han/, 'no_dai_han', 'Nợ dài hạn'),
  L(/no phai tra/, 'no_phai_tra', 'Nợ phải trả'),
  L(/von gop cua chu so huu|von dau tu cua chu so huu/, 'von_gop', 'Vốn góp của chủ sở hữu'),
  L(/thang du von co phan/, 'thang_du_von_co_phan', 'Thặng dư vốn cổ phần'),
  L(/co phieu quy/, 'co_phieu_quy', 'Cổ phiếu quỹ'),
  L(/quy dau tu phat trien/, 'quy_dau_tu_phat_trien', 'Quỹ đầu tư phát triển'),
  L(/loi nhuan (sau thue )?chua phan phoi/, 'loi_nhuan_chua_phan_phoi', 'Lợi nhuận sau thuế chưa phân phối'),
  L(/von chu so huu/, 'von_chu_so_huu', 'Vốn chủ sở hữu'),
];

const LUU_CHUYEN_TIEN_TE: Luat[] = [
  L(/luu chuyen tien thuan tu hoat dong kinh doanh/, 'lctt_kinh_doanh', 'Lưu chuyển tiền thuần từ hoạt động kinh doanh'),
  L(/luu chuyen tien thuan tu hoat dong dau tu/, 'lctt_dau_tu', 'Lưu chuyển tiền thuần từ hoạt động đầu tư'),
  L(/luu chuyen tien thuan tu hoat dong tai chinh/, 'lctt_tai_chinh', 'Lưu chuyển tiền thuần từ hoạt động tài chính'),
  L(/luu chuyen tien thuan trong (ky|nam)/, 'lctt_thuan', 'Lưu chuyển tiền thuần trong kỳ'),
  L(/anh huong cua thay doi ty gia/, 'anh_huong_ty_gia', 'Ảnh hưởng của thay đổi tỷ giá'),
  L(/tien va tuong duong tien dau (ky|nam)/, 'tien_dau_ky', 'Tiền và tương đương tiền đầu kỳ'),
  L(/tien va tuong duong tien cuoi (ky|nam)/, 'tien_cuoi_ky', 'Tiền và tương đương tiền cuối kỳ'),
  L(/tien thu (tu )?ban hang|tien thu tu ban hang, cung cap dich vu/, 'tien_thu_ban_hang', 'Tiền thu từ bán hàng, cung cấp dịch vụ'),
  L(/tien chi tra cho nguoi cung cap/, 'tien_chi_nha_cung_cap', 'Tiền chi trả cho người cung cấp'),
  L(/tien chi tra cho nguoi lao dong/, 'tien_chi_nguoi_lao_dong', 'Tiền chi trả cho người lao động'),
  L(/tien lai vay da tra/, 'tien_lai_vay_da_tra', 'Tiền lãi vay đã trả'),
  L(/thue thu nhap doanh nghiep da nop/, 'thue_tndn_da_nop', 'Thuế TNDN đã nộp'),
  L(/tien thu tu di vay/, 'tien_thu_di_vay', 'Tiền thu từ đi vay'),
  L(/tien tra no goc vay/, 'tien_tra_no_goc', 'Tiền trả nợ gốc vay'),
  L(/co tuc, loi nhuan da tra/, 'co_tuc_da_tra', 'Cổ tức, lợi nhuận đã trả cho chủ sở hữu'),
];

const TO_KHAI_GTGT: Luat[] = [
  L(/khong phat sinh hoat dong mua, ban/, 'khong_phat_sinh', 'Không phát sinh mua bán trong kỳ'),
  L(/thue gtgt con duoc khau tru ky truoc chuyen sang/, 'thue_khau_tru_ky_truoc', 'Thuế GTGT còn được khấu trừ kỳ trước chuyển sang'),
  L(/thue gtgt (cua hang hoa, dich vu mua vao )?duoc khau tru ky nay|tong so thue gtgt duoc khau tru/, 'thue_dau_vao_duoc_khau_tru', 'Thuế GTGT đầu vào được khấu trừ'),
  L(/hang hoa, dich vu mua vao/, 'mua_vao', 'Hàng hoá, dịch vụ mua vào'),
  L(/khong chiu thue/, 'ban_ra_khong_chiu_thue', 'Bán ra không chịu thuế GTGT'),
  L(/thue suat 0\s?%/, 'ban_ra_0', 'Bán ra thuế suất 0%'),
  L(/thue suat 5\s?%/, 'ban_ra_5', 'Bán ra thuế suất 5%'),
  L(/thue suat 8\s?%/, 'ban_ra_8', 'Bán ra thuế suất 8%'),
  L(/thue suat 10\s?%/, 'ban_ra_10', 'Bán ra thuế suất 10%'),
  L(/thue gtgt phat sinh trong ky/, 'thue_phat_sinh', 'Thuế GTGT phát sinh trong kỳ'),
  L(/dieu chinh (tang|giam)/, 'dieu_chinh', 'Điều chỉnh thuế GTGT các kỳ trước'),
  L(/thue gtgt chua khau tru het|chuyen ky sau/, 'thue_chuyen_ky_sau', 'Thuế GTGT chưa khấu trừ hết, chuyển kỳ sau'),
  L(/de nghi hoan/, 'de_nghi_hoan', 'Thuế GTGT đề nghị hoàn'),
  L(/thue gtgt (con )?phai nop/, 'thue_phai_nop', 'Thuế GTGT phải nộp'),
  L(/hang hoa, dich vu ban ra|doanh thu va thue gtgt cua hang hoa, dich vu ban ra/, 'ban_ra', 'Hàng hoá, dịch vụ bán ra'),
];

const TO_KHAI_HO_KINH_DOANH: Luat[] = [
  L(/phan phoi, cung cap hang hoa/, 'dt_phan_phoi_hang_hoa', 'Doanh thu phân phối, cung cấp hàng hoá'),
  L(/dich vu, xay dung khong bao thau nguyen vat lieu/, 'dt_dich_vu', 'Doanh thu dịch vụ, xây dựng không bao thầu NVL'),
  L(/san xuat, van tai, dich vu co gan voi hang hoa/, 'dt_san_xuat_van_tai', 'Doanh thu sản xuất, vận tải, dịch vụ gắn với hàng hoá'),
  L(/cho thue tai san/, 'dt_cho_thue_tai_san', 'Doanh thu cho thuê tài sản'),
  L(/hoat dong kinh doanh khac/, 'dt_khac', 'Doanh thu hoạt động kinh doanh khác'),
  L(/thue gtgt/, 'thue_gtgt', 'Thuế GTGT'),
  L(/thue tncn|thue thu nhap ca nhan/, 'thue_tncn', 'Thuế TNCN'),
  L(/tong (cong )?doanh thu|doanh thu/, 'tong_doanh_thu', 'Doanh thu'),
];

const TO_KHAI_QUYET_TOAN_TNDN: Luat[] = [
  L(/ket qua kinh doanh ghi nhan theo bao cao tai chinh|tong loi nhuan (ke toan )?truoc thue/, 'loi_nhuan_truoc_thue', 'Lợi nhuận kế toán trước thuế'),
  L(/dieu chinh tang/, 'dieu_chinh_tang', 'Điều chỉnh tăng thu nhập chịu thuế'),
  L(/dieu chinh giam/, 'dieu_chinh_giam', 'Điều chỉnh giảm thu nhập chịu thuế'),
  L(/thu nhap mien thue/, 'thu_nhap_mien_thue', 'Thu nhập miễn thuế'),
  L(/chuyen lo|lo duoc chuyen/, 'chuyen_lo', 'Chuyển lỗ'),
  L(/thu nhap tinh thue/, 'thu_nhap_tinh_thue', 'Thu nhập tính thuế'),
  L(/thu nhap chiu thue/, 'thu_nhap_chiu_thue', 'Thu nhập chịu thuế'),
  L(/thue tndn (con )?phai nop|so thue tndn phai nop/, 'thue_tndn_phai_nop', 'Thuế TNDN phải nộp'),
  L(/thue tndn da tam nop/, 'thue_tndn_da_tam_nop', 'Thuế TNDN đã tạm nộp'),
  L(/thue tndn (duoc )?(mien|giam)/, 'thue_tndn_mien_giam', 'Thuế TNDN được miễn, giảm'),
  L(/tong doanh thu/, 'tong_doanh_thu', 'Tổng doanh thu'),
];

const LUAT_THEO_LOAI: Partial<Record<LoaiTaiLieu, Luat[]>> = {
  ket_qua_kinh_doanh: KET_QUA_KINH_DOANH,
  can_doi_ke_toan: CAN_DOI_KE_TOAN,
  luu_chuyen_tien_te: LUU_CHUYEN_TIEN_TE,
  to_khai_gtgt: TO_KHAI_GTGT,
  to_khai_ho_kinh_doanh: TO_KHAI_HO_KINH_DOANH,
  to_khai_quyet_toan_tndn: TO_KHAI_QUYET_TOAN_TNDN,
};

/** Bỏ số thứ tự đầu dòng ("I.", "1.", "a)", "- ", "+ ") và "Trong đó:" để khớp theo nội dung. */
export function chuanHoaNhan(nhan: string): { s: string; la_chi_tiet: boolean } {
  let s = boDau(nhan).replace(/\s+/g, ' ').trim();
  const la_chi_tiet = /^(trong do|\- |\+ )/.test(s) || /^[a-z]\)/.test(s);
  s = s.replace(/^trong do\s*:?\s*/, '')
    .replace(/^(\(?[ivxlc]+[.)]|\(?\d{1,2}[.)]|[a-z][.)]|[-+*•])\s*/, '')
    .replace(/\s*\[\d{1,3}[a-z]?\]\s*/g, ' ')
    .replace(/\s*\(\s*\d{1,3}\s*=.*?\)/g, ' ') // "(20 = 10 - 11)"
    .replace(/\s+/g, ' ').trim();
  return { s, la_chi_tiet };
}

export interface DongPhanLoai extends DongChiTieu {
  nhom: NhomChuan | null;
  la_chi_tiet: boolean;
  /** Vì sao chưa xếp được (chỉ khi nhom = null). */
  ly_do: string | null;
}

export function phanLoaiDong(loai: LoaiTaiLieu, d: DongChiTieu): DongPhanLoai {
  const luat = LUAT_THEO_LOAI[loai];
  const { s, la_chi_tiet } = chuanHoaNhan(d.nhan);
  if (!luat) return { ...d, nhom: null, la_chi_tiet, ly_do: 'MIMI chưa có bộ phân loại cho loại tài liệu này.' };
  const k = luat.find(([re]) => re.test(s));
  if (!k) return { ...d, nhom: null, la_chi_tiet, ly_do: 'Tên chỉ tiêu không khớp nhóm nào MIMI biết — để nguyên, không đoán.' };
  return { ...d, nhom: { khoa: k[1], ten: k[2] }, la_chi_tiet, ly_do: null };
}

/** Các dòng chỉ là tiêu đề/nhóm chữ (không có số nào) không tính vào tỷ lệ phân loại. */
export const coSo = (d: DongChiTieu) => d.gia_tri.some((v) => v !== null);
