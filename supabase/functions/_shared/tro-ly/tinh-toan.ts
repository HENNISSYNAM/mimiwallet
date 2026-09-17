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
import type { DeXuat, DoDayNguon, KetNoiHienThi, KetQuaNangLuc, NguonDuLieu, NhomNangLuc, O, PhanTichNhanh, The, TrangChiTiet, ViecHomNay } from './kieu.ts';
import { chieuTien, doLonTien } from '../tien/chieu-tien.ts';
import { ghepChungTu, LECH_TIEN, type HoaDonVao, type KhoanChi } from '../chung-tu/khop-chung-tu.ts';
import { chuanHoaTenModel, deXuatModelReHon, type GiaModel } from '../chi-phi-ai/bang-gia.ts';
import { CAN_CU, NGUONG_DOANH_THU as NGUONG_THUE, suyLuan as suyLuanThue, type SuKienThue } from '../luat/he-luat.ts';
import type { DoanLuat } from '../luat/nguon-luat.ts';
import { TU_DIEN_CHI_SO } from '../chi-so/tu-dien.ts';

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
export interface ChiPhiAiTL { nha_cung_cap: string; ngay: string; hang_muc: string; so_tien_usd: number; nguon: string }
export interface KetNoiAiTL { nha_cung_cap: string; trang_thai: string; dong_bo_luc: string | null; loi_cuoi: string | null }
export interface TokenAiTL {
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
  thue: { suKien: SuKienThue; canhBao: string[]; canCuDaKiem: Record<string, boolean> } | null;
  /** MIMI-P0-002: độ đầy đủ của từng nguồn đã đọc (edge function điền; test để trống). */
  doDay: Partial<Record<NguonCan, DoDayNguon>>;
  /** Đoạn luật kho tìm được cho câu hỏi. null = chưa tra được (lỗi), khác với [] = không có. */
  khoLuat: DoanLuat[] | null;
}

export type NguonCan =
  | 'giao_dich' | 'hoa_don_vao' | 'hoa_don_ban' | 'yeu_cau' | 'ket_noi_ngan_hang'
  | 'chi_phi_ai' | 'token_ai' | 'bang_gia' | 'chung_tu_quet' | 'thue' | 'kho_luat';

export function duLieuTrong(homNay: string, kyChungTu: DuLieu['kyChungTu']): DuLieu {
  return {
    homNay, kyChungTu,
    giaoDich: [], hoaDonVao: [], hoaDonBan: [], yeuCau: [], tacTu: [], chinhSach: [], ketNoiNganHang: [],
    chiPhiAi: [], nganSachAi: null, ketNoiAi: [], nhapFileAi: [], tokenAi: [], bangGia: [], bangGiaLuc: null, chungTuQuet: [],
    thue: null,
    doDay: {},
    khoLuat: [],
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
} satisfies Record<string, TrangChiTiet>;

function kq(
  nang_luc: string,
  nhom: NhomNangLuc,
  tom_tat: string,
  p: { the?: The[]; de_xuat?: DeXuat[]; nguon?: NguonDuLieu[]; trang?: TrangChiTiet[] } = {},
): KetQuaNangLuc {
  return { nang_luc, nhom, tom_tat, the: p.the ?? [], de_xuat: p.de_xuat ?? [], nguon: p.nguon ?? [], trang: p.trang ?? [] };
}

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
  const de_xuat: DeXuat[] = cho.slice(0, 5).flatMap((y) => {
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
          { nhan: `Đã chi tới ${ngayVN(d.homNay)}`, gia_tri: tongNay, don_vi: 'vnd' },
          { nhan: 'Cùng kỳ tháng trước', gia_tri: tongTruoc, don_vi: 'vnd' },
          { nhan: 'Thay đổi', gia_tri: chenh, don_vi: 'phan_tram', can_chu_y: chenh !== null && chenh >= 20 },
        ],
      },
      ...(top.length ? [{
        loai: 'bang' as const,
        tieu_de: 'Chi nhiều nhất tháng này',
        cot: [{ nhan: 'Người nhận', don_vi: 'chu' as const }, { nhan: 'Số khoản', don_vi: 'so' as const }, { nhan: 'Tổng', don_vi: 'vnd' as const }],
        dong: top.slice(0, 6).map(([ten, v]) => [ten, v.so, v.tien] as O[]),
        con_lai: Math.max(0, top.length - 6),
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
          { nhan: 'Đã chi', gia_tri: g.tongDaChi, don_vi: 'vnd' },
          { nhan: 'Hoá đơn điện tử đầu vào', gia_tri: g.tongCoGiay, don_vi: 'vnd' },
          {
            nhan: 'Chưa có hoá đơn điện tử', gia_tri: g.tongChuaCoGiay, don_vi: 'vnd', can_chu_y: g.tongChuaCoGiay > 0,
            ghi_chu: coQuet.size ? `${coQuet.size} khoản đã có chứng từ quét` : undefined,
          },
          { nhan: 'Cần bạn chọn hoá đơn', gia_tri: g.canXem.length, don_vi: 'so' },
        ],
      },
      ...(conThieu.length ? [{
        loai: 'bang' as const,
        tieu_de: 'Khoản chi lớn nhất chưa có giấy tờ',
        cot: [{ nhan: 'Ngày', don_vi: 'ngay' as const }, { nhan: 'Người nhận', don_vi: 'chu' as const }, { nhan: 'Số tiền', don_vi: 'vnd' as const }],
        dong: conThieu.slice(0, 8).map((c) => [c.ngay, tenChi.get(c.id) ?? 'Không rõ người nhận', c.soTien] as O[]),
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
            { nhan: 'Quá hạn', gia_tri: tong, don_vi: 'vnd', can_chu_y: true, ghi_chu: `${qua.length} hoá đơn` },
            { nhan: 'Chưa tới hạn', gia_tri: tongCho, don_vi: 'vnd', ghi_chu: `${choThu.length} hoá đơn` },
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
  const ungVien = vao.map((t) => ({
    t,
    khop: cho.filter((h) => Math.abs(Number(h.total) - doLonTien(t)) <= LECH_TIEN && h.issued_date <= t.transaction_date),
  }));
  // Một-một mới gợi ý: một hoá đơn khớp hai khoản tiền về thì không chọn hộ.
  const demHoaDon = new Map<string, number>();
  for (const u of ungVien) if (u.khop.length === 1) demHoaDon.set(u.khop[0].id, (demHoaDon.get(u.khop[0].id) ?? 0) + 1);
  const chac = ungVien.filter((u) => u.khop.length === 1 && demHoaDon.get(u.khop[0].id) === 1);
  const tongVao = vao.reduce((s, t) => s + doLonTien(t), 0);
  const tongCho = cho.reduce((s, h) => s + Number(h.total), 0);

  const the: The[] = [{
    loai: 'so_lieu', tieu_de: '30 ngày gần nhất', muc: [
      { nhan: 'Tiền về', gia_tri: tongVao, don_vi: 'vnd', ghi_chu: `${vao.length} khoản` },
      { nhan: 'Có thể là tiền của hoá đơn', gia_tri: chac.length, don_vi: 'so' },
      { nhan: 'Hoá đơn còn chờ thu', gia_tri: tongCho, don_vi: 'vnd', ghi_chu: `${cho.length} hoá đơn` },
    ],
  }];
  if (chac.length) {
    the.push({
      loai: 'bang', tieu_de: 'Tiền về có thể khớp hoá đơn',
      cot: [{ nhan: 'Ngày tiền về', don_vi: 'ngay' }, { nhan: 'Người chuyển', don_vi: 'chu' }, { nhan: 'Số tiền', don_vi: 'vnd' }, { nhan: 'Có thể là hoá đơn', don_vi: 'chu' }],
      dong: chac.slice(0, 8).map((u) => [u.t.transaction_date, tenNguoiNhan(u.t), doLonTien(u.t), `${u.khop[0].invoice_number} · ${u.khop[0].client_name}`]),
      con_lai: Math.max(0, chac.length - 8),
    });
    the.push({ loai: 'ghi_chu', muc_do: 'thong_tin', cau: 'Đây là gợi ý theo số tiền và ngày, chưa phải xác nhận. Hỏi lại khách hoặc xem nội dung chuyển khoản trước khi coi hoá đơn là đã thu.' });
  }
  const docGanNhat = d.ketNoiNganHang
    .filter((k) => (k.scopes ?? 'transaction') === 'transaction' && k.last_synced_at)
    .map((k) => k.last_synced_at as string).sort().at(-1);
  if (docGanNhat && soNgayGiua(docGanNhat, d.homNay) >= 2) {
    the.push({ loai: 'ghi_chu', muc_do: 'can_chu_y', cau: `Sao kê đồng bộ gần nhất ngày ${ngayVN(docGanNhat)} — tiền về sau ngày đó chưa có ở đây.` });
  }
  const cau = `30 ngày qua có ${vao.length} khoản tiền về, tổng ${vnd(tongVao)}. ${chac.length ? `${chac.length} khoản có thể là tiền của hoá đơn đang chờ thu.` : 'Chưa khoản nào khớp rõ với hoá đơn đang chờ thu.'}${cho.length ? ` Còn ${cho.length} hoá đơn chờ thu, tổng ${vnd(tongCho)}.` : ''}`;
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

/** Cùng nhà cung cấp, cùng ngày: số từ API thắng số từ file (file có thể là bản xuất cũ). */
export function locTrungNguon(ds: ChiPhiAiTL[]): ChiPhiAiTL[] {
  const coApi = new Set(ds.filter((r) => r.nguon === 'api').map((r) => `${r.nha_cung_cap} ${r.ngay}`));
  return ds.filter((r) => r.nguon === 'api' || !coApi.has(`${r.nha_cung_cap} ${r.ngay}`));
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
      { nhan: 'Đã chi', gia_tri: c.tong, don_vi: 'usd' },
      c.ns ? { nhan: 'Ngân sách tháng', gia_tri: c.ns.han_muc_thang_usd, don_vi: 'usd' } : { nhan: 'Ngân sách tháng', gia_tri: 'Chưa đặt', don_vi: 'chu' },
      { nhan: 'Đã dùng ngân sách', gia_tri: c.pct, don_vi: 'phan_tram', can_chu_y: c.canhBao },
      { nhan: 'Dự kiến cuối tháng', gia_tri: Math.round(c.duKien * 100) / 100, don_vi: 'usd', can_chu_y: !!c.ns && c.duKien > c.ns.han_muc_thang_usd, ghi_chu: 'nếu giữ nhịp chi hiện tại' },
    ],
  }];
  if (top.length) {
    the.push({
      loai: 'bang', tieu_de: 'Tốn nhiều nhất tháng này',
      cot: [{ nhan: 'Model / dịch vụ', don_vi: 'chu' }, { nhan: 'Nhà cung cấp', don_vi: 'chu' }, { nhan: 'Chi phí', don_vi: 'usd' }, { nhan: 'Tỷ trọng', don_vi: 'phan_tram' }],
      dong: top.slice(0, 6).map((m) => [m.ten, TEN_NCC_AI[m.ncc] ?? m.ncc, Math.round(m.tien * 100) / 100, phanTram(m.tien, c.tong)]),
      con_lai: Math.max(0, top.length - 6),
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
    cau = 'Chưa thấy model nào có bậc rẻ hơn cùng hãng đáng đổi, theo số token 30 ngày qua.';
  } else {
    const dau = r.de_xuat[0];
    const tongTiet = r.de_xuat.reduce((s, x) => s + x.tiet_kiem_usd, 0);
    cau = `Nếu đổi ${dau.model} sang ${dau.thay_bang.ten}, 30 ngày qua sẽ tốn khoảng ${usd(dau.chi_phi_neu_doi_usd)} thay vì ${usd(dau.chi_phi_uoc_tinh_usd)} — bớt ${usd(dau.tiet_kiem_usd)}.`;
    if (r.de_xuat.length > 1) cau += ` Tính cả ${r.de_xuat.length} model, có thể bớt khoảng ${usd(tongTiet)} mỗi 30 ngày.`;
    the.push({
      loai: 'bang', tieu_de: 'Model rẻ hơn cùng hãng (ước tính 30 ngày)',
      cot: [
        { nhan: 'Đang dùng', don_vi: 'chu' }, { nhan: 'Có thể đổi sang', don_vi: 'chu' }, { nhan: 'Chi phí hiện tại', don_vi: 'usd' },
        { nhan: 'Nếu đổi', don_vi: 'usd' }, { nhan: 'Bớt được', don_vi: 'usd' },
      ],
      dong: r.de_xuat.slice(0, 6).map((x) => [x.model, x.thay_bang.ten, x.chi_phi_uoc_tinh_usd, x.chi_phi_neu_doi_usd, x.tiet_kiem_usd]),
      con_lai: Math.max(0, r.de_xuat.length - 6),
    });
  }
  the.push({
    loai: 'ghi_chu', muc_do: 'can_chu_y',
    cau: `Ước tính = số token 30 ngày × giá niêm yết của OpenRouter${d.bangGiaLuc ? ` (lấy ngày ${ngayVN(d.bangGiaLuc)})` : ''}, chưa trừ giảm giá cache hay batch. Model rẻ hơn có thể làm kém hơn ở việc khó — thử trên một phần việc thật trước khi đổi hẳn.`,
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
      if (soNgayGiua(ds[i - 1].transaction_date, ds[i].transaction_date) <= NGAY_NGHI_TRUNG) cap.push({ a: ds[i - 1], b: ds[i] });
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
  if (ai && ai.de_xuat.length) cau.push(`Đổi sang model rẻ hơn cùng hãng có thể bớt khoảng ${usd(tietAi)} mỗi 30 ngày (ước tính).`);
  else if (!ds.length) cau.push('Chưa có số token nên chưa ước tính được tiết kiệm từ AI.');

  const the: The[] = [{
    loai: 'so_lieu', tieu_de: 'Chỗ có thể tiết kiệm', muc: [
      { nhan: 'Khoản có thể bị trả trùng', gia_tri: cap.length, don_vi: 'so', can_chu_y: cap.length > 0 },
      { nhan: 'Tiền liên quan', gia_tri: tongTrung, don_vi: 'vnd' },
      { nhan: 'Bớt được nếu đổi model AI', gia_tri: ai ? Math.round(tietAi * 100) / 100 : null, don_vi: 'usd', ghi_chu: 'ước tính 30 ngày' },
    ],
  }];
  if (cap.length) {
    the.push({
      loai: 'bang', tieu_de: 'Có thể bị trả trùng',
      cot: [{ nhan: 'Người nhận', don_vi: 'chu' }, { nhan: 'Số tiền', don_vi: 'vnd' }, { nhan: 'Lần 1', don_vi: 'ngay' }, { nhan: 'Lần 2', don_vi: 'ngay' }],
      dong: cap.slice(0, 8).map((c) => [tenNguoiNhan(c.b), doLonTien(c.b), c.a.transaction_date, c.b.transaction_date]),
      con_lai: Math.max(0, cap.length - 8),
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
  const { suKien, canhBao, canCuDaKiem } = d.thue;
  const sl = suyLuanThue(suKien);
  const chinh = sl.ket_luan.filter((k) => k.loai === 'mien' || k.loai === 'nghia_vu' || k.loai === 'chua_ho_tro');
  const giaiThich = sl.ket_luan.find((k) => k.id === 'giai_thich_hai_thue');
  const chuaKiem = [...new Set(sl.ket_luan.flatMap((k) => k.can_cu))].filter((c) => canCuDaKiem[c] === false);

  const the: The[] = [];
  if (sl.doanh_thu_nam !== null) {
    the.push({
      loai: 'so_lieu', tieu_de: `Doanh thu năm ${suKien.nam}`, muc: [
        { nhan: sl.tam_tinh ? 'Lũy kế tới nay' : 'Cả năm', gia_tri: sl.doanh_thu_nam, don_vi: 'vnd' },
        { nhan: 'Ngưỡng phải nộp thuế', gia_tri: NGUONG_THUE, don_vi: 'vnd', ghi_chu: 'NĐ 68/2026 sửa bởi NĐ 141/2026' },
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
  for (const c of canhBao.slice(0, 2)) the.push({ loai: 'ghi_chu', muc_do: 'can_chu_y', cau: c });
  for (const t of sl.thieu.slice(0, 3)) the.push({ loai: 'ghi_chu', muc_do: 'can_chu_y', cau: t.cau });
  if (chuaKiem.length) {
    the.push({ loai: 'ghi_chu', muc_do: 'can_chu_y', cau: `${chuaKiem.length} căn cứ chưa đối chiếu được với kho văn bản — mở Tờ khai thuế để đọc bản gốc.` });
  }

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

// ── Danh mục năng lực ────────────────────────────────────────────────────────

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
  if (!d.khoLuat.length) {
    return kq('tra_cuu_luat', 'chung_tu', 'Kho văn bản của MIMI chưa có đoạn nói về việc này. Bạn nên hỏi kế toán hoặc cơ quan thuế quản lý trực tiếp.', {
      nguon: [N.khoLuat],
    });
  }
  const cu = d.khoLuat.filter((v) => v.ngay_ban_hanh && Number(v.ngay_ban_hanh.slice(0, 4)) < NAM_LUAT_CAN_CANH_BAO);
  const the: The[] = [{
    loai: 'bang', tieu_de: 'Đoạn văn bản tìm thấy (trích nguyên văn)',
    cot: [{ nhan: 'Văn bản', don_vi: 'chu' }, { nhan: 'Ban hành', don_vi: 'ngay' }, { nhan: 'Hiệu lực', don_vi: 'ngay' }, { nhan: 'Trích', don_vi: 'chu' }, { nhan: 'Bản gốc', don_vi: 'chu' }],
    dong: d.khoLuat.map((v) => [
      [[v.loai, v.so_hieu].filter(Boolean).join(' ') || v.ten, v.nhan].filter(Boolean).join(' · '),
      v.ngay_ban_hanh,
      v.ngay_hieu_luc,
      `“${v.noi_dung.length > 400 ? `${v.noi_dung.slice(0, 400)}…` : v.noi_dung}”`,
      v.url,
    ]),
  }];
  the.push({
    loai: 'ghi_chu', muc_do: 'can_chu_y',
    cau: 'Đây là trích dẫn để tham khảo, chưa phải tư vấn: kho chưa theo dõi đầy đủ tình trạng hiệu lực. Đối chiếu bản gốc và hỏi kế toán hoặc cơ quan thuế trước khi nộp hồ sơ.',
  });
  if (cu.length) {
    the.push({ loai: 'ghi_chu', muc_do: 'can_chu_y', cau: `${cu.length} văn bản ban hành trước ${NAM_LUAT_CAN_CANH_BAO} — có thể đã bị sửa đổi hoặc thay thế.` });
  }
  return kq('tra_cuu_luat', 'chung_tu', `MIMI tìm thấy ${d.khoLuat.length} đoạn văn bản liên quan trong Công báo. Dưới đây là trích nguyên văn kèm ngày ban hành và hiệu lực — chỉ để tham khảo.`, {
    the,
    nguon: [N.khoLuat],
  });
}

export const NANG_LUC: Record<string, NangLuc> = {
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
  model_re_hon: { nhom: 'ai_token', can: ['token_ai', 'bang_gia'], chay: modelReHon, mo_ta: 'Ước tính tiết kiệm nếu đổi sang model rẻ hơn cùng hãng, theo số token thật và bảng giá OpenRouter.' },
  bao_cao_tai_chinh: { nhom: 'bao_cao', can: ['giao_dich'], chay: baoCaoTaiChinh, mo_ta: 'Tổng hợp dòng tiền ngân hàng theo tháng: tiền vào, tiền ra, chênh lệch. Không phải doanh thu, lợi nhuận hay báo cáo tài chính — MIMI chưa có sổ kế toán.' },
  phan_tich_tiet_kiem: { nhom: 'bao_cao', can: ['giao_dich', 'token_ai', 'bang_gia'], chay: phanTichTietKiem, mo_ta: 'Chỗ có thể tiết kiệm: khoản chi nghi trả trùng, tiền bớt được nếu đổi model AI.' },
  nghia_vu_thue: { nhom: 'chung_tu', can: ['thue'], chay: nghiaVuThue, mo_ta: 'Nghĩa vụ thuế năm nay suy từ doanh thu thật và văn bản pháp luật trong kho: có phải nộp GTGT, TNCN không, dùng mẫu tờ khai nào, hạn nào, kèm trích dẫn.' },
  tra_cuu_luat: { nhom: 'chung_tu', can: ['kho_luat'], chay: traCuuLuat, mo_ta: 'Tìm và trích nguyên văn đoạn Luật, Nghị định, Thông tư trong kho Công báo cho một câu hỏi pháp lý chung (không phải nghĩa vụ thuế của chính công ty). Chỉ tham khảo, kèm ngày ban hành và hiệu lực.' },
  tat_ca_ket_noi: { nhom: 'ket_noi', can: ['ket_noi_ngan_hang', 'chi_phi_ai'], chay: tatCaKetNoi, mo_ta: 'Trạng thái mọi kết nối: ngân hàng, Casso, Tổng cục Thuế, OpenAI, Anthropic, Google AI, OpenRouter.' },
};
