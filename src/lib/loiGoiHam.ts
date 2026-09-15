/**
 * Lỗi từ edge function, giữ nguyên mã HTTP và thân phản hồi.
 *
 * Một số lỗi mang dữ liệu để màn hình hỏi tiếp — ví dụ `409 TRUNG_KHOANG_NGAY`
 * kèm danh sách lần nhập bị trùng. Chỉ ném `Error(message)` thì mất phần đó.
 */
export class LoiGoiHam extends Error {
  constructor(message: string, public status: number, public body: Record<string, unknown>) {
    super(message);
    this.name = 'LoiGoiHam';
  }
}
