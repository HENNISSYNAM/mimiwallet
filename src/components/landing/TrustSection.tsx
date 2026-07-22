import { motion } from 'framer-motion';
import {
  CredentialBadge,
  InnovationHub,
  MentorLink,
  type BrandIconProps,
} from '@/components/illustrations/BrandIcons';

/**
 * Third-party recognition, stated at the precision a judge can verify.
 *
 * Every claim here names the issuing body and, where one exists, the decision
 * number and date — that citation is the whole point of the section. The role
 * wording is deliberately exact ("tuyển chọn ươm tạo", not "đối tác"): a public
 * body selecting a project for an incubation programme is not an endorsement of
 * the company, and overstating it would put the real credential in doubt.
 */

interface Credential {
  icon: (p: BrandIconProps) => JSX.Element;
  org: string;
  /** Parent body, when the issuer sits inside one. */
  parent?: string;
  role: string;
  program: string;
  /** Official document reference — rendered mono, like a citation. */
  docNo?: string;
  date?: string;
}

const CREDENTIALS: Credential[] = [
  {
    icon: InnovationHub,
    org: 'Trung tâm Khởi nghiệp Sáng tạo TP.HCM',
    parent: 'Sở Khoa học và Công nghệ TP.HCM',
    role: 'Tuyển chọn ươm tạo',
    program: 'Chương trình Đổi mới sáng tạo, Khởi nghiệp sáng tạo lĩnh vực Công nghệ Tài chính 2025',
    docNo: 'Quyết định 231/QĐ-KNST',
    date: '25/11/2025',
  },
  {
    icon: MentorLink,
    org: 'C.P. Group',
    role: 'Ươm tạo & cố vấn',
    // TODO: điền đúng tên chương trình của C.P. — thẻ chỉ có giá trị khi tra được.
    program: 'Chương trình ươm tạo & cố vấn doanh nghiệp',
  },
];

/** Banks we intend to connect to — not partners. OpenBanking ships them disconnected. */
const INTEGRATION_TARGETS = ['Vietcombank', 'BIDV', 'Techcombank', 'VPBank', 'MB Bank', 'ACB'];

function CredentialCard({ c, index }: { c: Credential; index: number }) {
  const Icon = c.icon;
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: index * 0.09, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card glass-card--tinted p-5 sm:p-6 text-left"
    >
      <div className="flex items-start gap-4">
        <span className="shrink-0 grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon size={22} />
        </span>

        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mimi-green/12 px-2.5 py-1 text-[11px] font-semibold text-mimi-green">
            <CredentialBadge size={12} /> {c.role}
          </span>

          <h3 className="mt-2.5 font-display text-[15px] font-bold leading-snug text-foreground">
            {c.org}
          </h3>
          {c.parent && <p className="text-xs text-muted-foreground">{c.parent}</p>}

          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{c.program}</p>

          {c.docNo && (
            <p className="mt-3 border-t hairline pt-2.5 font-mono text-[11px] text-foreground/70">
              {c.docNo}
              {c.date && <span className="text-muted-foreground"> · {c.date}</span>}
            </p>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export default function TrustSection() {
  return (
    <div className="container mx-auto px-4">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Được công nhận &amp; ươm tạo
        </p>
        <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Thẩm định độc lập từ bên thứ ba
        </h2>
      </div>

      <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-2">
        {CREDENTIALS.map((c, i) => (
          <CredentialCard key={c.org} c={c} index={i} />
        ))}
      </div>

      {/*
        Kept separate from the credentials above, and labelled as a roadmap
        rather than a partnership, because no bank integration is live yet.
      */}
      <div className="mx-auto mt-10 max-w-4xl border-t hairline pt-6 text-center">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Định hướng tích hợp Open Banking
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {INTEGRATION_TARGETS.map((b) => (
            <span
              key={b}
              className="font-display text-[13px] font-semibold tracking-wide text-muted-foreground/60"
            >
              {b}
            </span>
          ))}
        </div>
        <p className="mx-auto mt-3 max-w-md text-[11px] leading-relaxed text-muted-foreground/70">
          Danh sách ngân hàng mục tiêu theo chuẩn Open Banking — chưa phải đối tác đã ký kết.
        </p>
      </div>
    </div>
  );
}
