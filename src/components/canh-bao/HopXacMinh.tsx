import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import type { DauHieu } from '@/lib/batThuong';

/**
 * TCCN-01 — hộp dừng lại khi bấm Duyệt một khoản có dấu hiệu bất thường.
 *
 * Nút an toàn ("Chưa duyệt") là nút chính và được focus sẵn: người đang bị giục chuyển tiền
 * gấp hay bấm Enter theo thói quen. Nút đi tiếp chỉ bấm được sau khi tích ô xác minh — và câu
 * trong ô nói rõ phải xác minh BẰNG CÁCH NÀO, vì kẻ gian luôn đưa sẵn một số điện thoại để
 * "xác minh" chính nó.
 */
export default function HopXacMinh({
  dauHieu,
  lichSuDu,
  onHuy,
  onVanDuyet,
}: {
  /** null = hộp đóng. */
  dauHieu: DauHieu[] | null;
  lichSuDu: boolean;
  onHuy: () => void;
  onVanDuyet: () => void;
}) {
  const [daKiem, setDaKiem] = useState(false);
  useEffect(() => { if (dauHieu) setDaKiem(false); }, [dauHieu]);

  return (
    <AlertDialog open={dauHieu !== null} onOpenChange={(m) => { if (!m) onHuy(); }}>
      <AlertDialogContent className="rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" aria-hidden />
            Dừng lại trước khi duyệt
          </AlertDialogTitle>
          <AlertDialogDescription>
            MIMI thấy {dauHieu?.length ?? 0} dấu hiệu bất thường ở khoản này. Đây là dấu hiệu, chưa phải kết luận — nhưng
            tiền đã chuyển thì rất khó lấy lại.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="space-y-2" aria-label="Dấu hiệu bất thường">
          {(dauHieu ?? []).map((d) => (
            <li key={d.ma} className="rounded-md border border-border p-3 text-sm">
              <span
                className={`mr-2 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                  d.muc_do === 'cao' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground'
                }`}
              >
                {d.muc_do === 'cao' ? 'Mức cao' : 'Cần để ý'}
              </span>
              {d.cau}
            </li>
          ))}
        </ul>

        {!lichSuDu && (
          <p className="text-xs text-muted-foreground">
            MIMI chỉ đọc được một phần lịch sử chi của công ty, nên có thể báo "người nhận mới" cho người bạn đã từng trả.
          </p>
        )}

        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={daKiem}
            onCheckedChange={(v) => setDaKiem(v === true)}
            aria-label="Tôi đã xác minh người nhận"
            className="mt-0.5"
          />
          <span>
            Tôi đã gọi lại người nhận qua số điện thoại có từ trước — không dùng số trong tin nhắn hay email yêu cầu chuyển
            tiền — và xác nhận đúng người, đúng số tài khoản.
          </span>
        </label>

        <AlertDialogFooter>
          <AlertDialogCancel autoFocus>Chưa duyệt</AlertDialogCancel>
          <AlertDialogAction
            disabled={!daKiem}
            onClick={onVanDuyet}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Đã xác minh, vẫn duyệt
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
