/**
 * MẮT CỦA MIMI — gửi một ảnh + một lời dặn cho mô hình thị giác, nhận lại chữ.
 *
 * Thứ tự: Amazon Bedrock (Converse, vùng ap-southeast-1) → OpenRouter. Hết cả hai thì trả `van: null`;
 * người gọi coi là "không đọc được" — quầy không bao giờ bị chặn vì mô hình lỗi.
 *
 * Bedrock gọi bằng khoá API Bedrock (`Authorization: Bearer`), không cần ký SigV4. Khoá do chủ tài khoản AWS tự
 * tạo và đặt bằng `supabase secrets set` — không bao giờ nằm trong repo.
 *
 * KHÔNG LƯU ẢNH. Ảnh đi thẳng từ bộ nhớ tới mô hình rồi bỏ.
 */
import { DIEM_GOI_OPENROUTER } from './nha-cung-cap.ts';

export type Mime = 'image/jpeg' | 'image/png' | 'image/webp';
export const MIME_NHAN: readonly Mime[] = ['image/jpeg', 'image/png', 'image/webp'];
/** ~2 MB ảnh gốc → base64 dài ~2.8 triệu ký tự. */
export const BASE64_TOI_DA = 2_800_000;

export const MO_HINH_BEDROCK_MAC_DINH = 'apac.amazon.nova-lite-v1:0';
export const MO_HINH_OPENROUTER_THI_GIAC_MAC_DINH = 'google/gemini-2.5-flash';
export const HAN_MOI_LAN_MS = 12_000;

export interface CauHinhThiGiac {
  bedrockKhoa?: string | null;
  bedrockVung?: string | null;
  bedrockMoHinh?: string | null;
  openrouterKhoa?: string | null;
  openrouterMoHinh?: string | null;
}

export interface KetQuaNhin {
  van: string | null;
  nha_cung_cap: 'bedrock' | 'openrouter' | null;
  mo_hinh: string | null;
  do_tre_ms: number;
  /** Lý do từng nhà cung cấp hỏng — để ghi nhật ký, không hiện cho thu ngân. */
  loi: string[];
}

type Goi = (url: string, init: RequestInit) => Promise<Response>;

const VUNG_HOP_LE = /^[a-z]{2}-[a-z]+-\d$/;
const MO_HINH_HOP_LE = /^[A-Za-z0-9._:\/-]{3,120}$/;

export function docCauHinh(env: (k: string) => string | undefined): CauHinhThiGiac {
  return {
    bedrockKhoa: env('BEDROCK_API_KEY') ?? null,
    bedrockVung: env('BEDROCK_REGION') ?? 'ap-southeast-1',
    bedrockMoHinh: env('BEDROCK_MODEL_ID') ?? null,
    openrouterKhoa: env('OPENROUTER_API_KEY') ?? null,
    openrouterMoHinh: env('OPENROUTER_VISION_MODEL') ?? null,
  };
}

/** Kiểm ảnh trước khi gửi đi đâu. */
export function kiemAnh(anhBase64: unknown, mime: unknown): { ok: true; anh: string; mime: Mime } | { ok: false; cau: string } {
  if (typeof anhBase64 !== 'string' || !anhBase64) return { ok: false, cau: 'Thiếu ảnh bill.' };
  const anh = anhBase64.replace(/^data:[^,]+,/, '').replace(/\s/g, '');
  if (anh.length > BASE64_TOI_DA) return { ok: false, cau: 'Ảnh quá lớn. Chụp lại gần hơn hoặc giảm chất lượng.' };
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(anh)) return { ok: false, cau: 'Ảnh không hợp lệ.' };
  if (!(MIME_NHAN as readonly string[]).includes(String(mime))) return { ok: false, cau: 'Chỉ nhận ảnh JPG, PNG hoặc WEBP.' };
  return { ok: true, anh, mime: mime as Mime };
}

async function coHan(goi: Goi, url: string, init: RequestInit, han: number): Promise<Response> {
  const ctrl = new AbortController();
  const hen = setTimeout(() => ctrl.abort(), han);
  try {
    return await goi(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(hen);
  }
}

async function quaBedrock(c: CauHinhThiGiac, anh: string, mime: Mime, loiDan: string, goi: Goi, han: number) {
  const vung = c.bedrockVung && VUNG_HOP_LE.test(c.bedrockVung) ? c.bedrockVung : 'ap-southeast-1';
  const moHinh = c.bedrockMoHinh && MO_HINH_HOP_LE.test(c.bedrockMoHinh) ? c.bedrockMoHinh : MO_HINH_BEDROCK_MAC_DINH;
  const url = `https://bedrock-runtime.${vung}.amazonaws.com/model/${encodeURIComponent(moHinh)}/converse`;
  const res = await coHan(goi, url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.bedrockKhoa}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: [
        { image: { format: mime.slice(6), source: { bytes: anh } } },
        { text: loiDan },
      ] }],
      inferenceConfig: { maxTokens: 500, temperature: 0 },
    }),
  }, han);
  if (!res.ok) throw new Error(`bedrock ${res.status}`);
  const j = await res.json();
  const van = (j?.output?.message?.content ?? []).map((p: { text?: string }) => p?.text ?? '').join('').trim();
  if (!van) throw new Error('bedrock rỗng');
  return { van, mo_hinh: moHinh };
}

async function quaOpenRouter(c: CauHinhThiGiac, anh: string, mime: Mime, loiDan: string, goi: Goi, han: number) {
  const moHinh = c.openrouterMoHinh && MO_HINH_HOP_LE.test(c.openrouterMoHinh) ? c.openrouterMoHinh : MO_HINH_OPENROUTER_THI_GIAC_MAC_DINH;
  const res = await coHan(goi, DIEM_GOI_OPENROUTER, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.openrouterKhoa}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: moHinh,
      temperature: 0,
      max_tokens: 500,
      messages: [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:${mime};base64,${anh}` } },
        { type: 'text', text: loiDan },
      ] }],
    }),
  }, han);
  if (!res.ok) throw new Error(`openrouter ${res.status}`);
  const j = await res.json();
  const van = String(j?.choices?.[0]?.message?.content ?? '').trim();
  if (!van) throw new Error('openrouter rỗng');
  return { van, mo_hinh: moHinh };
}

export async function nhinAnh(o: {
  cauHinh: CauHinhThiGiac; anh: string; mime: Mime; loiDan: string; goi?: Goi; hanMs?: number; dongHo?: () => number;
}): Promise<KetQuaNhin> {
  const goi = o.goi ?? ((u, i) => fetch(u, i));
  const han = o.hanMs ?? HAN_MOI_LAN_MS;
  const gio = o.dongHo ?? (() => Date.now());
  const batDau = gio();
  const loi: string[] = [];
  const thu: Array<['bedrock' | 'openrouter', () => Promise<{ van: string; mo_hinh: string }>]> = [];
  if (o.cauHinh.bedrockKhoa) thu.push(['bedrock', () => quaBedrock(o.cauHinh, o.anh, o.mime, o.loiDan, goi, han)]);
  if (o.cauHinh.openrouterKhoa) thu.push(['openrouter', () => quaOpenRouter(o.cauHinh, o.anh, o.mime, o.loiDan, goi, han)]);
  for (const [ten, chay] of thu) {
    try {
      const r = await chay();
      return { van: r.van, nha_cung_cap: ten, mo_hinh: r.mo_hinh, do_tre_ms: gio() - batDau, loi };
    } catch (e) {
      loi.push(`${ten}: ${e instanceof Error ? (e.name === 'AbortError' ? 'hết giờ' : e.message) : 'lỗi'}`);
    }
  }
  if (!thu.length) loi.push('chưa có khoá mô hình thị giác');
  return { van: null, nha_cung_cap: null, mo_hinh: null, do_tre_ms: gio() - batDau, loi };
}
