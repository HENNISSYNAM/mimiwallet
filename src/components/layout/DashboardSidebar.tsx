import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Globe, HelpCircle, Images, LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen, Plus, Puzzle, Settings, Store } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { IconMeo } from '@/components/brand/IconMeo';
import { HopTaiUngDung } from './HopTaiUngDung';
import { useCongCuGhim } from '@/hooks/useCongCuGhim';
import { duongDanCongCu } from '@/lib/congCu';
import { IconCongCu } from '@/components/cong-cu/IconCongCu';
import { KhoCongCu } from '@/components/cong-cu/KhoCongCu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NGON_NGU } from '@/i18n';

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
  const ngonNguHienTai = NGON_NGU.find((n) => i18n.language?.startsWith(n.ma)) ?? NGON_NGU[0];

  /*
   * Thứ tự: nơi làm việc trước, rồi cái nhìn toàn cảnh, rồi các chỗ quay lại hằng ngày.
   * "Khách hàng" đã rời thanh bên (16/09/2026): đó là danh sách tra cứu, mở vài lần một tháng,
   * không phải việc hằng ngày — nó vẫn còn nguyên ở bảng "Thêm" trên điện thoại, ở kho công cụ
   * và ở đường /dashboard/clients.
   */
  const muc: { icon: Icon; label: string; path: string }[] = [
    { icon: IconMeo, label: t('man.ten.troLy'), path: '/dashboard/tro-ly' },
    { icon: LayoutDashboard, label: t('sidebar.overview'), path: '/dashboard' },
    { icon: Images, label: t('man.ten.thuVien'), path: '/dashboard/thu-vien' },
    { icon: Clock, label: t('man.ten.nhacThue'), path: '/dashboard/nhac-thue' },
    { icon: Puzzle, label: t('man.ten.ketNoi'), path: '/dashboard/ket-noi' },
  ];

  const lop = (dangMo: boolean) => `${DONG} ${dangMo ? DONG_DANG_MO : DONG_THUONG} ${collapsed ? 'justify-center px-0' : ''}`;

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.2 }}
      className="mimi-thanh-kinh sticky top-0 hidden h-screen flex-col lg:flex"
    >
      <nav className="mimi-cuon-an flex-1 overflow-y-auto overflow-x-hidden px-3 py-4" aria-label={t('man.chung.dieuHuongChinh')}>
        {/*
          Nút thu gọn đứng cùng hàng với MIMI Assistant (16/09/2026): một hàng riêng cho nó là
          phí một dòng ở chỗ đắt nhất của thanh bên. Khi đã thu gọn, thanh chỉ rộng 72px nên
          nút mở rộng xếp trên, mèo MIMI xếp dưới.
        */}
        {(() => {
          const [dau, ...conLai] = muc;
          const nutThuGon = (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? t('man.chung.moRongThanhBen') : t('man.chung.thuGonThanhBen')}
              aria-expanded={!collapsed}
              title={collapsed ? t('man.chung.moRongThanhBen') : t('man.chung.thuGonThanhBen')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white/70 hover:text-foreground dark:hover:bg-white/10"
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          );
          const oDieuHuong = (m: (typeof muc)[number]) => (
            <NavLink
              key={m.path}
              to={m.path}
              data-mimi={`nav:${m.path}`}
              end={m.path === '/dashboard'}
              title={collapsed ? m.label : undefined}
              className={({ isActive }) => `${lop(isActive)} ${!collapsed && m === dau ? 'min-w-0 flex-1' : ''}`}
            >
              <m.icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{m.label}</span>}
            </NavLink>
          );
          return (
            <div className="space-y-0.5">
              {collapsed ? (
                <div className="flex flex-col items-center gap-0.5">
                  {nutThuGon}
                  <div className="w-full">{oDieuHuong(dau)}</div>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {oDieuHuong(dau)}
                  {nutThuGon}
                </div>
              )}
              {conLai.map(oDieuHuong)}
            </div>
          );
        })()}

        {/* Công cụ người dùng tự ghim — như mục "Pinned" của ChatGPT. */}
        <div className="mt-5">
          {collapsed ? (
            <div className="mx-2 mb-2 border-t border-slate-900/[0.06]" />
          ) : (
            <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">{t('man.chung.congCu')}</p>
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
            <button type="button" onClick={() => setMoKho(true)} title={collapsed ? t('man.chung.themCongCu') : undefined} className={`w-full ${lop(false)}`}>
              <Plus size={17} className="shrink-0" />
              {!collapsed && <span>{t('man.chung.themCongCu')}</span>}
            </button>
          </div>
        </div>
      </nav>
      <KhoCongCu mo={moKho} onDong={() => setMoKho(false)} />

      <div className="space-y-0.5 border-t border-slate-900/[0.06] px-3 py-2 dark:border-white/10">
        {/* Bốn ngôn ngữ (16/09/2026): chọn trong danh sách, không còn nút bật/tắt hai thứ tiếng. */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t('man.chung.ngonNgu', { ten: ngonNguHienTai.ten })}
              title={t('man.chung.ngonNgu', { ten: ngonNguHienTai.ten })}
              className={`w-full ${lop(false)}`}
            >
              <Globe size={17} className="shrink-0" />
              {!collapsed && <span className="truncate">{ngonNguHienTai.ten} · {ngonNguHienTai.ma_ngan}</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" side="top" className="w-52 rounded-2xl p-1.5">
            <div role="group" aria-label={t('man.chung.chonNgonNgu')}>
              {NGON_NGU.map((n) => (
                <button
                  key={n.ma}
                  type="button"
                  aria-pressed={n.ma === ngonNguHienTai.ma}
                  onClick={() => void i18n.changeLanguage(n.ma)}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent"
                >
                  <span>{n.ten}</span>
                  <span className="text-xs text-muted-foreground">{n.ma_ngan}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
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
            title={collapsed ? t('man.ten.caiDat') : undefined}
            className={({ isActive }) => `min-w-0 flex-1 ${lop(isActive)}`}
          >
            <Settings size={17} className="shrink-0" />
            {!collapsed && <span>{t('man.ten.caiDat')}</span>}
          </NavLink>
          <button
            type="button"
            onClick={() => setMoTaiApp(true)}
            aria-label={t('man.troLy.dungNhuUngDung')}
            title={t('man.troLy.dungNhuUngDung')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-white/70 hover:text-foreground dark:text-muted-foreground dark:hover:bg-white/10"
          >
            <Store size={17} />
          </button>
        </div>
      </div>

      <HopTaiUngDung mo={moTaiApp} onDong={() => setMoTaiApp(false)} tab="may_tinh" />
    </motion.aside>
  );
}
