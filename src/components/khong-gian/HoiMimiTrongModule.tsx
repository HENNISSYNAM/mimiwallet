import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { IconMeo } from '@/components/brand/IconMeo';
import { useNaoMimi } from '@/store/naoMimi';
import { DUONG_TRO_LY, moduleDangMo } from '@/lib/nguCanhModule';

/**
 * MIMI luôn có mặt trong module (29/09/2026): ô hỏi gọn ngay đầu mỗi trang module. Câu hỏi chạy NGẦM qua bộ
 * não dùng chung (`store/naoMimi`) với đúng phạm vi của module — người dùng không phải rời trang. Trả lời xong:
 * thông báo kèm nút mở ở MIMI Trợ lý, nơi toàn bộ hội thoại đang nằm.
 */
export function HoiMimiTrongModule() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const module = moduleDangMo(pathname, new URLSearchParams(search));
  const [nhap, setNhap] = useState('');
  const [dang, setDang] = useState(false);

  const gui = async () => {
    const cau = nhap.trim().slice(0, 1000);
    if (!cau || dang) return;
    setDang(true);
    setNhap('');
    try {
      const kq = await useNaoMimi.getState().hoi(cau, { phamVi: module?.nhom ?? null, nguon: 'pet' });
      if (kq.trangThai === 'xong') {
        toast.success(t('kg.hoiModule.daTraLoi'), { action: { label: t('kg.hoiModule.xem'), onClick: () => navigate(DUONG_TRO_LY) }, duration: 10_000 });
      } else if (kq.loi) {
        toast.error(kq.loi, { action: { label: t('kg.hoiModule.moTroLy'), onClick: () => navigate(DUONG_TRO_LY) } });
      }
    } finally {
      setDang(false);
    }
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void gui(); }}
      className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/80 py-1.5 pl-3 pr-1.5 shadow-[0_2px_10px_hsla(220,30%,20%,0.04)]"
    >
      <IconMeo size={20} className="shrink-0 text-primary" aria-hidden />
      <label htmlFor="hoi-mimi-module" className="sr-only">{t('kg.hoiModule.nhan')}</label>
      <input
        id="hoi-mimi-module"
        value={nhap}
        onChange={(e) => setNhap(e.target.value)}
        maxLength={1000}
        placeholder={module ? t('kg.hoiModule.goiY', { ten: t(`kg.module.${module.khoa}.ten`).toLowerCase(), vd: t(`kg.module.${module.khoa}.hoi`) }) : t('kg.hoiModule.goiYChung')}
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
      <button type="submit" disabled={!nhap.trim() || dang} aria-label={t('kg.hoiModule.gui')}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-35">
        {dang ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={16} />}
      </button>
    </form>
  );
}
