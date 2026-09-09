/**
 * Chuỗi nến giá cho biểu đồ, đọc từ endpoint công khai của sàn.
 *
 * MỘT SÀN CHO MỘT CHUỖI, KHÔNG TRỘN. Khác hẳn `doiChieuGia`, nơi hỏi nhiều sàn
 * rồi lấy trung vị là đúng. Với chuỗi thời gian thì trộn là sai, và lý do đã đo
 * được ngày 09/09/2026: cửa sổ 24 giờ của Binance và Coinbase bắt đầu ở hai
 * thời điểm khác nhau (xem `gia-san.ts`, `doi24hLech`). Ghép nến của hai sàn
 * lên cùng một trục thời gian là vẽ ra một chuỗi không tồn tại ở đâu cả.
 *
 * Nên: lấy một sàn, và **nói rõ là sàn nào** trên biểu đồ. Sàn ưu tiên hỏng thì
 * rơi sang sàn dự phòng, và nhãn đổi theo.
 *
 * THỨ TỰ TRƯỜNG CỦA HAI SÀN KHÁC NHAU, VÀ ĐÂY LÀ CÁI BẪY.
 *
 *   Binance   [thờiGian_ms, open,  high, low,  close, volume, …]
 *   Coinbase  [thờiGian_s,  low,   high, open, close, volume]
 *
 * Chỉ số 1 và 3 hoán vị. Đọc nhầm thì được một biểu đồ trông vẫn hợp lý — vẫn
 * lên xuống, vẫn trong khoảng giá đúng — nhưng thân nến sai. Không có gì báo
 * lỗi, và mắt thường không phát hiện được. Có test dùng đúng hai dòng dữ liệu
 * thật của cùng một ngày để khoá điều này.
 *
 * Coinbase còn trả về theo thứ tự GIẢM DẦN. `chuanHoaChuoi` sắp lại, nên người
 * gọi không phải nhớ.
 */

export interface NenGia {
  /** Mốc mở nến, mili-giây. */
  t: number;
  mo: number;
  cao: number;
  thap: number;
  dong: number;
  /** Khối lượng khớp trong phiên. Vẽ thành cột dưới biểu đồ nến. */
  kl: number;
}

/** Khung thời gian một nến. Binance hỗ trợ cả bốn; Coinbase không có tuần. */
export type Khung = '1h' | '4h' | '1d' | '1w';

/** Độ dài một nến theo mili-giây, để đếm mốc thiếu cho đúng khung. */
export const BUOC_MS: Record<Khung, number> = {
  '1h': 3_600_000,
  '4h': 14_400_000,
  '1d': 86_400_000,
  '1w': 604_800_000,
};

export interface ChuoiGia {
  ma: string;
  /** Sàn đã cung cấp chuỗi này. Luôn hiện trên biểu đồ. */
  san: string;
  nen: NenGia[];
  thapNhat: number | null;
  caoNhat: number | null;
  /** Thay đổi từ nến đầu tới nến cuối, phần trăm. */
  doiPhanTram: number | null;
  /**
   * Số mốc bị thiếu trong khoảng. Sàn ngừng khớp lệnh, hoặc API bỏ sót.
   *
   * Đáng đếm vì biểu đồ đường nối thẳng qua chỗ trống mà không để lại dấu
   * vết — người xem thấy một đường liền và tưởng dữ liệu liền.
   */
  soMocThieu: number;
  /** Khung thời gian của chuỗi, để giao diện gắn nhãn đúng. */
  khung: Khung;
  ghiChu: string;
}

function soDuong(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Binance `/api/v3/klines`: mảng các mảng, thời gian mili-giây, giá là chuỗi.
 * Thứ tự: `[t, open, high, low, close, …]`.
 */
export function docChuoiBinance(raw: unknown): NenGia[] {
  if (!Array.isArray(raw)) return [];
  const ra: NenGia[] = [];
  for (const d of raw) {
    if (!Array.isArray(d) || d.length < 5) continue;
    const t = typeof d[0] === 'number' ? d[0] : Number(d[0]);
    const mo = soDuong(d[1]);
    const cao = soDuong(d[2]);
    const thap = soDuong(d[3]);
    const dong = soDuong(d[4]);
    if (!Number.isFinite(t) || mo === null || cao === null || thap === null || dong === null) continue;
    // Khối lượng có thể bằng 0 ở phiên không ai khớp — hợp lệ, khác giá bằng 0.
    const kl = Number(d[5]);
    ra.push({ t, mo, cao, thap, dong, kl: Number.isFinite(kl) && kl >= 0 ? kl : 0 });
  }
  return ra;
}

/**
 * Coinbase `/products/{id}/candles`: thời gian tính bằng GIÂY, và thứ tự là
 * `[t, low, high, open, close, …]` — chỉ số 1 và 3 hoán vị so với Binance.
 */
export function docChuoiCoinbase(raw: unknown): NenGia[] {
  if (!Array.isArray(raw)) return [];
  const ra: NenGia[] = [];
  for (const d of raw) {
    if (!Array.isArray(d) || d.length < 5) continue;
    const giay = typeof d[0] === 'number' ? d[0] : Number(d[0]);
    const thap = soDuong(d[1]);
    const cao = soDuong(d[2]);
    const mo = soDuong(d[3]);
    const dong = soDuong(d[4]);
    if (!Number.isFinite(giay) || mo === null || cao === null || thap === null || dong === null) continue;
    const kl = Number(d[5]);
    ra.push({ t: giay * 1000, mo, cao, thap, dong, kl: Number.isFinite(kl) && kl >= 0 ? kl : 0 });
  }
  return ra;
}

/**
 * Sắp xếp, loại nến hỏng, đếm mốc thiếu, và tính khoảng.
 *
 * LOẠI NẾN CÓ `cao < thap`. Đó là dấu hiệu đọc sai thứ tự trường chứ không phải
 * một trạng thái thị trường — giá cao nhất không thể thấp hơn giá thấp nhất.
 * Giữ lại thì biểu đồ vẫn vẽ ra được, và cái sai đi thẳng lên màn hình.
 */
export function chuanHoaChuoi(
  ma: string,
  san: string,
  nen: NenGia[],
  khung: Khung = '1d',
): ChuoiGia {
  const sach = nen
    .filter((n) => n.cao >= n.thap && n.dong >= n.thap && n.dong <= n.cao)
    .sort((a, b) => a.t - b.t);

  // Bỏ mốc trùng — Coinbase thỉnh thoảng trả nến lặp ở biên trang.
  const dedup: NenGia[] = [];
  for (const n of sach) if (!dedup.length || dedup[dedup.length - 1].t !== n.t) dedup.push(n);

  if (!dedup.length) {
    return {
      ma,
      san,
      nen: [],
      thapNhat: null,
      caoNhat: null,
      doiPhanTram: null,
      soMocThieu: 0,
      khung,
      ghiChu: `Không đọc được chuỗi giá ${ma} từ ${san}.`,
    };
  }

  /*
   * Đếm mốc thiếu THEO ĐÚNG KHUNG đang xem.
   *
   * Bản đầu chia cứng cho một ngày, nên ở khung 1 giờ mọi nến liền nhau đều
   * ra bước 0 và không mốc thiếu nào bị phát hiện — một phép kiểm tự tắt khi
   * đổi khung.
   */
  const buocMs = BUOC_MS[khung];
  let soMocThieu = 0;
  for (let i = 1; i < dedup.length; i++) {
    const buoc = Math.round((dedup[i].t - dedup[i - 1].t) / buocMs);
    if (buoc > 1) soMocThieu += buoc - 1;
  }

  const thapNhat = Math.min(...dedup.map((n) => n.thap));
  const caoNhat = Math.max(...dedup.map((n) => n.cao));
  const dau = dedup[0].mo;
  const cuoi = dedup[dedup.length - 1].dong;
  const doiPhanTram = dau > 0 ? ((cuoi - dau) / dau) * 100 : null;

  const ghiChu =
    soMocThieu > 0
      ? `${dedup.length} phiên từ ${san}, thiếu ${soMocThieu} mốc trong khoảng.`
      : `${dedup.length} phiên từ ${san}.`;

  return { ma, san, nen: dedup, thapNhat, caoNhat, doiPhanTram, soMocThieu, khung, ghiChu };
}
