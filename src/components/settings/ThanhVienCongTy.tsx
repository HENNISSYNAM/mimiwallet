import { useCallback, useEffect, useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const tenVai = Object.fromEntries(
    VAI_TRO.map((v) => [v, t(`ui2.vaiTro.${v}`, { defaultValue: TEN_VAI_TRO[v] })]),
  ) as Record<VaiTro, string>;
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
      setLoiTai(e instanceof Error ? e.message : t('ui2.thanhVien.loiTai'));
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
      toast.error(e instanceof Error ? e.message : t('ui2.thanhVien.chuaLamDuoc'));
      return false;
    } finally {
      setDangLam(null);
    }
  };

  const moi = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { toast.error(t('ui2.thanhVien.emailSai')); return; }
    if (await lam('moi', 'moi', { email: em, vai_tro: vaiMoi }, t('ui2.thanhVien.daThem', { email: em, vaiTro: tenVai[vaiMoi] }))) setEmail('');
  };

  const quanLy = !!vaiToi && duocLam(vaiToi, 'quan_ly_thanh_vien');
  /** Người này có được đổi/gỡ thành viên kia không — giống luật máy chủ, chỉ để ẩn nút. */
  const tacDongDuoc = (tv: ThanhVien) => quanLy && !tv.la_toi && (vaiToi === 'chu_so_huu' || !VAI_TRO_CAO.includes(tv.vai_tro));

  return (
    <div className="space-y-5">
      {dsCongTy.length > 1 && (
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-foreground">{t('ui2.thanhVien.congTyDangLam')}</span>
          <select
            aria-label={t('ui2.thanhVien.congTyDangLam')}
            value={dangDung?.id ?? ''}
            onChange={(e) => { chonCongTy(e.target.value); window.location.reload(); }}
            className={`${O} w-full`}
          >
            {dsCongTy.map((c) => <option key={c.id} value={c.id}>{c.ten ?? t('ui2.thanhVien.chuaDatTen')} · {tenVai[c.vai_tro]}</option>)}
          </select>
          <span className="mt-1 block text-xs text-muted-foreground">{t('ui2.thanhVien.doiCongTy')}</span>
        </label>
      )}

      {loiTai && <p role="alert" className="text-sm text-destructive">{loiTai}</p>}
      {!ds && !loiTai && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> {t('ui2.thanhVien.dangTai')}</p>}

      {ds && (
        <ul className="divide-y divide-border rounded-xl border border-border" aria-label={t('ui2.thanhVien.thanhVien')}>
          {ds.map((tv) => (
            <li key={tv.user_id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <span className="min-w-0 flex-1 truncate text-foreground">
                {tv.email ?? t('ui2.thanhVien.khongRoEmail')}{tv.la_toi && <span className="ml-1 text-muted-foreground">({t('ui2.thanhVien.ban')})</span>}
              </span>
              {tacDongDuoc(tv) ? (
                <select
                  aria-label={t('ui2.thanhVien.vaiTroCua', { ten: tv.email ?? t('ui2.thanhVien.thanhVienNay') })}
                  value={tv.vai_tro}
                  disabled={dangLam !== null}
                  onChange={(e) => {
                    const v = e.target.value as VaiTro;
                    void lam(`vai:${tv.user_id}`, 'doi_vai_tro', { user_id: tv.user_id, vai_tro: v }, t('ui2.thanhVien.daDoiVai', { vaiTro: tenVai[v] }));
                  }}
                  className={O}
                >
                  {[...new Set([tv.vai_tro, ...traoDuoc(vaiToi as VaiTro)])].map((v) => <option key={v} value={v}>{tenVai[v]}</option>)}
                </select>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">{tenVai[tv.vai_tro]}</span>
              )}
              {tacDongDuoc(tv) && (
                <button
                  type="button"
                  disabled={dangLam !== null}
                  onClick={() => setXacNhan({
                    tieuDe: t('ui2.thanhVien.goHoi', { ten: tv.email ?? t('ui2.thanhVien.thanhVienNay') }),
                    mo: t('ui2.thanhVien.goMo'),
                    nut: t('ui2.thanhVien.goNut'),
                    lam: () => { void lam(`go:${tv.user_id}`, 'go_bo', { user_id: tv.user_id }, t('ui2.thanhVien.daGo')); },
                  })}
                  className="text-xs font-medium text-destructive hover:underline disabled:opacity-50"
                >
                  {t('ui2.thanhVien.go')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {quanLy && (
        <form onSubmit={moi} noValidate className="space-y-2 rounded-xl border border-border p-4" aria-label={t('ui2.thanhVien.themTv')}>
          <p className="text-sm font-medium text-foreground">{t('ui2.thanhVien.themTv')}</p>
          <p className="text-xs text-muted-foreground">
            {t('ui2.thanhVien.themMo')}
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="email"
              aria-label={t('ui2.thanhVien.emailNguoiThem')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ketoan@congty.vn"
              className={`${O} min-w-0 flex-1`}
            />
            <select aria-label={t('ui2.thanhVien.vaiNguoiThem')} value={vaiMoi} onChange={(e) => setVaiMoi(e.target.value as VaiTro)} className={O}>
              {traoDuoc(vaiToi as VaiTro).map((v) => <option key={v} value={v}>{tenVai[v]}</option>)}
            </select>
            <button type="submit" disabled={dangLam !== null} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {dangLam === 'moi' ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} {t('ui2.dn.them')}
            </button>
          </div>
        </form>
      )}

      {ds && (
        <button
          type="button"
          onClick={() => setXacNhan({
            tieuDe: t('ui2.thanhVien.roiHoi'),
            mo: t('ui2.thanhVien.roiMo'),
            nut: t('ui2.thanhVien.roi'),
            lam: () => {
              void lam('roi', 'roi', {}, t('ui2.thanhVien.daRoi')).then((ok) => { if (ok) window.location.assign('/dashboard'); });
            },
          })}
          className="text-xs font-medium text-muted-foreground hover:text-destructive hover:underline"
        >
          {t('ui2.thanhVien.roi')}
        </button>
      )}

      <AlertDialog open={xacNhan !== null} onOpenChange={(m) => { if (!m) setXacNhan(null); }}>
        <AlertDialogContent className="rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{xacNhan?.tieuDe}</AlertDialogTitle>
            <AlertDialogDescription>{xacNhan?.mo}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>{t('ui2.chung.huy')}</AlertDialogCancel>
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
