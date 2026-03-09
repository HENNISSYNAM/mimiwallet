import { motion } from 'framer-motion';

/**
 * Animated diamond/network graph visualization
 * Inspired by the biochar/allicin reference image
 * Shows interconnected data points flowing into AI analysis
 */
export default function NetworkGraph({ labels = ['Ngân hàng', 'Hóa đơn', 'Dòng tiền', 'Tín dụng'] }: { labels?: string[] }) {
  const nodes = [
    { x: 50, y: 15, label: labels[0] },  // top
    { x: 85, y: 50, label: labels[1] },  // right
    { x: 50, y: 85, label: labels[2] },  // bottom
    { x: 15, y: 50, label: labels[3] },  // left
  ];

  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0], // diamond
  ];

  return (
    <div className="relative w-full h-48">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id="edgeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--blue-500))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--green-500))" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Edges with dash animation */}
        {edges.map(([from, to], i) => (
          <motion.line
            key={i}
            x1={nodes[from].x}
            y1={nodes[from].y}
            x2={nodes[to].x}
            y2={nodes[to].y}
            stroke="url(#edgeGrad)"
            strokeWidth="0.5"
            strokeDasharray="3 2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: i * 0.2 + 0.3, duration: 0.8 }}
          />
        ))}

        {/* Animated particles along edges */}
        {edges.map(([from, to], i) => (
          <motion.circle
            key={`p-${i}`}
            r="1"
            fill="hsl(var(--blue-500))"
            opacity={0.8}
            animate={{
              cx: [nodes[from].x, nodes[to].x],
              cy: [nodes[from].y, nodes[to].y],
            }}
            transition={{
              duration: 2,
              delay: i * 0.5,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}

        {/* Nodes */}
        {nodes.map((node, i) => (
          <motion.g key={i}>
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="2.5"
              fill="hsl(var(--blue-500))"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.15 + 0.2, type: 'spring' }}
            />
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="4"
              fill="none"
              stroke="hsl(var(--blue-500))"
              strokeWidth="0.3"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ delay: i * 0.15 + 0.5, duration: 3, repeat: Infinity }}
            />
          </motion.g>
        ))}

        {/* Center AI node */}
        <motion.circle
          cx="50"
          cy="50"
          r="6"
          fill="hsl(var(--bg-card))"
          stroke="hsl(var(--blue-500))"
          strokeWidth="0.8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1, type: 'spring' }}
        />
        <motion.text
          x="50"
          y="51"
          textAnchor="middle"
          dominantBaseline="central"
          fill="hsl(var(--blue-500))"
          fontSize="4"
          fontWeight="800"
          fontFamily="Inter, sans-serif"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          AI
        </motion.text>
      </svg>

      {/* Labels positioned around the diamond */}
      {nodes.map((node, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            transform: `translate(${i === 1 ? '10px' : i === 3 ? '-100%' : '-50%'}, ${i === 0 ? '-28px' : i === 2 ? '10px' : '-50%'})`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.2 + 0.6 }}
        >
          <span className="text-[10px] bg-card/80 backdrop-blur-sm border border-border/60 text-muted-foreground px-2 py-1 rounded-lg whitespace-nowrap">
            {node.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
