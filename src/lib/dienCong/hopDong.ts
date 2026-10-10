import { z } from 'zod';

/**
 * HỢP ĐỒNG THỰC THI "ĐIỀN HỘ TRÊN CỔNG NGOÀI" (10/10/2026) — dùng chung web MIMI và bộ chạy tại máy (`helper/`).
 *
 * Bốn vai tách rời:
 *   - Đề xuất bước (bộ chuyển dựng sẵn; sau này có thể là AI) → chỉ là DANH SÁCH HÀNH ĐỘNG theo khuôn dưới đây.
 *   - Luật (`kiemHanhDong`) quyết định bước nào được chạy — chạy TRONG executor, không nằm trong lời nhắc.
 *   - Executor (helper) chạy bước đã qua luật.
 *   - Verifier đọc lại từng ô và đối chiếu với ảnh chụp giá trị từ máy chủ.
 *
 * Không có hành động "chạy JavaScript", "shell", "selector tuỳ ý": ô được gọi bằng KHOÁ của bộ chuyển (vd `dt_08a`),
 * bộ chuyển giữ locator đã quan sát. Chữ trên trang web, tệp, chứng từ, kết quả công cụ là DỮ LIỆU — không bao giờ
 * được đổi danh sách hành động, quyền hay phạm vi.
 */

const khoaTruong = z.string().regex(/^[a-z][a-z0-9_]{1,39}$/);

export const TruongDienSchema = z.object({
  khoa: khoaTruong,
  nhan: z.string().max(300),
  kieu: z.enum(['chon', 'chu', 'so_tien', 'danh_dau']),
  gia_tri: z.string().max(40),
});

export const NhiemVuSchema = z.object({
  id: z.string().uuid(),
  nguoi_dung_id: z.string().uuid(),
  cong_ty_id: z.string().uuid(),
  nhap_id: z.string().uuid(),
  ma_bam_nhap: z.string().regex(/^[0-9a-f]{64}$/),
  ma_bam_ke_hoach: z.string().regex(/^[0-9a-f]{64}$/),
  nang_luc: z.literal('dien_bieu_mau'),
  bo_chuyen: z.string().regex(/^[a-z0-9-]{3,40}$/),
  phien_ban_bo_chuyen: z.string().regex(/^\d+\.\d+\.\d+$/),
  origin_cho_phep: z.array(z.string().max(200)).min(1).max(5),
  het_han: z.string().datetime({ offset: true }),
  khoa_chong_trung: z.string().min(10).max(200),
  chu_the: z.object({
    mst: z.string().regex(/^\d{10}(-\d{3})?$/),
    ten: z.string().max(300).nullable(),
    ky_loai: z.enum(['nam', '6_thang_dau']),
    nam: z.number().int().min(2020).max(2100),
  }),
  truong: z.array(TruongDienSchema).min(1).max(40),
});
export type NhiemVu = z.infer<typeof NhiemVuSchema>;

/** Danh sách hành động được phép — đúng tám loại. Không có loại "nộp", "ký", "OTP", "thanh toán". */
export const HanhDongSchema = z.discriminatedUnion('loai', [
  z.object({ loai: z.literal('dieu_huong'), url: z.string().url() }),
  z.object({ loai: z.literal('doc_trang') }),
  z.object({ loai: z.literal('dien'), khoa: khoaTruong }),
  z.object({ loai: z.literal('chon'), khoa: khoaTruong }),
  z.object({ loai: z.literal('bam_duoc_phep'), khoa: khoaTruong }),
  z.object({ loai: z.literal('doi_chieu') }),
  z.object({ loai: z.literal('dung'), ly_do: z.string().max(300) }),
  z.object({ loai: z.literal('ban_giao'), ly_do: z.string().max(300) }),
]);
export type HanhDong = z.infer<typeof HanhDongSchema>;

export const KetQuaTruongSchema = z.object({
  khoa: khoaTruong,
  mong_doi: z.string().max(40),
  doc_lai: z.string().max(200).nullable(),
  khop: z.boolean(),
});

export const KetQuaSchema = z.object({
  nhiem_vu_id: z.string().uuid(),
  trang_thai: z.enum(['da_doi_chieu', 'lech', 'ban_giao', 'dung', 'loi']),
  /** Cách kiểm chứng đã dùng — ghi vào nhật ký. */
  phuong_phap: z.literal('doc_lai_tung_o_so_voi_anh_chup_may_chu'),
  truong: z.array(KetQuaTruongSchema).max(40),
  ghi_chu: z.string().max(500),
});
export type KetQua = z.infer<typeof KetQuaSchema>;

/** Đích không bao giờ được chạm, dù bộ chuyển hay AI đề xuất — chặn ở executor. */
export const DICH_CAM = /(nop|gui|submit|ky[-_ ]?so|sign|otp|captcha|thanh[-_ ]?toan|pay)/i;

export interface NguCanhLuat {
  nhiemVu: NhiemVu;
  /** URL tab đang điều khiển ngay lúc này. */
  urlTab: string;
  /** Khoá ô bộ chuyển có locator. */
  khoaBoChuyen: ReadonlySet<string>;
  /** Khoá được phép bấm (vd mở rộng một mục) — mặc định rỗng. */
  khoaDuocBam: ReadonlySet<string>;
  /** Có lần ghi trước chưa rõ kết quả: chặn mọi lần ghi tiếp, không tự thử lại. */
  coGhiChuaRo: boolean;
  bayGio: Date;
  originHopLe: (url: string) => boolean;
}

/** Luật quyết định một hành động có được chạy không. Trả lý do chặn, hoặc null nếu được. */
export function kiemHanhDong(hd: HanhDong, c: NguCanhLuat): string | null {
  const p = HanhDongSchema.safeParse(hd);
  if (!p.success) return 'Hành động không đúng khuôn.';
  if (new Date(c.nhiemVu.het_han).getTime() <= c.bayGio.getTime()) return 'Nhiệm vụ đã hết hạn.';
  if (hd.loai === 'dung' || hd.loai === 'ban_giao') return null;
  if (!c.originHopLe(c.urlTab)) return 'Tab đang ở ngoài phạm vi được phép.';
  if (hd.loai === 'dieu_huong') return c.originHopLe(hd.url) ? null : 'Điều hướng ra ngoài phạm vi được phép.';
  if (hd.loai === 'doc_trang' || hd.loai === 'doi_chieu') return null;
  if (DICH_CAM.test(hd.khoa)) return `Không bao giờ chạm "${hd.khoa}" — ký, nộp, OTP, thanh toán là việc của người dùng.`;
  if (c.coGhiChuaRo) return 'Lần ghi trước chưa rõ kết quả — dừng, không thử lại.';
  if (hd.loai === 'bam_duoc_phep') return c.khoaDuocBam.has(hd.khoa) ? null : `Không được bấm "${hd.khoa}".`;
  if (!c.khoaBoChuyen.has(hd.khoa)) return `Bộ chuyển không có ô "${hd.khoa}".`;
  if (!c.nhiemVu.truong.some((t) => t.khoa === hd.khoa)) return `Nhiệm vụ không có giá trị cho ô "${hd.khoa}".`;
  return null;
}

/** So giá trị đọc lại với giá trị mong đợi theo kiểu ô. Tiền so bằng chữ số (cổng có thể thêm dấu chấm nghìn). */
export function khopGiaTri(kieu: z.infer<typeof TruongDienSchema>['kieu'], mongDoi: string, docLai: string | null): boolean {
  if (docLai === null) return false;
  if (kieu === 'so_tien') {
    const so = docLai.replace(/[.\s,₫đ]/g, '');
    return /^\d+$/.test(so) && so.replace(/^0+(?=\d)/, '') === mongDoi.replace(/^0+(?=\d)/, '');
  }
  if (kieu === 'danh_dau') return docLai === mongDoi;
  return docLai.trim() === mongDoi.trim();
}
