import { describe, it, expect } from 'vitest';
import {
  HAN_MUC,
  duocLamBenChoVay,
  duocLamBenDiVay,
  kiemTraHanMuc,
  kyHanHopLe,
  CHUA_DUOC_CHAP_THUAN,
  CAU_CANH_BAO,
  type Ben,
} from './vayNgangHang';

const ben = (over: Partial<Ben> = {}): Ben => ({ tuCach: 'phap_nhan_vn', ...over });

describe('Ai được đứng ở bên nào — Nghị định 94', () => {
  it('ngân hàng được CHO vay nhưng không được ĐI vay', () => {
    // Đây là điểm khác nhau quan trọng nhất giữa hai bên, và là chỗ dễ viết
    // nhầm nhất nếu dùng chung một hàm kiểm tra cho cả hai.
    const nh = ben({ tuCach: 'to_chuc_tin_dung' });
    expect(duocLamBenChoVay(nh).duoc).toBe(true);
    expect(duocLamBenDiVay(nh).duoc).toBe(false);
    expect(duocLamBenDiVay(nh).vuong).toContain('Tổ chức tín dụng');
  });

  it('công ty vận hành sàn và người liên quan không được đi vay trên sàn của mình', () => {
    const ra = duocLamBenDiVay(ben({ laNguoiLienQuan: true }));
    expect(ra.duoc).toBe(false);
    expect(ra.vuong).toContain('sàn của mình');
  });

  it('công ty cầm đồ bị cấm ở cả hai bên', () => {
    expect(duocLamBenChoVay(ben({ laCamDo: true })).duoc).toBe(false);
    expect(duocLamBenDiVay(ben({ laCamDo: true })).duoc).toBe(false);
  });

  it('người và pháp nhân nước ngoài không được tham gia bên nào', () => {
    for (const tc of ['ca_nhan_nn', 'phap_nhan_nn'] as const) {
      expect(duocLamBenChoVay(ben({ tuCach: tc })).duoc).toBe(false);
      expect(duocLamBenDiVay(ben({ tuCach: tc })).duoc).toBe(false);
    }
  });

  it('cá nhân và pháp nhân Việt Nam được cả hai bên', () => {
    for (const tc of ['ca_nhan_vn', 'phap_nhan_vn'] as const) {
      expect(duocLamBenChoVay(ben({ tuCach: tc })).duoc).toBe(true);
      expect(duocLamBenDiVay(ben({ tuCach: tc })).duoc).toBe(true);
    }
  });

  it('trường hợp đạt thì KHÔNG kèm lý do — không bịa chữ cho ca thành công', () => {
    expect(duocLamBenChoVay(ben()).vuong).toBeNull();
    expect(duocLamBenDiVay(ben()).vuong).toBeNull();
  });
});

describe('Trần dư nợ — chưa biết khác với bằng không', () => {
  it('không biết dư nợ sàn khác thì vẫn cho vay nhưng BẬT CỜ thiếu dữ liệu', () => {
    // Đây là kỷ luật quan trọng nhất của file: im lặng coi dư nợ sàn khác bằng 0
    // sẽ để người dùng tưởng trần 400 triệu đã được kiểm, trong khi chưa.
    const ra = kiemTraHanMuc({ duNoTaiSanNay: 0 }, 50_000_000);
    expect(ra.duoc).toBe(true);
    expect(ra.thieuDuLieu).toBe(true);
  });

  it('biết dư nợ sàn khác thì không còn thiếu dữ liệu, kể cả khi bằng 0', () => {
    const ra = kiemTraHanMuc({ duNoTaiSanNay: 0, duNoSanKhac: 0 }, 50_000_000);
    expect(ra.thieuDuLieu).toBe(false);
  });

  it('chặn đúng trần 100 triệu của một sàn', () => {
    const ra = kiemTraHanMuc({ duNoTaiSanNay: 60_000_000 }, 50_000_000);
    expect(ra.duoc).toBe(false);
    expect(ra.vuong).toContain('100 triệu');
    expect(ra.conDuocVay).toBe(40_000_000);
  });

  it('đúng bằng trần thì vẫn được — chặn là "vượt", không phải "chạm"', () => {
    const ra = kiemTraHanMuc({ duNoTaiSanNay: 0 }, HAN_MUC.MOT_GIAI_PHAP);
    expect(ra.duoc).toBe(true);
    expect(ra.conDuocVay).toBe(0);
  });

  it('chặn tổng 400 triệu khi đã biết dư nợ các sàn khác', () => {
    // Lọt trần sàn này (80tr < 100tr) nhưng vượt tổng: 350 + 80 = 430 > 400.
    const ra = kiemTraHanMuc({ duNoTaiSanNay: 0, duNoSanKhac: 350_000_000 }, 80_000_000);
    expect(ra.duoc).toBe(false);
    expect(ra.vuong).toContain('400 triệu');
    expect(ra.conDuocVay).toBe(50_000_000);
  });

  it('trần sàn này được kiểm TRƯỚC trần tổng', () => {
    // Vướng cả hai. Câu báo phải nói cái sát người dùng nhất trước.
    const ra = kiemTraHanMuc({ duNoTaiSanNay: 90_000_000, duNoSanKhac: 390_000_000 }, 50_000_000);
    expect(ra.vuong).toContain('100 triệu');
  });

  it('số tiền không hợp lệ thì conDuocVay là null, không phải 0', () => {
    // 0 nghĩa là "đã tính ra và bằng không". null nghĩa là "không tính được".
    expect(kiemTraHanMuc({ duNoTaiSanNay: 0 }, 0).conDuocVay).toBeNull();
    expect(kiemTraHanMuc({ duNoTaiSanNay: 0 }, -1).conDuocVay).toBeNull();
  });

  it('còn vay được không bao giờ âm', () => {
    const ra = kiemTraHanMuc({ duNoTaiSanNay: 200_000_000 }, 10_000_000);
    expect(ra.conDuocVay).toBeGreaterThanOrEqual(0);
  });
});

describe('Kỳ hạn — không quá 02 năm', () => {
  it('730 ngày được, 731 ngày không', () => {
    expect(kyHanHopLe(730).duoc).toBe(true);
    expect(kyHanHopLe(731).duoc).toBe(false);
    expect(kyHanHopLe(731).vuong).toContain('02 năm');
  });

  it('kỳ hạn không dương thì không hợp lệ', () => {
    expect(kyHanHopLe(0).duoc).toBe(false);
    expect(kyHanHopLe(-30).duoc).toBe(false);
  });
});

describe('Trạng thái được phép vận hành', () => {
  it('chừng nào chưa có giấy chứng nhận thì câu cảnh báo phải nói rõ ba điều', () => {
    // Nếu ai đó đổi CHUA_DUOC_CHAP_THUAN thành false mà quên sửa câu cảnh báo,
    // test này không bắt được — nhưng nó bắt được việc câu cảnh báo bị làm nhẹ
    // đi trong lúc cờ vẫn đang bật, vốn là kiểu trôi dễ xảy ra hơn nhiều.
    if (CHUA_DUOC_CHAP_THUAN) {
      expect(CAU_CANH_BAO).toContain('Ngân hàng Nhà nước');
      expect(CAU_CANH_BAO).toContain('94/2025');
      expect(CAU_CANH_BAO).toContain('không nhận tiền thật');
    }
  });
});
