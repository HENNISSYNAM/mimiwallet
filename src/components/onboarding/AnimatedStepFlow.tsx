import { motion } from 'framer-motion';
import { Smartphone, Brain, Banknote, ArrowRight } from 'lucide-react';

const steps = [
  {
    icon: Smartphone,
    label: 'Kết nối\nNgân hàng',
    gradient: 'from-primary to-blue-400',
    bgGlow: 'bg-primary/20',
  },
  {
    icon: Brain,
    label: 'AI\nPhân tích',
    gradient: 'from-blue-400 to-mimi-green',
    bgGlow: 'bg-blue-400/20',
  },
  {
    icon: Banknote,
    label: 'Nhận\nVốn 24h',
    gradient: 'from-mimi-green to-green-400',
    bgGlow: 'bg-mimi-green/20',
  },
];

export default function AnimatedStepFlow({ activeStep = -1 }: { activeStep?: number }) {
  return (
    <div className="relative py-8">
      {/* Wave gradient background */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <motion.div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            background: 'linear-gradient(90deg, hsl(var(--blue-500)), hsl(217,91%,60%), hsl(var(--green-500)))',
          }}
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Animated wave SVG */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 600 120">
        <defs>
          <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--blue-500))" stopOpacity="0.15" />
            <stop offset="50%" stopColor="hsl(217,91%,60%)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="hsl(var(--green-500))" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <motion.path
          d="M0,60 Q75,20 150,60 T300,60 T450,60 T600,60"
          fill="none"
          stroke="url(#waveGrad)"
          strokeWidth="40"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, ease: 'easeOut' }}
        />
        <motion.path
          d="M0,60 Q75,100 150,60 T300,60 T450,60 T600,60"
          fill="none"
          stroke="url(#waveGrad)"
          strokeWidth="30"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 2.5, delay: 0.3, ease: 'easeOut' }}
        />
      </svg>

      <div className="relative flex items-center justify-between px-6 py-6">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center flex-1">
            <motion.div
              className="flex flex-col items-center gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 + 0.5, duration: 0.5 }}
            >
              <motion.div
                className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg`}
                animate={activeStep === i ? {
                  scale: [1, 1.08, 1],
                  boxShadow: [
                    '0 4px 20px hsla(var(--blue-500)/0.2)',
                    '0 8px 32px hsla(var(--blue-500)/0.4)',
                    '0 4px 20px hsla(var(--blue-500)/0.2)',
                  ],
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <step.icon size={24} className="text-primary-foreground" />
                {activeStep === i && (
                  <motion.div
                    className="absolute -inset-1 rounded-2xl border-2 border-primary/40"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.8, 0, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.div>
              <div className="text-center">
                <p className="text-xs font-bold text-foreground leading-tight whitespace-pre-line">
                  Bước {i + 1}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 whitespace-pre-line">
                  {step.label}
                </p>
              </div>
            </motion.div>

            {i < steps.length - 1 && (
              <motion.div
                className="flex-1 flex items-center justify-center mx-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.2 + 0.8 }}
              >
                <motion.div
                  className="flex items-center gap-1"
                  animate={{ x: [0, 6, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="h-[2px] w-8 bg-gradient-to-r from-primary/40 to-mimi-green/40 rounded-full" />
                  <ArrowRight size={12} className="text-muted-foreground" />
                </motion.div>
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
