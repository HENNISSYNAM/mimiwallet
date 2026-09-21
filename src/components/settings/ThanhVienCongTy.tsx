import { useCallback, useEffect, useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { goiCongTy } from '@/lib/goiCongTy';
import { chonCongTy, danhSachCongTyCuaToi, lamMoiCongTy, type CongTyCuaToi } from '@/lib/congTyDangDung';
import { TEN_VAI_TRO, VAI_TRO, duocLam, type VaiTro } from '../../../supabase/functions/_shared/quyen/vai-tro.ts';

/**
 * Thành viên công ty (MIMI-P1-003, phần giao diện): đổi công ty đang làm, xem ai trong công ty
 * với vai trò gì, mời, đổi vai trò, gỡ, và tự rời.
 *
 * Nút nào hiện ra đều có backend thật (`cong-ty`). Ẩn nút theo vai trò chỉ để đỡ rối — máy chủ
 * vẫn kiểm lại từng thao tác, và câu từ chối của máy chủ được hiện nguyên văn.
 */

interface ThanhVien {
  user_id: string;
  vai_tro: VaiTro;
  email: string | null;
  la_toi: boolean;
}

const VAI_TRO_CAO: VaiTro[] = ['chu_so_huu', 'quan_tri'];
const O = 'rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60';

/** Vai trò người này được phép trao: chủ doanh nghiệp trao mọi vai trò, quản trị không trao vai trò cao. */
const traoDuoc = (toi: VaiTro): VaiTro[] => VAI_TRO.filter((v) => toi === 'chu_so_huu' || !VAI_TRO_CAO.includes(v));

export function ThanhVienCongTy() {
  const [dsCongTy, setDsCongTy] = useState<CongTyCuaToi[]>([]);
  const [dangDung, setDangDung] = useState<CongTyCuaToi | null>(null);
  const [ds, setDs] = useState<ThanhVien[] | null>(null);
  const [vaiToi, setVaiToi] = useState<VaiTro | null>(null);
  const [loiTai, setLoiTai] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [vaiMoi, setVaiMoi] = useState<VaiTro>('ke_toan');
  const [dangLam, setDangLam] = useState<string | null>(null);
  const [xacNhan, setXacNhan] = useState<{ tieuDe: string; mo: string; nut: string; lam: () => void } | null>(null);

  const tai = useCallback(async () => {
    setLoiTai(null);
    try {
      const [cty, tv] = await Promise.all([danhSachCongTyCuaToi(), goiCongTy('thanh_vien')]);
      setDsCongTy(cty.ds);
      setDangDung(cty.dangDung);
      setDs(tv.thanh_vien as ThanhVien[]);
      setVaiToi(tv.vai_tro_cua_toi as VaiTro);
    } catch (e) {
      setLoiTai(e instanceof Error ? e.message : 'Không tải được danh sách thành viên.');
    }
  }, []);

  useEffect(() => { void tai(); }, [tai]);

  const lam = async (khoa: string, hanhDong: string, du: Record<string, unknown>, thanhCong: string) => {
    setDangLam(khoa);
    try {
      await goiCongTy(hanhDong, du);
      toast.success(thanhCong);
      lamMoiCongTy();
      await tai();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chưa làm được.');
      return false;
    } finally {
      setDangLam(null);
    }
  };

  const moi = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { toast.error('Email chưa đúng.'); return; }
    if (await lam('moi', 'moi', { email: em, vai_tro: vaiMoi }, `Đã thêm ${em} với vai trò ${TEN_VAI_TRO[vaiMoi]}.`)) setEmail('');
  };

  const quanLy = !!vaiToi && duocLam(vaiToi, 'quan_ly_thanh_vien');
  /** Người này có được đổi/gỡ thành viên kia không — giống luật máy chủ, chỉ để ẩn nút. */
  const tacDongDuoc = (tv: ThanhVien) => quanLy && !tv.la_toi && (vaiToi === 'chu_so_huu' || !VAI_TRO_CAO.includes(tv.vai_tro));

  return (
    <div className="space-y-5">
      {dsCongTy.length > 1 && (
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-foreground">Công ty đang làm việc</span>
          <select
            aria-label="Công ty đang làm việc"
            value={dangDung?.id ?? ''}
            onChange={(e) => { chonCongTy(e.target.value); window.location.reload(); }}
            className={`${O} w-full`}
          >
            {dsCongTy.map((c) => <option key={c.id} value={c.id}>{c.ten ?? 'Công ty chưa đặt tên'} · {TEN_VAI_TRO[c.vai_tro]}</option>)}
          </select>
          <span className="mt-1 block text-xs text-muted-foreground">Đổi công ty thì trang tải lại, mọi số liệu đọc theo công ty mới.</span>
        </label>
      )}

      {loiTai && <p role="alert" className="text-sm text-destructive">{loiTai}</p>}
      {!ds && !loiTai && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Đang tải thành viên…</p>}

      {ds && (
        <ul className="divide-y divide-border rounded-xl border border-border" aria-label="Thành viên">
          {ds.map((tv) => (
            <li key={tv.user_id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <span className="min-w-0 flex-1 truncate text-foreground">
                {tv.email ?? 'Không rõ email'}{tv.la_toi && <span className="ml-1 text-muted-foreground">(bạn)</span>}
              </span>
              {tacDongDuoc(tv) ? (
                <select
                  aria-label={`Vai trò của ${tv.email ?? 'thành viên'}`}
                  value={tv.vai_tro}
                  disabled={dangLam !== null}
                  onChange={(e) => {
                    const v = e.target.value as VaiTro;
                    void lam(`vai:${tv.user_id}`, 'doi_vai_tro', { user_id: tv.user_id, vai_tro: v }, `Đã đổi vai trò sang ${TEN_VAI_TRO[v]}.`);
                  }}
                  className={O}
                >
                  {[...new Set([tv.vai_tro, ...traoDuoc(vaiToi as VaiTro)])].map((v) => <option key={v} value={v}>{TEN_VAI_TRO[v]}</option>)}
                </select>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">{TEN_VAI_TRO[tv.vai_tro]}</span>
              )}
              {tacDongDuoc(tv) && (
                <button
                  type="button"
                  disabled={dangLam !== null}
                  onClick={() => setXacNhan({
                    tieuDe: `Gỡ ${tv.email ?? 'thành viên này'} khỏi công ty?`,
                    mo: 'Người này mất quyền xem và thao tác với dữ liệu của công ty ngay lập tức. Muốn thêm lại thì mời lại.',
                    nut: 'Gỡ khỏi công ty',
                    lam: () => { void lam(`go:${tv.user_id}`, 'go_bo', { user_id: tv.user_id }, 'Đã gỡ khỏi công ty.'); },
                  })}
                  className="text-xs font-medium text-destructive hover:underline disabled:opacity-50"
                >
                  Gỡ
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {quanLy && (
        <form onSubmit={moi} noValidate className="space-y-2 rounded-xl border border-border p-4" aria-label="Thêm thành viên">
          <p className="text-sm font-medium text-foreground">Thêm thành viên</p>
          <p className="text-xs text-muted-foreground">
            Người được thêm cần có tài khoản MIMI trước — nhờ họ đăng ký (đăng nhập bằng Google là nhanh nhất), rồi nhập email đó ở đây.
            MIMI chưa gửi email mời.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="email"
              aria-label="Email người được thêm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ketoan@congty.vn"
              className={`${O} min-w-0 flex-1`}
            />
            <select aria-label="Vai trò người được thêm" value={vaiMoi} onChange={(e) => setVaiMoi(e.target.value as VaiTro)} className={O}>
              {traoDuoc(vaiToi as VaiTro).map((v) => <option key={v} value={v}>{TEN_VAI_TRO[v]}</option>)}
            </select>
            <button type="submit" disabled={dangLam !== null} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {dangLam === 'moi' ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Thêm
            </button>
          </div>
        </form>
      )}

      {ds && (
        <button
          type="button"
          onClick={() => setXacNhan({
            tieuDe: 'Rời công ty này?',
            mo: 'Bạn mất quyền xem dữ liệu của công ty ngay lập tức. Muốn quay lại thì nhờ chủ công ty thêm lại.',
            nut: 'Rời công ty',
            lam: () => {
              void lam('roi', 'roi', {}, 'Đã rời công ty.').then((ok) => { if (ok) window.location.assign('/dashboard'); });
            },
          })}
          className="text-xs font-medium text-muted-foreground hover:text-destructive hover:underline"
        >
          Rời công ty
        </button>
      )}

      <AlertDialog open={xacNhan !== null} onOpenChange={(m) => { if (!m) setXacNhan(null); }}>
        <AlertDialogContent className="rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{xacNhan?.tieuDe}</AlertDialogTitle>
            <AlertDialogDescription>{xacNhan?.mo}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { const x = xacNhan; setXacNhan(null); x?.lam(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {xacNhan?.nut}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
