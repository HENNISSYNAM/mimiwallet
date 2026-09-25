/** Mọi con số dưới đây là đầu vào của test, cộng nhẩm được. */
import { describe, expect, it } from 'vitest';
import { haiKy, phanTichChenhLech, type GiaoDichPT, type HoaDonPT } from './chenh-lech';

const gd = (id: string, amount: number, ngay: string, ten: string): GiaoDichPT =>
  ({ id, amount, type: amount > 0 ? 'income' : 'expense', transaction_date: ngay, merchant_name: ten, counter_account_name: null });
const hd = (id: string, total: number, ngay: string, status: string): HoaDonPT =>
  ({ id, invoice_number: id, client_name: 'Khách', total, issued_date: ngay, status });

describe('hai kỳ so sánh', () => {
  it('tháng này tới hôm nay, tháng trước tới cùng ngày; tháng 3 ngày 31 → tháng 2 ngày cuối', () => {
    expect(haiKy('2026-09-25')).toMatchObject({ nay: { tu: '2026-09-01', den: '2026-09-25' }, truoc: { tu: '2026-08-01', den: '2026-08-25' } });
    expect(haiKy('2026-03-31').truoc.den).toBe('2026-02-28');
    expect(haiKy('2026-01-10').truoc).toMatchObject({ tu: '2025-12-01', den: '2025-12-10' });
  });
});

describe('"Doanh thu tăng mà dòng tiền giảm vì sao?"', () => {
  const giaoDich = [
    gd('t1', 10_000_000, '2026-08-05', 'Khách A'), gd('t2', -2_000_000, '2026-08-06', 'NCC X'),
    gd('n1', 6_000_000, '2026-09-05', 'Khách A'), gd('n2', -2_000_000, '2026-09-06', 'NCC X'), gd('n3', -5_000_000, '2026-09-10', 'Chủ nhà'),
    // Ngoài kỳ so sánh (sau ngày 25/08): không được tính.
    gd('ngoai', -99_000_000, '2026-08-28', 'NCC X'),
  ];
  const hoaDon = [hd('h1', 10_000_000, '2026-08-03', 'paid'), hd('h2', 8_000_000, '2026-09-02', 'paid'), hd('h3', 7_000_000, '2026-09-12', 'pending')];
  const r = phanTichChenhLech({ cauHoi: 'Doanh thu tăng mà dòng tiền giảm vì sao?', homNay: '2026-09-25', giaoDich, hoaDonBan: hoaDon });

  it('số chính đúng, cùng kỳ', () => {
    expect(r.nay).toMatchObject({ hoa_don: 15_000_000, tien_vao: 6_000_000, tien_ra: 7_000_000, rong: -1_000_000, chua_thu: 7_000_000 });
    expect(r.truoc).toMatchObject({ hoa_don: 10_000_000, tien_vao: 10_000_000, tien_ra: 2_000_000, rong: 8_000_000 });
  });

  it('động lực: sự thật có id bản ghi; suy luận nói rõ là suy luận; có mục chưa biết', () => {
    const suThat = r.dong_luc.filter((x) => x.nhan === 'su_that');
    expect(suThat.find((x) => x.cau.includes('Chủ nhà'))?.giao_dich).toEqual(['n3']);
    const suyLuan = r.dong_luc.filter((x) => x.nhan === 'suy_luan');
    expect(suyLuan.some((x) => x.cau.includes('chưa thu') && x.hoa_don?.includes('h3'))).toBe(true);
    expect(r.dong_luc.some((x) => x.nhan === 'chua_biet' && x.cau.includes('Tiền mặt'))).toBe(true);
  });

  it('giả định, phương pháp, độ phủ, độ tin cậy luôn có; không tự gọi là báo cáo tài chính', () => {
    expect(r.gia_dinh.join(' ')).toContain('không phải doanh thu kế toán');
    expect(r.phuong_phap.length).toBeGreaterThan(10);
    expect(r.do_phu).toContain('Kỳ này 3 giao dịch');
    expect(r.do_tin_cay).toBe('trung_binh');
    expect(JSON.stringify(r)).not.toMatch(/báo cáo tài chính/i);
  });

  it('bằng chứng truy ngược được tới từng giao dịch, không lẫn khoản ngoài kỳ', () => {
    expect(r.bang_chung.giao_dich_truoc.sort()).toEqual(['t1', 't2']);
    expect(r.bang_chung.giao_dich_nay).not.toContain('ngoai');
  });

  it('việc tiếp theo có căn cứ', () => {
    expect(r.viec_tiep[0]).toContain('Nhắc thu 1 hoá đơn');
  });
});

describe('không có dữ liệu', () => {
  it('độ tin cậy thấp, nói thật', () => {
    const r = phanTichChenhLech({ cauHoi: 'x', homNay: '2026-09-25', giaoDich: [], hoaDonBan: [] });
    expect(r.do_tin_cay).toBe('thap');
    expect(r.can_xem_lai.join(' ')).toContain('Không có hoá đơn bán ra');
  });
});
