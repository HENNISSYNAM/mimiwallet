/**
 * Khoá API cho agent: sinh, băm, nhận dạng.
 *
 * CHỈ LƯU BẢN BĂM. Khoá hiện cho chủ doanh nghiệp đúng một lần lúc tạo; database
 * giữ SHA-256 của nó. Lộ database không lộ khoá nào dùng được.
 *
 * SHA-256 KHÔNG MUỐI LÀ ĐỦ Ở ĐÂY, khác với mật khẩu. Khoá có 32 ký tự ngẫu nhiên
 * từ bảng 31 chữ (~158 bit), nên không có từ điển nào để dò. Băm chậm như bcrypt
 * chỉ làm mỗi lần agent gọi chậm theo mà không thêm an toàn.
 *
 * BẢNG CHỮ BỎ 0/O, 1/l/i — người dán khoá vào cấu hình agent hay chép tay.
 */

export const TIEN_TO_KHOA = 'mimi_ak_';
export const HEADER_KHOA = 'x-mimi-agent-key';

const BANG = 'abcdefghjkmnpqrstuvwxyz23456789';
const DO_DAI = 32;

export function sinhKhoa(): string {
  let ra = '';
  // Loại byte ≥ 248 (= 31 × 8) để mọi ký tự đều xác suất như nhau.
  while (ra.length < DO_DAI) {
    const buf = new Uint8Array(48);
    crypto.getRandomValues(buf);
    for (const b of buf) {
      if (b >= 248) continue;
      ra += BANG[b % BANG.length];
      if (ra.length === DO_DAI) break;
    }
  }
  return TIEN_TO_KHOA + ra;
}

export function laKhoaTacTu(s: string | null | undefined): s is string {
  return typeof s === 'string' && new RegExp(`^${TIEN_TO_KHOA}[${BANG}]{${DO_DAI}}$`).test(s);
}

export async function bamKhoa(khoa: string): Promise<string> {
  const bam = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(khoa));
  return [...new Uint8Array(bam)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Phần đủ để nhận ra khoá trong danh sách, không đủ để dùng. */
export function hienKhoa(khoa: string): string {
  return `${khoa.slice(0, TIEN_TO_KHOA.length + 4)}…`;
}
