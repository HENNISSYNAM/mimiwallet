/**
 * Bộ sinh ca ĐỐI KHÁNG có nhãn sự thật, tất định theo hạt giống — dùng cho `adversarial.test.ts`.
 *
 * Mục đích: cố làm MIMI nói sai doanh thu. Mỗi ca là một công ty một năm với sao kê đầy bẫy (tiền vay
 * và góp vốn không nói rõ, người nhà chuyển, hoàn tiền, chuyển giữa tài khoản của mình có và không có
 * tài khoản đối ứng, trùng hợp số tiền giữa một khoản bán và một khoản chi, dòng minh hoạ, dòng năm
 * khác, ngày sát ranh giới năm/quý, tháng thiếu sao kê) và MỖI DÒNG MANG NHÃN SỰ THẬT — người sinh ca
 * biết khoản nào thật sự là tiền bán hàng.
 *
 * THIẾT KẾ HOLD-OUT. Hạt giống được chia hai dải cố định (`HAT_PHAT_TRIEN`, `HAT_GIU_LAI`). Mọi chỉnh
 * sửa logic chỉ được dựa trên dải phát triển; dải giữ lại chỉ chạy để báo cáo con số, không để chỉnh.
 * Bộ sinh KHÔNG đọc kết quả của MIMI: nhãn có trước, MIMI chạy sau.
 *
 * NGƯỜI DÙNG GIẢ LẬP luôn trả lời ĐÚNG (bằng chứng của người dùng là sự thật). Nên nếu MIMI vẫn nói
 * sai, đó là lỗi của MIMI, không phải của người trả lời.
 *
 * Không phụ thuộc vitest: cũng chạy được bằng tay để in số liệu.
 */
import { findInternalTransfers, type LedgerTx } from '../ledger/internal-transfer.ts';
import { chieuTien, doLonTien } from '../tien/chieu-tien.ts';
import { NGUONG_DOANH_THU, NGUONG_KHAI_THANG, NGUONG_THU_NHAP } from '../luat/he-luat.ts';
import { docNguonTienVao, dungSoLieuDoanhThu, tinhTienVao, type GiaoDichTinh, type NguonTienVao, type SoLieuDoanhThu } from './so-lieu.ts';

// deno-lint-ignore no-explicit-any
export type Row = Record<string, any>;

export const HAT_PHAT_TRIEN = Array.from({ length: 300 }, (_, i) => 1 + i);
export const HAT_GIU_LAI = Array.from({ length: 1000 }, (_, i) => 100_000 + i);

export const NAM = 2026;
export const TAI_KHOAN = ['111', '222'];

// ── Số ngẫu nhiên tất định (mulberry32) ────────────────────────────────────────

export function taoRng(hat: number) {
  let a = hat >>> 0;
  const r = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    r,
    int: (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1)),
    pick: <T>(ds: readonly T[]): T => ds[Math.floor(r() * ds.length)],
    chance: (p: number) => r() < p,
  };
}
type Rng = ReturnType<typeof taoRng>;

// ── Nhãn sự thật ───────────────────────────────────────────────────────────────

export type KieuDong =
  | 'ban_hang' | 'ban_hang_chia_doi' | 'ban_hang_trung_so_tien_chi'
  | 'vay' | 'gop_von' | 'nguoi_nha' | 'hoan_tien_ncc'
  | 'noi_bo_biet_doi_ung' | 'noi_bo_suy_doan'
  | 'minh_hoa' | 'nam_khac' | 'chi';

export interface NhanDong {
  kieu: KieuDong;
  /** Là tiền vào của năm khai VÀ là doanh thu thật. */
  la_doanh_thu: boolean;
  /** Người dùng giả lập đã xác nhận đúng dòng này. */
  da_xac_nhan: 'include' | 'exclude' | null;
}

export interface CaDoiKhang {
  hat: number;
  giao_dich: Row[];
  tai_khoan: string[];
  xac_nhan: { transaction_id: string; revenue_effect: string }[];
  nhan: Record<string, NhanDong>;
  /** Doanh thu thật cả năm, kể cả tháng sao kê bị thiếu. */
  doanh_thu_that: number;
  /** Phần doanh thu thật nằm trong dữ liệu MIMI nhìn thấy. */
  doanh_thu_nhin_thay: number;
  thang_thieu: string | null;
  kich_ban: string[];
}

const KHACH = ['NGUYEN VAN AN', 'TRAN THI BICH', 'LE HOANG NAM', 'PHAM MINH TUAN', 'VO THI HOA', 'DANG QUOC BAO', 'HUYNH THI LAN', 'BUI VAN CUONG'];
const NOI_DUNG_BAN = ['CK TIEN HANG', 'THANH TOAN DON 1523', 'TT HOA DON 88', 'MUA HANG', '', 'THANH TOAN', 'TIEN DICH VU THANG'];
// Nội dung bán hàng THẬT nhưng chứa từ khoá mà bộ đọc gợi ý hay nhầm là "không phải doanh thu".
const NOI_DUNG_BAN_BAY = ['KHACH TRA NOT HOAN TAT DON', 'DAT COC DON HANG 77', 'NHAN COC HANG', 'CON GUI CHO TIEN MUA HANG'];
const NOI_DUNG_VAY_RO = ['GIAI NGAN HDTD 0126', 'GIAI NGAN KHOAN VAY', 'TIEN VAY VON KINH DOANH'];
const NOI_DUNG_VAY_MO = ['NHAN TIEN', 'CHUYEN TIEN', 'CK'];
const NOI_DUNG_VON_RO = ['GOP VON MUA MAY', 'BO SUNG VON KINH DOANH'];
const NOI_DUNG_NHA = ['CON GUI BA ME', 'ME GUI TIEN', 'CHUYEN CHO ME'];

const ngayTrongThang = (r: Rng, thang: number, bien: boolean) => {
  const cuoi = new Date(Date.UTC(NAM, thang, 0)).getUTCDate();
  const ngay = bien && r.chance(0.4) ? (r.chance(0.5) ? 1 : cuoi) : r.int(1, cuoi);
  return `${NAM}-${String(thang).padStart(2, '0')}-${String(ngay).padStart(2, '0')}`;
};

const congNgay = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// ── Sinh ca ─────────────────────────────────────────────────────────────────────

export function sinhCa(hat: number): CaDoiKhang {
  const r = taoRng(hat);
  const kichBan: string[] = [];
  const giaoDich: Row[] = [];
  const nhan: Record<string, NhanDong> = {};
  let dem = 0;
  const them = (kieu: KieuDong, laDoanhThu: boolean, row: Row): string => {
    const id = `t${String(dem++).padStart(5, '0')}`;
    giaoDich.push({ id, company_id: 'c1', is_synthetic: false, account_number: r.pick(TAI_KHOAN), counter_account_number: null, counter_account_name: null, merchant_name: null, payment_reference: null, ...row });
    nhan[id] = { kieu, la_doanh_thu: laDoanhThu, da_xac_nhan: null };
    return id;
  };

  // Mục tiêu doanh thu: đa số nằm sát ngưỡng 01 tỷ, một phần sát 03 tỷ, một phần nhỏ.
  const loaiMuctieu = r.r();
  const mucTieu = loaiMuctieu < 0.65 ? r.int(550, 1600) * 1_000_000
    : loaiMuctieu < 0.85 ? r.int(2400, 3600) * 1_000_000
      : r.int(50, 600) * 1_000_000;
  kichBan.push(loaiMuctieu < 0.65 ? 'sat_1_ty' : loaiMuctieu < 0.85 ? 'sat_3_ty' : 'nho');

  // Doanh thu theo tháng (trọng số ngẫu nhiên).
  const trongSo = Array.from({ length: 12 }, () => 0.3 + r.r());
  const tongTs = trongSo.reduce((a, b) => a + b, 0);
  const thangTien = trongSo.map((w) => Math.round((mucTieu * w) / tongTs));

  for (let m = 1; m <= 12; m++) {
    const soKhoan = r.int(3, 14);
    let conLai = thangTien[m - 1];
    for (let i = 0; i < soKhoan && conLai > 0; i++) {
      const tien = i === soKhoan - 1 ? conLai : Math.min(conLai, Math.max(1, Math.round(conLai * (0.05 + r.r() * 0.4))));
      conLai -= tien;
      const bay = r.chance(0.06);
      const ngay = ngayTrongThang(r, m, true);
      const dv = { transaction_date: ngay, type: 'income', counter_account_name: r.pick(KHACH), merchant_name: bay ? r.pick(NOI_DUNG_BAN_BAY) : r.pick(NOI_DUNG_BAN) };
      if (r.chance(0.1) && tien >= 2) {
        // Một lần thanh toán tách hai lần chuyển: tổng vẫn là đúng một khoản bán.
        const a = Math.floor(tien / 2);
        them('ban_hang_chia_doi', true, { ...dv, amount: a });
        them('ban_hang_chia_doi', true, { ...dv, amount: tien - a });
      } else {
        const id = them('ban_hang', true, { ...dv, amount: tien });
        // Cùng số tiền khác ngày, cùng khách: vẫn là hai khoản bán khác nhau.
        if (r.chance(0.04)) them('ban_hang', true, { ...dv, transaction_date: ngayTrongThang(r, m, false), amount: tien });
        // Trùng hợp: ngay sau/trước một khoản bán, một khoản chi từ TÀI KHOẢN KHÁC đúng số tiền đó.
        if (r.chance(0.03)) {
          kichBan.push('trung_hop_ban_va_chi');
          const goc = giaoDich.find((g) => g.id === id) as Row;
          them('chi', false, { type: 'expense', amount: tien, transaction_date: congNgay(goc.transaction_date, r.int(-3, 3)), account_number: goc.account_number === '111' ? '222' : '111', merchant_name: 'THANH TOAN NHA CUNG CAP' });
          nhan[id].kieu = 'ban_hang_trung_so_tien_chi';
        }
      }
    }
  }

  const doanhThuThat = giaoDich.filter((g) => nhan[g.id].la_doanh_thu).reduce((s, g) => s + g.amount, 0);

  // Tiền vào KHÔNG phải doanh thu. Tổng cỡ tới 40% doanh thu: đủ để kéo một hộ 700 triệu qua 1 tỷ.
  const tranPhi = Math.round(mucTieu * 0.4);
  let dung = 0;
  const cap = (x: number) => Math.min(x, Math.max(0, tranPhi - dung));
  const soVay = r.int(0, 3);
  for (let i = 0; i < soVay; i++) {
    const tien = cap(r.int(20, 250) * 1_000_000); if (!tien) break; dung += tien;
    const ro = r.chance(0.5);
    them('vay', false, { transaction_date: ngayTrongThang(r, r.int(1, 12), false), type: 'income', amount: tien, counter_account_name: ro ? 'NGAN HANG TMCP' : r.pick(KHACH), merchant_name: r.pick(ro ? NOI_DUNG_VAY_RO : NOI_DUNG_VAY_MO) });
  }
  const soVon = r.int(0, 2);
  for (let i = 0; i < soVon; i++) {
    const tien = cap(r.int(10, 200) * 1_000_000); if (!tien) break; dung += tien;
    const ro = r.chance(0.5);
    them('gop_von', false, { transaction_date: ngayTrongThang(r, r.int(1, 12), false), type: 'income', amount: tien, counter_account_name: 'CHU HO', merchant_name: ro ? r.pick(NOI_DUNG_VON_RO) : 'CHUYEN TIEN' });
  }
  const soNha = r.int(0, 3);
  for (let i = 0; i < soNha; i++) {
    const tien = cap(r.int(1, 30) * 1_000_000); if (!tien) break; dung += tien;
    them('nguoi_nha', false, { transaction_date: ngayTrongThang(r, r.int(1, 12), false), type: 'income', amount: tien, counter_account_name: 'NGUYEN THI MAI', merchant_name: r.chance(0.6) ? r.pick(NOI_DUNG_NHA) : 'CK' });
  }
  const soHoan = r.int(0, 2);
  for (let i = 0; i < soHoan; i++) {
    const tien = r.int(1, 20) * 1_000_000;
    them('hoan_tien_ncc', false, { transaction_date: ngayTrongThang(r, r.int(1, 12), false), type: 'income', amount: tien, counter_account_name: 'CTY NHA CUNG CAP', merchant_name: r.chance(0.6) ? 'HOAN TIEN DON HANG' : 'TRA LAI' });
  }

  // Chuyển giữa tài khoản của mình: có tài khoản đối ứng (chắc chắn) và không có (chỉ suy đoán).
  const soNoiBoBiet = r.int(0, 3);
  for (let i = 0; i < soNoiBoBiet; i++) {
    const tien = r.int(5, 100) * 1_000_000;
    const ngay = ngayTrongThang(r, r.int(1, 12), false);
    them('noi_bo_biet_doi_ung', false, { transaction_date: ngay, type: 'income', amount: tien, account_number: '222', counter_account_number: '111', counter_account_name: 'CHU HO', merchant_name: 'CHUYEN KHOAN NOI BO' });
    them('chi', false, { transaction_date: ngay, type: 'expense', amount: tien, account_number: '111', counter_account_number: '222' });
  }
  const soNoiBoSuyDoan = r.int(0, 3);
  for (let i = 0; i < soNoiBoSuyDoan; i++) {
    const tien = r.int(5, 100) * 1_000_000 + r.int(0, 999) * 1000;
    const ngay = ngayTrongThang(r, r.int(1, 12), false);
    kichBan.push('noi_bo_suy_doan');
    them('noi_bo_suy_doan', false, { transaction_date: ngay, type: 'income', amount: tien, account_number: '222', merchant_name: 'CHUYEN TIEN' });
    them('chi', false, { transaction_date: congNgay(ngay, r.int(0, 2)), type: 'expense', amount: tien, account_number: '111' });
  }

  // Chi tiêu bình thường (số tiền ngẫu nhiên, không cố ý trùng ai).
  const soChi = r.int(10, 40);
  for (let i = 0; i < soChi; i++) {
    them('chi', false, { transaction_date: ngayTrongThang(r, r.int(1, 12), false), type: 'expense', amount: r.int(100_000, 40_000_000) + r.int(0, 7), merchant_name: 'CHI PHI' });
  }

  // Dòng minh hoạ (giả lập sandbox): không phải tiền của công ty thật, lớn để dễ thấy nếu lọt.
  const soMinhHoa = r.int(0, 5);
  for (let i = 0; i < soMinhHoa; i++) {
    them('minh_hoa', false, { transaction_date: ngayTrongThang(r, r.int(1, 12), false), type: 'income', amount: r.int(20, 500) * 1_000_000, is_synthetic: true });
  }
  if (soMinhHoa) kichBan.push('minh_hoa');
  // Dòng của năm khác, sát ranh giới.
  const soNamKhac = r.int(0, 4);
  for (let i = 0; i < soNamKhac; i++) {
    them('nam_khac', false, { transaction_date: r.pick(['2025-12-31', '2025-01-01', '2027-01-01', '2027-03-15']), type: 'income', amount: r.int(20, 800) * 1_000_000 });
  }
  if (soNamKhac) kichBan.push('nam_khac');

  // Người dùng giả lập: trả lời ĐÚNG một tỷ lệ các dòng tiền vào.
  const xacNhan: CaDoiKhang['xac_nhan'] = [];
  const tiLe = r.pick([0, 0.2, 0.5, 0.8, 1]);
  for (const g of giaoDich) {
    const n = nhan[g.id];
    if (g.type !== 'income' || g.is_synthetic || !g.transaction_date.startsWith(String(NAM))) continue;
    if (n.kieu === 'chi') continue;
    if (!r.chance(tiLe)) continue;
    n.da_xac_nhan = n.la_doanh_thu ? 'include' : 'exclude';
    xacNhan.push({ transaction_id: g.id, revenue_effect: n.da_xac_nhan });
  }
  // "Tôi chưa chắc" — không phải câu trả lời.
  for (const g of giaoDich.filter((x) => x.type === 'income' && !nhan[x.id].da_xac_nhan).slice(0, 3)) {
    if (r.chance(0.3)) xacNhan.push({ transaction_id: g.id, revenue_effect: 'pending' });
  }

  // Tháng thiếu sao kê. Chỉ chọn tháng mà doanh thu THẬT (đo trên dữ liệu đã sinh xong, không theo mục tiêu)
  // không lớn hơn tháng lớn nhất còn lại — đó là giả định của cận trên "tháng thiếu ≤ tháng lớn nhất đã
  // thấy" (xem `do-chac-chan.ts`); một tháng thiếu vượt mọi tháng đã thấy thì không ai suy ra được từ sao kê.
  const thucTheoThang = (m: number) => giaoDich.filter((g) => nhan[g.id].la_doanh_thu && g.transaction_date.startsWith(`${NAM}-${String(m).padStart(2, '0')}`)).reduce((x, g) => x + g.amount, 0);
  let thangThieu: number | null = null;
  if (r.chance(0.2)) {
    const t = r.int(2, 11);
    const conLai = Math.max(...Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => m !== t).map(thucTheoThang));
    if (thucTheoThang(t) <= conLai) { thangThieu = t; kichBan.push('thang_thieu'); }
  }
  const thangKey = thangThieu ? `${NAM}-${String(thangThieu).padStart(2, '0')}` : null;
  const conLaiRows = thangKey ? giaoDich.filter((g) => !g.transaction_date.startsWith(thangKey)) : giaoDich;
  const doanhThuNhin = conLaiRows.filter((g) => nhan[g.id].la_doanh_thu).reduce((x, g) => x + g.amount, 0);

  return {
    hat, giao_dich: conLaiRows, tai_khoan: TAI_KHOAN, xac_nhan: xacNhan, nhan,
    doanh_thu_that: doanhThuThat, doanh_thu_nhin_thay: doanhThuNhin, thang_thieu: thangKey, kich_ban: kichBan,
  };
}

// ── CSDL giả (như PostgREST: tối đa 1000 dòng mỗi lần) ──────────────────────────

export function dbGia(bang: Record<string, Row[]>) {
  return {
    from(ten: string) {
      const loc: ((r: Row) => boolean)[] = [];
      let tu = 0;
      let den = Number.POSITIVE_INFINITY;
      // deno-lint-ignore no-explicit-any
      const q: any = {
        select: () => q,
        order: () => q,
        eq: (c: string, v: unknown) => { loc.push((r) => r[c] === v); return q; },
        is: (c: string, v: unknown) => { loc.push((r) => (r[c] ?? null) === v); return q; },
        gte: (c: string, v: string | number) => { loc.push((r) => r[c] >= v); return q; },
        lte: (c: string, v: string | number) => { loc.push((r) => r[c] <= v); return q; },
        range: (a: number, b: number) => { tu = a; den = b; return q; },
        then: (ok: (v: unknown) => unknown, hong: (e: unknown) => unknown) => {
          const hop = (bang[ten] ?? []).filter((r) => loc.every((f) => f(r)));
          return Promise.resolve({ data: hop.slice(tu, Math.min(den + 1, tu + 1000)), error: null }).then(ok, hong);
        },
      };
      return q;
    },
  };
}

export const bangCua = (ca: CaDoiKhang) => ({
  transactions: ca.giao_dich,
  revenue_classifications: ca.xac_nhan.map((x) => ({ company_id: 'c1', ...x })),
  bank_connections: ca.tai_khoan.map((a) => ({ company_id: 'c1', account_number: a, revoked_at: null })),
  sao_ke_nhap: [],
  phan_loai_hoat_dong: [],
  gdt_invoices: [],
});

/** Chạy MIMI (đường đọc thật, qua CSDL giả) trên một ca. */
export async function chayMimi(ca: CaDoiKhang): Promise<{ nguon: NguonTienVao; s: SoLieuDoanhThu }> {
  const db = dbGia(bangCua(ca));
  const nguon = await docNguonTienVao(db, 'c1', NAM, false, ', merchant_name, counter_account_name, payment_reference');
  return { nguon, s: dungSoLieuDoanhThu(NAM, nguon, []) };
}

// ── Mô hình CŨ (trước 30/09/2026), để so sánh công bằng ─────────────────────────

export interface KetQuaCu { uoc_tinh: number; do_tin_cay: 'cao' | 'trung_binh' | 'thap'; noi_bo: Set<string> }

/** Bản sao đúng logic cũ: trị tuyệt đối mọi dòng tiền vào, cắt 4 ký tự đầu của ngày, nội bộ thắng mọi phân loại, nhãn theo tỷ lệ. */
export function moHinhCu(ca: CaDoiKhang): KetQuaCu {
  const dong = ca.giao_dich.map((t) => ({ ...t }));
  const noiBo = findInternalTransfers(dong as LedgerTx[], { ownAccounts: ca.tai_khoan }).internalIds;
  const hl = new Map(ca.xac_nhan.map((x) => [x.transaction_id, x.revenue_effect]));
  let uoc = 0; let chuaRo = 0; let daXn = 0; let soVao = 0;
  for (const t of dong) {
    if (t.is_synthetic || chieuTien(t) !== 'vao' || !String(t.transaction_date).startsWith(String(NAM))) continue;
    soVao++;
    const tien = doLonTien(t);
    if (noiBo.has(String(t.id))) continue;
    const e = hl.get(String(t.id));
    if (e === 'exclude') continue;
    if (e === 'include') daXn += tien; else chuaRo += tien;
    uoc += tien;
  }
  const tong = daXn + chuaRo;
  return { uoc_tinh: uoc, do_tin_cay: !soVao ? 'thap' : tong > 0 && chuaRo / tong <= 0.1 ? 'cao' : 'trung_binh', noi_bo: noiBo };
}

// ── Đánh giá ────────────────────────────────────────────────────────────────────

const NGUONG = [NGUONG_DOANH_THU, NGUONG_THU_NHAP, NGUONG_KHAI_THANG];
const phia = (x: number) => NGUONG.map((n) => x > n);

export interface BaoCaoDanhGia {
  so_ca: number;
  trang_thai: { chac: number; can_xem: number; chua_du_du_lieu: number };
  /** MIMI nói một phía của ngưỡng (kết luận KHÔNG phụ thuộc phần chưa rõ) mà sự thật ở phía kia. */
  noi_sai_nguong: { moi: number[]; cu: number[] };
  /** Sự thật nằm ngoài [can_duoi, can_tren]. */
  khoang_khong_chua_su_that: number[];
  /** Số ca có ≥1 ngưỡng bị cắt và MIMI đã dừng để hỏi. */
  dung_de_hoi: number;
  /** Số ca sự thật cắt ngưỡng 01 tỷ so với ước tính: MIMI (mới / cũ) có bắt được không. */
  ca_uoc_tinh_sai_phia_1_ty: { tong: number; moi_da_dung_hoi: number; cu_da_canh_bao: number };
  xac_nhan: { chinh_xac_tien: number | null; chinh_xac_dong: number | null; thu_hoi_tien: number | null; thu_hoi_tien_cu: number | null; so_dong: number };
  can_xem: {
    /** Dòng mà cách MIMI tạm xử lý ≠ sự thật và chưa ai xác nhận (đáng lẽ phải được đánh dấu). */
    dong_rui_ro: number;
    dong_rui_ro_bi_bo_sot: number;
    thu_hoi: number | null;
    /** Trong số dòng MIMI đánh dấu cần xem, bao nhiêu thật sự rủi ro. */
    chinh_xac: number | null;
    dong_danh_dau: number;
  };
  sai_so_uoc_tinh_trung_binh: number;
}

export async function danhGia(hats: number[]): Promise<BaoCaoDanhGia> {
  const bc: BaoCaoDanhGia = {
    so_ca: hats.length, trang_thai: { chac: 0, can_xem: 0, chua_du_du_lieu: 0 }, noi_sai_nguong: { moi: [], cu: [] },
    khoang_khong_chua_su_that: [], dung_de_hoi: 0, ca_uoc_tinh_sai_phia_1_ty: { tong: 0, moi_da_dung_hoi: 0, cu_da_canh_bao: 0 },
    xac_nhan: { chinh_xac_tien: null, chinh_xac_dong: null, thu_hoi_tien: null, thu_hoi_tien_cu: null, so_dong: 0 },
    can_xem: { dong_rui_ro: 0, dong_rui_ro_bi_bo_sot: 0, thu_hoi: null, chinh_xac: null, dong_danh_dau: 0 },
    sai_so_uoc_tinh_trung_binh: 0,
  };
  let xnDungTien = 0; let xnTien = 0; let xnDungDong = 0; let xnDong = 0; let xnThieuTien = 0; let xnKyVongTien = 0; let xnMatCu = 0;
  let saiSo = 0;
  let danhDauDung = 0;

  for (const hat of hats) {
    const ca = sinhCa(hat);
    const { nguon, s } = await chayMimi(ca);
    const dc = s.do_chac_chan;
    bc.trang_thai[dc.trang_thai] += 1;
    const that = ca.doanh_thu_that;
    saiSo += Math.abs(s.uoc_tinh - that) / Math.max(1, that);

    // Khoảng phải chứa sự thật (theo giả định tháng thiếu ≤ tháng lớn nhất đã thấy).
    if (that < Number(dc.can_duoi) || that > Number(dc.can_tren)) bc.khoang_khong_chua_su_that.push(hat);

    // "Nói sai ngưỡng": chỉ tính khi MIMI KHÔNG dừng lại (kết luận không phụ thuộc phần chưa rõ).
    const sTh = phia(that);
    if (!dc.ket_luan_phu_thuoc) {
      const dung = dc.nguong.map((n) => n.phia === 'tren');
      if (dung.some((v, i) => v !== sTh[i])) bc.noi_sai_nguong.moi.push(hat);
    } else bc.dung_de_hoi += 1;
    // Mô hình cũ luôn nói, dựa trên ước tính của nó.
    const cu = moHinhCu(ca);
    if (phia(cu.uoc_tinh).some((v, i) => v !== sTh[i])) bc.noi_sai_nguong.cu.push(hat);

    // Ca mà phía của ước tính (mới) khác phía của sự thật đối với ngưỡng 1 tỷ: có bắt được không?
    if ((s.uoc_tinh > NGUONG_DOANH_THU) !== (that > NGUONG_DOANH_THU)) {
      bc.ca_uoc_tinh_sai_phia_1_ty.tong += 1;
      if (dc.ket_luan_phu_thuoc) bc.ca_uoc_tinh_sai_phia_1_ty.moi_da_dung_hoi += 1;
      if (cu.do_tin_cay !== 'cao') bc.ca_uoc_tinh_sai_phia_1_ty.cu_da_canh_bao += 1;
    }

    // Từng dòng tiền vào của năm: MIMI xếp vào đâu?
    const suyDoan = nguon.noi_bo.suyDoanIds;
    for (const g of ca.giao_dich) {
      if (g.type !== 'income' || g.is_synthetic || !g.transaction_date.startsWith(String(NAM))) continue;
      const n = ca.nhan[g.id];
      const mot = tinhTienVao(NAM, [g as GiaoDichTinh], ca.xac_nhan.filter((x) => x.transaction_id === g.id), nguon.noi_bo.internalIds, suyDoan);
      const daXacNhan = mot.da_xac_nhan > 0;
      const canXem = mot.chua_ro > 0 || mot.noi_bo_suy_doan > 0 || mot.am_bat_thuong > 0;
      const tien = g.amount;
      if (daXacNhan) {
        xnDong += 1; xnTien += tien;
        if (n.la_doanh_thu) { xnDungDong += 1; xnDungTien += tien; }
      }
      if (n.la_doanh_thu && n.da_xac_nhan === 'include') {
        xnKyVongTien += tien;
        if (!daXacNhan) xnThieuTien += tien;
        // Logic cũ: chuyển nội bộ suy đoán thắng cả lời người xác nhận.
        if (cu.noi_bo.has(g.id)) xnMatCu += tien;
      }
      // Rủi ro: cách MIMI tạm xử lý dòng này (doanh thu nếu chưa ai loại và không phải nội bộ) khác sự thật, chưa ai xác nhận.
      const dangTinh = mot.chua_ro > 0 || mot.da_xac_nhan > 0;
      const rui = !n.da_xac_nhan && dangTinh !== n.la_doanh_thu;
      if (rui) bc.can_xem.dong_rui_ro += 1;
      if (rui && !canXem) bc.can_xem.dong_rui_ro_bi_bo_sot += 1;
      if (canXem) { bc.can_xem.dong_danh_dau += 1; if (rui) danhDauDung += 1; }
    }
  }
  bc.xac_nhan = {
    chinh_xac_tien: xnTien ? xnDungTien / xnTien : null,
    chinh_xac_dong: xnDong ? xnDungDong / xnDong : null,
    thu_hoi_tien: xnKyVongTien ? 1 - xnThieuTien / xnKyVongTien : null,
    thu_hoi_tien_cu: xnKyVongTien ? 1 - xnMatCu / xnKyVongTien : null,
    so_dong: xnDong,
  };
  bc.can_xem.thu_hoi = bc.can_xem.dong_rui_ro ? 1 - bc.can_xem.dong_rui_ro_bi_bo_sot / bc.can_xem.dong_rui_ro : null;
  bc.can_xem.chinh_xac = bc.can_xem.dong_danh_dau ? danhDauDung / bc.can_xem.dong_danh_dau : null;
  bc.sai_so_uoc_tinh_trung_binh = saiSo / hats.length;
  return bc;
}
