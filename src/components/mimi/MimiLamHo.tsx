import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import meoDi from '@/assets/mimi/walk.png';
import meoBam from '@/assets/mimi/paw.png';
import { supabase } from '@/integrations/supabase/client';
import { idCongTyDangDung, SU_KIEN_DOI_CONG_TY } from '@/lib/congTyDangDung';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import { SU_KIEN_KET_QUA, kiemKichBan, type KetQuaTrang, type KichBan } from '@/lib/mimiLamHo';
import { soTroToiDa } from '../../../supabase/functions/_shared/billing/bang-gia.ts';

/**
 * Con trỏ mèo MIMI — thực hiện `KichBan` ngay trên giao diện, cho người dùng xem.
 *
 * Mèo đi tới đích bằng lò xo (không dịch chuyển tức thời — mắt người phải theo
 * kịp thì mới hiểu nó đang làm gì), khoanh sáng chỗ cần nhìn, và nói bằng bong
 * bóng. Người dùng giành lại quyền bất cứ lúc nào: phím Esc, nút "Dừng", hoặc
 * tự bấm vào đâu đó trên trang.
 *
 * NHIỀU TRỎ (11/10/2026). Mỗi trỏ đại diện MỘT agent người dùng đã tạo ở Kiểm soát agent (bảng `tac_tu`),
 * mang tên và màu riêng của agent đó. Agent tạm dừng / thu hồi thì trỏ của nó không chạy (đang chạy thì
 * dừng). Chưa có agent nào đang hoạt động thì vẫn có một trỏ "MIMI" như trước — trợ lý không mất khả năng
 * làm hộ. Số trỏ chạy song song tối đa theo gói: `soTroToiDa` (ĐỀ XUẤT, `_shared/billing/bang-gia.ts`).
 *
 * HAI LUẬT CHO NHIỀU TRỎ CÙNG MỘT TRANG:
 *  1. Khoá theo đích `data-mimi`: hai trỏ không bao giờ cùng thao tác một đích; trỏ đến sau đứng chờ.
 *  2. Đổi trang xếp hàng: chỉ một trỏ được `di_toi` tại một thời điểm, và chỉ khi mọi trỏ khác đang làm
 *     trên đúng trang đích (hoặc cũng đang chờ đổi trang). Không có chuyện hai trỏ giật trang qua lại.
 *
 * HAI LỚP CHẶN NÚT NGUY HIỂM (giữ nguyên với mọi trỏ). `kiemKichBan` từ chối kịch bản có bước tự bấm nút
 * trong `DICH_KHONG_TU_BAM`; và lúc chạy, phần tử nào nằm trong `[data-mimi-khong-tu-bam]` thì không bao
 * giờ bị `click()` — kể cả khi kịch bản đến từ một nguồn khác sau này.
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

/** Một trỏ = một agent (hoặc trỏ MIMI mặc định khi chưa có agent nào hoạt động). */
export interface TroTacTu {
  id: string;
  ten: string;
  /** Màu riêng của agent; null = màu chủ đạo của MIMI. */
  mau: string | null;
}

/** Dòng `tac_tu` cần cho trỏ — đọc thẳng bảng (RLS cho thành viên đọc), như trang Kiểm soát agent. */
export interface TacTuDoc {
  id: string;
  ten: string;
  trang_thai: string;
}

export const TRO_MIMI: TroTacTu = { id: 'mimi', ten: 'MIMI', mau: null };

/** Đủ tối trên nền sáng và đủ sáng trên nền tối để chữ trắng đọc được (tương phản ≥ 4.5:1 với trắng). */
const BANG_MAU = ['#c2410c', '#1d4ed8', '#047857', '#7e22ce', '#be123c', '#0e7490', '#4d7c0f', '#a21caf'];

function bam(chu: string): number {
  let h = 0;
  for (let i = 0; i < chu.length; i++) h = (h * 31 + chu.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Trỏ được chạy: agent đang `hoat_dong`, theo thứ tự tạo, tối đa `soToiDa`. Hai agent trùng màu thì
 * agent sau lấy màu kế tiếp còn trống — trên màn hình hai trỏ cùng màu là không phân biệt được.
 * Không có agent nào đang hoạt động (hoặc chưa đọc được) → một trỏ MIMI.
 */
export function chonTro(ds: TacTuDoc[] | null | undefined, soToiDa: number): TroTacTu[] {
  const dangDung = (ds ?? []).filter((t) => t.trang_thai === 'hoat_dong').slice(0, Math.max(1, soToiDa));
  if (!dangDung.length) return [TRO_MIMI];
  const daDung = new Set<string>();
  return dangDung.map((t) => {
    let i = bam(t.id) % BANG_MAU.length;
    for (let k = 0; k < BANG_MAU.length && daDung.has(BANG_MAU[i]); k++) i = (i + 1) % BANG_MAU.length;
    daDung.add(BANG_MAU[i]);
    return { id: t.id, ten: t.ten, mau: BANG_MAU[i] };
  });
}

async function taiTacTuMacDinh(): Promise<TacTuDoc[] | null> {
  const id = await idCongTyDangDung();
  if (!id) return null;
  const { data, error } = await supabase.from('tac_tu').select('id, ten, trang_thai').eq('company_id', id).order('created_at', { ascending: true });
  if (error) return null;
  return (data ?? []) as TacTuDoc[];
}

interface NguCanh {
  /** Chạy một kịch bản trên trỏ còn rảnh (hoặc đúng trỏ `tro` nếu chỉ định). */
  chay: (kb: KichBan, tuyChon?: { tro?: string }) => Promise<KetQuaLamHo>;
  /** Không truyền gì: dừng TẤT CẢ trỏ (như trước). Truyền id: chỉ dừng trỏ đó. */
  dung: (tro?: string) => void;
  /**
   * true khi KHÔNG còn trỏ nào rảnh để nhận việc mới. Một trỏ (mặc định): đúng nghĩa cũ "đang chạy".
   * Trang Trợ lý đọc cờ này để khỏi giao thêm việc khi mọi trỏ đều bận.
   */
  dangChay: boolean;
  /** Số trỏ đang chạy. */
  soDangChay: number;
  /** Các trỏ hiện được phép chạy (agent đang hoạt động, theo gói). */
  dsTro: TroTacTu[];
}

const Ctx = createContext<NguCanh | null>(null);

export function useMimiLamHo(): NguCanh {
  const c = useContext(Ctx);
  if (!c) throw new Error('useMimiLamHo phải nằm trong MimiLamHoProvider');
  return c;
}

/** Như `useMimiLamHo` nhưng trả null khi không có provider (trang dựng riêng trong test, ngoài /dashboard). */
export function useMimiLamHoNeuCo(): NguCanh | null {
  return useContext(Ctx);
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

/** "/dashboard/tac-tu?tab=x#y" và "/dashboard/tac-tu" là cùng một trang khi xét xếp hàng đổi trang. */
const trangCua = (duongDan: string) => duongDan.split(/[?#]/)[0] || '/';

const CO_MEO = 48;

/** Chờ trang báo kết quả sau khi người dùng bấm nút nhường. */
export const CHO_KET_QUA_MS = 20_000;
/** Chờ trỏ khác nhả một đích tối đa bao lâu (nhường người bấm đã có hạn 30 giây + chờ kết quả 20 giây). */
export const CHO_KHOA_DICH_MS = 60_000;
/** Trong lúc có trỏ đang chạy: đọc lại danh sách agent bao lâu một lần, để agent vừa bị tạm dừng thì trỏ dừng. */
const CHU_KY_DOC_TAC_TU_MS = 20_000;

interface HinhTro {
  tro: TroTacTu;
  vi: { x: number; y: number };
  quayTrai: boolean;
  noi: string;
  vong: DOMRect | null;
  dangBam: boolean;
}

/** Trạng thái chạy của một trỏ — ref, không phải state: vòng lặp kịch bản đọc nó giữa các lần `await`. */
interface Phien {
  tro: TroTacTu;
  biDung: boolean;
  lyDoDung: string | null;
  choNguoiBam: boolean;
  vi: { x: number; y: number };
  /** Trang trỏ đang làm; null = đang chờ đổi trang (không giữ trang nào). */
  trang: string | null;
}

export function MimiLamHoProvider({
  children,
  taiTacTu = taiTacTuMacDinh,
  soTroToiDa: soTroCoDinh,
}: {
  children: ReactNode;
  /** Đọc danh sách agent — test truyền hàm giả; mặc định đọc bảng `tac_tu` của công ty đang dùng. */
  taiTacTu?: () => Promise<TacTuDoc[] | null>;
  /** Ghi đè số trỏ tối đa (test); mặc định theo gói đang dùng. */
  soTroToiDa?: number;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const plan = useSubscriptionStore((s) => s.plan);
  const soToiDa = soTroCoDinh ?? soTroToiDa(plan);

  const [tacTu, setTacTu] = useState<TacTuDoc[] | null>(null);
  const dsTro = useMemo(() => chonTro(tacTu, soToiDa), [tacTu, soToiDa]);
  const dsTroRef = useRef(dsTro);
  dsTroRef.current = dsTro;

  const [hinh, setHinh] = useState<Record<string, HinhTro>>({});
  const [soDangChay, setSoDangChay] = useState(0);
  const phien = useRef(new Map<string, Phien>());
  /** đích `data-mimi` → id trỏ đang giữ. */
  const khoaDich = useRef(new Map<string, string>());
  /** id trỏ đang đổi trang (chỉ một tại một thời điểm). */
  const dangDiToi = useRef<string | null>(null);
  const trangHienTai = useRef(trangCua(location.pathname));
  trangHienTai.current = trangCua(location.pathname);
  const giamChuyenDong = useRef(false);

  useEffect(() => {
    giamChuyenDong.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const docTacTu = useCallback(async () => {
    try {
      setTacTu(await taiTacTu());
    } catch {
      // Không đọc được: giữ danh sách cũ. Không xoá trỏ đang chạy chỉ vì một lần mạng chập.
    }
  }, [taiTacTu]);

  useEffect(() => {
    void docTacTu();
    const lai = () => void docTacTu();
    window.addEventListener(SU_KIEN_DOI_CONG_TY, lai);
    window.addEventListener('focus', lai);
    return () => {
      window.removeEventListener(SU_KIEN_DOI_CONG_TY, lai);
      window.removeEventListener('focus', lai);
    };
  }, [docTacTu]);

  // Đang có trỏ chạy thì đọc lại định kỳ: agent bị tạm dừng / thu hồi ở tab khác phải dừng trỏ của nó.
  useEffect(() => {
    if (!soDangChay) return;
    const hen = window.setInterval(() => void docTacTu(), CHU_KY_DOC_TAC_TU_MS);
    return () => window.clearInterval(hen);
  }, [soDangChay, docTacTu]);

  // Trỏ của agent không còn được phép chạy (tạm dừng, thu hồi, hoặc vượt số trỏ của gói) → dừng ngay.
  useEffect(() => {
    const conDuoc = new Set(dsTro.map((t) => t.id));
    for (const [id, p] of phien.current) {
      if (id === TRO_MIMI.id || conDuoc.has(id) || p.biDung) continue;
      p.biDung = true;
      p.lyDoDung = `Agent "${p.tro.ten}" vừa bị tạm dừng hoặc thu hồi, nên trỏ của nó đã dừng.`;
    }
  }, [dsTro]);

  const dung = useCallback((tro?: string) => {
    for (const [id, p] of phien.current) {
      if (!tro || id === tro) p.biDung = true;
    }
  }, []);

  // Esc dừng tất cả; người dùng tự bấm vào trang cũng là giành lại quyền — trừ lúc có trỏ đang chờ chính
  // người dùng bấm vào nút nó chỉ.
  useEffect(() => {
    if (!soDangChay) return;
    const phim = (e: KeyboardEvent) => e.key === 'Escape' && dung();
    const cham = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest('[data-mimi-lop-phu]')) return;
      if ([...phien.current.values()].some((p) => p.choNguoiBam)) return;
      dung();
    };
    window.addEventListener('keydown', phim);
    window.addEventListener('pointerdown', cham, true);
    return () => {
      window.removeEventListener('keydown', phim);
      window.removeEventListener('pointerdown', cham, true);
    };
  }, [soDangChay, dung]);

  const chay = useCallback(
    async (kb: KichBan, tuyChon?: { tro?: string }): Promise<KetQuaLamHo> => {
      const loi = kiemKichBan(kb);
      if (loi.length) return { xong: false, ketThuc: 'tu_choi', cau: `Mình không làm việc này: ${loi.join(' ')}` };

      const ds = dsTroRef.current;
      const tro = tuyChon?.tro ? ds.find((t) => t.id === tuyChon.tro) : ds.find((t) => !phien.current.has(t.id));
      if (tuyChon?.tro && !tro) {
        return { xong: false, ketThuc: 'tu_choi', cau: 'Agent này không chạy được lúc này: đã tạm dừng, đã thu hồi, hoặc vượt số trỏ của gói.' };
      }
      if (!tro || phien.current.has(tro.id)) {
        return {
          xong: false,
          ketThuc: 'tu_choi',
          cau: ds.length <= 1 ? 'Mình đang làm dở một việc khác.' : `Cả ${ds.length} trỏ đều đang bận — chờ một trỏ làm xong nhé.`,
        };
      }

      const id = tro.id;
      const thuTu = Math.max(0, ds.indexOf(tro));
      // Các trỏ xuất phát lệch nhau một chút để không chồng lên nhau ở góc màn hình.
      const batDau = { x: Math.max(0, window.innerWidth - 96 - thuTu * 56), y: Math.max(0, window.innerHeight - 120 - thuTu * 24) };
      const p: Phien = { tro, biDung: false, lyDoDung: null, choNguoiBam: false, vi: batDau, trang: trangHienTai.current };
      phien.current.set(id, p);
      setSoDangChay(phien.current.size);

      const ve = (thay: Partial<HinhTro> | ((h: HinhTro) => Partial<HinhTro>)) =>
        setHinh((cu) => {
          const h = cu[id];
          if (!h) return cu;
          return { ...cu, [id]: { ...h, ...(typeof thay === 'function' ? thay(h) : thay) } };
        });
      const daDung = (): KetQuaLamHo => (p.lyDoDung ? { ...DA_DUNG, cau: p.lyDoDung } : DA_DUNG);
      const tenTro = (khac: string) => phien.current.get(khac)?.tro.ten ?? 'trỏ khác';

      // Nói ngay mình đang làm gì: mèo đứng im không lời là người dùng tưởng nó treo rồi bấm đi chỗ
      // khác — và cú bấm đó bị hiểu là "giành lại quyền" (lỗi 26/09/2026: "tạo agent" → "Đã dừng").
      setHinh((cu) => ({ ...cu, [id]: { tro, vi: batDau, quayTrai: false, noi: `Mình bắt đầu: ${kb.moTa}.`, vong: null, dangBam: false } }));

      const diToi = async (el: HTMLElement) => {
        const nhanh = giamChuyenDong.current;
        el.scrollIntoView({ block: 'center', behavior: nhanh ? 'auto' : 'smooth' });
        await ngu(nhanh ? 50 : 420);
        const r = el.getBoundingClientRect();
        const dich = {
          x: Math.min(window.innerWidth - CO_MEO, Math.max(0, r.left + Math.min(r.width / 2, 60))),
          y: Math.min(window.innerHeight - CO_MEO, Math.max(0, r.top + r.height / 2)),
        };
        const quayTrai = dich.x < p.vi.x;
        p.vi = dich;
        ve({ vong: r, vi: dich, quayTrai });
        await ngu(nhanh ? 50 : 800);
      };

      const choDich = async (dich: string, ms: number) => {
        const het = Date.now() + ms;
        while (Date.now() < het) {
          if (p.biDung) return null;
          const el = timDich(dich);
          if (el) return el;
          await ngu(120);
        }
        return null;
      };

      /** Giữ đích cho riêng trỏ này. false = bị dừng hoặc chờ quá lâu. */
      const giuDich = async (dich: string): Promise<boolean> => {
        const het = Date.now() + CHO_KHOA_DICH_MS;
        let daBao = false;
        for (;;) {
          if (p.biDung) return false;
          const cua = khoaDich.current.get(dich);
          if (!cua || cua === id) {
            khoaDich.current.set(dich, id);
            return true;
          }
          if (!daBao) {
            ve({ noi: `Mình chờ ${tenTro(cua)} làm xong ở chỗ này đã…` });
            daBao = true;
          }
          if (Date.now() > het) return false;
          await ngu(120);
        }
      };
      const thaDich = (dich: string) => {
        if (khoaDich.current.get(dich) === id) khoaDich.current.delete(dich);
      };

      try {
        for (const b of kb.buoc) {
          if (p.biDung) return daDung();

          if (b.loai === 'di_toi') {
            // Xếp hàng đổi trang: rời trang hiện tại (không giữ trang nào trong lúc chờ, để hai trỏ cùng
            // chờ không khoá lẫn nhau), rồi chỉ đi khi không ai đang đổi trang và mọi trỏ khác đang làm
            // trên đúng trang mình sắp tới — hoặc cũng đang chờ.
            const dich = trangCua(b.duongDan);
            p.trang = null;
            let daBao = false;
            for (;;) {
              if (p.biDung) return daDung();
              const khac = [...phien.current.entries()].filter(([k]) => k !== id).map(([, q]) => q.trang);
              if (!dangDiToi.current && khac.every((t) => t === null || t === dich)) break;
              if (!daBao) {
                ve({ noi: 'Trỏ khác đang làm trên trang đang mở — mình xếp hàng, tới lượt mới đổi trang.' });
                daBao = true;
              }
              await ngu(150);
            }
            dangDiToi.current = id;
            p.trang = dich;
            try {
              ve({ noi: b.noi });
              navigate(b.duongDan);
              await ngu(450);
            } finally {
              if (dangDiToi.current === id) dangDiToi.current = null;
            }
            continue;
          }
          // Trỏ đi tới đích ở trang hiện tại: giữ trang này (trỏ khác muốn đổi trang phải chờ).
          if (p.trang === null) p.trang = trangHienTai.current;

          // 8 giây: trang vừa mở còn phải tải dữ liệu xong mới hiện nút. Chờ 4
          // giây thì mạng chậm là mèo báo "không thấy" trước khi trang kịp hiện.
          // Bước "chỉ cho xem" không bắt buộc (neuKhongThay === '') thì chỉ chờ 0,7 giây: mục đó có thể
          // không còn trên thanh bên (vd. "Kiểm soát agent" rời thanh bên khi gộp trang) — trước đây mèo
          // đứng im 8 giây chờ nó.
          const tuyChonBuoc = b.loai === 'chi' && b.neuKhongThay === '';
          if (!tuyChonBuoc) ve((h) => ({ noi: h.noi || 'Đang chờ trang tải xong…' }));
          let el = await choDich(b.dich, tuyChonBuoc ? 700 : 8000);
          if (!el) {
            if (p.biDung) return daDung();
            if (b.loai === 'chi' && b.neuKhongThay !== undefined) {
              if (b.neuKhongThay === '') continue;
              ve({ vong: null, noi: b.neuKhongThay });
              await ngu(2200);
              // Kịch bản khai sẵn "không có đích thì nói câu này" (vd. không có khoản chờ duyệt): đó là câu
              // trả lời đúng, nhưng việc được nhờ KHÔNG được làm — không báo hoàn tất.
              return { xong: false, ketThuc: 'khong_thay', cau: b.neuKhongThay };
            }
            return { xong: false, ketThuc: 'khong_thay', cau: 'Mình không thấy chỗ cần tới trên trang này, nên dừng ở đây.' };
          }

          // Khoá đích: trỏ khác đang thao tác đúng chỗ này thì đứng chờ, không chen vào.
          if (!(await giuDich(b.dich))) {
            if (p.biDung) return daDung();
            return { xong: false, ketThuc: 'khong_thay', cau: 'Một trỏ khác giữ chỗ này quá lâu, nên mình dừng ở đây.' };
          }
          try {
            // Chờ khoá có thể lâu: trang đã vẽ lại thì tìm lại phần tử.
            if (!el.isConnected) {
              el = timDich(b.dich);
              if (!el) return { xong: false, ketThuc: 'khong_thay', cau: 'Mình không thấy chỗ cần tới trên trang này, nên dừng ở đây.' };
            }

            ve({ noi: b.noi });
            await diToi(el);
            // Mèo đi mất gần một giây; người dùng bấm Esc trong lúc đó thì không được gõ hay bấm tiếp.
            if (p.biDung) return daDung();

            if (b.loai === 'chi') {
              await ngu(1800);
            } else if (b.loai === 'go') {
              el.focus();
              for (let i = 1; i <= b.chu.length; i++) {
                if (p.biDung) break;
                datGiaTri(el, b.chu.slice(0, i));
                await ngu(giamChuyenDong.current ? 0 : 38);
              }
              await ngu(350);
            } else if (b.loai === 'bam') {
              if (el.closest('[data-mimi-khong-tu-bam]')) {
                return { xong: false, ketThuc: 'tu_choi', cau: 'Nút này phải do bạn tự bấm — mình đã dừng trước nó.' };
              }
              ve({ dangBam: true });
              await ngu(260);
              // Kiểm lần cuối NGAY trước cú bấm (lỗi cũ: Esc trong lúc mèo nhấn xuống vẫn bấm một lần).
              if (p.biDung) return daDung();
              el.click();
              await ngu(360);
              ve({ dangBam: false });
            } else if (b.loai === 'nhuong') {
              const nut = el;
              p.choNguoiBam = true;
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
                    nut.removeEventListener('click', khiBam);
                    xong(kq);
                  };
                  const khiBam = () => ra('bam');
                  const hen = window.setInterval(() => { if (p.biDung) ra('dung'); }, 150);
                  const hetGio = window.setTimeout(() => ra('het_gio'), 30_000);
                  nut.addEventListener('click', khiBam, { once: true });
                });
                if (ketThuc === 'dung') return daDung();
                if (ketThuc === 'het_gio') {
                  return { xong: false, ketThuc: 'cho_ban_bam', cau: `Mình đã chỉ đúng chỗ nhưng bạn chưa bấm, nên việc này CHƯA xong. ${b.noi}` };
                }

                // Bấm rồi thì yêu cầu đã đi — Esc lúc này chỉ ngừng theo dõi, không huỷ được yêu cầu.
                ve({ vong: null, noi: 'Bạn đã bấm. Mình chờ trang báo kết quả…' });
                const han = Date.now() + CHO_KET_QUA_MS;
                while (!nhan.kq && !p.biDung && Date.now() < han) await ngu(120);
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
                p.choNguoiBam = false;
              }
            }
          } finally {
            thaDich(b.dich);
          }
        }
        if (p.biDung) return daDung();
        return { xong: true, ketThuc: 'xong', cau: 'Xong rồi.' };
      } finally {
        p.choNguoiBam = false;
        // Nhả mọi thứ trỏ này còn giữ NGAY, trước khi chờ mèo biến mất: trỏ khác không phải đợi hoạt ảnh.
        for (const [dich, cua] of khoaDich.current) if (cua === id) khoaDich.current.delete(dich);
        if (dangDiToi.current === id) dangDiToi.current = null;
        p.trang = null;
        await ngu(p.biDung ? 0 : 600);
        phien.current.delete(id);
        setSoDangChay(phien.current.size);
        setHinh((cu) => {
          const con = { ...cu };
          delete con[id];
          return con;
        });
      }
    },
    [navigate],
  );

  const dangChay = soDangChay >= dsTro.length;
  const giaTri = useMemo(() => ({ chay, dung, dangChay, soDangChay, dsTro }), [chay, dung, dangChay, soDangChay, dsTro]);
  const dsHinh = Object.values(hinh);
  const nhieuTro = dsTro.length > 1 || dsHinh.length > 1;

  return (
    <Ctx.Provider value={giaTri}>
      {children}
      <AnimatePresence>
        {dsHinh.map((h) => {
          if (!h.vong) return null;
          const vienMau: CSSProperties | undefined = h.tro.mau
            ? { boxShadow: `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${h.tro.mau}` }
            : undefined;
          return (
            <motion.div
              key={`vong-${h.tro.id}`}
              aria-hidden
              className={`pointer-events-none fixed z-[70] rounded-xl ${h.tro.mau ? '' : 'ring-2 ring-primary ring-offset-2 ring-offset-background'}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, left: h.vong.left - 4, top: h.vong.top - 4, width: h.vong.width + 8, height: h.vong.height + 8 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ position: 'fixed', ...vienMau }}
            />
          );
        })}
        {dsHinh.map((h) => {
          const bongBongBenTrai = h.vi.x > window.innerWidth - 320;
          return (
            <motion.div
              key={`meo-${h.tro.id}`}
              data-mimi-lop-phu
              data-mimi-tro={h.tro.id}
              className="pointer-events-none fixed left-0 top-0 z-[71]"
              initial={{ opacity: 0, x: h.vi.x, y: h.vi.y, scale: 0.6 }}
              animate={{ opacity: 1, x: h.vi.x, y: h.vi.y, scale: h.dangBam ? 0.85 : 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={
                giamChuyenDong.current ? { duration: 0 } : { type: 'spring', stiffness: 110, damping: 19, mass: 0.8 }
              }
            >
              <img
                src={h.dangBam ? meoBam : meoDi}
                alt=""
                draggable={false}
                className="select-none no-save drop-shadow-lg"
                style={{ width: CO_MEO, height: CO_MEO, objectFit: 'contain', transform: `scaleX(${h.quayTrai ? -1 : 1})` }}
              />
              {/* Tên agent ngay dưới mèo, đúng màu của agent: nhiều trỏ cùng lúc vẫn biết trỏ nào là ai. */}
              {h.tro.mau && (
                <span
                  className="absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none text-white shadow"
                  style={{ backgroundColor: h.tro.mau }}
                >
                  {h.tro.ten}
                </span>
              )}
              {h.noi && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`pointer-events-auto absolute top-1 w-64 rounded-2xl border bg-card p-3 text-[13px] leading-snug text-foreground shadow-lg ${
                    bongBongBenTrai ? 'right-14' : 'left-14'
                  } ${h.tro.mau ? '' : 'border-border'}`}
                  style={h.tro.mau ? { borderColor: h.tro.mau } : undefined}
                >
                  {/* Trình đọc màn hình nghe được trỏ nào đang nói khi có nhiều trỏ. */}
                  {nhieuTro && <span className="sr-only">{h.tro.ten}: </span>}
                  <p>{h.noi}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>{nhieuTro ? `${h.tro.ten} đang làm hộ · Esc dừng tất cả` : 'MIMI đang làm hộ · Esc để dừng'}</span>
                    <button
                      type="button"
                      onClick={() => dung(h.tro.id)}
                      title={`Chỉ dừng ${h.tro.ten}`}
                      className="rounded-full border border-border px-2.5 py-0.5 font-medium text-foreground hover:bg-accent"
                    >
                      Dừng
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </Ctx.Provider>
  );
}
