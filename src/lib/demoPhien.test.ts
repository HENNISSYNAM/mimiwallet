import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: vi.fn() }, from: vi.fn() } }));
import { chuPhienDemo, ghiNhoHoiThoaiDemo, idHoiThoaiPhienDemo } from './demoPhien';

describe('bản demo: chữ hỏi đáp chỉ nằm trên trình duyệt của người hỏi (13/10/2026)', () => {
  beforeEach(() => sessionStorage.clear());
  it('nhớ id lượt hỏi và chữ của phiên này; tab khác (sessionStorage khác) không có', () => {
    ghiNhoHoiThoaiDemo('h1', { cau: 'Doanh thu tháng này?', tra_loi: '12 triệu' });
    ghiNhoHoiThoaiDemo('h1', { cau: 'Doanh thu tháng này?', tra_loi: '12 triệu' });
    expect(idHoiThoaiPhienDemo()).toEqual(['h1']);
    expect(chuPhienDemo()).toEqual({ h1: { cau: 'Doanh thu tháng này?', tra_loi: '12 triệu' } });
    sessionStorage.clear();
    expect(chuPhienDemo()).toEqual({});
  });
  it('sessionStorage hỏng thì trả rỗng, không ném lỗi', () => {
    sessionStorage.setItem('mimi.demo.hoi_thoai_chu', '{hỏng');
    expect(chuPhienDemo()).toEqual({});
  });
});
