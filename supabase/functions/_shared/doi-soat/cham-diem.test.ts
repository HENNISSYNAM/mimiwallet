import { describe, expect, it } from 'vitest';
import { chamDiem, ghepTienVe, type HoaDonCho, type TienVe } from './cham-diem';

const hd = (id: string, so: string, khach: string, tong: number, ngay = '2026-09-01'): HoaDonCho =>
  ({ id, so_hoa_don: so, ten_khach: khach, tong, ngay_lap: ngay });
const tv = (id: string, so_tien: number, ten: string | null, noi_dung: string | null, ngay = '2026-09-10'): TienVe =>
  ({ id, so_tien, ngay, ten_nguoi_chuyen: ten, noi_dung });

describe('chamDiem', () => {
  it('khác số tiền hoặc tiền về trước ngày lập thì không phải ứng viên', () => {
    expect(chamDiem(tv('t', 5_000_000, null, null), hd('h', 'HD001', 'A', 6_000_000))).toBeNull();
    expect(chamDiem(tv('t', 5_000_000, null, null, '2026-08-01'), hd('h', 'HD001', 'A', 5_000_000))).toBeNull();
  });

  it('số hoá đơn trong nội dung nhận được dù viết liền, có gạch, tách chữ và số', () => {
    for (const nd of ['TT HD001', 'thanh toan hd-001', 'CK HD 001 thang 9', 'hd.001']) {
      expect(chamDiem(tv('t', 5_000_000, null, nd), hd('h', 'HD001', 'A', 5_000_000))?.diem, nd).toBe(80);
    }
  });

  it('không nhận nhầm số hoá đơn nằm trong một số dài hơn', () => {
    expect(chamDiem(tv('t', 5_000_000, null, 'TT HD0012'), hd('h', 'HD001', 'A', 5_000_000))?.diem).toBe(40);
    expect(chamDiem(tv('t', 5_000_000, null, 'ma 1HD001'), hd('h', 'HD001', 'A', 5_000_000))?.diem).toBe(40);
  });

  it('tên người chuyển khớp tên khách, bỏ qua "công ty", "TNHH"', () => {
    const c = chamDiem(tv('t', 5_000_000, 'CONG TY TNHH THINH PHAT', null), hd('h', 'HD9', 'Công ty Thịnh Phát', 5_000_000));
    expect(c?.ly_do).toContain('tên người chuyển khớp tên khách');
    // Chỉ trùng chữ "công ty" thì không tính là khớp tên.
    expect(chamDiem(tv('t', 5_000_000, 'CONG TY TNHH AN BINH', null), hd('h', 'HD9', 'Công ty Thịnh Phát', 5_000_000))?.diem).toBe(40);
  });
});

/**
 * Bộ fixture có đáp án — đo precision/recall của "khớp chắc". Đặc tả P1-005 yêu cầu có bộ này để
 * chặn hồi quy. Precision phải 100%: tự khớp sai là tự đánh dấu hoá đơn đã thu khi chưa thu.
 */
const HOA_DON = [
  hd('h1', 'HD101', 'Công ty Thịnh Phát', 5_000_000),
  hd('h2', 'HD102', 'Công ty An Bình', 5_000_000),        // cùng số tiền với h1
  hd('h3', 'HD103', 'Nhà hàng Hoa Sen', 12_300_000),
  hd('h4', 'HD104', 'Casso', 8_000_000),
  hd('h5', 'HD105', 'Công ty Minh Long', 2_000_000),
];
const TIEN_VE = [
  tv('t1', 5_000_000, 'CONG TY TNHH THINH PHAT', 'TT HD101'),     // đúng h1, có số hoá đơn
  tv('t2', 5_000_000, 'NGUYEN VAN A', 'chuyen tien'),             // 5 triệu nhưng không rõ của ai
  tv('t3', 12_300_000, 'NHA HANG HOA SEN', 'CK HD 103'),          // đúng h3
  tv('t4', 8_000_000, 'CASSO', 'thanh toan'),                     // đúng h4 theo tên, không có số
  tv('t5', 2_000_000, 'MINH LONG', 'HD105 va HD104'),             // nhắc hai hoá đơn, số tiền của h5
];
const DAP_AN_CHAC = new Set(['t1:h1', 't3:h3', 't5:h5']);

describe('fixture P1-005: precision/recall của "khớp chắc"', () => {
  const kq = ghepTienVe(TIEN_VE, HOA_DON);
  const chac = new Set(kq.chac.map((c) => `${c.tien.id}:${c.hoa_don.id}`));
  const dung = [...chac].filter((x) => DAP_AN_CHAC.has(x)).length;

  it('precision 100% — không tự khớp cặp nào sai', () => {
    expect([...chac].filter((x) => !DAP_AN_CHAC.has(x))).toEqual([]);
  });

  it('recall trên fixture: khớp được mọi cặp có số hoá đơn trong nội dung', () => {
    expect(dung / DAP_AN_CHAC.size).toBe(1);
  });

  it('khoản 5 triệu không rõ của ai KHÔNG bị gán cho hoá đơn nào — sang "cần xem" vì hai hoá đơn cùng tiền', () => {
    const t2 = kq.can_xem.find((c) => c.tien.id === 't2');
    expect(t2?.ly_do.join(' ')).toContain('cần bạn chọn');
    expect(kq.chac.some((c) => c.tien.id === 't2')).toBe(false);
  });

  it('khớp theo số tiền + tên mà không có số hoá đơn thì chỉ là "cần xem"', () => {
    expect(kq.can_xem.map((c) => `${c.tien.id}:${c.hoa_don.id}`)).toContain('t4:h4');
  });
});

describe('không tự chọn khi mơ hồ', () => {
  it('hai khoản tiền về cùng ghi số một hoá đơn: không khoản nào được khớp chắc', () => {
    const kq = ghepTienVe(
      [tv('a', 5_000_000, null, 'TT HD101'), tv('b', 5_000_000, null, 'TT HD101')],
      [hd('h1', 'HD101', 'Thịnh Phát', 5_000_000)],
    );
    expect(kq.chac).toEqual([]);
    expect(kq.can_xem).toHaveLength(2);
  });
});
