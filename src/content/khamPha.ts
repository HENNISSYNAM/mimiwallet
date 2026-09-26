import type { KhoaKhoi } from '@/pages/Landing';

/**
 * Trang "Khám phá" — nơi các khối trình diễn sâu dời ra khỏi trang chủ (26/09/2026).
 * Mỗi trang hiện đúng các khối của trang chủ cũ (cùng mã), cộng ô đăng ký ở cuối.
 */
export interface TrangKhamPha {
  slug: string;
  ten: string;
  mo_ta: string;
  khoi: KhoaKhoi[];
}

export const TRANG_KHAM_PHA: TrangKhamPha[] = [
  { slug: 'demo', ten: 'Xem MIMI làm việc', mo_ta: 'Khung demo tự chạy: từ tiền vào tới chứng từ và tờ khai.', khoi: ['demo', 'dang_ky'] },
  { slug: 'agent-ai', ten: 'AI chi tiêu theo luật của bạn', mo_ta: 'Ba nguyên tắc cho agent và nhật ký từng bước.', khoi: ['agent_ai', 'nhat_ky', 'dang_ky'] },
  { slug: 'bao-mat', ten: 'Bảo mật và minh bạch', mo_ta: 'Dừng khoản đáng ngờ, công nghệ bên dưới, xem được từng bước.', khoi: ['bao_mat_video', 'cong_nghe', 'minh_bach', 'dang_ky'] },
  { slug: 'giai-phap', ten: 'Sổ sách sạch trước kỳ kê khai', mo_ta: 'Các việc MIMI làm cho sổ sách, chứng từ và thuế.', khoi: ['nang_luc', 'giai_phap', 'dang_ky'] },
  { slug: 'cap-nhat', ten: 'Cập nhật sản phẩm', mo_ta: 'Những gì vừa chạy thật trên MIMI.', khoi: ['cap_nhat', 'dang_ky'] },
];

export const KHAM_PHA_THEO_SLUG: Record<string, TrangKhamPha> = Object.fromEntries(TRANG_KHAM_PHA.map((t) => [t.slug, t]));
