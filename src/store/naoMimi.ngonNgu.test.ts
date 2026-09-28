import { describe, expect, it, vi } from 'vitest';

const ng = vi.hoisted(() => ({ resolvedLanguage: undefined as string | undefined, language: undefined as string | undefined }));
vi.mock('i18next', () => ({ default: ng }));
vi.mock('@/lib/goiTroLy', () => ({ goiTroLy: vi.fn() }));
vi.mock('@/lib/congTyDangDung', () => ({ idCongTyDangDung: async () => null, SU_KIEN_DOI_CONG_TY: 'x' }));

import { ngonNguHienTai } from './naoMimi';

describe('ngon_ngu gửi kèm yêu cầu', () => {
  it('theo ngôn ngữ giao diện; biến thể vùng về mã gốc; không rõ thì tiếng Việt', () => {
    ng.resolvedLanguage = 'en'; expect(ngonNguHienTai()).toBe('en');
    ng.resolvedLanguage = 'zh-CN'; expect(ngonNguHienTai()).toBe('zh');
    ng.resolvedLanguage = undefined; ng.language = 'ko-KR'; expect(ngonNguHienTai()).toBe('ko');
    ng.language = 'fr'; expect(ngonNguHienTai()).toBe('vi');
    ng.language = undefined; expect(ngonNguHienTai()).toBe('vi');
  });
});
