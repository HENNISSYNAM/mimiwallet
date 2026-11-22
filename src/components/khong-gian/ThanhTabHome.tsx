/**
 * Thanh tab của Home (22/11/2026) — học thanh "New · Overview · Agents" của ClickUp Home, chỉ 3 tab. Kết nối đã có ở
 * thanh bên và dưới ô hỏi nên không lặp ở đây. Bỏ cái dở: không có tab "Coming soon", không có menu thả xuống lồng.
 */
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageCircle, Orbit } from 'lucide-react';

export const TAB_HOME = [
  { den: '/dashboard', ten: 'Hỏi MIMI', icon: MessageCircle },
  { den: '/dashboard/tong-quan', ten: 'Tổng quan', icon: LayoutDashboard },
  { den: '/dashboard/space', ten: 'Agentic AI Space', icon: Orbit },
] as const;

export function ThanhTabHome({ className = '' }: { className?: string }) {
  return (
    <nav aria-label="Home" className={`flex gap-1 overflow-x-auto text-sm ${className}`}>
      {TAB_HOME.map(({ den, ten, icon: Icon }) => (
        <NavLink key={den} to={den} end
          className={({ isActive }) => `inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${isActive
            ? 'bg-background font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'}`}>
          <Icon size={15} />{ten}
        </NavLink>
      ))}
    </nav>
  );
}
