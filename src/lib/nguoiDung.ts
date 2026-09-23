/**
 * Ai đang đăng nhập — đọc từ phiên có sẵn, không đi mạng.
 *
 * VÌ SAO CÓ FILE NÀY. `supabase.auth.getUser()` gọi `GET /auth/v1/user` MỖI LẦN:
 * nó hỏi máy chủ xác minh lại token. Hàm này được gọi rải rác ở 12 tệp, mỗi
 * trang vài nơi, nên đo trên trang MIMI Assistant ngày 23/09/2026 ra **9 lần gọi
 * `/auth/v1/user` trong một lần mở trang**, mỗi lần 700–1000ms. Tổng thời gian
 * mạng của trang là 12,9 giây, và người dùng ngồi nhìn màn hình mèo "Nắng đẹp.
 * Nghỉ tay một lát đi" suốt 25–30 giây.
 *
 * `getSession()` đọc phiên từ bộ nhớ trình duyệt, không đi mạng, và tự làm mới
 * token khi sắp hết hạn. Đó là thứ cần ở đây.
 *
 * CÓ AN TOÀN KHÔNG. Có, và đây là chỗ đáng dừng lại một nhịp. Id lấy từ phiên
 * lưu ở máy khách thì về nguyên tắc là **không đáng tin** — nhưng không có chỗ
 * nào trong app dùng nó để QUYẾT ĐỊNH quyền. Nó chỉ dùng để lọc truy vấn cho
 * đúng dữ liệu của mình, và ai được đọc dòng nào là do RLS trên máy chủ định
 * đoạt từ `auth.uid()` trong token đã ký. Sửa id ở trình duyệt chỉ làm truy vấn
 * của chính mình trả về rỗng.
 *
 * Nói cách khác: `getUser()` không hề bảo vệ thêm được gì ở đây, nó chỉ trả
 * tiền mạng cho một phép xác minh mà máy chủ vẫn sẽ làm lại.
 *
 * KHI NÀO VẪN PHẢI DÙNG `getUser()`: khi cần chắc chắn token còn hiệu lực NGAY
 * LÚC ĐÓ trước một việc nhạy cảm (đổi mật khẩu, xoá tài khoản). Những chỗ đó
 * nằm trong danh sách miễn trừ của `nguoi-dung.test.ts`, kèm lý do.
 */

import { supabase } from '@/integrations/supabase/client';

export interface NguoiDungGon {
  id: string;
  email: string | null;
  /**
   * Claim do nhà cung cấp đăng nhập trả về (Google để ảnh đại diện ở đây).
   * Chỉ dùng để hiển thị, không bao giờ để quyết định quyền.
   */
  user_metadata: Record<string, unknown>;
}

/** Người đang đăng nhập, hoặc null. Không đi mạng. */
export async function nguoiDungHienTai(): Promise<NguoiDungGon | null> {
  const { data, error } = await supabase.auth.getSession();
  const u = data?.session?.user;
  if (error || !u) return null;
  return { id: u.id, email: u.email ?? null, user_metadata: u.user_metadata ?? {} };
}

/** Id người đang đăng nhập, hoặc null. Không đi mạng. */
export async function idNguoiDung(): Promise<string | null> {
  return (await nguoiDungHienTai())?.id ?? null;
}
