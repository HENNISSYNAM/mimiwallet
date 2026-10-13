import { webcrypto } from 'node:crypto';

/**
 * Kiểm chữ ký Ed25519 của lệnh chạy — phía runtime (Node ≥ 20, WebCrypto).
 *
 * Thuật toán chuẩn hoá phải TRÙNG TỪNG BYTE với Orchestrator (`supabase/functions/_shared/agent/chuan-hoa-json.ts`):
 * chữ ký ký trên byte, nên chỉ cần lệch một khoảng trắng hay thứ tự khoá là lệnh hợp lệ bị từ chối — và cám dỗ "chữa"
 * bằng cách nới kiểm. Viết lại ở đây (không import chéo) vì runtime là Node, Orchestrator là Deno; test
 * `chuKy.test.ts` khoá hai bản bằng cùng một vectơ.
 *
 * Kiểm trên đối tượng JSON THÔ vừa parse, không phải bản đã qua zod: zod có thể bỏ/điền trường, làm nội dung kiểm khác
 * nội dung đã ký.
 */

const subtle = webcrypto.subtle;
const ED = { name: 'Ed25519' } as const;

function laDoiTuongThuan(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const p = Object.getPrototypeOf(v);
  return p === Object.prototype || p === null;
}

export function chuanHoaJson(v: unknown): string {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error('Số không hữu hạn không chuẩn hoá được.');
    return JSON.stringify(v);
  }
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map((x) => chuanHoaJson(x === undefined ? null : x)).join(',')}]`;
  if (laDoiTuongThuan(v)) {
    const khoa = Object.keys(v).filter((k) => v[k] !== undefined).sort();
    return `{${khoa.map((k) => `${JSON.stringify(k)}:${chuanHoaJson(v[k])}`).join(',')}}`;
  }
  throw new Error(`Kiểu ${typeof v} không chuẩn hoá được.`);
}

export function tuBase64Url(chu: string): Uint8Array {
  return new Uint8Array(Buffer.from(chu.trim().replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
}

export function sangBase64Url(b: Uint8Array): string {
  return Buffer.from(b).toString('base64url');
}

/** Khoá công khai: 32 byte thô dạng base64url, hoặc JWK có `x`. */
export async function docKhoaCongKhai(chu: string): Promise<CryptoKey> {
  const s = chu.trim();
  if (s.startsWith('{')) {
    const jwk = JSON.parse(s) as JsonWebKey;
    return (await subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: jwk.x }, ED, false, ['verify'])) as CryptoKey;
  }
  const raw = tuBase64Url(s);
  if (raw.length !== 32) throw new Error('Khoá công khai Ed25519 phải đúng 32 byte.');
  return (await subtle.importKey('raw', raw, ED, false, ['verify'])) as CryptoKey;
}

/** true chỉ khi `chu_ky` là chữ ký hợp lệ của chuanHoaJson(lệnh bỏ `chu_ky`). Mọi bất thường → false, không ném. */
export async function kiemChuKyLenh(lenhTho: unknown, khoa: CryptoKey): Promise<boolean> {
  if (!laDoiTuongThuan(lenhTho)) return false;
  const { chu_ky, ...than } = lenhTho;
  if (typeof chu_ky !== 'string' || !/^[A-Za-z0-9_-]{80,100}$/.test(chu_ky)) return false;
  try {
    const sig = tuBase64Url(chu_ky);
    if (sig.length !== 64) return false;
    return await subtle.verify(ED, khoa, sig, new TextEncoder().encode(chuanHoaJson(than)));
  } catch {
    return false;
  }
}

/** Chỉ dùng cho test/công cụ: ký lệnh bằng khoá riêng PKCS8 base64url (giống Orchestrator). */
export async function kyLenhChoTest<T extends Record<string, unknown>>(lenh: T, pkcs8Base64Url: string): Promise<T & { chu_ky: string }> {
  const khoa = await subtle.importKey('pkcs8', tuBase64Url(pkcs8Base64Url), ED, false, ['sign']);
  const { chu_ky: _bo, ...than } = lenh as T & { chu_ky?: unknown };
  const sig = await subtle.sign(ED, khoa, new TextEncoder().encode(chuanHoaJson(than)));
  return { ...(than as T), chu_ky: sangBase64Url(new Uint8Array(sig)) };
}
