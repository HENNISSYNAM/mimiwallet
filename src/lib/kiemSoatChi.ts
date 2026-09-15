import type { Database } from '@/integrations/supabase/types';
import {
  GIU_NGUOI_NHAN_MOI_MS, TRANG_THAI_GIU_HAN_MUC, chuanHoaTen, dauNgayVN, dauThangVN, type MaLyDo,
} from './tacTu';

/**
 * Mọi con số và nhãn của màn Kiểm soát chi, suy ra từ đúng dữ liệu màn đó đã đọc.
 *
 * KHÔNG SINH SỐ. Hàm ở đây chỉ đếm, cộng hoặc đặt nhãn cho các dòng đã tải. Thiếu
 * dữ liệu thì trả `null` để giao diện hiện trạng thái trống, không hiện số 0 giả.
 *
 * Nghĩa các cột lấy từ máy chủ (`_shared/tac-tu/cong-tac-tu.ts`, `tac-tu/index.ts`,
 * `_shared/tac-tu/doi-soat.ts`):
 *   - luật tự duyệt: cach_quyet = 'tu_dong', quyet_luc có giá trị
 *   - luật từ chối:  cach_quyet = null, trang_thai = 'tu_choi'
 *   - chờ người:     trang_thai = 'cho_duyet', quyet_luc = null
 *   - người quyết:   cach_quyet = 'nguoi_duyet'; từ chối thì thêm mã NGUOI_DUYET_TU_CHOI
 *   - huỷ:           từ cho_duyet hoặc da_duyet, giữ nguyên cach_quyet
 *   - sao kê khớp:   trang_thai = 'da_chi', da_chi_luc, so_tien_thuc_chi
 */

type Bang<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type YeuCau = Bang<'yeu_cau_chi'>;
export type TacTu = Bang<'tac_tu'>;
export type ChinhSachRow = Bang<'chinh_sach_chi'>;
export type NguoiNhan = Bang<'nguoi_nhan_duoc_phep'>;
export type DongGiu = Pick<YeuCau, 'tac_tu_id' | 'so_tien' | 'created_at'>;

export interface LyDoDong {
  ma: string;
  cau: string;
}

export function lyDoCua(y: Pick<YeuCau, 'ly_do'>): LyDoDong[] {
  if (!Array.isArray(y.ly_do)) return [];
  return (y.ly_do as unknown[])
    .filter((l): l is { ma: string; cau?: unknown } => typeof l === 'object' && l !== null && typeof (l as { ma?: unknown }).ma === 'string')
    .map((l) => ({ ma: l.ma, cau: typeof l.cau === 'string' ? l.cau : '' }));
}

/* ── Trạng thái hiển thị ─────────────────────────────────────────────── */

export type TrangThaiHienThi = 'dang_cho' | 'can_xem_xet' | 'da_duyet' | 'tu_choi';

export const THU_TU_TRANG_THAI: readonly TrangThaiHienThi[] = ['dang_cho', 'can_xem_xet', 'da_duyet', 'tu_choi'];

export const NHAN_TRANG_THAI: Record<TrangThaiHienThi, string> = {
  dang_cho: 'Đang chờ',
  can_xem_xet: 'Cần xem xét',
  da_duyet: 'Đã duyệt',
  tu_choi: 'Từ chối',
};

/** Mã khiến một khoản chờ duyệt cần đọc kỹ: lừa đảo chuyển khoản thường chen vào đúng những chỗ này. */
export const MA_CAN_XEM_XET: ReadonlySet<string> = new Set(['DOI_SO_TAI_KHOAN', 'NGUOI_NHAN_MOI', 'NGUOI_NHAN_MOI_THEM']);

/**
 * Bốn nhãn cho sáu trạng thái trong CSDL. Giai đoạn thật (chờ trả, đã chi, đã huỷ…)
 * không mất đi — nó nằm ở `giaiDoan`, hiện thành dòng phụ dưới nhãn.
 */
export function trangThaiHienThi(y: Pick<YeuCau, 'trang_thai' | 'ly_do'>): TrangThaiHienThi {
  switch (y.trang_thai) {
    case 'da_duyet':
    case 'da_chi':
      return 'da_duyet';
    case 'tu_choi':
    case 'huy':
      return 'tu_choi';
    case 'cho_duyet':
      return lyDoCua(y).some((l) => MA_CAN_XEM_XET.has(l.ma)) ? 'can_xem_xet' : 'dang_cho';
    default:
      return 'dang_cho';
  }
}

export function giaiDoan(y: Pick<YeuCau, 'trang_thai' | 'cach_quyet'>): string {
  switch (y.trang_thai) {
    case 'dang_xet': return 'MIMI đang xét';
    case 'cho_duyet': return 'Chờ bạn duyệt';
    case 'da_duyet': return 'Chờ bạn trả';
    case 'da_chi': return 'Đã chi · sao kê xác nhận';
    case 'huy': return 'Đã huỷ';
    case 'tu_choi': return y.cach_quyet === 'nguoi_duyet' ? 'Bạn từ chối' : 'Luật từ chối';
    default: return y.trang_thai;
  }
}

/* ── Luật ────────────────────────────────────────────────────────────── */

export const NHAN_MA: Record<MaLyDo | 'NGUOI_DUYET_TU_CHOI', string> = {
  TAC_TU_TAM_DUNG: 'Agent đang tạm dừng',
  TAC_TU_DA_THU_HOI: 'Agent đã bị thu hồi',
  CHINH_SACH_HET_HAN: 'Chính sách hết hạn',
  SO_TIEN_KHONG_HOP_LE: 'Số tiền không hợp lệ',
  NGAN_HANG_KHONG_RO: 'Ngân hàng không rõ',
  SO_TAI_KHOAN_KHONG_HOP_LE: 'Số tài khoản không hợp lệ',
  THIEU_MUC_DICH: 'Thiếu mục đích',
  MUC_DICH_LOI_MA_HOA: 'Mục đích lỗi mã hoá',
  NHOM_CHI_KHONG_RO: 'Nhóm chi không rõ',
  NHOM_CHI_KHONG_DUOC_PHEP: 'Nhóm chi không được phép',
  VUOT_HAN_MUC_MOI_LAN: 'Vượt hạn mức mỗi khoản',
  VUOT_HAN_MUC_NGAY: 'Vượt hạn mức ngày',
  VUOT_HAN_MUC_THANG: 'Vượt hạn mức tháng',
  VUOT_TAN_SUAT: 'Vượt tần suất yêu cầu',
  NGUOI_NHAN_CHUA_DUYET: 'Người nhận ngoài danh sách',
  NGUOI_NHAN_MOI: 'Người nhận lần đầu',
  NGUOI_NHAN_MOI_THEM: 'Người nhận mới thêm dưới 24 giờ',
  DOI_SO_TAI_KHOAN: 'Đổi số tài khoản',
  TREN_NGUONG_DUYET: 'Trên ngưỡng tự duyệt',
  TRONG_CHINH_SACH: 'Trong chính sách',
  NGUOI_DUYET_TU_CHOI: 'Bạn từ chối',
};

/** Mã lạ — ví dụ máy chủ vừa thêm mà giao diện chưa biết — hiện nguyên mã thay vì biến mất. */
export const nhanMa = (ma: string) => (NHAN_MA as Record<string, string>)[ma] ?? ma;

/** Luật của bộ xét đã khớp; ghi chú khi người duyệt từ chối là quyết định của người, không phải luật. */
export const luatDaKhop = (y: Pick<YeuCau, 'ly_do'>) => lyDoCua(y).filter((l) => l.ma !== 'NGUOI_DUYET_TU_CHOI');

export function tomTatLuat(y: Pick<YeuCau, 'ly_do'>): string {
  const ds = luatDaKhop(y);
  if (ds.length === 0) return '—';
  return ds.length === 1 ? nhanMa(ds[0].ma) : `${nhanMa(ds[0].ma)} +${ds.length - 1}`;
}

export type KetQuaDanhGia = 'duyet' | 'tu_choi' | 'can_nguoi';

/** Bộ luật đã quyết gì lúc agent gửi — khác với việc sau đó người duyệt làm gì. `null` = chưa xét. */
export function ketQuaDanhGia(y: Pick<YeuCau, 'cach_quyet' | 'trang_thai' | 'ly_do'>): KetQuaDanhGia | null {
  if (y.cach_quyet === 'tu_dong') return 'duyet';
  if (y.trang_thai === 'tu_choi' && y.cach_quyet !== 'nguoi_duyet') return 'tu_choi';
  if (y.trang_thai === 'dang_xet') return null;
  if (y.cach_quyet !== 'nguoi_duyet' && luatDaKhop(y).length === 0) return null;
  return 'can_nguoi';
}

/* ── Ngân sách và KPI ────────────────────────────────────────────────── */

export type SuDung = Record<string, { ngay: number; thang: number }>;

/** Hạn mức đã giữ theo agent, chia ngày/tháng theo giờ Việt Nam như máy chủ. */
export function tinhSuDung(giu: DongGiu[], now: Date): SuDung {
  const dauNgay = dauNgayVN(now).getTime();
  const dauThang = dauThangVN(now).getTime();
  const m: SuDung = {};
  for (const r of giu) {
    const t = new Date(r.created_at).getTime();
    if (t < dauThang) continue;
    if (!m[r.tac_tu_id]) m[r.tac_tu_id] = { ngay: 0, thang: 0 };
    m[r.tac_tu_id].thang += Number(r.so_tien);
    if (t >= dauNgay) m[r.tac_tu_id].ngay += Number(r.so_tien);
  }
  return m;
}

export interface Kpi {
  coAgent: boolean;
  canDuyet: number;
  canXemXet: number;
  /** Tiền đã rời tài khoản hôm nay — chỉ khoản sao kê đã xác nhận. */
  daChiHomNay: { tong: number; soKhoan: number };
  /** Hạn mức đã giữ hôm nay: chờ duyệt, đã duyệt, đã chi. */
  daGiuHomNay: number;
  /** `null` khi không có agent đang hoạt động có chính sách — không cộng ra số 0 giả. */
  nganSachThang: { conLai: number; tran: number; soAgent: number } | null;
}

export function tinhKpi(v: {
  yeuCau: YeuCau[];
  dsTacTu: TacTu[];
  chinhSach: Record<string, ChinhSachRow | undefined>;
  giu: DongGiu[];
  now: Date;
}): Kpi {
  const dauNgay = dauNgayVN(v.now).getTime();
  const suDung = tinhSuDung(v.giu, v.now);
  const choDuyet = v.yeuCau.filter((y) => y.trang_thai === 'cho_duyet');
  const daChi = v.yeuCau.filter(
    (y) => y.trang_thai === 'da_chi' && y.da_chi_luc !== null && new Date(y.da_chi_luc).getTime() >= dauNgay,
  );
  const hoatDong = v.dsTacTu.filter((t) => t.trang_thai === 'hoat_dong' && v.chinhSach[t.id]);

  return {
    coAgent: v.dsTacTu.length > 0,
    canDuyet: choDuyet.length,
    canXemXet: choDuyet.filter((y) => trangThaiHienThi(y) === 'can_xem_xet').length,
    daChiHomNay: {
      tong: daChi.reduce((s, y) => s + Number(y.so_tien_thuc_chi ?? y.so_tien), 0),
      soKhoan: daChi.length,
    },
    daGiuHomNay: v.giu
      .filter((r) => new Date(r.created_at).getTime() >= dauNgay)
      .reduce((s, r) => s + Number(r.so_tien), 0),
    nganSachThang: hoatDong.length
      ? {
          conLai: hoatDong.reduce(
            (s, t) => s + Math.max(0, (v.chinhSach[t.id] as ChinhSachRow).han_muc_thang - (suDung[t.id]?.thang ?? 0)),
            0,
          ),
          tran: hoatDong.reduce((s, t) => s + (v.chinhSach[t.id] as ChinhSachRow).han_muc_thang, 0),
          soAgent: hoatDong.length,
        }
      : null,
  };
}

export interface DongNganSach {
  nhan: string;
  tran: number;
  /** Đã dùng, không tính khoản đang xem. */
  khongTinh: number;
  /** Đã dùng, tính cả khoản đang xem. */
  tinhCa: number;
}

/**
 * Ngân sách quanh một khoản. Số "đã dùng" là hiện tại, không phải lúc khoản được
 * gửi — nên nhãn là "không tính / tính cả khoản này", không phải "trước / sau".
 * Khoản tạo trước tháng này thì hạn mức đã quay vòng: trả `null`.
 */
export function nganSachQuanhKhoan(
  y: Pick<YeuCau, 'so_tien' | 'trang_thai' | 'created_at'>,
  cs: Pick<ChinhSachRow, 'han_muc_ngay' | 'han_muc_thang'> | undefined,
  su: { ngay: number; thang: number } | undefined,
  now: Date,
): { dong: DongNganSach[]; daTinh: boolean } | null {
  if (!cs) return null;
  const t = new Date(y.created_at).getTime();
  if (t < dauThangVN(now).getTime()) return null;
  const daTinh = (TRANG_THAI_GIU_HAN_MUC as readonly string[]).includes(y.trang_thai);
  const so = Number(y.so_tien);
  const dung = su ?? { ngay: 0, thang: 0 };
  const tao = (nhan: string, tran: number, daDung: number): DongNganSach => ({
    nhan,
    tran,
    khongTinh: daTinh ? daDung - so : daDung,
    tinhCa: daTinh ? daDung : daDung + so,
  });
  const dong: DongNganSach[] = [];
  if (t >= dauNgayVN(now).getTime()) dong.push(tao('Hôm nay', cs.han_muc_ngay, dung.ngay));
  dong.push(tao('Tháng này', cs.han_muc_thang, dung.thang));
  return { dong, daTinh };
}

/* ── Tiến trình ──────────────────────────────────────────────────────── */

export type TrangThaiBuoc = 'xong' | 'dang' | 'cho' | 'dung';

export interface BuocTienTrinh {
  ten: string;
  trangThai: TrangThaiBuoc;
  mo: string;
  luc: string | null;
}

/**
 * Yêu cầu → đánh giá → phê duyệt → thanh toán → đối soát.
 *
 * MIMI không thấy lúc bạn bấm trả trong app ngân hàng, chỉ thấy lúc sao kê về —
 * nên bước thanh toán không có giờ, và giờ nằm ở bước đối soát.
 */
export function tienTrinh(y: YeuCau): BuocTienTrinh[] {
  const kq = ketQuaDanhGia(y);
  const nguoi = y.cach_quyet === 'nguoi_duyet';
  const daDuyet = y.cach_quyet === 'tu_dong' || (nguoi && y.trang_thai !== 'tu_choi');
  const b: BuocTienTrinh[] = [{ ten: 'Yêu cầu', trangThai: 'xong', mo: 'Agent gửi yêu cầu chi', luc: y.created_at }];

  if (y.trang_thai === 'dang_xet') b.push({ ten: 'Đánh giá', trangThai: 'dang', mo: 'MIMI đang xét theo chính sách', luc: null });
  else if (kq === 'duyet') b.push({ ten: 'Đánh giá', trangThai: 'xong', mo: 'Trong chính sách', luc: y.quyet_luc ?? y.created_at });
  else if (kq === 'tu_choi') b.push({ ten: 'Đánh giá', trangThai: 'dung', mo: 'Luật từ chối', luc: y.quyet_luc ?? y.created_at });
  else if (kq === 'can_nguoi') b.push({ ten: 'Đánh giá', trangThai: 'xong', mo: 'Luật không cho tự duyệt — cần người', luc: y.created_at });
  else b.push({ ten: 'Đánh giá', trangThai: 'dung', mo: 'Huỷ trước khi xét', luc: null });

  if (kq === 'duyet') b.push({ ten: 'Phê duyệt', trangThai: 'xong', mo: 'Tự duyệt theo chính sách', luc: y.quyet_luc });
  else if (nguoi && y.trang_thai === 'tu_choi') b.push({ ten: 'Phê duyệt', trangThai: 'dung', mo: 'Bạn từ chối', luc: y.quyet_luc });
  else if (nguoi) b.push({ ten: 'Phê duyệt', trangThai: 'xong', mo: 'Bạn đã duyệt', luc: y.quyet_luc });
  else if (y.trang_thai === 'cho_duyet') b.push({ ten: 'Phê duyệt', trangThai: 'dang', mo: 'Chờ bạn duyệt', luc: null });
  else if (y.trang_thai === 'dang_xet') b.push({ ten: 'Phê duyệt', trangThai: 'cho', mo: 'Chưa tới bước này', luc: null });
  else if (y.trang_thai === 'huy' && kq !== null) b.push({ ten: 'Phê duyệt', trangThai: 'dung', mo: 'Đã huỷ trước khi duyệt', luc: y.updated_at });
  else b.push({ ten: 'Phê duyệt', trangThai: 'dung', mo: 'Không áp dụng', luc: null });

  const daDung = () => b.some((x) => x.trangThai === 'dung');

  if (y.trang_thai === 'da_chi') b.push({ ten: 'Thanh toán', trangThai: 'xong', mo: 'Bạn đã trả trong app ngân hàng', luc: null });
  else if (y.trang_thai === 'da_duyet') b.push({ ten: 'Thanh toán', trangThai: 'dang', mo: 'Chờ bạn trả trong app ngân hàng', luc: null });
  else if (y.trang_thai === 'huy' && daDuyet) b.push({ ten: 'Thanh toán', trangThai: 'dung', mo: 'Đã huỷ lệnh trả', luc: y.updated_at });
  else if (daDung()) b.push({ ten: 'Thanh toán', trangThai: 'dung', mo: 'Không áp dụng', luc: null });
  else b.push({ ten: 'Thanh toán', trangThai: 'cho', mo: 'MIMI không chuyển tiền — bạn trả trong app ngân hàng', luc: null });

  if (y.trang_thai === 'da_chi') b.push({ ten: 'Đối soát', trangThai: 'xong', mo: 'Sao kê xác nhận đã chi', luc: y.da_chi_luc });
  else if (daDung()) b.push({ ten: 'Đối soát', trangThai: 'dung', mo: 'Không áp dụng', luc: null });
  else b.push({ ten: 'Đối soát', trangThai: 'cho', mo: 'Tự chuyển "Đã chi" khi sao kê về', luc: null });

  return b;
}

/* ── Người nhận ──────────────────────────────────────────────────────── */

/** Theo luật NGUOI_NHAN_MOI_THEM: người nhận mới thêm chưa được tự duyệt trong 24 giờ đầu. */
export function thoiGianGiu(n: Pick<NguoiNhan, 'created_at'>, now: Date): { moi: boolean; conGio: number } {
  const con = GIU_NGUOI_NHAN_MOI_MS - (now.getTime() - new Date(n.created_at).getTime());
  return con > 0 ? { moi: true, conGio: Math.ceil(con / 3_600_000) } : { moi: false, conGio: 0 };
}

/** Cùng tên (chuẩn hoá như luật đổi số tài khoản) mà khác tài khoản trong danh sách được phép. */
export function nhomTrungTen(ds: NguoiNhan[]): NguoiNhan[][] {
  const m = new Map<string, NguoiNhan[]>();
  for (const n of ds) {
    const k = chuanHoaTen(n.ten_chu_tai_khoan);
    if (!k) continue;
    m.set(k, [...(m.get(k) ?? []), n]);
  }
  return [...m.values()].filter((g) => new Set(g.map((n) => `${n.ngan_hang_bin}:${n.so_tai_khoan}`)).size > 1);
}

export const yeuCauDoiTaiKhoan = (ds: YeuCau[]) => ds.filter((y) => lyDoCua(y).some((l) => l.ma === 'DOI_SO_TAI_KHOAN'));

/* ── Cần chú ý và biểu đồ ────────────────────────────────────────────── */

const dongTien = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;

/** Agent dùng từ mức này của hạn mức tháng thì đưa vào "Cần chú ý" — cùng mốc thanh hạn mức đổi màu. */
export const MOC_GAN_CHAM_HAN_MUC = 0.9;

export interface MucChuY {
  khoa: string;
  muc: 'nguy' | 'canh_bao' | 'thong_tin';
  tieuDe: string;
  mo: string;
  luc: string | null;
  yeuCauId?: string;
  tab?: 'agents' | 'nguoi-nhan';
}

/**
 * Việc cần người để mắt, chỉ từ dữ liệu đã tải, xếp nguy → cảnh báo → thông tin.
 * Không có gì thì trả mảng rỗng — giao diện nói "không có gì cần xử lý".
 */
export function canChuY(v: {
  yeuCau: YeuCau[];
  dsTacTu: TacTu[];
  chinhSach: Record<string, ChinhSachRow | undefined>;
  suDung: SuDung;
  nguoiNhan: NguoiNhan[];
  now: Date;
}): MucChuY[] {
  const ds: MucChuY[] = [];

  for (const y of yeuCauDoiTaiKhoan(v.yeuCau).filter((x) => x.trang_thai === 'cho_duyet' || x.trang_thai === 'da_duyet')) {
    ds.push({
      khoa: `doi-tk-${y.id}`,
      muc: 'nguy',
      tieuDe: `Đổi số tài khoản: ${y.ten_nguoi_nhan ?? 'chưa rõ tên'}`,
      mo: `${dongTien(y.so_tien)} · khác tài khoản lần trả trước`,
      luc: y.created_at,
      yeuCauId: y.id,
    });
  }

  for (const y of v.yeuCau) {
    if (y.trang_thai !== 'da_duyet' || !y.het_han_luc || new Date(y.het_han_luc).getTime() >= v.now.getTime()) continue;
    ds.push({
      khoa: `qua-han-${y.id}`,
      muc: 'canh_bao',
      tieuDe: 'Lệnh trả đã quá hạn',
      mo: `${dongTien(y.so_tien)} · ${y.ten_nguoi_nhan ?? 'chưa rõ tên'} — kiểm lại trước khi trả`,
      luc: y.het_han_luc,
      yeuCauId: y.id,
    });
  }

  for (const t of v.dsTacTu) {
    const cs = v.chinhSach[t.id];
    if (t.trang_thai !== 'hoat_dong' || !cs || cs.han_muc_thang <= 0) continue;
    const da = v.suDung[t.id]?.thang ?? 0;
    const tiLe = da / cs.han_muc_thang;
    if (tiLe < MOC_GAN_CHAM_HAN_MUC) continue;
    ds.push({
      khoa: `han-muc-${t.id}`,
      muc: 'canh_bao',
      tieuDe: `${t.ten} gần chạm hạn mức tháng`,
      mo: `Đã dùng ${Math.round(tiLe * 100)}% · ${dongTien(da)} / ${dongTien(cs.han_muc_thang)}`,
      luc: null,
      tab: 'agents',
    });
  }

  for (const n of v.nguoiNhan) {
    const g = thoiGianGiu(n, v.now);
    if (!g.moi) continue;
    ds.push({
      khoa: `nguoi-nhan-${n.id}`,
      muc: 'thong_tin',
      tieuDe: `Người nhận mới: ${n.ten_chu_tai_khoan}`,
      mo: `Chưa được tự duyệt · còn khoảng ${g.conGio} giờ`,
      luc: n.created_at,
      tab: 'nguoi-nhan',
    });
  }

  return ds;
}

/**
 * Câu trợ lý đầu màn Kiểm soát chi: việc đang chờ trước, tiền sau. Chỉ nói điều dữ
 * liệu đã tải cho biết; phần nào không có số thì không nhắc tới.
 */
export function cauTomTatKiemSoat(v: { kpi: Kpi; soChoTra: number }): string {
  const { kpi } = v;
  if (!kpi.coAgent) {
    return 'Chưa có agent nào được phép chi. Thêm agent đầu tiên và đặt hạn mức — MIMI sẽ báo bạn khoản nào cần duyệt.';
  }
  const phan: string[] = [];
  if (kpi.canDuyet === 0) phan.push('Không có khoản nào chờ bạn duyệt');
  else {
    phan.push(
      `Có ${kpi.canDuyet} khoản chờ bạn duyệt${kpi.canXemXet ? `, trong đó ${kpi.canXemXet} khoản cần xem kỹ vì người nhận mới hoặc đổi số tài khoản` : ''}`,
    );
  }
  if (v.soChoTra > 0) phan.push(`${v.soChoTra} khoản đã duyệt đang chờ bạn chuyển tiền`);
  if (kpi.daChiHomNay.soKhoan > 0) {
    phan.push(`hôm nay ngân hàng đã xác nhận ${kpi.daChiHomNay.soKhoan} khoản, tổng ${dongTien(kpi.daChiHomNay.tong)}`);
  }
  if (kpi.nganSachThang) phan.push(`hạn mức tháng của các agent còn ${dongTien(kpi.nganSachThang.conLai)}`);
  return `${phan.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join('. ')}.`;
}

/** Hạn mức đã giữ theo từng ngày của tháng này, từ ngày 1 tới hôm nay (giờ Việt Nam). */
export function giuTheoNgay(giu: DongGiu[], now: Date): Array<{ ngay: number; tong: number }> {
  const NGAY = 86_400_000;
  const dauThang = dauThangVN(now).getTime();
  const soNgay = Math.round((dauNgayVN(now).getTime() - dauThang) / NGAY) + 1;
  const ds = Array.from({ length: soNgay }, (_, i) => ({ ngay: i + 1, tong: 0 }));
  for (const r of giu) {
    const t = new Date(r.created_at);
    if (t.getTime() < dauThang) continue;
    const i = Math.round((dauNgayVN(t).getTime() - dauThang) / NGAY);
    if (ds[i]) ds[i].tong += Number(r.so_tien);
  }
  return ds;
}

/* ── Kiểm tra trước khi tạo yêu cầu ──────────────────────────────────── */

export interface NhapYeuCau {
  soTien: number;
  nhomChi: string;
  nganHangBin: string;
  soTaiKhoan: string;
}

export interface DongKiemTruoc {
  muc: 'chan' | 'hoi' | 'dat';
  cau: string;
}

export type KetLuanKiemTruoc = 'tu_choi' | 'cho_duyet' | 'tu_dong_duyet';

/**
 * Ước tính trước khi gửi, từ đúng các trường `xetYeuCau` đọc: trạng thái agent,
 * hết hạn, ba hạn mức, nhóm chi, người nhận (danh sách, giữ 24 giờ), ngưỡng duyệt.
 *
 * KHÔNG THAY BỘ XÉT CỦA MÁY CHỦ. Nó không biết tần suất 60 phút hay lịch sử đổi số
 * tài khoản 180 ngày, nên giao diện ghi rõ là ước tính. Mục đích là người tạo thấy
 * "sẽ bị từ chối vì vượt hạn mức ngày" trước khi gửi, thay vì gửi rồi mới biết.
 */
export function kiemTruocYeuCau(
  nhap: NhapYeuCau,
  t: Pick<TacTu, 'trang_thai'>,
  cs: ChinhSachRow | undefined,
  su: { ngay: number; thang: number } | undefined,
  nguoiNhan: NguoiNhan[],
  now: Date,
): { ketLuan: KetLuanKiemTruoc; dong: DongKiemTruoc[] } {
  const d: DongKiemTruoc[] = [];
  const dung = su ?? { ngay: 0, thang: 0 };

  if (t.trang_thai === 'tam_dung') d.push({ muc: 'chan', cau: 'Agent đang tạm dừng.' });
  if (t.trang_thai === 'thu_hoi') d.push({ muc: 'chan', cau: 'Agent đã bị thu hồi.' });

  if (!cs) {
    d.push({ muc: 'hoi', cau: 'Agent chưa có dòng chính sách — máy chủ dùng mức mặc định chặt nhất.' });
  } else {
    if (cs.het_han && new Date(cs.het_han).getTime() <= now.getTime()) {
      d.push({ muc: 'chan', cau: 'Chính sách của agent đã hết hạn.' });
    }
    if (nhap.soTien > cs.han_muc_moi_lan) {
      d.push({ muc: 'chan', cau: `Vượt hạn mức mỗi khoản ${dongTien(cs.han_muc_moi_lan)}.` });
    }
    if (dung.ngay + nhap.soTien > cs.han_muc_ngay) {
      d.push({ muc: 'chan', cau: `Vượt hạn mức ngày — hôm nay còn ${dongTien(Math.max(0, cs.han_muc_ngay - dung.ngay))}.` });
    }
    if (dung.thang + nhap.soTien > cs.han_muc_thang) {
      d.push({ muc: 'chan', cau: `Vượt hạn mức tháng — tháng này còn ${dongTien(Math.max(0, cs.han_muc_thang - dung.thang))}.` });
    }
    if (cs.nhom_chi_duoc_phep && !cs.nhom_chi_duoc_phep.includes(nhap.nhomChi)) {
      d.push({ muc: 'chan', cau: 'Nhóm chi này không được phép cho agent.' });
    }
  }

  const daBiet = nguoiNhan.find((n) => n.ngan_hang_bin === nhap.nganHangBin && n.so_tai_khoan === nhap.soTaiKhoan);
  if (!daBiet) {
    // Không có dòng chính sách thì máy chủ dùng mặc định, và mặc định chỉ chi cho người trong danh sách.
    if (cs?.chi_tra_nguoi_nhan_da_duyet ?? true) d.push({ muc: 'chan', cau: 'Người nhận ngoài danh sách được phép.' });
    else d.push({ muc: 'hoi', cau: 'Người nhận lần đầu — cần người duyệt.' });
  } else if (thoiGianGiu(daBiet, now).moi) {
    d.push({ muc: 'hoi', cau: 'Người nhận mới thêm dưới 24 giờ — chưa được tự duyệt.' });
  }

  if (cs && nhap.soTien > cs.nguong_can_duyet) {
    d.push({
      muc: 'hoi',
      cau: cs.nguong_can_duyet === 0 ? 'Chính sách yêu cầu duyệt mọi khoản.' : `Trên ngưỡng tự duyệt ${dongTien(cs.nguong_can_duyet)}.`,
    });
  }

  const ketLuan: KetLuanKiemTruoc = d.some((x) => x.muc === 'chan')
    ? 'tu_choi'
    : d.some((x) => x.muc === 'hoi')
      ? 'cho_duyet'
      : 'tu_dong_duyet';
  if (ketLuan === 'tu_dong_duyet') {
    d.push({ muc: 'dat', cau: 'Trong hạn mức, người nhận đã đủ 24 giờ, dưới ngưỡng tự duyệt.' });
  }
  return { ketLuan, dong: d };
}

/* ── Lọc ─────────────────────────────────────────────────────────────── */

const boDau = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

export function khopTuKhoa(truong: Array<string | null | undefined>, tim: string): boolean {
  const q = boDau(tim.trim());
  if (!q) return true;
  return boDau(truong.filter(Boolean).join(' ')).includes(q);
}

export function locYeuCau(
  ds: YeuCau[],
  loc: { trangThai: TrangThaiHienThi | 'tat_ca'; tim: string },
  tenTacTu: Record<string, string>,
): YeuCau[] {
  return ds.filter(
    (y) =>
      (loc.trangThai === 'tat_ca' || trangThaiHienThi(y) === loc.trangThai) &&
      khopTuKhoa([tenTacTu[y.tac_tu_id], y.ten_nguoi_nhan, y.muc_dich, y.so_tai_khoan, y.ma_tham_chieu], loc.tim),
  );
}
