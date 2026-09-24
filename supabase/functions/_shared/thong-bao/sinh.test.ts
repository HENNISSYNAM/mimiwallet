import { describe, expect, it } from 'vitest';
import { thongBaoGoi, thongBaoHanThue, thongBaoLuatMoi, thongBaoThanhToan, thongBaoTienVao, trongGioYenLang } from './sinh';

describe('nhắc hạn nộp tờ khai', () => {
  it('đúng mốc 7 ngày: một thông báo, khoá theo kỳ và mốc', () => {
    // Hạn quý 3/2026 là 31/10/2026; 24/10 còn 7 ngày.
    const ds = thongBaoHanThue(new Date(2026, 9, 24, 8, 0));
    expect(ds).toHaveLength(1);
    expect(ds[0]).toMatchObject({ khoa: 'han:2026-q3:7', loai: 'han_thue', duong_dan: '/dashboard/to-khai' });
    expect(ds[0].tieu_de).toBe('Còn 7 ngày tới hạn nộp tờ khai quý 3/2026');
  });

  it('ngày thường không phải mốc: im lặng', () => {
    expect(thongBaoHanThue(new Date(2026, 9, 20, 8, 0))).toEqual([]);
  });

  it('ngày hạn: gấp', () => {
    expect(thongBaoHanThue(new Date(2026, 9, 31, 8, 0))[0]).toMatchObject({ khoa: 'han:2026-q3:0', muc_do: 'gap' });
  });
});

describe('bộ lọc tiền vào chạy ngầm', () => {
  const t = (id: string, amount: number, merchant_name: string) =>
    ({ id, amount, transaction_date: '2026-03-08', merchant_name, counter_account_name: null, payment_reference: null });

  it('khoản vay: báo kèm hai nút một chạm; tiền khách trả thì không báo', () => {
    const ds = thongBaoTienVao([t('vay', 200_000_000, 'GIAI NGAN HDTD 0126'), t('ban', 700_000, 'KHACH LE CK')], new Set());
    expect(ds).toHaveLength(1);
    expect(ds[0].tieu_de).toBe('200.000.000đ có vẻ là tiền vay — đang được tính vào doanh thu');
    expect(ds[0].hanh_dong.map((h) => h.tham_so)).toEqual([
      { transaction_ids: ['vay'], loai: 'loan' },
      { transaction_ids: ['vay'], loai: 'business_revenue' },
    ]);
  });

  it('khoản người dùng đã quyết thì không báo nữa', () => {
    expect(thongBaoTienVao([t('vay', 200_000_000, 'GIAI NGAN HDTD 0126')], new Set(['vay']))).toEqual([]);
  });
});

describe('các loại khác', () => {
  it('văn bản luật mới: khoá theo mã Công báo', () => {
    const [v] = thongBaoLuatMoi([{ ma_cong_bao: 'CB-1', so_hieu: '141/2026/NĐ-CP', ten: 'Nghị định sửa đổi', ngay_hieu_luc: '2026-10-01' }]);
    expect(v).toMatchObject({ khoa: 'luat:CB-1', tieu_de: 'Văn bản mới: 141/2026/NĐ-CP' });
    expect(v.noi_dung).toContain('01/10/2026');
  });

  it('gói: báo khi còn 3 ngày và ngày hết hạn, ngoài ra im lặng', () => {
    expect(thongBaoGoi({ plan: 'growth', current_period_end: '2026-09-27' }, '2026-09-24')[0].khoa).toBe('goi:2026-09-27:3');
    expect(thongBaoGoi({ plan: 'growth', current_period_end: '2026-09-24' }, '2026-09-24')[0].muc_do).toBe('gap');
    expect(thongBaoGoi({ plan: 'growth', current_period_end: '2026-09-30' }, '2026-09-24')).toEqual([]);
    expect(thongBaoGoi(null, '2026-09-24')).toEqual([]);
  });

  it('thanh toán: nói đúng thứ vừa mua', () => {
    expect(thongBaoThanhToan({ id: 'h', amount: 40_000, so_luot: 4, plan: 'luot_to_khai' }).tieu_de).toBe('Đã nhận 40.000đ — cộng 4 lượt xuất tờ khai');
  });

  it('giờ yên lặng 21:00–07:00', () => {
    expect(trongGioYenLang(new Date(2026, 8, 24, 22, 0))).toBe(true);
    expect(trongGioYenLang(new Date(2026, 8, 24, 6, 59))).toBe(true);
    expect(trongGioYenLang(new Date(2026, 8, 24, 7, 0))).toBe(false);
  });
});
