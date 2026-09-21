import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThanhVienCongTy } from './ThanhVienCongTy';

/** Màn Thành viên. Dữ liệu dưới đây là đầu vào của test. */

const gia = vi.hoisted(() => ({
  goi: vi.fn(),
  chon: vi.fn(),
  dsCongTy: [] as { id: string; ten: string | null; vai_tro: string }[],
  loi: vi.fn(),
  ok: vi.fn(),
}));
vi.mock('@/lib/goiCongTy', () => ({ goiCongTy: gia.goi }));
vi.mock('@/lib/congTyDangDung', () => ({
  danhSachCongTyCuaToi: () => Promise.resolve({ ds: gia.dsCongTy, dangDung: gia.dsCongTy[0] ?? null }),
  chonCongTy: gia.chon,
  lamMoiCongTy: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: gia.ok, error: gia.loi } }));

const TV = [
  { user_id: 'u-chu', vai_tro: 'chu_so_huu', email: 'chu@thinhphat.vn', la_toi: false },
  { user_id: 'u-qt', vai_tro: 'quan_tri', email: 'qt@thinhphat.vn', la_toi: false },
  { user_id: 'u-kt', vai_tro: 'ke_toan', email: 'kt@thinhphat.vn', la_toi: false },
];

function nhu(vai: string, toi: string) {
  gia.goi.mockImplementation((hd: string) => {
    if (hd === 'thanh_vien') {
      return Promise.resolve({ vai_tro_cua_toi: vai, thanh_vien: TV.map((t) => ({ ...t, la_toi: t.user_id === toi })) });
    }
    return Promise.resolve({ ok: true });
  });
}

const cho = () => screen.findByRole('list', { name: 'Thành viên' });
const dong = (email: string) => within(screen.getByRole('list', { name: 'Thành viên' })).getByText(email, { exact: false }).closest('li') as HTMLElement;

beforeEach(() => {
  gia.goi.mockReset();
  gia.chon.mockReset();
  gia.loi.mockReset();
  gia.ok.mockReset();
  gia.dsCongTy = [{ id: 'cty-A', ten: 'Thịnh Phát', vai_tro: 'chu_so_huu' }];
});

describe('Thành viên công ty', () => {
  it('chủ sở hữu: đổi/gỡ được người khác, không đổi được chính mình; mời được mọi vai trò', async () => {
    nhu('chu_so_huu', 'u-chu');
    render(<ThanhVienCongTy />);
    await cho();
    expect(within(dong('chu@thinhphat.vn')).queryByRole('combobox')).toBeNull();
    expect(within(dong('chu@thinhphat.vn')).getByText('(bạn)')).toBeTruthy();
    expect(within(dong('qt@thinhphat.vn')).getByRole('combobox')).toBeTruthy();
    const moi = screen.getByRole('combobox', { name: 'Vai trò người được thêm' });
    expect(within(moi).getAllByRole('option').map((o) => o.textContent)).toContain('Chủ doanh nghiệp');
  });

  it('quản trị: không đụng được chủ sở hữu hay quản trị, không trao vai trò cao', async () => {
    nhu('quan_tri', 'u-qt');
    render(<ThanhVienCongTy />);
    await cho();
    expect(within(dong('chu@thinhphat.vn')).queryByRole('button', { name: 'Gỡ' })).toBeNull();
    expect(within(dong('kt@thinhphat.vn')).getByRole('button', { name: 'Gỡ' })).toBeTruthy();
    const moi = screen.getByRole('combobox', { name: 'Vai trò người được thêm' });
    const vai = within(moi).getAllByRole('option').map((o) => o.textContent);
    expect(vai).not.toContain('Chủ doanh nghiệp');
    expect(vai).not.toContain('Quản trị');
  });

  it('kế toán: chỉ xem, không có ô mời, không có nút gỡ — nhưng rời công ty được', async () => {
    nhu('ke_toan', 'u-kt');
    render(<ThanhVienCongTy />);
    await cho();
    expect(screen.queryByRole('form', { name: 'Thêm thành viên' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Gỡ' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Rời công ty' })).toBeTruthy();
  });

  it('mời: gửi đúng email và vai trò, nói rõ người được mời cần có tài khoản trước', async () => {
    nhu('chu_so_huu', 'u-chu');
    render(<ThanhVienCongTy />);
    await cho();
    expect(document.body.textContent).toContain('cần có tài khoản MIMI trước');
    fireEvent.change(screen.getByLabelText('Email người được thêm'), { target: { value: ' moi@thinhphat.vn ' } });
    fireEvent.change(screen.getByLabelText('Vai trò người được thêm'), { target: { value: 'nguoi_duyet' } });
    fireEvent.click(screen.getByRole('button', { name: /Thêm$/ }));
    await waitFor(() => expect(gia.goi).toHaveBeenCalledWith('moi', { email: 'moi@thinhphat.vn', vai_tro: 'nguoi_duyet' }));
  });

  it('máy chủ từ chối: hiện nguyên câu của máy chủ', async () => {
    nhu('chu_so_huu', 'u-chu');
    render(<ThanhVienCongTy />);
    await cho();
    gia.goi.mockRejectedValueOnce(new Error('Email này chưa có tài khoản MIMI.'));
    fireEvent.change(screen.getByLabelText('Email người được thêm'), { target: { value: 'la@x.vn' } });
    fireEvent.click(screen.getByRole('button', { name: /Thêm$/ }));
    await waitFor(() => expect(gia.loi).toHaveBeenCalledWith('Email này chưa có tài khoản MIMI.'));
  });

  it('gỡ phải qua hộp xác nhận, rồi mới gọi go_bo', async () => {
    nhu('chu_so_huu', 'u-chu');
    render(<ThanhVienCongTy />);
    await cho();
    fireEvent.click(within(dong('kt@thinhphat.vn')).getByRole('button', { name: 'Gỡ' }));
    expect(gia.goi).not.toHaveBeenCalledWith('go_bo', expect.anything());
    fireEvent.click(await screen.findByRole('button', { name: 'Gỡ khỏi công ty' }));
    await waitFor(() => expect(gia.goi).toHaveBeenCalledWith('go_bo', { user_id: 'u-kt' }));
  });

  it('thuộc nhiều công ty: có ô chọn công ty đang làm việc', async () => {
    gia.dsCongTy = [
      { id: 'cty-A', ten: 'Thịnh Phát', vai_tro: 'chu_so_huu' },
      { id: 'cty-B', ten: 'Casso', vai_tro: 'ke_toan' },
    ];
    nhu('chu_so_huu', 'u-chu');
    render(<ThanhVienCongTy />);
    const o = await screen.findByLabelText('Công ty đang làm việc');
    expect(within(o).getAllByRole('option').map((x) => x.textContent)).toEqual(['Thịnh Phát · Chủ doanh nghiệp', 'Casso · Kế toán']);
  });
});
