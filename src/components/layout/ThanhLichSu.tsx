import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle, History, House, LibraryBig, Loader2, MoreHorizontal, PanelLeftClose, Puzzle, ScanLine, Search, SquarePen, Trash2, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useNaoMimi } from '@/store/naoMimi';
import { DUONG_TRO_LY, MODULE_TRO_LY, TRANG_THEM, laKhongGianTroLy } from '@/lib/nguCanhModule';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MeoSong } from '@/components/mimi/MeoSong';
import { NutQuetChungTu } from '@/components/chung-tu/NutQuetChungTu';
import { useCoMoHinh } from '@/hooks/useTrangThaiTroLy';
import { SU_KIEN_LENH_PET, datHienPet, docCaiDat, laPhimTat } from '@/lib/petMimi';
import { MenuTaiKhoan } from './MenuTaiKhoan';
import { TEN_NHOM_NGAY, docCuoc, docLichSu, gomCuoc, nhomTheoNgay, xoaCuoc, type CuocHoi, type DongLichSu } from '@/lib/lichSuHoiThoai';

const KHOA_MO_LICH_SU = 'mimi.thanhLichSu.mo';
const docMoLichSu = () => { try { return localStorage.getItem(KHOA_MO_LICH_SU) !== '0'; } catch { return true; } };
const ghiMoLichSu = (v: boolean) => { try { localStorage.setItem(KHOA_MO_LICH_SU, v ? '1' : '0'); } catch { /* không lưu được thì thôi */ } };

/**
 * Danh sách cuộc hỏi MIMI — dùng chung cho thanh bên máy tính và bảng trượt trên điện thoại.
 * Bấm một cuộc: đọc lại câu hỏi + câu trả lời từ máy chủ và mở trong khung trợ lý (không hỏi lại).
 */
export function DanhSachLichSu({ onDaChon, luonHienXoa = false }: { onDaChon?: () => void; luonHienXoa?: boolean }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const phamVi = useNaoMimi((s) => s.phamVi);
  const luot = useNaoMimi((s) => s.luot);
  const [dong, setDong] = useState<DongLichSu[] | null>(null);
  const [loi, setLoi] = useState(false);
  const [tim, setTim] = useState('');
  const [dangMo, setDangMo] = useState<string | null>(null);
  const [canXoa, setCanXoa] = useState<CuocHoi | null>(null);

  /** Mã hội thoại của các lượt đang hiện trong khung trợ lý. */
  const idDangHien = useMemo(() => new Set(luot.map((l) => l.traLoi?.hoi_thoai_id).filter((x): x is string => !!x)), [luot]);

  const tai = useCallback(async () => {
    try {
      setDong(await docLichSu());
      setLoi(false);
    } catch {
      setLoi(true);
    }
  }, []);

  // Đổi tài khoản / công ty (phamVi đổi) → đọc lại; không bao giờ hiện lịch sử của phạm vi cũ.
  useEffect(() => {
    setDong(null);
    if (phamVi && !phamVi.endsWith(':?')) void tai();
  }, [phamVi, tai]);

  // Vừa có câu trả lời mới mà danh sách chưa có → đọc lại để cuộc hỏi hiện ngay trên thanh bên.
  // Mỗi bộ mã thiếu chỉ đọc lại một lần (mã đã bị xoá hay quá cũ sẽ không bao giờ có trong danh sách).
  const thieu = useMemo(() => (dong ? [...idDangHien].filter((id) => !dong.some((d) => d.id === id)).sort().join(',') : ''), [dong, idDangHien]);
  const daThuDocLai = useRef(new Set<string>());
  useEffect(() => {
    if (!thieu || daThuDocLai.current.has(thieu)) return;
    daThuDocLai.current.add(thieu);
    void tai();
  }, [thieu, tai]);

  const nhom = useMemo(() => {
    const q = tim.trim().toLowerCase();
    const ds = gomCuoc(dong ?? []).filter((c) => !q || c.tieuDe.toLowerCase().includes(q));
    return nhomTheoNgay(ds);
  }, [dong, tim]);

  const moiCuoc = () => {
    useNaoMimi.getState().xoaLuotDaXong();
    if (pathname !== DUONG_TRO_LY) navigate(DUONG_TRO_LY);
    onDaChon?.();
    setTimeout(() => document.getElementById('o-hoi-mimi')?.focus(), 50);
  };

  const mo = async (c: CuocHoi) => {
    setDangMo(c.id);
    try {
      useNaoMimi.getState().napCuoc(await docCuoc(c.ids));
      if (pathname !== DUONG_TRO_LY) navigate(DUONG_TRO_LY);
      onDaChon?.();
    } catch {
      toast.error('Chưa mở được cuộc hỏi này. Thử lại sau.');
    } finally {
      setDangMo(null);
    }
  };

  const xoa = async (c: CuocHoi) => {
    try {
      await xoaCuoc(c.ids);
      setDong((d) => d?.filter((x) => !c.ids.includes(x.id)) ?? d);
      if (c.ids.some((id) => idDangHien.has(id))) useNaoMimi.getState().xoaLuotDaXong();
      toast.success('Đã xoá cuộc hỏi.');
    } catch {
      toast.error('Chưa xoá được. Thử lại sau.');
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 px-3 pb-2">
        <button type="button" onClick={moiCuoc} className="flex h-9 w-full items-center gap-2.5 rounded-xl px-2.5 text-sm font-medium text-foreground hover:bg-accent">
          <SquarePen size={17} className="shrink-0" /> Cuộc hỏi mới
        </button>
        <label className="flex h-9 items-center gap-2 rounded-xl border border-border/70 bg-background/60 px-2.5 focus-within:ring-2 focus-within:ring-primary/25">
          <Search size={14} className="shrink-0 text-muted-foreground" aria-hidden />
          <input
            value={tim}
            onChange={(e) => setTim(e.target.value)}
            placeholder="Tìm cuộc hỏi"
            aria-label="Tìm trong lịch sử hỏi MIMI"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      <nav aria-label="Lịch sử hỏi MIMI" className="mimi-cuon-an min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
        {dong === null && !loi && (
          <div className="space-y-2 px-2.5 pt-3" aria-hidden>
            {[70, 55, 80, 60].map((w) => <div key={w} className="h-3 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />)}
          </div>
        )}
        {loi && (
          <p className="px-2.5 pt-3 text-sm text-muted-foreground">
            Chưa đọc được lịch sử.{' '}
            <button type="button" onClick={() => void tai()} className="text-primary hover:underline">Thử lại</button>
          </p>
        )}
        {dong && !nhom.length && (
          <p className="px-2.5 pt-3 text-sm text-muted-foreground">
            {tim.trim() ? 'Không có cuộc hỏi nào khớp.' : 'Chưa có cuộc hỏi nào. Câu bạn hỏi MIMI sẽ hiện ở đây.'}
          </p>
        )}
        {nhom.map((g) => (
          <section key={g.nhom} className="pt-3" aria-label={TEN_NHOM_NGAY[g.nhom]}>
            <h3 className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">{TEN_NHOM_NGAY[g.nhom]}</h3>
            <ul className="space-y-0.5">
              {g.cuoc.map((c) => {
                const dangXem = c.ids.some((id) => idDangHien.has(id)) && pathname === DUONG_TRO_LY;
                return (
                  <li key={c.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => void mo(c)}
                      aria-current={dangXem ? 'page' : undefined}
                      title={c.tieuDe}
                      className={`flex h-9 w-full items-center gap-2 rounded-lg pl-2.5 pr-9 text-left text-sm transition-colors ${
                        dangXem ? 'bg-accent font-medium text-foreground' : 'text-slate-700 hover:bg-accent/70 dark:text-muted-foreground'
                      }`}
                    >
                      <span className="truncate">{c.tieuDe}</span>
                      {dangMo === c.id && <Loader2 size={13} className="shrink-0 animate-spin text-muted-foreground" aria-hidden />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCanXoa(c)}
                      aria-label={`Xoá cuộc hỏi: ${c.tieuDe}`}
                      className={`absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 ${
                        luonHienXoa ? '' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>

      <AlertDialog open={!!canXoa} onOpenChange={(o) => { if (!o) setCanXoa(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá cuộc hỏi này?</AlertDialogTitle>
            <AlertDialogDescription>
              “{canXoa?.tieuDe}” và câu trả lời của MIMI sẽ bị xoá vĩnh viễn. Việc bạn đã xác nhận trước đó vẫn được giữ trong nhật ký.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { const c = canXoa; setCanXoa(null); if (c) void xoa(c); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── Dải biểu tượng bên trái (29/09/2026) ─────────────────────────────────────────────────────────────────────
 *
 * Bố cục theo tần suất dùng, trên xuống dưới:
 *   1. ĐI ĐẾN (điều hướng): Trang chủ · Lịch sử · Thư viện chứng từ · Kết nối · "…" mọi trang còn lại.
 *   2. LÀM NGAY (hành động): Quét hoá đơn — tách khỏi nhóm điều hướng vì bấm là mở máy ảnh/chọn tệp, không đổi trang.
 *   3. CÁ NHÂN (đáy): Pet MIMI bật/tắt · Hỗ trợ · Tài khoản.
 * Mỗi nút 44×44 (vùng chạm tối thiểu), biểu tượng 20px, tên hiện ở tooltip bên phải; nút đang mở có nền trắng.
 * Lịch sử mở thành bảng 260px ngay cạnh dải; lựa chọn mở/đóng nhớ trên trình duyệt này.
 */

const NUT = 'relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';
const NUT_THUONG = 'text-slate-600 hover:bg-white/70 hover:text-foreground dark:text-muted-foreground dark:hover:bg-white/10';
const NUT_MO = 'bg-white text-foreground shadow-[0_1px_2px_hsla(215,25%,20%,0.08)] ring-1 ring-black/[0.04] dark:bg-white/10 dark:ring-white/10';

function GoiY({ ten, children }: { ten: string; children: ReactNode }) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>{ten}</TooltipContent>
    </Tooltip>
  );
}

function NutDi({ to, ten, icon: Icon, dangMo }: { to: string; ten: string; icon: LucideIcon; dangMo: boolean }) {
  return (
    <GoiY ten={ten}>
      <NavLink to={to} end aria-label={ten} aria-current={dangMo ? 'page' : undefined} data-mimi={`nav:${to}`}
        className={`${NUT} ${dangMo ? NUT_MO : NUT_THUONG}`}>
        <Icon size={20} strokeWidth={dangMo ? 2.2 : 1.9} />
      </NavLink>
    </GoiY>
  );
}

/** Pet đang hiện hay ẩn — đọc lại sau mọi nơi có thể đổi nó (nút này, Alt+Shift+M, menu của chính pet, Cài đặt). */
function usePetDangHien(): [boolean, (v: boolean) => void] {
  const [hien, setHien] = useState(() => !docCaiDat().an);
  useEffect(() => {
    const doc = () => { setTimeout(() => setHien(!docCaiDat().an), 0); };
    const phim = (e: KeyboardEvent) => { if (laPhimTat(e)) doc(); };
    window.addEventListener(SU_KIEN_LENH_PET, doc);
    window.addEventListener('keydown', phim);
    window.addEventListener('pointerup', doc);
    return () => {
      window.removeEventListener(SU_KIEN_LENH_PET, doc);
      window.removeEventListener('keydown', phim);
      window.removeEventListener('pointerup', doc);
    };
  }, []);
  return [hien, setHien];
}

export default function ThanhBen({ tenCongTy, anhDaiDien }: { tenCongTy: string | null; anhDaiDien: ReactNode }) {
  const [moLichSu, setMoLichSu] = useState(docMoLichSu);
  const doiLichSu = (v: boolean) => { ghiMoLichSu(v); setMoLichSu(v); };
  const { pathname, search } = useLocation();
  const coMoHinh = useCoMoHinh();
  const [petHien, setPetHien] = usePetDangHien();
  const duongDay = `${pathname}${search}`;
  const trongThem = !laKhongGianTroLy(pathname) && pathname !== '/dashboard/thu-vien' && pathname !== '/dashboard/ket-noi';

  return (
    <div className="sticky top-0 hidden h-screen shrink-0 lg:flex">
      <nav aria-label="Thanh công cụ MIMI" className="mimi-thanh-kinh flex w-16 flex-col items-center py-3">
        <div className="flex flex-col items-center gap-1">
          <NutDi to={DUONG_TRO_LY} ten="Trang chủ — MIMI Trợ lý" icon={House} dangMo={laKhongGianTroLy(pathname)} />
          <GoiY ten={moLichSu ? 'Đóng lịch sử' : 'Lịch sử hỏi MIMI'}>
            <button type="button" onClick={() => doiLichSu(!moLichSu)} aria-label="Lịch sử hỏi MIMI" aria-expanded={moLichSu}
              className={`${NUT} ${moLichSu ? NUT_MO : NUT_THUONG}`}>
              <History size={20} strokeWidth={moLichSu ? 2.2 : 1.9} />
            </button>
          </GoiY>
          <NutDi to="/dashboard/thu-vien" ten="Thư viện chứng từ" icon={LibraryBig} dangMo={pathname === '/dashboard/thu-vien'} />
          <NutDi to="/dashboard/ket-noi" ten="Ứng dụng & kết nối" icon={Puzzle} dangMo={pathname === '/dashboard/ket-noi'} />
          <Popover>
            <GoiY ten="Tất cả công cụ">
              <PopoverTrigger asChild>
                <button type="button" aria-label="Tất cả công cụ" className={`${NUT} ${trongThem ? NUT_MO : NUT_THUONG}`}>
                  <MoreHorizontal size={20} />
                </button>
              </PopoverTrigger>
            </GoiY>
            <PopoverContent side="right" align="start" sideOffset={10} className="max-h-[80vh] w-64 overflow-y-auto rounded-2xl p-1.5">
              <p className="px-2.5 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">Công cụ chính</p>
              {MODULE_TRO_LY.map((m) => (
                <Link key={m.khoa} to={m.duong} aria-current={duongDay === m.duong ? 'page' : undefined}
                  className="flex rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-accent aria-[current=page]:bg-accent aria-[current=page]:font-medium">
                  {m.ten}
                </Link>
              ))}
              <p className="mt-1 border-t border-border px-2.5 pb-1 pt-2.5 text-xs font-medium text-muted-foreground">Khác</p>
              {TRANG_THEM.map((t) => (
                <Link key={t.duong} to={t.duong} aria-current={pathname === t.duong ? 'page' : undefined}
                  className="flex rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-accent aria-[current=page]:bg-accent aria-[current=page]:font-medium">
                  {t.ten}
                </Link>
              ))}
            </PopoverContent>
          </Popover>

          <span aria-hidden className="my-2 h-px w-7 bg-slate-900/10 dark:bg-white/10" />
          <GoiY ten={coMoHinh === false ? 'Quét hoá đơn (chưa bật đọc ảnh)' : 'Quét hoá đơn'}>
            <span className="inline-flex">
              <NutQuetChungTu coMoHinh={coMoHinh} nhanAn="Quét hoá đơn" className={`${NUT} ${NUT_THUONG}`}>
                <ScanLine size={20} strokeWidth={1.9} />
              </NutQuetChungTu>
            </span>
          </GoiY>
        </div>

        <div className="mt-auto flex flex-col items-center gap-1">
          {/*
            Pet MIMI sống ngay trong biểu tượng: thở, ngủ khi rảnh, rê qua lại trên đầu là được xoa đầu.
            Bấm là gọi mèo ra màn hình (kéo thả, hỏi nhanh); bấm lần nữa là cất về đây.
          */}
          <GoiY ten={petHien ? 'Xoa đầu MIMI · bấm để cất về (Alt+Shift+M)' : 'Xoa đầu MIMI · bấm để gọi ra màn hình (Alt+Shift+M)'}>
            <button type="button" onClick={() => { const bat = !petHien; datHienPet(bat); setPetHien(bat); }} aria-label="Pet MIMI" aria-pressed={petHien}
              className={`${NUT} ${petHien ? NUT_MO : NUT_THUONG}`}>
              <MeoSong size={34} />
              {petHien && <span aria-hidden className="absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full bg-mimi-green ring-2 ring-white" />}
            </button>
          </GoiY>
          <GoiY ten="Hỗ trợ">
            <a href="mailto:hoc.qk2@gmail.com?subject=H%E1%BB%97%20tr%E1%BB%A3%20Mimi%20Wallet" aria-label="Hỗ trợ" className={`${NUT} ${NUT_THUONG}`}>
              <HelpCircle size={20} strokeWidth={1.9} />
            </a>
          </GoiY>
          <div className="mt-1">
            <MenuTaiKhoan tenCongTy={tenCongTy} anhDaiDien={anhDaiDien} side="right" align="end" />
          </div>
        </div>
      </nav>

      {moLichSu && (
        <aside aria-label="Lịch sử hỏi MIMI" className="mimi-thanh-kinh flex w-[260px] flex-col border-l border-slate-900/[0.06] pt-3 dark:border-white/10">
          <div className="flex items-center justify-between px-3 pb-2">
            <span className="px-2.5 text-sm font-semibold text-foreground">Lịch sử</span>
            <button type="button" onClick={() => doiLichSu(false)} aria-label="Đóng lịch sử" title="Đóng lịch sử"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-white/70 hover:text-foreground dark:hover:bg-white/10">
              <PanelLeftClose size={18} />
            </button>
          </div>
          <DanhSachLichSu />
        </aside>
      )}
    </div>
  );
}
