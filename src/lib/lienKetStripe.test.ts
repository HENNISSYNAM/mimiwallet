import { describe, it, expect } from 'vitest';
import { duongDanMuaGoi, LINK_MUA_GOI } from './lienKetStripe';

describe('duongDanMuaGoi', () => {
  it('nhận ra chế độ thử từ chính đường dẫn, không từ cờ cấu hình', () => {
    // Một nút thu tiền ở chế độ thử mà trông y hệt nút thật là lỗi im lặng tệ
    // nhất: khách bấm, thấy "thành công", không đồng nào chuyển đi. Đọc từ URL
    // thì không ai quên bật tắt được.
    expect(duongDanMuaGoi('c1').cheDoThu).toBe(/\/test_/.test(LINK_MUA_GOI));
  });

  it('gắn client_reference_id để biết ai vừa trả', () => {
    // Thiếu tham số này thì tiền vào Stripe nhưng gói công ty không kích hoạt.
    const r = duongDanMuaGoi('cong-ty-123');
    expect(r.duongDan).toContain('client_reference_id=cong-ty-123');
  });

  it('mã có ký tự đặc biệt vẫn an toàn trong URL', () => {
    expect(duongDanMuaGoi('a b&c=d').duongDan).toContain('client_reference_id=a%20b%26c%3Dd');
  });

  it('dùng & khi link đã có sẵn tham số', () => {
    // Không tự dựng lại link; chỉ nối đúng dấu.
    const r = duongDanMuaGoi('c1');
    const soDauHoi = (r.duongDan ?? '').split('?').length - 1;
    expect(soDauHoi).toBe(1);
  });

  it('không có companyId thì vẫn trả link nhưng không gắn mã', () => {
    const r = duongDanMuaGoi(null);
    expect(r.bat).toBe(true);
    expect(r.duongDan).not.toContain('client_reference_id');
  });
});
