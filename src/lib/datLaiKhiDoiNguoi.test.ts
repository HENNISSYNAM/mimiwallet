import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { signOut: async () => ({}) } } }));
vi.mock('@/lib/goiTroLy', () => ({ goiTroLy: vi.fn() }));

import { useAuthStore } from '@/store/useAuthStore';
import { useNaoMimi } from '@/store/naoMimi';
import { ganDatLaiKhiDoiNguoi } from './datLaiKhiDoiNguoi';

/** P0-2 (kiểm trước go-live 30/09/2026): đổi người dùng trong cùng tab thì bộ não MIMI của người trước bị xoá ngay. */
describe('đổi người dùng = xoá sạch', () => {
  it('A có lượt hỏi, A đăng xuất → kho trống ngay, không đợi layout', () => {
    useAuthStore.setState({ user: { id: 'A' } as never });
    const huy = ganDatLaiKhiDoiNguoi();
    useNaoMimi.setState({ phamVi: 'A:c1' });
    useNaoMimi.getState().themLuotCoSan('Doanh thu tháng này?', { cau: '120 triệu', buoc: [], ket_qua: [], che_do: 'co_dinh', do_day: 'complete' }, 'tro_ly');
    expect(useNaoMimi.getState().luot).toHaveLength(1);
    useAuthStore.setState({ user: null });
    expect(useNaoMimi.getState().luot).toHaveLength(0);
    expect(useNaoMimi.getState().phamVi).toBeNull();
    huy();
  });
});
