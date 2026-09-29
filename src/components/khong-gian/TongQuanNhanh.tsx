import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { congTyDangDung } from '@/lib/congTyDangDung';
import { docDu, type TrangDoc } from '@/lib/docDu';
import { theoThang, type GiaoDich } from '@/lib/bcTaiChinh';
import { dinhDangTien } from '@/lib/tien';
import { duocHien } from '../../../supabase/functions/_shared/minh-hoa.ts';
import { homNayVN } from '../../../supabase/functions/_shared/viec/dong-co-viec';
import type { ThueManDau } from '@/lib/troLy';

/**
 * TỔNG QUAN NHANH (29/09/2026) — thay cho trang Tổng quan dày đặc: bốn thẻ, mỗi thẻ một con số chính, một trạng
 * thái, bấm vào mở đúng module. Mọi số đọc từ dữ liệu thật qua đúng các hàm đang dùng ở module tương ứng
 * (`theoThang`, `docDu`, `duocHien`, `boi_canh.thue`). Đọc lỗi thì nói là chưa đọc được — không hiện số 0.
 */

type DongGd = GiaoDich & { is_synthetic: boolean | null };
type DongHd = { total: number | null; status: string; due_date: string | null; issued_date: string | null; is_synthetic: boolean | null };
type Trang<T> = PromiseLike<TrangDoc<T>>;

const daThu = (s: string) => s === 'paid' || s === 'Đã thanh toán';

interface SoLieu {
  gd: { vao: number; ra: number; chenh: number } | 'loi' | null;
  hd: { chuaThu: number; soChuaThu: number; quaHan: number; phatHanh: number; daThuThang: number } | 'loi' | null;
}

function useSoLieuNhanh(): SoLieu {
  const [s, setS] = useState<SoLieu>({ gd: null, hd: null });
  useEffect(() => {
    let huy = false;
    (async () => {
      const cty = await congTyDangDung().catch(() => null);
      if (!cty || huy) return;
      const laDemo = cty.la_demo === true;
      const homNay = homNayVN();
      const dauThang = `${homNay.slice(0, 7)}-01`;
      const [gd, hd] = await Promise.all([
        docDu<DongGd>((tu, den, dem) => supabase.from('transactions')
          .select('amount, type, transaction_date, category, is_synthetic', dem ? { count: 'exact' } : undefined)
          .eq('company_id', cty.id).gte('transaction_date', dauThang)
          .order('transaction_date', { ascending: true }).order('id', { ascending: true }).range(tu, den) as unknown as Trang<DongGd>),
        docDu<DongHd>((tu, den, dem) => supabase.from('invoices')
          .select('total, status, due_date, issued_date, is_synthetic', dem ? { count: 'exact' } : undefined)
          .eq('company_id', cty.id)
          .order('issued_date', { ascending: true }).order('id', { ascending: true }).range(tu, den) as unknown as Trang<DongHd>),
      ]);
      if (huy) return;
      let soGd: SoLieu['gd'] = 'loi';
      if (!gd.loi && gd.du) {
        const thang = theoThang(gd.dong.filter(duocHien(laDemo)) as GiaoDich[]).find((t) => t.khoa === homNay.slice(0, 7));
        soGd = { vao: Number(thang?.tienVao ?? 0), ra: Number(thang?.tienRa ?? 0), chenh: Number(thang?.chenhLech ?? 0) };
      }
      let soHd: SoLieu['hd'] = 'loi';
      if (!hd.loi && hd.du) {
        const ds = hd.dong.filter(duocHien(laDemo)) as DongHd[];
        const chua = ds.filter((h) => !daThu(h.status));
        const trongThang = ds.filter((h) => (h.issued_date ?? '') >= dauThang);
        soHd = {
          chuaThu: chua.reduce((t, h) => t + (Number(h.total) || 0), 0),
          soChuaThu: chua.length,
          quaHan: chua.filter((h) => h.due_date && h.due_date.slice(0, 10) < homNay).length,
          phatHanh: trongThang.length,
          daThuThang: trongThang.filter((h) => daThu(h.status)).length,
        };
      }
      setS({ gd: soGd, hd: soHd });
    })();
    return () => { huy = true; };
  }, []);
  return s;
}

function The({ ten, duong, so, dong, canhBao }: { ten: string; duong: string; so: string; dong: string; canhBao?: string | null }) {
  return (
    <Link to={duong} className="group flex flex-col rounded-2xl border border-border/70 bg-card/80 p-4 shadow-[0_2px_10px_hsla(220,30%,20%,0.04)] transition-colors hover:border-primary/30">
      <span className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        {ten} <ChevronRight size={14} className="opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </span>
      <span className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-foreground">{so}</span>
      <span className="mt-0.5 text-xs text-muted-foreground">{dong}</span>
      {canhBao && (
        <span className="mt-2 inline-flex items-start gap-1 text-xs text-mimi-amber"><AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden /> {canhBao}</span>
      )}
    </Link>
  );
}

const CHUA_DOC = 'Chưa đọc được — mở để xem';

export function TongQuanNhanh({ thue }: { thue: ThueManDau | null | undefined }) {
  const { gd, hd } = useSoLieuNhanh();
  const hanGan = (thue?.nghia_vu ?? []).filter((n) => n.han).sort((a, b) => String(a.han).localeCompare(String(b.han)))[0] ?? null;

  return (
    <section aria-labelledby="tong-quan-nhanh" className="mt-6">
      <h2 id="tong-quan-nhanh" className="mb-3 text-base font-semibold text-foreground">Tổng quan nhanh</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <The ten="Dòng tiền tháng này" duong="/dashboard/cashflow"
          so={gd === null ? '…' : gd === 'loi' ? '—' : dinhDangTien(gd.chenh)}
          dong={gd === null ? 'Đang đọc…' : gd === 'loi' ? CHUA_DOC : `Vào ${dinhDangTien(gd.vao)} · Ra ${dinhDangTien(gd.ra)}`}
          canhBao={gd && gd !== 'loi' && gd.ra > gd.vao ? 'Tiền ra nhiều hơn tiền vào' : null} />
        <The ten="Công nợ phải thu" duong="/dashboard/invoices?filter=pending"
          so={hd === null ? '…' : hd === 'loi' ? '—' : dinhDangTien(hd.chuaThu)}
          dong={hd === null ? 'Đang đọc…' : hd === 'loi' ? CHUA_DOC : `${hd.soChuaThu} hoá đơn chưa thu`}
          canhBao={hd && hd !== 'loi' && hd.quaHan > 0 ? `${hd.quaHan} hoá đơn quá hạn` : null} />
        <The ten="Hoá đơn tháng này" duong="/dashboard/invoices"
          so={hd === null ? '…' : hd === 'loi' ? '—' : String(hd.phatHanh)}
          dong={hd === null ? 'Đang đọc…' : hd === 'loi' ? CHUA_DOC : `Đã thu ${hd.daThuThang}/${hd.phatHanh}`} />
        <The ten="Thuế & nghĩa vụ" duong="/dashboard/nhac-thue"
          so={thue?.doanh_thu_nam === null || thue?.doanh_thu_nam === undefined ? '—' : dinhDangTien(thue.doanh_thu_nam)}
          dong={thue === undefined ? 'Đang đọc…' : thue === null ? CHUA_DOC
            : hanGan ? `Hạn gần nhất: ${String(hanGan.han).slice(8, 10)}/${String(hanGan.han).slice(5, 7)} — ${hanGan.cau}` : `Doanh thu năm ${thue.nam}${thue.tam_tinh ? ' (tạm tính)' : ''}`}
          canhBao={thue?.thieu?.length ? 'Hồ sơ thuế còn thiếu thông tin' : null} />
      </div>
    </section>
  );
}
