import { chieuTien } from './chieuTien';
import { soSanhTien, tuBigInt, type TienVND } from './tien';

/**
 * Gộp giao dịch và hoá đơn thành số liệu cho trang Báo cáo.
 *
 * VÌ SAO PHẢI VIẾT. Tới 10/09/2026 trang Báo cáo vẫn vẽ ba biểu đồ từ
 * `src/lib/mockData.ts` — doanh thu 12 tỷ, lợi nhuận âm 2,7 tỷ, tuổi hoá đơn,
 * phân bổ chi phí — tất cả đều là số bịa, hiện cho mọi người dùng như số của
 * chính họ. Nút **Export** còn xuất đúng những số đó ra CSV, nên chúng có thể
 * đi ra khỏi ứng dụng và vào một tờ khai.
 *
 * Cùng lỗi với trang Cài đặt đã sửa hôm qua, nhưng nặng hơn: Cài đặt hiện sai
 * tên công ty, còn Báo cáo hiện sai tiền.
 *
 * HÀM THUẦN VÀ CÓ TEST, vì đây là số người dùng sẽ mang đi quyết định.
 *
 * HAI QUY TẮC:
 *
 *  1. Không có dữ liệu thì trả mảng rỗng, KHÔNG trả số 0 cho mọi tháng. Một
 *     biểu đồ toàn số 0 trông như "làm ăn không ra gì", còn mảng rỗng để giao
 *     diện nói được "chưa có dữ liệu".
 *  2. Chỉ đếm giao dịch thật. Người gọi lọc `is_synthetic` trước khi truyền
 *     vào — và có test cho việc một dòng thử lọt vào sẽ làm sai con số.
 *
 * CỘNG BẰNG BIGINT (29/09/2026). Cộng bằng `number` thì tổng vượt Number.MAX_SAFE_INTEGER (~9 triệu
 * tỷ đồng) lệch vài đồng mà không báo, trong khi `tro-ly` trả đúng — hai màn hình cùng dữ liệu ra hai
 * số. Tổng trả về theo hợp đồng `TienVND`: còn an toàn thì là số, vượt thì là chuỗi số nguyên.
 *
 * "TIỀN VÀO" KHÔNG PHẢI DOANH THU. Khoản giải ngân vay 100 tỷ là 100 tỷ tiền vào tài khoản — đúng,
 * và phải hiện như vậy — nhưng không phải doanh thu, và chênh lệch không phải lợi nhuận. Module này
 * chỉ tả dòng tiền; doanh thu tính thuế đi qua phân loại tiền vào + xác nhận của người dùng (Tờ khai).
 */

export interface GiaoDich {
  amount: number | string;
  type: string;
  transaction_date: string;
  category: string | null;
}

export interface HoaDon {
  total: number | string | null;
  amount: number | string | null;
  status: string;
  due_date: string | null;
}

export interface ThangTaiChinh {
  /** Nhãn hiển thị, ví dụ "T09". */
  thang: string;
  /** Khoá sắp xếp, dạng YYYY-MM. */
  khoa: string;
  /** Tiền vào tài khoản ngân hàng — KHÔNG phải doanh thu (P0-004, xem TU_DIEN_CHI_SO). */
  tienVao: TienVND;
  /** Tiền ra khỏi tài khoản ngân hàng — không phải chi phí kế toán. */
  tienRa: TienVND;
  /** Tiền vào trừ tiền ra — không phải lợi nhuận. */
  chenhLech: TienVND;
}

export interface NhomTuoi {
  nhan: string;
  tien: TienVND;
  soHoaDon: number;
}

export interface NhomChiPhi {
  ten: string;
  tien: TienVND;
}

/**
 * Độ lớn của một khoản, tính tới đồng, dạng BigInt. Không đọc được thì `null` (bỏ dòng, không cộng 0).
 * Chuỗi số nguyên đi thẳng vào BigInt — không qua Number, để khoản rất lớn không mất đồng lẻ.
 */
function doLon(v: unknown): bigint | null {
  if (typeof v === 'string' && /^-?\d+$/.test(v.trim())) {
    const b = BigInt(v.trim());
    return b < 0n ? -b : b;
  }
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return BigInt(Math.round(Math.abs(n)));
}

/** Ngưỡng chia nhóm tuổi hoá đơn, tính theo ngày quá hạn. */
export const MOC_TUOI = [30, 60, 90] as const;

/**
 * Dòng tiền ngân hàng theo tháng: tiền vào, tiền ra, chênh lệch.
 *
 * Chỉ trả về những tháng CÓ giao dịch. Đắp thêm tháng rỗng cho biểu đồ đẹp là
 * vẽ ra những tháng không có tiền vào chưa từng xảy ra.
 */
export function theoThang(gd: GiaoDich[]): ThangTaiChinh[] {
  const gom = new Map<string, { thu: bigint; chi: bigint }>();

  for (const t of gd) {
    const khoa = String(t.transaction_date).slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(khoa)) continue;
    const tien = doLon(t.amount);
    // Chiều tiền dùng chung với mọi màn: `type` quyết định, dấu chỉ khi thiếu `type`.
    // Bản cũ coi `amount > 0` là tiền vào, nên khoản chi ngân hàng (số dương) bị tính thành tiền vào.
    const chieu = chieuTien(t);
    if (tien === null || chieu === null) continue;
    const o = gom.get(khoa) ?? { thu: 0n, chi: 0n };
    if (chieu === 'vao') o.thu += tien;
    else o.chi += tien;
    gom.set(khoa, o);
  }

  return [...gom.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([khoa, o]) => ({
      khoa,
      thang: `T${khoa.slice(5)}`,
      tienVao: tuBigInt(o.thu),
      tienRa: tuBigInt(o.chi),
      chenhLech: tuBigInt(o.thu - o.chi),
    }));
}

/**
 * Tuổi hoá đơn chưa thu, tính từ hạn thanh toán.
 *
 * CHỈ TÍNH HOÁ ĐƠN CHƯA THU. Hoá đơn đã thu không còn là khoản phải đòi, nên
 * gộp vào sẽ thổi phồng số tiền đang bị nợ.
 *
 * "CHƯA ĐẾN HẠN" LÀ NHÓM RIÊNG (29/09/2026). Bản trước dồn hoá đơn chưa tới hạn vào nhóm "0–30
 * ngày" — cùng cột với khoản đã quá hạn 29 ngày — nên người dùng thấy tiền "đang bị nợ quá hạn"
 * nhiều hơn thật. Hạn là hôm nay thì chưa quá hạn.
 *
 * Hạn đọc theo NGÀY LỊCH (YYYY-MM-DD), không qua `new Date(chuỗi)` — chuỗi ngày đó được hiểu là nửa đêm
 * UTC, lệch sang ngày trước ở múi giờ âm. Hoá đơn không có hạn (hoặc hạn hỏng) thì không xếp nhóm được
 * — bỏ ra, chứ không dồn vào nhóm gần nhất.
 */
export function tuoiHoaDon(hd: HoaDon[], luc: Date = new Date()): NhomTuoi[] {
  const nhan = ['Chưa đến hạn', 'Quá hạn 1–30 ngày', 'Quá hạn 31–60 ngày', 'Quá hạn 61–90 ngày', 'Quá hạn trên 90 ngày'];
  const tong = nhan.map(() => 0n);
  const dem = nhan.map(() => 0);

  const homNay = Date.UTC(luc.getFullYear(), luc.getMonth(), luc.getDate());
  let coDuLieu = false;

  for (const h of hd) {
    if (h.status === 'paid' || !h.due_date) continue;
    const goc = h.total ?? h.amount;
    if (goc === null || goc === undefined || Number(goc) <= 0) continue;
    const tien = doLon(goc);
    if (tien === null) continue;

    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(h.due_date);
    if (!m) continue;
    const han = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const quaHan = Math.round((homNay - han) / 86_400_000);

    const i = quaHan <= 0 ? 0 : quaHan <= MOC_TUOI[0] ? 1 : quaHan <= MOC_TUOI[1] ? 2 : quaHan <= MOC_TUOI[2] ? 3 : 4;
    tong[i] += tien;
    dem[i] += 1;
    coDuLieu = true;
  }

  return coDuLieu ? nhan.map((n, i) => ({ nhan: n, tien: tuBigInt(tong[i]), soHoaDon: dem[i] })) : [];
}

/**
 * Phân bổ chi phí theo nhóm.
 *
 * Giao dịch chưa phân loại gom vào "Chưa phân loại" thay vì bỏ đi — bỏ đi thì
 * tổng của biểu đồ nhỏ hơn tổng chi phí thật, và không ai biết vì sao.
 */
export function phanBoChiPhi(gd: GiaoDich[]): NhomChiPhi[] {
  const gom = new Map<string, bigint>();

  for (const t of gd) {
    if (chieuTien(t) !== 'ra') continue;
    const tien = doLon(t.amount);
    if (tien === null || tien <= 0n) continue;
    const ten = t.category?.trim() || 'Chưa phân loại';
    gom.set(ten, (gom.get(ten) ?? 0n) + tien);
  }

  return [...gom.entries()]
    .map(([ten, tien]) => ({ ten, tien: tuBigInt(tien) }))
    .sort((a, b) => soSanhTien(b.tien, a.tien));
}
