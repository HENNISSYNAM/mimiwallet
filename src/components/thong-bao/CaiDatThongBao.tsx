import { useCallback, useEffect, useState } from 'react';
import { BellRing, Loader2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import {
  batDay, docLoaiTat, docThongBao, guiThu, LOAI_THONG_BAO, luuLoaiTat, SU_KIEN_THONG_BAO, tatDay, TEN_LOAI_THONG_BAO,
  trangThaiDay, type LoaiThongBao, type ThongBao, type TrangThaiDay,
} from '@/lib/thongBao';
import { DanhSachThongBao } from './DanhSachThongBao';

/**
 * Bật thông báo — đặt ở trang Nhắc thuế, nơi người dùng đã đến để không lỡ hạn.
 *
 * Một nút bật cho thiết bị đang dùng (điện thoại hay máy tính), rồi từng loại bật/tắt riêng. Không
 * bật đẩy thì thông báo vẫn hiện ở chuông trong app.
 */

const CAU_TRANG_THAI: Record<TrangThaiDay, string> = {
  da_bat: 'Thiết bị này đang nhận thông báo.',
  chua_bat: 'Bật để MIMI báo cả khi bạn không mở app.',
  bi_chan: 'Trình duyệt đang chặn thông báo của MIMI. Mở cài đặt trang web của trình duyệt, cho phép "Thông báo", rồi bật lại ở đây.',
  can_cai_app: 'Trên iPhone: bấm Chia sẻ → "Thêm vào Màn hình chính", mở MIMI từ biểu tượng đó rồi bật ở đây (iOS 16.4 trở lên).',
  khong_ho_tro: 'Trình duyệt này không nhận thông báo đẩy. Thông báo vẫn hiện ở chuông trong app.',
};

export function CaiDatThongBao() {
  const [tt, setTt] = useState<TrangThaiDay | null>(null);
  const [dang, setDang] = useState(false);
  const [tat, setTat] = useState<LoaiThongBao[]>([]);
  const [ds, setDs] = useState<ThongBao[]>([]);

  const taiDs = useCallback(() => { void docThongBao(30).then(setDs).catch(() => {}); }, []);

  useEffect(() => {
    void trangThaiDay().then(setTt).catch(() => setTt('khong_ho_tro'));
    void docLoaiTat().then(setTat).catch(() => {});
    taiDs();
    window.addEventListener(SU_KIEN_THONG_BAO, taiDs);
    return () => window.removeEventListener(SU_KIEN_THONG_BAO, taiDs);
  }, [taiDs]);

  const doiDay = async (bat: boolean) => {
    setDang(true);
    try {
      if (bat) {
        const kq = await batDay();
        setTt(kq);
        if (kq === 'da_bat') toast.success('Đã bật. MIMI sẽ báo trên thiết bị này.');
      } else {
        await tatDay();
        setTt('chua_bat');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chưa bật được thông báo.');
    } finally {
      setDang(false);
    }
  };

  const doiLoai = async (loai: LoaiThongBao, bat: boolean) => {
    const moi = bat ? tat.filter((x) => x !== loai) : [...tat, loai];
    setTat(moi);
    try { await luuLoaiTat(moi); } catch { setTat(tat); toast.error('Chưa lưu được.'); }
  };

  const thu = async () => {
    try {
      const r = await guiThu();
      toast.success(r.da_gui ? 'Đã gửi thông báo thử.' : 'Chưa có thiết bị nào nhận — bật ở trên trước.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chưa gửi được.');
    }
  };

  return (
    <section aria-labelledby="thong-bao" className="rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <h2 id="thong-bao" className="flex items-center gap-2 text-lg font-semibold text-foreground"><BellRing size={18} className="text-primary" /> Thông báo</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            MIMI tự theo dõi và báo bạn: sắp tới hạn khai thuế, có văn bản luật mới, khoản tiền vào có vẻ không phải doanh thu, gói sắp hết hạn.
          </p>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground"><Smartphone size={14} className="mt-0.5 shrink-0" /> {tt ? CAU_TRANG_THAI[tt] : 'Đang kiểm tra thiết bị…'}</p>
        </div>
        <div className="flex items-center gap-2">
          {dang && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
          <Switch
            checked={tt === 'da_bat'}
            disabled={dang || tt === null || tt === 'khong_ho_tro' || tt === 'can_cai_app'}
            onCheckedChange={(v) => void doiDay(v)}
            aria-label="Nhận thông báo trên thiết bị này"
          />
        </div>
      </div>

      <div className="grid gap-2 border-t border-border px-5 py-4 sm:grid-cols-2">
        {LOAI_THONG_BAO.filter((l) => l !== 'khac').map((l) => (
          <label key={l} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm text-foreground">
            {TEN_LOAI_THONG_BAO[l]}
            <Switch checked={!tat.includes(l)} onCheckedChange={(v) => void doiLoai(l, v)} aria-label={`Đẩy thông báo: ${TEN_LOAI_THONG_BAO[l]}`} />
          </label>
        ))}
        {tt === 'da_bat' && (
          <button type="button" onClick={() => void thu()} className="text-left text-xs font-medium text-primary hover:underline sm:col-span-2">
            Gửi thử một thông báo
          </button>
        )}
      </div>

      <div className="border-t border-border">
        <DanhSachThongBao ds={ds} onDoi={taiDs} />
      </div>
    </section>
  );
}
