import { describe, it, expect } from 'vitest';
import {
  chuanHoa,
  taoMaThamChieu,
  laMaHopLe,
  doiSoatThueBao,
  ketThucKy,
  type SubscriptionInvoice,
  type IncomingTransfer,
} from './subscription';

const hoaDon = (over: Partial<SubscriptionInvoice> = {}): SubscriptionInvoice => ({
  id: 'inv-1',
  company_id: 'com-1',
  reference_code: 'MIMIABC234',
  amount: 249_000,
  status: 'pending',
  ...over,
});

const tienVao = (over: Partial<IncomingTransfer> = {}): IncomingTransfer => ({
  id: 'tx-1',
  amount: 249_000,
  description: 'MIMIABC234',
  ...over,
});

describe('chuanHoa — nội dung chuyển khoản bị ngân hàng làm biến dạng', () => {
  it('bỏ dấu, viết hoa, bỏ khoảng trắng và dấu câu', () => {
    expect(chuanHoa('mimi-abc 234')).toBe('MIMIABC234');
    expect(chuanHoa('Thanh toán MIMI ABC234')).toBe('THANHTOANMIMIABC234');
  });

  it('đổi đ thành d, vì ngân hàng bỏ dấu theo cách riêng của họ', () => {
    expect(chuanHoa('đóng phí')).toBe('DONGPHI');
  });
});

describe('taoMaThamChieu — khách phải gõ tay mã này', () => {
  it('luôn có tiền tố MIMI và sáu ký tự', () => {
    const ma = taoMaThamChieu(() => 0);
    expect(ma).toBe('MIMIAAAAAA');
    expect(laMaHopLe(ma)).toBe(true);
  });

  it('phần ngẫu nhiên không bao giờ chứa O, I, 1, 0 — bốn ký tự dễ nhìn nhầm nhất', () => {
    // Chỉ xét phần sau tiền tố: bản thân chữ "MIMI" có I, và đó là chủ ý —
    // tiền tố cố định nên khách không gõ nhầm nó thành gì khác được.
    const duoi = Array.from({ length: 200 }, () => taoMaThamChieu().slice(4)).join('');
    expect(duoi).not.toMatch(/[OI10]/);
  });

  it('bác mã sai hình dạng', () => {
    expect(laMaHopLe('MIMI0O1I23')).toBe(false);
    expect(laMaHopLe('ABCD123456')).toBe(false);
    expect(laMaHopLe('MIMIABC')).toBe(false);
  });
});

describe('doiSoatThueBao', () => {
  it('khớp khi mã nằm lẫn trong chuỗi rác ngân hàng chèn vào', () => {
    // Đây là hình dạng thật: ngân hàng thêm tên người gửi và mã nội bộ.
    const r = doiSoatThueBao(
      [hoaDon()],
      [tienVao({ description: 'NGUYEN VAN A CHUYEN TIEN MIMIABC234 FT2508XXXX' })],
    );
    expect(r.matched).toHaveLength(1);
    expect(r.matched[0].delta).toBe(0);
  });

  it('trả thiếu KHÔNG được tính là đã trả', () => {
    const r = doiSoatThueBao([hoaDon()], [tienVao({ amount: 200_000 })]);
    expect(r.matched).toHaveLength(0);
    expect(r.mismatched).toHaveLength(1);
    expect(r.mismatched[0].delta).toBe(-49_000);
  });

  it('trả thừa cũng không tự kích hoạt — có thể khách gộp kỳ hoặc gõ nhầm', () => {
    const r = doiSoatThueBao([hoaDon()], [tienVao({ amount: 500_000 })]);
    expect(r.matched).toHaveLength(0);
    expect(r.mismatched[0].delta).toBe(251_000);
  });

  it('bỏ qua tiền ra — số âm không thanh toán được gì', () => {
    const r = doiSoatThueBao([hoaDon()], [tienVao({ amount: -249_000 })]);
    expect(r.matched).toHaveLength(0);
    expect(r.mismatched).toHaveLength(0);
    expect(r.unmatched).toHaveLength(0);
  });

  it('một giao dịch chỉ thanh toán một hoá đơn, không phải mọi hoá đơn cùng mã', () => {
    const hai = [hoaDon({ id: 'inv-1' }), hoaDon({ id: 'inv-2' })];
    const r = doiSoatThueBao(hai, [tienVao()]);
    expect(r.matched).toHaveLength(1);
    expect(r.matched[0].invoice_id).toBe('inv-1');
  });

  it('tiền vào không mang mã nào thì để riêng, không đoán', () => {
    const r = doiSoatThueBao([hoaDon()], [tienVao({ description: 'ban hang ngay 18' })]);
    expect(r.unmatched).toEqual(['tx-1']);
  });

  it('hoá đơn đã trả rồi thì không nhận thêm lần nữa', () => {
    const r = doiSoatThueBao([hoaDon({ status: 'paid' })], [tienVao()]);
    expect(r.matched).toHaveLength(0);
    expect(r.unmatched).toEqual(['tx-1']);
  });
});

describe('ketThucKy — cộng theo tháng lịch, không phải 30 ngày', () => {
  it('ngày thường giữ nguyên số ngày', () => {
    expect(ketThucKy(new Date('2026-03-15T00:00:00Z')).toISOString().slice(0, 10))
      .toBe('2026-04-15');
  });

  it('ngày 31 vào tháng ngắn thì lùi về ngày cuối tháng', () => {
    expect(ketThucKy(new Date('2026-01-31T00:00:00Z')).toISOString().slice(0, 10))
      .toBe('2026-02-28');
  });

  it('không trôi dần qua các tháng như cách cộng 30 ngày', () => {
    let d = new Date('2026-01-15T00:00:00Z');
    for (let i = 0; i < 12; i++) d = ketThucKy(d);
    expect(d.toISOString().slice(0, 10)).toBe('2027-01-15');
  });
});
