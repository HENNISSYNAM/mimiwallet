import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { baoCongTyDoi, useCongTy } from '@/hooks/useCongTy';
import { apDungMauGiaoDien, daiMauCss, SAC_DO_MAC_DINH } from '@/lib/mauGiaoDien';
import { AnhCongTy } from '@/components/layout/AnhCongTy';

/**
 * Dải màu kéo chọn màu nhấn giao diện (15/09/2026).
 *
 * Mặc định là bảng màu MIMI hiện tại — chủ sản phẩm muốn giữ. Người dùng chỉ kéo sắc độ; độ
 * đậm do `mauGiaoDien.ts` tính để chữ luôn đọc được. Kéo là thấy ngay trên cả giao diện;
 * rời trang mà chưa lưu thì trả về màu đã lưu. Lưu vào công ty (`companies.mau_dai_dien`),
 * nên mọi máy của công ty cùng một màu, và ảnh đại diện công ty dùng chính màu này.
 */

type BangTho = { from: (bang: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export function ChonMauGiaoDien() {
  const congTy = useCongTy();
  const daLuu = congTy?.mau ?? null;
  const [sac, setSac] = useState<number | null>(daLuu);
  const [dangLuu, setDangLuu] = useState(false);
  const mauDaLuu = useRef<number | null>(daLuu);

  useEffect(() => { mauDaLuu.current = daLuu; setSac(daLuu); }, [daLuu]);
  useEffect(() => { apDungMauGiaoDien(sac); }, [sac]);
  useEffect(() => () => apDungMauGiaoDien(mauDaLuu.current), []);

  const luu = async (gt: number | null) => {
    if (!congTy?.id) return;
    setDangLuu(true);
    const { error } = await (supabase as unknown as BangTho).from('companies').update({ mau_dai_dien: gt }).eq('id', congTy.id);
    setDangLuu(false);
    if (error) {
      toast.error(`Chưa lưu được màu: ${error.message}`);
      return;
    }
    mauDaLuu.current = gt;
    setSac(gt);
    baoCongTyDoi();
    toast.success(gt === null ? 'Đã về màu mặc định của MIMI.' : 'Đã lưu màu giao diện.');
  };

  const giaTri = sac ?? SAC_DO_MAC_DINH;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Giữ màu mặc định của MIMI, hoặc kéo để chọn màu hợp với bạn. MIMI tự chỉnh độ đậm để chữ trên nút và liên kết luôn dễ đọc.
      </p>
      <div>
        <label htmlFor="dai-mau" className="mb-2 block text-sm font-medium text-foreground">Màu nhấn</label>
        <input
          id="dai-mau"
          type="range"
          min={0}
          max={359}
          step={1}
          value={giaTri}
          onChange={(e) => setSac(Number(e.target.value))}
          aria-valuetext={sac === null ? 'Màu mặc định của MIMI' : `Sắc độ ${sac}`}
          className="h-4 w-full cursor-pointer appearance-none rounded-full border border-border [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-primary [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow"
          style={{ background: daiMauCss() }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3" aria-label="Xem trước">
        <span className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">Nút chính</span>
        <span className="text-sm font-medium text-primary underline underline-offset-4">Liên kết</span>
        <span className="text-xs text-muted-foreground">{sac === null ? 'Đang dùng màu mặc định' : 'Xem trước — chưa lưu'}</span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => void luu(sac)}
          disabled={dangLuu || sac === daLuu || !congTy?.id}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {dangLuu && <Loader2 size={14} className="animate-spin" />} Lưu màu
        </button>
        <button
          type="button"
          onClick={() => (daLuu === null ? setSac(null) : void luu(null))}
          disabled={dangLuu || (sac === null && daLuu === null)}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
        >
          Dùng màu mặc định
        </button>
      </div>
    </div>
  );
}
