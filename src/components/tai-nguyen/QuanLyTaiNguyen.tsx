import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import NoiDungBai from './NoiDungBai';
import {
  BAN_SOAN_TRONG, CAU_HINH_LOAI, LOAI_TAI_NGUYEN, docTatCaChoAdmin, duongDanBai, kiemBanSoan, luuBai, taoSlug, xoaBai,
  type BaiTaiNguyen, type BanSoan, type LoaiTaiNguyen,
} from '@/lib/taiNguyen';

/**
 * Quản lý tài nguyên — admin đăng Sự kiện, Blog, Góc nhìn, Báo cáo, Tin tức, Tuyển dụng.
 *
 * Quyền nằm ở RLS của bảng `tai_nguyen` (chỉ `profiles.role = 'admin'` ghi được); màn này chỉ là
 * chỗ soạn. Lỗi theo từng ô được báo trước khi gửi, bằng đúng các ràng buộc CHECK của migration.
 * Nội dung dùng định dạng tối giản, hiện bằng phần tử React — không chèn được HTML hay script.
 */

const O = 'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60';

/** Chuỗi ISO → giá trị cho <input type="datetime-local"> theo giờ máy. */
const choONhap = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const tuONhap = (v: string) => (v ? new Date(v).toISOString() : null);

function O_Nhap({ nhan, gia, doi, loi, goiY, kieu = 'text' }: {
  nhan: string; gia: string; doi: (v: string) => void; loi?: string; goiY?: string; kieu?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-foreground">{nhan}</span>
      <input type={kieu} value={gia} onChange={(e) => doi(e.target.value)} placeholder={goiY} aria-invalid={!!loi} className={O} />
      {loi && <span className="mt-1 block text-xs text-destructive">{loi}</span>}
    </label>
  );
}

export default function QuanLyTaiNguyen() {
  const [ds, setDs] = useState<BaiTaiNguyen[] | null>(null);
  const [loiTai, setLoiTai] = useState<string | null>(null);
  const [dangSua, setDangSua] = useState<{ id: string | null; b: BanSoan; slugTuDong: boolean } | null>(null);
  const [daBamLuu, setDaBamLuu] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const [xoa, setXoa] = useState<BaiTaiNguyen | null>(null);

  const tai = useCallback(async () => {
    setLoiTai(null);
    try {
      setDs(await docTatCaChoAdmin());
    } catch (e) {
      setLoiTai(e instanceof Error ? e.message : 'Không tải được danh sách bài.');
    }
  }, []);
  useEffect(() => { void tai(); }, [tai]);

  const loi = useMemo(() => (dangSua ? kiemBanSoan(dangSua.b) : {}), [dangSua]);
  const doi = <K extends keyof BanSoan>(k: K, v: BanSoan[K]) =>
    setDangSua((s) => {
      if (!s) return s;
      const b = { ...s.b, [k]: v };
      // Đường dẫn đi theo tiêu đề cho tới khi người soạn tự sửa đường dẫn.
      if (k === 'tieu_de' && s.slugTuDong) b.slug = taoSlug(String(v));
      return { ...s, b, slugTuDong: k === 'slug' ? false : s.slugTuDong };
    });

  const moiBai = () => { setDaBamLuu(false); setDangSua({ id: null, b: BAN_SOAN_TRONG('blog'), slugTuDong: true }); };
  const suaBai = (x: BaiTaiNguyen) => {
    setDaBamLuu(false);
    const { id, xuat_ban_luc: _x, tao_luc: _t, sua_luc: _s, ...b } = x;
    setDangSua({ id, b, slugTuDong: false });
  };

  const luu = async (trangThai: 'nhap' | 'xuat_ban') => {
    if (!dangSua) return;
    setDaBamLuu(true);
    const b = { ...dangSua.b, trang_thai: trangThai };
    if (Object.keys(kiemBanSoan(b)).length) { toast.error('Còn ô chưa đúng — xem chữ đỏ dưới từng ô.'); return; }
    setDangLuu(true);
    try {
      await luuBai(dangSua.id, b);
      toast.success(trangThai === 'xuat_ban' ? 'Đã xuất bản.' : 'Đã lưu nháp.');
      setDangSua(null);
      await tai();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chưa lưu được.');
    } finally {
      setDangLuu(false);
    }
  };

  if (dangSua) {
    const { b } = dangSua;
    const hienLoi = (k: keyof BanSoan) => (daBamLuu ? loi[k] : undefined);
    return (
      <section aria-label="Soạn bài" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{dangSua.id ? 'Sửa bài' : 'Bài mới'}</h2>
          <button type="button" onClick={() => setDangSua(null)} className="text-sm text-muted-foreground hover:underline">Quay lại danh sách</button>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground">Loại</span>
              <select value={b.loai} onChange={(e) => doi('loai', e.target.value as LoaiTaiNguyen)} className={O}>
                {LOAI_TAI_NGUYEN.map((l) => <option key={l} value={l}>{CAU_HINH_LOAI[l].ten}</option>)}
              </select>
            </label>
            <O_Nhap nhan="Tiêu đề" gia={b.tieu_de} doi={(v) => doi('tieu_de', v)} loi={hienLoi('tieu_de')} />
            <O_Nhap nhan="Đường dẫn" gia={b.slug} doi={(v) => doi('slug', v)} loi={hienLoi('slug')} goiY="thue-ho-kinh-doanh-2026" />
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground">Tóm tắt</span>
              <textarea value={b.tom_tat} onChange={(e) => doi('tom_tat', e.target.value)} rows={2} className={O} />
              {hienLoi('tom_tat') && <span className="mt-1 block text-xs text-destructive">{hienLoi('tom_tat')}</span>}
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground">Nội dung</span>
              <textarea value={b.noi_dung} onChange={(e) => doi('noi_dung', e.target.value)} rows={12} className={`${O} font-mono`} />
              <span className="mt-1 block text-xs text-muted-foreground">
                "# " tiêu đề, "## " tiêu đề nhỏ, "- " gạch đầu dòng, dòng trống tách đoạn, [chữ](https://…) là liên kết.
              </span>
            </label>
            <O_Nhap nhan="Ảnh bìa (https, không bắt buộc)" gia={b.anh_bia ?? ''} doi={(v) => doi('anh_bia', v || null)} loi={hienLoi('anh_bia')} />
            <O_Nhap nhan="Đường dẫn ngoài (https, không bắt buộc)" gia={b.duong_dan_ngoai ?? ''} doi={(v) => doi('duong_dan_ngoai', v || null)} loi={hienLoi('duong_dan_ngoai')} />
            {b.loai === 'su_kien' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <O_Nhap nhan="Bắt đầu" kieu="datetime-local" gia={choONhap(b.bat_dau)} doi={(v) => doi('bat_dau', tuONhap(v))} />
                <O_Nhap nhan="Kết thúc" kieu="datetime-local" gia={choONhap(b.ket_thuc)} doi={(v) => doi('ket_thuc', tuONhap(v))} loi={hienLoi('ket_thuc')} />
              </div>
            )}
            {(b.loai === 'su_kien' || b.loai === 'tuyen_dung') && (
              <O_Nhap nhan="Địa điểm" gia={b.dia_diem ?? ''} doi={(v) => doi('dia_diem', v || null)} loi={hienLoi('dia_diem')} />
            )}
            {b.loai === 'tuyen_dung' && (
              <O_Nhap nhan="Hình thức làm việc" gia={b.hinh_thuc ?? ''} doi={(v) => doi('hinh_thuc', v || null)} goiY="Toàn thời gian, tại TP.HCM" loi={hienLoi('hinh_thuc')} />
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <button type="button" disabled={dangLuu} onClick={() => void luu('nhap')} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground disabled:opacity-60">
                Lưu nháp
              </button>
              <button type="button" disabled={dangLuu} onClick={() => void luu('xuat_ban')} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {dangLuu && <Loader2 size={14} className="animate-spin" />} Xuất bản
              </button>
            </div>
          </div>
          <div aria-label="Xem trước" className="rounded-xl border border-border p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Xem trước</p>
            <h3 className="mt-2 font-serif text-2xl text-foreground">{b.tieu_de || 'Tiêu đề'}</h3>
            {b.tom_tat && <p className="mt-2 text-muted-foreground">{b.tom_tat}</p>}
            <div className="mt-4"><NoiDungBai noiDung={b.noi_dung} /></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Tài nguyên" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Tài nguyên</h2>
        <button type="button" onClick={moiBai} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
          <Plus size={14} /> Bài mới
        </button>
      </div>
      {loiTai && <p role="alert" className="text-sm text-destructive">{loiTai}</p>}
      {!ds && !loiTai && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Đang tải…</p>}
      {ds && ds.length === 0 && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Chưa có bài nào. Bấm "Bài mới" để đăng bài đầu tiên.</p>}
      {ds && ds.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border" aria-label="Danh sách bài">
          {ds.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">{CAU_HINH_LOAI[x.loai].ten}</span>
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">{x.tieu_de}</span>
              <span className={`text-xs ${x.trang_thai === 'xuat_ban' ? 'text-mimi-green' : 'text-muted-foreground'}`}>
                {x.trang_thai === 'xuat_ban' ? 'Đã xuất bản' : 'Nháp'}
              </span>
              {x.trang_thai === 'xuat_ban' && (
                <a href={duongDanBai(x)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                  Xem <ExternalLink size={10} />
                </a>
              )}
              <button type="button" onClick={() => suaBai(x)} className="text-xs font-medium text-primary hover:underline">Sửa</button>
              <button type="button" onClick={() => setXoa(x)} className="text-xs font-medium text-destructive hover:underline">Xoá</button>
            </li>
          ))}
        </ul>
      )}
      <AlertDialog open={xoa !== null} onOpenChange={(m) => { if (!m) setXoa(null); }}>
        <AlertDialogContent className="rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá "{xoa?.tieu_de}"?</AlertDialogTitle>
            <AlertDialogDescription>Bài bị xoá hẳn khỏi trang công khai và không khôi phục được.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const x = xoa;
                setXoa(null);
                if (x) void xoaBai(x.id).then(() => { toast.success('Đã xoá.'); return tai(); }).catch((e) => toast.error(e instanceof Error ? e.message : 'Chưa xoá được.'));
              }}
            >
              Xoá bài
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
