/**
 * Bộ máy hành trình — hàm thuần. Edge function đọc/ghi CSDL; mọi quyết định "bước nào mở, hỏi câu gì,
 * xong chưa" nằm ở đây để test được không cần máy chủ.
 */
import { DU_KIEN, LOAI_HANH_TRINH, MAU_HANH_TRINH, type BuocMau, type LoaiHanhTrinh } from './mau.ts';

export type TrangThaiBuoc = 'not_started' | 'blocked' | 'ready' | 'in_progress' | 'waiting_external' | 'completed' | 'skipped';
export type TrangThaiHanhTrinh = 'dang_mo' | 'bi_chan' | 'cho_ben_ngoai' | 'hoan_tat' | 'da_huy';

export interface GiaTriDuKien { gia_tri: string; nguon: 'nguoi_dung' | 'ho_so' | 'mst'; luc: string; boi: string | null }
export type DuKien = Record<string, GiaTriDuKien>;

export interface Buoc {
  thu_tu: number;
  khoa: string;
  tieu_de: string;
  mo_ta: string;
  trang_thai: TrangThaiBuoc;
  uu_tien: number;
  du_kien_can: string[];
  giay_to_can: string[];
  thu_tuc_tim: string | null;
  loai_hanh_dong: BuocMau['loai_hanh_dong'];
  dich_hanh_dong: string | null;
  ly_do_chan: string | null;
}

export const giaTri = (dk: DuKien): Record<string, string> =>
  Object.fromEntries(Object.entries(dk).map(([k, v]) => [k, v.gia_tri]));

/**
 * Trạng thái từng bước suy từ dữ kiện. Bước người dùng đã đánh dấu (completed, waiting_external,
 * in_progress) giữ nguyên — dữ kiện không tự lùi việc người dùng đã làm.
 */
export function tinhBuoc(loai: LoaiHanhTrinh, duKien: DuKien, daCo: Partial<Record<string, TrangThaiBuoc>> = {}): Buoc[] {
  const g = giaTri(duKien);
  const mau = MAU_HANH_TRINH[loai].buoc;
  const apDung = (m: BuocMau) => !(m.ap_dung_khi && m.du_kien_can.every((k) => g[k]) && !m.ap_dung_khi(g));
  // Bước người dùng tự làm (nộp, lập hoá đơn) chỉ mở khi đã trả lời MỌI câu của việc: nộp khi chưa
  // biết ngày tạm ngừng là nộp sai. Bước kiểm kết quả chỉ mở khi đã nộp.
  const thieuCaViec = [...new Set(mau.filter(apDung).flatMap((m) => m.du_kien_can))].filter((k) => !g[k]);
  const daNop = !mau.some((m) => m.khoa === 'nguoi_dung_nop') || ['waiting_external', 'completed'].includes(String(daCo.nguoi_dung_nop));
  return mau.map((m, i) => {
    const cu = daCo[m.khoa];
    const thieu = m.loai_hanh_dong === 'nguoi_dung_lam' || m.loai_hanh_dong === 'kiem_ket_qua'
      ? [...new Set([...m.du_kien_can, ...thieuCaViec])].filter((k) => !g[k])
      : m.du_kien_can.filter((k) => !g[k]);
    let trang_thai: TrangThaiBuoc;
    let ly_do_chan: string | null = null;
    if (m.ap_dung_khi && m.du_kien_can.every((k) => g[k]) && !m.ap_dung_khi(g)) trang_thai = 'skipped';
    else if (cu && ['completed', 'waiting_external', 'in_progress', 'skipped'].includes(cu)) trang_thai = cu;
    else if (m.loai_hanh_dong === 'hoi') trang_thai = thieu.length ? 'ready' : 'completed';
    else if (thieu.length) {
      trang_thai = 'blocked';
      ly_do_chan = `Cần biết trước: ${thieu.map((k) => DU_KIEN[k]?.cau ?? k).join(' ')}`;
    } else if (m.loai_hanh_dong === 'kiem_ket_qua' && !daNop) {
      trang_thai = 'blocked';
      ly_do_chan = 'Nộp hồ sơ trước, rồi mới kiểm kết quả.';
    } else trang_thai = 'ready';
    return {
      thu_tu: i + 1, khoa: m.khoa, tieu_de: m.tieu_de, mo_ta: m.mo_ta, trang_thai, uu_tien: m.uu_tien,
      du_kien_can: m.du_kien_can, giay_to_can: m.giay_to_can ?? [], thu_tuc_tim: m.thu_tuc_tim ?? null,
      loai_hanh_dong: m.loai_hanh_dong, dich_hanh_dong: m.dich_hanh_dong ?? null, ly_do_chan,
    };
  });
}

export interface CauHoi { khoa: string; cau: string; kieu: string; lua_chon?: { gia_tri: string; nhan: string }[]; vi_sao: string; buoc: string }

/** ĐÚNG MỘT câu: dữ kiện còn thiếu của bước chưa xong có ưu tiên cao nhất (hoà thì bước trước). */
export function cauHoiTiepTheo(buoc: Buoc[], duKien: DuKien): CauHoi | null {
  const g = giaTri(duKien);
  const conMo = buoc
    .filter((b) => b.trang_thai !== 'completed' && b.trang_thai !== 'skipped')
    .sort((a, b) => b.uu_tien - a.uu_tien || a.thu_tu - b.thu_tu);
  for (const b of conMo) {
    const k = b.du_kien_can.find((x) => !g[x]);
    if (k && DU_KIEN[k]) {
      const d = DU_KIEN[k];
      return { khoa: k, cau: d.cau, kieu: d.kieu, lua_chon: d.lua_chon, vi_sao: d.vi_sao, buoc: b.khoa };
    }
  }
  return null;
}

/** Bước làm tiếp: bước sẵn sàng có ưu tiên cao nhất mà không phải câu hỏi. */
export function buocTiepTheo(buoc: Buoc[]): Buoc | null {
  return buoc.filter((b) => b.trang_thai === 'ready' || b.trang_thai === 'in_progress')
    .sort((a, b) => b.uu_tien - a.uu_tien || a.thu_tu - b.thu_tu)[0] ?? null;
}

export function trangThaiHanhTrinh(buoc: Buoc[]): TrangThaiHanhTrinh {
  if (buoc.every((b) => b.trang_thai === 'completed' || b.trang_thai === 'skipped')) return 'hoan_tat';
  if (buoc.some((b) => b.trang_thai === 'waiting_external')) return 'cho_ben_ngoai';
  if (!buoc.some((b) => b.trang_thai === 'ready' || b.trang_thai === 'in_progress')) return 'bi_chan';
  return 'dang_mo';
}

const NGAY = /^\d{4}-\d{2}-\d{2}$/;
const THANG = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Kiểm một câu trả lời trước khi ghi. Trả lỗi bằng lời thường, hoặc giá trị đã chuẩn hoá. */
export function kiemCauTraLoi(khoa: string, v: unknown): { ok: true; gia_tri: string } | { ok: false; loi: string } {
  const d = DU_KIEN[khoa];
  if (!d) return { ok: false, loi: 'MIMI không hỏi dữ kiện này.' };
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return { ok: false, loi: 'Bạn chưa trả lời.' };
  if (d.kieu === 'lua_chon') {
    return d.lua_chon?.some((x) => x.gia_tri === s) ? { ok: true, gia_tri: s } : { ok: false, loi: 'Chọn một trong các lựa chọn.' };
  }
  if (d.kieu === 'ngay') {
    if (!NGAY.test(s) || Number.isNaN(Date.parse(`${s}T00:00:00Z`)) || s < '1990-01-01' || s > '2100-12-31') return { ok: false, loi: 'Ngày chưa đúng (dạng 2026-10-01).' };
    return { ok: true, gia_tri: s };
  }
  if (d.kieu === 'thang') return THANG.test(s) ? { ok: true, gia_tri: s } : { ok: false, loi: 'Tháng chưa đúng (dạng 2026-01).' };
  if (s.length > 500) return { ok: false, loi: 'Trả lời ngắn thôi (tối đa 500 ký tự).' };
  return { ok: true, gia_tri: s };
}

/** Ràng buộc giữa các dữ kiện (vd. ngày kết thúc sau ngày bắt đầu). */
export function kiemNhatQuan(dk: Record<string, string>): string | null {
  if (dk.tam_ngung_tu && dk.tam_ngung_den && dk.tam_ngung_den <= dk.tam_ngung_tu) return 'Ngày tạm ngừng tới phải sau ngày bắt đầu tạm ngừng.';
  if (dk.tu_thang && dk.den_thang && dk.den_thang < dk.tu_thang) return 'Tháng kết thúc phải từ tháng bắt đầu trở đi.';
  if (dk.ky_hoi_tu && dk.ky_hoi_den && dk.ky_hoi_den < dk.ky_hoi_tu) return 'Tháng kết thúc phải từ tháng bắt đầu trở đi.';
  return null;
}

// ── Nhận hành trình từ câu nói ────────────────────────────────────────────────────────────────────
const boDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

const NHAN: ReadonlyArray<readonly [RegExp, LoaiHanhTrinh]> = [
  [/\b(giai trinh|yeu cau (toi )?giai trinh|thong bao (cua )?(co quan )?thue yeu cau|bo sung ho so theo yeu cau)\b/, 'authority_response'],
  [/\b(hoa don\b.*\b(sai|nham|loi)|(sai|nham) (mst|ma so thue)\b.*\bhoa don|(sai|nham)\b.*\bhoa don|dieu chinh hoa don|thay the hoa don)\b/, 'invoice_correction'],
  [/\b(giai the)\b/, 'dissolution'],
  [/\b(dong (ho kinh doanh|cong ty|ma so thue|mst)|cham dut (hoat dong|kinh doanh|hieu luc)|ngung kinh doanh han|nghi ban han)\b/, 'closure'],
  [/\b(kinh doanh (tro )?lai|hoat dong tro lai|tiep tuc (kinh doanh|hoat dong)|mo cua tro lai)\b/, 'resumption'],
  [/\b(tam ngung|tam nghi|nghi ban mot thoi gian)\b/, 'suspension'],
  [/\b(vua mo|moi mo|bat dau kinh doanh|mo ho kinh doanh|thanh lap cong ty|moi thanh lap|vua thanh lap)\b/, 'business_start'],
  [/\b(thay doi (dia chi|nganh nghe|thong tin dang ky|nguoi dai dien|ten))\b/, 'registration_change'],
  [/\b(dang ky hoa don|dung hoa don dien tu|thiet lap hoa don)\b/, 'invoice_setup'],
  [/\b(dung lai so|ghi lai so cu|so sach (nam|thang) truoc|lam lai so)\b/, 'historical_reconstruction'],
];

export function nhanHanhTrinh(cau: string): LoaiHanhTrinh | null {
  const s = ` ${boDau(cau).replace(/[^a-z0-9]+/g, ' ').trim()} `;
  for (const [re, loai] of NHAN) if (re.test(s)) return loai;
  return null;
}

export const laLoaiHanhTrinh = (v: unknown): v is LoaiHanhTrinh => (LOAI_HANH_TRINH as readonly string[]).includes(String(v));

/** Dấu vân tay hồ sơ việc: cùng loại, cùng đối tượng → một hồ sơ đang mở. */
export function dauVanTay(loai: LoaiHanhTrinh, dk: Record<string, string>): string {
  const doiTuong = loai === 'invoice_correction' ? dk.so_hoa_don : loai === 'authority_response' ? dk.ngay_nhan_thong_bao : undefined;
  return `${MAU_HANH_TRINH[loai].loai_ho_so}:${doiTuong ?? 'chung'}`.slice(0, 200);
}
