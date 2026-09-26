import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Volume2, Loader2, AlertTriangle, ArrowUpRight } from 'lucide-react';
// Trợ lý mang logo con mèo cam của MIMI từ 11/09/2026, thay con mèo đen đội tai
// nghe trước đó. Trợ lý giờ đi lại trên giao diện như một con trỏ và làm việc
// cùng người dùng — nó là MIMI, không phải một nhân vật riêng.
import mimiAgent from '@/assets/mimi-cat.png';
import { toast } from 'sonner';
import { nhanViec } from '@/lib/mimiLamHo';
import { useMimiLamHo } from '@/components/mimi/MimiLamHo';
import { goiTroLy } from '@/lib/goiTroLy';
import { docGiong, dungDoc } from '@/lib/docGiong';
import { dungLichSu, type TraLoi } from '@/lib/troLy';

/**
 * Widget trợ lý ở góc màn hình.
 *
 * MIMI-P0-001: widget KHÔNG có bộ não riêng. Nó gọi đúng `tro-ly` với đúng payload trang MIMI
 * Assistant gửi (`dungLichSu`), nên cùng câu hỏi thì cùng kết quả có cấu trúc. Widget chỉ khác
 * cách trình bày: câu trả lời, độ đầy đủ, liên kết chi tiết. Nút hành động (duyệt, từ chối…) chỉ
 * có ở trang MIMI Assistant — nơi có hộp xác nhận — widget dẫn sang đó.
 */

type Msg = { role: 'user' | 'assistant'; content: string; traLoi?: TraLoi };

// Opening questions steer what people think this product is for, so they track
// the tax and cost work rather than the invoice advance MIMI cannot provide.
const SUGGESTIONS = [
  'Khoản chi nào đang chờ tôi duyệt?',
  'Tạo agent "Trợ lý quảng cáo" giúp tôi',
  'Khoản chi nào tháng này chưa có chứng từ?',
  'Hộ kinh doanh doanh thu bao nhiêu thì phải nộp thuế?',
];

const NHAN_DO_DAY: Record<Exclude<TraLoi['do_day'], 'complete'>, string> = {
  partial: 'Dữ liệu chưa đủ — xem cảnh báo',
  stale: 'Dữ liệu có thể đã cũ',
  unavailable: 'Có nguồn chưa kết nối',
};

function ChiTietTraLoi({ cau, traLoi }: { cau: string; traLoi: TraLoi }) {
  const trang = [...new Map(traLoi.ket_qua.flatMap((r) => r.trang).map((t) => [t.duong_dan, t])).values()].slice(0, 3);
  const coViec = traLoi.ket_qua.some((r) => r.de_xuat.some((d) => d.loai !== 'mo_trang'));
  return (
    <div className="mt-2 flex flex-col gap-1.5 border-t border-border/60 pt-2 text-[12px]">
      {traLoi.do_day !== 'complete' && (
        <span className="inline-flex items-center gap-1 font-medium text-mimi-amber">
          <AlertTriangle size={12} aria-hidden /> {NHAN_DO_DAY[traLoi.do_day]}
        </span>
      )}
      {trang.map((t) => (
        <Link key={t.duong_dan} to={t.duong_dan} className="inline-flex items-center gap-1 text-primary hover:underline">
          {t.nhan} <ArrowUpRight size={12} aria-hidden />
        </Link>
      ))}
      {coViec && (
        <Link to={`/dashboard/tro-ly?hoi=${encodeURIComponent(cau)}`} className="inline-flex items-center gap-1 font-medium text-foreground hover:underline">
          Xem bảng số và việc cần xác nhận trong MIMI Assistant <ArrowUpRight size={12} aria-hidden />
        </Link>
      )}
    </div>
  );
}

export default function AIChatWidget() {
  const { chay, dangChay } = useMimiLamHo();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo?.({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading || dangChay) return;
    const userMsg: Msg = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');

    // Câu nhờ việc → con trỏ mèo làm ngay trên giao diện. Câu khác → hỏi bộ não chung.
    const kichBan = nhanViec(content);
    if (kichBan) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `Để mình làm cho bạn xem: ${kichBan.moTa}. Bấm "Dừng" hoặc phím Esc bất cứ lúc nào.` },
      ]);
      // Thu khung chat trong lúc mèo làm: khung cố định ở góc phải dễ che đúng
      // nút mèo cần tới, trên cả máy tính. Làm xong thì mở lại, kèm kết quả.
      setOpen(false);
      const ketQua = await chay(kichBan);
      setMessages((prev) => [...prev, { role: 'assistant', content: ketQua.cau }]);
      setOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      // Cùng cách dựng lịch sử với trang MIMI Assistant: mỗi lượt là câu hỏi + câu trả lời.
      const luot: { cau: string; traLoi?: { cau: string } }[] = [];
      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        const sau = messages[i + 1];
        if (m.role === 'user' && sau?.role === 'assistant' && sau.traLoi) luot.push({ cau: m.content, traLoi: sau.traLoi });
      }
      const traLoi = (await goiTroLy('hoi', { cau: content, pham_vi: null, lich_su: dungLichSu(luot) })) as TraLoi;
      setMessages((prev) => [...prev, { role: 'assistant', content: traLoi.cau, traLoi }]);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'MIMI chưa trả lời được. Thử lại sau ít phút.');
    } finally {
      setIsLoading(false);
    }
  };

  /*
   * Đọc bằng giọng có sẵn của trình duyệt (26/09/2026) — không qua ElevenLabs: miễn phí, không khoá,
   * câu trả lời không rời máy người dùng. Bấm lần nữa để dừng. Xem `lib/docGiong.ts`.
   */
  const speakLast = async () => {
    if (isSpeaking) { dungDoc(); setIsSpeaking(false); return; }
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastAssistant) return;
    setIsSpeaking(true);
    try {
      const kq = await docGiong(lastAssistant.content);
      if (kq === 'khong_ho_tro') toast.error('Trình duyệt này chưa đọc được giọng nói.');
      if (kq === 'khong_co_giong_viet') toast.error('Máy chưa có giọng đọc tiếng Việt. Cài giọng tiếng Việt trong cài đặt ngôn ngữ của máy rồi thử lại.');
    } finally {
      setIsSpeaking(false);
    }
  };

  useEffect(() => () => dungDoc(), []);

  return (
    <>
      {/* FAB — gradient pill */}
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-24 lg:bottom-6 right-4 lg:right-6 z-50 h-14 pl-4 pr-5 rounded-full bg-gradient-to-br from-primary to-mimi-green text-white flex items-center gap-2 shadow-[0_8px_28px_hsla(var(--blue-500)/0.35)]"
        aria-label="Trợ lý AI"
      >
        {open ? (
          <X size={20} />
        ) : (
          <img src={mimiAgent} alt="" aria-hidden draggable={false} className="w-8 h-8 no-save" />
        )}
        {!open && <span className="text-sm font-semibold hidden sm:inline">Trợ lý AI</span>}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed z-50 flex flex-col overflow-hidden lg-surface lg-regular
                       inset-x-0 bottom-0 rounded-t-3xl max-h-[82vh] safe-bottom
                       sm:inset-x-auto sm:bottom-24 lg:sm:bottom-24 sm:right-6 sm:w-[380px] sm:max-h-[560px] sm:rounded-3xl"
          >
            {/* Grabber (mobile) */}
            <div className="sm:hidden pt-2 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="px-4 py-3 border-b hairline flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-mimi-green flex items-center justify-center">
                  <img src={mimiAgent} alt="" aria-hidden draggable={false} className="w-6 h-6 no-save" />
                </div>
                <div>
                  <p className="text-sm font-display font-bold text-foreground">Trợ lý MIMI</p>
                  <p className="text-[11px] text-muted-foreground">Cùng bộ não với MIMI Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.some(m => m.role === 'assistant') && (
                  <button
                    onClick={speakLast}
                    aria-label={isSpeaking ? 'Dừng đọc' : 'Nghe phản hồi'}
                    aria-pressed={isSpeaking}
                    className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-accent transition-colors text-muted-foreground hover:text-foreground pressable"
                    title={isSpeaking ? 'Dừng đọc' : 'Nghe phản hồi'}
                  >
                    <Volume2 size={16} className={isSpeaking ? 'text-primary animate-pulse' : ''} />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Đóng trợ lý"
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-accent transition-colors text-muted-foreground hover:text-foreground pressable sm:hidden"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3 min-h-[220px]">
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary/10 to-mimi-green/10 flex items-center justify-center mb-3">
                    <img src={mimiAgent} alt="" aria-hidden draggable={false} className="w-10 h-10 no-save" />
                  </div>
                  <p className="text-[15px] font-semibold text-foreground">Xin chào</p>
                  <p className="text-[13px] text-muted-foreground mt-1 max-w-[240px] mx-auto">
                    Hỏi mình về thuế, chứng từ, khoản chi — hoặc nhờ việc, mình đi làm ngay trên màn hình cho bạn xem.
                  </p>
                  <div className="flex flex-col gap-2 mt-5">
                    {SUGGESTIONS.map(q => (
                      <button
                        key={q}
                        onClick={() => send(q)}
                        className="text-[13px] text-left bg-accent hover:bg-accent/70 px-4 py-2.5 rounded-2xl text-foreground transition-colors pressable"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-primary text-white rounded-[20px] rounded-br-md'
                      : 'bg-accent text-foreground rounded-[20px] rounded-bl-md'
                  }`}>
                    {m.content}
                    {m.traLoi && <ChiTietTraLoi cau={messages[i - 1]?.content ?? ''} traLoi={m.traLoi} />}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-accent px-4 py-3 rounded-[20px] rounded-bl-md" aria-label="MIMI đang trả lời">
                    <Loader2 size={14} className="animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t hairline">
              <div className="flex gap-2 items-end">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder="Hỏi trợ lý tài chính..."
                  aria-label="Câu hỏi cho trợ lý"
                  className="flex-1 bg-accent rounded-full px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || isLoading}
                  aria-label="Gửi"
                  className="w-11 h-11 shrink-0 bg-primary text-white rounded-full flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-40 pressable"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
