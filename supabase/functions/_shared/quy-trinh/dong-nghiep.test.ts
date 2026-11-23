import { describe, expect, it } from 'vitest';
import { ketThuc, sauBuoc, sauNguoi } from './dong-nghiep.ts';
import type { DoThiHien } from './do-thi.ts';

const nut = (id: string, meo: string, lam: 'agent' | 'nguoi' = 'agent') => ({ id, loai: 'agent', ten: id, mo_ta: '', ai_duoc: true, tac_dong: 'doc', cong_cu: null, lam, nhan: 'tu_dong', meo }) as never;
const d: DoThiHien = { nut: [nut('a', 'phan_loai'), nut('b', 'thue'), nut('c', 'thu_ky')], canh: [{ tu: 'a', den: 'b' }, { tu: 'b', den: 'c' }] };

describe('đồng nghiệp trong nhóm workflow', () => {
  it('xong một bước → mèo kế tiếp thả 👍 và nhận việc', () => {
    const r = sauBuoc(d, d.nut[0], 'xong');
    expect(r.phan_ung).toEqual([{ meo: 'thue', emoji: '👍' }]);
    expect(r.tra?.meo).toBe('thue');
  });
  it('bước cuối: không có mèo kế tiếp → vẫn có đồng nghiệp thả 👍, không nói bậy', () => {
    const r = sauBuoc(d, d.nut[2], 'xong');
    expect(r.tra).toBeUndefined();
    expect(r.phan_ung[0].emoji).toBe('👍');
  });
  it('bước kẹt → Thư ký lo lắng và nhờ người; chính Thư ký kẹt thì không tự an ủi mình', () => {
    expect(sauBuoc(d, d.nut[0], 'chan').tra?.noi).toMatch(/🙏/);
    expect(sauBuoc(d, d.nut[2], 'chan').phan_ung).toEqual([]);
  });
  it('người duyệt / từ chối / làm tay đều được ghi nhận khác nhau', () => {
    expect(sauNguoi('duyet').tra?.noi).toMatch(/duyệt/);
    expect(sauNguoi('tu_choi').tra?.noi).toMatch(/sửa/);
    expect(sauNguoi('xong').phan_ung[0].emoji).toBe('👍');
  });
  it('cả quy trình xong → các mèo khác (trừ Thư ký) thả 🎉; cùng đầu vào cùng câu', () => {
    const k = ketThuc(d);
    expect(k.phan_ung.map((p) => p.meo).sort()).toEqual(['phan_loai', 'thue']);
    expect(sauBuoc(d, d.nut[0], 'xong')).toEqual(sauBuoc(d, d.nut[0], 'xong'));
  });
});
