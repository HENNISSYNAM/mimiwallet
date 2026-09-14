/**
 * BỘ CASE VÀNG cho bộ luật chi của agent.
 *
 * HỌC TỪ CÁCH RAMP KIỂM AGENT (builders.ramp.com, "How to build agents users can
 * trust"): eval là unit test; bộ vàng được soát theo CHÍNH SÁCH ĐÚNG, không theo
 * việc người duyệt từng bấm — người duyệt hay dễ dãi, lấy họ làm đáp án thì luật
 * lỏng theo; ưu tiên ca biên; mỗi lỗi thật biến thành một case.
 *
 * Mỗi case ghi `nguon` — nó đến từ đâu:
 *   thiet-ke     luật viết trong chinh-sach.ts / docs/AGENTIC_MIMI.md
 *   loi-that     một lỗi đã xảy ra thật, kèm ngày
 *   lua-dao      kiểu lừa đảo có số liệu (GASA 2025)
 *   bien         ca biên: đúng bằng trần, lệch 1 đồng, lệch 1 phút
 *
 * THÊM CASE: chép một case gần giống, đổi đúng một điều, ghi nguồn. Đừng sửa kỳ
 * vọng cho khớp kết quả — nếu luật trả khác kỳ vọng, hoặc luật sai, hoặc case sai,
 * và phải có người quyết là cái nào.
 */
import type { BoiCanh, ChinhSach, KetQuaXet, MaLyDo, YeuCau } from '../chinh-sach.ts';

export type NhomCase =
  | 'tu_duyet'
  | 'han_muc'
  | 'nguoi_nhan'
  | 'chong_lua_dao'
  | 'tan_suat'
  | 'du_lieu'
  | 'trang_thai';

export const TEN_NHOM_CASE: Record<NhomCase, string> = {
  tu_duyet: 'Tự duyệt và ngưỡng duyệt',
  han_muc: 'Hạn mức tiền',
  nguoi_nhan: 'Người nhận',
  chong_lua_dao: 'Chống lừa đảo chuyển khoản',
  tan_suat: 'Tần suất (agent chạy vòng lặp)',
  du_lieu: 'Dữ liệu yêu cầu sai',
  trang_thai: 'Trạng thái agent và chính sách',
};

export interface CaseVang {
  id: string;
  nhom: NhomCase;
  moTa: string;
  nguon: string;
  yc?: Partial<YeuCau>;
  cs?: Partial<ChinhSach>;
  bc?: Partial<BoiCanh>;
  kyVong: {
    ketQua: KetQuaXet;
    /** Các mã BẮT BUỘC có trong lý do. */
    phaiCo?: MaLyDo[];
    /** Các mã KHÔNG được có — thường để khẳng định "từ chối thắng chờ duyệt". */
    khongDuocCo?: MaLyDo[];
  };
}

/** 10:00 sáng 14/09/2026 giờ Việt Nam. */
export const LUC_CHUAN = new Date('2026-09-14T03:00:00Z');
const GIO = 3_600_000;
const truoc = (ms: number) => new Date(LUC_CHUAN.getTime() - ms).toISOString();

export const BIN_A = '970422';
export const BIN_B = '970436';
export const STK_QUEN = '2431122002';
export const STK_LA = '9999888877';

export const CHINH_SACH_CHUAN: ChinhSach = {
  hanMucMoiLan: 5_000_000,
  hanMucNgay: 20_000_000,
  hanMucThang: 100_000_000,
  nguongCanDuyet: 2_000_000,
  nhomChiDuocPhep: null,
  chiTraNguoiNhanDaDuyet: false,
  hetHan: null,
  soYeuCauMoiGio: 30,
};

export const BOI_CANH_CHUAN: BoiCanh = {
  trangThaiTacTu: 'hoat_dong',
  daGiuNgay: 0,
  daGiuThang: 0,
  nguoiNhanDaDuyet: [{ nganHangBin: BIN_A, soTaiKhoan: STK_QUEN, themLuc: truoc(30 * 24 * GIO) }],
  nganHangHopLe: true,
  luc: LUC_CHUAN,
  soYeuCauGioQua: 0,
  tenNguoiNhan: 'CÔNG TY TNHH ABC',
  taiKhoanDaBiet: [],
};

export const YEU_CAU_CHUAN: YeuCau = {
  soTien: 500_000,
  nganHangBin: BIN_A,
  soTaiKhoan: STK_QUEN,
  nhomChi: 'quang_cao',
  mucDich: 'Nạp ngân sách quảng cáo tháng 9',
};

const TK_CU_CUNG_TEN = { nganHangBin: BIN_B, soTaiKhoan: '0071000123456', ten: 'Công ty TNHH ABC' };

export const BO_CASE_VANG: CaseVang[] = [
  /* ── Tự duyệt và ngưỡng duyệt ───────────────────────────────────── */
  { id: 'V01', nhom: 'tu_duyet', nguon: 'thiet-ke', moTa: 'Trong hạn mức, người nhận quen, dưới ngưỡng → tự duyệt',
    kyVong: { ketQua: 'tu_dong_duyet', phaiCo: ['TRONG_CHINH_SACH'] } },
  { id: 'V02', nhom: 'tu_duyet', nguon: 'bien', moTa: 'Đúng bằng ngưỡng duyệt 2.000.000đ → vẫn tự duyệt ("trên" là trên)',
    yc: { soTien: 2_000_000 }, kyVong: { ketQua: 'tu_dong_duyet' } },
  { id: 'V03', nhom: 'tu_duyet', nguon: 'bien', moTa: 'Trên ngưỡng 1 đồng → chờ người duyệt',
    yc: { soTien: 2_000_001 }, kyVong: { ketQua: 'cho_duyet', phaiCo: ['TREN_NGUONG_DUYET'] } },
  { id: 'V04', nhom: 'tu_duyet', nguon: 'thiet-ke', moTa: 'Ngưỡng 0 = mọi khoản phải duyệt (mặc định chặt)',
    cs: { nguongCanDuyet: 0 }, yc: { soTien: 1_000 }, kyVong: { ketQua: 'cho_duyet', phaiCo: ['TREN_NGUONG_DUYET'] } },
  { id: 'V05', nhom: 'tu_duyet', nguon: 'thiet-ke', moTa: 'Nhóm chi bị giới hạn nhưng yêu cầu đúng nhóm → tự duyệt',
    cs: { nhomChiDuocPhep: ['quang_cao'] }, kyVong: { ketQua: 'tu_dong_duyet' } },

  /* ── Hạn mức tiền ───────────────────────────────────────────────── */
  { id: 'H01', nhom: 'han_muc', nguon: 'thiet-ke', moTa: 'Vượt trần mỗi lần → từ chối',
    yc: { soTien: 5_000_001 }, kyVong: { ketQua: 'tu_choi', phaiCo: ['VUOT_HAN_MUC_MOI_LAN'] } },
  { id: 'H02', nhom: 'han_muc', nguon: 'bien', moTa: 'Chạm đúng trần ngày tính cả khoản đang giữ chỗ → vẫn được',
    bc: { daGiuNgay: 19_500_000, daGiuThang: 19_500_000 }, kyVong: { ketQua: 'tu_dong_duyet' } },
  { id: 'H03', nhom: 'han_muc', nguon: 'bien', moTa: 'Vượt trần ngày 1 đồng → từ chối',
    bc: { daGiuNgay: 19_500_001, daGiuThang: 19_500_001 }, kyVong: { ketQua: 'tu_choi', phaiCo: ['VUOT_HAN_MUC_NGAY'] } },
  { id: 'H04', nhom: 'han_muc', nguon: 'thiet-ke', moTa: 'Vượt trần tháng → từ chối',
    bc: { daGiuThang: 99_600_000 }, kyVong: { ketQua: 'tu_choi', phaiCo: ['VUOT_HAN_MUC_THANG'] } },
  { id: 'H05', nhom: 'han_muc', nguon: 'thiet-ke', moTa: 'Vượt trần mà cũng trên ngưỡng → TỪ CHỐI, không đẩy sang người duyệt',
    yc: { soTien: 6_000_000 }, kyVong: { ketQua: 'tu_choi', phaiCo: ['VUOT_HAN_MUC_MOI_LAN'], khongDuocCo: ['TREN_NGUONG_DUYET'] } },
  { id: 'H06', nhom: 'han_muc', nguon: 'thiet-ke', moTa: 'Vượt cả ngày lẫn tháng → nói cả hai lý do một lần',
    bc: { daGiuNgay: 19_600_000, daGiuThang: 99_600_000 },
    kyVong: { ketQua: 'tu_choi', phaiCo: ['VUOT_HAN_MUC_NGAY', 'VUOT_HAN_MUC_THANG'] } },

  /* ── Người nhận ─────────────────────────────────────────────────── */
  { id: 'N01', nhom: 'nguoi_nhan', nguon: 'thiet-ke', moTa: 'Người lạ, chính sách chỉ cho người trong danh sách → từ chối',
    cs: { chiTraNguoiNhanDaDuyet: true }, yc: { soTaiKhoan: STK_LA }, kyVong: { ketQua: 'tu_choi', phaiCo: ['NGUOI_NHAN_CHUA_DUYET'] } },
  { id: 'N02', nhom: 'nguoi_nhan', nguon: 'thiet-ke', moTa: 'Người lạ, chính sách mở → chờ người xác nhận',
    yc: { soTaiKhoan: STK_LA }, kyVong: { ketQua: 'cho_duyet', phaiCo: ['NGUOI_NHAN_MOI'] } },
  { id: 'N03', nhom: 'nguoi_nhan', nguon: 'bien', moTa: 'Cùng số tài khoản nhưng khác ngân hàng là người khác',
    yc: { nganHangBin: BIN_B }, kyVong: { ketQua: 'cho_duyet', phaiCo: ['NGUOI_NHAN_MOI'] } },
  { id: 'N04', nhom: 'nguoi_nhan', nguon: 'lua-dao', moTa: 'Người nhận vừa thêm 2 giờ trước → chưa được tự duyệt',
    bc: { nguoiNhanDaDuyet: [{ nganHangBin: BIN_A, soTaiKhoan: STK_QUEN, themLuc: truoc(2 * GIO) }] },
    kyVong: { ketQua: 'cho_duyet', phaiCo: ['NGUOI_NHAN_MOI_THEM'] } },
  { id: 'N05', nhom: 'nguoi_nhan', nguon: 'bien', moTa: 'Thêm đúng 24 giờ trước → hết thời gian giữ, tự duyệt',
    bc: { nguoiNhanDaDuyet: [{ nganHangBin: BIN_A, soTaiKhoan: STK_QUEN, themLuc: truoc(24 * GIO) }] },
    kyVong: { ketQua: 'tu_dong_duyet', khongDuocCo: ['NGUOI_NHAN_MOI_THEM'] } },
  { id: 'N06', nhom: 'nguoi_nhan', nguon: 'bien', moTa: 'Thêm 23 giờ 59 phút trước → vẫn giữ',
    bc: { nguoiNhanDaDuyet: [{ nganHangBin: BIN_A, soTaiKhoan: STK_QUEN, themLuc: truoc(24 * GIO - 60_000) }] },
    kyVong: { ketQua: 'cho_duyet', phaiCo: ['NGUOI_NHAN_MOI_THEM'] } },
  { id: 'N07', nhom: 'nguoi_nhan', nguon: 'thiet-ke', moTa: 'Dữ liệu cũ không có mốc thêm → không giữ',
    bc: { nguoiNhanDaDuyet: [{ nganHangBin: BIN_A, soTaiKhoan: STK_QUEN }] }, kyVong: { ketQua: 'tu_dong_duyet' } },

  /* ── Chống lừa đảo chuyển khoản ─────────────────────────────────── */
  { id: 'L01', nhom: 'chong_lua_dao', nguon: 'lua-dao', moTa: '"Nhà cung cấp đổi số tài khoản": cùng tên, tài khoản lạ → chờ duyệt + cảnh báo',
    yc: { soTaiKhoan: STK_LA }, bc: { taiKhoanDaBiet: [TK_CU_CUNG_TEN] },
    kyVong: { ketQua: 'cho_duyet', phaiCo: ['NGUOI_NHAN_MOI', 'DOI_SO_TAI_KHOAN'] } },
  { id: 'L02', nhom: 'chong_lua_dao', nguon: 'lua-dao', moTa: 'Tên viết không dấu, khác hoa thường vẫn bị bắt',
    yc: { soTaiKhoan: STK_LA }, bc: { tenNguoiNhan: 'cong ty tnhh  abc', taiKhoanDaBiet: [TK_CU_CUNG_TEN] },
    kyVong: { ketQua: 'cho_duyet', phaiCo: ['DOI_SO_TAI_KHOAN'] } },
  { id: 'L03', nhom: 'chong_lua_dao', nguon: 'thiet-ke', moTa: 'Tài khoản đã trong danh sách hơn 24 giờ → chủ đã kiểm, không cảnh báo',
    bc: { taiKhoanDaBiet: [TK_CU_CUNG_TEN] }, kyVong: { ketQua: 'tu_dong_duyet', khongDuocCo: ['DOI_SO_TAI_KHOAN'] } },
  { id: 'L04', nhom: 'chong_lua_dao', nguon: 'lua-dao', moTa: 'Tài khoản mới thêm 3 giờ, cùng tên có tài khoản cũ khác → giữ + cảnh báo',
    bc: { nguoiNhanDaDuyet: [{ nganHangBin: BIN_A, soTaiKhoan: STK_QUEN, themLuc: truoc(3 * GIO) }], taiKhoanDaBiet: [TK_CU_CUNG_TEN] },
    kyVong: { ketQua: 'cho_duyet', phaiCo: ['NGUOI_NHAN_MOI_THEM', 'DOI_SO_TAI_KHOAN'] } },
  { id: 'L05', nhom: 'chong_lua_dao', nguon: 'bien', moTa: 'Tên khác hẳn → không cảnh báo đổi tài khoản',
    yc: { soTaiKhoan: STK_LA }, bc: { tenNguoiNhan: 'CÔNG TY XYZ', taiKhoanDaBiet: [TK_CU_CUNG_TEN] },
    kyVong: { ketQua: 'cho_duyet', phaiCo: ['NGUOI_NHAN_MOI'], khongDuocCo: ['DOI_SO_TAI_KHOAN'] } },
  { id: 'L06', nhom: 'chong_lua_dao', nguon: 'bien', moTa: 'Không có tên người nhận → không so',
    yc: { soTaiKhoan: STK_LA }, bc: { tenNguoiNhan: null, taiKhoanDaBiet: [TK_CU_CUNG_TEN] },
    kyVong: { ketQua: 'cho_duyet', khongDuocCo: ['DOI_SO_TAI_KHOAN'] } },
  { id: 'L07', nhom: 'chong_lua_dao', nguon: 'thiet-ke', moTa: 'Chính sách chặt + đổi tài khoản → vẫn từ chối, cảnh báo không làm nhẹ đi',
    cs: { chiTraNguoiNhanDaDuyet: true }, yc: { soTaiKhoan: STK_LA }, bc: { taiKhoanDaBiet: [TK_CU_CUNG_TEN] },
    kyVong: { ketQua: 'tu_choi', phaiCo: ['NGUOI_NHAN_CHUA_DUYET'] } },
  { id: 'L08', nhom: 'chong_lua_dao', nguon: 'bien', moTa: 'Tên quá ngắn ("AB") → không so, tránh trùng nhầm',
    yc: { soTaiKhoan: STK_LA }, bc: { tenNguoiNhan: 'AB', taiKhoanDaBiet: [{ ...TK_CU_CUNG_TEN, ten: 'AB' }] },
    kyVong: { ketQua: 'cho_duyet', khongDuocCo: ['DOI_SO_TAI_KHOAN'] } },
  { id: 'L09', nhom: 'chong_lua_dao', nguon: 'bien', moTa: 'Lịch sử chỉ có chính tài khoản đang xin → không phải đổi',
    yc: { soTaiKhoan: STK_LA }, bc: { taiKhoanDaBiet: [{ nganHangBin: BIN_A, soTaiKhoan: STK_LA, ten: 'CÔNG TY TNHH ABC' }] },
    kyVong: { ketQua: 'cho_duyet', phaiCo: ['NGUOI_NHAN_MOI'], khongDuocCo: ['DOI_SO_TAI_KHOAN'] } },

  /* ── Tần suất ───────────────────────────────────────────────────── */
  { id: 'T01', nhom: 'tan_suat', nguon: 'bien', moTa: '29 yêu cầu trong giờ qua, trần 30 → yêu cầu thứ 30 vẫn được',
    bc: { soYeuCauGioQua: 29 }, kyVong: { ketQua: 'tu_dong_duyet' } },
  { id: 'T02', nhom: 'tan_suat', nguon: 'bien', moTa: '30 yêu cầu trong giờ qua → thứ 31 bị từ chối',
    bc: { soYeuCauGioQua: 30 }, kyVong: { ketQua: 'tu_choi', phaiCo: ['VUOT_TAN_SUAT'] } },
  { id: 'T03', nhom: 'tan_suat', nguon: 'thiet-ke', moTa: 'Không giới hạn (null) → 5.000 yêu cầu vẫn không chặn',
    cs: { soYeuCauMoiGio: null }, bc: { soYeuCauGioQua: 5_000 }, kyVong: { ketQua: 'tu_dong_duyet' } },
  { id: 'T04', nhom: 'tan_suat', nguon: 'bien', moTa: 'Trần 1 mỗi giờ, chưa gửi gì → được',
    cs: { soYeuCauMoiGio: 1 }, kyVong: { ketQua: 'tu_dong_duyet' } },
  { id: 'T05', nhom: 'tan_suat', nguon: 'bien', moTa: 'Trần 1 mỗi giờ, đã gửi 1 → từ chối',
    cs: { soYeuCauMoiGio: 1 }, bc: { soYeuCauGioQua: 1 }, kyVong: { ketQua: 'tu_choi', phaiCo: ['VUOT_TAN_SUAT'] } },
  { id: 'T06', nhom: 'tan_suat', nguon: 'thiet-ke', moTa: 'Vòng lặp khoản lớn → từ chối, không thành chờ duyệt',
    yc: { soTien: 3_000_000 }, bc: { soYeuCauGioQua: 40 },
    kyVong: { ketQua: 'tu_choi', phaiCo: ['VUOT_TAN_SUAT'], khongDuocCo: ['TREN_NGUONG_DUYET'] } },

  /* ── Dữ liệu yêu cầu sai ────────────────────────────────────────── */
  { id: 'D01', nhom: 'du_lieu', nguon: 'thiet-ke', moTa: 'Số tiền 0', yc: { soTien: 0 }, kyVong: { ketQua: 'tu_choi', phaiCo: ['SO_TIEN_KHONG_HOP_LE'] } },
  { id: 'D02', nhom: 'du_lieu', nguon: 'thiet-ke', moTa: 'Số tiền lẻ thập phân', yc: { soTien: 1000.5 }, kyVong: { ketQua: 'tu_choi', phaiCo: ['SO_TIEN_KHONG_HOP_LE'] } },
  { id: 'D03', nhom: 'du_lieu', nguon: 'thiet-ke', moTa: 'Số tiền âm', yc: { soTien: -500_000 }, kyVong: { ketQua: 'tu_choi', phaiCo: ['SO_TIEN_KHONG_HOP_LE'] } },
  { id: 'D04', nhom: 'du_lieu', nguon: 'thiet-ke', moTa: 'Mã ngân hàng không nhận ra', bc: { nganHangHopLe: false },
    kyVong: { ketQua: 'tu_choi', phaiCo: ['NGAN_HANG_KHONG_RO'] } },
  { id: 'D05', nhom: 'du_lieu', nguon: 'thiet-ke', moTa: 'Số tài khoản có chữ', yc: { soTaiKhoan: '24311A2002' },
    kyVong: { ketQua: 'tu_choi', phaiCo: ['SO_TAI_KHOAN_KHONG_HOP_LE'] } },
  { id: 'D06', nhom: 'du_lieu', nguon: 'bien', moTa: 'Số tài khoản 5 số (dưới 6)', yc: { soTaiKhoan: '12345' },
    kyVong: { ketQua: 'tu_choi', phaiCo: ['SO_TAI_KHOAN_KHONG_HOP_LE'] } },
  { id: 'D07', nhom: 'du_lieu', nguon: 'bien', moTa: 'Số tài khoản đúng 19 số là hợp lệ', yc: { soTaiKhoan: '1234567890123456789' },
    kyVong: { ketQua: 'cho_duyet', khongDuocCo: ['SO_TAI_KHOAN_KHONG_HOP_LE'] } },
  { id: 'D08', nhom: 'du_lieu', nguon: 'thiet-ke', moTa: 'Mục đích dưới 5 ký tự', yc: { mucDich: 'abcd' },
    kyVong: { ketQua: 'tu_choi', phaiCo: ['THIEU_MUC_DICH'] } },
  { id: 'D09', nhom: 'du_lieu', nguon: 'loi-that 10/09/2026', moTa: 'Mục đích hỏng mã hoá (U+FFFD) — chuỗi thật từng lọt vào sổ',
    yc: { mucDich: 'Th? v�ng ki?m so�t' }, kyVong: { ketQua: 'tu_choi', phaiCo: ['MUC_DICH_LOI_MA_HOA'] } },
  { id: 'D10', nhom: 'du_lieu', nguon: 'thiet-ke', moTa: 'Nhóm chi không có trong danh mục', yc: { nhomChi: 'mua_sam' },
    kyVong: { ketQua: 'tu_choi', phaiCo: ['NHOM_CHI_KHONG_RO'] } },
  { id: 'D11', nhom: 'du_lieu', nguon: 'thiet-ke', moTa: 'Nhóm chi có trong danh mục nhưng agent không được phép',
    cs: { nhomChiDuocPhep: ['ha_tang_ai'] }, kyVong: { ketQua: 'tu_choi', phaiCo: ['NHOM_CHI_KHONG_DUOC_PHEP'] } },

  /* ── Trạng thái agent và chính sách ─────────────────────────────── */
  { id: 'S01', nhom: 'trang_thai', nguon: 'thiet-ke', moTa: 'Agent tạm dừng', bc: { trangThaiTacTu: 'tam_dung' },
    kyVong: { ketQua: 'tu_choi', phaiCo: ['TAC_TU_TAM_DUNG'] } },
  { id: 'S02', nhom: 'trang_thai', nguon: 'thiet-ke', moTa: 'Agent đã thu hồi', bc: { trangThaiTacTu: 'thu_hoi' },
    kyVong: { ketQua: 'tu_choi', phaiCo: ['TAC_TU_DA_THU_HOI'] } },
  { id: 'S03', nhom: 'trang_thai', nguon: 'bien', moTa: 'Chính sách hết hạn đúng thời điểm xét',
    cs: { hetHan: LUC_CHUAN.toISOString() }, kyVong: { ketQua: 'tu_choi', phaiCo: ['CHINH_SACH_HET_HAN'] } },
  { id: 'S04', nhom: 'trang_thai', nguon: 'bien', moTa: 'Chính sách hết hạn ngày mai → vẫn chạy',
    cs: { hetHan: new Date(LUC_CHUAN.getTime() + 24 * GIO).toISOString() }, kyVong: { ketQua: 'tu_dong_duyet' } },
  { id: 'S05', nhom: 'trang_thai', nguon: 'thiet-ke', moTa: 'Nhiều lỗi cùng lúc → nói hết trong một lần trả lời',
    yc: { soTien: 0, nhomChi: 'mua_sam' }, bc: { trangThaiTacTu: 'tam_dung' },
    kyVong: { ketQua: 'tu_choi', phaiCo: ['TAC_TU_TAM_DUNG', 'SO_TIEN_KHONG_HOP_LE', 'NHOM_CHI_KHONG_RO'] } },
];
