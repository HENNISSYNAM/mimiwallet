import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Privacy from './Privacy';
import { COMPANY, CONTACT, coKenhLienHeVanBan } from '@/config/company';

/**
 * Mục "Liên hệ" của Chính sách bảo mật phải luôn kết thúc bằng một địa chỉ.
 *
 * 23/09/2026: trang này dùng `hasContact()` — phép kiểm của CHÂN TRANG, vốn trả
 * true chỉ nhờ có trang Facebook — rồi lại chỉ in `email` và `website`, hai
 * trường đang rỗng. Câu ra thành "…xin gửi tới ." và không ai nhận được yêu cầu
 * về dữ liệu cá nhân. Một agent đóng vai khách hàng ở Berlin đọc ra ngay.
 */

const dung = () => render(<MemoryRouter><Privacy /></MemoryRouter>);

describe('Chính sách bảo mật — mục Liên hệ', () => {
  it('không bao giờ để câu cụt: luôn có email, website, hoặc địa chỉ trụ sở', () => {
    dung();
    const doan = screen.getByText(/xin gửi tới/).closest('p')!;
    const chu = doan.textContent ?? '';

    // Câu hỏng có dạng "…xin gửi tới ." — chấm câu ngay sau khoảng trắng.
    expect(chu).not.toMatch(/xin gửi tới\s*\.\s*$/);

    const coDiaChi =
      (CONTACT.email && chu.includes(CONTACT.email)) ||
      (CONTACT.website && chu.includes(CONTACT.website)) ||
      chu.includes(COMPANY.address);
    expect(coDiaChi).toBe(true);
  });

  it('chưa có email hay website thì lùi về trụ sở đăng ký, không dùng Facebook', () => {
    dung();
    const chu = screen.getByText(/xin gửi tới/).closest('p')!.textContent ?? '';
    if (!coKenhLienHeVanBan()) {
      expect(chu).toContain(COMPANY.legalName);
      expect(chu).toContain(COMPANY.address);
      expect(chu.toLowerCase()).not.toContain('facebook');
    }
  });
});
