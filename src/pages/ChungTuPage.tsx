import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, FileWarning, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import i18n from 'i18next';
import { Trans, useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { nguoiDungHienTai } from '@/lib/nguoiDung';
import { congTyDangDung } from '@/lib/congTyDangDung';
import {
  ghepChungTu, locKhoanCanChungTu, LY_DO_KHONG_CHUNG_TU, type HoaDonVao, type KhoanChi, type LyDoKhongChungTu, type QuyetDinhChungTu,
} from '@/lib/khopChungTu';
import { goiTroLy } from '@/lib/goiTroLy';
import { NutQuetChungTu } from '@/components/chung-tu/NutQuetChungTu';
import { CauHoiNhanh } from '@/components/phan-hoi/CauHoiNhanh';
import { ChonCachTinhThue } from '@/components/fintech/ChonCachTinhThue';
import { kyKeKhaiKeTiep } from '@/lib/hanKeKhai';
import { ngayMoc, useLichThue } from '@/lib/lichThue';
import { chieuTien } from '@/lib/chieuTien';
import { docHet } from '../../supabase/functions/_shared/doc-het';
import { dinhDangTien } from '@/lib/tien';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { useCoMoHinh } from '@/hooks/useTrangThaiTroLy';

/**
 * Chứng từ chi phí: khoản nào đã có giấy tờ, khoản nào chưa.
 *
 * ĐÂY LÀ MÀN HÌNH TRẢ LỜI NỖI ĐAU SỐ MỘT. Từ 2026 hộ kinh doanh được chọn tính
 * thuế theo lợi nhuận, nhưng chỉ khi chứng minh được chi phí. Màn hình này chỉ
 * ra chính xác còn thiếu bao nhiêu, và thiếu ở khoản nào.
 *
 * TRỐNG THÌ PHẢI NÓI VÌ SAO TRỐNG. Trang này đọc hai nguồn, và mỗi nguồn có thể
 * chưa có dữ liệu vì một lý do khác nhau. Một bảng trống không lời giải thích
 * là đúng loại lỗi đã gỡ nhiều lần tuần này — màn hình mô tả một trạng thái mà
 * người đọc không biết phải làm gì với nó. Nên mỗi trạng thái trống ở đây đều
 * kèm việc cần bấm và đường dẫn tới đó.
 */

const dong = dinhDangTien;
const ngayVN = (s: string) => {
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * Doanh thu năm theo đúng một định nghĩa với Đồng hồ ngưỡng và tờ khai nháp (`tax-summary` →
 * `_shared/doanh-thu/so-lieu.ts`): trừ tiền chuyển giữa tài khoản của mình và khoản người dùng đã xác nhận
 * không phải doanh thu (vay, vốn góp…); khoản chưa rõ vẫn tính là doanh thu.
 */
async function docDoanhThuNam(nam: number, congTy: string): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error(i18n.t('app.chungTu.loi.hetPhien'));
  const res = await fetch(`${SUPABASE_URL}/functions/v1/tax-summary?year=${nam}&company_id=${encodeURIComponent(congTy)}`, {
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_PUBLISHABLE_KEY },
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string; revenue?: unknown };
  if (!res.ok || body.error) throw new Error(body.error ?? i18n.t('app.chungTu.loi.maLoi', { ma: res.status }));
  if (typeof body.revenue !== 'number' || !Number.isFinite(body.revenue)) throw new Error(i18n.t('app.chungTu.loi.khongDt'));
  return body.revenue;
}

/** Nhãn lý do "không có chứng từ" theo ngôn ngữ đang chọn; mã lạ rơi về nhãn tiếng Việt của thư viện, rồi về mã. */
const nhanLyDo = (k: string) =>
  i18n.t(`app.chungTu.lyDo.${k}`, { defaultValue: (LY_DO_KHONG_CHUNG_TU as Record<string, string>)[k] ?? k });

export default function ChungTuPage() {
  const { t } = useTranslation();
  const [chi, setChi] = useState<KhoanChi[]>([]);
  /**
   * NGOẠI LỆ ĐÃ CÓ NGƯỜI QUYẾT (29/09/2026) — quy trình sao kê → chứng từ → ngoại lệ → người duyệt. Chi cá
   * nhân (nhãn người chọn) và "không có chứng từ" kèm lý do rời danh sách cần đòi hoá đơn; cùng bộ lọc với
   * trợ lý (`locKhoanCanChungTu`), nên hai nơi ra cùng con số. Mỗi quyết định hoàn tác được.
   */
  const [caNhan, setCaNhan] = useState<Set<string>>(new Set());
  const [quyetDinh, setQuyetDinh] = useState<QuyetDinhChungTu[]>([]);
  const [dangXuLy, setDangXuLy] = useState<string | null>(null);
  const [moLyDo, setMoLyDo] = useState<string | null>(null);
  const [lyDo, setLyDo] = useState<LyDoKhongChungTu>('nguoi_ban_khong_xuat');
  const [ghiChu, setGhiChu] = useState('');
  const [hoaDon, setHoaDon] = useState<HoaDonVao[]>([]);
  /*
   * DOANH THU NĂM, KHÔNG PHẢI QUÝ. Bảng chứng từ bên dưới đọc theo quý, nhưng
   * khối "chọn cách tính thuế" so với ngưỡng NĂM (01 tỷ, 3 tỷ). Bản trước đưa
   * doanh thu một quý vào đó — hộ bán 2 tỷ một năm, 500 triệu một quý, bị báo
   * "chưa phải nộp". Hai kỳ, hai bộ số, không trộn.
   *
   * KHÔNG CỘNG MỌI TIỀN VÀO (29/09/2026). Bản trước cộng mọi khoản tiền vào từ đầu năm và gọi là doanh thu —
   * một khoản giải ngân vay 100 tỷ biến thành 100 tỷ doanh thu, và lời khuyên cách tính thuế đổi theo.
   * `null` = chưa tính được (đọc lỗi): khi đó KHÔNG đưa lời khuyên, thay vì khuyên trên số 0.
   */
  const [doanhThuNam, setDoanhThuNam] = useState<number | null>(null);
  const [chiPhiCoChungTuNam, setChiPhiCoChungTuNam] = useState<number | null>(null);
  const [loiNam, setLoiNam] = useState<string | null>(null);
  /** Đọc giao dịch/hoá đơn của quý hỏng → không hiện "chi phí chưa có giấy tờ" (số đó sẽ sai). */
  const [loiKy, setLoiKy] = useState<string | null>(null);
  const [soDongThu, setSoDongThu] = useState(0);
  const [dangTai, setDangTai] = useState(true);

  const ky = useMemo(() => kyKeKhaiKeTiep(), []);
  // Hạn nộp lấy từ lịch thuế CỦA CÔNG TY (06/10/2026), như Nhắc thuế — trước đây trang này luôn in "hạn 31/10" từ lịch
  // chung, kể cả khi Nhắc thuế nói chưa biết hộ này có phải khai quý không. `ky` chỉ còn dùng để chọn khoảng ngày.
  const { du: lichThue } = useLichThue();
  const moc = lichThue?.mocKeTiep ?? null;
  const hanChac = !!moc?.han && moc.con_lai !== null && moc.trang_thai !== 'can_xac_minh' && moc.trang_thai !== 'khong_ap_dung';
  /** Máy chủ đã bật đọc ảnh chứng từ chưa. Chưa bật thì nút chụp bị khoá — không được hứa "MIMI đọc". */
  const coMoHinh = useCoMoHinh();

  /**
   * Đọc dữ liệu của **kỳ đang tới hạn**, không phải toàn bộ lịch sử.
   *
   * Chi phí chỉ được trừ trong đúng kỳ phát sinh. Gộp cả năm vào một bảng sẽ ra
   * một con số to hơn và vô dụng — người dùng không mang nó đi khai được.
   */
  const tai = useCallback(async () => {
    setDangTai(true);
    try {
      const user = await nguoiDungHienTai();
      if (!user) return;

      const dang = await congTyDangDung();
      const id = dang?.id ?? null;
      // Công ty minh hoạ: cả sổ là dữ liệu mẫu, hiện hết (xem `_shared/minh-hoa.ts`).
      const laDemo = dang?.la_demo === true;
      if (!id) return;
      const cty = { id };

      // Quý đang tới hạn: ba tháng kết thúc trước ngày hạn.
      const cuoiKy = new Date(ky.han.getFullYear(), ky.han.getMonth(), 0);
      const dauKy = new Date(cuoiKy.getFullYear(), cuoiKy.getMonth() - 2, 1);
      const iso = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      // Từ đầu năm của quý đang tới hạn tới cuối quý đó.
      const dauNam = `${cuoiKy.getFullYear()}-01-01`;

      // Đọc HẾT theo trang (PostgREST cắt ở 1000 dòng): doanh thu năm ở đây được so với ngưỡng thuế,
      // cộng thiếu là con số sai mà trông như đủ. Giữ dạng { data, error } để phần báo lỗi bên dưới như cũ.
      const het = <T,>(tao: (a: number, b: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>, ten: string) =>
        docHet(tao, ten).then(
          (data) => ({ data: data as T[], error: null as { message: string } | null }),
          (e: unknown) => ({ data: null as T[] | null, error: { message: e instanceof Error ? e.message : String(e) } }),
        );
      type GdKy = { id: string; amount: number; type: string; transaction_date: string; merchant_name: string | null; payment_reference: string | null; counter_account_name: string | null; is_synthetic: boolean };
      /*
       * NGUỒN GIẤY TỜ: chứng từ người dùng tự chụp (`chung_tu_quet`, Thư viện chứng từ).
       * 29/09/2026: gỡ hoá đơn điện tử (GDT) — Casso chưa bật sản phẩm đó cho app production nên MIMI không đọc được hoá đơn nào từ cơ quan thuế; trước đó trang còn đọc bảng `gdt_invoices`, luôn trống.
       */
      type ChungTuKy = { id: string; tong_tien: number; ngay: string | null; so_hoa_don: string | null; ben_ban: string | null; ma_so_thue_ben_ban: string | null; giao_dich_id?: string | null };
      const [gd, thuNam, quetKy, quetNam, nhanCaNhan, qdChungTu] = await Promise.all([
        het<GdKy>((a, b) => supabase
          .from('transactions')
          .select(
            'id, amount, type, transaction_date, merchant_name, payment_reference, counter_account_name, is_synthetic',
          )
          .eq('company_id', cty.id)
          .gte('transaction_date', iso(dauKy))
          .lte('transaction_date', iso(cuoiKy))
          .order('id').range(a, b), 'giao dịch trong kỳ'),
        docDoanhThuNam(cuoiKy.getFullYear(), cty.id).then(
          (data) => ({ data, error: null as { message: string } | null }),
          (e: unknown) => ({ data: null as number | null, error: { message: e instanceof Error ? e.message : String(e) } }),
        ),
        het<ChungTuKy>((a, b) => supabase
          .from('chung_tu_quet')
          .select('id, tong_tien, ngay, so_hoa_don, ben_ban, ma_so_thue_ben_ban, giao_dich_id')
          .eq('company_id', cty.id)
          .gte('ngay', iso(dauKy))
          .lte('ngay', iso(cuoiKy))
          .order('id').range(a, b), 'chứng từ chụp trong kỳ'),
        het<ChungTuKy>((a, b) => supabase
          .from('chung_tu_quet')
          .select('id, tong_tien, ngay, so_hoa_don, ben_ban, ma_so_thue_ben_ban')
          .eq('company_id', cty.id)
          .gte('ngay', dauNam)
          .lte('ngay', iso(cuoiKy))
          .order('id').range(a, b), 'chứng từ chụp từ đầu năm'),
        het<{ transaction_id: string }>((a, b) => supabase
          .from('transaction_labels')
          .select('transaction_id')
          .eq('company_id', cty.id).eq('source', 'human').eq('is_personal', true)
          .order('transaction_id').range(a, b), 'nhãn chi cá nhân'),
        het<QuyetDinhChungTu>((a, b) => (supabase as unknown as { from: (b: string) => any }) // eslint-disable-line @typescript-eslint/no-explicit-any
          .from('quyet_dinh_chung_tu')
          .select('id, transaction_id, ly_do, ghi_chu, tao_luc')
          .eq('company_id', cty.id).is('huy_luc', null)
          .order('id').range(a, b), 'quyết định chứng từ'),
      ]);
      // Không đọc được quyết định thì KHÔNG coi như chưa có quyết định nào (sẽ đòi lại khoản đã xử lý):
      // báo lỗi quý, như khi không đọc được giao dịch.
      const loiQuyetDinh = nhanCaNhan.error ?? qdChungTu.error;
      setCaNhan(new Set((nhanCaNhan.data ?? []).map((r) => String(r.transaction_id))));
      setQuyetDinh(qdChungTu.data ?? []);

      // Không nuốt lỗi — bài học 08/09: truy vấn hỏng trông y hệt không có dữ liệu. Báo NGAY TRÊN khối
      // bị ảnh hưởng (không chỉ một thông báo thoáng qua), và không tính khối đó từ dữ liệu thiếu.
      const loiQuy = gd.error ?? quetKy.error ?? loiQuyetDinh;
      setLoiKy(loiQuy ? loiQuy.message : null);
      const loiCaNam = thuNam.error ?? quetNam.error;
      setLoiNam(loiCaNam ? loiCaNam.message : null);
      if (loiQuy) toast.error(i18n.t('app.chungTu.loi.docQuy', { loi: loiQuy.message }));

      setDoanhThuNam(thuNam.data);
      // Cùng định nghĩa với `tongCoGiay` của bảng quý: tổng mọi chứng từ đầu vào.
      setChiPhiCoChungTuNam(quetNam.error ? null :
        (quetNam.data ?? []).reduce((s, c) => s + (Number(c.tong_tien) || 0), 0));

      /*
       * BỎ DÒNG DỮ LIỆU THỬ.
       *
       * `is_synthetic` đánh dấu giao dịch do sandbox sinh ra — `open-banking`
       * và `ingest.ts` đều gắn cờ đó. `DashboardOverview` và `tax-summary` đã
       * lọc từ lâu; bản đầu của trang này thì không, nên nó hiện 5,8 tỷ chi phí
       * và những cái tên như "NCC Vật tư XYZ" như thể đó là tiền thật của khách.
       *
       * Đây đúng loại lỗi đã gỡ bốn lần tuần này — màn hình trình bày dữ liệu
       * bịa như dữ liệu của chính người dùng. Con số ở đây còn đi thẳng vào tờ
       * khai thuế, nên hậu quả nặng hơn hẳn.
       */
      const tatCa = gd.data ?? [];
      const rows = tatCa.filter((t) => laDemo || !t.is_synthetic);
      setSoDongThu(tatCa.length - rows.length);

      setChi(
        rows
          .filter((t) => chieuTien(t) === 'ra')
          .map((t) => ({
            id: t.id as string,
            soTien: Math.abs(Number(t.amount)),
            ngay: t.transaction_date as string,
            noiDung: [t.merchant_name, t.payment_reference].filter(Boolean).join(' ') || null,
            tenNguoiNhan: (t.counter_account_name as string) ?? null,
          })),
      );

      const tuChup = (quetKy.data ?? [])
        .map((c) => ({
          id: `quet:${c.id}`,
          soTien: Number(c.tong_tien),
          ngay: String(c.ngay).slice(0, 10),
          soHoaDon: c.so_hoa_don,
          tenBenBan: c.ben_ban,
          maSoThueBenBan: c.ma_so_thue_ben_ban,
          giaoDichId: c.giao_dich_id ?? null,
        }));
      setHoaDon(tuChup);
    } finally {
      setDangTai(false);
    }
  }, [ky.han]);

  useEffect(() => { void tai(); }, [tai]);

  const loc = useMemo(() => locKhoanCanChungTu(chi, { caNhan, quyetDinh }), [chi, caNhan, quyetDinh]);
  const kq = useMemo(() => ghepChungTu(loc.canChungTu, hoaDon), [loc, hoaDon]);

  /** Gọi một hành động của người duyệt, rồi đọc lại — con số trên trang luôn từ máy chủ, không tự trừ. */
  const lam = async (khoa: string, hanhDong: string, du: Record<string, unknown>, xong: string) => {
    setDangXuLy(khoa);
    try {
      await goiTroLy(hanhDong, du);
      toast.success(xong);
      setMoLyDo(null); setGhiChu('');
      await tai();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('app.chungTu.loi.chuaLuu'));
    } finally {
      setDangXuLy(null);
    }
  };

  const tenHoaDon = useMemo(() => {
    const m = new Map<string, HoaDonVao>();
    for (const h of hoaDon) m.set(h.id, h);
    return m;
  }, [hoaDon]);

  if (dangTai) {
    return (
      <p className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 size={15} className="animate-spin" /> {t('app.chungTu.dangDoc')}
      </p>
    );
  }

  if (loiKy) {
    return (
      <div className="max-w-3xl space-y-4">
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground">{t('app.chungTu.tieuDe')}</h2>
        <div role="alert" className="rounded-2xl border border-destructive/40 bg-card/50 p-5">
          <p className="text-sm font-semibold text-foreground">{t('app.chungTu.loiTieuDe')}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('app.chungTu.loiMo', { loi: loiKy })}
          </p>
          <button
            onClick={() => void tai()}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium"
          >
            <RefreshCw size={14} /> {t('app.chung.thuLai')}
          </button>
        </div>
      </div>
    );
  }

  const chuaNoiNganHang = chi.length === 0;
  const chuaCoHoaDon = hoaDon.length === 0;
  // Có dòng nhưng toàn dữ liệu thử là một trạng thái RIÊNG. Nói "chưa có giao
  // dịch nào" khi thật ra có 215 dòng sandbox cũng là một câu sai.
  const chiToanDuLieuThu = chi.length === 0 && soDongThu > 0;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            {t('app.chungTu.tieuDe')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {hanChac && moc
              ? (moc.con_lai! < 0
                ? t('app.chungTu.kyQuaHan', { quy: ky.quy, nam: ky.nam, ten: moc.ten, ngay: ngayMoc(moc.han), n: -moc.con_lai! })
                : t('app.chungTu.kyCoHan', { quy: ky.quy, nam: ky.nam, ten: moc.ten, ngay: ngayMoc(moc.han), n: moc.con_lai }))
              : t('app.chungTu.kyChuaRoHan', { quy: ky.quy, nam: ky.nam })}{' '}
            <Link to="/dashboard/nhac-thue" className="text-primary hover:underline">{t('app.chungTu.xemLichThue')}</Link>
          </p>
        </div>
        <button
          onClick={() => void tai()}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium"
        >
          <RefreshCw size={14} /> {t('app.chungTu.docLai')}
        </button>
      </div>

      {/* ── Con số duy nhất đáng nhớ ──────────────────────────────────── */}
      <div data-mimi="chung-tu.chua-co-giay" className="rounded-2xl border border-border/60 bg-card/50 p-5">
        <p className="text-xs text-muted-foreground">{t('app.chungTu.chuaCoGiay')}</p>
        <p className="mt-1 font-mono text-3xl font-bold text-foreground">
          {dong(kq.tongChuaCoGiay)}
        </p>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          {t('app.chungTu.daChi', { daChi: dong(kq.tongDaChi), coGiay: dong(kq.tongCoGiay) })}
        </p>
        {soDongThu > 0 && (
          // Nói ra chứ không lặng lẽ bỏ: người dùng thấy số nhỏ hơn họ tưởng
          // thì phải biết vì sao.
          <p className="mt-2 text-xs text-muted-foreground">
            {t('app.chungTu.boThu', { n: soDongThu })}
          </p>
        )}
      </div>

      {/* ── Trống thì nói vì sao trống ─────────────────────────────────── */}
      {(chuaNoiNganHang || chuaCoHoaDon || chiToanDuLieuThu) && (
        <div className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-500">
            <AlertTriangle size={15} /> {t('app.chungTu.thieuNguon')}
          </p>
          {chiToanDuLieuThu && (
            <p className="text-sm">
              <Trans i18nKey="app.chungTu.toanThu" values={{ n: soDongThu }} components={{ b: <strong /> }} />
            </p>
          )}
          {chuaNoiNganHang && !chiToanDuLieuThu && (
            <p className="text-sm">
              <Trans i18nKey="app.chungTu.chuaNganHang" components={{ l: <Link to="/dashboard/fintech" className="font-medium text-primary underline" /> }} />
            </p>
          )}
          {chuaCoHoaDon && (
            coMoHinh === false ? (
              // 29/09/2026: câu cũ hứa "MIMI đọc số tiền, ngày, bên bán" trong khi đọc ảnh chưa bật và nút chụp bị khoá.
              <p className="text-sm">
                <Trans i18nKey="app.chungTu.chuaCtKhongAnh" components={{ b: <strong />, l: <Link to="/dashboard/thu-vien" className="font-medium text-primary underline" /> }} />
              </p>
            ) : (
              <p className="text-sm">
                <Trans i18nKey="app.chungTu.chuaCt" components={{ l: <Link to="/dashboard/thu-vien" className="font-medium text-primary underline" /> }} />
              </p>
            )
          )}
        </div>
      )}

      {/* ── Danh sách đi đòi chứng từ ──────────────────────────────────── */}
      {kq.chuaCoGiay.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
          <div className="flex items-center gap-2">
            <FileWarning size={15} className="text-muted-foreground" />
            <p className="text-sm font-semibold">
              {t('app.chungTu.canDoi', { n: kq.chuaCoGiay.length })}
            </p>
          </div>
          {/* Khoản to nhất đứng đầu — nó ảnh hưởng tiền thuế nhiều nhất. */}
          <p className="mt-1 text-xs text-muted-foreground">
            {t('app.chungTu.xepLon')}
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[460px] text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">{t('app.chungTu.cot.ngay')}</th>
                  <th className="pb-2 font-medium">{t('app.chungTu.cot.noiDung')}</th>
                  <th className="pb-2 text-right font-medium">{t('app.chungTu.cot.soTien')}</th>
                  <th className="pb-2 pl-3 text-right font-medium">{t('app.chungTu.cot.xuLy')}</th>
                </tr>
              </thead>
              <tbody>
                {kq.chuaCoGiay.slice(0, 20).map((c) => (
                  <tr key={c.id} className="border-b border-border/20 last:border-0">
                    <td className="whitespace-nowrap py-2.5 font-mono text-xs">{ngayVN(c.ngay)}</td>
                    <td className="py-2.5">
                      {c.tenNguoiNhan || c.noiDung || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-mono font-medium">{dong(c.soTien)}</td>
                    <td className="py-2.5 pl-3 text-right">
                      {moLyDo === c.id ? (
                        <form
                          className="flex flex-col items-end gap-1.5"
                          onSubmit={(e) => { e.preventDefault(); void lam(c.id, 'quyet_dinh_chung_tu', { giao_dich_id: c.id, ly_do: lyDo, ghi_chu: ghiChu || null }, t('app.chungTu.daGhiKhongCt')); }}
                        >
                          <select aria-label={t('app.chungTu.lyDoAria')} value={lyDo} onChange={(e) => setLyDo(e.target.value as LyDoKhongChungTu)}
                            className="h-9 rounded-lg border border-border bg-background px-2 text-xs">
                            {(Object.keys(LY_DO_KHONG_CHUNG_TU) as LyDoKhongChungTu[]).map((k) => <option key={k} value={k}>{nhanLyDo(k)}</option>)}
                          </select>
                          <input aria-label={t('app.chungTu.ghiChuAria')} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} maxLength={300}
                            placeholder={lyDo === 'khac' ? t('app.chungTu.ghiChuBatBuoc') : t('app.chungTu.ghiChuTuy')}
                            className="h-9 w-44 rounded-lg border border-border bg-background px-2 text-xs" />
                          <span className="flex gap-1.5">
                            <button type="button" onClick={() => setMoLyDo(null)} className="rounded-lg border border-border px-2 py-1 text-xs">{t('app.chung.huy')}</button>
                            <button type="submit" disabled={dangXuLy === c.id || (lyDo === 'khac' && !ghiChu.trim())}
                              className="rounded-lg bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50">{t('app.chungTu.ghiQuyetDinh')}</button>
                          </span>
                        </form>
                      ) : (
                        <span className="inline-flex flex-wrap justify-end gap-1.5">
                          <NutQuetChungTu coMoHinh={coMoHinh} giaoDichId={c.id} onDaLuu={() => void tai()}
                            className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent">{t('app.chungTu.ganCt')}</NutQuetChungTu>
                          <button type="button" disabled={dangXuLy === c.id}
                            onClick={() => void lam(c.id, 'gan_nhan_chi', { giao_dich_id: c.id, ca_nhan: true }, t('app.chungTu.daCaNhan'))}
                            className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50">{t('app.chungTu.chiCaNhan')}</button>
                          <button type="button" onClick={() => { setMoLyDo(c.id); setLyDo('nguoi_ban_khong_xuat'); setGhiChu(''); }}
                            className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent">{t('app.chungTu.khongCt')}</button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {kq.chuaCoGiay.length > 20 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t('app.chungTu.conNua', { n: kq.chuaCoGiay.length - 20, tong: dong(kq.chuaCoGiay.slice(20).reduce((s, c) => s + c.soTien, 0)) })}
            </p>
          )}
        </div>
      )}

      {/* ── Cần người xem ─────────────────────────────────────────────── */}
      {kq.canXem.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
          <p className="text-sm font-semibold">{t('app.chungTu.khopNhieu', { n: kq.canXem.length })}</p>
          {/*
            Máy không chọn hộ. Chọn đại thì tổng vẫn đúng nên lỗi không lộ ở con
            số — nó lộ khi người dùng mở ra xem và thấy một cặp ghép sai.
          */}
          <p className="mt-1 text-xs text-muted-foreground">
            {t('app.chungTu.khopNhieuMo')}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {kq.canXem.map((x) => (
              <li key={x.khoanChiId} className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-medium">{dong(x.soTien)}</span>
                <span className="text-muted-foreground">{t('app.chungTu.khopN', { n: x.hoaDonId.length })}</span>
                {x.hoaDonId.map((id) => (
                  <button key={id} type="button" disabled={dangXuLy === x.khoanChiId}
                    onClick={() => void lam(x.khoanChiId, 'gan_chung_tu', { chung_tu_id: id.replace(/^quet:/, ''), giao_dich_id: x.khoanChiId }, t('app.chungTu.daGan'))}
                    className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50">
                    {tenHoaDon.get(id)?.tenBenBan ?? tenHoaDon.get(id)?.soHoaDon ?? t('app.chungTu.chungTu')}{tenHoaDon.get(id)?.ngay ? ` · ${ngayVN(tenHoaDon.get(id)!.ngay)}` : ''}
                  </button>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Đã xử lý: người duyệt quyết, hoàn tác được ─────────────────── */}
      {(loc.khongCoChungTu.length > 0 || loc.caNhan.length > 0) && (
        <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
          <p className="text-sm font-semibold">{t('app.chungTu.daXuLy')}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('app.chungTu.daXuLyMo')}
          </p>
          <ul className="mt-3 divide-y divide-border/40 text-sm">
            {loc.khongCoChungTu.map(({ khoan, quyet }) => (
              <li key={khoan.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-mono">{ngayVN(khoan.ngay)}</span> · {khoan.tenNguoiNhan || khoan.noiDung || '—'} ·{' '}
                  <span className="font-mono font-medium">{dong(khoan.soTien)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t('app.chungTu.khongCtLyDo', { lyDo: nhanLyDo(quyet.ly_do) })}{quyet.ghi_chu ? `: ${quyet.ghi_chu}` : ''}
                  </span>
                </span>
                <button type="button" disabled={dangXuLy === khoan.id}
                  onClick={() => void lam(khoan.id, 'huy_quyet_dinh_chung_tu', { id: quyet.id }, t('app.chungTu.daHoanTac'))}
                  className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50">{t('app.chungTu.hoanTac')}</button>
              </li>
            ))}
            {loc.caNhan.map((khoan) => (
              <li key={khoan.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-mono">{ngayVN(khoan.ngay)}</span> · {khoan.tenNguoiNhan || khoan.noiDung || '—'} ·{' '}
                  <span className="font-mono font-medium">{dong(khoan.soTien)}</span>
                  <span className="block text-xs text-muted-foreground">{t('app.chungTu.caNhanMo')}</span>
                </span>
                <button type="button" disabled={dangXuLy === khoan.id}
                  onClick={() => void lam(khoan.id, 'gan_nhan_chi', { giao_dich_id: khoan.id, ca_nhan: false }, t('app.chungTu.daHoanTac'))}
                  className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50">{t('app.chungTu.hoanTac')}</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Xử lý hết ngoại lệ của quý → hỏi một câu: việc này dễ hay khó. */}
      {kq.chuaCoGiay.length === 0 && kq.canXem.length === 0 && kq.tongDaChi + loc.khongCoChungTu.length + loc.caNhan.length > 0 && (
        <CauHoiNhanh
          cauHoi="doi_soat_de_kho"
          cau={t('app.chungTu.hoi.cau')}
          luaChon={[
            { gia: '1', nhan: t('app.chungTu.hoi.rhk'), diem: 1, hoiThem: true },
            { gia: '2', nhan: t('app.chungTu.hoi.kho'), diem: 2, hoiThem: true },
            { gia: '3', nhan: t('app.chungTu.hoi.bt'), diem: 3, hoiThem: true },
            { gia: '4', nhan: t('app.chungTu.hoi.de'), diem: 4 },
            { gia: '5', nhan: t('app.chungTu.hoi.rde'), diem: 5 },
          ]}
        />
      )}

      {/* ── Hoá đơn chưa thấy đường tiền ───────────────────────────────── */}
      {kq.hoaDonChuaThayTien.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
          <p className="text-sm font-semibold">
            {t('app.chungTu.hdChuaTien', { n: kq.hoaDonChuaThayTien.length })}
          </p>
          {/* Không phải lỗi. Trả tiền mặt thì sao kê không có gì để đối chiếu. */}
          <p className="mt-1 text-xs text-muted-foreground">
            {t('app.chungTu.hdChuaTienMo')}
          </p>
        </div>
      )}

      {/* ── Nối thẳng sang câu hỏi tiền ────────────────────────────────── */}
      <div>
        <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowRight size={13} /> {t('app.chungTu.nguongNam')}
        </p>
        {loiNam || doanhThuNam === null || chiPhiCoChungTuNam === null ? (
          <p role="alert" className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-foreground">
            {t('app.chungTu.chuaTinhNam', { loi: loiNam ? ` (${loiNam})` : '' })}
          </p>
        ) : (
          <ChonCachTinhThue doanhThu={doanhThuNam} chiPhiCoChungTu={chiPhiCoChungTuNam} />
        )}
      </div>
    </div>
  );
}
