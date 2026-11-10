/**
 * Neo mã băm báo cáo "Doanh thu đã xác minh" lên lịch công khai OpenTimestamps (rồi Bitcoin).
 *
 * Thứ DUY NHẤT rời MIMI là 32 byte SHA-256 của báo cáo đã chuẩn hoá. Không tên, không số tiền, không mã số thuế.
 * Ai cầm báo cáo + tệp .ots đều tự kiểm được ở opentimestamps.org mà không cần tin MIMI.
 *
 * Mạng hỏng KHÔNG BAO GIỜ làm hỏng việc lập báo cáo: `guiNeo` không ném lỗi, chỉ trả `not_anchored` để lần chạy
 * định kỳ sau thử lại.
 *
 * Định dạng .ots đọc/ghi bằng `dau-thoi-gian/ots.ts` (đã có test). Gửi thẳng digest (không cây Merkle như sổ cái
 * chứng từ), nên tệp .ots = header + digest + dấu thời gian lịch trả về. Gửi hai lịch: dấu thời gian là hai nhánh
 * (tiền tố 0xff cho mọi nhánh trừ nhánh cuối) — một lịch chết vẫn còn nhánh kia.
 */
import {
  chieuCaoBitcoin, docDauThoiGian, LoiOts, noi, sangHex, tachPhanCho, tepOts, tuHex,
} from '../dau-thoi-gian/ots.ts';

export const LICH_XAC_MINH = ['https://a.pool.opentimestamps.org', 'https://b.pool.opentimestamps.org'] as const;
const USER_AGENT = 'MIMIWallet/1.0 (+https://mimiwallet.vercel.app)';
const CHO_MS = 10_000;
/** Hẹn giờ huỷ yêu cầu; môi trường không có `AbortSignal.timeout` (jsdom) thì bỏ qua. */
const hetGio = () => (typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(CHO_MS) : undefined);

export type GoiMang = (url: string, init?: RequestInit) => Promise<Response>;

export interface NhanhNeo { lich: string; phan_hoi: string }

export interface KetQuaGuiNeo {
  trang_thai: 'pending' | 'not_anchored';
  nhanh: NhanhNeo[];
  /** Dấu thời gian (các nhánh) dạng base64 — phần sau digest trong tệp .ots. */
  ots_proof: string | null;
  loi: string | null;
}

export const b64 = (b: Uint8Array) => {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};
export const tuB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export const laSha256Hex = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f]{64}$/.test(s);

/** Ghép các nhánh thành một dấu thời gian: 0xff + nhánh, …, nhánh cuối. */
export function ghepNhanh(ds: Uint8Array[]): Uint8Array {
  if (!ds.length) throw new LoiOts('Không có nhánh nào.');
  return noi(...ds.slice(0, -1).map((b) => noi([0xff], b)), ds[ds.length - 1]);
}

/** Gửi digest tới cả hai lịch. Không ném lỗi: thất bại → `not_anchored` kèm lý do. */
export async function guiNeo(sha256: string, goi: GoiMang = fetch): Promise<KetQuaGuiNeo> {
  if (!laSha256Hex(sha256)) return { trang_thai: 'not_anchored', nhanh: [], ots_proof: null, loi: 'Mã băm không hợp lệ.' };
  const digest = tuHex(sha256);
  const loi: string[] = [];
  const kq = await Promise.all(LICH_XAC_MINH.map(async (lich) => {
    try {
      const res = await goi(`${lich}/digest`, {
        method: 'POST',
        headers: { Accept: 'application/vnd.opentimestamps.v1', 'User-Agent': USER_AGENT, 'Content-Type': 'application/octet-stream' },
        body: new Uint8Array(digest),
        signal: hetGio(),
      });
      if (!res.ok) { loi.push(`${lich} trả ${res.status}`); return null; }
      const phanHoi = new Uint8Array(await res.arrayBuffer());
      await tachPhanCho(phanHoi, digest); // đúng khuôn mới lưu
      return { lich, bytes: phanHoi };
    } catch (e) {
      loi.push(`${lich}: ${e instanceof Error ? e.message : 'lỗi'}`);
      return null;
    }
  }));
  const ok = kq.filter((x): x is { lich: (typeof LICH_XAC_MINH)[number]; bytes: Uint8Array } => !!x);
  if (!ok.length) return { trang_thai: 'not_anchored', nhanh: [], ots_proof: null, loi: `Chưa gửi được tới lịch nào (${loi.join('; ')}).`.slice(0, 500) };
  return {
    trang_thai: 'pending',
    nhanh: ok.map((x) => ({ lich: x.lich, phan_hoi: b64(x.bytes) })),
    ots_proof: b64(ghepNhanh(ok.map((x) => x.bytes))),
    loi: null,
  };
}

export interface KetQuaNangCap {
  trang_thai: 'confirmed' | 'pending' | 'failed';
  ots_proof?: string;
  khoi_bitcoin?: number;
  loi?: string;
}

/** merkle root của khối (thứ tự byte nội bộ) qua Blockstream — để không tin mù lời lịch. */
export async function merkleRootBlockstream(chieuCao: number, goi: GoiMang = fetch): Promise<string> {
  const h = await goi(`https://blockstream.info/api/block-height/${chieuCao}`, { signal: hetGio() });
  if (!h.ok) throw new Error(`Blockstream block-height ${h.status}`);
  const hash = (await h.text()).trim();
  if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error('Blockstream trả hash khối lạ');
  const k = await goi(`https://blockstream.info/api/block/${hash}`, { signal: hetGio() });
  if (!k.ok) throw new Error(`Blockstream block ${k.status}`);
  const root = String((await k.json()).merkle_root ?? '');
  if (!/^[0-9a-f]{64}$/.test(root)) throw new Error('Blockstream trả merkle root lạ');
  return sangHex(tuHex(root).reverse());
}

/**
 * Hỏi lịch bằng chứng Bitcoin cho từng nhánh đang chờ. Nhánh nào đã vào Bitcoin VÀ khớp merkle root của khối
 * thì báo cáo `confirmed`, bằng chứng thay bằng nhánh đó. Lỗi mạng → vẫn `pending`; bằng chứng hỏng khuôn hoặc
 * merkle root không khớp → `failed`.
 */
export async function nangCapNeo(
  sha256: string, nhanh: NhanhNeo[], goi: GoiMang = fetch,
  rootKhoi: (h: number) => Promise<string> = (h) => merkleRootBlockstream(h, goi),
): Promise<KetQuaNangCap> {
  if (!laSha256Hex(sha256) || !nhanh.length) return { trang_thai: 'failed', loi: 'Không có bằng chứng chờ để nâng cấp.' };
  const digest = tuHex(sha256);
  const loi: string[] = [];
  for (const n of nhanh) {
    if (!(LICH_XAC_MINH as readonly string[]).includes(n.lich)) { loi.push('lịch lạ'); continue; }
    let cho: Awaited<ReturnType<typeof tachPhanCho>>;
    try {
      cho = await tachPhanCho(tuB64(n.phan_hoi), digest);
    } catch (e) {
      return { trang_thai: 'failed', loi: `Bằng chứng đã lưu hỏng: ${e instanceof Error ? e.message : 'lỗi'}` };
    }
    try {
      const res = await goi(`${n.lich}/timestamp/${sangHex(cho.camKet)}`, {
        headers: { Accept: 'application/vnd.opentimestamps.v1', 'User-Agent': USER_AGENT },
        signal: hetGio(),
      });
      if (res.status === 404) continue;
      if (!res.ok) { loi.push(`${n.lich} trả ${res.status}`); continue; }
      const bytes = new Uint8Array(await res.arrayBuffer());
      const { ds } = await docDauThoiGian(bytes, cho.camKet);
      const btc = ds.find((c) => chieuCaoBitcoin(c) !== null);
      if (!btc) continue;
      const khoi = chieuCaoBitcoin(btc) as number;
      const root = await rootKhoi(khoi);
      if (root !== sangHex(btc.thongDiep)) return { trang_thai: 'failed', loi: `Merkle root khối ${khoi} không khớp bằng chứng.` };
      return { trang_thai: 'confirmed', ots_proof: b64(noi(cho.tienTo, bytes)), khoi_bitcoin: khoi };
    } catch (e) {
      if (e instanceof LoiOts) return { trang_thai: 'failed', loi: e.message };
      loi.push(`${n.lich}: ${e instanceof Error ? e.message : 'lỗi'}`);
    }
  }
  return { trang_thai: 'pending', ...(loi.length ? { loi: loi.join('; ').slice(0, 500) } : {}) };
}

/** Tệp .ots đầy đủ cho báo cáo (digest gửi thẳng, không có op lên gốc). */
export function tepOtsBaoCao(sha256: string, otsProofB64: string): Uint8Array {
  return tepOts(tuHex(sha256), new Uint8Array(0), tuB64(otsProofB64));
}
