/**
 * Đọc đủ một bảng theo trang, và NÓI RÕ đã đủ hay chưa (29/09/2026).
 *
 * Hai lỗi cũ ở trang Báo cáo:
 *  1. Đọc hỏng giữa chừng chỉ bật một thông báo rồi vẫn dựng biểu đồ từ phần đã đọc — hỏng ở trang đầu
 *     thì màn hình nói "chưa có giao dịch nào", y như công ty chưa có dữ liệu.
 *  2. Dừng khi một trang trả ít hơn 1000 dòng. Nếu máy chủ đặt `max-rows` nhỏ hơn 1000 thì trang đầu
 *     đã "ngắn" và vòng đọc dừng ngay — tổng thiếu mà trông như đủ.
 *
 * Ở đây: trang sau bắt đầu từ SỐ DÒNG ĐÃ NHẬN (không từ bước cố định), nên máy chủ cắt trang nhỏ hơn
 * cũng không sót dòng; chỉ dừng khi đủ tổng đếm được hoặc gặp trang rỗng. `du` chỉ true khi chắc chắn.
 *
 * Truy vấn truyền vào PHẢI sắp theo một khoá duy nhất (thường kèm `id`), không thì hai trang có thể
 * trùng hoặc sót dòng.
 */

export interface TrangDoc<T> {
  data: T[] | null;
  error: { message: string } | null;
  count?: number | null;
}

export interface KetQuaDocDu<T> {
  dong: T[];
  /** Tổng số dòng máy chủ đếm được; `null` khi máy chủ không trả số đếm. */
  tong: number | null;
  /** Lỗi đọc. Có lỗi thì `dong` KHÔNG được dùng như dữ liệu đủ. */
  loi: string | null;
  /** Chắc chắn đã đọc hết: không lỗi, và hoặc đủ tổng đếm, hoặc đã gặp trang rỗng. */
  du: boolean;
}

export async function docDu<T>(
  taoTruyVan: (tu: number, den: number, demTong: boolean) => PromiseLike<TrangDoc<T>>,
  { coTrang = 1000, toiDa = 50_000 }: { coTrang?: number; toiDa?: number } = {},
): Promise<KetQuaDocDu<T>> {
  const dong: T[] = [];
  let tong: number | null = null;
  let hetTrang = false;

  while (dong.length < toiDa) {
    const dau = dong.length === 0 && tong === null;
    const { data, error, count } = await taoTruyVan(dong.length, dong.length + coTrang - 1, dau);
    if (error) return { dong, tong, loi: error.message, du: false };
    if (dau && typeof count === 'number') tong = count;
    const trang = data ?? [];
    if (trang.length === 0) { hetTrang = true; break; }
    dong.push(...trang);
    if (tong !== null && dong.length >= tong) break;
  }

  const du = tong !== null ? dong.length >= tong : hetTrang;
  return { dong, tong, loi: null, du };
}
