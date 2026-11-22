import { afterEach, describe, expect, it, vi } from 'vitest';

// Trong app Android (TWA, `?nguon=twa`) ẩn vay vốn + cơ hội phát triển; web giữ nguyên (17/11/2026).
describe('ẩn trang vay trong app Android', () => {
  afterEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    vi.resetModules();
  });

  it('web: còn vay vốn và cơ hội phát triển', async () => {
    const { CONG_CU_THEO_KHOA } = await import('./congCu');
    expect(CONG_CU_THEO_KHOA.vay_von).toBeTruthy();
    expect(CONG_CU_THEO_KHOA.co_hoi_phat_trien).toBeTruthy();
  });

  it('app Android: bỏ khỏi kho công cụ, các công cụ khác giữ nguyên', async () => {
    window.history.replaceState(null, '', '/?nguon=twa');
    const { CONG_CU_THEO_KHOA } = await import('./congCu');
    expect(CONG_CU_THEO_KHOA.vay_von).toBeUndefined();
    expect(CONG_CU_THEO_KHOA.co_hoi_phat_trien).toBeUndefined();
    expect(CONG_CU_THEO_KHOA.soan_to_khai).toBeTruthy();
  });

  it('trang tạm dừng có lời giải thích cho hai đường dẫn', async () => {
    const { TRANG_AN_TRONG_APP } = await import('./dongBang');
    expect(Object.keys(TRANG_AN_TRONG_APP).sort()).toEqual(['/dashboard/co-hoi', '/dashboard/vay-von']);
  });
});
