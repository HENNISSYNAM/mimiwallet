import { describe, it, expect } from 'vitest';
import { coSaoKeDeDoc, type KetNoiRutGon } from './dong-bo';

const kn = (over: Partial<KetNoiRutGon> = {}): KetNoiRutGon => ({
  account_number: '1234567890',
  scopes: 'transaction',
  ...over,
});

describe('coSaoKeDeDoc — liên kết nào có sao kê để đọc', () => {
  it('liên kết QR có số tài khoản THẬT vẫn không được đồng bộ', () => {
    // Đây là chính lỗi ngày 04/09, và là ca mà bộ chắn cũ để lọt.
    // Bộ chắn cũ hỏi "account_number có bắt đầu bằng grant: không" — với dòng
    // này thì KHÔNG, vì fetchQrPayIdentity đã chạy được và ghi số thật vào.
    // Nên nó cho qua, vòng đồng bộ gọi /transactions lên grant chỉ có scope
    // qrpay, Cas từ chối, và liên kết bị đánh dấu needs_relink.
    expect(coSaoKeDeDoc(kn({ scopes: 'qrpay', account_number: '0123452002' }))).toBe(false);
  });

  it('liên kết QR chưa dò được danh tính cũng không đồng bộ', () => {
    // Ca mà bộ chắn cũ bắt được. Vẫn phải đúng sau khi đổi quy tắc.
    expect(coSaoKeDeDoc(kn({ scopes: 'qrpay', account_number: 'grant:abc-123' }))).toBe(false);
  });

  it('liên kết thuế không phải nguồn sao kê ngân hàng', () => {
    expect(coSaoKeDeDoc(kn({ scopes: 'gdt' }))).toBe(false);
  });

  it('liên kết đọc sao kê thì đồng bộ bình thường', () => {
    expect(coSaoKeDeDoc(kn({ scopes: 'transaction' }))).toBe(true);
  });

  it('dòng cũ chưa có scopes vẫn đồng bộ được — không chặn nhầm', () => {
    // Cột `scopes` thêm sau. Nếu null bị hiểu là "không đọc được" thì mọi liên
    // kết cũ ngừng đồng bộ trong im lặng, đổi một lỗi lấy một lỗi tệ hơn.
    expect(coSaoKeDeDoc(kn({ scopes: null }))).toBe(true);
    expect(coSaoKeDeDoc({ account_number: '1234567890' })).toBe(true);
  });

  it('dòng cũ không scopes nhưng khoá tổng hợp thì vẫn bị chặn bằng lớp hai', () => {
    expect(coSaoKeDeDoc({ account_number: 'grant:xyz' })).toBe(false);
  });

  it('số tài khoản chứa chữ "grant" ở giữa KHÔNG bị chặn nhầm', () => {
    // startsWith, không phải includes.
    expect(coSaoKeDeDoc(kn({ account_number: '99grant:77' }))).toBe(true);
  });
});
