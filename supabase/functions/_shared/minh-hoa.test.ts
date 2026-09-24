import { describe, expect, it } from 'vitest';
import { congTyLaDemo, duocHien, locMinhHoa } from './minh-hoa';

/** Truy vấn giả: ghi lại các bộ lọc đã gọi. */
const q = () => {
  const loc: [string, unknown][] = [];
  const b = { loc, eq: (c: string, v: unknown) => { loc.push([c, v]); return b; } };
  return b;
};

describe('dữ liệu minh hoạ chỉ hiện trong công ty demo', () => {
  it('công ty thật: luôn bỏ dòng minh hoạ', () => {
    expect(locMinhHoa(q(), false).loc).toEqual([['is_synthetic', false]]);
    expect([{ is_synthetic: true }, { is_synthetic: false }].filter(duocHien(false))).toHaveLength(1);
  });

  it('công ty demo: giữ tất cả', () => {
    expect(locMinhHoa(q(), true).loc).toEqual([]);
    expect([{ is_synthetic: true }, { is_synthetic: false }].filter(duocHien(true))).toHaveLength(2);
  });

  it('cờ đọc từ companies.la_demo; không có dòng thì coi là công ty thật', async () => {
    const db = (dong: unknown) => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: dong }) }) }) }) });
    expect(await congTyLaDemo(db({ la_demo: true }), 'c')).toBe(true);
    expect(await congTyLaDemo(db({ la_demo: false }), 'c')).toBe(false);
    expect(await congTyLaDemo(db(null), 'c')).toBe(false);
  });
});
