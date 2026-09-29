import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { laKhongGianTroLy, moduleDangMo } from '@/lib/nguCanhModule';
import { ThanhCongCuNguCanh } from './ThanhCongCuNguCanh';
import ChuyenVeKhongGian from './ChuyenVeKhongGian';

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
    expect(m('/dashboard')).toBeNull();
    expect(laKhongGianTroLy('/dashboard')).toBe(true);
    expect(laKhongGianTroLy('/dashboard/tro-ly')).toBe(true);
    expect(laKhongGianTroLy('/dashboard/invoices')).toBe(false);
  });
});

describe('thanh công cụ ngữ cảnh', () => {
  it('đủ bảy module theo thứ tự, module đang mở sáng lên', () => {
    render(<MemoryRouter initialEntries={['/dashboard/invoices?filter=pending']}><ThanhCongCuNguCanh /></MemoryRouter>);
    const ten = screen.getAllByRole('link').map((a) => a.textContent?.trim());
    expect(ten).toEqual(['Dòng tiền', 'Hoá đơn', 'Thuế & Tuân thủ', 'Công nợ', 'Chứng từ', 'Báo cáo', 'Doanh nghiệp']);
    expect(screen.getByRole('link', { name: /Công nợ/ }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: /Hoá đơn/ }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('button', { name: 'Công cụ khác' })).toBeTruthy();
  });
});

describe('đường dẫn cũ /dashboard/tro-ly', () => {
  it('chuyển về /dashboard, giữ câu hỏi ?hoi=', () => {
    function Dich() {
      const l = useLocation();
      return <p data-testid="dich">{l.pathname}{l.search}</p>;
    }
    render(
      <MemoryRouter initialEntries={['/dashboard/tro-ly?hoi=Kho%E1%BA%A3n%20n%C3%A0o']}>
        <Routes>
          <Route path="/dashboard/tro-ly" element={<ChuyenVeKhongGian />} />
          <Route path="/dashboard" element={<Dich />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('dich').textContent).toBe('/dashboard?hoi=Kho%E1%BA%A3n%20n%C3%A0o');
  });
});
