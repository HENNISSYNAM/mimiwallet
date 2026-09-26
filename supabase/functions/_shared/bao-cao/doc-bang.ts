/**
 * Đọc bảng chỉ tiêu từ một sheet (Excel/CSV) — báo cáo tài chính hoặc tờ khai thuế người dùng tải lên.
 * Hàm thuần: vào là mảng hàng ô (như `read-excel-file` trả), ra là các dòng chỉ tiêu có tên, mã, giá trị.
 *
 * Phần mềm kế toán xuất mỗi nơi một kiểu (MISA, Fast, HTKK…): cột "Chỉ tiêu / Mã số / Thuyết minh / Số
 * cuối năm / Số đầu năm", hoặc "STT / Chỉ tiêu / Mã chỉ tiêu / Giá trị HHDV / Thuế GTGT". Nên đọc theo
 * dòng tiêu đề nếu tìm thấy, không thì theo hình dạng ô (chữ, mã, số). Không đoán số: ô không đọc được
 * thành số thì để trống, không coi là 0.
 */

export type O = string | number | boolean | Date | null | undefined;

export interface DongChiTieu {
  /** Số thứ tự hàng trong sheet (1 = hàng đầu), để người dùng dò lại tệp. */
  hang: number;
  nhan: string;
  /** Mã số / mã chỉ tiêu đọc nguyên từ tệp (vd. "110", "[21]" → "21"). Không suy ra. */
  ma: string | null;
  /** Các giá trị số của dòng, theo thứ tự cột giá trị (vd. [cuối năm, đầu năm] hoặc [giá trị, thuế]). */
  gia_tri: (number | null)[];
}

export interface BangDaDoc {
  dong: DongChiTieu[];
  /** Tên các cột giá trị theo tiêu đề (nếu có). */
  cot_gia_tri: string[];
  /** Hệ số đơn vị: "đơn vị tính: nghìn đồng" → 1000. Giá trị trong `dong` CHƯA nhân hệ số. */
  don_vi: { nhan: string; he_so: number } | null;
  /** Chữ ở phần đầu sheet (tên báo cáo, mẫu số, thông tư, kỳ) — để nhận dạng. */
  dau_trang: string;
}

export const boDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const chu = (o: O) => (o === null || o === undefined ? '' : o instanceof Date ? o.toISOString().slice(0, 10) : String(o)).trim();

/** "1.234.567" / "1,234,567" / "(12.345)" / "-12345" / "- " → số; không phải số → null. */
export function docSo(o: O): number | null {
  if (typeof o === 'number') return Number.isFinite(o) ? o : null;
  const s = chu(o).replace(/\s|đ|vnd/gi, '');
  if (!s || s === '-' || s === '–') return null;
  const am = /^\(.*\)$/.test(s) || s.startsWith('-');
  const tho = s.replace(/[()]/g, '').replace(/^-/, '');
  if (!/^[\d.,]+$/.test(tho)) return null;
  // Có cả chấm và phẩy: dấu xuất hiện sau cùng là phần thập phân. Chỉ một loại dấu, lặp nhiều lần hoặc
  // đúng 3 chữ số sau → phân tách nghìn (kiểu Việt Nam "1.234.567").
  let so: number;
  const cham = tho.lastIndexOf('.');
  const phay = tho.lastIndexOf(',');
  if (cham >= 0 && phay >= 0) {
    so = cham > phay ? Number(tho.replace(/,/g, '')) : Number(tho.replace(/\./g, '').replace(',', '.'));
  } else {
    const dau = cham >= 0 ? '.' : phay >= 0 ? ',' : '';
    const phan = dau ? tho.split(dau) : [tho];
    const laNghin = phan.length > 2 || (phan.length === 2 && phan[1].length === 3);
    so = !dau ? Number(tho) : laNghin ? Number(phan.join('')) : Number(phan.join('.'));
  }
  if (!Number.isFinite(so)) return null;
  return am ? -so : so;
}

/** Mã chỉ tiêu: "110", "01", "21", "[21]", "(21)", "130a", "V.01" (thuyết minh — bỏ). */
function docMa(o: O): string | null {
  const s = chu(o).replace(/\s/g, '');
  const m = /^[[(]?(\d{1,3}[a-z]?)[\])]?$/i.exec(s);
  return m ? m[1] : null;
}

const coChu = (s: string) => /[a-zà-ỹđ]{2,}/i.test(s);

const DON_VI: [RegExp, string, number][] = [
  [/\bty dong\b/, 'tỷ đồng', 1_000_000_000],
  [/\btrieu dong\b/, 'triệu đồng', 1_000_000],
  [/\b(nghin|ngan) dong\b/, 'nghìn đồng', 1000],
  [/\bdong( viet nam)?\b|\bvnd\b/, 'đồng', 1],
];

/** Đọc một sheet. `toiDaHang` chặn tệp quá lớn làm treo trình duyệt. */
export function docBang(bang: O[][], toiDaHang = 5000): BangDaDoc {
  const hangs = bang.slice(0, toiDaHang);
  const dau: string[] = [];
  let don_vi: BangDaDoc['don_vi'] = null;

  // Dòng tiêu đề: có "chỉ tiêu" (hoặc "tài sản"/"nguồn vốn") VÀ có "mã".
  let hangTieuDe = -1;
  for (let i = 0; i < Math.min(hangs.length, 40); i++) {
    const cac = hangs[i].map((o) => boDau(chu(o)));
    const cauHang = cac.join(' | ');
    if (!don_vi && /don vi( tinh)?/.test(cauHang)) {
      const d = DON_VI.find(([re]) => re.test(cauHang));
      if (d) don_vi = { nhan: d[1], he_so: d[2] };
    }
    if (cac.some((c) => /^(chi tieu|tai san|nguon von|noi dung|khoan muc)\b/.test(c)) && cac.some((c) => /\bma( so| chi tieu)?\b/.test(c))) {
      hangTieuDe = i;
      break;
    }
    if (cauHang.replace(/[|\s]/g, '')) dau.push(hangs[i].map(chu).filter(Boolean).join(' '));
  }

  let cotNhan = -1;
  let cotMa = -1;
  const cotGiaTri: number[] = [];
  const tenCot: string[] = [];
  if (hangTieuDe >= 0) {
    const td = hangs[hangTieuDe].map((o) => boDau(chu(o)));
    cotNhan = td.findIndex((c) => /^(chi tieu|tai san|nguon von|noi dung|khoan muc)\b/.test(c));
    cotMa = td.findIndex((c) => /\bma( so| chi tieu)?\b/.test(c));
    td.forEach((c, j) => {
      if (j === cotNhan || j === cotMa || !c) return;
      if (/^(stt|thuyet minh|tm|ghi chu)$/.test(c) || /thuyet minh/.test(c)) return;
      cotGiaTri.push(j);
      tenCot.push(chu(hangs[hangTieuDe][j]));
    });
  }

  const dong: DongChiTieu[] = [];
  const batDau = hangTieuDe >= 0 ? hangTieuDe + 1 : 0;
  for (let i = batDau; i < hangs.length; i++) {
    const h = hangs[i];
    let nhan = '';
    let ma: string | null = null;
    let gia_tri: (number | null)[] = [];
    if (hangTieuDe >= 0) {
      nhan = chu(h[cotNhan]);
      ma = cotMa >= 0 ? docMa(h[cotMa]) : null;
      gia_tri = cotGiaTri.map((j) => docSo(h[j]));
      // Tờ khai: mã hay nằm ngay trong ô nhãn — "Thuế GTGT phải nộp [40]".
      if (!ma) { const m = /\[(\d{1,3}[a-z]?)\]/i.exec(nhan); if (m) ma = m[1]; }
    } else {
      // Không có tiêu đề: ô chữ dài nhất là nhãn, ô dạng mã là mã, các ô số là giá trị.
      const cacChu = h.map(chu);
      const iNhan = cacChu.reduce((best, s, j) => (coChu(s) && s.length > (cacChu[best]?.length ?? 0) ? j : best), -1);
      if (iNhan < 0) continue;
      nhan = cacChu[iNhan];
      h.forEach((o, j) => {
        if (j === iNhan) return;
        const m = docMa(o);
        if (m && !ma && typeof o !== 'number') { ma = m; return; }
        const so = docSo(o);
        if (so !== null) gia_tri.push(so);
      });
      const mTrong = /\[(\d{1,3}[a-z]?)\]/i.exec(nhan);
      if (!ma && mTrong) ma = mTrong[1];
    }
    if (!coChu(nhan)) continue;
    dong.push({ hang: i + 1, nhan: nhan.replace(/\s+/g, ' ').trim(), ma, gia_tri });
  }
  return { dong, cot_gia_tri: tenCot, don_vi, dau_trang: dau.join('\n').slice(0, 3000) };
}
