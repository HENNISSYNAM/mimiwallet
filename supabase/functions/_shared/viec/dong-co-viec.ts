/**
 * Bộ máy hồ sơ việc — hàm thuần (Prompt 4B, 26/09/2026). Không chạm CSDL: `luu.ts` đọc/ghi, mọi quyết
 * định "việc đang ở đâu, làm gì tiếp, bao giờ, xong chưa" nằm ở đây để test được.
 *
 * NGUỒN SỰ THẬT → SUY RA → HIỂN THỊ
 *   - Nguồn: dữ kiện đã trả lời (hanh_trinh.du_kien), dấu bước người dùng (buoc_hanh_trinh), bằng chứng
 *     (bang_chung_viec), lịch thuế tính từ hệ luật (luat/lich-thue.ts), doanh thu theo nhóm hoạt động.
 *   - Suy ra: trạng thái hồ sơ việc, việc tiếp theo, ngày, mức ưu tiên — hàm ở file này.
 *   - Hiển thị: Việc cần làm (Tổng quan), Trợ lý, Pet, Lịch — chỉ đọc kết quả của hàm ở đây.
 */
import { buocTiepTheo, type Buoc, type CauHoi, type DuKien } from '../hanh-trinh/dong-co.ts';
import { DU_KIEN, type LoaiHanhTrinh } from '../hanh-trinh/mau.ts';
import { laDaGiaiQuyet, laDangMo, type BangChung, type TrangThaiViec } from './trang-thai.ts';

export const congNgay = (ymd: string, n: number): string => {
  const d = new Date(`${ymd.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const soNgayGiua = (tu: string, den: string): number =>
  Math.round((Date.parse(`${den.slice(0, 10)}T00:00:00Z`) - Date.parse(`${tu.slice(0, 10)}T00:00:00Z`)) / 86_400_000);
const ngayVN = (ymd: string) => ymd.slice(0, 10).split('-').reverse().join('/');

/** "Hôm nay" theo giờ Việt Nam — hạn luật tính theo ngày ở Việt Nam, không theo UTC. */
export function homNayVN(luc: Date = new Date()): string {
  return new Date(luc.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
}

export interface ViecHanhTrinh { loai: LoaiHanhTrinh; buoc: Buoc[]; cau_hoi: CauHoi | null; du_kien: DuKien }

// ── Điều kiện giải quyết ─────────────────────────────────────────────────────────────────────────
export interface DieuKienGiaiQuyet {
  dat: boolean;
  muc: 'resolved_user_confirmed' | 'resolved_system_verified' | null;
  /** Còn thiếu gì, bằng lời thường — hiện cho người dùng khi họ hỏi "sao chưa xong?". */
  thieu: string[];
}

/** Việc có bước nộp hồ sơ / kiểm kết quả → cần bằng chứng KẾT QUẢ, không chỉ "tôi đã làm". */
export const canBangChungKetQua = (buoc: Buoc[]): boolean =>
  buoc.some((b) => (b.khoa === 'nguoi_dung_nop' || b.loai_hanh_dong === 'kiem_ket_qua') && b.trang_thai !== 'skipped');

const laKetQua = (b: Pick<BangChung, 'loai'>) => b.loai === 'official_response' || b.loai === 'system_verified_event';
const daXacNhan = (b: Pick<BangChung, 'trang_thai_xac_minh'>) => b.trang_thai_xac_minh === 'user_confirmed' || b.trang_thai_xac_minh === 'system_verified';

/**
 * Giải quyết khi: đủ dữ kiện VÀ mọi bước xong/không áp dụng VÀ có bằng chứng cần thiết VÀ không còn gì
 * chặn. Việc có bước nộp: cần bằng chứng kết quả (phản hồi của cơ quan). Mức "hệ thống xác minh" chỉ khi
 * chính bằng chứng kết quả là do hệ thống xác minh — người dùng nói "được chấp nhận rồi" vẫn là mức
 * "theo xác nhận của bạn".
 */
export function dieuKienGiaiQuyet(h: ViecHanhTrinh, bc: readonly BangChung[]): DieuKienGiaiQuyet {
  const thieu: string[] = [];
  if (h.cau_hoi) thieu.push(`Còn câu cần trả lời: ${h.cau_hoi.cau}`);
  const conLai = h.buoc.filter((b) => b.trang_thai !== 'completed' && b.trang_thai !== 'skipped');
  if (conLai.length) thieu.push(`Còn ${conLai.length} bước chưa xong: ${conLai.map((b) => b.tieu_de).join('; ')}`);
  const canKetQua = canBangChungKetQua(h.buoc);
  const ketQua = bc.filter((b) => laKetQua(b) && daXacNhan(b));
  if (canKetQua && !ketQua.length) thieu.push('Chưa có bằng chứng kết quả (thông báo chấp nhận, biên nhận, số văn bản trả lời)');
  if (!canKetQua && !bc.some(daXacNhan)) thieu.push('Chưa có xác nhận của bạn rằng các bước đã làm');
  if (thieu.length) return { dat: false, muc: null, thieu };
  const heThong = canKetQua ? ketQua.some((b) => b.trang_thai_xac_minh === 'system_verified') : bc.some((b) => b.trang_thai_xac_minh === 'system_verified');
  return { dat: true, muc: heThong ? 'resolved_system_verified' : 'resolved_user_confirmed', thieu: [] };
}

/** Trạng thái hồ sơ việc suy từ hành trình + bằng chứng. `hienTai` đã đóng thì giữ nguyên. */
export function suyTrangThai(h: ViecHanhTrinh, bc: readonly BangChung[], hienTai?: TrangThaiViec): TrangThaiViec {
  if (hienTai && !laDangMo(hienTai)) return hienTai;
  if (h.cau_hoi) return 'needs_information';
  const dk = dieuKienGiaiQuyet(h, bc);
  if (dk.dat && dk.muc) return dk.muc;
  if (h.buoc.some((b) => b.trang_thai === 'waiting_external')) return 'waiting_external';
  if (h.buoc.every((b) => b.trang_thai === 'completed' || b.trang_thai === 'skipped')) return 'needs_review';
  if (h.buoc.some((b) => b.trang_thai === 'in_progress')) return 'in_progress';
  if (h.buoc.some((b) => b.trang_thai === 'ready')) return 'ready_to_act';
  return 'needs_review';
}

// ── Việc tiếp theo ───────────────────────────────────────────────────────────────────────────────
export type LoaiHanhDong =
  | 'tra_loi' | 'phan_loai_doanh_thu' | 'lam_buoc' | 'soan_tai_lieu' | 'ghi_da_nop' | 'ghi_phan_hoi' | 'kiem_phan_hoi' | 'bo_sung_bang_chung';

export interface HanhDongTiep {
  loai: LoaiHanhDong;
  tieu_de: string;
  mo_ta: string;
  vi_sao: string;
  /** Dữ kiện cần nhập (khi là câu hỏi). */
  can_nhap: { khoa: string; cau: string; kieu: string; lua_chon?: { gia_tri: string; nhan: string }[] }[];
  /** Việc này chặn các bước sau. */
  chan: boolean;
  dieu_kien_xong: string;
  nguon: string[];
  /** Bước của hành trình mà hành động chạm tới (nếu có). */
  buoc: string | null;
  /** Trang làm việc này. */
  dich: string | null;
}

/** Ngày ghi nhận đã nộp (bằng chứng "da_nop" của người dùng), nếu có. */
export const ngayDaNop = (bc: readonly BangChung[]): string | null =>
  bc.find((b) => b.khoa_trung === 'da_nop')?.tao_luc?.slice(0, 10) ?? null;

export function cauTheoDoi(ngayNop: string | null, homNay: string): string {
  if (!ngayNop) return 'MIMI chưa có bằng chứng về phản hồi của cơ quan. Bạn đã nhận được thông báo nào chưa?';
  const n = Math.max(0, soNgayGiua(ngayNop, homNay));
  const khi = n === 0 ? 'hôm nay' : `${n} ngày trước`;
  // Không bao giờ nói "cơ quan thuế chưa xử lý" — MIMI không biết điều đó.
  return `Bạn đã ghi nhận nộp hồ sơ ${khi}. MIMI chưa có bằng chứng về phản hồi mới. Bạn đã nhận được thông báo nào chưa?`;
}

export function hanhDongTiepHanhTrinh(h: ViecHanhTrinh, trangThai: TrangThaiViec, bc: readonly BangChung[], homNay: string): HanhDongTiep | null {
  if (!laDangMo(trangThai)) return null;
  const chung = (): Pick<HanhDongTiep, 'can_nhap' | 'nguon' | 'dich'> => ({ can_nhap: [], nguon: ['Việc đang làm của công ty'], dich: null });
  if (h.cau_hoi) {
    const c = h.cau_hoi;
    return {
      ...chung(), loai: 'tra_loi', tieu_de: DU_KIEN[c.khoa]?.viec ?? `Trả lời: ${c.cau}`, mo_ta: c.cau, vi_sao: c.vi_sao,
      can_nhap: [{ khoa: c.khoa, cau: c.cau, kieu: c.kieu, lua_chon: c.lua_chon }], chan: true,
      dieu_kien_xong: 'Bạn trả lời câu hỏi (ở đây, trong Trợ lý hoặc từ pet đều ghi vào cùng một việc).', buoc: c.buoc,
    };
  }
  if (trangThai === 'waiting_external') {
    return {
      ...chung(), loai: 'kiem_phan_hoi', tieu_de: 'Kiểm tra xem bạn đã nhận phản hồi chưa', mo_ta: cauTheoDoi(ngayDaNop(bc), homNay),
      vi_sao: 'Việc chỉ xong khi có kết quả của cơ quan — nộp rồi chưa có nghĩa là đã được chấp nhận.', chan: false,
      dieu_kien_xong: 'Ghi số thông báo / biên nhận, hoặc tải lên văn bản phản hồi của cơ quan.',
      buoc: h.buoc.find((b) => b.loai_hanh_dong === 'kiem_ket_qua')?.khoa ?? null,
    };
  }
  const b = buocTiepTheo(h.buoc);
  if (!b) {
    return {
      ...chung(), loai: 'bo_sung_bang_chung', tieu_de: canBangChungKetQua(h.buoc) ? 'Ghi kết quả của cơ quan để đóng việc' : 'Xác nhận đã làm xong các bước',
      mo_ta: 'Các bước đã xong nhưng MIMI chưa có bằng chứng để đóng việc.', vi_sao: 'Việc không tự đóng khi chưa có bằng chứng.', chan: false,
      dieu_kien_xong: 'Có bằng chứng kết quả hoặc xác nhận của bạn.', buoc: null,
    };
  }
  if (b.khoa === 'nguoi_dung_nop') {
    return {
      ...chung(), loai: 'ghi_da_nop', tieu_de: 'Nộp hồ sơ, rồi ghi nhận đã nộp (kèm mã hồ sơ nếu có)',
      mo_ta: 'Bạn tự nộp trên Cổng dịch vụ công — MIMI không nộp, không ký thay. Nộp xong, ghi mã hồ sơ hoặc tải biên nhận để MIMI theo dõi phản hồi.',
      vi_sao: 'Có mã hồ sơ thì bạn và MIMI tra được tình trạng về sau.', chan: true,
      dieu_kien_xong: 'Bạn ghi nhận đã nộp (mã hồ sơ / biên nhận nếu có).', buoc: b.khoa,
    };
  }
  if (b.loai_hanh_dong === 'kiem_ket_qua') {
    return {
      ...chung(), loai: 'ghi_phan_hoi', tieu_de: 'Ghi kết quả của cơ quan', mo_ta: b.mo_ta, vi_sao: 'Việc chỉ đóng khi có bằng chứng kết quả.', chan: true,
      dieu_kien_xong: 'Số thông báo chấp nhận / biên nhận, hoặc văn bản phản hồi tải lên.', buoc: b.khoa,
    };
  }
  if (b.loai_hanh_dong === 'soan_tai_lieu') {
    return { ...chung(), loai: 'soan_tai_lieu', tieu_de: `Soạn: ${b.tieu_de}`, mo_ta: b.mo_ta, vi_sao: 'Giấy tờ của bước này.', chan: false, dieu_kien_xong: 'MIMI soạn bản nháp, lưu vào Tài liệu & Chứng từ.', buoc: b.khoa };
  }
  return {
    ...chung(), loai: 'lam_buoc', tieu_de: b.tieu_de, mo_ta: b.mo_ta, vi_sao: b.uu_tien >= 80 ? 'Cần làm trước các bước sau.' : 'Bước tiếp theo của việc này.',
    chan: b.uu_tien >= 80, dieu_kien_xong: 'Bạn làm xong và đánh dấu xong.', buoc: b.khoa, dich: b.dich_hanh_dong && b.dich_hanh_dong.startsWith('/') ? b.dich_hanh_dong : null,
  };
}

// ── Ba loại ngày ─────────────────────────────────────────────────────────────────────────────────
export interface NgayViec {
  han_luat: string | null;
  han_luat_nguon: string | null;
  ngay_nen_lam: string | null;
  ngay_nen_lam_ly_do: string | null;
}
const KHONG_NGAY: NgayViec = { han_luat: null, han_luat_nguon: null, ngay_nen_lam: null, ngay_nen_lam_ly_do: null };

/**
 * Ngày của việc có hướng dẫn, suy từ dữ kiện. Chỉ ghi HẠN LUẬT khi nguồn là hạn thật (hạn ghi trên thông
 * báo của cơ quan). Ngày tạm ngừng / trở lại / chấm dứt là ngày người dùng chọn → chỉ là ngày MIMI KHUYÊN
 * nộp hồ sơ trước đó; hạn chính thức của thủ tục đọc ở kho thủ tục, không viết cứng ở đây.
 */
export function ngayTuHanhTrinh(loai: LoaiHanhTrinh, dk: DuKien): NgayViec {
  const g = (k: string) => dk[k]?.gia_tri ?? null;
  switch (loai) {
    case 'authority_response': {
      const han = g('han_tra_loi');
      return han ? {
        han_luat: han, han_luat_nguon: 'Hạn ghi trên thông báo của cơ quan thuế (bạn nhập)',
        ngay_nen_lam: congNgay(han, -3), ngay_nen_lam_ly_do: 'MIMI khuyên gửi giải trình trước hạn 3 ngày',
      } : KHONG_NGAY;
    }
    case 'suspension': {
      const tu = g('tam_ngung_tu');
      return tu ? { ...KHONG_NGAY, ngay_nen_lam: tu, ngay_nen_lam_ly_do: 'MIMI khuyên nộp thông báo tạm ngừng trước ngày bắt đầu tạm ngừng; hạn chính thức xem ở thủ tục trên Cổng dịch vụ công' } : KHONG_NGAY;
    }
    case 'resumption': {
      const tu = g('tiep_tuc_tu');
      return tu ? { ...KHONG_NGAY, ngay_nen_lam: tu, ngay_nen_lam_ly_do: 'MIMI khuyên thông báo trước ngày kinh doanh trở lại; hạn chính thức xem ở thủ tục trên Cổng dịch vụ công' } : KHONG_NGAY;
    }
    case 'closure':
    case 'dissolution': {
      const n = g('ngay_cham_dut');
      return n ? { ...KHONG_NGAY, ngay_nen_lam: n, ngay_nen_lam_ly_do: 'MIMI khuyên xong nghĩa vụ và hồ sơ trước ngày ngừng kinh doanh; hạn chính thức xem ở thủ tục' } : KHONG_NGAY;
    }
    default:
      return KHONG_NGAY;
  }
}

// ── Hẹn kiểm lại ─────────────────────────────────────────────────────────────────────────────────
/** Lần 0: +3 ngày, lần 1: +7, sau đó mỗi 14 ngày — "đang chờ" không thành ngõ cụt, cũng không nhắc dồn. */
export function henKiemLaiKeTiep(tuNgay: string, soLanDaNhac: number): string {
  return congNgay(tuNgay, soLanDaNhac <= 0 ? 3 : soLanDaNhac === 1 ? 7 : 14);
}
export const denHanKiemLai = (v: { trang_thai: string; hen_kiem_lai: string | null }, homNay: string): boolean =>
  v.trang_thai === 'waiting_external' && !!v.hen_kiem_lai && v.hen_kiem_lai <= homNay;

// ── Lịch: một nguồn ngày, ba loại ────────────────────────────────────────────────────────────────
export type LoaiNgay = 'han_luat' | 'nen_lam' | 'hen_kiem_lai';
export const TEN_LOAI_NGAY: Record<LoaiNgay, string> = {
  han_luat: 'Hạn pháp lý',
  nen_lam: 'MIMI khuyên làm trước',
  hen_kiem_lai: 'Hẹn kiểm lại',
};

export interface CotNgayViec {
  id: string; tieu_de: string; trang_thai: string;
  han_luat: string | null; han_luat_nguon: string | null;
  ngay_nen_lam: string | null; ngay_nen_lam_ly_do: string | null;
  hen_kiem_lai: string | null;
}
export interface MucLich { viec_id: string; tieu_de: string; loai_ngay: LoaiNgay; ngay: string; ghi_chu: string | null; da_xong: boolean }

/** Mục lịch của một việc — đọc thẳng cột của hồ sơ việc, không giữ ngày riêng nào khác. */
export function lichTuViec(v: CotNgayViec): MucLich[] {
  const daXong = !laDangMo(v.trang_thai);
  const ra: MucLich[] = [];
  if (v.han_luat) ra.push({ viec_id: v.id, tieu_de: v.tieu_de, loai_ngay: 'han_luat', ngay: v.han_luat, ghi_chu: v.han_luat_nguon, da_xong: daXong });
  if (v.ngay_nen_lam) ra.push({ viec_id: v.id, tieu_de: v.tieu_de, loai_ngay: 'nen_lam', ngay: v.ngay_nen_lam, ghi_chu: v.ngay_nen_lam_ly_do, da_xong: daXong });
  if (v.hen_kiem_lai && v.trang_thai === 'waiting_external') ra.push({ viec_id: v.id, tieu_de: v.tieu_de, loai_ngay: 'hen_kiem_lai', ngay: v.hen_kiem_lai, ghi_chu: 'Kiểm xem đã có phản hồi của cơ quan chưa', da_xong: false });
  return ra;
}

// ── Việc cần làm: một danh sách, thứ tự cố định ──────────────────────────────────────────────────
/** 1 hạn luật đã qua · 2 hạn luật sắp tới · 3 chặn khai thuế · 4 chặn thủ tục · 5 soát doanh thu · 6 theo dõi · 7 nên làm */
export type MucUuTien = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const TEN_MUC: Record<MucUuTien, string> = {
  1: 'Quá hạn pháp lý', 2: 'Sắp tới hạn pháp lý', 3: 'Đang chặn tờ khai', 4: 'Đang chặn thủ tục',
  5: 'Soát doanh thu', 6: 'Theo dõi phản hồi', 7: 'Nên làm',
};

export interface ViecCanLam {
  /** Id hồ sơ việc; mục suy từ lịch/tiền vào (không lưu) có id dạng "nghia_vu:<khoa>" / "tien_vao:<nam>". */
  id: string;
  nguon: 'ho_so_viec' | 'nghia_vu' | 'tien_vao';
  loai: string;
  /** CÁI GÌ */
  tieu_de: string;
  trang_thai: string | null;
  muc: MucUuTien;
  /** VÌ SAO */
  vi_sao: string;
  /** KHI NÀO */
  khi: { loai_ngay: LoaiNgay; ngay: string; nhan: string } | null;
  /** VIỆC TIẾP THEO */
  hanh_dong: HanhDongTiep | null;
  /** Người dùng phải làm gì đó (pet hiện "Cần bạn"). */
  can_ban: boolean;
  duong_dan: string;
}

export function mucUuTienViec(v: { loai: string; trang_thai: string; han_luat: string | null; hen_kiem_lai: string | null }, homNay: string): MucUuTien {
  if (v.han_luat && v.han_luat < homNay) return 1;
  if (v.han_luat && soNgayGiua(homNay, v.han_luat) <= 30) return 2;
  if (v.loai === 'phan_loai_hoat_dong') return 3;
  if (v.trang_thai === 'waiting_external') return 6;
  if (['needs_information', 'ready_to_act', 'in_progress', 'needs_review'].includes(v.trang_thai)) return 4;
  return 7;
}

/** "Khi nào" của một việc: hạn luật trước, rồi hẹn kiểm lại (khi chờ), rồi ngày nên làm. */
export function khiNaoViec(v: CotNgayViec): ViecCanLam['khi'] {
  if (v.han_luat) return { loai_ngay: 'han_luat', ngay: v.han_luat, nhan: `${TEN_LOAI_NGAY.han_luat}: ${ngayVN(v.han_luat)}` };
  if (v.trang_thai === 'waiting_external' && v.hen_kiem_lai) return { loai_ngay: 'hen_kiem_lai', ngay: v.hen_kiem_lai, nhan: `${TEN_LOAI_NGAY.hen_kiem_lai}: ${ngayVN(v.hen_kiem_lai)}` };
  if (v.ngay_nen_lam) return { loai_ngay: 'nen_lam', ngay: v.ngay_nen_lam, nhan: `${TEN_LOAI_NGAY.nen_lam}: ${ngayVN(v.ngay_nen_lam)}` };
  return null;
}

/** Xếp: mức ưu tiên, rồi ngày gần trước (không ngày xếp sau), rồi tiêu đề — ổn định giữa các lần tải. */
export function xepViec(ds: ViecCanLam[]): ViecCanLam[] {
  return [...ds].sort((a, b) => a.muc - b.muc
    || (a.khi?.ngay ?? '9999-12-31').localeCompare(b.khi?.ngay ?? '9999-12-31')
    || a.tieu_de.localeCompare(b.tieu_de, 'vi'));
}

/** Việc đã giải quyết/huỷ không vào danh sách việc cần làm (lịch vẫn hiện, gạch đi). */
export const conCanLam = (trangThai: string) => !laDaGiaiQuyet(trangThai) && trangThai !== 'cancelled';
