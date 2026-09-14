import { describe, expect, it } from 'vitest';
import { docThanhToanQrCas } from './thanh-toan-qr-cas';

// Hình dạng lần giao thật 14/09/2026; số tài khoản đối ứng thay bằng giá trị giả.
const baoVe = (paymentMeta: unknown) => ({
  error: null,
  grantId: 'adf77640-b043-11f1-9bfe-fa163e5398eb',
  environment: 'dev',
  webhookCode: 'DEFAULT_UPDATE',
  webhookType: 'TRANSACTIONS',
  transaction: {
    id: 'd4165407b04311f19bfefa163e5398eb',
    amount: 2000,
    currency: 'VND',
    reference: 'FT26257034131893',
    accountNumber: '2431122002',
    counterAccountNumber: '0000000000',
    transactionDateTime: '2026-09-14T20:54:39+07:00',
    paymentMeta,
  },
});

describe('đọc thanh toán QR từ webhook TRANSACTIONS của Casso', () => {
  it('bản gửi tới grant QR tạo mã: có mã tham chiếu MIMI', () => {
    expect(docThanhToanQrCas(baoVe({ referenceNumber: 'MIMIJNFGB3' }))).toEqual({
      maThamChieu: 'MIMIJNFGB3',
      soTien: 2000,
      maNganHang: 'FT26257034131893',
      soTaiKhoan: '2431122002',
    });
  });

  it('bản gửi tới grant cũ cùng tài khoản: paymentMeta rỗng → không có gì để khớp', () => {
    expect(docThanhToanQrCas(baoVe({}))).toBeNull();
  });

  it('payload lạ hoặc thiếu không làm hỏng', () => {
    expect(docThanhToanQrCas(null)).toBeNull();
    expect(docThanhToanQrCas({ webhookType: 'GRANT' })).toBeNull();
    expect(docThanhToanQrCas(baoVe({ referenceNumber: '   ' }))).toBeNull();
    expect(docThanhToanQrCas({ transaction: { paymentMeta: { referenceNumber: 'MIMIX' }, amount: 'x' } }))
      .toEqual({ maThamChieu: 'MIMIX', soTien: null, maNganHang: null, soTaiKhoan: null });
  });
});
