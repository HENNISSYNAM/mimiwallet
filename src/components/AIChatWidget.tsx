import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Volume2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${SUPABASE_URL}/functions/v1/chat`;
const TTS_URL = `${SUPABASE_URL}/functions/v1/elevenlabs-tts`;

const SUGGESTIONS = [
  'Vì sao điểm tín dụng của tôi như vậy?',
  'Tôi nên ứng vốn hóa đơn nào?',
  'Làm sao để cải thiện điểm nhanh nhất?',
  'Dòng tiền tháng này thế nào?',
];

export default function AIChatWidget() {
  const { session } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const streamChat = useCallback(async (allMessages: Msg[]) => {
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_PUBLISHABLE_KEY,
        // Send the user's session so the AI can read their real business data.
        Authorization: `Bearer ${session?.access_token ?? SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: allMessages }),
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.error || `Error ${resp.status}`);
    }
    if (!resp.body) throw new Error('No stream body');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assistantContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (!line.startsWith('data: ')) continue;
        const json = line.slice(6).trim();
        if (json === '[DONE]') break;
        try {
          const parsed = JSON.parse(json);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            assistantContent += delta;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant') {
                return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
              }
              return [...prev, { role: 'assistant', content: assistantContent }];
            });
          }
        } catch { /* partial */ }
      }
    }
  }, [session]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;
    const userMsg: Msg = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      await streamChat(newMessages);
    } catch (e: any) {
      toast.error(e.message || 'Lỗi kết nối AI');
    } finally {
      setIsLoading(false);
    }
  };

  const speakLast = async () => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastAssistant || isSpeaking) return;
    setIsSpeaking(true);

    try {
      const resp = await fetch(TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: lastAssistant.content.slice(0, 1000) }),
      });

      if (!resp.ok) throw new Error('TTS failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
      await audio.play();
    } catch {
      toast.error('Không thể phát giọng nói');
      setIsSpeaking(false);
    }
  };

  return (
    <>
      {/* FAB — gradient pill */}
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-24 lg:bottom-6 right-4 lg:right-6 z-50 h-14 pl-4 pr-5 rounded-full bg-gradient-to-br from-primary to-mimi-green text-white flex items-center gap-2 shadow-[0_8px_28px_hsla(var(--blue-500)/0.35)]"
        aria-label="Trợ lý AI"
      >
        {open ? <X size={20} /> : <Sparkles size={20} />}
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
                  <Sparkles size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-display font-bold text-foreground">Trợ lý MIMI</p>
                  <p className="text-[11px] text-muted-foreground">Hiểu dữ liệu của bạn</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.some(m => m.role === 'assistant') && (
                  <button
                    onClick={speakLast}
                    disabled={isSpeaking}
                    className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-accent transition-colors text-muted-foreground hover:text-foreground pressable"
                    title="Nghe phản hồi"
                  >
                    <Volume2 size={16} className={isSpeaking ? 'text-primary animate-pulse' : ''} />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
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
                    <Sparkles size={24} className="text-primary" />
                  </div>
                  <p className="text-[15px] font-semibold text-foreground">Xin chào</p>
                  <p className="text-[13px] text-muted-foreground mt-1 max-w-[240px] mx-auto">
                    Tôi đọc được điểm tín dụng, dòng tiền và hóa đơn của bạn — hỏi tôi bất cứ điều gì.
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
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex justify-start">
                  <div className="bg-accent px-4 py-3 rounded-[20px] rounded-bl-md">
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
                  className="flex-1 bg-accent rounded-full px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || isLoading}
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
