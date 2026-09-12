import { describe, expect, it } from 'vitest';
import { docMaWebhookCas } from './ma-webhook-cas';

describe('đọc mã sự kiện webhook Casso', () => {
  it('đọc webhookCode — trường bản cũ bỏ sót', () => {
    expect(
      docMaWebhookCas({ webhookType: 'GRANT', webhookCode: 'USER_PERMISSION_REVOKED', grantId: 'g1' }),
    ).toBe('USER_PERMISSION_REVOKED');
  });

  it('webhookCode thắng các trường khác', () => {
    expect(docMaWebhookCas({ webhookCode: 'DEFAULT_UPDATE', status: 'active' })).toBe('DEFAULT_UPDATE');
  });

  it('vẫn đọc các dạng cũ và dạng lồng trong data', () => {
    expect(docMaWebhookCas({ code: 'IN' })).toBe('IN');
    expect(docMaWebhookCas({ data: { webhookCode: 'PENDING_EXPIRATION' } })).toBe('PENDING_EXPIRATION');
  });

  it('không có mã thì trả null, không trả chuỗi rỗng', () => {
    expect(docMaWebhookCas({ webhookType: 'GRANT', grantId: 'g1' })).toBeNull();
    expect(docMaWebhookCas({ webhookCode: '   ' })).toBeNull();
    expect(docMaWebhookCas(null)).toBeNull();
    expect(docMaWebhookCas('rac')).toBeNull();
  });

  it('không lấy giá trị không phải chuỗi', () => {
    expect(docMaWebhookCas({ webhookCode: 42, code: { x: 1 } })).toBeNull();
  });
});
