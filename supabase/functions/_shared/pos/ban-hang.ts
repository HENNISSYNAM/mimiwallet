/**
 * BÁN TẠI QUẦY (POS) — luật thuần, không đọc CSDL. Edge function `pos` đọc/ghi rồi hỏi ở đây.
 *
 * Một lần bán là một dòng `ban_hang_pos`:
 *   - tiền mặt  → ghi ngay là đã thu, kèm một dòng `transactions` (source 'pos') để vào sổ;
 *   - chuyển khoản → chờ. Khách quét VietQR mang mã `MIMIxxxxxx` trong nội dung; khi sao kê về có
 *     khoản TIỀN VÀO mang đúng mã ĐÚNG số tiền thì đánh dấu đã thu (`khopBanHangPos`).
 *
 * Quyền nằm riêng ở đây thay vì thêm hành động vào `quyen/vai-tro.ts`: ma trận chung có test khoá
 * từng ô và nhiều nhánh đang sửa song song; POS chỉ cần ba câu hỏi.
 */
import type { VaiTro } from '../quyen/vai-tro.ts';
import { docMaThamChieu, laMaThamChieu } from '../bank/ma-tham-chieu.ts';

export const PHUONG_THUC = ['cash', 'transfer'] as const;
export type PhuongThuc = (typeof PHUONG_THUC)[number];
export const TRANG_THAI = ['pending', 'paid', 'cancelled'] as const;
export type TrangThaiBan = (typeof TRANG_THAI)[number];

/** Trần một lần bán: 10 tỷ đồng — quá số này gần như chắc là gõ thừa số 0. */
export const TOI_DA_MOT_LAN = 10_000_000_000;
export const TOI_DA_GHI_CHU = 200;
export const TOI_DA_SAN_PHAM = 24;
export const TOI_DA_DONG_HANG = 50;

// ── Quyền ────────────────────────────────────────────────────────────────────────────────────

/**
 * Ai đứng quầy được. MIMI chưa có vai "thu ngân" riêng: mọi vai được ghi việc (kế toán, người duyệt chi,
 * quản trị, chủ) đều thu tiền được. Người xem thì không — chỉ xem.
 */
export const VAI_TRO_BAN_HANG: readonly VaiTro[] = ['chu_so_huu', 'quan_tri', 'nguoi_duyet', 'ke_toan'];
/**
 * Bấm "Đã nhận tiền" khi máy chưa thấy tiền về: đây là lời khẳng định doanh thu không có sao kê đi kèm,
 * nên chỉ chủ và quản trị. Nhân viên quầy chờ máy khớp hoặc gọi chủ.
 */
export const VAI_TRO_XAC_NHAN_TAY: readonly VaiTro[] = ['chu_so_huu', 'quan_tri'];
/** Sửa danh sách món bán nhanh (tên, giá). */
export const VAI_TRO_SUA_SAN_PHAM: readonly VaiTro[] = ['chu_so_huu', 'quan_tri'];

export const duocBanHang = (v: VaiTro | null | undefined) => !!v && VAI_TRO_BAN_HANG.includes(v);
export const duocXacNhanTay = (v: VaiTro | null | undefined) => !!v && VAI_TRO_XAC_NHAN_TAY.includes(v);
export const duocSuaSanPham = (v: VaiTro | null | undefined) => !!v && VAI_TRO_SUA_SAN_PHAM.includes(v);

export const CAU_TU_CHOI = {
  ban_hang: 'Vai trò Người xem không thu tiền được. Nhờ chủ doanh nghiệp đổi vai trò cho bạn.',
  xac_nhan_tay: 'Chỉ chủ doanh nghiệp hoặc quản trị được bấm "Đã nhận tiền" khi máy chưa thấy tiền về.',
  sua_san_pham: 'Chỉ chủ doanh nghiệp hoặc quản trị sửa được danh sách món.',
} as const;

// ── Đọc yêu cầu bán ──────────────────────────────────────────────────────────────────────────

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const laUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

export interface DongHang { ten: string; so_luong: number; don_gia: number }

export interface YeuCauBan {
  client_id: string;
  so_tien: number;
  phuong_thuc: PhuongThuc;
  ghi_chu: string | null;
  dong_hang: DongHang[];
  /** Giờ máy POS ghi lúc bán (bán ngoại tuyến đồng bộ sau). Đã kẹp vào khoảng hợp lý. */
  ban_luc: string;
}

/** Số tiền phải là số nguyên đồng dương. Nhận cả chuỗi "150000" (từ ô nhập). */
export function docSoTien(v: unknown): number | null {
  const n = typeof v === 'string' && /^\d{1,13}$/.test(v.trim()) ? Number(v.trim()) : v;
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n <= 0 || n > TOI_DA_MOT_LAN) return null;
  return n;
}

/** Bán ngoại tuyến tối đa 7 ngày mới đồng bộ; giờ máy chạy trước tối đa 5 phút. Ngoài khoảng → giờ máy chủ. */
export function kepGioBan(v: unknown, bayGio: Date): string {
  const t = typeof v === 'string' ? Date.parse(v) : NaN;
  const now = bayGio.getTime();
  if (!Number.isFinite(t) || t > now + 5 * 60_000 || t < now - 7 * 86_400_000) return bayGio.toISOString();
  return new Date(t).toISOString();
}

export function docYeuCauBan(v: unknown, bayGio = new Date()): { ok: true; yc: YeuCauBan } | { ok: false; cau: string } {
  if (!v || typeof v !== 'object') return { ok: false, cau: 'Thiếu nội dung lần bán.' };
  const o = v as Record<string, unknown>;
  if (!laUuid(o.client_id)) return { ok: false, cau: 'Thiếu mã lần bán của máy (client_id).' };
  const soTien = docSoTien(o.so_tien);
  if (soTien === null) return { ok: false, cau: 'Số tiền phải lớn hơn 0 và không quá 10 tỷ đồng.' };
  if (!(PHUONG_THUC as readonly string[]).includes(String(o.phuong_thuc))) return { ok: false, cau: 'Chọn Tiền mặt hoặc Chuyển khoản.' };
  const ghiChu = typeof o.ghi_chu === 'string' && o.ghi_chu.trim() ? o.ghi_chu.trim() : null;
  if (ghiChu && ghiChu.length > TOI_DA_GHI_CHU) return { ok: false, cau: `Ghi chú tối đa ${TOI_DA_GHI_CHU} ký tự.` };
  const dong: DongHang[] = [];
  if (Array.isArray(o.dong_hang)) {
    if (o.dong_hang.length > TOI_DA_DONG_HANG) return { ok: false, cau: `Tối đa ${TOI_DA_DONG_HANG} món một lần bán.` };
    for (const d of o.dong_hang as Record<string, unknown>[]) {
      const ten = typeof d?.ten === 'string' ? d.ten.trim().slice(0, 80) : '';
      const sl = Number(d?.so_luong);
      const gia = docSoTien(d?.don_gia);
      if (!ten || !Number.isInteger(sl) || sl <= 0 || sl > 9999 || gia === null) return { ok: false, cau: 'Một món trong đơn không hợp lệ.' };
      dong.push({ ten, so_luong: sl, don_gia: gia });
    }
    // Có liệt kê món thì tổng phải khớp — không để màn hình ghi một số, sổ ghi số khác.
    if (dong.length && dong.reduce((s, d) => s + d.so_luong * d.don_gia, 0) !== soTien) {
      return { ok: false, cau: 'Tổng các món không khớp số tiền thu.' };
    }
  }
  return {
    ok: true,
    yc: { client_id: o.client_id.toLowerCase(), so_tien: soTien, phuong_thuc: o.phuong_thuc as PhuongThuc, ghi_chu: ghiChu, dong_hang: dong, ban_luc: kepGioBan(o.ban_luc, bayGio) },
  };
}

export interface SanPham { id?: string; ten: string; gia: number }

export function docDanhSachSanPham(v: unknown): { ok: true; ds: SanPham[] } | { ok: false; cau: string } {
  if (!Array.isArray(v)) return { ok: false, cau: 'Thiếu danh sách món.' };
  if (v.length > TOI_DA_SAN_PHAM) return { ok: false, cau: `Tối đa ${TOI_DA_SAN_PHAM} món bán nhanh.` };
  const ds: SanPham[] = [];
  const ten = new Set<string>();
  for (const x of v as Record<string, unknown>[]) {
    const t = typeof x?.ten === 'string' ? x.ten.trim() : '';
    const gia = docSoTien(x?.gia);
    if (!t || t.length > 60) return { ok: false, cau: 'Tên món từ 1 đến 60 ký tự.' };
    if (gia === null) return { ok: false, cau: `Giá của "${t}" phải lớn hơn 0.` };
    if (ten.has(t.toLowerCase())) return { ok: false, cau: `Món "${t}" bị trùng tên.` };
    ten.add(t.toLowerCase());
    ds.push({ ten: t, gia });
  }
  return { ok: true, ds };
}

// ── Ngày Việt Nam ────────────────────────────────────────────────────────────────────────────

const LECH_VN = 7 * 3_600_000;
/** Ngày theo giờ Việt Nam (UTC+7), dạng YYYY-MM-DD. Máy chủ chạy UTC: 23:30 ở quầy vẫn là hôm nay. */
export const ngayVN = (d: Date | string) => new Date(new Date(d).getTime() + LECH_VN).toISOString().slice(0, 10);
/** Khoảng [đầu ngày, đầu ngày hôm sau) của một ngày VN, theo ISO UTC — để lọc `created_at`. */
export function khoangNgayVN(ngay: string): { tu: string; den: string } {
  const dau = Date.parse(`${ngay}T00:00:00+07:00`);
  return { tu: new Date(dau).toISOString(), den: new Date(dau + 86_400_000).toISOString() };
}

// ── Khớp tiền về ─────────────────────────────────────────────────────────────────────────────

export interface BanChoKhop {
  id: string;
  reference: string;
  amount: number;
  status: TrangThaiBan;
  method: PhuongThuc;
  matched_transaction_id: string | null;
}

export interface GiaoDichCoMa {
  id: string;
  amount: number | string;
  type: string | null;
  payment_reference: string | null;
  merchant_name?: string | null;
}

export interface KetQuaKhopPos {
  khop: Array<{ banId: string; giaoDichId: string; soTien: number; daXacNhanTay: boolean }>;
  lech: Array<{ banId: string; giaoDichId: string; mongDoi: number; thucTe: number }>;
}

/** Mã MIMI của một giao dịch: trường mã nếu có, không thì đọc trong nội dung. */
export function maCuaGiaoDich(g: GiaoDichCoMa): string | null {
  const r = (g.payment_reference ?? '').trim().toUpperCase();
  if (r && laMaThamChieu(r)) return r;
  return docMaThamChieu(g.payment_reference) ?? docMaThamChieu(g.merchant_name ?? null);
}

/**
 * Lần bán chuyển khoản nào đã có tiền về.
 *
 * KHỚP BẰNG MÃ, SỐ TIỀN ĐỂ KIỂM — cùng luật với `tac-tu/khop-chi.ts`, ngược chiều:
 *   - chỉ TIỀN VÀO (một khoản chuyển ra mang cùng mã không phải là khách trả);
 *   - đúng mã + đúng số → khớp;
 *   - đúng mã, sai số (khách gõ nhầm, trả thiếu) → "lệch": KHÔNG đánh dấu đã thu, chủ quyết;
 *   - một giao dịch chỉ khớp một lần bán (`daDung` = giao dịch đã gắn ở lần chạy trước) — webhook gửi lại
 *     hay đồng bộ chạy đè không ghi hai lần.
 *
 * Ứng viên: lần bán chuyển khoản đang chờ, và lần đã được chủ bấm "Đã nhận tiền" tay mà chưa gắn giao
 * dịch nào (tiền về sau đó thì gắn vào để sổ có bằng chứng, không tạo doanh thu lần hai).
 */
export function khopBanHangPos(ban: BanChoKhop[], giaoDich: GiaoDichCoMa[], daDung: ReadonlySet<string> = new Set()): KetQuaKhopPos {
  const kq: KetQuaKhopPos = { khop: [], lech: [] };
  const dung = new Set(daDung);
  const vao = giaoDich
    .filter((g) => g.type === 'income' || (g.type !== 'expense' && Number(g.amount) > 0))
    .map((g) => ({ g, ma: maCuaGiaoDich(g) }))
    .filter((x) => x.ma);

  const ungVienBan = ban.filter((b) => b.method === 'transfer' && !b.matched_transaction_id && (b.status === 'pending' || b.status === 'paid'));
  for (const b of ungVienBan) {
    const ma = b.reference.toUpperCase();
    const cung = vao.filter((x) => x.ma === ma && !dung.has(x.g.id));
    if (!cung.length) continue;
    const dungSo = cung.find((x) => Math.abs(Number(x.g.amount)) === Number(b.amount));
    if (dungSo) {
      dung.add(dungSo.g.id);
      kq.khop.push({ banId: b.id, giaoDichId: dungSo.g.id, soTien: Number(b.amount), daXacNhanTay: b.status === 'paid' });
      continue;
    }
    kq.lech.push({ banId: b.id, giaoDichId: cung[0].g.id, mongDoi: Number(b.amount), thucTe: Math.abs(Number(cung[0].g.amount)) });
  }
  return kq;
}

// ── Phân loại doanh thu ──────────────────────────────────────────────────────────────────────

export const MA_LY_DO_POS = { tien_mat: 'pos_tien_mat', chuyen_khoan: 'pos_chuyen_khoan' } as const;

/**
 * Khoản tiền vào khớp một lần bán tại quầy là bằng chứng mạnh nhất có được rằng đó là tiền bán hàng.
 * Ghi phân loại `business_revenue` khi:
 *   - chưa có phân loại → ghi mới;
 *   - phân loại hiện có là của máy (tự phân loại, `confirmed_by` = MIMI_TU_DONG) → ghi đè, vì máy đoán
 *     "chưa rõ"/"khác" từ nội dung, còn đây là bằng chứng;
 *   - phân loại của NGƯỜI → giữ nguyên. Người đã quyết thì máy không lật.
 */
export function quyetDinhPhanLoaiPos(hienCo: { confirmed_by: string; confirmed_type: string } | null, idMay: string): 'ghi_moi' | 'ghi_de' | 'giu_nguyen' {
  if (!hienCo) return 'ghi_moi';
  if (hienCo.confirmed_by !== idMay) return 'giu_nguyen';
  return hienCo.confirmed_type === 'business_revenue' ? 'giu_nguyen' : 'ghi_de';
}

// ── Tổng hợp trong ngày ──────────────────────────────────────────────────────────────────────

export interface DongBan { amount: number; method: PhuongThuc; status: TrangThaiBan }
export interface TongHopNgay {
  so_lan: number;
  tong: number;
  tien_mat: { so_lan: number; tong: number };
  chuyen_khoan: { so_lan: number; tong: number };
  dang_cho: number;
}

/** Chỉ cộng lần đã thu. Lần đang chờ đếm riêng, lần huỷ bỏ qua. */
export function tongHopNgay(ds: DongBan[]): TongHopNgay {
  const th: TongHopNgay = { so_lan: 0, tong: 0, tien_mat: { so_lan: 0, tong: 0 }, chuyen_khoan: { so_lan: 0, tong: 0 }, dang_cho: 0 };
  for (const d of ds) {
    if (d.status === 'pending') { th.dang_cho++; continue; }
    if (d.status !== 'paid') continue;
    const so = Number(d.amount) || 0;
    th.so_lan++;
    th.tong += so;
    const nhom = d.method === 'cash' ? th.tien_mat : th.chuyen_khoan;
    nhom.so_lan++;
    nhom.tong += so;
  }
  return th;
}

// ── Tài khoản nhận ───────────────────────────────────────────────────────────────────────────

export interface KetNoiNhan {
  id: string;
  account_number: string;
  account_name: string | null;
  bank_name: string | null;
  bank_code: string | null;
  scopes: string | null;
  status: string | null;
  revoked_at: string | null;
}

/**
 * Chọn tài khoản nhận cho VietQR. Chỉ tài khoản liên kết qua Cas (đã chứng minh chủ), còn sống, có số thật.
 * Ưu tiên tài khoản đọc được sao kê — chỉ tài khoản đó MIMI mới tự thấy tiền về để khớp. `taiKhoanCoSo`
 * khác null: chỉ chọn trong tài khoản đã gán cho cơ sở đó (nhân viên một cơ sở thu về tài khoản cơ sở mình).
 */
export function chonTaiKhoanNhan(ds: KetNoiNhan[], taiKhoanCoSo: string[] | null): { tk: KetNoiNhan; tu_dong_khop: boolean } | null {
  const chuan = (s: string) => s.replace(/\D/g, '');
  const cho = taiKhoanCoSo ? new Set(taiKhoanCoSo.map(chuan)) : null;
  const song = ds.filter((k) => k.status === 'connected' && !k.revoked_at && /^\d{6,19}$/.test(chuan(k.account_number ?? '')) && (!cho || cho.has(chuan(k.account_number))));
  const coSaoKe = song.find((k) => k.scopes !== 'qrpay' && k.scopes !== 'gdt');
  if (coSaoKe) return { tk: coSaoKe, tu_dong_khop: true };
  const conLai = song.find((k) => k.scopes !== 'gdt');
  return conLai ? { tk: conLai, tu_dong_khop: false } : null;
}
