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

type TrangThaiQuet = { dangDoc: true } | { ketQua: KetQuaQuet; goiY: GoiYGiaoDich | null; anh: string; nhapTay?: boolean } | null;

/** Form trống cho nhập tay — cùng hình dạng kết quả đọc ảnh, để dùng chung một hộp xem lại. */
const RONG: KetQuaQuet = {
  loai: 'hoa_don', so_hoa_don: null, ky_hieu: null, ngay: null, ben_ban: null, ma_so_thue_ben_ban: null,
  tien_truoc_thue: null, tien_thue: null, tong_tien: null, can_xem_lai: [],
};

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

  /**
   * Máy chủ đã nói trước là chưa bật, nên nói lại trước khi người ta bấm.
   *
   * Bản trước để nút sáng bình thường rồi mới hiện toast sau cú bấm. Agent đóng
   * vai Minh, 19 tuổi bán hàng TikTok Shop, chọn đúng nút này làm thứ đầu tiên
   * thử cho vui — và bỏ app ngay tại đó: "bấm nút chính mà nó nói chưa làm được
   * á? Thôi bỏ."
   *
   * `coMoHinh === false` là thông tin máy chủ trả về TRƯỚC khi hiện nút. Giấu nó
   * tới sau cú bấm không làm nút hữu ích hơn, chỉ làm người dùng mất một lần tin
   * tưởng. `undefined` nghĩa là chưa biết — vẫn cho bấm, vì chặn một nút dựa trên
   * điều chưa biết còn tệ hơn.
   */
  const chuaBat = coMoHinh === false;
  /*
   * 29/09/2026: chưa bật đọc ảnh thì NHẬP TAY, không khoá nút. Máy chủ (`luu_chung_tu`) lưu các ô người dùng gõ
   * mà không cần mô hình; trước đây nút bị khoá nên cả production chưa ai thêm được chứng từ nào, và trang
   * Chứng từ chi phí chỉ còn liệt kê khoản thiếu giấy tờ.
   */
  const LY_DO = 'MIMI chưa bật đọc ảnh chứng từ — bấm để nhập tay các ô trên hoá đơn.';

  const mo = () => {
    if (chuaBat) { setQuet({ ketQua: RONG, goiY: null, anh: '', nhapTay: true }); return; }
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
      <button
        type="button"
        onClick={mo}
        aria-label={nhanAn}
        title={chuaBat ? LY_DO : nhanAn}
        className={className}
      >
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
  /** Ảnh gốc người dùng tự đính kèm khi nhập tay (tuỳ chọn). */
  const [anhKem, setAnhKem] = useState('');
  const daDoc = quet && 'ketQua' in quet ? quet : null;
  const nhapTay = !!daDoc?.nhapTay;
  const anh = daDoc?.anh || anhKem;

  useEffect(() => {
    if (!daDoc) return;
    const f: Record<string, string> = {};
    for (const t of TRUONG) {
      const v = daDoc.ketQua[t.khoa];
      f[t.khoa] = v === null || v === undefined ? '' : String(v);
    }
    f.loai = daDoc.ketQua.loai;
    setForm(f);
    setAnhKem('');
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
        loai: form.loai || daDoc.ketQua.loai,
        ben_ban: form.ben_ban || null,
        ma_so_thue_ben_ban: form.ma_so_thue_ben_ban || null,
        so_hoa_don: form.so_hoa_don || null,
        ky_hieu: form.ky_hieu || null,
        ngay: form.ngay || null,
        tien_truoc_thue: so(form.tien_truoc_thue ?? ''),
        tien_thue: so(form.tien_thue ?? ''),
        tong_tien: so(form.tong_tien ?? ''),
        giao_dich_id: giaoDichId ?? (daDoc.goiY && gan ? daDoc.goiY.id : null),
        anh: luuAnh && anh ? anh : null,
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
          <DialogTitle>{nhapTay ? 'Nhập chứng từ' : 'Xem lại chứng từ'}</DialogTitle>
          <DialogDescription>
            {nhapTay
              ? 'Gõ các ô trên hoá đơn hoặc biên lai. Chỉ tổng tiền là bắt buộc. Chứng từ vào Thư viện chứng từ của công ty.'
              : 'MIMI đọc từ ảnh bạn chụp. Kiểm từng ô rồi bấm lưu — chứng từ vào Thư viện chứng từ của công ty.'}
          </DialogDescription>
        </DialogHeader>
        {!daDoc ? (
          <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Đang đọc ảnh…</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); void luu(); }} className="grid gap-3 sm:grid-cols-2">
            {anh && <img src={anh} alt="Ảnh chứng từ vừa chụp" className="max-h-48 w-full rounded-lg border border-border object-contain sm:col-span-2" />}
            {nhapTay && (
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className="text-muted-foreground">Loại chứng từ</span>
                <select value={form.loai ?? 'hoa_don'} onChange={(e) => setForm((f) => ({ ...f, loai: e.target.value }))}
                  className="h-11 rounded-lg border border-border bg-background px-3 text-foreground">
                  <option value="hoa_don">Hoá đơn</option>
                  <option value="bien_lai">Biên lai</option>
                  <option value="khac">Khác</option>
                </select>
              </label>
            )}
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
            {nhapTay && !anhKem && (
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className="text-muted-foreground">Ảnh gốc (không bắt buộc)</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Đính kèm ảnh chứng từ"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void anhThanhDataUrl(f).then(setAnhKem).catch(() => setLoi('Không đọc được ảnh này.')); }}
                  className="text-sm text-foreground" />
              </label>
            )}
            {anh && (
              <label className="flex items-start gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={luuAnh} onChange={(e) => setLuuAnh(e.target.checked)} className="mt-0.5" />
                <span className="text-foreground">Lưu cả ảnh gốc (chỉ người trong công ty xem được)</span>
              </label>
            )}
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
