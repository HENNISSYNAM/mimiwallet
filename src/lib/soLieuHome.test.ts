import { describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { cacThang, dungSoLieuHome } from './soLieuHome';
import { chonViecHome } from '@/components/khong-gian/ViecAgentGanDay';

const gd = (id: string, ngay: string, amount: number, type: 'income' | 'expense', ten = 'A') => ({
  id, transaction_date: ngay, amount, type, category: null, is_synthetic: false, counter_account_name: ten, merchant_name: null, payment_reference: 'ck',
});

describe('số liệu biểu đồ Home', () => {
  it('6 tháng liền nhau, qua năm đúng', () => {
    expect(cacThang('2026-02-15')).toEqual(['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02']);
  });

  it('tháng trống = 0; vào/ra theo type; 5 khoản lớn nhất trong 30 ngày, lớn trước', () => {
    const s = dungSoLieuHome([
      gd('a', '2026-11-20', 5_000_000, 'income'), gd('b', '2026-11-21', 2_000_000, 'expense'),
      gd('c', '2026-09-03', 1_000_000, 'income'), gd('cu', '2026-10-01', 9_000_000, 'income'),
    ], '2026-11-22');
    expect(s.thang.map((t) => t.khoa)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
    expect(s.thang.at(-1)).toMatchObject({ nhan: 'T11', vao: 5_000_000, ra: 2_000_000, rong: 3_000_000 });
    expect(s.thang[0]).toMatchObject({ vao: 0, ra: 0 });
    expect(s.khoanLon.map((k) => [k.id, k.chieu])).toEqual([['a', 'vao'], ['b', 'ra']]);
  });
});

describe('việc của agent ở Home', () => {
  const v = (id: string, company_id: string, trang_thai: string, cap = '2026-11-22T01:00:00Z') => ({ id, company_id, trang_thai, cap_nhat_luc: cap }) as never;
  it('chỉ công ty đang dùng; chờ bạn đứng đầu; bỏ việc huỷ', () => {
    const ds = chonViecHome([v('1', 'c', 'xong'), v('2', 'c', 'can_ban'), v('3', 'khac', 'can_ban'), v('4', 'c', 'huy'), v('5', 'c', 'dang_lam')], 'c');
    expect(ds.map((x) => x.id)).toEqual(['2', '5', '1']);
  });
});
