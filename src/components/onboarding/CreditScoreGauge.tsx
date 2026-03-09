import { motion } from 'framer-motion';

export default function CreditScoreGauge({ score = 0, maxScore = 1000 }: { score?: number; maxScore?: number }) {
  const percentage = score / maxScore;
  const arcLength = 240; // degrees
  const startAngle = 150; // start from bottom-left
  const radius = 45;
  const cx = 55;
  const cy = 55;

  const circumference = (arcLength / 360) * 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage);

  const describeArc = (startDeg: number, endDeg: number) => {
    const start = {
      x: cx + radius * Math.cos((startDeg * Math.PI) / 180),
      y: cy + radius * Math.sin((startDeg * Math.PI) / 180),
    };
    const end = {
      x: cx + radius * Math.cos((endDeg * Math.PI) / 180),
      y: cy + radius * Math.sin((endDeg * Math.PI) / 180),
    };
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const bgPath = describeArc(startAngle, startAngle + arcLength);
  const fillPath = describeArc(startAngle, startAngle + arcLength);

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg viewBox="0 0 110 110" className="w-full h-full">
        <defs>
          <linearGradient id="gaugeGradOnboarding" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--blue-500))" />
            <stop offset="100%" stopColor="hsl(var(--green-500))" />
          </linearGradient>
          <filter id="gaugeGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background arc */}
        <path
          d={bgPath}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Filled arc */}
        <motion.path
          d={fillPath}
          fill="none"
          stroke="url(#gaugeGradOnboarding)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          filter="url(#gaugeGlow)"
        />

        {/* Score text */}
        <motion.text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="central"
          fill="hsl(var(--text-primary))"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="800"
          fontSize="18"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {score}
        </motion.text>
        <motion.text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fill="hsl(var(--text-secondary))"
          fontFamily="Inter, sans-serif"
          fontSize="7"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          / {maxScore}
        </motion.text>
      </svg>
    </div>
  );
}
