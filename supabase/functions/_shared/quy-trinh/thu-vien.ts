/**
 * THƯ VIỆN WORKFLOW (22/11/2026) — dựng theo các chu trình chuẩn của nghề tài chính & vận hành, không tự nghĩ ra:
 *   Procure-to-Pay (P2P), Order-to-Cash (O2C), Record-to-Report (R2R / đóng sổ), đối chiếu ngân hàng, hoàn ứng chi phí,
 *   tiền lương; kiểm soát gian lận thanh toán / giả mạo email doanh nghiệp (BEC); ứng phó sự cố theo các pha của NIST
 *   SP 800-61 (phát hiện & phân tích → khoanh vùng → khắc phục → rút kinh nghiệm); rà soát quyền truy cập định kỳ;
 *   thẩm định khách hàng (KYC); nhân sự vào / ra.
 * Mỗi mẫu là điểm xuất phát — người dùng chỉnh bằng tay hoặc bằng chat. Công cụ chưa có thật thì để tên dịch vụ
 * (sẽ hiện "cần kết nối", người dán API key ngay tại bước).
 */
import { chuanHoa, MAU, type DoThi, type LinhVuc, type LoaiNut, type Nut, type TacDong } from './do-thi.ts';

export interface MauThuVien { khoa: string; linh_vuc: LinhVuc; tieu_de: string; mo_ta: string; khung: string; tu_khoa: string[]; do_thi: DoThi }

type B = [id: string, loai: LoaiNut, ten: string, mo_ta: string, tac?: TacDong, cc?: string | null, ai?: boolean];
const dung = (...bs: B[]): DoThi => chuanHoa({
  nut: bs.map(([id, loai, ten, mo_ta, tac = 'doc', cc = null, ai]): Nut => ({ id, loai, ten, mo_ta, tac_dong: tac, cong_cu: cc, ai_duoc: ai ?? (loai !== 'nguoi' && loai !== 'kich_hoat') })),
  canh: bs.slice(1).map((b, i) => ({ tu: bs[i][0], den: b[0] })),
});
const BD = (ten: string, mo_ta = 'Bấm tay'): B => ['bat_dau', 'kich_hoat', ten, mo_ta, 'doc', null, false];

export const THU_VIEN: MauThuVien[] = [
  { khoa: 'dong_so_thang', linh_vuc: 'tai_chinh', tieu_de: 'Đóng sổ cuối tháng', khung: 'Record-to-Report', mo_ta: 'Đối chiếu, phân loại, khoá kỳ, báo cáo.',
    tu_khoa: ['dong so', 'cuoi thang', 'khoa so', 'chot thang', 'record to report'],
    do_thi: dung(BD('Ngày cuối tháng', 'Theo lịch'), ['doc_sk', 'agent', 'Kéo sao kê tháng', 'Mọi tài khoản đã liên kết', 'doc', 'doc_sao_ke'],
      ['phan_loai', 'agent', 'Phân loại tiền vào', 'Kèm lý do từng khoản', 'de_xuat', 'phan_loai_tien_vao'], ['ghi', 'agent', 'Ghi phân loại vào sổ', 'Qua hàng duyệt', 'ghi', 'hang_duyet'],
      ['thieu', 'agent', 'Tìm khoản chi thiếu chứng từ', 'Liệt kê để nhắc', 'doc', 'tim_khoan_thieu_chung_tu'],
      ['bao_cao', 'agent', 'Soạn báo cáo tháng', 'Thu, chi, chênh lệch, điểm bất thường', 'de_xuat', 'soan_van_ban'], ['ky', 'nguoi', 'Kế toán trưởng ký khoá kỳ', 'Khoá sổ tháng', 'ghi', null, false]) },
  { khoa: 'chot_quy_thue', linh_vuc: 'tai_chinh', tieu_de: 'Chốt quý và nộp tờ khai', khung: 'Record-to-Report + tuân thủ thuế', mo_ta: 'Từ sao kê tới tờ khai đã nộp.',
    tu_khoa: ['chot quy', 'to khai', 'khai thue', 'quy 1', 'quy 2', 'quy 3', 'quy 4', 'nop thue'], do_thi: chuanHoa(MAU.tai_chinh.do_thi) },
  { khoa: 'doi_chieu_ngan_hang', linh_vuc: 'tai_chinh', tieu_de: 'Đối chiếu ngân hàng', khung: 'Bank reconciliation', mo_ta: 'Khớp sổ với sao kê, xử lý chênh lệch.',
    tu_khoa: ['doi chieu', 'doi soat', 'reconcile', 'khop so', 'chenh lech'],
    do_thi: dung(BD('Hằng tuần'), ['doc_sk', 'agent', 'Kéo sao kê', 'Từ ngân hàng đã liên kết', 'doc', 'doc_sao_ke'],
      ['khop', 'agent', 'Khớp với hoá đơn và sổ', 'Theo số tiền, mã tham chiếu, ngày', 'de_xuat', 'doi_soat_sao_ke'],
      ['lech', 'agent', 'Liệt kê khoản chênh lệch', 'Khoản không khớp kèm lý do có thể', 'de_xuat', 'soan_van_ban'],
      ['xu_ly', 'nguoi', 'Xử lý chênh lệch', 'Hỏi khách / ngân hàng', 'ghi', null, false], ['ghi', 'agent', 'Ghi điều chỉnh', 'Qua hàng duyệt', 'ghi', 'hang_duyet']) },
  { khoa: 'tra_ncc', linh_vuc: 'thanh_toan', tieu_de: 'Thanh toán nhà cung cấp (P2P)', khung: 'Procure-to-Pay, khớp 3 bên', mo_ta: 'Đơn hàng – phiếu nhận – hoá đơn khớp rồi mới trả.',
    tu_khoa: ['nha cung cap', 'ncc', 'tra tien', 'thanh toan', 'hoa don dau vao', 'procure', 'p2p'],
    do_thi: dung(BD('Hoá đơn tới hạn'), ['doc_hd', 'agent', 'Đọc hoá đơn', 'Số tiền, người nhận, số tài khoản', 'doc', 'doc_chung_tu'],
      ['khop3', 'agent', 'Khớp đơn hàng – nhận hàng – hoá đơn', 'Lệch số lượng / giá thì dừng', 'de_xuat', 'erp'],
      ['kiem_nhan', 'agent', 'Kiểm người nhận', 'Đổi tài khoản, người nhận lạ', 'de_xuat', 'doi_soat_sao_ke'],
      ['lenh', 'agent', 'Soạn lệnh chi VietQR', 'Chưa chuyển', 'de_xuat', 'soan_lenh_chi_vietqr'], ['chuyen', 'nguoi', 'Chuyển tiền', 'Trên app ngân hàng — MIMI không chuyển', 'chuyen_tien', null, false],
      ['doi_soat', 'agent', 'Đối soát sao kê', 'Đánh dấu hoá đơn đã trả', 'ghi', 'doi_soat_sao_ke']) },
  { khoa: 'hoan_ung', linh_vuc: 'thanh_toan', tieu_de: 'Hoàn ứng chi phí nhân viên', khung: 'Expense reimbursement', mo_ta: 'Chứng từ hợp lệ, đúng chính sách, rồi mới trả.',
    tu_khoa: ['hoan ung', 'tam ung', 'cong tac phi', 'chi phi nhan vien', 'reimburse'],
    do_thi: dung(BD('Nhân viên gửi đề nghị'), ['doc', 'agent', 'Đọc chứng từ', 'Hoá đơn, biên lai', 'doc', 'doc_chung_tu'],
      ['chinh_sach', 'agent', 'Kiểm theo chính sách chi', 'Hạn mức, loại chi, trùng lặp', 'de_xuat', 'soan_van_ban'], ['ql', 'duyet', 'Quản lý duyệt', 'Trưởng bộ phận'],
      ['chuyen', 'nguoi', 'Chuyển tiền hoàn ứng', 'MIMI không chuyển', 'chuyen_tien', null, false], ['ghi', 'agent', 'Ghi sổ chi phí', 'Qua hàng duyệt', 'ghi', 'hang_duyet']) },
  { khoa: 'thu_no', linh_vuc: 'thanh_toan', tieu_de: 'Thu nợ khách hàng (O2C)', khung: 'Order-to-Cash, nhắc nợ theo bậc', mo_ta: 'Nhắc đúng lúc, đúng giọng, ghi nhận khi tiền về.',
    tu_khoa: ['thu no', 'cong no', 'nhac no', 'qua han', 'phai thu', 'o2c'],
    do_thi: dung(BD('Hoá đơn quá hạn'), ['ds', 'agent', 'Lập danh sách quá hạn', 'Theo tuổi nợ', 'doc', 'hoa_don'],
      ['soan', 'agent', 'Soạn thư nhắc theo bậc', '7 / 15 / 30 ngày', 'de_xuat', 'soan_van_ban'], ['gui', 'agent', 'Gửi thư nhắc', 'Email cho khách', 'gui_ra_ngoai', 'gmail'],
      ['khop', 'agent', 'Khớp tiền về', 'Đánh dấu đã thu', 'ghi', 'doi_soat_sao_ke'], ['goi', 'nguoi', 'Gọi khách nợ lâu', 'Trên 30 ngày', 'doc', null, false]) },
  { khoa: 'bec', linh_vuc: 'bao_mat', tieu_de: 'Chặn giả mạo đổi tài khoản nhận tiền (BEC)', khung: 'Kiểm soát gian lận thanh toán', mo_ta: 'Xác minh ngoài kênh trước khi đổi.',
    tu_khoa: ['doi so tai khoan', 'tai khoan nhan', 'gia mao', 'lua dao', 'bec', 'email la'], do_thi: chuanHoa(MAU.bao_mat.do_thi) },
  { khoa: 'su_co', linh_vuc: 'bao_mat', tieu_de: 'Ứng phó sự cố bảo mật', khung: 'NIST SP 800-61 (4 pha)', mo_ta: 'Phát hiện – khoanh vùng – khắc phục – rút kinh nghiệm.',
    tu_khoa: ['su co', 'bi hack', 'ro ri', 'ma doc', 'dang nhap la', 'tan cong', 'incident'],
    do_thi: dung(BD('Có cảnh báo'), ['phan_tich', 'agent', 'Phân tích cảnh báo', 'Mức độ, phạm vi, tài khoản liên quan', 'de_xuat', 'siem'],
      ['khoanh', 'nguoi', 'Khoanh vùng', 'Khoá tài khoản / tách máy bị ảnh hưởng', 'ghi', null, false], ['khac_phuc', 'nguoi', 'Khắc phục', 'Đổi khoá, vá lỗi, khôi phục', 'ghi', null, false],
      ['bao', 'agent', 'Báo cáo sự cố', 'Dòng thời gian, tác động, việc đã làm', 'de_xuat', 'soan_van_ban'], ['gui', 'nguoi', 'Thông báo bên liên quan', 'Theo quy định', 'gui_ra_ngoai', null, false],
      ['rut', 'agent', 'Bài học rút ra', 'Việc cần đổi để không lặp lại', 'de_xuat', 'soan_van_ban']) },
  { khoa: 'ra_soat_quyen', linh_vuc: 'bao_mat', tieu_de: 'Rà soát quyền truy cập hằng quý', khung: 'Access recertification', mo_ta: 'Ai còn cần quyền gì — thu hồi phần thừa.',
    tu_khoa: ['ra soat quyen', 'quyen truy cap', 'phan quyen', 'access review'],
    do_thi: dung(BD('Đầu quý', 'Theo lịch'), ['ds', 'agent', 'Liệt kê tài khoản và quyền', 'Theo từng hệ thống', 'doc', 'quan_tri_tai_khoan'],
      ['doi', 'agent', 'Đánh dấu quyền bất thường', 'Người đã nghỉ, quyền vượt vai trò', 'de_xuat', 'soan_van_ban'], ['ql', 'duyet', 'Trưởng bộ phận xác nhận', 'Giữ hay thu hồi'],
      ['thu_hoi', 'agent', 'Thu hồi quyền thừa', 'Theo danh sách đã duyệt', 'xoa', 'quan_tri_tai_khoan']) },
  { khoa: 'kyc', linh_vuc: 'ho_so', tieu_de: 'Thẩm định khách hàng (KYC)', khung: 'KYC / phòng chống rửa tiền', mo_ta: 'Đủ giấy tờ, kiểm danh sách, phân mức rủi ro.',
    tu_khoa: ['kyc', 'tham dinh', 'dinh danh', 'rua tien', 'aml', 'khach hang moi'],
    do_thi: dung(BD('Khách hàng mới'), ['giay', 'agent', 'Đọc giấy tờ', 'Giấy đăng ký, CCCD người đại diện', 'doc', 'doc_chung_tu'],
      ['mst', 'agent', 'Tra mã số thuế', 'Tình trạng hoạt động', 'doc', 'tra_cuu_mst'], ['muc', 'agent', 'Phân mức rủi ro', 'Theo ngành, dòng tiền, quốc gia', 'de_xuat', 'soan_van_ban'],
      ['duyet', 'duyet', 'Chuyên viên tuân thủ duyệt', 'Rủi ro cao thì hỏi thêm'], ['luu', 'agent', 'Lưu hồ sơ', 'Vào thư viện chứng từ', 'ghi', 'thu_vien']) },
  { khoa: 'ho_so_vay', linh_vuc: 'ho_so', tieu_de: 'Hồ sơ vay vốn', khung: 'Chuẩn bị tín dụng doanh nghiệp nhỏ', mo_ta: 'Dòng tiền thật, giấy tờ đủ, gửi đúng nơi.',
    tu_khoa: ['vay', 'ho so vay', 'tin dung', 'ngan hang'], do_thi: chuanHoa(MAU.ho_so.do_thi) },
  { khoa: 'giai_trinh_thue', linh_vuc: 'ho_so', tieu_de: 'Trả lời giải trình cơ quan thuế', khung: 'Tuân thủ thuế', mo_ta: 'Đọc thông báo, gom bằng chứng, soạn công văn.',
    tu_khoa: ['giai trinh', 'thong bao thue', 'cong van', 'co quan thue'],
    do_thi: dung(BD('Nhận thông báo'), ['doc', 'agent', 'Đọc thông báo', 'Yêu cầu gì, hạn khi nào', 'doc', 'doc_chung_tu'],
      ['bang_chung', 'agent', 'Gom bằng chứng', 'Sao kê, hoá đơn liên quan', 'doc', 'doc_sao_ke'], ['soan', 'agent', 'Soạn công văn giải trình', 'Có căn cứ', 'de_xuat', 'soan_van_ban'],
      ['ky', 'nguoi', 'Ký công văn', 'Người đại diện', 'ghi', null, false], ['nop', 'nguoi', 'Nộp công văn', 'Cổng thuế / trực tiếp', 'nop', null, false]) },
  { khoa: 'vao_lam', linh_vuc: 'nhan_su', tieu_de: 'Đón nhân viên mới', khung: 'Onboarding', mo_ta: 'Giấy tờ, tài khoản, người hướng dẫn, bảo hiểm.',
    tu_khoa: ['nhan vien moi', 'onboard', 'vao lam', 'tuyen'], do_thi: chuanHoa(MAU.nhan_su.do_thi) },
  { khoa: 'nghi_viec', linh_vuc: 'nhan_su', tieu_de: 'Nhân viên nghỉ việc', khung: 'Offboarding + thu hồi quyền', mo_ta: 'Bàn giao, thu hồi quyền ngay ngày cuối, chốt lương.',
    tu_khoa: ['nghi viec', 'thoi viec', 'offboard', 'ban giao'],
    do_thi: dung(BD('Có đơn nghỉ việc'), ['ban_giao', 'agent', 'Lập danh sách bàn giao', 'Việc, tài liệu, thiết bị', 'de_xuat', 'soan_van_ban'],
      ['nhan', 'nguoi', 'Bàn giao', 'Người nhận ký', 'ghi', null, false], ['thu_hoi', 'agent', 'Thu hồi tài khoản', 'Ngày làm việc cuối', 'xoa', 'quan_tri_tai_khoan'],
      ['luong', 'agent', 'Tính lương và phép còn lại', 'Đến ngày cuối', 'de_xuat', 'hrm'], ['tra', 'nguoi', 'Trả lương cuối', 'MIMI không chuyển', 'chuyen_tien', null, false]) },
  { khoa: 'tra_luong', linh_vuc: 'nhan_su', tieu_de: 'Trả lương tháng', khung: 'Payroll', mo_ta: 'Chấm công – tính lương – duyệt – trả – khai.',
    tu_khoa: ['luong', 'bang luong', 'payroll', 'cham cong'],
    do_thi: dung(BD('Cuối tháng'), ['cong', 'agent', 'Lấy dữ liệu chấm công', 'Từ hệ thống chấm công', 'doc', 'hrm'],
      ['tinh', 'agent', 'Tính bảng lương', 'Lương, phụ cấp, khấu trừ, thuế TNCN', 'de_xuat', 'hrm'], ['duyet', 'duyet', 'Giám đốc duyệt bảng lương', ''],
      ['tra', 'nguoi', 'Chuyển lương', 'MIMI không chuyển', 'chuyen_tien', null, false], ['phieu', 'agent', 'Gửi phiếu lương', 'Email từng người', 'gui_ra_ngoai', 'gmail']) },
  { khoa: 'du_toan', linh_vuc: 'cong_viec', tieu_de: 'Duyệt ngân sách / dự toán', khung: 'Budget approval', mo_ta: 'Đề xuất – so với thực chi – duyệt.',
    tu_khoa: ['ngan sach', 'du toan', 'budget', 'ke hoach chi'],
    do_thi: dung(BD('Có đề xuất'), ['so', 'agent', 'So với thực chi kỳ trước', 'Từ sao kê', 'doc', 'doc_sao_ke'],
      ['nhan_xet', 'agent', 'Nhận xét đề xuất', 'Khoản vượt, khoản lạ', 'de_xuat', 'soan_van_ban'], ['duyet', 'duyet', 'Giám đốc tài chính duyệt', ''],
      ['bao', 'agent', 'Báo kết quả cho bộ phận', '', 'gui_ra_ngoai', 'gmail']) },
  // ── Thu mua & chi tiêu (23/11/2026, theo nghiên cứu docs/techday/nghien-cuu/NGHIEP_VU_CFO_THU_MUA_THANH_TOAN.md) ──
  { khoa: 'rfq', linh_vuc: 'thanh_toan', tieu_de: 'Tìm nhà cung cấp & so báo giá (RFQ)', khung: 'Sourcing / RFQ · tổng chi phí sở hữu (TCO)', mo_ta: 'Nhiều báo giá, so theo TCO, người chọn và đàm phán.',
    tu_khoa: ['bao gia', 'rfq', 'so sanh gia', 'tim nha cung cap', 'gia tot nhat', 'mua gia tot', 'thu mua', 'sourcing'],
    do_thi: dung(BD('Có nhu cầu mua'),
      ['yeu_cau', 'agent', 'Làm rõ yêu cầu mua', 'Quy cách, số lượng, thời hạn, ngân sách', 'de_xuat', 'soan_van_ban'],
      ['ds_ncc', 'agent', 'Lập danh sách nhà cung cấp tiềm năng', 'Từ danh mục nhà cung cấp đã duyệt (vendor master)', 'doc', 'vendor_master'],
      ['soan_rfq', 'agent', 'Soạn yêu cầu báo giá (RFQ)', 'Cùng một mẫu cho mọi nhà cung cấp để so công bằng', 'de_xuat', 'soan_van_ban'],
      ['gui_rfq', 'agent', 'Gửi RFQ cho nhà cung cấp', 'Email tới từng nhà cung cấp', 'gui_ra_ngoai', 'gmail'],
      ['thu_bg', 'agent', 'Thu và đọc báo giá', 'Trích giá, điều khoản thanh toán, thời gian giao', 'doc', 'doc_chung_tu'],
      ['so_sanh', 'agent', 'So sánh theo tổng chi phí sở hữu (TCO)', 'Giá + vận chuyển + bảo hành + điều khoản thanh toán', 'de_xuat', 'soan_van_ban'],
      ['kiem_ncc', 'agent', 'Kiểm tra nhà cung cấp', 'Mã số thuế, tình trạng hoạt động, lịch sử', 'doc', 'tra_cuu_mst'],
      ['dam_phan', 'nguoi', 'Đàm phán giá và điều khoản', 'Giá, chiết khấu số lượng, điều khoản thanh toán', 'doc', null, false],
      ['chon', 'duyet', 'Trưởng bộ phận mua hàng chọn nhà cung cấp', ''],
      ['tao_po', 'agent', 'Lập đơn mua hàng (PO)', 'Từ báo giá đã chọn', 'ghi', 'erp'],
      ['luu', 'agent', 'Lưu hồ sơ báo giá', 'Để kiểm toán truy được vì sao chọn nhà cung cấp này', 'ghi', 'thu_vien']) },
  { khoa: 'pr_po', linh_vuc: 'thanh_toan', tieu_de: 'Từ đề nghị mua đến đơn mua có duyệt (PR → PO)', khung: 'Procure-to-Pay · ma trận phân quyền (DoA)', mo_ta: 'Duyệt theo hạn mức trước khi cam kết với nhà cung cấp.',
    tu_khoa: ['de nghi mua', 'pr po', 'don mua hang', 'phe duyet mua', 'mua sam', 'hat mua', 'po'],
    do_thi: dung(BD('Nhân viên gửi đề nghị mua'),
      ['kiem_ns', 'agent', 'Kiểm đề nghị theo ngân sách', 'Còn ngân sách không, đúng danh mục chi không', 'de_xuat', 'soan_van_ban'],
      ['cap_duyet', 'agent', 'Xác định cấp duyệt theo hạn mức', 'Theo ma trận phân quyền (DoA)', 'de_xuat', 'soan_van_ban'],
      ['duyet', 'duyet', 'Cấp có thẩm quyền duyệt', 'Theo hạn mức'],
      ['lap_po', 'agent', 'Lập đơn mua hàng (PO)', 'Số PO duy nhất, gắn đề nghị mua', 'ghi', 'erp'],
      ['gui_po', 'agent', 'Gửi PO cho nhà cung cấp', 'Email có đính PO', 'gui_ra_ngoai', 'gmail'],
      ['theo_doi', 'agent', 'Theo dõi giao hàng', 'Nhắc khi gần hạn giao', 'doc', 'thong_bao_trong_app']) },
  { khoa: 'chiet_khau_som', linh_vuc: 'thanh_toan', tieu_de: 'Lịch trả & chiết khấu thanh toán sớm', khung: 'Vốn lưu động · chiết khấu thanh toán sớm (vd 2/10 net 30)', mo_ta: 'Trả sớm khi chiết khấu đáng hơn chi phí vốn.',
    tu_khoa: ['chiet khau', 'thanh toan som', '2/10', 'net 30', 'lich tra', 'von luu dong'],
    do_thi: dung(BD('Hằng tuần'),
      ['ds_hd', 'agent', 'Lấy hoá đơn phải trả sắp đến hạn', 'Theo ngày đến hạn', 'doc', 'hoa_don'],
      ['tim_ck', 'agent', 'Tìm hoá đơn có chiết khấu thanh toán sớm', 'Đọc điều khoản trên hoá đơn / hợp đồng', 'de_xuat', 'soan_van_ban'],
      ['tinh', 'agent', 'Tính lợi ích so với chi phí vốn', 'Bộ máy tính, không do mô hình tính', 'de_xuat', 'tinh_chiet_khau'],
      ['duyet', 'duyet', 'Kế toán trưởng duyệt danh sách trả sớm', ''],
      ['lenh', 'agent', 'Soạn lệnh chi VietQR', 'Chưa chuyển', 'de_xuat', 'soan_lenh_chi_vietqr'],
      ['chuyen', 'nguoi', 'Chuyển tiền', 'MIMI không chuyển tiền', 'chuyen_tien', null, false],
      ['doi_soat', 'agent', 'Đối soát và ghi nhận chiết khấu', 'Ghi chiết khấu hưởng được', 'ghi', 'doi_soat_sao_ke']) },
  { khoa: 'chong_tra_trung', linh_vuc: 'thanh_toan', tieu_de: 'Chống thanh toán trùng & hoá đơn bất thường', khung: 'Kiểm soát P2P · phát hiện trùng lặp', mo_ta: 'Quét trước mỗi đợt trả; khoản nghi vấn dừng lại.',
    tu_khoa: ['thanh toan trung', 'hoa don trung', 'bat thuong', 'tra trung', 'hoa don gia'],
    do_thi: dung(BD('Trước mỗi đợt trả'),
      ['quet', 'agent', 'Quét hoá đơn trùng số hoặc trùng số tiền', 'Trong cùng nhà cung cấp', 'doc', 'doi_soat_sao_ke'],
      ['bat_thuong', 'agent', 'Phát hiện hoá đơn bất thường', 'Số tiền lạ, tài khoản mới, ngày bất thường', 'de_xuat', 'soan_van_ban'],
      ['xem_xet', 'nguoi', 'Kế toán phải trả xem xét khoản nghi vấn', 'Hỏi lại nhà cung cấp nếu cần', 'doc', null, false],
      ['chan', 'agent', 'Chặn khoản trùng khỏi đợt trả', 'Qua hàng duyệt', 'ghi', 'hang_duyet'],
      ['bao_cao', 'agent', 'Báo cáo kết quả kiểm soát', 'Số khoản chặn, lý do', 'de_xuat', 'soan_van_ban']) }
];

/** Chọn mẫu khớp nhất với câu (đếm từ khoá không dấu). Không khớp → null. */
export function chonMau(cau: string): MauThuVien | null {
  const c = cau.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
  let tot: MauThuVien | null = null, diem = 0;
  for (const m of THU_VIEN) {
    const d = m.tu_khoa.reduce((s, k) => s + (c.includes(k) ? k.split(' ').length : 0), 0);
    if (d > diem) { diem = d; tot = m; }
  }
  return tot;
}
