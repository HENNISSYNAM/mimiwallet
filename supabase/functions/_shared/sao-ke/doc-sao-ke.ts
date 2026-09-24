/**
 * Đọc sao kê ngân hàng do người dùng tải lên (Excel hoặc CSV).
 *
 * VÌ SAO LÀ VIỆC SỐ MỘT (docs/KIEM_TOAN_RA_MAT.md, P-1). Cas đang tắc, SePay chỉ có tiền mới — một
 * hộ kinh doanh mới không có đường nào đưa 12 tháng sao kê vào MIMI. Ngân hàng nào cũng cho tải
 * sao kê Excel. Mỗi ngân hàng một kiểu cột, nên không đoán theo tên ngân hàng: đọc tiêu đề cột,
 * so với bộ từ đồng nghĩa (tiếng Việt và tiếng Anh), và cho người dùng sửa nếu MIMI hiểu sai.
 *
 * Hàm thuần, không import gì: trình duyệt dùng để xem trước, máy chủ dùng lại để kiểm từng dòng.
 * Máy chủ không tin dòng trình duyệt gửi lên — kiểm lại bằng chính `kiemDong`.
 */

export type O = string | number | boolean | Date | null | undefined;
export type Cot = 'ngay' | 'co' | 'no' | 'so_tien' | 'noi_dung' | 'so_tham_chieu' | 'so_du' | 'ten_doi_ung' | 'tk_doi_ung';

export const TEN_COT: Record<Cot, string> = {
  ngay: 'Ngày giao dịch',
  co: 'Tiền vào (ghi có)',
  no: 'Tiền ra (ghi nợ)',
  so_tien: 'Số tiền (có dấu)',
  noi_dung: 'Nội dung chuyển khoản',
  so_tham_chieu: 'Số tham chiếu',
  so_du: 'Số dư',
  ten_doi_ung: 'Tên người chuyển / nhận',
  tk_doi_ung: 'Tài khoản đối ứng',
};

/** Từ đồng nghĩa đã bỏ dấu, viết thường. Thứ tự trong mỗi danh sách là thứ tự ưu tiên. */
const DONG_NGHIA: Record<Cot, string[]> = {
  ngay: ['ngay giao dich', 'ngay gd', 'thoi gian giao dich', 'ngay thuc hien', 'transaction date', 'ngay hach toan', 'posting date', 'ngay', 'date', 'ngay hieu luc', 'value date', 'effective date'],
  co: ['so tien ghi co', 'ghi co', 'phat sinh co', 'so tien vao', 'tien vao', 'gui vao', 'credit amount', 'credit', 'co'],
  no: ['so tien ghi no', 'ghi no', 'phat sinh no', 'so tien ra', 'tien ra', 'rut ra', 'debit amount', 'debit', 'no'],
  so_tien: ['so tien giao dich', 'transaction amount', 'so tien', 'amount'],
  noi_dung: ['noi dung chi tiet', 'noi dung giao dich', 'chi tiet giao dich', 'transaction details', 'noi dung', 'dien giai', 'mo ta', 'description', 'remarks', 'remark', 'details', 'narrative', 'chi tiet'],
  so_tham_chieu: ['so tham chieu', 'ma giao dich', 'so giao dich', 'so but toan', 'ma gd', 'so ct', 'ref no', 'reference no', 'reference', 'transaction id', 'trace no'],
  so_du: ['so du cuoi', 'so du', 'running balance', 'balance'],
  ten_doi_ung: ['ten tai khoan doi ung', 'ten tk doi ung', 'ten doi ung', 'ten nguoi chuyen', 'ten nguoi nhan', 'nguoi chuyen', 'doi ung', 'counterparty name', 'counterparty', 'beneficiary name', 'beneficiary'],
  tk_doi_ung: ['so tai khoan doi ung', 'tai khoan doi ung', 'so tk doi ung', 'tk doi ung', 'counter account', 'counterparty account'],
};

const boDau = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** "Số tiền ghi có (VND)/Credit" → ["so tien ghi co", "credit"]. */
function cacPhan(tieuDe: O): string[] {
  if (tieuDe === null || tieuDe === undefined) return [];
  return boDau(String(tieuDe))
    .replace(/\([^)]*\)/g, ' ')
    .split(/[\/\n|]+/)
    .map((p) => p.replace(/\b(vnd|vnđ|dong)\b/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** Cột khớp từ đồng nghĩa DÀI nhất: "Số tiền ghi có" là tiền vào, không phải "Số tiền" chung. */
function khopCot(tieuDe: O): Cot | null {
  const phan = cacPhan(tieuDe);
  if (!phan.length) return null;
  let totCot: Cot | null = null;
  let totDai = 0;
  for (const [cot, ds] of Object.entries(DONG_NGHIA) as [Cot, string[]][]) {
    for (const tu of ds) {
      // Từ một chữ ("co", "no", "date") phải khớp nguyên; cụm nhiều chữ được là phần đầu.
      const khop = phan.some((p) => p === tu || (tu.includes(' ') && p.startsWith(tu)));
      if (khop && tu.length > totDai) { totCot = cot; totDai = tu.length; }
    }
  }
  return totCot;
}

export interface BanDoCot {
  /** Chỉ số dòng tiêu đề (0-based) trong bảng. */
  dong_tieu_de: number;
  cot: Partial<Record<Cot, number>>;
  tieu_de: string[];
}

/** Tìm dòng tiêu đề trong 40 dòng đầu: dòng có cột ngày và ít nhất một cột tiền. */
export function nhanCot(bang: O[][]): BanDoCot | null {
  for (let i = 0; i < Math.min(40, bang.length); i++) {
    const cot: Partial<Record<Cot, number>> = {};
    (bang[i] ?? []).forEach((o, j) => {
      const c = khopCot(o);
      if (c && cot[c] === undefined) cot[c] = j;
    });
    if (cot.ngay !== undefined && (cot.co !== undefined || cot.no !== undefined || cot.so_tien !== undefined)) {
      return { dong_tieu_de: i, cot, tieu_de: (bang[i] ?? []).map((o) => (o === null || o === undefined ? '' : String(o))) };
    }
  }
  return null;
}

const hai = (n: number) => String(n).padStart(2, '0');

/** Ngày → "yyyy-mm-dd". Nhận Date (Excel), số ngày kiểu Excel, và chuỗi dd/mm/yyyy, yyyy-mm-dd. */
export function docNgay(v: O): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return `${v.getUTCFullYear()}-${hai(v.getUTCMonth() + 1)}-${hai(v.getUTCDate())}`;
  }
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86_400_000);
    return docNgay(d);
  }
  if (typeof v !== 'string') return null;
  const s = v.trim();
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(s);
  let y: number, mo: number, d: number;
  if (m) { d = +m[1]; mo = +m[2]; y = +m[3]; } else {
    m = /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/.exec(s);
    if (!m) return null;
    y = +m[1]; mo = +m[2]; d = +m[3];
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  const kiem = new Date(Date.UTC(y, mo - 1, d));
  if (kiem.getUTCMonth() !== mo - 1) return null;
  return `${y}-${hai(mo)}-${hai(d)}`;
}

/** Số tiền kiểu Việt Nam: "1.234.567", "1,234,567", "(1.000)", "-500 000 đ". */
export function docSo(v: O): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  let s = v.trim();
  if (!s) return null;
  const am = /^\(.*\)$/.test(s) || /^-/.test(s);
  s = s.replace(/[^\d.,]/g, '');
  if (!s || !/\d/.test(s)) return null;
  // Phần thập phân 1–2 chữ số ở cuối thì giữ; còn lại dấu chấm, phẩy là phân cách nghìn.
  const tp = /[.,](\d{1,2})$/.exec(s);
  const nguyen = (tp ? s.slice(0, tp.index) : s).replace(/[.,]/g, '');
  const n = Number(nguyen) + (tp ? Number(`0.${tp[1]}`) : 0);
  return Number.isFinite(n) ? (am ? -n : n) : null;
}

export interface DongSaoKe {
  transaction_date: string;
  /** Luôn dương; chiều tiền ở `type`. */
  amount: number;
  type: 'income' | 'expense';
  merchant_name: string | null;
  counter_account_name: string | null;
  counter_account_number: string | null;
  so_tham_chieu: string | null;
  so_du: number | null;
}

const chu = (v: O): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, 500) : null;
};

export function docDong(bang: O[][], bd: BanDoCot): { dong: DongSaoKe[]; loi: { dong: number; cau: string }[] } {
  const dong: DongSaoKe[] = [];
  const loi: { dong: number; cau: string }[] = [];
  const lay = (hang: O[], c: Cot) => (bd.cot[c] === undefined ? null : hang[bd.cot[c] as number]);

  for (let i = bd.dong_tieu_de + 1; i < bang.length; i++) {
    const hang = bang[i] ?? [];
    const ngay = docNgay(lay(hang, 'ngay'));
    let co = docSo(lay(hang, 'co')) ?? 0;
    let no = docSo(lay(hang, 'no')) ?? 0;
    const sd = docSo(lay(hang, 'so_tien'));
    if (bd.cot.co === undefined && bd.cot.no === undefined && sd !== null) {
      if (sd >= 0) co = sd; else no = -sd;
    }
    co = Math.abs(co);
    no = Math.abs(no);
    // Dòng tổng cộng, dòng trống, chân trang: không có ngày hoặc không có tiền → bỏ, không báo lỗi.
    if (!ngay && !co && !no) continue;
    if (!ngay) { loi.push({ dong: i + 1, cau: 'Không đọc được ngày' }); continue; }
    if (!co && !no) continue;
    if (co && no) { loi.push({ dong: i + 1, cau: 'Có cả tiền vào và tiền ra trên cùng một dòng' }); continue; }
    dong.push({
      transaction_date: ngay,
      amount: Math.round(co || no),
      type: co ? 'income' : 'expense',
      merchant_name: chu(lay(hang, 'noi_dung')),
      counter_account_name: chu(lay(hang, 'ten_doi_ung')),
      counter_account_number: chu(lay(hang, 'tk_doi_ung'))?.replace(/\s/g, '') ?? null,
      so_tham_chieu: chu(lay(hang, 'so_tham_chieu')),
      so_du: docSo(lay(hang, 'so_du')),
    });
  }
  return { dong, loi };
}

/** Đọc CSV: tự nhận dấu phân cách (, ; tab), hỗ trợ ô trong ngoặc kép. */
export function docCsv(text: string): string[][] {
  const bo = text.replace(/^﻿/, '');
  const dauDong = bo.split(/\r?\n/, 5).join('\n');
  const dem = (k: string) => (dauDong.match(new RegExp(k === '\t' ? '\t' : `\\${k}`, 'g')) ?? []).length;
  const phanCach = ['\t', ';', ','].sort((a, b) => dem(b) - dem(a))[0];
  const bang: string[][] = [];
  let hang: string[] = [];
  let o = '';
  let trongNgoac = false;
  for (let i = 0; i < bo.length; i++) {
    const c = bo[i];
    if (trongNgoac) {
      if (c === '"' && bo[i + 1] === '"') { o += '"'; i++; } else if (c === '"') trongNgoac = false; else o += c;
    } else if (c === '"') trongNgoac = true;
    else if (c === phanCach) { hang.push(o); o = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && bo[i + 1] === '\n') i++;
      hang.push(o); bang.push(hang); hang = []; o = '';
    } else o += c;
  }
  if (o || hang.length) { hang.push(o); bang.push(hang); }
  return bang;
}

/** Kiểm một dòng gửi lên máy chủ. Trả câu lỗi, hoặc null nếu dùng được. */
export function kiemDong(d: unknown, homNay: string): string | null {
  if (!d || typeof d !== 'object') return 'Dòng không hợp lệ';
  const o = d as Record<string, unknown>;
  if (typeof o.transaction_date !== 'string' || docNgay(o.transaction_date) !== o.transaction_date) return 'Ngày không hợp lệ';
  if (o.transaction_date > homNay) return 'Ngày ở tương lai';
  if (typeof o.amount !== 'number' || !Number.isFinite(o.amount) || o.amount <= 0 || o.amount > 1e13) return 'Số tiền không hợp lệ';
  if (o.type !== 'income' && o.type !== 'expense') return 'Chiều tiền không hợp lệ';
  for (const k of ['merchant_name', 'counter_account_name', 'counter_account_number', 'so_tham_chieu']) {
    if (o[k] !== null && o[k] !== undefined && (typeof o[k] !== 'string' || (o[k] as string).length > 500)) return `Cột ${k} không hợp lệ`;
  }
  if (o.so_du !== null && o.so_du !== undefined && (typeof o.so_du !== 'number' || !Number.isFinite(o.so_du))) return 'Số dư không hợp lệ';
  return null;
}

/**
 * Chuỗi chống trùng của một dòng. Nhập lại cùng một sao kê (hay hai sao kê chồng ngày) thì dòng đã
 * có không vào lần hai. Hai khoản giống hệt nhau trong cùng ngày (hai lần quét QR 50.000đ cùng nội
 * dung) vẫn là hai khoản: `lan` là thứ tự xuất hiện của dòng giống hệt trong tệp.
 */
export function chuoiChongTrung(taiKhoan: string, d: DongSaoKe, lan: number): string {
  return [taiKhoan, d.transaction_date, d.type, d.amount, d.so_tham_chieu ?? '', d.merchant_name ?? '', d.so_du ?? '', lan].join('|');
}

/** Đánh số lần xuất hiện cho các dòng giống hệt nhau trong một tệp. */
export function danhSoLan(ds: DongSaoKe[], taiKhoan: string): number[] {
  const dem = new Map<string, number>();
  return ds.map((d) => {
    const k = chuoiChongTrung(taiKhoan, d, 0);
    const n = (dem.get(k) ?? 0) + 1;
    dem.set(k, n);
    return n;
  });
}
