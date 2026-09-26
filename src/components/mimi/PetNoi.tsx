import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Mic, Pencil } from 'lucide-react';
import { TEN_TRANG_THAI_PET, type TrangThaiPet } from '@/lib/petMimi';

/**
 * MIMI RA MÀN HÌNH MÁY (26/09/2026) — như pet của ChatGPT desktop nổi trên mọi app.
 *
 * Web không vẽ được ra ngoài cửa sổ trình duyệt, trừ Document Picture-in-Picture (Chrome/Edge 116+ trên
 * máy tính): một cửa sổ nhỏ LUÔN NẰM TRÊN mọi app khác, người dùng tự kéo nó đi bằng thanh tiêu đề. Pet
 * trong cửa sổ đó dùng CHÍNH trạng thái của pet trên trang (không có bộ não thứ hai). Bấm nút → đưa trang
 * MIMI lên trước và làm việc ở đó. Đóng cửa sổ nổi → mèo quay về trang.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DocPiP = { requestWindow: (o: { width: number; height: number }) => Promise<Window>; window: Window | null };

export const coHoTroNoi = (): boolean =>
  typeof window !== 'undefined' && 'documentPictureInPicture' in window && window.isSecureContext;

const layPiP = (): DocPiP | null => (coHoTroNoi() ? (window as unknown as { documentPictureInPicture: DocPiP }).documentPictureInPicture : null);

/** Chép toàn bộ CSS của trang sang cửa sổ nổi (Tailwind, phông) — không có thì nút mất kiểu. */
function chepKieu(dich: Document) {
  for (const s of Array.from(document.styleSheets)) {
    try {
      const style = dich.createElement('style');
      style.textContent = Array.from(s.cssRules).map((r) => r.cssText).join('\n');
      dich.head.appendChild(style);
    } catch {
      // Stylesheet khác nguồn (Google Fonts): không đọc được luật, chép thẻ link.
      if (s.href) {
        const link = dich.createElement('link');
        link.rel = 'stylesheet';
        link.href = s.href;
        dich.head.appendChild(link);
      }
    }
  }
  dich.documentElement.className = document.documentElement.className;
}

export async function moCuaSoNoi(): Promise<Window | null> {
  const pip = layPiP();
  if (!pip) return null;
  if (pip.window) return pip.window;
  const w = await pip.requestWindow({ width: 190, height: 250 });
  chepKieu(w.document);
  w.document.title = 'MIMI';
  w.document.body.style.margin = '0';
  return w;
}

export function PetNoi({ cuaSo, anh, tt, chuong, dangNghe, onGo, onNoi, onChuong, onDong }: {
  cuaSo: Window; anh: string; tt: TrangThaiPet; chuong: number; dangNghe: boolean;
  onGo: () => void; onNoi: () => void; onChuong: () => void; onDong: () => void;
}) {
  const [giamChuyenDong] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const dong = () => onDong();
    cuaSo.addEventListener('pagehide', dong);
    return () => cuaSo.removeEventListener('pagehide', dong);
  }, [cuaSo, onDong]);

  const nut = 'flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground shadow ring-1 ring-border hover:bg-accent';
  return createPortal(
    <div className="flex h-screen select-none flex-col items-center justify-center gap-2 bg-background p-2">
      {tt !== 'nghi' && (
        <span role="status" className="rounded-full bg-card px-2.5 py-0.5 text-[11px] font-medium text-foreground shadow ring-1 ring-border">{TEN_TRANG_THAI_PET[tt]}</span>
      )}
      <img
        src={anh} alt={`MIMI — ${TEN_TRANG_THAI_PET[tt]}`} draggable={false}
        className={`h-28 w-28 object-contain drop-shadow-lg ${tt === 'dang_chay' && !giamChuyenDong ? 'animate-bounce' : ''}`}
      />
      <div className="flex gap-1.5">
        <button type="button" className={nut} aria-label="Gõ để trò chuyện" title="Mở MIMI để gõ" onClick={onGo}><Pencil size={15} /></button>
        <button type="button" className={`${nut} ${dangNghe ? 'text-primary ring-primary' : ''}`} aria-label="Nói với MIMI" title="Nói với MIMI" onClick={onNoi}><Mic size={15} /></button>
        <button type="button" className={`${nut} relative`} aria-label={`Hoạt động${chuong ? ` — ${chuong} mục` : ''}`} title="Hoạt động" onClick={onChuong}>
          <Bell size={15} />
          {chuong > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">{chuong}</span>}
        </button>
      </div>
    </div>,
    cuaSo.document.body,
  );
}
