/**
 * Các năng lực của MIMI Assistant — phần TÍNH, không đọc CSDL, không gọi mạng.
 *
 * Mỗi năng lực nhận `DuLieu` (edge function `tro-ly` đọc sẵn, chỉ dữ liệu của công ty
 * đang dùng, đã bỏ giao dịch thử) và trả `KetQuaNangLuc`: một câu tóm tắt bằng tiền và
 * việc, vài thẻ số liệu, đề xuất hành động, nguồn dữ liệu, trang chi tiết.
 *
 * HAI QUY TẮC:
 *  1. Không có dữ liệu thì nói không có và nói cách có — không trả số 0 trông như thật.
 *  2. Đề xuất chỉ nhắm vào thứ có thật trong dữ liệu (mã yêu cầu, agent) và chỉ gồm việc
 *     đã có backend. Việc chạm tiền luôn qua hộp xác nhận ở giao diện.
 */
import type { BangChung, DeXuat, DoDayNguon, KetNoiHienThi, KetQuaNangLuc, LoaiBangChung, NguonDuLieu, NhomNangLuc, O, PhanTichNhanh, The, TrangChiTiet, ViecHomNay } from './kieu.ts';
import { chieuTien, doLonTien } from '../tien/chieu-tien.ts';
import { ghepChungTu, LECH_TIEN, type HoaDonVao, type KhoanChi } from '../chung-tu/khop-chung-tu.ts';
import { CAN_DO_TRUOC_KHI_DOI, chuanHoaTenModel, deXuatModelReHon, type GiaModel } from '../chi-phi-ai/bang-gia.ts';
import { CAN_CU, NGUONG_DOANH_THU as NGUONG_THUE, PHIEN_BAN_HE_LUAT, suyLuan as suyLuanThue, TEN_NGUON_DOANH_THU, TEN_NHOM_NGANH, type SuKienThue } from '../luat/he-luat.ts';
import { HOAT_DONG } from '../doanh-thu/theo-hoat-dong.ts';
import { cat, type ThuTucThue } from './thu-tuc.ts';
import type { DoanLuat } from '../luat/nguon-luat.ts';
import { TU_DIEN_CHI_SO } from '../chi-so/tu-dien.ts';
import type { CanhBao, MaDauHieu } from '../bat-thuong/phat-hien.ts';
import { duongDanGiayTo, MO_TA_GIAY_TO, type LoaiGiayTo } from '../giay-to/loai.ts';
import { ghepTienVe, type Cap } from '../doi-soat/cham-diem.ts';
import { goiYTienVao, TEN_LOAI_TIEN_VAO, type GoiYTienVao, type LoaiTienVao } from '../phan-loai/tien-vao.ts';
import { mocKeTiep, TEN_LOAI_MOC, type MocThue } from '../luat/lich-thue.ts';
import type { LichCongTy } from '../luat/doc-lich-thue.ts';
import type { HanhTrinhDay } from '../hanh-trinh/luu.ts';
import { buocTiepTheo, cauHoiTiepTheo, tinhBuoc } from '../hanh-trinh/dong-co.ts';
import { MAU_HANH_TRINH, type LoaiHanhTrinh } from '../hanh-trinh/mau.ts';
import { phanTichChenhLech } from '../phan-tich/chenh-lech.ts';

// ── Dữ liệu đầu vào ──────────────────────────────────────────────────────────

export interface GiaoDichTL {
  id: string;
  amount: number;
  type: string | null;
  transaction_date: string;
  merchant_name: string | null;
  category: string | null;
  counter_account_name: string | null;
  payment_reference: string | null;
}
export interface HoaDonVaoTL {
  id: string;
  total_amount: number;
  issued_at: string | null;
  invoice_number: string | null;
  counterparty_name: string | null;
  counterparty_tax_code: string | null;
}
export interface HoaDonBanTL {
  id: string;
  invoice_number: string;
  client_name: string;
  total: number;
  issued_date: string;
  due_date: string;
  status: string;
}
export interface YeuCauTL {
  id: string;
  tac_tu_id: string;
  so_tien: number;
  ten_nguoi_nhan: string | null;
  muc_dich: string;
  trang_thai: string;
  created_at: string;
  so_tien_thuc_chi: number | null;
  ly_do: { ma?: string; cau?: string }[] | null;
}
export interface TacTuTL { id: string; ten: string; trang_thai: string }
export interface ChinhSachTL { tac_tu_id: string; han_muc_thang: number }
export interface KetNoiNganHangTL {
  id: string;
  bank_name: string | null;
  account_number: string | null;
  status: string;
  scopes: string | null;
  provider: string | null;
  last_synced_at: string | null;
}
export interface ChiPhiAiTL { id: string; nha_cung_cap: string; ngay: string; hang_muc: string; so_tien_usd: number; nguon: string }
export interface KetNoiAiTL { nha_cung_cap: string; trang_thai: string; dong_bo_luc: string | null; loi_cuoi: string | null }
export interface TokenAiTL {
  id: string;
  nha_cung_cap: string;
  ngay: string;
  model: string;
  token_vao: number;
  token_vao_cache: number;
  token_ra: number;
  so_lan_goi: number;
}
export interface ChungTuQuetTL { id: string; tong_tien: number; ngay: string | null; giao_dich_id: string | null }

export interface DuLieu {
  /** YYYY-MM-DD theo giờ Việt Nam. */
  homNay: string;
  /** Kỳ kê khai đang tới hạn — cùng kỳ với màn Chứng từ chi phí. */
  kyChungTu: { tu: string; den: string; nhan: string };
  giaoDich: GiaoDichTL[];
  hoaDonVao: HoaDonVaoTL[];
  hoaDonBan: HoaDonBanTL[];
  yeuCau: YeuCauTL[];
  tacTu: TacTuTL[];
  chinhSach: ChinhSachTL[];
  ketNoiNganHang: KetNoiNganHangTL[];
  chiPhiAi: ChiPhiAiTL[];
  nganSachAi: { han_muc_thang_usd: number; canh_bao_phan_tram: number } | null;
  ketNoiAi: KetNoiAiTL[];
  /** Nhà cung cấp đã từng được nhập file chi phí. */
  nhapFileAi: string[];
  tokenAi: TokenAiTL[];
  bangGia: GiaModel[];
  bangGiaLuc: string | null;
  chungTuQuet: ChungTuQuetTL[];
  /**
   * Hồ sơ thuế + doanh thu đã chọn nguồn, cho hệ luật thuế. `canCuDaKiem` là kết quả đối chiếu
   * từng câu trích với kho Công báo (`luat/doc-can-cu.ts`) — năng lực chỉ nói "đã đối chiếu"
   * khi kho xác nhận.
   */
  thue: {
    suKien: SuKienThue;
    canhBao: string[];
    canCuDaKiem: Record<string, boolean>;
    /** MIMI-P0-003: căn cứ thuộc văn bản kho ghi nhận đã hết hiệu lực → nhãn hiệu lực. */
    canCuHetHieuLuc?: Record<string, string>;
    /** Không đọc được bảng hiệu lực. */
    chuaKiemHieuLuc?: boolean;
  } | null;
  /** MIMI-P0-002: độ đầy đủ của từng nguồn đã đọc (edge function điền; test để trống). */
  doDay: Partial<Record<NguonCan, DoDayNguon>>;
  /** Đoạn luật kho tìm được cho câu hỏi. null = chưa tra được (lỗi), khác với [] = không có. */
  /** Thủ tục hành chính thuế khớp câu hỏi (bảng `thu_tuc_thue`). null = chưa tra được. */
  thuTuc?: ThuTucThue[] | null;
  khoLuat: DoanLuat[] | null;
  /** MIMI-P0-003: văn bản kho tìm thấy nhưng đã hết hiệu lực tại ngày hỏi — đã bị loại khỏi `khoLuat`. */
  khoLuatDaLoai: { van_ban: string; nhan: string }[];
  /** Không đọc được bảng hiệu lực: nhãn từng đoạn là "chưa kiểm được". */
  khoLuatChuaKiemHieuLuc: boolean;
  /**
   * TCCN-01: kết quả quét dấu hiệu bất thường 30 ngày, do edge function tính bằng CHÍNH hàm mà
   * màn Tổng quan dùng (`bat-thuong/doc-db.ts`) — để trợ lý và Tổng quan không bao giờ báo hai
   * con số khác nhau. null = chưa đọc.
   */
  batThuong: { canh_bao: CanhBao[]; lich_su_du: boolean; so_khoan_da_xet: number } | null;
  /**
   * Lịch thuế CỦA CÔNG TY NÀY — cùng hàm với Tổng quan, Nhắc thuế và thông báo
   * (`luat/doc-lich-thue.ts`). undefined = chưa đọc; null = đọc lỗi.
   */
  lichThue?: LichCongTy | null;
  /** Câu hỏi nguyên văn — cho năng lực cần đọc một con số trong câu ("nêu 3 việc"). */
  cauHoi?: string;
  /**
   * Prompt 4: hành trình câu hỏi này vừa mở (hoặc mở tiếp). `luu: false` khi vai trò không được mở
   * việc — khi đó chỉ là bản xem trước tính từ mẫu, không có id.
   */
  hanhTrinh?: { loai: LoaiHanhTrinh; luu: boolean; moi: boolean; ht: HanhTrinhDay | null } | null;
  /** Các việc đang mở của công ty — cho bộ ưu tiên và ngữ cảnh làm việc. */
  hanhTrinhMo?: HanhTrinhDay[];
}

export type NguonCan =
  | 'giao_dich' | 'hoa_don_vao' | 'hoa_don_ban' | 'yeu_cau' | 'ket_noi_ngan_hang'
  | 'chi_phi_ai' | 'token_ai' | 'bang_gia' | 'chung_tu_quet' | 'thue' | 'kho_luat' | 'bat_thuong' | 'thu_tuc' | 'lich_thue' | 'hanh_trinh';

export function duLieuTrong(homNay: string, kyChungTu: DuLieu['kyChungTu']): DuLieu {
  return {
    homNay, kyChungTu,
    giaoDich: [], hoaDonVao: [], hoaDonBan: [], yeuCau: [], tacTu: [], chinhSach: [], ketNoiNganHang: [],
    chiPhiAi: [], nganSachAi: null, ketNoiAi: [], nhapFileAi: [], tokenAi: [], bangGia: [], bangGiaLuc: null, chungTuQuet: [],
    thue: null,
    doDay: {},
    khoLuat: [],
    khoLuatDaLoai: [],
    khoLuatChuaKiemHieuLuc: false,
    batThuong: null,
  };
}

// ── Định dạng và ngày tháng ──────────────────────────────────────────────────

export const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} ₫`;
export const usd = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const soToken = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(1).replace('.', ',')} tỷ` : n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} triệu` : new Intl.NumberFormat('vi-VN').format(n);
export const ngayVN = (ymd: string) => ymd.slice(0, 10).split('-').reverse().join('/');
const phanTram = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);
const pad = (n: number) => String(n).padStart(2, '0');

export function congNgay(ymd: string, n: number): string {
  const d = new Date(`${ymd.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const dauThang = (ymd: string) => `${ymd.slice(0, 7)}-01`;
function cungNgayThangTruoc(ymd: string): string {
  const [y, m, dd] = ymd.split('-').map(Number);
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  const cuoi = new Date(Date.UTC(py, pm, 0)).getUTCDate();
  return `${py}-${pad(pm)}-${pad(Math.min(dd, cuoi))}`;
}
const soNgayTrongThang = (ymd: string) => {
  const [y, m] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};
const soNgayGiua = (a: string, b: string) =>
  Math.round((new Date(`${b.slice(0, 10)}T00:00:00Z`).getTime() - new Date(`${a.slice(0, 10)}T00:00:00Z`).getTime()) / 86_400_000);

const tenNguoiNhan = (t: GiaoDichTL) => (t.counter_account_name || t.merchant_name || '').trim() || 'Không rõ người nhận';
const cuoiSo = (s: string | null) => (s ? `•••${s.slice(-4)}` : '—');

// ── Nguồn và trang ───────────────────────────────────────────────────────────

const N = {
  giaoDich: { ten: 'Sao kê ngân hàng', mo_ta: 'Giao dịch đồng bộ từ ngân hàng đã liên kết, đã bỏ dữ liệu thử.' },
  hoaDonVao: { ten: 'Hoá đơn điện tử đầu vào', mo_ta: 'Lấy từ cổng Tổng cục Thuế.' },
  hoaDonBan: { ten: 'Hoá đơn bán ra', mo_ta: 'Hoá đơn bạn lập trong MIMI.' },
  yeuCau: { ten: 'Yêu cầu chi', mo_ta: 'Khoản agent hoặc bạn xin chi, ghi ở máy chủ MIMI.' },
  ketNoi: { ten: 'Trạng thái kết nối', mo_ta: 'Kết nối ngân hàng, thuế và nhà cung cấp AI của công ty.' },
  chiPhiAi: { ten: 'Chi phí AI', mo_ta: 'Số nhà cung cấp tính (USD), từ kết nối tự động hoặc file bạn tải lên.' },
  tokenAi: { ten: 'Số token AI', mo_ta: 'Từ báo cáo sử dụng của Anthropic, OpenAI hoặc OpenRouter.' },
  chungTuQuet: { ten: 'Chứng từ đã quét', mo_ta: 'Chứng từ bạn chụp và xác nhận trong MIMI Assistant.' },
  khoLuat: { ten: 'Kho văn bản Công báo', mo_ta: 'Luật, Nghị định, Thông tư về thuế MIMI đã nạp từ congbao.chinhphu.vn, đối chiếu nguyên văn từng câu trích.' },
  hanhTrinh: { ten: 'Việc đang làm của công ty', mo_ta: 'Các bước, dữ kiện bạn đã trả lời và thủ tục khớp — lưu ở máy chủ MIMI.' },
  lichThue: { ten: 'Lịch thuế của công ty', mo_ta: 'Suy từ hồ sơ thuế, trạng thái mã số thuế và doanh thu thật của công ty theo Nghị định 252/2026 — cùng lịch với màn Nhắc thuế.' },
  batThuong: { ten: 'Luật cảnh báo bất thường', mo_ta: 'So từng khoản chi 30 ngày qua với lịch sử chi 180 ngày và danh sách người nhận được phép của công ty. Luật cố định, không phải mô hình học máy.' },
} satisfies Record<string, NguonDuLieu>;

const bangGiaNguon = (luc: string | null): NguonDuLieu => ({
  ten: 'Bảng giá OpenRouter',
  mo_ta: luc ? `Giá niêm yết của OpenRouter, lấy ngày ${ngayVN(luc)}.` : 'Giá niêm yết của OpenRouter.',
});

const T = {
  yeuCau: { nhan: 'Mở danh sách yêu cầu chi', duong_dan: '/dashboard/tac-tu?tab=yeu-cau' },
  agent: { nhan: 'Mở Kiểm soát agent', duong_dan: '/dashboard/tac-tu?tab=agents' },
  chinhSach: { nhan: 'Mở Chính sách chi', duong_dan: '/dashboard/chinh-sach' },
  giaoDich: { nhan: 'Xem giao dịch', duong_dan: '/dashboard' },
  chungTu: { nhan: 'Mở Chứng từ chi phí', duong_dan: '/dashboard/chung-tu' },
  hoaDon: { nhan: 'Mở Hoá đơn', duong_dan: '/dashboard/invoices' },
  ketNoi: { nhan: 'Mở Kết nối ngân hàng & thuế', duong_dan: '/dashboard/fintech' },
  chiPhiAi: { nhan: 'Mở Chi phí AI', duong_dan: '/dashboard/chi-phi-ai' },
  baoCao: { nhan: 'Mở Báo cáo', duong_dan: '/dashboard/reports' },
  toKhai: { nhan: 'Mở Tờ khai thuế', duong_dan: '/dashboard/to-khai' },
  nhacThue: { nhan: 'Mở Nhắc thuế', duong_dan: '/dashboard/nhac-thue' },
  viecCanLam: { nhan: 'Mở Việc cần làm', duong_dan: '/dashboard/viec-can-lam' },
  taiLieu: { nhan: 'Mở Tài liệu & Chứng từ', duong_dan: '/dashboard/tai-lieu' },
} satisfies Record<string, TrangChiTiet>;

function kq(
  nang_luc: string,
  nhom: NhomNangLuc,
  tom_tat: string,
  p: { the?: The[]; de_xuat?: DeXuat[]; nguon?: NguonDuLieu[]; trang?: TrangChiTiet[] } = {},
): KetQuaNangLuc {
  return { nang_luc, nhom, tom_tat, the: p.the ?? [], de_xuat: p.de_xuat ?? [], nguon: p.nguon ?? [], trang: p.trang ?? [] };
}

/**
 * MIMI-P1-001 — bằng chứng cho một con số: id của đúng những bản ghi đã cộng vào nó.
 *
 * Danh sách id bị cắt ở `SO_ID_BANG_CHUNG` cho khỏi phình câu trả lời, nhưng `so_ban_ghi` luôn là
 * số thật, nên người đọc biết mình đang xem một phần. Mã băm do edge function gắn sau (`themMaBam`).
 */
export const SO_ID_BANG_CHUNG = 200;

export function bangChung(loai: LoaiBangChung, ds: readonly { id: string }[]): BangChung[] {
  if (!ds.length) return [];
  return [{ loai, id: ds.slice(0, SO_ID_BANG_CHUNG).map((x) => String(x.id)), so_ban_ghi: ds.length }];
}

/** Gộp nhiều nguồn bằng chứng cho một con số (ví dụ: khoản chi + hoá đơn đã khớp). */
export const gopBangChung = (...ds: BangChung[][]): BangChung[] => ds.flat().filter((b) => b.id.length);

const CHUA_CO_SAO_KE =
  'Chưa có giao dịch ngân hàng nào. Liên kết ngân hàng để MIMI đọc sao kê — không cần nhập tay.';

// ── Trợ lý: kiểm soát agent ──────────────────────────────────────────────────

const tenAgent = (d: DuLieu) => {
  const m = new Map(d.tacTu.map((t) => [t.id, t.ten]));
  return (id: string) => m.get(id) ?? 'Agent đã xoá';
};

export function yeuCauChoDuyet(d: DuLieu): KetQuaNangLuc {
  const ten = tenAgent(d);
  const cho = d.yeuCau.filter((y) => y.trang_thai === 'cho_duyet').sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (!cho.length) {
    return kq('yeu_cau_cho_duyet', 'tro_ly', 'Không có khoản nào đang chờ bạn duyệt.', { nguon: [N.yeuCau], trang: [T.yeuCau] });
  }
  const tong = cho.reduce((s, y) => s + y.so_tien, 0);
  const nguoi = (y: YeuCauTL) => y.ten_nguoi_nhan || 'người nhận chưa rõ tên';
  const de_xuat: DeXuat[] = cho.slice(0, 5).flatMap((y): DeXuat[] => {
    const lyDo = (y.ly_do ?? []).map((l) => l.cau).filter(Boolean).slice(0, 2).join(' ');
    return [
      {
        khoa: `duyet:${y.id}`,
        loai: 'duyet_yeu_cau' as const,
        nhan: `Duyệt ${vnd(y.so_tien)}`,
        mo_ta: `Cho phép trả ${vnd(y.so_tien)} cho ${nguoi(y)} — ${y.muc_dich}.${lyDo ? ` Lý do cần bạn duyệt: ${lyDo}` : ''} MIMI không chuyển tiền: sau khi duyệt, người có quyền trả vẫn trả bằng ứng dụng ngân hàng.`,
        tham_so: { yeu_cau_id: y.id },
      },
      {
        khoa: `tu_choi:${y.id}`,
        loai: 'tu_choi_yeu_cau' as const,
        nhan: 'Từ chối',
        mo_ta: `Từ chối khoản ${vnd(y.so_tien)} cho ${nguoi(y)}. Agent nhận lý do "Từ chối qua MIMI Assistant."`,
        tham_so: { yeu_cau_id: y.id, ghi_chu: 'Từ chối qua MIMI Assistant.' },
      },
    ];
  });
  const cu = cho[0];
  return kq(
    'yeu_cau_cho_duyet',
    'tro_ly',
    `Có ${cho.length} khoản đang chờ bạn duyệt, tổng ${vnd(tong)}. Khoản chờ lâu nhất gửi ngày ${ngayVN(cu.created_at)}: ${vnd(cu.so_tien)} cho ${nguoi(cu)}.`,
    {
      the: [{
        loai: 'bang',
        tieu_de: 'Khoản đang chờ bạn duyệt',
        cot: [
          { nhan: 'Agent', don_vi: 'chu' }, { nhan: 'Người nhận', don_vi: 'chu' }, { nhan: 'Mục đích', don_vi: 'chu' },
          { nhan: 'Số tiền', don_vi: 'vnd' }, { nhan: 'Gửi ngày', don_vi: 'ngay' },
        ],
        dong: cho.slice(0, 8).map((y) => [ten(y.tac_tu_id), nguoi(y), y.muc_dich, y.so_tien, y.created_at.slice(0, 10)]),
        con_lai: Math.max(0, cho.length - 8),
        bang_chung: bangChung('yeu_cau_chi', cho),
      }],
      de_xuat,
      nguon: [N.yeuCau],
      trang: [T.yeuCau],
    },
  );
}

const TEN_TRANG_THAI_AGENT: Record<string, string> = { hoat_dong: 'Đang chạy', tam_dung: 'Tạm dừng', thu_hoi: 'Đã thu hồi' };
/** Bị luật từ chối từ ngần này lần trong 7 ngày thì đáng xem agent có đang làm bậy không. */
export const NGUONG_TU_CHOI_7_NGAY = 3;

export function tinhHinhAgent(d: DuLieu): KetQuaNangLuc {
  const dang = d.tacTu.filter((t) => t.trang_thai !== 'thu_hoi');
  if (!dang.length) {
    return kq('tinh_hinh_agent', 'tro_ly', 'Bạn chưa có agent nào đang dùng. Tạo agent ở Kiểm soát agent để nó xin chi qua MIMI.', {
      nguon: [N.yeuCau], trang: [T.agent],
    });
  }
  const dau = dauThang(d.homNay);
  const tuan = congNgay(d.homNay, -7);
  const hang = dang.map((t) => {
    const cs = d.chinhSach.find((c) => c.tac_tu_id === t.id);
    const cua = d.yeuCau.filter((y) => y.tac_tu_id === t.id);
    const daDung = cua
      .filter((y) => (y.trang_thai === 'da_duyet' || y.trang_thai === 'da_chi') && y.created_at.slice(0, 10) >= dau)
      .reduce((s, y) => s + (y.trang_thai === 'da_chi' && y.so_tien_thuc_chi != null ? y.so_tien_thuc_chi : y.so_tien), 0);
    const tuChoi = cua.filter((y) => y.trang_thai === 'tu_choi' && y.created_at.slice(0, 10) >= tuan).length;
    return { t, han: cs?.han_muc_thang ?? null, daDung, tuChoi, pct: cs ? phanTram(daDung, cs.han_muc_thang) : null };
  });
  const tong = hang.reduce((s, h) => s + h.daDung, 0);
  const ganHet = hang.filter((h) => h.pct !== null && h.pct >= 80);
  const dangNgo = hang.filter((h) => h.t.trang_thai === 'hoat_dong' && h.tuChoi >= NGUONG_TU_CHOI_7_NGAY);

  const cau = [`${dang.length} agent đang dùng. Tháng này đã duyệt chi ${vnd(tong)}.`];
  for (const h of ganHet) cau.push(`${h.t.ten} đã dùng ${h.pct}% hạn mức tháng.`);
  for (const h of dangNgo) cau.push(`${h.t.ten} bị từ chối ${h.tuChoi} lần trong 7 ngày qua — nên xem agent này đang xin gì.`);

  return kq('tinh_hinh_agent', 'tro_ly', cau.join(' '), {
    the: [{
      loai: 'bang',
      tieu_de: 'Agent và hạn mức tháng này',
      cot: [
        { nhan: 'Agent', don_vi: 'chu' }, { nhan: 'Trạng thái', don_vi: 'chu' }, { nhan: 'Đã dùng', don_vi: 'vnd' },
        { nhan: 'Hạn mức tháng', don_vi: 'vnd' }, { nhan: 'Đã dùng %', don_vi: 'phan_tram' }, { nhan: 'Bị từ chối 7 ngày', don_vi: 'so' },
      ],
      dong: hang.map((h) => [h.t.ten, TEN_TRANG_THAI_AGENT[h.t.trang_thai] ?? h.t.trang_thai, h.daDung, h.han, h.pct, h.tuChoi]),
    }],
    de_xuat: dangNgo.map((h) => ({
      khoa: `tam_dung:${h.t.id}`,
      loai: 'tam_dung_agent' as const,
      nhan: `Tạm dừng ${h.t.ten}`,
      mo_ta: `${h.t.ten} bị từ chối ${h.tuChoi} lần trong 7 ngày qua. Tạm dừng thì mọi yêu cầu chi mới của agent này bị từ chối cho tới khi bạn bật lại; khoản đã duyệt không bị huỷ.`,
      tham_so: { tac_tu_id: h.t.id },
    })),
    nguon: [N.yeuCau],
    trang: [T.agent, T.chinhSach],
  });
}

// ── Chi phí ─────────────────────────────────────────────────────────────────

export function chiPhiThang(d: DuLieu): KetQuaNangLuc {
  if (!d.giaoDich.length) return kq('chi_phi_thang', 'chi_phi', CHUA_CO_SAO_KE, { nguon: [N.giaoDich], trang: [T.ketNoi] });
  const ra = d.giaoDich.filter((t) => chieuTien(t) === 'ra');
  const dau = dauThang(d.homNay);
  const denTruoc = cungNgayThangTruoc(d.homNay);
  const nay = ra.filter((t) => t.transaction_date >= dau && t.transaction_date <= d.homNay);
  const truoc = ra.filter((t) => t.transaction_date >= dauThang(denTruoc) && t.transaction_date <= denTruoc);
  const tongNay = nay.reduce((s, t) => s + doLonTien(t), 0);
  const tongTruoc = truoc.reduce((s, t) => s + doLonTien(t), 0);
  const chenh = tongTruoc > 0 ? Math.round(((tongNay - tongTruoc) / tongTruoc) * 100) : null;

  const theoNguoi = new Map<string, { so: number; tien: number }>();
  for (const t of nay) {
    const k = tenNguoiNhan(t);
    const cu = theoNguoi.get(k) ?? { so: 0, tien: 0 };
    cu.so += 1;
    cu.tien += doLonTien(t);
    theoNguoi.set(k, cu);
  }
  const top = [...theoNguoi.entries()].sort((a, b) => b[1].tien - a[1].tien);

  let cau = `Từ đầu tháng tới hôm nay bạn đã chi ${vnd(tongNay)} qua ngân hàng`;
  if (chenh !== null) cau += `, ${chenh >= 0 ? 'tăng' : 'giảm'} ${Math.abs(chenh)}% so với cùng kỳ tháng trước (${vnd(tongTruoc)})`;
  cau += '.';
  if (top[0]) cau += ` Chi nhiều nhất cho ${top[0][0]}: ${vnd(top[0][1].tien)}.`;

  return kq('chi_phi_thang', 'chi_phi', cau, {
    the: [
      {
        loai: 'so_lieu',
        tieu_de: `Chi phí tháng ${d.homNay.slice(5, 7)}/${d.homNay.slice(0, 4)}`,
        muc: [
          { nhan: `Đã chi tới ${ngayVN(d.homNay)}`, gia_tri: tongNay, don_vi: 'vnd', bang_chung: bangChung('giao_dich', nay) },
          { nhan: 'Cùng kỳ tháng trước', gia_tri: tongTruoc, don_vi: 'vnd', bang_chung: bangChung('giao_dich', truoc) },
          // Tỷ lệ suy từ hai con số ngay trên: bằng chứng là bằng chứng của cả hai.
          { nhan: 'Thay đổi', gia_tri: chenh, don_vi: 'phan_tram', can_chu_y: chenh !== null && chenh >= 20, bang_chung: gopBangChung(bangChung('giao_dich', nay), bangChung('giao_dich', truoc)) },
        ],
      },
      ...(top.length ? [{
        loai: 'bang' as const,
        tieu_de: 'Chi nhiều nhất tháng này',
        cot: [{ nhan: 'Người nhận', don_vi: 'chu' as const }, { nhan: 'Số khoản', don_vi: 'so' as const }, { nhan: 'Tổng', don_vi: 'vnd' as const }],
        dong: top.slice(0, 6).map(([ten, v]) => [ten, v.so, v.tien] as O[]),
        con_lai: Math.max(0, top.length - 6),
        bang_chung: bangChung('giao_dich', nay),
      }] : []),
    ],
    nguon: [N.giaoDich],
    trang: [T.giaoDich],
  });
}

// ── Hoá đơn & chứng từ ───────────────────────────────────────────────────────

export function thieuChungTu(d: DuLieu): KetQuaNangLuc {
  const { tu, den, nhan } = d.kyChungTu;
  if (!d.giaoDich.length) return kq('thieu_chung_tu', 'chung_tu', CHUA_CO_SAO_KE, { nguon: [N.giaoDich], trang: [T.ketNoi] });

  // Đúng cách màn Chứng từ chi phí dựng khoản chi và hoá đơn — cùng kỳ, cùng hàm ghép.
  const chi: KhoanChi[] = d.giaoDich
    .filter((t) => chieuTien(t) === 'ra' && t.transaction_date >= tu && t.transaction_date <= den)
    .map((t) => ({
      id: t.id,
      soTien: doLonTien(t),
      ngay: t.transaction_date,
      noiDung: [t.merchant_name, t.payment_reference].filter(Boolean).join(' ') || null,
      tenNguoiNhan: t.counter_account_name ?? null,
    }));
  const hoaDon: HoaDonVao[] = d.hoaDonVao
    .filter((h) => h.issued_at && h.issued_at.slice(0, 10) >= tu && h.issued_at.slice(0, 10) <= den)
    .map((h) => ({
      id: h.id,
      soTien: Number(h.total_amount),
      ngay: String(h.issued_at).slice(0, 10),
      soHoaDon: h.invoice_number,
      tenBenBan: h.counterparty_name,
      maSoThueBenBan: h.counterparty_tax_code,
    }));
  const g = ghepChungTu(chi, hoaDon);

  // Chứng từ quét KHÔNG đổi con số "chưa có hoá đơn điện tử" (để khớp màn Chứng từ chi phí);
  // nó chỉ cho biết khoản nào trong đó đã có giấy tờ khác.
  const quetDaGan = new Set(d.chungTuQuet.map((c) => c.giao_dich_id).filter(Boolean));
  const quetTuDo = d.chungTuQuet.filter((c) => !c.giao_dich_id && c.ngay);
  const coQuet = new Set<string>();
  for (const c of g.chuaCoGiay) {
    if (quetDaGan.has(c.id)) { coQuet.add(c.id); continue; }
    const khop = quetTuDo.filter((q) => Math.abs(q.tong_tien - c.soTien) <= LECH_TIEN && Math.abs(soNgayGiua(q.ngay as string, c.ngay)) <= 7);
    if (khop.length === 1) coQuet.add(c.id);
  }
  const conThieu = g.chuaCoGiay.filter((c) => !coQuet.has(c.id));

  if (!chi.length) {
    return kq('thieu_chung_tu', 'chung_tu', `Không có khoản chi ngân hàng nào trong ${nhan} (${ngayVN(tu)}–${ngayVN(den)}).`, {
      nguon: [N.giaoDich, N.hoaDonVao], trang: [T.chungTu],
    });
  }

  let cau = `${nhan[0].toUpperCase()}${nhan.slice(1)} (${ngayVN(tu)}–${ngayVN(den)}) bạn đã chi ${vnd(g.tongDaChi)}; ${g.chuaCoGiay.length} khoản, tổng ${vnd(g.tongChuaCoGiay)}, chưa có hoá đơn điện tử.`;
  if (coQuet.size) cau += ` Trong đó ${coQuet.size} khoản đã có chứng từ quét.`;
  if (g.canXem.length) cau += ` ${g.canXem.length} khoản khớp nhiều hoá đơn cùng lúc — cần bạn chọn.`;
  if (!g.chuaCoGiay.length) cau = `${nhan[0].toUpperCase()}${nhan.slice(1)}: mọi khoản chi ngân hàng đều đã có hoá đơn điện tử.`;

  const tenChi = new Map(d.giaoDich.map((t) => [t.id, tenNguoiNhan(t)]));
  return kq('thieu_chung_tu', 'chung_tu', cau, {
    the: [
      {
        loai: 'so_lieu',
        tieu_de: `Chứng từ ${nhan}`,
        muc: [
          { nhan: 'Đã chi', gia_tri: g.tongDaChi, don_vi: 'vnd', bang_chung: bangChung('giao_dich', chi) },
          { nhan: 'Hoá đơn điện tử đầu vào', gia_tri: g.tongCoGiay, don_vi: 'vnd', bang_chung: bangChung('hoa_don_vao', hoaDon) },
          {
            nhan: 'Chưa có hoá đơn điện tử', gia_tri: g.tongChuaCoGiay, don_vi: 'vnd', can_chu_y: g.tongChuaCoGiay > 0,
            ghi_chu: coQuet.size ? `${coQuet.size} khoản đã có chứng từ quét` : undefined,
            /*
             * Bằng chứng phải là ĐÚNG những khoản đã cộng vào con số này, tức `g.chuaCoGiay`.
             * Trước đây nó trỏ vào `conThieu` — tập đã trừ đi khoản có chứng từ quét. Khi mọi
             * khoản thiếu hoá đơn đều có ảnh quét, `conThieu` rỗng, và một con số khác 0 đứng
             * đó không còn bản ghi nào để mở ra xem. Bộ chấm P1-004 bắt được ca này.
             */
            bang_chung: bangChung('giao_dich', g.chuaCoGiay),
          },
          { nhan: 'Cần bạn chọn hoá đơn', gia_tri: g.canXem.length, don_vi: 'so', bang_chung: bangChung('giao_dich', g.canXem.map((x) => ({ id: x.khoanChiId }))) },
        ],
      },
      ...(conThieu.length ? [{
        loai: 'bang' as const,
        tieu_de: 'Khoản chi lớn nhất chưa có giấy tờ',
        cot: [{ nhan: 'Ngày', don_vi: 'ngay' as const }, { nhan: 'Người nhận', don_vi: 'chu' as const }, { nhan: 'Số tiền', don_vi: 'vnd' as const }],
        dong: conThieu.slice(0, 8).map((c) => [c.ngay, tenChi.get(c.id) ?? 'Không rõ người nhận', c.soTien] as O[]),
        bang_chung: bangChung('giao_dich', conThieu),
        con_lai: Math.max(0, conThieu.length - 8),
      }] : []),
    ],
    nguon: [N.giaoDich, N.hoaDonVao, ...(d.chungTuQuet.length ? [N.chungTuQuet] : [])],
    trang: [T.chungTu],
  });
}

const laQuaHan = (h: HoaDonBanTL, homNay: string) => h.status === 'overdue' || (h.status === 'pending' && h.due_date < homNay);

export function hoaDonQuaHan(d: DuLieu): KetQuaNangLuc {
  const qua = d.hoaDonBan
    .filter((h) => laQuaHan(h, d.homNay))
    .map((h) => ({ h, tre: Math.max(0, soNgayGiua(h.due_date, d.homNay)) }))
    .sort((a, b) => b.tre - a.tre);
  const choThu = d.hoaDonBan.filter((h) => h.status === 'pending' && h.due_date >= d.homNay);
  const tongCho = choThu.reduce((s, h) => s + Number(h.total), 0);

  if (!d.hoaDonBan.length) {
    return kq('hoa_don_qua_han', 'chung_tu', 'Bạn chưa lập hoá đơn bán ra nào trong MIMI.', { nguon: [N.hoaDonBan], trang: [T.hoaDon] });
  }
  if (!qua.length) {
    return kq(
      'hoa_don_qua_han', 'chung_tu',
      `Không có hoá đơn bán ra nào quá hạn.${choThu.length ? ` ${choThu.length} hoá đơn chưa tới hạn, tổng ${vnd(tongCho)}.` : ''}`,
      { nguon: [N.hoaDonBan], trang: [T.hoaDon] },
    );
  }
  const tong = qua.reduce((s, x) => s + Number(x.h.total), 0);
  const dau = qua[0];
  return kq(
    'hoa_don_qua_han', 'chung_tu',
    `${qua.length} hoá đơn bán ra đã quá hạn, tổng ${vnd(tong)}. Lâu nhất: ${dau.h.client_name} (hoá đơn ${dau.h.invoice_number}) trễ ${dau.tre} ngày, ${vnd(Number(dau.h.total))}.`,
    {
      the: [
        {
          loai: 'so_lieu', tieu_de: 'Công nợ phải thu', muc: [
            { nhan: 'Quá hạn', gia_tri: tong, don_vi: 'vnd', can_chu_y: true, ghi_chu: `${qua.length} hoá đơn`, bang_chung: bangChung('hoa_don_ban', qua.map((x) => x.h)) },
            { nhan: 'Chưa tới hạn', gia_tri: tongCho, don_vi: 'vnd', ghi_chu: `${choThu.length} hoá đơn`, bang_chung: bangChung('hoa_don_ban', choThu) },
          ],
        },
        {
          loai: 'bang', tieu_de: 'Hoá đơn quá hạn',
          cot: [
            { nhan: 'Khách', don_vi: 'chu' }, { nhan: 'Số hoá đơn', don_vi: 'chu' }, { nhan: 'Hạn trả', don_vi: 'ngay' },
            { nhan: 'Trễ (ngày)', don_vi: 'so' }, { nhan: 'Số tiền', don_vi: 'vnd' },
          ],
          dong: qua.slice(0, 8).map((x) => [x.h.client_name, x.h.invoice_number, x.h.due_date, x.tre, Number(x.h.total)]),
          con_lai: Math.max(0, qua.length - 8),
          bang_chung: bangChung('hoa_don_ban', qua.map((x) => x.h)),
        },
      ],
      nguon: [N.hoaDonBan],
      trang: [T.hoaDon],
    },
  );
}

// ── Ngân hàng & đối soát ─────────────────────────────────────────────────────

function theoThang(d: DuLieu, soThang: number) {
  const m = new Map<string, { vao: number; ra: number }>();
  for (const t of d.giaoDich) {
    const c = chieuTien(t);
    if (!c) continue;
    const k = t.transaction_date.slice(0, 7);
    const cu = m.get(k) ?? { vao: 0, ra: 0 };
    if (c === 'vao') cu.vao += doLonTien(t);
    else cu.ra += doLonTien(t);
    m.set(k, cu);
  }
  // Chỉ những tháng CÓ giao dịch: đắp tháng rỗng là vẽ ra tháng doanh thu 0 chưa từng có.
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-soThang)
    .map(([k, v]) => ({ khoa: k, nhan: `${k.slice(5, 7)}/${k.slice(0, 4)}`, ...v, rong: v.vao - v.ra }));
}

export function dongTien(d: DuLieu): KetQuaNangLuc {
  if (!d.giaoDich.length) return kq('dong_tien', 'ngan_hang', CHUA_CO_SAO_KE, { nguon: [N.giaoDich], trang: [T.ketNoi] });
  const thang = theoThang(d, 6);
  const nay = thang.find((t) => t.khoa === d.homNay.slice(0, 7));
  const truoc = thang.filter((t) => t.khoa < d.homNay.slice(0, 7)).at(-1);
  const cau: string[] = [];
  if (nay) cau.push(`Tháng này tới ${ngayVN(d.homNay)}: tiền vào ${vnd(nay.vao)}, tiền ra ${vnd(nay.ra)}, chênh lệch ${vnd(nay.rong)}.`);
  if (truoc) cau.push(`Tháng ${truoc.nhan}: vào ${vnd(truoc.vao)}, ra ${vnd(truoc.ra)}, chênh lệch ${vnd(truoc.rong)}.`);
  const am = thang.filter((t) => t.rong < 0).length;
  if (am) cau.push(`${am}/${thang.length} tháng gần đây tiền ra nhiều hơn tiền vào.`);
  return kq('dong_tien', 'ngan_hang', cau.join(' ') || 'Chưa có giao dịch trong 6 tháng gần đây.', {
    the: [{
      loai: 'bang', tieu_de: 'Dòng tiền theo tháng',
      cot: [{ nhan: 'Tháng', don_vi: 'chu' }, { nhan: 'Tiền vào', don_vi: 'vnd' }, { nhan: 'Tiền ra', don_vi: 'vnd' }, { nhan: 'Chênh lệch', don_vi: 'vnd' }],
      dong: thang.map((t) => [t.nhan, t.vao, t.ra, t.rong]),
      bang_chung: bangChung('giao_dich', d.giaoDich),
    }],
    nguon: [N.giaoDich],
    trang: [T.giaoDich],
  });
}

export function doiSoat(d: DuLieu): KetQuaNangLuc {
  if (!d.giaoDich.length) return kq('doi_soat', 'ngan_hang', CHUA_CO_SAO_KE, { nguon: [N.giaoDich], trang: [T.ketNoi] });
  const tu = congNgay(d.homNay, -30);
  const vao = d.giaoDich.filter((t) => chieuTien(t) === 'vao' && t.transaction_date >= tu);
  const cho = d.hoaDonBan.filter((h) => h.status === 'pending' || h.status === 'overdue');
  /*
   * MIMI-P1-005: ghép bằng điểm (`doi-soat/cham-diem.ts`), không bằng "cùng số tiền". Chỉ "khớp
   * chắc" khi nội dung chuyển khoản ghi số hoá đơn; cùng số tiền hay cùng tên thì là "cần xem".
   */
  const ghep = ghepTienVe(
    vao.map((t) => ({ id: t.id, so_tien: doLonTien(t), ngay: t.transaction_date, ten_nguoi_chuyen: tenNguoiNhan(t), noi_dung: t.payment_reference })),
    cho.map((h) => ({ id: h.id, so_hoa_don: h.invoice_number, ten_khach: h.client_name, tong: Number(h.total), ngay_lap: h.issued_date })),
  );
  const gdTheoId = new Map(vao.map((t) => [t.id, t]));
  const hdTheoId = new Map(cho.map((h) => [h.id, h]));
  const bcCap = (ds: Cap[]) => gopBangChung(
    bangChung('giao_dich', ds.map((c) => gdTheoId.get(c.tien.id)!).filter(Boolean)),
    bangChung('hoa_don_ban', ds.map((c) => hdTheoId.get(c.hoa_don.id)!).filter(Boolean)),
  );
  const chac = ghep.chac;
  const canXem = ghep.can_xem;
  const tongVao = vao.reduce((s, t) => s + doLonTien(t), 0);
  const tongCho = cho.reduce((s, h) => s + Number(h.total), 0);

  const the: The[] = [{
    loai: 'so_lieu', tieu_de: '30 ngày gần nhất', muc: [
      { nhan: 'Tiền về', gia_tri: tongVao, don_vi: 'vnd', ghi_chu: `${vao.length} khoản`, bang_chung: bangChung('giao_dich', vao) },
      { nhan: 'Khớp chắc với hoá đơn', gia_tri: chac.length, don_vi: 'so', ghi_chu: 'nội dung chuyển khoản ghi số hoá đơn', bang_chung: bcCap(chac) },
      { nhan: 'Cần bạn xem', gia_tri: canXem.length, don_vi: 'so', ghi_chu: 'chỉ khớp số tiền hoặc tên', bang_chung: bcCap(canXem) },
      { nhan: 'Hoá đơn còn chờ thu', gia_tri: tongCho, don_vi: 'vnd', ghi_chu: `${cho.length} hoá đơn`, bang_chung: bangChung('hoa_don_ban', cho) },
    ],
  }];
  const bangCap = (tieuDe: string, ds: Cap[]): The => ({
    loai: 'bang', tieu_de: tieuDe,
    cot: [{ nhan: 'Ngày tiền về', don_vi: 'ngay' }, { nhan: 'Người chuyển', don_vi: 'chu' }, { nhan: 'Số tiền', don_vi: 'vnd' }, { nhan: 'Hoá đơn', don_vi: 'chu' }, { nhan: 'Vì sao', don_vi: 'chu' }],
    dong: ds.slice(0, 8).map((c) => [c.tien.ngay, c.tien.ten_nguoi_chuyen ?? 'Không rõ', c.tien.so_tien, `${c.hoa_don.so_hoa_don} · ${c.hoa_don.ten_khach}`, c.ly_do.join('; ')] as O[]),
    con_lai: Math.max(0, ds.length - 8),
    bang_chung: bcCap(ds),
  });
  if (chac.length) the.push(bangCap('Tiền về khớp chắc với hoá đơn', chac));
  if (canXem.length) {
    the.push(bangCap('Tiền về cần bạn xem', canXem));
    the.push({ loai: 'ghi_chu', muc_do: 'thong_tin', cau: '"Cần bạn xem" chỉ khớp số tiền hoặc tên người chuyển — hai khách trả cùng số tiền là chuyện thường. Xem nội dung chuyển khoản hoặc hỏi khách trước khi coi hoá đơn là đã thu.' });
  }
  const docGanNhat = d.ketNoiNganHang
    .filter((k) => (k.scopes ?? 'transaction') === 'transaction' && k.last_synced_at)
    .map((k) => k.last_synced_at as string).sort().at(-1);
  if (docGanNhat && soNgayGiua(docGanNhat, d.homNay) >= 2) {
    the.push({ loai: 'ghi_chu', muc_do: 'can_chu_y', cau: `Sao kê đồng bộ gần nhất ngày ${ngayVN(docGanNhat)} — tiền về sau ngày đó chưa có ở đây.` });
  }
  const cau = `30 ngày qua có ${vao.length} khoản tiền về, tổng ${vnd(tongVao)}. ${chac.length ? `${chac.length} khoản khớp chắc với hoá đơn (nội dung ghi số hoá đơn).` : 'Chưa khoản nào khớp chắc với hoá đơn đang chờ thu.'}${canXem.length ? ` ${canXem.length} khoản cần bạn xem.` : ''}${cho.length ? ` Còn ${cho.length} hoá đơn chờ thu, tổng ${vnd(tongCho)}.` : ''}`;
  return kq('doi_soat', 'ngan_hang', cau, { the, nguon: [N.giaoDich, N.hoaDonBan], trang: [T.hoaDon, T.giaoDich] });
}

const TEN_MUC_DICH: Record<string, string> = { transaction: 'Đọc sao kê', qrpay: 'Nhận tiền QR', gdt: 'Hoá đơn điện tử', identity: 'Xác minh' };
const TEN_TRANG_THAI_NH: Record<string, string> = { connected: 'Đang chạy', needs_relink: 'Cần đăng nhập lại' };

export function ketNoiNganHang(d: DuLieu): KetQuaNangLuc {
  const ds = d.ketNoiNganHang;
  if (!ds.length) {
    return kq('ket_noi_ngan_hang', 'ngan_hang',
      'Chưa liên kết ngân hàng nào. Liên kết để MIMI đọc sao kê, đối chiếu chứng từ và biết tiền đã thật sự đi.',
      { nguon: [N.ketNoi], trang: [T.ketNoi] });
  }
  const canLai = ds.filter((k) => k.status === 'needs_relink');
  const docDuoc = ds.filter((k) => k.status === 'connected' && (k.scopes ?? 'transaction') === 'transaction' && k.provider === 'bankhub');
  const the: The[] = [{
    loai: 'bang', tieu_de: 'Kết nối ngân hàng',
    cot: [{ nhan: 'Ngân hàng', don_vi: 'chu' }, { nhan: 'Tài khoản', don_vi: 'chu' }, { nhan: 'Dùng để', don_vi: 'chu' }, { nhan: 'Trạng thái', don_vi: 'chu' }, { nhan: 'Đồng bộ gần nhất', don_vi: 'ngay' }],
    dong: ds.map((k) => [
      k.bank_name ?? 'Ngân hàng', cuoiSo(k.account_number), TEN_MUC_DICH[k.scopes ?? 'transaction'] ?? 'Khác',
      TEN_TRANG_THAI_NH[k.status] ?? 'Cần kiểm tra', k.last_synced_at ? k.last_synced_at.slice(0, 10) : null,
    ]),
  }];
  if (canLai.length) {
    the.push({ loai: 'ghi_chu', muc_do: 'can_chu_y', cau: `${canLai.map((k) => k.bank_name ?? 'Một ngân hàng').join(', ')} cần đăng nhập lại ở trang Kết nối. Bước này ngân hàng yêu cầu chính bạn xác thực, MIMI không làm thay được.` });
  }
  return kq(
    'ket_noi_ngan_hang', 'ngan_hang',
    `${ds.length} kết nối ngân hàng; ${ds.length - canLai.length} đang chạy${canLai.length ? `, ${canLai.length} cần đăng nhập lại` : ''}.`,
    {
      the,
      de_xuat: docDuoc.length ? [{
        khoa: 'dong_bo_ngan_hang', loai: 'dong_bo_ngan_hang', nhan: 'Đồng bộ sao kê ngay',
        mo_ta: `Kéo giao dịch mới từ ${docDuoc.length} tài khoản đang liên kết. Không làm đi tiền.`, tham_so: {},
      }] : [],
      nguon: [N.ketNoi],
      trang: [T.ketNoi],
    },
  );
}

// ── AI & Token ───────────────────────────────────────────────────────────────

const TEN_NCC_AI: Record<string, string> = { openai: 'OpenAI', anthropic: 'Anthropic', gemini: 'Google Gemini', openrouter: 'OpenRouter', khac: 'Khác' };

/**
 * Cùng nhà cung cấp, cùng ngày, CÙNG MODEL: số từ API thắng số từ file (file có thể là bản xuất cũ).
 *
 * MIMI-P1-005: trước đây khoá chỉ là nhà cung cấp + ngày, nên hễ API có một dòng của ngày đó là
 * mọi dòng file của ngày đó bị bỏ — kể cả model API không trả về. Chống trùng không được làm mất
 * khoản hợp lệ; giờ chỉ bỏ dòng file khi API đã có đúng model đó trong ngày đó.
 */
export function locTrungNguon(ds: ChiPhiAiTL[]): ChiPhiAiTL[] {
  const khoa = (r: ChiPhiAiTL) => `${r.nha_cung_cap} ${r.ngay} ${chuanHoaTenModel(r.hang_muc)}`;
  const coApi = new Set(ds.filter((r) => r.nguon === 'api').map(khoa));
  return ds.filter((r) => r.nguon === 'api' || !coApi.has(khoa(r)));
}

export function tinhChiPhiAiThang(d: DuLieu) {
  const dau = dauThang(d.homNay);
  const nay = locTrungNguon(d.chiPhiAi).filter((r) => r.ngay >= dau && r.ngay <= d.homNay);
  const tong = nay.reduce((s, r) => s + Number(r.so_tien_usd), 0);
  const ngayThu = Number(d.homNay.slice(8, 10));
  const duKien = ngayThu > 0 ? (tong / ngayThu) * soNgayTrongThang(d.homNay) : tong;
  const ns = d.nganSachAi;
  const pct = ns ? phanTram(tong, ns.han_muc_thang_usd) : null;
  return { nay, tong, duKien, ns, pct, vuot: pct !== null && pct >= 100, canhBao: pct !== null && ns !== null && pct >= ns.canh_bao_phan_tram };
}

export const GIO_CU_DONG_BO_AI = 6;

export function chiPhiAi(d: DuLieu): KetQuaNangLuc {
  if (!d.chiPhiAi.length) {
    return kq('chi_phi_ai', 'ai_token',
      'Chưa có số liệu chi phí AI. Tải file chi phí của nhà cung cấp, hoặc kết nối khoá quản trị để MIMI tự lấy mỗi ngày.',
      { nguon: [N.chiPhiAi], trang: [T.chiPhiAi] });
  }
  const c = tinhChiPhiAiThang(d);
  const theoModel = new Map<string, { ncc: string; tien: number }>();
  for (const r of c.nay) {
    const k = `${r.nha_cung_cap} ${r.hang_muc}`;
    const cu = theoModel.get(k) ?? { ncc: r.nha_cung_cap, tien: 0 };
    cu.tien += Number(r.so_tien_usd);
    theoModel.set(k, cu);
  }
  const top = [...theoModel.entries()].map(([k, v]) => ({ ten: k.slice(v.ncc.length + 1) || 'Khác', ...v })).sort((a, b) => b.tien - a.tien);

  let cau = `Tháng này bạn đã chi ${usd(c.tong)} cho dịch vụ AI`;
  if (c.ns) {
    cau += c.vuot
      ? `, đã VƯỢT ngân sách ${usd(c.ns.han_muc_thang_usd)} (dùng ${c.pct}%)`
      : `, dùng ${c.pct}% ngân sách ${usd(c.ns.han_muc_thang_usd)}`;
  }
  cau += '.';
  if (c.ns && !c.vuot && c.duKien > c.ns.han_muc_thang_usd) cau += ` Nếu giữ nhịp chi hiện tại, cuối tháng sẽ vào khoảng ${usd(c.duKien)} — vượt ngân sách.`;
  if (top[0] && c.tong > 0) cau += ` Tốn nhiều nhất: ${top[0].ten} (${TEN_NCC_AI[top[0].ncc] ?? top[0].ncc}), ${usd(top[0].tien)} — ${phanTram(top[0].tien, c.tong)}% tổng.`;

  const the: The[] = [{
    loai: 'so_lieu', tieu_de: `Chi phí AI tháng ${d.homNay.slice(5, 7)}/${d.homNay.slice(0, 4)}`, muc: [
      { nhan: 'Đã chi', gia_tri: c.tong, don_vi: 'usd', bang_chung: bangChung('chi_phi_ai', c.nay) },
      c.ns ? { nhan: 'Ngân sách tháng', gia_tri: c.ns.han_muc_thang_usd, don_vi: 'usd' } : { nhan: 'Ngân sách tháng', gia_tri: 'Chưa đặt', don_vi: 'chu' },
      { nhan: 'Đã dùng ngân sách', gia_tri: c.pct, don_vi: 'phan_tram', can_chu_y: c.canhBao, bang_chung: bangChung('chi_phi_ai', c.nay) },
      { nhan: 'Dự kiến cuối tháng', gia_tri: Math.round(c.duKien * 100) / 100, don_vi: 'usd', can_chu_y: !!c.ns && c.duKien > c.ns.han_muc_thang_usd, ghi_chu: 'nếu giữ nhịp chi hiện tại', bang_chung: bangChung('chi_phi_ai', c.nay) },
    ],
  }];
  if (top.length) {
    the.push({
      loai: 'bang', tieu_de: 'Tốn nhiều nhất tháng này',
      cot: [{ nhan: 'Model / dịch vụ', don_vi: 'chu' }, { nhan: 'Nhà cung cấp', don_vi: 'chu' }, { nhan: 'Chi phí', don_vi: 'usd' }, { nhan: 'Tỷ trọng', don_vi: 'phan_tram' }],
      dong: top.slice(0, 6).map((m) => [m.ten, TEN_NCC_AI[m.ncc] ?? m.ncc, Math.round(m.tien * 100) / 100, phanTram(m.tien, c.tong)]),
      con_lai: Math.max(0, top.length - 6),
      bang_chung: bangChung('chi_phi_ai', c.nay),
    });
  }
  if (!c.ns) the.push({ loai: 'ghi_chu', muc_do: 'thong_tin', cau: 'Chưa đặt ngân sách AI tháng. Đặt ở trang Chi phí AI để MIMI cảnh báo trước khi vượt.' });

  const gioTruoc = (luc: string | null) => !luc || Date.parse(`${d.homNay}T23:59:59Z`) - Date.parse(luc) > GIO_CU_DONG_BO_AI * 3_600_000;
  const canDongBo = d.ketNoiAi.some((k) => k.trang_thai !== 'da_go' && gioTruoc(k.dong_bo_luc));
  return kq('chi_phi_ai', 'ai_token', cau, {
    the,
    de_xuat: canDongBo ? [{
      khoa: 'dong_bo_chi_phi_ai', loai: 'dong_bo_chi_phi_ai', nhan: 'Lấy số liệu AI mới nhất',
      mo_ta: 'Hỏi lại các nhà cung cấp đã kết nối số chi phí và token 31 ngày gần nhất. Không làm đi tiền.', tham_so: {},
    }] : [],
    nguon: [N.chiPhiAi],
    trang: [T.chiPhiAi],
  });
}

const trong30Ngay = (d: DuLieu) => {
  const tu = congNgay(d.homNay, -30);
  return d.tokenAi.filter((t) => t.ngay >= tu);
};

const CHUA_CO_TOKEN =
  'Chưa có số token. Số token chỉ có khi kết nối khoá quản trị của Anthropic, OpenAI hoặc OpenRouter — file chi phí không kèm số token.';

export function tokenAi(d: DuLieu): KetQuaNangLuc {
  const ds = trong30Ngay(d);
  if (!ds.length) return kq('token_ai', 'ai_token', CHUA_CO_TOKEN, { nguon: [N.tokenAi], trang: [T.chiPhiAi] });
  const tu = congNgay(d.homNay, -30);
  const tien = locTrungNguon(d.chiPhiAi).filter((r) => r.ngay >= tu);
  const gop = new Map<string, { ncc: string; model: string; vao: number; cache: number; ra: number; goi: number }>();
  for (const t of ds) {
    const k = `${t.nha_cung_cap} ${chuanHoaTenModel(t.model)}`;
    const cu = gop.get(k) ?? { ncc: t.nha_cung_cap, model: t.model, vao: 0, cache: 0, ra: 0, goi: 0 };
    cu.vao += t.token_vao; cu.cache += t.token_vao_cache; cu.ra += t.token_ra; cu.goi += t.so_lan_goi;
    gop.set(k, cu);
  }
  const hang = [...gop.values()].map((g) => {
    const chiPhi = tien.filter((r) => r.nha_cung_cap === g.ncc && chuanHoaTenModel(r.hang_muc) === chuanHoaTenModel(g.model))
      .reduce((s, r) => s + Number(r.so_tien_usd), 0);
    const tong = g.vao + g.ra;
    return { ...g, tong, chiPhi: chiPhi > 0 ? Math.round(chiPhi * 100) / 100 : null, moiTrieu: chiPhi > 0 && tong > 0 ? Math.round((chiPhi / tong) * 1e6 * 100) / 100 : null };
  }).sort((a, b) => b.tong - a.tong);
  const tongToken = hang.reduce((s, h) => s + h.tong, 0);
  const tongCache = hang.reduce((s, h) => s + h.cache, 0);
  const tongVao = hang.reduce((s, h) => s + h.vao, 0);
  const dau = hang[0];
  const cau = `30 ngày qua dùng ${soToken(tongToken)} token trên ${hang.length} model. Nhiều nhất: ${dau.model} (${phanTram(dau.tong, tongToken)}%).${tongVao > 0 ? ` ${phanTram(tongCache, tongVao)}% token đầu vào đọc từ cache.` : ''}`;
  return kq('token_ai', 'ai_token', cau, {
    the: [{
      loai: 'bang', tieu_de: 'Token theo model, 30 ngày',
      cot: [
        { nhan: 'Model', don_vi: 'chu' }, { nhan: 'Token vào', don_vi: 'token' }, { nhan: 'Từ cache', don_vi: 'phan_tram' },
        { nhan: 'Token ra', don_vi: 'token' }, { nhan: 'Lần gọi', don_vi: 'so' }, { nhan: 'Chi phí', don_vi: 'usd' }, { nhan: 'Mỗi 1 triệu token', don_vi: 'usd' },
      ],
      dong: hang.slice(0, 8).map((h) => [h.model, h.vao, phanTram(h.cache, h.vao), h.ra, h.goi || null, h.chiPhi, h.moiTrieu]),
      con_lai: Math.max(0, hang.length - 8),
      // Bảng gộp theo model, nhưng số nào cũng cộng từ các dòng token 30 ngày — mở ra được.
      bang_chung: bangChung('token_ai', ds),
    }],
    nguon: [N.tokenAi, N.chiPhiAi],
    trang: [T.chiPhiAi],
  });
}

export const NGAY_CU_BANG_GIA = 7;

const deXuatCapNhatGia: DeXuat = {
  khoa: 'cap_nhat_bang_gia', loai: 'cap_nhat_bang_gia', nhan: 'Lấy bảng giá mới',
  mo_ta: 'Tải bảng giá niêm yết từ OpenRouter để so model đang dùng với model rẻ hơn. Không làm đi tiền, không đổi model nào.', tham_so: {},
};

export function modelReHon(d: DuLieu): KetQuaNangLuc {
  const ds = trong30Ngay(d);
  if (!ds.length) return kq('model_re_hon', 'ai_token', `${CHUA_CO_TOKEN} Không có số token thì không ước tính được đổi model tiết kiệm bao nhiêu.`, { nguon: [N.tokenAi], trang: [T.chiPhiAi] });
  if (!d.bangGia.length) {
    return kq('model_re_hon', 'ai_token', 'Chưa có bảng giá model để so. Lấy bảng giá rồi hỏi lại.', {
      de_xuat: [deXuatCapNhatGia], nguon: [N.tokenAi], trang: [T.chiPhiAi],
    });
  }
  const r = deXuatModelReHon(ds, d.bangGia);
  const cu = !d.bangGiaLuc || soNgayGiua(d.bangGiaLuc, d.homNay) > NGAY_CU_BANG_GIA;
  const the: The[] = [];
  let cau: string;
  if (!r.de_xuat.length) {
    cau = 'Chưa thấy model nào cùng hãng có giá token thấp hơn đáng kể, theo số token 30 ngày qua.';
  } else {
    const dau = r.de_xuat[0];
    const tongTiet = r.de_xuat.reduce((s, x) => s + x.tiet_kiem_usd, 0);
    /*
     * MIMI-P1-006: "không đề xuất đổi model chỉ dựa trên giá token". Đây là chênh giá token, kèm độ
     * tin chất lượng — hiện luôn "chưa đo" vì MIMI chưa có số đo chất lượng, độ trễ, chi phí gọi lại.
     */
    cau = `Chỉ tính giá token, ${dau.model} sang ${dau.thay_bang.ten} 30 ngày qua sẽ tốn khoảng ${usd(dau.chi_phi_neu_doi_usd)} thay vì ${usd(dau.chi_phi_uoc_tinh_usd)} — chênh ${usd(dau.tiet_kiem_usd)}.`;
    if (r.de_xuat.length > 1) cau += ` Tính cả ${r.de_xuat.length} model, chênh khoảng ${usd(tongTiet)} mỗi 30 ngày.`;
    cau += ` Đây chưa phải đề xuất đổi: MIMI chưa đo ${CAN_DO_TRUOC_KHI_DOI.join(', ')} của model rẻ hơn — độ tin chất lượng: chưa đo.`;
    the.push({
      loai: 'bang', tieu_de: 'Chênh giá token nếu đổi model cùng hãng (30 ngày, chưa tính chất lượng)',
      cot: [
        { nhan: 'Đang dùng', don_vi: 'chu' }, { nhan: 'Model giá thấp hơn', don_vi: 'chu' }, { nhan: 'Chi phí hiện tại', don_vi: 'usd' },
        { nhan: 'Theo giá model kia', don_vi: 'usd' }, { nhan: 'Chênh', don_vi: 'usd' }, { nhan: 'Độ tin chất lượng', don_vi: 'chu' },
      ],
      dong: r.de_xuat.slice(0, 6).map((x) => [x.model, x.thay_bang.ten, x.chi_phi_uoc_tinh_usd, x.chi_phi_neu_doi_usd, x.tiet_kiem_usd, 'Chưa đo']),
      con_lai: Math.max(0, r.de_xuat.length - 6),
    });
  }
  the.push({
    loai: 'ghi_chu', muc_do: 'can_chu_y',
    cau: `Ước tính = số token 30 ngày × giá niêm yết của OpenRouter${d.bangGiaLuc ? ` (lấy ngày ${ngayVN(d.bangGiaLuc)})` : ''}, chưa trừ giảm giá cache hay batch. Model giá thấp hơn có thể làm kém hơn, chậm hơn, hoặc phải gọi lại nhiều lần — cái giá thật có thể cao hơn giá token. Thử trên một phần việc thật, đo tỷ lệ thành công ở mục "Chi phí theo quy trình" rồi mới quyết.`,
  });
  if (r.khong_khop.length) the.push({ loai: 'ghi_chu', muc_do: 'thong_tin', cau: `Chưa khớp được bảng giá cho: ${r.khong_khop.slice(0, 5).join(', ')}.` });
  return kq('model_re_hon', 'ai_token', cau, {
    the,
    de_xuat: cu ? [deXuatCapNhatGia] : [],
    nguon: [N.tokenAi, bangGiaNguon(d.bangGiaLuc)],
    trang: [T.chiPhiAi],
  });
}

// ── Báo cáo ─────────────────────────────────────────────────────────────────

export function baoCaoTaiChinh(d: DuLieu): KetQuaNangLuc {
  if (!d.giaoDich.length) return kq('bao_cao_tai_chinh', 'bao_cao', CHUA_CO_SAO_KE, { nguon: [N.giaoDich], trang: [T.ketNoi] });
  const thang = theoThang(d, 6);
  const thu = thang.reduce((s, t) => s + t.vao, 0);
  const chi = thang.reduce((s, t) => s + t.ra, 0);
  const bien = phanTram(thu - chi, thu);
  // P0-004: tên gọi theo TU_DIEN_CHI_SO — đây là dòng tiền ngân hàng, không phải doanh thu/lợi nhuận.
  const cau = `Tổng hợp dòng tiền ngân hàng ${thang.length} tháng gần nhất có giao dịch: tiền vào ${vnd(thu)}, tiền ra ${vnd(chi)}, chênh lệch ${vnd(thu - chi)}${bien !== null ? ` (${bien}% tiền vào)` : ''}.`;
  return kq('bao_cao_tai_chinh', 'bao_cao', cau, {
    the: [
      {
        loai: 'bang', tieu_de: 'Dòng tiền ngân hàng theo tháng',
        cot: [
          { nhan: 'Tháng', don_vi: 'chu' }, { nhan: TU_DIEN_CHI_SO.tien_vao_ngan_hang.ten, don_vi: 'vnd' },
          { nhan: TU_DIEN_CHI_SO.tien_ra_ngan_hang.ten, don_vi: 'vnd' }, { nhan: 'Chênh lệch', don_vi: 'vnd' },
          { nhan: 'Chênh lệch / tiền vào', don_vi: 'phan_tram' },
        ],
        dong: thang.map((t) => [t.nhan, t.vao, t.ra, t.rong, phanTram(t.rong, t.vao)]),
        bang_chung: bangChung('giao_dich', d.giaoDich),
      },
      {
        loai: 'ghi_chu', muc_do: 'thong_tin',
        cau: 'Đây là tiền vào và ra tài khoản ngân hàng, chưa phải doanh thu, lợi nhuận hay báo cáo tài chính: tiền vào gồm cả tiền vay, góp vốn, chuyển khoản nội bộ, và MIMI chưa có sổ kế toán của bạn.',
      },
    ],
    nguon: [N.giaoDich],
    trang: [T.baoCao],
  });
}

/** Hai khoản chi cùng người nhận, cùng số tiền, cách nhau không quá ngần này ngày. */
export const NGAY_NGHI_TRUNG = 3;
/** Khoản nhỏ hơn thế (phí, cước) lặp lại là bình thường — không đem ra nghi trả trùng. */
export const TIEN_TOI_THIEU_NGHI_TRUNG = 50_000;

/**
 * Mã trong nội dung chuyển khoản: cụm có chữ số, dài từ 3 ký tự (HD201, 0000123, PO-778).
 * Bỏ cụm toàn số ≤ 31 hay dạng ngày — "thang 9", "15/09" không phải mã hoá đơn.
 */
function maTrongNoiDung(noiDung: string | null): Set<string> {
  const cum = (noiDung ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/);
  return new Set(cum.filter((c) => /\d/.test(c) && c.length >= 3 && !/^\d{1,2}$/.test(c) && !/^(19|20)\d{2}$/.test(c)));
}

/**
 * MIMI-P1-005: hai khoản cùng người nhận, cùng số tiền nhưng nội dung ghi HAI MÃ KHÁC NHAU (HD201 và
 * HD202) là hai lần trả hợp lệ — trả hai hoá đơn cùng giá — không phải trả trùng.
 */
export function khacMa(a: string | null, b: string | null): boolean {
  const ma = maTrongNoiDung(a);
  const mb = maTrongNoiDung(b);
  return ma.size > 0 && mb.size > 0 && ![...ma].some((x) => mb.has(x));
}

export function nghiTraTrung(d: DuLieu) {
  const tu = congNgay(d.homNay, -60);
  const ra = d.giaoDich
    .filter((t) => chieuTien(t) === 'ra' && t.transaction_date >= tu && doLonTien(t) >= TIEN_TOI_THIEU_NGHI_TRUNG)
    .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
  const nhom = new Map<string, GiaoDichTL[]>();
  for (const t of ra) {
    const ten = tenNguoiNhan(t);
    if (ten === 'Không rõ người nhận') continue;
    const k = `${ten.toLowerCase()} ${doLonTien(t)}`;
    nhom.set(k, [...(nhom.get(k) ?? []), t]);
  }
  const cap: { a: GiaoDichTL; b: GiaoDichTL }[] = [];
  for (const ds of nhom.values()) {
    for (let i = 1; i < ds.length; i++) {
      if (soNgayGiua(ds[i - 1].transaction_date, ds[i].transaction_date) <= NGAY_NGHI_TRUNG
        && !khacMa(ds[i - 1].payment_reference, ds[i].payment_reference)) cap.push({ a: ds[i - 1], b: ds[i] });
    }
  }
  return cap;
}

export function phanTichTietKiem(d: DuLieu): KetQuaNangLuc {
  const cap = d.giaoDich.length ? nghiTraTrung(d) : [];
  const tongTrung = cap.reduce((s, c) => s + doLonTien(c.b), 0);
  const ds = trong30Ngay(d);
  const ai = ds.length && d.bangGia.length ? deXuatModelReHon(ds, d.bangGia) : null;
  const tietAi = ai ? ai.de_xuat.reduce((s, x) => s + x.tiet_kiem_usd, 0) : 0;

  const cau: string[] = [];
  if (!d.giaoDich.length) cau.push(CHUA_CO_SAO_KE);
  else if (cap.length) cau.push(`${cap.length} cặp khoản chi 60 ngày qua có thể bị trả trùng, tổng ${vnd(tongTrung)} — cùng người nhận, cùng số tiền, cách nhau không quá ${NGAY_NGHI_TRUNG} ngày.`);
  else cau.push('60 ngày qua không thấy khoản chi nào có dấu hiệu trả trùng.');
  if (ai && ai.de_xuat.length) cau.push(`Chỉ tính giá token, dùng model giá thấp hơn cùng hãng chênh khoảng ${usd(tietAi)} mỗi 30 ngày — chưa đo chất lượng nên chưa phải đề xuất đổi.`);
  else if (!ds.length) cau.push('Chưa có số token nên chưa ước tính được tiết kiệm từ AI.');

  const the: The[] = [{
    loai: 'so_lieu', tieu_de: 'Chỗ có thể tiết kiệm', muc: [
      { nhan: 'Khoản có thể bị trả trùng', gia_tri: cap.length, don_vi: 'so', can_chu_y: cap.length > 0, bang_chung: bangChung('giao_dich', cap.flatMap((c) => [c.a, c.b])) },
      { nhan: 'Tiền liên quan', gia_tri: tongTrung, don_vi: 'vnd', bang_chung: bangChung('giao_dich', cap.flatMap((c) => [c.a, c.b])) },
      { nhan: 'Chênh giá token nếu đổi model', gia_tri: ai ? Math.round(tietAi * 100) / 100 : null, don_vi: 'usd', ghi_chu: 'ước tính 30 ngày · độ tin chất lượng: chưa đo', bang_chung: bangChung('token_ai', d.tokenAi) },
    ],
  }];
  if (cap.length) {
    the.push({
      loai: 'bang', tieu_de: 'Có thể bị trả trùng',
      cot: [{ nhan: 'Người nhận', don_vi: 'chu' }, { nhan: 'Số tiền', don_vi: 'vnd' }, { nhan: 'Lần 1', don_vi: 'ngay' }, { nhan: 'Lần 2', don_vi: 'ngay' }],
      dong: cap.slice(0, 8).map((c) => [tenNguoiNhan(c.b), doLonTien(c.b), c.a.transaction_date, c.b.transaction_date]),
      con_lai: Math.max(0, cap.length - 8),
      bang_chung: bangChung('giao_dich', cap.flatMap((c) => [c.a, c.b])),
    });
    the.push({ loai: 'ghi_chu', muc_do: 'thong_tin', cau: 'Đây mới là nghi vấn: có thể là hai đơn hàng thật. Đối chiếu với hoá đơn hoặc hỏi người nhận trước khi đòi lại.' });
  }
  return kq('phan_tich_tiet_kiem', 'bao_cao', cau.join(' '), {
    the,
    nguon: [N.giaoDich, ...(ai ? [N.tokenAi, bangGiaNguon(d.bangGiaLuc)] : [])],
    trang: [T.giaoDich, T.chiPhiAi],
  });
}

// ── Kết nối ─────────────────────────────────────────────────────────────────

export function danhSachKetNoi(d: DuLieu): KetNoiHienThi[] {
  const nh = d.ketNoiNganHang;
  const theoMucDich = (s: string) => nh.filter((k) => (k.scopes ?? 'transaction') === s);
  const trangThaiNH = (ds: KetNoiNganHangTL[]): KetNoiHienThi['trang_thai'] =>
    !ds.length ? 'chua_ket_noi' : ds.some((k) => k.status !== 'connected') ? 'can_xu_ly' : 'dang_chay';

  const sao = theoMucDich('transaction');
  const qr = theoMucDich('qrpay');
  const gdt = theoMucDich('gdt');
  const ds: KetNoiHienThi[] = [
    {
      khoa: 'ngan_hang', ten: 'Ngân hàng', loai: 'ngan_hang', trang_thai: trangThaiNH(sao), duong_dan: T.ketNoi.duong_dan,
      cau: !sao.length ? 'Chưa liên kết — MIMI chưa đọc được tiền ra vào.' : `${sao.length} tài khoản đọc sao kê${sao.some((k) => k.status === 'needs_relink') ? ', có tài khoản cần đăng nhập lại' : ''}.`,
    },
    {
      khoa: 'casso', ten: 'Casso', loai: 'ngan_hang', trang_thai: trangThaiNH(qr), duong_dan: T.ketNoi.duong_dan,
      cau: !qr.length ? 'Chưa bật nhận tiền bằng mã QR.' : `${qr.length} tài khoản nhận tiền QR.`,
    },
    {
      khoa: 'tong_cuc_thue', ten: 'Tổng cục Thuế', loai: 'thue', trang_thai: trangThaiNH(gdt), duong_dan: T.ketNoi.duong_dan,
      cau: !gdt.length ? 'Chưa kết nối — chưa lấy được hoá đơn điện tử.' : 'Đang lấy hoá đơn điện tử.',
    },
  ];
  const ai = (ncc: string, ten: string, coApi: boolean): KetNoiHienThi => {
    const kn = d.ketNoiAi.find((k) => k.nha_cung_cap === ncc && k.trang_thai !== 'da_go');
    const coFile = d.nhapFileAi.includes(ncc);
    if (kn) {
      return {
        khoa: ncc, ten, loai: 'ai', duong_dan: T.chiPhiAi.duong_dan,
        trang_thai: kn.trang_thai === 'loi' ? 'can_xu_ly' : 'dang_chay',
        cau: kn.trang_thai === 'loi' ? (kn.loi_cuoi ?? 'Lần lấy số liệu gần nhất bị lỗi.') : kn.dong_bo_luc ? `Tự lấy số liệu, lần gần nhất ${ngayVN(kn.dong_bo_luc)}.` : 'Tự lấy số liệu.',
      };
    }
    if (coFile) return { khoa: ncc, ten, loai: 'ai', duong_dan: T.chiPhiAi.duong_dan, trang_thai: 'chi_nhap_file', cau: 'Đang dùng file chi phí bạn tải lên.' };
    return {
      khoa: ncc, ten, loai: 'ai', duong_dan: T.chiPhiAi.duong_dan, trang_thai: 'chua_ket_noi',
      cau: coApi ? 'Chưa kết nối.' : 'Google chưa có API chi phí — tải file từ Cloud Billing.',
    };
  };
  ds.push(ai('openai', 'OpenAI', true), ai('anthropic', 'Anthropic', true), ai('gemini', 'Google AI', false), ai('openrouter', 'OpenRouter', true));
  return ds;
}

const TEN_TRANG_THAI_KN: Record<KetNoiHienThi['trang_thai'], string> = {
  dang_chay: 'Đang chạy', can_xu_ly: 'Cần xử lý', chua_ket_noi: 'Chưa kết nối', chi_nhap_file: 'Nhập file',
};

export function tatCaKetNoi(d: DuLieu): KetQuaNangLuc {
  const ds = danhSachKetNoi(d);
  const chay = ds.filter((k) => k.trang_thai === 'dang_chay' || k.trang_thai === 'chi_nhap_file').length;
  const canXuLy = ds.filter((k) => k.trang_thai === 'can_xu_ly');
  const cau = `${chay}/${ds.length} kết nối đang có số liệu.${canXuLy.length ? ` Cần xử lý: ${canXuLy.map((k) => k.ten).join(', ')}.` : ''}`;
  return kq('tat_ca_ket_noi', 'ket_noi', cau, {
    the: [{
      loai: 'bang', tieu_de: 'Kết nối của công ty',
      cot: [{ nhan: 'Kết nối', don_vi: 'chu' }, { nhan: 'Trạng thái', don_vi: 'chu' }, { nhan: 'Ghi chú', don_vi: 'chu' }],
      dong: ds.map((k) => [k.ten, TEN_TRANG_THAI_KN[k.trang_thai], k.cau]),
    }],
    nguon: [N.ketNoi],
    trang: [T.ketNoi, T.chiPhiAi],
  });
}

// ── Việc cần làm hôm nay ─────────────────────────────────────────────────────

export function viecHomNay(d: DuLieu): ViecHomNay[] {
  const viec: ViecHomNay[] = [];
  const cho = d.yeuCau.filter((y) => y.trang_thai === 'cho_duyet');
  if (cho.length) {
    viec.push({
      khoa: 'cho_duyet', nhom: 'tro_ly', muc_do: 'can_chu_y', hoi: 'Khoản nào đang chờ tôi duyệt?',
      cau: `${cho.length} khoản chi đang chờ bạn duyệt, tổng ${vnd(cho.reduce((s, y) => s + y.so_tien, 0))}`,
    });
  }
  if (d.chiPhiAi.length) {
    const c = tinhChiPhiAiThang(d);
    if (c.canhBao) {
      viec.push({
        khoa: 'ngan_sach_ai', nhom: 'ai_token', muc_do: 'can_chu_y', hoi: 'Tìm các khoản chi AI vượt ngân sách và đề xuất model rẻ hơn.',
        cau: c.vuot ? `Chi phí AI tháng này đã vượt ngân sách (${c.pct}%)` : `Chi phí AI tháng này đã dùng ${c.pct}% ngân sách`,
      });
    }
  }
  const tre = d.hoaDonBan.filter((h) => laQuaHan(h, d.homNay));
  if (tre.length) {
    viec.push({
      khoa: 'qua_han', nhom: 'chung_tu', muc_do: 'can_chu_y', hoi: 'Khách nào đang nợ quá hạn?',
      cau: `${tre.length} hoá đơn bán ra quá hạn, tổng ${vnd(tre.reduce((s, h) => s + Number(h.total), 0))}`,
    });
  }
  const canLai = d.ketNoiNganHang.filter((k) => k.status === 'needs_relink');
  if (canLai.length) {
    viec.push({
      khoa: 'dang_nhap_lai', nhom: 'ngan_hang', muc_do: 'can_chu_y', hoi: 'Kết nối ngân hàng đang thế nào?',
      cau: `${canLai[0].bank_name ?? 'Một ngân hàng'}${canLai.length > 1 ? ` và ${canLai.length - 1} kết nối khác` : ''} cần đăng nhập lại`,
    });
  }
  if (d.giaoDich.length) {
    const ct = thieuChungTu(d);
    const muc = ct.the.find((t) => t.loai === 'so_lieu');
    const thieu = muc && muc.loai === 'so_lieu' ? Number(muc.muc.find((m) => m.nhan === 'Chưa có hoá đơn điện tử')?.gia_tri ?? 0) : 0;
    if (thieu > 0) {
      viec.push({
        khoa: 'thieu_chung_tu', nhom: 'chung_tu', muc_do: 'thong_tin', hoi: 'Khoản chi nào chưa có chứng từ?',
        cau: `${vnd(thieu)} chi phí ${d.kyChungTu.nhan} chưa có hoá đơn điện tử`,
      });
    }
  } else if (!d.ketNoiNganHang.length) {
    viec.push({ khoa: 'chua_ngan_hang', nhom: 'ket_noi', muc_do: 'thong_tin', hoi: 'Kết nối ngân hàng đang thế nào?', cau: 'Chưa liên kết ngân hàng — MIMI chưa đọc được tiền ra vào' });
  }
  return viec.slice(0, 6);
}

// ── Ba thẻ phân tích ở màn đầu ───────────────────────────────────────────────

/** "YYYY-MM" của tháng lùi `n` tháng từ ngày `ymd`. */
export function thangLui(ymd: string, n: number): string {
  const [y, m] = ymd.split('-').map(Number);
  const tong = y * 12 + (m - 1) - n;
  return `${Math.floor(tong / 12)}-${pad((tong % 12) + 1)}`;
}

const tron2 = (n: number) => Math.round(n * 100) / 100;

export const SO_THANG_BIEU_DO_AI = 5;

export function phanTichNhanh(d: DuLieu): PhanTichNhanh {
  // Chi phí AI tháng này, so cùng kỳ, và 5 tháng gần nhất.
  let chi_phi_ai: PhanTichNhanh['chi_phi_ai'] = null;
  if (d.chiPhiAi.length) {
    const c = tinhChiPhiAiThang(d);
    const loc = locTrungNguon(d.chiPhiAi);
    const denTruoc = cungNgayThangTruoc(d.homNay);
    const coThangTruoc = loc.some((r) => r.ngay.slice(0, 7) === denTruoc.slice(0, 7));
    const truoc = loc.filter((r) => r.ngay >= dauThang(denTruoc) && r.ngay <= denTruoc).reduce((s, r) => s + Number(r.so_tien_usd), 0);
    const theo_thang = [];
    for (let i = SO_THANG_BIEU_DO_AI - 1; i >= 0; i--) {
      const khoa = thangLui(d.homNay, i);
      const cua = loc.filter((r) => r.ngay.slice(0, 7) === khoa);
      theo_thang.push({ khoa, nhan: `T${Number(khoa.slice(5, 7))}`, usd: cua.length ? tron2(cua.reduce((s, r) => s + Number(r.so_tien_usd), 0)) : null });
    }
    chi_phi_ai = {
      thang_nay_usd: tron2(c.tong),
      thay_doi_phan_tram: coThangTruoc && truoc > 0 ? Math.round(((c.tong - truoc) / truoc) * 100) : null,
      ngan_sach_usd: c.ns?.han_muc_thang_usd ?? null,
      phan_tram_ngan_sach: c.pct,
      theo_thang,
    };
  }

  // Đề xuất tối ưu: chỉ những ý có dữ liệu đứng sau.
  const y: string[] = [];
  let tiet_kiem_usd: number | null = null;
  let hoi = 'Tìm các khoản chi AI vượt ngân sách và đề xuất model rẻ hơn.';
  const tok = trong30Ngay(d);
  if (tok.length && d.bangGia.length) {
    const r = deXuatModelReHon(tok, d.bangGia);
    if (r.de_xuat.length) {
      tiet_kiem_usd = tron2(r.de_xuat.reduce((s, x) => s + x.tiet_kiem_usd, 0));
      y.push(`Chuyển ${r.de_xuat[0].model} sang ${r.de_xuat[0].thay_bang.ten} cho việc không cần model mạnh nhất`);
    }
  } else if (d.chiPhiAi.length && !tok.length) {
    y.push('Bật tự động lấy số liệu để MIMI đọc số token và tìm model rẻ hơn');
  }
  if (d.chiPhiAi.length && !d.nganSachAi) y.push('Đặt ngân sách AI tháng để được cảnh báo trước khi vượt');
  const trung = d.giaoDich.length ? nghiTraTrung(d) : [];
  if (trung.length) {
    y.push(`Kiểm ${trung.length} cặp khoản chi có thể bị trả trùng (${vnd(trung.reduce((s, c) => s + doLonTien(c.b), 0))})`);
    if (tiet_kiem_usd === null) hoi = 'Có khoản nào bị trả trùng không?';
  }
  if (!y.length) {
    y.push(d.chiPhiAi.length || d.giaoDich.length
      ? 'Chưa thấy chỗ nào cần tối ưu ngay từ số liệu hiện có'
      : 'Liên kết ngân hàng hoặc tải chi phí AI để MIMI bắt đầu tìm chỗ tiết kiệm');
  }

  // Cần bạn xác nhận: khoản chờ lâu nhất trước.
  const cho = d.yeuCau.filter((q) => q.trang_thai === 'cho_duyet').sort((a, b) => a.created_at.localeCompare(b.created_at));
  const deXuat = cho.length ? yeuCauChoDuyet(d).de_xuat : [];
  const ten = tenAgent(d);

  return {
    chi_phi_ai,
    toi_uu: { y: y.slice(0, 3), tiet_kiem_usd, hoi },
    can_xac_nhan: {
      so_khoan: cho.length,
      tong_tien: cho.reduce((s, q) => s + q.so_tien, 0),
      muc: cho.slice(0, 3).map((q) => ({
        yeu_cau_id: q.id,
        muc_dich: q.muc_dich,
        nguoi_nhan: q.ten_nguoi_nhan || 'Người nhận chưa rõ tên',
        agent: ten(q.tac_tu_id),
        so_tien: q.so_tien,
        ngay: q.created_at.slice(0, 10),
        duyet: deXuat.find((x) => x.khoa === `duyet:${q.id}`) ?? null,
      })),
    },
  };
}

// ── Thuế: nghĩa vụ suy ra từ hệ luật ─────────────────────────────────────────

/**
 * "Năm nay tôi phải khai thuế gì?" — chạy hệ luật (`_shared/luat/he-luat.ts`) trên doanh thu
 * thật, trả nghĩa vụ kèm hạn, mẫu tờ khai và chuỗi nhân quả. Số thuế cụ thể do trang Tờ khai
 * điền vào mẫu; ở đây trả lời bằng lời và mở đường sang đó.
 */
export function nghiaVuThue(d: DuLieu): KetQuaNangLuc {
  if (!d.thue) {
    return kq('nghia_vu_thue', 'chung_tu', 'Chưa đọc được hồ sơ thuế của công ty. Mở Tờ khai thuế để MIMI hỏi vài điều còn thiếu (hộ kinh doanh hay doanh nghiệp, nhóm ngành).', {
      nguon: [N.khoLuat], trang: [T.toKhai],
    });
  }
  const { suKien, canhBao, canCuDaKiem, canCuHetHieuLuc = {}, chuaKiemHieuLuc = false } = d.thue;
  const sl = suyLuanThue(suKien);
  const chinh = sl.ket_luan.filter((k) => k.loai === 'mien' || k.loai === 'nghia_vu' || k.loai === 'chua_ho_tro');
  const giaiThich = sl.ket_luan.find((k) => k.id === 'giai_thich_hai_thue');
  const chuaKiem = [...new Set(sl.ket_luan.flatMap((k) => k.can_cu))].filter((c) => canCuDaKiem[c] === false);

  const the: The[] = [];
  if (sl.doanh_thu_nam !== null) {
    the.push({
      loai: 'so_lieu', tieu_de: `Doanh thu năm ${suKien.nam}`, muc: [
        { nhan: sl.tam_tinh ? 'Lũy kế tới nay' : 'Cả năm', gia_tri: sl.doanh_thu_nam, don_vi: 'vnd', ghi_chu: `Nguồn: ${TEN_NGUON_DOANH_THU[suKien.nguonDoanhThu ?? 'tu_khai']}` },
        // Ngưỡng là con số của pháp luật: bằng chứng là chính điều khoản, không phải bản ghi của công ty.
        { nhan: 'Ngưỡng phải nộp thuế', gia_tri: NGUONG_THUE, don_vi: 'vnd', ghi_chu: 'NĐ 68/2026 sửa bởi NĐ 141/2026', bang_chung: [{ loai: 'van_ban_luat', id: ['nd68_d3_k1', 'nd141_d1_k1'], so_ban_ghi: 2 }] },
        {
          nhan: sl.doanh_thu_nam > NGUONG_THUE ? 'Đã vượt' : 'Còn cách ngưỡng',
          gia_tri: Math.abs(NGUONG_THUE - sl.doanh_thu_nam),
          don_vi: 'vnd',
          can_chu_y: sl.doanh_thu_nam > NGUONG_THUE,
        },
      ],
    });
  }
  if (chinh.length) {
    the.push({
      loai: 'bang', tieu_de: 'Nghĩa vụ thuế của bạn',
      cot: [{ nhan: 'Việc', don_vi: 'chu' }, { nhan: 'Mẫu', don_vi: 'chu' }, { nhan: 'Hạn', don_vi: 'ngay' }],
      dong: chinh.slice(0, 8).map((k) => [k.cau, k.mau ?? '—', (k.han ?? [])[0] ?? '—']),
      con_lai: Math.max(0, chinh.length - 8),
    });
  }
  // Chuỗi suy luận: người dùng hỏi thì MIMI trả lời kèm căn cứ, thay vì bày sẵn trên trang Tờ khai.
  // Chỉ trích câu đã có trong CAN_CU (đã đối chiếu nguyên văn với kho Công báo); câu nào máy chủ
  // chưa đối chiếu được lúc chạy thì ghi rõ ngay trên dòng đó.
  const coCanCu = sl.ket_luan.filter((k) => k.can_cu.some((c) => CAN_CU[c]));
  if (coCanCu.length) {
    the.push({
      loai: 'bang', tieu_de: 'Vì sao MIMI kết luận vậy',
      cot: [{ nhan: 'Kết luận', don_vi: 'chu' }, { nhan: 'Căn cứ', don_vi: 'chu' }, { nhan: 'Trích nguyên văn', don_vi: 'chu' }],
      dong: coCanCu.slice(0, 8).map((k) => {
        const ids = k.can_cu.filter((c) => CAN_CU[c]);
        return [
          k.cau,
          ids.map((c) => `${CAN_CU[c].van_ban} · ${CAN_CU[c].vi_tri}${canCuDaKiem[c] === false ? ' (chưa đối chiếu)' : ''}`).join('; '),
          `“${CAN_CU[ids[0]].trich}”`,
        ];
      }),
      con_lai: Math.max(0, coCanCu.length - 8),
    });
  }
  if (giaiThich) the.push({ loai: 'ghi_chu', muc_do: 'thong_tin', cau: giaiThich.cau });
  // P0-003: căn cứ thuộc văn bản đã hết hiệu lực thì kết luận dựa vào nó chưa chắc — nói ra.
  const hetHL = [...new Set(sl.ket_luan.flatMap((k) => k.can_cu))].filter((c) => canCuHetHieuLuc[c]);
  if (hetHL.length) {
    the.unshift({
      loai: 'ghi_chu', muc_do: 'can_chu_y',
      cau: `Chưa chắc: ${hetHL.map((c) => `${CAN_CU[c]?.van_ban ?? c} — ${canCuHetHieuLuc[c]}`).join('; ')}. Kết luận dựa trên căn cứ này cần kế toán kiểm lại.`,
    });
  }
  if (chuaKiemHieuLuc) the.push({ loai: 'ghi_chu', muc_do: 'can_chu_y', cau: 'Chưa kiểm được tình trạng hiệu lực của các văn bản căn cứ lúc này.' });
  for (const c of canhBao.slice(0, 2)) the.push({ loai: 'ghi_chu', muc_do: 'can_chu_y', cau: c });
  for (const t of sl.thieu.slice(0, 3)) the.push({ loai: 'ghi_chu', muc_do: 'can_chu_y', cau: t.cau });
  if (chuaKiem.length) {
    the.push({ loai: 'ghi_chu', muc_do: 'can_chu_y', cau: `${chuaKiem.length} căn cứ chưa đối chiếu được với kho văn bản — mở Tờ khai thuế để đọc bản gốc.` });
  }

  // P0-003: kết luận nào cũng nói nó dựa trên phiên bản quy tắc nào, ở ngày nào.
  the.push({ loai: 'ghi_chu', muc_do: 'thong_tin', cau: `Kết luận theo bộ quy tắc thuế MIMI phiên bản ${PHIEN_BAN_HE_LUAT}, tình trạng hiệu lực tính tại ngày ${ngayVN(d.homNay)}.` });

  const tomTat = chinh.length
    ? `${chinh.map((k) => k.cau).join(' ')}${sl.doanh_thu_nam !== null ? ` Doanh thu năm ${suKien.nam}${sl.tam_tinh ? ' tới nay' : ''}: ${vnd(sl.doanh_thu_nam)}.` : ''}`
    : 'Chưa đủ dữ liệu để kết luận nghĩa vụ thuế. Mở Tờ khai thuế để bổ sung hồ sơ thuế.';

  return kq('nghia_vu_thue', 'chung_tu', tomTat, {
    the,
    de_xuat: [{
      khoa: 'mo_to_khai',
      loai: 'mo_trang',
      nhan: 'Mở Tờ khai thuế',
      mo_ta: 'Xem bản nháp tờ khai MIMI soạn từ doanh thu thật, in hoặc lưu lại.',
      tham_so: { duong_dan: '/dashboard/to-khai' },
    }],
    nguon: [N.khoLuat, N.hoaDonVao, N.giaoDich],
    trang: [T.toKhai],
  });
}

/**
 * "951 triệu này là doanh thu gì? Tôi đủ dữ liệu để khai chưa?" — đọc thẳng bộ chia theo nhóm hoạt
 * động (`doanh-thu/theo-hoat-dong.ts`), không tính lại. Trả lời theo thứ tự: con số → căn cứ → còn
 * thiếu gì → việc cần làm. Phần chưa rõ nhóm luôn được gọi tên, không bị gộp vào ngành đăng ký.
 */
export function doanhThuTheoHoatDong(d: DuLieu): KetQuaNangLuc {
  const chia = d.thue?.suKien.hoatDong ?? null;
  if (!d.thue || !chia || chia.tong <= 0) {
    return kq('doanh_thu_theo_hoat_dong', 'chung_tu', 'Chưa có doanh thu năm nay để chia theo nhóm hoạt động. Kết nối ngân hàng, Tổng cục Thuế, hoặc nhập doanh thu ở Tờ khai thuế.', {
      trang: [T.toKhai],
    });
  }
  const sk = d.thue.suKien;
  const cr = chia.nhom.chua_ro;
  const da = chia.tong - cr.so_tien;
  const nguon = TEN_NGUON_DOANH_THU[sk.nguonDoanhThu ?? 'tu_khai'];
  const dong = HOAT_DONG.filter((n) => chia.nhom[n].so_tien > 0)
    .map((n) => [TEN_NHOM_NGANH[n], chia.nhom[n].so_tien, chia.nhom[n].so_khoan] as O[]);
  if (cr.so_tien > 0) dong.push(['Chưa xác định nhóm', cr.so_tien, cr.so_khoan]);

  const the: The[] = [{
    loai: 'bang', tieu_de: `Doanh thu năm ${sk.nam} theo nhóm hoạt động`,
    cot: [{ nhan: 'Nhóm', don_vi: 'chu' }, { nhan: 'Số tiền', don_vi: 'vnd' }, { nhan: 'Số khoản', don_vi: 'so' }],
    dong,
    con_lai: 0,
  }];
  the.push({ loai: 'ghi_chu', muc_do: 'thong_tin', cau: `Nguồn: ${nguon}. Nhóm của từng khoản do bạn xác nhận; ngành đăng ký trong hồ sơ thuế chỉ dùng làm gợi ý.` });

  const tomTat = cr.so_tien > 0
    ? `${vnd(chia.tong)} là doanh thu năm ${sk.nam} (${nguon}). ${vnd(da)} đã xác định nhóm hoạt động; ${vnd(cr.so_tien)} (${cr.so_khoan} khoản) chưa xác định. MIMI chưa hoàn thiện được tờ khai vì nhóm hoạt động quyết định dòng và tỷ lệ thuế — MIMI không tự xếp phần chưa rõ vào ngành đăng ký.`
    : `${vnd(chia.tong)} doanh thu năm ${sk.nam} (${nguon}) đã có nhóm hoạt động đủ cho mọi khoản. Phần nhóm hoạt động không còn chặn tờ khai.`;

  return kq('doanh_thu_theo_hoat_dong', 'chung_tu', tomTat, {
    the,
    de_xuat: cr.so_tien > 0 ? [{
      khoa: 'xep_nhom_hoat_dong',
      loai: 'mo_trang',
      nhan: `Xếp nhóm ${cr.so_khoan} khoản`,
      mo_ta: 'Mở Tờ khai thuế: xếp từng khoản, hoặc một lần cho mọi khoản nếu bạn chỉ làm một việc.',
      tham_so: { duong_dan: '/dashboard/to-khai' },
    }] : [],
    nguon: [N.giaoDich, N.khoLuat],
    trang: [T.toKhai],
  });
}

/**
 * "Tạm ngừng kinh doanh cần hồ sơ gì, nộp ở đâu?" — đọc thủ tục hành chính thuế đã cào từ
 * dichvucong.gdt.gov.vn. Trích đúng điều cổng ghi, kèm đường dẫn gốc và NGÀY LẤY; nói rõ căn cứ pháp
 * lý trên trang thủ tục có thể chậm hơn văn bản mới — không tự sửa hộ cổng.
 */
export function thuTucThue(d: DuLieu): KetQuaNangLuc {
  if (d.thuTuc === null) {
    return kq('thu_tuc_thue', 'chung_tu', 'Chưa tra được danh mục thủ tục thuế lúc này. Thử lại sau ít phút.', {});
  }
  const ds = d.thuTuc ?? [];
  if (!ds.length) {
    return kq('thu_tuc_thue', 'chung_tu', 'MIMI chưa tìm thấy thủ tục thuế khớp câu hỏi này trong danh mục của Cổng dịch vụ công thuế. Bạn thử nói rõ việc muốn làm (ví dụ "tạm ngừng kinh doanh", "hoàn thuế nộp thừa") hoặc tên mẫu tờ khai.', {});
  }
  const t = ds[0];
  const ngay = t.lay_luc ? ngayVN(t.lay_luc.slice(0, 10)) : '';
  const the: The[] = [{
    loai: 'bang', tieu_de: t.ten,
    cot: [{ nhan: 'Mục', don_vi: 'chu' }, { nhan: 'Cổng dịch vụ công ghi', don_vi: 'chu' }],
    dong: ([
      ['Mã thủ tục', t.ma],
      ['Mẫu tờ khai', t.mau_to_khai.length ? t.mau_to_khai.join(', ') : '—'],
      ['Ai thực hiện', cat(t.doi_tuong, 300)],
      ['Hồ sơ gồm', cat(t.thanh_phan_ho_so, 1200)],
      ['Nộp ở đâu, bằng cách nào', cat(t.cach_thuc, 600)],
      ['Cơ quan giải quyết', cat(t.co_quan, 200)],
      ['Kết quả', cat(t.ket_qua, 400)],
      ['Trang gốc', t.nguon],
    ] as [string, string | null][]).filter(([, v]) => !!v).map(([k, v]) => [k, v as string]),
  }];
  the.push({
    loai: 'ghi_chu', muc_do: 'can_chu_y',
    cau: `Trích từ Cổng dịch vụ công thuế, lấy ngày ${ngay}. Căn cứ pháp lý trên trang thủ tục có thể chưa cập nhật văn bản mới nhất (ví dụ các thông tư năm 2026) — MIMI đối chiếu văn bản trong kho Công báo khi soạn tờ khai.`,
  });
  if (ds.length > 1) {
    the.push({ loai: 'ghi_chu', muc_do: 'thong_tin', cau: `Có thể bạn cần: ${ds.slice(1).map((x) => `${x.ten} (${x.ma})`).join('; ')}.` });
  }
  return kq('thu_tuc_thue', 'chung_tu', `Thủ tục phù hợp nhất: ${t.ten} (mã ${t.ma}).${t.mau_to_khai.length ? ` Mẫu dùng: ${t.mau_to_khai.join(', ')}.` : ''}`, {
    the,
    nguon: [{ ten: 'Cổng dịch vụ công thuế', mo_ta: `Danh mục thủ tục hành chính thuế, dichvucong.gdt.gov.vn, lấy ngày ${ngay}.` }],
  });
}

// ── Danh mục năng lực ────────────────────────────────────────────────────────

// ── Hạn thuế kế tiếp và việc ưu tiên (25/09/2026) ────────────────────────────
/*
 * Trước ngày này "Kỳ thuế tiếp theo là khi nào?" và "Tôi cần chuẩn bị gì trước hạn thuế?" rơi vào
 * tra cứu Công báo (trích luật chung, không nói hạn của chính công ty), còn "Nêu 3 việc ưu tiên cần
 * làm tuần này" thì "chưa hiểu". Hai năng lực dưới đây đọc CÙNG lịch với Nhắc thuế và Tổng quan.
 */

const cauConLaiMoc = (m: MocThue) =>
  m.con_lai === null ? 'chưa xác định hạn' : m.con_lai < 0 ? `đã qua hạn ${-m.con_lai} ngày` : m.con_lai === 0 ? 'hôm nay là hạn' : `còn ${m.con_lai} ngày`;
const TEN_TRANG_THAI_MOC: Record<MocThue['trang_thai'], string> = {
  phai_lam: 'Phải làm', can_xac_minh: 'Cần xác minh', khong_ap_dung: 'Không áp dụng',
};

export function chuanBiHanThue(d: DuLieu): KetQuaNangLuc {
  const l = d.lichThue;
  if (!l) {
    return kq('chuan_bi_han_thue', 'chung_tu', 'Chưa đọc được lịch thuế của công ty lúc này. Thử lại sau ít phút, hoặc mở Nhắc thuế.', {
      nguon: [N.lichThue], trang: [T.nhacThue],
    });
  }
  const moc = mocKeTiep(l.lich);
  const conHieuLuc = l.lich.filter((m) => m.trang_thai !== 'khong_ap_dung' && (m.con_lai === null || m.con_lai >= 0));
  const the: The[] = [];
  if (conHieuLuc.length) {
    the.push({
      loai: 'bang', tieu_de: 'Lịch thuế của bạn',
      cot: [{ nhan: 'Việc', don_vi: 'chu' }, { nhan: 'Loại', don_vi: 'chu' }, { nhan: 'Hạn', don_vi: 'ngay' }, { nhan: 'Trạng thái', don_vi: 'chu' }],
      dong: conHieuLuc.slice(0, 6).map((m) => [m.ten, TEN_LOAI_MOC[m.loai], m.han, TEN_TRANG_THAI_MOC[m.trang_thai]]),
      con_lai: Math.max(0, conHieuLuc.length - 6),
    });
  }
  // Chuẩn bị: chỉ những việc suy ra được từ dữ liệu, theo thứ tự làm.
  const chuanBi: string[] = [];
  if (moc?.cau_hoi) chuanBi.push(`Trả lời trước: ${moc.cau_hoi} MIMI chưa coi việc này là bắt buộc khi chưa biết.`);
  if (l.soChuaRo > 0) chuanBi.push(`Xác nhận ${l.soChuaRo} khoản tiền vào (${vnd(l.tienChuaRo)}) chưa rõ có phải doanh thu — khoản chưa rõ đang được tính như doanh thu.`);
  if (moc && moc.loai !== 'thong_bao') chuanBi.push('Mở Tờ khai thuế, kiểm bản nháp MIMI soạn từ sao kê và hoá đơn. MIMI không tự nộp — bạn xác nhận từng tờ trước khi nộp.');
  for (const c of chuanBi) the.push({ loai: 'ghi_chu', muc_do: 'can_chu_y', cau: c });
  const hoiThem = l.lich.filter((m) => m !== moc && m.trang_thai === 'can_xac_minh' && m.cau_hoi).map((m) => m.cau_hoi as string);
  for (const c of [...new Set(hoiThem)].slice(0, 2)) the.push({ loai: 'ghi_chu', muc_do: 'thong_tin', cau: `Còn cần biết: ${c}` });

  const tom = moc
    ? `Việc thuế kế tiếp: ${moc.ten} — hạn ${ngayVN(moc.han as string)} (${cauConLaiMoc(moc)}). ${moc.vi_sao}`
    : 'MIMI chưa thấy việc thuế nào có hạn chắc chắn cho công ty bạn. Các mục còn thiếu dữ kiện nằm trong bảng bên dưới.';
  const ss = l.sanSang;
  if (ss) {
    the.unshift({ loai: 'so_lieu', tieu_de: 'Sẵn sàng khai thuế', muc: [
      { nhan: 'Doanh thu năm nay đã biết', gia_tri: ss.doanh_thu_biet, don_vi: 'vnd', ghi_chu: 'Tiền vào trừ khoản đã xác nhận không phải doanh thu' },
      { nhan: 'Đã xác nhận là doanh thu', gia_tri: ss.doanh_thu_da_phan_loai, don_vi: 'vnd' },
      { nhan: `Chưa phân loại (${ss.so_khoan_chua_phan_loai} khoản)`, gia_tri: ss.doanh_thu_chua_phan_loai, don_vi: 'vnd', can_chu_y: ss.doanh_thu_chua_phan_loai > 0 },
    ] });
    for (const g of ss.giay_to_thieu) the.push({ loai: 'ghi_chu', muc_do: 'can_chu_y', cau: `Còn thiếu: ${g}` });
    the.push({ loai: 'ghi_chu', muc_do: 'thong_tin', cau: `Độ tin cậy: ${ss.do_tin_cay === 'cao' ? 'cao' : ss.do_tin_cay === 'trung_binh' ? 'trung bình' : 'thấp'}.` });
  }
  return kq('chuan_bi_han_thue', 'chung_tu', tom, {
    the, nguon: [N.lichThue], trang: [T.nhacThue, T.toKhai],
    de_xuat: [deXuatLuu('tax_readiness_pack', 'Lưu gói sẵn sàng khai thuế', 'MIMI dựng gói sẵn sàng khai thuế từ lịch thuế và doanh thu mới nhất, lưu vào Tài liệu & Chứng từ.')],
  });
}

const SO_CHU: Record<string, number> = { mot: 1, hai: 2, ba: 3, bon: 4, tu: 4, nam: 5, sau: 6, bay: 7, tam: 8, chin: 9, muoi: 10 };
/** "Nêu 3 việc", "ba việc ưu tiên" → 3. Không nói số thì 3. Tối đa 10. */
export function soViecDuocHoi(cau: string | undefined): number {
  const s = ` ${(cau ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;
  const m = s.match(/ (\d{1,2}|mot|hai|ba|bon|tu|nam|sau|bay|tam|chin|muoi) (viec|dieu|muc)\b/);
  const n = m ? (/^\d/.test(m[1]) ? Number(m[1]) : SO_CHU[m[1]]) : 3;
  return Math.min(10, Math.max(1, n || 3));
}

/**
 * Mức ưu tiên — Prompt 4 mục 30. Điểm cách nhau đủ xa để mức cao luôn đứng trước mức thấp.
 *   P0 chặn pháp lý / tài chính — cơ quan thuế đang chờ trả lời;
 *   P1 việc đang mở (hồ sơ việc) — còn câu phải trả lời hoặc bước làm được ngay;
 *   P2 hạn thuế trong 7 ngày;
 *   P3 số liệu chưa rõ (tiền vào chưa phân loại, việc cần xử lý);
 *   P4 thiết lập (kết nối, hồ sơ).
 */
export type MucUuTien = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
const DIEM_MUC: Record<MucUuTien, number> = { P0: 1000, P1: 800, P2: 600, P3: 400, P4: 200 };

export function viecUuTien(d: DuLieu): KetQuaNangLuc {
  const n = soViecDuocHoi(d.cauHoi);
  const ung: { cau: string; vi_sao: string; muc: MucUuTien; diem: number }[] = [];
  const them = (muc: MucUuTien, cau: string, vi_sao: string, phu = 0) => {
    if (!ung.some((x) => x.cau === cau)) ung.push({ cau, vi_sao, muc, diem: DIEM_MUC[muc] + phu });
  };

  for (const h of d.hanhTrinhMo ?? []) {
    const hanTraLoi = h.du_kien.han_tra_loi?.gia_tri;
    const conNgay = hanTraLoi ? soNgayGiua(d.homNay, hanTraLoi) : null;
    const viec = h.cau_hoi ? `${h.tieu_de}: trả lời "${h.cau_hoi.cau}"` : (() => { const b = buocTiepTheo(h.buoc); return b ? `${h.tieu_de}: ${b.tieu_de}` : null; })();
    if (!viec) continue;
    if (h.loai === 'authority_response') {
      them('P0', viec, conNgay === null ? 'Cơ quan thuế đang chờ bạn trả lời' : conNgay < 0 ? `Hạn trả lời ghi trên thông báo đã qua ${-conNgay} ngày` : `Hạn trả lời ${ngayVN(hanTraLoi as string)}, còn ${conNgay} ngày`, conNgay === null ? 0 : Math.max(0, 100 - conNgay));
    } else {
      them('P1', viec, h.trang_thai === 'cho_ben_ngoai' ? 'Việc đang mở, chờ kết quả' : 'Việc đang mở');
    }
  }

  const l = d.lichThue;
  if (l) {
    // Hạn trong 7 ngày tới: tuần này. Hạn đã qua KHÔNG tự coi là quá hạn — MIMI không biết bạn đã nộp chưa.
    for (const m of l.lich) {
      if (m.trang_thai === 'khong_ap_dung' || m.con_lai === null || m.con_lai < 0 || m.con_lai > 7) continue;
      them('P2', m.trang_thai === 'can_xac_minh' ? `Xác minh: ${m.ten}${m.cau_hoi ? ` — ${m.cau_hoi}` : ''}` : m.ten,
        `Hạn ${ngayVN(m.han as string)}, ${cauConLaiMoc(m)}`, 100 - m.con_lai);
    }
    if (l.soChuaRo > 0) {
      const hanGan = l.lich.some((m) => m.trang_thai !== 'khong_ap_dung' && m.con_lai !== null && m.con_lai >= 0 && m.con_lai <= 14);
      them('P3', `Xác nhận ${l.soChuaRo} khoản tiền vào chưa rõ (${vnd(l.tienChuaRo)})`,
        hanGan ? 'Sắp tới hạn thuế; khoản chưa rõ đang được tính như doanh thu' : 'Khoản chưa rõ đang được tính như doanh thu', hanGan ? 50 : 0);
    }
  }
  for (const v of viecHomNay(d)) {
    them(v.muc_do === 'can_chu_y' ? 'P3' : 'P4', v.cau, v.muc_do === 'can_chu_y' ? 'Cần xử lý' : 'Nên làm');
  }
  ung.sort((a, b) => b.diem - a.diem);
  const chon = ung.slice(0, n);
  const the: The[] = [];
  if (chon.length) {
    the.push({
      loai: 'bang', tieu_de: `${chon.length} việc ưu tiên`,
      cot: [{ nhan: 'Việc', don_vi: 'chu' }, { nhan: 'Mức', don_vi: 'chu' }, { nhan: 'Vì sao', don_vi: 'chu' }],
      dong: chon.map((v, i) => [`${i + 1}. ${v.cau}`, v.muc, v.vi_sao]),
    });
  }
  const tom = !chon.length
    ? 'MIMI không thấy việc nào cần làm gấp trên dữ liệu hiện có.'
    : chon.length < n
      ? `MIMI chỉ thấy ${chon.length} việc có căn cứ trên dữ liệu — không thêm việc cho đủ ${n}.`
      : `${n} việc ưu tiên, xếp theo mức (P0 gấp nhất) và hạn:`;
  return kq('viec_uu_tien', 'tro_ly', tom, { the, nguon: [N.hanhTrinh, N.lichThue, N.giaoDich, N.yeuCau, N.hoaDonBan, N.ketNoi], trang: [T.viecCanLam, T.nhacThue] });
}

// ── Hành trình có hướng dẫn (Prompt 4 mục 3–6) ──────────────────────────────
const TEN_TT_BUOC: Record<string, string> = {
  not_started: 'Chưa bắt đầu', blocked: 'Chờ dữ kiện', ready: 'Làm được ngay', in_progress: 'Đang làm',
  waiting_external: 'Chờ cơ quan / bên ngoài', completed: 'Xong', skipped: 'Không áp dụng',
};

export function hanhTrinhNL(d: DuLieu): KetQuaNangLuc {
  const h = d.hanhTrinh;
  if (!h) return kq('hanh_trinh', 'tro_ly', 'MIMI chưa nhận ra việc bạn muốn làm. Nói rõ hơn, ví dụ "Tôi muốn tạm ngừng kinh doanh".', { trang: [T.viecCanLam] });
  const mau = MAU_HANH_TRINH[h.loai];
  const buoc = h.ht?.buoc ?? tinhBuoc(h.loai, {});
  const cau = h.ht ? h.ht.cau_hoi : cauHoiTiepTheo(buoc, {});
  const tiep = buocTiepTheo(buoc);
  const the: The[] = [];
  if (cau) the.push({ loai: 'ghi_chu', muc_do: 'can_chu_y', cau: `${cau.cau} (${cau.vi_sao})` });
  else if (tiep) the.push({ loai: 'ghi_chu', muc_do: 'can_chu_y', cau: `Việc làm tiếp: ${tiep.tieu_de}. ${tiep.mo_ta}` });
  the.push({
    loai: 'bang', tieu_de: `Các bước: ${mau.tieu_de}`,
    cot: [{ nhan: 'Bước', don_vi: 'chu' }, { nhan: 'Trạng thái', don_vi: 'chu' }],
    dong: buoc.map((b) => [`${b.thu_tu}. ${b.tieu_de}`, TEN_TT_BUOC[b.trang_thai] ?? b.trang_thai]),
  });
  if (d.thuTuc?.length) {
    the.push({
      loai: 'bang', tieu_de: 'Thủ tục khớp trên Cổng dịch vụ công thuế',
      cot: [{ nhan: 'Thủ tục', don_vi: 'chu' }, { nhan: 'Mẫu', don_vi: 'chu' }],
      dong: d.thuTuc.slice(0, 3).map((x) => [x.ten, (x.mau_to_khai ?? []).join(', ') || '—']),
    });
  }
  if (!h.luu) the.push({ loai: 'ghi_chu', muc_do: 'thong_tin', cau: 'Vai trò của bạn xem được hướng dẫn nhưng không mở việc được. Chủ doanh nghiệp, quản trị hoặc kế toán mở việc này.' });
  the.push({ loai: 'ghi_chu', muc_do: 'thong_tin', cau: 'MIMI chuẩn bị, bạn quyết. MIMI không nộp, không ký thay.' });
  const tom = !h.luu ? `Hướng dẫn: ${mau.tieu_de}.`
    : h.moi ? `MIMI đã mở việc "${mau.tieu_de}" và sẽ hỏi từng câu một.` : `Tiếp tục việc "${mau.tieu_de}".`;
  return kq('hanh_trinh', 'tro_ly', `${tom}${cau ? ` Câu đầu tiên: ${cau.cau}` : ''}`, {
    the, nguon: [N.hanhTrinh], trang: [h.ht ? { nhan: 'Mở việc này', duong_dan: `/dashboard/viec-can-lam?ht=${h.ht.id}` } : T.viecCanLam],
  });
}

// ── Phân tích chênh lệch hai kỳ (Prompt 4 mục 7–12) ──────────────────────────
const NHAN_DL: Record<string, string> = { su_that: 'Sự thật', suy_luan: 'Suy luận', chua_biet: 'Chưa biết' };

function deXuatLuu(loai: string, nhan: string, mo_ta: string): DeXuat {
  return { khoa: `tao_tai_lieu:${loai}`, loai: 'tao_tai_lieu', nhan, mo_ta, tham_so: { loai } };
}

export function phanTichChenhLechNL(d: DuLieu, nangLuc = 'phan_tich_chenh_lech'): KetQuaNangLuc {
  if (!d.giaoDich.length && !d.hoaDonBan.length) return kq(nangLuc, 'bao_cao', CHUA_CO_SAO_KE, { nguon: [N.giaoDich], trang: [T.ketNoi] });
  const pt = phanTichChenhLech({ cauHoi: d.cauHoi ?? '', homNay: d.homNay, giaoDich: d.giaoDich, hoaDonBan: d.hoaDonBan });
  const gdTheoId = new Map(d.giaoDich.map((g) => [g.id, g]));
  const hdTheoId = new Map(d.hoaDonBan.map((h) => [h.id, h]));
  const bcGd = (ids: string[]) => bangChung('giao_dich', ids.map((i) => gdTheoId.get(i)!).filter(Boolean));
  const bcHd = (ids: string[]) => bangChung('hoa_don_ban', ids.map((i) => hdTheoId.get(i)!).filter(Boolean));
  const the: The[] = [
    { loai: 'so_lieu', tieu_de: `Số chính: ${pt.ky_nay.nhan} so với ${pt.ky_truoc.nhan}`, muc: [
      { nhan: `Hoá đơn bán ra kỳ này (trước: ${vnd(pt.truoc.hoa_don)})`, gia_tri: pt.nay.hoa_don, don_vi: 'vnd', bang_chung: bcHd(pt.bang_chung.hoa_don_nay) },
      { nhan: `Tiền vào ngân hàng kỳ này (trước: ${vnd(pt.truoc.tien_vao)})`, gia_tri: pt.nay.tien_vao, don_vi: 'vnd', bang_chung: bcGd(pt.bang_chung.giao_dich_nay) },
      { nhan: `Tiền ra ngân hàng kỳ này (trước: ${vnd(pt.truoc.tien_ra)})`, gia_tri: pt.nay.tien_ra, don_vi: 'vnd', bang_chung: bcGd(pt.bang_chung.giao_dich_nay) },
      { nhan: `Dòng tiền ròng kỳ này (trước: ${vnd(pt.truoc.rong)})`, gia_tri: pt.nay.rong, don_vi: 'vnd', can_chu_y: pt.nay.rong < 0, bang_chung: bcGd(pt.bang_chung.giao_dich_nay) },
      { nhan: 'Hoá đơn kỳ này chưa thu', gia_tri: pt.nay.chua_thu, don_vi: 'vnd', bang_chung: bcHd(pt.bang_chung.hoa_don_nay) },
    ] },
    { loai: 'bang', tieu_de: 'Vì sao thay đổi', cot: [{ nhan: 'Loại', don_vi: 'chu' }, { nhan: 'Nội dung', don_vi: 'chu' }],
      dong: pt.dong_luc.map((x) => [NHAN_DL[x.nhan], x.cau]),
      bang_chung: gopBangChung(bcGd(pt.dong_luc.flatMap((x) => x.giao_dich ?? [])), bcHd(pt.dong_luc.flatMap((x) => x.hoa_don ?? []))) },
  ];
  for (const r of pt.rui_ro) the.push({ loai: 'ghi_chu', muc_do: 'can_chu_y', cau: `Rủi ro: ${r}` });
  for (const r of pt.can_xem_lai) the.push({ loai: 'ghi_chu', muc_do: 'can_chu_y', cau: `Cần xem lại: ${r}` });
  for (const r of pt.viec_tiep) the.push({ loai: 'ghi_chu', muc_do: 'thong_tin', cau: `Việc tiếp: ${r}` });
  the.push({ loai: 'ghi_chu', muc_do: 'thong_tin', cau: `Giả định: ${pt.gia_dinh.join(' ')} Phương pháp: ${pt.phuong_phap} Độ phủ: ${pt.do_phu} Độ tin cậy: ${pt.do_tin_cay === 'cao' ? 'cao' : pt.do_tin_cay === 'trung_binh' ? 'trung bình' : 'thấp'}.` });
  const giai = pt.dong_luc.filter((x) => x.nhan === 'suy_luan')[0]?.cau;
  const tom = `So ${pt.ky_nay.nhan} với cùng kỳ tháng trước: hoá đơn bán ra ${vnd(pt.truoc.hoa_don)} → ${vnd(pt.nay.hoa_don)}, dòng tiền ròng ${vnd(pt.truoc.rong)} → ${vnd(pt.nay.rong)}.${giai ? ` ${giai}` : ''}`;
  return kq(nangLuc, 'bao_cao', tom, {
    the, nguon: [N.giaoDich, N.hoaDonBan], trang: [T.baoCao],
    de_xuat: [deXuatLuu('financial_review_memo', 'Lưu thành báo cáo phân tích', 'MIMI dựng lại báo cáo phân tích tháng này từ dữ liệu mới nhất và lưu vào Tài liệu & Chứng từ (bản MIMI soạn, không phải báo cáo tài chính).')],
  });
}

/** "Soạn báo cáo tài chính ngắn về tháng này" — cùng phân tích, mở đầu bằng lời nói thẳng đây không phải BCTC. */
export function baoCaoThang(d: DuLieu): KetQuaNangLuc {
  const r = phanTichChenhLechNL(d, 'bao_cao_thang');
  return {
    ...r,
    tom_tat: `MIMI chưa có sổ kế toán nên không lập báo cáo tài chính. Đây là báo cáo phân tích quản trị từ sao kê và hoá đơn. ${r.tom_tat}`,
  };
}

export interface NangLuc {
  nhom: NhomNangLuc;
  /** Mô tả cho mô hình chọn công cụ — viết như dặn một nhân viên kế toán. */
  mo_ta: string;
  can: NguonCan[];
  chay: (d: DuLieu) => KetQuaNangLuc;
}

// ── Tra cứu văn bản (chuyển từ function `chat` cũ, MIMI-P0-001) ─────────────

/** Văn bản ban hành trước năm này: nói rõ có thể đã bị sửa đổi hoặc thay thế. */
const NAM_LUAT_CAN_CANH_BAO = 2024;

/**
 * Trích nguyên văn các đoạn luật kho tìm được cho câu hỏi — không diễn giải, không kết luận.
 *
 * Đây là thông tin tham khảo (đặc tả mục 2.2): kho chưa theo dõi đầy đủ tình trạng hiệu lực,
 * nên câu trả lời ghi rõ ngày ban hành, ngày hiệu lực, và cảnh báo văn bản cũ. Kho lỗi (null)
 * khác kho không có đoạn nào ([]): lỗi thì nói chưa tra được, không nói "không có quy định".
 */
export function traCuuLuat(d: DuLieu): KetQuaNangLuc {
  if (d.khoLuat === null) {
    return kq('tra_cuu_luat', 'chung_tu', 'Chưa tra được kho văn bản lúc này. Thử lại sau ít phút — MIMI không trả lời câu hỏi pháp lý khi chưa đọc được nguồn.', {
      nguon: [N.khoLuat],
    });
  }
  const bangDaLoai = (): The => ({
    loai: 'bang', tieu_de: 'Văn bản tìm thấy nhưng đã hết hiệu lực (không dùng làm căn cứ)',
    cot: [{ nhan: 'Văn bản', don_vi: 'chu' }, { nhan: 'Tình trạng', don_vi: 'chu' }],
    dong: d.khoLuatDaLoai.map((v) => [v.van_ban, v.nhan]),
  });
  if (!d.khoLuat.length) {
    // P0-003: chỉ còn văn bản hết hiệu lực → chưa đủ căn cứ, không suy đoán từ văn bản cũ.
    if (d.khoLuatDaLoai.length) {
      return kq('tra_cuu_luat', 'chung_tu', `Chưa đủ căn cứ: kho chỉ tìm thấy ${d.khoLuatDaLoai.length} văn bản đã hết hiệu lực cho câu hỏi này, không có văn bản đang áp dụng. MIMI không trả lời từ văn bản cũ — hỏi kế toán hoặc cơ quan thuế quản lý trực tiếp.`, {
        the: [bangDaLoai()],
        nguon: [N.khoLuat],
      });
    }
    return kq('tra_cuu_luat', 'chung_tu', 'Kho văn bản của MIMI chưa có đoạn nói về việc này. Bạn nên hỏi kế toán hoặc cơ quan thuế quản lý trực tiếp.', {
      nguon: [N.khoLuat],
    });
  }
  const cu = d.khoLuat.filter((v) => v.ngay_ban_hanh && Number(v.ngay_ban_hanh.slice(0, 4)) < NAM_LUAT_CAN_CANH_BAO);
  const the: The[] = [{
    loai: 'bang', tieu_de: 'Đoạn văn bản tìm thấy (trích nguyên văn)',
    cot: [
      { nhan: 'Văn bản', don_vi: 'chu' }, { nhan: 'Ban hành', don_vi: 'ngay' }, { nhan: 'Có hiệu lực từ', don_vi: 'ngay' },
      { nhan: 'Tình trạng', don_vi: 'chu' }, { nhan: 'Trích', don_vi: 'chu' }, { nhan: 'Bản gốc', don_vi: 'chu' },
    ],
    dong: d.khoLuat.map((v) => [
      [[v.loai, v.so_hieu].filter(Boolean).join(' ') || v.ten, v.nhan].filter(Boolean).join(' · '),
      v.ngay_ban_hanh,
      v.ngay_hieu_luc,
      v.hieu_luc ?? 'Chưa kiểm được tình trạng hiệu lực',
      `“${v.noi_dung.length > 400 ? `${v.noi_dung.slice(0, 400)}…` : v.noi_dung}”`,
      v.url,
    ]),
  }];
  the.push({
    loai: 'ghi_chu', muc_do: 'can_chu_y',
    cau: 'Đây là trích dẫn để tham khảo, chưa phải tư vấn: kho chưa theo dõi đầy đủ tình trạng hiệu lực. Đối chiếu bản gốc và hỏi kế toán hoặc cơ quan thuế trước khi nộp hồ sơ.',
  });
  if (d.khoLuatChuaKiemHieuLuc) {
    the.push({ loai: 'ghi_chu', muc_do: 'can_chu_y', cau: 'Chưa kiểm được tình trạng hiệu lực lúc này — đừng dựa vào các đoạn trên khi chưa đối chiếu bản gốc.' });
  }
  if (cu.length) {
    the.push({ loai: 'ghi_chu', muc_do: 'can_chu_y', cau: `${cu.length} văn bản ban hành trước ${NAM_LUAT_CAN_CANH_BAO}: kho chưa ghi nhận văn bản bãi bỏ, nhưng vẫn có thể đã bị sửa đổi.` });
  }
  if (d.khoLuatDaLoai.length) the.push(bangDaLoai());
  return kq('tra_cuu_luat', 'chung_tu', `MIMI tìm thấy ${d.khoLuat.length} đoạn văn bản liên quan trong Công báo. Dưới đây là trích nguyên văn kèm ngày ban hành và hiệu lực — chỉ để tham khảo.`, {
    the,
    nguon: [N.khoLuat],
  });
}

// ── TCCN-01: giao dịch bất thường ────────────────────────────────────────────

export const TEN_DAU_HIEU: Record<MaDauHieu, string> = {
  doi_so_tai_khoan: 'Người nhận đổi số tài khoản',
  nguoi_nhan_moi_so_lon: 'Người nhận mới, số tiền lớn',
  vuot_muc_quen: 'Vượt xa mức thường trả',
  tach_nho: 'Nhiều khoản trong một ngày',
  noi_dung_lua_dao: 'Nội dung giống kịch bản lừa đảo',
  bi_ep_buoc: 'Hoàn cảnh giống kịch bản lừa đảo',
};

/** Id trỏ về giao dịch sao kê; khoản đã duyệt trong MIMI (`yc:`) không phải giao dịch. */
const laIdGiaoDich = (id: string) => !id.startsWith('yc:');

export function giaoDichBatThuong(d: DuLieu): KetQuaNangLuc {
  const bt = d.batThuong;
  const nguon = [N.giaoDich, N.batThuong];
  if (!bt) return kq('giao_dich_bat_thuong', 'ngan_hang', 'Chưa đọc được lịch sử chi để kiểm dấu hiệu bất thường. Thử lại sau ít phút.', { nguon });
  if (!bt.so_khoan_da_xet) return kq('giao_dich_bat_thuong', 'ngan_hang', CHUA_CO_SAO_KE, { nguon, trang: [T.ketNoi] });

  const gioiHan: The = {
    loai: 'ghi_chu', muc_do: 'thong_tin',
    cau: 'MIMI kiểm bằng luật cố định và nói rõ từng lý do; đây là dấu hiệu, chưa phải kết luận. MIMI không chặn được lệnh chuyển trong app ngân hàng — khoản chi xin qua MIMI thì bị dừng lại ngay lúc bấm Duyệt nếu có dấu hiệu mức cao. Sao kê chỉ mới bằng lần đồng bộ gần nhất.',
  };
  const thieuLichSu: The[] = bt.lich_su_du ? [] : [{
    loai: 'ghi_chu', muc_do: 'can_chu_y',
    cau: 'MIMI chỉ đọc được một phần lịch sử chi 180 ngày, nên có thể báo "người nhận mới" cho người bạn đã từng trả.',
  }];

  if (!bt.canh_bao.length) {
    return kq('giao_dich_bat_thuong', 'ngan_hang', `Không thấy dấu hiệu bất thường trong các khoản chi 30 ngày qua (đã so với ${bt.so_khoan_da_xet} khoản chi trong 180 ngày).`, {
      the: [...thieuLichSu, gioiHan], nguon,
    });
  }

  const cao = bt.canh_bao.filter((c) => c.muc_do === 'cao');
  const vua = bt.canh_bao.filter((c) => c.muc_do === 'trung_binh');
  const idCua = (ds: CanhBao[]) => ds.map((c) => c.khoan).filter((k) => laIdGiaoDich(k.id));
  const dau = bt.canh_bao[0];
  return kq(
    'giao_dich_bat_thuong', 'ngan_hang',
    `${bt.canh_bao.length} khoản chi 30 ngày qua có dấu hiệu bất thường${cao.length ? `, ${cao.length} khoản mức cao` : ''}. Đáng xem nhất: ${vnd(dau.khoan.so_tien)} cho ${dau.khoan.ten_nguoi_nhan ?? 'người nhận chưa rõ tên'} ngày ${ngayVN(dau.khoan.ngay)} — ${dau.dau_hieu[0].cau}`,
    {
      the: [
        {
          loai: 'so_lieu', tieu_de: 'Dấu hiệu 30 ngày qua', muc: [
            { nhan: 'Khoản mức cao', gia_tri: cao.length, don_vi: 'so', can_chu_y: cao.length > 0, bang_chung: bangChung('giao_dich', idCua(cao)) },
            { nhan: 'Khoản cần để ý', gia_tri: vua.length, don_vi: 'so', bang_chung: bangChung('giao_dich', idCua(vua)) },
          ],
        },
        {
          loai: 'bang', tieu_de: 'Khoản có dấu hiệu',
          cot: [
            { nhan: 'Ngày', don_vi: 'ngay' }, { nhan: 'Người nhận', don_vi: 'chu' }, { nhan: 'Số tiền', don_vi: 'vnd' },
            { nhan: 'Mức', don_vi: 'chu' }, { nhan: 'Dấu hiệu', don_vi: 'chu' },
          ],
          dong: bt.canh_bao.slice(0, 8).map((c) => [
            c.khoan.ngay, c.khoan.ten_nguoi_nhan ?? 'Không rõ người nhận', c.khoan.so_tien,
            c.muc_do === 'cao' ? 'Cao' : 'Cần để ý', c.dau_hieu.map((x) => TEN_DAU_HIEU[x.ma]).join('; '),
          ] as O[]),
          con_lai: Math.max(0, bt.canh_bao.length - 8),
          bang_chung: bangChung('giao_dich', idCua(bt.canh_bao)),
        },
        ...bt.canh_bao.slice(0, 3).map((c): The => ({ loai: 'ghi_chu', muc_do: c.muc_do === 'cao' ? 'can_chu_y' : 'thong_tin', cau: `${ngayVN(c.khoan.ngay)} · ${vnd(c.khoan.so_tien)}: ${c.dau_hieu.map((x) => x.cau).join(' ')}` })),
        ...thieuLichSu,
        gioiHan,
      ],
      nguon,
      trang: [T.giaoDich, T.yeuCau],
    },
  );
}

// ── Giấy tờ hành chính (TCCN-12, công văn thuế) ──────────────────────────────

/**
 * Gợi ý giấy tờ phù hợp với câu hỏi và mở trang soạn. Không đọc dữ liệu: bản nháp được điền ở
 * trang Soạn giấy tờ, từ hồ sơ công ty và giao dịch người dùng chọn. Không trích điều luật —
 * kho đã đối chiếu chưa có văn bản cho các việc này (xem `giay-to/loai.ts`).
 */
function goiYGiayTo(nangLuc: string, loai: LoaiGiayTo) {
  return (): KetQuaNangLuc => {
    const mt = MO_TA_GIAY_TO[loai];
    return kq(nangLuc, 'chung_tu', `MIMI soạn được bản nháp "${mt.ten}" gửi ${mt.gui_toi.toLowerCase()}. Dùng khi: ${mt.khi_nao} MIMI điền sẵn tên, mã số thuế${loai === 'don_tra_soat' ? ' và thông tin giao dịch' : ''}; bạn đọc lại, ký và tự gửi.`, {
      the: [{ loai: 'ghi_chu', muc_do: 'can_chu_y', cau: mt.luu_y }],
      de_xuat: [{
        khoa: `giay_to:${loai}`, loai: 'mo_trang', nhan: `Soạn ${mt.ten.toLowerCase()}`,
        mo_ta: `Mở trang Soạn giấy tờ với mẫu ${mt.ten.toLowerCase()}.`, tham_so: { duong_dan: duongDanGiayTo(loai) },
      }],
    });
  };
}

/**
 * Người dùng đang MÔ TẢ một cuộc gọi hối chuyển tiền — chưa chuyển đồng nào.
 *
 * VÌ SAO KHÔNG ĐỂ `giao_dich_bat_thuong` TRẢ LỜI CÂU NÀY. Năng lực đó quét sao kê đã
 * có. Người đang bị gọi thì chưa chuyển gì, nên sao kê sạch, và câu trả lời sẽ là
 * "Không thấy dấu hiệu bất thường trong 30 ngày qua" — lời trấn an sai, gửi đúng
 * người đang bị lừa, đúng lúc họ sắp bấm chuyển. Đó là câu trả lời tệ nhất có thể.
 *
 * Tìm ra 24/09/2026 khi thử trợ lý bằng câu hỏi của chuyên gia: "Có người gọi xưng
 * công an bảo chuyển tiền vào tài khoản tạm giữ" còn tệ hơn thế — nó được định
 * tuyến tới BẢNG DÒNG TIỀN, vì "chuyển tiền vào tài khoản" chứa "tiền vào".
 *
 * Câu trả lời ở đây là một nguyên tắc, không dẫn số văn bản nào, vì nguyên tắc đó
 * đúng bất kể văn bản nào đang hiệu lực: cơ quan nhà nước không làm việc qua điện
 * thoại để yêu cầu chuyển tiền.
 */
function dangBiHoiChuyenTien(): KetQuaNangLuc {
  return kq('dang_bi_hoi_chuyen_tien', 'ngan_hang',
    'Dừng lại, chưa chuyển. Đây là kịch bản lừa đảo đang rất phổ biến.', {
      the: [
        { loai: 'ghi_chu', muc_do: 'can_chu_y', cau: 'Công an, viện kiểm sát, toà án và ngân hàng không làm việc qua điện thoại để yêu cầu bạn chuyển tiền — kể cả vào "tài khoản tạm giữ", "tài khoản an toàn" hay để "xác minh". Cúp máy.' },
        { loai: 'ghi_chu', muc_do: 'can_chu_y', cau: 'Gọi cho một người thân bạn tin, hoặc tự đến trụ sở công an gần nhất để hỏi. Đừng gọi lại số vừa gọi cho bạn.' },
        { loai: 'ghi_chu', muc_do: 'thong_tin', cau: 'Nếu đã lỡ chuyển: gọi ngay tổng đài ngân hàng của bạn để yêu cầu phong toả, rồi báo công an.' },
      ],
      de_xuat: [{
        khoa: 'mo_trang:kiem_truoc_khi_chuyen', loai: 'mo_trang', nhan: 'Kiểm tra khoản chuyển này',
        mo_ta: 'So số tài khoản và nội dung với lịch sử chi của bạn trước khi chuyển.',
        tham_so: { duong_dan: '/dashboard/kiem-truoc-khi-chuyen' },
      }],
    });
}

/**
 * Hỏi cách khai thấp doanh thu, né thuế: từ chối, nói lý do, chỉ đường hợp pháp.
 *
 * Trước 24/09/2026 câu "Làm sao khai doanh thu thấp hơn thực tế cho đỡ thuế?" được
 * định tuyến tới bảng dòng tiền — không giúp trốn thuế, nhưng cũng không từ chối,
 * không nói vì sao. Một kế toán thật sẽ nói thẳng là không, rồi chỉ cách hợp pháp.
 */
function tuChoiKhaiSai(): KetQuaNangLuc {
  return kq('tu_choi_khai_sai', 'chung_tu', 'MIMI không giúp khai doanh thu thấp hơn thực tế.', {
    the: [
      { loai: 'ghi_chu', muc_do: 'can_chu_y', cau: 'Khai thiếu doanh thu là hành vi trốn thuế: cơ quan thuế có thể truy thu, xử phạt và tính tiền chậm nộp. Hoá đơn điện tử và sao kê ngân hàng giờ đều đối chiếu được với nhau.' },
      { loai: 'ghi_chu', muc_do: 'thong_tin', cau: 'Nếu thuế đang nặng, có những cách hợp pháp: xem mình có thuộc diện miễn không, chọn đúng cách tính thuế, và khi nộp theo thu nhập thì tính đủ các khoản chi có chứng từ.' },
    ],
    de_xuat: [{
      khoa: 'mo_trang:chung_tu', loai: 'mo_trang', nhan: 'Xem khoản chi còn thiếu chứng từ',
      mo_ta: 'Khoản chi có chứng từ hợp lệ là cách hợp pháp để giảm thuế khi nộp theo thu nhập.',
      tham_so: { duong_dan: '/dashboard/chung-tu' },
    }],
  });
}

/**
 * Những mảng MIMI CHƯA làm. Nói thẳng là chưa làm, thay vì trả lời một câu khác.
 *
 * Trước 24/09/2026, "Công nợ phải trả nhà cung cấp còn bao nhiêu?" được định tuyến
 * tới công nợ PHẢI THU — con số ngược nghĩa với câu hỏi, và người không làm kế toán
 * không nhận ra. "Dự báo dòng tiền 3 tháng tới" trả về bảng dòng tiền QUÁ KHỨ. Một
 * câu trả lời trông như trả lời nhưng cho câu hỏi khác còn tệ hơn "chưa làm được".
 */
/**
 * "Tiền con chuyển về cho ba mẹ có bị tính là doanh thu không?"
 *
 * Câu hỏi thật, gom từ một người dùng ngày 24/09/2026: hộ kinh doanh của ba mẹ lớn
 * tuổi, luật vừa đổi sang tính theo doanh thu thực tế, đã mở tài khoản ngân hàng
 * nhưng "giờ quy ra sao kê không biết sao kê thế nào, mới ước lượng thử thôi".
 *
 * Trả lời thẳng là KHÔNG — rồi nói điều quan trọng hơn: trên sao kê, tiền người nhà
 * chuyển, tiền vay, tiền góp vốn trông y hệt tiền khách trả.
 *
 * ĐỌC NỘI DUNG CHUYỂN KHOẢN (24/09/2026). Có sao kê thì MIMI không nói chung chung nữa:
 * đọc tên người chuyển và nội dung của từng khoản tiền vào năm nay (`phan-loai/tien-vao.ts`)
 * rồi chỉ ra đúng những dòng giống tiền vay, người nhà, góp vốn, hoàn tiền, đặt cọc — kèm
 * nguyên văn nội dung để người dùng tự nhận ra.
 *
 * CHỈ RA, KHÔNG TỰ TRỪ. "Hoàn tiền" có thể là khách trả nốt, "đặt cọc" có thể là tiền bán hàng
 * trả trước. Trừ nhầm một khoản bán hàng là khai thiếu doanh thu — trái luật; để sót một khoản
 * vay chỉ làm con số cao hơn thật. Nên tổng ước từ sao kê vẫn cộng các khoản này, và câu trả lời
 * nói rõ điều đó cùng đường sửa số trên trang Tờ khai.
 */
function tienVaoKhongPhaiDoanhThu(d: DuLieu): KetQuaNangLuc {
  const TRA_LOI = 'Không. Tiền người nhà chuyển cho, tiền vay, tiền góp vốn không phải doanh thu bán hàng.';
  const NOI_TC = { loai: 'ghi_chu' as const, muc_do: 'thong_tin' as const, cau: 'Cách chắc nhất: nối Tổng cục Thuế. Khi có hoá đơn điện tử, MIMI tính doanh thu từ hoá đơn — đó là số của chính cơ quan thuế — thay vì từ sao kê.' };
  const DX_TC = {
    khoa: 'mo_trang:ket_noi', loai: 'mo_trang' as const, nhan: 'Nối Tổng cục Thuế',
    mo_ta: 'Doanh thu tính từ hoá đơn điện tử thay vì cộng mọi khoản tiền vào tài khoản.',
    tham_so: { duong_dan: '/dashboard/ket-noi' },
  };

  if (!d.giaoDich.length) {
    return kq('tien_vao_khong_phai_doanh_thu', 'chung_tu', TRA_LOI, {
      the: [
        { loai: 'ghi_chu', muc_do: 'can_chu_y', cau: 'Nhưng trên sao kê chúng trông y hệt tiền khách trả. Nếu ước doanh thu bằng cách cộng hết tiền vào tài khoản, con số sẽ cao hơn thật — có thể cao tới mức tưởng đã vượt mốc phải nộp thuế trong khi chưa vượt.' },
        { loai: 'ghi_chu', muc_do: 'thong_tin', cau: 'Liên kết ngân hàng thì MIMI đọc nội dung từng khoản chuyển khoản và chỉ ra khoản nào giống tiền vay, tiền người nhà, tiền góp vốn.' },
        NOI_TC,
      ],
      de_xuat: [DX_TC],
      nguon: [N.giaoDich],
    });
  }

  const dauNam = `${d.homNay.slice(0, 4)}-01-01`;
  const vao = d.giaoDich.filter((t) => chieuTien(t) === 'vao' && t.transaction_date >= dauNam && t.transaction_date <= d.homNay);
  const nghi = vao
    .map((t) => ({ t, g: goiYTienVao(t) }))
    .filter((x): x is { t: GiaoDichTL; g: GoiYTienVao } => x.g !== null)
    .sort((a, b) => doLonTien(b.t) - doLonTien(a.t));
  const tuNgay = vao.reduce((m, t) => (t.transaction_date < m ? t.transaction_date : m), d.homNay);
  const khoang = `từ ${ngayVN(tuNgay)} tới ${ngayVN(d.homNay)}`;

  if (!nghi.length) {
    return kq('tien_vao_khong_phai_doanh_thu', 'chung_tu',
      `${TRA_LOI} MIMI đã đọc nội dung ${vao.length} khoản tiền vào ${khoang}, chưa thấy khoản nào ghi rõ là tiền vay, người nhà chuyển hay góp vốn.`, {
        the: [
          { loai: 'ghi_chu', muc_do: 'can_chu_y', cau: 'MIMI chỉ nhận ra được khi nội dung chuyển khoản ghi rõ (ví dụ "giải ngân HĐTD", "con gửi ba mẹ", "góp vốn"). Khoản ghi trống hay chỉ ghi "chuyển khoản" thì vẫn bị cộng vào doanh thu ước từ sao kê — bạn nhớ khoản nào thì sửa số trên trang Tờ khai.' },
          NOI_TC,
        ],
        de_xuat: [DX_TC],
        nguon: [N.giaoDich],
        trang: [T.toKhai],
      });
  }

  const tong = nghi.reduce((s, x) => s + doLonTien(x.t), 0);
  const ds = nghi.map((x) => x.t);
  const theoLoai = new Map<LoaiTienVao, number>();
  for (const x of nghi) theoLoai.set(x.g.loai, (theoLoai.get(x.g.loai) ?? 0) + 1);
  const loaiNoi = [...theoLoai.entries()].map(([l, n]) => `${n} khoản ${TEN_LOAI_TIEN_VAO[l].toLowerCase()}`).join(', ');
  const SO_DONG = 10;

  return kq('tien_vao_khong_phai_doanh_thu', 'chung_tu',
    `${TRA_LOI} Đọc nội dung chuyển khoản ${khoang}, MIMI thấy ${nghi.length} khoản tiền vào có vẻ không phải tiền bán hàng (${loaiNoi}), cộng lại ${vnd(tong)}.`, {
      the: [
        {
          loai: 'so_lieu',
          tieu_de: `Tiền vào năm ${d.homNay.slice(0, 4)} có vẻ không phải doanh thu`,
          muc: [
            { nhan: 'Có vẻ không phải doanh thu', gia_tri: tong, don_vi: 'vnd', can_chu_y: true, bang_chung: bangChung('giao_dich', ds) },
            { nhan: 'Số khoản', gia_tri: nghi.length, don_vi: 'so', bang_chung: bangChung('giao_dich', ds) },
          ],
        },
        {
          loai: 'bang',
          tieu_de: 'Từng khoản, kèm nguyên văn nội dung',
          cot: [
            { nhan: 'Ngày', don_vi: 'ngay' }, { nhan: 'Số tiền', don_vi: 'vnd' },
            { nhan: 'Nội dung chuyển khoản', don_vi: 'chu' }, { nhan: 'Có vẻ là', don_vi: 'chu' },
          ],
          dong: nghi.slice(0, SO_DONG).map((x) => [
            x.t.transaction_date, doLonTien(x.t),
            [x.t.counter_account_name, x.t.payment_reference].filter(Boolean).join(' — ') || x.t.merchant_name || '—',
            TEN_LOAI_TIEN_VAO[x.g.loai],
          ] as O[]),
          con_lai: Math.max(0, nghi.length - SO_DONG),
          bang_chung: bangChung('giao_dich', ds),
        },
        { loai: 'ghi_chu', muc_do: 'can_chu_y', cau: 'MIMI chỉ chỉ ra, không tự trừ: doanh thu ước từ sao kê vẫn đang cộng các khoản này cho tới khi bạn xác nhận. "Hoàn tiền" có thể là khách trả nốt, "đặt cọc" có thể là tiền bán hàng trả trước — trừ nhầm một khoản bán hàng là khai thiếu. MIMI báo từng khoản trong thông báo để bạn xác nhận một chạm; khoản đã xác nhận được trừ khỏi doanh thu trên tờ khai.' },
        NOI_TC,
      ],
      de_xuat: [
        {
          khoa: 'mo_trang:nhac_thue', loai: 'mo_trang', nhan: 'Xem thông báo cần xác nhận',
          mo_ta: 'Mỗi khoản MIMI thấy đáng ngờ có một thông báo; xác nhận một chạm, MIMI trừ khỏi doanh thu trên tờ khai.',
          tham_so: { duong_dan: '/dashboard/nhac-thue' },
        },
        DX_TC,
      ],
      nguon: [N.giaoDich],
      trang: [T.toKhai],
    });
}

/**
 * "Tôi ở xa, muốn theo dõi giúp ba mẹ thì làm sao?"
 *
 * Cùng insight trên: người con muốn giúp nhưng "không có ở nhà nhiều, không nắm đủ
 * thông tin để vạch lộ trình giùm ba mẹ". Hai người, hai vai: ba mẹ giữ tài khoản,
 * con có kỹ năng nhưng không có quyền và không có dữ liệu.
 *
 * MIMI đã có sẵn cách làm việc này — mời thành viên — nhưng không ai nói ra. Câu trả
 * lời chỉ đúng một bước ba mẹ phải tự làm (bấm mời), mọi việc còn lại người con làm.
 */
function giupNguoiNha(): KetQuaNangLuc {
  return kq('giup_nguoi_nha', 'tro_ly',
    'Được. Ba mẹ mời bạn vào công ty trên MIMI một lần, sau đó bạn theo dõi từ xa.', {
      the: [
        { loai: 'ghi_chu', muc_do: 'thong_tin', cau: 'Ba mẹ vào Cài đặt → Thành viên → mời email của bạn. Đây là bước duy nhất ba mẹ phải tự làm; bạn ngồi cạnh làm cùng một lần là đủ.' },
        { loai: 'ghi_chu', muc_do: 'thong_tin', cau: 'Chọn vai trò "Kế toán" nếu bạn muốn soạn tờ khai và ghi chứng từ giùm ba mẹ. Chọn "Người xem" nếu chỉ cần theo dõi số liệu và hạn nộp.' },
        { loai: 'ghi_chu', muc_do: 'can_chu_y', cau: 'Cả hai vai trò đều KHÔNG chuyển được tiền và KHÔNG duyệt được khoản chi. Liên kết ngân hàng vẫn phải do chủ tài khoản — ba mẹ — xác nhận bằng mã OTP của họ.' },
      ],
      de_xuat: [{
        khoa: 'mo_trang:thanh_vien', loai: 'mo_trang', nhan: 'Mở trang mời thành viên',
        mo_ta: 'Cài đặt → Thành viên.',
        tham_so: { duong_dan: '/dashboard/settings' },
      }],
    });
}

/**
 * Hai ranh giới cốt lõi của MIMI, nói ra khi người dùng nhờ thẳng.
 *
 * Trước 24/09/2026: "Nộp thuế giùm tôi luôn đi" ra bảng nghĩa vụ thuế mà không một
 * chữ nào nói MIMI không nộp; "Chuyển 50 triệu cho nhà cung cấp giùm tôi" ra "Mình
 * chưa hiểu câu này" — trong khi MIMI hiểu rất rõ, chỉ là không làm việc đó.
 *
 * Người lớn tuổi nhờ MIMI nộp hộ mà không được trả lời rõ thì sẽ tưởng đã nộp. Đó
 * là cách người ta bị phạt nộp chậm mà không biết vì sao.
 */
function khongNopThay(): KetQuaNangLuc {
  return kq('khong_nop_thay', 'chung_tu', 'MIMI không nộp tờ khai hay nộp thuế thay bạn.', {
    the: [
      { loai: 'ghi_chu', muc_do: 'can_chu_y', cau: 'MIMI soạn sẵn bản nháp tờ khai từ hoá đơn và sao kê, rồi mở cổng thuế điện tử. Bạn đọc lại, ký và tự bấm nộp. Chưa bấm nộp trên cổng thuế thì tờ khai chưa được nộp.' },
      { loai: 'ghi_chu', muc_do: 'thong_tin', cau: 'Nếu người nhà làm giùm, họ có thể soạn bản nháp trên MIMI với vai trò Kế toán; việc ký và nộp vẫn do người đứng tên hộ kinh doanh.' },
    ],
    de_xuat: [{
      khoa: 'mo_trang:to_khai', loai: 'mo_trang', nhan: 'Mở trang Soạn tờ khai',
      mo_ta: 'Soạn bản nháp để bạn tự ký và nộp.', tham_so: { duong_dan: '/dashboard/to-khai' },
    }],
  });
}

function khongChuyenTien(): KetQuaNangLuc {
  return kq('khong_chuyen_tien', 'ngan_hang', 'MIMI không chuyển tiền giùm bạn.', {
    the: [
      { loai: 'ghi_chu', muc_do: 'can_chu_y', cau: 'MIMI không giữ tiền và không có quyền chuyển tiền từ tài khoản của bạn. Việc chuyển tiền bạn làm trong ứng dụng ngân hàng của mình.' },
      { loai: 'ghi_chu', muc_do: 'thong_tin', cau: 'Trước khi chuyển, MIMI kiểm tra được số tài khoản và nội dung có khớp với lịch sử trả tiền cho người này không — nhất là khi nhà cung cấp vừa báo đổi số tài khoản.' },
    ],
    de_xuat: [{
      khoa: 'mo_trang:kiem_truoc_khi_chuyen', loai: 'mo_trang', nhan: 'Kiểm tra trước khi chuyển',
      mo_ta: 'So khoản sắp chuyển với lịch sử chi.', tham_so: { duong_dan: '/dashboard/kiem-truoc-khi-chuyen' },
    }],
  });
}

const CHUA_LAM_DUOC: Record<string, { ten: string; thay_vao: string }> = {
  chua_co_cong_no_phai_tra: { ten: 'công nợ phải trả nhà cung cấp', thay_vao: 'MIMI hiện chỉ theo dõi công nợ phải thu — tiền khách còn nợ bạn.' },
  chua_co_ton_kho: { ten: 'hàng tồn kho', thay_vao: 'MIMI hiện chưa có số lượng hàng, chỉ có tiền.' },
  chua_co_khau_hao: { ten: 'khấu hao tài sản', thay_vao: 'MIMI hiện chưa có danh sách tài sản cố định.' },
  chua_co_du_bao: { ten: 'dự báo dòng tiền', thay_vao: 'MIMI hiện chỉ có dòng tiền đã xảy ra, theo tháng.' },
  chua_co_luong: { ten: 'bảng lương', thay_vao: 'MIMI hiện chưa tính lương, bảo hiểm hay thuế thu nhập cho nhân viên.' },
};

function chuaLamDuoc(id: string) {
  return (): KetQuaNangLuc => {
    const m = CHUA_LAM_DUOC[id];
    return kq(id, 'bao_cao', `MIMI chưa theo dõi ${m.ten}.`, {
      the: [
        { loai: 'ghi_chu', muc_do: 'thong_tin', cau: m.thay_vao },
        { loai: 'ghi_chu', muc_do: 'thong_tin', cau: 'MIMI đọc được: tiền vào, tiền ra ngân hàng; hoá đơn điện tử; khoản chi thiếu chứng từ; nghĩa vụ thuế và hạn nộp.' },
      ],
    });
  };
}

export const NANG_LUC: Record<string, NangLuc> = {
  dang_bi_hoi_chuyen_tien: { nhom: 'ngan_hang', can: [], chay: dangBiHoiChuyenTien, mo_ta: 'Người dùng mô tả một cuộc gọi hoặc tin nhắn đang hối chuyển tiền (xưng công an, ngân hàng, tài khoản tạm giữ): cảnh báo dừng lại và chỉ cách kiểm tra. Không quét sao kê, vì người đang bị gọi chưa chuyển gì.' },
  tien_vao_khong_phai_doanh_thu: { nhom: 'chung_tu', can: ['giao_dich'], chay: tienVaoKhongPhaiDoanhThu, mo_ta: 'Hỏi tiền người nhà chuyển, tiền vay, tiền góp vốn có tính là doanh thu không, hoặc nhờ lọc các khoản đó trên sao kê: trả lời thẳng là không, rồi đọc nội dung chuyển khoản của các khoản tiền vào năm nay và chỉ ra khoản nào giống tiền vay, người nhà, góp vốn, hoàn tiền, đặt cọc — chỉ ra, không tự trừ khỏi doanh thu.' },
  giup_nguoi_nha: { nhom: 'tro_ly', can: [], chay: giupNguoiNha, mo_ta: 'Người nhà (thường là con) muốn theo dõi hoặc làm giấy tờ giùm chủ hộ kinh doanh từ xa: cách mời thành viên, chọn vai trò, và những gì vai trò đó không làm được.' },
  khong_nop_thay: { nhom: 'chung_tu', can: [], chay: khongNopThay, mo_ta: 'Người dùng nhờ MIMI nộp tờ khai hoặc nộp thuế giùm: nói rõ MIMI không nộp thay, chỉ soạn bản nháp để người đứng tên tự ký và nộp.' },
  khong_chuyen_tien: { nhom: 'ngan_hang', can: [], chay: khongChuyenTien, mo_ta: 'Người dùng nhờ MIMI chuyển tiền giùm: nói rõ MIMI không giữ và không chuyển tiền, và mời kiểm tra khoản chuyển trước.' },
  tu_choi_khai_sai: { nhom: 'chung_tu', can: [], chay: tuChoiKhaiSai, mo_ta: 'Từ chối giúp khai thấp doanh thu hay né thuế, nói lý do và chỉ cách giảm thuế hợp pháp.' },
  ...Object.fromEntries(Object.entries(CHUA_LAM_DUOC).map(([id, m]) => [id, {
    nhom: 'bao_cao' as NhomNangLuc, can: [], chay: chuaLamDuoc(id),
    mo_ta: `Câu hỏi về ${m.ten} — mảng MIMI chưa làm; nói thẳng là chưa làm thay vì trả lời một câu khác.`,
  }])),
  yeu_cau_cho_duyet: { nhom: 'tro_ly', can: ['yeu_cau'], chay: yeuCauChoDuyet, mo_ta: 'Các khoản chi agent hoặc người dùng xin, đang chờ chủ doanh nghiệp duyệt; kèm đề xuất duyệt/từ chối.' },
  tinh_hinh_agent: { nhom: 'tro_ly', can: ['yeu_cau'], chay: tinhHinhAgent, mo_ta: 'Các agent AI được phép xin chi: trạng thái, đã dùng bao nhiêu hạn mức tháng, agent bị từ chối nhiều.' },
  chi_phi_thang: { nhom: 'chi_phi', can: ['giao_dich'], chay: chiPhiThang, mo_ta: 'Tổng chi qua ngân hàng tháng này so với cùng kỳ tháng trước, và chi nhiều nhất cho ai.' },
  thieu_chung_tu: { nhom: 'chung_tu', can: ['giao_dich', 'hoa_don_vao', 'chung_tu_quet'], chay: thieuChungTu, mo_ta: 'Khoản chi trong kỳ kê khai thuế đang tới hạn chưa có hoá đơn điện tử đầu vào.' },
  hoa_don_qua_han: { nhom: 'chung_tu', can: ['hoa_don_ban'], chay: hoaDonQuaHan, mo_ta: 'Hoá đơn bán ra quá hạn thanh toán và chưa tới hạn (công nợ phải thu).' },
  dong_tien: { nhom: 'ngan_hang', can: ['giao_dich'], chay: dongTien, mo_ta: 'Tiền vào, tiền ra và chênh lệch theo tháng, 6 tháng gần nhất.' },
  doi_soat: { nhom: 'ngan_hang', can: ['giao_dich', 'hoa_don_ban', 'ket_noi_ngan_hang'], chay: doiSoat, mo_ta: 'Tiền về 30 ngày qua có thể khớp với hoá đơn bán ra nào đang chờ thu.' },
  ket_noi_ngan_hang: { nhom: 'ngan_hang', can: ['ket_noi_ngan_hang'], chay: ketNoiNganHang, mo_ta: 'Các kết nối ngân hàng, tài khoản nào cần đăng nhập lại; đề xuất đồng bộ sao kê.' },
  chi_phi_ai: { nhom: 'ai_token', can: ['chi_phi_ai'], chay: chiPhiAi, mo_ta: 'Chi phí OpenAI, Anthropic, Gemini, OpenRouter tháng này so với ngân sách AI, dự kiến cuối tháng, model tốn nhất.' },
  token_ai: { nhom: 'ai_token', can: ['token_ai', 'chi_phi_ai'], chay: tokenAi, mo_ta: 'Số token theo model 30 ngày, tỷ lệ cache, chi phí mỗi triệu token.' },
  model_re_hon: { nhom: 'ai_token', can: ['token_ai', 'bang_gia'], chay: modelReHon, mo_ta: 'Chênh giá token nếu dùng model giá thấp hơn cùng hãng, theo số token thật và bảng giá OpenRouter. Chỉ là chênh giá — chưa đo chất lượng, độ trễ, chi phí gọi lại, nên không phải đề xuất đổi.' },
  bao_cao_tai_chinh: { nhom: 'bao_cao', can: ['giao_dich'], chay: baoCaoTaiChinh, mo_ta: 'Tổng hợp dòng tiền ngân hàng theo tháng: tiền vào, tiền ra, chênh lệch. Không phải doanh thu, lợi nhuận hay báo cáo tài chính — MIMI chưa có sổ kế toán.' },
  phan_tich_tiet_kiem: { nhom: 'bao_cao', can: ['giao_dich', 'token_ai', 'bang_gia'], chay: phanTichTietKiem, mo_ta: 'Chỗ có thể tiết kiệm: khoản chi nghi trả trùng, tiền bớt được nếu đổi model AI.' },
  chuan_bi_han_thue: { nhom: 'chung_tu', can: ['lich_thue'], chay: chuanBiHanThue, mo_ta: 'Hạn thuế kế tiếp CỦA CHÍNH CÔNG TY (kỳ thuế tiếp theo là khi nào, cần chuẩn bị gì trước hạn): việc gì, loại việc (khai, nộp, tạm nộp, thông báo, quyết toán), hạn ngày nào, còn mấy ngày, việc nào còn cần xác minh và câu hỏi còn thiếu. Ưu tiên hơn tra cứu luật cho mọi câu hỏi về hạn của công ty.' },
  viec_uu_tien: { nhom: 'tro_ly', can: ['hanh_trinh', 'lich_thue', 'yeu_cau', 'chi_phi_ai', 'hoa_don_ban', 'ket_noi_ngan_hang', 'giao_dich', 'hoa_don_vao', 'chung_tu_quet'], chay: viecUuTien, mo_ta: 'Người dùng xin N việc ưu tiên cần làm (tuần này, hôm nay): trả đúng N việc xếp theo hạn thuế và mức cần xử lý; có ít hơn N việc có căn cứ thì nói thật, không thêm cho đủ.' },
  hanh_trinh: { nhom: 'tro_ly', can: ['hanh_trinh', 'thu_tuc'], chay: hanhTrinhNL, mo_ta: 'Việc có nhiều bước người dùng muốn làm (vừa mở hộ kinh doanh, tạm ngừng, kinh doanh lại, đóng mã số thuế, giải thể, hoá đơn sai, cơ quan thuế yêu cầu giải trình, thay đổi đăng ký): MIMI mở việc, hỏi từng câu một, liệt kê các bước và thủ tục khớp.' },
  phan_tich_chenh_lech: { nhom: 'bao_cao', can: ['giao_dich', 'hoa_don_ban'], chay: phanTichChenhLechNL, mo_ta: 'Vì sao doanh thu, dòng tiền hay chi phí tháng này thay đổi so với cùng kỳ tháng trước: số chính, nguyên nhân tách sự thật / suy luận / chưa biết, rủi ro, việc cần làm, giả định và độ tin cậy.' },
  bao_cao_thang: { nhom: 'bao_cao', can: ['giao_dich', 'hoa_don_ban'], chay: baoCaoThang, mo_ta: 'Soạn báo cáo ngắn về tháng này: báo cáo phân tích quản trị có nguồn từng số (không phải báo cáo tài chính), lưu được thành tài liệu.' },
  thu_tuc_thue: { nhom: 'chung_tu', can: ['thu_tuc'], chay: thuTucThue, mo_ta: 'Thủ tục hành chính thuế (tạm ngừng kinh doanh, chấm dứt mã số thuế, hoàn thuế, gia hạn, quyết toán, thay đổi đăng ký thuế…): hồ sơ gồm gì, mẫu tờ khai nào, nộp ở đâu, kết quả là gì — theo danh mục trên Cổng dịch vụ công thuế.' },
  doanh_thu_theo_hoat_dong: { nhom: 'chung_tu', can: ['thue'], chay: doanhThuTheoHoatDong, mo_ta: 'Doanh thu năm nay chia theo nhóm hoạt động (phân phối hàng hoá, dịch vụ, cho thuê…) mà người dùng đã xác nhận, phần nào chưa rõ nhóm, và vì sao phần chưa rõ chặn tờ khai. Dùng cho câu hỏi "doanh thu này là gì", "sao cho hết vào 08a", "đủ dữ liệu để khai chưa".' },
  nghia_vu_thue: { nhom: 'chung_tu', can: ['thue'], chay: nghiaVuThue, mo_ta: 'Nghĩa vụ thuế năm nay suy từ doanh thu thật và văn bản pháp luật trong kho: có phải nộp GTGT, TNCN không, dùng mẫu tờ khai nào, hạn nào, kèm trích dẫn.' },
  tra_cuu_luat: { nhom: 'chung_tu', can: ['kho_luat'], chay: traCuuLuat, mo_ta: 'Tìm và trích nguyên văn đoạn Luật, Nghị định, Thông tư trong kho Công báo cho một câu hỏi pháp lý chung (không phải nghĩa vụ thuế của chính công ty). Chỉ tham khảo, kèm ngày ban hành và hiệu lực.' },
  giao_dich_bat_thuong: { nhom: 'ngan_hang', can: ['bat_thuong'], chay: giaoDichBatThuong, mo_ta: 'Khoản chi 30 ngày qua có dấu hiệu bất thường hoặc giống kịch bản lừa đảo: người nhận đổi số tài khoản, người nhận mới với số tiền lớn, vượt xa mức thường trả, nhiều khoản trong một ngày, nội dung giả danh cơ quan nhà nước.' },
  giay_to_tra_soat: { nhom: 'chung_tu', can: [], chay: goiYGiayTo('giay_to_tra_soat', 'don_tra_soat'), mo_ta: 'Soạn đơn đề nghị tra soát gửi ngân hàng khi chuyển nhầm tiền hoặc nghi bị lừa chuyển tiền.' },
  giay_to_giai_trinh: { nhom: 'chung_tu', can: [], chay: goiYGiayTo('giay_to_giai_trinh', 'cong_van_giai_trinh'), mo_ta: 'Soạn công văn giải trình gửi cơ quan thuế khi có thông báo đề nghị giải trình.' },
  giay_to_huy_to_khai: { nhom: 'chung_tu', can: [], chay: goiYGiayTo('giay_to_huy_to_khai', 'cong_van_huy_to_khai'), mo_ta: 'Soạn công văn đề nghị huỷ tờ khai nộp nhầm mẫu, nhầm kỳ hoặc nộp trùng.' },
  tat_ca_ket_noi: { nhom: 'ket_noi', can: ['ket_noi_ngan_hang', 'chi_phi_ai'], chay: tatCaKetNoi, mo_ta: 'Trạng thái mọi kết nối: ngân hàng, Casso, Tổng cục Thuế, OpenAI, Anthropic, Google AI, OpenRouter.' },
};
