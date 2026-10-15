import { describe, expect, it } from 'vitest';
import { daDongYDayDu, PHIEN_BAN_DIEU_KHOAN } from './dongY';

const dong = (kind: string, version = PHIEN_BAN_DIEU_KHOAN, revoked_at: string | null = null) => ({ kind, version, revoked_at });

describe('đã đồng ý đủ điều khoản chưa', () => {
  it('cần CẢ điều khoản lẫn quyền riêng tư, đúng phiên bản hiện hành', () => {
    expect(daDongYDayDu([dong('tos'), dong('privacy')])).toBe(true);
    expect(daDongYDayDu([dong('tos')])).toBe(false);
    expect(daDongYDayDu([])).toBe(false);
  });
  it('đồng ý bản cũ thì hỏi lại; đã thu hồi thì không tính', () => {
    expect(daDongYDayDu([dong('tos', '2025-01-01'), dong('privacy', '2025-01-01')])).toBe(false);
    expect(daDongYDayDu([dong('tos'), dong('privacy', PHIEN_BAN_DIEU_KHOAN, '2026-10-16T00:00:00Z')])).toBe(false);
  });
  it('đồng ý khác loại (bank_data) không thay được điều khoản', () => {
    expect(daDongYDayDu([dong('bank_data'), dong('privacy')])).toBe(false);
  });
});
