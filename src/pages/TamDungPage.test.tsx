import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TamDungPage from './TamDungPage';
import { CONG_CU_DONG_BANG, daDongBang } from '@/lib/dongBang';
import { DANH_MUC_CONG_CU } from '@/lib/congCu';

describe('tính năng đóng băng', () => {
  it('đường dẫn cũ hiện trang giải thích, dẫn về việc chính — không chuyển hướng im lặng', () => {
    render(<MemoryRouter initialEntries={['/dashboard/clients']}><TamDungPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Khách hàng đang tạm dừng' })).toBeTruthy();
    expect(screen.getByText(/dữ liệu cũ vẫn được giữ nguyên/i)).toBeTruthy();
    // 16/11/2026: lối về là tờ khai (kiểm trước khi chuyển đã đóng băng).
    expect(screen.getByRole('link', { name: /Soạn tờ khai thuế/ }).getAttribute('href')).toBe('/dashboard/to-khai');
  });

  it('đóng băng đợt 2: kiểm soát chi của agent, giấy tờ, đăng ký kinh doanh, trang công khai về agent', () => {
    // 20/11/2026: /dashboard/kiem-truoc-khi-chuyen mở lại cho Quầy Tin ("Soát trước khi chi").
    expect(daDongBang('/dashboard/kiem-truoc-khi-chuyen')).toBe(false);
    for (const d of ['/dashboard/tac-tu', '/dashboard/chinh-sach', '/dashboard/giay-to',
      '/dashboard/dang-ky-kinh-doanh', '/tri-tue-nhan-tao', '/khao-sat-gia', '/kham-pha/agent-ai', '/san-pham/mcp-api',
      '/giai-phap/phan-mem-ai']) {
      expect(daDongBang(d), d).toBe(true);
    }
    // Truy vấn và mốc không cứu được trang đã đóng băng.
    expect(daDongBang('/dashboard/tac-tu?tab=yeu-cau')).toBe(true);
    expect(daDongBang('/dashboard/chinh-sach/')).toBe(true);
    // Việc ra tiền vẫn mở.
    for (const d of ['/dashboard/to-khai', '/pos', '/dashboard/vay-von', '/dashboard/doanh-thu-xac-minh', '/dashboard/van-phong',
      '/dashboard/fintech', '/dashboard/doc-bao-cao', '/san-pham/khai-thue-ho-kinh-doanh']) {
      expect(daDongBang(d), d).toBe(false);
    }
  });

  it('trang đóng băng hiện tên và lý do riêng', () => {
    render(<MemoryRouter initialEntries={['/dashboard/tac-tu']}><TamDungPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Kiểm soát agent đang tạm dừng' })).toBeTruthy();
  });

  it('danh mục công cụ không còn công cụ đóng băng; trang đóng băng được nhận ra', () => {
    for (const k of CONG_CU_DONG_BANG) expect(DANH_MUC_CONG_CU.some((c) => c.khoa === k), k).toBe(false);
    expect(daDongBang('/dashboard/clients')).toBe(true);
    expect(daDongBang('/dashboard/chi-phi-ai')).toBe(true);
    for (const k of ['chi_phi_ai', 'model_re_hon']) expect(CONG_CU_DONG_BANG.has(k), k).toBe(true);
    for (const k of ['kiem_truoc_khi_chuyen', 'kiem_soat_agent', 'chinh_sach_chi', 'soan_giay_to', 'dang_ky_kinh_doanh']) {
      expect(CONG_CU_DONG_BANG.has(k), k).toBe(true);
    }
  });
});
