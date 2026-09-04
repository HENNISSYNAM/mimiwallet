import { describe, it, expect } from 'vitest';
import { MO_TA_TOI_DA, moTaQr, kiemMoTa } from './moTaQr';

describe('moTaQr — cắt chuỗi hệ thống dựng cho vừa giới hạn', () => {
  it('chuỗi đã vừa thì giữ nguyên vẹn', () => {
    expect(moTaQr('HD 0042')).toBe('HD 0042');
    expect(moTaQr('123456789')).toBe('123456789');
  });

  it('cắt từ ĐUÔI, giữ phần phân biệt', () => {
    // Số hoá đơn mang thông tin ở đuôi: INV-2026-0042 thì cái đáng giữ là 0042.
    // Cắt từ đầu sẽ ra "INV-2026-" — giống hệt nhau ở mọi hoá đơn cùng năm.
    expect(moTaQr('INV-2026-0042')).toBe('2026-0042');
    expect(moTaQr('Thanh toan INV-2026-0042')).toBe('2026-0042');
  });

  it('không bao giờ dài quá giới hạn', () => {
    for (const s of ['a'.repeat(50), 'Thanh toan hoa don thang 9', 'x']) {
      expect(moTaQr(s).length).toBeLessThanOrEqual(MO_TA_TOI_DA);
    }
  });

  it('bỏ khoảng trắng thừa hai đầu trước khi đo', () => {
    expect(moTaQr('   HD 0042   ')).toBe('HD 0042');
  });
});

describe('kiemMoTa — chuỗi người dùng gõ thì BÁO, không tự cắt', () => {
  it('quá dài thì báo và nói thừa bao nhiêu', () => {
    // Đây là ràng buộc thật, phát hiện 04/09 qua requestId Bgv44JpvIbxfvfmr:
    // "description must has maximum 9 characters (INVALID_PARAM)".
    const ra = kiemMoTa('Thanh toan don hang');
    expect(ra.hopLe).toBe(false);
    expect(ra.vuong).toContain('9 ký tự');
    expect(ra.vuong).toContain('thừa 10');
  });

  it('đúng bằng giới hạn thì hợp lệ — chặn là "quá", không phải "chạm"', () => {
    expect(kiemMoTa('123456789').hopLe).toBe(true);
  });

  it('để trống thì báo, không im lặng cho qua', () => {
    expect(kiemMoTa('').hopLe).toBe(false);
    expect(kiemMoTa('   ').hopLe).toBe(false);
  });

  it('hợp lệ thì KHÔNG kèm lý do', () => {
    expect(kiemMoTa('HD 0042').vuong).toBeNull();
  });

  it('không tự cắt chữ của người dùng', () => {
    // kiemMoTa chỉ trả kết luận. Nếu có ngày nào nó bắt đầu trả chuỗi đã cắt,
    // tức là ứng dụng đang đổi nội dung người ta định viết mà không hỏi.
    const ra = kiemMoTa('Thanh toan don hang');
    expect(Object.keys(ra).sort()).toEqual(['hopLe', 'vuong']);
  });
});
