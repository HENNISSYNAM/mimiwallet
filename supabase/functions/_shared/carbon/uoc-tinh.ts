/**
 * DẤU CHÂN CARBON THEO KHOẢN CHI (28/10/2026) — chạy ngầm, hàm thuần.
 *
 * Cách làm giống thẻ Techcombank Visa Eco (công nghệ của Visa) và Mastercard Carbon Calculator (Åland Index của
 * Doconomy): ƯỚC TÍNH THEO SỐ TIỀN — số tiền chi × hệ số phát thải trung bình của ngành người nhận. Không đo được
 * lượng phát thải thật của từng khoản; chỉ cho biết cỡ và xu hướng. Mọi chỗ hiển thị phải nói "ước tính".
 *
 * Hai cách tính, mỗi hệ số có nguồn:
 *   - Điện (trả EVN): đổi tiền ra kWh theo giá bán lẻ bình quân, nhân hệ số phát thải lưới điện Việt Nam.
 *   - Còn lại: đổi đồng ra USD năm 2022 (tỷ giá bình quân năm của Ngân hàng Thế giới), nhân hệ số của US EPA
 *     "Supply Chain GHG Emission Factors v1.3" (kg CO2e / USD 2022, giá người mua, có biên thương mại).
 *     Hệ số của Mỹ dùng cho Việt Nam là xấp xỉ — cùng cách Åland Index dùng hệ số ngành chung cho nhiều nước.
 *
 * Khoản không nhận ra ngành (lương, thuế, chuyển cho người, chuyển nội bộ...) KHÔNG tính và không đoán: giao diện
 * nói rõ bao nhiêu phần trăm tiền chi đã xếp được nhóm.
 */
import { chieuTien, doLonTien } from '../tien/chieu-tien.ts';

/**
 * Chỉ những cột cần — không import kiểu từ tro-ly/tinh-toan.ts: `kieu.ts` (giao diện cũng đọc) import file này, kéo
 * tinh-toan vào bộ kiểm kiểu của web là kéo theo cả bộ não trợ lý.
 */
export interface GiaoDichCarbon {
  id: string;
  amount: number | string;
  type?: string | null;
  transaction_date: string;
  merchant_name: string | null;
  counter_account_name: string | null;
  payment_reference: string | null;
}

/** Ngân hàng Thế giới, WDI PA.NUS.FCRF, Việt Nam 2022 (bình quân năm). */
export const TY_GIA_VND_USD_2022 = 23_271.21;
/** Giá bán lẻ điện bình quân, chưa VAT — QĐ 599/QĐ-EVN ngày 07/05/2025, áp dụng từ 10/05/2025. */
export const GIA_DIEN_BINH_QUAN = 2_204.0655;
/** Hệ số phát thải lưới điện Việt Nam 2024 — nghiên cứu ĐH Bách khoa Hà Nội phối hợp Bộ NN&MT (0,6811 tCO2/MWh). */
export const HE_SO_LUOI_DIEN_KG_KWH = 0.6811;

export type NhomCarbon =
  | 'dien' | 'xang_dau' | 'hang_khong' | 'an_uong' | 'taxi' | 'van_chuyen_hang' | 'vien_thong'
  | 'dam_may' | 'khach_san' | 'thue_mat_bang' | 'sieu_thi' | 'van_phong_pham';

interface DinhNghia { khoa: NhomCarbon; mau: RegExp; naics?: string; kg_usd?: number }

/**
 * Thứ tự quan trọng: đặt đồ ăn qua Grab phải về "ăn uống" trước khi "grab" rơi vào taxi; Viettel Post trước Viettel.
 * Hệ số `kg_usd` lấy nguyên cột "Supply Chain Emission Factors with Margins" của EPA v1.3.
 */
export const NHOM: readonly DinhNghia[] = [
  { khoa: 'dien', mau: /\b(evn\w*|tien dien|hoa don dien|dien luc|cong ty dien)\b/ },
  { khoa: 'an_uong', mau: /\b(grabfood|grab food|shopeefood|shopee food|baemin|nha hang|quan an|ca phe|cafe|coffee|highlands|starbucks|phuc long|kfc|lotteria|jollibee|pizza)\b/, naics: '722511', kg_usd: 0.194 },
  { khoa: 'van_chuyen_hang', mau: /\b(ghn|giao hang nhanh|ghtk|giao hang tiet kiem|viettel post|vnpost|buu dien|j&t|jnt|ninja van|best express|ahamove|lalamove)\b/, naics: '492110', kg_usd: 0.303 },
  { khoa: 'xang_dau', mau: /\b(petrolimex|pvoil|xang dau|cay xang|tien xang|dau diesel)\b/, naics: '324110', kg_usd: 0.27 },
  { khoa: 'hang_khong', mau: /\b(vietnam airlines|vietjet|bamboo airways|vietravel airlines|ve may bay)\b/, naics: '481111', kg_usd: 0.644 },
  { khoa: 'taxi', mau: /\b(grab|xanh sm|gsm|be group|taxi|mai linh|vinasun)\b/, naics: '485310', kg_usd: 0.566 },
  { khoa: 'vien_thong', mau: /\b(viettel|vnpt|mobifone|vinaphone|fpt telecom|cuoc di dong|cuoc internet)\b/, naics: '517312', kg_usd: 0.096 },
  { khoa: 'dam_may', mau: /\b(google|aws|amazon web services|microsoft|azure|digitalocean|cloudflare|openai|anthropic|vercel|supabase)\b/, naics: '518210', kg_usd: 0.093 },
  { khoa: 'khach_san', mau: /\b(khach san|hotel|resort|agoda|booking com|traveloka)\b/, naics: '721110', kg_usd: 0.145 },
  { khoa: 'thue_mat_bang', mau: /\b(thue mat bang|thue van phong|tien thue nha|tien nha)\b/, naics: '531120', kg_usd: 0.246 },
  { khoa: 'sieu_thi', mau: /\b(winmart|coopmart|co op|bach hoa xanh|lotte mart|aeon|mm mega)\b/, naics: '445110', kg_usd: 0.186 },
  { khoa: 'van_phong_pham', mau: /\b(van phong pham|fahasa|hong ha|thien long)\b/, naics: '453210', kg_usd: 0.111 },
];

const boDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()
  .replace(/[^a-z0-9&]+/g, ' ');

export function nhomCua(t: Pick<GiaoDichCarbon, 'merchant_name' | 'counter_account_name' | 'payment_reference'>): DinhNghia | null {
  const chu = ` ${boDau([t.merchant_name, t.counter_account_name, t.payment_reference].filter(Boolean).join(' '))} `;
  return NHOM.find((n) => n.mau.test(chu)) ?? null;
}

/** kg CO2e ước tính của một khoản chi đã biết nhóm. */
export function kgCua(n: DinhNghia, vnd: number): number {
  if (n.khoa === 'dien') return (vnd / GIA_DIEN_BINH_QUAN) * HE_SO_LUOI_DIEN_KG_KWH;
  return (vnd / TY_GIA_VND_USD_2022) * (n.kg_usd ?? 0);
}

export interface ChiSoCarbon {
  /** Có khoản chi nào trong tháng này hoặc tháng trước không. */
  co_so_lieu: boolean;
  thang: string;
  kg_thang_nay: number;
  /** null khi tháng trước không có khoản chi. */
  kg_thang_truoc: number | null;
  /** kg CO2e trên mỗi triệu đồng đã xếp nhóm, tháng này — so được giữa các tháng dù chi nhiều hay ít. */
  kg_moi_trieu: number | null;
  kg_moi_trieu_thang_truoc: number | null;
  nhom: { khoa: NhomCarbon; kg: number; so_tien: number; so_khoan: number }[];
  /** Phần tiền chi tháng này đã xếp được nhóm (0–1). Thấp = con số chỉ phủ một phần. */
  ty_le_phu: number | null;
}

const thangTruoc = (k: string) => {
  const [y, m] = k.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};
const lam = (x: number) => Math.round(x * 10) / 10;

export function chiSoCarbon(giaoDich: readonly GiaoDichCarbon[], homNay: string, boQua: ReadonlySet<string> = new Set()): ChiSoCarbon {
  const nay = homNay.slice(0, 7);
  const truoc = thangTruoc(nay);
  const tong = { [nay]: { kg: 0, xep: 0, chi: 0 }, [truoc]: { kg: 0, xep: 0, chi: 0 } } as Record<string, { kg: number; xep: number; chi: number }>;
  const theoNhom = new Map<NhomCarbon, { kg: number; so_tien: number; so_khoan: number }>();
  for (const t of giaoDich) {
    const k = t.transaction_date.slice(0, 7);
    if ((k !== nay && k !== truoc) || t.transaction_date > homNay || chieuTien(t) !== 'ra' || boQua.has(String(t.id))) continue;
    const tien = doLonTien(t);
    tong[k].chi += tien;
    const n = nhomCua(t);
    if (!n) continue;
    const kg = kgCua(n, tien);
    tong[k].kg += kg;
    tong[k].xep += tien;
    if (k === nay) {
      const cu = theoNhom.get(n.khoa) ?? { kg: 0, so_tien: 0, so_khoan: 0 };
      theoNhom.set(n.khoa, { kg: cu.kg + kg, so_tien: cu.so_tien + tien, so_khoan: cu.so_khoan + 1 });
    }
  }
  const a = tong[nay], b = tong[truoc];
  return {
    co_so_lieu: a.chi > 0 || b.chi > 0,
    thang: nay,
    kg_thang_nay: lam(a.kg),
    kg_thang_truoc: b.chi > 0 ? lam(b.kg) : null,
    kg_moi_trieu: a.xep > 0 ? lam(a.kg / (a.xep / 1e6)) : null,
    kg_moi_trieu_thang_truoc: b.xep > 0 ? lam(b.kg / (b.xep / 1e6)) : null,
    nhom: [...theoNhom.entries()].map(([khoa, v]) => ({ khoa, kg: lam(v.kg), so_tien: v.so_tien, so_khoan: v.so_khoan }))
      .sort((x, y) => y.kg - x.kg),
    ty_le_phu: a.chi > 0 ? Math.round((a.xep / a.chi) * 100) / 100 : null,
  };
}
