import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const goi = vi.hoisted(() => ({ cuoc: [] as [string, Record<string, unknown>][] }));
vi.mock('@/lib/goiTroLy', () => ({
  goiTroLy: async (hd: string, du: Record<string, unknown> = {}) => { goi.cuoc.push([hd, du]); return { yeu_cau: { id: 'y1', trang_thai: 'ready', xem_truoc: {} } }; },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import NopVaTheoDoi from './NopVaTheoDoi';
import type { YeuCauNop } from '@/lib/hanhTrinh';
type YC = YeuCauNop;

const XT = {
  se_xay_ra: 'MIMI khoá bản…', nguoi_nhan: 'Cơ quan thuế…', tai_lieu: 'Công văn giải trình — phiên bản 2', du_lieu_chia_se: 'Chỉ nội dung…',
  khong_hoan_tac: 'Sau khi ghi nhận…', ket_qua_mong_doi: 'Cơ quan thuế gửi…', rui_ro: 'Nộp sai mẫu…',
};
const yc = (trang_thai: YC['trang_thai']): YC => ({ id: 'y1', loai: 'tax_submission', trang_thai, tai_lieu_id: 't1', phien_ban: 2, nha_cung_cap: 'nguoi_dung', xem_truoc: XT, loi_kiem: [], tham_chieu_ngoai: null, nguon_tham_chieu: null, ngay_nop: null, trang_thai_co_quan: null, ket_qua_co_quan: null, nguon_ket_qua: null, han: null, tao_luc: '', gui_luc: null, xong_luc: null, hanh_trinh_id: null, ho_so_viec_id: null, xac_nhan_luc: null });

describe('Nộp & theo dõi', () => {
  it('bước xác nhận hiện đủ bảy mục xem trước; chủ doanh nghiệp mới xác nhận được', () => {
    const { unmount } = render(<NopVaTheoDoi ds={[yc('needs_confirmation')]} vaiTro="ke_toan" onDoi={() => {}} />);
    for (const n of ['Điều gì sẽ xảy ra', 'Ai nhận', 'Tài liệu nộp', 'Dữ liệu chia sẻ', 'Không hoàn tác được', 'Kết quả mong đợi', 'Rủi ro đã biết']) expect(screen.getByText(n)).toBeTruthy();
    expect(screen.queryByText('Tôi đã đọc và xác nhận')).toBeNull();
    unmount();
    render(<NopVaTheoDoi ds={[yc('needs_confirmation')]} vaiTro="chu_so_huu" onDoi={() => {}} />);
    expect(screen.getByText('Tôi đã đọc và xác nhận')).toBeTruthy();
  });

  it('đã xác nhận: phải có biên nhận và ngày mới ghi được "đã nộp"', async () => {
    render(<NopVaTheoDoi ds={[yc('ready')]} vaiTro="chu_so_huu" onDoi={() => {}} />);
    const nut = screen.getByText('Tôi đã nộp') as HTMLButtonElement;
    expect(nut.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Mã biên nhận'), { target: { value: '11020260000123' } });
    fireEvent.change(screen.getByLabelText('Ngày nộp'), { target: { value: '2026-10-15' } });
    await waitFor(() => expect(nut.disabled).toBe(false));
    fireEvent.click(nut);
    await waitFor(() => expect(goi.cuoc).toContainEqual(['nop_da_nop', { id: 'y1', bien_nhan: '11020260000123', ngay_nop: '2026-10-15' }]));
  });

  it('chờ cơ quan: nói rõ chưa phải xong; ghi kết quả cần số thông báo', () => {
    render(<NopVaTheoDoi ds={[yc('waiting_external')]} vaiTro="chu_so_huu" onDoi={() => {}} />);
    expect(screen.getByText(/chưa phải là xong/)).toBeTruthy();
    expect((screen.getByText('Được chấp nhận') as HTMLButtonElement).disabled).toBe(true);
  });

  it('việc cần bạn đứng trước việc đã xong', () => {
    render(<NopVaTheoDoi ds={[{ ...yc('resolved'), id: 'a' }, { ...yc('needs_confirmation'), id: 'b' }] as never} vaiTro="chu_so_huu" onDoi={() => {}} />);
    const nhan = screen.getAllByText(/Chờ xác nhận|Xong/).map((e) => e.textContent);
    expect(nhan[0]).toBe('Chờ xác nhận');
  });
});
