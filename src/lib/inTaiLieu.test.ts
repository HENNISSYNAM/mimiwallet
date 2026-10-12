import { afterEach, describe, expect, it, vi } from 'vitest';
import { inTaiLieu, ngayTep, tenTepAnToan } from './inTaiLieu';

describe('in tài liệu', () => {
  afterEach(() => vi.restoreAllMocks());

  it('tên tệp không dấu, không ký tự lạ', () => {
    expect(tenTepAnToan('ĐƠN ĐỀ NGHỊ TRA SOÁT (TCCN-12)')).toBe('don-de-nghi-tra-soat-tccn-12');
    expect(tenTepAnToan('Công văn giải trình số liệu')).toBe('cong-van-giai-trinh-so-lieu');
    expect(tenTepAnToan('!!!')).toBe('tai-lieu-mimi');
  });

  it('ngày tệp theo giờ máy, đủ hai chữ số', () => {
    expect(ngayTep(new Date(2026, 0, 5, 6, 0))).toBe('2026-01-05');
  });

  it('đặt tạm tiêu đề trang = tên tệp lúc in (trình duyệt lấy làm tên PDF), in xong trả lại', () => {
    document.title = 'MIMI';
    let tieuDeLucIn = '';
    vi.spyOn(window, 'print').mockImplementation(() => { tieuDeLucIn = document.title; window.dispatchEvent(new Event('afterprint')); });
    inTaiLieu('don-tra-soat-2026-10-11');
    expect(tieuDeLucIn).toBe('don-tra-soat-2026-10-11');
    expect(document.title).toBe('MIMI');
  });
});
