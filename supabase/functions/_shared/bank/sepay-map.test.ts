import { describe, it, expect } from 'vitest';
import { mapSepayWebhook, type SepayWebhookPayload } from './sepay-map';

/** A payload shaped like the example in SePay's webhook documentation. */
const valid: SepayWebhookPayload = {
  id: 92704,
  gateway: 'Vietcombank',
  transactionDate: '2026-08-10 14:02:37',
  accountNumber: '0123499999',
  subAccount: null,
  code: null,
  content: 'chuyen tien mua iphone',
  transferType: 'in',
  description: 'BankAPINotify chuyen tien mua iphone',
  transferAmount: 2277000,
  accumulated: 19077000,
  referenceCode: 'MBVCB.3278907687',
};

describe('mapSepayWebhook', () => {
  it('maps an inbound transfer to an income row', () => {
    const { row, reason } = mapSepayWebhook(valid);
    expect(reason).toBeNull();
    expect(row).toMatchObject({
      amount: 2277000,
      type: 'income',
      transaction_date: '2026-08-10',
      source_bank: 'Vietcombank',
      merchant_name: 'chuyen tien mua iphone',
      reference_id: 'sepay:92704',
    });
  });

  it('maps an outbound transfer to an expense row', () => {
    const { row } = mapSepayWebhook({ ...valid, transferType: 'out' });
    expect(row?.type).toBe('expense');
  });

  it('derives the same reference_id twice, so a retry can be deduplicated', () => {
    // SePay retries up to 7 times over 5 hours when it does not receive
    // HTTP 200 + {"success": true} within 30 seconds. The database unique index
    // is what stops the duplicate, but it can only work if the key is stable.
    const a = mapSepayWebhook(valid);
    const b = mapSepayWebhook({ ...valid });
    expect(a.row?.reference_id).toBe(b.row?.reference_id);
  });

  it('falls back to referenceCode when id is absent', () => {
    const { row } = mapSepayWebhook({ ...valid, id: undefined });
    expect(row?.reference_id).toBe('sepay:MBVCB.3278907687');
  });

  it('rejects a payload with no reference at all, rather than storing it', () => {
    const { row, reason } = mapSepayWebhook({
      ...valid,
      id: undefined,
      referenceCode: undefined,
    });
    expect(row).toBeNull();
    expect(reason).toMatch(/missing id/);
  });

  it('rejects an unknown transferType instead of guessing a direction', () => {
    // Guessing here would put money on the wrong side of the ledger and move
    // the credit score in the wrong direction.
    const { row, reason } = mapSepayWebhook({ ...valid, transferType: 'refund' });
    expect(row).toBeNull();
    expect(reason).toMatch(/transferType/);
  });

  it('rejects zero and negative amounts', () => {
    expect(mapSepayWebhook({ ...valid, transferAmount: 0 }).row).toBeNull();
    expect(mapSepayWebhook({ ...valid, transferAmount: -5000 }).row).toBeNull();
  });

  it('parses amounts that arrive as Vietnamese-formatted strings', () => {
    expect(mapSepayWebhook({ ...valid, transferAmount: '5.000.000' }).row?.amount)
      .toBe(5000000);
    expect(mapSepayWebhook({ ...valid, transferAmount: '5,000,000' }).row?.amount)
      .toBe(5000000);
  });

  it('keeps the bank calendar day for a transaction just after midnight', () => {
    // Converting through Date() would render this as the previous day in UTC,
    // shifting the transaction into the wrong month at a month boundary.
    const { row } = mapSepayWebhook({ ...valid, transactionDate: '2026-09-01 00:20:00' });
    expect(row?.transaction_date).toBe('2026-09-01');
  });

  it('rejects an unparseable date', () => {
    expect(mapSepayWebhook({ ...valid, transactionDate: 'hôm qua' }).row).toBeNull();
    expect(mapSepayWebhook({ ...valid, transactionDate: '2026-13-45' }).row).toBeNull();
  });

  it('reports the account number even when the payload is rejected', () => {
    // The caller logs against the account, so it has to survive a rejection.
    const { accountNumber } = mapSepayWebhook({ ...valid, transferType: 'x' });
    expect(accountNumber).toBe('0123499999');
  });

  it('rejects a payload with no account number', () => {
    const { row, reason } = mapSepayWebhook({ ...valid, accountNumber: '' });
    expect(row).toBeNull();
    expect(reason).toMatch(/accountNumber/);
  });

  it('survives null and non-object input', () => {
    expect(mapSepayWebhook(null).row).toBeNull();
    expect(mapSepayWebhook(undefined).row).toBeNull();
  });
});

/**
 * Sợi dây nối mã QR với khoản tiền trả cho nó.
 *
 * Trước 08/09/2026 `mapSepayWebhook` không đặt `payment_reference`, nên
 * `matchQrPayments` — vốn so bằng chính xác — luôn so `null` với mã đang chờ.
 * Khách gõ đúng mã vẫn không khớp, và hoá đơn ở `pending` vĩnh viễn.
 */
describe('mapSepayWebhook — mã tham chiếu và tài khoản định danh', () => {
  const valid = {
    id: 77,
    gateway: 'MBBank',
    transactionDate: '2026-09-08 10:42:00',
    accountNumber: '2431122002',
    subAccount: null,
    transferType: 'in',
    transferAmount: 2000,
  };

  it('đọc mã từ nội dung chuyển khoản', () => {
    const { row } = mapSepayWebhook({ ...valid, content: 'DINH VAN NAM chuyen MIMIK7P2QX' });
    expect(row?.payment_reference).toBe('MIMIK7P2QX');
  });

  it('ưu tiên ô code khi SePay đã tự tách', () => {
    const { row } = mapSepayWebhook({
      ...valid,
      code: 'MIMIK7P2QX',
      content: 'khong co ma trong cau nay',
    });
    expect(row?.payment_reference).toBe('MIMIK7P2QX');
  });

  it('vẫn đọc được từ content khi code rỗng', () => {
    // Cấu hình tiền tố mã thanh toán bên SePay có thể chưa bật.
    const { row } = mapSepayWebhook({ ...valid, code: null, content: 'MIMIK7P2QX' });
    expect(row?.payment_reference).toBe('MIMIK7P2QX');
  });

  it('để null khi nội dung không mang mã — phần lớn giao dịch là vậy', () => {
    const { row } = mapSepayWebhook({ ...valid, content: 'chuyen tien an trua' });
    expect(row?.payment_reference).toBeNull();
    // Và giao dịch vẫn được ghi bình thường.
    expect(row?.amount).toBe(2000);
  });

  it('lấy tài khoản định danh từ subAccount', () => {
    const { row } = mapSepayWebhook({ ...valid, subAccount: '  96247VA001  ' });
    expect(row?.virtual_account_number).toBe('96247VA001');
  });

  it('để null khi không có subAccount', () => {
    expect(mapSepayWebhook(valid).row?.virtual_account_number).toBeNull();
  });
});
