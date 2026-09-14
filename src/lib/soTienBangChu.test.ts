import { describe, expect, it } from 'vitest';
import { docSoTienBangChu } from './soTienBangChu';

describe('đọc số tiền bằng chữ', () => {
  it('số tròn thường gặp khi duyệt chi', () => {
    expect(docSoTienBangChu(4_500_000)).toBe('Bốn triệu năm trăm nghìn đồng');
    expect(docSoTienBangChu(2_000)).toBe('Hai nghìn đồng');
    expect(docSoTienBangChu(249_000)).toBe('Hai trăm bốn mươi chín nghìn đồng');
    expect(docSoTienBangChu(1_000_000_000)).toBe('Một tỷ đồng');
  });

  it('mười, mốt, lăm, tư, lẻ', () => {
    expect(docSoTienBangChu(10)).toBe('Mười đồng');
    expect(docSoTienBangChu(11)).toBe('Mười một đồng');
    expect(docSoTienBangChu(15)).toBe('Mười lăm đồng');
    expect(docSoTienBangChu(14)).toBe('Mười bốn đồng');
    expect(docSoTienBangChu(21)).toBe('Hai mươi mốt đồng');
    expect(docSoTienBangChu(24)).toBe('Hai mươi tư đồng');
    expect(docSoTienBangChu(25)).toBe('Hai mươi lăm đồng');
    expect(docSoTienBangChu(105)).toBe('Một trăm lẻ năm đồng');
    expect(docSoTienBangChu(110)).toBe('Một trăm mười đồng');
  });

  it('nhóm không đứng đầu đọc đủ "không trăm" — chỗ dễ đọc sai nhất', () => {
    expect(docSoTienBangChu(1_050_000)).toBe('Một triệu không trăm năm mươi nghìn đồng');
    expect(docSoTienBangChu(2_001)).toBe('Hai nghìn không trăm lẻ một đồng');
    expect(docSoTienBangChu(1_000_005)).toBe('Một triệu không trăm lẻ năm đồng');
    expect(docSoTienBangChu(3_000_200_000)).toBe('Ba tỷ hai trăm nghìn đồng');
  });

  it('một số 0 thừa đọc ra khác hẳn — đúng lý do hàm này tồn tại', () => {
    expect(docSoTienBangChu(450_000)).toBe('Bốn trăm năm mươi nghìn đồng');
    expect(docSoTienBangChu(45_000_000)).toBe('Bốn mươi lăm triệu đồng');
  });

  it('số lớn trên nghìn tỷ', () => {
    // "ba mươi tư", cùng quy ước với 24 → "hai mươi tư" ở trên.
    expect(docSoTienBangChu(1_234_000_000_000)).toBe('Một nghìn hai trăm ba mươi tư tỷ đồng');
  });

  it('đầu vào không hợp lệ trả rỗng thay vì đoán', () => {
    expect(docSoTienBangChu(0)).toBe('Không đồng');
    expect(docSoTienBangChu(-5)).toBe('');
    expect(docSoTienBangChu(10.5)).toBe('');
    expect(docSoTienBangChu(Number.NaN)).toBe('');
  });
});
