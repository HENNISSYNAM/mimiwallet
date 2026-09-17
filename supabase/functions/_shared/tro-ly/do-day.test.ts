import { describe, expect, it } from 'vitest';
import { apDoDay, cauCanhBao, danhGiaDoDay, trangThaiChung } from './do-day';
import { dungTraLoi } from './tra-loi';
import { NANG_LUC, duLieuTrong } from './tinh-toan';
import type { KetQuaNangLuc } from './kieu';

/**
 * MIMI-P0-002 — nghiệm thu: 10.001 giao dịch mà chỉ đọc được 10.000 thì không bao giờ được
 * trả một con số tổng không kèm cảnh báo.
 */

const HOM_NAY = '2026-09-16';
const giaoDich = (n: number) => Array.from({ length: n }, (_, i) => ({
  id: `t${i}`, amount: -100_000, type: 'expense', transaction_date: '2026-09-10',
  merchant_name: 'Nhà cung cấp', category: null, counter_account_name: null, payment_reference: null,
}));

const doDay10001 = danhGiaDoDay({
  nguon: 'giao_dich', ten: 'Giao dịch ngân hàng', daDoc: 10_000, tong: 10_001, gioiHan: 10_000,
  tu: '2026-03-20', den: HOM_NAY, dongBoLuc: '2026-09-16T02:00:00Z', canKetNoi: true, coKetNoi: true,
  bayGio: new Date('2026-09-16T05:00:00Z'),
});

describe('đánh giá độ đầy đủ', () => {
  it('10.001 dòng mà đọc 10.000 → partial, truncated, giữ đủ metadata', () => {
    expect(doDay10001).toEqual({
      nguon: 'giao_dich', ten: 'Giao dịch ngân hàng', row_count: 10_000, total_available: 10_001, truncated: true,
      period_from: '2026-03-20', period_to: HOM_NAY, last_synced_at: '2026-09-16T02:00:00Z', coverage_status: 'partial',
    });
  });

  it('đọc đủ và mới đồng bộ → complete', () => {
    const d = danhGiaDoDay({ nguon: 'giao_dich', ten: 'GD', daDoc: 500, tong: 500, dongBoLuc: '2026-09-16T02:00:00Z', bayGio: new Date('2026-09-16T05:00:00Z') });
    expect(d.coverage_status).toBe('complete');
    expect(d.truncated).toBe(false);
  });

  it('không đếm được tổng nhưng đã chạm giới hạn đọc → coi là bị cắt', () => {
    expect(danhGiaDoDay({ nguon: 'hoa_don_vao', ten: 'HĐ', daDoc: 5000, tong: null, gioiHan: 5000 }).coverage_status).toBe('partial');
    expect(danhGiaDoDay({ nguon: 'hoa_don_vao', ten: 'HĐ', daDoc: 12, tong: null, gioiHan: 5000 }).coverage_status).toBe('complete');
  });

  it('đồng bộ quá 72 giờ → stale', () => {
    const d = danhGiaDoDay({ nguon: 'giao_dich', ten: 'GD', daDoc: 3, tong: 3, dongBoLuc: '2026-09-12T00:00:00Z', bayGio: new Date('2026-09-16T05:00:00Z') });
    expect(d.coverage_status).toBe('stale');
  });

  it('chưa kết nối và không có dòng nào → unavailable, và câu cảnh báo nói rõ không phải bằng 0', () => {
    const d = danhGiaDoDay({ nguon: 'giao_dich', ten: 'Giao dịch ngân hàng', daDoc: 0, tong: 0, canKetNoi: true, coKetNoi: false });
    expect(d.coverage_status).toBe('unavailable');
    expect(cauCanhBao([d])).toContain('không phải bằng 0');
  });

  it('trạng thái chung lấy nguồn xấu nhất', () => {
    const ok = danhGiaDoDay({ nguon: 'bang_gia', ten: 'Bảng giá', daDoc: 1, tong: 1 });
    expect(trangThaiChung([ok, doDay10001])).toBe('partial');
    expect(trangThaiChung([ok])).toBe('complete');
    expect(trangThaiChung([])).toBe('complete');
  });
});

describe('nghiệm thu P0-002 trên năng lực thật', () => {
  // Năng lực tính trên 10.000 dòng đã đọc; dữ liệu thật có 10.001 dòng.
  const d = { ...duLieuTrong(HOM_NAY, { tu: '2026-07-01', den: '2026-09-30', nhan: 'quý 3/2026' }), giaoDich: giaoDich(10_000) };

  const coSoKhongCanhBao = (r: KetQuaNangLuc) => r.the.some((t) => t.loai === 'so_lieu' && t.muc.some((m) => typeof m.gia_tri === 'number' && !m.ghi_chu?.includes('10.000/10.001')));

  const nangLucGiaoDich = Object.entries(NANG_LUC).filter(([, nl]) => nl.can.includes('giao_dich'));

  it('có ít nhất một năng lực dùng giao dịch để kiểm', () => {
    expect(nangLucGiaoDich.length).toBeGreaterThan(0);
  });

  for (const [id, nl] of nangLucGiaoDich) {
    it(`${id}: tóm tắt mở đầu bằng cảnh báo, không ô số nào thiếu ghi chú`, () => {
      const r = apDoDay(nl.chay(d as never), [doDay10001]);
      expect(r.tom_tat.startsWith('Lưu ý độ đầy đủ')).toBe(true);
      expect(r.the[0]).toMatchObject({ loai: 'ghi_chu', muc_do: 'can_chu_y' });
      expect(coSoKhongCanhBao(r)).toBe(false);
      expect(r.do_day).toEqual([doDay10001]);
    });
  }

  it('chế độ mô hình: lời mô hình không có cảnh báo thì MIMI vẫn chèn cảnh báo lên đầu', () => {
    const [id, nl] = nangLucGiaoDich[0];
    const r = apDoDay(nl.chay(d as never), [doDay10001]);
    const tl = dungTraLoi({ ketQua: [r], cheDo: 'mo_hinh', cauMoHinh: 'Tổng chi tháng này là 1.000.000.000 ₫.' });
    expect(id).toBeTruthy();
    expect(tl.cau.startsWith('Lưu ý độ đầy đủ')).toBe(true);
    expect(tl.cau).toContain('10.000/10.001');
    expect(tl.do_day).toBe('partial');
  });

  it('chế độ cố định: cảnh báo xuất hiện đúng một lần', () => {
    const [, nl] = nangLucGiaoDich[0];
    const tl = dungTraLoi({ ketQua: [apDoDay(nl.chay(d as never), [doDay10001])], cheDo: 'co_dinh' });
    expect(tl.cau.split('Lưu ý độ đầy đủ').length - 1).toBe(1);
  });

  it('dữ liệu đủ: không chèn cảnh báo, do_day complete', () => {
    const [, nl] = nangLucGiaoDich[0];
    const du = danhGiaDoDay({ nguon: 'giao_dich', ten: 'Giao dịch ngân hàng', daDoc: 10_000, tong: 10_000 });
    const tl = dungTraLoi({ ketQua: [apDoDay(nl.chay(d as never), [du])], cheDo: 'mo_hinh', cauMoHinh: 'Xong.' });
    expect(tl.cau).toBe('Xong.');
    expect(tl.do_day).toBe('complete');
  });
});
