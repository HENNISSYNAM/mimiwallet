/**
 * Các loại tài liệu MIMI dựng được — mỗi hàm thuần nhận dữ liệu ĐÃ TÍNH bởi đúng bộ máy của nó
 * (phân tích chênh lệch, sẵn sàng khai thuế, đối soát) và trả về nội dung + nguồn + độ đầy đủ.
 * Không hàm nào tự tính lại một con số: tài liệu và câu trả lời trên màn hình không thể lệch nhau.
 */
import type { DuLieuTaiLieu, KhoiNoiDung, NhanTaiLieu } from './dung.ts';
import type { PhanTichChenhLech } from '../phan-tich/chenh-lech.ts';
import type { SanSangThue } from '../luat/san-sang-thue.ts';
import type { MocThue } from '../luat/lich-thue.ts';

export type LoaiTaiLieu =
  | 'invoice' | 'receipt' | 'bank_statement' | 'tax_form' | 'authority_notice' | 'penalty_decision'
  | 'explanation_letter' | 'administrative_letter' | 'registration_document' | 'submission_receipt'
  | 'payment_evidence' | 'audit_pack' | 'reconciliation_report' | 'financial_review_memo' | 'cashflow_report'
  | 'tax_readiness_pack' | 'other';

export type DoDayGoi = 'COMPLETE' | 'INCOMPLETE' | 'NEEDS_REVIEW';

export interface BanDung {
  loai: LoaiTaiLieu;
  tieu_de: string;
  mo_ta: string;
  nhan: NhanTaiLieu;
  ky: string | null;
  noi_dung: DuLieuTaiLieu;
  nguon: string[];
  /** id bản ghi đứng sau tài liệu (giao dịch, hoá đơn…) — truy ngược được. */
  bang_chung: { loai: string; id: string[] }[];
  do_day: DoDayGoi | null;
}

export interface CongTyTL { ten: string | null; mst?: string | null; dia_chi?: string | null }

const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} ₫`;
const TEN_NHAN_DL = { su_that: 'Sự thật', suy_luan: 'Suy luận', chua_biet: 'Chưa biết' } as const;
const TIN_CAY = { cao: 'Cao', trung_binh: 'Trung bình', thap: 'Thấp' } as const;

/** Mục 13: Financial Review Memo — dựng từ CHÍNH kết quả phân tích chênh lệch. */
export function memoTaiChinh(pt: PhanTichChenhLech, ct: CongTyTL, homNay: string): BanDung {
  const nd: KhoiNoiDung[] = [
    { loai: 'ghi_chu', chu: 'Đây là phân tích quản trị từ sao kê ngân hàng và hoá đơn lập trong MIMI — KHÔNG phải báo cáo tài chính, không thay sổ kế toán.' },
    { loai: 'muc', tieu_de: '1. Tóm tắt' },
    { loai: 'doan', chu: `So ${pt.ky_nay.nhan} với ${pt.ky_truoc.nhan}: hoá đơn bán ra ${vnd(pt.truoc.hoa_don)} → ${vnd(pt.nay.hoa_don)}; dòng tiền ròng qua ngân hàng ${vnd(pt.truoc.rong)} → ${vnd(pt.nay.rong)}. Độ tin cậy: ${TIN_CAY[pt.do_tin_cay]}.` },
    { loai: 'muc', tieu_de: '2. Số chính' },
    { loai: 'bang', cot: ['Chỉ số', pt.ky_truoc.nhan, pt.ky_nay.nhan], can_phai: [1, 2], dong: [
      ['Hoá đơn bán ra (₫)', pt.truoc.hoa_don, pt.nay.hoa_don],
      ['Tiền vào ngân hàng (₫)', pt.truoc.tien_vao, pt.nay.tien_vao],
      ['Tiền ra ngân hàng (₫)', pt.truoc.tien_ra, pt.nay.tien_ra],
      ['Dòng tiền ròng (₫)', pt.truoc.rong, pt.nay.rong],
      ['Hoá đơn chưa thu (₫)', pt.truoc.chua_thu, pt.nay.chua_thu],
    ] },
    { loai: 'muc', tieu_de: '3. Thay đổi lớn và nguyên nhân' },
    { loai: 'bang', cot: ['Loại', 'Nội dung'], dong: pt.dong_luc.map((d) => [TEN_NHAN_DL[d.nhan], d.cau]) },
    { loai: 'muc', tieu_de: '4. Ngoại lệ và rủi ro' },
    { loai: 'danh_sach', muc: pt.rui_ro.length ? pt.rui_ro : ['Không thấy ngoại lệ từ dữ liệu hiện có.'] },
    { loai: 'muc', tieu_de: '5. Cần xem lại' },
    { loai: 'danh_sach', muc: pt.can_xem_lai.length ? pt.can_xem_lai : ['Không có.'] },
    { loai: 'muc', tieu_de: '6. Việc cần làm' },
    { loai: 'danh_sach', muc: pt.viec_tiep },
    { loai: 'muc', tieu_de: '7. Giả định, phương pháp, độ phủ' },
    { loai: 'danh_sach', muc: [...pt.gia_dinh, `Phương pháp: ${pt.phuong_phap}`, `Độ phủ: ${pt.do_phu}`] },
  ];
  const nguon = [...pt.dau_vao];
  return {
    loai: 'financial_review_memo', tieu_de: `Báo cáo phân tích tài chính ${pt.ky_nay.nhan}`,
    mo_ta: 'Phân tích quản trị: số chính, thay đổi, ngoại lệ, việc cần làm — kèm nguồn từng số.',
    nhan: 'mimi_generated', ky: pt.ky_nay.tu.slice(0, 7),
    noi_dung: { nhan: 'mimi_generated', tieu_de: 'Báo cáo phân tích tài chính', cong_ty: ct, ngay: homNay, noi_dung: nd, nguon },
    nguon,
    bang_chung: [
      { loai: 'giao_dich', id: [...pt.bang_chung.giao_dich_nay, ...pt.bang_chung.giao_dich_truoc] },
      { loai: 'hoa_don_ban', id: [...pt.bang_chung.hoa_don_nay, ...pt.bang_chung.hoa_don_truoc] },
    ].filter((b) => b.id.length),
    do_day: null,
  };
}

const TEN_TRANG_THAI_SS = { san_sang: 'Sẵn sàng', thieu_du_lieu: 'Còn thiếu dữ liệu', can_xac_minh: 'Cần xác minh', khong_co_viec: 'Không có việc thuế có hạn' } as const;

/** Gói sẵn sàng khai thuế — từ CHÍNH đối tượng `SanSangThue` mà Nhắc thuế và trợ lý hiện. */
export function goiSanSangThue(ss: SanSangThue, lich: MocThue[], ct: CongTyTL, homNay: string): BanDung {
  const do_day: DoDayGoi = ss.trang_thai === 'san_sang' ? 'COMPLETE' : ss.trang_thai === 'can_xac_minh' ? 'NEEDS_REVIEW' : 'INCOMPLETE';
  const nd: KhoiNoiDung[] = [
    { loai: 'muc', tieu_de: '1. Việc thuế kế tiếp' },
    { loai: 'doan', chu: ss.ten_viec ? `${ss.ten_viec} — hạn ${ss.han ? ss.han.split('-').reverse().join('/') : 'chưa xác định'}${ss.con_lai !== null ? `, còn ${ss.con_lai} ngày` : ''}. Trạng thái: ${TEN_TRANG_THAI_SS[ss.trang_thai]}.` : 'Chưa có việc thuế nào có hạn chắc chắn.' },
    { loai: 'muc', tieu_de: '2. Doanh thu năm nay' },
    { loai: 'bang', cot: ['Khoản', 'Số tiền (₫)'], can_phai: [1], dong: [
      ['Doanh thu ước tính (tiền vào trừ khoản đã xác nhận không phải doanh thu)', ss.doanh_thu_biet],
      ['Đã xác nhận là doanh thu', ss.doanh_thu_da_phan_loai],
      [`Chưa phân loại (${ss.so_khoan_chua_phan_loai} khoản — đang tính như doanh thu)`, ss.doanh_thu_chua_phan_loai],
    ] },
    { loai: 'muc', tieu_de: '3. Giấy tờ cần có' },
    { loai: 'danh_sach', muc: ss.giay_to_can.length ? ss.giay_to_can : ['—'] },
    { loai: 'muc', tieu_de: '4. Còn thiếu' },
    { loai: 'danh_sach', muc: [...ss.giay_to_thieu, ...ss.du_kien_thieu.map((c) => `Dữ kiện: ${c}`)].length ? [...ss.giay_to_thieu, ...ss.du_kien_thieu.map((c) => `Dữ kiện: ${c}`)] : ['Không thiếu gì MIMI biết.'] },
    { loai: 'muc', tieu_de: '5. Việc cần làm' },
    { loai: 'danh_sach', muc: ss.viec_tiep },
    { loai: 'muc', tieu_de: '6. Lịch thuế' },
    { loai: 'bang', cot: ['Việc', 'Hạn', 'Trạng thái'], dong: lich.map((m) => [m.ten, m.han ? m.han.split('-').reverse().join('/') : 'Chưa xác định', m.trang_thai === 'phai_lam' ? 'Phải làm' : m.trang_thai === 'can_xac_minh' ? 'Cần xác minh' : 'Không áp dụng']) },
  ];
  return {
    loai: 'tax_readiness_pack', tieu_de: `Gói sẵn sàng khai thuế${ss.ten_viec ? ` — ${ss.ten_viec}` : ''}`.slice(0, 200),
    mo_ta: `Độ đầy đủ: ${do_day}. Độ tin cậy: ${TIN_CAY[ss.do_tin_cay]}.`,
    nhan: 'mimi_generated', ky: ss.ky,
    noi_dung: { nhan: 'mimi_generated', tieu_de: 'Gói sẵn sàng khai thuế', cong_ty: ct, ngay: homNay, noi_dung: nd, nguon: ss.nguon },
    nguon: ss.nguon, bang_chung: [], do_day,
  };
}

export interface DuLieuBangChung {
  noi_dung_yeu_cau: string;
  ky: { tu: string; den: string };
  giao_dich_vao: { id: string; so_tien: number }[];
  da_phan_loai: number;
  chua_phan_loai: number;
  hoa_don_khop_chac: { giao_dich: string; hoa_don: string; so_hoa_don: string; so_tien: number }[];
  hoa_don_can_xem: number;
  co_sao_ke: boolean;
}

/** Mục 22: gói bằng chứng trả lời yêu cầu của cơ quan thuế. Nói thẳng đủ / thiếu / cần xem lại. */
export function goiBangChung(x: DuLieuBangChung, ct: CongTyTL, homNay: string): BanDung {
  const thieu: string[] = [];
  if (!x.co_sao_ke) thieu.push('Sao kê ngân hàng của kỳ được hỏi');
  if (x.chua_phan_loai > 0) thieu.push(`${x.chua_phan_loai} khoản tiền vào chưa phân loại`);
  if (x.hoa_don_can_xem > 0) thieu.push(`${x.hoa_don_can_xem} cặp tiền về ↔ hoá đơn cần bạn xác nhận`);
  const do_day: DoDayGoi = !x.co_sao_ke || x.chua_phan_loai > 0 ? 'INCOMPLETE' : x.hoa_don_can_xem > 0 ? 'NEEDS_REVIEW' : 'COMPLETE';
  const tong = x.giao_dich_vao.reduce((s, t) => s + t.so_tien, 0);
  const nd: KhoiNoiDung[] = [
    { loai: 'muc', tieu_de: '1. Nội dung cơ quan thuế yêu cầu' },
    { loai: 'doan', chu: x.noi_dung_yeu_cau },
    { loai: 'muc', tieu_de: `2. Tiền vào ngân hàng ${x.ky.tu.split('-').reverse().join('/')}–${x.ky.den.split('-').reverse().join('/')}` },
    { loai: 'bang', cot: ['Khoản', 'Giá trị'], can_phai: [1], dong: [
      ['Số khoản tiền vào', x.giao_dich_vao.length], ['Tổng tiền vào (₫)', tong],
      ['Khoản đã phân loại', x.da_phan_loai], ['Khoản chưa phân loại', x.chua_phan_loai],
    ] },
    { loai: 'muc', tieu_de: '3. Tiền về khớp chắc với hoá đơn' },
    x.hoa_don_khop_chac.length
      ? { loai: 'bang', cot: ['Số hoá đơn', 'Số tiền (₫)'], can_phai: [1], dong: x.hoa_don_khop_chac.map((c) => [c.so_hoa_don, c.so_tien]) }
      : { loai: 'doan', chu: 'Chưa có cặp nào khớp chắc (nội dung chuyển khoản ghi số hoá đơn).' },
    { loai: 'muc', tieu_de: '4. Còn thiếu trước khi gửi' },
    { loai: 'danh_sach', muc: thieu.length ? thieu : ['Không thiếu gì MIMI kiểm được. Bạn vẫn cần đối chiếu từng nội dung trong thông báo.'] },
  ];
  const nguon = ['Sao kê ngân hàng đã kết nối, đã bỏ dữ liệu thử', 'Phân loại tiền vào người dùng đã xác nhận', 'Hoá đơn bán ra lập trong MIMI'];
  return {
    loai: 'audit_pack', tieu_de: 'Gói bằng chứng trả lời cơ quan thuế', mo_ta: `Độ đầy đủ: ${do_day}.`,
    nhan: 'draft_for_review', ky: x.ky.tu.slice(0, 7),
    noi_dung: { nhan: 'draft_for_review', tieu_de: 'Gói bằng chứng', cong_ty: ct, ngay: homNay, noi_dung: nd, nguon },
    nguon,
    bang_chung: [
      { loai: 'giao_dich', id: x.giao_dich_vao.map((t) => t.id) },
      { loai: 'hoa_don_ban', id: x.hoa_don_khop_chac.map((c) => c.hoa_don) },
    ].filter((b) => b.id.length),
    do_day,
  };
}

/**
 * Công văn giải trình — BẢN NHÁP. Không điền căn cứ pháp lý (kho MIMI chưa có văn bản đã đối chiếu
 * về giải trình, xem `giay-to/loai.ts`), không điền cơ quan nhận khi người dùng chưa cho biết.
 */
export function congVanGiaiTrinh(o: { noi_dung_yeu_cau: string; ngay_nhan_thong_bao: string; han_tra_loi?: string | null; co_quan?: string | null }, ct: CongTyTL, homNay: string): BanDung {
  const nd: KhoiNoiDung[] = [
    { loai: 'doan', chu: `${ct.ten ?? '[Tên người nộp thuế]'}${ct.mst ? `, mã số thuế ${ct.mst}` : ''}, nhận được thông báo của cơ quan thuế ngày ${o.ngay_nhan_thong_bao.split('-').reverse().join('/')} đề nghị giải trình về nội dung sau:` },
    { loai: 'doan', chu: o.noi_dung_yeu_cau },
    { loai: 'doan', chu: 'Chúng tôi xin giải trình như sau:' },
    { loai: 'danh_sach', muc: ['[Giải trình nội dung 1 — số liệu phải khớp chứng từ gửi kèm]', '[Giải trình nội dung 2]'] },
    { loai: 'doan', chu: 'Hồ sơ gửi kèm: [liệt kê chứng từ — xem Gói bằng chứng MIMI đã chuẩn bị].' },
    { loai: 'doan', chu: 'Chúng tôi cam kết số liệu nêu trên là đúng và chịu trách nhiệm về nội dung giải trình.' },
    { loai: 'ghi_chu', chu: 'MIMI không điền căn cứ pháp lý: kho văn bản của MIMI chưa có văn bản đã đối chiếu về việc giải trình. Nếu cần, kế toán hoặc bạn tự điền.' },
  ];
  return {
    loai: 'explanation_letter', tieu_de: 'Công văn giải trình (bản nháp)', mo_ta: 'Bản nháp để bạn và kế toán điền phần giải trình, rồi ký và tự gửi.',
    nhan: 'draft_for_review', ky: null,
    noi_dung: { nhan: 'draft_for_review', tieu_de: 'Công văn giải trình', cong_ty: ct, ngay: homNay, kinh_gui: o.co_quan ?? '[Cơ quan thuế quản lý trực tiếp]', noi_dung: nd, co_cho_ky: true, nguon: [`Thông báo của cơ quan thuế ngày ${o.ngay_nhan_thong_bao.split('-').reverse().join('/')} (người dùng nhập)`] },
    nguon: ['Nội dung yêu cầu do người dùng nhập từ thông báo'], bang_chung: [], do_day: null,
  };
}
