import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Check, FileUp, KeyRound, Loader2, Plug, RefreshCw, ShieldCheck, Trash2, Wallet, X } from 'lucide-react';
import { toast } from 'sonner';
import claudeLogo from '@/assets/logos/claude.webp';
import geminiLogo from '@/assets/logos/gemini.png';
import { goiChiPhiAi as goi } from '@/lib/goiChiPhiAi';
import { LoiGoiHam } from '@/lib/loiGoiHam';
import {
  THU_TU_NCC, TEN_NCC, cauTomTatChiPhi, chuoiTheoNgay, tongQuan, topHangMuc, usd, viecCanLamChiPhi,
  type DongChiPhiAi, type NganSachAi, type NgayChiPhi, type NhaCungCapAi,
} from '@/lib/chiPhiAi';
import {
  chuyenBang, doanAnhXa, doanDinhDangNgay, tachCsv, tomTatNhap, type AnhXaCot, type DinhDangNgay, type DongNhap,
} from '@/lib/csvChiPhi';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LoiTroLy, type ViecTroLy } from '@/components/tro-ly/LoiTroLy';

/**
 * Chi phí AI — chi phí THẬT của OpenAI, Anthropic, Gemini, theo ngày, bằng USD.
 *
 * Không ước tính từ số token. Mọi số lấy từ nhà cung cấp qua một trong hai đường
 * người dùng chọn: nhập file CSV xuất từ trang chi phí (mặc định, không lưu khoá),
 * hoặc Admin API key cho Anthropic/OpenAI (tuỳ chọn, tự đồng bộ). Gemini không có
 * API chi phí nên chỉ nhập file. Ngày là ngày UTC, đúng cách nhà cung cấp chia.
 *
 * Logo OpenAI chưa dùng: bản đã tải có watermark stock chưa trả phí, nên thẻ OpenAI
 * hiện chữ cho tới khi có bản chính thức.
 */

type NccApi = 'anthropic' | 'openai';

interface KetNoi {
  id: string;
  nha_cung_cap: NccApi;
  khoa_hien: string;
  trang_thai: 'hoat_dong' | 'loi';
  dong_bo_luc: string | null;
  du_lieu_toi: string | null;
  loi_cuoi: string | null;
}

interface LoNhap {
  id: string;
  nha_cung_cap: NhaCungCapAi;
  ten_file: string;
  so_dong: number;
  tu_ngay: string;
  den_ngay: string;
  tong_usd: number;
  created_at: string;
}

interface DuLieu {
  chi_phi: DongChiPhiAi[];
  ket_noi: KetNoi[];
  lo_nhap: LoNhap[];
  ngan_sach: NganSachAi | null;
}

interface XacNhan {
  tieuDe: string;
  mo: string;
  nut: string;
  nguyHiem?: boolean;
  lam: () => void;
}

/* ── Kiểu dáng (cùng hệ với màn Kiểm soát chi) ─────────────────────── */
const vien = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const vienTrong = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';
const nutGoc = `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 sm:min-h-9 ${vien}`;
const nutChinh = `${nutGoc} bg-foreground text-background hover:bg-foreground/85`;
const nutPhu = `${nutGoc} border border-border bg-card text-foreground hover:bg-accent`;
const nutNhoPhu = `inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50 ${vien}`;
const o = `w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground ${vien}`;
const khoi = 'rounded-lg border border-border bg-card';
const nhanNho = 'text-[11px] font-medium uppercase tracking-wide text-muted-foreground';
const nhanTruong = 'mb-1 block text-xs font-medium text-muted-foreground';

/**
 * Màu nhà cung cấp theo bảng màu phân loại của dataviz, thứ tự cố định (màu đi theo
 * nhà cung cấp, không theo thứ hạng). Bộ bốn này đã chạy validator cho cặp liền kề,
 * sáng và tối. Chữ không bao giờ mang màu dữ liệu — màu chỉ ở ô màu bên cạnh.
 */
const MAU_NCC: Record<NhaCungCapAi, string> = {
  openai: 'bg-[#2a78d6] dark:bg-[#3987e5]',
  anthropic: 'bg-[#eb6834] dark:bg-[#d95926]',
  gemini: 'bg-[#1baf7a] dark:bg-[#199e70]',
  khac: 'bg-[#eda100] dark:bg-[#c98500]',
};

const ngayVN = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—');
const luc = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—';
const thongDiep = (e: unknown) => (e instanceof Error ? e.message : 'Không thực hiện được.');

export default function ChiPhiAiPage() {
  const [duLieu, setDuLieu] = useState<DuLieu | null>(null);
  const [loiTai, setLoiTai] = useState<string | null>(null);
  const [dangLam, setDangLam] = useState<string | null>(null);
  const [mo, setMo] = useState<'nhap' | 'ket_noi' | 'ngan_sach' | null>(null);
  const [nccNhap, setNccNhap] = useState<NhaCungCapAi>('openai');
  const [nccKetNoi, setNccKetNoi] = useState<NccApi>('anthropic');
  const [xacNhan, setXacNhan] = useState<XacNhan | null>(null);

  const tai = useCallback(async () => {
    try {
      const kq = await goi('doc');
      setDuLieu({
        chi_phi: (kq.chi_phi ?? []) as DongChiPhiAi[],
        ket_noi: (kq.ket_noi ?? []) as KetNoi[],
        lo_nhap: (kq.lo_nhap ?? []) as LoNhap[],
        ngan_sach: (kq.ngan_sach ?? null) as NganSachAi | null,
      });
      setLoiTai(null);
    } catch (e) {
      setLoiTai(thongDiep(e));
    }
  }, []);

  useEffect(() => { void tai(); }, [tai]);

  const lam = async (nhan: string, hanhDong: string, du: Record<string, unknown>, thanhCong?: string) => {
    setDangLam(nhan);
    try {
      const kq = await goi(hanhDong, du);
      if (thanhCong) toast.success(thanhCong);
      await tai();
      return kq;
    } catch (e) {
      toast.error(thongDiep(e));
      return null;
    } finally {
      setDangLam(null);
    }
  };

  const nhapFile = async (ncc: NhaCungCapAi, tenFile: string, dong: DongNhap[], thayThe: boolean) => {
    setDangLam('nhap');
    try {
      const kq = await goi('nhap_file', { nha_cung_cap: ncc, ten_file: tenFile, dong, thay_the: thayThe });
      toast.success(`Đã nhập ${Number(kq.lo_nhap?.so_dong ?? dong.length).toLocaleString('vi-VN')} dòng chi phí ${TEN_NCC[ncc]}.`);
      setMo(null);
      await tai();
    } catch (e) {
      const trung = e instanceof LoiGoiHam && e.status === 409 && Array.isArray(e.body.trung)
        ? (e.body.trung as Array<{ ten_file: string; tu_ngay: string; den_ngay: string }>)
        : null;
      if (trung) {
        setXacNhan({
          tieuDe: 'Thay thế lần nhập trùng khoảng ngày?',
          mo: `Đã có ${trung.length} lần nhập ${TEN_NCC[ncc]} trùng khoảng ngày: ${trung
            .map((t) => `${t.ten_file} (${ngayVN(t.tu_ngay)}–${ngayVN(t.den_ngay)})`)
            .join('; ')}. Giữ cả hai là cộng chi phí hai lần. Thay thế sẽ xoá các lần nhập đó rồi nhập file mới.`,
          nut: 'Thay thế',
          nguyHiem: true,
          lam: () => { void nhapFile(ncc, tenFile, dong, true); },
        });
      } else {
        toast.error(thongDiep(e));
      }
    } finally {
      setDangLam(null);
    }
  };

  const ketNoi = async (ncc: NccApi, khoa: string) => {
    const kq = await lam('ket_noi', 'ket_noi', { nha_cung_cap: ncc, khoa });
    if (!kq) return;
    setMo(null);
    const db = kq.dong_bo as { so_dong?: number; loi?: string } | undefined;
    if (db?.loi) toast.warning(`Đã bật tự động cho ${TEN_NCC[ncc]}, nhưng lần lấy số liệu đầu chưa được: ${db.loi}`);
    else toast.success(`Đã bật tự động cho ${TEN_NCC[ncc]} — lấy được chi phí 31 ngày gần nhất.`);
  };

  const dongBo = async (ncc: NccApi) => {
    const kq = await lam(`dong_bo_${ncc}`, 'dong_bo', { nha_cung_cap: ncc });
    const r = (kq?.ket_qua as Array<{ so_dong?: number; loi?: string }> | undefined)?.[0];
    if (!r) return;
    if (r.loi) toast.warning(r.loi);
    else toast.success(`Đã cập nhật số liệu ${TEN_NCC[ncc]}.`);
  };

  if (!duLieu) {
    return loiTai ? (
      <div className="mx-auto max-w-2xl py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Chi phí AI</h1>
        <p className="mt-2 text-sm text-muted-foreground">Không đọc được dữ liệu chi phí AI: {loiTai}</p>
        <button onClick={() => void tai()} className={`${nutPhu} mt-4`}><RefreshCw size={15} /> Thử lại</button>
      </div>
    ) : (
      <p className="flex items-center gap-2 py-16 text-sm text-muted-foreground" role="status">
        <Loader2 size={15} className="animate-spin" /> Đang đọc chi phí AI…
      </p>
    );
  }

  const now = new Date();
  const tq = tongQuan(duLieu.chi_phi, now, duLieu.ngan_sach);
  const chuoi = chuoiTheoNgay(duLieu.chi_phi, now);
  const top = topHangMuc(duLieu.chi_phi, now);
  const chuaCoGi = !tq.coDuLieu && duLieu.ket_noi.length === 0 && duLieu.lo_nhap.length === 0;
  const moNhap = (ncc: NhaCungCapAi) => { setNccNhap(ncc); setMo('nhap'); };
  const moKetNoi = (ncc: NccApi) => { setNccKetNoi(ncc); setMo('ket_noi'); };

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-16">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <nav aria-label="Đường dẫn">
            <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <li>Agent</li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-foreground">Chi phí AI</li>
            </ol>
          </nav>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Chi phí AI</h1>
          <p className="mt-1 truncate text-sm text-muted-foreground" title="Bạn đã trả bao nhiêu cho OpenAI, Anthropic và Gemini — đúng số nhà cung cấp tính, bằng USD.">
            Bạn đã trả bao nhiêu cho OpenAI, Anthropic và Gemini — đúng số nhà cung cấp tính, bằng USD.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <button onClick={() => moKetNoi('anthropic')} className={nutPhu}><Plug size={15} /> Tự động lấy số liệu</button>
          <button onClick={() => moNhap('openai')} className={nutChinh}><FileUp size={15} /> Tải file chi phí</button>
        </div>
      </header>

      <LoiTroLy
        cau={cauTomTatChiPhi(tq, now)}
        viec={viecCanLamChiPhi(tq, now, duLieu.ket_noi.filter((k) => k.trang_thai === 'loi')).map((v): ViecTroLy => ({
          khoa: v.khoa,
          cau: v.cau,
          hanhDong:
            v.loai === 'lay_tu_dong_loi' && (v.ncc === 'openai' || v.ncc === 'anthropic')
              ? { nhan: 'Nhập lại khoá', lam: () => moKetNoi(v.ncc as NccApi) }
              : v.loai === 'so_lieu_cu'
                ? { nhan: 'Tải file mới', lam: () => moNhap('openai') }
                : { nhan: v.loai === 'dat_ngan_sach' ? 'Đặt ngân sách' : 'Xem ngân sách', lam: () => setMo('ngan_sach') },
        }))}
      />

      {/* ── KPI ─────────────────────────────────────────────────────── */}
      <section aria-label="Chỉ số chi phí AI" className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4">
        <TheChiSo nhan="Chi phí AI tháng này" trong={tq.coDuLieu ? null : 'Chưa có dữ liệu chi phí'} gia={usd(tq.thangNay)}
          phu={tq.thayDoiPhanTram !== null ? (
            <span className="inline-flex items-center gap-1">
              {tq.thayDoiPhanTram >= 0 ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />}
              {Math.abs(tq.thayDoiPhanTram).toFixed(0)}% so với cùng kỳ tháng trước ({usd(tq.cungKyThangTruoc ?? 0)})
            </span>
          ) : 'Chưa có dữ liệu tháng trước để so'} />
        <TheChiSo nhan="7 ngày gần nhất" trong={tq.coDuLieu ? null : 'Chưa có dữ liệu chi phí'} gia={usd(tq.bayNgay)}
          phu="Tính cả hôm nay" />
        {tq.nganSach ? (
          <TheChiSo
            nhan="Ngân sách tháng còn lại"
            gia={tq.nganSach.vuot ? `Vượt ${usd(-tq.nganSach.conLai)}` : usd(tq.nganSach.conLai)}
            trong={null}
            thanh={Math.min(100, tq.nganSach.phanTram)}
            canhBao={tq.nganSach.canhBao}
            phu={`Đã dùng ${tq.nganSach.phanTram.toFixed(0)}% của ${usd(tq.nganSach.han)}`}
            bam={() => setMo('ngan_sach')}
          />
        ) : (
          <TheChiSo nhan="Ngân sách tháng" gia="" trong="Chưa đặt ngân sách — bấm để đặt" bam={() => setMo('ngan_sach')} />
        )}
        <TheChiSo nhan="Số liệu cập nhật đến" trong={tq.duLieuToi ? null : 'Chưa có số liệu'} gia={ngayVN(tq.duLieuToi)}
          phu={`${duLieu.ket_noi.length} nhà cung cấp tự động · ${duLieu.lo_nhap.length} file đã tải`} />
      </section>

      {chuaCoGi ? (
        <section aria-labelledby="bat-dau" className={`${khoi} p-6`}>
          <h2 id="bat-dau" className="text-lg font-semibold text-foreground">Chưa có dữ liệu chi phí AI</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            MIMI không tự ước tính — chỉ ghi đúng số nhà cung cấp tính cho bạn. Chọn một trong hai cách:
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><FileUp size={16} /> Tải file báo cáo chi phí</p>
              <p className="mt-1 text-xs text-muted-foreground">Tải file CSV báo cáo chi phí từ tài khoản của nhà cung cấp. Không cần đưa khoá nào. Dùng được cho cả Gemini.</p>
              <button onClick={() => moNhap('openai')} className={`${nutChinh} mt-3`}>Tải file chi phí</button>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><Plug size={16} /> Tự động lấy số liệu</p>
              <p className="mt-1 text-xs text-muted-foreground">MIMI tự lấy chi phí OpenAI và Anthropic khi bạn bấm Cập nhật. Cần khoá quản trị của tài khoản — khoá này có quyền rất rộng, chỉ dùng khi bạn chấp nhận.</p>
              <button onClick={() => moKetNoi('anthropic')} className={`${nutPhu} mt-3`}>Tự động lấy số liệu</button>
            </div>
          </div>
        </section>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-5">
            <section aria-labelledby="bd-ngay" className={`${khoi} p-4`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="bd-ngay" className="text-sm font-semibold text-foreground">Chi phí theo ngày — tháng này</h2>
                <p className="text-xs text-muted-foreground">USD</p>
              </div>
              <BieuDoTheoNgay ds={chuoi} />
            </section>

            <section aria-labelledby="bang-hang-muc">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h2 id="bang-hang-muc" className="text-sm font-semibold text-foreground">Tốn nhiều nhất tháng này</h2>
                <p className="text-xs text-muted-foreground">Theo mô hình hoặc dịch vụ</p>
              </div>
              <BangHangMuc ds={top} />
            </section>
          </div>

          <aside className="space-y-5" aria-label="Nguồn dữ liệu">
            <section aria-labelledby="nguon" className={khoi}>
              <h2 id="nguon" className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">Nguồn dữ liệu</h2>
              <ul className="divide-y divide-border">
                {(['openai', 'anthropic', 'gemini'] as const).map((ncc) => (
                  <li key={ncc}>
                    <TheNguon
                      ncc={ncc}
                      ketNoi={duLieu.ket_noi.find((k) => k.nha_cung_cap === ncc)}
                      soLanNhap={duLieu.lo_nhap.filter((l) => l.nha_cung_cap === ncc).length}
                      tongThang={tq.theoNcc.find((x) => x.ncc === ncc)?.tong ?? 0}
                      dangLam={dangLam}
                      dongBo={dongBo}
                      moKetNoi={moKetNoi}
                      moNhap={moNhap}
                      goKetNoi={(n) => setXacNhan({
                        tieuDe: `Tắt tự động lấy số liệu ${TEN_NCC[n]}?`,
                        mo: 'MIMI xoá khoá đã lưu và thôi tự lấy số liệu. Số liệu đã có vẫn giữ nguyên. Khoá vẫn dùng được ở phía nhà cung cấp — nên vô hiệu hoá khoá trong tài khoản của họ nếu không dùng nữa.',
                        nut: 'Tắt tự động',
                        nguyHiem: true,
                        lam: () => { void lam(`go_${n}`, 'go_ket_noi', { nha_cung_cap: n }, `Đã tắt tự động lấy số liệu ${TEN_NCC[n]}.`); },
                      })}
                    />
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="lan-nhap" className={khoi}>
              <h2 id="lan-nhap" className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">File đã tải</h2>
              {duLieu.lo_nhap.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted-foreground">Chưa tải file nào.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {duLieu.lo_nhap.map((l) => (
                    <li key={l.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground" title={l.ten_file}>{l.ten_file}</p>
                        <p className="text-xs text-muted-foreground">
                          {TEN_NCC[l.nha_cung_cap]} · {ngayVN(l.tu_ngay)}–{ngayVN(l.den_ngay)} · {l.so_dong.toLocaleString('vi-VN')} dòng
                        </p>
                        <p className="text-xs tabular-nums text-foreground">{usd(l.tong_usd)}</p>
                      </div>
                      <button
                        aria-label={`Xoá lần nhập ${l.ten_file}`}
                        disabled={dangLam === l.id}
                        onClick={() => setXacNhan({
                          tieuDe: `Xoá lần nhập "${l.ten_file}"?`,
                          mo: `Xoá ${l.so_dong.toLocaleString('vi-VN')} dòng chi phí ${TEN_NCC[l.nha_cung_cap]} (${usd(l.tong_usd)}) đã nhập từ file này. Không hoàn tác được.`,
                          nut: 'Xoá lần nhập',
                          nguyHiem: true,
                          lam: () => { void lam(l.id, 'xoa_lo_nhap', { id: l.id }, 'Đã xoá lần nhập.'); },
                        })}
                        className={`${nutNhoPhu} w-8 shrink-0 px-0 text-muted-foreground hover:text-destructive`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className={`${khoi} flex items-start gap-2 p-3 text-xs text-muted-foreground`}>
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-foreground" />
              Mọi số ở đây do nhà cung cấp tính. Cùng một ngày có cả số lấy tự động và số từ file thì chỉ tính số lấy tự động, để không cộng hai lần.
            </p>
          </aside>
        </div>
      )}

      <Sheet open={mo === 'nhap'} onOpenChange={(m) => { if (!m) setMo(null); }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {mo === 'nhap' && (
            <FormNhapFile nccBanDau={nccNhap} dangGui={dangLam === 'nhap'} gui={(ncc, ten, dong) => void nhapFile(ncc, ten, dong, false)} />
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={mo === 'ket_noi'} onOpenChange={(m) => { if (!m) setMo(null); }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {mo === 'ket_noi' && (
            <FormKetNoi nccBanDau={nccKetNoi} dangGui={dangLam === 'ket_noi'} gui={(ncc, khoa) => void ketNoi(ncc, khoa)} />
          )}
        </SheetContent>
      </Sheet>

      <HopNganSach
        mo={mo === 'ngan_sach'}
        nganSach={duLieu.ngan_sach}
        dangGui={dangLam === 'ngan_sach'}
        dong={() => setMo(null)}
        luu={async (han, pct) => {
          const kq = await lam('ngan_sach', 'dat_ngan_sach', { han_muc_thang_usd: han, canh_bao_phan_tram: pct }, han === null ? 'Đã bỏ ngân sách.' : 'Đã lưu ngân sách.');
          if (kq) setMo(null);
        }}
      />

      <AlertDialog open={xacNhan !== null} onOpenChange={(m) => { if (!m) setXacNhan(null); }}>
        <AlertDialogContent className="rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{xacNhan?.tieuDe}</AlertDialogTitle>
            <AlertDialogDescription>{xacNhan?.mo}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => xacNhan?.lam()}
              className={`rounded-lg ${xacNhan?.nguyHiem ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-foreground text-background hover:bg-foreground/85'}`}
            >
              {xacNhan?.nut}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ═══ Khối ═══════════════════════════════════════════════════════════ */

function TheChiSo({
  nhan, gia, trong, phu, thanh, canhBao, bam,
}: {
  nhan: string;
  gia: string;
  trong: string | null;
  phu?: ReactNode;
  thanh?: number;
  canhBao?: boolean;
  bam?: () => void;
}) {
  const noiDung = (
    <>
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {nhan}
        {canhBao && <span className="h-1.5 w-1.5 rounded-full bg-mimi-amber" aria-label="gần chạm hoặc vượt ngân sách" />}
      </span>
      {trong ? (
        <span className="mt-3 block text-sm text-muted-foreground">{trong}</span>
      ) : (
        <>
          <span className="mt-1.5 block text-2xl font-semibold text-foreground">{gia}</span>
          {thanh !== undefined && (
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-accent" aria-hidden>
              <span className={`block h-full rounded-full ${canhBao ? 'bg-mimi-amber' : 'bg-foreground/70'}`} style={{ width: `${thanh}%` }} />
            </span>
          )}
          {phu && <span className="mt-1.5 block text-xs text-muted-foreground">{phu}</span>}
        </>
      )}
    </>
  );
  const lop = 'min-w-[240px] shrink-0 snap-start rounded-lg border border-border bg-card p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:min-w-0';
  return bam
    ? <button onClick={bam} className={`${lop} transition-colors hover:bg-accent/50 ${vien}`}>{noiDung}</button>
    : <div className={lop}>{noiDung}</div>;
}

/** Cột chồng theo nhà cung cấp: cột ≤24px, khe 2px giữa các đoạn, đầu cột bo 4px, hover/focus hiện chú giải. */
function BieuDoTheoNgay({ ds }: { ds: NgayChiPhi[] }) {
  const [chon, setChon] = useState<number | null>(null);
  const duong = (d: NgayChiPhi) => THU_TU_NCC.map((ncc) => ({ ncc, so: Math.max(0, d.theoNcc[ncc] ?? 0) })).filter((x) => x.so > 0);
  const max = Math.max(0, ...ds.map((d) => duong(d).reduce((s, x) => s + x.so, 0)));
  const coNcc = THU_TU_NCC.filter((ncc) => ds.some((d) => (d.theoNcc[ncc] ?? 0) > 0));

  if (max === 0) return <p className="mt-4 text-sm text-muted-foreground">Tháng này chưa có chi phí nào được ghi nhận.</p>;

  const ngayChon = chon !== null ? ds[chon] : null;
  const viTri = chon !== null ? ((chon + 0.5) / ds.length) * 100 : 0;
  const canh = chon === null ? '' : chon < 3 ? 'translate-x-0' : chon > ds.length - 4 ? '-translate-x-full' : '-translate-x-1/2';

  return (
    <figure className="mt-3">
      {coNcc.length >= 2 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Chú giải">
          {coNcc.map((ncc) => (
            <li key={ncc} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-[2px] ${MAU_NCC[ncc]}`} aria-hidden />
              {TEN_NCC[ncc]}
            </li>
          ))}
        </ul>
      )}
      <div className="relative mt-3">
        <p className="text-[11px] text-muted-foreground">Cao nhất <span className="tabular-nums text-foreground">{usd(max)}</span></p>
        <div
          className="mt-2 grid h-40 items-end border-b border-border"
          style={{ gridTemplateColumns: `repeat(${ds.length}, minmax(0, 1fr))` }}
          onMouseLeave={() => setChon(null)}
        >
          {ds.map((d, i) => {
            const cacDoan = duong(d);
            const tongDuong = cacDoan.reduce((s, x) => s + x.so, 0);
            return (
              <button
                key={d.ngay}
                type="button"
                aria-label={`${ngayVN(d.ngay)}: ${usd(d.tong)}${cacDoan.length ? ` — ${cacDoan.map((x) => `${TEN_NCC[x.ncc]} ${usd(x.so)}`).join(', ')}` : ''}`}
                onMouseEnter={() => setChon(i)}
                onFocus={() => setChon(i)}
                onBlur={() => setChon(null)}
                className={`flex h-full items-end justify-center px-px ${vienTrong}`}
              >
                {tongDuong > 0 ? (
                  <span
                    className={`flex w-full max-w-[24px] flex-col-reverse gap-[2px] transition-opacity ${chon !== null && chon !== i ? 'opacity-60' : ''}`}
                    style={{ height: `${Math.max(2, (tongDuong / max) * 100)}%` }}
                  >
                    {cacDoan.map((x, j) => (
                      <span
                        key={x.ncc}
                        className={`${MAU_NCC[x.ncc]} ${j === cacDoan.length - 1 ? 'rounded-t-[4px]' : ''}`}
                        style={{ flexGrow: x.so, flexBasis: 0, minHeight: 2 }}
                      />
                    ))}
                  </span>
                ) : (
                  <span className="block h-[2px] w-full max-w-[24px] bg-accent" />
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground" aria-hidden>
          <span>{ngayVN(ds[0].ngay).slice(0, 5)}</span>
          <span>{ngayVN(ds[ds.length - 1].ngay).slice(0, 5)}</span>
        </div>

        {ngayChon && (
          <div
            className={`pointer-events-none absolute top-6 z-10 min-w-[180px] rounded-lg border border-border bg-card p-3 text-xs shadow-md ${canh}`}
            style={{ left: `${viTri}%` }}
            aria-hidden
          >
            <p className="text-muted-foreground">{ngayVN(ngayChon.ngay)}</p>
            <p className="text-base font-semibold tabular-nums text-foreground">{usd(ngayChon.tong)}</p>
            <ul className="mt-1.5 space-y-1">
              {THU_TU_NCC.filter((ncc) => ngayChon.theoNcc[ncc] !== undefined).map((ncc) => (
                <li key={ncc} className="flex items-center gap-2">
                  <span className={`h-0.5 w-3 ${MAU_NCC[ncc]}`} />
                  <span className="font-medium tabular-nums text-foreground">{usd(ngayChon.theoNcc[ncc] ?? 0)}</span>
                  <span className="text-muted-foreground">{TEN_NCC[ncc]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {/*
        Validator dataviz: màu Gemini (aqua) và "Khác" (vàng) dưới 3:1 trên nền sáng. Quy
        tắc bù là phải có bảng số NHÌN THẤY được — bảng chỉ dành cho trình đọc màn hình không đủ.
      */}
      <details className="mt-3">
        <summary className={`cursor-pointer rounded text-xs font-medium text-muted-foreground hover:text-foreground ${vien}`}>Xem dạng bảng</summary>
        <div className="mt-2 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <caption className="sr-only">Chi phí AI theo ngày trong tháng này, USD</caption>
            <thead className="bg-accent/50 text-left text-muted-foreground">
              <tr>
                <th scope="col" className="px-2 py-1.5 font-medium">Ngày</th>
                {coNcc.map((ncc) => <th key={ncc} scope="col" className="px-2 py-1.5 text-right font-medium">{TEN_NCC[ncc]}</th>)}
                <th scope="col" className="px-2 py-1.5 text-right font-medium">Tổng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border tabular-nums">
              {ds.filter((d) => d.tong !== 0).map((d) => (
                <tr key={d.ngay}>
                  <th scope="row" className="px-2 py-1.5 text-left font-normal text-foreground">{ngayVN(d.ngay)}</th>
                  {coNcc.map((ncc) => <td key={ncc} className="px-2 py-1.5 text-right text-foreground">{usd(d.theoNcc[ncc] ?? 0)}</td>)}
                  <td className="px-2 py-1.5 text-right font-medium text-foreground">{usd(d.tong)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

function BangHangMuc({ ds }: { ds: ReturnType<typeof topHangMuc> }) {
  if (ds.length === 0) return <p className={`${khoi} px-4 py-5 text-sm text-muted-foreground`}>Tháng này chưa có chi phí nào.</p>;
  return (
    <>
      <div className={`hidden overflow-x-auto md:block ${khoi}`}>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border bg-accent/50 text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Nhà cung cấp</th>
              <th scope="col" className="px-3 py-2 font-medium">Mô hình / dịch vụ</th>
              <th scope="col" className="px-3 py-2 font-medium">Dự án</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Chi phí</th>
              <th scope="col" className="w-40 px-3 py-2 font-medium">Tỷ trọng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ds.map((h) => (
              <tr key={`${h.ncc}|${h.hangMuc}`}>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-[2px] ${MAU_NCC[h.ncc]}`} aria-hidden />
                    {TEN_NCC[h.ncc]}
                  </span>
                </td>
                <td className="max-w-[240px] truncate px-3 py-2.5 font-medium text-foreground" title={h.hangMuc}>{h.hangMuc}</td>
                <td className="max-w-[200px] truncate px-3 py-2.5 text-xs text-muted-foreground" title={h.duAn.join(', ')}>
                  {h.duAn.length ? `${h.duAn.slice(0, 2).join(', ')}${h.duAn.length > 2 ? ` +${h.duAn.length - 2}` : ''}` : '—'}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-foreground">{usd(h.tong)}</td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-accent" aria-hidden>
                      <span className="block h-full rounded-full bg-foreground/60" style={{ width: `${Math.max(0, Math.min(100, h.phanTram))}%` }} />
                    </span>
                    <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{h.phanTram.toFixed(0)}%</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {ds.map((h) => (
          <li key={`${h.ncc}|${h.hangMuc}`} className={`${khoi} p-3`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{h.hangMuc}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`h-2 w-2 rounded-[2px] ${MAU_NCC[h.ncc]}`} aria-hidden /> {TEN_NCC[h.ncc]} · {h.phanTram.toFixed(0)}%
                </p>
              </div>
              <p className="text-base font-semibold tabular-nums text-foreground">{usd(h.tong)}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function DauNguon({ ncc }: { ncc: NhaCungCapAi }) {
  if (ncc === 'anthropic') return <img src={claudeLogo} alt="Claude (Anthropic)" className="h-5 w-auto" />;
  if (ncc === 'gemini') return <img src={geminiLogo} alt="Google Gemini" className="-my-2 h-9 w-auto" />;
  return <span className="text-sm font-semibold tracking-tight text-foreground">{TEN_NCC[ncc]}</span>;
}

function TheNguon({
  ncc, ketNoi, soLanNhap, tongThang, dangLam, dongBo, moKetNoi, moNhap, goKetNoi,
}: {
  ncc: 'openai' | 'anthropic' | 'gemini';
  ketNoi: KetNoi | undefined;
  soLanNhap: number;
  tongThang: number;
  dangLam: string | null;
  dongBo: (ncc: NccApi) => void;
  moKetNoi: (ncc: NccApi) => void;
  moNhap: (ncc: NhaCungCapAi) => void;
  goKetNoi: (ncc: NccApi) => void;
}) {
  const coApi = ncc !== 'gemini';
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-[2px] ${MAU_NCC[ncc]}`} aria-hidden />
          <DauNguon ncc={ncc} />
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">{usd(tongThang)}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {ketNoi ? (
          ketNoi.trang_thai === 'loi'
            ? <span className="text-destructive">Không lấy được số liệu tự động: {ketNoi.loi_cuoi}</span>
            : <>Tự động · cập nhật lúc {luc(ketNoi.dong_bo_luc)}</>
        ) : soLanNhap > 0 ? (
          `Từ file · đã tải ${soLanNhap} file`
        ) : (
          'Chưa có dữ liệu'
        )}
      </p>
      {ncc === 'gemini' && (
        <p className="mt-1 text-[11px] text-muted-foreground">Google chưa cho lấy chi phí Gemini tự động — tải file báo cáo chi phí từ Google Cloud.</p>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {coApi && ketNoi && (
          <>
            <button onClick={() => dongBo(ncc)} disabled={dangLam === `dong_bo_${ncc}`} className={nutNhoPhu}>
              {dangLam === `dong_bo_${ncc}` ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Cập nhật
            </button>
            <button onClick={() => goKetNoi(ncc)} disabled={dangLam === `go_${ncc}`} className={`${nutNhoPhu} hover:text-destructive`}>Tắt tự động</button>
          </>
        )}
        {coApi && !ketNoi && (
          <button onClick={() => moKetNoi(ncc)} className={nutNhoPhu}><KeyRound size={12} /> Lấy tự động</button>
        )}
        <button onClick={() => moNhap(ncc)} className={nutNhoPhu}><FileUp size={12} /> Tải file</button>
      </div>
    </div>
  );
}

/* ── Nhập file ─────────────────────────────────────────────────────── */
const docFile = (f: File) =>
  new Promise<string>((ok, sai) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result ?? ''));
    r.onerror = () => sai(r.error);
    r.readAsText(f);
  });

const TOI_DA_BYTE = 5 * 1024 * 1024;

function FormNhapFile({
  nccBanDau, dangGui, gui,
}: {
  nccBanDau: NhaCungCapAi;
  dangGui: boolean;
  gui: (ncc: NhaCungCapAi, tenFile: string, dong: DongNhap[]) => void;
}) {
  const [ncc, setNcc] = useState<NhaCungCapAi>(nccBanDau);
  const [tenFile, setTenFile] = useState('');
  const [bang, setBang] = useState<string[][] | null>(null);
  const [ax, setAx] = useState<AnhXaCot>({ ngay: null, soTien: null, hangMuc: null, duAn: null, tienTe: null });
  const [dinhDang, setDinhDang] = useState<DinhDangNgay>('iso');
  const [chacChanNgay, setChacChanNgay] = useState(true);
  const [loiDoc, setLoiDoc] = useState<string | null>(null);

  const chonFile = async (f: File | undefined) => {
    setLoiDoc(null);
    setBang(null);
    if (!f) return;
    if (f.size > TOI_DA_BYTE) { setLoiDoc('File lớn hơn 5 MB — tách theo tháng rồi nhập từng file.'); return; }
    try {
      const b = tachCsv(await docFile(f));
      if (b.length < 2) { setLoiDoc('File không có dòng dữ liệu nào dưới dòng tiêu đề.'); return; }
      const doan = doanAnhXa(b[0]);
      const ngay = doanDinhDangNgay(doan.ngay === null ? [] : b.slice(1, 50).map((r) => r[doan.ngay as number] ?? ''));
      setTenFile(f.name);
      setBang(b);
      setAx(doan);
      setDinhDang(ngay.dinhDang);
      setChacChanNgay(ngay.chacChan);
    } catch {
      setLoiDoc('Không đọc được file. Hãy chọn file CSV.');
    }
  };

  const kq = bang ? chuyenBang(bang, ax, dinhDang) : null;
  const tt = kq ? tomTatNhap(kq.dong) : null;
  const tieuDe = bang?.[0] ?? [];
  const datCot = (k: keyof AnhXaCot) => (v: number | null) => setAx((cu) => ({ ...cu, [k]: v }));

  return (
    <>
      <SheetHeader className="text-left">
        <SheetTitle>Tải file chi phí</SheetTitle>
        <SheetDescription>
          Chọn file CSV báo cáo chi phí tải từ tài khoản của nhà cung cấp. Mỗi nơi đặt tên cột khác nhau — MIMI đề xuất, bạn kiểm lại bên dưới. Chỉ nhận USD.
        </SheetDescription>
      </SheetHeader>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="nf-ncc" className={nhanTruong}>Nhà cung cấp</label>
          <select id="nf-ncc" value={ncc} onChange={(e) => setNcc(e.target.value as NhaCungCapAi)} className={o}>
            {THU_TU_NCC.map((n) => <option key={n} value={n}>{TEN_NCC[n]}</option>)}
          </select>
          {ncc === 'gemini' && (
            <p className="mt-1 text-xs text-muted-foreground">Google chưa cho lấy chi phí Gemini tự động. Vào phần thanh toán (Billing) của Google Cloud, mở báo cáo chi phí và tải về dạng CSV.</p>
          )}
        </div>

        <div>
          <label htmlFor="nf-file" className={nhanTruong}>File CSV</label>
          <input
            id="nf-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => void chonFile(e.target.files?.[0])}
            className={`${o} file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-2 file:py-1 file:text-xs file:font-medium`}
          />
          {loiDoc && <p className="mt-1 text-xs text-destructive" role="alert">{loiDoc}</p>}
        </div>

        {bang && (
          <>
            <fieldset className={`${khoi} space-y-3 p-3`}>
              <legend className="px-1 text-xs font-semibold text-foreground">Cột trong file</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <ChonCot id="nf-cot-ngay" nhan="Ngày" batBuoc giaTri={ax.ngay} tieuDe={tieuDe} dat={datCot('ngay')} />
                <ChonCot id="nf-cot-tien" nhan="Số tiền (USD)" batBuoc giaTri={ax.soTien} tieuDe={tieuDe} dat={datCot('soTien')} />
                <ChonCot id="nf-cot-hang-muc" nhan="Mô hình / dịch vụ" giaTri={ax.hangMuc} tieuDe={tieuDe} dat={datCot('hangMuc')} />
                <ChonCot id="nf-cot-du-an" nhan="Dự án" giaTri={ax.duAn} tieuDe={tieuDe} dat={datCot('duAn')} />
                <ChonCot id="nf-cot-tien-te" nhan="Tiền tệ" giaTri={ax.tienTe} tieuDe={tieuDe} dat={datCot('tienTe')} />
                <div>
                  <label htmlFor="nf-dinh-dang" className={nhanTruong}>Cách viết ngày</label>
                  <select id="nf-dinh-dang" value={dinhDang} onChange={(e) => { setDinhDang(e.target.value as DinhDangNgay); setChacChanNgay(true); }} className={o}>
                    <option value="iso">Năm-tháng-ngày (2026-09-01)</option>
                    <option value="thang_truoc">Tháng/ngày/năm (09/01/2026)</option>
                    <option value="ngay_truoc">Ngày/tháng/năm (01/09/2026)</option>
                  </select>
                  {!chacChanNgay && (
                    <p className="mt-1 flex items-start gap-1 text-xs text-foreground">
                      <AlertTriangle size={12} className="mt-0.5 shrink-0" /> Ngày trong file đọc được cả hai cách — kiểm lại trước khi nhập.
                    </p>
                  )}
                </div>
              </div>
            </fieldset>

            {kq && tt && (
              <section aria-labelledby="nf-xem-truoc" aria-live="polite" className="space-y-2">
                <h3 id="nf-xem-truoc" className={nhanNho}>Xem trước</h3>
                <p className="text-sm text-foreground">
                  <strong>{tt.soDong.toLocaleString('vi-VN')} dòng hợp lệ</strong>
                  {tt.soDong > 0 && <> · {ngayVN(tt.tuNgay)}–{ngayVN(tt.denNgay)} · tổng <span className="tabular-nums">{usd(tt.tong)}</span></>}
                </p>
                {kq.boQua.length > 0 && (
                  <div className="rounded-lg border border-border p-2 text-xs">
                    <p className="font-medium text-foreground">Bỏ qua {kq.boQua.length.toLocaleString('vi-VN')} dòng</p>
                    <ul className="mt-1 space-y-0.5 text-muted-foreground">
                      {kq.boQua.slice(0, 5).map((b) => <li key={b.dongSo}>Dòng {b.dongSo}: {b.lyDo}</li>)}
                      {kq.boQua.length > 5 && <li>…và {kq.boQua.length - 5} dòng nữa</li>}
                    </ul>
                  </div>
                )}
                {kq.dong.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-accent/50 text-left text-muted-foreground">
                        <tr>
                          <th scope="col" className="px-2 py-1.5 font-medium">Ngày</th>
                          <th scope="col" className="px-2 py-1.5 font-medium">Mô hình / dịch vụ</th>
                          <th scope="col" className="px-2 py-1.5 font-medium">Dự án</th>
                          <th scope="col" className="px-2 py-1.5 text-right font-medium">USD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {kq.dong.slice(0, 5).map((d, i) => (
                          <tr key={i}>
                            <td className="px-2 py-1.5 tabular-nums">{ngayVN(d.ngay)}</td>
                            <td className="max-w-[160px] truncate px-2 py-1.5">{d.hang_muc || '—'}</td>
                            <td className="max-w-[120px] truncate px-2 py-1.5">{d.du_an || '—'}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">{usd(d.so_tien_usd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        <button
          type="button"
          disabled={!kq || kq.dong.length === 0 || dangGui}
          onClick={() => kq && gui(ncc, tenFile, kq.dong)}
          className={`${nutChinh} w-full`}
        >
          {dangGui ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Nhập {kq?.dong.length ? `${kq.dong.length.toLocaleString('vi-VN')} dòng` : 'file'}
        </button>
      </div>
    </>
  );
}

function ChonCot({
  id, nhan, batBuoc, giaTri, tieuDe, dat,
}: {
  id: string;
  nhan: string;
  batBuoc?: boolean;
  giaTri: number | null;
  tieuDe: string[];
  dat: (v: number | null) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className={nhanTruong}>{nhan}{batBuoc ? '' : ' (tuỳ chọn)'}</label>
      <select id={id} value={giaTri === null ? '' : String(giaTri)} onChange={(e) => dat(e.target.value === '' ? null : Number(e.target.value))} className={o}>
        <option value="">{batBuoc ? '— Chọn cột —' : '— Không có —'}</option>
        {tieuDe.map((t, i) => <option key={i} value={i}>{t.trim() || `Cột ${i + 1}`}</option>)}
      </select>
    </div>
  );
}

/* ── Kết nối Admin API key ─────────────────────────────────────────── */
function FormKetNoi({
  nccBanDau, dangGui, gui,
}: {
  nccBanDau: NccApi;
  dangGui: boolean;
  gui: (ncc: NccApi, khoa: string) => void;
}) {
  const [ncc, setNcc] = useState<NccApi>(nccBanDau);
  const [khoa, setKhoa] = useState('');
  const [hieu, setHieu] = useState(false);
  const huongDan = ncc === 'anthropic'
    ? 'Người quản trị tài khoản Anthropic tạo khoá này trong Claude Console, phần cài đặt tổ chức (Admin keys). Khoá thường dùng cho ứng dụng không đọc được chi phí.'
    : 'Người quản trị tài khoản OpenAI tạo khoá này trong phần cài đặt tổ chức (Admin keys). Khoá thường dùng cho ứng dụng không đọc được chi phí.';

  return (
    <>
      <SheetHeader className="text-left">
        <SheetTitle>Tự động lấy số liệu chi phí</SheetTitle>
        <SheetDescription>MIMI lấy chi phí 31 ngày gần nhất mỗi khi bạn bấm Cập nhật — không cần tải file.</SheetDescription>
      </SheetHeader>
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (hieu && khoa.trim()) gui(ncc, khoa.trim());
        }}
      >
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-accent p-1" role="group" aria-label="Nhà cung cấp">
          {(['anthropic', 'openai'] as const).map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={ncc === n}
              onClick={() => setNcc(n)}
              className={`rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${vien} ${ncc === n ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {TEN_NCC[n]}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs">
          <p className="flex items-center gap-2 font-semibold text-destructive"><AlertTriangle size={14} /> Khoá này có quyền quản trị cả tổ chức</p>
          <p className="mt-1 text-muted-foreground">
            Khoá quản trị còn cho phép thêm bớt thành viên và khoá khác của tài khoản. MIMI chỉ dùng nó để đọc chi phí, lưu dạng mã hoá, không
            bao giờ hiện lại. Nếu không muốn giao khoá này, dùng "Tải file chi phí" — số liệu như nhau, chỉ không tự cập nhật.
          </p>
        </div>

        <div>
          <label htmlFor="kn-khoa" className={nhanTruong}>Khoá quản trị {TEN_NCC[ncc]}</label>
          <input
            id="kn-khoa"
            type="password"
            value={khoa}
            onChange={(e) => setKhoa(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder={ncc === 'anthropic' ? 'sk-ant-admin01-…' : 'sk-admin-…'}
            className={`${o} font-mono`}
          />
          <p className="mt-1 text-xs text-muted-foreground">{huongDan}</p>
        </div>

        <label className="flex items-start gap-2 text-sm text-foreground">
          <input type="checkbox" className="mt-1" checked={hieu} onChange={(e) => setHieu(e.target.checked)} />
          Tôi hiểu khoá này có quyền quản trị tổ chức và đồng ý để MIMI lưu nó dạng mã hoá.
        </label>

        <button type="submit" disabled={!hieu || khoa.trim().length < 20 || dangGui} className={`${nutChinh} w-full`}>
          {dangGui ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />} Kiểm tra và kết nối
        </button>
        <p className="text-xs text-muted-foreground">MIMI hỏi thử nhà cung cấp trước khi lưu. Khoá bị từ chối thì không lưu gì.</p>
      </form>
    </>
  );
}

/* ── Ngân sách ─────────────────────────────────────────────────────── */
function HopNganSach({
  mo, nganSach, dangGui, dong, luu,
}: {
  mo: boolean;
  nganSach: NganSachAi | null;
  dangGui: boolean;
  dong: () => void;
  luu: (han: number | null, pct: number) => void;
}) {
  const [han, setHan] = useState('');
  const [pct, setPct] = useState('80');
  useEffect(() => {
    if (!mo) return;
    setHan(nganSach ? String(nganSach.han_muc_thang_usd) : '');
    setPct(String(nganSach?.canh_bao_phan_tram ?? 80));
  }, [mo, nganSach]);
  const so = Number(han.replace(/[^\d.]/g, ''));
  const hopLe = Number.isFinite(so) && so > 0;

  return (
    <Dialog open={mo} onOpenChange={(m) => { if (!m) dong(); }}>
      <DialogContent className="rounded-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wallet size={18} /> Ngân sách chi phí AI tháng</DialogTitle>
          <DialogDescription>Tổng cho mọi nhà cung cấp, USD. MIMI đánh dấu khi chi phí tháng chạm mức cảnh báo.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); if (hopLe) luu(so, Number(pct)); }}
        >
          <div>
            <label htmlFor="ns-han" className={nhanTruong}>Hạn mức tháng (USD)</label>
            <input id="ns-han" value={han} onChange={(e) => setHan(e.target.value)} inputMode="decimal" placeholder="500" className={o} />
          </div>
          <div>
            <label htmlFor="ns-pct" className={nhanTruong}>Cảnh báo khi đã dùng</label>
            <select id="ns-pct" value={pct} onChange={(e) => setPct(e.target.value)} className={o}>
              {[50, 70, 80, 90, 100].map((p) => <option key={p} value={p}>{p}%</option>)}
            </select>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            {nganSach && (
              <button type="button" onClick={() => luu(null, 80)} disabled={dangGui} className={`${nutPhu} sm:mr-auto`}>
                <X size={14} /> Bỏ ngân sách
              </button>
            )}
            <button type="submit" disabled={!hopLe || dangGui} className={nutChinh}>
              {dangGui ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Lưu
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
