import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SU_KIEN_DOI_CONG_TY } from '@/lib/congTyDangDung';
import { docThongBao, SU_KIEN_THONG_BAO, type ThongBao } from '@/lib/thongBao';
import { DanhSachThongBao } from './DanhSachThongBao';

/**
 * Chuông đầu trang: số thông báo chưa đọc, bấm ra 10 cái mới nhất kèm nút xử lý một chạm.
 *
 * Trước đây nút này chỉ bật một câu "chưa có thông báo" — dù MIMI có sẵn hạn thuế, luật mới, tiền
 * vào cần xác nhận. Đọc lại khi mở, khi đổi công ty, khi quay lại tab, và hai phút một lần.
 */
export function ChuongThongBao() {
  const [ds, setDs] = useState<ThongBao[]>([]);
  const [mo, setMo] = useState(false);

  const tai = useCallback(() => { void docThongBao(10).then(setDs).catch(() => {}); }, []);

  useEffect(() => {
    tai();
    const hen = window.setInterval(tai, 120_000);
    const khiThay = () => { if (document.visibilityState === 'visible') tai(); };
    window.addEventListener(SU_KIEN_THONG_BAO, tai);
    window.addEventListener(SU_KIEN_DOI_CONG_TY, tai);
    document.addEventListener('visibilitychange', khiThay);
    return () => {
      window.clearInterval(hen);
      window.removeEventListener(SU_KIEN_THONG_BAO, tai);
      window.removeEventListener(SU_KIEN_DOI_CONG_TY, tai);
      document.removeEventListener('visibilitychange', khiThay);
    };
  }, [tai]);

  const chuaDoc = ds.filter((t) => !t.da_doc_luc).length;

  return (
    <Popover open={mo} onOpenChange={(v) => { setMo(v); if (v) tai(); }}>
      <PopoverTrigger asChild>
        <button
          className="relative w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors pressable"
          aria-label={chuaDoc ? `Thông báo, ${chuaDoc} chưa đọc` : 'Thông báo'}
        >
          <Bell size={19} />
          {chuaDoc > 0 && (
            <span className="absolute right-1.5 top-1.5 min-w-[16px] rounded-full bg-mimi-red px-1 text-[10px] font-semibold leading-4 text-white">
              {chuaDoc > 9 ? '9+' : chuaDoc}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,380px)] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-medium text-foreground">Thông báo</p>
          <Link to="/dashboard/nhac-thue" onClick={() => setMo(false)} className="text-xs text-primary hover:underline">Cài đặt và xem tất cả</Link>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          <DanhSachThongBao ds={ds} onDoi={tai} gon />
        </div>
      </PopoverContent>
    </Popover>
  );
}
