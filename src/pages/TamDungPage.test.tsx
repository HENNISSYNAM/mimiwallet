import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TamDungPage from './TamDungPage';
import { CONG_CU_DONG_BANG, daDongBang } from '@/lib/dongBang';
import { DANH_MUC_CONG_CU } from '@/lib/congCu';

describe('tính năng đóng băng', () => {
  it('đường dẫn cũ hiện trang giải thích, dẫn về việc chính — không chuyển hướng im lặng', () => {
    render(<MemoryRouter initialEntries={['/dashboard/chi-phi-ai']}><TamDungPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Chi phí AI đang tạm dừng' })).toBeTruthy();
    expect(screen.getByText(/dữ liệu cũ vẫn được giữ nguyên/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Kiểm tra một khoản trước khi chuyển/ }).getAttribute('href')).toBe('/dashboard/kiem-truoc-khi-chuyen');
  });

  it('danh mục công cụ không còn công cụ đóng băng; trang đóng băng được nhận ra', () => {
    for (const k of CONG_CU_DONG_BANG) expect(DANH_MUC_CONG_CU.some((c) => c.khoa === k), k).toBe(false);
    expect(daDongBang('/dashboard/clients')).toBe(true);
    expect(daDongBang('/dashboard/kiem-truoc-khi-chuyen')).toBe(false);
  });
});
