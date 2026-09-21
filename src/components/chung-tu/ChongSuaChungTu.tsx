import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FolderOpen, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { congTyDangDung, idCongTyDangDung } from '@/lib/congTyDangDung';
import { goiDauThoiGian } from '@/lib/goiDauThoiGian';
import { giaiMaSaoLuu, maHoaSaoLuu, MAT_KHAU_TOI_THIEU } from '@/lib/saoLuuMaHoa';
import { bamHex, noiDungChuanChungTu, noiDungChuanHoaDon, type ChungTuGoc, type HoaDonGoc } from '@/lib/chuanHoaChungTu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * Chống sửa & sao lưu hoá đơn, chứng từ (15/09/2026).
 *
 * - Trạng thái sổ cái và neo Bitcoin (edge function `dau-thoi-gian`).
 * - Kiểm toàn vẹn: chuỗi băm không đứt, chứng từ hiện tại không lệch sổ cái.
 * - Tải bản sao lưu mã hoá bằng mật khẩu người dùng; mở lại và tự kiểm mã băm ngay ở máy,
 *   không cần tin MIMI.
 */

type BangTho = { from: (bang: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

interface TrangThai {
  so_muc: number;
  so_chua_neo: number;
  so_cho_bitcoin: number;
  so_da_vao_bitcoin: number;
  so_loi: number;
  khoi_gan_nhat: { khoi_bitcoin: number; created_at: string } | null;
}

interface NoiDungSaoLuu {
  cong_ty: { id: string; name: string | null };
  hoa_don_dien_tu: (HoaDonGoc & { id: string })[];
  chung_tu_quet: (ChungTuGoc & { anh_base64?: string | null })[];
  so_cai: { loai: string; ban_ghi_id: string; ma_bam: string; bam_truoc: string; bam_chuoi: string; id: number }[];
  neo_thoi_gian: Record<string, unknown>[];
}

const ngay = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');
const TRANG = 1000;

async function docHet(bang: string, cot: string, companyId: string, thuTu: string) {
  const ds: Record<string, unknown>[] = [];
  for (let tu = 0; tu < 200_000; tu += TRANG) {
    const { data, error } = await (supabase as unknown as BangTho).from(bang).select(cot).eq('company_id', companyId)
      .order(thuTu, { ascending: true }).range(tu, tu + TRANG - 1);
    if (error) throw new Error(`Không đọc được ${bang}: ${error.message}`);
    ds.push(...(data ?? []));
    if ((data ?? []).length < TRANG) break;
  }
  return ds;
}

const blobThanhBase64 = (b: Blob) => new Promise<string>((ok, hong) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).split(',')[1] ?? '');
  r.onerror = () => hong(new Error('Không đọc được ảnh.'));
  r.readAsDataURL(b);
});

export function ChongSuaChungTu() {
  const [tt, setTt] = useState<TrangThai | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangKiem, setDangKiem] = useState(false);
  const [moSaoLuu, setMoSaoLuu] = useState<'tai' | 'mo' | null>(null);

  const tai = useCallback(async () => {
    try {
      setTt((await goiDauThoiGian('trang_thai')) as TrangThai);
      setLoi(null);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Chưa đọc được trạng thái chống sửa.');
    }
  }, []);
  useEffect(() => { void tai(); }, [tai]);

  const kiem = async () => {
    setDangKiem(true);
    try {
      const r = await goiDauThoiGian('kiem_toan_ven');
      if (r.so_chung_tu_lech === 0 && r.so_mat_xich_hong === 0) {
        toast.success(`Toàn vẹn: ${r.so_chung_tu} chứng từ khớp sổ cái, chuỗi ${r.so_mat_xich} mắt xích không đứt.`);
      } else {
        toast.error(`Phát hiện bất thường: ${r.so_chung_tu_lech} chứng từ lệch sổ cái, ${r.so_mat_xich_hong} mắt xích hỏng. Liên hệ hỗ trợ MIMI.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chưa kiểm được.');
    } finally {
      setDangKiem(false);
    }
  };

  return (
    <section aria-labelledby="chong-sua" className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          <ShieldCheck size={22} className="mt-0.5 shrink-0 text-mimi-green" aria-hidden />
          <div>
            <h2 id="chong-sua" className="text-base font-semibold text-foreground">Chống sửa & sao lưu</h2>
            {loi ? (
              <p className="text-sm text-destructive">{loi}</p>
            ) : !tt ? (
              <p className="text-sm text-muted-foreground">Đang đọc sổ cái…</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {tt.so_muc} lần ghi sổ; {tt.so_da_vao_bitcoin} đã neo vào Bitcoin
                {tt.khoi_gan_nhat ? ` (khối #${tt.khoi_gan_nhat.khoi_bitcoin.toLocaleString('vi-VN')}, ${ngay(tt.khoi_gan_nhat.created_at)})` : ''}
                {tt.so_cho_bitcoin ? `; ${tt.so_cho_bitcoin} đang chờ Bitcoin xác nhận (thường vài giờ)` : ''}
                {tt.so_chua_neo ? `; ${tt.so_chua_neo} sẽ neo lúc 0 giờ đêm nay` : ''}.
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Mỗi hoá đơn, chứng từ có một mã băm. Mỗi đêm MIMI gom mã băm và neo lên Bitcoin qua OpenTimestamps — chỉ mã băm rời MIMI,
              không có tên hay số tiền. Tệp bằng chứng .ots kiểm độc lập được tại opentimestamps.org.
            </p>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
          <button type="button" onClick={() => void kiem()} disabled={dangKiem} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">
            {dangKiem ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Kiểm toàn vẹn
          </button>
          <button type="button" onClick={() => setMoSaoLuu('tai')} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-accent">
            <Download size={14} /> Tải sao lưu
          </button>
          <button type="button" onClick={() => setMoSaoLuu('mo')} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-accent">
            <FolderOpen size={14} /> Mở sao lưu
          </button>
        </div>
      </div>
      <HopSaoLuu che={moSaoLuu} onDong={() => setMoSaoLuu(null)} />
    </section>
  );
}

function HopSaoLuu({ che, onDong }: { che: 'tai' | 'mo' | null; onDong: () => void }) {
  const [matKhau, setMatKhau] = useState('');
  const [nhapLai, setNhapLai] = useState('');
  const [kemAnh, setKemAnh] = useState(true);
  const [dang, setDang] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [ketQua, setKetQua] = useState<string | null>(null);
  const oTep = useRef<HTMLInputElement>(null);

  useEffect(() => { if (che) { setMatKhau(''); setNhapLai(''); setLoi(null); setKetQua(null); setDang(null); } }, [che]);

  const taoSaoLuu = async () => {
    setLoi(null);
    if (matKhau.length < MAT_KHAU_TOI_THIEU) { setLoi(`Mật khẩu cần ít nhất ${MAT_KHAU_TOI_THIEU} ký tự.`); return; }
    if (matKhau !== nhapLai) { setLoi('Hai lần nhập mật khẩu không khớp.'); return; }
    try {
      setDang('Đang đọc chứng từ…');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Phiên đăng nhập đã hết.');
      // Công ty đang dùng (thành viên được mời cũng sao lưu được), không chỉ công ty mình tạo.
      const dang = await congTyDangDung();
      if (!dang) throw new Error('Không đọc được công ty.');
      const cty = { id: dang.id, name: dang.ten };
      const [hd, ct, sc, neo] = await Promise.all([
        docHet('gdt_invoices', 'id, company_id, gdt_id, direction, invoice_serial, invoice_number, invoice_form_code, counterparty_tax_code, counterparty_name, currency, subtotal_amount, tax_amount, total_amount, tax_rate_breakdown, issued_at, issuance_period, invoice_lookup_code, invoice_status', cty.id, 'issued_at'),
        docHet('chung_tu_quet', 'id, company_id, loai, so_hoa_don, ky_hieu, ngay, ben_ban, ma_so_thue_ben_ban, tien_truoc_thue, tien_thue, tong_tien, giao_dich_id, anh_path, anh_sha256, created_at', cty.id, 'created_at'),
        docHet('so_cai_chung_tu', 'id, loai, ban_ghi_id, ma_bam, bam_truoc, bam_chuoi, neo_id, thu_tu_la, created_at', cty.id, 'id'),
        docHet('neo_thoi_gian', 'id, goc_merkle, so_la, lich, bang_chung_cho, bang_chung_bitcoin, khoi_bitcoin, trang_thai, created_at', cty.id, 'id'),
      ]);
      if (kemAnh) {
        const coAnh = ct.filter((c) => c.anh_path);
        for (let i = 0; i < coAnh.length; i++) {
          setDang(`Đang tải ảnh ${i + 1}/${coAnh.length}…`);
          const { data } = await supabase.storage.from('chung-tu').download(String(coAnh[i].anh_path));
          coAnh[i].anh_base64 = data ? await blobThanhBase64(data) : null;
        }
      }
      setDang('Đang mã hoá…');
      const tep = await maHoaSaoLuu({ cong_ty: cty, hoa_don_dien_tu: hd, chung_tu_quet: ct, so_cai: sc, neo_thoi_gian: neo }, matKhau);
      const url = URL.createObjectURL(new Blob([JSON.stringify(tep)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `mimi-sao-luu-${new Date().toISOString().slice(0, 10)}.mimi`;
      a.click();
      URL.revokeObjectURL(url);
      setKetQua(`Đã tạo bản sao lưu: ${hd.length} hoá đơn điện tử, ${ct.length} chứng từ chụp, ${sc.length} mắt xích sổ cái. Cất tệp ở nơi khác MIMI (ổ cứng, email riêng) và nhớ mật khẩu — quên là không ai mở được.`);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Chưa tạo được bản sao lưu.');
    } finally {
      setDang(null);
    }
  };

  const moSaoLuu = async () => {
    setLoi(null);
    const f = oTep.current?.files?.[0];
    if (!f) { setLoi('Chọn tệp sao lưu (.mimi).'); return; }
    if (f.size > 500 * 1024 * 1024) { setLoi('Tệp lớn hơn 500 MB.'); return; }
    try {
      setDang('Đang giải mã…');
      const du = await giaiMaSaoLuu<NoiDungSaoLuu>(JSON.parse(await f.text()), matKhau);
      setDang('Đang kiểm mã băm…');
      const moiNhat = new Map<string, string>();
      for (const s of du.so_cai) moiNhat.set(`${s.loai}:${s.ban_ghi_id}`, s.ma_bam);
      let khop = 0;
      let lech = 0;
      for (const h of du.hoa_don_dien_tu) (moiNhat.get(`hoa_don_dien_tu:${h.id}`) === await bamHex(noiDungChuanHoaDon(h)) ? khop++ : lech++);
      for (const c of du.chung_tu_quet) (moiNhat.get(`chung_tu_quet:${c.id}`) === await bamHex(noiDungChuanChungTu(c)) ? khop++ : lech++);
      let anhKhop = 0;
      for (const c of du.chung_tu_quet) {
        if (c.anh_base64 && c.anh_sha256 && await bamHex(Uint8Array.from(atob(c.anh_base64), (x) => x.charCodeAt(0))) === c.anh_sha256) anhKhop++;
      }
      const daNeo = du.neo_thoi_gian.filter((n) => n.trang_thai === 'da_vao_bitcoin').length;
      setKetQua(`Mở được bản sao lưu của ${du.cong_ty.name ?? 'công ty'}: ${du.hoa_don_dien_tu.length} hoá đơn điện tử, ${du.chung_tu_quet.length} chứng từ chụp (${anhKhop} ảnh khớp mã băm). ${khop} chứng từ khớp sổ cái${lech ? `, ${lech} KHÔNG khớp` : ''}; ${daNeo} lần neo đã vào Bitcoin.`);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Chưa mở được bản sao lưu.');
    } finally {
      setDang(null);
    }
  };

  return (
    <Dialog open={!!che} onOpenChange={(v) => { if (!v && !dang) onDong(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{che === 'mo' ? 'Mở bản sao lưu' : 'Tải bản sao lưu mã hoá'}</DialogTitle>
          <DialogDescription>
            {che === 'mo'
              ? 'Giải mã ngay trên máy này và tự kiểm mã băm từng chứng từ — không gửi gì lên MIMI.'
              : 'Toàn bộ hoá đơn điện tử, chứng từ chụp và sổ cái, mã hoá bằng mật khẩu bạn đặt. MIMI không lưu mật khẩu này.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); void (che === 'mo' ? moSaoLuu() : taoSaoLuu()); }} className="space-y-3">
          {che === 'mo' && (
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Tệp sao lưu</span>
              <input ref={oTep} type="file" accept=".mimi,application/json" className="block w-full text-sm" />
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Mật khẩu sao lưu</span>
            <input type="password" autoComplete={che === 'mo' ? 'current-password' : 'new-password'} value={matKhau} onChange={(e) => setMatKhau(e.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3" />
          </label>
          {che === 'tai' && (
            <>
              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">Nhập lại mật khẩu</span>
                <input type="password" autoComplete="new-password" value={nhapLai} onChange={(e) => setNhapLai(e.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3" />
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={kemAnh} onChange={(e) => setKemAnh(e.target.checked)} className="mt-0.5" />
                <span>Kèm ảnh gốc của chứng từ chụp (tệp lớn hơn)</span>
              </label>
            </>
          )}
          {loi && <p className="text-sm text-destructive" role="alert">{loi}</p>}
          {ketQua && <p className="text-sm text-foreground" role="status">{ketQua}</p>}
          <button type="submit" disabled={!!dang} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50">
            {dang ? <><Loader2 size={14} className="animate-spin" /> {dang}</> : che === 'mo' ? 'Giải mã và kiểm' : 'Tạo và tải bản sao lưu'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
