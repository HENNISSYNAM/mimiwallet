import { docKhoaCongKhai, kiemChuKyLenh } from './chuKy.js';
import { LenhChaySchema, type KetQuaLuot, type LenhChay } from './hopDong.js';
import { xacThucNguoiDung } from './xacThuc.js';
import { trangThaiChromium } from './trinhDuyet.js';

/**
 * Xử lý một yêu cầu HTTP tới `/api/agent-runtime` (Web Request → Response). Tách khỏi file Vercel để test không cần
 * Vercel. Thứ tự kiểm cố ý: rẻ trước, mạng sau, trình duyệt cuối cùng —
 *   khuôn JSON → chữ ký Ed25519 (không tốn mạng) → hạn lệnh → nonce → JWT (gọi Supabase Auth) → `sub` = nguoi_dung_id
 *   → chạy lượt.
 * Lệnh không có chữ ký đúng thì không bao giờ khiến runtime gọi ra ngoài hay mở trình duyệt.
 */

export const PHIEN_BAN_RUNTIME = '1.0.0';
const THAN_TOI_DA_BYTE = 256 * 1024;
/** Hợp đồng: het_han ≤ 60 giây sau khi ký. Cộng 5 giây lệch đồng hồ giữa Supabase và Vercel. */
const HAN_XA_NHAT_MS = 65_000;

export interface PhuThuoc {
  /** Khoá công khai Orchestrator (base64url 32 byte hoặc JWK). Rỗng → 503. */
  khoaCongKhai: string;
  fetchFn?: typeof fetch;
  bayGio?: () => number;
  /** Thay bộ chạy lượt (test luồng HTTP không cần trình duyệt). */
  chayLuot?: (lenh: LenhChay) => Promise<KetQuaLuot>;
  /** Nonce đã thấy → hạn (ms). Mặc định dùng bộ nhớ của tiến trình. */
  nonceDaThay?: Map<string, number>;
}

/**
 * Chống phát lại trong cùng một tiến trình (Fluid compute dùng lại tiến trình giữa các lượt gọi). Không phải bảo đảm
 * tuyệt đối — hai tiến trình không chia sẻ bộ nhớ; hàng rào chính là hạn 60 giây + JWT của đúng người dùng.
 */
const NONCE_TIEN_TRINH = new Map<string, number>();

const json = (ma: number, than: unknown) =>
  new Response(JSON.stringify(than), {
    status: ma,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export async function xuLyYeuCau(req: Request, d: PhuThuoc): Promise<Response> {
  const bayGio = d.bayGio ?? Date.now;
  if (req.method === 'GET') {
    // Health check: không mở trình duyệt, không gọi mạng.
    return json(200, { ok: true, phien_ban: PHIEN_BAN_RUNTIME, hop_dong: 1, chromium: trangThaiChromium(), khoa: d.khoaCongKhai ? 'da_cau_hinh' : 'chua_cau_hinh' });
  }
  if (req.method !== 'POST') return json(405, { loi: 'Chỉ nhận GET (kiểm sức khoẻ) và POST (lệnh chạy).' });
  if (!d.khoaCongKhai) return json(503, { loi: 'Runtime chưa cấu hình khoá công khai của Orchestrator.' });

  const dai = Number(req.headers.get('content-length') ?? '0');
  if (dai > THAN_TOI_DA_BYTE) return json(413, { loi: 'Lệnh quá lớn.' });
  const chu = await req.text();
  if (chu.length > THAN_TOI_DA_BYTE) return json(413, { loi: 'Lệnh quá lớn.' });
  let tho: unknown;
  try {
    tho = JSON.parse(chu);
  } catch {
    return json(400, { loi: 'Thân yêu cầu không phải JSON.' });
  }

  let khoa: CryptoKey;
  try {
    khoa = await docKhoaCongKhai(d.khoaCongKhai);
  } catch {
    return json(503, { loi: 'Khoá công khai cấu hình sai.' });
  }
  // Chữ ký kiểm TRƯỚC khuôn: lệnh không ký đúng thì không được biết runtime chê trường nào.
  if (!(await kiemChuKyLenh(tho, khoa))) return json(401, { loi: 'Chữ ký lệnh thiếu hoặc không hợp lệ.' });

  const p = LenhChaySchema.safeParse(tho);
  if (!p.success) return json(400, { loi: 'Lệnh không đúng khuôn hợp đồng v1.', chi_tiet: p.error.issues.slice(0, 5).map((x) => `${x.path.join('.')}: ${x.message}`) });
  const lenh = p.data;

  const han = Date.parse(lenh.het_han);
  const nay = bayGio();
  if (!(han > nay)) return json(401, { loi: 'Lệnh đã hết hạn.' });
  if (han - nay > HAN_XA_NHAT_MS) return json(401, { loi: 'Hạn lệnh quá xa (tối đa 60 giây).' });

  const nonce = d.nonceDaThay ?? NONCE_TIEN_TRINH;
  for (const [k, h] of nonce) if (h <= nay) nonce.delete(k);
  if (nonce.has(lenh.nonce)) return json(401, { loi: 'Nonce đã dùng — lệnh bị phát lại.' });

  const xt = await xacThucNguoiDung(req.headers.get('authorization'), d.fetchFn);
  if (!xt.ok) return json(xt.ma, { loi: xt.loi });
  if (xt.nguoi_dung_id !== lenh.nguoi_dung_id) return json(403, { loi: 'JWT không thuộc người dùng của lệnh.' });

  // Ghi nonce chỉ khi mọi kiểm đã qua: lệnh hỏng không "đốt" được nonce của lệnh thật.
  nonce.set(lenh.nonce, han + 5000);
  const chay = d.chayLuot ?? (async (l: LenhChay) => (await import('./thucThi.js')).chayLuot(l));
  return json(200, await chay(lenh));
}
