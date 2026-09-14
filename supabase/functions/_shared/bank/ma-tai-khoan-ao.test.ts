import { describe, expect, it } from 'vitest';
import { timTaiKhoanAoTrongNoiDung } from './ma-tai-khoan-ao';

// Hai nội dung thật (đã cắt phần sau), 07/09 và 14/09/2026.
const ND_0709 = 'Qalvcf0444  CASSO11707 4 ETY7qYU4NH1sMUL2vOiLmiPe QR HD 8535';
const ND_1409 = 'BankAPINotify Qamaee7338  CASSO11728 4 pM8N9DjBx2PXvNcESk9ikq6j 31 CHUYEN TIEN';

describe('tìm tài khoản ảo Cas trong nội dung chuyển khoản', () => {
  it('khớp hai mẫu thật: bỏ tiền tố VQR, không phân biệt hoa thường', () => {
    expect(timTaiKhoanAoTrongNoiDung(ND_0709, ['VQRQALVCF0444'])).toBe('VQRQALVCF0444');
    expect(timTaiKhoanAoTrongNoiDung(ND_1409, ['VQRQAMAEE7338'])).toBe('VQRQAMAEE7338');
  });

  it('chỉ chọn trong danh sách đã lưu', () => {
    expect(timTaiKhoanAoTrongNoiDung(ND_1409, ['VQRQALVCF0444', 'VQRQAMAEE7338'])).toBe('VQRQAMAEE7338');
    expect(timTaiKhoanAoTrongNoiDung(ND_1409, ['VQRQALVCF0444'])).toBeNull();
    expect(timTaiKhoanAoTrongNoiDung(ND_1409, [])).toBeNull();
  });

  it('phải là từ nguyên vẹn, không khớp một phần', () => {
    expect(timTaiKhoanAoTrongNoiDung('XQamaee7338 chuyen tien', ['VQRQAMAEE7338'])).toBeNull();
    expect(timTaiKhoanAoTrongNoiDung('Qamaee73389 chuyen tien', ['VQRQAMAEE7338'])).toBeNull();
  });

  it('hai tài khoản ảo cùng xuất hiện thì không tự khớp', () => {
    expect(
      timTaiKhoanAoTrongNoiDung('Qamaee7338 Qalvcf0444', ['VQRQAMAEE7338', 'VQRQALVCF0444']),
    ).toBeNull();
  });

  it('mã quá ngắn hoặc đầu vào rỗng không khớp', () => {
    expect(timTaiKhoanAoTrongNoiDung('QAB12 chuyen tien', ['VQRQAB12'])).toBeNull();
    expect(timTaiKhoanAoTrongNoiDung(null, ['VQRQAMAEE7338'])).toBeNull();
    expect(timTaiKhoanAoTrongNoiDung(ND_1409, [null, undefined, ''])).toBeNull();
  });
});
