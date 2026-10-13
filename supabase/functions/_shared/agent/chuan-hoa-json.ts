/**
 * CHUẨN HOÁ JSON + KÝ Ed25519 cho lệnh chạy gửi Cloud Agent Runtime (13/10/2026, `docs/CLOUD_AGENT_RUNTIME.md`
 * mục "Chuẩn hoá JSON").
 *
 * Vì sao phải chuẩn hoá: chữ ký ký trên BYTE, còn JSON thì cùng một đối tượng có nhiều cách viết (thứ tự khoá, khoảng
 * trắng). Orchestrator (Deno) và runtime (Node) phải ra ĐÚNG MỘT chuỗi cho cùng một lệnh, nếu không chữ ký hợp lệ vẫn
 * bị từ chối — hoặc tệ hơn, hai bên "chữa" bằng cách nới kiểm. Thuật toán cố ý tối giản để viết lại được ở runtime
 * trong vài dòng mà không cần thư viện:
 *
 *   - null, true, false → như JSON.stringify.
 *   - số: phải hữu hạn (NaN/Infinity → lỗi); viết bằng JSON.stringify(n) (ECMAScript Number::toString; -0 thành "0").
 *   - chuỗi: JSON.stringify(s) (thoát ký tự giống nhau ở V8 và Deno).
 *   - mảng: "[" + các phần tử chuẩn hoá nối bằng "," + "]", giữ nguyên thứ tự.
 *   - đối tượng: bỏ khoá có giá trị undefined; sắp khoá theo thứ tự đơn vị mã UTF-16 (Array.prototype.sort mặc định);
 *     "{" + JSON.stringify(khoá) + ":" + giá trị chuẩn hoá, nối bằng "," + "}".
 *   - kiểu khác (hàm, bigint, symbol, Date, Map…) → lỗi, không đoán.
 *   - Không khoảng trắng nào. Ký trên UTF-8 của chuỗi kết quả.
 *
 * Chữ ký: Ed25519 (WebCrypto `{ name: 'Ed25519' }`), mã hoá base64url KHÔNG đệm, đặt ở trường `chu_ky`; nội dung ký là
 * chuanHoaJson(lệnh bỏ trường `chu_ky`).
 */

export class LoiChuanHoa extends Error {}

function laDoiTuongThuan(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const p = Object.getPrototypeOf(v);
  return p === Object.prototype || p === null;
}

export function chuanHoaJson(v: unknown): string {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new LoiChuanHoa('Số không hữu hạn không chuẩn hoá được.');
    return JSON.stringify(v);
  }
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map((x) => chuanHoaJson(x === undefined ? null : x)).join(',')}]`;
  if (laDoiTuongThuan(v)) {
    const khoa = Object.keys(v).filter((k) => v[k] !== undefined).sort();
    return `{${khoa.map((k) => `${JSON.stringify(k)}:${chuanHoaJson(v[k])}`).join(',')}}`;
  }
  throw new LoiChuanHoa(`Kiểu ${typeof v} không chuẩn hoá được.`);
}

// ── base64 / base64url ───────────────────────────────────────────────────────────────────────────
export function sangBase64Url(b: Uint8Array): string {
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function tuBase64(chu: string): Uint8Array<ArrayBuffer> {
  const s = chu.trim().replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
  const du = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const nhi = atob(s + du);
  const out = new Uint8Array(new ArrayBuffer(nhi.length));
  for (let i = 0; i < nhi.length; i++) out[i] = nhi.charCodeAt(i);
  return out;
}

const ED = { name: 'Ed25519' } as const;

/**
 * Đọc khoá riêng từ secret `MIMI_RUNTIME_PRIVATE_KEY`. Nhận hai dạng:
 *   - JWK JSON: {"kty":"OKP","crv":"Ed25519","d":"<base64url>","x":"<base64url>"};
 *   - PKCS8 DER mã hoá base64 (hoặc base64url), có thể bọc "-----BEGIN PRIVATE KEY-----".
 * Sai dạng → ném lỗi; nơi gọi trả "runtime chưa cấu hình", không chạy.
 */
export async function docKhoaRieng(bimat: string): Promise<CryptoKey> {
  const s = bimat.trim();
  if (!s) throw new LoiChuanHoa('Thiếu khoá riêng.');
  if (s.startsWith('{')) {
    const jwk = JSON.parse(s) as JsonWebKey;
    if (jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519' || !jwk.d) throw new LoiChuanHoa('JWK không phải khoá riêng Ed25519.');
    return await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', d: jwk.d, x: jwk.x }, ED, false, ['sign']);
  }
  const than = s.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '');
  return await crypto.subtle.importKey('pkcs8', tuBase64(than), ED, false, ['sign']);
}

/** Khoá công khai (runtime giữ trong code): 32 byte thô dạng base64url, hoặc JWK có `x`. */
export async function docKhoaCongKhai(chu: string): Promise<CryptoKey> {
  const s = chu.trim();
  if (s.startsWith('{')) {
    const jwk = JSON.parse(s) as JsonWebKey;
    return await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: jwk.x }, ED, false, ['verify']);
  }
  return await crypto.subtle.importKey('raw', tuBase64(s), ED, false, ['verify']);
}

/** Ký: trả bản lệnh kèm `chu_ky`. Lệnh vào có sẵn `chu_ky` thì bị bỏ trước khi ký. */
export async function kyLenh<T extends Record<string, unknown>>(lenh: T, khoa: CryptoKey): Promise<T & { chu_ky: string }> {
  const { chu_ky: _bo, ...than } = lenh as T & { chu_ky?: unknown };
  const sig = await crypto.subtle.sign(ED, khoa, new TextEncoder().encode(chuanHoaJson(than)));
  return { ...(than as T), chu_ky: sangBase64Url(new Uint8Array(sig)) };
}

/** Kiểm (cùng thuật toán runtime dùng) — để test và để Orchestrator tự kiểm lần cuối nếu cần. */
export async function kiemChuKy(lenh: Record<string, unknown>, khoaCongKhai: CryptoKey): Promise<boolean> {
  const { chu_ky, ...than } = lenh;
  if (typeof chu_ky !== 'string' || !chu_ky) return false;
  try {
    return await crypto.subtle.verify(ED, khoaCongKhai, tuBase64(chu_ky), new TextEncoder().encode(chuanHoaJson(than)));
  } catch {
    return false;
  }
}
