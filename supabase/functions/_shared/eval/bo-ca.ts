import { duLieuTrong, type CaEval, type DuLieu, type PhanKhuc } from './harness.ts';
import { quetSaoKe } from '../bat-thuong/phat-hien.ts';
import { tuGiaoDich } from '../bat-thuong/nguon.ts';

/**
 * MIMI-P1-004 — bộ ca chấm trợ lý.
 *
 * Đặc tả đặt mục tiêu ≥ 300 ca trên 5 phân khúc. Bộ này CHƯA đủ 300; con số hiện tại nằm ở
 * `SO_CA_MUC_TIEU` và `docs/SO_DIEM_AUDIT.md` ghi rõ tiến độ, để không ai đọc kết quả xanh
 * rồi tưởng P1-004 đã đóng. Mỗi ca thêm vào phải là một câu người thật có thể hỏi, kèm dữ
 * liệu đủ để biết câu trả lời đúng là gì — không thêm ca chỉ để cho đủ số.
 *
 * Dữ liệu dưới đây là fixture: số nhỏ, cộng nhẩm được, nên khi một con số lệch thì biết ngay
 * lệch ở đâu. Không dùng dữ liệu của khách hàng thật.
 */

export const SO_CA_MUC_TIEU = 300;

const HOM_NAY = '2026-09-16';
const KY = { tu: '2026-07-01', den: '2026-09-30', nhan: 'quý 3/2026' };

const goc = () => duLieuTrong(HOM_NAY, KY);

/** Chi 2 triệu (có hoá đơn) + 3 triệu (chưa có), thu 10 triệu. Tháng 9: ra 5 triệu, vào 10 triệu. */
const giaoDich = [
  { id: 'gd1', amount: -2_000_000, type: 'expense', transaction_date: '2026-09-05', merchant_name: 'Công ty A', category: null, counter_account_name: null, payment_reference: null },
  { id: 'gd2', amount: -3_000_000, type: 'expense', transaction_date: '2026-09-12', merchant_name: 'Công ty B', category: null, counter_account_name: null, payment_reference: null },
  { id: 'gd3', amount: 10_000_000, type: 'income', transaction_date: '2026-09-03', merchant_name: 'Khách hàng X', category: null, counter_account_name: null, payment_reference: 'HD001' },
];

const hoaDonVao = [
  { id: 'hv1', total_amount: 2_000_000, issued_at: '2026-09-06', invoice_number: '0001', counterparty_name: 'Công ty A', counterparty_tax_code: '0100000001' },
];

/** `status` chỉ nhận 'pending' | 'overdue' | 'paid' như bảng `invoices` thật (xem InvoicesPage). */
const hoaDonBan = [
  { id: 'hb1', invoice_number: 'HD001', client_name: 'Khách hàng X', total: 8_000_000, issued_date: '2026-07-20', due_date: '2026-08-20', status: 'pending' },
];

const yeuCau = [
  { id: 'yc1', tac_tu_id: 'tt1', so_tien: 1_500_000, ten_nguoi_nhan: 'Nhà in Minh Khai', muc_dich: 'In catalogue', trang_thai: 'cho_duyet', created_at: '2026-09-14T03:00:00Z', so_tien_thuc_chi: null, ly_do: null },
];

const tacTu = [{ id: 'tt1', ten: 'Trợ lý mua hàng', trang_thai: 'hoat_dong' }];
const chinhSach = [{ tac_tu_id: 'tt1', han_muc_thang: 10_000_000 }];

const ketNoiNganHang = [
  { id: 'nh1', bank_name: 'MB Bank', account_number: '0011', status: 'connected', scopes: 'transaction', provider: 'bankhub', last_synced_at: '2026-09-16T01:00:00Z' },
];

/** 30 + 20 = 50 USD trong tháng 9, ngân sách 100 USD. */
const chiPhiAi = [
  { id: 'ai1', nha_cung_cap: 'openai', ngay: '2026-09-04', hang_muc: 'gpt-4o', so_tien_usd: 30, nguon: 'nhap_file' },
  { id: 'ai2', nha_cung_cap: 'anthropic', ngay: '2026-09-11', hang_muc: 'claude', so_tien_usd: 20, nguon: 'nhap_file' },
];

const tokenAi = [
  { id: 'tk1', nha_cung_cap: 'openai', ngay: '2026-09-10', model: 'gpt-4o', token_vao: 1_000_000, token_vao_cache: 0, token_ra: 200_000, so_lan_goi: 40 },
];

const bangGia = [
  { model_id: 'openai/gpt-4o', ten: 'GPT-4o', gia_vao_usd_moi_trieu: 2.5, gia_ra_usd_moi_trieu: 10 },
  { model_id: 'openai/gpt-4o-mini', ten: 'GPT-4o mini', gia_vao_usd_moi_trieu: 0.15, gia_ra_usd_moi_trieu: 0.6 },
];

const chungTuQuet = [{ id: 'cq1', tong_tien: 3_000_000, ngay: '2026-09-12', giao_dich_id: null }];

/** Công ty có sao kê, hoá đơn và chứng từ — dùng cho phần lớn câu hỏi. */
export const D_DAY_DU: DuLieu = {
  ...goc(),
  giaoDich,
  hoaDonVao,
  hoaDonBan,
  yeuCau,
  tacTu,
  chinhSach,
  ketNoiNganHang,
  chiPhiAi,
  nganSachAi: { han_muc_thang_usd: 100, canh_bao_phan_tram: 80 },
  ketNoiAi: [{ nha_cung_cap: 'openai', trang_thai: 'hoat_dong', dong_bo_luc: '2026-09-16T01:00:00Z', loi_cuoi: null }],
  nhapFileAi: ['openai', 'anthropic'],
  tokenAi,
  bangGia,
  bangGiaLuc: '2026-09-15T00:00:00Z',
  chungTuQuet,
};

/** Giống `quetCongTy` ở edge function, nhưng trên fixture: cùng hàm quét, cùng cửa sổ 30 ngày. */
function quet(ds: DuLieu['giaoDich']): DuLieu['batThuong'] {
  const khoan = tuGiaoDich(ds);
  return { canh_bao: quetSaoKe(khoan, HOM_NAY, 30), lich_su_du: true, so_khoan_da_xet: khoan.length };
}
D_DAY_DU.batThuong = quet(D_DAY_DU.giaoDich);

/**
 * TCCN-01 — công ty có hai khoản đáng ngờ trong tháng 9:
 *   - nhà cung cấp quen "Công ty Bao Bì Tân Phú" (3 lần, tài khoản …1111) bỗng nhận vào …9999;
 *   - 45 triệu cho người nhận chưa từng trả, nội dung "tài khoản an toàn theo yêu cầu công an".
 */
const gdLuaDao = [
  ...[['gl1', '2026-06-10'], ['gl2', '2026-07-10'], ['gl3', '2026-08-10']].map(([id, ngay]) => ({
    id, amount: -4_000_000, type: 'expense', transaction_date: ngay, merchant_name: null, category: null,
    counter_account_name: 'Công ty Bao Bì Tân Phú', counter_account_number: '0101011111', payment_reference: 'Thanh toan bao bi',
  })),
  { id: 'gl4', amount: -4_200_000, type: 'expense', transaction_date: '2026-09-09', merchant_name: null, category: null,
    counter_account_name: 'Công ty Bao Bì Tân Phú', counter_account_number: '0909099999', payment_reference: 'Thanh toan bao bi thang 9' },
  { id: 'gl5', amount: -45_000_000, type: 'expense', transaction_date: '2026-09-14', merchant_name: null, category: null,
    counter_account_name: 'Nguyen Van H', counter_account_number: '1234567890', payment_reference: 'chuyen vao tai khoan an toan theo yeu cau cong an' },
];
export const D_LUA_DAO: DuLieu = { ...goc(), giaoDich: gdLuaDao, batThuong: quet(gdLuaDao) };

/** Công ty chưa nối gì: mọi câu trả lời phải nói "chưa có dữ liệu", không được bày số 0 như thật. */
export const D_TRONG: DuLieu = goc();

let dem = 0;
function ca(
  phan_khuc: PhanKhuc,
  cau: string,
  y_dinh: string[],
  thua: Partial<Omit<CaEval, 'id' | 'phan_khuc' | 'cau' | 'y_dinh' | 'du_lieu'>> & { du_lieu?: DuLieu } = {},
): CaEval {
  dem += 1;
  const { du_lieu, ...conLai } = thua;
  return {
    id: `EV-${String(dem).padStart(3, '0')}`,
    phan_khuc,
    cau,
    y_dinh,
    du_lieu: du_lieu ?? D_DAY_DU,
    ...conLai,
  };
}

export const BO_CA: CaEval[] = [
  // ── Hộ kinh doanh ─────────────────────────────────────────────────────────
  ca('ho_kinh_doanh', 'Tháng này tôi chi bao nhiêu tiền rồi?', ['chi_phi_thang']),
  ca('ho_kinh_doanh', 'Khoản chi nào chưa có hoá đơn đầu vào?', ['thieu_chung_tu']),
  ca('ho_kinh_doanh', 'Tôi có phải nộp thuế GTGT không?', ['nghia_vu_thue'], { du_lieu: D_TRONG }),
  ca('ho_kinh_doanh', 'Doanh thu bao nhiêu thì phải khai thuế?', ['nghia_vu_thue'], { du_lieu: D_TRONG }),
  ca('ho_kinh_doanh', 'Tiền vào tiền ra tháng này thế nào?', ['dong_tien']),
  ca('ho_kinh_doanh', 'Có khoản nào bị trả trùng hai lần không?', ['phan_tich_tiet_kiem']),
  ca('ho_kinh_doanh', 'Tôi đã nối ngân hàng nào rồi?', ['ket_noi_ngan_hang']),
  ca('ho_kinh_doanh', 'Trời Sài Gòn hôm nay có mưa không?', []),
  ca('ho_kinh_doanh', 'Kể cho tôi một câu chuyện cười đi', []),

  // ── SME ───────────────────────────────────────────────────────────────────
  ca('sme', 'Có khoản nào đang chờ tôi duyệt không?', ['yeu_cau_cho_duyet'], {
    so: [{ nhan: 'Số tiền', gia_tri: 1_500_000 }],
    de_xuat: ['duyet_yeu_cau'],
  }),
  ca('sme', 'Các agent của tôi đang dùng hết bao nhiêu hạn mức?', ['tinh_hinh_agent']),
  ca('sme', 'Khách nào còn nợ tiền tôi?', ['hoa_don_qua_han'], { so: [{ nhan: 'quá hạn', gia_tri: 8_000_000 }] }),
  ca('sme', 'Tiền về đã khớp với hoá đơn nào chưa?', ['doi_soat']),
  ca('sme', 'Cho tôi báo cáo dòng tiền quý này', ['bao_cao_tai_chinh', 'dong_tien']),
  ca('sme', 'Chi phí AI tháng này bao nhiêu so với ngân sách?', ['chi_phi_ai'], {
    so: [{ nhan: 'Đã chi', gia_tri: 50 }],
  }),
  ca('sme', 'Tôi cắt giảm được ở đâu?', ['phan_tich_tiet_kiem']),
  ca('sme', 'Đội tuyển Việt Nam đá lúc mấy giờ?', []),
  ca('sme', 'Viết cho tôi một bài thơ về mùa thu', []),

  // ── Kế toán nội bộ ────────────────────────────────────────────────────────
  ca('ke_toan', 'Khoản chi nào trong kỳ kê khai còn thiếu chứng từ?', ['thieu_chung_tu']),
  ca('ke_toan', 'Công nợ phải thu hiện bao nhiêu?', ['hoa_don_qua_han']),
  ca('ke_toan', 'Đối soát tiền về 30 ngày qua giúp tôi', ['doi_soat']),
  ca('ke_toan', 'Sao kê đồng bộ lần cuối lúc nào?', ['ket_noi_ngan_hang'], { de_xuat: ['dong_bo_ngan_hang'] }),
  ca('ke_toan', 'Tờ khai nào tôi phải nộp kỳ này?', ['nghia_vu_thue'], { du_lieu: D_TRONG }),
  ca('ke_toan', 'Thuế suất thuế GTGT hiện hành là bao nhiêu?', ['nghia_vu_thue', 'tra_cuu_luat'], { du_lieu: D_TRONG }),
  ca('ke_toan', 'Tổng hợp tiền vào tiền ra sáu tháng gần nhất', ['dong_tien', 'bao_cao_tai_chinh']),
  ca('ke_toan', 'Đã kết nối Tổng cục Thuế chưa?', ['tat_ca_ket_noi']),
  ca('ke_toan', 'Hôm nay là ngày mấy âm lịch?', []),

  // ── Chủ doanh nghiệp ──────────────────────────────────────────────────────
  ca('chu_doanh_nghiep', 'Tháng này công ty thu chi ra sao?', ['dong_tien', 'chi_phi_thang']),
  ca('chu_doanh_nghiep', 'Lợi nhuận tháng này bao nhiêu?', ['bao_cao_tai_chinh']),
  ca('chu_doanh_nghiep', 'Có khoản chi nào cần tôi phê duyệt?', ['yeu_cau_cho_duyet'], { de_xuat: ['duyet_yeu_cau'] }),
  ca('chu_doanh_nghiep', 'Agent nào bị từ chối nhiều nhất?', ['tinh_hinh_agent']),
  ca('chu_doanh_nghiep', 'Tôi đang chi bao nhiêu cho dịch vụ AI?', ['chi_phi_ai']),
  ca('chu_doanh_nghiep', 'Nợ khách hàng chưa thu còn nhiều không?', ['hoa_don_qua_han']),
  ca('chu_doanh_nghiep', 'Mọi kết nối của công ty đang thế nào?', ['tat_ca_ket_noi']),
  ca('chu_doanh_nghiep', 'Nên mua cổ phiếu nào bây giờ?', []),
  ca('chu_doanh_nghiep', 'Giá vàng hôm nay bao nhiêu?', []),

  // ── Người phát triển AI ───────────────────────────────────────────────────
  ca('dev_ai', 'Tháng này tôi dùng bao nhiêu token?', ['token_ai'], {
    so: [{ nhan: 'token vào', gia_tri: 1_000_000 }],
  }),
  ca('dev_ai', 'Có model nào rẻ hơn mà vẫn dùng được không?', ['model_re_hon', 'chi_phi_ai']),
  ca('dev_ai', 'Chi phí OpenAI và Anthropic tháng này chênh nhau bao nhiêu?', ['chi_phi_ai']),
  ca('dev_ai', 'Tỷ lệ cache của tôi thế nào?', ['token_ai']),
  ca('dev_ai', 'Ngân sách AI còn lại bao nhiêu?', ['chi_phi_ai'], { de_xuat: ['dong_bo_chi_phi_ai'] }),
  ca('dev_ai', 'Bảng giá OpenRouter cập nhật lúc nào?', ['chi_phi_ai', 'model_re_hon']),
  ca('dev_ai', 'Tôi tối ưu mô hình thì tiết kiệm được bao nhiêu?', ['model_re_hon', 'chi_phi_ai']),
  ca('dev_ai', 'Giải thích thuật toán Dijkstra cho tôi', []),
  ca('dev_ai', 'Nấu phở bò cần những gì?', []),

  // ── TCCN-01: dấu hiệu bất thường, lừa đảo ─────────────────────────────────
  // Câu trả lời chỉ được nói "dấu hiệu", không được kết luận ai lừa đảo.
  ca('sme', 'Có giao dịch nào bất thường không?', ['giao_dich_bat_thuong'], {
    du_lieu: D_LUA_DAO, so: [{ nhan: 'Khoản mức cao', gia_tri: 2 }], khong_duoc: [/\bla lua dao\b/, /chac chan bi lua/],
  }),
  ca('ho_kinh_doanh', 'Tôi có bị lừa chuyển tiền không?', ['giao_dich_bat_thuong'], {
    du_lieu: D_LUA_DAO, so: [{ nhan: 'Khoản mức cao', gia_tri: 2 }], khong_duoc: [/\bla lua dao\b/, /chac chan bi lua/],
  }),
  ca('chu_doanh_nghiep', 'Nhà cung cấp nào vừa đổi số tài khoản?', ['giao_dich_bat_thuong'], {
    du_lieu: D_LUA_DAO, so: [{ nhan: 'Khoản mức cao', gia_tri: 2 }],
  }),
  ca('ke_toan', 'Tháng này có khoản chi nào khả nghi không?', ['giao_dich_bat_thuong'], { du_lieu: D_LUA_DAO }),
  ca('ke_toan', 'Có giao dịch bất thường nào không?', ['giao_dich_bat_thuong']),
  ca('dev_ai', 'Có ai giả danh công an bắt chuyển tiền không?', ['giao_dich_bat_thuong'], {
    du_lieu: D_LUA_DAO, khong_duoc: [/\bla lua dao\b/],
  }),
];
