import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Bot, Check, ChevronDown, Copy, KeyRound, Loader2, Pause, Play, Plus, QrCode, RefreshCw, ShieldCheck, Trash2, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { taoChuoiVietQr } from '@/lib/vietqr';
import { DANH_SACH_NGAN_HANG } from '@/lib/nganHang';
import { NHOM_CHI, TEN_NHOM_CHI, TRANG_THAI_GIU_HAN_MUC, dauNgayVN, dauThangVN, type NhomChi } from '@/lib/tacTu';

/**
 * Kiểm soát chi của agent — màn hình của chủ doanh nghiệp.
 *
 * Thứ tự trên trang là thứ tự việc cần làm: khoản chờ mình duyệt, rồi lệnh đã
 * duyệt chờ mình trả, rồi mới tới cấu hình agent. Người mở trang này hầu hết là
 * vì có việc đang chờ, không phải để chỉnh hạn mức.
 *
 * MIMI KHÔNG CHUYỂN TIỀN, và trang nói điều đó ở chỗ người ta bấm. "Đã duyệt"
 * hiện mã VietQR để trả bằng ứng dụng ngân hàng; "Đã chi" chỉ xuất hiện khi sao
 * kê xác nhận — không có nút nào tự đánh dấu đã chi.
 */

type Bang<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
type TacTu = Bang<'tac_tu'>;
type ChinhSachRow = Bang<'chinh_sach_chi'>;
type YeuCau = Bang<'yeu_cau_chi'>;
type NguoiNhan = Bang<'nguoi_nhan_duoc_phep'>;
type NhatKy = Bang<'nhat_ky_tac_tu'>;

const dong = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;
const tenNganHang = (bin: string) => DANH_SACH_NGAN_HANG.find((n) => n.bin === bin)?.ten ?? bin;
const lyDoCua = (y: YeuCau) => (Array.isArray(y.ly_do) ? y.ly_do : []) as unknown as Array<{ ma: string; cau: string }>;
const luc = (s: string | null) =>
  s ? new Date(s).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—';
const soTu = (s: string) => Number(s.replace(/\D/g, '') || 0);

const TRANG_THAI: Record<string, { nhan: string; lop: string }> = {
  dang_xet: { nhan: 'Đang xét', lop: 'bg-muted text-muted-foreground' },
  tu_choi: { nhan: 'Từ chối', lop: 'bg-destructive/10 text-destructive' },
  cho_duyet: { nhan: 'Chờ duyệt', lop: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  da_duyet: { nhan: 'Đã duyệt · chờ trả', lop: 'bg-primary/10 text-primary' },
  da_chi: { nhan: 'Đã chi · sao kê xác nhận', lop: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  huy: { nhan: 'Đã huỷ', lop: 'bg-muted text-muted-foreground' },
};

const TRANG_THAI_TAC_TU: Record<string, string> = {
  hoat_dong: 'Đang hoạt động',
  tam_dung: 'Tạm dừng',
  thu_hoi: 'Đã thu hồi',
};

/**
 * Nhật ký lưu mã sự kiện cho máy (`them_nguoi_nhan`), nhưng người đọc cần một
 * câu. Mã lạ — ví dụ sự kiện máy chủ mới thêm mà trang chưa biết — hiện nguyên
 * mã thay vì biến mất.
 */
const SU_KIEN: Record<string, string> = {
  tao_tac_tu: 'Tạo agent',
  xoay_khoa: 'Cấp khoá mới',
  doi_trang_thai: 'Đổi trạng thái agent',
  luu_chinh_sach: 'Sửa chính sách chi',
  them_nguoi_nhan: 'Thêm người nhận',
  xoa_nguoi_nhan: 'Bỏ người nhận',
  xin_chi: 'Agent xin chi',
  xin_chi_sai_khuon: 'Agent gửi yêu cầu sai khuôn',
  duyet: 'Duyệt khoản chi',
  tu_choi: 'Từ chối khoản chi',
  huy: 'Huỷ khoản chi',
  da_chi: 'Sao kê xác nhận đã chi',
};

const KET_QUA_XIN: Record<string, string> = {
  tu_dong_duyet: 'tự duyệt',
  cho_duyet: 'chờ bạn duyệt',
  tu_choi: 'bị từ chối',
};

function chiTietNhatKy(n: NhatKy): string {
  const c = (n.chi_tiet && typeof n.chi_tiet === 'object' && !Array.isArray(n.chi_tiet)
    ? n.chi_tiet
    : {}) as Record<string, unknown>;
  const tien = typeof c.so_tien === 'number' ? dong(c.so_tien) : null;

  switch (n.su_kien) {
    case 'them_nguoi_nhan':
    case 'xoa_nguoi_nhan': {
      const ten = (c.ten_chu_tai_khoan ?? c.ten) as string | undefined;
      const bin = c.ngan_hang_bin as string | undefined;
      return [ten, bin ? tenNganHang(bin) : null, c.so_tai_khoan as string | undefined].filter(Boolean).join(' · ');
    }
    case 'xin_chi':
      return [tien, KET_QUA_XIN[c.ket_qua as string]].filter(Boolean).join(' · ');
    case 'doi_trang_thai':
      return `${TRANG_THAI_TAC_TU[c.tu as string] ?? c.tu} → ${TRANG_THAI_TAC_TU[c.sang as string] ?? c.sang}`;
    case 'tu_choi':
      return [tien, c.ghi_chu as string | undefined].filter(Boolean).join(' · ');
    default:
      return tien ?? '';
  }
}

const DIEM_GOI = `${SUPABASE_URL}/functions/v1/tac-tu`;
const DIEM_MCP = `${SUPABASE_URL}/functions/v1/mcp`;

async function goi(hanhDong: string, du: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Phiên đăng nhập đã hết. Đăng nhập lại.');
  const res = await fetch(DIEM_GOI, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ hanh_dong: hanhDong, ...du }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.error) throw new Error(body?.error ?? `Lỗi ${res.status}`);
  return body;
}

const o = 'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm';
const nut = 'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50';
const the = 'rounded-2xl border border-border/60 bg-card/50 p-5';

export default function TacTuPage() {
  const [dangTai, setDangTai] = useState(true);
  const [dsTacTu, setDsTacTu] = useState<TacTu[]>([]);
  const [chinhSach, setChinhSach] = useState<Record<string, ChinhSachRow>>({});
  const [nguoiNhan, setNguoiNhan] = useState<NguoiNhan[]>([]);
  const [yeuCau, setYeuCau] = useState<YeuCau[]>([]);
  const [giuThang, setGiuThang] = useState<Array<Pick<YeuCau, 'tac_tu_id' | 'so_tien' | 'created_at'>>>([]);
  const [nhatKy, setNhatKy] = useState<NhatKy[]>([]);
  const [khoaMoi, setKhoaMoi] = useState<{ ten: string; khoa: string } | null>(null);
  const [dangLam, setDangLam] = useState<string | null>(null);

  const tai = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: cty } = await supabase
        .from('companies').select('id').eq('user_id', user.id)
        .order('created_at', { ascending: true }).limit(1).maybeSingle();
      if (!cty) return;

      const [tt, cs, nn, yc, giu, nk] = await Promise.all([
        supabase.from('tac_tu').select('*').eq('company_id', cty.id).order('created_at', { ascending: true }),
        supabase.from('chinh_sach_chi').select('*').eq('company_id', cty.id),
        supabase.from('nguoi_nhan_duoc_phep').select('*').eq('company_id', cty.id).order('created_at', { ascending: true }),
        supabase.from('yeu_cau_chi').select('*').eq('company_id', cty.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('yeu_cau_chi').select('tac_tu_id, so_tien, created_at').eq('company_id', cty.id)
          .in('trang_thai', [...TRANG_THAI_GIU_HAN_MUC])
          .gte('created_at', dauThangVN(new Date()).toISOString()),
        supabase.from('nhat_ky_tac_tu').select('*').eq('company_id', cty.id).order('created_at', { ascending: false }).limit(30),
      ]);

      // Không nuốt lỗi: bảng chưa có (migration chưa chạy) trông y hệt "chưa có agent nào".
      const loi = [tt, cs, nn, yc, giu, nk].find((r) => r.error)?.error;
      if (loi) toast.error(`Không đọc được dữ liệu agent: ${loi.message}`);

      setDsTacTu(tt.data ?? []);
      setChinhSach(Object.fromEntries((cs.data ?? []).map((r) => [r.tac_tu_id, r])));
      setNguoiNhan(nn.data ?? []);
      setYeuCau(yc.data ?? []);
      setGiuThang(giu.data ?? []);
      setNhatKy(nk.data ?? []);
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => { void tai(); }, [tai]);

  // Có lệnh đã duyệt chờ trả thì tự tải lại: sao kê về là trạng thái đổi.
  const coLenhChoTra = yeuCau.some((y) => y.trang_thai === 'da_duyet' || y.trang_thai === 'cho_duyet');
  useEffect(() => {
    if (!coLenhChoTra) return;
    const t = setInterval(() => { void tai(); }, 30_000);
    return () => clearInterval(t);
  }, [coLenhChoTra, tai]);

  const lam = async (nhan: string, hanhDong: string, du: Record<string, unknown> = {}, thanhCong?: string) => {
    setDangLam(nhan);
    try {
      const kq = await goi(hanhDong, du);
      if (thanhCong) toast.success(thanhCong);
      await tai();
      return kq;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không thực hiện được');
      return null;
    } finally {
      setDangLam(null);
    }
  };

  const suDung = useMemo(() => {
    const dauNgay = dauNgayVN(new Date()).getTime();
    const m: Record<string, { ngay: number; thang: number }> = {};
    for (const r of giuThang) {
      const x = (m[r.tac_tu_id] = m[r.tac_tu_id] ?? { ngay: 0, thang: 0 });
      x.thang += Number(r.so_tien);
      if (new Date(r.created_at).getTime() >= dauNgay) x.ngay += Number(r.so_tien);
    }
    return m;
  }, [giuThang]);

  const tenTacTu = useMemo(() => Object.fromEntries(dsTacTu.map((t) => [t.id, t.ten])), [dsTacTu]);
  const choDuyet = yeuCau.filter((y) => y.trang_thai === 'cho_duyet');
  const choTra = yeuCau.filter((y) => y.trang_thai === 'da_duyet');

  if (dangTai) {
    return (
      <p className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 size={15} className="animate-spin" /> Đang đọc agent và yêu cầu chi…
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Bot size={22} /> Kiểm soát chi của agent</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Agent xin chi qua MIMI. MIMI xét theo chính sách bạn đặt, hỏi bạn khi cần, dựng lệnh trả, rồi đối
            chiếu sao kê để biết tiền đã đi thật. <strong className="text-foreground">MIMI không giữ và không
            chuyển tiền</strong> — bạn trả bằng ứng dụng ngân hàng của mình.
          </p>
        </div>
        <button onClick={() => void tai()} className={`${nut} border border-border hover:bg-muted`}>
          <RefreshCw size={14} /> Tải lại
        </button>
      </div>

      {khoaMoi && <KhoaMoi ten={khoaMoi.ten} khoa={khoaMoi.khoa} dong={() => setKhoaMoi(null)} />}

      {/* ── Việc đang chờ mình ─────────────────────────────────────── */}
      {choDuyet.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">{choDuyet.length} khoản chờ bạn duyệt</h2>
          {choDuyet.map((y) => (
            <TheChoDuyet
              key={y.id}
              y={y}
              tenTacTu={tenTacTu[y.tac_tu_id] ?? 'Agent'}
              dangLam={dangLam === y.id}
              duyet={(themNguoiNhan) =>
                lam(y.id, 'duyet', { yeu_cau_id: y.id, them_nguoi_nhan: themNguoiNhan }, 'Đã duyệt. Mã QR để trả nằm ở mục dưới.')}
              tuChoi={(ghiChu) => lam(y.id, 'tu_choi', { yeu_cau_id: y.id, ghi_chu: ghiChu }, 'Đã từ chối.')}
            />
          ))}
        </section>
      )}

      {choTra.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">{choTra.length} lệnh đã duyệt, chờ bạn trả</h2>
          {choTra.map((y) => (
            <TheChoTra
              key={y.id}
              y={y}
              tenTacTu={tenTacTu[y.tac_tu_id] ?? 'Agent'}
              dangLam={dangLam === y.id}
              huy={() => lam(y.id, 'huy', { yeu_cau_id: y.id }, 'Đã huỷ lệnh trả.')}
            />
          ))}
        </section>
      )}

      {/* ── Agent ──────────────────────────────────────────────────── */}
      <section className={the}>
        <h2 className="text-sm font-semibold">Agent của bạn</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Mỗi agent một khoá riêng, một chính sách riêng. Agent mới mặc định phải xin duyệt mọi khoản và chỉ được
          chi cho người nhận trong danh sách — nới ra khi bạn đã tin nó.
        </p>
        <ThemTacTu
          dangLam={dangLam === 'tao'}
          tao={async (ten, moTa) => {
            const kq = await lam('tao', 'tao_tac_tu', { ten, mo_ta: moTa || null });
            if (kq?.khoa) setKhoaMoi({ ten, khoa: kq.khoa });
          }}
        />

        {dsTacTu.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Chưa có agent nào. Thêm một agent ở trên — ví dụ "Bot mua quảng cáo" hay "Trợ lý mua hàng" — rồi dán khoá
            vào cấu hình của nó.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {dsTacTu.map((t) => (
              <TheTacTu
                key={t.id}
                t={t}
                cs={chinhSach[t.id]}
                suDung={suDung[t.id] ?? { ngay: 0, thang: 0 }}
                dangLam={dangLam === t.id}
                doiTrangThai={(tt) => {
                  if (tt === 'thu_hoi' && !window.confirm(`Thu hồi "${t.ten}"? Khoá mất hiệu lực vĩnh viễn và mọi khoản chưa trả của agent này bị huỷ.`)) return;
                  void lam(t.id, 'doi_trang_thai', { tac_tu_id: t.id, trang_thai: tt }, 'Đã đổi trạng thái.');
                }}
                xoayKhoa={async () => {
                  if (!window.confirm(`Cấp khoá mới cho "${t.ten}"? Khoá cũ ngừng hoạt động ngay.`)) return;
                  const kq = await lam(t.id, 'xoay_khoa', { tac_tu_id: t.id });
                  if (kq?.khoa) setKhoaMoi({ ten: t.ten, khoa: kq.khoa });
                }}
                luu={(du) => lam(t.id, 'luu_chinh_sach', { tac_tu_id: t.id, ...du }, 'Đã lưu chính sách.')}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Người nhận ─────────────────────────────────────────────── */}
      <section className={the}>
        <h2 className="text-sm font-semibold">Người nhận được phép</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Agent chỉ chi được cho những tài khoản này (trừ khi chính sách của nó cho phép hỏi bạn khi gặp người lạ).
        </p>
        <ThemNguoiNhan
          dangLam={dangLam === 'nguoi_nhan'}
          them={(du) => lam('nguoi_nhan', 'them_nguoi_nhan', du, 'Đã thêm người nhận.')}
        />
        {nguoiNhan.length > 0 && (
          <ul className="mt-4 divide-y divide-border/60 text-sm">
            {nguoiNhan.map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  <span className="font-medium">{n.ten_chu_tai_khoan}</span>
                  <span className="text-muted-foreground"> · {tenNganHang(n.ngan_hang_bin)} · {n.so_tai_khoan}</span>
                  {n.ghi_chu && <span className="text-muted-foreground"> · {n.ghi_chu}</span>}
                </span>
                <button
                  onClick={() => {
                    if (window.confirm(`Bỏ ${n.ten_chu_tai_khoan} khỏi danh sách?`)) {
                      void lam(n.id, 'xoa_nguoi_nhan', { id: n.id }, 'Đã bỏ khỏi danh sách.');
                    }
                  }}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Bỏ người nhận"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Lịch sử và nhật ký ─────────────────────────────────────── */}
      <section className={the}>
        <h2 className="text-sm font-semibold">Yêu cầu chi gần đây</h2>
        {yeuCau.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Chưa có yêu cầu nào.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">Lúc</th>
                  <th className="py-2 pr-3 font-medium">Agent</th>
                  <th className="py-2 pr-3 font-medium">Mục đích</th>
                  <th className="py-2 pr-3 text-right font-medium">Số tiền</th>
                  <th className="py-2 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {yeuCau.map((y) => (
                  <tr key={y.id} className="align-top">
                    <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{luc(y.created_at)}</td>
                    <td className="py-2 pr-3">{tenTacTu[y.tac_tu_id] ?? '—'}</td>
                    <td className="py-2 pr-3">
                      {y.muc_dich}
                      {y.trang_thai === 'tu_choi' && (
                        <span className="block text-xs text-muted-foreground">{lyDoCua(y).map((l) => l.cau).join(' ')}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">{dong(y.so_tien)}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${TRANG_THAI[y.trang_thai]?.lop ?? ''}`}>
                        {TRANG_THAI[y.trang_thai]?.nhan ?? y.trang_thai}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={the}>
        <h2 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={15} /> Nhật ký</h2>
        <p className="mt-1 text-xs text-muted-foreground">Chỉ thêm, không sửa được — kể cả bởi MIMI.</p>
        {nhatKy.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Chưa có sự kiện nào.</p>
        ) : (
          <ul className="mt-3 space-y-1.5 text-xs">
            {nhatKy.map((n) => (
              <li key={n.id} className="flex gap-3">
                <span className="w-24 shrink-0 text-muted-foreground">{luc(n.created_at)}</span>
                <span className="w-20 shrink-0 text-muted-foreground">
                  {n.nguoi === 'tac_tu' ? 'agent' : n.nguoi === 'he_thong' ? 'sao kê' : 'bạn'}
                </span>
                <span className="min-w-0">
                  <span className="font-medium">{SU_KIEN[n.su_kien] ?? n.su_kien}</span>
                  {n.tac_tu_id && tenTacTu[n.tac_tu_id] ? ` · ${tenTacTu[n.tac_tu_id]}` : ''}
                  {chiTietNhatKy(n) && <span className="text-muted-foreground"> · {chiTietNhatKy(n)}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function KhoaMoi({ ten, khoa, dong: dongLai }: { ten: string; khoa: string; dong: () => void }) {
  const viDu = `curl -X POST ${DIEM_GOI} \\
  -H "x-mimi-agent-key: ${khoa}" \\
  -H "Content-Type: application/json" \\
  -d '{"hanh_dong":"xin_chi","so_tien":500000,"ngan_hang_bin":"970422","so_tai_khoan":"0123456789","nhom_chi":"ha_tang_ai","muc_dich":"Nạp tiền API tháng này","ma_yeu_cau":"don-001"}'`;
  const lenhClaude = `claude mcp add --transport http mimi ${DIEM_MCP} --header "x-mimi-agent-key: ${khoa}"`;
  const cauHinhCursor = JSON.stringify(
    { mcpServers: { mimi: { url: DIEM_MCP, headers: { 'x-mimi-agent-key': khoa } } } },
    null,
    2,
  );
  const chep = (s: string) =>
    navigator.clipboard.writeText(s).then(() => toast.success('Đã chép.'), () => toast.error('Không chép được — bôi đen rồi chép tay.'));

  return (
    <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold"><KeyRound size={15} /> Khoá của "{ten}"</p>
        <button onClick={dongLai} aria-label="Đóng" className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Khoá chỉ hiện <strong>một lần</strong>. MIMI chỉ lưu bản băm nên không xem lại được — mất thì cấp khoá mới.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg bg-background px-3 py-2 font-mono text-xs">{khoa}</code>
        <button onClick={() => chep(khoa)} className={`${nut} border border-border hover:bg-muted`}><Copy size={14} /> Chép</button>
      </div>
      <div className="mt-4 rounded-xl bg-background p-4">
        <p className="text-xs font-semibold">Cách dễ nhất: nối qua MCP — không cần viết code</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Dán một dòng dưới đây vào công cụ AI. Trợ lý sẽ tự thấy các việc "xem hạn mức", "xin chi", "xem yêu cầu".
        </p>
        <p className="mt-3 text-[11px] font-medium text-muted-foreground">Claude Code — dán vào Terminal</p>
        <div className="mt-1 flex items-start gap-2">
          <pre className="flex-1 overflow-x-auto rounded-lg bg-muted/50 p-2 text-[11px]">{lenhClaude}</pre>
          <button onClick={() => chep(lenhClaude)} className={`${nut} border border-border hover:bg-muted`}><Copy size={13} /></button>
        </div>
        <p className="mt-3 text-[11px] font-medium text-muted-foreground">Cursor — dán vào file mcp.json</p>
        <div className="mt-1 flex items-start gap-2">
          <pre className="flex-1 overflow-x-auto rounded-lg bg-muted/50 p-2 text-[11px]">{cauHinhCursor}</pre>
          <button onClick={() => chep(cauHinhCursor)} className={`${nut} border border-border hover:bg-muted`}><Copy size={13} /></button>
        </div>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground">Dành cho lập trình viên: gọi API trực tiếp</summary>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-background p-3 text-[11px] leading-relaxed">{viDu}</pre>
        <p className="mt-2 text-xs text-muted-foreground">
          Hành động của agent: <code>xem_chinh_sach</code>, <code>xin_chi</code>, <code>xem_yeu_cau</code>. Gửi cùng{' '}
          <code>ma_yeu_cau</code> khi thử lại để không sinh khoản chi thứ hai.
        </p>
      </details>
    </div>
  );
}

function ThemTacTu({ tao, dangLam }: { tao: (ten: string, moTa: string) => void; dangLam: boolean }) {
  const [ten, setTen] = useState('');
  const [moTa, setMoTa] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        tao(ten.trim(), moTa.trim());
        setTen('');
        setMoTa('');
      }}
      className="mt-3 flex flex-col gap-2 sm:flex-row"
    >
      <input value={ten} onChange={(e) => setTen(e.target.value)} placeholder="Tên agent" maxLength={80} className={o} />
      <input value={moTa} onChange={(e) => setMoTa(e.target.value)} placeholder="Nó làm gì (không bắt buộc)" maxLength={300} className={o} />
      <button disabled={dangLam || ten.trim().length < 2} className={`${nut} shrink-0 bg-primary text-primary-foreground hover:bg-primary/90`}>
        {dangLam ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Thêm agent
      </button>
    </form>
  );
}

function ThanhDung({ nhan, da, tran }: { nhan: string; da: number; tran: number }) {
  const pct = tran > 0 ? Math.min(100, (da / tran) * 100) : 100;
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{nhan}</span>
        <span className="font-mono">{dong(da)} / {dong(tran)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${pct >= 90 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TheTacTu({
  t, cs, suDung, dangLam, doiTrangThai, xoayKhoa, luu,
}: {
  t: TacTu;
  cs: ChinhSachRow | undefined;
  suDung: { ngay: number; thang: number };
  dangLam: boolean;
  doiTrangThai: (tt: 'hoat_dong' | 'tam_dung' | 'thu_hoi') => void;
  xoayKhoa: () => void;
  luu: (du: Record<string, unknown>) => void;
}) {
  const [mo, setMo] = useState(false);
  const daThuHoi = t.trang_thai === 'thu_hoi';

  return (
    <div className={`rounded-xl border border-border/60 p-4 ${daThuHoi ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{t.ten}</p>
          <p className="text-xs text-muted-foreground">
            {TRANG_THAI_TAC_TU[t.trang_thai] ?? t.trang_thai} · khoá <code>{t.khoa_hien}</code> · gọi lần cuối {luc(t.dung_lan_cuoi)}
          </p>
          {t.mo_ta && <p className="mt-1 text-xs text-muted-foreground">{t.mo_ta}</p>}
        </div>
        {!daThuHoi && (
          <div className="flex flex-wrap gap-1.5">
            {t.trang_thai === 'hoat_dong' ? (
              <button disabled={dangLam} onClick={() => doiTrangThai('tam_dung')} className={`${nut} border border-border hover:bg-muted`}>
                <Pause size={13} /> Tạm dừng
              </button>
            ) : (
              <button disabled={dangLam} onClick={() => doiTrangThai('hoat_dong')} className={`${nut} border border-border hover:bg-muted`}>
                <Play size={13} /> Bật lại
              </button>
            )}
            <button disabled={dangLam} onClick={xoayKhoa} className={`${nut} border border-border hover:bg-muted`}>
              <KeyRound size={13} /> Khoá mới
            </button>
            <button disabled={dangLam} onClick={() => doiTrangThai('thu_hoi')} className={`${nut} border border-destructive/40 text-destructive hover:bg-destructive/10`}>
              Thu hồi
            </button>
          </div>
        )}
      </div>

      {cs && (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ThanhDung nhan="Hôm nay" da={suDung.ngay} tran={cs.han_muc_ngay} />
            <ThanhDung nhan="Tháng này" da={suDung.thang} tran={cs.han_muc_thang} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Mỗi khoản tối đa {dong(cs.han_muc_moi_lan)} ·{' '}
            {cs.nguong_can_duyet === 0 ? 'mọi khoản phải duyệt' : `trên ${dong(cs.nguong_can_duyet)} phải duyệt`} ·{' '}
            {cs.nhom_chi_duoc_phep ? cs.nhom_chi_duoc_phep.map((n) => TEN_NHOM_CHI[n as NhomChi] ?? n).join(', ') : 'mọi nhóm chi'} ·{' '}
            {cs.chi_tra_nguoi_nhan_da_duyet ? 'chỉ người nhận trong danh sách' : 'người lạ thì hỏi bạn'}
            {cs.het_han ? ` · hết hạn ${luc(cs.het_han)}` : ''}
          </p>
          {!daThuHoi && (
            <button onClick={() => setMo((v) => !v)} className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
              Sửa chính sách <ChevronDown size={12} className={mo ? 'rotate-180' : ''} />
            </button>
          )}
          {mo && <SuaChinhSach cs={cs} dangLam={dangLam} luu={(du) => { luu(du); setMo(false); }} />}
        </>
      )}
    </div>
  );
}

function SuaChinhSach({ cs, dangLam, luu }: { cs: ChinhSachRow; dangLam: boolean; luu: (du: Record<string, unknown>) => void }) {
  const [moiLan, setMoiLan] = useState(String(cs.han_muc_moi_lan));
  const [ngay, setNgay] = useState(String(cs.han_muc_ngay));
  const [thang, setThang] = useState(String(cs.han_muc_thang));
  const [nguong, setNguong] = useState(String(cs.nguong_can_duyet));
  const [moiNhom, setMoiNhom] = useState(cs.nhom_chi_duoc_phep === null);
  const [nhom, setNhom] = useState<string[]>(cs.nhom_chi_duoc_phep ?? []);
  const [chiDaDuyet, setChiDaDuyet] = useState(cs.chi_tra_nguoi_nhan_da_duyet);
  const [hetHan, setHetHan] = useState(cs.het_han ? cs.het_han.slice(0, 10) : '');

  const O = ({ nhan, gia, dat }: { nhan: string; gia: string; dat: (s: string) => void }) => (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{nhan}</span>
      <input value={gia} onChange={(e) => dat(e.target.value)} inputMode="numeric" className={o} />
      <span className="mt-0.5 block text-[11px] text-muted-foreground">{dong(soTu(gia))}</span>
    </label>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        luu({
          han_muc_moi_lan: soTu(moiLan),
          han_muc_ngay: soTu(ngay),
          han_muc_thang: soTu(thang),
          nguong_can_duyet: soTu(nguong),
          nhom_chi_duoc_phep: moiNhom ? null : nhom,
          chi_tra_nguoi_nhan_da_duyet: chiDaDuyet,
          het_han: hetHan ? new Date(`${hetHan}T23:59:59+07:00`).toISOString() : null,
        });
      }}
      className="mt-3 space-y-3 rounded-xl bg-muted/30 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-4">
        {O({ nhan: 'Mỗi khoản tối đa', gia: moiLan, dat: setMoiLan })}
        {O({ nhan: 'Mỗi ngày tối đa', gia: ngay, dat: setNgay })}
        {O({ nhan: 'Mỗi tháng tối đa', gia: thang, dat: setThang })}
        {O({ nhan: 'Trên mức này phải duyệt (0 = mọi khoản)', gia: nguong, dat: setNguong })}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={moiNhom} onChange={(e) => setMoiNhom(e.target.checked)} /> Mọi nhóm chi
        </label>
        {!moiNhom && (
          <div className="mt-2 flex flex-wrap gap-3">
            {NHOM_CHI.map((n) => (
              <label key={n} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={nhom.includes(n)}
                  onChange={(e) => setNhom((cu) => (e.target.checked ? [...cu, n] : cu.filter((x) => x !== n)))}
                />
                {TEN_NHOM_CHI[n]}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Người nhận lạ</span>
          <select value={chiDaDuyet ? 'chan' : 'hoi'} onChange={(e) => setChiDaDuyet(e.target.value === 'chan')} className={o}>
            <option value="chan">Từ chối — chỉ chi cho người trong danh sách</option>
            <option value="hoi">Hỏi tôi duyệt</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Chính sách hết hạn (không bắt buộc)</span>
          <input type="date" value={hetHan} onChange={(e) => setHetHan(e.target.value)} className={o} />
        </label>
      </div>

      <button disabled={dangLam} className={`${nut} bg-primary text-primary-foreground hover:bg-primary/90`}>
        {dangLam ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Lưu chính sách
      </button>
    </form>
  );
}

function ThemNguoiNhan({ them, dangLam }: { them: (du: Record<string, unknown>) => void; dangLam: boolean }) {
  const [bin, setBin] = useState(DANH_SACH_NGAN_HANG[0]?.bin ?? '');
  const [stk, setStk] = useState('');
  const [ten, setTen] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        them({ ngan_hang_bin: bin, so_tai_khoan: stk, ten_chu_tai_khoan: ten, ghi_chu: ghiChu || null });
        setStk('');
        setTen('');
        setGhiChu('');
      }}
      className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
    >
      <select value={bin} onChange={(e) => setBin(e.target.value)} className={o}>
        {DANH_SACH_NGAN_HANG.map((n) => <option key={n.bin} value={n.bin}>{n.ten}</option>)}
      </select>
      <input value={stk} onChange={(e) => setStk(e.target.value)} placeholder="Số tài khoản" inputMode="numeric" className={o} />
      <input value={ten} onChange={(e) => setTen(e.target.value)} placeholder="Tên chủ tài khoản" className={o} />
      <input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="Ghi chú" className={o} />
      <button disabled={dangLam || stk.length < 6 || ten.trim().length < 2} className={`${nut} bg-primary text-primary-foreground hover:bg-primary/90`}>
        <Plus size={14} /> Thêm
      </button>
    </form>
  );
}

function NguoiNhanDong({ y }: { y: YeuCau }) {
  return (
    <p className="text-sm">
      Tới <span className="font-medium">{y.ten_nguoi_nhan ?? 'chưa rõ tên'}</span>
      <span className="text-muted-foreground"> · {tenNganHang(y.ngan_hang_bin)} · {y.so_tai_khoan}</span>
    </p>
  );
}

function TheChoDuyet({
  y, tenTacTu, dangLam, duyet, tuChoi,
}: {
  y: YeuCau;
  tenTacTu: string;
  dangLam: boolean;
  duyet: (themNguoiNhan: boolean) => void;
  tuChoi: (ghiChu: string) => void;
}) {
  const nguoiLa = lyDoCua(y).some((l) => l.ma === 'NGUOI_NHAN_MOI');
  const [themNguoiNhan, setThemNguoiNhan] = useState(false);
  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xl font-bold">{dong(y.so_tien)}</p>
        <p className="text-xs text-muted-foreground">{tenTacTu} · {luc(y.created_at)}</p>
      </div>
      <p className="mt-1 text-sm">{y.muc_dich}</p>
      <NguoiNhanDong y={y} />
      <p className="text-xs text-muted-foreground">
        {TEN_NHOM_CHI[y.nhom_chi as NhomChi] ?? y.nhom_chi}{y.so_hoa_don ? ` · hoá đơn ${y.so_hoa_don}` : ''}
      </p>
      <ul className="mt-2 space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
        {lyDoCua(y).map((l) => <li key={l.ma}>• {l.cau}</li>)}
      </ul>
      {nguoiLa && (
        <label className="mt-2 flex items-center gap-2 text-xs">
          <input type="checkbox" checked={themNguoiNhan} onChange={(e) => setThemNguoiNhan(e.target.checked)} />
          Tôi đã kiểm đúng tài khoản — thêm vào danh sách người nhận được phép
        </label>
      )}
      <div className="mt-3 flex gap-2">
        <button disabled={dangLam} onClick={() => duyet(themNguoiNhan)} className={`${nut} bg-primary text-primary-foreground hover:bg-primary/90`}>
          {dangLam ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Duyệt
        </button>
        <button
          disabled={dangLam}
          onClick={() => {
            const ghiChu = window.prompt('Lý do từ chối (agent sẽ đọc được):', '');
            if (ghiChu !== null) tuChoi(ghiChu);
          }}
          className={`${nut} border border-border hover:bg-muted`}
        >
          <X size={14} /> Từ chối
        </button>
      </div>
    </div>
  );
}

function TheChoTra({ y, tenTacTu, dangLam, huy }: { y: YeuCau; tenTacTu: string; dangLam: boolean; huy: () => void }) {
  const [hienQr, setHienQr] = useState(false);
  const quaHan = y.het_han_luc ? new Date(y.het_han_luc).getTime() < Date.now() : false;
  return (
    <div className={the}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xl font-bold">{dong(y.so_tien)}</p>
        <p className="text-xs text-muted-foreground">
          {tenTacTu} · {y.cach_quyet === 'tu_dong' ? 'tự duyệt theo chính sách' : 'bạn đã duyệt'} · {luc(y.quyet_luc)}
        </p>
      </div>
      <p className="mt-1 text-sm">{y.muc_dich}</p>
      <NguoiNhanDong y={y} />
      <p className="mt-1 text-xs text-muted-foreground">
        Nội dung chuyển khoản: <code className="font-semibold text-foreground">{y.ma_tham_chieu}</code> — giữ nguyên để sao kê
        tự xác nhận đã chi.
        {quaHan && <span className="text-amber-600"> Lệnh đã quá 72 giờ — kiểm lại trước khi trả.</span>}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => setHienQr((v) => !v)} className={`${nut} bg-primary text-primary-foreground hover:bg-primary/90`}>
          <QrCode size={14} /> {hienQr ? 'Ẩn mã QR' : 'Trả bằng mã QR'}
        </button>
        <button disabled={dangLam} onClick={huy} className={`${nut} border border-border hover:bg-muted`}>
          <X size={14} /> Huỷ lệnh
        </button>
      </div>
      {hienQr && <MaQrTra y={y} />}
    </div>
  );
}

function MaQrTra({ y }: { y: YeuCau }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      const chuoi = taoChuoiVietQr({
        bankBin: y.ngan_hang_bin,
        accountNumber: y.so_tai_khoan,
        amount: y.so_tien,
        addInfo: y.ma_tham_chieu,
      });
      QRCode.toCanvas(ref.current, chuoi, { width: 220, margin: 1 }, (e) => {
        if (e) setLoi('Không vẽ được mã QR.');
      });
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Không dựng được mã VietQR.');
    }
  }, [y]);

  return (
    <div className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center">
      <canvas ref={ref} className="rounded-lg bg-white p-2" />
      <p className="max-w-xs text-xs text-muted-foreground">
        {loi ?? 'Quét bằng ứng dụng ngân hàng của bạn. Kiểm tên người nhận ứng dụng hiện ra trước khi xác nhận. Sao kê về tới MIMI thì khoản này tự chuyển sang "Đã chi".'}
      </p>
    </div>
  );
}
