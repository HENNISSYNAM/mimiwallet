import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Nghe giọng nói tiếng Việt bằng NHẬN DẠNG CÓ SẴN CỦA TRÌNH DUYỆT (Web Speech API) — 26/09/2026.
 *
 * Không có khoá, không có máy chủ của MIMI ở giữa: dịch vụ nhận giọng của trình duyệt (Chrome, Edge) đổi
 * giọng thành chữ, MIMI chỉ nhận chữ. Firefox chưa hỗ trợ → `coHoTro = false`, giao diện ẩn nút mic thay
 * vì hiện nút hỏng.
 *
 * MIMI HỎI TRƯỚC KHI BẬT MIC. Lần đầu (quyền micro đang ở "prompt"), MIMI tự hỏi bằng lời thường — vì sao
 * cần mic, âm thanh đi đâu — rồi mới gọi hộp cho phép của trình duyệt. Đã bị chặn thì trình duyệt KHÔNG
 * hỏi lại được nữa: MIMI chỉ cách mở lại thay vì im lặng không nghe.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NhanDien = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const layNhanDien = (): NhanDien => (typeof window === 'undefined' ? null : (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null);

export type LoiNghe = 'khong_ho_tro' | 'khong_nghe_thay' | 'khong_co_mic' | 'loi';

/**
 * NGHE ĐA NGÔN NGỮ (13/10/2026). Nhận dạng của trình duyệt cần biết trước ngôn ngữ (không tự đoán được), nên
 * người dùng chọn ở nút mũi tên cạnh mic — mặc định theo ngôn ngữ giao diện đang dùng. Lựa chọn lưu ở máy.
 */
export const NGON_NGU_NGHE = [
  { ma: 'vi', bcp47: 'vi-VN', ten: 'Tiếng Việt' },
  { ma: 'en', bcp47: 'en-US', ten: 'English' },
  { ma: 'ko', bcp47: 'ko-KR', ten: '한국어' },
  { ma: 'zh', bcp47: 'zh-CN', ten: '中文' },
] as const;
export type MaNgonNguNghe = (typeof NGON_NGU_NGHE)[number]['ma'];
const KHOA_NGHE = 'mimi.nghe.ngon_ngu';

/** Ngôn ngữ nghe: đã chọn → dùng; chưa chọn → theo ngôn ngữ giao diện; lạ → tiếng Việt. */
export function ngonNguNghe(giaoDien?: string | null): MaNgonNguNghe {
  try {
    const da = localStorage.getItem(KHOA_NGHE);
    if (da && NGON_NGU_NGHE.some((n) => n.ma === da)) return da as MaNgonNguNghe;
  } catch { /* chế độ riêng tư */ }
  const g = (giaoDien ?? '').slice(0, 2);
  return (NGON_NGU_NGHE.find((n) => n.ma === g)?.ma ?? 'vi') as MaNgonNguNghe;
}

export function luuNgonNguNghe(ma: MaNgonNguNghe) {
  try { localStorage.setItem(KHOA_NGHE, ma); } catch { /* bỏ qua */ }
}

export const bcp47Cua = (ma: MaNgonNguNghe) => NGON_NGU_NGHE.find((n) => n.ma === ma)!.bcp47;
/** Hộp MIMI đang mở: xin bật mic, hoặc chỉ cách mở lại mic đã bị chặn. */
export type HoiQuyenMic = null | 'xin' | 'bi_chan';

type QuyenMic = 'granted' | 'prompt' | 'denied' | 'khong_ro';

async function docQuyenMic(): Promise<QuyenMic> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = await (navigator as any).permissions?.query?.({ name: 'microphone' });
    return (p?.state as QuyenMic | undefined) ?? 'khong_ro';
  } catch {
    // Safari cũ, Firefox: không hỏi được trạng thái — để trình duyệt tự hỏi khi bắt đầu nghe.
    return 'khong_ro';
  }
}

export function useNgheGiong(o: { onCau: (cau: string) => void; onLoi?: (l: LoiNghe) => void; ngonNgu?: MaNgonNguNghe }) {
  const [dangNghe, setDangNghe] = useState(false);
  const [hoiQuyen, setHoiQuyen] = useState<HoiQuyenMic>(null);
  const nd = useRef<NhanDien>(null);
  const goiLai = useRef(o);
  goiLai.current = o;

  const dung = useCallback(() => { try { nd.current?.stop(); } catch { /* đã dừng */ } }, []);

  const khoiDong = useCallback(() => {
    const Lop = layNhanDien();
    if (!Lop) { goiLai.current.onLoi?.('khong_ho_tro'); return; }
    const n = new Lop();
    n.lang = bcp47Cua(goiLai.current.ngonNgu ?? 'vi');
    n.interimResults = false;
    n.maxAlternatives = 1;
    n.onresult = (ev: { results: { 0: { 0: { transcript: string } } } }) => {
      const cau = String(ev.results?.[0]?.[0]?.transcript ?? '').trim();
      if (cau) goiLai.current.onCau(cau);
    };
    n.onerror = (ev: { error?: string }) => {
      const e = ev?.error;
      if (e === 'not-allowed' || e === 'service-not-allowed') { setHoiQuyen('bi_chan'); return; }
      goiLai.current.onLoi?.(e === 'no-speech' || e === 'aborted' ? 'khong_nghe_thay' : e === 'audio-capture' ? 'khong_co_mic' : 'loi');
    };
    n.onend = () => { nd.current = null; setDangNghe(false); };
    nd.current = n;
    setDangNghe(true);
    try { n.start(); } catch { nd.current = null; setDangNghe(false); goiLai.current.onLoi?.('loi'); }
  }, []);

  /** Bấm mic: đang nghe thì dừng; chưa có quyền thì MIMI hỏi trước; bị chặn thì chỉ cách mở. */
  const batDau = useCallback(async () => {
    if (!layNhanDien()) { goiLai.current.onLoi?.('khong_ho_tro'); return; }
    if (nd.current) { dung(); return; }
    const q = await docQuyenMic();
    if (q === 'denied') { setHoiQuyen('bi_chan'); return; }
    if (q === 'prompt') { setHoiQuyen('xin'); return; }
    khoiDong();
  }, [dung, khoiDong]);

  /** Người dùng đồng ý ở hộp của MIMI → gọi hộp cho phép của trình duyệt → nghe. */
  const dongY = useCallback(async () => {
    setHoiQuyen(null);
    const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (md?.getUserMedia) {
      try {
        const luong = await md.getUserMedia({ audio: true });
        // Chỉ để xin quyền: tắt ngay, nhận dạng giọng tự mở mic của nó.
        luong.getTracks().forEach((t) => t.stop());
      } catch (e) {
        const ten = (e as { name?: string } | null)?.name;
        if (ten === 'NotAllowedError' || ten === 'SecurityError') { setHoiQuyen('bi_chan'); return; }
        goiLai.current.onLoi?.(ten === 'NotFoundError' ? 'khong_co_mic' : 'loi');
        return;
      }
    }
    khoiDong();
  }, [khoiDong]);

  const dongHop = useCallback(() => setHoiQuyen(null), []);

  useEffect(() => () => { try { nd.current?.abort?.(); } catch { /* bỏ qua */ } }, []);

  return { coHoTro: !!layNhanDien(), dangNghe, batDau, dung, hoiQuyen, dongY, dongHop };
}

export const CAU_LOI_NGHE: Record<LoiNghe, string> = {
  khong_ho_tro: 'Trình duyệt này chưa nghe được giọng nói. Dùng Chrome hoặc Edge.',
  khong_nghe_thay: 'MIMI chưa nghe thấy gì. Bấm mic rồi nói gần máy hơn.',
  khong_co_mic: 'MIMI không thấy micro nào. Cắm tai nghe có mic hoặc bật micro của máy rồi thử lại.',
  loi: 'Chưa nghe rõ. Thử nói lại, hoặc gõ câu hỏi.',
};
