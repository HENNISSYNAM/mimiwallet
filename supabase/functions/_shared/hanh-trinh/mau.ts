/**
 * Mẫu hành trình — 12 loại việc Prompt 4 mục 4, viết một lần, tất định.
 *
 * NGUYÊN TẮC NỘI DUNG. Mẫu chỉ nói THỨ TỰ VIỆC và DỮ KIỆN CẦN BIẾT. Không có câu nào khẳng định hạn
 * luật, mẫu tờ khai hay cơ quan nhận: những thứ đó đọc lúc chạy từ nguồn đã đối chiếu (kho thủ tục
 * `thu_tuc_thue` qua `thu_tuc_tim`, lịch thuế `luat/lich-thue.ts`, sổ mẫu `mau_bieu_chinh_thuc`).
 * Viết hạn luật vào đây là đúng loại sai MIMI-P0-003 được lập ra để chặn.
 *
 * HỎI TỪNG CÂU MỘT (mục 6). Mỗi dữ kiện có đúng một câu hỏi; `dong-co.ts` chọn câu quan trọng nhất
 * còn thiếu. Không có biểu mẫu dài.
 */

export const LOAI_HANH_TRINH = [
  'business_start', 'registration_change', 'tax_setup', 'tax_deadline_preparation', 'invoice_setup',
  'invoice_correction', 'authority_response', 'suspension', 'resumption', 'closure', 'dissolution',
  'historical_reconstruction',
] as const;
export type LoaiHanhTrinh = (typeof LOAI_HANH_TRINH)[number];

export type KieuDuKien = 'ngay' | 'lua_chon' | 'chu' | 'thang';

export interface DinhNghiaDuKien {
  cau: string;
  kieu: KieuDuKien;
  lua_chon?: { gia_tri: string; nhan: string }[];
  /** Vì sao hỏi — hiện dưới câu hỏi, để người dùng không thấy bị tra hỏi vô cớ. */
  vi_sao: string;
}

const CO_KHONG = [{ gia_tri: 'co', nhan: 'Có' }, { gia_tri: 'khong', nhan: 'Không' }];
const CO_KHONG_CHUA_RO = [...CO_KHONG, { gia_tri: 'chua_ro', nhan: 'Tôi chưa rõ' }];

export const DU_KIEN: Record<string, DinhNghiaDuKien> = {
  loai_chu_the: {
    cau: 'Bạn là hộ kinh doanh hay doanh nghiệp (công ty)?', kieu: 'lua_chon',
    lua_chon: [{ gia_tri: 'ho_kinh_doanh', nhan: 'Hộ kinh doanh' }, { gia_tri: 'doanh_nghiep', nhan: 'Doanh nghiệp' }],
    vi_sao: 'Hai loại khai thuế và làm thủ tục khác nhau.',
  },
  da_co_mst: { cau: 'Bạn đã có mã số thuế cho việc kinh doanh chưa?', kieu: 'lua_chon', lua_chon: CO_KHONG, vi_sao: 'Chưa có thì việc đầu tiên là đăng ký.' },
  ngay_bat_dau_kd: { cau: 'Bạn bắt đầu kinh doanh từ ngày nào?', kieu: 'ngay', vi_sao: 'Kỳ khai thuế đầu tiên tính từ ngày này.' },
  hoat_dong_chinh: {
    cau: 'Việc kinh doanh chính của bạn là gì?', kieu: 'lua_chon',
    lua_chon: [
      { gia_tri: 'phan_phoi_hang_hoa', nhan: 'Bán hàng hoá' },
      { gia_tri: 'dich_vu', nhan: 'Dịch vụ (không kèm hàng)' },
      { gia_tri: 'san_xuat_van_tai', nhan: 'Sản xuất, vận tải, dịch vụ có kèm hàng' },
      { gia_tri: 'cho_thue_tai_san', nhan: 'Cho thuê nhà, tài sản' },
      { gia_tri: 'khac', nhan: 'Khác' },
    ],
    vi_sao: 'Mỗi nhóm hoạt động có tỷ lệ thuế riêng.',
  },
  dung_hoa_don_dien_tu: { cau: 'Bạn đã dùng hoá đơn điện tử chưa?', kieu: 'lua_chon', lua_chon: CO_KHONG, vi_sao: 'Để biết có cần đăng ký hoá đơn điện tử không.' },
  ky_khai_gtgt: {
    cau: 'Công ty đang khai thuế GTGT theo tháng hay theo quý?', kieu: 'lua_chon',
    lua_chon: [{ gia_tri: 'thang', nhan: 'Theo tháng' }, { gia_tri: 'quy', nhan: 'Theo quý' }, { gia_tri: 'chua_ro', nhan: 'Tôi chưa rõ' }],
    vi_sao: 'Hạn khai phụ thuộc kỳ khai.',
  },
  thay_doi_gi: {
    cau: 'Bạn muốn thay đổi thông tin nào?', kieu: 'lua_chon',
    lua_chon: [
      { gia_tri: 'dia_chi', nhan: 'Địa chỉ kinh doanh' }, { gia_tri: 'nganh_nghe', nhan: 'Ngành nghề' },
      { gia_tri: 'nguoi_dai_dien', nhan: 'Người đại diện / chủ hộ' }, { gia_tri: 'ten', nhan: 'Tên' }, { gia_tri: 'khac', nhan: 'Khác' },
    ],
    vi_sao: 'Mỗi loại thay đổi là một thủ tục khác.',
  },
  hoa_don_sai_o_dau: {
    cau: 'Hoá đơn sai ở chỗ nào?', kieu: 'lua_chon',
    lua_chon: [
      { gia_tri: 'mst_nguoi_mua', nhan: 'Mã số thuế người mua' }, { gia_tri: 'ten_dia_chi', nhan: 'Tên, địa chỉ người mua' },
      { gia_tri: 'so_tien_thue_suat', nhan: 'Số tiền, thuế suất' }, { gia_tri: 'hang_hoa', nhan: 'Hàng hoá, dịch vụ' },
    ],
    vi_sao: 'Sai tên/địa chỉ và sai MST hay số tiền được xử lý khác nhau.',
  },
  so_hoa_don: { cau: 'Số hoá đơn bị sai là gì?', kieu: 'chu', vi_sao: 'Để MIMI tìm đúng hoá đơn và trạng thái của nó.' },
  da_gui_nguoi_mua: { cau: 'Hoá đơn đã gửi cho người mua chưa?', kieu: 'lua_chon', lua_chon: CO_KHONG_CHUA_RO, vi_sao: 'Đã gửi hay chưa quyết định cách sửa.' },
  da_ke_khai_hoa_don: { cau: 'Hoá đơn này đã được kê khai thuế chưa?', kieu: 'lua_chon', lua_chon: CO_KHONG_CHUA_RO, vi_sao: 'Đã kê khai thì có thể phải khai bổ sung.' },
  ngay_nhan_thong_bao: { cau: 'Bạn nhận thông báo của cơ quan thuế ngày nào?', kieu: 'ngay', vi_sao: 'Thời hạn trả lời tính từ thông báo.' },
  han_tra_loi: { cau: 'Thông báo ghi hạn trả lời là ngày nào?', kieu: 'ngay', vi_sao: 'MIMI nhắc bạn trước hạn này. Lấy đúng ngày ghi trên thông báo.' },
  noi_dung_yeu_cau: { cau: 'Cơ quan thuế yêu cầu giải trình về việc gì? (chép ngắn nội dung chính)', kieu: 'chu', vi_sao: 'Để gom đúng chứng từ cho từng nội dung.' },
  ky_hoi_tu: { cau: 'Thông báo hỏi về số liệu từ tháng nào? (dạng 2026-04)', kieu: 'thang', vi_sao: 'MIMI gom sao kê và hoá đơn đúng kỳ được hỏi.' },
  ky_hoi_den: { cau: 'Tới tháng nào? (dạng 2026-06)', kieu: 'thang', vi_sao: 'Tháng cuối của kỳ được hỏi.' },
  tam_ngung_tu: { cau: 'Bạn muốn bắt đầu tạm ngừng từ ngày nào?', kieu: 'ngay', vi_sao: 'Nghĩa vụ trước ngày này vẫn phải hoàn thành.' },
  tam_ngung_den: { cau: 'Bạn dự định tạm ngừng tới ngày nào?', kieu: 'ngay', vi_sao: 'Để MIMI nhắc việc khi hết thời gian tạm ngừng.' },
  tiep_tuc_tu: { cau: 'Bạn muốn kinh doanh trở lại từ ngày nào?', kieu: 'ngay', vi_sao: 'Nghĩa vụ khai thuế chạy lại từ ngày này.' },
  ngay_cham_dut: { cau: 'Bạn dự định ngừng kinh doanh hẳn từ ngày nào?', kieu: 'ngay', vi_sao: 'Mọi nghĩa vụ phải xong trước khi đóng mã số thuế.' },
  con_no_thue: { cau: 'Bạn còn khoản thuế nào chưa nộp không?', kieu: 'lua_chon', lua_chon: CO_KHONG_CHUA_RO, vi_sao: 'Còn nợ thuế thì chưa đóng được.' },
  con_hoa_don_chua_dung: { cau: 'Bạn còn hoá đơn đã đăng ký mà chưa dùng không?', kieu: 'lua_chon', lua_chon: CO_KHONG_CHUA_RO, vi_sao: 'Hoá đơn chưa dùng phải được xử lý trước khi đóng.' },
  tu_thang: { cau: 'Bạn cần dựng lại sổ từ tháng nào? (dạng 2026-01)', kieu: 'thang', vi_sao: 'MIMI đọc sao kê và hoá đơn từ tháng này.' },
  den_thang: { cau: 'Tới tháng nào? (dạng 2026-06)', kieu: 'thang', vi_sao: 'Kỳ cuối cần dựng lại.' },
};

export type LoaiHanhDongBuoc = 'hoi' | 'mo_trang' | 'soan_tai_lieu' | 'nguoi_dung_lam' | 'kiem_ket_qua';

export interface BuocMau {
  khoa: string;
  tieu_de: string;
  mo_ta: string;
  uu_tien: number;
  du_kien_can: string[];
  giay_to_can?: string[];
  /** Câu tìm trong kho thủ tục (`chonThuTuc`) — không viết cứng mã thủ tục. */
  thu_tuc_tim?: string;
  loai_hanh_dong: LoaiHanhDongBuoc;
  dich_hanh_dong?: string;
  /** Bước chỉ áp dụng khi dữ kiện cho phép. Không áp dụng → skipped. */
  ap_dung_khi?: (dk: Record<string, string>) => boolean;
}

export interface MauHanhTrinh {
  tieu_de: string;
  /** Loại hồ sơ việc đi kèm (Phase C). */
  loai_ho_so: string;
  buoc: BuocMau[];
}

const hoi = (khoa: string, tieu_de: string, du_kien_can: string[], uu_tien = 90, mo_ta = ''): BuocMau =>
  ({ khoa, tieu_de, mo_ta, uu_tien, du_kien_can, loai_hanh_dong: 'hoi' });

const traThuTuc = (khoa: string, tieu_de: string, thu_tuc_tim: string, du_kien_can: string[] = [], mo_ta = 'MIMI tra thủ tục khớp trên danh mục Cổng dịch vụ công thuế: hồ sơ gồm gì, mẫu nào, nộp ở đâu.'): BuocMau =>
  ({ khoa, tieu_de, mo_ta, uu_tien: 70, du_kien_can, thu_tuc_tim, loai_hanh_dong: 'mo_trang', dich_hanh_dong: '/dashboard/tro-ly' });

const nguoiDungNop = (tieu_de = 'Bạn tự nộp hồ sơ trên Cổng dịch vụ công'): BuocMau => ({
  khoa: 'nguoi_dung_nop', tieu_de, uu_tien: 40, du_kien_can: [], loai_hanh_dong: 'nguoi_dung_lam',
  mo_ta: 'MIMI không nộp thay, không ký thay. Nộp xong, bấm "Đã nộp" để MIMI chờ kết quả cùng bạn.',
});

const kiemKetQua = (tieu_de = 'Kiểm kết quả và đóng việc'): BuocMau => ({
  khoa: 'kiem_ket_qua', tieu_de, uu_tien: 30, du_kien_can: [], loai_hanh_dong: 'kiem_ket_qua',
  mo_ta: 'Việc chỉ đóng khi có bằng chứng kết quả (thông báo chấp nhận, biên nhận). Chưa có thì MIMI giữ việc mở.',
});

export const MAU_HANH_TRINH: Record<LoaiHanhTrinh, MauHanhTrinh> = {
  business_start: {
    tieu_de: 'Bắt đầu kinh doanh', loai_ho_so: 'bat_dau_kinh_doanh',
    buoc: [
      hoi('xac_dinh_chu_the', 'Bạn là hộ kinh doanh hay doanh nghiệp', ['loai_chu_the'], 100),
      hoi('kiem_mst', 'Kiểm mã số thuế', ['da_co_mst'], 95),
      { ...traThuTuc('dang_ky_thue', 'Đăng ký thuế', 'dang ky thue lan dau ho kinh doanh', ['da_co_mst']), ap_dung_khi: (d) => d.da_co_mst === 'khong' },
      hoi('khai_hoat_dong', 'Khai báo việc kinh doanh chính và ngày bắt đầu', ['hoat_dong_chinh', 'ngay_bat_dau_kd'], 85),
      { khoa: 'ket_noi_ngan_hang', tieu_de: 'Kết nối tài khoản ngân hàng nhận tiền bán hàng', mo_ta: 'Để MIMI đọc tiền vào và tính doanh thu thật.', uu_tien: 60, du_kien_can: [], loai_hanh_dong: 'mo_trang', dich_hanh_dong: '/dashboard/fintech' },
      { khoa: 'xem_lich_thue', tieu_de: 'Xem lịch thuế của bạn', mo_ta: 'Lịch tính theo loại người nộp, doanh thu và ngày bắt đầu.', uu_tien: 55, du_kien_can: ['loai_chu_the', 'ngay_bat_dau_kd'], loai_hanh_dong: 'mo_trang', dich_hanh_dong: '/dashboard/nhac-thue' },
      hoi('hoa_don', 'Hoá đơn điện tử', ['dung_hoa_don_dien_tu'], 50),
      { ...traThuTuc('dang_ky_hoa_don', 'Đăng ký sử dụng hoá đơn điện tử', 'dang ky su dung hoa don dien tu', ['dung_hoa_don_dien_tu']), ap_dung_khi: (d) => d.dung_hoa_don_dien_tu === 'khong' },
    ],
  },
  registration_change: {
    tieu_de: 'Thay đổi thông tin đăng ký', loai_ho_so: 'thay_doi_dang_ky',
    buoc: [
      hoi('chon_thay_doi', 'Thông tin nào thay đổi', ['thay_doi_gi'], 100),
      traThuTuc('tra_thu_tuc', 'Thủ tục thay đổi thông tin đăng ký thuế', 'thay doi thong tin dang ky thue', ['thay_doi_gi']),
      { khoa: 'soan_ho_so', tieu_de: 'Chuẩn bị hồ sơ', mo_ta: 'MIMI liệt kê giấy tờ theo thủ tục đã tra; mẫu chưa đối chiếu thì ghi rõ.', uu_tien: 60, du_kien_can: ['thay_doi_gi'], giay_to_can: ['registration_document'], loai_hanh_dong: 'soan_tai_lieu', dich_hanh_dong: 'administrative_letter' },
      nguoiDungNop(), kiemKetQua(),
    ],
  },
  tax_setup: {
    tieu_de: 'Thiết lập thuế', loai_ho_so: 'thiet_lap_thue',
    buoc: [
      hoi('xac_dinh_chu_the', 'Loại người nộp thuế', ['loai_chu_the'], 100),
      hoi('hoat_dong', 'Việc kinh doanh chính', ['hoat_dong_chinh'], 90),
      { ...hoi('ky_khai', 'Kỳ khai thuế GTGT', ['ky_khai_gtgt'], 85), ap_dung_khi: (d) => d.loai_chu_the === 'doanh_nghiep' },
      { khoa: 'xem_lich_thue', tieu_de: 'Xem lịch thuế', mo_ta: 'Lịch đầy đủ khi đủ dữ kiện ở trên.', uu_tien: 50, du_kien_can: ['loai_chu_the'], loai_hanh_dong: 'mo_trang', dich_hanh_dong: '/dashboard/nhac-thue' },
    ],
  },
  tax_deadline_preparation: {
    tieu_de: 'Chuẩn bị trước hạn thuế', loai_ho_so: 'chuan_bi_han_thue',
    buoc: [
      { khoa: 'xac_nhan_tien_vao', tieu_de: 'Xác nhận các khoản tiền vào chưa rõ', mo_ta: 'Khoản chưa rõ đang được tính như doanh thu.', uu_tien: 90, du_kien_can: [], loai_hanh_dong: 'mo_trang', dich_hanh_dong: '/dashboard' },
      { khoa: 'kiem_chung_tu', tieu_de: 'Kiểm chứng từ chi phí trong kỳ', mo_ta: 'Khoản chi chưa có hoá đơn đầu vào.', uu_tien: 70, du_kien_can: [], loai_hanh_dong: 'mo_trang', dich_hanh_dong: '/dashboard/chung-tu' },
      { khoa: 'goi_san_sang', tieu_de: 'Tạo gói sẵn sàng khai thuế', mo_ta: 'Doanh thu đã/chưa phân loại, giấy tờ thiếu, việc cần làm — kèm nguồn.', uu_tien: 60, du_kien_can: [], giay_to_can: ['tax_readiness_pack'], loai_hanh_dong: 'soan_tai_lieu', dich_hanh_dong: 'tax_readiness_pack' },
      { khoa: 'kiem_to_khai', tieu_de: 'Kiểm bản nháp tờ khai', mo_ta: 'MIMI soạn từ sao kê và hoá đơn; bạn xác nhận từng tờ trước khi nộp.', uu_tien: 50, du_kien_can: [], loai_hanh_dong: 'mo_trang', dich_hanh_dong: '/dashboard/to-khai' },
      nguoiDungNop('Bạn nộp tờ khai'), kiemKetQua('Kiểm biên nhận tờ khai'),
    ],
  },
  invoice_setup: {
    tieu_de: 'Thiết lập hoá đơn điện tử', loai_ho_so: 'thiet_lap_hoa_don',
    buoc: [
      hoi('hien_trang', 'Hiện trạng hoá đơn', ['dung_hoa_don_dien_tu'], 100),
      { ...traThuTuc('dang_ky_hoa_don', 'Đăng ký sử dụng hoá đơn điện tử', 'dang ky su dung hoa don dien tu', ['dung_hoa_don_dien_tu']), ap_dung_khi: (d) => d.dung_hoa_don_dien_tu === 'khong' },
      { khoa: 'lap_hoa_don', tieu_de: 'Lập hoá đơn bán ra trong MIMI', mo_ta: 'Để đối soát tiền về với hoá đơn.', uu_tien: 50, du_kien_can: [], loai_hanh_dong: 'mo_trang', dich_hanh_dong: '/dashboard/invoices' },
    ],
  },
  invoice_correction: {
    tieu_de: 'Sửa hoá đơn sai', loai_ho_so: 'sua_hoa_don',
    buoc: [
      hoi('xac_dinh_hoa_don', 'Hoá đơn nào', ['so_hoa_don'], 100),
      hoi('sai_o_dau', 'Sai ở đâu', ['hoa_don_sai_o_dau'], 95),
      hoi('trang_thai_gui', 'Đã gửi người mua / đã kê khai chưa', ['da_gui_nguoi_mua', 'da_ke_khai_hoa_don'], 90),
      traThuTuc('tra_cach_sua', 'Cách xử lý hoá đơn sai theo nguồn chính thức', 'hoa don dien tu sai sot dieu chinh thay the', ['hoa_don_sai_o_dau', 'da_gui_nguoi_mua'],
        'MIMI tra quy định và thủ tục trong kho đã đối chiếu. Điều chỉnh hay thay thế tuỳ đúng quy định — MIMI không tự quyết khi chưa có căn cứ.'),
      { khoa: 'lap_hoa_don_moi', tieu_de: 'Lập hoá đơn điều chỉnh / thay thế trên phần mềm hoá đơn', mo_ta: 'Bạn thực hiện trên phần mềm hoá đơn điện tử đang dùng.', uu_tien: 50, du_kien_can: ['hoa_don_sai_o_dau'], loai_hanh_dong: 'nguoi_dung_lam' },
      { ...hoi('ke_khai_bo_sung', 'Có cần khai bổ sung không', ['da_ke_khai_hoa_don'], 40), ap_dung_khi: (d) => d.da_ke_khai_hoa_don !== 'khong' },
      kiemKetQua('Kiểm hoá đơn mới đã có mã của cơ quan thuế'),
    ],
  },
  authority_response: {
    tieu_de: 'Trả lời yêu cầu giải trình của cơ quan thuế', loai_ho_so: 'yeu_cau_giai_trinh',
    buoc: [
      { ...hoi('ghi_nhan', 'Ghi nhận thông báo', ['ngay_nhan_thong_bao', 'han_tra_loi', 'noi_dung_yeu_cau'], 100), giay_to_can: ['authority_notice'] },
      { khoa: 'goi_bang_chung', tieu_de: 'Gom bằng chứng', mo_ta: 'Sao kê, phân loại tiền vào, hoá đơn khớp, danh sách còn thiếu.', uu_tien: 80, du_kien_can: ['noi_dung_yeu_cau', 'ky_hoi_tu', 'ky_hoi_den'], giay_to_can: ['audit_pack'], loai_hanh_dong: 'soan_tai_lieu', dich_hanh_dong: 'audit_pack' },
      { khoa: 'soan_giai_trinh', tieu_de: 'Soạn công văn giải trình', mo_ta: 'Bản nháp để bạn và kế toán duyệt. MIMI không điền căn cứ pháp lý chưa đối chiếu.', uu_tien: 70, du_kien_can: ['noi_dung_yeu_cau'], giay_to_can: ['explanation_letter'], loai_hanh_dong: 'soan_tai_lieu', dich_hanh_dong: 'explanation_letter' },
      nguoiDungNop('Bạn gửi giải trình cho cơ quan thuế'), kiemKetQua('Kiểm phản hồi của cơ quan thuế'),
    ],
  },
  suspension: {
    tieu_de: 'Tạm ngừng kinh doanh', loai_ho_so: 'tam_ngung',
    buoc: [
      hoi('thoi_gian', 'Thời gian tạm ngừng', ['tam_ngung_tu', 'tam_ngung_den'], 100),
      { khoa: 'nghia_vu_con_treo', tieu_de: 'Hoàn thành nghĩa vụ trước ngày tạm ngừng', mo_ta: 'MIMI đối chiếu lịch thuế của bạn với ngày tạm ngừng.', uu_tien: 85, du_kien_can: ['tam_ngung_tu'], loai_hanh_dong: 'mo_trang', dich_hanh_dong: '/dashboard/nhac-thue' },
      traThuTuc('tra_thu_tuc', 'Thủ tục thông báo tạm ngừng', 'tam ngung hoat dong kinh doanh', ['tam_ngung_tu']),
      nguoiDungNop(), kiemKetQua(),
    ],
  },
  resumption: {
    tieu_de: 'Kinh doanh trở lại', loai_ho_so: 'tiep_tuc_kinh_doanh',
    buoc: [
      hoi('ngay_tiep_tuc', 'Ngày kinh doanh trở lại', ['tiep_tuc_tu'], 100),
      traThuTuc('tra_thu_tuc', 'Thủ tục tiếp tục hoạt động trước thời hạn', 'tiep tuc hoat dong kinh doanh truoc thoi han', ['tiep_tuc_tu']),
      { khoa: 'lich_thue_lai', tieu_de: 'Lịch thuế chạy lại', mo_ta: 'Nghĩa vụ khai chạy lại từ ngày kinh doanh trở lại.', uu_tien: 50, du_kien_can: ['tiep_tuc_tu'], loai_hanh_dong: 'mo_trang', dich_hanh_dong: '/dashboard/nhac-thue' },
      nguoiDungNop(), kiemKetQua(),
    ],
  },
  closure: {
    tieu_de: 'Ngừng kinh doanh, đóng mã số thuế', loai_ho_so: 'cham_dut',
    buoc: [
      hoi('ngay_cham_dut', 'Ngày ngừng kinh doanh', ['ngay_cham_dut'], 100),
      hoi('no_thue', 'Còn nợ thuế không', ['con_no_thue'], 95),
      hoi('hoa_don_con', 'Hoá đơn chưa dùng', ['con_hoa_don_chua_dung'], 90),
      { khoa: 'nop_het_nghia_vu', tieu_de: 'Nộp hết thuế còn nợ, khai kỳ cuối', mo_ta: 'Chưa xong thì chưa đóng mã số thuế được.', uu_tien: 80, du_kien_can: ['con_no_thue'], loai_hanh_dong: 'nguoi_dung_lam', ap_dung_khi: (d) => d.con_no_thue !== 'khong' },
      traThuTuc('tra_thu_tuc', 'Thủ tục chấm dứt hiệu lực mã số thuế', 'cham dut hieu luc ma so thue', ['ngay_cham_dut']),
      nguoiDungNop(), kiemKetQua('Kiểm thông báo chấm dứt hiệu lực mã số thuế'),
    ],
  },
  dissolution: {
    tieu_de: 'Sẵn sàng giải thể', loai_ho_so: 'giai_the',
    buoc: [
      hoi('ngay', 'Ngày dự kiến giải thể', ['ngay_cham_dut'], 100),
      hoi('no_thue', 'Còn nợ thuế không', ['con_no_thue'], 95),
      hoi('hoa_don_con', 'Hoá đơn chưa dùng', ['con_hoa_don_chua_dung'], 90),
      { khoa: 'quyet_toan', tieu_de: 'Quyết toán thuế khi giải thể', mo_ta: 'Hạn quyết toán tính từ ngày có quyết định giải thể — MIMI đọc từ lịch thuế.', uu_tien: 80, du_kien_can: ['ngay_cham_dut'], loai_hanh_dong: 'mo_trang', dich_hanh_dong: '/dashboard/nhac-thue' },
      traThuTuc('tra_thu_tuc', 'Thủ tục giải thể, chấm dứt mã số thuế', 'giai the cham dut hieu luc ma so thue', ['ngay_cham_dut']),
      nguoiDungNop(), kiemKetQua(),
    ],
  },
  historical_reconstruction: {
    tieu_de: 'Dựng lại sổ các kỳ trước', loai_ho_so: 'dung_lai_so',
    buoc: [
      hoi('ky', 'Kỳ cần dựng lại', ['tu_thang', 'den_thang'], 100),
      { khoa: 'nhap_sao_ke', tieu_de: 'Nhập sao kê các tháng đó', mo_ta: 'Tải file sao kê Excel/CSV hoặc đồng bộ ngân hàng.', uu_tien: 80, du_kien_can: ['tu_thang'], loai_hanh_dong: 'mo_trang', dich_hanh_dong: '/dashboard/fintech' },
      { khoa: 'phan_loai', tieu_de: 'Phân loại tiền vào', mo_ta: 'Doanh thu, tiền vay, tiền người nhà — từng khoản.', uu_tien: 70, du_kien_can: [], loai_hanh_dong: 'mo_trang', dich_hanh_dong: '/dashboard' },
      { khoa: 'bao_cao', tieu_de: 'Tạo báo cáo đối soát các kỳ', mo_ta: 'Có nguồn từng dòng.', uu_tien: 60, du_kien_can: ['tu_thang', 'den_thang'], giay_to_can: ['reconciliation_report'], loai_hanh_dong: 'soan_tai_lieu', dich_hanh_dong: 'reconciliation_report' },
    ],
  },
};
