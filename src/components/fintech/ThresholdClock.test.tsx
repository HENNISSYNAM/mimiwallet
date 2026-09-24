import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GiaiThichUocTinh } from './ThresholdClock';

describe('GiaiThichUocTinh — con số ước tính nói nó ước tính tới đâu', () => {
  it('nói phần chưa ai xác nhận đang được tạm tính là doanh thu, và mời xác nhận', () => {
    render(<GiaiThichUocTinh data={{ unclassifiedAmount: 120_000_000, unclassifiedCount: 34, excludedByPerson: 0, coverage: 0.62 }} />);
    expect(screen.getByText(/Đã giải thích 62% giá trị tiền vào/)).toBeTruthy();
    expect(screen.getByText(/120 triệu \(34 khoản\) chưa ai xác nhận/)).toBeTruthy();
    expect(screen.getByText(/không tự trừ/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Xác nhận' }).getAttribute('href')).toBe('#tien-vao');
  });

  it('nói rõ đã trừ bao nhiêu theo xác nhận của người dùng', () => {
    render(<GiaiThichUocTinh data={{ unclassifiedAmount: 0, excludedByPerson: 200_000_000, coverage: 1 }} />);
    expect(screen.getByText(/Đã trừ 200 triệu bạn xác nhận không phải doanh thu/)).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Xác nhận' })).toBeNull();
  });

  it('không làm tròn lên thành 100% khi còn khoản chưa giải thích', () => {
    render(<GiaiThichUocTinh data={{ unclassifiedAmount: 1_000, unclassifiedCount: 1, coverage: 0.9996 }} />);
    expect(screen.getByText(/Đã giải thích 99%/)).toBeTruthy();
  });

  it('máy chủ cũ không gửi các trường mới thì không hiện gì', () => {
    const { container } = render(<GiaiThichUocTinh data={{}} />);
    expect(container.textContent).toBe('');
  });
});
