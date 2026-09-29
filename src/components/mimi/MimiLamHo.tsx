import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import meoDi from '@/assets/mimi/walk.png';
import meoBam from '@/assets/mimi/paw.png';
import { SU_KIEN_KET_QUA, kiemKichBan, type KetQuaTrang, type KichBan } from '@/lib/mimiLamHo';

/**
 * Con trỏ mèo MIMI — thực hiện một `KichBan` ngay trên giao diện, cho người dùng xem.
 *
 * Mèo đi tới đích bằng lò xo (không dịch chuyển tức thời — mắt người phải theo
 * kịp thì mới hiểu nó đang làm gì), khoanh sáng chỗ cần nhìn, và nói bằng bong
 * bóng. Người dùng giành lại quyền bất cứ lúc nào: phím Esc, nút "Dừng", hoặc
 * tự bấm vào đâu đó trên trang.
 *
 * HAI LỚP CHẶN NÚT NGUY HIỂM. `kiemKichBan` từ chối kịch bản có bước tự bấm nút
 * trong `DICH_KHONG_TU_BAM`; và lúc chạy, phần tử nào nằm trong
 * `[data-mimi-khong-tu-bam]` thì không bao giờ bị `click()` — kể cả khi kịch bản
 * đến từ một nguồn khác sau này.
 */

/**
 * `xong` CHỈ true khi việc thật sự xong: mọi bước đã chạy, hoặc người dùng đã tự bấm nút cuối.
 * Dừng giữa chừng, hết giờ chờ người bấm, không thấy đích → `xong: false` kèm `ketThuc` nói đúng lý do.
 * (Lỗi cũ: bấm "Dừng" hoặc bỏ đi lúc mèo chờ bấm vẫn trả `xong: true` — pet báo hoàn tất việc đã huỷ.)
 *
 * Người dùng bấm nút nhường mới là GỬI yêu cầu. `xong` chỉ true khi trang báo yêu cầu đó thành công
 * (`baoKetQua`); trang báo lỗi → `loi`; không báo gì → `chua_ro`. (Lỗi cũ: báo xong ngay lúc bấm, trong
 * khi yêu cầu còn đang chạy rồi thất bại.)
 */
export type KetThucLamHo = 'xong' | 'da_dung' | 'cho_ban_bam' | 'khong_thay' | 'tu_choi' | 'loi' | 'chua_ro';

export interface KetQuaLamHo {
  xong: boolean;
  ketThuc: KetThucLamHo;
  cau: string;
}

const DA_DUNG: KetQuaLamHo = { xong: false, ketThuc: 'da_dung', cau: 'Đã dừng. Phần còn lại bạn làm tiếp nhé.' };

interface NguCanh {
  chay: (kb: KichBan) => Promise<KetQuaLamHo>;
  dung: () => void;
  dangChay: boolean;
}

const Ctx = createContext<NguCanh | null>(null);

export function useMimiLamHo(): NguCanh {
  const c = useContext(Ctx);
  if (!c) throw new Error('useMimiLamHo phải nằm trong MimiLamHoProvider');
  return c;
}

const ngu = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function timDich(dich: string): HTMLElement | null {
  const ds = document.querySelectorAll<HTMLElement>(`[data-mimi="${CSS.escape(dich)}"]`);
  for (const el of ds) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/** Gõ vào ô do React điều khiển: đặt giá trị qua setter gốc rồi bắn sự kiện input. */
function datGiaTri(el: HTMLElement, gia: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, gia);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

const CO_MEO = 48;

/** Chờ trang báo kết quả sau khi người dùng bấm nút nhường. */
export const CHO_KET_QUA_MS = 20_000;

export function MimiLamHoProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [hien, setHien] = useState(false);
  const [vi, setVi] = useState({ x: 0, y: 0 });
  const [quayTrai, setQuayTrai] = useState(false);
  const [noi, setNoi] = useState('');
  const [vong, setVong] = useState<DOMRect | null>(null);
  const [dangBam, setDangBam] = useState(false);
  const [dangChay, setDangChay] = useState(false);

  const biDung = useRef(false);
  const dangChayRef = useRef(false);
  const choNguoiBam = useRef(false);
  const viRef = useRef({ x: 0, y: 0 });
  const giamChuyenDong = useRef(false);

  useEffect(() => {
    giamChuyenDong.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const dung = useCallback(() => {
    biDung.current = true;
  }, []);

  // Esc dừng; người dùng tự bấm vào trang cũng là giành lại quyền — trừ lúc mèo
  // đang chờ chính người dùng bấm vào nút nó chỉ.
  useEffect(() => {
    if (!dangChay) return;
    const phim = (e: KeyboardEvent) => e.key === 'Escape' && dung();
    const cham = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest('[data-mimi-lop-phu]')) return;
      if (!choNguoiBam.current) dung();
    };
    window.addEventListener('keydown', phim);
    window.addEventListener('pointerdown', cham, true);
    return () => {
      window.removeEventListener('keydown', phim);
      window.removeEventListener('pointerdown', cham, true);
    };
  }, [dangChay, dung]);

  const diToi = useCallback(async (el: HTMLElement) => {
    const nhanh = giamChuyenDong.current;
    el.scrollIntoView({ block: 'center', behavior: nhanh ? 'auto' : 'smooth' });
    await ngu(nhanh ? 50 : 420);
    const r = el.getBoundingClientRect();
    setVong(r);
    const dich = {
      x: Math.min(window.innerWidth - CO_MEO, Math.max(0, r.left + Math.min(r.width / 2, 60))),
      y: Math.min(window.innerHeight - CO_MEO, Math.max(0, r.top + r.height / 2)),
    };
    setQuayTrai(dich.x < viRef.current.x);
    viRef.current = dich;
    setVi(dich);
    await ngu(nhanh ? 50 : 800);
  }, []);

  const choDich = useCallback(async (dich: string, ms: number) => {
    const het = Date.now() + ms;
    while (Date.now() < het) {
      if (biDung.current) return null;
      const el = timDich(dich);
      if (el) return el;
      await ngu(120);
    }
    return null;
  }, []);

  const chay = useCallback(
    async (kb: KichBan): Promise<KetQuaLamHo> => {
      const loi = kiemKichBan(kb);
      if (loi.length) return { xong: false, ketThuc: 'tu_choi', cau: `Mình không làm việc này: ${loi.join(' ')}` };
      if (dangChayRef.current) return { xong: false, ketThuc: 'tu_choi', cau: 'Mình đang làm dở một việc khác.' };

      dangChayRef.current = true;
      biDung.current = false;
      setDangChay(true);
      const batDau = { x: window.innerWidth - 96, y: window.innerHeight - 120 };
      viRef.current = batDau;
      setVi(batDau);
      setHien(true);
      // Nói ngay mình đang làm gì: mèo đứng im không lời là người dùng tưởng nó treo rồi bấm đi chỗ
      // khác — và cú bấm đó bị hiểu là "giành lại quyền" (lỗi 26/09/2026: "tạo agent" → "Đã dừng").
      setNoi(`Mình bắt đầu: ${kb.moTa}.`);

      try {
        for (const b of kb.buoc) {
          if (biDung.current) return DA_DUNG;

          if (b.loai === 'di_toi') {
            setNoi(b.noi);
            navigate(b.duongDan);
            await ngu(450);
            continue;
          }

          // 8 giây: trang vừa mở còn phải tải dữ liệu xong mới hiện nút. Chờ 4
          // giây thì mạng chậm là mèo báo "không thấy" trước khi trang kịp hiện.
          // Bước "chỉ cho xem" không bắt buộc (neuKhongThay === '') thì chỉ chờ 0,7 giây: mục đó có thể
          // không còn trên thanh bên (vd. "Kiểm soát agent" rời thanh bên khi gộp trang) — trước đây mèo
          // đứng im 8 giây chờ nó.
          const tuyChon = b.loai === 'chi' && b.neuKhongThay === '';
          if (!tuyChon) setNoi((cu) => cu || 'Đang chờ trang tải xong…');
          const el = await choDich(b.dich, tuyChon ? 700 : 8000);
          if (!el) {
            if (biDung.current) return DA_DUNG;
            if (b.loai === 'chi' && b.neuKhongThay !== undefined) {
              if (b.neuKhongThay === '') continue;
              setVong(null);
              setNoi(b.neuKhongThay);
              await ngu(2200);
              // Kịch bản khai sẵn "không có đích thì nói câu này" (vd. không có khoản chờ duyệt): đó là câu
              // trả lời đúng, nhưng việc được nhờ KHÔNG được làm — không báo hoàn tất.
              return { xong: false, ketThuc: 'khong_thay', cau: b.neuKhongThay };
            }
            return { xong: false, ketThuc: 'khong_thay', cau: 'Mình không thấy chỗ cần tới trên trang này, nên dừng ở đây.' };
          }

          setNoi(b.noi);
          await diToi(el);
          // Mèo đi mất gần một giây; người dùng bấm Esc trong lúc đó thì không được gõ hay bấm tiếp.
          if (biDung.current) return DA_DUNG;

          if (b.loai === 'chi') {
            await ngu(1800);
          } else if (b.loai === 'go') {
            el.focus();
            for (let i = 1; i <= b.chu.length; i++) {
              if (biDung.current) break;
              datGiaTri(el, b.chu.slice(0, i));
              await ngu(giamChuyenDong.current ? 0 : 38);
            }
            await ngu(350);
          } else if (b.loai === 'bam') {
            if (el.closest('[data-mimi-khong-tu-bam]')) {
              return { xong: false, ketThuc: 'tu_choi', cau: 'Nút này phải do bạn tự bấm — mình đã dừng trước nó.' };
            }
            setDangBam(true);
            await ngu(260);
            // Kiểm lần cuối NGAY trước cú bấm (lỗi cũ: Esc trong lúc mèo nhấn xuống vẫn bấm một lần).
            if (biDung.current) return DA_DUNG;
            el.click();
            await ngu(360);
            setDangBam(false);
          } else if (b.loai === 'nhuong') {
            choNguoiBam.current = true;
            // Nghe kết quả từ trước khi người dùng bấm: yêu cầu hỏng ngay (mất mạng) có thể báo về rất nhanh.
            const nhan: { kq: KetQuaTrang | null } = { kq: null };
            const ghiKetQua = (e: Event) => {
              const d = (e as CustomEvent<KetQuaTrang>).detail;
              if (d?.dich === b.dich) nhan.kq = d;
            };
            window.addEventListener(SU_KIEN_KET_QUA, ghiKetQua);
            try {
              // Một lối ra duy nhất: bấm, dừng, hoặc hết giờ — dọn cả hai bộ hẹn giờ và trình nghe ở mọi lối.
              const ketThuc = await new Promise<'bam' | 'dung' | 'het_gio'>((xong) => {
                let daXong = false;
                const ra = (kq: 'bam' | 'dung' | 'het_gio') => {
                  if (daXong) return;
                  daXong = true;
                  window.clearInterval(hen);
                  window.clearTimeout(hetGio);
                  el.removeEventListener('click', khiBam);
                  xong(kq);
                };
                const khiBam = () => ra('bam');
                const hen = window.setInterval(() => { if (biDung.current) ra('dung'); }, 150);
                const hetGio = window.setTimeout(() => ra('het_gio'), 30_000);
                el.addEventListener('click', khiBam, { once: true });
              });
              if (ketThuc === 'dung') return DA_DUNG;
              if (ketThuc === 'het_gio') {
                return { xong: false, ketThuc: 'cho_ban_bam', cau: `Mình đã chỉ đúng chỗ nhưng bạn chưa bấm, nên việc này CHƯA xong. ${b.noi}` };
              }

              // Bấm rồi thì yêu cầu đã đi — Esc lúc này chỉ ngừng theo dõi, không huỷ được yêu cầu.
              setVong(null);
              setNoi('Bạn đã bấm. Mình chờ trang báo kết quả…');
              const han = Date.now() + CHO_KET_QUA_MS;
              while (!nhan.kq && !biDung.current && Date.now() < han) await ngu(120);
              const kq = nhan.kq;
              if (kq?.ok) return { xong: true, ketThuc: 'xong', cau: kq.cau ?? 'Trang đã báo xong.' };
              if (kq) return { xong: false, ketThuc: 'loi', cau: kq.cau ?? 'Trang báo việc này không thành công.' };
              return {
                xong: false,
                ketThuc: 'chua_ro',
                cau: 'Bạn đã bấm nên yêu cầu đã gửi đi, nhưng trang chưa báo kết quả — xem thông báo trên trang để biết việc đã xong chưa.',
              };
            } finally {
              window.removeEventListener(SU_KIEN_KET_QUA, ghiKetQua);
              choNguoiBam.current = false;
            }
          }
        }
        if (biDung.current) return DA_DUNG;
        return { xong: true, ketThuc: 'xong', cau: 'Xong rồi.' };
      } finally {
        await ngu(biDung.current ? 0 : 600);
        setVong(null);
        setNoi('');
        setHien(false);
        setDangBam(false);
        choNguoiBam.current = false;
        dangChayRef.current = false;
        setDangChay(false);
      }
    },
    [choDich, diToi, navigate],
  );

  const giaTri = useMemo(() => ({ chay, dung, dangChay }), [chay, dung, dangChay]);
  const bongBongBenTrai = vi.x > window.innerWidth - 320;

  return (
    <Ctx.Provider value={giaTri}>
      {children}
      <AnimatePresence>
        {hien && vong && (
          <motion.div
            key="vong"
            aria-hidden
            className="pointer-events-none fixed z-[70] rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, left: vong.left - 4, top: vong.top - 4, width: vong.width + 8, height: vong.height + 8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ position: 'fixed' }}
          />
        )}
        {hien && (
          <motion.div
            key="meo"
            data-mimi-lop-phu
            className="pointer-events-none fixed left-0 top-0 z-[71]"
            initial={{ opacity: 0, x: vi.x, y: vi.y, scale: 0.6 }}
            animate={{ opacity: 1, x: vi.x, y: vi.y, scale: dangBam ? 0.85 : 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={
              giamChuyenDong.current ? { duration: 0 } : { type: 'spring', stiffness: 110, damping: 19, mass: 0.8 }
            }
          >
            <img
              src={dangBam ? meoBam : meoDi}
              alt=""
              draggable={false}
              className="select-none no-save drop-shadow-lg"
              style={{ width: CO_MEO, height: CO_MEO, objectFit: 'contain', transform: `scaleX(${quayTrai ? -1 : 1})` }}
            />
            {noi && (
              <div
                role="status"
                aria-live="polite"
                className={`pointer-events-auto absolute top-1 w-64 rounded-2xl border border-border bg-card p-3 text-[13px] leading-snug text-foreground shadow-lg ${
                  bongBongBenTrai ? 'right-14' : 'left-14'
                }`}
              >
                <p>{noi}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>MIMI đang làm hộ · Esc để dừng</span>
                  <button
                    type="button"
                    onClick={dung}
                    className="rounded-full border border-border px-2.5 py-0.5 font-medium text-foreground hover:bg-accent"
                  >
                    Dừng
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}
