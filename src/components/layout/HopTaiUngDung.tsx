import { useEffect, useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

/*
 * Trình duyệt bắn `beforeinstallprompt` vào lúc nó chọn — có khi SAU khi hộp đã mở. Giữ sự kiện ở cấp module và báo
 * cho mọi hộp đang mở, để nút "Cài MIMI" hiện ngay khi trình duyệt cho phép (01/10/2026).
 */
let suKienCai: SuKienCai | null = null;
let daCaiTrenMay = false;
const nguoiNghe = new Set<() => void>();
const bao = () => nguoiNghe.forEach((f) => f());
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    suKienCai = e as SuKienCai;
    bao();
  });
  window.addEventListener('appinstalled', () => {
    suKienCai = null;
    daCaiTrenMay = true;
    bao();
  });
}

/** Đang chạy như app đã cài (cửa sổ riêng) thì không cần mời cài nữa. */
const dangChayNhuApp = () => {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: window-controls-overlay)').matches;
  } catch {
    return false;
  }
};

export function HopTaiUngDung({ mo, onDong, tab = 'dien_thoai' }: { mo: boolean; onDong: () => void; tab?: 'dien_thoai' | 'may_tinh' }) {
  const [dangXem, setDangXem] = useState(tab);
  const [daCai, setDaCai] = useState(() => daCaiTrenMay || dangChayNhuApp());
  const [, lamMoi] = useState(0);
  const { t } = useTranslation();
  useEffect(() => { if (mo) setDangXem(tab); }, [mo, tab]);
  useEffect(() => {
    const f = () => { setDaCai(daCaiTrenMay || dangChayNhuApp()); lamMoi((n) => n + 1); };
    nguoiNghe.add(f);
    return () => { nguoiNghe.delete(f); };
  }, []);

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
          <DialogTitle>{t('kg.caiApp.tieuDe')}</DialogTitle>
          <DialogDescription>{t('kg.caiApp.moTa')}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-accent p-1" role="group" aria-label={t('kg.caiApp.thietBi')}>
          {([['dien_thoai', t('kg.caiApp.dienThoai'), Smartphone], ['may_tinh', t('kg.caiApp.mayTinh'), Monitor]] as const).map(([khoa, nhan, Icon]) => (
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
            {t('kg.caiApp.cai')}
          </button>
        )}
        {daCai && <p className="text-sm text-mimi-green">{t('kg.caiApp.daCai')}</p>}

        {dangXem === 'dien_thoai' ? (
          <div className="space-y-3 text-sm text-foreground">
            <div>
              <p className="font-medium">iPhone (Safari)</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted-foreground">
                <li>{t('kg.caiApp.ios1')}</li>
                <li>{t('kg.caiApp.ios2')}</li>
                <li>{t('kg.caiApp.ios3')}</li>
              </ol>
            </div>
            <div>
              <p className="font-medium">Android (Chrome)</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted-foreground">
                <li>{t('kg.caiApp.and1')}</li>
                <li>{t('kg.caiApp.and2')}</li>
                <li>{t('kg.caiApp.and3')}</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-sm text-foreground">
            <p className="font-medium">{t('kg.caiApp.pcTieuDe')}</p>
            <ol className="list-decimal space-y-0.5 pl-5 text-muted-foreground">
              <li>{t('kg.caiApp.pc1')}</li>
              <li>{t('kg.caiApp.pc2')}</li>
              <li>{t('kg.caiApp.pc3')}</li>
            </ol>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
