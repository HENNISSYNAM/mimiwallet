import { describe, expect, it } from 'vitest';
import { GOLDEN_CASES, kiemGoldenCase, type GoldenCase } from './golden';

describe('golden financial cases', () => {
  it('mọi ca đúng định dạng, id không trùng', () => {
    for (const c of GOLDEN_CASES) expect(kiemGoldenCase(c), c.id).toEqual([]);
    expect(new Set(GOLDEN_CASES.map((c) => c.id)).size).toBe(GOLDEN_CASES.length);
  });

  it('chưa ai duyệt thì không ca nào được đánh dấu đã duyệt', () => {
    expect(GOLDEN_CASES.every((c) => c.human_review_status === 'draft')).toBe(true);
  });

  it('chặn dữ liệu khách thật và "đã duyệt" không có người duyệt', () => {
    const x = { ...GOLDEN_CASES[0], nguon: 'khach_that' } as unknown as GoldenCase;
    expect(kiemGoldenCase(x)).toContain('golden case chỉ từ fixture viết tay');
    expect(kiemGoldenCase({ ...GOLDEN_CASES[0], human_review_status: 'approved' })).toContain('đã duyệt thì phải có người duyệt và ngày');
  });
});
