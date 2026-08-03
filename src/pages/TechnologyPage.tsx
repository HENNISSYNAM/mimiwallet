import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Zap, Lock, Database, Cpu, ArrowRight, CheckCircle2 } from 'lucide-react';
import { QuantumLockArt, MLScoreArt, RLSArt } from '@/components/illustrations/TechPillars';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const PILLAR_META = [
  { icon: Lock, tone: 'text-primary bg-primary/10', tag: 'ML-KEM-768 · NIST FIPS 203', Art: QuantumLockArt },
  { icon: Zap, tone: 'text-mimi-green bg-mimi-green/10', tag: 'Machine Learning · giải thích được', Art: MLScoreArt },
  { icon: ShieldCheck, tone: 'text-[hsl(270_60%_50%)] bg-[hsl(270_60%_55%/0.1)]', tag: 'Row-Level Security', Art: RLSArt },
];

const PIPELINE_ICONS = [Database, Cpu, Zap, CheckCircle2];

interface PillarText { title: string; desc: string; points: string[]; }
interface PipelineText { label: string; sub: string; }

export default function TechnologyPage() {
  const { t } = useTranslation();
  const pillarTexts = t('pg.tech.pillars', { returnObjects: true }) as PillarText[];
  const pillars = PILLAR_META.map((meta, i) => ({ ...meta, ...pillarTexts[i] }));
  const pipelineTexts = t('pg.tech.pipeline', { returnObjects: true }) as PipelineText[];
  const pipeline = PIPELINE_ICONS.map((icon, i) => ({ icon, ...pipelineTexts[i] }));
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 max-w-5xl">
      {/* Hero */}
      <motion.div variants={fadeUp} className="text-center pt-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
          <Cpu size={13} /> {t('pg.tech.badge')}
        </span>
        <h2 className="mt-3 text-[28px] sm:text-4xl font-display font-extrabold text-foreground tracking-tight">
          {t('pg.tech.heroTitle')}
        </h2>
        <p className="mt-3 text-[15px] text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t('pg.tech.heroSubtitle')}
        </p>
      </motion.div>

      {/* Three pillars */}
      <div className="space-y-5">
        {pillars.map((p) => (
          <motion.div
            key={p.title}
            variants={fadeUp}
            className="bg-card border hairline rounded-3xl overflow-hidden grid md:grid-cols-2"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="p-6 sm:p-8 flex flex-col justify-center order-2 md:order-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${p.tone}`}>
                  <p.icon size={20} strokeWidth={2.2} />
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground font-mono">{p.tag}</span>
              </div>
              <h3 className="text-xl font-display font-bold text-foreground">{p.title}</h3>
              <p className="mt-2 text-[14px] text-muted-foreground leading-relaxed">{p.desc}</p>
              <ul className="mt-4 space-y-2">
                {p.points.map((pt) => (
                  <li key={pt} className="flex items-center gap-2 text-[13px] text-foreground">
                    <CheckCircle2 size={15} className="text-mimi-green shrink-0" /> {pt}
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1 md:order-2 p-5 sm:p-6 flex items-center justify-center bg-accent/40">
              <div className="w-full max-w-[340px]"><p.Art play /></div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pipeline "from data to score" */}
      <motion.div variants={fadeUp} className="bg-card border hairline rounded-3xl p-6 sm:p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
          <h3 className="text-lg font-display font-bold text-foreground">{t('pg.tech.pipelineTitle')}</h3>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mimi-green/10 text-mimi-green px-3 py-1 text-xs font-bold">
            <Zap size={13} /> {t('pg.tech.pipelineBadge')}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {pipeline.map((step, i) => (
            <div key={step.label} className="relative">
              <div className="bg-accent/50 rounded-2xl p-4 h-full">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-2.5">
                  <step.icon size={18} className="text-primary" />
                </div>
                <p className="text-[13px] font-semibold text-foreground leading-snug">{step.label}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{step.sub}</p>
              </div>
              {i < pipeline.length - 1 && (
                <ArrowRight size={16} className="hidden md:block absolute top-1/2 -right-2.5 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Trust footer */}
      <motion.div variants={fadeUp} className="text-center pb-4">
        <p className="text-[13px] text-muted-foreground">
          {t('pg.tech.openSourceNote')}{' '}
          <a href="https://github.com/HENNISSYNAM/mimiwallet" target="_blank" rel="noreferrer" className="text-primary font-medium hover:underline">
            github.com/HENNISSYNAM/mimiwallet
          </a>
        </p>
      </motion.div>
    </motion.div>
  );
}
