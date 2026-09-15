/**
 * Đọc file CSV chi phí AI mà người dùng xuất từ trang chi phí của nhà cung cấp.
 *
 * KHÔNG ĐOÁN CHẮC KHUÔN FILE. Mỗi nhà cung cấp — và mỗi lần họ đổi giao diện — đặt
 * tên cột khác nhau, nên đây chỉ ĐỀ XUẤT cột theo tên thường gặp; người dùng xác nhận
 * từng cột trên màn hình trước khi nhập. Dòng không đọc được bị liệt kê, không lặng
 * lẽ bỏ. Chỉ nhận USD; dòng mang tiền tệ khác bị bỏ và nói rõ lý do.
 */

export function tachCsv(vanBan: string): string[][] {
  const s = vanBan.replace(/^﻿/, '');
  const dongDau = s.split(/\r?\n/, 1)[0] ?? '';
  const dem = (kyTu: string) => dongDau.split(kyTu).length - 1;
  const phanCach = dem(';') > dem(',') ? ';' : dem('\t') > dem(',') ? '\t' : ',';

  const bang: string[][] = [];
  let dong: string[] = [];
  let o = '';
  let trongNgoac = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (trongNgoac) {
      if (c === '"') {
        if (s[i + 1] === '"') { o += '"'; i++; } else trongNgoac = false;
      } else o += c;
    } else if (c === '"') {
      trongNgoac = true;
    } else if (c === phanCach) {
      dong.push(o);
      o = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      dong.push(o);
      bang.push(dong);
      dong = [];
      o = '';
    } else {
      o += c;
    }
  }
  if (o !== '' || dong.length) {
    dong.push(o);
    bang.push(dong);
  }
  return bang.filter((d) => d.some((x) => x.trim() !== ''));
}

const chuanHoa = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export interface AnhXaCot {
  ngay: number | null;
  soTien: number | null;
  hangMuc: number | null;
  duAn: number | null;
  tienTe: number | null;
}

/** Tên cột thường gặp, xếp theo ưu tiên (đã bỏ dấu, ký hiệu). */
const UU_TIEN: Record<keyof AnhXaCot, string[]> = {
  ngay: ['usage date', 'date', 'ngay', 'day', 'usage start date', 'start date', 'start time', 'starting at', 'period start', 'billing date', 'timestamp', 'thoi gian'],
  soTien: ['cost usd', 'cost', 'amount usd', 'amount', 'total cost', 'spend', 'chi phi', 'so tien', 'total'],
  hangMuc: ['model', 'mo hinh', 'line item', 'sku description', 'sku', 'service description', 'service', 'product', 'description', 'hang muc'],
  duAn: ['project name', 'project', 'workspace name', 'workspace', 'du an', 'project id', 'workspace id', 'api key name', 'api key'],
  tienTe: ['currency', 'tien te'],
};

export function doanAnhXa(tieuDe: string[]): AnhXaCot {
  const ten = tieuDe.map(chuanHoa);
  const tim = (k: keyof AnhXaCot) => {
    for (const t of UU_TIEN[k]) {
      const i = ten.indexOf(t);
      if (i >= 0) return i;
    }
    return null;
  };
  return { ngay: tim('ngay'), soTien: tim('soTien'), hangMuc: tim('hangMuc'), duAn: tim('duAn'), tienTe: tim('tienTe') };
}

export type DinhDangNgay = 'iso' | 'thang_truoc' | 'ngay_truoc';

export function docNgay(giaTri: string, dinhDang: DinhDangNgay): string | null {
  const t = giaTri.trim();
  let y: string;
  let m: string;
  let d: string;
  if (dinhDang === 'iso') {
    const k = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/);
    if (!k) return null;
    [y, m, d] = [k[1], k[2], k[3]];
  } else {
    const k = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[T\s].*)?$/);
    if (!k) return null;
    [m, d] = dinhDang === 'thang_truoc' ? [k[1], k[2]] : [k[2], k[1]];
    y = k[3];
  }
  const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const dt = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === iso ? iso : null;
}

/**
 * Đoán định dạng ngày từ các giá trị mẫu. `chacChan: false` khi mọi mẫu đều mơ hồ
 * (vd "03/04/2026" đọc được cả hai cách) — màn hình phải hỏi người dùng.
 */
export function doanDinhDangNgay(mau: string[]): { dinhDang: DinhDangNgay; chacChan: boolean } {
  const ds = mau.map((x) => x.trim()).filter(Boolean);
  if (ds.some((x) => /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(x))) return { dinhDang: 'iso', chacChan: true };
  for (const x of ds) {
    const k = x.match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{4}/);
    if (!k) continue;
    if (Number(k[1]) > 12) return { dinhDang: 'ngay_truoc', chacChan: true };
    if (Number(k[2]) > 12) return { dinhDang: 'thang_truoc', chacChan: true };
  }
  return { dinhDang: 'thang_truoc', chacChan: false };
}

/** "$1,234.56", "1.234,56", "(12.30)", "-0.5 USD" → số. Không đọc được thì `null`. */
export function docSoTien(giaTri: string): number | null {
  let t = giaTri.trim();
  if (!t) return null;
  let am = false;
  if (/^\(.*\)$/.test(t)) {
    am = true;
    t = t.slice(1, -1);
  }
  t = t.replace(/us\$|usd|\$|\s/gi, '');
  if (t.startsWith('-')) {
    am = !am;
    t = t.slice(1);
  }
  if (!/^[\d.,]+$/.test(t) || !/\d/.test(t)) return null;
  const cham = t.lastIndexOf('.');
  const phay = t.lastIndexOf(',');
  if (cham >= 0 && phay >= 0) {
    t = cham > phay ? t.replace(/,/g, '') : t.replace(/\./g, '').replace(',', '.');
  } else if (phay >= 0) {
    const sauPhay = t.length - phay - 1;
    t = t.split(',').length === 2 && sauPhay !== 3 ? t.replace(',', '.') : t.replace(/,/g, '');
  } else if (t.split('.').length > 2) {
    t = t.replace(/\./g, '');
  }
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return am ? -n : n;
}

export interface DongNhap {
  ngay: string;
  hang_muc: string;
  du_an: string;
  so_tien_usd: number;
}

export function chuyenBang(
  bang: string[][],
  ax: AnhXaCot,
  dinhDang: DinhDangNgay,
): { dong: DongNhap[]; boQua: Array<{ dongSo: number; lyDo: string }> } {
  if (ax.ngay === null || ax.soTien === null) {
    return { dong: [], boQua: [{ dongSo: 1, lyDo: 'Chưa chọn cột ngày và cột số tiền.' }] };
  }
  const dong: DongNhap[] = [];
  const boQua: Array<{ dongSo: number; lyDo: string }> = [];
  for (let i = 1; i < bang.length; i++) {
    const r = bang[i];
    const dongSo = i + 1;
    const giaNgay = r[ax.ngay] ?? '';
    const ngay = docNgay(giaNgay, dinhDang);
    if (!ngay) {
      boQua.push({ dongSo, lyDo: `ngày "${giaNgay.trim().slice(0, 30)}" không đọc được` });
      continue;
    }
    if (ax.tienTe !== null) {
      const tienTe = (r[ax.tienTe] ?? '').trim().toUpperCase();
      if (tienTe && tienTe !== 'USD') {
        boQua.push({ dongSo, lyDo: `tiền tệ ${tienTe.slice(0, 10)} — chỉ nhận USD` });
        continue;
      }
    }
    const so = docSoTien(r[ax.soTien] ?? '');
    if (so === null) {
      boQua.push({ dongSo, lyDo: `số tiền "${(r[ax.soTien] ?? '').trim().slice(0, 30)}" không đọc được` });
      continue;
    }
    dong.push({
      ngay,
      so_tien_usd: so,
      hang_muc: ax.hangMuc !== null ? (r[ax.hangMuc] ?? '').trim().slice(0, 200) : '',
      du_an: ax.duAn !== null ? (r[ax.duAn] ?? '').trim().slice(0, 200) : '',
    });
  }
  return { dong, boQua };
}

export function tomTatNhap(dong: DongNhap[]): { soDong: number; tuNgay: string | null; denNgay: string | null; tong: number } {
  if (!dong.length) return { soDong: 0, tuNgay: null, denNgay: null, tong: 0 };
  let tu = dong[0].ngay;
  let den = dong[0].ngay;
  let tong = 0;
  for (const d of dong) {
    if (d.ngay < tu) tu = d.ngay;
    if (d.ngay > den) den = d.ngay;
    tong += d.so_tien_usd;
  }
  return { soDong: dong.length, tuNgay: tu, denNgay: den, tong };
}
