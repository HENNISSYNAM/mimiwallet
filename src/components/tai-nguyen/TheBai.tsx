import { Link } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';
import { duongDanBai, type BaiTaiNguyen } from '@/lib/taiNguyen';

export const ngayGio = (iso: string, coGio = false) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    ...(coGio ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(iso));

/** Một bài trong danh sách. Sự kiện ghi lúc diễn ra; bài khác ghi ngày đăng. */
export default function TheBai({ b }: { b: BaiTaiNguyen }) {
  const sapToi = b.loai === 'su_kien' && b.bat_dau && new Date(b.bat_dau) > new Date();
  return (
    <Link to={duongDanBai(b)} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40">
      {b.anh_bia && (
        <img src={b.anh_bia} alt="" loading="lazy" referrerPolicy="no-referrer" className="aspect-[16/9] w-full object-cover" />
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {b.loai === 'su_kien' && b.bat_dau ? (
            <span className="inline-flex items-center gap-1"><CalendarDays size={13} aria-hidden /> {ngayGio(b.bat_dau, true)}</span>
          ) : b.xuat_ban_luc && <span>{ngayGio(b.xuat_ban_luc)}</span>}
          {sapToi && <span className="rounded-full bg-mimi-green/15 px-2 py-0.5 font-medium text-mimi-green">Sắp diễn ra</span>}
          {b.hinh_thuc && <span className="rounded-full bg-muted px-2 py-0.5">{b.hinh_thuc}</span>}
          {b.dia_diem && <span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden /> {b.dia_diem}</span>}
        </div>
        <h3 className="mt-3 text-lg font-semibold text-foreground group-hover:underline underline-offset-4">{b.tieu_de}</h3>
        {b.tom_tat && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.tom_tat}</p>}
      </div>
    </Link>
  );
}
