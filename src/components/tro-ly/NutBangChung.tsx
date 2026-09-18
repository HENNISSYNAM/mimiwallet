import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSearch, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { goiTroLy } from '@/lib/goiTroLy';
import { dinhDang, type BangChung, type LoaiBangChung } from '@/lib/troLy';

/**
 * MIMI-P1-001 — mở đúng những bản ghi đứng sau một con số.
 *
 * Con số không mở ra được thì người dùng chỉ có thể tin hoặc không tin. Nút này gọi `tro-ly`
 * (hành động `bang_chung`), nên bản ghi lấy theo quyền của chính người đang đăng nhập và chỉ trong
 * công ty đang dùng: id của công ty khác trả về 404, không rò thông tin gì.
 */

type BanGhi = Record<string, unknown>;

/** Mỗi loại bản ghi hiện vài trường đủ để nhận ra nó; không đổ cả hàng cột ra màn hình. */
const CACH_HIEN: Record<LoaiBangChung, { ngay?: string; chinh: string[]; tien?: { khoa: string; don_vi: 'vnd' | 'usd' | 'so' } }> = {
  giao_dich: { ngay: 'transaction_date', chinh: ['counter_account_name', 'merchant_name', 'payment_reference'], tien: { khoa: 'amount', don_vi: 'vnd' } },
  hoa_don_vao: { ngay: 'issued_at', chinh: ['invoice_number', 'counterparty_name'], tien: { khoa: 'total_amount', don_vi: 'vnd' } },
  hoa_don_ban: { ngay: 'due_date', chinh: ['invoice_number', 'client_name', 'status'], tien: { khoa: 'total', don_vi: 'vnd' } },
  yeu_cau_chi: { ngay: 'created_at', chinh: ['ten_nguoi_nhan', 'muc_dich', 'trang_thai'], tien: { khoa: 'so_tien', don_vi: 'vnd' } },
  chung_tu_quet: { ngay: 'ngay', chinh: ['so_hoa_don', 'ben_ban'], tien: { khoa: 'tong_tien', don_vi: 'vnd' } },
  chi_phi_ai: { ngay: 'ngay', chinh: ['nha_cung_cap', 'hang_muc'], tien: { khoa: 'so_tien_usd', don_vi: 'usd' } },
  token_ai: { ngay: 'ngay', chinh: ['nha_cung_cap', 'model'], tien: { khoa: 'token_ra', don_vi: 'so' } },
  van_ban_luat: { chinh: ['van_ban', 'vi_tri', 'y'] },
};

const chuoi = (v: unknown) => (v === null || v === undefined || v === '' ? null : String(v));

function DongBanGhi({ loai, r }: { loai: LoaiBangChung; r: BanGhi }) {
  const c = CACH_HIEN[loai];
  const ngay = c.ngay ? chuoi(r[c.ngay])?.slice(0, 10).split('-').reverse().join('/') : null;
  const chinh = c.chinh.map((k) => chuoi(r[k])).filter(Boolean).join(' · ');
  const tien = c.tien && typeof r[c.tien.khoa] === 'number' ? dinhDang(Math.abs(r[c.tien.khoa] as number), c.tien.don_vi) : null;
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 border-b border-border/60 py-1.5 last:border-0">
      {ngay && <span className="text-muted-foreground">{ngay}</span>}
      <span className="min-w-0 flex-1 text-foreground">{chinh || '—'}</span>
      {tien && <span className="font-medium tabular-nums text-foreground">{tien}</span>}
    </li>
  );
}

export function NutBangChung({ bangChung }: { bangChung: BangChung[] }) {
  const { t } = useTranslation();
  const [mo, setMo] = useState(false);
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [banGhi, setBanGhi] = useState<{ loai: LoaiBangChung; ds: BanGhi[] }[] | null>(null);

  const tong = bangChung.reduce((s, b) => s + b.so_ban_ghi, 0);

  const tai = async () => {
    if (banGhi || dang) return;
    setDang(true);
    setLoi(null);
    try {
      const ds = await Promise.all(bangChung.map(async (b) => {
        const kq = await goiTroLy('bang_chung', { loai: b.loai, id: b.id });
        return { loai: b.loai, ds: (Array.isArray(kq.ban_ghi) ? kq.ban_ghi : []) as BanGhi[] };
      }));
      setBanGhi(ds);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : t('man.troLy.bangChung.loi'));
    } finally {
      setDang(false);
    }
  };

  return (
    <Popover
      open={mo}
      onOpenChange={(v) => {
        setMo(v);
        if (v) void tai();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <FileSearch size={12} aria-hidden /> {t('man.troLy.bangChung.nut', { so: new Intl.NumberFormat('vi-VN').format(tong) })}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-80 w-[min(92vw,26rem)] overflow-y-auto rounded-2xl p-3 text-left text-xs">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {t('man.troLy.bangChung.tieuDe')}
        </p>
        {dang && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 size={13} className="animate-spin" /> {t('man.troLy.bangChung.dangTai')}</p>}
        {loi && <p className="text-destructive">{loi}</p>}
        {banGhi?.map((nhom, i) => (
          <div key={i} className={i > 0 ? 'mt-3' : ''}>
            <ul>
              {nhom.ds.map((r, j) => <DongBanGhi key={j} loai={nhom.loai} r={r} />)}
            </ul>
            {!nhom.ds.length && <p className="text-muted-foreground">{t('man.troLy.bangChung.khongThay')}</p>}
          </div>
        ))}
        {bangChung.some((b) => b.so_ban_ghi > b.id.length) && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t('man.troLy.bangChung.catNgan', { hien: bangChung.reduce((s, b) => s + b.id.length, 0), tong })}
          </p>
        )}
        {bangChung.some((b) => b.ma_bam) && (
          <p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">
            {t('man.troLy.bangChung.maBam')} {bangChung.find((b) => b.ma_bam)?.ma_bam?.slice(0, 16)}…
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
