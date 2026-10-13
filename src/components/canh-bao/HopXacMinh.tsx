import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [daKiem, setDaKiem] = useState(false);
  useEffect(() => { if (dauHieu) setDaKiem(false); }, [dauHieu]);

  return (
    <AlertDialog open={dauHieu !== null} onOpenChange={(m) => { if (!m) onHuy(); }}>
      <AlertDialogContent className="rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" aria-hidden />
            {t('ui2.canhBao.dungLai')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('ui2.canhBao.thayDauHieu', { so: dauHieu?.length ?? 0 })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="space-y-2" aria-label={t('ui2.canhBao.dauHieu')}>
          {(dauHieu ?? []).map((d) => (
            <li key={d.ma} className="rounded-md border border-border p-3 text-sm">
              <span
                className={`mr-2 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                  d.muc_do === 'cao' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground'
                }`}
              >
                {d.muc_do === 'cao' ? t('ui2.canhBao.mucCao') : t('ui2.canhBao.canDeY')}
              </span>
              {d.cau}
            </li>
          ))}
        </ul>

        {!lichSuDu && (
          <p className="text-xs text-muted-foreground">
            {t('ui2.canhBao.motPhanLichSu')}
          </p>
        )}

        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={daKiem}
            onCheckedChange={(v) => setDaKiem(v === true)}
            aria-label={t('ui2.canhBao.daXacMinhAria')}
            className="mt-0.5"
          />
          <span>
            {t('ui2.canhBao.daGoiLai')}
          </span>
        </label>

        <AlertDialogFooter>
          <AlertDialogCancel autoFocus>{t('ui2.canhBao.chuaDuyet')}</AlertDialogCancel>
          <AlertDialogAction
            disabled={!daKiem}
            onClick={onVanDuyet}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('ui2.canhBao.vanDuyet')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
