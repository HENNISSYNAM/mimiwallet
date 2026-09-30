import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Privacy from '@/pages/Privacy';
import Footer from '@/components/layout/Footer';
import TrangChinhSach, { ThongTinDoanhNghiep } from './TrangChinhSach';
import { DANH_MUC_CHINH_SACH, TRANG_THONG_TIN } from './danhMuc';
import { COMPANY } from '@/config/company';
import { GIA_MOT_TO_KHAI, GOI_THANG, giaVND } from '../../../supabase/functions/_shared/billing/bang-gia.ts';

/**
 * Các trang công bố của hồ sơ thông báo TMĐT (online.gov.vn). Bộ Công Thương kiểm bằng cách mở
 * từng đường dẫn: trang nào trắng hoặc 404 là hồ sơ bị trả về.
 */
const dung = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Trang chính sách TMĐT', () => {
  it.each(DANH_MUC_CHINH_SACH)('mục $so ($duong) hiện đúng tiêu đề', (m) => {
    dung(m.slug === 'bao-mat' ? <Privacy /> : <TrangChinhSach slug={m.slug} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(m.tieuDe);
  });

  it('mục 8 (trang tổng hợp) hiện tiêu đề và thông tin pháp nhân', () => {
    dung(<ThongTinDoanhNghiep />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(TRANG_THONG_TIN.tieuDe);
    expect(document.body.textContent).toContain(COMPANY.taxCode);
  });

  it('chính sách giá đọc đúng bảng giá máy chủ đang thu', () => {
    dung(<TrangChinhSach slug="gia" />);
    const chu = document.body.textContent ?? '';
    expect(chu).toContain(giaVND(GOI_THANG.starter.amount));
    expect(chu).toContain(giaVND(GOI_THANG.growth.amount));
    expect(chu).toContain(giaVND(GIA_MOT_TO_KHAI));
  });

  it('chân trang dẫn tới đủ bảy trang chính sách', () => {
    dung(<Footer />);
    for (const m of DANH_MUC_CHINH_SACH) {
      const lk = screen.getAllByRole('link', { name: m.tieuDe });
      expect(lk.some((a) => a.getAttribute('href') === m.duong)).toBe(true);
    }
  });
});
