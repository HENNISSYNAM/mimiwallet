import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PosPage from './PosPage';

/**
 * Màn POS dựng với edge function giả: bàn phím ra đúng số, tiền mặt vào màn "Đã thu", chuyển khoản hiện
 * VietQR rồi sang "Đã thu" khi máy chủ báo tiền về, mất mạng thì tiền mặt xếp hàng trên máy.
 */
const gia = vi.hoisted(() => ({ goiPos: vi.fn(), toCanvas: vi.fn() }));
vi.mock('@/lib/pos/goiPos', () => ({ goiPos: gia.goiPos }));
vi.mock('qrcode', () => ({ default: { toCanvas: gia.toCanvas } }));
vi.mock('@/lib/congTyDangDung', () => ({ idCongTyDangDung: () => Promise.resolve('cty-1') }));

const CAU_HINH = {
  cong_ty: { id: 'cty-1', ten: 'Quán Phở Cô Ba' },
  vai_tro: 'chu_so_huu',
  quyen: { xac_nhan_tay: true, sua_san_pham: true },
  tai_khoan_nhan: { account_number: '0123456789', account_name: 'NGUYEN THI BA', bank_name: 'MB Bank', bin: '970422', tu_dong_khop: true },
  san_pham: [{ ten: 'Phở bò', gia: 45000 }],
  ngay: '2026-11-10',
  tong_hop: { so_lan: 0, tong: 0, dang_cho: 0, tien_mat: { so_lan: 0, tong: 0 }, chuyen_khoan: { so_lan: 0, tong: 0 } },
  ban: [],
};
const banTu = (o: Record<string, unknown>) => ({ id: 'b1', client_id: 'x', amount: 35000, method: 'cash', reference: 'MIMIK7P2QX', status: 'paid', note: null, items: [], sold_at: '2026-11-10T03:00:00Z', created_at: '2026-11-10T03:00:00Z', ...o });

const dung = () => render(<MemoryRouter initialEntries={['/pos']}><PosPage /></MemoryRouter>);
const bam = (nhan: string) => fireEvent.click(screen.getByRole('button', { name: nhan }));

beforeEach(() => {
  localStorage.clear();
  gia.goiPos.mockReset();
  gia.toCanvas.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});

describe('màn bán tại quầy', () => {
  it('bàn phím: 3, 5, 000 → 35.000 ₫; nút Thu tiền chỉ bật khi có số; nút đủ lớn để bấm bằng tay', async () => {
    gia.goiPos.mockImplementation(async (h: string) => (h === 'cau_hinh' ? CAU_HINH : {}));
    dung();
    await screen.findByText('Quán Phở Cô Ba');
    expect(screen.getByRole('button', { name: /^Thu tiền/ })).toBeDisabled();
    bam('3'); bam('5'); bam('000');
    expect(screen.getByTestId('so-tien')).toHaveTextContent('35.000 ₫');
    const thu = screen.getByRole('button', { name: /^Thu tiền/ });
    expect(thu).toBeEnabled();
    // Mọi nút trên bàn phím có chiều cao tối thiểu ≥ 48px.
    for (const p of ['1', '0', '000']) expect(screen.getByRole('button', { name: p }).className).toMatch(/min-h-\[(6[4-9]|[7-9]\d)px\]/);
    bam('Xoá');
    expect(screen.getByTestId('so-tien')).toHaveTextContent('3.500 ₫');
  });

  it('chọn món nhanh cộng tiền; tiền mặt → màn "Đã thu" và gửi đúng yêu cầu', async () => {
    gia.goiPos.mockImplementation(async (h: string, du: Record<string, unknown>) => {
      if (h === 'cau_hinh') return CAU_HINH;
      if (h === 'tao_ban') return { ban: banTu({ amount: du.so_tien, items: du.dong_hang }) };
      return { tong_hop: CAU_HINH.tong_hop, ban: [], ngay: '2026-11-10' };
    });
    dung();
    fireEvent.click(await screen.findByRole('button', { name: /Phở bò/ }));
    fireEvent.click(screen.getByRole('button', { name: /Phở bò/ }));
    expect(screen.getByTestId('so-tien')).toHaveTextContent('90.000 ₫');
    fireEvent.click(screen.getByRole('button', { name: /^Thu tiền/ }));
    fireEvent.click(screen.getByRole('button', { name: /^💵/ }));
    expect(await screen.findByTestId('man-da-thu')).toHaveTextContent('Đã thu tiền');
    const goi = gia.goiPos.mock.calls.find((c) => c[0] === 'tao_ban')!;
    expect(goi[1]).toMatchObject({ so_tien: 90000, phuong_thuc: 'cash', dong_hang: [{ ten: 'Phở bò', so_luong: 2, don_gia: 45000 }] });
    expect(goi[1].client_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('chuyển khoản: hiện VietQR với mã tham chiếu, máy chủ báo tiền về → màn "Đã thu"', async () => {
    let lanHoi = 0;
    gia.goiPos.mockImplementation(async (h: string) => {
      if (h === 'cau_hinh') return CAU_HINH;
      if (h === 'tao_ban') return { ban: banTu({ method: 'transfer', status: 'pending', amount: 120000 }), tai_khoan_nhan: CAU_HINH.tai_khoan_nhan };
      if (h === 'trang_thai') return { ban: banTu({ method: 'transfer', amount: 120000, status: ++lanHoi >= 1 ? 'paid' : 'pending', paid_basis: 'bank_match' }) };
      return { tong_hop: CAU_HINH.tong_hop, ban: [], ngay: '2026-11-10' };
    });
    dung();
    await screen.findByText('Quán Phở Cô Ba');
    bam('1'); bam('2'); bam('0'); bam('000');
    fireEvent.click(screen.getByRole('button', { name: /^Thu tiền/ }));
    fireEvent.click(screen.getByRole('button', { name: /^🏦/ }));
    expect(await screen.findByTestId('ma-vietqr')).toBeInTheDocument();
    expect(screen.getByText('MIMIK7P2QX')).toBeInTheDocument();
    await waitFor(() => expect(gia.toCanvas).toHaveBeenCalled());
    const chuoi = gia.toCanvas.mock.calls[0][1] as string;
    expect(chuoi).toContain('0006970422');
    expect(chuoi).toContain('MIMIK7P2QX');
    expect(chuoi).toContain('5406120000');
    expect(await screen.findByTestId('man-da-thu', {}, { timeout: 8000 })).toHaveTextContent('Đã thu tiền');
  });

  it('mất mạng: chuyển khoản bị khoá và nói rõ cần mạng; tiền mặt vẫn bán, lưu trên máy', async () => {
    gia.goiPos.mockImplementation(async (h: string) => (h === 'cau_hinh' ? CAU_HINH : {}));
    dung();
    await screen.findByText('Quán Phở Cô Ba');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    fireEvent(window, new Event('offline'));
    expect(await screen.findByTestId('trang-thai-mang')).toHaveTextContent('Mất mạng');
    bam('5'); bam('000');
    fireEvent.click(screen.getByRole('button', { name: /^Thu tiền/ }));
    expect(screen.getByRole('button', { name: /^🏦/ })).toBeDisabled();
    expect(screen.getByText('Chuyển khoản cần có mạng')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^💵/ }));
    expect(await screen.findByTestId('man-da-thu')).toHaveTextContent('Đã lưu trên máy');
    const hang = JSON.parse(localStorage.getItem('mimi:pos:hang-doi') ?? '[]');
    expect(hang).toHaveLength(1);
    expect(hang[0]).toMatchObject({ so_tien: 5000, phuong_thuc: 'cash', company_id: 'cty-1' });
    expect(gia.goiPos.mock.calls.some((c) => c[0] === 'tao_ban')).toBe(false);
  });

  it('máy chủ từ chối vai trò (Người xem): hiện câu từ chối, không vào quầy', async () => {
    gia.goiPos.mockRejectedValue(new Error('Vai trò Người xem không thu tiền được. Nhờ chủ doanh nghiệp đổi vai trò cho bạn.'));
    dung();
    expect(await screen.findByText(/Người xem không thu tiền được/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });
});
