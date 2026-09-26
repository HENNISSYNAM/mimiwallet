/**
 * Sự kiện ngoài và xung đột hoá đơn — Prompt 5 mục 7, 10–11. Hàm thuần.
 *
 * WEBHOOK LÀ GỢI Ý. Phong bì Cas (`cas-webhook/phong-bi.ts`) được chuẩn hoá thành một khuôn chung, với
 * `verification_status` nói rõ đã kiểm lại nguồn chưa:
 *   GRANT, TRANSACTIONS → `unverified` cho tới khi hỏi lại API Cas (cas-webhook đang làm việc đó);
 *   INVOICE, TVAN, SIGN, AUTO_DEBIT → `not_verifiable`: MIMI chưa dùng các kênh này nên không có gì để
 *   đối chiếu — và vì vậy KHÔNG được đổi trạng thái nào trong MIMI từ chúng.
 *
 * XUNG ĐỘT HOÁ ĐƠN: trạng thái trong MIMI khác trạng thái bên ngoài → ghi xung đột, không ghi đè. Thứ tự
 * tin: cơ quan thuế > nhà cung cấp > MIMI. MIMI hôm nay chưa ghép được hoá đơn Invoice Hub với hoá đơn
 * của mình, nên hàm này chưa được nối vào webhook — sẵn cho lúc bật INVOICE_SYNC_ENABLED.
 */
import type { VongDoi } from '../hoa-don/vong-doi.ts';

export type LoaiSuKien = 'GRANT' | 'TRANSACTIONS' | 'INVOICE' | 'TVAN' | 'SIGN' | 'AUTO_DEBIT';
export type KiemChung = 'unverified' | 'verified' | 'not_verifiable' | 'rejected';

export interface SuKienNgoai {
  provider: 'cas';
  event_type: LoaiSuKien;
  event_code: string | null;
  external_subject_type: string | null;
  external_subject_id: string | null;
  environment: 'production' | 'sandbox' | 'unknown';
  verification_status: KiemChung;
  /** Được phép đổi trạng thái nghiệp vụ trong MIMI hay không. */
  duoc_doi_trang_thai: boolean;
}

export function chuanHoaSuKien(o: {
  loai: LoaiSuKien; ma: string | null; doi_tuong: { kieu: string; id: string } | null;
  moi_truong: string | null; khoa_hop_le: boolean; da_kiem_lai_nguon: boolean;
}): SuKienNgoai {
  const khongDung = o.loai === 'INVOICE' || o.loai === 'TVAN' || o.loai === 'SIGN' || o.loai === 'AUTO_DEBIT';
  const verification_status: KiemChung = !o.khoa_hop_le ? 'rejected' : khongDung ? 'not_verifiable' : o.da_kiem_lai_nguon ? 'verified' : 'unverified';
  return {
    provider: 'cas', event_type: o.loai, event_code: o.ma,
    external_subject_type: o.doi_tuong?.kieu ?? null, external_subject_id: o.doi_tuong?.id ?? null,
    environment: o.moi_truong === 'production' ? 'production' : o.moi_truong === 'dev' || o.moi_truong === 'sandbox' ? 'sandbox' : 'unknown',
    verification_status,
    // Chỉ sự kiện đã kiểm lại nguồn mới được chạm trạng thái nghiệp vụ.
    duoc_doi_trang_thai: verification_status === 'verified',
  };
}

export type NguonTrangThai = 'co_quan_thue' | 'nha_cung_cap' | 'mimi';
const DO_TIN: Record<NguonTrangThai, number> = { co_quan_thue: 3, nha_cung_cap: 2, mimi: 1 };

export interface XungDot { trang_thai_trong: VongDoi; trang_thai_ngoai: VongDoi; nguon: NguonTrangThai; goi_y: string; thang: 'ngoai' | 'trong' }

/**
 * Hai bên khác nhau → xung đột (không bao giờ ghi đè im lặng). Trạng thái ngoài `unknown` không đủ để kết
 * luận gì. Gợi ý nói bên nào đáng tin hơn theo thứ tự tin, và việc cần làm.
 */
export function xungDotHoaDon(o: { trong: VongDoi; ngoai: VongDoi; nguonNgoai: NguonTrangThai }): XungDot | null {
  if (o.trong === o.ngoai || o.ngoai === 'unknown') return null;
  const thang = DO_TIN[o.nguonNgoai] > DO_TIN.mimi ? 'ngoai' : 'trong';
  const huyThay = o.ngoai === 'cancelled' || o.ngoai === 'replaced' || o.ngoai === 'adjusted';
  const goi_y = huyThay && (o.trong === 'paid' || o.trong === 'issued' || o.trong === 'overdue')
    ? 'Bên ngoài ghi hoá đơn đã bị huỷ / thay / điều chỉnh trong khi MIMI vẫn tính là còn hiệu lực — kiểm trên cổng hoá đơn điện tử trước khi thu tiền hay kê khai.'
    : o.ngoai === 'paid' && o.trong !== 'paid'
      ? 'Bên ngoài ghi đã thu nhưng MIMI chưa thấy tiền về — MIMI chỉ ghi "đã thu" khi đối soát được với sao kê.'
      : 'Hai bên ghi khác nhau — kiểm lại hoá đơn trên cổng.';
  return { trang_thai_trong: o.trong, trang_thai_ngoai: o.ngoai, nguon: o.nguonNgoai, goi_y, thang };
}
