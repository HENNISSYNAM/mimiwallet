import { describe, expect, it } from 'vitest';
import { goiYCaNhan } from './ca-nhan';

const k = (merchant_name: string | null, payment_reference: string | null = null, counter_account_name: string | null = null) =>
  ({ merchant_name, payment_reference, counter_account_name });

describe('gợi ý chi cá nhân (TCCN-08)', () => {
  it('nhận ra học phí, nhà thuốc, đồ ăn, chuyển cho người nhà — kèm lý do', () => {
    expect(goiYCaNhan(k(null, 'Nop hoc phi HK1 cho be'))?.ly_do).toContain('học phí');
    expect(goiYCaNhan(k('NHA THUOC LONG CHAU'))?.ly_do).toContain('nhà thuốc');
    expect(goiYCaNhan(k('GRABFOOD'))?.ly_do).toContain('đặt đồ ăn');
    expect(goiYCaNhan(k(null, 'chuyen cho me tien thang 9'))?.ly_do).toContain('người nhà');
  });

  it('có dấu hay không dấu, hoa hay thường đều nhận', () => {
    expect(goiYCaNhan(k(null, 'Học phí tháng 9'))).not.toBeNull();
    expect(goiYCaNhan(k(null, 'HOC PHI THANG 9'))).not.toBeNull();
  });

  it('khoản chi kinh doanh thường không bị gợi ý', () => {
    expect(goiYCaNhan(k('CONG TY BAO BI TAN PHU', 'Thanh toan bao bi thang 9'))).toBeNull();
    expect(goiYCaNhan(k('VIETTEL IDC', 'thue may chu'))).toBeNull();
    expect(goiYCaNhan(k(null, null, null))).toBeNull();
  });

  it('không bắt nhầm chữ nằm trong từ khác ("phí học" khác "học phí"; "spa" trong "spare")', () => {
    expect(goiYCaNhan(k(null, 'phi hoc nghe cho nhan vien'))).toBeNull();
    expect(goiYCaNhan(k('SPARE PARTS CO'))).toBeNull();
  });
});
