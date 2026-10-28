import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DauChanCarbon } from './DauChanCarbon';
import type { ChiSoCarbon } from '../../../supabase/functions/_shared/carbon/uoc-tinh.ts';

const C = (sua: Partial<ChiSoCarbon> = {}): ChiSoCarbon => ({
  co_so_lieu: true, thang: '2026-10', kg_thang_nay: 1530, kg_thang_truoc: 1200,
  kg_moi_trieu: 40, kg_moi_trieu_thang_truoc: 50,
  nhom: [{ khoa: 'dien', kg: 1200, so_tien: 3.9e6, so_khoan: 1 }, { khoa: 'xang_dau', kg: 330, so_tien: 2.8e7, so_khoan: 4 }],
  ty_le_phu: 0.42, ...sua,
});

describe('DauChanCarbon', () => {
  it('không có khoản chi nào: không hiện gì', () => {
    const { container } = render(<DauChanCarbon c={C({ co_so_lieu: false })} />);
    expect(container).toBeEmptyDOMElement();
    expect(render(<DauChanCarbon c={undefined} />).container).toBeEmptyDOMElement();
  });
  it('nút nhỏ hiện số tháng này; bấm mở ra nhóm, độ phủ và lời "ước tính"', () => {
    render(<DauChanCarbon c={C()} />);
    const nut = screen.getByRole('button');
    expect(nut.textContent).toMatch(/1[.,]5 t/);
    fireEvent.click(nut);
    expect(screen.getAllByText(/1[.,]5 t/).length).toBeGreaterThan(1);
    expect(screen.getByText(/42%/)).toBeInTheDocument();
    expect(screen.getByText(/↓ 20%/)).toBeInTheDocument();
    expect(screen.getByText(/US EPA v1\.3/)).toBeInTheDocument();
  });
});
