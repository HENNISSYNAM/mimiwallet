import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/goiTroLy', () => ({
  goiTroLy: async () => ({
    viec: [], da_xong: [], loi: [], duoc_sua: true,
    lich: [
      { viec_id: 'v1', tieu_de: 'Tạm ngừng kinh doanh', loai_ngay: 'nen_lam', ngay: '2026-10-01', ghi_chu: 'MIMI khuyên nộp thông báo tạm ngừng trước ngày bắt đầu tạm ngừng', da_xong: false },
      { viec_id: 'v2', tieu_de: 'Phân loại 101.983.000đ doanh thu trước khi hoàn tất tờ khai', loai_ngay: 'han_luat', ngay: '2027-01-31', ghi_chu: 'Khai thuế năm 2026 — lịch thuế', da_xong: false },
      { viec_id: 'v1', tieu_de: 'Tạm ngừng kinh doanh', loai_ngay: 'hen_kiem_lai', ngay: '2026-09-29', ghi_chu: null, da_xong: false },
    ],
  }),
}));

import { LichViec } from './LichViec';

describe('Lịch việc', () => {
  it('ba loại ngày gắn nhãn riêng, xếp theo ngày; ngày khuyên không bao giờ mang nhãn hạn pháp lý', async () => {
    render(<MemoryRouter><LichViec /></MemoryRouter>);
    const muc = await screen.findAllByRole('listitem');
    expect(muc.map((li) => li.textContent?.slice(0, 22))).toEqual([
      expect.stringContaining('Hẹn kiểm lại'), expect.stringContaining('MIMI khuyên làm trước'), expect.stringContaining('Hạn pháp lý'),
    ]);
    expect(muc[1].textContent).not.toContain('Hạn pháp lý');
    expect(screen.getAllByRole('link', { name: 'Tạm ngừng kinh doanh' })[0].getAttribute('href')).toBe('/dashboard/viec-can-lam?viec=v1');
  });
});
