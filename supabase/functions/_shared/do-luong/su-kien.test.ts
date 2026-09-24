import { describe, expect, it, vi } from 'vitest';
import { ghiNhieuSuKien, ghiSuKien } from './su-kien';

const dbGia = (loi: string | null = null, nem = false) => {
  const chen = vi.fn(async () => { if (nem) throw new Error('mất mạng'); return { error: loi ? { message: loi } : null }; });
  return { db: { from: () => ({ insert: chen }) }, chen };
};

describe('ghi sự kiện sản phẩm', () => {
  it('ghi đúng công ty, người, tên và thuộc tính', async () => {
    const { db, chen } = dbGia();
    await ghiSuKien(db, 'c1', 'u1', 'first_scan_completed', { so_giao_dich: 426 });
    expect(chen).toHaveBeenCalledWith({ company_id: 'c1', user_id: 'u1', name: 'first_scan_completed', props: { so_giao_dich: 426 } });
  });

  it('sự kiện "lần đầu" bị trùng thì im lặng; lỗi khác chỉ ghi log', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await ghiSuKien(dbGia('duplicate key value violates unique constraint').db, 'c1', null, 'first_scan_completed');
    expect(log).not.toHaveBeenCalled();
    await ghiSuKien(dbGia('permission denied').db, 'c1', null, 'first_scan_completed');
    expect(log).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });

  it('đo lường hỏng không bao giờ làm hỏng việc chính', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(ghiNhieuSuKien(dbGia(null, true).db, 'c1', null, [['first_scan_completed'], ['first_exception_detected']])).resolves.toBeUndefined();
    log.mockRestore();
  });
});
