import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ChiPhiTheoQuyTrinh from './ChiPhiTheoQuyTrinh';
import type { DongChiPhiAi } from '@/lib/chiPhiAi';

/** MIMI-P1-006 — chi phí theo quy trình. Dữ liệu dưới đây là đầu vào của test. */

const dong = (du_an: string, so_tien_usd: number, ngay = '2026-09-10'): DongChiPhiAi =>
  ({ nha_cung_cap: 'openai', ngay, hang_muc: 'gpt-4o', du_an, so_tien_usd, nguon: 'api' });

const CHI = [dong('proj-chatbot', 40), dong('proj-ocr', 10), dong('Dự án mặc định', 5)];
const QT = [{ id: 'q1', ten: 'Chatbot chăm sóc khách', don_vi_ket_qua: 'cuộc trò chuyện', khop_du_an: ['proj-chatbot'] }];

describe('Chi phí theo quy trình', () => {
  it('chưa có quy trình: giải thích vì sao cần — chi phí mỗi việc, không phải giá token', () => {
    render(<ChiPhiTheoQuyTrinh chiPhi={CHI} quyTrinh={[]} ketQua={[]} goi={vi.fn()} dangLam={null} />);
    expect(document.body.textContent).toContain('không phải giá token');
  });

  it('có số việc: hiện chi phí mỗi việc thành công và tỷ lệ; tiền chưa gán hiện riêng', () => {
    render(<ChiPhiTheoQuyTrinh chiPhi={CHI} quyTrinh={QT} ketQua={[{ quy_trinh_id: 'q1', ky: '2026-09', so_thanh_cong: 800, so_that_bai: 200 }]} goi={vi.fn()} dangLam={null} />);
    const bang = screen.getByRole('table', { name: 'Chi phí theo quy trình' });
    const hang = within(bang).getByText('Chatbot chăm sóc khách').closest('tr')!;
    expect(hang.textContent).toContain('$40.00');
    expect(hang.textContent).toContain('80%');
    expect(hang.textContent).toContain('$0.05');
    const chuaGan = within(bang).getByText('Chưa gán quy trình').closest('tr')!;
    expect(chuaGan.textContent).toContain('$15.00');
    expect(chuaGan.textContent).toContain('proj-ocr');
  });

  it('chưa nhập số việc: hiện "—", không bịa chi phí mỗi việc', () => {
    render(<ChiPhiTheoQuyTrinh chiPhi={CHI} quyTrinh={QT} ketQua={[]} goi={vi.fn()} dangLam={null} />);
    const hang = screen.getByText('Chatbot chăm sóc khách').closest('tr')!;
    expect(hang.textContent).not.toContain('$0.05');
    expect(hang.textContent).toContain('—');
  });

  it('nhập số việc: gửi đúng quy trình, tháng, số thành công và thất bại', async () => {
    const goi = vi.fn().mockResolvedValue({ ok: true });
    render(<ChiPhiTheoQuyTrinh chiPhi={CHI} quyTrinh={QT} ketQua={[]} goi={goi} dangLam={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Nhập số việc' }));
    fireEvent.change(screen.getByLabelText('Thành công'), { target: { value: '750' } });
    fireEvent.change(screen.getByLabelText('Thất bại'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(goi).toHaveBeenCalledWith('ket_qua', 'ket_qua_luu', { quy_trinh_id: 'q1', ky: '2026-09', so_thanh_cong: 750, so_that_bai: 50 }, 'Đã lưu số việc.'));
  });

  it('tạo quy trình: project đã thuộc quy trình khác bị khoá, không chọn được lần hai', () => {
    render(<ChiPhiTheoQuyTrinh chiPhi={CHI} quyTrinh={QT} ketQua={[]} goi={vi.fn()} dangLam={null} />);
    fireEvent.click(screen.getByRole('button', { name: /Quy trình/ }));
    const hop = screen.getByRole('dialog');
    const dsO = within(hop).getAllByRole('checkbox') as HTMLInputElement[];
    const chatbot = dsO.find((o) => o.parentElement?.textContent?.startsWith('proj-chatbot'))!;
    expect(chatbot.disabled).toBe(true);
    expect(within(hop).getByText('(đã thuộc quy trình khác)')).toBeTruthy();
  });
});
