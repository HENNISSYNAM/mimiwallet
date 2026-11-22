import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { laKhongGianTroLy, moduleDangMo } from '@/lib/nguCanhModule';
import { ThanhCongCuNguCanh } from './ThanhCongCuNguCanh';

/** Không gian MIMI Trợ lý (29/09/2026): trợ lý là trang chính, module mở trong cùng khung, link cũ không vỡ. */
describe('module đang mở', () => {
  const m = (duong: string, q = '') => moduleDangMo(duong, new URLSearchParams(q))?.khoa ?? null;

  it('Hoá đơn và Công nợ dùng chung một trang, phân biệt bằng bộ lọc', () => {
    expect(m('/dashboard/invoices')).toBe('hoa_don');
    expect(m('/dashboard/invoices', 'filter=pending')).toBe('cong_no');
  });

  it('trang con thuộc đúng module; trang chính không phải module', () => {
    expect(m('/dashboard/cashflow')).toBe('dong_tien');
    expect(m('/dashboard/to-khai')).toBe('thue');
    expect(m('/dashboard/thu-vien')).toBe('chung_tu');
    expect(m('/dashboard/vay-von')).toBe('vay_von');
    expect(m('/dashboard/doanh-thu-xac-minh')).toBe('vay_von');
    expect(m('/pos')).toBeNull(); // 21/11/2026: bỏ bán tại quầy (POS) và các trang đóng băng — xoá hẳn, không còn đóng băng.
    expect(m('/dashboard')).toBeNull();
    // 22/11/2026: /dashboard là Tổng quan tài chính; trợ lý ở /dashboard/tro-ly.
    expect(laKhongGianTroLy('/dashboard')).toBe(false);
    expect(laKhongGianTroLy('/dashboard/tro-ly')).toBe(true);
    expect(laKhongGianTroLy('/dashboard/invoices')).toBe(false);
  });
});

describe('thanh công cụ ngữ cảnh', () => {
  it('đủ tám module theo thứ tự — việc ra tiền đứng đầu — module đang mở sáng lên', () => {
    render(<MemoryRouter initialEntries={['/dashboard/invoices?filter=pending']}><ThanhCongCuNguCanh /></MemoryRouter>);
    const ten = screen.getAllByRole('link').map((a) => a.textContent?.trim());
    expect(ten).toEqual(['Thuế & Tuân thủ', 'Vay vốn', 'Dòng tiền', 'Hoá đơn', 'Công nợ', 'Chứng từ', 'Báo cáo', 'Doanh nghiệp']);
    expect(screen.queryByRole('link', { name: /Bán tại quầy/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Công nợ/ }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: /Hoá đơn/ }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('button', { name: 'Công cụ khác' })).toBeTruthy();
  });
});
