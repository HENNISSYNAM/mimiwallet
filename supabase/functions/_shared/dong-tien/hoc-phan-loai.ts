/**
 * HỌC TỪ CHỦ DOANH NGHIỆP (10/11/2026) — Naive Bayes đa thức, riêng từng công ty.
 *
 * Nhãn lấy từ chính quyết định của chủ: tiền VÀO từ `revenue_classification_events` (trạng thái cuối của mỗi khoản), tiền
 * RA từ `transaction_labels` do người gắn (`source = 'human'`). Đặc trưng: từ trong nội dung đã bỏ dấu và bỏ số, nhóm độ
 * lớn số tiền (log10), và tần suất đối tác (1 lần / 2–4 / ≥5). Làm mịn Laplace α = 1; giữ tối đa 3.000 từ phổ biến nhất.
 *
 * CHỈ ĐỀ XUẤT — cùng chính sách với `phan-loai/de-xuat-ai.ts` (gopLuatVaAi):
 *   - Đề xuất mang `tu_dong: false` và `tru_doanh_thu: false` — kiểu dữ liệu không cho phép giá trị khác.
 *   - Không có hàm nào ở đây ghi CSDL hay đổi nhóm của giao dịch. Doanh thu chỉ đổi khi chủ bấm xác nhận
 *     (to-khai → xac_nhan_tien_vao), như mọi đề xuất khác.
 *   - Luật thắng mô hình: khoản bộ luật đã nhận ra (nhóm khác "bán hàng"/"chi khác") thì không đề xuất đè.
 */
import { boDau, NHOM, type Nhom } from './phan-nhom.ts';

export interface MauHoc { chieu: 'vao' | 'ra'; noi_dung: string; so_tien: number; tan_suat_doi_tac: number; nhan: string }

interface Lop { nhan: string[]; so_mau: number[]; tong_tu: number[]; tu: string[]; dem: number[][] }
export interface ThamSoPhanLoai { phien_ban: 1; so_nhan: number; vao: Lop | null; ra: Lop | null }

export const PHAN_LOAI = { tu_toi_da: 3000, xac_suat_toi_thieu: 0.75, nhan_toi_thieu_moi_lop: 3, tong_nhan_toi_thieu: 6 } as const;

export function dacTrung(noiDung: string, soTien: number, tanSuat: number): string[] {
  const tu = boDau(noiDung).replace(/[^a-z ]+/g, ' ').split(/\s+/).filter((w) => w.length >= 2).slice(0, 30);
  const muc = soTien > 0 ? Math.floor(Math.log10(soTien)) : 0;
  return [...tu, `$${muc}`, `#${tanSuat <= 1 ? '1' : tanSuat <= 4 ? '2' : '5'}`];
}

function hocLop(mau: MauHoc[]): Lop | null {
  if (!mau.length) return null;
  const tanSuat = new Map<string, number>();
  const dt = mau.map((m) => dacTrung(m.noi_dung, m.so_tien, m.tan_suat_doi_tac));
  for (const f of dt) for (const w of f) tanSuat.set(w, (tanSuat.get(w) ?? 0) + 1);
  const tu = [...tanSuat.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, PHAN_LOAI.tu_toi_da).map(([w]) => w);
  const viTri = new Map(tu.map((w, i) => [w, i]));
  const nhan = [...new Set(mau.map((m) => m.nhan))].sort();
  const iNhan = new Map(nhan.map((n, i) => [n, i]));
  const soMau = nhan.map(() => 0); const tongTu = nhan.map(() => 0); const dem = nhan.map(() => new Array<number>(tu.length).fill(0));
  mau.forEach((m, k) => {
    const c = iNhan.get(m.nhan)!; soMau[c]++;
    for (const w of dt[k]) { const j = viTri.get(w); if (j !== undefined) { dem[c][j]++; tongTu[c]++; } }
  });
  return { nhan, so_mau: soMau, tong_tu: tongTu, tu, dem };
}

export function huanLuyen(mau: readonly MauHoc[]): ThamSoPhanLoai {
  return { phien_ban: 1, so_nhan: mau.length, vao: hocLop(mau.filter((m) => m.chieu === 'vao')), ra: hocLop(mau.filter((m) => m.chieu === 'ra')) };
}

export interface DuDoan { nhan: string; xac_suat: number; tu_quyet_dinh: string[] }

export function duDoan(ts: ThamSoPhanLoai, chieu: 'vao' | 'ra', f: readonly string[]): DuDoan | null {
  const l = chieu === 'vao' ? ts.vao : ts.ra;
  if (!l || !l.nhan.length) return null;
  const V = l.tu.length; const tongMau = l.so_mau.reduce((s, x) => s + x, 0);
  const viTri = new Map(l.tu.map((w, i) => [w, i]));
  const log = l.nhan.map((_, c) => {
    let s = Math.log(l.so_mau[c] / tongMau);
    for (const w of f) { const j = viTri.get(w); if (j !== undefined) s += Math.log((l.dem[c][j] + 1) / (l.tong_tu[c] + V)); }
    return s;
  });
  const max = Math.max(...log); const e = log.map((x) => Math.exp(x - max)); const z = e.reduce((s, x) => s + x, 0);
  let tot = 0; for (let c = 1; c < e.length; c++) if (e[c] > e[tot]) tot = c;
  const tuQD = f.filter((w) => viTri.has(w) && !w.startsWith('$') && !w.startsWith('#'))
    .map((w) => { const j = viTri.get(w)!; return { w, r: (l.dem[tot][j] + 1) / (l.tong_tu[tot] + V) }; })
    .sort((a, b) => b.r - a.r).slice(0, 3).map((x) => x.w);
  return { nhan: l.nhan[tot], xac_suat: e[tot] / z, tu_quyet_dinh: tuQD };
}

export interface DeXuatPhanLoai {
  transaction_id: string;
  chieu: 'vao' | 'ra';
  de_xuat: string;
  xac_suat: number;
  ly_do: string;
  /** Luôn false: mô hình không tự áp dụng gì. */
  tu_dong: false;
  /** Luôn false: đề xuất không trừ doanh thu cho tới khi chủ xác nhận. */
  tru_doanh_thu: false;
}

export interface KhoanCanDeXuat { id: string; chieu: 'vao' | 'ra'; noi_dung: string; so_tien: number; tan_suat_doi_tac: number; nhom: Nhom }

/** Đề xuất cho các khoản chưa ai quyết. Nhóm luật đã nhận ra (khác bán hàng / chi khác) thì luật thắng. */
export function deXuatPhanLoai(ts: ThamSoPhanLoai | null, ds: readonly KhoanCanDeXuat[], ngon: 'vi' | 'en' = 'vi'): DeXuatPhanLoai[] {
  if (!ts || ts.so_nhan < PHAN_LOAI.tong_nhan_toi_thieu) return [];
  const out: DeXuatPhanLoai[] = [];
  for (const k of ds) {
    if (k.nhom !== 'ban_hang' && k.nhom !== 'chi_khac') continue;
    const l = k.chieu === 'vao' ? ts.vao : ts.ra;
    const kq = duDoan(ts, k.chieu, dacTrung(k.noi_dung, k.so_tien, k.tan_suat_doi_tac));
    if (!l || !kq || kq.xac_suat < PHAN_LOAI.xac_suat_toi_thieu) continue;
    if (l.so_mau[l.nhan.indexOf(kq.nhan)] < PHAN_LOAI.nhan_toi_thieu_moi_lop) continue;
    // Tiền vào mà mô hình nói "doanh thu" thì không có gì để đề xuất — đó đã là cách đang tính.
    if (k.chieu === 'vao' && kq.nhan === 'business_revenue') continue;
    const tu = kq.tu_quyet_dinh.join(', ');
    out.push({
      transaction_id: k.id, chieu: k.chieu, de_xuat: kq.nhan, xac_suat: Math.round(kq.xac_suat * 100) / 100,
      ly_do: ngon === 'vi'
        ? `Giống các khoản bạn đã xếp là "${kq.nhan}"${tu ? ` (từ: ${tu})` : ''}. Chỉ là đề xuất — chưa đổi gì cho tới khi bạn xác nhận.`
        : `Similar to items you classified as "${kq.nhan}"${tu ? ` (words: ${tu})` : ''}. Suggestion only — nothing changes until you confirm.`,
      tu_dong: false, tru_doanh_thu: false,
    });
  }
  return out.sort((a, b) => b.xac_suat - a.xac_suat || a.transaction_id.localeCompare(b.transaction_id));
}

/** Trạng thái cuối của mỗi khoản từ chuỗi sự kiện (chỉ thêm) — sự kiện có id lớn nhất thắng. */
export function trangThaiCuoi(suKien: readonly { id: number | string; transaction_id: string; to_type: string | null }[]): Map<string, string> {
  const tot = new Map<string, { id: number; loai: string | null }>();
  for (const e of suKien) {
    const id = Number(e.id); const cu = tot.get(e.transaction_id);
    if (!cu || id > cu.id) tot.set(e.transaction_id, { id, loai: e.to_type });
  }
  const out = new Map<string, string>();
  for (const [k, v] of tot) if (v.loai) out.set(k, v.loai);
  return out;
}

export { NHOM };
