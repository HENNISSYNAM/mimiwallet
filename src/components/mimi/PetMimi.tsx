import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Mic, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import AIChatWidget, { type TrangThaiChat } from '@/components/AIChatWidget';
import { coHoTroNoi, moCuaSoNoi, PetNoi } from '@/components/mimi/PetNoi';
import { goiTroLy } from '@/lib/goiTroLy';
import {
  dangMeo, docCaiDat, giuTrongMan, KICH_THUOC, laPhimTat, luuCaiDat, TEN_TRANG_THAI_PET, trangThaiPet,
  type CaiDatPet, type CoPet,
} from '@/lib/petMimi';
import idle from '@/assets/mimi/idle.png';
import sleep from '@/assets/mimi/sleep.png';
import wave from '@/assets/mimi/wave.png';
import surprised from '@/assets/mimi/surprised.png';
import happy from '@/assets/mimi/happy.png';
import run from '@/assets/mimi/run.png';
import stretch from '@/assets/mimi/stretch.png';
import sit from '@/assets/mimi/sit.png';
import paw from '@/assets/mimi/paw.png';

/**
 * Pet MIMI — mèo nổi trên trang, theo đúng cơ chế "Pets" của ChatGPT (xem `lib/petMimi.ts`).
 * Bấm mèo: mở/đóng chat. Kéo mèo: đổi chỗ (nhớ lại). Chuột phải / giữ lâu: menu. Alt+Shift+M: ẩn/hiện.
 */
const ANH: Record<string, string> = { idle, sleep, wave, surprised, happy, run, sit };
const PHUT_NGU = 3 * 60_000;
/** Vươn vai kéo dài bao lâu, và khoảng cách giữa hai lần vươn vai lúc rảnh mà còn thức. */
export const VUON_VAI_MS = 1600;
const VUON_VAI_TU = 50_000;
const VUON_VAI_DEN = 90_000;
/** Rảnh bao lâu thì ngồi xuống (trước khi ngủ ở phút thứ 3); rê chuột chào thì vẫy tay bao lâu. */
export const NGOI_SAU = 40_000;
export const CHAO_MS = 1400;
const CHAO_CACH = 15_000;
const RONG_KHUNG = 380;
const CAO_KHUNG = 560;
const CAO_NUT = 44;

interface ViecCanBan { id: string; tieu_de: string; cau: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const layNhanDien = (): any => (typeof window === 'undefined' ? null : (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null);

export default function PetMimi() {
  const [cd, setCd] = useState<CaiDatPet>(() => docCaiDat());
  const [man, setMan] = useState(() => ({ rong: window.innerWidth, cao: window.innerHeight }));
  const [moChat, setMoChat] = useState(false);
  const [moKhay, setMoKhay] = useState(false);
  const [moMenu, setMoMenu] = useState(false);
  const [chat, setChat] = useState<TrangThaiChat>({ dangTraLoi: false, dangLamHo: false, loi: false, chuaDoc: 0 });
  const [viec, setViec] = useState<ViecCanBan[]>([]);
  const [nguLau, setNguLau] = useState(false);
  const [dangNghe, setDangNghe] = useState(false);
  const [cauGui, setCauGui] = useState<{ id: number; cau: string } | null>(null);
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
  const [chao, setChao] = useState(false);
  const chaoLuc = useRef(0);
  const diemTruoc = useRef<{ x: number; t: number } | null>(null);
  // Mèo đang ở cửa sổ nổi trên màn hình máy (Document Picture-in-Picture).
  const [cuaSoNoi, setCuaSoNoi] = useState<Window | null>(null);
  const navigate = useNavigate();
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
    window.addEventListener('resize', doiMan);
    window.addEventListener('keydown', phim);
    return () => { window.removeEventListener('resize', doiMan); window.removeEventListener('keydown', phim); };
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

  const tt = trangThaiPet({ ...chat, soCanBan: viec.length });
  // Nghỉ lâu thì ngủ; có động là thức.
  useEffect(() => {
    setNguLau(false);
    setNgoi(false);
    if (tt !== 'nghi') return;
    const ngoiXuong = window.setTimeout(() => setNgoi(true), NGOI_SAU);
    const id = window.setTimeout(() => setNguLau(true), PHUT_NGU);
    return () => { window.clearTimeout(ngoiXuong); window.clearTimeout(id); };
  }, [tt, moChat, moKhay]);
  useEffect(() => {
    if (!chao) return;
    const id = window.setTimeout(() => setChao(false), CHAO_MS);
    return () => window.clearTimeout(id);
  }, [chao]);

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
  // Rảnh mà còn thức: hẹn lần vươn vai kế (50–90 giây); đang vươn vai thì chưa hẹn.
  useEffect(() => {
    if (tt !== 'nghi' || nguLau || moChat || dangKeoMeo || vuonVai) return;
    const hen = window.setTimeout(() => setVuonVai(true), VUON_VAI_TU + Math.random() * (VUON_VAI_DEN - VUON_VAI_TU));
    return () => window.clearTimeout(hen);
  }, [tt, nguLau, moChat, dangKeoMeo, vuonVai]);
  /** Rê chuột vào mèo: đang ngủ → thức (và vươn vai); đang thức rảnh → ngồi vẫy tay chào (tối đa 15 giây một lần). */
  const danhThuc = () => {
    if (nguLau) { setNguLau(false); return; }
    if (tt !== 'nghi' || dangKeoMeo || vuonVai) return;
    const bayGio = Date.now();
    if (bayGio - chaoLuc.current < CHAO_CACH) return;
    chaoLuc.current = bayGio;
    setChao(true);
  };

  // Ảnh theo thứ tự ưu tiên: bị kéo > tiếp đất > vươn vai > giơ tay (cần bạn / chào) > ngủ > ngồi > trạng thái.
  const giTay = !dangKeoMeo && !vuaTha && !vuonVai && (tt === 'can_ban' || chao);
  const anhMeo = dangKeoMeo ? run
    : vuaTha ? happy
      : vuonVai ? stretch
        : giTay ? sit
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
    }
    if (!k.da) return;
    setCd((c) => ({ ...c, ...giuTrongMan({ x: e.clientX - k.dx, y: e.clientY - k.dy }, kt, man) }));
    // Hướng và độ nghiêng theo vận tốc ngang (px/ms), giới hạn ±14°.
    const truoc = diemTruoc.current;
    const bayGio = performance.now();
    if (truoc && bayGio - truoc.t > 16) {
      const v = (e.clientX - truoc.x) / (bayGio - truoc.t);
      if (Math.abs(e.clientX - truoc.x) > 2) setHuongTrai(v < 0);
      setNghieng(Math.max(-14, Math.min(14, v * 10)));
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
    } else setMoChat((m) => !m);
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
      if (cau) { setMoChat(true); setCauGui({ id: Date.now(), cau }); }
    };
    nd.onerror = () => toast.error('Chưa nghe rõ. Thử nói lại, hoặc bấm nút bút để gõ.');
    nd.onend = () => setDangNghe(false);
    nd.start();
  };

  // Khung chat đặt cạnh pet: bên trái nếu đủ chỗ, không thì bên phải; luôn nằm trong màn.
  const viTriKhung = {
    left: vi.x - RONG_KHUNG - 12 >= 8 ? vi.x - RONG_KHUNG - 12 : Math.min(man.rong - RONG_KHUNG - 8, vi.x + kt.rong + 12),
    top: Math.min(Math.max(8, vi.y + kt.cao - CAO_KHUNG), man.cao - CAO_KHUNG - 8),
  };

  const chuong = viec.length + chat.chuaDoc + (chat.loi ? 1 : 0);
  const nut = 'flex h-9 w-9 items-center justify-center rounded-full bg-card/90 text-foreground shadow-md ring-1 ring-border backdrop-blur hover:bg-accent';

  const chatNode = (
    <AIChatWidget
      anNut mo={moChat} datMo={setMoChat} viTriKhung={viTriKhung} cauGui={cauGui}
      baoTrangThai={setChat} onLenhPet={() => doiCd({ an: !cd.an })}
    />
  );

  if (cuaSoNoi) {
    return (
      <>
        {chatNode}
        <PetNoi
          cuaSo={cuaSoNoi} anh={anhMeo} giTay={giTay} tt={tt} chuong={chuong} dangNghe={dangNghe}
          onGo={() => { veTrang(); setMoChat(true); }}
          onNoi={noi}
          onChuong={() => { veTrang(); if (viec.length) navigate(`/dashboard/viec-can-lam?ht=${viec[0].id}`); else setMoChat(true); }}
          onDong={() => setCuaSoNoi(null)}
        />
      </>
    );
  }

  if (cd.an) {
    return (
      <>
        {chatNode}
        <button type="button" onClick={() => doiCd({ an: false })} aria-label="Hiện MIMI (Alt+Shift+M)" title="Hiện MIMI (Alt+Shift+M)"
          className="fixed bottom-28 right-0 z-50 rounded-l-lg bg-card/90 px-1.5 py-2 text-[10px] font-semibold text-muted-foreground shadow ring-1 ring-border [writing-mode:vertical-rl] hover:text-foreground">
          MIMI
        </button>
      </>
    );
  }

  return (
    <>
      {chatNode}
      <div
        className="fixed z-50 flex select-none flex-col items-center"
        style={{ left: vi.x, top: vi.y, width: kt.rong }}
        onContextMenu={(e) => { e.preventDefault(); setMoMenu(true); }}
      >
        {!cd.mini && (
          <div className="relative" style={{ width: co, height: co }}>
            {/* Bong bóng trạng thái: chỉ khi có việc đáng nói. */}
            <AnimatePresence>
              {tt !== 'nghi' && !moChat && (
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
                ? { y: [0, -7, 0, -2, 0], scaleY: [1, 0.9, 1.06, 0.97, 1], scaleX: [1, 1.08, 0.95, 1.02, 1], rotate: huongTrai ? -nghieng : nghieng }
                : vuaTha && !giamChuyenDong.current
                  ? { y: [0, 3, 0], scaleY: [1, 0.86, 1], scaleX: [1, 1.1, 1], rotate: 0 }
                  : vuonVai && !giamChuyenDong.current
                    ? { y: [0, 2, 0, -2, 0], scaleX: [1, 1.14, 1.16, 1.04, 1], scaleY: [1, 0.9, 0.88, 1.03, 1], rotate: 0 }
                    : nguLau && !giamChuyenDong.current
                      ? { y: 0, scaleY: [1, 1.035, 1], scaleX: [1, 1.015, 1], rotate: 0 }
                      : { y: 0, scaleY: 1, scaleX: 1, rotate: 0 }}
              transition={dangKeoMeo ? { duration: 0.34, repeat: Infinity, ease: 'easeInOut' }
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
              data-gio-tay={giTay || undefined}
              onPointerEnter={danhThuc}
              aria-label={`MIMI — ${TEN_TRANG_THAI_PET[tt]}. Bấm để ${moChat ? 'đóng' : 'mở'} trò chuyện, kéo để di chuyển.`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMoChat((m) => !m); } }}
              onPointerDown={batDauKeo} onPointerMove={dangKeo} onPointerUp={thaKeo} onPointerCancel={thaKeo}
              animate={giamChuyenDong.current || tt !== 'dang_chay' || dangKeoMeo ? { y: 0 } : { y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: tt === 'dang_chay' && !dangKeoMeo && !giamChuyenDong.current ? Infinity : 0 }}
              style={{ transform: `scaleX(${dangKeoMeo && huongTrai ? -1 : 1})` }}
              className="no-save h-full w-full cursor-grab touch-none object-contain drop-shadow-lg active:cursor-grabbing"
            />
            </motion.div>
            {/* Giơ tay: bàn tay vẫy bên vai phải của mèo đang ngồi. */}
            {giTay && (
              <motion.img
                src={paw} alt="" aria-hidden draggable={false}
                className="pointer-events-none absolute object-contain drop-shadow"
                style={{ width: '40%', right: '-6%', top: '14%', transformOrigin: '50% 90%' }}
                initial={{ opacity: 0, y: 8, rotate: 0 }}
                animate={giamChuyenDong.current ? { opacity: 1, y: 0, rotate: 0 } : { opacity: 1, y: 0, rotate: [-12, 18, -12] }}
                transition={giamChuyenDong.current ? { duration: 0.2 } : { rotate: { duration: 0.7, repeat: Infinity, ease: 'easeInOut' }, default: { duration: 0.2 } }}
              />
            )}
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
        <div className="mt-2 flex items-center gap-1.5" style={{ height: CAO_NUT }}>
          <button type="button" className={nut} aria-label="Gõ để trò chuyện" title="Gõ để trò chuyện" onClick={() => setMoChat((m) => !m)}><Pencil size={15} /></button>
          <button type="button" className={`${nut} ${dangNghe ? 'text-primary ring-primary' : ''}`} aria-label={dangNghe ? 'Đang nghe' : 'Nói với MIMI'} aria-pressed={dangNghe} title="Nói với MIMI" onClick={noi}><Mic size={15} /></button>
          <button type="button" className={`${nut} relative`} aria-label={`Hoạt động${chuong ? ` — ${chuong} mục` : ''}`} title="Hoạt động" onClick={() => { setMoKhay((m) => !m); void napViec(); }}>
            <Bell size={15} />
            {chuong > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">{chuong}</span>}
          </button>
        </div>

        {/* Khay hoạt động */}
        {moKhay && (
          <div role="dialog" aria-label="Hoạt động của MIMI" className="absolute bottom-full mb-2 w-72 rounded-2xl bg-card p-3 text-sm shadow-xl ring-1 ring-border"
            style={vi.x + 288 > man.rong ? { right: 0 } : { left: 0 }}>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Hoạt động</p>
            {chuong === 0 && <p className="text-muted-foreground">Không có gì cần bạn lúc này.</p>}
            <ul className="space-y-1.5">
              {viec.map((v) => (
                <li key={v.id}>
                  <Link to={`/dashboard/viec-can-lam?ht=${v.id}`} onClick={() => setMoKhay(false)} className="block rounded-lg p-2 hover:bg-accent">
                    <span className="text-xs font-medium text-mimi-amber">Cần bạn · {v.tieu_de}</span>
                    <span className="block text-foreground">{v.cau}</span>
                  </Link>
                </li>
              ))}
              {chat.chuaDoc > 0 && (
                <li><button type="button" onClick={() => { setMoKhay(false); setMoChat(true); }} className="w-full rounded-lg p-2 text-left hover:bg-accent">
                  <span className="text-xs font-medium text-primary">Xong — chưa xem</span>
                  <span className="block text-foreground">{chat.chuaDoc} câu trả lời mới</span>
                </button></li>
              )}
              {chat.loi && (
                <li><button type="button" onClick={() => { setMoKhay(false); setMoChat(true); }} className="w-full rounded-lg p-2 text-left hover:bg-accent">
                  <span className="text-xs font-medium text-destructive">Bị chặn</span>
                  <span className="block text-foreground">Lần hỏi vừa rồi chưa xong — mở để thử lại</span>
                </button></li>
              )}
            </ul>
          </div>
        )}

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
