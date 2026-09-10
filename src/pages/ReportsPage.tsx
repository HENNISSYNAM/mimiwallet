import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { formatVNDShort } from '@/lib/formatters';
import {
  phanBoChiPhi, theoThang, tuoiHoaDon,
  type GiaoDich, type HoaDon, type ThangTaiChinh,
} from '@/lib/bcTaiChinh';

/**
 * Báo cáo tài chính — đọc số thật của công ty đang đăng nhập.
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
  const [dangTai, setDangTai] = useState(true);

  const tai = useCallback(async () => {
    setDangTai(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: cty } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!cty) return;

      const [gd, hd] = await Promise.all([
        supabase
          .from('transactions')
          .select('amount, type, transaction_date, category, is_synthetic')
          .eq('company_id', cty.id)
          .order('transaction_date', { ascending: true }),
        supabase
          .from('invoices')
          .select('total, amount, status, due_date')
          .eq('company_id', cty.id),
      ]);

      // Không nuốt lỗi: truy vấn hỏng trông y hệt không có dữ liệu.
      if (gd.error) toast.error(`Không đọc được giao dịch: ${gd.error.message}`);
      if (hd.error) toast.error(`Không đọc được hoá đơn: ${hd.error.message}`);

      // Bỏ dòng sandbox — cùng quy ước với Tổng quan và tax-summary.
      const tatCa = gd.data ?? [];
      const that = tatCa.filter((x) => !x.is_synthetic) as unknown as GiaoDich[];
      setSoDongThu(tatCa.length - that.length);

      setThang(theoThang(that));
      setChiPhi(phanBoChiPhi(that));
      setTuoi(tuoiHoaDon((hd.data ?? []) as unknown as HoaDon[]));
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => { void tai(); }, [tai]);

  const tongTuoi = useMemo(() => tuoi.reduce((s, x) => s + x.tien, 0), [tuoi]);
  const tongChiPhi = useMemo(() => chiPhi.reduce((s, x) => s + x.tien, 0), [chiPhi]);

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
    const dong = [['thang', 'doanh_thu', 'chi_phi', 'loi_nhuan'].join(',')].concat(
      thang.map((r) => [r.khoa, r.doanhThu, r.chiPhi, r.loiNhuan].join(',')),
    );
    const url = URL.createObjectURL(new Blob([dong.join('\n')], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [thang]);

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
            Số liệu đọc từ giao dịch và hoá đơn của bạn
            {soDongThu > 0 && ` · đã bỏ ${soDongThu} dòng dữ liệu thử`}
          </p>
        </div>
        <button
          onClick={xuatCsv}
          disabled={!thang.length}
          className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/20 disabled:opacity-40"
        >
          <Download size={12} /> {t('fin.reports.export')}
        </button>
      </motion.div>

      {/* ── Doanh thu và chi phí theo tháng ────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm"
      >
        <h3 className="mb-6 font-display text-lg font-bold text-foreground">
          {t('fin.reports.revenueExpense.title')}
        </h3>
        <div className="h-72">
          {thang.length === 0 ? (
            <Trong cau="Chưa có giao dịch nào để dựng biểu đồ. MIMI đọc tiền ra vào từ sao kê ngân hàng." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={thang}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsla(var(--border)/0.3)" />
                <XAxis dataKey="thang" tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatVNDShort(v)} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="doanhThu" name={t('fin.reports.revenueExpense.revenue')} fill="hsl(var(--blue-500))" radius={[6, 6, 0, 0]} barSize={18} />
                <Bar dataKey="chiPhi" name={t('fin.reports.revenueExpense.expense')} fill="hsl(var(--bg-card-hover))" radius={[6, 6, 0, 0]} barSize={18} />
                <Line type="monotone" dataKey="loiNhuan" name={t('fin.reports.revenueExpense.profit')} stroke="hsl(var(--green-500))" strokeWidth={2} dot={{ fill: 'hsl(var(--green-500))', r: 3 }} />
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

          {tuoi.length === 0 ? (
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
                    <span className="font-mono font-semibold text-foreground">
                      {formatVNDShort(d.tien)}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-accent">
                    {/* Chia cho tổng thật, không cho một mốc cứng — mốc cứng làm
                        cột dài quá khung khi số vượt ngưỡng người viết đoán. */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${tongTuoi > 0 ? (d.tien / tongTuoi) * 100 : 0}%` }}
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
                  <Pie data={chiPhi} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="tien" nameKey="ten" paddingAngle={4} strokeWidth={0}>
                    {chiPhi.map((x, i) => (
                      <Cell key={x.ten} fill={MAU[i % MAU.length]} />
                    ))}
                  </Pie>
                  {/* Hiện tiền thật kèm phần trăm, không chỉ phần trăm — bản
                      trước ghi "%" cho một giá trị vốn là số tiền. */}
                  <Tooltip
                    formatter={(v: number, ten: string) => [
                      `${formatVNDShort(v)} · ${tongChiPhi > 0 ? Math.round((v / tongChiPhi) * 100) : 0}%`,
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
    </motion.div>
  );
}
