import { describe, expect, it } from 'vitest';
import { doanhThuTheoHoatDong } from './tinh-toan';
import { nhanYDinh } from './y-dinh';
import { chiaTheoHoatDong } from '../doanh-thu/theo-hoat-dong';
import type { SuKienThue } from '../luat/he-luat';

const chia = chiaTheoHoatDong('giao_dich', [
  { nguon: 'giao_dich', id: 'a', so_tien: 700e6, ngay: '2026-03-01' },
  { nguon: 'giao_dich', id: 'b', so_tien: 150e6, ngay: '2026-06-01' },
  { nguon: 'giao_dich', id: 'c', so_tien: 101_983_000, ngay: '2026-09-01' },
], [
  { nguon: 'giao_dich', nguon_id: 'a', hoat_dong: 'phan_phoi_hang_hoa' },
  { nguon: 'giao_dich', nguon_id: 'b', hoat_dong: 'dich_vu' },
]);

const sk = { nam: 2026, nguonDoanhThu: 'ngan_hang', hoatDong: chia } as unknown as SuKienThue;
// deno-lint-ignore no-explicit-any
const du = (s: SuKienThue | null) => ({ thue: s ? { suKien: s, canhBao: [], canCuDaKiem: {} } : null }) as any;

describe('trợ lý: doanh thu theo nhóm hoạt động', () => {
  it('trả lời theo thứ tự con số → đã rõ → chưa rõ → vì sao chặn', () => {
    const r = doanhThuTheoHoatDong(du(sk));
    expect(r.tom_tat).toContain('951.983.000');
    expect(r.tom_tat).toContain('850.000.000');
    expect(r.tom_tat).toContain('101.983.000');
    expect(r.tom_tat).toContain('không tự xếp');
    const bang = r.the.find((t) => t.loai === 'bang') as { dong: unknown[][] };
    expect(bang.dong.map((d) => d[0])).toContain('Chưa xác định nhóm');
    expect(r.de_xuat[0]?.nhan).toBe('Xếp nhóm 1 khoản');
  });

  it('xếp hết rồi thì nói phần nhóm hoạt động không còn chặn', () => {
    const het = chiaTheoHoatDong('giao_dich', [{ nguon: 'giao_dich', id: 'a', so_tien: 5, ngay: '2026-01-01' }], [{ nguon: 'giao_dich', nguon_id: 'a', hoat_dong: 'dich_vu' }]);
    const r = doanhThuTheoHoatDong(du({ ...sk, hoatDong: het }));
    expect(r.tom_tat).toContain('không còn chặn');
    expect(r.de_xuat).toEqual([]);
  });

  it('chưa có doanh thu thì nói thật, không bịa bảng', () => {
    expect(doanhThuTheoHoatDong(du(null)).the).toEqual([]);
  });

  it.each([
    'Tại sao MIMI cho hết vào dòng 08a?',
    'Tôi còn bao nhiêu doanh thu chưa phân loại?',
    'Tôi có đủ dữ liệu để khai chưa?',
    '951 triệu này là doanh thu gì?',
  ])('nhận ra câu hỏi: %s', (cau) => {
    expect(nhanYDinh(cau)[0]).toBe('doanh_thu_theo_hoat_dong');
  });

  it('câu hỏi tờ khai thường vẫn đi đường nghĩa vụ thuế', () => {
    expect(nhanYDinh('Năm nay tôi phải khai thuế gì?')[0]).toBe('nghia_vu_thue');
  });
});
