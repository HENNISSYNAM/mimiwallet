import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { goiTroLy } from '@/lib/goiTroLy';
import { dinhDang, type KetQuaQuet } from '@/lib/troLy';

/**
 * Chụp hoặc tải ảnh chứng từ → MIMI đọc → người dùng xem lại từng ô → lưu.
 *
 * Luồng theo cách Ramp làm với biên lai: ảnh vào, máy đọc bên bán / ngày / tiền, tự gợi ý
 * khoản chi khớp, người dùng chỉ việc kiểm và bấm. Khác Ramp một chỗ: không có thẻ, nên
 * "khoản chi" là dòng sao kê ngân hàng.
 *
 * Dùng ở ô hỏi MIMI Assistant và ở Thư viện chứng từ. Có `giaoDichId` thì chứng từ gắn
 * thẳng vào khoản chi đó (người dùng đã chọn khoản trước khi chụp).
 */

const ANH_TOI_DA = 4 * 1024 * 1024;

/** Ảnh điện thoại thường 5–10 MB: thu về cạnh dài 2000px, JPEG, trước khi gửi. */
export async function anhThanhDataUrl(file: File): Promise<string> {
  const docThang = () => new Promise<string>((ok, hong) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => hong(new Error('Không đọc được ảnh.'));
    r.readAsDataURL(file);
  });
  if (file.size <= ANH_TOI_DA && /^image\/(jpeg|png|webp)$/.test(file.type)) return docThang();
  if (typeof createImageBitmap !== 'function') throw new Error('Ảnh quá lớn — chụp lại gần hơn.');
  const bmp = await createImageBitmap(file);
  const tiLe = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * tiLe);
  canvas.height = Math.round(bmp.height * tiLe);
  canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

interface GoiYGiaoDich {
  id: string;
  ngay: string;
  nguoi_nhan: string | null;
  so_tien: number;
}

type TrangThaiQuet = { dangDoc: true } | { ketQua: KetQuaQuet; goiY: GoiYGiaoDich | null; anh: string } | null;

export function NutQuetChungTu({ coMoHinh, giaoDichId, onDaLuu, className, nhanAn, children }: {
  /** `false` khi máy chủ chưa bật mô hình đọc ảnh; `undefined` khi chưa biết (để máy chủ trả lời). */
  coMoHinh?: boolean | null;
  giaoDichId?: string;
  onDaLuu?: () => void;
  className?: string;
  /** Tên nút cho trình đọc màn hình khi nút chỉ có biểu tượng. */
  nhanAn?: string;
  children: ReactNode;
}) {
  const oAnh = useRef<HTMLInputElement>(null);
  const [quet, setQuet] = useState<TrangThaiQuet>(null);
  // Điện thoại (màn cảm ứng): bấm là mở thẳng máy ảnh sau. Máy tính: chọn tệp để tải lên.
  const dungMayAnh = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

  const mo = () => {
    if (coMoHinh === false) {
      toast.info('MIMI chưa bật đọc ảnh chứng từ. Bạn vẫn đối chiếu chứng từ ở trang Chứng từ chi phí.');
      return;
    }
    oAnh.current?.click();
  };

  const chon = async (file: File | undefined) => {
    if (!file) return;
    setQuet({ dangDoc: true });
    try {
      const anh = await anhThanhDataUrl(file);
      const kq = await goiTroLy('quet_chung_tu', { anh });
      setQuet({ ketQua: kq.ket_qua as KetQuaQuet, goiY: (kq.giao_dich_goi_y as GoiYGiaoDich | null) ?? null, anh });
    } catch (e) {
      setQuet(null);
      toast.error(e instanceof Error ? e.message : 'Chưa đọc được ảnh.');
    } finally {
      if (oAnh.current) oAnh.current.value = '';
    }
  };

  return (
    <>
      <button type="button" onClick={mo} aria-label={nhanAn} title={nhanAn} className={className}>
        {children}
      </button>
      <input
        ref={oAnh}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture={dungMayAnh ? 'environment' : undefined}
        className="hidden"
        aria-label="Ảnh chứng từ"
        onChange={(e) => void chon(e.target.files?.[0])}
      />
      <HopXemLai
        quet={quet}
        giaoDichId={giaoDichId}
        onDong={() => setQuet(null)}
        onDaLuu={(canhBao) => {
          setQuet(null);
          if (canhBao) toast.warning(canhBao);
          else toast.success('Đã lưu chứng từ vào thư viện.');
          onDaLuu?.();
        }}
      />
    </>
  );
}

const TRUONG: { khoa: keyof KetQuaQuet; nhan: string; kieu: 'chu' | 'ngay' | 'tien' }[] = [
  { khoa: 'ben_ban', nhan: 'Bên bán', kieu: 'chu' },
  { khoa: 'ma_so_thue_ben_ban', nhan: 'Mã số thuế bên bán', kieu: 'chu' },
  { khoa: 'so_hoa_don', nhan: 'Số hoá đơn', kieu: 'chu' },
  { khoa: 'ky_hieu', nhan: 'Ký hiệu', kieu: 'chu' },
  { khoa: 'ngay', nhan: 'Ngày', kieu: 'ngay' },
  { khoa: 'tien_truoc_thue', nhan: 'Tiền trước thuế (₫)', kieu: 'tien' },
  { khoa: 'tien_thue', nhan: 'Tiền thuế (₫)', kieu: 'tien' },
  { khoa: 'tong_tien', nhan: 'Tổng tiền (₫)', kieu: 'tien' },
];

function HopXemLai({ quet, giaoDichId, onDong, onDaLuu }: {
  quet: TrangThaiQuet;
  giaoDichId?: string;
  onDong: () => void;
  onDaLuu: (canhBao: string | null) => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [gan, setGan] = useState(true);
  const [luuAnh, setLuuAnh] = useState(true);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const daDoc = quet && 'ketQua' in quet ? quet : null;

  useEffect(() => {
    if (!daDoc) return;
    const f: Record<string, string> = {};
    for (const t of TRUONG) {
      const v = daDoc.ketQua[t.khoa];
      f[t.khoa] = v === null || v === undefined ? '' : String(v);
    }
    setForm(f);
    setGan(true);
    setLuuAnh(true);
    setLoi(null);
  }, [daDoc]);

  const luu = async () => {
    if (!daDoc) return;
    setDangLuu(true);
    setLoi(null);
    const so = (s: string) => (s.replace(/[^\d]/g, '') ? Number(s.replace(/[^\d]/g, '')) : null);
    try {
      const kq = await goiTroLy('luu_chung_tu', {
        loai: daDoc.ketQua.loai,
        ben_ban: form.ben_ban || null,
        ma_so_thue_ben_ban: form.ma_so_thue_ben_ban || null,
        so_hoa_don: form.so_hoa_don || null,
        ky_hieu: form.ky_hieu || null,
        ngay: form.ngay || null,
        tien_truoc_thue: so(form.tien_truoc_thue ?? ''),
        tien_thue: so(form.tien_thue ?? ''),
        tong_tien: so(form.tong_tien ?? ''),
        giao_dich_id: giaoDichId ?? (daDoc.goiY && gan ? daDoc.goiY.id : null),
        anh: luuAnh ? daDoc.anh : null,
      });
      onDaLuu(typeof kq.canh_bao === 'string' ? kq.canh_bao : null);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Chưa lưu được chứng từ.');
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <Dialog open={!!quet} onOpenChange={(mo) => { if (!mo && !dangLuu) onDong(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Xem lại chứng từ</DialogTitle>
          <DialogDescription>MIMI đọc từ ảnh bạn chụp. Kiểm từng ô rồi bấm lưu — chứng từ vào Thư viện chứng từ của công ty.</DialogDescription>
        </DialogHeader>
        {!daDoc ? (
          <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Đang đọc ảnh…</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); void luu(); }} className="grid gap-3 sm:grid-cols-2">
            <img src={daDoc.anh} alt="Ảnh chứng từ vừa chụp" className="max-h-48 w-full rounded-lg border border-border object-contain sm:col-span-2" />
            {TRUONG.map((t) => {
              const canXem = daDoc.ketQua.can_xem_lai.includes(t.khoa);
              return (
                <label key={t.khoa} className={`flex flex-col gap-1 text-sm ${t.khoa === 'ben_ban' ? 'sm:col-span-2' : ''}`}>
                  <span className="text-muted-foreground">{t.nhan}{canXem && <span className="ml-1 text-mimi-amber">· kiểm lại</span>}</span>
                  <input
                    type={t.kieu === 'ngay' ? 'date' : 'text'}
                    inputMode={t.kieu === 'tien' ? 'numeric' : undefined}
                    value={form[t.khoa] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [t.khoa]: e.target.value }))}
                    className={`h-11 rounded-lg border bg-background px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${canXem ? 'border-mimi-amber' : 'border-border'}`}
                  />
                </label>
              );
            })}
            {giaoDichId ? (
              <p className="rounded-lg bg-accent px-3 py-2 text-sm text-foreground sm:col-span-2">Chứng từ sẽ gắn với khoản chi bạn đã chọn.</p>
            ) : daDoc.goiY && (
              <label className="flex items-start gap-2 rounded-lg bg-accent px-3 py-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={gan} onChange={(e) => setGan(e.target.checked)} className="mt-0.5" />
                <span className="text-foreground">
                  Gắn với khoản chi {dinhDang(daDoc.goiY.so_tien, 'vnd')} ngày {dinhDang(daDoc.goiY.ngay, 'ngay')}{daDoc.goiY.nguoi_nhan ? ` cho ${daDoc.goiY.nguoi_nhan}` : ''}
                </span>
              </label>
            )}
            <label className="flex items-start gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={luuAnh} onChange={(e) => setLuuAnh(e.target.checked)} className="mt-0.5" />
              <span className="text-foreground">Lưu cả ảnh gốc (chỉ người trong công ty xem được)</span>
            </label>
            {loi && <p className="text-sm text-destructive sm:col-span-2" role="alert">{loi}</p>}
            <DialogFooter className="gap-2 sm:col-span-2">
              <button type="button" onClick={onDong} className="h-11 rounded-lg border border-border px-4 text-sm">Huỷ</button>
              <button type="submit" disabled={dangLuu || !form.tong_tien} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {dangLuu && <Loader2 size={14} className="animate-spin" />} Lưu chứng từ
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
