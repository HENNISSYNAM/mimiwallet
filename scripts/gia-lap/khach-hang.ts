/**
 * KHÁCH HÀNG GIẢ LẬP — sinh sao kê cho 5 chân dung (docs/CHAN_DUNG_KHACH_HANG.md) rồi chạy qua ĐÚNG các
 * hàm của MIMI: bộ đọc sao kê, trừ chuyển nội bộ, gợi ý loại tiền vào, tính doanh thu, so ngưỡng thuế.
 *
 * DỮ LIỆU GIẢ LẬP. Không phải sao kê của ngân hàng nào, không phải khách thật. Mọi con số là thiết kế để phủ
 * các ca khó (vay, góp vốn, người nhà, chuyển nội bộ, tiền hàng do chồng thu hộ, sàn TMĐT trả ròng, tiền mặt).
 * Không ghi gì vào cơ sở dữ liệu. Seed cố định: chạy lại ra đúng dữ liệu cũ.
 *
 * Chạy:  npx vite-node scripts/gia-lap/khach-hang.ts
 * Ra:    docs/gia-lap-khach-hang/du-lieu/*.csv (sao kê + đáp án) và ket-qua.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { docCsv, docDong, nhanCot } from '../../supabase/functions/_shared/sao-ke/doc-sao-ke.ts';
import { findInternalTransfers, thresholdStatus, type LedgerTx } from '../../supabase/functions/_shared/ledger/internal-transfer.ts';
import { goiYTienVao } from '../../supabase/functions/_shared/phan-loai/tien-vao.ts';
import { tinhTienVao, type XacNhanTinh } from '../../supabase/functions/_shared/doanh-thu/so-lieu.ts';

// ── Ngẫu nhiên có seed ───────────────────────────────────────────────────────
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rnd = mulberry32(20260929);
const trongKhoang = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const lamTron = (n: number, buoc = 1000) => Math.round(n / buoc) * buoc;
const chon = <T,>(ds: T[]) => ds[Math.floor(rnd() * ds.length)];
const ngay = (thang: number, d: number) => `2026-${String(thang).padStart(2, '0')}-${String(Math.min(d, 28)).padStart(2, '0')}`;

/** Nhãn đáp án — cùng bộ 10 nhãn của khoá luận (doanh-thu/phan-loai.ts). */
type Nhan = 'business_revenue' | 'internal_transfer' | 'loan' | 'capital_contribution' | 'family_transfer'
  | 'personal' | 'refund' | 'deposit' | 'collection_on_behalf' | 'other' | 'chi';
const LA_DOANH_THU: Record<Nhan, boolean | null> = {
  business_revenue: true, collection_on_behalf: true, internal_transfer: false, loan: false, capital_contribution: false,
  family_transfer: false, personal: false, refund: false, deposit: null /* tuỳ thời điểm giao hàng — không chấm */, other: null, chi: false,
};

interface Dong { ngay: string; no: number; co: number; noi_dung: string; ten: string; tk: string; nhan: Nhan; ghi_chu?: string }
interface TaiKhoan { so: string; ngan_hang: string; dong: Dong[] }
interface ChanDung {
  ma: string; ten: string; mo_ta: string; tai_khoan: TaiKhoan[];
  /** Doanh thu thật KHÔNG đi qua ngân hàng (tiền mặt) hoặc phần sàn giữ lại — MIMI không thể thấy. */
  ngoai_ngan_hang: number; ly_do_ngoai: string;
}

const vao = (tk: TaiKhoan, d: string, tien: number, nd: string, ten: string, nhan: Nhan, tkDoiUng = '', ghi_chu?: string) =>
  tk.dong.push({ ngay: d, no: 0, co: tien, noi_dung: nd, ten, tk: tkDoiUng, nhan, ghi_chu });
const ra = (tk: TaiKhoan, d: string, tien: number, nd: string, ten: string, tkDoiUng = '') =>
  tk.dong.push({ ngay: d, no: tien, co: 0, noi_dung: nd, ten, tk: tkDoiUng, nhan: 'chi' });

const THANG = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// ── 1. Chị Hạnh — tạp hoá sỉ, Cần Thơ ────────────────────────────────────────
function chiHanh(): ChanDung {
  rnd = mulberry32(101);
  const tk: TaiKhoan = { so: '0381000123456', ngan_hang: 'Ngân hàng A', dong: [] };
  const tiem = ['TAP HOA KIM LOAN', 'TAP HOA BA TU', 'NGUYEN VAN BA', 'TRAN THI MUOI', 'TAP HOA PHUOC THANH', 'LE VAN HAI', 'DAI LY HUNG PHAT'];
  for (const m of THANG) {
    const soDon = trongKhoang(20, 26);
    for (let i = 0; i < soDon; i++) {
      const ten = chon(tiem);
      const nd = chon(['CK TIEN HANG', 'TT DON HANG TAP HOA', `${ten} CHUYEN KHOAN`, 'CK', 'TRA TIEN HANG THANG ' + m]);
      vao(tk, ngay(m, trongKhoang(1, 28)), lamTron(trongKhoang(2_500_000, 5_500_000)), nd, ten, 'business_revenue');
    }
    // Chồng giao hàng, thu tiền mặt của tiệm rồi chuyển về — là TIỀN HÀNG, dù nội dung giống người nhà.
    vao(tk, ngay(m, 25), lamTron(trongKhoang(12_000_000, 18_000_000)), 'CHONG CHUYEN TIEN HANG THU DUOC', 'LE VAN TU', 'collection_on_behalf', '', 'tiền hàng chồng thu hộ');
    vao(tk, ngay(m, 5), 3_000_000, 'CON GUI ME', 'LE THI NGOC HAN', 'family_transfer');
    ra(tk, ngay(m, 10), lamTron(trongKhoang(70_000_000, 85_000_000)), 'TT TIEN HANG NCC THANH BINH', 'CONG TY THANH BINH');
    ra(tk, ngay(m, 20), lamTron(trongKhoang(8_000_000, 12_000_000)), 'CHI TIEU GIA DINH', 'LE THI HANH');
  }
  vao(tk, ngay(2, 8), 10_000_000, 'CON GUI ME AN TET', 'LE THI NGOC HAN', 'family_transfer');
  vao(tk, ngay(3, 12), 200_000_000, 'GIAI NGAN HDTD 0126/2026 VAY BO SUNG VON', 'NGAN HANG A CN CAN THO', 'loan');
  vao(tk, ngay(5, 17), 3_500_000, 'NCC HOAN TIEN HANG LOI', 'CONG TY THANH BINH', 'refund');
  return { ma: 'chi-hanh', ten: 'Chị Hạnh · 52 · tạp hoá sỉ, Cần Thơ', mo_ta: 'Một tài khoản; chồng thu tiền mặt rồi chuyển về; một khoản vay 200 triệu.', tai_khoan: [tk], ngoai_ngan_hang: 0, ly_do_ngoai: 'Khách trả gần hết bằng chuyển khoản (giả định).' };
}

// ── 4. Chị Linh — kế toán dịch vụ; một khách của chị: spa ở Đà Nẵng ────────────
function chiLinh(): ChanDung {
  rnd = mulberry32(404);
  const tk: TaiKhoan = { so: '1027788990', ngan_hang: 'Ngân hàng B', dong: [] };
  const khach = ['NGUYEN THI MAI', 'TRAN BAO NGOC', 'PHAM THU TRANG', 'VO THI LAN', 'DANG MY LINH', 'HO NGOC ANH'];
  for (const m of THANG) {
    const soLan = trongKhoang(35, 50);
    for (let i = 0; i < soLan; i++) {
      const ten = chon(khach);
      vao(tk, ngay(m, trongKhoang(1, 28)), lamTron(trongKhoang(300_000, 1_800_000), 10_000), chon(['THANH TOAN LIEU TRINH', 'CK SPA', `${ten} CK`, 'GOI CHAM SOC DA', 'TT DICH VU']), ten, 'business_revenue');
    }
    if (m % 2 === 0) vao(tk, ngay(m, 3), 5_000_000, 'DAT COC LIEU TRINH 10 BUOI', chon(khach), 'deposit', '', 'đặt cọc gói dịch vụ — doanh thu khi làm dịch vụ');
    ra(tk, ngay(m, 1), 15_000_000, 'TIEN THUE MAT BANG', 'CHU NHA TRAN VAN KHOA');
    ra(tk, ngay(m, 15), lamTron(trongKhoang(8_000_000, 12_000_000)), 'MUA MY PHAM NCC', 'CONG TY MY PHAM HOA SEN');
  }
  vao(tk, ngay(4, 9), 50_000_000, 'EM GAI GOP VON MUA MAY TRIET LONG', 'NGUYEN THI THAO', 'capital_contribution');
  vao(tk, ngay(6, 2), 4_000_000, 'ME GUI TIEN', 'LE THI BA', 'family_transfer');
  // Khách trả thay người khác — nội dung giống người nhà nhưng là tiền dịch vụ.
  vao(tk, ngay(7, 19), 2_400_000, 'CHI GUI TIEN LIEU TRINH CHO EM', 'NGUYEN THI MAI', 'business_revenue', '', 'khách trả hộ em gái — vẫn là tiền dịch vụ');
  return { ma: 'chi-linh', ten: 'Chị Linh · 29 · kế toán dịch vụ; khách mẫu: một spa ở Đà Nẵng', mo_ta: 'Chị Linh làm cho 15 hộ; đây là sao kê của một hộ (spa).', tai_khoan: [tk], ngoai_ngan_hang: 0, ly_do_ngoai: 'Giả định khách spa trả chuyển khoản.' };
}

// ── 5. Minh — bán mỹ phẩm trên TikTok Shop, Shopee ───────────────────────────
function minh(): ChanDung {
  rnd = mulberry32(505);
  const tk: TaiKhoan = { so: '0909123456', ngan_hang: 'Ngân hàng C', dong: [] };
  let phiSan = 0;
  for (const m of THANG) {
    for (const d of [3, 10, 17, 24]) {
      const rong = lamTron(trongKhoang(6_000_000, 11_000_000));
      phiSan += lamTron(rong / 0.88 - rong); // sàn giữ khoảng 12% trước khi trả
      vao(tk, ngay(m, d), rong, 'TIKTOK SHOP THANH TOAN DOI SOAT', 'TIKTOK SHOP VN', 'business_revenue', '', 'tiền sàn trả RÒNG, đã trừ phí');
    }
    const rongShopee = lamTron(trongKhoang(2_000_000, 4_000_000));
    phiSan += lamTron(rongShopee / 0.88 - rongShopee);
    vao(tk, ngay(m, 14), rongShopee, 'SHOPEE CHUYEN TIEN DOI SOAT', 'SHOPEE VN', 'business_revenue');
    vao(tk, ngay(m, trongKhoang(1, 28)), 200_000, 'TRA TIEN AN TRUA', chon(['BAN KHANH', 'BAN VY']), 'personal', '', 'bạn trả lại tiền ăn');
    ra(tk, ngay(m, 6), lamTron(trongKhoang(15_000_000, 22_000_000)), 'NHAP HANG MY PHAM', 'KHO SI QUANG CHAU');
    ra(tk, ngay(m, 20), 3_000_000, 'CHAY QUANG CAO TIKTOK', 'TIKTOK ADS');
  }
  vao(tk, ngay(1, 6), 15_000_000, 'BO ME GUI TIEN HOC KY', 'NGUYEN VAN HUNG', 'family_transfer');
  vao(tk, ngay(8, 20), 15_000_000, 'BO ME GUI TIEN HOC KY 1', 'NGUYEN VAN HUNG', 'family_transfer');
  vao(tk, ngay(5, 11), 450_000, 'HOAN TIEN DON NHAP LOI', 'KHO SI QUANG CHAU', 'refund');
  return { ma: 'minh', ten: 'Minh · 19 · TikTok Shop, Shopee', mo_ta: 'Sàn trả tiền RÒNG (đã trừ ~12% phí); bố mẹ gửi tiền học.', tai_khoan: [tk], ngoai_ngan_hang: phiSan, ly_do_ngoai: 'Phí sàn bị trừ trước khi trả — doanh thu tính thuế là giá bán, lớn hơn tiền về tài khoản.' };
}

// ── 6. Chị Thu — 3 quán cà phê, Hải Phòng ────────────────────────────────────
function chiThu(): ChanDung {
  rnd = mulberry32(606);
  const chinh: TaiKhoan = { so: '1900111222', ngan_hang: 'Ngân hàng D', dong: [] };
  const q2: TaiKhoan = { so: '1900333444', ngan_hang: 'Ngân hàng D', dong: [] };
  const q3: TaiKhoan = { so: '0711555666', ngan_hang: 'Ngân hàng E', dong: [] };
  for (const m of THANG) {
    for (const [tk, ten] of [[chinh, 'QUAN 1'], [q2, 'QUAN 2'], [q3, 'QUAN 3']] as const) {
      for (let d = 1; d <= 28; d += 2) {
        vao(tk, ngay(m, d), lamTron(trongKhoang(3_000_000, 6_500_000)), `TT THE POS ${ten} NGAY ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`, 'CONG TY THANH TOAN POS', 'business_revenue');
      }
      vao(tk, ngay(m, 26), lamTron(trongKhoang(5_000_000, 9_000_000)), `NOP TIEN MAT DOANH THU ${ten}`, 'PHAM THI THU', 'business_revenue', '', 'tiền mặt bán hàng nộp vào');
      ra(tk, ngay(m, 5), lamTron(trongKhoang(25_000_000, 35_000_000)), `LUONG NHAN VIEN ${ten}`, 'BANG LUONG');
    }
    // Cuối tháng gom tiền quán 2, quán 3 về tài khoản chính.
    for (const [tk, tkSo, ten] of [[q2, q2.so, 'QUAN 2'], [q3, q3.so, 'QUAN 3']] as const) {
      const tien = lamTron(trongKhoang(40_000_000, 60_000_000), 1_000_000);
      const coTk = tk === q2; // ngân hàng của quán 3 không ghi tài khoản đối ứng
      ra(tk, ngay(m, 27), tien, `CHUYEN VE TK CHINH ${ten}`, 'PHAM THI THU', coTk ? chinh.so : '');
      vao(chinh, ngay(m, 27), tien, `NHAN TIEN ${ten} CHUYEN VE`, 'PHAM THI THU', 'internal_transfer', coTk ? tkSo : '');
    }
    ra(chinh, ngay(m, 12), lamTron(trongKhoang(90_000_000, 120_000_000)), 'TT NGUYEN LIEU CA PHE SUA', 'CONG TY NGUYEN LIEU HP');
  }
  vao(chinh, ngay(7, 15), 300_000_000, 'ANH HUNG GOP VON MO QUAN 4', 'TRAN VAN HUNG', 'capital_contribution');
  vao(chinh, ngay(8, 8), 500_000_000, 'GIAI NGAN KHOAN VAY MO QUAN 4', 'NGAN HANG D CN HAI PHONG', 'loan');
  return { ma: 'chi-thu', ten: 'Chị Thu · 41 · 3 quán cà phê, Hải Phòng', mo_ta: 'Ba tài khoản; gom tiền về tài khoản chính mỗi tháng; góp vốn 300 triệu và vay 500 triệu mở quán 4.', tai_khoan: [chinh, q2, q3], ngoai_ngan_hang: 0, ly_do_ngoai: 'Tiền mặt đã được nộp vào ngân hàng (giả định).' };
}

// ── 7. Bác Sáu — tiệm vàng nhỏ, Mỹ Tho ───────────────────────────────────────
function bacSau(): ChanDung {
  rnd = mulberry32(707);
  const tk: TaiKhoan = { so: '7100246810', ngan_hang: 'Ngân hàng F', dong: [] };
  let tienMat = 0;
  for (const m of THANG) {
    const soLan = trongKhoang(5, 9);
    for (let i = 0; i < soLan; i++) {
      vao(tk, ngay(m, trongKhoang(1, 28)), lamTron(trongKhoang(5_000_000, 25_000_000), 100_000), chon(['CK MUA NHAN VANG 18K', 'CK MUA DAY CHUYEN', 'MUA VANG', 'CK']), chon(['VO THI NAM', 'HUYNH VAN SON', 'TRAN THI BE']), 'business_revenue');
    }
    tienMat += lamTron(trongKhoang(150_000_000, 220_000_000), 1_000_000); // khách mua vàng trả tiền mặt là chính
    vao(tk, ngay(m, 10), 5_000_000, 'CON TRAI GUI BA', 'NGUYEN VAN LOC', 'family_transfer', '', 'con trai gửi tiền — nội dung không khớp mẫu "con gui"');
    ra(tk, ngay(m, 15), lamTron(trongKhoang(20_000_000, 60_000_000), 100_000), 'THU MUA VANG CU', 'KHACH LE');
  }
  vao(tk, ngay(6, 21), 10_000_000, 'KHACH DAT COC NHAN CUOI', 'LE THI HOA', 'deposit', '', 'đặt cọc — doanh thu khi giao nhẫn');
  return { ma: 'bac-sau', ten: 'Bác Sáu · 72 · tiệm vàng nhỏ, Mỹ Tho', mo_ta: 'Khách trả tiền mặt là chính; chỉ một phần qua ngân hàng.', tai_khoan: [tk], ngoai_ngan_hang: tienMat, ly_do_ngoai: 'Tiền mặt bán vàng không qua ngân hàng — MIMI không thấy.' };
}

// ── Xuất sao kê đúng dạng ngân hàng hay dùng ─────────────────────────────────
function csvSaoKe(tk: TaiKhoan): string {
  const ds = [...tk.dong].sort((a, b) => a.ngay.localeCompare(b.ngay));
  const o = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const dmy = (s: string) => s.split('-').reverse().join('/');
  return [
    'SAO KE TAI KHOAN — DU LIEU GIA LAP, KHONG PHAI SAO KE THAT',
    `So tai khoan: ${tk.so}`,
    'Ngày giao dịch;Số tiền ghi nợ;Số tiền ghi có;Nội dung chi tiết;Tên tài khoản đối ứng;Số tài khoản đối ứng',
    ...ds.map((d) => [dmy(d.ngay), d.no ? d.no.toLocaleString('vi-VN') : '', d.co ? d.co.toLocaleString('vi-VN') : '', o(d.noi_dung), o(d.ten), d.tk].join(';')),
  ].join('\n');
}

// ── Chạy qua MIMI ────────────────────────────────────────────────────────────
interface GiaoDichChay { id: string; amount: number; type: 'income' | 'expense'; transaction_date: string; account_number: string; counter_account_number: string | null; merchant_name: string | null; counter_account_name: string | null; nhan: Nhan }

function chay(cd: ChanDung) {
  const tatCa: GiaoDichChay[] = [];
  const loiDoc: string[] = [];
  for (const tk of cd.tai_khoan) {
    const bang = docCsv(csvSaoKe(tk));
    const bd = nhanCot(bang);
    if (!bd) { loiDoc.push(`${tk.so}: không nhận ra cột`); continue; }
    const { dong, loi } = docDong(bang, bd);
    loi.forEach((l) => loiDoc.push(`${tk.so} dòng ${l.dong}: ${l.cau}`));
    const goc = [...tk.dong].sort((a, b) => a.ngay.localeCompare(b.ngay));
    if (dong.length !== goc.length) loiDoc.push(`${tk.so}: đọc ${dong.length}/${goc.length} dòng`);
    dong.forEach((d, i) => tatCa.push({
      id: `${cd.ma}-${tk.so}-${i}`, amount: d.amount, type: d.type, transaction_date: d.transaction_date,
      account_number: tk.so, counter_account_number: d.counter_account_number, merchant_name: d.merchant_name,
      counter_account_name: d.counter_account_name, nhan: goc[i]?.nhan ?? 'other',
    }));
  }
  const taiKhoanCuaToi = cd.tai_khoan.map((t) => t.so);
  const noiBo = findInternalTransfers(tatCa as unknown as LedgerTx[], { ownAccounts: taiKhoanCuaToi });
  const vaoDs = tatCa.filter((t) => t.type === 'income');

  // Gợi ý của MIMI cho từng khoản vào (chưa ai xác nhận).
  const goiY = new Map(vaoDs.map((t) => [t.id, goiYTienVao({ merchant_name: t.merchant_name, counter_account_name: t.counter_account_name, payment_reference: null })]));

  // Chấm gợi ý: gợi ý "không phải doanh thu" có đúng không.
  let goiYDung = 0, goiYSai = 0, bo_sot = 0;
  const ca_sai: string[] = [], ca_sot: string[] = [];
  for (const t of vaoDs) {
    if (noiBo.internalIds.has(t.id)) continue;
    const g = goiY.get(t.id);
    const that = LA_DOANH_THU[t.nhan];
    if (g) {
      if (that === false || t.nhan === 'deposit') goiYDung++;
      else { goiYSai++; ca_sai.push(`${t.merchant_name} (${t.amount.toLocaleString('vi-VN')}) — MIMI gợi ý "${g.loai}", thật là ${t.nhan}`); }
    } else if (that === false) { bo_sot++; ca_sot.push(`${t.merchant_name} (${t.amount.toLocaleString('vi-VN')}) — thật là ${t.nhan}, MIMI không hỏi`); }
  }
  // Chấm chuyển nội bộ.
  const noiBoThat = new Set(vaoDs.filter((t) => t.nhan === 'internal_transfer').map((t) => t.id));
  const noiBoBat = [...noiBo.internalIds].filter((id) => vaoDs.some((t) => t.id === id));
  const noiBoDung = noiBoBat.filter((id) => noiBoThat.has(id)).length;

  const xnRong: XacNhanTinh[] = [];
  const xnTheoGoiY: XacNhanTinh[] = [...goiY].filter(([, g]) => g).map(([id]) => ({ transaction_id: id, revenue_effect: 'exclude' }));
  const xnDung: XacNhanTinh[] = vaoDs.map((t) => ({ transaction_id: t.id, revenue_effect: LA_DOANH_THU[t.nhan] === false ? 'exclude' : 'include' }));
  const tinh = (xn: XacNhanTinh[]) => tinhTienVao(2026, tatCa, xn, noiBo.internalIds);
  const A = tinh(xnRong), B = tinh(xnTheoGoiY), C = tinh(xnDung);
  const dtNganHangThat = vaoDs.filter((t) => LA_DOANH_THU[t.nhan] !== false).reduce((s, t) => s + t.amount, 0);
  const dtThatDayDu = dtNganHangThat + cd.ngoai_ngan_hang;
  const nguong = (n: number) => { const s = thresholdStatus(n); return s.milestones.map((m) => `${m.key === 'tax_exemption' ? '1 tỷ' : '3 tỷ'}: ${m.crossed ? 'ĐÃ VƯỢT' : 'chưa'}`).join(', '); };

  return {
    ma: cd.ma, ten: cd.ten, mo_ta: cd.mo_ta,
    doc_sao_ke: { so_tai_khoan: cd.tai_khoan.length, so_dong: tatCa.length, loi: loiDoc },
    tien_vao: A.tien_vao,
    chuyen_noi_bo: { mimi_bat: noiBoBat.length, dung: noiBoDung, that: noiBoThat.size, can_xem_lai: noiBo.needsReview.length },
    goi_y: { so_cau_hoi: [...goiY.values()].filter(Boolean).length, dung: goiYDung, sai: goiYSai, bo_sot, ca_sai, ca_sot },
    doanh_thu: {
      A_chua_xac_nhan: A.uoc_tinh, B_dong_y_moi_goi_y: B.uoc_tinh, C_xac_nhan_dung_het: C.uoc_tinh,
      that_qua_ngan_hang: dtNganHangThat, that_day_du: dtThatDayDu, ngoai_ngan_hang: cd.ngoai_ngan_hang, ly_do_ngoai: cd.ly_do_ngoai,
    },
    nguong: { A: nguong(A.uoc_tinh), B: nguong(B.uoc_tinh), C: nguong(C.uoc_tinh), that_day_du: nguong(dtThatDayDu) },
  };
}

const ra_thu_muc = join('docs', 'gia-lap-khach-hang', 'du-lieu');
mkdirSync(ra_thu_muc, { recursive: true });
const ketQua = [];
for (const cd of [chiHanh(), chiLinh(), minh(), chiThu(), bacSau()]) {
  for (const tk of cd.tai_khoan) {
    writeFileSync(join(ra_thu_muc, `${cd.ma}-${tk.so}.csv`), '﻿' + csvSaoKe(tk), 'utf8');
    const dapAn = [...tk.dong].sort((a, b) => a.ngay.localeCompare(b.ngay))
      .map((d) => [d.ngay, d.no || '', d.co || '', `"${d.noi_dung}"`, d.nhan, d.ghi_chu ? `"${d.ghi_chu}"` : ''].join(','));
    writeFileSync(join(ra_thu_muc, `${cd.ma}-${tk.so}.dap-an.csv`), '﻿' + ['ngay,no,co,noi_dung,nhan_that,ghi_chu', ...dapAn].join('\n'), 'utf8');
  }
  ketQua.push(chay(cd));
}
writeFileSync(join('docs', 'gia-lap-khach-hang', 'ket-qua.json'), JSON.stringify(ketQua, null, 2), 'utf8');
console.log(JSON.stringify(ketQua, null, 2));
