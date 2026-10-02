import { useEffect, useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * "Dùng MIMI như ứng dụng" — nút cửa hàng ở thanh bên mở hộp này (như ChatGPT mở "Get
 * ChatGPT desktop / mobile").
 *
 * NÓI THẬT: MIMI chưa có app trên App Store hay Google Play. Cái cài được là bản web cài
 * vào máy (manifest ở `public/manifest.webmanifest`): có biểu tượng trên màn hình chính,
 * mở toàn màn hình, cùng tài khoản và dữ liệu. Trình duyệt hỗ trợ cài trực tiếp thì hiện
 * nút "Cài MIMI"; không thì hướng dẫn từng bước.
 */

interface SuKienCai extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let suKienCai: SuKienCai | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    suKienCai = e as SuKienCai;
  });
}

export function HopTaiUngDung({ mo, onDong, tab = 'dien_thoai' }: { mo: boolean; onDong: () => void; tab?: 'dien_thoai' | 'may_tinh' }) {
  const [dangXem, setDangXem] = useState(tab);
  const [daCai, setDaCai] = useState(false);
  useEffect(() => { if (mo) setDangXem(tab); }, [mo, tab]);

  const cai = async () => {
    if (!suKienCai) return;
    await suKienCai.prompt();
    const { outcome } = await suKienCai.userChoice;
    if (outcome === 'accepted') setDaCai(true);
    suKienCai = null;
  };

  return (
    <Dialog open={mo} onOpenChange={(v) => { if (!v) onDong(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dùng MIMI như ứng dụng</DialogTitle>
          <DialogDescription>MIMI chưa có trên App Store hay Google Play. Cài bản web vào máy để mở nhanh từ màn hình chính — cùng tài khoản, cùng dữ liệu.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-accent p-1" role="group" aria-label="Thiết bị">
          {([['dien_thoai', 'Điện thoại', Smartphone], ['may_tinh', 'Máy tính', Monitor]] as const).map(([khoa, nhan, Icon]) => (
            <button
              key={khoa}
              type="button"
              aria-pressed={dangXem === khoa}
              onClick={() => setDangXem(khoa)}
              className={`inline-flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium ${dangXem === khoa ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              <Icon size={15} /> {nhan}
            </button>
          ))}
        </div>

        {suKienCai && !daCai && (
          <button type="button" onClick={() => void cai()} className="h-11 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:brightness-110">
            Cài MIMI vào máy này
          </button>
        )}
        {daCai && <p className="text-sm text-mimi-green">Đã cài. Mở MIMI từ màn hình chính hoặc danh sách ứng dụng.</p>}

        {dangXem === 'dien_thoai' ? (
          <div className="space-y-3 text-sm text-foreground">
            <div>
              <p className="font-medium">iPhone (Safari)</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted-foreground">
                <li>Mở MIMI bằng Safari.</li>
                <li>Bấm nút Chia sẻ ở thanh dưới.</li>
                <li>Chọn "Thêm vào Màn hình chính".</li>
              </ol>
            </div>
            <div>
              <p className="font-medium">Android (Chrome)</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted-foreground">
                <li>Mở MIMI bằng Chrome.</li>
                <li>Bấm dấu ba chấm ở góc trên.</li>
                <li>Chọn "Cài đặt ứng dụng" hoặc "Thêm vào màn hình chính".</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-sm text-foreground">
            <p className="font-medium">Chrome hoặc Edge trên máy tính</p>
            <ol className="list-decimal space-y-0.5 pl-5 text-muted-foreground">
              <li>Mở MIMI trong trình duyệt.</li>
              <li>Bấm biểu tượng cài đặt ở cuối thanh địa chỉ (hình màn hình có mũi tên).</li>
              <li>Chọn "Cài đặt". MIMI mở thành cửa sổ riêng, có trong menu Start hoặc Dock.</li>
            </ol>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
