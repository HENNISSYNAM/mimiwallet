import { describe, expect, it } from 'vitest';
import { khoaTienVao, thongBaoGoi, thongBaoHanThue, thongBaoLuatMoi, thongBaoThanhToan, thongBaoTienVao, trongGioYenLang } from './sinh';
import type { MocThue } from '../luat/lich-thue';

describe('nhắc hạn theo lịch của chính công ty', () => {
  const moc = (o: Partial<MocThue>): MocThue => ({
    khoa: 'tndn_tam_nop_2026_q3', ten: 'Tạm nộp thuế TNDN quý 3/2026', loai: 'tam_nop', trang_thai: 'phai_lam',
    han: '2026-10-30', con_lai: 5, vi_sao: 'Doanh nghiệp tạm nộp thuế TNDN theo quý.', can_cu: [], ...o,
  });

  it('mốc 5 ngày: một thông báo, khoá gồm mốc, hạn và số ngày', () => {
    const ds = thongBaoHanThue([moc({})]);
    expect(ds).toHaveLength(1);
    expect(ds[0]).toMatchObject({ khoa: 'han:tndn_tam_nop_2026_q3:2026-10-30:5', loai: 'han_thue', muc_do: 'can_chu_y', duong_dan: '/dashboard/nhac-thue' });
    expect(ds[0].tieu_de).toBe('Còn 5 ngày: Tạm nộp thuế TNDN quý 3/2026');
    expect(ds[0].noi_dung).toContain('Hạn 30/10/2026');
  });

  it('ngày không phải mốc: im lặng', () => {
    expect(thongBaoHanThue([moc({ con_lai: 6 }), moc({ con_lai: 7 })])).toEqual([]);
  });

  it('có mốc 10 ngày — nhắc sớm hơn mốc 5 ngày', () => {
    expect(thongBaoHanThue([moc({ con_lai: 10 })])[0].tieu_de).toBe('Còn 10 ngày: Tạm nộp thuế TNDN quý 3/2026');
  });

  it('không áp dụng thì không bao giờ nhắc — kể cả đúng mốc', () => {
    expect(thongBaoHanThue([moc({ trang_thai: 'khong_ap_dung', con_lai: 0 })])).toEqual([]);
  });

  it('thiếu hạn thì không nhắc, không bịa ngày', () => {
    expect(thongBaoHanThue([moc({ trang_thai: 'can_xac_minh', han: null, con_lai: null })])).toEqual([]);
  });

  it('cần xác minh: nhắc kèm câu hỏi, không nói như việc bắt buộc', () => {
    const [n] = thongBaoHanThue([moc({ trang_thai: 'can_xac_minh', con_lai: 1, cau_hoi: 'Công ty có trả lương cho người lao động không?' })]);
    expect(n.muc_do).toBe('gap');
    expect(n.noi_dung).toContain('nếu việc này áp dụng cho bạn');
    expect(n.noi_dung).toContain('Công ty có trả lương cho người lao động không?');
  });

  it('ngày hạn: gấp', () => {
    expect(thongBaoHanThue([moc({ con_lai: 0 })])[0]).toMatchObject({ tieu_de: 'Hôm nay là hạn: Tạm nộp thuế TNDN quý 3/2026', muc_do: 'gap' });
  });
});

describe('danh tính thông báo tiền vào', () => {
  it('cùng một khoản được nạp lại ba lần với mã dòng khác nhau → cùng một khoá', () => {
    const lan = ['a1', 'b2', 'c3'].map((id) => ({ id, reference_id: 'minhhoa:tien-me-chuyen', amount: 3_000_000, transaction_date: '2026-09-20', merchant_name: 'NGUYEN THI MAI', counter_account_name: null, payment_reference: 'me chuyen' }));
    const khoa = new Set(lan.flatMap((t) => thongBaoTienVao([t], new Set()).map((n) => n.khoa)));
    expect(khoa).toEqual(new Set(['tien_vao:minhhoa:tien-me-chuyen']));
    expect(new Set(lan.map(khoaTienVao)).size).toBe(1);
  });

  it('không có mã tham chiếu thì dùng mã dòng', () => {
    expect(khoaTienVao({ id: 'x9', reference_id: null })).toBe('tien_vao:x9');
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
