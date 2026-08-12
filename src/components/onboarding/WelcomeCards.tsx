import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import mimiWatch from '@/assets/mimi/watch.webp';

/**
 * The opening questions, as three taps instead of a five-step form.
 *
 * The old flow asked for email, phone, password, tax ID, years trading,
 * employee count, industry, loan purpose and desired term — all of it before
 * the person had seen a single number. Every field there is a place to give up,
 * and most of the answers were never needed at that moment: a tax ID matters
 * when a report is exported, a loan term matters when a loan is applied for.
 *
 * So this asks three things, all tap-only, and it asks them *after* the
 * dashboard is on screen. Someone who has seen their own cash flow has a reason
 * to answer; someone staring at a form has only a reason to leave.
 *
 * It is a card on the dashboard, never a gate. Dismissing is a real answer and
 * is recorded as such — the point is to stop asking, not to keep nagging until
 * the shape of the reply suits us.
 */

type Step = { key: 'industry' | 'size' | 'goal'; title: string; hint?: string; options: { value: string; label: string }[] };

const STEPS: Step[] = [
  {
    key: 'industry',
    title: 'Bạn đang kinh doanh ngành gì?',
    options: [
      { value: 'fnb', label: 'Ăn uống' },
      { value: 'retail', label: 'Bán lẻ' },
      { value: 'manufacturing', label: 'Sản xuất' },
      { value: 'services', label: 'Dịch vụ' },
      { value: 'import_export', label: 'Xuất nhập khẩu' },
      { value: 'other', label: 'Khác' },
    ],
  },
  {
    key: 'size',
    title: 'Cửa hàng có bao nhiêu người?',
    options: [
      { value: '1', label: 'Chỉ mình tôi' },
      { value: '2-9', label: '2 – 9' },
      { value: '10-49', label: '10 – 49' },
      { value: '50+', label: 'Trên 50' },
    ],
  },
  {
    key: 'goal',
    title: 'Điều bạn cần nhất lúc này?',
    hint: 'MIMI sẽ ưu tiên phần đó trước.',
    options: [
      { value: 'cashflow', label: 'Nắm được dòng tiền' },
      { value: 'tax', label: 'Chuẩn bị số liệu thuế' },
      { value: 'capital', label: 'Tìm vốn' },
      { value: 'all', label: 'Cả ba' },
    ],
  },
];

export default function WelcomeCards() {
  const [visible, setVisible] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('companies')
        .select('id, name, onboarding_done_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      // Never shown again once answered or skipped.
      if (cancelled || !data || data.onboarding_done_at) return;
      setCompanyId(data.id);
      setName(data.name ?? '');
      setVisible(true);
    })();
    return () => { cancelled = true; };
  }, []);

  /** Writes what we have and stops asking. Called by both finishing and skipping. */
  const finish = async (final: Record<string, string>) => {
    if (!companyId) return;
    setSaving(true);
    await supabase
      .from('companies')
      .update({
        // Only fields the person actually touched — a skip must not wipe an
        // industry or a name set during an earlier sign-up.
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(final.industry ? { industry: final.industry } : {}),
        ...(final.size ? { employee_count: final.size } : {}),
        ...(final.goal ? { primary_goal: final.goal } : {}),
        onboarding_done_at: new Date().toISOString(),
      })
      .eq('id', companyId);
    setSaving(false);
    setVisible(false);
  };

  const choose = (value: string) => {
    const next = { ...answers, [STEPS[step].key]: value };
    setAnswers(next);
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish(next);
  };

  if (!visible) return null;
  const s = STEPS[step];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="relative bg-card border border-border/60 rounded-2xl p-5 sm:p-6 overflow-hidden"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: 'radial-gradient(70% 120% at 100% 0%, rgba(16,185,129,.10), transparent 60%)' }}
        />

        <button
          onClick={() => finish(answers)}
          aria-label="Bỏ qua"
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <img src={mimiWatch} alt="" aria-hidden draggable={false} className="w-10 h-10 shrink-0 no-save" />
          <div className="min-w-0">
            <p className="text-base sm:text-lg font-display font-bold text-foreground">{s.title}</p>
            {s.hint && <p className="text-xs text-muted-foreground mt-0.5">{s.hint}</p>}
          </div>
        </div>

        {/* Only on the first card, and pre-filled. The trigger names a new
            company after the person, which is a guess — right often enough to
            keep, wrong often enough to offer. It is the one answer that cannot
            be a tap, so it sits above the taps rather than as its own step. */}
        {step === 0 && (
          <div className="mt-4">
            <label className="text-xs text-muted-foreground mb-1.5 block">Tên cửa hàng / công ty</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Tạp hoá Minh Anh"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          {s.options.map((o) => (
            <button
              key={o.value}
              disabled={saving}
              onClick={() => choose(o.value)}
              className="px-3.5 py-2 rounded-xl border border-border bg-background text-sm text-foreground hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mt-5">
          <div className="flex items-center gap-1.5" aria-hidden>
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i < step ? 'w-1.5 bg-mimi-green' : i === step ? 'w-6 bg-primary' : 'w-1.5 bg-border'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => finish(answers)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            {step === STEPS.length - 1 ? <>Xong <Check size={11} /></> : <>Bỏ qua <ArrowRight size={11} /></>}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
