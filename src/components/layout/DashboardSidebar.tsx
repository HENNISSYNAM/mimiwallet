import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, Globe, HelpCircle, Images, LayoutDashboard, LogOut, Plus, Puzzle, Settings, Store, Users } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { IconMeo } from '@/components/brand/IconMeo';
import { HopTaiUngDung } from './HopTaiUngDung';
import { useCongCuGhim } from '@/hooks/useCongCuGhim';
import { duongDanCongCu } from '@/lib/congCu';
import { IconCongCu } from '@/components/cong-cu/IconCongCu';
import { KhoCongCu } from '@/components/cong-cu/KhoCongCu';

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
 * Kính trắng (liquid glass) thay nền xám: nền gần trắng trong suốt, mờ phía sau, viền sáng
 * bên phải. Mục đang mở là một viên trắng đặc có bóng rất nhẹ — mắt tìm được ngay mà không
 * cần màu nhấn.
 *
 * Tỉ lệ (theo lưới 4px): rộng 256px; mỗi dòng cao 36px, chữ 14px, icon 18px; nhãn nhóm
 * 11px; khoảng giữa nhóm 20px. Vùng cuộn không cuộn ngang, thanh cuộn chỉ hiện khi rê chuột.
 */

type Icon = ComponentType<{ size?: number | string; strokeWidth?: number | string; className?: string }>;

const DONG = 'flex h-9 items-center gap-3 rounded-xl px-2.5 text-sm transition-colors';
const DONG_THUONG = 'text-slate-600 hover:bg-white/70 hover:text-foreground dark:text-muted-foreground dark:hover:bg-white/10';
const DONG_DANG_MO = 'bg-white font-medium text-foreground shadow-[0_1px_2px_hsla(215,25%,20%,0.08)] ring-1 ring-black/[0.04] dark:bg-white/10 dark:ring-white/10';

export default function DashboardSidebar() {
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

  const lop = (dangMo: boolean) => `${DONG} ${dangMo ? DONG_DANG_MO : DONG_THUONG} ${collapsed ? 'justify-center px-0' : ''}`;

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.2 }}
      className="mimi-thanh-kinh sticky top-0 hidden h-screen flex-col lg:flex"
    >
      <nav className="mimi-cuon-an flex-1 overflow-y-auto overflow-x-hidden px-3 py-4" aria-label="Điều hướng chính">
        <div className="space-y-0.5">
          {muc.map((m) => (
            <NavLink
              key={m.path}
              to={m.path}
              data-mimi={`nav:${m.path}`}
              end={m.path === '/dashboard'}
              title={collapsed ? m.label : undefined}
              className={({ isActive }) => lop(isActive)}
            >
              <m.icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{m.label}</span>}
            </NavLink>
          ))}
        </div>

        {/* Công cụ người dùng tự ghim — như mục "Pinned" của ChatGPT. */}
        <div className="mt-5">
          {collapsed ? (
            <div className="mx-2 mb-2 border-t border-slate-900/[0.06]" />
          ) : (
            <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">Công cụ</p>
          )}
          <div className="space-y-0.5">
            {congCu.ds.filter((c) => !muc.some((m) => m.path === c.dich)).map((c) => (
              <NavLink
                key={c.khoa}
                to={duongDanCongCu(c)}
                end
                title={collapsed ? c.ten : undefined}
                className={({ isActive }) => lop(isActive && c.loai === 'trang')}
              >
                <IconCongCu khoa={c.khoa} size={17} />
                {!collapsed && <span className="truncate">{c.ten}</span>}
              </NavLink>
            ))}
            <button type="button" onClick={() => setMoKho(true)} title={collapsed ? 'Thêm công cụ' : undefined} className={`w-full ${lop(false)}`}>
              <Plus size={17} className="shrink-0" />
              {!collapsed && <span>Thêm công cụ</span>}
            </button>
          </div>
        </div>
      </nav>
      <KhoCongCu mo={moKho} onDong={() => setMoKho(false)} />

      <div className="space-y-0.5 border-t border-slate-900/[0.06] px-3 py-2 dark:border-white/10">
        <button
          onClick={() => i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')}
          aria-label={i18n.language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          title={i18n.language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          className={`w-full ${lop(false)}`}
        >
          <Globe size={17} className="shrink-0" />
          {!collapsed && <span>{i18n.language === 'vi' ? 'Tiếng Việt · VI' : 'English · EN'}</span>}
        </button>
        <a href="mailto:hoc.qk2@gmail.com?subject=H%E1%BB%97%20tr%E1%BB%A3%20Mimi%20Wallet" className={lop(false)}>
          <HelpCircle size={17} className="shrink-0" />
          {!collapsed && <span>{t('sidebar.support')}</span>}
        </a>
        <button
          onClick={() => { logout(); navigate('/'); }}
          className={`w-full ${DONG} text-slate-600 hover:bg-destructive/10 hover:text-destructive ${collapsed ? 'justify-center px-0' : ''}`}
        >
          <LogOut size={17} className="shrink-0" />
          {!collapsed && <span>{t('sidebar.logout')}</span>}
        </button>

        {/* Người dùng đã hiện ở ảnh đại diện góc trên; ở đây chỉ còn Cài đặt và nút tải app. */}
        <div className={`flex items-center gap-1 ${collapsed ? 'flex-col' : ''}`}>
          <NavLink
            to="/dashboard/settings"
            title={collapsed ? 'Cài đặt' : undefined}
            className={({ isActive }) => `min-w-0 flex-1 ${lop(isActive)}`}
          >
            <Settings size={17} className="shrink-0" />
            {!collapsed && <span>Cài đặt</span>}
          </NavLink>
          <button
            type="button"
            onClick={() => setMoTaiApp(true)}
            aria-label="Dùng MIMI như ứng dụng"
            title="Dùng MIMI như ứng dụng"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-white/70 hover:text-foreground dark:text-muted-foreground dark:hover:bg-white/10"
          >
            <Store size={17} />
          </button>
        </div>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-white/90 text-slate-500 shadow-[0_1px_3px_hsla(215,25%,20%,0.12)] backdrop-blur transition-colors hover:text-foreground"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      <HopTaiUngDung mo={moTaiApp} onDong={() => setMoTaiApp(false)} tab="may_tinh" />
    </motion.aside>
  );
}
