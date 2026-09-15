import { describe, expect, it } from 'vitest';
import { describeBankError } from './errors';
import { MA_DA_THU_HOI, loiNhacLienKetLai, truongNgatGrant, xuLyLoiGrant } from './kiem-grant-qr';

/**
 * Hồi quy Casso 15/09/2026: xoá cấp quyền trên Cas ID thì liên kết đọc sao kê
 * phải rời MIMI như liên kết QR, không nằm lại chờ "Cập nhật".
 */
describe('xử lý lỗi grant cho mọi loại liên kết', () => {
  it('grant đã thu hồi thì ngắt, kể cả khi bảng mã xếp nó vào "liên kết lại"', () => {
    // Chính điều kiện gây lỗi: GRANT_NOT_FOUND mang action relink nên needsRelink = true.
    expect(describeBankError('GRANT_NOT_FOUND').action).toBe('relink');
    expect(xuLyLoiGrant('GRANT_NOT_FOUND', true)).toBe('ngat');
    for (const ma of MA_DA_THU_HOI) {
      expect(xuLyLoiGrant(ma, true), ma).toBe('ngat');
      expect(xuLyLoiGrant(ma, false), ma).toBe('ngat');
    }
  });

  it('chỉ cần đăng nhập lại thì giữ liên kết để Update Mode xử lý (case 5)', () => {
    expect(xuLyLoiGrant('GRANT_LOGIN_REQUIRED', describeBankError('GRANT_LOGIN_REQUIRED').action === 'relink')).toBe('dang_nhap_lai');
  });

  it('lỗi tạm thời, mã lạ hoặc không có mã thì không đổi trạng thái', () => {
    expect(xuLyLoiGrant('RATE_LIMIT', false)).toBe('giu');
    expect(xuLyLoiGrant('MA_CAS_MOI', false)).toBe('giu');
    expect(xuLyLoiGrant(undefined, false)).toBe('giu');
  });

  it('ngắt thì xoá cả token lẫn grant id', () => {
    expect(truongNgatGrant(new Date('2026-09-15T08:00:00Z'))).toEqual({
      status: 'disconnected',
      revoked_at: '2026-09-15T08:00:00.000Z',
      access_token_enc: null,
      grant_id: null,
    });
  });

  it('lời nhắc trỏ đúng nút của từng loại liên kết', () => {
    expect(loiNhacLienKetLai('qrpay')).toContain('Liên kết để nhận tiền QR');
    expect(loiNhacLienKetLai('gdt')).toContain('Kết nối Tổng Cục Thuế');
    expect(loiNhacLienKetLai('transaction')).toContain('Liên kết ngân hàng');
    expect(loiNhacLienKetLai(null)).toContain('Liên kết ngân hàng');
  });
});
