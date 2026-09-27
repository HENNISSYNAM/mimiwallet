import { beforeEach, describe, expect, it, vi } from 'vitest';

const insert = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ insert: (...a: unknown[]) => insert(...a) }) } }));
const nguoi = vi.hoisted(() => ({ id: 'u-1' as string | null }));
vi.mock('./nguoiDung', () => ({ idNguoiDung: async () => nguoi.id }));
const cty = vi.hoisted(() => ({ id: 'cty-1' as string | null }));
vi.mock('./congTyDangDung', () => ({ idCongTyDangDung: async () => cty.id }));

import { ghiMoUngDung, track } from './track';

const cho = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  insert.mockReset();
  insert.mockResolvedValue({ error: null });
  nguoi.id = 'u-1';
  cty.id = 'cty-1';
  localStorage.clear();
});

describe('track — đo lường tự lưu, gắn công ty đang dùng', () => {
  it('ghi kèm company_id của công ty đang dùng', async () => {
    track('bank_link_started', { buoc: 'dong_y' });
    await cho(); await cho();
    expect(insert).toHaveBeenCalledWith({ user_id: 'u-1', name: 'bank_link_started', props: { buoc: 'dong_y' }, company_id: 'cty-1' });
  });

  it('máy chủ từ chối company_id (vừa rời công ty) → ghi lại không kèm công ty', async () => {
    insert.mockResolvedValueOnce({ error: { message: 'new row violates row-level security policy' } });
    track('qr_created');
    await cho(); await cho(); await cho();
    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert.mock.calls[1][0]).toEqual({ user_id: 'u-1', name: 'qr_created', props: {} });
  });

  it('chưa đăng nhập thì không ghi gì; lỗi đo lường không bao giờ ném ra ngoài', async () => {
    nguoi.id = null;
    track('login');
    await cho(); await cho();
    expect(insert).not.toHaveBeenCalled();
    nguoi.id = 'u-1';
    insert.mockRejectedValue(new Error('mạng'));
    expect(() => track('login')).not.toThrow();
    await cho(); await cho();
  });
});

describe('ghiMoUngDung — mỗi ngày một lần mỗi công ty', () => {
  it('lần hai trong ngày không ghi; đổi công ty thì ghi cho công ty đó', async () => {
    await ghiMoUngDung(); await cho(); await cho();
    await ghiMoUngDung(); await cho(); await cho();
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toMatchObject({ name: 'app_opened', company_id: 'cty-1' });
    cty.id = 'cty-2';
    await ghiMoUngDung(); await cho(); await cho();
    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert.mock.calls[1][0]).toMatchObject({ name: 'app_opened', company_id: 'cty-2' });
  });
});
