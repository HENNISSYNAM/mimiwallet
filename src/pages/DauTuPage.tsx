import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { useAuthStore } from '@/store/useAuthStore';
import { tinhDanhMuc, type KhoanNam } from '@/lib/danhMucDauTu';
import { BoiCanhThiTruong, type BoiCanhUI } from '@/components/web3/BoiCanhThiTruong';
import { BieuDoNen, type ChuoiGiaUI, type Khung } from '@/components/web3/BieuDoNen';

/**
 * Danh mục tài sản số, và bối cảnh của đúng những gì đang nắm giữ.
 *
 * VÌ SAO LÀ DANH MỤC TỰ KHAI CHỨ KHÔNG PHẢI MỘT BẢNG GIÁ. Mục điều hướng gọi
 * đây là "Danh mục đầu tư", nên nó phải là danh mục thật. Một bảng giá đội tên
 * danh mục là đúng loại nhãn nói dối đã gỡ bốn lần trong tuần này — nút Đồng bộ
 * trên dòng không có sao kê, "chưa đồng bộ lần nào" trên dòng không đồng bộ
 * được, ô giả lập lỗi ở nơi không giả lập được, và trang Cài đặt hiện hồ sơ của
 * một công ty không có thật.
 *
 * KHÔNG NỐI TÀI KHOẢN SÀN. Người dùng tự khai đang giữ gì. Nối tài khoản đòi
 * khoá API, và một khoá chỉ-đọc bị rò vẫn lộ toàn bộ lịch sử giao dịch của
 * khách. Tự khai thì MIMI không giữ chìa khoá nào, và không có đường nào để đặt
 * lệnh kể cả khi bị chiếm quyền.
 *
 * BỐI CẢNH LỌC THEO TÀI SẢN ĐANG GIỮ. Đó là điểm khác biệt so với một trang
 * tin: không phải "thị trường hôm nay thế nào" mà "những gì bạn đang giữ đang
 * chịu tác động gì".
 */

interface Dong {
  id: string;
  ma: string;
  so_luong: number;
  gia_von_usd: number | null;
}

interface PhanHoiThiTruong {
  boiCanh: BoiCanhUI;
  gia: Array<{ ma: string; gia: number | null; ghiChu: string }>;
  chuoi: ChuoiGiaUI[];
  suCo: Array<{ nguon: string; loi: string }>;
  luc: string;
}

export default function DauTuPage() {
  const { t, i18n } = useTranslation();
  const { session } = useAuthStore();
  const [dong, setDong] = useState<Dong[]>([]);
  const [thiTruong, setThiTruong] = useState<PhanHoiThiTruong | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [dangDoc, setDangDoc] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [ma, setMa] = useState('');
  const [soLuong, setSoLuong] = useState('');
  const [giaVon, setGiaVon] = useState('');
  const [dangThem, setDangThem] = useState(false);
  // Khung thời gian của biểu đồ. Đổi khung là gọi lại máy chủ — nến 1 giờ và
  // nến 1 ngày là hai chuỗi khác nhau, không cắt được từ nhau ở máy khách.
  const [khung, setKhung] = useState<Khung>('1d');

  const so = useCallback(
    (n: number, le = 2) =>
      n.toLocaleString(i18n.language === 'en' ? 'en-US' : 'vi-VN', { maximumFractionDigits: le }),
    [i18n.language],
  );

  const taiDanhMuc = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setDangTai(false); return; }

    // Công ty cũ nhất, giống `resolveCompany` phía máy chủ. Chọn khác dòng máy
    // chủ chọn thì người dùng thêm vào một danh mục rồi không thấy nó đâu.
    const { data: cty } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!cty) { setDangTai(false); return; }
    setCompanyId(cty.id);

    const { data, error } = await supabase
      .from('danh_muc_dau_tu')
      .select('id, ma, so_luong, gia_von_usd')
      .eq('company_id', cty.id)
      .order('created_at', { ascending: true });
    if (error) toast.error(error.message);
    setDong((data as Dong[] | null) ?? []);
    setDangTai(false);
  }, []);

  useEffect(() => { void taiDanhMuc(); }, [taiDanhMuc]);

  /**
   * Đọc thị trường cho đúng những mã đang giữ.
   *
   * Danh mục rỗng thì vẫn gọi, không truyền `ma` — máy chủ dùng bộ mặc định,
   * nên màn hình có bối cảnh để xem trước khi khai gì. Một trang trống hoàn
   * toàn thì không cho người mới biết thứ này làm được gì.
   */
  const docThiTruong = useCallback(async () => {
    if (!session?.access_token) return;
    setDangDoc(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/thi-truong-so`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ khung, ...(dong.length ? { ma: dong.map((d) => d.ma) } : {}) }),
      });
      const kq = await res.json();
      if (!res.ok || kq?.error) throw new Error(kq?.error ?? `Lỗi ${res.status}`);
      setThiTruong(kq as PhanHoiThiTruong);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không đọc được dữ liệu thị trường');
    } finally {
      setDangDoc(false);
    }
  }, [session, dong, khung]);

  useEffect(() => { if (!dangTai) void docThiTruong(); }, [dangTai, dong.length, khung]); // eslint-disable-line react-hooks/exhaustive-deps

  const themDong = useCallback(async () => {
    if (!companyId) return;
    const maSach = ma.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const sl = Number(soLuong.replace(/,/g, '.'));
    if (!/^[A-Z0-9]{2,15}$/.test(maSach)) { toast.error(t('dauTu.loiMa')); return; }
    if (!Number.isFinite(sl) || sl <= 0) { toast.error(t('dauTu.loiSoLuong')); return; }

    // Giá vốn để trống là hợp lệ — khi đó không tính lãi lỗ, và màn hình nói ra.
    const gv = giaVon.trim() ? Number(giaVon.replace(/,/g, '.')) : null;
    if (gv !== null && (!Number.isFinite(gv) || gv <= 0)) { toast.error(t('dauTu.loiGiaVon')); return; }

    setDangThem(true);
    const { error } = await supabase
      .from('danh_muc_dau_tu')
      .upsert(
        { company_id: companyId, ma: maSach, so_luong: sl, gia_von_usd: gv, updated_at: new Date().toISOString() },
        { onConflict: 'company_id,ma' },
      );
    setDangThem(false);
    if (error) { toast.error(error.message); return; }
    setMa(''); setSoLuong(''); setGiaVon('');
    await taiDanhMuc();
  }, [companyId, ma, soLuong, giaVon, taiDanhMuc, t]);

  const xoaDong = useCallback(async (id: string) => {
    const { error } = await supabase.from('danh_muc_dau_tu').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    await taiDanhMuc();
  }, [taiDanhMuc]);

  const giaTheoMa = useMemo(() => {
    const m: Record<string, number | null> = {};
    for (const g of thiTruong?.gia ?? []) m[g.ma] = g.gia;
    return m;
  }, [thiTruong]);

  const tinh = useMemo(
    () => tinhDanhMuc(dong.map((d): KhoanNam => ({ ma: d.ma, soLuong: Number(d.so_luong), giaVonUsd: d.gia_von_usd === null ? null : Number(d.gia_von_usd) })), giaTheoMa),
    [dong, giaTheoMa],
  );

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-display font-extrabold tracking-tight text-foreground">
            {t('dauTu.tieuDe')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('dauTu.phuDe')}</p>
        </div>
        <button
          onClick={() => void docThiTruong()}
          disabled={dangDoc}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {dangDoc ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {t('web3.lamMoi')}
        </button>
      </div>

      {/* ── Tổng danh mục ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
        <p className="text-xs text-muted-foreground">{t('dauTu.tongGiaTri')}</p>
        <p className="mt-1 font-mono text-3xl font-bold text-foreground">
          {so(tinh.tongGiaTri)} <span className="text-lg text-muted-foreground">USD</span>
        </p>

        {tinh.tongLaiLo !== null ? (
          <p className={`mt-1 text-sm font-medium ${tinh.tongLaiLo >= 0 ? 'text-mimi-green' : 'text-destructive'}`}>
            {tinh.tongLaiLo >= 0 ? '+' : '−'}{so(Math.abs(tinh.tongLaiLo))} USD
            {tinh.tongLaiLoPhanTram !== null && ` (${so(Math.abs(tinh.tongLaiLoPhanTram))}%)`}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">{t('dauTu.chuaTinhDuocLaiLo')}</p>
        )}

        {/* Tổng thiếu mà không nói là thiếu thì tệ hơn không có tổng. */}
        {(tinh.soDongThieuGia > 0 || tinh.soDongThieuGiaVon > 0) && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-500">
            {tinh.soDongThieuGia > 0 && t('dauTu.thieuGia', { so: tinh.soDongThieuGia })}
            {tinh.soDongThieuGia > 0 && tinh.soDongThieuGiaVon > 0 && ' · '}
            {tinh.soDongThieuGiaVon > 0 && t('dauTu.thieuGiaVon', { so: tinh.soDongThieuGiaVon })}
          </p>
        )}
      </div>

      {/* ── Các khoản nắm giữ ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
        <p className="text-sm font-semibold text-foreground">{t('dauTu.cacKhoan')}</p>

        {dangTai ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" /> {t('web3.dangTai')}
          </p>
        ) : tinh.khoan.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t('dauTu.chuaCoKhoan')}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">{t('dauTu.ma')}</th>
                  <th className="pb-2 text-right font-medium">{t('dauTu.soLuong')}</th>
                  <th className="pb-2 text-right font-medium">{t('dauTu.gia')}</th>
                  <th className="pb-2 text-right font-medium">{t('dauTu.giaTri')}</th>
                  <th className="pb-2 text-right font-medium">{t('dauTu.laiLo')}</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {tinh.khoan.map((k) => (
                  <tr key={k.ma} className="border-b border-border/20 last:border-0">
                    <td className="py-2.5 font-mono font-medium text-foreground">{k.ma}</td>
                    <td className="py-2.5 text-right font-mono">{so(k.soLuong, 8)}</td>
                    <td className="py-2.5 text-right font-mono">
                      {k.giaUsd === null ? <span className="text-muted-foreground">—</span> : so(k.giaUsd)}
                    </td>
                    <td className="py-2.5 text-right font-mono">
                      {k.giaTri === null ? <span className="text-muted-foreground">—</span> : so(k.giaTri)}
                    </td>
                    <td className={`py-2.5 text-right font-mono ${k.laiLo === null ? '' : k.laiLo >= 0 ? 'text-mimi-green' : 'text-destructive'}`}>
                      {k.laiLo === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        `${k.laiLo >= 0 ? '+' : '−'}${so(Math.abs(k.laiLo))}`
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => void xoaDong(dong.find((d) => d.ma === k.ma)!.id)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={t('dauTu.xoa')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Thêm khoản ──────────────────────────────────────────────────── */}
        <div className="mt-4 grid gap-2 border-t border-border/40 pt-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            value={ma}
            onChange={(e) => setMa(e.target.value)}
            placeholder={t('dauTu.phMa')}
            className="rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm uppercase"
          />
          <input
            inputMode="decimal"
            value={soLuong}
            onChange={(e) => setSoLuong(e.target.value)}
            placeholder={t('dauTu.phSoLuong')}
            className="rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm"
          />
          <input
            inputMode="decimal"
            value={giaVon}
            onChange={(e) => setGiaVon(e.target.value)}
            placeholder={t('dauTu.phGiaVon')}
            className="rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm"
          />
          <button
            onClick={() => void themDong()}
            disabled={dangThem || !ma.trim() || !soLuong.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {dangThem ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {t('dauTu.them')}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t('dauTu.ghiChuGiaVon')}</p>
      </div>

      {/* ── Biểu đồ ───────────────────────────────────────────────────────── */}
      {thiTruong?.chuoi?.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {thiTruong.chuoi.map((c) => (
            <BieuDoNen key={c.ma} chuoi={c} khung={khung} onDoiKhung={setKhung} />
          ))}
        </div>
      ) : null}

      {/* ── Bối cảnh ──────────────────────────────────────────────────────── */}
      {thiTruong && <BoiCanhThiTruong boiCanh={thiTruong.boiCanh} suCo={thiTruong.suCo} />}
    </div>
  );
}
