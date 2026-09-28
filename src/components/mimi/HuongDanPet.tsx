import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { datHienPet, docCaiDat, SU_KIEN_LENH_PET } from '@/lib/petMimi';

/**
 * Hướng dẫn pet MIMI cho người MỚI (28/09/2026).
 *
 * Pet mặc định ẩn (df1b01f), nên người mới không biết nó có. Thẻ này hiện cho tài khoản tạo trong
 * 14 ngày gần nhất, một lần: nói pet làm được gì, cho BẬT ngay (hoặc để sau). Đóng rồi thì không hiện
 * lại — cờ "đã xem" chỉ là tiện ích giao diện của trình duyệt này, không chứa dữ liệu tài chính.
 */
export const KHOA_DA_XEM = 'mimi.huong_dan_pet.v1';
const NGAY_LA_NGUOI_MOI = 14;

function daXem(): boolean {
  try { return localStorage.getItem(KHOA_DA_XEM) === '1'; } catch { return false; }
}
function ghiDaXem() {
  try { localStorage.setItem(KHOA_DA_XEM, '1'); } catch { /* không lưu được: lần sau hiện lại, vô hại */ }
}

export function laNguoiMoi(taoLuc: string | undefined, now = Date.now()): boolean {
  if (!taoLuc) return false;
  const t = Date.parse(taoLuc);
  return Number.isFinite(t) && now - t < NGAY_LA_NGUOI_MOI * 86_400_000;
}

export function HuongDanPet() {
  const user = useAuthStore((s) => s.user);
  const [hien, setHien] = useState(false);
  const [petDangHien, setPetDangHien] = useState(() => !docCaiDat().an);

  useEffect(() => {
    setHien(!!user && laNguoiMoi(user.created_at) && !daXem());
  }, [user]);

  useEffect(() => {
    const khiDoi = () => setPetDangHien(!docCaiDat().an);
    window.addEventListener(SU_KIEN_LENH_PET, khiDoi);
    return () => window.removeEventListener(SU_KIEN_LENH_PET, khiDoi);
  }, []);

  if (!hien) return null;
  const dong = () => { ghiDaXem(); setHien(false); };

  return (
    <aside
      role="dialog"
      aria-label="Làm quen với pet MIMI"
      className="fixed bottom-4 right-4 z-40 w-[min(92vw,360px)] rounded-2xl border border-border bg-card p-4 shadow-xl"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-display font-semibold text-foreground">Làm quen với pet MIMI</p>
        <button type="button" onClick={dong} aria-label="Đóng hướng dẫn" className="rounded-md p-1 text-muted-foreground hover:bg-accent">
          <X size={16} />
        </button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Chú mèo nhỏ ở góc màn hình — cùng bộ não với MIMI Assistant.</p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-foreground">
        <li><strong>Bấm vào mèo</strong> để hỏi nhanh, không phải rời trang đang làm. Trả lời xong mèo báo; bấm thông báo để xem đủ ở MIMI Assistant.</li>
        <li><strong>Nói thay vì gõ</strong>: bấm biểu tượng sóng âm cạnh ô hỏi.</li>
        <li><strong>Khi có việc cần bạn</strong> (khoản chờ duyệt, hạn thuế), mèo ngồi chờ và hiện số việc.</li>
        <li><strong>Kéo mèo</strong> đi đâu cũng được; chuột phải để đổi cỡ hoặc ẩn. Bật/tắt nhanh: <kbd className="rounded border border-border px-1 text-xs">Alt</kbd>+<kbd className="rounded border border-border px-1 text-xs">Shift</kbd>+<kbd className="rounded border border-border px-1 text-xs">M</kbd>, hoặc gõ <code className="text-xs">/pet</code> trong MIMI Assistant.</li>
      </ol>
      <p className="mt-2 text-xs text-muted-foreground">Pet chỉ đọc và soạn nháp — việc duyệt chi, lưu chứng từ luôn hỏi bạn xác nhận.</p>
      <div className="mt-3 flex gap-2">
        {petDangHien ? (
          <button type="button" onClick={dong} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Đã hiểu</button>
        ) : (
          <button type="button" onClick={() => { datHienPet(true); dong(); }} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Bật pet MIMI</button>
        )}
        {!petDangHien && (
          <button type="button" onClick={dong} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Để sau (bật lại trong Cài đặt)</button>
        )}
      </div>
    </aside>
  );
}
