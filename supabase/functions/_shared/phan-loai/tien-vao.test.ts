import { describe, expect, it } from 'vitest';
import { goiYTienVao } from './tien-vao';

const k = (payment_reference: string, counter_account_name: string | null = null) =>
  ({ merchant_name: null, counter_account_name, payment_reference });

describe('đọc nội dung chuyển khoản — tiền vào không phải doanh thu', () => {
  // Nội dung viết không dấu và viết hoa, như sao kê ngân hàng Việt Nam thật.
  it('giải ngân khoản vay', () => {
    expect(goiYTienVao(k('GIAI NGAN HDTD 1234/2026/HDTD'))?.loai).toBe('vay');
    expect(goiYTienVao(k('Tien vay mua hang'))?.loai).toBe('vay');
  });

  it('người nhà chuyển — đúng câu chuyện của người dùng thật', () => {
    expect(goiYTienVao(k('CON GUI BA ME TIEU TET'))?.loai).toBe('nguoi_nha');
    expect(goiYTienVao(k('chuyen ve cho bo me'))?.loai).toBe('nguoi_nha');
    expect(goiYTienVao(k('Tiền tiêu của mẹ tháng 9'))?.loai).toBe('nguoi_nha');
  });

  // Nhà thuốc nhận "tien thuoc", trung tâm dạy thêm nhận "tien hoc" — đó là doanh thu.
  it('không gợi ý loại tiền khách trả của nhà thuốc, lớp học, tiệm quà', () => {
    expect(goiYTienVao(k('TIEN THUOC DON 0915'))).toBeNull();
    expect(goiYTienVao(k('tien hoc thang 9 be An'))).toBeNull();
    expect(goiYTienVao(k('thanh toan qua tet 20 hop'))).toBeNull();
  });

  it('góp vốn, hoàn tiền, đặt cọc', () => {
    expect(goiYTienVao(k('GOP VON KINH DOANH'))?.loai).toBe('gop_von');
    expect(goiYTienVao(k('HOAN TIEN DON HANG 889'))?.loai).toBe('hoan_tien');
    expect(goiYTienVao(k('DAT COC LO HANG THANG 10'))?.loai).toBe('dat_coc');
  });

  it('tiền khách trả bình thường thì không gợi ý gì', () => {
    for (const nd of [
      'NGUYEN VAN A chuyen tien mua hang',
      'Thanh toan don hang 1523',
      'TT tien hang thang 9',
      'MIMI4K2P9A',
      'chuyen khoan',
    ]) expect(goiYTienVao(k(nd)), nd).toBeNull();
  });

  /*
   * "con" và "cho" là hai chữ rất thường gặp. Không được bắt "chuyển tiền cho
   * con hàng" hay "tiền hàng còn thiếu" thành tiền người nhà.
   */
  it('không bắt nhầm chữ "con", "cho" đứng rời', () => {
    expect(goiYTienVao(k('Tien hang con thieu thang 8'))).toBeNull();
    expect(goiYTienVao(k('thanh toan cho don hang 55'))).toBeNull();
  });

  it('đọc cả tên người chuyển, không chỉ nội dung', () => {
    expect(goiYTienVao({ merchant_name: null, counter_account_name: 'NGAN HANG TMCP - GIAI NGAN', payment_reference: 'HD 55' })?.loai).toBe('vay');
  });

  it('mỗi gợi ý có lý do bằng lời thường', () => {
    const g = goiYTienVao(k('CON GUI BA ME'));
    expect(g?.ly_do.length).toBeGreaterThan(20);
  });
});
