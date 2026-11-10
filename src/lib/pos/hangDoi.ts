/**
 * Hàng đợi bán TIỀN MẶT khi mất mạng.
 *
 * Quầy không được dừng vì Wi-Fi chập chờn: lần bán tiền mặt được ghi vào máy (localStorage) kèm `client_id`
 * do máy sinh, rồi gửi lên khi có mạng. Máy chủ coi `client_id` là khoá: gửi lại bao nhiêu lần cũng chỉ một
 * dòng (`ban_hang_pos_client_uniq`). Nên hàng đợi chỉ cần "gửi tới khi máy chủ trả lời", không cần đoán.
 *
 * Chuyển khoản KHÔNG xếp hàng: VietQR cần mã do máy chủ sinh và cần máy chủ thấy tiền về.
 *
 * Bộ nhớ có thể bị chặn (chế độ riêng tư, WebView tắt lưu trữ): mọi lần đọc/ghi bọc try/catch, hỏng thì
 * coi như hàng rỗng và báo cho màn hình biết để nói với người bán.
 */
export interface BanCho {
  client_id: string;
  so_tien: number;
  phuong_thuc: 'cash';
  ghi_chu: string | null;
  dong_hang: { ten: string; so_luong: number; don_gia: number }[];
  ban_luc: string;
  company_id: string | null;
}

export interface KhoLuu {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export const KHOA_HANG_DOI = 'mimi:pos:hang-doi';

function khoMacDinh(): KhoLuu | null {
  try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; }
}

export function docHangDoi(kho: KhoLuu | null = khoMacDinh()): BanCho[] {
  if (!kho) return [];
  try {
    const v = JSON.parse(kho.getItem(KHOA_HANG_DOI) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => x && typeof x.client_id === 'string' && typeof x.so_tien === 'number') : [];
  } catch {
    return [];
  }
}

function ghi(ds: BanCho[], kho: KhoLuu | null): boolean {
  if (!kho) return false;
  try { kho.setItem(KHOA_HANG_DOI, JSON.stringify(ds)); return true; } catch { return false; }
}

/** Thêm một lần bán. Trùng `client_id` thì không thêm (bấm hai lần). Trả false nếu máy không cho lưu. */
export function themVaoHangDoi(b: BanCho, kho: KhoLuu | null = khoMacDinh()): boolean {
  const ds = docHangDoi(kho);
  if (ds.some((x) => x.client_id === b.client_id)) return true;
  return ghi([...ds, b], kho);
}

/** Sinh `client_id` (uuid v4). `crypto.randomUUID` có trên Chrome/WebView đời mới; dự phòng bằng getRandomValues. */
export function sinhClientId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  c!.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Lỗi có nên giữ lại để gửi sau không: mất mạng / máy chủ tạm lỗi thì giữ; bị từ chối hẳn (4xx) thì bỏ. */
export const nenThuLai = (status: number | null) => status === null || status === 0 || status === 408 || status === 429 || status >= 500;

/**
 * Gửi lần lượt các lần bán đang chờ. Gửi được (hoặc máy chủ báo đã có — `lap_lai`) thì gỡ khỏi hàng. Lỗi mạng
 * thì dừng, giữ nguyên phần còn lại cho lần sau. Bị từ chối hẳn thì gỡ và trả về để màn hình báo.
 */
export async function dongBoHangDoi(
  gui: (b: BanCho) => Promise<{ ok: true } | { ok: false; status: number | null; cau: string }>,
  kho: KhoLuu | null = khoMacDinh(),
): Promise<{ da_gui: number; con_lai: number; bi_tu_choi: { ban: BanCho; cau: string }[] }> {
  const tuChoi: { ban: BanCho; cau: string }[] = [];
  let daGui = 0;
  for (const b of docHangDoi(kho)) {
    const r = await gui(b);
    if ('cau' in r) {
      if (nenThuLai(r.status)) break;
      tuChoi.push({ ban: b, cau: r.cau });
    } else {
      daGui++;
    }
    // Đọc lại trước khi ghi: một tab khác có thể vừa thêm lần bán mới.
    ghi(docHangDoi(kho).filter((x) => x.client_id !== b.client_id), kho);
  }
  return { da_gui: daGui, con_lai: docHangDoi(kho).length, bi_tu_choi: tuChoi };
}
