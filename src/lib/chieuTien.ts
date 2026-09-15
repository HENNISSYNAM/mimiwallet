// Bản duy nhất nằm ở `_shared` để MIMI Assistant (edge function `tro-ly`) đọc chiều tiền
// đúng như mọi màn hình. Đọc lý do ở file gốc.
export * from '../../supabase/functions/_shared/tien/chieu-tien.ts';
