import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, Globe, HelpCircle, Images, LayoutDashboard, LogOut, Puzzle, Settings, Store, Users } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { IconMeo } from '@/components/brand/IconMeo';
import { AnhCongTy } from './AnhCongTy';
import { HopTaiUngDung } from './HopTaiUngDung';
import { useCongTy } from '@/hooks/useCongTy';
import { useCongCuGhim } from '@/hooks/useCongCuGhim';
import { duongDanCongCu } from '@/lib/congCu';
import { IconCongCu } from '@/components/cong-cu/IconCongCu';
import { KhoCongCu } from '@/components/cong-cu/KhoCongCu';
import { Plus } from 'lucide-react';

/**
 * Thanh bên theo nhịp ChatGPT (15/09/2026): một trợ lý ở trên cùng, rồi vài chỗ người dùng
 * quay lại hằng ngày, tài khoản ở dưới cùng.
 *
 *   MIMI Assistant (logo mèo) — nơi làm việc chính, như "New chat".
 *   Thư viện chứng từ — như "Images/Library": hoá đơn, chứng từ đã lưu.
 *   Nhắc thuế — như "Scheduled": các mốc nghĩa vụ thuế sắp tới.
 *   Kết nối — như "Plugins": nối ngân hàng, cơ quan thuế, nhà cung cấp AI.
 *   Tổng quan (giao dịch chi tiết), Khách hàng (module riêng).
 *
 * Kiểm soát agent, Chính sách chi, Chi phí AI, Hoá đơn, Báo cáo vẫn còn, mở từ MIMI
 * Assistant. Cài đặt (tài khoản, bảo mật) nằm ở hàng công ty dưới cùng.
 *
 * Dưới cùng: Cài đặt và nút cửa hàng mở hộp "Dùng MIMI như ứng dụng". Người dùng hiện ở ảnh
 * đại diện góc trên, không lặp ở đây. Công cụ ghim không lặp mục chính (lọc theo đường dẫn).
 */

type Icon = ComponentType<{ size?: number | string; strokeWidth?: number | string; className?: string }>;

export default function DashboardSidebar() {
  const congTy = useCongTy();
  const [collapsed, setCollapsed] = useState(false);
  const [moTaiApp, setMoTaiApp] = useState(false);
  const [moKho, setMoKho] = useState(false);
  const congCu = useCongCuGhim();
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const muc: { icon: Icon; label: string; path: string }[] = [
    { icon: IconMeo, label: 'MIMI Assistant', path: '/dashboard/tro-ly' },
    { icon: Images, label: 'Thư viện chứng từ', path: '/dashboard/thu-vien' },
    { icon: Clock, label: 'Nhắc thuế', path: '/dashboard/nhac-thue' },
    { icon: Puzzle, label: 'Kết nối', path: '/dashboard/ket-noi' },
    { icon: LayoutDashboard, label: t('sidebar.overview'), path: '/dashboard' },
    { icon: Users, label: 'Khách hàng', path: '/dashboard/clients' },
  ];

  const lopMuc = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
      isActive ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
    }`;

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 248 }}
      transition={{ duration: 0.2 }}
      className="sticky top-0 hidden h-screen flex-col border-r border-border bg-secondary lg:flex"
    >
      <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Điều hướng chính">
        <div className="space-y-1">
          {muc.map((m) => (
            <NavLink
              key={m.path}
              to={m.path}
              data-mimi={`nav:${m.path}`}
              end={m.path === '/dashboard'}
              title={collapsed ? m.label : undefined}
              className={lopMuc}
            >
              <m.icon size={19} className="shrink-0" />
              {!collapsed && <span className="truncate">{m.label}</span>}
            </NavLink>
          ))}
        </div>

        {/* Công cụ người dùng tự ghim — như mục "Pinned" của ChatGPT. */}
        <div className="mt-5">
          {collapsed ? (
            <div className="mx-3 mb-2 border-t border-border/60" />
          ) : (
            <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Công cụ</p>
          )}
          <div className="space-y-0.5">
            {congCu.ds.filter((c) => !muc.some((m) => m.path === c.dich)).map((c) => (
              <NavLink
                key={c.khoa}
                to={duongDanCongCu(c)}
                end
                title={collapsed ? c.ten : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive && c.loai === 'trang' ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`
                }
              >
                <IconCongCu khoa={c.khoa} size={17} />
                {!collapsed && <span className="truncate">{c.ten}</span>}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => setMoKho(true)}
              title={collapsed ? 'Thêm công cụ' : undefined}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Plus size={17} className="shrink-0" />
              {!collapsed && <span>Thêm công cụ</span>}
            </button>
          </div>
        </div>
      </nav>
      <KhoCongCu mo={moKho} onDong={() => setMoKho(false)} />

      <div className="space-y-1 border-t border-border p-2">
        <button
          onClick={() => i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')}
          aria-label={i18n.language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          title={i18n.language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Globe size={18} className="shrink-0" />
          {!collapsed && <span>{i18n.language === 'vi' ? 'Tiếng Việt · VI' : 'English · EN'}</span>}
        </button>
        <a
          href="mailto:hoc.qk2@gmail.com?subject=H%E1%BB%97%20tr%E1%BB%A3%20Mimi%20Wallet"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <HelpCircle size={18} className="shrink-0" />
          {!collapsed && <span>{t('sidebar.support')}</span>}
        </a>
        <button
          onClick={() => { logout(); navigate('/'); }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>{t('sidebar.logout')}</span>}
        </button>

        {/* Người dùng đã hiện ở ảnh đại diện góc trên; ở đây chỉ còn Cài đặt và nút tải app. */}
        <div className={`mt-1 flex items-center gap-1 ${collapsed ? 'flex-col' : ''}`}>
          <NavLink
            to="/dashboard/settings"
            title={collapsed ? 'Cài đặt' : undefined}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`
            }
          >
            <Settings size={18} className="shrink-0" />
            {!collapsed && <span>Cài đặt</span>}
          </NavLink>
          <button
            type="button"
            onClick={() => setMoTaiApp(true)}
            aria-label="Dùng MIMI như ứng dụng"
            title="Dùng MIMI như ứng dụng"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Store size={18} />
          </button>
        </div>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
        className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      <HopTaiUngDung mo={moTaiApp} onDong={() => setMoTaiApp(false)} tab="may_tinh" />
    </motion.aside>
  );
}
