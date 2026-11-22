import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const gia = vi.hoisted(() => ({
  ds: vi.fn(), tao: vi.fn(), thuHoi: vi.fn(),
}));
vi.mock('@/lib/goiVanPhong', () => ({
  DIA_CHI_MCP: 'https://x.supabase.co/functions/v1/mcp',
  dsKhoaMcp: gia.ds, taoKhoaMcp: gia.tao, thuHoiKhoaMcp: gia.thuHoi,
}));

import KetNoiMcp, { cauHinhJson, lenhClaudeCode } from './KetNoiMcp';

const KHOA = { id: 'k1', ten: 'Claude của Lan', hien: 'mimi_ak_abcd…', tao_luc: '2026-11-22T02:00:00Z', dung_lan_cuoi: null };

describe('Kết nối agent (MCP) trên văn phòng', () => {
  beforeEach(() => { gia.ds.mockReset(); gia.tao.mockReset(); gia.thuHoi.mockReset(); });

  it('tạo khoá: gọi máy chủ, hiện khoá một lần kèm cấu hình, ẩn được', async () => {
    gia.ds.mockResolvedValueOnce([]).mockResolvedValue([KHOA]);
    gia.tao.mockResolvedValue({ khoa_moi: 'mimi_ak_khoamoi', khoa: KHOA });
    render(<KetNoiMcp n="vi" />);
    await screen.findByText('Chưa có khoá nào.');
    fireEvent.change(screen.getByPlaceholderText(/Claude của chị Lan/), { target: { value: 'Claude của Lan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo khoá' }));
    await waitFor(() => expect(gia.tao).toHaveBeenCalledWith('Claude của Lan'));
    const hop = await screen.findByTestId('khoa-moi');
    expect(hop.textContent).toContain('mimi_ak_khoamoi');
    expect(hop.textContent).toContain('claude mcp add --transport http mimi https://x.supabase.co/functions/v1/mcp');
    await screen.findByText(/mimi_ak_abcd/);
    fireEvent.click(screen.getByRole('button', { name: /ẩn khoá/ }));
    expect(screen.queryByTestId('khoa-moi')).toBeNull();
  });

  it('thu hồi cần xác nhận; huỷ thì không gọi', async () => {
    gia.ds.mockResolvedValue([KHOA]);
    gia.thuHoi.mockResolvedValue(undefined);
    const xn = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<KetNoiMcp n="vi" />);
    const nut = await screen.findByRole('button', { name: 'Thu hồi' });
    fireEvent.click(nut);
    expect(gia.thuHoi).not.toHaveBeenCalled();
    fireEvent.click(nut);
    await waitFor(() => expect(gia.thuHoi).toHaveBeenCalledWith('k1'));
    xn.mockRestore();
  });

  it('lỗi máy chủ hiện ra, không im lặng', async () => {
    gia.ds.mockRejectedValue(new Error('Phiên đăng nhập đã hết. Đăng nhập lại.'));
    render(<KetNoiMcp n="vi" />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/Đăng nhập lại/);
  });

  it('cấu hình gửi khoá qua header x-mimi-key', () => {
    expect(lenhClaudeCode('K')).toContain('--header "x-mimi-key: K"');
    expect(JSON.parse(cauHinhJson('K')).mcpServers.mimi).toEqual({ type: 'http', url: 'https://x.supabase.co/functions/v1/mcp', headers: { 'x-mimi-key': 'K' } });
  });
});
