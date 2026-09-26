import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TRANG_KHAM_PHA } from './khamPha';
import { KHOI_TRANG_CHU } from '@/pages/Landing';

const landing = readFileSync(join(__dirname, '../pages/Landing.tsx'), 'utf8');
const moiKhoi = [...landing.matchAll(/hien\('([a-z_]+)'\)/g)].map((m) => m[1]);

describe('trang chủ gọn + trang Khám phá', () => {
  it('không khối nào bị rơi: mỗi khối ở trang chủ hoặc ít nhất một trang Khám phá', () => {
    const coCho = new Set([...KHOI_TRANG_CHU, ...TRANG_KHAM_PHA.flatMap((t) => t.khoi)]);
    for (const k of moiKhoi) expect(coCho.has(k as never), k).toBe(true);
  });

  it('khối trình diễn nặng không còn ở trang chủ', () => {
    for (const k of ['demo', 'agent_ai', 'nhat_ky', 'bao_mat_video', 'giai_phap', 'cap_nhat', 'cong_nghe', 'minh_bach']) {
      expect(KHOI_TRANG_CHU).not.toContain(k);
    }
  });

  it('mỗi trang Khám phá có đăng ký ở cuối, slug không trùng', () => {
    for (const t of TRANG_KHAM_PHA) expect(t.khoi.at(-1)).toBe('dang_ky');
    expect(new Set(TRANG_KHAM_PHA.map((t) => t.slug)).size).toBe(TRANG_KHAM_PHA.length);
  });
});
