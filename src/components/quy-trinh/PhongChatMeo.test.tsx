import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const gia = vi.hoisted(() => ({ ds: vi.fn(), tin: vi.fn(), gui: vi.fn(), tv: vi.fn(), mau: vi.fn() }));
vi.mock('@/lib/goiChatMeo', () => ({ meoDs: gia.ds, meoTin: gia.tin, meoGui: gia.gui }));
vi.mock('@/lib/goiQuyTrinh', () => ({ thuVien: gia.tv, taoTuMau: gia.mau }));

import PhongChatMeo from './PhongChatMeo';

const MEO = ['phan_loai', 'thue', 'dong_tien', 'ho_so', 'bao_ve', 'doi_soat', 'cong_no', 'mua_hang', 'luong', 'tuan_thu', 'bao_cao', 'thu_ky'];
const TEN: Record<string, string> = { phan_loai: 'Mèo Phân loại', thue: 'Mèo Thuế', dong_tien: 'Mèo Dòng tiền', ho_so: 'Mèo Hồ sơ', bao_ve: 'Mèo Bảo vệ', doi_soat: 'Mèo Đối soát',
  cong_no: 'Mèo Công nợ', mua_hang: 'Mèo Mua hàng', luong: 'Mèo Lương', tuan_thu: 'Mèo Tuân thủ', bao_cao: 'Mèo Báo cáo', thu_ky: 'Mèo Thư ký' };
const NL = (m: string) => (m === 'luong' ? { loai: 'tu_van', that: 'Tư vấn lương, bảo hiểm.', thieu: 'Chưa có dữ liệu chấm công: cần kết nối HRM.', mau: ['tra_luong'] } : { loai: 'du_lieu', that: 'Đọc dữ liệu thật.', thieu: null, mau: ['dong_so_thang'] });
const ds = MEO.map((m) => ({ meo: m, ten: TEN[m], viec: `việc của ${m}`, nang_luc: NL(m), tin_cuoi: m === 'thue' ? { vai: 'meo', noi_dung: 'Hạn khai quý 4 còn 70 ngày ạ', luc: '2026-11-23T03:00:00Z' } : null }));
const ve = (onMo = vi.fn()) => render(<PhongChatMeo companyId="c1" nhom={[{ id: 'q1', tieu_de: 'Thanh toán nhà cung cấp (P2P)' }]} onMoNhom={onMo} />);

describe('phòng trò chuyện kiểu Zalo', () => {
  beforeEach(() => { Object.values(gia).forEach((f) => f.mockReset()); gia.ds.mockResolvedValue(ds); gia.tin.mockResolvedValue([]); gia.tv.mockResolvedValue([{ khoa: 'tra_luong', tieu_de: 'Trả lương tháng' }, { khoa: 'dong_so_thang', tieu_de: 'Đóng sổ cuối tháng' }]); });

  it('danh bạ có 12 mèo + nhóm workflow; tin cuối hiện làm xem trước; tìm lọc được', async () => {
    ve();
    const dm = await screen.findByRole('region', { name: 'Mèo agent' });
    expect(within(dm).getAllByRole('button')).toHaveLength(12);
    expect(within(dm).getByText('Hạn khai quý 4 còn 70 ngày ạ')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Nhóm workflow' })).getByText('Thanh toán nhà cung cấp (P2P)')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Tìm mèo'), { target: { value: 'thuế' } });
    expect(within(screen.getByRole('region', { name: 'Mèo agent' })).getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('region', { name: 'Nhóm workflow' })).toBeNull();
  });

  it('chọn mèo → nhắn → hiện tin mình ngay, rồi câu trả lời của mèo; gợi ý bấm là gửi', async () => {
    gia.gui.mockResolvedValue({ nguoi: { id: 1, vai: 'nguoi', noi_dung: 'Hạn thuế khi nào?', luc: '2026-11-23T03:00:00Z' }, tra_loi: { id: 2, vai: 'meo', noi_dung: 'Dạ, còn 70 ngày ạ.', luc: '2026-11-23T03:00:01Z' } });
    ve();
    fireEvent.click(await screen.findByRole('button', { name: /Mèo Thuế/ }));
    const cuocTro = screen.getByRole('region', { name: 'Cuộc trò chuyện' });
    fireEvent.change(within(cuocTro).getByLabelText('Nhắn Mèo Thuế'), { target: { value: 'Hạn thuế khi nào?' } });
    fireEvent.click(within(cuocTro).getByRole('button', { name: 'Gửi' }));
    expect(await within(cuocTro).findByText('Hạn thuế khi nào?')).toBeTruthy();
    expect(await within(cuocTro).findByText('Dạ, còn 70 ngày ạ.')).toBeTruthy();
    expect(gia.gui).toHaveBeenCalledWith('c1', 'thue', 'Hạn thuế khi nào?');
    expect(within(cuocTro).getAllByRole('img', { name: /Mèo Thuế/ }).length).toBeGreaterThan(0);
  });

  it('lỗi gửi: bỏ tin tạm, trả chữ về ô nhập, hiện lỗi', async () => {
    gia.gui.mockRejectedValue(new Error('Bạn thao tác hơi nhanh. Đợi một phút rồi thử lại.'));
    ve();
    fireEvent.click(await screen.findByRole('button', { name: /Mèo Đối soát/ }));
    const o = screen.getByLabelText('Nhắn Mèo Đối soát');
    fireEvent.change(o, { target: { value: 'Khớp sổ giúp mình' } });
    fireEvent.keyDown(o, { key: 'Enter' });
    expect((await screen.findByRole('alert')).textContent).toMatch(/thao tác hơi nhanh/);
    await waitFor(() => expect((screen.getByLabelText('Nhắn Mèo Đối soát') as HTMLTextAreaElement).value).toBe('Khớp sổ giúp mình'));
    expect(screen.queryByText('Khớp sổ giúp mình', { selector: 'p' })).toBeNull();
  });

  it('bấm nhóm workflow → mở workflow đó (cùng trang)', async () => {
    const mo = vi.fn();
    ve(mo);
    fireEvent.click(await screen.findByRole('button', { name: /Thanh toán nhà cung cấp/ }));
    expect(mo).toHaveBeenCalledWith('q1');
  });

  it('mỗi mèo khai năng lực thật: có dữ liệu → huy hiệu xanh; chưa có → "Tư vấn" + nói rõ chưa làm được gì', async () => {
    ve();
    fireEvent.click(await screen.findByRole('button', { name: /Mèo Phân loại/ }));
    let nl = screen.getByTestId('nang-luc');
    expect(within(nl).getByText('Có dữ liệu thật')).toBeTruthy();
    expect(within(nl).queryByText(/Chưa làm được/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Mèo Lương/ }));
    nl = screen.getByTestId('nang-luc');
    expect(within(nl).getByText('Tư vấn theo kiến thức nghề')).toBeTruthy();
    expect(within(nl).getByText(/Nâng cấp tuỳ chọn: Chưa có dữ liệu chấm công/)).toBeTruthy();
    expect(within(nl).queryByText(/Chưa làm được/)).toBeNull();
  });

  it('kiểu Zalo: ghim mèo → tab Đã ghim chỉ còn mèo đó; trả lời trích dẫn gửi kèm câu gốc; thả cảm xúc', async () => {
    localStorage.clear();
    gia.tin.mockResolvedValue([{ id: 7, vai: 'meo', noi_dung: 'Còn 70 ngày ạ.', luc: '2026-11-23T03:00:00Z' }]);
    gia.gui.mockResolvedValue({ nguoi: { id: 8, vai: 'nguoi', noi_dung: '↩ "Còn 70 ngày ạ."\nVậy nộp ngày nào?', luc: '2026-11-23T03:01:00Z' }, tra_loi: { id: 9, vai: 'meo', noi_dung: 'Trước ngày 30.', luc: '2026-11-23T03:01:02Z' } });
    ve();
    fireEvent.click(await screen.findByRole('button', { name: /Mèo Thuế/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ghim mèo' }));
    fireEvent.click(screen.getByRole('tab', { name: /Đã ghim/ }));
    expect(within(screen.getByRole('region', { name: 'Mèo agent' })).getAllByRole('button')).toHaveLength(1);
    const cuocTro = screen.getByRole('region', { name: 'Cuộc trò chuyện' });
    fireEvent.click(await within(cuocTro).findByRole('button', { name: 'Thả 👍' }));
    expect(within(cuocTro).getByLabelText('Cảm xúc 👍')).toBeTruthy();
    fireEvent.click(within(cuocTro).getByRole('button', { name: 'Trả lời tin này' }));
    fireEvent.change(within(cuocTro).getByLabelText('Nhắn Mèo Thuế'), { target: { value: 'Vậy nộp ngày nào?' } });
    fireEvent.click(within(cuocTro).getByRole('button', { name: 'Gửi' }));
    await waitFor(() => expect(gia.gui).toHaveBeenCalledWith('c1', 'thue', '↩ "Còn 70 ngày ạ."\nVậy nộp ngày nào?'));
    expect(await within(cuocTro).findByText('Trước ngày 30.')).toBeTruthy();
  });

  it('có nút Gọi mở màn gọi thoại và cúp máy đóng lại', async () => {
    ve();
    fireEvent.click(await screen.findByRole('button', { name: /Mèo Thuế/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Gọi Mèo Thuế' }));
    expect(await screen.findByRole('dialog', { name: 'Cuộc gọi với Mèo Thuế' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cúp máy' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cuộc gọi với Mèo Thuế' })).toBeNull());
  });

  it('nút "Giao việc" dựng đúng workflow thuộc nghề của mèo và mở nó (cùng trang)', async () => {
    gia.mau.mockResolvedValue('q-moi');
    const mo = vi.fn();
    ve(mo);
    fireEvent.click(await screen.findByRole('button', { name: /Mèo Lương/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Giao việc: Trả lương tháng' }));
    await waitFor(() => expect(gia.mau).toHaveBeenCalledWith('c1', 'tra_luong'));
    await waitFor(() => expect(mo).toHaveBeenCalledWith('q-moi'));
  });
});
