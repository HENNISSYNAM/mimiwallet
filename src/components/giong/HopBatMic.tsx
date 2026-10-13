import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { HoiQuyenMic } from '@/hooks/useNgheGiong';
import { useTranslation } from 'react-i18next';

/**
 * MIMI hỏi trước khi bật mic (26/09/2026) — xem `hooks/useNgheGiong.ts`.
 * "xin": giải thích vì sao cần mic và âm thanh đi đâu, rồi mới để trình duyệt hỏi.
 * "bi_chan": trình duyệt không hỏi lại được nữa — chỉ cách mở lại.
 */
export function HopBatMic({ trangThai, onDongY, onDong }: { trangThai: HoiQuyenMic; onDongY: () => void; onDong: () => void }) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={trangThai !== null} onOpenChange={(mo) => { if (!mo) onDong(); }}>
      <AlertDialogContent>
        {trangThai === 'bi_chan' ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('ui2.mic.biChan')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('ui2.mic.biChanMo')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={onDong}>{t('ui2.mic.daHieu')}</AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('ui2.mic.xinBat')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('ui2.mic.xinBatMo')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('ui2.mic.deSau')}</AlertDialogCancel>
              <AlertDialogAction onClick={onDongY}>{t('ui2.mic.choPhep')}</AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
