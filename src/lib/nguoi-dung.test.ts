import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const getSession = vi.fn();
const getUser = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: (...a: unknown[]) => getSession(...a), getUser: (...a: unknown[]) => getUser(...a) } },
}));

import { idNguoiDung, nguoiDungHienTai } from './nguoiDung';

describe('người đang đăng nhập', () => {
  beforeEach(() => { getSession.mockReset(); getUser.mockReset(); });

  it('đọc từ phiên có sẵn, KHÔNG gọi getUser (không đi mạng)', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1', email: 'a@b.vn', user_metadata: { picture: 'p' } } } }, error: null });
    expect(await nguoiDungHienTai()).toEqual({ id: 'u1', email: 'a@b.vn', user_metadata: { picture: 'p' } });
    expect(await idNguoiDung()).toBe('u1');
    expect(getUser).not.toHaveBeenCalled();
  });

  it('chưa đăng nhập hoặc lỗi thì trả null', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    expect(await nguoiDungHienTai()).toBeNull();
    getSession.mockResolvedValue({ data: { session: null }, error: new Error('x') });
    expect(await idNguoiDung()).toBeNull();
  });
});

/**
 * `auth.getUser()` đi mạng mỗi lần. Rải nó khắp app là cách một trang tự gọi
 * `/auth/v1/user` 9 lần trong một lần mở (đo ngày 23/09/2026). Chỉ những chỗ
 * CẦN máy chủ xác nhận token còn hiệu lực ngay lúc đó mới được dùng.
 */
const MIEN_TRU: Array<{ file: string; vi: string }> = [
  {
    file: 'src/pages/AdminPage.tsx',
    vi: 'Cổng vào trang quản trị. Dù quyền thật do RLS và edge function quyết, ở đây chấp nhận thêm một lần gọi để không mở giao diện quản trị dựa trên phiên cũ đã bị thu hồi.',
  },
];

const goc = join(__dirname, '..', '..');

function cacFile(dir: string, ra: string[] = []): string[] {
  for (const ten of readdirSync(dir)) {
    const p = join(dir, ten);
    if (statSync(p).isDirectory()) cacFile(p, ra);
    else if ((ten.endsWith('.ts') || ten.endsWith('.tsx')) && !ten.includes('.test.')) ra.push(p);
  }
  return ra;
}

const boChuThich = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('không gọi getUser rải rác', () => {
  it('ngoài danh sách miễn trừ, giao diện không gọi auth.getUser()', () => {
    const sai: string[] = [];
    for (const f of cacFile(join(goc, 'src'))) {
      const ten = relative(goc, f).split(sep).join('/');
      if (MIEN_TRU.some((x) => x.file === ten)) continue;
      if (/auth\.getUser\(\)/.test(boChuThich(readFileSync(f, 'utf8')))) sai.push(ten);
    }
    expect(sai).toEqual([]);
  });

  it('miễn trừ nào cũng có lý do viết ra', () => {
    for (const x of MIEN_TRU) expect(x.vi.trim().length).toBeGreaterThan(30);
  });
});
