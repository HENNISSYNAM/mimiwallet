/**
 * Sổ năng lực nhà cung cấp — Prompt 5 mục 37, 39. Không gọi năng lực nào chưa có trong sổ ở trạng thái
 * `supported` VÀ cờ bật. Mỗi dòng ghi LÝ DO và nguồn, để "chưa hỗ trợ" không bị hiểu là "quên làm".
 *
 * Nguồn: docs/NOP_THAY_TVAN.md (dữ liệu đã cào từ tài liệu Cas và nguồn công khai, 25/09/2026).
 */

export type NangLuc =
  | 'transactions' | 'invoice_status' | 'tax_submission' | 'document_signing' | 'tax_xml_signing' | 'status_lookup' | 'manual_submission';
export type MucHoTro = 'supported' | 'sandbox_only' | 'unsupported';

export interface DongNangLuc {
  nha_cung_cap: 'cas' | 'nguoi_dung';
  nang_luc: NangLuc;
  muc: MucHoTro;
  /** Cờ môi trường phải bật thì mới dùng, kể cả khi `supported`. */
  co?: 'TVAN_EXECUTION_ENABLED' | 'SIGN_EXECUTION_ENABLED' | 'INVOICE_SYNC_ENABLED';
  ly_do: string;
  xac_minh_luc: string;
}

export const SO_NANG_LUC: DongNangLuc[] = [
  { nha_cung_cap: 'cas', nang_luc: 'transactions', muc: 'supported', ly_do: 'Đang chạy: webhook TRANSACTIONS → hỏi lại Cas → ghi giao dịch.', xac_minh_luc: '2026-09-24' },
  { nha_cung_cap: 'cas', nang_luc: 'invoice_status', muc: 'unsupported', co: 'INVOICE_SYNC_ENABLED', ly_do: 'MIMI chưa phát hành hoá đơn qua Invoice Hub; sự kiện INVOICE chỉ được ghi nhận.', xac_minh_luc: '2026-09-25' },
  { nha_cung_cap: 'cas', nang_luc: 'tax_submission', muc: 'unsupported', co: 'TVAN_EXECUTION_ENABLED', ly_do: 'Chưa có XSD tờ khai (cần bộ HTKK), chưa có dịch vụ ký số XML từ xa, chưa rõ yêu cầu đăng ký phần mềm với Cục Thuế.', xac_minh_luc: '2026-09-25' },
  { nha_cung_cap: 'cas', nang_luc: 'tax_xml_signing', muc: 'unsupported', ly_do: 'eSign của Cas chỉ ký PDF; tờ khai TVAN là XML — cần MySign/SmartCA (chưa có hợp đồng).', xac_minh_luc: '2026-09-25' },
  { nha_cung_cap: 'cas', nang_luc: 'document_signing', muc: 'sandbox_only', co: 'SIGN_EXECUTION_ENABLED', ly_do: 'API ký PDF có tài liệu (/esign/request-document), chưa thử ở sandbox; không ký văn bản thật.', xac_minh_luc: '2026-09-25' },
  { nha_cung_cap: 'cas', nang_luc: 'status_lookup', muc: 'unsupported', co: 'TVAN_EXECUTION_ENABLED', ly_do: 'GET /tvan/get có tài liệu nhưng chỉ dùng được khi đã nộp qua TVAN.', xac_minh_luc: '2026-09-25' },
  { nha_cung_cap: 'nguoi_dung', nang_luc: 'manual_submission', muc: 'supported', ly_do: 'Người dùng tự nộp trên Cổng dịch vụ công; MIMI đóng băng tài liệu, ghi biên nhận, theo dõi kết quả.', xac_minh_luc: '2026-09-26' },
];

export interface KetQuaKiemNangLuc { duoc: boolean; ly_do: string; dong: DongNangLuc | null }

/** `moiTruong`: 'production' thì `sandbox_only` KHÔNG được dùng. Cờ đọc từ `co` (env). */
export function kiemNangLuc(o: { nha_cung_cap: DongNangLuc['nha_cung_cap']; nang_luc: NangLuc; moiTruong: 'production' | 'sandbox'; co: (ten: string) => boolean }): KetQuaKiemNangLuc {
  const d = SO_NANG_LUC.find((x) => x.nha_cung_cap === o.nha_cung_cap && x.nang_luc === o.nang_luc) ?? null;
  if (!d) return { duoc: false, ly_do: 'Năng lực này chưa có trong sổ.', dong: null };
  if (d.muc === 'unsupported') return { duoc: false, ly_do: d.ly_do, dong: d };
  if (d.muc === 'sandbox_only' && o.moiTruong === 'production') return { duoc: false, ly_do: `Chỉ chạy ở môi trường thử. ${d.ly_do}`, dong: d };
  if (d.co && !o.co(d.co)) return { duoc: false, ly_do: 'Tính năng đang tắt.', dong: d };
  return { duoc: true, ly_do: d.ly_do, dong: d };
}
