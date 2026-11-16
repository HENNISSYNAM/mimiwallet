import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TRANG_KHAM_PHA, TRANG_KHAM_PHA_DONG_BANG } from './khamPha';
import { KHOI_TRANG_CHU } from '@/pages/Landing';

const landing = readFileSync(join(__dirname, '../pages/Landing.tsx'), 'utf8');
const moiKhoi = [...landing.matchAll(/hien\('([a-z_]+)'\)/g)].map((m) => m[1]);

describe('trang chủ gọn + trang Khám phá', () => {
  it('không khối nào bị rơi: mỗi khối ở trang chủ, một trang Khám phá, hoặc một trang Khám phá đã đóng băng', () => {
    // 16/11/2026: khối agent_ai, nhat_ky chỉ còn ở /kham-pha/agent-ai — đóng băng, giữ mã để mở lại.
    const coCho = new Set([...KHOI_TRANG_CHU, ...[...TRANG_KHAM_PHA, ...TRANG_KHAM_PHA_DONG_BANG].flatMap((t) => t.khoi)]);
    for (const k of moiKhoi) expect(coCho.has(k as never), k).toBe(true);
  });

  it('khối trình diễn nặng không còn ở trang chủ', () => {
    for (const k of ['demo', 'agent_ai', 'nhat_ky', 'bao_mat_video', 'giai_phap', 'cap_nhat', 'cong_nghe', 'minh_bach']) {
      expect(KHOI_TRANG_CHU).not.toContain(k);
    }
  });

  it('trang Khám phá về agent chi tiền đã đóng băng, không còn trong danh sách hiện', () => {
    expect(TRANG_KHAM_PHA.map((t) => t.slug)).not.toContain('agent-ai');
    expect(TRANG_KHAM_PHA_DONG_BANG.map((t) => t.slug)).toEqual(['agent-ai']);
  });

  it('mỗi trang Khám phá có đăng ký ở cuối, slug không trùng', () => {
    for (const t of TRANG_KHAM_PHA) expect(t.khoi.at(-1)).toBe('dang_ky');
    expect(new Set(TRANG_KHAM_PHA.map((t) => t.slug)).size).toBe(TRANG_KHAM_PHA.length);
  });
});
