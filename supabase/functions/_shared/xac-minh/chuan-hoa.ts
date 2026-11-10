/**
 * Chuẩn hoá JSON của báo cáo "Doanh thu đã xác minh" để BĂM ỔN ĐỊNH.
 *
 * Cùng một báo cáo phải ra cùng một chuỗi byte ở mọi máy (Deno trên máy chủ, trình duyệt của người nhận),
 * bất kể thứ tự khoá lúc dựng đối tượng. Quy tắc (tập con của RFC 8785 đủ cho dữ liệu của báo cáo):
 *   - khoá của mọi đối tượng xếp theo thứ tự mã UTF-16 (`Array.prototype.sort` mặc định);
 *   - không khoảng trắng;
 *   - trường `undefined` bị bỏ (như JSON.stringify);
 *   - số chỉ nhận số nguyên an toàn hoặc số hữu hạn — NaN/Infinity là lỗi, không lặng lẽ thành null;
 *   - chuỗi theo JSON.stringify (Unicode giữ nguyên, chỉ thoát ký tự bắt buộc).
 * Tiền trong báo cáo luôn là số nguyên đồng (hoặc chuỗi số nguyên khi quá lớn) nên không có chuyện số thực
 * in khác nhau giữa hai máy.
 *
 * File không import gì: Deno, vitest và trình duyệt cùng dùng.
 */

export class LoiChuanHoa extends Error {}

export function jsonChuan(v: unknown): string {
  if (v === null) return 'null';
  switch (typeof v) {
    case 'boolean':
      return v ? 'true' : 'false';
    case 'number':
      if (!Number.isFinite(v)) throw new LoiChuanHoa('Số không hữu hạn không chuẩn hoá được.');
      return JSON.stringify(Object.is(v, -0) ? 0 : v);
    case 'string':
      return JSON.stringify(v);
    case 'object': {
      if (Array.isArray(v)) return `[${v.map((x) => (x === undefined ? 'null' : jsonChuan(x))).join(',')}]`;
      const o = v as Record<string, unknown>;
      const khoa = Object.keys(o).filter((k) => o[k] !== undefined).sort();
      return `{${khoa.map((k) => `${JSON.stringify(k)}:${jsonChuan(o[k])}`).join(',')}}`;
    }
    default:
      throw new LoiChuanHoa(`Kiểu ${typeof v} không chuẩn hoá được.`);
  }
}

export async function sha256Hex(s: string): Promise<string> {
  const b = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

/** Mã băm của một báo cáo = SHA-256 của chuỗi JSON chuẩn hoá (UTF-8), dạng hex chữ thường. */
export const bamBaoCao = (baoCao: unknown) => sha256Hex(jsonChuan(baoCao));
