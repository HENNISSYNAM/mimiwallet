import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CredentialBadge } from '@/components/illustrations/BrandIcons';
import sokhcnLogo from '@/assets/logos/sokhcn.png';
import cpGroupLogo from '@/assets/logos/cp-group.png';

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
  logo: string;
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
    logo: sokhcnLogo,
    org: 'Trung tâm Khởi nghiệp Sáng tạo TP.HCM',
    parent: 'Sở Khoa học và Công nghệ TP.HCM',
    role: 'ui2.trust.roleKnst',
    program: 'ui2.trust.programKnst',
    docNo: 'Quyết định 231/QĐ-KNST',
    date: '25/11/2025',
  },
  {
    logo: cpGroupLogo,
    org: 'C.P. Group',
    role: 'ui2.trust.roleCp',
    // TODO: điền đúng tên chương trình của C.P. — thẻ chỉ có giá trị khi tra được.
    program: 'ui2.trust.programCp',
  },
];

/**
 * Financial institutions on the Open Banking integration roadmap.
 *
 * The row states scope and nothing more. Open API work is funded, but funding
 * for the programme is not the same as a signed agreement with each of these
 * seven institutions — so the copy names them as integration targets and stops
 * there. Upgrade the wording per institution only, and only against a specific
 * agreement.
 */

/** `role`/`program` là khoá i18n; tên tổ chức, cơ quan và số quyết định giữ nguyên bản gốc. */
function CredentialCard({ c, index }: { c: Credential; index: number }) {
  const { t } = useTranslation();
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: index * 0.09, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-5xl border hairline bg-card p-5 sm:p-6 text-left"
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      <div className="flex items-start gap-4">
        <span className="shrink-0 grid h-12 w-12 place-items-center rounded-2xl bg-white ring-1 ring-border/70 overflow-hidden">
          <img src={c.logo} alt={`Logo ${c.org}`} className="h-9 w-9 object-contain" loading="lazy" />
        </span>

        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mimi-green/12 px-2.5 py-1 text-[11px] font-semibold text-mimi-green">
            <CredentialBadge size={12} /> {t(c.role)}
          </span>

          <h3 className="mt-2.5 font-display text-[15px] font-bold leading-snug text-foreground">
            {c.org}
          </h3>
          {c.parent && <p className="text-xs text-muted-foreground">{c.parent}</p>}

          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{t(c.program)}</p>

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
  const { t } = useTranslation();
  return (
    <div className="container mx-auto px-4">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {t('ui2.trust.nhan')}
        </p>
        <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {t('ui2.trust.tieuDe')}
        </h2>
      </div>

      <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-2">
        {CREDENTIALS.map((c, i) => (
          <CredentialCard key={c.org} c={c} index={i} />
        ))}
      </div>

      {/*
        Gỡ 28/09/2026 (chỉ giữ thứ đang chạy thật): hàng logo "định hướng tích hợp Open Banking"
        — chưa có thoả thuận với ngân hàng nào — và khối "Nguồn dữ liệu thuế" — Casso chưa bật
        sản phẩm hoá đơn điện tử cho app production, nên MIMI chưa đọc được hoá đơn từ cơ quan thuế.
      */}
    </div>
  );
}
