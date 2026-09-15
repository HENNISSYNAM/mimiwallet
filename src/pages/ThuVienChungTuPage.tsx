import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Camera, Check, Download, FileText, ImageOff, Loader2, RefreshCw, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { goiTroLy } from '@/lib/goiTroLy';
import { dinhDang } from '@/lib/troLy';
import {
  csvChoKeToan, gopThuVien, locThuVien,
  type ChungTuQuetDong, type GiaoDichGan, type HoaDonDienTuDong, type LocThuVien, type MucThuVien,
} from '@/lib/thuVienChungTu';
import { NutQuetChungTu } from '@/components/chung-tu/NutQuetChungTu';
import { ChongSuaChungTu } from '@/components/chung-tu/ChongSuaChungTu';
import { goiDauThoiGian, taiTepBase64 } from '@/lib/goiDauThoiGian';
import { Stamp } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Thư viện chứng từ — "thư viện ảnh" của hoá đơn, chứng từ (15/09/2026).
 *
 * Hai nguồn thật: hoá đơn điện tử đầu vào lấy từ Tổng cục Thuế, và chứng từ người dùng chụp
 * (ảnh lưu ở kho riêng tư `chung-tu`, đọc bằng URL ký tạm một giờ). Học cách Ramp giữ biên
 * lai: mỗi chứng từ nói nó gắn khoản chi nào; chứng từ chưa gắn lộ ra để xử lý trước khi
 * chốt sổ; xuất một file cho kế toán.
 */

// Bảng mới chưa có trong kiểu sinh sẵn.
type BangTho = { from: (bang: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const LOC: { khoa: LocThuVien; nhan: string }[] = [
  { khoa: 'tat_ca', nhan: 'Tất cả' },
  { khoa: 'chup', nhan: 'Chứng từ chụp' },
  { khoa: 'hoa_don_dien_tu', nhan: 'Hoá đơn điện tử' },
  { khoa: 'chua_gan', nhan: 'Chưa gắn khoản chi' },
];

export default function ThuVienChungTuPage() {
  const [ds, setDs] = useState<MucThuVien[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [loc, setLoc] = useState<LocThuVien>('tat_ca');
  const [tuKhoa, setTuKhoa] = useState('');
  const [anh, setAnh] = useState<Record<string, string>>({});
  const [coMoHinh, setCoMoHinh] = useState<boolean | undefined>(undefined);
  const [xoa, setXoa] = useState<MucThuVien | null>(null);
  const [dangXoa, setDangXoa] = useState(false);

  const tai = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: cty, error: loiCty } = await supabase.from('companies').select('id')
        .eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).maybeSingle();
      if (loiCty) throw loiCty;
      if (!cty) { setDs([]); return; }
      const tho = supabase as unknown as BangTho;
      const [q, h] = await Promise.all([
        tho.from('chung_tu_quet')
          .select('id, loai, so_hoa_don, ky_hieu, ngay, ben_ban, ma_so_thue_ben_ban, tien_thue, tong_tien, giao_dich_id, anh_path, created_at')
          .eq('company_id', cty.id).order('created_at', { ascending: false }).limit(500),
        tho.from('gdt_invoices')
          .select('id, invoice_number, invoice_serial, counterparty_name, counterparty_tax_code, total_amount, tax_amount, issued_at')
          .eq('company_id', cty.id).eq('direction', 'received').order('issued_at', { ascending: false }).limit(500),
      ]);
      if (q.error) throw q.error;
      if (h.error) throw h.error;
      const quet = (q.data ?? []) as ChungTuQuetDong[];

      const ids = [...new Set(quet.map((x) => x.giao_dich_id).filter(Boolean))] as string[];
      let gd: GiaoDichGan[] = [];
      if (ids.length) {
        const r = await supabase.from('transactions')
          .select('id, transaction_date, counter_account_name, merchant_name, amount, is_synthetic')
          .in('id', ids);
        if (r.error) throw r.error;
        gd = (r.data ?? []).filter((t) => !t.is_synthetic).map((t) => ({
          id: t.id, transaction_date: t.transaction_date, ten: t.counter_account_name || t.merchant_name, so_tien: Math.abs(Number(t.amount)),
        }));
      }
      setDs(gopThuVien(quet, (h.data ?? []) as HoaDonDienTuDong[], gd));

      const duong = quet.map((x) => x.anh_path).filter(Boolean) as string[];
      if (duong.length) {
        const { data: ky } = await supabase.storage.from('chung-tu').createSignedUrls(duong, 3600);
        const m: Record<string, string> = {};
        for (const k of ky ?? []) if (k.signedUrl && k.path) m[k.path] = k.signedUrl;
        setAnh(m);
      }
      setLoi(null);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Chưa đọc được thư viện chứng từ.');
    }
  }, []);

  useEffect(() => {
    void tai();
    goiTroLy('trang_thai').then((r) => setCoMoHinh(!!r.co_mo_hinh)).catch(() => setCoMoHinh(undefined));
  }, [tai]);

  const hien = useMemo(() => (ds ? locThuVien(ds, loc, tuKhoa) : []), [ds, loc, tuKhoa]);
  const dem = useMemo(() => Object.fromEntries(LOC.map((l) => [l.khoa, ds ? locThuVien(ds, l.khoa, '').length : 0])), [ds]);

  const xuat = () => {
    const blob = new Blob([csvChoKeToan(hien)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chung-tu-mimi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const taiBangChung = async (m: MucThuVien) => {
    try {
      const r = await goiDauThoiGian('bang_chung', { loai: m.nguon === 'chup' ? 'chung_tu_quet' : 'hoa_don_dien_tu', ban_ghi_id: m.id });
      if (r.trang_thai === 'chua_neo') {
        toast.info('Chứng từ này đã ghi sổ, sẽ neo lên Bitcoin lúc 0 giờ đêm nay. Tải bằng chứng sau.');
        return;
      }
      taiTepBase64(String(r.ots), `mimi-${m.nguon === 'chup' ? 'chung-tu' : 'hoa-don'}-${m.id.slice(0, 8)}.ots`);
      toast.success(r.trang_thai === 'da_vao_bitcoin'
        ? `Đã tải bằng chứng — nằm trong khối Bitcoin #${Number(r.khoi_bitcoin).toLocaleString('vi-VN')}.`
        : 'Đã tải bằng chứng — đang chờ Bitcoin xác nhận; tải lại sau vài giờ để có bản đầy đủ.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chưa tải được bằng chứng.');
    }
  };

  const xacNhanXoa = async () => {
    if (!xoa) return;
    setDangXoa(true);
    try {
      await goiTroLy('xoa_chung_tu', { id: xoa.id });
      toast.success('Đã xoá chứng từ.');
      setXoa(null);
      await tai();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chưa xoá được.');
    } finally {
      setDangXoa(false);
    }
  };

  const nutChup = (
    <NutQuetChungTu
      coMoHinh={coMoHinh}
      onDaLuu={() => void tai()}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-110"
    >
      <Camera size={16} /> Chụp chứng từ
    </NutQuetChungTu>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Thư viện chứng từ</h1>
          <p className="mt-1 text-sm text-muted-foreground">Hoá đơn điện tử từ Tổng cục Thuế và chứng từ bạn chụp, ở một chỗ để kế toán tra lại.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {nutChup}
          <button
            type="button"
            onClick={xuat}
            disabled={!hien.length}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
          >
            <Download size={16} /> Xuất cho kế toán
          </button>
        </div>
      </header>

      <ChongSuaChungTu />

      {loi && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <span>Chưa đọc được thư viện: {loi}</span>
          <button type="button" onClick={() => void tai()} className="inline-flex items-center gap-1 font-medium underline underline-offset-4"><RefreshCw size={14} /> Thử lại</button>
        </div>
      )}

      {!ds && !loi && (
        <p className="flex items-center gap-2 py-12 text-sm text-muted-foreground" role="status"><Loader2 size={15} className="animate-spin" /> Đang mở thư viện…</p>
      )}

      {ds && ds.length === 0 && (
        <section className="rounded-2xl border border-border bg-card p-6 text-center">
          <FileText size={28} className="mx-auto text-muted-foreground" aria-hidden />
          <h2 className="mt-3 text-lg font-semibold text-foreground">Chưa có chứng từ nào</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Chụp hoá đơn giấy để MIMI đọc giúp, hoặc kết nối Tổng cục Thuế để hoá đơn điện tử tự về đây.
          </p>
          <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
            {nutChup}
            <Link to="/dashboard/ket-noi" className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-accent">Kết nối Tổng cục Thuế</Link>
          </div>
        </section>
      )}

      {ds && ds.length > 0 && (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0" role="group" aria-label="Lọc chứng từ">
              {LOC.map((l) => (
                <button
                  key={l.khoa}
                  type="button"
                  aria-pressed={loc === l.khoa}
                  onClick={() => setLoc(l.khoa)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${loc === l.khoa ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground hover:bg-accent'}`}
                >
                  {l.nhan} <span className="tabular-nums opacity-70">{dem[l.khoa]}</span>
                </button>
              ))}
            </div>
            <label className="flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 md:w-72">
              <Search size={15} className="text-muted-foreground" aria-hidden />
              <span className="sr-only">Tìm chứng từ</span>
              <input
                value={tuKhoa}
                onChange={(e) => setTuKhoa(e.target.value)}
                placeholder="Tìm bên bán, số hoá đơn, mã số thuế"
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </label>
          </div>

          {hien.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Không có chứng từ khớp bộ lọc.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Chứng từ">
              {hien.map((m) => (
                <li key={m.khoa} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="flex aspect-[4/3] items-center justify-center bg-accent">
                    {m.anh_path && anh[m.anh_path] ? (
                      <a href={anh[m.anh_path]} target="_blank" rel="noreferrer" className="h-full w-full">
                        <img src={anh[m.anh_path]} alt={`Ảnh chứng từ ${m.ben_ban}`} loading="lazy" className="h-full w-full object-cover" />
                      </a>
                    ) : (
                      <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                        {m.nguon === 'hoa_don_dien_tu' ? <FileText size={26} aria-hidden /> : <ImageOff size={26} aria-hidden />}
                        {m.nguon === 'hoa_don_dien_tu' ? 'Hoá đơn điện tử' : 'Không lưu ảnh'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium text-foreground" title={m.ben_ban}>{m.ben_ban}</p>
                      <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] text-muted-foreground">
                        {m.nguon === 'chup' ? 'Chụp' : 'HĐĐT'}
                      </span>
                    </div>
                    <p className="font-display text-lg font-semibold tabular-nums text-foreground">{dinhDang(m.tong_tien, 'vnd')}</p>
                    <p className="text-xs text-muted-foreground">
                      {[m.so ? `Số ${m.so}` : null, m.ngay ? dinhDang(m.ngay, 'ngay') : null, m.mst ? `MST ${m.mst}` : null].filter(Boolean).join(' · ') || '—'}
                    </p>
                    {m.nguon === 'chup' && (
                      m.giao_dich ? (
                        <p className="mt-1 flex items-center gap-1 text-xs text-mimi-green">
                          <Check size={13} aria-hidden /> Đã gắn khoản chi {dinhDang(m.giao_dich.transaction_date, 'ngay')} · {dinhDang(m.giao_dich.so_tien, 'vnd')}
                        </p>
                      ) : (
                        <p className="mt-1 flex items-center gap-1 text-xs text-mimi-amber">
                          <AlertTriangle size={13} aria-hidden /> Chưa gắn khoản chi
                        </p>
                      )
                    )}
                    <div className="mt-auto flex justify-end gap-1 pt-2">
                      <button
                        type="button"
                        onClick={() => void taiBangChung(m)}
                        aria-label={`Tải bằng chứng chống sửa của ${m.ben_ban}`}
                        className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Stamp size={14} /> Bằng chứng
                      </button>
                    {m.nguon === 'chup' && (
                        <button
                          type="button"
                          onClick={() => setXoa(m)}
                          aria-label={`Xoá chứng từ ${m.ben_ban}`}
                          className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 size={14} /> Xoá
                        </button>
                    )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Chứng từ chụp giúp bạn biết khoản chi đã có giấy tờ; số liệu thuế vẫn tính theo hoá đơn điện tử.{' '}
            <Link to="/dashboard/chung-tu" className="underline underline-offset-4">Xem khoản chi còn thiếu chứng từ</Link>
          </p>
        </>
      )}

      <AlertDialog open={!!xoa} onOpenChange={(v) => { if (!v && !dangXoa) setXoa(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá chứng từ này?</AlertDialogTitle>
            <AlertDialogDescription>
              Xoá chứng từ {xoa?.ben_ban} {xoa ? dinhDang(xoa.tong_tien, 'vnd') : ''} và ảnh gốc. Không khôi phục được.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={dangXoa}>Giữ lại</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void xacNhanXoa(); }}
              disabled={dangXoa}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {dangXoa && <Loader2 size={14} className="mr-1 animate-spin" />} Xoá chứng từ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
