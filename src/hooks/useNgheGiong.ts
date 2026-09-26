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

export function useNgheGiong(o: { onCau: (cau: string) => void; onLoi?: (l: LoiNghe) => void }) {
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
    n.lang = 'vi-VN';
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
