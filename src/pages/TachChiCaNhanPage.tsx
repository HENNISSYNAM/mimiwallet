import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { congTyDangDung } from '@/lib/congTyDangDung';
import { locMinhHoa } from '../../supabase/functions/_shared/minh-hoa.ts';
import { goiTroLy } from '@/lib/goiTroLy';
import { chieuTien, doLonTien } from '@/lib/chieuTien';
import { goiYCaNhan } from '../../supabase/functions/_shared/phan-loai/ca-nhan.ts';
import { docHet } from '../../supabase/functions/_shared/doc-het';
import { dinhDangTien } from '@/lib/tien';

/**
 * TCCN-08 — Tách chi tiêu cá nhân khỏi chi phí kinh doanh.
 *
 * Hộ kinh doanh hay dùng một tài khoản cho cả nhà và cửa hàng. Trang này liệt kê khoản tiền ra 90
 * ngày, gợi ý khoản nào có vẻ là chi cá nhân (kèm lý do), và để người dùng chọn. Lựa chọn lưu ở
 * `transaction_labels` qua `tro-ly` (có kiểm vai trò). MIMI không tự gắn nhãn nào.
 *
 * Nhãn này CHƯA được dùng để tính lại các con số thuế: loại chi cá nhân khỏi chi phí là một
 * thay đổi quy tắc thuế, cần người duyệt theo đặc tả audit. Trang nói rõ điều đó.
 */

const SO_NGAY = 90;
const TRAN = 1000;

interface Khoan {
  id: string;
  ngay: string;
  so_tien: number;
  nguoi_nhan: string;
  noi_dung: string | null;
  goi_y: string | null;
  /** true = cá nhân, false = kinh doanh, null = chưa phân loại (chưa có nhãn người chọn). */
  ca_nhan: boolean | null;
}

type Loc = 'chua' | 'ca_nhan' | 'kinh_doanh' | 'tat_ca';
const TEN_LOC: Record<Loc, string> = { chua: 'ui1.tccn.chua', ca_nhan: 'ui1.tccn.caNhan', kinh_doanh: 'ui1.tccn.kinhDoanh', tat_ca: 'ui1.tccn.tatCa' };
const LOCALE: Record<string, string> = { vi: 'vi-VN', en: 'en-US', ko: 'ko-KR', zh: 'zh-CN' };

const vnd = dinhDangTien;
const ngayVN = (s: string) => s.slice(0, 10).split('-').reverse().join('/');

export default function TachChiCaNhanPage() {
  const { t: dich, i18n: ng } = useTranslation();
  const [ds, setDs] = useState<Khoan[] | null>(null);
  const [biCat, setBiCat] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [loc, setLoc] = useState<Loc>('chua');
  const [dangLuu, setDangLuu] = useState<string | null>(null);

  const tai = useCallback(async () => {
    setLoi(null);
    try {
      const dang = await congTyDangDung();
      const id = dang?.id;
      if (!id) { setDs([]); return; }
      const tu = new Date(Date.now() - SO_NGAY * 86_400_000).toISOString().slice(0, 10);
      const [gd, nhan] = await Promise.all([
        locMinhHoa(supabase.from('transactions')
          .select('id, transaction_date, amount, type, merchant_name, counter_account_name, payment_reference, is_synthetic', { count: 'exact' })
          .eq('company_id', id), dang?.la_demo === true).gte('transaction_date', tu)
          .order('transaction_date', { ascending: false }).limit(TRAN),
        // `.limit(20_000)` cũ KHÔNG vượt được mốc 1000 dòng của PostgREST — nhãn thứ 1001 trở đi mất, và
        // khoản người dùng đã phân loại hiện lại như chưa phân loại. Đọc hết theo trang.
        docHet((a, b) => supabase.from('transaction_labels').select('transaction_id, is_personal, source')
          .eq('company_id', id).order('transaction_id').range(a, b), 'nhãn chi cá nhân')
          .then((data) => ({ data: data as { transaction_id: string; is_personal: boolean; source: string }[], error: null }),
            (e: unknown) => ({ data: null, error: e instanceof Error ? e : new Error(String(e)) })),
      ]);
      if (gd.error) throw gd.error;
      if (nhan.error) throw nhan.error;
      // Chỉ nhãn người chọn mới tính là "đã phân loại" — nhãn máy (rule/llm) chưa ai xác nhận.
      const nguoiChon = new Map((nhan.data ?? []).filter((n) => n.source === 'human').map((n) => [n.transaction_id, n.is_personal]));
      setBiCat((gd.count ?? 0) > (gd.data?.length ?? 0));
      setDs((gd.data ?? []).filter((t) => chieuTien(t) === 'ra').map((t) => ({
        id: t.id,
        ngay: String(t.transaction_date),
        so_tien: doLonTien(t),
        nguoi_nhan: t.counter_account_name ?? t.merchant_name ?? i18n.t('ui1.tccn.khongRoNguoiNhan'),
        noi_dung: t.payment_reference,
        goi_y: goiYCaNhan(t)?.ly_do ?? null,
        ca_nhan: nguoiChon.has(t.id) ? !!nguoiChon.get(t.id) : null,
      })));
    } catch (e) {
      setLoi(e instanceof Error ? e.message : i18n.t('ui1.tccn.khongTai'));
    }
  }, []);

  useEffect(() => { void tai(); }, [tai]);

  const chon = async (k: Khoan, caNhan: boolean) => {
    setDangLuu(k.id);
    try {
      await goiTroLy('gan_nhan_chi', { giao_dich_id: k.id, ca_nhan: caNhan });
      setDs((cu) => cu?.map((x) => (x.id === k.id ? { ...x, ca_nhan: caNhan } : x)) ?? cu);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : dich('ui1.chung.chuaLuu'));
    } finally {
      setDangLuu(null);
    }
  };

  const tong = useMemo(() => {
    const t = { kinh_doanh: 0, ca_nhan: 0, chua: 0 };
    for (const k of ds ?? []) {
      if (k.ca_nhan === true) t.ca_nhan += k.so_tien;
      else if (k.ca_nhan === false) t.kinh_doanh += k.so_tien;
      else t.chua += k.so_tien;
    }
    return t;
  }, [ds]);

  const hien = (ds ?? []).filter((k) =>
    loc === 'tat_ca' ? true : loc === 'chua' ? k.ca_nhan === null : loc === 'ca_nhan' ? k.ca_nhan === true : k.ca_nhan === false);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{dich('ui1.tccn.tieuDe')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {dich('ui1.tccn.moTa')}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {dich('ui1.tccn.chiGoiY')}
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3" aria-label={dich('ui1.tccn.tongChi', { n: SO_NGAY })}>
        {([[dich('ui1.tccn.kinhDoanh'), tong.kinh_doanh], [dich('ui1.tccn.caNhan'), tong.ca_nhan], [dich('ui1.tccn.chua'), tong.chua]] as const).map(([nhan, so]) => (
          <div key={nhan} className="rounded-xl border border-border bg-card p-4">
            <dt className="text-xs text-muted-foreground">{nhan}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">{vnd(so)}</dd>
          </div>
        ))}
      </dl>

      {biCat && (
        <p role="status" className="text-sm text-amber-700 dark:text-amber-400">
          {dich('ui1.tccn.biCat', { tran: TRAN.toLocaleString(LOCALE[(ng.language ?? 'vi').slice(0, 2)] ?? 'vi-VN'), n: SO_NGAY })}
        </p>
      )}
      {loi && <p role="alert" className="text-sm text-destructive">{loi}</p>}
      {!ds && !loi && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> {dich('ui1.tccn.dangTai')}</p>}

      {ds && (
        <>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={dich('ui1.tccn.loc')}>
            {(Object.keys(TEN_LOC) as Loc[]).map((l) => (
              <button
                key={l}
                role="tab"
                aria-selected={loc === l}
                onClick={() => setLoc(l)}
                className={`rounded-full border px-3 py-1.5 text-sm ${loc === l ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'}`}
              >
                {dich(TEN_LOC[l])}
              </button>
            ))}
          </div>

          {hien.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {ds.length === 0 ? dich('ui1.tccn.chuaCo', { n: SO_NGAY }) : dich('ui1.tccn.mucTrong')}
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border" aria-label={dich('ui1.tccn.khoanChi')}>
              {hien.map((k) => (
                <li key={k.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{k.nguoi_nhan}</p>
                    <p className="truncate text-xs text-muted-foreground">{ngayVN(k.ngay)}{k.noi_dung ? ` · ${k.noi_dung}` : ''}</p>
                    {k.goi_y && k.ca_nhan === null && (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{dich('ui1.tccn.coVe', { ly_do: k.goi_y.toLowerCase() })}</p>
                    )}
                  </div>
                  <span className="font-mono tabular-nums text-foreground">{vnd(k.so_tien)}</span>
                  <div className="flex gap-1" role="group" aria-label={dich('ui1.tccn.phanLoai', { tien: vnd(k.so_tien), nguoi: k.nguoi_nhan })}>
                    {([[false, dich('ui1.tccn.kinhDoanh')], [true, dich('ui1.tccn.caNhan')]] as const).map(([gia, nhan]) => (
                      <button
                        key={nhan}
                        aria-pressed={k.ca_nhan === gia}
                        disabled={dangLuu !== null}
                        onClick={() => void chon(k, gia)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium disabled:opacity-60 ${k.ca_nhan === gia ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground'}`}
                      >
                        {nhan}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
