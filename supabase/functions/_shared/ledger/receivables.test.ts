import { describe, it, expect } from 'vitest';
import { doiSoatCongNo, tongConPhaiThu, chuanHoa, type Receivable, type IncomingPayment } from './receivables';

const hd = (over: Partial<Receivable> = {}): Receivable => ({
  id: 'r1',
  invoice_number: 'HD001',
  client_name: 'CONG TY TRUNG SON',
  total: 10_000_000,
  paid: 0,
  ...over,
});

const tra = (over: Partial<IncomingPayment> = {}): IncomingPayment => ({
  id: 'p1',
  amount: 10_000_000,
  description: 'THANH TOAN HD001',
  date: '2026-08-18',
  ...over,
});

describe('khớp theo số hoá đơn — căn cứ chắc nhất', () => {
  it('tất toán đúng hoá đơn khi nội dung có số', () => {
    const r = doiSoatCongNo([hd()], [tra()]);
    expect(r.matched).toHaveLength(1);
    expect(r.matched[0].applied).toBe(10_000_000);
    expect(r.matched[0].remaining).toBe(0);
    expect(r.matched[0].basis).toBe('invoice_number');
  });

  it('tìm được số hoá đơn lẫn trong chuỗi ngân hàng chèn thêm', () => {
    const r = doiSoatCongNo(
      [hd()],
      [tra({ description: 'CT TU 0123 TRUNG SON TT HD 001 FT26081812345' })],
    );
    expect(r.matched[0].basis).toBe('invoice_number');
  });
});

describe('trả một phần — hợp lệ ở công nợ, khác hẳn thuê bao', () => {
  it('ghi nhận phần đã trả và giữ số dư còn lại', () => {
    const r = doiSoatCongNo([hd()], [tra({ amount: 4_000_000 })]);
    expect(r.matched[0].applied).toBe(4_000_000);
    expect(r.matched[0].remaining).toBe(6_000_000);
    expect(r.overpaid).toHaveLength(0);
  });

  it('nhiều lần trả cho một hoá đơn cộng dồn đúng trong một lượt chạy', () => {
    const r = doiSoatCongNo(
      [hd()],
      [tra({ id: 'p1', amount: 4_000_000 }), tra({ id: 'p2', amount: 6_000_000 })],
    );
    expect(r.matched).toHaveLength(2);
    expect(r.matched[1].remaining).toBe(0);
  });
});

describe('một lần chuyển trả nhiều hoá đơn — khách gộp đơn', () => {
  it('phân bổ lần lượt cho tới khi hết tiền', () => {
    const ds = [
      hd({ id: 'r1', invoice_number: 'HD001', total: 3_000_000 }),
      hd({ id: 'r2', invoice_number: 'HD002', total: 5_000_000 }),
    ];
    const r = doiSoatCongNo(ds, [tra({ amount: 8_000_000, description: 'TT HD001 HD002' })]);
    expect(r.matched.map((m) => m.applied)).toEqual([3_000_000, 5_000_000]);
    expect(r.overpaid).toHaveLength(0);
  });
});

describe('khớp theo tên khách khi nội dung không có số hoá đơn', () => {
  it('phân bổ vào hoá đơn cũ nhất trước, đúng thông lệ kế toán', () => {
    const ds = [
      hd({ id: 'r2', invoice_number: 'HD002', total: 5_000_000 }),
      hd({ id: 'r1', invoice_number: 'HD001', total: 3_000_000 }),
    ];
    const r = doiSoatCongNo(ds, [tra({ amount: 3_000_000, description: 'CONG TY TRUNG SON CHUYEN TIEN' })]);
    expect(r.matched[0].receivable_id).toBe('r1');
    expect(r.matched[0].basis).toBe('client_name');
  });

  it('tên quá ngắn không được dùng làm căn cứ — tránh khớp bừa', () => {
    const r = doiSoatCongNo(
      [hd({ client_name: 'ABC' })],
      [tra({ description: 'THANH TOAN ABC XYZ' })],
    );
    expect(r.matched).toHaveLength(0);
    expect(r.unmatched).toEqual(['p1']);
  });
});

describe('những trường hợp phải từ chối tự xử lý', () => {
  it('trả thừa không tự ghi nhận — có thể là ứng trước hoặc hoá đơn chưa nhập', () => {
    const r = doiSoatCongNo([hd({ total: 3_000_000 })], [tra({ amount: 5_000_000 })]);
    expect(r.matched[0].applied).toBe(3_000_000);
    expect(r.overpaid).toEqual([{ payment_id: 'p1', excess: 2_000_000 }]);
  });

  it('tiền ra không thanh toán công nợ của ai', () => {
    const r = doiSoatCongNo([hd()], [tra({ amount: -10_000_000 })]);
    expect(r.matched).toHaveLength(0);
    expect(r.unmatched).toHaveLength(0);
  });

  it('nội dung trống thì để người xử lý, không đoán', () => {
    const r = doiSoatCongNo([hd()], [tra({ description: null })]);
    expect(r.unmatched).toEqual(['p1']);
  });

  it('hoá đơn đã tất toán: nêu đích danh hoá đơn thay vì xếp vào nhóm vô danh', () => {
    // Nội dung ghi rõ HD001 mà HD001 đã thu đủ — gần như luôn là trả trùng.
    // Nói "trả lại HD001 vốn đã tất toán" hữu ích hơn "không rõ khoản này là gì".
    const r = doiSoatCongNo([hd({ paid: 10_000_000 })], [tra()]);
    expect(r.matched).toHaveLength(0);
    expect(r.unmatched).toHaveLength(0);
    expect(r.overpaid).toEqual([
      { payment_id: 'p1', excess: 10_000_000, receivable_id: 'r1' },
    ]);
  });
});

describe('tongConPhaiThu', () => {
  it('cộng phần chưa thu, bỏ qua hoá đơn đã tất toán', () => {
    expect(
      tongConPhaiThu([
        hd({ id: 'a', total: 10_000_000, paid: 4_000_000 }),
        hd({ id: 'b', total: 5_000_000, paid: 5_000_000 }),
      ]),
    ).toBe(6_000_000);
  });
});

describe('chuanHoa', () => {
  it('bỏ dấu và ký tự phân cách để HD 001/2026 khớp HD0012026', () => {
    expect(chuanHoa('HĐ 001/2026')).toBe('HD0012026');
  });
});
