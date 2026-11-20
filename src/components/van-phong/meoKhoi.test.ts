import { describe, expect, it } from 'vitest';
import { chonTrangThai, NHAN_DANG } from './meoKhoi';
import { AGENT_VAN_PHONG } from '../../../supabase/functions/_shared/van-phong/danh-muc.ts';

describe('mèo khối — biểu cảm theo việc thật', () => {
  const co = { dangVui: false, coViec: true, daToiNoi: true, banDo: false, hetXu: false };
  it('vui thắng mọi trạng thái khác (vừa được duyệt)', () => {
    expect(chonTrangThai({ ...co, dangVui: true, banDo: true })).toBe('vui');
    expect(chonTrangThai({ ...co, dangVui: true, coViec: false })).toBe('vui');
  });
  it('chỉ ngủ khi HẾT XU và đã về góc nghỉ; rảnh việc thì vẫn thức', () => {
    expect(chonTrangThai({ ...co, coViec: false })).toBe('thuong');
    expect(chonTrangThai({ ...co, hetXu: true })).toBe('ngu');
    expect(chonTrangThai({ ...co, hetXu: true, daToiNoi: false })).toBe('thuong');
    expect(chonTrangThai({ ...co, hetXu: true, banDo: true })).toBe('ngu');
  });
  it('đứng ở bàn khách đỏ → gấp; bàn vàng/xanh → thường', () => {
    expect(chonTrangThai({ ...co, banDo: true })).toBe('gap');
    expect(chonTrangThai(co)).toBe('thuong');
  });
  it('mọi agent của văn phòng đều có nhận dạng', () => {
    for (const a of AGENT_VAN_PHONG) expect(NHAN_DANG[a], a).toBeTruthy();
  });
});
