import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { HoiQuyenMic } from '@/hooks/useNgheGiong';

/**
 * MIMI hỏi trước khi bật mic (26/09/2026) — xem `hooks/useNgheGiong.ts`.
 * "xin": giải thích vì sao cần mic và âm thanh đi đâu, rồi mới để trình duyệt hỏi.
 * "bi_chan": trình duyệt không hỏi lại được nữa — chỉ cách mở lại.
 */
export function HopBatMic({ trangThai, onDongY, onDong }: { trangThai: HoiQuyenMic; onDongY: () => void; onDong: () => void }) {
  return (
    <AlertDialog open={trangThai !== null} onOpenChange={(mo) => { if (!mo) onDong(); }}>
      <AlertDialogContent>
        {trangThai === 'bi_chan' ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Micro đang bị chặn</AlertDialogTitle>
              <AlertDialogDescription>
                Trình duyệt đã chặn micro cho trang này nên MIMI không hỏi lại được. Bấm biểu tượng ổ khoá (hoặc biểu tượng
                cài đặt) bên trái địa chỉ trang → Micro → Cho phép, rồi bấm mic lần nữa.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={onDong}>Đã hiểu</AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>MIMI xin bật micro nhé?</AlertDialogTitle>
              <AlertDialogDescription>
                Để bạn nói câu hỏi thay vì gõ. Bấm "Cho phép", rồi chọn "Cho phép" ở hộp của trình duyệt. Dịch vụ nhận giọng của
                trình duyệt (Chrome, Edge) đổi giọng thành chữ; MIMI chỉ nhận chữ, không lưu âm thanh. Bạn tắt lại được bất cứ lúc
                nào ở biểu tượng ổ khoá cạnh địa chỉ trang.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Để sau</AlertDialogCancel>
              <AlertDialogAction onClick={onDongY}>Cho phép</AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
