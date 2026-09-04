/**
 * Một lần đồng bộ vừa xong — nói cho đúng chuyện gì đã xảy ra.
 *
 * SỰ VIỆC 04/09/2026. Tiền ₫5.000 đã vào tài khoản MB thật, mã QR đã phát,
 * nhưng bấm Đồng bộ chỉ nhận được *"Đã đồng bộ, không có giao dịch mới"*. Câu
 * đó đúng về mặt chữ và vô dụng về mặt chẩn đoán, vì nó gộp **ba tình huống
 * hoàn toàn khác nhau** làm một:
 *
 *   1. Cas không trả về giao dịch nào — có thể sandbox chưa thấy tiền, có thể
 *      khoảng ngày hỏi sai.
 *   2. Cas trả về nhưng **tất cả bị lọc bỏ** — thường vì giao dịch thuộc tài
 *      khoản khác với tài khoản của liên kết này. Đây là dấu hiệu mạnh rằng
 *      sandbox đang trả dữ liệu mô phỏng chứ không phải sao kê thật.
 *   3. Cas trả về và **tất cả đã có sẵn trong sổ** — đồng bộ trùng, không sao.
 *
 * Ba tình huống này dẫn tới ba việc phải làm khác nhau, nên gộp chúng vào một
 * câu là bắt người đọc đoán. `ingestConnection` vốn đã trả về đủ `fetched`,
 * `inserted` và `skipped` — giao diện chỉ đang bỏ phí hai trong ba con số.
 *
 * Cùng họ với những lỗi đã gỡ tuần này: màn hình nói một câu dễ chịu thay vì
 * nói sự thật cụ thể.
 */

export interface SoLieuDongBo {
  /** Số giao dịch Cas trả về. */
  fetched?: number;
  /** Số giao dịch ghi mới vào sổ. */
  inserted?: number;
  /** Số bị loại — không thuộc tài khoản này, hoặc không đọc được. */
  skipped?: number;
}

export interface CauKetQua {
  /** Câu hiện trong toast. */
  cau: string;
  /**
   * `true` khi kết quả cần người đọc để ý, dù không phải lỗi.
   *
   * Lấy về rồi bỏ hết là chuyện đáng xem lại, nhưng không phải hỏng — nên nó
   * không được hiện màu lỗi, mà cũng không nên hiện như một thành công yên ả.
   */
  dangChuY: boolean;
}

export function cauKetQuaDongBo(ds: SoLieuDongBo[]): CauKetQua {
  const fetched = ds.reduce((s, r) => s + (r.fetched ?? 0), 0);
  const inserted = ds.reduce((s, r) => s + (r.inserted ?? 0), 0);
  const skipped = ds.reduce((s, r) => s + (r.skipped ?? 0), 0);

  if (inserted > 0) {
    return { cau: `Đã nhận ${inserted} giao dịch mới`, dangChuY: false };
  }

  if (fetched === 0) {
    return {
      cau: 'Ngân hàng không trả về giao dịch nào trong khoảng thời gian đã hỏi.',
      dangChuY: true,
    };
  }

  if (skipped > 0) {
    // Con số quan trọng nhất của cả file. Nó phân biệt "chưa có tiền về" với
    // "có dữ liệu nhưng không phải của tài khoản này".
    return {
      cau:
        `Ngân hàng trả về ${fetched} giao dịch nhưng bỏ qua ${skipped} — ` +
        'không thuộc tài khoản của liên kết này.',
      dangChuY: true,
    };
  }

  return { cau: `Đã đồng bộ ${fetched} giao dịch, tất cả đã có sẵn trong sổ.`, dangChuY: false };
}
