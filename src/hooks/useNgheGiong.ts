import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Nghe giọng nói tiếng Việt bằng NHẬN DẠNG CÓ SẴN CỦA TRÌNH DUYỆT (Web Speech API) — 26/09/2026.
 *
 * Không có khoá, không có máy chủ của MIMI ở giữa. Chrome/Edge gửi âm thanh tới dịch vụ nhận dạng của
 * chính trình duyệt; Firefox chưa hỗ trợ → `coHoTro = false`, giao diện ẩn nút mic thay vì hiện nút hỏng.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NhanDien = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const layNhanDien = (): NhanDien => (typeof window === 'undefined' ? null : (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null);

export type LoiNghe = 'khong_ho_tro' | 'bi_chan' | 'khong_nghe_thay' | 'loi';

export function useNgheGiong(o: { onCau: (cau: string) => void; onLoi?: (l: LoiNghe) => void }) {
  const [dangNghe, setDangNghe] = useState(false);
  const nd = useRef<NhanDien>(null);
  const goiLai = useRef(o);
  goiLai.current = o;

  const dung = useCallback(() => { try { nd.current?.stop(); } catch { /* đã dừng */ } }, []);

  const batDau = useCallback(() => {
    const Lop = layNhanDien();
    if (!Lop) { goiLai.current.onLoi?.('khong_ho_tro'); return; }
    if (nd.current) { dung(); return; } // bấm lần nữa khi đang nghe = dừng
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
      goiLai.current.onLoi?.(e === 'not-allowed' || e === 'service-not-allowed' ? 'bi_chan' : e === 'no-speech' ? 'khong_nghe_thay' : e === 'aborted' ? 'khong_nghe_thay' : 'loi');
    };
    n.onend = () => { nd.current = null; setDangNghe(false); };
    nd.current = n;
    setDangNghe(true);
    try { n.start(); } catch { nd.current = null; setDangNghe(false); goiLai.current.onLoi?.('loi'); }
  }, [dung]);

  useEffect(() => () => { try { nd.current?.abort?.(); } catch { /* bỏ qua */ } }, []);

  return { coHoTro: !!layNhanDien(), dangNghe, batDau, dung };
}

export const CAU_LOI_NGHE: Record<LoiNghe, string> = {
  khong_ho_tro: 'Trình duyệt này chưa nghe được giọng nói. Dùng Chrome hoặc Edge.',
  bi_chan: 'Trình duyệt đang chặn micro. Bấm biểu tượng ổ khoá cạnh địa chỉ trang để cho phép micro.',
  khong_nghe_thay: 'MIMI chưa nghe thấy gì. Bấm mic rồi nói gần máy hơn.',
  loi: 'Chưa nghe rõ. Thử nói lại, hoặc gõ câu hỏi.',
};
