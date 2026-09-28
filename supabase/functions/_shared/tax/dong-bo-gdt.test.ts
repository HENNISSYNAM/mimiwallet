import { describe, expect, it, vi } from 'vitest';
import { BankhubError } from '../bank/bankhub';
import { denHanTuDong, dongBoHoaDonThue, mocBatDau } from './dong-bo-gdt';

/* DB giả tối thiểu: ghi lại mọi update/upsert để kiểm dấu vết. Số liệu là dữ liệu test. */
function dbGia(o: { mst?: string | null; conn?: Record<string, unknown> | null; loiGhi?: string }) {
  const ghi: { bang: string; kieu: string; du: unknown; id?: unknown }[] = [];
  const db = {
    ghi,
    from(bang: string) {
      const q: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'is', 'order', 'limit']) q[m] = () => q;
      q.maybeSingle = async () => ({
        data: bang === 'companies' ? { tax_id: o.mst === undefined ? '0312345678' : o.mst } : (o.conn === undefined ? { id: 'kn-1', access_token_enc: {}, last_synced_at: null } : o.conn),
        error: null,
      });
      q.update = (du: unknown) => ({ eq: async (_c: string, id: unknown) => { ghi.push({ bang, kieu: 'update', du, id }); return { error: null }; } });
      q.upsert = async (du: unknown) => { ghi.push({ bang, kieu: 'upsert', du }); return { error: o.loiGhi ? { message: o.loiGhi } : null }; };
      return q;
    },
  };
  return db;
}
const cfg = { clientId: 'x', secretKey: 'y', baseUrl: 'https://example.invalid' } as never;
const giaiMa = async () => 'token';
const NOW = new Date('2026-09-28T03:00:00Z');
const hd = (id: string, ban: boolean) => ({
  id, seller: { taxCode: ban ? '0312345678' : '0999001100', name: 'X' }, buyer: { taxCode: ban ? '0999001100' : '0312345678', name: 'Y' },
  financials: { totalAmount: 1_100_000, subtotalAmount: 1_000_000, taxAmount: 100_000 }, issuedAt: '2026-09-10', invoiceNumber: '1', invoiceSerial: 'C26T',
});

describe('đồng bộ hoá đơn điện tử (Tổng Cục Thuế qua Cas)', () => {
  it('thành công: ghi hoá đơn, ghi thời điểm đồng bộ và xoá lỗi cũ — kể cả khi 0 hoá đơn', async () => {
    const db = dbGia({});
    const layHoaDon = vi.fn(async () => ({ gdtInvoices: [hd('a', true), hd('b', false)] }));
    const kq = await dongBoHoaDonThue(db, cfg, 'k', 'cty', { now: NOW, layHoaDon, giaiMa });
    expect(kq).toMatchObject({ loai: 'xong', stored: 2, issued: 1, received: 1, window: { fromDate: '2025-09-28', toDate: '2026-09-28' } });
    expect(db.ghi.find((g) => g.kieu === 'upsert' && g.bang === 'gdt_invoices')).toBeTruthy();
    expect(db.ghi.find((g) => g.bang === 'bank_connections')?.du).toEqual({ last_synced_at: NOW.toISOString(), last_error_code: null, last_error_at: null });

    const db0 = dbGia({});
    const kq0 = await dongBoHoaDonThue(db0, cfg, 'k', 'cty', { now: NOW, layHoaDon: async () => ({ gdtInvoices: [] }), giaiMa });
    expect(kq0).toMatchObject({ loai: 'xong', stored: 0 });
    expect(db0.ghi.find((g) => g.bang === 'bank_connections')?.du).toMatchObject({ last_synced_at: NOW.toISOString() });
  });

  it('thiếu mã số thuế → không gọi Cas; chưa liên kết → báo chưa kết nối', async () => {
    const layHoaDon = vi.fn();
    expect(await dongBoHoaDonThue(dbGia({ mst: null }), cfg, 'k', 'cty', { now: NOW, layHoaDon, giaiMa })).toEqual({ loai: 'thieu_mst' });
    expect(await dongBoHoaDonThue(dbGia({ conn: null }), cfg, 'k', 'cty', { now: NOW, layHoaDon, giaiMa })).toEqual({ loai: 'chua_ket_noi' });
    expect(layHoaDon).not.toHaveBeenCalled();
  });

  it('Cas lỗi → ghi mã lỗi và thời điểm lỗi lên liên kết (không im lặng), không ghi thời điểm đồng bộ', async () => {
    const db = dbGia({});
    const loi = new BankhubError(500, 'INTERNAL_ERROR', 'API_ERROR', 'Cas lỗi', 'req-1');
    const kq = await dongBoHoaDonThue(db, cfg, 'k', 'cty', { now: NOW, layHoaDon: async () => { throw loi; }, giaiMa });
    expect(kq).toMatchObject({ loai: 'loi_cas', errorCode: 'INTERNAL_ERROR', requestId: 'req-1' });
    const cn = db.ghi.find((g) => g.bang === 'bank_connections')!.du as Record<string, unknown>;
    expect(cn.last_error_code).toBe('INTERNAL_ERROR');
    expect(cn.last_error_at).toBe(NOW.toISOString());
    expect(cn).not.toHaveProperty('last_synced_at');
  });

  it('ghi hoá đơn lỗi → báo lỗi ghi, KHÔNG đánh dấu đã đồng bộ', async () => {
    const db = dbGia({ loiGhi: 'duplicate' });
    const kq = await dongBoHoaDonThue(db, cfg, 'k', 'cty', { now: NOW, layHoaDon: async () => ({ gdtInvoices: [hd('a', true)] }), giaiMa });
    expect(kq).toMatchObject({ loai: 'loi_ghi' });
    expect(db.ghi.some((g) => g.bang === 'bank_connections')).toBe(false);
  });

  it('mốc bắt đầu: lần đầu lùi 12 tháng; lần sau lùi 45 ngày trước lần cuối, không xa hơn 12 tháng', () => {
    expect(mocBatDau(null, NOW)).toBe('2025-09-28');
    expect(mocBatDau('2026-09-20T00:00:00Z', NOW)).toBe('2026-08-06');
    expect(mocBatDau('2025-01-01T00:00:00Z', NOW)).toBe('2025-09-28');
  });

  it('lịch tự đồng bộ: chưa chạy thì đến hạn; chạy trong 20 giờ thì chưa', () => {
    expect(denHanTuDong(null, NOW)).toBe(true);
    expect(denHanTuDong('2026-09-27T12:00:00Z', NOW)).toBe(false);
    expect(denHanTuDong('2026-09-27T06:00:00Z', NOW)).toBe(true);
  });
});
