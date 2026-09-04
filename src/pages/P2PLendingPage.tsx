import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, HandCoins, Plus, ShieldAlert, Users, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatVND } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import {
  CAU_CANH_BAO,
  CHUA_DUOC_CHAP_THUAN,
  HAN_MUC,
  kiemTraHanMuc,
  kyHanHopLe,
} from '@/lib/vayNgangHang';

/**
 * Sàn cho vay ngang hàng.
 *
 * Thay chỗ của "Thiết bị M2M" trong thanh điều hướng. Ba bảng M2M vẫn còn
 * nguyên trong CSDL và route `/dashboard/m2m` vẫn sống — chỉ là không chiếm một
 * ô cố định nữa, đúng cách đã xử lý với LoansPage ngày 17/08.
 *
 * MỌI GIỚI HẠN Ở ĐÂY ĐỀU LẤY TỪ `lib/vayNgangHang.ts`, không gõ lại. Trang này
 * chỉ trình bày; luật nằm ở đó và có 17 test giữ. Con số 100 triệu không được
 * xuất hiện dưới dạng chữ viết tay ở bất kỳ đâu trong file này.
 */

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

interface Listing {
  id: string;
  company_id: string;
  so_tien: number;
  ky_han_ngay: number;
  lai_suat_nam: number;
  muc_dich: string | null;
  trang_thai: string;
  da_gop: number;
  created_at: string;
}

const NHAN_TRANG_THAI: Record<string, { chu: string; lop: string }> = {
  nhap: { chu: 'Bản nháp', lop: 'bg-muted text-muted-foreground' },
  dang_goi_von: { chu: 'Đang gọi vốn', lop: 'bg-primary/10 text-primary' },
  du_von: { chu: 'Đủ vốn', lop: 'bg-mimi-green/12 text-mimi-green' },
  da_giai_ngan: { chu: 'Đã giải ngân', lop: 'bg-mimi-green/12 text-mimi-green' },
  da_tat_toan: { chu: 'Đã tất toán', lop: 'bg-muted text-muted-foreground' },
  huy: { chu: 'Đã huỷ', lop: 'bg-muted text-muted-foreground' },
};

export default function P2PLendingPage() {
  const { toast } = useToast();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [cuaToi, setCuaToi] = useState<Listing[]>([]);
  const [dangGoiVon, setDangGoiVon] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'cua_toi' | 'san'>('cua_toi');
  const [moForm, setMoForm] = useState(false);

  const [fSoTien, setFSoTien] = useState('');
  const [fKyHan, setFKyHan] = useState('90');
  const [fLaiSuat, setFLaiSuat] = useState('12');
  const [fMucDich, setFMucDich] = useState('');
  const [dangGui, setDangGui] = useState(false);

  useEffect(() => {
    void tai();
  }, []);

  async function tai() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);

    const { data: cty } = await supabase
      .from('companies').select('id').eq('user_id', user.id)
      .order('created_at', { ascending: true }).limit(1);
    const cid = cty?.[0]?.id ?? null;
    setCompanyId(cid);

    if (cid) {
      const { data } = await supabase
        .from('p2p_listings').select('*').eq('company_id', cid)
        .order('created_at', { ascending: false });
      setCuaToi((data as Listing[]) ?? []);
    }

    // Khoản của người khác đang gọi vốn. RLS cho phép thấy, nhưng lọc bỏ khoản
    // của chính mình ở đây — Nghị định 94 cấm tự cho vay khoản của mình, nên
    // hiện nó lên sàn là mời người dùng làm một việc sẽ bị trigger chặn.
    const { data: san } = await supabase
      .from('p2p_listings').select('*')
      .in('trang_thai', ['dang_goi_von', 'du_von'])
      .order('created_at', { ascending: false }).limit(50);
    setDangGoiVon(((san as Listing[]) ?? []).filter((l) => l.company_id !== cid));

    setLoading(false);
  }

  // Dư nợ hiện tại trên chính sàn này: các khoản đã giải ngân, chưa tất toán.
  const duNoTaiSanNay = cuaToi
    .filter((l) => l.trang_thai === 'da_giai_ngan')
    .reduce((s, l) => s + l.so_tien, 0);

  const soTien = Number(fSoTien.replace(/\D/g, '')) || 0;
  const kyHan = Number(fKyHan) || 0;
  // `duNoSanKhac` cố tình KHÔNG truyền: MIMI không biết dư nợ của công ty này ở
  // các sàn khác. Hàm sẽ bật `thieuDuLieu` và giao diện nói đúng điều đó.
  const hanMuc = kiemTraHanMuc({ duNoTaiSanNay }, soTien);
  const kyHanKq = kyHanHopLe(kyHan);
  const guiDuoc = soTien > 0 && hanMuc.duoc && kyHanKq.duoc && !dangGui;

  async function dangKhoanVay() {
    if (!companyId || !guiDuoc) return;
    setDangGui(true);
    const { error } = await supabase.from('p2p_listings').insert({
      company_id: companyId,
      so_tien: soTien,
      ky_han_ngay: kyHan,
      lai_suat_nam: Number(fLaiSuat) || 0,
      muc_dich: fMucDich.trim() || null,
      trang_thai: 'nhap',
    });
    setDangGui(false);
    if (error) {
      toast({ title: 'Không lưu được', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Đã lưu bản nháp', description: 'Khoản vay chưa hiện trên sàn cho tới khi bạn đăng.' });
    setMoForm(false);
    setFSoTien(''); setFMucDich('');
    void tai();
  }

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }}>
      {/*
        Cảnh báo KHÔNG đóng được, và đứng trên mọi thứ khác.

        Đây là điều kiện để phần này tồn tại: sàn chưa có Giấy chứng nhận của
        NHNN. Một dải cảnh báo tắt được là một dải cảnh báo sẽ bị tắt.
      */}
      {CHUA_DUOC_CHAP_THUAN && (
        <motion.div
          variants={fadeUp}
          className="mb-6 flex items-start gap-3 rounded-2xl border border-mimi-amber/30 bg-mimi-amber/8 p-4"
        >
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-mimi-amber" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Chưa được phép vận hành</p>
            <p className="mt-1 text-sm text-muted-foreground">{CAU_CANH_BAO}</p>
          </div>
        </motion.div>
      )}

      <motion.div variants={fadeUp} className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Vay ngang hàng</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kết nối bên cần vốn với bên cho vay — theo Nghị định 94/2025/NĐ-CP
          </p>
        </div>
        <button
          onClick={() => setMoForm(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus size={16} /> Đăng khoản vay
        </button>
      </motion.div>

      <motion.div variants={fadeUp} className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Dư nợ trên sàn này', value: formatVND(duNoTaiSanNay), icon: Wallet, mau: 'text-primary' },
          {
            label: 'Còn vay được',
            value: formatVND(Math.max(0, HAN_MUC.MOT_GIAI_PHAP - duNoTaiSanNay)),
            icon: HandCoins,
            mau: 'text-mimi-green',
          },
          { label: 'Khoản của tôi', value: String(cuaToi.length), icon: Users, mau: 'text-mimi-amber' },
          { label: 'Đang gọi vốn trên sàn', value: String(dangGoiVon.length), icon: AlertTriangle, mau: 'text-muted-foreground' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border/60 bg-card/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon size={14} className={s.mau} />
            </div>
            <p className="font-mono text-xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </motion.div>

      <motion.div variants={fadeUp} className="mb-4 flex gap-2">
        {([['cua_toi', 'Khoản vay của tôi'], ['san', 'Đang gọi vốn']] as const).map(([k, nhan]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              tab === k ? 'bg-primary text-primary-foreground' : 'bg-card/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            {nhan}
          </button>
        ))}
      </motion.div>

      <motion.div variants={fadeUp}>
        {loading ? (
          <div className="rounded-2xl border border-border/60 bg-card/60 p-12 text-center text-sm text-muted-foreground">
            Đang tải…
          </div>
        ) : (
          <DanhSach items={tab === 'cua_toi' ? cuaToi : dangGoiVon} laCuaToi={tab === 'cua_toi'} />
        )}
      </motion.div>

      {moForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setMoForm(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-display font-bold text-foreground">Đăng khoản vay</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Lưu thành bản nháp trước. Khoản vay chỉ hiện trên sàn khi bạn chủ động đăng.
            </p>

            <div className="mt-5 space-y-4">
              <Truong nhan="Số tiền cần vay">
                <input
                  inputMode="numeric"
                  value={fSoTien}
                  onChange={(e) => setFSoTien(e.target.value)}
                  placeholder="50.000.000"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
                {soTien > 0 && (
                  <p className={`mt-1.5 text-xs ${hanMuc.duoc ? 'text-muted-foreground' : 'text-destructive'}`}>
                    {hanMuc.vuong ?? `Hợp lệ — ${formatVND(soTien)}`}
                  </p>
                )}
                {/* Nói thẳng phần chưa kiểm được, thay vì im lặng cho qua. */}
                {soTien > 0 && hanMuc.duoc && hanMuc.thieuDuLieu && (
                  <p className="mt-1 text-xs text-mimi-amber">
                    Chưa kiểm được tổng dư nợ {formatVND(HAN_MUC.TAT_CA_GIAI_PHAP)} trên các sàn khác —
                    MIMI không thấy dữ liệu đó.
                  </p>
                )}
              </Truong>

              <div className="grid grid-cols-2 gap-3">
                <Truong nhan="Kỳ hạn (ngày)">
                  <input
                    inputMode="numeric"
                    value={fKyHan}
                    onChange={(e) => setFKyHan(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  />
                  {!kyHanKq.duoc && kyHan > 0 && (
                    <p className="mt-1.5 text-xs text-destructive">{kyHanKq.vuong}</p>
                  )}
                </Truong>
                <Truong nhan="Lãi suất (%/năm)">
                  <input
                    inputMode="decimal"
                    value={fLaiSuat}
                    onChange={(e) => setFLaiSuat(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </Truong>
              </div>

              <Truong nhan="Mục đích">
                <input
                  value={fMucDich}
                  onChange={(e) => setFMucDich(e.target.value)}
                  placeholder="Nhập hàng vụ Tết"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
              </Truong>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setMoForm(false)}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground"
              >
                Huỷ
              </button>
              <button
                onClick={dangKhoanVay}
                disabled={!guiDuoc}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
              >
                Lưu bản nháp
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Truong({ nhan, children }: { nhan: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{nhan}</span>
      {children}
    </label>
  );
}

function DanhSach({ items, laCuaToi }: { items: Listing[]; laCuaToi: boolean }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/60 p-12 text-center">
        <HandCoins size={28} className="mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">
          {laCuaToi ? 'Chưa có khoản vay nào' : 'Chưa có khoản nào đang gọi vốn'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {laCuaToi
            ? 'Đăng khoản vay để bên cho vay nhìn thấy.'
            : 'Khi có người đăng khoản vay, nó sẽ hiện ở đây.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((l) => {
        const nhan = NHAN_TRANG_THAI[l.trang_thai] ?? NHAN_TRANG_THAI.nhap;
        const phanTram = l.so_tien > 0 ? Math.round((l.da_gop / l.so_tien) * 100) : 0;
        return (
          <div key={l.id} className="rounded-2xl border border-border/60 bg-card/60 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-lg font-bold text-foreground">{formatVND(l.so_tien)}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {l.ky_han_ngay} ngày · {l.lai_suat_nam}%/năm
                  {l.muc_dich ? ` · ${l.muc_dich}` : ''}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${nhan.lop}`}>
                {nhan.chu}
              </span>
            </div>
            {l.da_gop > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>Đã gọi được {formatVND(l.da_gop)}</span>
                  <span>{phanTram}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${phanTram}%` }} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
