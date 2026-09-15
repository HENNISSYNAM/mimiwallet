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

/*
 * ── MỌI LOẠI LIÊN KẾT, KHÔNG CHỈ QR ────────────────────────────────────────
 *
 * VÌ SAO. Casso báo ngày 15/09/2026: xoá cấp quyền trên Cas ID thì liên kết QR
 * biến khỏi MIMI, còn liên kết đọc sao kê (`transaction`) vẫn nằm lại với nút
 * "Cập nhật" — bấm vào chỉ ra "Liên kết không tồn tại hoặc đã thu hồi ·
 * GRANT_NOT_FOUND".
 *
 * Cơ chế: `errors.ts` xếp GRANT_NOT_FOUND vào `relink`, nên `BankhubError.needsRelink`
 * là true. `ingest.ts` hỏi `needsRelink` trước và đổi dòng sang `needs_relink`;
 * `cas-webhook` cũng hỏi `needsRelink` trước, nên nhánh "GRANT_NOT_FOUND → ngắt"
 * viết ngay bên dưới không bao giờ chạy. "Cần đăng nhập lại" và "grant không còn"
 * bị gộp làm một, trong khi Update Mode chỉ cứu được cái đầu.
 *
 * Quy tắc: hỏi "grant đã chết chưa" TRƯỚC, bằng cùng bộ mã `MA_DA_THU_HOI` mà
 * liên kết QR đã dùng — một định nghĩa thu hồi cho mọi loại liên kết.
 */

export type XuLyLoiGrant = 'ngat' | 'dang_nhap_lai' | 'giu';

/**
 * `ngat`: grant đã mất bên Cas — ngắt liên kết, xoá token.
 * `dang_nhap_lai`: grant còn, cần xác thực lại — `needs_relink`, mời "Cập nhật".
 * `giu`: lỗi tạm thời hoặc mã lạ — không đổi trạng thái.
 */
export function xuLyLoiGrant(errorCode: string | null | undefined, canDangNhapLai: boolean): XuLyLoiGrant {
  if (ketLuanLoiGrant(errorCode).trangThai === 'da_thu_hoi') return 'ngat';
  return canDangNhapLai ? 'dang_nhap_lai' : 'giu';
}

/** Trường ghi vào `bank_connections` khi ngắt vì grant đã mất: token vô dụng, giữ lại chỉ thêm rủi ro. */
export function truongNgatGrant(luc: Date) {
  return {
    status: 'disconnected',
    revoked_at: luc.toISOString(),
    access_token_enc: null,
    grant_id: null,
  } as const;
}

/** Việc người dùng làm tiếp, theo đúng nút trên màn hình Fintech Hub cho từng loại liên kết. */
export function loiNhacLienKetLai(scopes: string | null | undefined): string {
  if (scopes === 'qrpay') return 'MIMI đã gỡ liên kết này. Bấm "Liên kết để nhận tiền QR" rồi quét lại mã trong app Cas nếu vẫn cần.';
  if (scopes === 'gdt') return 'MIMI đã gỡ liên kết này. Bấm "Kết nối Tổng Cục Thuế" để cấp quyền mới nếu vẫn cần.';
  return 'MIMI đã gỡ liên kết này. Bấm "Liên kết ngân hàng" để cấp quyền mới nếu vẫn cần đọc sao kê.';
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
