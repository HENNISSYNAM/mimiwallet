import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, PanelLeftClose, PanelLeftOpen, Search, SquarePen, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useNaoMimi } from '@/store/naoMimi';
import { DUONG_TRO_LY } from '@/lib/nguCanhModule';
import { TEN_NHOM_NGAY, docCuoc, docLichSu, gomCuoc, nhomTheoNgay, xoaCuoc, type CuocHoi, type DongLichSu } from '@/lib/lichSuHoiThoai';

const KHOA_THU_GON = 'mimi.thanhLichSu.thuGon';
const docThuGon = () => { try { return localStorage.getItem(KHOA_THU_GON) === '1'; } catch { return false; } };
const ghiThuGon = (v: boolean) => { try { localStorage.setItem(KHOA_THU_GON, v ? '1' : '0'); } catch { /* không lưu được thì thôi */ } };

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

/**
 * Thanh bên trái trên máy tính (29/09/2026): lịch sử hỏi MIMI như ChatGPT/Claude. Thu gọn được thành một dải hẹp;
 * lựa chọn thu gọn chỉ nhớ trên trình duyệt này.
 */
export default function ThanhLichSu() {
  const [thuGon, setThuGon] = useState(docThuGon);
  const doi = () => setThuGon((v) => { ghiThuGon(!v); return !v; });
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (thuGon) {
    return (
      <aside className="mimi-thanh-kinh sticky top-0 hidden h-screen w-14 shrink-0 flex-col items-center gap-1 py-4 lg:flex" aria-label="Lịch sử hỏi MIMI (thu gọn)">
        <button type="button" onClick={doi} aria-label="Mở thanh lịch sử" title="Mở thanh lịch sử" aria-expanded={false}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-white/70 hover:text-foreground dark:hover:bg-white/10">
          <PanelLeftOpen size={18} />
        </button>
        <button
          type="button"
          onClick={() => { useNaoMimi.getState().xoaLuotDaXong(); if (pathname !== DUONG_TRO_LY) navigate(DUONG_TRO_LY); }}
          aria-label="Cuộc hỏi mới"
          title="Cuộc hỏi mới"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-white/70 hover:text-foreground dark:hover:bg-white/10"
        >
          <SquarePen size={17} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="mimi-thanh-kinh sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col pt-4 lg:flex">
      <div className="flex items-center justify-between px-3 pb-2">
        <span className="px-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Lịch sử</span>
        <button type="button" onClick={doi} aria-label="Thu gọn thanh lịch sử" title="Thu gọn thanh lịch sử" aria-expanded
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-white/70 hover:text-foreground dark:hover:bg-white/10">
          <PanelLeftClose size={18} />
        </button>
      </div>
      <DanhSachLichSu />
    </aside>
  );
}
