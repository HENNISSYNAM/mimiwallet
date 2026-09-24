/**
 * Các tài khoản ngân hàng của chính công ty — để nhận ra tiền chuyển qua lại giữa chúng.
 *
 * Trước 24/09/2026 chỉ lấy từ `bank_connections` (Cas/SePay). Người tải sao kê lên thì khai số
 * tài khoản trong `sao_ke_nhap` — không gộp vào đây thì tiền chuyển từ tài khoản này sang tài khoản
 * kia của cùng một chủ bị cộng thành doanh thu.
 */

// deno-lint-ignore no-explicit-any
type Db = any;

export async function taiKhoanCuaToi(db: Db, companyId: string): Promise<string[]> {
  const [{ data: kn }, { data: nhap }] = await Promise.all([
    db.from('bank_connections').select('account_number').eq('company_id', companyId).is('revoked_at', null),
    db.from('sao_ke_nhap').select('tai_khoan').eq('company_id', companyId),
  ]);
  const ds = [
    ...((kn ?? []) as { account_number: string | null }[]).map((c) => c.account_number),
    ...((nhap ?? []) as { tai_khoan: string | null }[]).map((n) => n.tai_khoan),
  ];
  return [...new Set(ds.filter((a): a is string => typeof a === 'string' && !!a && !a.startsWith('grant:')))];
}
