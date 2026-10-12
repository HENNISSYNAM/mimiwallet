import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BoHoSoNop, hangSoLieu, type BoHoSoNopProps } from './BoHoSoNop';
import { CONG, huongDanCoQuan } from '../../../supabase/functions/_shared/co-quan/danh-ba';

const P: BoHoSoNopProps = {
  mau: '05/KK-TNCN', kyChu: 'Quý III/2026', hanNop: '2026-10-31', loai: 'doanh_nghiep',
  congTy: { ten: 'Công ty Thử', mst: '0123456789' },
  chiTieu: [{ ma: '[16]', nhan: 'Tổng số người lao động', gia_tri: 3, don_vi: 'Người' }, { ma: '[42]', nhan: 'Tổng số thuế TNCN đã khấu trừ', gia_tri: 1_234_567, don_vi: 'VNĐ' }],
  canCu: ['Thông tư 89/2026/TT-BTC · Phụ lục I'],
};

describe('bộ hồ sơ nộp', () => {
  it('bảng số liệu: đầu hồ sơ, từng chỉ tiêu, căn cứ — một nguồn cho .xlsx và bản in', () => {
    const h = hangSoLieu(P);
    expect(h).toContainEqual(['Mã số thuế', '0123456789']);
    expect(h).toContainEqual(['Hạn nộp', '31/10/2026']);
    expect(h).toContainEqual(['[42]', 'Tổng số thuế TNCN đã khấu trừ', 1_234_567, 'VNĐ']);
    expect(h.at(-1)).toEqual(['Thông tư 89/2026/TT-BTC · Phụ lục I']);
  });
  it('doanh nghiệp được dẫn tới thuế điện tử (cần chữ ký số); hộ kinh doanh tới cổng cá nhân (OTP)', () => {
    expect(huongDanCoQuan('nop_to_khai', 'doanh_nghiep').cong[0]).toBe(CONG.thue_dien_tu);
    expect(huongDanCoQuan('nop_to_khai', 'ho_kinh_doanh').cong[0]).toBe(CONG.thue_ca_nhan);
    expect(huongDanCoQuan('nop_to_khai', 'doanh_nghiep').truoc.join(' ')).toMatch(/chữ ký số/);
    expect(huongDanCoQuan('nop_to_khai', 'ho_kinh_doanh').truoc.join(' ')).toMatch(/OTP/);
  });
  it('mọi cổng đều https trên tên miền .gov.vn', () => {
    for (const c of Object.values(CONG)) expect(c.url).toMatch(/^https:\/\/[a-z0-9.-]+\.gov\.vn(\/|$)/);
  });
  it('hiện hạn, đúng cổng, và nói rõ MIMI không ký/nộp thay', () => {
    render(<BoHoSoNop {...P} />);
    expect(screen.getByText('31/10/2026')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Thuế điện tử \(eTax\)/ }).getAttribute('href')).toBe('https://thuedientu.gdt.gov.vn');
    expect(screen.getByRole('button', { name: /Tải bảng số liệu/ })).toBeTruthy();
    expect(document.body.textContent).toMatch(/MIMI không ký, không nộp/);
  });
});
