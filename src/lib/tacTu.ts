/**
 * Cùng một bộ luật chi cho máy chủ và giao diện.
 *
 * Màn hình tính "hạn mức đã dùng" bằng đúng hằng số và cách chia ngày theo giờ
 * Việt Nam mà edge function dùng để quyết. Hai bản chép tay sẽ lệch nhau vào
 * đúng ngày ai đó sửa một bên.
 */
export * from '../../supabase/functions/_shared/tac-tu/chinh-sach';
