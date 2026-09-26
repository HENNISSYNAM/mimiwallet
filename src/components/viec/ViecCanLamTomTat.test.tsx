import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const gia = vi.hoisted(() => ({ loi: false }));
vi.mock('@/lib/goiTroLy', () => ({
  goiTroLy: async () => {
    if (gia.loi) throw new Error('Mạng lỗi');
    return {
      lich: [], da_xong: [], loi: [], duoc_sua: true,
      viec: [{
        id: 'v2', nguon: 'ho_so_viec', loai: 'phan_loai_hoat_dong', tieu_de: 'Phân loại 101.983.000đ doanh thu trước khi hoàn tất tờ khai',
        trang_thai: 'ready_to_act', muc: 3, vi_sao: 'Mỗi nhóm hoạt động là một dòng và một tỷ lệ thuế riêng.',
        khi: { loai_ngay: 'han_luat', ngay: '2027-01-31', nhan: 'Hạn pháp lý: 31/01/2027' },
        hanh_dong: { tieu_de: 'Phân loại 101.983.000đ doanh thu trước khi hoàn tất tờ khai' }, can_ban: true, duong_dan: '/dashboard/viec-can-lam?viec=v2',
      }],
    };
  },
}));
import { ViecCanLamTomTat } from './ViecCanLamTomTat';

describe('Việc cần làm trên Tổng quan', () => {
  it('hiện cái gì / vì sao / khi nào từ danh sách chuẩn, dẫn tới đúng việc', async () => {
    render(<MemoryRouter><ViecCanLamTomTat /></MemoryRouter>);
    const l = await screen.findByRole('link', { name: /Phân loại 101\.983\.000đ/ });
    expect(l.getAttribute('href')).toBe('/dashboard/viec-can-lam?viec=v2');
    expect(screen.getByText('Đang chặn tờ khai')).toBeTruthy();
    expect(screen.getByText(/Hạn pháp lý: 31\/01\/2027/)).toBeTruthy();
  });
  it('đọc lỗi → nói lỗi, không nói "không có việc"', async () => {
    gia.loi = true;
    render(<MemoryRouter><ViecCanLamTomTat /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('Không có việc nào cần bạn lúc này.')).toBeNull();
    gia.loi = false;
  });
});
