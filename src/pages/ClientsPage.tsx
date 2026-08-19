import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { formatDateShort } from '@/lib/formatters';
import { Search, Loader2, Building2, Store, GitBranch, ShieldCheck, ShieldAlert, ShieldQuestion, Mail, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { GlassTabs } from '@/components/ui/glass-tabs';

/**
 * Danh bạ khách hàng / đối tác.
 *
 * Màn hình này tồn tại vì hai lý do, và cả hai đều là nghiệp vụ chứ không phải
 * trang trí:
 *
 * 1. Đối soát công nợ (`_shared/ledger/receivables.ts`) khớp tiền vào theo TÊN
 *    khách khi nội dung chuyển khoản không có số hoá đơn. Tên đó phải có một
 *    nơi duy nhất để tra, nếu không cùng một khách viết ba kiểu sẽ thành ba
 *    người và công nợ không cộng lại được.
 *
 * 2. Mỗi đối tác có mã số thuế. Tra mã đó ra trạng thái người nộp thuế là cách
 *    duy nhất nhìn thấy rủi ro "đang giao hàng chịu cho một công ty đã ngừng
 *    hoạt động" — thứ mà đọc lại danh sách Excel không bao giờ thấy.
 */

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] as const } },
};

interface Client {
  id: string;
  name: string;
  tax_code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
  status: string;
  tax_status: string | null;
  tax_status_checked_at: string | null;
}

/**
 * Hình dạng mã số thuế nói ra loại hình, và loại hình đổi cách xử lý.
 *
 * 10 số là doanh nghiệp. 12 số là hộ kinh doanh — từ 01/07/2025 chính là số
 * định danh cá nhân. Đuôi `-00x` là chi nhánh: tra cứu phải gửi mã gốc, vì hệ
 * thống Thuế trả bản ghi theo mã 10 số của công ty mẹ.
 */
type LoaiHinh = 'doanh_nghiep' | 'ho_kinh_doanh' | 'chi_nhanh' | 'khong_ro';

function loaiHinh(taxCode: string | null): LoaiHinh {
  if (!taxCode) return 'khong_ro';
  if (taxCode.includes('-')) return 'chi_nhanh';
  const so = taxCode.replace(/\D/g, '');
  if (so.length === 10) return 'doanh_nghiep';
  if (so.length === 12) return 'ho_kinh_doanh';
  return 'khong_ro';
}

/** Mã gốc để gửi đi tra cứu: bỏ đuôi chi nhánh, giữ nguyên phần còn lại. */
function maGoc(taxCode: string): string {
  return taxCode.split('-')[0].replace(/\D/g, '');
}

const nhanLoai: Record<LoaiHinh, { icon: typeof Building2; label: string; cls: string }> = {
  doanh_nghiep: { icon: Building2, label: 'Doanh nghiệp', cls: 'text-primary bg-primary/8' },
  ho_kinh_doanh: { icon: Store, label: 'Hộ kinh doanh', cls: 'text-mimi-amber bg-mimi-amber/8' },
  chi_nhanh: { icon: GitBranch, label: 'Chi nhánh', cls: 'text-muted-foreground bg-muted' },
  khong_ro: { icon: ShieldQuestion, label: 'Chưa rõ', cls: 'text-muted-foreground bg-muted' },
};

const nhanTrangThai: Record<string, { label: string; cls: string; dot: string }> = {
  prospect: { label: 'Đang tiếp cận', cls: 'bg-mimi-amber/8 text-mimi-amber', dot: 'bg-mimi-amber' },
  active: { label: 'Đang giao dịch', cls: 'bg-mimi-green/8 text-mimi-green', dot: 'bg-mimi-green' },
  inactive: { label: 'Ngừng', cls: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
};

export default function ClientsPage() {
  const session = useAuthStore((s) => s.session);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  /** Id các khách đang chờ kết quả tra cứu — dùng để khoá đúng nút đã bấm. */
  const [dangTra, setDangTra] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!session) return;
    setLoading(true);
    const { data: companies } = await supabase
      .from('companies').select('id').eq('user_id', session.user.id)
      .order('created_at', { ascending: true }).limit(1);
    const companyId = companies?.[0]?.id;
    if (!companyId) { setClients([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('clients').select('*').eq('company_id', companyId).order('name');
    if (error) toast.error('Không tải được danh bạ: ' + error.message);
    setClients((data as Client[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [session]);

  /**
   * Tra trạng thái người nộp thuế và ghi lại kết quả kèm thời điểm.
   *
   * Ghi cả mốc thời gian chứ không chỉ kết quả: một chữ "đang hoạt động" không
   * kèm ngày tra thì không biết là của hôm nay hay của năm ngoái, mà trạng thái
   * này thay đổi theo thời gian.
   */
  const traCuu = async (c: Client) => {
    if (!c.tax_code) return;
    setDangTra((s) => new Set(s).add(c.id));
    try {
      const { data, error } = await supabase.functions.invoke('tax-lookup', {
        body: { taxCode: maGoc(c.tax_code) },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      if (!data?.found) {
        toast.warning(`Không tìm thấy bản ghi nào cho mã ${c.tax_code}`);
        return;
      }
      const trangThai: string = data.record?.status || '';
      const now = new Date().toISOString();
      const { error: upErr } = await supabase
        .from('clients')
        .update({ tax_status: trangThai, tax_status_checked_at: now })
        .eq('id', c.id);
      if (upErr) throw upErr;
      setClients((prev) => prev.map((x) =>
        x.id === c.id ? { ...x, tax_status: trangThai, tax_status_checked_at: now } : x));
      if (data.conHoatDong) toast.success(`${c.name}: ${trangThai}`);
      else toast.warning(`${c.name}: ${trangThai}`);
    } catch (e) {
      toast.error('Tra cứu thất bại: ' + ((e as Error)?.message ?? 'lỗi không xác định'));
    } finally {
      setDangTra((s) => { const n = new Set(s); n.delete(c.id); return n; });
    }
  };

  const doiTrangThai = async (c: Client, status: string) => {
    const { error } = await supabase.from('clients')
      .update({ status, updated_at: new Date().toISOString() }).eq('id', c.id);
    if (error) { toast.error(error.message); return; }
    setClients((prev) => prev.map((x) => (x.id === c.id ? { ...x, status } : x)));
  };

  const dem = useMemo(() => ({
    all: clients.length,
    prospect: clients.filter((c) => c.status === 'prospect').length,
    active: clients.filter((c) => c.status === 'active').length,
    inactive: clients.filter((c) => c.status === 'inactive').length,
  }), [clients]);

  const hienThi = useMemo(() => {
    const tu = q.trim().toLowerCase();
    return clients.filter((c) => {
      if (tab !== 'all' && c.status !== tab) return false;
      if (!tu) return true;
      // Tìm cả trong mặt hàng: "ai đang mua tỏi lột vỏ" là câu hỏi thật.
      return [c.name, c.tax_code, c.note, c.email, c.address]
        .some((v) => (v ?? '').toLowerCase().includes(tu));
    });
  }, [clients, q, tab]);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={fadeUp} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Danh bạ khách hàng</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {dem.all} đối tác · {dem.prospect} đang tiếp cận · {dem.active} đang giao dịch
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Tên, mã số thuế, mặt hàng…"
            className="pl-9 pr-3 h-10 w-72 rounded-xl bg-muted/50 border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <GlassTabs
          active={tab} onChange={setTab}
          tabs={[
            { key: 'all', label: `Tất cả (${dem.all})` },
            { key: 'prospect', label: `Đang tiếp cận (${dem.prospect})` },
            { key: 'active', label: `Đang giao dịch (${dem.active})` },
            { key: 'inactive', label: `Ngừng (${dem.inactive})` },
          ]}
        />
      </motion.div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-16 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang tải danh bạ…
        </div>
      ) : hienThi.length === 0 ? (
        <motion.div variants={fadeUp} className="text-center py-16 text-muted-foreground">
          {clients.length === 0 ? 'Chưa có khách hàng nào trong danh bạ.' : 'Không có khách nào khớp bộ lọc.'}
        </motion.div>
      ) : (
        <motion.div variants={stagger} className="grid gap-3">
          {hienThi.map((c) => {
            const lh = nhanLoai[loaiHinh(c.tax_code)];
            const LhIcon = lh.icon;
            const tt = nhanTrangThai[c.status] ?? nhanTrangThai.prospect;
            const dangHoatDong = c.tax_status?.startsWith('NNT đang hoạt động');
            return (
              <motion.div key={c.id} variants={fadeUp}
                className="rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${lh.cls}`}>
                        <LhIcon className="w-3 h-3" /> {lh.label}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full ${tt.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tt.dot}`} /> {tt.label}
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs text-muted-foreground font-mono">{c.tax_code}</div>
                    {c.address && (
                      <div className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 mt-0.5 shrink-0" /> <span>{c.address}</span>
                      </div>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {c.phone && <span className="inline-flex items-center gap-1.5"><Phone className="w-3 h-3" />{c.phone}</span>}
                      {c.email && <span className="inline-flex items-center gap-1.5 break-all"><Mail className="w-3 h-3 shrink-0" />{c.email}</span>}
                    </div>
                    {c.note && <div className="mt-2 text-xs text-foreground/70">{c.note}</div>}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <select
                      value={c.status} onChange={(e) => void doiTrangThai(c, e.target.value)}
                      className="text-xs h-8 px-2 rounded-lg bg-muted/50 border border-border outline-none"
                    >
                      <option value="prospect">Đang tiếp cận</option>
                      <option value="active">Đang giao dịch</option>
                      <option value="inactive">Ngừng</option>
                    </select>
                    <button
                      onClick={() => void traCuu(c)}
                      disabled={!c.tax_code || dangTra.has(c.id)}
                      className="text-xs h-8 px-3 rounded-lg bg-primary/8 text-primary hover:bg-primary/15 disabled:opacity-40 inline-flex items-center gap-1.5"
                    >
                      {dangTra.has(c.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                      Tra cứu thuế
                    </button>
                  </div>
                </div>

                {c.tax_status && (
                  <div className={`mt-3 pt-3 border-t border-border flex items-start gap-2 text-xs ${dangHoatDong ? 'text-mimi-green' : 'text-mimi-amber'}`}>
                    {dangHoatDong ? <ShieldCheck className="w-3.5 h-3.5 mt-px shrink-0" /> : <ShieldAlert className="w-3.5 h-3.5 mt-px shrink-0" />}
                    <span>
                      {c.tax_status}
                      {c.tax_status_checked_at && (
                        <span className="text-muted-foreground"> · tra ngày {formatDateShort(c.tax_status_checked_at)}</span>
                      )}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
