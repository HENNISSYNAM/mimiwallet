import { describe, expect, it } from 'vitest';
import { docXacNhanHoatDong, keHoachHoanTacHoatDong } from './xac-nhan-hoat-dong';

const ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

describe('docXacNhanHoatDong', () => {
  it('nhận từng khoản', () => {
    expect(docXacNhanHoatDong({ nguon: 'giao_dich', hoat_dong: 'dich_vu', nam: 2026, ids: [ID, ID] }, 2026))
      .toEqual({ ok: true, nguon: 'giao_dich', hoat_dong: 'dich_vu', nam: 2026, ids: [ID], tat_ca_chua_ro: false });
  });

  it('nhận "mọi khoản còn chưa rõ" — máy chủ tự lấy danh sách, không tin danh sách trình duyệt gửi', () => {
    const r = docXacNhanHoatDong({ nguon: 'hoa_don', hoat_dong: 'phan_phoi_hang_hoa', nam: 2026, tat_ca_chua_ro: true, ids: ['bị bỏ qua'] }, 2026);
    expect(r).toMatchObject({ ok: true, ids: null, tat_ca_chua_ro: true });
  });

  it('doanh thu tự nhập: mã là năm-quý, và phải đúng năm', () => {
    expect(docXacNhanHoatDong({ nguon: 'tu_nhap', hoat_dong: 'dich_vu', nam: 2026, ids: ['2026-q3'] }, 2026).ok).toBe(true);
    expect(docXacNhanHoatDong({ nguon: 'tu_nhap', hoat_dong: 'dich_vu', nam: 2026, ids: ['2025-q3'] }, 2026).ok).toBe(false);
  });

  it.each([
    [{ nguon: 'khac', hoat_dong: 'dich_vu', nam: 2026, ids: [ID] }, 'Nguồn'],
    [{ nguon: 'giao_dich', hoat_dong: 'ban_le', nam: 2026, ids: [ID] }, 'Nhóm hoạt động'],
    [{ nguon: 'giao_dich', hoat_dong: 'dich_vu', nam: 1999, ids: [ID] }, 'Năm'],
    [{ nguon: 'giao_dich', hoat_dong: 'dich_vu', nam: 2026, ids: [] }, 'ít nhất'],
    [{ nguon: 'giao_dich', hoat_dong: 'dich_vu', nam: 2026, ids: ["1; drop table"] }, 'không hợp lệ'],
    [{ nguon: 'giao_dich', hoat_dong: 'dich_vu', nam: 2026, ids: Array.from({ length: 501 }, () => ID) }, 'tối đa'],
  ])('từ chối yêu cầu sai: %#', (body, cau) => {
    const r = docXacNhanHoatDong(body, 2026);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.cau).toContain(cau);
  });
});

describe('keHoachHoanTacHoatDong', () => {
  it('mỗi khoản về đúng trạng thái trước lần bấm; trước đó chưa có thì xoá', () => {
    const k = keHoachHoanTacHoatDong([
      { nguon: 'giao_dich', nguon_id: 'a', tu_hoat_dong: null, at: '2026-09-25T01:00:00Z' },
      { nguon: 'giao_dich', nguon_id: 'b', tu_hoat_dong: 'dich_vu', at: '2026-09-25T01:00:00Z' },
      { nguon: 'giao_dich', nguon_id: 'b', tu_hoat_dong: 'khac', at: '2026-09-25T01:05:00Z' },
    ]);
    expect(k).toEqual([
      { nguon: 'giao_dich', nguon_id: 'a', ve: null },
      { nguon: 'giao_dich', nguon_id: 'b', ve: 'dich_vu' },
    ]);
  });
});
