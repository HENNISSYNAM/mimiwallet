import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { boDauSao, ChuDam } from './chuDam';

describe('chữ đậm trong câu trả lời', () => {
  it('cặp ** thành chữ đậm, không còn dấu sao', () => {
    const { container } = render(<p><ChuDam van={'Trần **20.000.000 ₫** mỗi tháng'} /></p>);
    expect(container.textContent).toBe('Trần 20.000.000 ₫ mỗi tháng');
    expect(container.querySelector('strong')?.textContent).toBe('20.000.000 ₫');
  });
  it('không dựng HTML từ chữ của mô hình', () => {
    const { container } = render(<p><ChuDam van={'**<img src=x onerror=alert(1)>**'} /></p>);
    expect(container.querySelector('img')).toBeNull();
  });
  it('giọng đọc bỏ dấu sao, dấu sao lẻ giữ nguyên', () => {
    expect(boDauSao('**A** và 5 * 3')).toBe('A và 5 * 3');
  });
});
