import { describe, it, expect } from 'vitest';
import { describeBankError, requiresRelink } from './errors';

describe('describeBankError', () => {
  it('separates a missing scope from a bank that does not sell the product', () => {
    // The two failures seen in a row on the same feature. Telling them apart is
    // the whole point: one is fixed by linking again, the other never is.
    expect(describeBankError('GRANT_NOT_PERMISSION').action).toBe('relink');
    expect(describeBankError('FI_SERVICE_NOT_FOUND').action).toBe('choose_other_bank');
  });

  it('sends a paused account to the bank app, not back through Cas Link', () => {
    // Relinking cannot lift a suspension the bank applied; only the customer
    // acting in their own banking app can.
    expect(describeBankError('FI_SERVICE_ACCOUNT_PAUSED').action).toBe('reauth_in_bank_app');
  });

  it('treats a connecting account as nothing to do', () => {
    expect(describeBankError('FI_SERVICE_ACCOUNT_CONNECTING').action).toBe('wait');
  });

  it('treats rate limiting as transient, never as a broken link', () => {
    expect(describeBankError('RATE_LIMIT').action).toBe('wait');
    expect(requiresRelink('RATE_LIMIT')).toBe(false);
  });

  it('does not blame the customer for an infrastructure limit', () => {
    // IP_NOT_ALLOWED stays here: it is decided at the network layer, before any
    // parameter is read, and there is nothing the customer can do about it.
    expect(describeBankError('IP_NOT_ALLOWED').action).toBe('contact_support');
  });

  it('INVALID_PARAM points at the input, because the customer now types some of it', () => {
    /*
     * Đổi ngày 04/09/2026, và đổi vì SỰ THẬT VỀ HỆ THỐNG ĐÃ ĐỔI chứ không phải
     * vì test bất tiện.
     *
     * Khi test này được viết, mọi tham số của lời gọi Cas đều do máy chủ dựng,
     * nên `INVALID_PARAM` chắc chắn là lỗi của mã — xếp cùng `IP_NOT_ALLOWED`
     * là đúng. Nay người dùng tự gõ số tiền và nội dung mã QR, và lần chạy thật
     * đầu tiên trả về:
     *
     *     description must has maximum 9 characters (INVALID_PARAM)
     *     requestId Bgv44JpvIbxfvfmr
     *
     * Nói "không phải do bạn" trong tình huống đó là chặn đúng người sửa được.
     */
    expect(describeBankError('INVALID_PARAM').action).toBe('fix_input');
    expect(describeBankError('INVALID_PARAM').remedy).toContain('9 ký tự');
  });

  it('marks every documented grant failure as needing a relink', () => {
    for (const code of [
      'GRANT_NOT_FOUND',
      'GRANT_NOT_PERMISSION',
      'GRANT_LOGIN_REQUIRED',
      'GRANT_TOKEN_EXPIRED',
      'GRANT_NOT_PERMIT_UPDATE',
    ]) {
      expect(requiresRelink(code), code).toBe(true);
    }
  });

  it('invents no remedy for a code it does not know', () => {
    // An unknown code must fall through to Cas's own message. Guessing a remedy
    // is what sent somebody to redo a link that was never the problem.
    expect(describeBankError('SOMETHING_NEW')).toEqual({ action: 'unknown', remedy: '' });
    expect(describeBankError(undefined)).toEqual({ action: 'unknown', remedy: '' });
    expect(requiresRelink('SOMETHING_NEW')).toBe(false);
  });

  it('gives every known code a non-empty Vietnamese remedy', () => {
    for (const code of ['GRANT_NOT_FOUND', 'FI_SERVICE_NOT_FOUND', 'RATE_LIMIT', 'IP_NOT_ALLOWED']) {
      expect(describeBankError(code).remedy.length, code).toBeGreaterThan(10);
    }
  });
});

describe('codes the Cas sandbox can simulate', () => {
  // The three states `POST /sandbox/grant/reset-login` can produce, i.e. the
  // three acceptance cases 5, 6 and 7. PREVENTED was missing until 18/08, which
  // is why case 7 left no lasting mark on the row.
  it('PREVENTED tells the customer to fix it in their bank app, not to relink', () => {
    const { action, remedy } = describeBankError('PREVENTED');
    expect(action).toBe('reauth_in_bank_app');
    expect(requiresRelink('PREVENTED')).toBe(false);
    expect(remedy).toMatch(/ứng dụng ngân hàng/);
  });

  it('GRANT_LOGIN_REQUIRED is a relink, since Update Mode can resolve it', () => {
    expect(requiresRelink('GRANT_LOGIN_REQUIRED')).toBe(true);
  });
});
