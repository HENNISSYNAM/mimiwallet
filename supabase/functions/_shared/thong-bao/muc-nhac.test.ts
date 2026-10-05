import { describe, expect, it } from 'vitest';
import { khoaThongBaoMuc, mucCanXem, mucNhacTuLich, NGAY_BAO_TRUOC, thongBaoNhacLoiThoi } from './muc-nhac';
import { thongBaoHanThue } from './sinh';
import type { MocThue } from '../luat/lich-thue';
import type { CauHoiCanXem } from '../doanh-thu/do-chac-chan';

const moc = (o: Partial<MocThue>): MocThue => ({
  khoa: 'tndn_tam_nop:2026-q3', ten: 'Tạm nộp thuế TNDN quý 3/2026', loai: 'tam_nop', trang_thai: 'phai_lam',
  han: '2026-10-30', con_lai: 5, vi_sao: 'Doanh nghiệp tạm nộp thuế TNDN theo quý.', can_cu: [], ...o,
});
const CAU = { khoa: 'tong_chua_ro', cau: 'Còn 3 khoản tiền vào chưa rõ có phải tiền bán hàng không?' } as CauHoiCanXem;
const PHU_THUOC = { ket_luan_phu_thuoc: true, cau_hoi_can_xem: CAU };

describe('một mục nhắc cho mọi bề mặt', () => {
  it('doanh thu còn cắt ngưỡng: đúng MỘT mục "cần xem", đứng đầu, kèm đúng một câu hỏi', () => {
    const ds = mucNhacTuLich([moc({})], PHU_THUOC);
    expect(ds.filter((m) => m.trang_thai === 'can_xem')).toHaveLength(1);
    expect(ds[0]).toMatchObject({ trang_thai: 'can_xem', cau_hoi: CAU.cau, han: null, duong_dan: '/dashboard/nhac-thue#can-xem' });
    expect(ds[0].noi_dung).toContain(CAU.cau);
    // Không nói nghĩa vụ trong mục cần xem.
    expect(ds[0].noi_dung).not.toMatch(/phải nộp|bắt buộc/);
  });

  it('kết luận không phụ thuộc phần chưa rõ: không có mục cần xem', () => {
    expect(mucCanXem({ ket_luan_phu_thuoc: false, cau_hoi_can_xem: CAU })).toBeNull();
    expect(mucCanXem(null)).toBeNull();
  });

  it('không lọc thêm nghĩa vụ — lịch đã là kết luận thuế (không đổi kết luận)', () => {
    expect(mucNhacTuLich([moc({})], PHU_THUOC).some((m) => m.khoa === 'tndn_tam_nop:2026-q3:2026-10-30')).toBe(true);
  });

  it('bỏ mốc không áp dụng, không hạn, đã qua hạn; cửa sổ ngày; hạn gần trước', () => {
    const ds = mucNhacTuLich([
      moc({ khoa: 'xa', con_lai: 20, han: '2026-11-15' }),
      moc({ khoa: 'gan', con_lai: 2, han: '2026-10-08' }),
      moc({ khoa: 'ka', trang_thai: 'khong_ap_dung' }),
      moc({ khoa: 'khong_han', han: null, con_lai: null, trang_thai: 'can_xac_minh' }),
      moc({ khoa: 'qua', con_lai: -3, han: '2026-10-03' }),
    ], null, { trongNgay: NGAY_BAO_TRUOC });
    expect(ds.map((m) => m.khoa)).toEqual(['gan:2026-10-08']);
  });

  it('cần xác minh: kèm câu hỏi, nói "nếu áp dụng", việc tiếp là trả lời', () => {
    const [m] = mucNhacTuLich([moc({ trang_thai: 'can_xac_minh', cau_hoi: 'Công ty có trả lương không?' })]);
    expect(m).toMatchObject({ trang_thai: 'can_xac_minh', cau_hoi: 'Công ty có trả lương không?', viec_tiep: 'Trả lời câu hỏi của MIMI' });
    expect(m.noi_dung).toContain('nếu việc này áp dụng cho bạn');
  });
});

describe('chuông dùng cùng mục nhắc', () => {
  it('doanh thu còn cắt ngưỡng: chuông hỏi một câu, khoá theo năm + câu hỏi', () => {
    const ds = thongBaoHanThue([], PHU_THUOC, '2026-10-06');
    expect(ds).toHaveLength(1);
    expect(ds[0]).toMatchObject({ khoa: 'can_xem:2026:tong_chua_ro', loai: 'han_thue', duong_dan: '/dashboard/nhac-thue#can-xem' });
    expect(ds[0].noi_dung).toContain(CAU.cau);
  });

  it('cần xem không có năm thì không ghi (khoá phải ổn định)', () => {
    expect(thongBaoHanThue([], PHU_THUOC)).toEqual([]);
  });

  it('khoá thông báo hạn giữ dạng cũ han:<mốc>:<hạn>:<số ngày>', () => {
    const [m] = mucNhacTuLich([moc({})]);
    expect(khoaThongBaoMuc(m, '2026-10-25')).toBe('han:tndn_tam_nop:2026-q3:2026-10-30:5');
  });
});

describe('nhắc lỗi thời', () => {
  const lich = [moc({})];
  it('còn đúng thì không lỗi thời', () => {
    expect(thongBaoNhacLoiThoi('han:tndn_tam_nop:2026-q3:2026-10-30:5', lich, null, '2026-10-25', 'phai_lam')).toBe(false);
  });
  it('hạn qua / mốc biến mất / không áp dụng / đổi trạng thái', () => {
    expect(thongBaoNhacLoiThoi('han:tndn_tam_nop:2026-q3:2026-10-30:5', lich, null, '2026-10-31')).toBe(true);
    expect(thongBaoNhacLoiThoi('han:khac:2026-10-30:5', lich, null, '2026-10-25')).toBe(true);
    expect(thongBaoNhacLoiThoi('han:tndn_tam_nop:2026-q3:2026-10-30:5', [moc({ trang_thai: 'khong_ap_dung' })], null, '2026-10-25')).toBe(true);
    expect(thongBaoNhacLoiThoi('han:tndn_tam_nop:2026-q3:2026-10-30:5', lich, null, '2026-10-25', 'can_xac_minh')).toBe(true);
  });
  it('cần xem: lỗi thời khi không còn hỏi, hoặc hỏi câu khác', () => {
    expect(thongBaoNhacLoiThoi('can_xem:2026:tong_chua_ro', lich, PHU_THUOC, '2026-10-25')).toBe(false);
    expect(thongBaoNhacLoiThoi('can_xem:2026:tong_chua_ro', lich, { ket_luan_phu_thuoc: false, cau_hoi_can_xem: null }, '2026-10-25')).toBe(true);
    expect(thongBaoNhacLoiThoi('can_xem:2026:tong_chua_ro', lich, { ket_luan_phu_thuoc: true, cau_hoi_can_xem: { ...CAU, khoa: 'khac' } }, '2026-10-25')).toBe(true);
  });
  it('khoá lạ (lịch chung cũ) giữ nguyên', () => {
    expect(thongBaoNhacLoiThoi('han:2026-q3:7', lich, null, '2026-10-25')).toBe(false);
  });
});
