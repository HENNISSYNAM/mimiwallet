/**
 * Đọc HẾT các dòng của một truy vấn, từng trang một.
 *
 * PostgREST trả tối đa `max-rows` dòng mỗi lần (Supabase mặc định 1000), và `.limit(20000)` KHÔNG
 * vượt được mốc đó — nó chỉ im lặng cắt. Một con số doanh thu cộng từ 1000 dòng đầu của một công ty
 * có 1400 giao dịch là con số sai mà không ai thấy lỗi. Mọi chỗ cộng tiền phải đọc qua đây.
 *
 * Truy vấn truyền vào PHẢI có `.order(...)` trên một cột duy nhất (thường kèm `id`), không thì hai
 * trang có thể trùng hoặc sót dòng.
 */

export const CO_TRANG = 1000;

// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

export class QuaGioiHan extends Error {}

export async function docHet(
  taoTruyVan: (tu: number, den: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  ten: string,
  gioiHan = 50_000,
): Promise<Row[]> {
  const dong: Row[] = [];
  for (let tu = 0; ; tu += CO_TRANG) {
    const { data, error } = await taoTruyVan(tu, tu + CO_TRANG - 1);
    if (error) throw new Error(`Không đọc được ${ten}: ${error.message}`);
    const trang = (data ?? []) as Row[];
    dong.push(...trang);
    if (trang.length < CO_TRANG) return dong;
    // Thà báo lỗi còn hơn trả một tổng thiếu mà trông như đủ.
    if (dong.length >= gioiHan) throw new QuaGioiHan(`Quá ${gioiHan} ${ten} trong một lần tính — cần tính theo từng kỳ.`);
  }
}
