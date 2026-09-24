import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import XoaTaiKhoan from './XoaTaiKhoan';
import { COMPANY, CONTACT, coKenhLienHeVanBan } from '@/config/company';

/**
 * Trang xoá tài khoản công khai — yêu cầu của Google Play.
 *
 * Play đòi hai đường xoá: một trong ứng dụng, và một đường dẫn web mở được mà
 * KHÔNG cần cài app hay đăng nhập, cho người đã gỡ ứng dụng.
 */

const dung = () => render(<MemoryRouter><XoaTaiKhoan /></MemoryRouter>);

describe('Trang xoá tài khoản công khai', () => {
  it('nói rõ những gì bị xoá và rằng không hoàn tác được', () => {
    dung();
    const chu = document.body.textContent ?? '';
    for (const x of ['giao dịch', 'hoá đơn', 'liên kết ngân hàng']) {
      expect(chu.toLowerCase()).toContain(x);
    }
    expect(chu).toMatch(/không hoàn tác được/i);
  });

  it('chỉ đường tới chỗ xoá thật trong ứng dụng', () => {
    dung();
    const l = within(document.querySelector('main')!).getByRole('link', { name: /Cài đặt/ });
    expect(l.getAttribute('href')).toBe('/dashboard/settings');
  });

  /*
   * Đây là phép kiểm quan trọng nhất của tệp này.
   *
   * Trang công khai thì ai mở cũng được, kể cả người đang cầm máy của người
   * khác. Một nút xoá đặt ở đây là một thao tác không hoàn tác được, không cần
   * chứng minh mình là chủ tài khoản. Việc xoá phải xảy ra sau khi đăng nhập.
   */
  it('KHÔNG có nút xoá nào trên trang công khai', () => {
    dung();
    const nut = screen.queryAllByRole('button');
    for (const n of nut) {
      expect(n.textContent ?? '').not.toMatch(/xoá tài khoản/i);
    }
  });

  it('có lối cho người đã gỡ app: địa chỉ liên hệ hoặc trụ sở, không để câu cụt', () => {
    dung();
    const chu = document.body.textContent ?? '';
    const coDiaChi =
      (CONTACT.email && chu.includes(CONTACT.email)) ||
      (CONTACT.website && chu.includes(CONTACT.website)) ||
      chu.includes(COMPANY.address);
    expect(coDiaChi).toBe(true);
    if (!coKenhLienHeVanBan()) expect(chu).toContain(COMPANY.legalName);
  });

  it('dẫn sang Chính sách bảo mật', () => {
    dung();
    // Khoanh vào <main>: chân trang cũng có link cùng tên, và phép kiểm này nói
    // về đường dẫn trong phần nội dung chứ không phải về chân trang.
    const trong = within(document.querySelector('main')!);
    expect(trong.getByRole('link', { name: /Chính sách bảo mật/ }).getAttribute('href')).toBe('/privacy');
  });
});
