import { beforeEach, describe, expect, it, vi } from 'vitest';

const gia = vi.hoisted(() => ({ goi: vi.fn(), cty: 'cty-1' as string | null }));
vi.mock('@/lib/goiTroLy', () => ({ goiTroLy: (...a: unknown[]) => gia.goi(...a) }));
vi.mock('@/lib/congTyDangDung', () => ({ idCongTyDangDung: async () => gia.cty, SU_KIEN_DOI_CONG_TY: 'mimi:cong-ty-doi' }));
vi.mock('@/lib/docGiong', () => ({ docGiong: vi.fn(async () => 'xong') }));

import { CAU_NGUNG_CHO, datLaiNaoChoTest, ganPhamViNao, useNaoMimi } from './naoMimi';
import { hoiNgam, layLanHoi } from '@/lib/petHoi';
import { useAuthStore } from '@/store/useAuthStore';

/** Promise điều khiển được: giữ request "đang chạy" để thử chống trùng, đổi phạm vi, phản hồi muộn. */
function treo<T>() {
  let xong!: (v: T) => void; let hong!: (e: unknown) => void;
  const p = new Promise<T>((a, b) => { xong = a; hong = b; });
  return { p, xong, hong };
}
const traLoi = (cau: string) => ({ cau, buoc: [], ket_qua: [], che_do: 'co_dinh', do_day: 'complete', hoi_thoai_id: 'ht-1' });
const cho = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  gia.goi.mockReset();
  gia.cty = 'cty-1';
  datLaiNaoChoTest();
  useNaoMimi.getState().datPhamVi('u-1:cty-1');
});

describe('bộ não dùng chung', () => {
  it('pet hỏi → Trợ lý và Tổng quan đọc CÙNG lượt; hỏi trùng khi đang chạy không tạo request thứ hai', async () => {
    const t = treo<unknown>();
    gia.goi.mockReturnValue(t.p);
    const tuPet = hoiNgam('Khoản nào đang chờ tôi duyệt?');
    // Trợ lý MIMI hỏi đúng câu đó trong lúc pet đang chờ → dùng lại request đang chạy.
    const tuTroLy = useNaoMimi.getState().hoi('Khoản nào đang chờ tôi duyệt?', { nguon: 'tro_ly' });
    t.xong(traLoi('Có 1 khoản chờ duyệt.'));
    await tuPet; const kq = await tuTroLy;
    expect(gia.goi).toHaveBeenCalledTimes(1);
    expect(gia.goi).toHaveBeenCalledWith('hoi', { cau: 'Khoản nào đang chờ tôi duyệt?' }, { signal: expect.any(AbortSignal) });
    const luot = useNaoMimi.getState().luot;
    expect(luot).toHaveLength(1);
    expect(kq.id).toBe(luot[0].id);
    expect(luot[0].traLoi?.cau).toBe('Có 1 khoản chờ duyệt.');
    expect(layLanHoi()[0]).toMatchObject({ trang_thai: 'xong', cau: 'Khoản nào đang chờ tôi duyệt?' });
  });

  it('bấm chạy quy trình hai lần liền → một request', async () => {
    const t = treo<unknown>();
    gia.goi.mockReturnValue(t.p);
    const a = useNaoMimi.getState().chayQuyTrinh('ke_toan_hang_ngay');
    const b = useNaoMimi.getState().chayQuyTrinh('ke_toan_hang_ngay');
    t.xong(traLoi('Đã chạy.'));
    await Promise.all([a, b]);
    expect(gia.goi).toHaveBeenCalledTimes(1);
    expect(gia.goi).toHaveBeenCalledWith('chay_dan_agent', { quy_trinh: 'ke_toan_hang_ngay' }, expect.anything());
  });

  it('đổi phạm vi (tài khoản/công ty) → xoá sạch; phản hồi của phạm vi cũ đến muộn KHÔNG quay vào', async () => {
    const t = treo<unknown>();
    gia.goi.mockReturnValue(t.p);
    const cu = useNaoMimi.getState().hoi('Số dư công ty cũ?');
    expect(useNaoMimi.getState().luot).toHaveLength(1);
    useNaoMimi.getState().datPhamVi('u-2:cty-9');
    expect(useNaoMimi.getState().luot).toEqual([]);
    t.xong(traLoi('Số dư của công ty CŨ: 5.000.000 ₫'));
    await cu; await cho();
    expect(useNaoMimi.getState().luot).toEqual([]);
    expect(JSON.stringify(useNaoMimi.getState())).not.toContain('công ty CŨ');
  });

  it('ngừng chờ: huỷ phía máy khách, nói đúng là máy chủ có thể vẫn xong, KHÔNG tự gọi lại', async () => {
    let signal: AbortSignal | undefined;
    gia.goi.mockImplementation((_h: string, _d: unknown, tc: { signal: AbortSignal }) => {
      signal = tc.signal;
      return new Promise((_a, b) => tc.signal.addEventListener('abort', () => b(new DOMException('aborted', 'AbortError'))));
    });
    const p = useNaoMimi.getState().hoi('Báo cáo thu chi 6 tháng');
    const id = useNaoMimi.getState().luot[0].id;
    useNaoMimi.getState().ngungCho(id);
    await p; await cho();
    expect(signal?.aborted).toBe(true);
    const l = useNaoMimi.getState().luot[0];
    expect(l.trangThai).toBe('ngung_cho');
    expect(l.loi).toBe(CAU_NGUNG_CHO);
    expect(l.loi).toMatch(/Máy chủ có thể vẫn xử lý xong/);
    expect(gia.goi).toHaveBeenCalledTimes(1);
  });

  it('máy chủ lỗi (vd. bản cũ chưa có chay_dan_agent) → lượt lỗi với đúng câu máy chủ, không thử lại', async () => {
    gia.goi.mockRejectedValue(new Error('Hành động không hợp lệ.'));
    const kq = await useNaoMimi.getState().chayQuyTrinh('thu_hoi_cong_no');
    expect(kq).toMatchObject({ trangThai: 'loi', loi: 'Hành động không hợp lệ.' });
    expect(gia.goi).toHaveBeenCalledTimes(1);
  });

  it('đăng xuất / đổi tài khoản / đổi công ty → kho xoá ngay', async () => {
    useAuthStore.setState({ user: { id: 'u-1' } as never });
    const go = ganPhamViNao();
    await cho(); await cho();
    expect(useNaoMimi.getState().phamVi).toBe('u-1:cty-1');
    useNaoMimi.getState().themLuotCoSan('câu cũ', traLoi('bí mật u-1') as never, 'tro_ly');

    gia.cty = 'cty-2';
    window.dispatchEvent(new Event('mimi:cong-ty-doi'));
    expect(useNaoMimi.getState().luot).toEqual([]);
    await cho(); await cho();
    expect(useNaoMimi.getState().phamVi).toBe('u-1:cty-2');

    useNaoMimi.getState().themLuotCoSan('câu cty-2', traLoi('bí mật cty-2') as never, 'tro_ly');
    useAuthStore.setState({ user: null });
    expect(useNaoMimi.getState().luot).toEqual([]);
    expect(useNaoMimi.getState().phamVi).toBeNull();
    go();
  });

  it('không lưu gì xuống localStorage', async () => {
    localStorage.clear();
    gia.goi.mockResolvedValue(traLoi('Doanh thu 1.000.000.000 ₫'));
    await useNaoMimi.getState().hoi('Doanh thu năm nay?');
    expect(Object.keys(localStorage).some((k) => (localStorage.getItem(k) ?? '').includes('Doanh thu'))).toBe(false);
  });
});
