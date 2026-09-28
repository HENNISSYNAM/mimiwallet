/**
 * Kéo hoá đơn điện tử từ Tổng Cục Thuế (qua Cas) cho MỘT công ty — dùng chung cho nút "Tải hoá đơn"
 * (`bank-link` action `gdt-sync`) và lịch tự đồng bộ hằng ngày (`thong-bao` hành động `quet`).
 *
 * VÌ SAO TÁCH RA (28/09/2026). Trên DB thật có 2 liên kết `gdt` "connected" từ 15/09 mà 0 hoá đơn:
 * liên kết xong, giao diện gọi đồng bộ SAO KÊ (bỏ qua grant `gdt`), nên hoá đơn chỉ về khi người
 * dùng tự tìm nút tải riêng. Và nhánh cũ không ghi `last_synced_at`, nên không ai biết nó đã từng
 * chạy hay chưa. Nay: tự chạy theo lịch, và mọi lần chạy — được hay lỗi — đều để lại dấu vết.
 */
import { BankhubError, fetchGdtInvoices, type BankhubConfig } from '../bank/bankhub.ts';
import { describeBankError } from '../bank/errors.ts';
import { loiNhacLienKetLai, truongNgatGrant, xuLyLoiGrant } from '../bank/kiem-grant-qr.ts';
import type { EncryptedBlob } from '../pqcCrypto.ts';
import { mapGdtInvoices, revenueFromInvoices } from './gdt-invoice-map.ts';

// deno-lint-ignore no-explicit-any
type Db = any;

/** Lần đầu kéo lùi 12 tháng (cùng mốc với sao kê). */
export const THANG_LUI_LAN_DAU = 12;
/** Lần sau: kéo lùi 45 ngày — hoá đơn có thể được cơ quan thuế cấp mã trễ vài tuần sau ngày lập. */
export const NGAY_LUI_DINH_KY = 45;
/** Lịch tự đồng bộ: một liên kết chạy tối đa một lần trong khoảng này. */
export const GIAN_CACH_TU_DONG_MS = 20 * 3_600_000;

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export type KetQuaGdt =
  | { loai: 'xong'; fetched: number; stored: number; skipped: number; issued: number; received: number; revenueFromInvoices: number; window: { fromDate: string; toDate: string } }
  | { loai: 'thieu_mst' }
  | { loai: 'chua_ket_noi' }
  | { loai: 'thu_hoi'; errorCode: string; requestId: string | null; remedy: string }
  | { loai: 'loi_cas'; errorCode: string; message: string; action: string; remedy: string; requestId: string | null; canDangNhapLai: boolean }
  | { loai: 'loi_ghi'; message: string };

export interface TuyChonGdt {
  /** Ép mốc bắt đầu (nút tải tay có thể gửi `from_date`). */
  fromDate?: string;
  now?: Date;
  /** Cho test thay lời gọi Cas. */
  layHoaDon?: typeof fetchGdtInvoices;
  giaiMa?: (blob: EncryptedBlob, khoa: string) => Promise<string>;
}

/** Mốc bắt đầu: chưa đồng bộ lần nào → 12 tháng; đã có → 45 ngày trước lần cuối (không sớm hơn 12 tháng). */
export function mocBatDau(lanCuoi: string | null, now: Date): string {
  const xaNhat = new Date(now); xaNhat.setMonth(xaNhat.getMonth() - THANG_LUI_LAN_DAU);
  if (!lanCuoi) return isoDate(xaNhat);
  const tu = new Date(Date.parse(lanCuoi) - NGAY_LUI_DINH_KY * 86_400_000);
  return isoDate(tu < xaNhat ? xaNhat : tu);
}

export async function dongBoHoaDonThue(
  db: Db, cfg: BankhubConfig, privateKey: string, companyId: string, tc: TuyChonGdt = {},
): Promise<KetQuaGdt> {
  const now = tc.now ?? new Date();
  const { data: comp } = await db.from('companies').select('tax_id').eq('id', companyId).maybeSingle();
  const companyTaxCode = (comp?.tax_id as string | null) ?? '';
  // Thiếu MST thì không phân biệt được hoá đơn bán ra và mua vào — hỏi, không đoán.
  if (!companyTaxCode) return { loai: 'thieu_mst' };

  const { data: conn } = await db.from('bank_connections')
    .select('id, access_token_enc, last_synced_at')
    .eq('company_id', companyId).eq('provider', 'bankhub').eq('scopes', 'gdt').eq('status', 'connected')
    .is('revoked_at', null)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!conn?.access_token_enc) return { loai: 'chua_ket_noi' };

  // Nạp mã hoá kháng lượng tử khi cần (nó kéo thư viện qua URL — môi trường test truyền `giaiMa` riêng).
  const giaiMa = tc.giaiMa ?? (await import('../pqcCrypto.ts')).decryptField;
  const accessToken = await giaiMa(conn.access_token_enc as EncryptedBlob, privateKey);
  const toDate = isoDate(now);
  const fromDate = tc.fromDate ?? mocBatDau(conn.last_synced_at ?? null, now);

  let payload: { requestId?: string; gdtInvoices?: unknown[] };
  try {
    payload = await (tc.layHoaDon ?? fetchGdtInvoices)(cfg, accessToken, { fromDate, toDate });
  } catch (e) {
    if (!(e instanceof BankhubError)) throw e;
    const luc = now.toISOString();
    // Grant bị thu hồi trên Cas ID: ngắt như mọi liên kết khác.
    if (xuLyLoiGrant(e.errorCode, e.needsRelink) === 'ngat') {
      await db.from('bank_connections').update({ ...truongNgatGrant(now), last_error_code: e.errorCode, last_error_at: luc }).eq('id', conn.id);
      return { loai: 'thu_hoi', errorCode: e.errorCode, requestId: e.requestId ?? null, remedy: loiNhacLienKetLai('gdt') };
    }
    await db.from('bank_connections').update({
      last_error_code: e.errorCode, last_error_at: luc,
      ...(e.needsRelink ? { status: 'needs_relink', revoked_at: luc } : {}),
    }).eq('id', conn.id);
    const { action, remedy } = describeBankError(e.errorCode);
    return {
      loai: 'loi_cas', errorCode: e.errorCode, message: e.message, action, requestId: e.requestId ?? null, canDangNhapLai: e.needsRelink,
      remedy: e.needsRelink ? 'Bấm "Cập nhật" ở dòng Tổng Cục Thuế để đăng nhập lại. Không phải kết nối lại từ đầu.' : remedy,
    };
  }

  const { rows, rejected } = mapGdtInvoices((payload.gdtInvoices ?? []) as never[], { companyTaxCode });
  if (rejected.length) console.warn(`gdt sync ${companyId}: bỏ qua ${rejected.length}`, rejected.slice(0, 10));
  if (rows.length) {
    const { error } = await db.from('gdt_invoices').upsert(
      rows.map((r) => ({ ...r, company_id: companyId, synced_at: now.toISOString() })),
      { onConflict: 'company_id,gdt_id' },
    );
    if (error) {
      console.error('ghi hoá đơn GDT lỗi:', error.message);
      return { loai: 'loi_ghi', message: error.message };
    }
  }
  // Ghi dấu lần chạy thành công — kể cả khi 0 hoá đơn: "đã hỏi, không có" khác "chưa hỏi".
  await db.from('bank_connections').update({ last_synced_at: now.toISOString(), last_error_code: null, last_error_at: null }).eq('id', conn.id);

  const issued = rows.filter((r) => r.direction === 'issued').length;
  return {
    loai: 'xong', fetched: payload.gdtInvoices?.length ?? 0, stored: rows.length, skipped: rejected.length,
    issued, received: rows.length - issued, revenueFromInvoices: revenueFromInvoices(rows), window: { fromDate, toDate },
  };
}

/** Liên kết thuế đến hạn tự đồng bộ: chưa chạy lần nào, hoặc lần cuối đã quá GIAN_CACH_TU_DONG_MS. */
export function denHanTuDong(lanCuoi: string | null, now: Date): boolean {
  return !lanCuoi || now.getTime() - Date.parse(lanCuoi) >= GIAN_CACH_TU_DONG_MS;
}
