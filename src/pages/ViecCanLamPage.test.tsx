import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { tinhBuoc, cauHoiTiepTheo, type DuKien } from '../../supabase/functions/_shared/hanh-trinh/dong-co';

/*
 * Prompt 4 mục 6: hỏi ĐÚNG MỘT câu, trả lời xong thì sang câu kế. Bước "đã nộp" phải qua xác nhận.
 * Máy chủ ở đây là giả lập bằng CHÍNH bộ máy hành trình thật (`dong-co.ts`) — giao diện không có luật riêng.
 */
const goi = vi.hoisted(() => ({ ds: [] as unknown[], cuoc: [] as [string, Record<string, unknown>][] }));
const HT_ID = '22222222-2222-2222-2222-222222222222';
let duKien: DuKien = {};
let daCo: Record<string, string> = {};
const ht = () => {
  const buoc = tinhBuoc('suspension', duKien, daCo as never);
  return { id: HT_ID, loai: 'suspension', tieu_de: 'Tạm ngừng kinh doanh', trang_thai: 'dang_mo', ho_so_viec_id: null, du_kien: duKien, buoc, cau_hoi: cauHoiTiepTheo(buoc, duKien), tao_luc: '', cap_nhat_luc: '' };
};

vi.mock('@/lib/goiTroLy', () => ({
  goiTroLy: async (hd: string, du: Record<string, unknown> = {}) => {
    goi.cuoc.push([hd, du]);
    if (hd === 'hanh_trinh_ds') return { hanh_trinh: [ht()], ho_so_viec: [], duoc_sua: true };
    if (hd === 'hanh_trinh_doc') return { hanh_trinh: ht(), tai_lieu: [], duoc_sua: true };
    if (hd === 'hanh_trinh_tra_loi') {
      duKien = { ...duKien, [String(du.khoa)]: { gia_tri: String(du.gia_tri), nguon: 'nguoi_dung', luc: '', boi: 'u' } };
      return { hanh_trinh: ht() };
    }
    if (hd === 'hanh_trinh_danh_dau') { daCo = { ...daCo, [String(du.khoa)]: String(du.trang_thai) }; return { hanh_trinh: ht() }; }
    throw new Error(`không giả lập ${hd}`);
  },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import ViecCanLamPage from './ViecCanLamPage';

// Máy CI chậm khi chạy cả bộ: một lượt render + hai lời gọi giả lập có lúc quá 1 giây mặc định.
configure({ asyncUtilTimeout: 8000 });

const mo = () => render(<MemoryRouter initialEntries={[`/dashboard/viec-can-lam?ht=${HT_ID}`]}><ViecCanLamPage /></MemoryRouter>);

beforeEach(() => { duKien = {}; daCo = {}; goi.cuoc.length = 0; });

describe('Việc cần làm', () => {
  it('hỏi đúng một câu; trả lời xong thì hiện câu kế, gửi đúng khoá và giá trị', async () => {
    mo();
    expect(await screen.findByRole('heading', { name: 'Bạn muốn bắt đầu tạm ngừng từ ngày nào?' })).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 2 }).filter((h) => h.id === 'cau-hoi')).toHaveLength(1);
    fireEvent.change(document.querySelector('input[type=date]') as HTMLInputElement, { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByText('Trả lời'));
    expect(await screen.findByRole('heading', { name: 'Bạn dự định tạm ngừng tới ngày nào?' })).toBeTruthy();
    expect(goi.cuoc).toContainEqual(['hanh_trinh_tra_loi', { id: HT_ID, khoa: 'tam_ngung_tu', gia_tri: '2026-10-01' }]);
  });

  it('bước chưa đủ dữ kiện hiện lý do chặn, không có nút làm', async () => {
    mo();
    expect(await screen.findAllByText(/Cần biết trước: Bạn muốn bắt đầu tạm ngừng từ ngày nào\?/)).not.toHaveLength(0);
    expect(screen.queryByText('Tôi đã nộp')).toBeNull();
  });

  it('"Tôi đã nộp" phải qua xác nhận rồi mới gửi', async () => {
    duKien = { tam_ngung_tu: { gia_tri: '2026-10-01', nguon: 'nguoi_dung', luc: '', boi: 'u' }, tam_ngung_den: { gia_tri: '2026-12-31', nguon: 'nguoi_dung', luc: '', boi: 'u' } };
    mo();
    fireEvent.click(await screen.findByText('Tôi đã nộp'));
    expect(goi.cuoc.some(([hd]) => hd === 'hanh_trinh_danh_dau')).toBe(false);
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    fireEvent.click(screen.getByText('Đúng'));
    await waitFor(() => expect(goi.cuoc).toContainEqual(['hanh_trinh_danh_dau', { id: HT_ID, khoa: 'nguoi_dung_nop', trang_thai: 'waiting_external', ket_qua: undefined }]));
  });

  it('chưa nộp thì chưa đóng việc được', async () => {
    duKien = { tam_ngung_tu: { gia_tri: '2026-10-01', nguon: 'nguoi_dung', luc: '', boi: 'u' }, tam_ngung_den: { gia_tri: '2026-12-31', nguon: 'nguoi_dung', luc: '', boi: 'u' } };
    mo();
    expect(await screen.findByText('Nộp hồ sơ trước, rồi mới kiểm kết quả.')).toBeTruthy();
    expect(screen.queryByText('Đóng việc')).toBeNull();
  });

  it('đóng việc cần ghi kết quả (CloseCheck)', async () => {
    daCo = { nguoi_dung_nop: 'waiting_external' };
    duKien = { tam_ngung_tu: { gia_tri: '2026-10-01', nguon: 'nguoi_dung', luc: '', boi: 'u' }, tam_ngung_den: { gia_tri: '2026-12-31', nguon: 'nguoi_dung', luc: '', boi: 'u' } };
    mo();
    const nut = await screen.findByText('Đóng việc');
    expect((nut as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Kết quả'), { target: { value: 'Thông báo chấp nhận số 123/TB' } });
    expect((nut as HTMLButtonElement).disabled).toBe(false);
  });
});
