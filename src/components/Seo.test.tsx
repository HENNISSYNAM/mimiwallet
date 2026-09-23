import { describe, expect, it, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import Seo from './Seo';
import { SITE_URL } from '@/lib/env';

/**
 * Các phép kiểm này canh đúng một thứ: thẻ head phải có mặt ở LẦN DỰNG ĐẦU TIÊN.
 *
 * Bản cũ dùng `react-helmet-async`; đo trên app thật ngày 23/09/2026 thấy trang
 * mở trực tiếp (không điều hướng trong app) không hề có canonical, og:url hay
 * meta robots, dù nội dung đã hiện đủ. Trang sau đăng nhập vì thế mất luôn
 * `noindex`.
 */

const doc = () => document.head;

describe('Seo', () => {
  beforeEach(() => { doc().innerHTML = ''; document.title = ''; });

  it('đặt title, description, canonical và og ngay lần dựng đầu', () => {
    render(<Seo title="Tổng quan — MIMI" description="Mô tả trang" path="/dashboard" />);
    expect(document.title).toBe('Tổng quan — MIMI');
    expect(doc().querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Mô tả trang');
    expect(doc().querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE_URL}/dashboard`);
    expect(doc().querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(`${SITE_URL}/dashboard`);
    expect(doc().querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Tổng quan — MIMI');
  });

  it('canonical trỏ tên miền chính thức, không phải lovable.app', () => {
    render(<Seo title="T" description="D" path="/" />);
    const href = doc().querySelector('link[rel="canonical"]')!.getAttribute('href')!;
    expect(href).not.toContain('lovable');
    expect(href.startsWith('https://')).toBe(true);
  });

  it('noIndex thì có meta robots — thứ bản cũ không bao giờ chèn được', () => {
    render(<Seo title="T" description="D" path="/dashboard" noIndex />);
    expect(doc().querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
  });

  it('trang công khai thì GỠ robots, không mang noindex của trang trước', () => {
    const { unmount } = render(<Seo title="A" description="D" path="/dashboard" noIndex />);
    expect(doc().querySelector('meta[name="robots"]')).toBeTruthy();
    unmount();
    render(<Seo title="B" description="D" path="/" />);
    expect(doc().querySelector('meta[name="robots"]')).toBeNull();
  });

  it('đổi route thì ghi đè, không nhân bản thẻ', () => {
    const { rerender } = render(<Seo title="A" description="D1" path="/a" />);
    rerender(<Seo title="B" description="D2" path="/b" />);
    expect(doc().querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(doc().querySelectorAll('meta[property="og:url"]').length).toBe(1);
    expect(doc().querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE_URL}/b`);
    expect(document.title).toBe('B');
  });
});
