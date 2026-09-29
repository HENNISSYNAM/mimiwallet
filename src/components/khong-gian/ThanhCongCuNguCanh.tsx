import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Building2, FileText, HandCoins, MoreHorizontal, Receipt, Scale, Wallet, type LucideIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MODULE_TRO_LY, TRANG_THEM, moduleDangMo, type KhoaModule } from '@/lib/nguCanhModule';

const ICON: Record<KhoaModule, LucideIcon> = {
  dong_tien: Wallet, hoa_don: FileText, thue: Scale, cong_no: HandCoins, chung_tu: Receipt, bao_cao: BarChart3, doanh_nghiep: Building2,
};

/**
 * Thanh công cụ ngữ cảnh (29/09/2026): các module của MIMI thành một hàng chip ngay dưới ô hỏi. Cuộn ngang trên
 * điện thoại, không chiếm quá một hàng. Module đang mở sáng lên; nút "…" mở các trang còn lại.
 */
export function ThanhCongCuNguCanh({ className }: { className?: string }) {
  const { pathname, search } = useLocation();
  const dangMo = moduleDangMo(pathname, new URLSearchParams(search));
  const trangKhacDangMo = !dangMo && TRANG_THEM.some((t) => t.duong === pathname);

  return (
    <nav aria-label="Công cụ của MIMI" className={`mimi-cuon-an -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 py-1 ${className ?? ''}`}>
      {MODULE_TRO_LY.map((m) => {
        const Icon = ICON[m.khoa];
        const mo = dangMo?.khoa === m.khoa;
        return (
          <Link
            key={m.khoa}
            to={m.duong}
            data-mimi={`nav:${m.duong.split('?')[0]}`}
            aria-current={mo ? 'page' : undefined}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors ${
              mo
                ? 'border-primary/30 bg-primary text-primary-foreground shadow-sm'
                : 'border-border/70 bg-card/80 text-foreground hover:border-primary/30 hover:bg-primary/5'
            }`}
          >
            <Icon size={15} aria-hidden className={mo ? '' : 'text-muted-foreground'} /> {m.ten}
          </Link>
        );
      })}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Công cụ khác"
            className={`inline-flex h-9 shrink-0 items-center rounded-full border px-3 text-sm ${
              trangKhacDangMo ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border/70 bg-card/80 text-foreground hover:bg-primary/5'
            }`}
          >
            <MoreHorizontal size={16} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 rounded-2xl p-1.5">
          <ul aria-label="Công cụ khác">
            {TRANG_THEM.map((t) => (
              <li key={t.duong}>
                <Link to={t.duong} aria-current={t.duong === pathname ? 'page' : undefined}
                  className="flex rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-accent aria-[current=page]:bg-accent aria-[current=page]:font-medium">
                  {t.ten}
                </Link>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </nav>
  );
}
