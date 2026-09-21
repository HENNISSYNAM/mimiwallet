/**
 * MIMI-P1-005 — ghép tiền về với hoá đơn bán bằng điểm, không bằng "cùng số tiền".
 *
 * Trước đây một khoản tiền về được coi là "có thể là tiền của hoá đơn" chỉ vì cùng số tiền và đến
 * sau ngày lập. Hai khách cùng mua gói 5 triệu là đủ để ghép nhầm. Giờ mỗi cặp có điểm và lý do:
 *
 *   số tiền khớp (lệch ≤ LECH)          +40   — điều kiện cần; không khớp thì không xét tiếp
 *   nội dung chuyển khoản có số hoá đơn  +40   — bằng chứng mạnh nhất: người trả tự ghi ra
 *   tên người chuyển khớp tên khách       +20
 *   tiền về trước ngày lập hoá đơn        loại
 *
 * Chỉ "khớp chắc" khi đạt NGUONG_CHAC (tức có số hoá đơn trong nội dung); còn lại là "cần xem" —
 * người dùng quyết. Một hoá đơn bị hai khoản tiền về cùng tranh ở cùng mức, hoặc một khoản tiền
 * về khớp hai hoá đơn cùng mức, thì không tự chọn: cả hai sang "cần xem".
 */

export const LECH = 1_000;
export const DIEM = { SO_TIEN: 40, SO_HOA_DON: 40, TEN: 20 } as const;
export const NGUONG_CHAC = 80;
export const NGUONG_XEM = 40;

export interface TienVe {
  id: string;
  so_tien: number;
  ngay: string;
  ten_nguoi_chuyen: string | null;
  noi_dung: string | null;
}

export interface HoaDonCho {
  id: string;
  so_hoa_don: string;
  ten_khach: string;
  tong: number;
  ngay_lap: string;
}

export interface Cap {
  tien: TienVe;
  hoa_don: HoaDonCho;
  diem: number;
  ly_do: string[];
}

const boDau = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** Chữ thường không dấu, chỉ còn chữ và số, tách bằng một khoảng trắng. */
const chuan = (s: string | null) => ` ${boDau(s ?? '').replace(/[^a-z0-9]+/g, ' ').trim()} `;

/** Bỏ các từ chung ("cong ty", "tnhh"…) để tên khách còn phần phân biệt được. */
const TU_CHUNG = new Set(['cong', 'ty', 'tnhh', 'co', 'phan', 'cp', 'jsc', 'ltd', 'mtv', 'dntn', 'ho', 'kinh', 'doanh', 'chi', 'nhanh', 'tm', 'dv', 'xnk']);
const tuRieng = (s: string | null) => chuan(s).trim().split(' ').filter((t) => t.length >= 2 && !TU_CHUNG.has(t));

/**
 * Nội dung có chứa số hoá đơn như một cụm riêng — "HD001" khớp "hd001", "HD-001", "hd 001";
 * KHÔNG khớp "HD0012" hay "1HD001". Số quá ngắn (dưới 3 chữ số, không có chữ) thì bỏ qua: trùng
 * ngẫu nhiên với ngày tháng, số lượng trong nội dung là chuyện thường.
 */
function coSoHoaDon(noiDung: string | null, soHoaDon: string): boolean {
  const so = boDau(soHoaDon).replace(/[^a-z0-9]/g, '');
  if (!/[a-z]/.test(so) && so.length < 3) return false;
  const cum = boDau(noiDung ?? '').split(/[^a-z0-9]+/).filter(Boolean);
  for (let i = 0; i < cum.length; i++) {
    if (cum[i] === so) return true;
    // Chữ và số bị tách: "hd" + "001", hoặc "hd" + "00" + "1" khi có dấu chấm giữa.
    let gop = cum[i];
    for (let k = i + 1; k < cum.length && gop.length < so.length; k++) {
      gop += cum[k];
      if (gop === so) return true;
    }
  }
  return false;
}

function tenKhop(nguoiChuyen: string | null, khach: string): boolean {
  const a = tuRieng(nguoiChuyen);
  const b = tuRieng(khach);
  if (!a.length || !b.length) return false;
  const chung = b.filter((t) => a.includes(t));
  // Tên khách ngắn (một từ riêng) thì một từ chung là đủ; dài hơn cần ít nhất hai.
  return chung.length >= Math.min(2, b.length);
}

export function chamDiem(t: TienVe, h: HoaDonCho): Cap | null {
  if (Math.abs(t.so_tien - h.tong) > LECH) return null;
  if (t.ngay.slice(0, 10) < h.ngay_lap.slice(0, 10)) return null;
  const ly_do = ['cùng số tiền'];
  let diem: number = DIEM.SO_TIEN;
  if (coSoHoaDon(t.noi_dung, h.so_hoa_don)) { diem += DIEM.SO_HOA_DON; ly_do.push(`nội dung có số hoá đơn ${h.so_hoa_don}`); }
  if (tenKhop(t.ten_nguoi_chuyen, h.ten_khach)) { diem += DIEM.TEN; ly_do.push('tên người chuyển khớp tên khách'); }
  return { tien: t, hoa_don: h, diem, ly_do };
}

export interface KetQuaGhep {
  chac: Cap[];
  can_xem: Cap[];
}

export function ghepTienVe(ds: readonly TienVe[], hoaDon: readonly HoaDonCho[]): KetQuaGhep {
  // Ứng viên tốt nhất của mỗi khoản tiền về.
  const tot: Cap[] = [];
  const nhieu = new Set<string>();
  for (const t of ds) {
    const caps = hoaDon.map((h) => chamDiem(t, h)).filter((c): c is Cap => !!c && c.diem >= NGUONG_XEM);
    if (!caps.length) continue;
    const max = Math.max(...caps.map((c) => c.diem));
    const dau = caps.filter((c) => c.diem === max);
    if (dau.length > 1) nhieu.add(t.id); // khớp hai hoá đơn cùng mức: không chọn hộ
    tot.push(dau[0]);
  }
  // Một hoá đơn bị nhiều khoản tiền về cùng mức tranh thì cũng không chọn hộ.
  const tranh = new Map<string, number>();
  for (const c of tot) {
    const k = `${c.hoa_don.id} ${c.diem}`;
    tranh.set(k, (tranh.get(k) ?? 0) + 1);
  }
  const chac: Cap[] = [];
  const can_xem: Cap[] = [];
  for (const c of tot) {
    const moHo = nhieu.has(c.tien.id) || (tranh.get(`${c.hoa_don.id} ${c.diem}`) ?? 0) > 1;
    if (c.diem >= NGUONG_CHAC && !moHo) chac.push(c);
    else can_xem.push({ ...c, ly_do: moHo ? [...c.ly_do, 'khớp nhiều hơn một cặp — cần bạn chọn'] : c.ly_do });
  }
  return { chac, can_xem };
}
