import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Globe, HelpCircle, LogOut, Puzzle, Settings, Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuthStore } from '@/store/useAuthStore';
import { NGON_NGU } from '@/i18n';
import { HopTaiUngDung } from './HopTaiUngDung';

const DONG = 'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-foreground hover:bg-accent';

/**
 * Menu tài khoản ở ảnh đại diện góc phải (29/09/2026). Thay thanh bên trái: khi các module đã nằm ở thanh công cụ
 * dưới ô hỏi, thanh bên chỉ còn vài mục hiếm dùng mà chiếm 256px mọi màn. Giờ MIMI dùng hết chiều rộng; kết nối,
 * cài đặt, ngôn ngữ, hỗ trợ và đăng xuất gom về đây — đúng chỗ người dùng tìm tài khoản của mình.
 */
export function MenuTaiKhoan({ tenCongTy, anhDaiDien, side = 'bottom', align = 'end' }: {
  tenCongTy: string | null; anhDaiDien: React.ReactNode; side?: 'bottom' | 'right'; align?: 'start' | 'end';
}) {
  const [mo, setMo] = useState(false);
  const [moTaiApp, setMoTaiApp] = useState(false);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const hienTai = NGON_NGU.find((n) => i18n.language?.startsWith(n.ma)) ?? NGON_NGU[0];
  const dong = () => setMo(false);

  return (
    <>
      <Popover open={mo} onOpenChange={setMo}>
        <PopoverTrigger asChild>
          <button type="button" aria-label={t('kg.taiKhoan.nut')} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            {anhDaiDien}
          </button>
        </PopoverTrigger>
        <PopoverContent side={side} align={align} sideOffset={side === 'right' ? 10 : 4} className="w-64 rounded-2xl p-1.5">
          {tenCongTy && <p className="truncate px-2.5 pb-1.5 pt-1 text-xs font-medium text-muted-foreground">{tenCongTy}</p>}
          <nav aria-label={t('kg.taiKhoan.nhan')} className="grid gap-0.5">
            <NavLink to="/dashboard/ket-noi" data-mimi="nav:/dashboard/ket-noi" onClick={dong} className={DONG}>
              <Puzzle size={16} className="text-muted-foreground" /> {t('kg.ben.ketNoi')}
            </NavLink>
            <NavLink to="/dashboard/settings" data-mimi="nav:/dashboard/settings" onClick={dong} className={DONG}>
              <Settings size={16} className="text-muted-foreground" /> {t('man.ten.caiDat')}
            </NavLink>
            <button type="button" onClick={() => { dong(); setMoTaiApp(true); }} className={DONG}>
              <Store size={16} className="text-muted-foreground" /> {t('man.troLy.dungNhuUngDung')}
            </button>
            <a href="mailto:hoc.qk2@gmail.com?subject=H%E1%BB%97%20tr%E1%BB%A3%20Mimi%20Wallet" className={DONG}>
              <HelpCircle size={16} className="text-muted-foreground" /> {t('sidebar.support')}
            </a>
          </nav>
          <div role="group" aria-label={t('man.chung.chonNgonNgu')} className="mt-1 border-t border-border px-2.5 pb-1 pt-2">
            <p className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground"><Globe size={13} aria-hidden /> {hienTai.ten}</p>
            <div className="flex flex-wrap gap-1">
              {NGON_NGU.map((n) => (
                <button
                  key={n.ma}
                  type="button"
                  aria-pressed={n.ma === hienTai.ma}
                  title={n.ten}
                  onClick={() => void i18n.changeLanguage(n.ma)}
                  className="h-7 rounded-md border border-border px-2 text-xs text-foreground hover:bg-accent aria-pressed:border-primary/40 aria-pressed:bg-primary/10 aria-pressed:text-primary"
                >
                  {n.ma_ngan}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-1 border-t border-border pt-1">
            <button type="button" onClick={() => { dong(); void logout(); navigate('/'); }} className={`${DONG} text-destructive hover:bg-destructive/10`}>
              <LogOut size={16} /> {t('sidebar.logout')}
            </button>
          </div>
        </PopoverContent>
      </Popover>
      <HopTaiUngDung mo={moTaiApp} onDong={() => setMoTaiApp(false)} tab="may_tinh" />
    </>
  );
}
