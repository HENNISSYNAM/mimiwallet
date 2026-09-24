/**
 * Ghi sự kiện sản phẩm từ MÁY CHỦ vào `product_events` — cùng bảng với `track()` ở trình duyệt
 * (`src/lib/track.ts`), thêm `company_id` để tính hành trình theo công ty. Không ghi tiền, số tài
 * khoản, mã số thuế vào `props`.
 *
 * Sự kiện "lần đầu" chỉ ghi được một lần mỗi công ty — chỉ mục duy nhất ở CSDL lo việc đó, ở đây
 * chỉ bỏ qua lỗi trùng. Đo lường KHÔNG BAO GIỜ được làm hỏng việc chính của người dùng: mọi lỗi
 * chỉ ghi log.
 */

// deno-lint-ignore no-explicit-any
type Db = any;

export type TenSuKien =
  | 'business_identified' | 'financial_source_connected' | 'first_scan_completed' | 'first_exception_detected'
  | 'first_classification_confirmed' | 'first_reconciliation_completed' | 'calendar_generated'
  | 'first_case_created' | 'first_case_resolved' | 'first_paid_action' | 'week2_return'
  | 'classification_confirmed' | 'statement_imported';

export async function ghiSuKien(
  db: Db, companyId: string, userId: string | null, ten: TenSuKien, thuocTinh: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { error } = await db.from('product_events').insert({ company_id: companyId, user_id: userId, name: ten, props: thuocTinh });
    if (error && !/duplicate|unique/i.test(error.message)) console.error('ghi sự kiện:', error.message);
  } catch (e) {
    console.error('ghi sự kiện:', e instanceof Error ? e.message : e);
  }
}

/** Nhiều sự kiện một lúc (ví dụ lần quét đầu: đã quét + đã thấy ngoại lệ). */
export async function ghiNhieuSuKien(db: Db, companyId: string, userId: string | null, ds: [TenSuKien, Record<string, unknown>?][]): Promise<void> {
  for (const [ten, tt] of ds) await ghiSuKien(db, companyId, userId, ten, tt ?? {});
}
