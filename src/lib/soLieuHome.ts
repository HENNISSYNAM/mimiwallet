import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { congTyDangDung } from '@/lib/congTyDangDung';
import { docDu, type TrangDoc } from '@/lib/docDu';
import { theoThang, type GiaoDich } from '@/lib/bcTaiChinh';
import { chieuTien } from '../../supabase/functions/_shared/tien/chieu-tien.ts';
import { duocHien } from '../../supabase/functions/_shared/minh-hoa.ts';
import { homNayVN } from '../../supabase/functions/_shared/viec/dong-co-viec';

/**
 * Số liệu biểu đồ cho Home (22/11/2026): dòng tiền 6 tháng và các khoản lớn 30 ngày — đọc đúng như Tổng quan nhanh
 * (`transactions` của công ty đang dùng, bỏ dòng thử bằng `duocHien`, chiều tiền bằng `chieuTien`, gom tháng bằng
 * `theoThang`). Đọc lỗi → 'loi' (giao diện nói chưa đọc được), không hiện số 0 giả.
 */

export interface ThangDongTien { khoa: string; nhan: string; vao: number; ra: number; rong: number }
export interface KhoanLon { id: string; ngay: string; noi_dung: string; chieu: 'vao' | 'ra'; so_tien: number }
export interface SoLieuHome { thang: ThangDongTien[]; khoanLon: KhoanLon[] }

type Dong = GiaoDich & { id: string; is_synthetic: boolean | null; counter_account_name: string | null; merchant_name: string | null; payment_reference: string | null };

export const SO_THANG = 6;

/** 6 khoá tháng liền nhau, kết thúc ở tháng của `homNay` (YYYY-MM-DD). */
export function cacThang(homNay: string, n = SO_THANG): string[] {
  const [y, m] = homNay.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

/** Gom dòng thành chuỗi 6 tháng (tháng không có giao dịch = 0) và 5 khoản lớn nhất trong 30 ngày. Thuần. */
export function dungSoLieuHome(dong: Dong[], homNay: string): SoLieuHome {
  const khoa = cacThang(homNay);
  const theo = new Map(theoThang(dong).map((t) => [t.khoa, t]));
  const thang = khoa.map((k) => {
    const t = theo.get(k);
    const vao = Number(t?.tienVao ?? 0), ra = Number(t?.tienRa ?? 0);
    return { khoa: k, nhan: `T${Number(k.slice(5))}`, vao, ra, rong: vao - ra };
  });
  const tu = new Date(Date.parse(homNay) - 30 * 86_400_000).toISOString().slice(0, 10);
  const khoanLon = dong
    .filter((d) => String(d.transaction_date).slice(0, 10) >= tu)
    .map((d) => ({ d, chieu: chieuTien(d), so: Math.abs(Number(d.amount) || 0) }))
    .filter((x): x is { d: Dong; chieu: 'vao' | 'ra'; so: number } => x.chieu !== null && x.so > 0)
    .sort((a, b) => b.so - a.so)
    .slice(0, 5)
    .map(({ d, chieu, so }) => ({
      id: String(d.id), ngay: String(d.transaction_date).slice(0, 10), chieu, so_tien: so,
      noi_dung: [d.counter_account_name, d.merchant_name ?? d.payment_reference].filter(Boolean).join(' — ') || '—',
    }));
  return { thang, khoanLon };
}

export function useSoLieuHome(lan: number): SoLieuHome | 'loi' | null {
  const [s, setS] = useState<SoLieuHome | 'loi' | null>(null);
  useEffect(() => {
    let huy = false;
    setS(null);
    (async () => {
      const cty = await congTyDangDung().catch(() => null);
      if (huy) return;
      if (!cty) { setS('loi'); return; }
      const homNay = homNayVN();
      const tu = `${cacThang(homNay)[0]}-01`;
      const kq = await docDu<Dong>((a, b, dem) => supabase.from('transactions')
        .select('id, amount, type, transaction_date, category, is_synthetic, counter_account_name, merchant_name, payment_reference', dem ? { count: 'exact' } : undefined)
        .eq('company_id', cty.id).gte('transaction_date', tu)
        .order('transaction_date', { ascending: true }).order('id', { ascending: true }).range(a, b) as unknown as PromiseLike<TrangDoc<Dong>>);
      if (huy) return;
      if (kq.loi || !kq.du) { setS('loi'); return; }
      setS(dungSoLieuHome(kq.dong.filter(duocHien(cty.la_demo === true)) as Dong[], homNay));
    })().catch(() => { if (!huy) setS('loi'); });
    return () => { huy = true; };
  }, [lan]);
  return s;
}
