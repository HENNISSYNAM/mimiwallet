import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { nguoiDungHienTai } from '@/lib/nguoiDung';
import { idCongTyDangDung } from '@/lib/congTyDangDung';
import { toast } from 'sonner';
import { MST_HOP_LE, chuanHoaMst } from '@/lib/maSoThue';
import { goiToKhai, type CongTyTheoMst } from '@/lib/goiToKhai';
import { LoiTaiLai } from '@/components/chung/LoiTaiLai';

/**
 * Thông tin doanh nghiệp thật, và sửa được.
 *
 * VÌ SAO VIẾT LẠI. Tới 08/09/2026 mục này đọc `companyProfile` từ
 * `src/lib/mockData.ts` — tức mọi người dùng đều thấy **"Công ty TNHH Đức Phát
 * Foods", mã số thuế 0312345678, ngành F&B, TP. Hồ Chí Minh**, bất kể họ đã
 * khai gì lúc đăng ký. Bốn dòng dữ liệu bịa, trình bày như hồ sơ của chính họ,
 * trong màn hình mang tên "Thông tin doanh nghiệp".
 *
 * Nó còn chỉ để đọc, nên không có đường sửa.
 *
 * CHUYỆN ĐÓ CHẶN MỘT TÍNH NĂNG THẬT. `gdt-sync` từ chối khi công ty chưa có mã
 * số thuế, và câu chỉ dẫn của máy chủ là *"Vào Cài đặt và điền mã số thuế"* —
 * trỏ tới đúng màn hình này, nơi hiện mã số thuế của một công ty không có thật
 * và không có ô nào để nhập. Người dùng làm theo hướng dẫn thì đi vào ngõ cụt.
 *
 * Trước đó mã số thuế chỉ nhập được ở luồng đăng ký và thẻ chào mừng — cả hai
 * đều chạy đúng một lần, và bỏ qua là mất luôn.
 *
 * CHỌN CÔNG TY CŨ NHẤT, giống `resolveCompany` phía máy chủ. Một người có thể
 * sở hữu nhiều dòng `companies` (trigger tạo một dòng cho mỗi lần đăng ký), và
 * nếu màn hình này sửa dòng khác với dòng edge function đọc thì người dùng điền
 * mã số thuế xong vẫn bị báo là chưa có.
 *
 * LƯU MÃ XONG LÀ TRA (24/09/2026). Máy chủ tra mã với dữ liệu Tổng cục Thuế rồi ghi
 * tên đăng ký, địa chỉ, cơ quan thuế, hộ hay doanh nghiệp — và điền tỉnh nếu còn
 * trống. Mọi màn hình sau đó thôi hỏi những điều này. Tra hỏng thì mã vẫn lưu, chỉ
 * là chưa có dòng "theo đăng ký thuế".
 */

interface NganhVsic { ma: string; ten: string }

/** Như `doc_nganh` của `to-khai` trả về (`_shared/luat/ho-so-nghia-vu.ts`). */
interface NganhHoSo {
  nganh: NganhVsic[];
  nganh_chinh: string | null;
  nhom_nganh: string[];
  loai_nguoi_nop: string | null;
  goi_y: { ma: string; nhom: string | null; ten_nhom: string | null; vi_sao: string; da_co: boolean } | null;
}

/**
 * Ngành nghề theo mã VSIC cấp 4 (12/10/2026): nhiều ngành, một ngành chính, chép mã + tên từ giấy đăng ký.
 * MIMI không giữ danh mục VSIC nên không tự điền tên. Hộ kinh doanh nhận GỢI Ý nhóm hoạt động (dùng cho tỷ lệ
 * thuế) từ ngành chính — chỉ ghi vào hồ sơ khi người dùng bấm xác nhận. Lưu qua `to-khai` (quyền sửa hồ sơ thuế).
 */
export function NganhNghe() {
  const { t } = useTranslation();
  const [du, setDu] = useState<NganhHoSo | null>(null);
  const [ds, setDs] = useState<NganhVsic[]>([]);
  const [chinh, setChinh] = useState<string | null>(null);
  const [ma, setMa] = useState('');
  const [ten, setTen] = useState('');
  const [dangLuu, setDangLuu] = useState(false);

  const nhan = useCallback((r: NganhHoSo) => { setDu(r); setDs(Array.isArray(r?.nganh) ? r.nganh : []); setChinh(r?.nganh_chinh ?? null); }, []);
  useEffect(() => {
    goiToKhai('doc_nganh').then((r) => nhan(r as NganhHoSo)).catch(() => setDu(null));
  }, [nhan]);

  const luu = async (than: Record<string, unknown>, cau: string) => {
    setDangLuu(true);
    try {
      nhan(await goiToKhai('luu_nganh', than) as NganhHoSo);
      toast.success(cau);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('ui2.dn.chuaLuuNganh'));
    } finally {
      setDangLuu(false);
    }
  };

  const them = () => {
    const m = ma.trim();
    if (!/^\d{4}$/.test(m)) { toast.error(t('ui2.dn.maNganh4So')); return; }
    if (ten.trim().length < 2) { toast.error(t('ui2.dn.ghiTenNganh')); return; }
    if (ds.some((n) => n.ma === m)) { toast.error(t('ui2.dn.maNganhDaCo', { ma: m })); return; }
    setDs([...ds, { ma: m, ten: ten.trim() }]);
    if (!chinh) setChinh(m);
    setMa(''); setTen('');
  };

  const doi = JSON.stringify(ds) !== JSON.stringify(du?.nganh ?? []) || chinh !== (du?.nganh_chinh ?? null);
  const g = du?.goi_y ?? null;

  return (
    <div className="border-t border-border/20 pt-4">
      <p className="mb-1.5 text-sm text-muted-foreground">{t('ui2.dn.nganhDangKy')}</p>
      {ds.length === 0 && <p className="text-sm text-muted-foreground/60">{t('ui2.dn.chuaKhaiNganh')}</p>}
      <ul className="space-y-1">
        {ds.map((n) => (
          <li key={n.ma} className="flex items-center gap-2 text-sm">
            <label className="flex min-w-0 flex-1 items-center gap-2">
              <input type="radio" name="nganh-chinh" checked={chinh === n.ma} onChange={() => setChinh(n.ma)} aria-label={t('ui2.dn.nganhChinhAria', { ma: n.ma })} />
              <span className="font-mono">{n.ma}</span> <span className="truncate">{n.ten}</span>
              {chinh === n.ma && <span className="text-xs text-primary">({t('ui2.dn.nganhChinh')})</span>}
            </label>
            <button type="button" onClick={() => { const con = ds.filter((x) => x.ma !== n.ma); setDs(con); if (chinh === n.ma) setChinh(con[0]?.ma ?? null); }} className="text-xs text-muted-foreground hover:underline">{t('ui2.dn.bo')}</button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input inputMode="numeric" value={ma} onChange={(e) => setMa(e.target.value)} placeholder={t('ui2.dn.maPh')} aria-label={t('ui2.dn.maNganh')} className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm sm:w-32" />
        <input value={ten} onChange={(e) => setTen(e.target.value)} placeholder={t('ui2.dn.tenPh')} aria-label={t('ui2.dn.tenNganh')} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" />
        <button type="button" onClick={them} className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-accent">{t('ui2.dn.them')}</button>
      </div>
      <button
        type="button"
        onClick={() => void luu({ nganh: ds, nganh_chinh: chinh }, t('ui2.dn.daLuuNganh'))}
        disabled={dangLuu || !doi}
        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
      >
        {dangLuu && <Loader2 size={14} className="animate-spin" />}
        {doi ? t('ui2.dn.luuNganh') : t('ui2.dn.daLuu')}
      </button>
      {g && g.nhom && !g.da_co && !doi && (
        <div className="mt-3 rounded-xl bg-muted/40 p-3 text-sm">
          <p className="font-medium text-foreground">{t('ui2.dn.goiYNhom')} {g.ten_nhom}</p>
          <p className="mt-1 text-xs text-muted-foreground">{g.vi_sao}</p>
          <button type="button" disabled={dangLuu} onClick={() => void luu({ xac_nhan_nhom: g.nhom }, t('ui2.dn.daThemNhom'))} className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">
            {t('ui2.dn.dungNhom')}
          </button>
        </div>
      )}
      {g && !g.nhom && !doi && <p className="mt-2 text-xs text-muted-foreground">{t('ui2.dn.chuaGoiY', { ma: g.ma })} {g.vi_sao}</p>}
      <p className="mt-2 text-xs text-muted-foreground">{t('ui2.dn.khongTuLap')}</p>
    </div>
  );
}

interface DoanhNghiep {
  id: string;
  name: string | null;
  tax_id: string | null;
  industry: string | null;
  province: string | null;
}

function Dong({ nhan, giaTri }: { nhan: string; giaTri: string | null }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between border-b border-border/20 py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{nhan}</span>
      <span className={giaTri ? 'text-sm font-medium text-foreground' : 'text-sm text-muted-foreground/60'}>
        {giaTri || t('ui2.dn.chuaCo')}
      </span>
    </div>
  );
}

export function ThongTinDoanhNghiep() {
  const { t } = useTranslation();
  const [dn, setDn] = useState<DoanhNghiep | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [loiTai, setLoiTai] = useState(false);
  const [mst, setMst] = useState('');
  const [dangLuu, setDangLuu] = useState(false);
  const [theoMst, setTheoMst] = useState<CongTyTheoMst | null>(null);

  /** Hỏi máy chủ điều đăng ký thuế nói về mã này (máy chủ tra nếu chưa tra). */
  const docTheoMst = useCallback(async () => {
    try {
      const r = await goiToKhai('ho_so');
      setTheoMst((r.cong_ty ?? null) as CongTyTheoMst | null);
      return r.cong_ty as CongTyTheoMst | null;
    } catch {
      return null; // Không tra được thì thôi — mã vẫn đã lưu.
    }
  }, []);

  const tai = useCallback(async () => {
    const user = await nguoiDungHienTai();
    if (!user) { setDangTai(false); return; }
    const id = await idCongTyDangDung();
    if (!id) { setDangTai(false); return; }
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, tax_id, industry, province')
      .eq('id', id)
      .maybeSingle();
    // Lỗi đọc KHÁC "chưa có hồ sơ": câu kia khuyên đăng xuất để tạo hồ sơ mới — sai khi hồ sơ vẫn còn.
    setLoiTai(!!error);
    if (error) { setDangTai(false); return; }
    setDn((data as DoanhNghiep | null) ?? null);
    setMst(data?.tax_id ?? '');
    setDangTai(false);
    if (data?.tax_id) void docTheoMst();
  }, [docTheoMst]);

  useEffect(() => { void tai(); }, [tai]);

  const luuMst = useCallback(async () => {
    if (!dn) return;
    const sach = chuanHoaMst(mst);
    if (!MST_HOP_LE(sach)) {
      toast.error(t('ui2.dn.mstSai'));
      return;
    }
    setDangLuu(true);
    const { error } = await supabase.from('companies').update({ tax_id: sach }).eq('id', dn.id);
    setDangLuu(false);
    if (error) { toast.error(error.message); return; }
    setDn({ ...dn, tax_id: sach });
    setTheoMst(null);
    const ct = await docTheoMst();
    // Máy chủ có thể vừa điền tỉnh từ địa chỉ đăng ký: đọc lại để thấy ngay.
    void tai();
    toast.success(ct?.theo_mst?.ten
      ? t('ui2.dn.daLuuMstCua', { ten: ct.theo_mst.ten })
      : t('ui2.dn.daLuuMstKhongThay'));
  }, [dn, mst, docTheoMst, tai]);

  if (dangTai) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <Loader2 size={14} className="animate-spin" /> {t('ui2.chung.dangTai')}
      </div>
    );
  }

  if (!dn && loiTai) {
    return <LoiTaiLai className="my-2" cau={t('ui2.dn.loiTai')} thuLai={() => { setDangTai(true); void tai(); }} />;
  }

  if (!dn) {
    return (
      <p className="py-3 text-sm text-muted-foreground">
        {t('ui2.dn.chuaCoHoSo')}
      </p>
    );
  }

  const daLuu = (dn.tax_id ?? '') === chuanHoaMst(mst);

  return (
    <div>
      <Dong nhan={t('ui2.dn.tenDn')} giaTri={dn.name} />
      <Dong nhan={t('ui2.dn.nganhNghe')} giaTri={dn.industry} />
      <Dong nhan={t('ui2.dn.tinh')} giaTri={dn.province} />

      {/* Điều Tổng cục Thuế ghi cho mã này — chỉ hiện, không sửa ở đây: đổi mã thì tra lại. */}
      {theoMst?.theo_mst && (
        <div className="mt-2 rounded-xl bg-muted/40 p-3">
          <p className="text-xs font-medium text-muted-foreground">{t('ui2.dn.theoDkThue')}</p>
          <Dong nhan={t('ui2.dn.tenDangKy')} giaTri={theoMst.theo_mst.ten} />
          <Dong nhan={t('ui2.dn.loaiHinh')} giaTri={theoMst.loai_theo_mst === 'doanh_nghiep' ? t('ui2.dn.doanhNghiep') : theoMst.loai_theo_mst === 'ho_kinh_doanh' ? t('ui2.dn.hoKinhDoanh') : null} />
          <Dong nhan={t('ui2.dn.diaChi')} giaTri={theoMst.theo_mst.dia_chi} />
          <Dong nhan={t('ui2.dn.coQuanThue')} giaTri={theoMst.theo_mst.co_quan_thue} />
          <Dong nhan={t('ui2.dn.trangThai')} giaTri={theoMst.theo_mst.trang_thai} />
          {!theoMst.theo_mst.con_hoat_dong && (
            <p className="mt-2 text-xs text-destructive">{t('ui2.dn.mstNgung')}</p>
          )}
        </div>
      )}

      <NganhNghe />

      <div className="border-t border-border/20 pt-4">
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted-foreground">{t('ui2.dn.mst')}</span>
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              value={mst}
              onChange={(e) => setMst(e.target.value)}
              placeholder={t('ui2.dn.mstPh')}
              className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm"
            />
            <button
              onClick={() => void luuMst()}
              disabled={dangLuu || daLuu || !mst.trim()}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {dangLuu && <Loader2 size={14} className="animate-spin" />}
              {daLuu ? t('ui2.dn.daLuu') : t('ui2.chung.luu')}
            </button>
          </div>
        </label>
        <p className="mt-2 text-xs text-muted-foreground">
          {t('ui2.dn.canMst')}
        </p>
      </div>
    </div>
  );
}
