import { describe, expect, it, vi, beforeAll, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ChonNgonNgu } from './ChonNgonNgu';
import { NGON_NGU } from '@/i18n';

/**
 * Trang công khai phải tới được ĐỦ bốn ngôn ngữ.
 *
 * Bản trước là nút hai chiều vi ⇄ en, nên người đang để tiếng Hàn hoặc tiếng
 * Trung ra trang công khai chỉ thấy một nút "VI" — bấm vào là sang tiếng Việt và
 * không còn đường quay lại. Agent đóng vai một chủ xưởng ở Osaka gặp đúng ngõ cụt
 * đó ngày 23/09/2026.
 */

const doiNgonNgu = vi.fn();
let ngonNguHienTai = 'ko';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: {
      get language() { return ngonNguHienTai; },
      changeLanguage: (ma: string) => { doiNgonNgu(ma); ngonNguHienTai = ma; },
    },
  }),
}));

const mo = () => {
  render(<ChonNgonNgu />);
  fireEvent.click(screen.getByRole('button', { name: 'man.chung.chonNgonNgu' }));
  return screen.getByRole('group', { name: 'man.chung.chonNgonNgu' });
};

describe('Bộ chọn ngôn ngữ ở trang công khai', () => {
  /*
   * Trả tiền nạp module ở đây, không bắt ca kiểm đầu tiên gánh.
   *
   * Lần `render` đầu trong tệp này phải kéo cả Radix Popover qua đường biên dịch
   * của vite. Trên máy đang tải, riêng việc đó vượt hạn 30 giây — và đo được
   * rằng ca nào ĐỨNG ĐẦU cũng hết giờ, còn chính nó chạy ở vị trí thứ hai thì
   * đạt. Đổi thứ tự hai lần, lỗi đi theo vị trí chứ không đi theo phép kiểm:
   *
   *     45s → 18s → 10s → 3,4s → 4,9s     (thứ tự ban đầu)
   *     33s → 22s → 9,6s → 8,6s → 3,3s    (sau khi đảo)
   *
   * Nới `testTimeout` toàn cục sẽ giấu mất những ca treo thật. Một lần dựng nháp
   * với hạn giờ riêng thì chỉ chỗ này được nới, mọi ca kiểm vẫn giữ ngân sách
   * bình thường.
   */
  beforeAll(() => { render(<ChonNgonNgu />); cleanup(); }, 180_000);

  beforeEach(() => { doiNgonNgu.mockClear(); ngonNguHienTai = 'ko'; });

  it('nút hiện mã của ngôn ngữ đang dùng', () => {
    render(<ChonNgonNgu />);
    expect(screen.getByRole('button', { name: 'man.chung.chonNgonNgu' }).textContent).toContain('KO');
  });

  it('mở ra đủ bốn ngôn ngữ, không phải nút hai chiều', () => {
    const hop = mo();
    for (const n of NGON_NGU) expect(within(hop).getByText(n.ten)).toBeTruthy();
    expect(NGON_NGU.length).toBe(4);
  });

  it('đang ở tiếng Hàn vẫn chọn lại được tiếng Hàn và mọi thứ tiếng khác', () => {
    const hop = mo();
    fireEvent.click(within(hop).getByText('한국어'));
    expect(doiNgonNgu).toHaveBeenCalledWith('ko');
  });

  it('chọn một thứ tiếng thì gọi đúng mã đó', () => {
    const hop = mo();
    fireEvent.click(within(hop).getByText('中文'));
    expect(doiNgonNgu).toHaveBeenCalledWith('zh');
  });


  it('ngôn ngữ lạ thì lùi về mục đầu, không vỡ', () => {
    ngonNguHienTai = 'fr-FR';
    render(<ChonNgonNgu />);
    expect(screen.getByRole('button', { name: 'man.chung.chonNgonNgu' }).textContent).toContain(NGON_NGU[0].ma_ngan);
  });
});
