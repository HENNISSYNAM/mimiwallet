import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const gia = vi.hoisted(() => ({ ct: vi.fn() }));
vi.mock('@/lib/congTyDangDung', () => ({ congTyDangDung: gia.ct, SU_KIEN_DOI_CONG_TY: 'doi' }));

import { NhanMinhHoa } from './NhanMinhHoa';

describe('nhãn cửa hàng minh hoạ', () => {
  it('công ty demo: nói rõ là dữ liệu mẫu', async () => {
    gia.ct.mockResolvedValue({ id: 'c', ten: 'X', vai_tro: 'chu_so_huu', la_demo: true });
    render(<NhanMinhHoa />);
    expect(await screen.findByText('Cửa hàng minh hoạ.')).toBeTruthy();
  });

  it('công ty thật: không hiện gì', async () => {
    gia.ct.mockResolvedValue({ id: 'c', ten: 'X', vai_tro: 'chu_so_huu', la_demo: false });
    const { container } = render(<NhanMinhHoa />);
    await new Promise((r) => setTimeout(r, 20));
    expect(container.textContent).toBe('');
  });
});
