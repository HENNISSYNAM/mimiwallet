/**
 * Hỏi Cas xem một grant QR còn sống không — thay vì mặc định là còn.
 *
 * VÌ SAO CÓ. Nghiệm thu case 10 ngày 12/09/2026: người dùng ngắt quyền trong app
 * Cas, Casso gửi `USER_PERMISSION_REVOKED` cho grant QR đang gắn với liên kết
 * MB ••••2002. MIMI ghi `verified · alive:khong-co-sao-ke` và vẫn hiện "Sẵn sàng
 * nhận tiền QR".
 *
 * Lý do: liên kết QR không có sao kê, nên `ingestConnection` trả về rỗng mà
 * không gọi Cas, và `cas-webhook` coi "không lỗi" là "còn sống". Nguyên tắc của
 * cả hàm webhook — nội dung chỉ là lời báo, phải hỏi lại Cas — lọt mất đúng ở
 * loại liên kết này.
 *
 * `/qr-pay/identity` gọi được bằng grant QR, nên nó là câu hỏi đúng.
 *
 * THẬN TRỌNG VỀ PHÍA NGẮT. Chỉ mã nói chắc grant đã mất mới dẫn tới ngắt liên
 * kết. Mã lạ trả về `chua_ro` kèm mã, không đổi trạng thái: ngắt nhầm một grant
 * còn sống là mất khả năng nhận tiền mà không ai biết vì sao — tệ hơn là ghi lại
 * mã để người đọc nhật ký quyết.
 *
 * Nhận hàm gọi Cas từ ngoài vào để test được không cần mạng hay Deno.
 */

export type KetLuanGrant =
  | { trangThai: 'song' }
  | { trangThai: 'da_thu_hoi'; ma: string }
  | { trangThai: 'gioi_han' }
  | { trangThai: 'chua_ro'; ma: string };

/** Mã Cas nói chắc chắn grant không còn dùng được. */
export const MA_DA_THU_HOI: ReadonlySet<string> = new Set([
  'GRANT_NOT_FOUND',
  'USER_PERMISSION_REVOKED',
  'GRANT_REVOKED',
  'INVALID_ACCESS_TOKEN',
  'ACCESS_TOKEN_INVALID',
]);

export function ketLuanLoiGrant(errorCode: string | null | undefined): KetLuanGrant {
  const ma = (errorCode ?? '').trim();
  if (!ma) return { trangThai: 'chua_ro', ma: 'KHONG_CO_MA' };
  if (MA_DA_THU_HOI.has(ma)) return { trangThai: 'da_thu_hoi', ma };
  if (ma === 'RATE_LIMIT') return { trangThai: 'gioi_han' };
  return { trangThai: 'chua_ro', ma };
}

export async function kiemGrantQr(hoiCas: () => Promise<unknown>): Promise<KetLuanGrant> {
  try {
    await hoiCas();
    return { trangThai: 'song' };
  } catch (e) {
    const ma = e && typeof e === 'object' && 'errorCode' in e ? String((e as { errorCode?: unknown }).errorCode ?? '') : '';
    // Lỗi không mang mã Cas (mạng, hết giờ) không nói gì về grant.
    return ma ? ketLuanLoiGrant(ma) : { trangThai: 'chua_ro', ma: 'LOI_KET_NOI' };
  }
}

/** Nhãn ngắn cho ghi chú nhật ký webhook và kết quả đồng bộ. */
export function nhanKetLuan(kl: KetLuanGrant): string {
  switch (kl.trangThai) {
    case 'song':
      return 'alive:qr-da-hoi-cas';
    case 'da_thu_hoi':
      return `da-thu-hoi:${kl.ma}`;
    case 'gioi_han':
      return 'rate-limited';
    case 'chua_ro':
      return `chua-ro:${kl.ma}`;
  }
}
