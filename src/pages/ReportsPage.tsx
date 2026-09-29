import { useCallback, useEffect, useMemo, useState } from 'react';
import { taiCsv } from '@/lib/csv';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { nguoiDungHienTai } from '@/lib/nguoiDung';
import { congTyDangDung } from '@/lib/congTyDangDung';
import { duocHien } from '../../supabase/functions/_shared/minh-hoa.ts';
import { docDu } from '@/lib/docDu';
import { formatVNDShort } from '@/lib/formatters';
import { dinhDangTien, type TienVND } from '@/lib/tien';
import {
  phanBoChiPhi, theoThang, tuoiHoaDon,
  type GiaoDich, type HoaDon, type ThangTaiChinh,
} from '@/lib/bcTaiChinh';

/**
 * Tổng hợp dòng tiền ngân hàng — đọc số thật của công ty đang đăng nhập.
 *
 * P0-004 (17/09/2026): trang này từng tên "Báo cáo tài chính" và gọi tiền vào là "doanh thu",
 * chênh lệch là "lợi nhuận". Số chỉ từ sao kê nên giờ gọi đúng tên theo `TU_DIEN_CHI_SO`.
 *
 * BẢN TRƯỚC VẼ BA BIỂU ĐỒ TỪ `mockData`. Doanh thu 12 tỷ, lợi nhuận âm 2,7 tỷ,
 * tuổi hoá đơn, phân bổ chi phí — tất cả là số bịa, hiện cho mọi người dùng như
 * số của chính họ. Nút Export còn xuất đúng những số đó ra CSV, nên chúng đi ra
 * khỏi ứng dụng được.
 *
 * Cùng lỗi với trang Cài đặt đã sửa hôm qua, nhưng nặng hơn: Cài đặt hiện sai
 * tên công ty, còn đây hiện sai tiền.
 *
 * Khối "Tóm tắt AI" cũng đã gỡ: nội dung của nó là mấy câu viết cứng trong tệp
 * ngôn ngữ, không đọc số nào của người dùng, và nút "xem báo cáo đầy đủ" chỉ
 * hiện một dòng "sắp có". Một phân tích bịa nằm cạnh biểu đồ thật thì người đọc
 * tin cả hai như nhau.
 */

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const } },
};

/** Màu cho vòng phân bổ chi phí. Lặp lại khi có nhiều nhóm hơn số màu. */
const MAU = [
  'hsl(var(--blue-500))',
  'hsl(var(--green-500))',
  'hsl(var(--mimi-amber))',
  'hsl(var(--destructive))',
  'hsl(var(--muted-foreground))',
];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="space-y-1 rounded-xl border border-border bg-card p-3 text-xs shadow-xl">
      <p className="font-medium text-muted-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color || p.fill }}>
          {p.name}: {formatVNDShort(p.value)}
        </p>
      ))}
    </div>
  );
};

/** Trần đọc của trang; vượt thì trang cảnh báo chứ không vẽ như đủ. */
const TOI_DA_DONG = 50_000;

type DongGiaoDich = { amount: number | string; type: string; transaction_date: string; category: string | null; is_synthetic: boolean | null };
type DongHoaDon = HoaDon & { is_synthetic: boolean | null };
type Trang<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null; count?: number | null }>;

function Trong({ cau }: { cau: string }) {
  return (
    <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 text-center">
      <p className="max-w-xs text-sm text-muted-foreground">{cau}</p>
      <Link to="/dashboard/fintech" className="text-sm font-medium text-primary underline">
        Nối nguồn dữ liệu trong Fintech Hub
      </Link>
    </div>
  );
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const [thang, setThang] = useState<ThangTaiChinh[]>([]);
  const [tuoi, setTuoi] = useState<ReturnType<typeof tuoiHoaDon>>([]);
  const [chiPhi, setChiPhi] = useState<ReturnType<typeof phanBoChiPhi>>([]);
  const [soDongThu, setSoDongThu] = useState(0);
  // P0-002: đọc được bao nhiêu / có bao nhiêu. Thiếu (vượt trần) thì cảnh báo cạnh con số, không vẽ như đủ.
  const [doDay, setDoDay] = useState<{ daDoc: number; tong: number | null; du: boolean } | null>(null);
  /**
   * Đọc giao dịch HỎNG → không dựng gì cả (29/09/2026). Bản trước bật thông báo rồi vẫn tính trên phần đã
   * đọc; hỏng ở trang đầu thì màn hình nói "chưa có giao dịch nào" — lỗi trông y hệt công ty chưa có dữ liệu.
   */
  const [loiGiaoDich, setLoiGiaoDich] = useState<string | null>(null);
  /** Hoá đơn đọc hỏng (hoặc quá trần) → khối tuổi nợ nói là CHƯA ĐỦ, không vẽ như đủ. */
  const [loiHoaDon, setLoiHoaDon] = useState<string | null>(null);
  const [dangTai, setDangTai] = useState(true);

  const tai = useCallback(async () => {
    setDangTai(true);
    try {
      const user = await nguoiDungHienTai();
      if (!user) return;
      const dang = await congTyDangDung();
      if (!dang) return;
      const cty = { id: dang.id };
      const laDemo = dang.la_demo === true;

      const [gd, hd] = await Promise.all([
        docDu<DongGiaoDich>((tu, den, demTong) => supabase
          .from('transactions')
          .select('amount, type, transaction_date, category, is_synthetic', demTong ? { count: 'exact' } : undefined)
          .eq('company_id', cty.id)
          .order('transaction_date', { ascending: true })
          .order('id', { ascending: true })
          .range(tu, den) as unknown as Trang<DongGiaoDich>, { toiDa: TOI_DA_DONG }),
        docDu<DongHoaDon>((tu, den, demTong) => supabase
          .from('invoices')
          .select('id, total, amount, status, due_date, is_synthetic', demTong ? { count: 'exact' } : undefined)
          .eq('company_id', cty.id)
          .order('due_date', { ascending: true })
          .order('id', { ascending: true })
          .range(tu, den) as unknown as Trang<DongHoaDon>, { toiDa: TOI_DA_DONG }),
      ]);

      setLoiGiaoDich(gd.loi);
      setDoDay({ daDoc: gd.dong.length, tong: gd.tong, du: gd.du });
      // Hoá đơn chưa đọc đủ thì khối tuổi nợ nói là chưa đủ — tuổi nợ thiếu dòng là số đòi nợ sai.
      setLoiHoaDon(hd.loi
        ? `không đọc được hoá đơn: ${hd.loi}`
        : hd.du ? null : `mới đọc ${hd.dong.length.toLocaleString('vi-VN')}/${hd.tong === null ? '—' : hd.tong.toLocaleString('vi-VN')} hoá đơn, chưa đủ để tính.`);

      if (gd.loi) {
        // Không tính gì từ phần đọc dở.
        setThang([]);
        setChiPhi([]);
        setSoDongThu(0);
      } else {
        // Bỏ dòng sandbox — cùng quy ước với Tổng quan và tax-summary.
        const that = gd.dong.filter(duocHien(laDemo)) as GiaoDich[];
        setSoDongThu(gd.dong.length - that.length);
        setThang(theoThang(that));
        setChiPhi(phanBoChiPhi(that));
      }
      setTuoi(hd.loi || !hd.du ? [] : tuoiHoaDon(hd.dong.filter(duocHien(laDemo))));
    } catch (e) {
      setLoiGiaoDich(e instanceof Error ? e.message : String(e));
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => { void tai(); }, [tai]);

  const catNgan = !!doDay && !loiGiaoDich && !doDay.du;

  // Biểu đồ chỉ cần số gần đúng để vẽ; con số in ra chữ luôn lấy giá trị chính xác (TienVND).
  const bieuDo = useMemo(
    () => thang.map((r) => ({ thang: r.thang, tienVao: Number(r.tienVao), tienRa: Number(r.tienRa), chenhLech: Number(r.chenhLech) })),
    [thang],
  );
  const banh = useMemo(() => chiPhi.map((x) => ({ ten: x.ten, gia: Number(x.tien), tien: x.tien })), [chiPhi]);
  const tongTuoi = useMemo(() => tuoi.reduce((s, x) => s + Number(x.tien), 0), [tuoi]);
  const tongChiPhi = useMemo(() => banh.reduce((s, x) => s + x.gia, 0), [banh]);

  /**
   * Xuất đúng những gì đang hiện trên màn hình.
   *
   * Bản trước xuất `revenueExpenseData` từ `mockData`, nên tệp CSV tải về là số
   * bịa — và nó rời khỏi ứng dụng, nơi không còn ngữ cảnh nào nói rằng nó giả.
   */
  const xuatCsv = useCallback(() => {
    if (!thang.length) {
      toast('Chưa có dữ liệu để xuất.');
      return;
    }
    // Tên cột theo từ điển chỉ số: tệp rời ứng dụng rồi thì không còn ngữ cảnh nào giải thích.
    // Giá trị chính xác tới đồng (chuỗi khi vượt ngưỡng an toàn của Number) — tệp CSV đi ra ngoài ứng dụng.
    const dong: (string | number)[][] = thang.map((r) => [r.khoa, r.tienVao, r.tienRa, r.chenhLech]);
    if (catNgan) dong.push([`# CHUA DU DU LIEU: moi doc ${doDay?.daDoc} / ${doDay?.tong ?? 'khong ro'} giao dich`]);
    taiCsv(`dong-tien-ngan-hang-${new Date().toISOString().slice(0, 10)}.csv`,
      ['thang', 'tien_vao_ngan_hang', 'tien_ra_ngan_hang', 'chenh_lech_dong_tien'], dong);
    toast.success(catNgan ? `Đã xuất ${thang.length} tháng — số liệu CHƯA đủ, tệp có ghi chú.` : `Đã xuất ${thang.length} tháng dòng tiền ra tệp CSV.`);
  }, [thang, catNgan, doDay]);

  if (dangTai) {
    return (
      <p className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 size={15} className="animate-spin" /> Đang đọc số liệu…
      </p>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={fadeUp} className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            {t('fin.reports.title')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('fin.reports.subtitle')}
            {soDongThu > 0 && ` · đã bỏ ${soDongThu} dòng dữ liệu thử`}
          </p>
          {catNgan && doDay && (
            <p role="alert" className="mt-2 rounded-lg bg-mimi-amber/10 px-3 py-2 text-sm text-foreground">
              Mới đọc {doDay.daDoc.toLocaleString('vi-VN')}/{doDay.tong === null ? '—' : doDay.tong.toLocaleString('vi-VN')} giao dịch
              {' '}— các tổng dưới đây CHƯA đủ.
            </p>
          )}
        </div>
        <button
          onClick={xuatCsv}
          disabled={!thang.length || !!loiGiaoDich}
          className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/20 disabled:opacity-40"
        >
          <Download size={12} /> {t('fin.reports.export')}
        </button>
      </motion.div>

      {loiGiaoDich && (
        <motion.div variants={fadeUp} role="alert" className="rounded-2xl border border-destructive/40 bg-card/60 p-6">
          <p className="text-sm font-semibold text-foreground">Chưa đọc được giao dịch, nên chưa dựng báo cáo.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Đây là lỗi đọc dữ liệu, không phải công ty chưa có giao dịch. Chi tiết: {loiGiaoDich}
          </p>
          <button
            onClick={() => void tai()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
          >
            <RefreshCw size={13} /> Thử lại
          </button>
        </motion.div>
      )}

      {!loiGiaoDich && (<>
      {/* ── Tiền vào, tiền ra theo tháng ───────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm"
      >
        <h3 className="font-display text-lg font-bold text-foreground">
          {t('fin.reports.revenueExpense.title')}
        </h3>
        {/* Khoản giải ngân vay 100 tỷ là 100 tỷ tiền vào — đúng về dòng tiền, nhưng không phải doanh thu. */}
        <p className="mb-6 mt-1 text-xs text-muted-foreground">
          Tiền vào gồm cả tiền vay, vốn góp, tiền chuyển giữa các tài khoản của bạn — không phải doanh thu; chênh lệch
          không phải lợi nhuận. Doanh thu tính thuế xem ở{' '}
          <Link to="/dashboard/to-khai" className="font-medium text-primary underline">Tờ khai</Link>.
        </p>
        <div className="h-72">
          {thang.length === 0 ? (
            <Trong cau="Chưa có giao dịch nào để dựng biểu đồ. MIMI đọc tiền ra vào từ sao kê ngân hàng." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={bieuDo}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsla(var(--border)/0.3)" />
                <XAxis dataKey="thang" tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatVNDShort(v)} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="tienVao" name={t('fin.reports.revenueExpense.revenue')} fill="hsl(var(--blue-500))" radius={[6, 6, 0, 0]} barSize={18} />
                <Bar dataKey="tienRa" name={t('fin.reports.revenueExpense.expense')} fill="hsl(var(--bg-card-hover))" radius={[6, 6, 0, 0]} barSize={18} />
                <Line type="monotone" dataKey="chenhLech" name={t('fin.reports.revenueExpense.profit')} stroke="hsl(var(--green-500))" strokeWidth={2} dot={{ fill: 'hsl(var(--green-500))', r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      <motion.div variants={stagger} className="grid gap-6 lg:grid-cols-2">
        {/* ── Tuổi hoá đơn chưa thu ────────────────────────────────────── */}
        <motion.div
          variants={fadeUp}
          className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm"
        >
          <h3 className="font-display text-lg font-bold text-foreground">
            {t('fin.reports.invoiceAging.title')}
          </h3>
          {/* Chỉ hoá đơn CHƯA thu. Gộp cả đã thu vào sẽ thổi phồng khoản phải đòi. */}
          <p className="mb-6 mt-1 text-xs text-muted-foreground">Chỉ tính hoá đơn chưa thu</p>

          {loiHoaDon ? (
            <p role="alert" className="rounded-lg bg-mimi-amber/10 px-3 py-2 text-sm text-foreground">
              Chưa dựng được tuổi nợ — {loiHoaDon}
            </p>
          ) : tuoi.length === 0 ? (
            <Trong cau="Chưa có hoá đơn nào chưa thu — hoặc chưa hoá đơn nào có hạn thanh toán." />
          ) : (
            <div className="space-y-5">
              {tuoi.map((d) => (
                <div key={d.nhan}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-muted-foreground">
                      {d.nhan}
                      <span className="ml-1.5 text-xs">({d.soHoaDon})</span>
                    </span>
                    {/* Số chính xác tới đồng: đây là con số người dùng mang đi đòi nợ và đối soát. */}
                    <span className="font-mono font-semibold text-foreground">
                      {dinhDangTien(d.tien)}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-accent">
                    {/* Chia cho tổng thật, không cho một mốc cứng — mốc cứng làm
                        cột dài quá khung khi số vượt ngưỡng người viết đoán. */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${tongTuoi > 0 ? (Number(d.tien) / tongTuoi) * 100 : 0}%` }}
                      transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] as const }}
                      className="h-3 rounded-full bg-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Phân bổ chi phí ──────────────────────────────────────────── */}
        <motion.div
          variants={fadeUp}
          className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm"
        >
          <h3 className="mb-6 font-display text-lg font-bold text-foreground">
            {t('fin.reports.expenseBreakdown.title')}
          </h3>
          <div className="h-56">
            {chiPhi.length === 0 ? (
              <Trong cau="Chưa có khoản chi nào trong dữ liệu." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={banh} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="gia" nameKey="ten" paddingAngle={4} strokeWidth={0}>
                    {chiPhi.map((x, i) => (
                      <Cell key={x.ten} fill={MAU[i % MAU.length]} />
                    ))}
                  </Pie>
                  {/* Hiện tiền thật kèm phần trăm, không chỉ phần trăm — bản
                      trước ghi "%" cho một giá trị vốn là số tiền. */}
                  <Tooltip
                    formatter={(v: number, ten: string, muc: { payload?: { tien?: TienVND } }) => [
                      `${dinhDangTien(muc?.payload?.tien ?? v)} · ${tongChiPhi > 0 ? Math.round((v / tongChiPhi) * 100) : 0}%`,
                      ten,
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    formatter={(v) => <span className="ml-1 text-xs text-muted-foreground">{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </motion.div>
      </>)}
    </motion.div>
  );
}
