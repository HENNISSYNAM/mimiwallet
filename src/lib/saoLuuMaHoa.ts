/**
 * Bản sao lưu mã hoá bằng mật khẩu người dùng — làm hoàn toàn trong trình duyệt.
 *
 * MIMI không bao giờ thấy mật khẩu hay bản rõ: khoá dẫn từ mật khẩu bằng PBKDF2-SHA256
 * (310.000 vòng, muối ngẫu nhiên 16 byte), mã hoá AES-GCM 256 (IV 12 byte, có xác thực — sửa
 * một byte là giải mã thất bại). Quên mật khẩu thì không ai mở được, kể cả MIMI — màn hình
 * phải nói rõ điều đó.
 */

export const SO_VONG_MAC_DINH = 310_000;
export const DINH_DANG = 'mimi-sao-luu';

export interface TepSaoLuu {
  dinh_dang: typeof DINH_DANG;
  phien_ban: 1;
  kdf: 'PBKDF2-SHA256';
  so_vong: number;
  muoi: string;
  iv: string;
  du_lieu: string;
  tao_luc: string;
}

const b64 = (b: Uint8Array) => {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};
const tuB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function khoa(matKhau: string, muoi: Uint8Array, soVong: number, dung: KeyUsage[]) {
  const goc = await crypto.subtle.importKey('raw', new TextEncoder().encode(matKhau), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: muoi, iterations: soVong },
    goc,
    { name: 'AES-GCM', length: 256 },
    false,
    dung,
  );
}

export const MAT_KHAU_TOI_THIEU = 10;

export async function maHoaSaoLuu(duLieu: unknown, matKhau: string, soVong = SO_VONG_MAC_DINH): Promise<TepSaoLuu> {
  if (matKhau.length < MAT_KHAU_TOI_THIEU) throw new Error(`Mật khẩu sao lưu cần ít nhất ${MAT_KHAU_TOI_THIEU} ký tự.`);
  const muoi = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await khoa(matKhau, muoi, soVong, ['encrypt']);
  const banMa = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(JSON.stringify(duLieu))));
  return {
    dinh_dang: DINH_DANG, phien_ban: 1, kdf: 'PBKDF2-SHA256', so_vong: soVong,
    muoi: b64(muoi), iv: b64(iv), du_lieu: b64(banMa), tao_luc: new Date().toISOString(),
  };
}

export async function giaiMaSaoLuu<T = unknown>(tep: unknown, matKhau: string): Promise<T> {
  const t = tep as Partial<TepSaoLuu> | null;
  if (!t || t.dinh_dang !== DINH_DANG || t.phien_ban !== 1 || t.kdf !== 'PBKDF2-SHA256' || typeof t.du_lieu !== 'string') {
    throw new Error('Đây không phải tệp sao lưu MIMI.');
  }
  if (!Number.isInteger(t.so_vong) || (t.so_vong as number) < 1000 || (t.so_vong as number) > 5_000_000) {
    throw new Error('Tệp sao lưu có thông số lạ — không mở.');
  }
  const k = await khoa(matKhau, tuB64(t.muoi as string), t.so_vong as number, ['decrypt']);
  let banRo: ArrayBuffer;
  try {
    banRo = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: tuB64(t.iv as string) }, k, tuB64(t.du_lieu));
  } catch {
    throw new Error('Sai mật khẩu, hoặc tệp đã bị sửa.');
  }
  return JSON.parse(new TextDecoder().decode(banRo)) as T;
}
