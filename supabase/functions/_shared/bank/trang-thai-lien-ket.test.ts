import { describe, expect, it } from 'vitest';
import { CON_QUYEN, trangThaiSauSuKien, trangThaiTheoMaLoi, trangThaiTheoMaWebhook, VIEC_CAN_LAM } from './trang-thai-lien-ket';

describe('trạng thái liên kết theo sự kiện Cas', () => {
  it('người dùng tạm dừng thì là tạm dừng, không phải mất quyền', () => {
    expect(trangThaiTheoMaWebhook('GRANT_PAUSED')).toBe('paused');
    expect(VIEC_CAN_LAM.paused).toMatch(/bật lại/i);
  });

  it('xoá grant (ở Cas ID hoặc ở app mình) là mất quyền thật', () => {
    expect(trangThaiTheoMaWebhook('USER_PERMISSION_REVOKED')).toBe('needs_relink');
    expect(trangThaiTheoMaWebhook('GRANT_DELETED')).toBe('needs_relink');
  });

  it('cập nhật lại mật khẩu qua Update mode là đã kết nối lại', () => {
    expect(trangThaiTheoMaWebhook('DEFAULT_UPDATE')).toBe('connected');
  });

  it('ERROR một mình chưa nói được gì — phải xem mã lỗi kèm theo', () => {
    expect(trangThaiTheoMaWebhook('ERROR')).toBeNull();
    // Tài liệu Cas: GRANT_LOGIN_REQUIRED xử lý bằng CƠ CHẾ CẬP NHẬT của Cas, không phải thao tác
    // trong app ngân hàng — nên là `needs_relink` (đi qua Cas Link), giống `errors.ts` vẫn ghi.
    expect(trangThaiSauSuKien('ERROR', 'GRANT_LOGIN_REQUIRED')).toBe('needs_relink');
    expect(trangThaiSauSuKien('ERROR', 'PREVENTED')).toBe('needs_reauth');
  });

  it('vướng trong app ngân hàng thì không bảo người ta liên kết lại', () => {
    for (const ma of ['PREVENTED', 'FI_SERVICE_ACCOUNT_PAUSED']) {
      expect(trangThaiTheoMaLoi(ma)).toBe('needs_reauth');
    }
    expect(VIEC_CAN_LAM.needs_reauth).toMatch(/app ngân hàng/i);
    expect(VIEC_CAN_LAM.needs_reauth).toMatch(/không giải quyết/i);
  });

  it('quyền mất thật thì mới là liên kết lại', () => {
    for (const ma of ['GRANT_NOT_FOUND', 'GRANT_TOKEN_EXPIRED', 'GRANT_NOT_PERMISSION', 'GRANT_LOGIN_REQUIRED']) {
      expect(trangThaiTheoMaLoi(ma)).toBe('needs_relink');
    }
  });

  it('không biết thì không đổi — "chưa rõ" khác "đã hỏng"', () => {
    for (const ma of ['RATE_LIMIT', 'FI_SERVICE_ACCOUNT_CONNECTING', 'INVALID_PARAM', 'MA_LA_HOAC', undefined, null]) {
      expect(trangThaiTheoMaLoi(ma)).toBeNull();
    }
    expect(trangThaiSauSuKien('ERROR', 'RATE_LIMIT')).toBeNull();
    expect(trangThaiSauSuKien(null, null)).toBeNull();
  });

  it('mã lỗi thắng mã webhook: ERROR + GRANT_NOT_FOUND là mất quyền', () => {
    expect(trangThaiSauSuKien('DEFAULT_UPDATE', 'GRANT_NOT_FOUND')).toBe('needs_relink');
  });

  it('tạm dừng và vướng app ngân hàng vẫn còn quyền, không phải làm lại từ đầu', () => {
    expect(CON_QUYEN).toContain('paused');
    expect(CON_QUYEN).toContain('needs_reauth');
    expect(CON_QUYEN).not.toContain('needs_relink');
  });
});
