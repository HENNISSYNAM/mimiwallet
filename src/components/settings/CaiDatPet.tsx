import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { datHienPet, docCaiDat, SU_KIEN_LENH_PET } from '@/lib/petMimi';

/**
 * Bật / tắt pet MIMI (26/09/2026). Pet mặc định ẩn; người dùng tự bật ở đây. Pet chỉ là lối tắt — mọi
 * việc vẫn làm được ở Trợ lý MIMI và Việc cần làm khi pet tắt.
 */
export function CaiDatPet() {
  const { t } = useTranslation();
  const [hien, setHien] = useState(() => !docCaiDat().an);
  useEffect(() => {
    const doi = () => setHien(!docCaiDat().an);
    window.addEventListener(SU_KIEN_LENH_PET, doi);
    return () => window.removeEventListener(SU_KIEN_LENH_PET, doi);
  }, []);
  const doiTrangThai = () => { datHienPet(!hien); setHien(!hien); };
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{t('ui2.pet.tieuDe')}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t('ui2.pet.moTa')}
        </p>
      </div>
      <button
        type="button" role="switch" aria-checked={hien} aria-label={t('ui2.pet.aria')} onClick={doiTrangThai}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${hien ? 'bg-primary' : 'bg-muted'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${hien ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}
