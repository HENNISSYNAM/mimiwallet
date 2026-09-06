import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import namPhoto from '@/assets/team/nam.jpg';
import hoangPhoto from '@/assets/team/hoang.jpg';
import nhiPhoto from '@/assets/team/nhi.jpg';
import tuPhoto from '@/assets/team/tu.jpg';
import kodyPhoto from '@/assets/team/kody.jpg';

/**
 * About us. The people and the roles are the same ones in the competition deck
 * — one source of truth, so a judge who has read the dossier meets the same
 * four names here.
 *
 * Cards tilt toward the pointer in 3D. The rotation is computed per card from
 * the pointer's position inside that card, not from the viewport, so each one
 * responds only to being pointed at.
 */

const team = [
  {
    name: 'Đinh Văn Nam',
    role: 'CEO',
    photo: namPhoto,
    school: 'Công nghệ Tài chính · ĐH Công Thương TP.HCM',
    owns: 'Định hướng sản phẩm và kiến trúc hệ thống',
  },
  {
    name: 'Lê Việt Hoàng',
    role: 'CTO',
    photo: hoangPhoto,
    school: 'Khoa học Máy tính CLC · ĐH Bách Khoa TP.HCM',
    owns: 'Mô hình chấm điểm và lớp mật mã hậu lượng tử',
  },
  {
    name: 'Phạm Yến Nhi',
    role: 'COO',
    photo: nhiPhoto,
    school: 'Quản trị Kinh doanh CLC · ĐH Ngoại thương Hà Nội',
    owns: 'Mô hình kinh doanh và phát triển khách hàng',
  },
  {
    name: 'Nguyễn Thị Ngọc Tú',
    role: 'CFO',
    photo: tuPhoto,
    school: 'Trường Kinh tế · ĐH Bách khoa Hà Nội',
    owns: 'Mô hình tài chính và quan hệ tổ chức tín dụng',
  },
];

function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ rx: 0, ry: 0 });

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Pointer position inside the card, remapped to -0.5 … 0.5.
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setT({ rx: -py * 12, ry: px * 14 });
  };

  return (
    <div ref={ref} style={{ perspective: 1000 }} className={className}>
      <motion.div
        onPointerMove={onMove}
        onPointerLeave={() => setT({ rx: 0, ry: 0 })}
        animate={{ rotateX: t.rx, rotateY: t.ry }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}

export default function TeamSection() {
  return (
    <section id="about" className="py-24 mimi-hero-warm relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-14"
        >
          {/* No eyebrow here. The page this sits on already opens with "Về
              chúng tôi", and repeating it two headings apart reads as a
              copy-paste slip rather than structure. */}
          <h2
            className="font-display font-extrabold text-foreground leading-[1.08] tracking-[-0.03em]"
            style={{ fontSize: 'clamp(2rem, 3.4vw, 3rem)' }}
          >
            Bốn người, bốn trường,
            <br className="hidden sm:block" /> một sản phẩm đang có người dùng
          </h2>
          <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
            Hai thành viên kỹ thuật đủ để xây và vận hành sản phẩm, hai thành viên kinh doanh và
            tài chính đủ để kiểm tra giả định thị trường và làm việc với ngân hàng.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {team.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.08 }}
            >
              <TiltCard className="h-full">
                <div className="h-full rounded-3xl bg-card border border-border/70 overflow-hidden
                                shadow-[0_18px_40px_-24px_rgba(120,53,15,.35)]">
                  <div className="aspect-[4/5] overflow-hidden bg-secondary">
                    <img
                      src={m.photo}
                      alt={m.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      // Lifted off the card in Z so the tilt reads as depth
                      // rather than as the whole card sliding.
                      style={{ transform: 'translateZ(28px)' }}
                    />
                  </div>
                  <div className="p-5" style={{ transform: 'translateZ(18px)' }}>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-display font-bold text-foreground">{m.name}</h3>
                      <span className="text-[11px] font-mono font-semibold text-primary shrink-0">
                        {m.role}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{m.school}</p>
                    <p className="text-[13px] text-foreground/80 mt-3 leading-snug">{m.owns}</p>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>

        {/* Advisor sits apart from the four founders — he is not a team member,
            and folding him into the same grid would imply he is. */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="mt-6"
        >
          <TiltCard>
            <div className="rounded-3xl bg-card border border-border/70 p-5 flex items-center gap-5
                            shadow-[0_18px_40px_-24px_rgba(120,53,15,.35)]">
              <img
                src={kodyPhoto}
                alt="Kody"
                loading="lazy"
                className="w-16 h-16 rounded-2xl object-cover shrink-0"
                style={{ transform: 'translateZ(24px)' }}
              />
              <div style={{ transform: 'translateZ(14px)' }}>
                <p className="text-[11px] font-mono font-semibold text-muted-foreground">
                  CỐ VẤN
                </p>
                <h3 className="font-display font-bold text-foreground mt-0.5">Kody</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  CEO EFFOMA · Meta Partner · Monash University — cố vấn chiến lược ra thị trường
                  quốc tế
                </p>
              </div>
            </div>
          </TiltCard>
        </motion.div>
      </div>
    </section>
  );
}
