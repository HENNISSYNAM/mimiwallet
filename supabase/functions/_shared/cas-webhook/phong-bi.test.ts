import { describe, expect, it } from 'vitest';
import { anNhayCam, CACH_XU_LY, DA_AN, docPhongBi, dungMoiTruong, jsonChuan, khoaChongTrung } from './phong-bi';

// Nguyên văn các ví dụ trong tài liệu chính thức cas.so/general/api/webhook (đọc 24/09/2026).
const MAU = {
  GRANT_ERROR: {
    environment: 'dev', grantId: '4c657924-13f3-11ee-a4bb-42010a40001b', webhookType: 'GRANT', webhookCode: 'ERROR',
    error: { errorType: 'GRANT_ERROR', errorCode: 'GRANT_LOGIN_REQUIRED', errorMessage: 'Thông tin đăng nhập đã thay đổi' },
  },
  GRANT_PAUSED: { environment: 'dev', webhookType: 'GRANT', webhookCode: 'GRANT_PAUSED', grantId: '4c657924-13f3-11ee-a4bb-42010a40001b', error: null },
  TRANSACTION_UPDATE: {
    environment: 'dev', webhookType: 'TRANSACTIONS', webhookCode: 'TRANSACTION_UPDATE', error: null,
    grantId: '4c657924-13f3-11ee-a4bb-42010a40001b',
    transaction: { reference: 'FT23339WL0MW\\BNK', amount: 10000, counterAccountNumber: '222777313', counterAccountName: null, counterAccountBankId: '981957', counterAccountBankName: null },
  },
  INVOICE: {
    environment: 'dev', webhookType: 'INVOICE', webhookCode: 'DEFAULT_UPDATE', error: null, grantId: 'e4766187-6dea-11f0-a3bb-0022481a0395',
    invoice: { id: 'e1d6f6e5-a284-473c-861b-51b6ba79d692', codeOfTax: '00820BA3EB29EF4E6293BE37CA157662A0', codeOfTaxStatus: 'SUCCESS' },
  },
  AUTO_DEBIT: {
    environment: 'dev', webhookType: 'AUTO_DEBIT', webhookCode: 'DEFAULT_UPDATE', error: null, grantId: 'e4766187-6dea-11f0-a3bb-0022481a0395',
    autoDebit: { id: 'e1d6f6e5-a284-473c-861b-51b6ba79d692', batchId: '66d0cd82-f4f4-11ed-91a2-42010a400014', state: 'DONE', payments: [] },
  },
  TVAN: {
    environment: 'dev', webhookType: 'TVAN', webhookCode: 'DEFAULT_UPDATE', error: null,
    tvan: { messageId: 'V03167944795283403BE28E4204AD6138BF2C24E9H5', tvanMessageId: 'V0106713804019E0552F7E877588C06AEEB480FEA96', taxAuthorityMessageId: 'TCTF1738F116AE0465E834254CF88365047', taxCode: '0106713804-999', senderTaxCode: 'V0106713804-999', receiverTaxCode: 'TCT' },
  },
  SIGN_COMPLETED: {
    environment: 'dev', webhookType: 'SIGN', webhookCode: 'DEFAULT_UPDATE', error: null, grantId: null,
    signRequest: { signRequestId: 'fd2d7767-29b3-4de3-98f2-31fb1ecfb8f0', state: 'COMPLETED', identityKey: 'b3f1e2c4-8a2d-4c1a-9e3f-1a2b3c4d5e6f', identityKeyExpiresAt: '2026-08-11T12:05:00.000Z' },
  },
};

describe('docPhongBi — sáu loại theo tài liệu Cas', () => {
  it('GRANT ERROR mang mã lỗi đăng nhập', () => {
    expect(docPhongBi(MAU.GRANT_ERROR)).toMatchObject({ loai: 'GRANT', ma: 'ERROR', maLoi: 'GRANT_LOGIN_REQUIRED', grantId: '4c657924-13f3-11ee-a4bb-42010a40001b', moiTruong: 'dev' });
    expect(docPhongBi(MAU.GRANT_PAUSED)).toMatchObject({ loai: 'GRANT', ma: 'GRANT_PAUSED', maLoi: null });
  });

  it('mỗi loại nhận đúng chủ thể của nó', () => {
    expect(docPhongBi(MAU.TRANSACTION_UPDATE).chuThe).toEqual({ kieu: 'giao_dich', id: 'FT23339WL0MW\\BNK' });
    expect(docPhongBi(MAU.INVOICE).chuThe).toEqual({ kieu: 'hoa_don_invoice_hub', id: 'e1d6f6e5-a284-473c-861b-51b6ba79d692' });
    expect(docPhongBi(MAU.AUTO_DEBIT).chuThe?.kieu).toBe('trich_no');
    expect(docPhongBi(MAU.TVAN)).toMatchObject({ loai: 'TVAN', grantId: null, chuThe: { kieu: 'thong_diep_tvan', id: MAU.TVAN.tvan.messageId } });
    expect(docPhongBi(MAU.SIGN_COMPLETED)).toMatchObject({ loai: 'SIGN', grantId: null, chuThe: { kieu: 'yeu_cau_ky' } });
  });

  it('thân rỗng là lần Console gửi thử, không phải lỗi', () => {
    expect(docPhongBi({}).loai).toBe('RONG');
    expect(docPhongBi(null).loai).toBe('RONG');
  });

  it('thiếu webhookType thì đoán theo hình dạng; lạ hẳn thì KHONG_RO', () => {
    const { webhookType: _, ...khongLoai } = MAU.TVAN;
    expect(docPhongBi(khongLoai).loai).toBe('TVAN');
    expect(docPhongBi({ foo: 1 }).loai).toBe('KHONG_RO');
  });

  it('chỉ GRANT và TRANSACTIONS được đổi dữ liệu; bốn loại còn lại chỉ ghi nhận', () => {
    expect(Object.entries(CACH_XU_LY).filter(([, v]) => v.xu_ly === 'kiem_lai_cas').map(([k]) => k)).toEqual(['GRANT', 'TRANSACTIONS']);
  });
});

describe('anNhayCam', () => {
  it('SIGN: identityKey không bao giờ vào nhật ký', () => {
    const sach = anNhayCam(MAU.SIGN_COMPLETED) as typeof MAU.SIGN_COMPLETED;
    expect(sach.signRequest.identityKey).toBe(DA_AN);
    expect(sach.signRequest.identityKeyExpiresAt).toBe(DA_AN);
    expect(sach.signRequest.signRequestId).toBe(MAU.SIGN_COMPLETED.signRequest.signRequestId);
    expect(JSON.stringify(sach)).not.toContain('b3f1e2c4');
  });

  it('ẩn cả trong mảng lồng nhau, không đụng dữ liệu gốc', () => {
    const goc = { a: [{ identificationNumber: '079012345678', ten: 'X' }], accessToken: 'tok' };
    expect(anNhayCam(goc)).toEqual({ a: [{ identificationNumber: DA_AN, ten: 'X' }], accessToken: DA_AN });
    expect(goc.accessToken).toBe('tok');
  });
});

describe('khoaChongTrung', () => {
  it('Cas gửi lại cùng nội dung, khác thứ tự trường → cùng khoá', async () => {
    // Đảo thứ tự khoá ở mọi tầng, giữ nguyên giá trị.
    const daoKhoa = (x: unknown): unknown => Array.isArray(x)
      ? x.map(daoKhoa)
      : x && typeof x === 'object'
        ? Object.fromEntries(Object.entries(x).reverse().map(([k, v]) => [k, daoKhoa(v)]))
        : x;
    const dao = daoKhoa(MAU.INVOICE);
    expect(jsonChuan(dao)).toBe(jsonChuan(MAU.INVOICE));
    expect(await khoaChongTrung(dao)).toBe(await khoaChongTrung(MAU.INVOICE));
  });

  it('khác một trường → khác khoá', async () => {
    const khac = { ...MAU.INVOICE, invoice: { ...MAU.INVOICE.invoice, codeOfTaxStatus: 'FAILED' } };
    expect(await khoaChongTrung(khac)).not.toBe(await khoaChongTrung(MAU.INVOICE));
  });
});

describe('dungMoiTruong', () => {
  it('production không nhận sự kiện sandbox', () => {
    expect(dungMoiTruong('dev', 'production')).toBe(false);
    expect(dungMoiTruong('production', 'production')).toBe(true);
    expect(dungMoiTruong(null, 'production')).toBe(true);
  });
  it('sandbox chỉ nhận "dev"', () => {
    expect(dungMoiTruong('dev', 'sandbox')).toBe(true);
    expect(dungMoiTruong('production', 'sandbox')).toBe(false);
  });
});
