import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { GraduationCap, Clock, Check, ChevronRight, X, Loader2, Sparkles, Award, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { LESSONS, LESSON_BY_ID, FACTOR_LABEL, FACTOR_EMOJI, LEVEL_LABEL, type Lesson, type FactorKey } from '@/lib/lessons';
import TechBadge from '@/components/ui/TechBadge';
import { toast } from 'sonner';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

function capabilityFromScore(score: number | null): { label: string; tone: 'blue' | 'green' | 'amber' | 'violet' } {
  if (score == null) return { label: 'Chưa xác định', tone: 'violet' };
  if (score >= 750) return { label: 'Thành thạo', tone: 'green' };
  if (score >= 650) return { label: 'Vững vàng', tone: 'blue' };
  if (score >= 550) return { label: 'Cơ bản', tone: 'amber' };
  return { label: 'Mới bắt đầu', tone: 'violet' };
}

function LessonCard({ lesson, done, reason, onOpen }: { lesson: Lesson; done: boolean; reason?: string; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full text-left bg-card border hairline rounded-2xl p-4 hover:bg-accent/40 transition-colors pressable"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center text-xl shrink-0">
          {FACTOR_EMOJI[lesson.factor]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{LEVEL_LABEL[lesson.level]}</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock size={10} /> {lesson.minutes} phút</span>
          </div>
          <p className="text-sm font-semibold text-foreground mt-0.5 truncate">{lesson.title}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{reason ?? lesson.summary}</p>
        </div>
        {done ? (
          <span className="w-6 h-6 rounded-full bg-mimi-green/15 flex items-center justify-center shrink-0"><Check size={14} className="text-mimi-green" /></span>
        ) : (
          <ChevronRight size={18} className="text-muted-foreground shrink-0 mt-2" />
        )}
      </div>
    </button>
  );
}

function LessonModal({ lesson, done, onClose, onComplete }: { lesson: Lesson; done: boolean; onClose: () => void; onComplete: (score: number) => Promise<void> }) {
  const [answers, setAnswers] = useState<number[]>(Array(lesson.quiz.length).fill(-1));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const correctCount = lesson.quiz.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
  const scorePct = lesson.quiz.length ? Math.round((correctCount / lesson.quiz.length) * 100) : 100;
  const passed = scorePct >= 60;

  const submit = async () => {
    if (answers.some((a) => a < 0)) { toast.error('Vui lòng trả lời tất cả câu hỏi'); return; }
    setSubmitted(true);
    if (scorePct >= 60) {
      setSaving(true);
      await onComplete(scorePct);
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full sm:max-w-lg max-h-[88vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col safe-bottom"
      >
        <div className="px-5 py-4 border-b hairline flex items-center justify-between glass shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">{FACTOR_EMOJI[lesson.factor]}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{lesson.title}</p>
              <p className="text-[11px] text-muted-foreground">{FACTOR_LABEL[lesson.factor]} · {lesson.minutes} phút</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-accent text-muted-foreground pressable shrink-0"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto no-scrollbar p-5 space-y-5">
          {lesson.sections.map((s) => (
            <div key={s.heading}>
              <h4 className="text-[15px] font-semibold text-foreground mb-1.5">{s.heading}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}

          {/* Quiz */}
          <div className="pt-2 border-t hairline">
            <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Sparkles size={15} className="text-primary" /> Kiểm tra nhanh</p>
            <div className="space-y-4">
              {lesson.quiz.map((qq, qi) => (
                <div key={qi}>
                  <p className="text-sm font-medium text-foreground mb-2">{qi + 1}. {qq.q}</p>
                  <div className="space-y-1.5">
                    {qq.options.map((opt, oi) => {
                      const chosen = answers[qi] === oi;
                      const isCorrect = qq.answer === oi;
                      let cls = 'border-border bg-card';
                      if (submitted) {
                        if (isCorrect) cls = 'border-mimi-green/40 bg-mimi-green/10';
                        else if (chosen) cls = 'border-mimi-red/40 bg-mimi-red/10';
                      } else if (chosen) cls = 'border-primary bg-primary/5';
                      return (
                        <button
                          key={oi}
                          disabled={submitted}
                          onClick={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                          className={`w-full text-left text-sm px-3 py-2.5 rounded-xl border transition-colors pressable ${cls}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {submitted && (
            <div className={`rounded-2xl p-4 text-center ${passed ? 'bg-mimi-green/10' : 'bg-mimi-amber/10'}`}>
              <p className={`text-sm font-semibold ${passed ? 'text-mimi-green' : 'text-mimi-amber'}`}>
                {passed ? `✅ Hoàn thành! Bạn đúng ${correctCount}/${lesson.quiz.length}` : `Bạn đúng ${correctCount}/${lesson.quiz.length} — ôn lại và thử lại nhé`}
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t hairline shrink-0">
          {!submitted ? (
            <button onClick={submit} className="w-full py-3 bg-primary text-white rounded-2xl text-sm font-semibold hover:brightness-110 transition-all pressable flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />} Nộp bài
            </button>
          ) : passed ? (
            <button onClick={onClose} className="w-full py-3 bg-mimi-green text-white rounded-2xl text-sm font-semibold pressable">Xong</button>
          ) : (
            <button onClick={() => { setSubmitted(false); setAnswers(Array(lesson.quiz.length).fill(-1)); }} className="w-full py-3 bg-accent text-foreground rounded-2xl text-sm font-semibold pressable">Thử lại</button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function LearnPage() {
  const { session } = useAuthStore();
  const [params] = useSearchParams();
  const focus = params.get('focus') as FactorKey | null;
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [weakest, setWeakest] = useState<FactorKey[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [openLesson, setOpenLesson] = useState<Lesson | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data: companies } = await supabase.from('companies').select('id').eq('user_id', session.user.id).limit(1);
    const cId = companies?.[0]?.id ?? null;
    setCompanyId(cId);
    if (cId) {
      const { data: snaps } = await supabase
        .from('credit_score_snapshots').select('id, score').eq('company_id', cId)
        .order('computed_at', { ascending: false }).limit(1);
      const snap = snaps?.[0];
      setScore(snap?.score ?? null);
      if (snap) {
        const { data: factors } = await supabase.from('credit_score_factors').select('factor_name, normalized_score').eq('snapshot_id', snap.id);
        const ordered = (factors ?? []).sort((a, b) => a.normalized_score - b.normalized_score).map((f) => f.factor_name as FactorKey);
        setWeakest(ordered.slice(0, 2));
      }
      const { data: prog } = await supabase.from('learning_progress').select('lesson_id').eq('company_id', cId);
      setCompleted(new Set((prog ?? []).map((p) => p.lesson_id)));
    }
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const markComplete = async (lesson: Lesson, quizScore: number) => {
    if (!companyId) { setCompleted((s) => new Set(s).add(lesson.id)); toast.success('Đã hoàn thành bài học'); return; }
    const { error } = await supabase
      .from('learning_progress')
      .upsert({ company_id: companyId, lesson_id: lesson.id, quiz_score: quizScore }, { onConflict: 'company_id,lesson_id' });
    if (error) { toast.error('Không lưu được tiến độ'); return; }
    setCompleted((s) => new Set(s).add(lesson.id));
    toast.success('Đã hoàn thành! Tiếp tục cải thiện điểm nhé 🎉');
  };

  // Recommended lessons: focus param first, then weakest factors, not-yet-done first.
  const recommended = useMemo(() => {
    const focusFactors = [focus, ...weakest].filter(Boolean) as FactorKey[];
    const seen = new Set<string>();
    const picks: { lesson: Lesson; reason: string }[] = [];
    for (const f of focusFactors) {
      for (const l of LESSONS.filter((x) => x.factor === f)) {
        if (seen.has(l.id)) continue;
        seen.add(l.id);
        picks.push({ lesson: l, reason: `Điểm "${FACTOR_LABEL[f]}" của bạn đang thấp — học cách cải thiện.` });
      }
    }
    return picks.slice(0, 4);
  }, [focus, weakest]);

  const grouped = useMemo(() => {
    const order: FactorKey[] = ['general', 'revenueTrend', 'expenseToIncomeRatio', 'invoicePunctuality', 'loanRepaymentRatio', 'cashFlowVolatility'];
    return order.map((f) => ({ factor: f, lessons: LESSONS.filter((l) => l.factor === f) })).filter((g) => g.lessons.length);
  }, []);

  const cap = capabilityFromScore(score);
  const doneCount = completed.size;
  const total = LESSONS.length;
  const pct = Math.round((doneCount / total) * 100);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 size={24} className="animate-spin text-primary" /></div>;
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-4xl">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center"><GraduationCap size={19} className="text-primary" /></div>
            <h2 className="text-2xl font-display font-extrabold text-foreground tracking-tight">Học Fintech</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">Lộ trình cá nhân hóa theo đúng điểm yếu tín dụng của bạn.</p>
        </div>
        <TechBadge icon={Award} label={`Cấp độ: ${cap.label}`} tone={cap.tone} />
      </motion.div>

      {/* Progress */}
      <motion.div variants={fadeUp} className="bg-card border hairline rounded-3xl p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-sm font-semibold text-foreground">Tiến độ học tập</span>
          <span className="text-sm font-mono font-bold text-primary">{doneCount}/{total} bài</span>
        </div>
        <div className="w-full h-2.5 bg-accent rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-mimi-green" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
        </div>
      </motion.div>

      {/* Recommended */}
      {recommended.length > 0 && (
        <motion.div variants={fadeUp}>
          <h3 className="text-lg font-display font-bold text-foreground mb-1">🎯 Đề xuất cho bạn</h3>
          <p className="text-xs text-muted-foreground mb-3">Ưu tiên theo 2 yếu tố tín dụng đang thấp nhất — cải thiện chúng để tăng điểm nhanh nhất.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {recommended.map(({ lesson, reason }) => (
              <LessonCard key={lesson.id} lesson={lesson} done={completed.has(lesson.id)} reason={reason} onOpen={() => setOpenLesson(lesson)} />
            ))}
          </div>
        </motion.div>
      )}

      {/* All lessons grouped */}
      <motion.div variants={fadeUp} className="space-y-6">
        <h3 className="text-lg font-display font-bold text-foreground">Tất cả bài học</h3>
        {grouped.map((g) => (
          <div key={g.factor}>
            <p className="text-sm font-semibold text-muted-foreground mb-2.5 flex items-center gap-2">
              <span>{FACTOR_EMOJI[g.factor]}</span> {FACTOR_LABEL[g.factor]}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {g.lessons.map((lesson) => (
                <LessonCard key={lesson.id} lesson={lesson} done={completed.has(lesson.id)} onOpen={() => setOpenLesson(lesson)} />
              ))}
            </div>
          </div>
        ))}
      </motion.div>

      {score == null && (
        <motion.div variants={fadeUp} className="bg-primary/5 border border-primary/15 rounded-2xl p-4 flex items-center gap-3">
          <Sparkles size={18} className="text-primary shrink-0" />
          <p className="text-sm text-foreground">Tính điểm tín dụng để nhận lộ trình học cá nhân hóa theo điểm yếu của bạn.
            <a href="/dashboard/credit" className="text-primary font-medium ml-1 inline-flex items-center gap-1">Tới trang Điểm <ArrowRight size={12} /></a>
          </p>
        </motion.div>
      )}

      <AnimatePresence>
        {openLesson && (
          <LessonModal
            lesson={openLesson}
            done={completed.has(openLesson.id)}
            onClose={() => setOpenLesson(null)}
            onComplete={(qs) => markComplete(openLesson, qs)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
