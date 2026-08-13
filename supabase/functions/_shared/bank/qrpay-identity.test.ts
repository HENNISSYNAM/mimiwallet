import { describe, it, expect } from 'vitest';
import { pickQrPayIdentity } from './bankhub';

/**
 * The response documented at https://cas.so/general/api/get-qr-pay-identity,
 * verbatim. It carries two fields this product has no business holding.
 */
const REAL_RESPONSE = {
  requestId: 'req-1',
  accountName: 'NGUYEN VAN A',
  accountNumber: '123456789',
  virtualAccountNumber: 'V3CASD123456789',
  mobileNumber: '0110000000',
  identificationNumber: '00000000000000',
  fiService: {
    id: 'ebf7fe6d-af63-11ee-aa7e-42010a400022',
    code: 'bidv_qrpay',
    name: 'BIDV VietQR Official',
    type: 'PERSONAL',
    logo: 'https://img.bankhub.dev/rounded/bidv.png',
    fiName: 'BIDV',
    fiFullName: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam',
    fiBin: '970418',
  },
};

describe('pickQrPayIdentity', () => {
  it('drops the national ID number and phone number', () => {
    // Refusing the `identity` scope keeps these out of the statement flow.
    // They arrive anyway through QR Pay, and must stop at this boundary.
    const picked = pickQrPayIdentity(REAL_RESPONSE) as Record<string, unknown>;
    expect(picked.identificationNumber).toBeUndefined();
    expect(picked.mobileNumber).toBeUndefined();
    expect(JSON.stringify(picked)).not.toContain('0110000000');
    expect(JSON.stringify(picked)).not.toContain('00000000000000');
  });

  it('keeps what the product actually uses', () => {
    const p = pickQrPayIdentity(REAL_RESPONSE);
    expect(p.accountNumber).toBe('123456789');
    expect(p.accountName).toBe('NGUYEN VAN A');
    expect(p.virtualAccountNumber).toBe('V3CASD123456789');
    expect(p.fiService?.fiName).toBe('BIDV');
    expect(p.fiService?.fiBin).toBe('970418');
  });

  it('treats blank and whitespace as absent rather than storing empty strings', () => {
    const p = pickQrPayIdentity({ accountNumber: '   ', accountName: '', fiService: {} });
    expect(p.accountNumber).toBeUndefined();
    expect(p.accountName).toBeUndefined();
  });

  it('survives a response missing fiService entirely', () => {
    const p = pickQrPayIdentity({ accountNumber: '999' });
    expect(p.accountNumber).toBe('999');
    expect(p.fiService?.fiName).toBeUndefined();
  });

  it('does not pass through a new field Cas might add later', () => {
    // An allow-list, not a block-list: the next PII field they add is excluded
    // before anyone has to notice it exists.
    const p = pickQrPayIdentity({ ...REAL_RESPONSE, taxCode: '0316794479' }) as Record<string, unknown>;
    expect(p.taxCode).toBeUndefined();
  });
});
