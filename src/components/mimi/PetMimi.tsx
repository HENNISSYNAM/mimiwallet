import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, AudioLines, ChevronDown, Plus, SquarePen } from 'lucide-react';
import { toast } from 'sonner';
import { coHoTroNoi, moCuaSoNoi, PetNoi } from '@/components/mimi/PetNoi';
import { goiTroLy } from '@/lib/goiTroLy';
import {
  SU_KIEN_LENH_PET, dangMeo, docCaiDat, giuTrongMan, KICH_THUOC, laPhimTat, luuCaiDat, TEN_TRANG_THAI_PET, trangThaiPet,
  type CaiDatPet, type CoPet,
} from '@/lib/petMimi';
import idle from '@/assets/mimi/idle.png';
import sleep from '@/assets/mimi/sleep.png';
import wave from '@/assets/mimi/wave.png';
import surprised from '@/assets/mimi/surprised.png';
import happy from '@/assets/mimi/happy.png';
import run from '@/assets/mimi/run.png';
// Dải 8 khung chạy (scripts/cat-khung-chay.mjs). Chưa có file thì pet dùng ảnh run.png như cũ.
const DAI_CHAY = Object.values(import.meta.glob('/src/assets/mimi/run-sprite.png', { eager: true, import: 'default' }))[0] as string | undefined;
import stretch from '@/assets/mimi/stretch.png';
import sit from '@/assets/mimi/sit.png';

/**
 * Pet MIMI — mèo nổi trên trang, theo đúng cơ chế "Pets" của ChatGPT (xem `lib/petMimi.ts`).
 * Bấm mèo / nút bút: hiện ô nhập nhỏ ngay dưới mèo (như pet của ChatGPT). Gửi → câu hỏi đi thẳng vào Trợ lý
 * MIMI (một cuộc trò chuyện, một bộ não — pet không có khung chat riêng). Nói: câu nói cũng vào Trợ lý MIMI. Kéo mèo: đổi chỗ (nhớ lại). Chuột phải / giữ lâu: menu.
 * Alt+Shift+M: ẩn/hiện. Pet chỉ HIỂN THỊ việc của hồ sơ việc chung (câu hỏi đang chờ bạn) — không tự tạo,
 * không tự đóng việc nào.
 */
const ANH: Record<string, string> = { idle, sleep, wave, surprised, happy, run, sit };
const PHUT_NGU = 3 * 60_000;
/** Vươn vai kéo dài bao lâu — chỉ khi vừa thức dậy, không lặp định kỳ (26/09/2026: bớt hoạt ảnh lặp). */
export const VUON_VAI_MS = 1600;
/** Rảnh bao lâu thì ngồi xuống (trước khi ngủ ở phút thứ 3); rê chuột chào thì vẫy tay bao lâu. */
export const NGOI_SAU = 40_000;
/** Thẻ hoạt động tự ló lên bao lâu khi có chuyện mới. */
export const THE_LO_MS = 6000;
const CAO_NUT = 44;

interface ViecCanBan { id: string; tieu_de: string; cau: string }
interface TheHoatDong { khoa: string; tieu: string; phu: string; mau: string; bam: () => void }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const layNhanDien = (): any => (typeof window === 'undefined' ? null : (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null);

export default function PetMimi() {
  const [cd, setCd] = useState<CaiDatPet>(() => docCaiDat());
  const [man, setMan] = useState(() => ({ rong: window.innerWidth, cao: window.innerHeight }));
  const [moKhay, setMoKhay] = useState(false);
  const [moMenu, setMoMenu] = useState(false);
  const [viec, setViec] = useState<ViecCanBan[]>([]);
  const [nguLau, setNguLau] = useState(false);
  const [dangNghe, setDangNghe] = useState(false);
  const [lo, setLo] = useState(false);
  // Hoạt ảnh khi bị kéo (26/09/2026): chạy theo hướng kéo, nghiêng theo tốc độ, thả ra thì tiếp đất.
  const [dangKeoMeo, setDangKeoMeo] = useState(false);
  const [huongTrai, setHuongTrai] = useState(false);
  const [nghieng, setNghieng] = useState(0);
  const [vuaTha, setVuaTha] = useState(false);
  // Ngủ và vươn vai (26/09/2026): thức dậy thì vươn vai; rảnh mà còn thức thì thỉnh thoảng vươn vai.
  const [vuonVai, setVuonVai] = useState(false);
  const nguTruoc = useRef(false);
  // Ngồi và giơ tay (26/09/2026): rảnh một lúc thì ngồi; rê chuột vào mèo đang thức thì ngồi vẫy tay chào.
  const [ngoi, setNgoi] = useState(false);
  // Ô nhập nhỏ dưới mèo (26/09/2026): bấm mèo thì hiện, gửi thì vào Trợ lý MIMI.
  const [moO, setMoO] = useState(false);
  const [cauNhap, setCauNhap] = useState('');
  const goc = useRef<HTMLDivElement>(null);
  const diemTruoc = useRef<{ x: number; t: number } | null>(null);
  const vanToc = useRef(0);
  // Mèo đang ở cửa sổ nổi trên màn hình máy (Document Picture-in-Picture).
  const [cuaSoNoi, setCuaSoNoi] = useState<Window | null>(null);
  const navigate = useNavigate();
  /** Lối thẳng vào Trợ lý MIMI: có câu thì hỏi luôn (trang Trợ lý đọc `?hoi=` đúng một lần). */
  const moTroLy = useCallback((cau?: string) => {
    setMoKhay(false);
    navigate(cau ? `/dashboard/tro-ly?hoi=${encodeURIComponent(cau.slice(0, 1000))}` : '/dashboard/tro-ly');
  }, [navigate]);
  const raManHinhMay = async () => {
    setMoMenu(false);
    try {
      const w = await moCuaSoNoi();
      if (w) { setCuaSoNoi(w); toast('MIMI đã ra màn hình máy — nổi trên mọi ứng dụng. Đóng cửa sổ nhỏ để đưa MIMI về trang.'); }
    } catch {
      toast.error('Trình duyệt chưa cho mở cửa sổ nổi. Dùng Chrome hoặc Edge bản mới trên máy tính.');
    }
  };
  const veTrang = () => { try { window.focus(); } catch { /* một số trình duyệt chặn */ } };
  const giamChuyenDong = useRef(false);
  const keo = useRef<{ dx: number; dy: number; bd: { x: number; y: number }; da: boolean } | null>(null);
  const giuLau = useRef<number | null>(null);

  const co = KICH_THUOC[cd.co];
  const kt = { rong: Math.max(co, 3 * CAO_NUT), cao: (cd.mini ? 0 : co) + CAO_NUT + 8 };
  const vi = giuTrongMan({ x: cd.x ?? man.rong - kt.rong - 24, y: cd.y ?? man.cao - kt.cao - 96 }, kt, man);

  const doiCd = useCallback((sua: Partial<CaiDatPet>) => {
    setCd((c) => { const m = { ...c, ...sua }; luuCaiDat(m); return m; });
  }, []);

  useEffect(() => {
    giamChuyenDong.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const doiMan = () => setMan({ rong: window.innerWidth, cao: window.innerHeight });
    const phim = (e: KeyboardEvent) => { if (laPhimTat(e)) { e.preventDefault(); setCd((c) => { const m = { ...c, an: !c.an }; luuCaiDat(m); return m; }); } };
    // Lệnh `/pet` gõ trong Trợ lý MIMI.
    const lenh = () => setCd((c) => { const m = { ...c, an: !c.an }; luuCaiDat(m); return m; });
    window.addEventListener('resize', doiMan);
    window.addEventListener('keydown', phim);
    window.addEventListener(SU_KIEN_LENH_PET, lenh);
    return () => { window.removeEventListener('resize', doiMan); window.removeEventListener('keydown', phim); window.removeEventListener(SU_KIEN_LENH_PET, lenh); };
  }, []);

  // Việc đang chờ người dùng (câu hỏi của hành trình) — đọc mỗi 2 phút, và khi mở khay.
  const napViec = useCallback(async () => {
    try {
      const r = await goiTroLy('hanh_trinh_ds');
      const ds = (r.hanh_trinh ?? []) as { id: string; tieu_de: string; cau_hoi: { cau: string } | null }[];
      setViec(ds.filter((h) => h.cau_hoi).map((h) => ({ id: h.id, tieu_de: h.tieu_de, cau: h.cau_hoi!.cau })));
    } catch { /* máy chủ chưa có hành động này hoặc mạng lỗi: pet vẫn chạy, chỉ không có việc */ }
  }, []);
  useEffect(() => { void napViec(); const id = window.setInterval(() => void napViec(), 120_000); return () => window.clearInterval(id); }, [napViec]);

  // Pet chỉ phản chiếu việc chung đang chờ bạn; trả lời, làm hộ, lỗi… nằm ở trang Trợ lý MIMI.
  const tt = trangThaiPet({ dangTraLoi: false, dangLamHo: false, loi: false, chuaDoc: 0, soCanBan: viec.length });
  // Nghỉ lâu thì ngủ; có động là thức.
  useEffect(() => {
    setNguLau(false);
    setNgoi(false);
    if (tt !== 'nghi') return;
    const ngoiXuong = window.setTimeout(() => setNgoi(true), NGOI_SAU);
    const id = window.setTimeout(() => setNguLau(true), PHUT_NGU);
    return () => { window.clearTimeout(ngoiXuong); window.clearTimeout(id); };
  }, [tt, moKhay]);
  // Bấm ra ngoài pet thì ô nhập thu lại (chữ đang gõ vẫn giữ).
  useEffect(() => {
    if (!moO) return;
    const ngoai = (e: PointerEvent) => { if (goc.current && !goc.current.contains(e.target as Node)) setMoO(false); };
    document.addEventListener('pointerdown', ngoai);
    return () => document.removeEventListener('pointerdown', ngoai);
  }, [moO]);

  useEffect(() => {
    if (tt === 'nghi' || moKhay) { setLo(false); return; }
    setLo(true);
    const id = window.setTimeout(() => setLo(false), THE_LO_MS);
    return () => window.clearTimeout(id);
  }, [tt, moKhay]);

  // Thức dậy → vươn vai.
  useEffect(() => {
    if (nguTruoc.current && !nguLau) setVuonVai(true);
    // Bắt đầu ngủ thì thôi vươn vai (không "vừa ngủ vừa vươn vai").
    if (!nguTruoc.current && nguLau) setVuonVai(false);
    nguTruoc.current = nguLau;
  }, [nguLau]);
  // Vươn vai bao lâu thì thôi — bộ hẹn riêng, để việc bắt đầu vươn vai không huỷ nhầm nó.
  useEffect(() => {
    if (!vuonVai) return;
    const id = window.setTimeout(() => setVuonVai(false), VUON_VAI_MS);
    return () => window.clearTimeout(id);
  }, [vuonVai]);
  /** Rê chuột vào mèo đang ngủ → mèo thức (và vươn vai). Không vẫy tay, không chào. */
  const danhThuc = () => { if (nguLau) setNguLau(false); };
  const batO = () => { setMoKhay(false); setLo(false); setMoO((o) => !o); };
  const guiCau = (e: React.FormEvent) => {
    e.preventDefault();
    const cau = cauNhap.trim();
    if (!cau) return;
    setCauNhap('');
    setMoO(false);
    moTroLy(cau);
  };

  // Ảnh theo thứ tự ưu tiên: bị kéo > tiếp đất > vươn vai > ngủ > ngồi (rảnh lâu, hoặc cần bạn) > trạng thái.
  const anhMeo = dangKeoMeo ? run
    : vuaTha ? happy
      : vuonVai ? stretch
        : tt === 'nghi' && !nguLau && ngoi ? sit
          : ANH[dangMeo(tt, nguLau)] ?? idle;

  // ── Kéo thả: bấm mà không di quá 5px là "bấm", di hơn là "kéo" ──────────────────────────────
  const batDauKeo = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    keo.current = { dx: e.clientX - vi.x, dy: e.clientY - vi.y, bd: { x: e.clientX, y: e.clientY }, da: false };
    giuLau.current = window.setTimeout(() => { if (keo.current && !keo.current.da) { keo.current = null; setMoMenu(true); } }, 650);
  };
  const dangKeo = (e: React.PointerEvent) => {
    const k = keo.current;
    if (!k) return;
    if (!k.da && Math.hypot(e.clientX - k.bd.x, e.clientY - k.bd.y) > 5) {
      k.da = true;
      if (giuLau.current) window.clearTimeout(giuLau.current);
      setDangKeoMeo(true);
      setVuaTha(false);
      diemTruoc.current = { x: e.clientX, t: performance.now() };
      vanToc.current = 0;
    }
    if (!k.da) return;
    setCd((c) => ({ ...c, ...giuTrongMan({ x: e.clientX - k.dx, y: e.clientY - k.dy }, kt, man) }));
    // Hướng và độ nghiêng theo vận tốc ngang (px/ms), làm mượt để mèo không lật qua lật lại khi tay run.
    const truoc = diemTruoc.current;
    const bayGio = performance.now();
    if (truoc && bayGio - truoc.t > 16) {
      const v = (e.clientX - truoc.x) / (bayGio - truoc.t);
      vanToc.current = vanToc.current * 0.6 + v * 0.4;
      const vm = vanToc.current;
      if (Math.abs(vm) > 0.08) setHuongTrai(vm < 0); // đủ nhanh mới quay mặt
      setNghieng(Math.max(-12, Math.min(12, vm * 9))); // nghiêng về phía đang chạy
      diemTruoc.current = { x: e.clientX, t: bayGio };
    }
  };
  const thaKeo = () => {
    if (giuLau.current) window.clearTimeout(giuLau.current);
    const k = keo.current;
    keo.current = null;
    if (!k) return;
    if (k.da) {
      setCd((c) => { luuCaiDat(c); return c; });
      setDangKeoMeo(false);
      setNghieng(0);
      setVuaTha(true);
      window.setTimeout(() => setVuaTha(false), 1200);
    } else batO();
  };

  // ── Nói: nhận giọng tiếng Việt của trình duyệt, gửi thẳng vào chat ─────────────────────────────
  const noi = () => {
    const NhanDien = layNhanDien();
    if (!NhanDien) { toast.error('Trình duyệt này chưa nghe được giọng nói. Thử Chrome hoặc Edge.'); return; }
    const nd = new NhanDien();
    nd.lang = 'vi-VN';
    nd.interimResults = false;
    nd.maxAlternatives = 1;
    setDangNghe(true);
    nd.onresult = (ev: { results: { 0: { 0: { transcript: string } } } }) => {
      const cau = ev.results[0][0].transcript.trim();
      if (cau) moTroLy(cau);
    };
    nd.onerror = () => toast.error('Chưa nghe rõ. Thử nói lại, hoặc bấm nút bút để gõ trong Trợ lý MIMI.');
    nd.onend = () => setDangNghe(false);
    nd.start();
  };

  const chuong = viec.length;
  const moViec = (id: string) => { setMoKhay(false); setLo(false); navigate(`/dashboard/viec-can-lam?ht=${id}`); };
  const the: TheHoatDong[] = [
    ...viec.map((v) => ({ khoa: v.id, tieu: v.cau, phu: `Cần bạn · ${v.tieu_de}`, mau: 'text-mimi-amber', bam: () => moViec(v.id) })),
  ];
  // Thẻ bật lên phía dưới thanh nếu còn chỗ, không thì bật ngược lên trên mèo.
  const caoThe = Math.min(4, Math.max(1, the.length)) * 64 + 16;
  const theOTren = vi.y + kt.cao + caoThe > man.cao - 8;
  const theHien = moKhay ? the : lo ? the.slice(0, 1) : [];
  const nut = 'flex h-8 w-9 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-accent hover:text-foreground';

  if (cuaSoNoi) {
    return (
      <>
        <PetNoi
          cuaSo={cuaSoNoi} anh={anhMeo} tt={tt} chuong={chuong} dangNghe={dangNghe}
          onGo={() => { veTrang(); moTroLy(); }}
          onNoi={noi}
          onChuong={() => { veTrang(); if (viec.length) navigate(`/dashboard/viec-can-lam?ht=${viec[0].id}`); else moTroLy(); }}
          onDong={() => setCuaSoNoi(null)}
        />
      </>
    );
  }

  if (cd.an) {
    return (
      <>
        <button type="button" onClick={() => doiCd({ an: false })} aria-label="Hiện MIMI (Alt+Shift+M)" title="Hiện MIMI (Alt+Shift+M)"
          className="fixed bottom-28 right-0 z-50 rounded-l-lg bg-card/90 px-1.5 py-2 text-[10px] font-semibold text-muted-foreground shadow ring-1 ring-border [writing-mode:vertical-rl] hover:text-foreground">
          MIMI
        </button>
      </>
    );
  }

  return (
    <>
      <div
        ref={goc}
        className="fixed z-50 flex select-none flex-col items-center"
        style={{ left: vi.x, top: vi.y, width: kt.rong }}
        onContextMenu={(e) => { e.preventDefault(); setMoMenu(true); }}
      >
        {!cd.mini && (
          <div className="relative" style={{ width: co, height: co }}>
            {/* Bong bóng trạng thái: chỉ khi có việc đáng nói. */}
            <AnimatePresence>
              {tt !== 'nghi' && (
                <motion.span
                  key={tt}
                  role="status"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-card px-2.5 py-0.5 text-[11px] font-medium text-foreground shadow ring-1 ring-border"
                >
                  {TEN_TRANG_THAI_PET[tt]}
                </motion.span>
              )}
            </AnimatePresence>
            <motion.div
              className="h-full w-full"
              animate={dangKeoMeo && !giamChuyenDong.current
                ? DAI_CHAY
                  ? { y: [0, -3, 0], scaleY: 1, scaleX: 1, rotate: nghieng }
                  : { y: [0, -7, 0, -2, 0], scaleY: [1, 0.9, 1.06, 0.97, 1], scaleX: [1, 1.08, 0.95, 1.02, 1], rotate: nghieng }
                : vuaTha && !giamChuyenDong.current
                  ? { y: [0, 3, 0], scaleY: [1, 0.86, 1], scaleX: [1, 1.1, 1], rotate: 0 }
                  : vuonVai && !giamChuyenDong.current
                    ? { y: [0, 2, 0, -2, 0], scaleX: [1, 1.14, 1.16, 1.04, 1], scaleY: [1, 0.9, 0.88, 1.03, 1], rotate: 0 }
                    : nguLau && !giamChuyenDong.current
                      ? { y: 0, scaleY: [1, 1.035, 1], scaleX: [1, 1.015, 1], rotate: 0 }
                      : { y: 0, scaleY: 1, scaleX: 1, rotate: 0 }}
              transition={dangKeoMeo ? { duration: DAI_CHAY ? 0.28 : 0.34, repeat: Infinity, ease: 'easeInOut', rotate: { duration: 0.2 } }
                : vuonVai ? { duration: VUON_VAI_MS / 1000, ease: 'easeInOut' }
                  : nguLau ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.28 }}
              style={{ transformOrigin: '50% 90%' }}
            >
            <motion.img
              src={anhMeo}
              alt=""
              draggable={false}
              role="button"
              tabIndex={0}
              data-dang-keo={dangKeoMeo || undefined}
              data-ngu={(nguLau && !vuonVai && !dangKeoMeo) || undefined}
              data-vuon-vai={(vuonVai && !dangKeoMeo) || undefined}
              data-ngoi={(anhMeo === sit) || undefined}
              onPointerEnter={danhThuc}
              aria-label={`MIMI — ${TEN_TRANG_THAI_PET[tt]}. Bấm để hỏi MIMI, kéo để di chuyển.`}
              aria-expanded={moO}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); batO(); } }}
              onPointerDown={batDauKeo} onPointerMove={dangKeo} onPointerUp={thaKeo} onPointerCancel={thaKeo}
              data-huong={dangKeoMeo ? (huongTrai ? 'trai' : 'phai') : undefined}
              animate={{
                ...(giamChuyenDong.current || tt !== 'dang_chay' || dangKeoMeo ? { y: 0 } : { y: [0, -4, 0] }),
                scaleX: dangKeoMeo && huongTrai ? -1 : 1,
              }}
              transition={{
                default: { duration: 0.6, repeat: tt === 'dang_chay' && !dangKeoMeo && !giamChuyenDong.current ? Infinity : 0 },
                scaleX: { duration: giamChuyenDong.current ? 0 : 0.14, ease: 'easeOut' },
              }}
              data-dai-khung={(dangKeoMeo && DAI_CHAY && !giamChuyenDong.current) || undefined}
              className={`no-save h-full w-full cursor-grab touch-none object-contain drop-shadow-lg active:cursor-grabbing ${dangKeoMeo && DAI_CHAY && !giamChuyenDong.current ? 'opacity-0' : ''}`}
            />
            {/* Chạy bằng dải khung: ảnh thật vẫn nằm trên (trong suốt) để nhận kéo thả; dải khung vẽ bên dưới, lật theo hướng. */}
            {dangKeoMeo && DAI_CHAY && !giamChuyenDong.current && (
              <span aria-hidden className="pointer-events-none absolute inset-0 animate-chay-khung drop-shadow-lg"
                style={{ backgroundImage: `url(${DAI_CHAY})`, backgroundSize: '800% 100%', backgroundRepeat: 'no-repeat', transform: `scaleX(${huongTrai ? -1 : 1})` }} />
            )}
            </motion.div>
            {nguLau && !vuonVai && !dangKeoMeo && (
              <span aria-hidden className="pointer-events-none absolute -right-1 top-0 flex flex-col items-start font-display font-bold text-primary/70">
                {[0, 1, 2].map((i) => giamChuyenDong.current
                  ? <span key={i} className="text-[11px] leading-none" style={{ marginLeft: i * 6 }}>z</span>
                  : (
                    <motion.span key={i} className="text-[11px] leading-none" style={{ marginLeft: i * 6 }}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: [0, 1, 0], y: [6, -10] }}
                      transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}>z</motion.span>
                  ))}
              </span>
            )}
            {/* Bóng dưới chân: nhỏ lại khi mèo nhảy lên, cho cảm giác đang chạy trên mặt đất. */}
            {dangKeoMeo && !giamChuyenDong.current && (
              <motion.span aria-hidden className="pointer-events-none absolute bottom-0 left-1/2 h-1.5 w-1/2 -translate-x-1/2 rounded-full bg-black/15 blur-[2px]"
                animate={{ scaleX: [1, 0.7, 1, 0.9, 1], opacity: [0.5, 0.3, 0.5, 0.4, 0.5] }} transition={{ duration: 0.34, repeat: Infinity }} />
            )}
            {tt === 'can_ban' && <span aria-hidden className="absolute right-1 top-1 h-3 w-3 rounded-full bg-mimi-amber ring-2 ring-background" />}
            {tt === 'bi_chan' && <span aria-hidden className="absolute right-1 top-1 h-3 w-3 rounded-full bg-destructive ring-2 ring-background" />}
          </div>
        )}
        <div className="relative mt-2 flex w-full items-center justify-center" style={{ height: CAO_NUT }}>
          {/* Ô nhập nhỏ: thay chỗ thanh nút khi mở; gửi thì câu hỏi vào thẳng Trợ lý MIMI. */}
          {moO ? (
            <form
              onSubmit={guiCau}
              onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setMoO(false); } }}
              className="absolute top-0 flex h-11 w-[22rem] max-w-[calc(100vw-16px)] items-center gap-1 rounded-full bg-card py-1 pl-1 pr-1 shadow-xl ring-1 ring-border"
              style={vi.x + 352 > man.rong ? { right: 0 } : { left: 0 }}
            >
              <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/80 hover:bg-accent hover:text-foreground"
                aria-label="Mở Trợ lý MIMI đầy đủ" title="Mở Trợ lý MIMI đầy đủ" onClick={() => { setMoO(false); moTroLy(); }}>
                <Plus size={18} />
              </button>
              <input
                autoFocus value={cauNhap} onChange={(e) => setCauNhap(e.target.value)} maxLength={1000}
                placeholder="Hỏi MIMI…" aria-label="Hỏi MIMI"
                className="min-w-0 flex-1 bg-transparent px-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button type="submit" disabled={!cauNhap.trim()} aria-label="Gửi cho Trợ lý MIMI" title="Gửi cho Trợ lý MIMI"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40">
                <ArrowUp size={16} />
              </button>
            </form>
          ) : (
          <div className="flex items-center rounded-full bg-card/90 px-1 py-0.5 shadow-md ring-1 ring-border backdrop-blur">
            <button type="button" className={nut} aria-label="Gõ để hỏi Trợ lý MIMI" title="Hỏi MIMI" onClick={batO}><SquarePen size={16} /></button>
            <span aria-hidden className="h-4 w-px bg-border" />
            <button type="button" className={`${nut} ${dangNghe ? 'text-primary' : ''}`} aria-label={dangNghe ? 'Đang nghe' : 'Nói với MIMI'} aria-pressed={dangNghe} title="Nói với MIMI" onClick={noi}>
              {dangNghe && !giamChuyenDong.current
                ? <motion.span animate={{ scaleY: [1, 0.55, 1] }} transition={{ duration: 0.6, repeat: Infinity }}><AudioLines size={16} /></motion.span>
                : <AudioLines size={16} />}
            </button>
            <span aria-hidden className="h-4 w-px bg-border" />
            <button type="button" className={`${nut} relative`} aria-label={`Hoạt động${chuong ? ` — ${chuong} mục` : ''}`} aria-expanded={moKhay} title="Hoạt động"
              onClick={() => { setMoKhay((m) => !m); setLo(false); void napViec(); }}>
              <ChevronDown size={16} className={`transition-transform duration-200 ${(moKhay ? !theOTren : theOTren) ? 'rotate-180' : ''}`} />
              {chuong > 0 && <span className="absolute -right-0.5 -top-1 min-w-4 rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">{chuong}</span>}
            </button>
          </div>
          )}
        </div>

        {/* Thẻ hoạt động: bấm mũi tên thì bung/thu; có chuyện mới thì thẻ trên cùng tự ló lên vài giây. */}
        <AnimatePresence>
          {(moKhay || theHien.length > 0) && (
            <motion.div
              key="the"
              role={moKhay ? 'dialog' : 'status'} aria-label="Hoạt động của MIMI"
              initial={{ opacity: 0, y: theOTren ? 10 : -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: theOTren ? 10 : -10, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className={`absolute flex w-72 gap-2 ${theOTren ? 'bottom-full mb-2 flex-col-reverse' : 'top-full mt-1 flex-col'}`}
              style={vi.x + 288 > man.rong ? { right: 0 } : { left: 0 }}
            >
              {moKhay && the.length === 0 && (
                <div className="rounded-3xl bg-card px-5 py-3 text-sm shadow-xl ring-1 ring-border">
                  <p className="font-semibold text-foreground">Không có gì cần bạn lúc này</p>
                  <p className="text-muted-foreground">Sẵn sàng</p>
                </div>
              )}
              <AnimatePresence initial={false}>
                {theHien.map((h) => (
                  <motion.button
                    key={h.khoa} type="button" layout onClick={h.bam}
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="block w-full overflow-hidden rounded-3xl bg-card px-5 py-3 text-left text-sm shadow-xl ring-1 ring-border hover:bg-accent"
                  >
                    <span className="block truncate font-semibold text-foreground">{h.tieu}</span>
                    <span className={`block truncate ${h.mau}`}>{h.phu}</span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Menu chuột phải / giữ lâu */}
        {moMenu && (
          <div role="menu" aria-label="Tuỳ chọn MIMI" className="absolute bottom-full mb-2 w-52 rounded-xl bg-card p-1 text-sm shadow-xl ring-1 ring-border"
            style={vi.x + 208 > man.rong ? { right: 0 } : { left: 0 }} onMouseLeave={() => setMoMenu(false)}>
            <button type="button" role="menuitem" className="w-full rounded-lg px-3 py-2 text-left hover:bg-accent" onClick={() => { setMoMenu(false); doiCd({ an: true }); toast('Đã ẩn MIMI. Alt+Shift+M hoặc nút "MIMI" ở mép phải để hiện lại.'); }}>Ẩn MIMI</button>
            {coHoTroNoi() && (
              <button type="button" role="menuitem" className="w-full rounded-lg px-3 py-2 text-left hover:bg-accent" onClick={() => void raManHinhMay()}>Đưa MIMI ra màn hình máy</button>
            )}
            <button type="button" role="menuitem" className="w-full rounded-lg px-3 py-2 text-left hover:bg-accent" onClick={() => { setMoMenu(false); doiCd({ mini: !cd.mini }); }}>{cd.mini ? 'Hiện mèo' : 'Chế độ Mini (chỉ nút)'}</button>
            <div className="flex gap-1 px-2 py-1.5" role="group" aria-label="Kích thước">
              {(['nho', 'vua', 'lon'] as CoPet[]).map((c) => (
                <button key={c} type="button" role="menuitemradio" aria-checked={cd.co === c} onClick={() => doiCd({ co: c })}
                  className={`flex-1 rounded-md py-1 text-xs ${cd.co === c ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>{c === 'nho' ? 'Nhỏ' : c === 'vua' ? 'Vừa' : 'Lớn'}</button>
              ))}
            </div>
            <button type="button" role="menuitem" className="w-full rounded-lg px-3 py-2 text-left hover:bg-accent" onClick={() => { setMoMenu(false); doiCd({ x: null, y: null }); }}>Về góc mặc định</button>
          </div>
        )}
      </div>
    </>
  );
}
