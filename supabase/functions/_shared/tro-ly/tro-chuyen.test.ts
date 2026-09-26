import { describe, expect, it } from 'vitest';
import { traLoiTroChuyen } from './tro-chuyen';
import { CAU_CHUA_HIEU, dungTraLoi } from './tra-loi';

describe('trò chuyện thường khi chưa có mô hình AI', () => {
  it('câu giao tiếp được đáp tự nhiên, không "Mình chưa hiểu"', () => {
    for (const cau of ['mimi ơi', 'Mimi ơi!', 'chào mimi', 'mimi nch được k', 'nói chuyện được không', 'bạn là ai', 'cảm ơn nha', 'bạn làm được gì']) {
      const tl = traLoiTroChuyen(cau);
      expect(tl, cau).toBeTruthy();
      expect(tl).not.toBe(CAU_CHUA_HIEU);
    }
    expect(traLoiTroChuyen('mimi ơi')).toContain('kế toán – kiểm toán, thuế, hải quan, tài chính và đầu tư');
  });

  it('câu nghiệp vụ không bị bắt nhầm thành trò chuyện', () => {
    for (const cau of ['doanh thu quý này bao nhiêu', 'khoản chi nào thiếu hoá đơn', 'thuế môn bài là gì']) {
      expect(traLoiTroChuyen(cau), cau).toBeNull();
    }
  });

  it('dựng câu trả lời: câu chào được đáp tự nhiên; câu không nhận ra thì nói thật vì sao và gợi ý hỏi gì', () => {
    expect(dungTraLoi({ ketQua: [], cheDo: 'co_dinh', cauHoi: 'mimi ơi' }).cau).toMatch(/^Mình đây!/);
    const r = dungTraLoi({ ketQua: [], cheDo: 'co_dinh', cauHoi: 'thời tiết hôm nay' });
    expect(r.cau).toBe(CAU_CHUA_HIEU);
    expect(r.cau).toContain('chế độ hiểu theo mẫu có sẵn');
  });
});
