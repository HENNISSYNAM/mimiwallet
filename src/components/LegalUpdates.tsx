import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ExternalLink, Scale, Landmark as LandmarkIcon, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Law and tax reference, read for a person — not a citation dump.
 *
 * Every row in `legal_documents` is entered by a migration after a human
 * opened the source and read it; see that table's comment for why. This
 * component's only job is to not waste that work by burying the plain-language
 * answer under the formal citation. The rule, in order:
 *
 *   1. What does this mean for me — first, largest, always visible.
 *   2. Who it applies to and by when — a badge, glanceable.
 *   3. The formal wording and the source link — behind one tap, for the person
 *      who wants to verify it themselves or show it to their accountant.
 *
 * A wrong number here has already happened once in this project — 1 tỷ was
 * coded as "the tax exemption threshold" when the real figure is 500 triệu.
 * The fix was correcting the constant; this component's structure is the other
 * half of the fix, so the citation is never so far from the number that a
 * reader has no way to check it themselves.
 */

interface LegalDoc {
  id: string;
  so_hieu: string;
  ten: string;
  loai: 'luat' | 'nghi_dinh' | 'thong_tu';
  co_quan_ban_hanh: string;
  ngay_hieu_luc: string | null;
  tom_tat_de_hieu: string;
  tom_tat_chinh_thuc: string | null;
  doi_tuong_ap_dung: string[];
  con_so_moc: number | null;
  don_vi_moc: string | null;
  url_nguon: string;
}

const LOAI_LABEL: Record<LegalDoc['loai'], string> = {
  luat: 'Luật',
  nghi_dinh: 'Nghị định',
  thong_tu: 'Thông tư',
};

const LOAI_ICON: Record<LegalDoc['loai'], typeof Scale> = {
  luat: Scale,
  nghi_dinh: LandmarkIcon,
  thong_tu: BookOpen,
};

const DOI_TUONG_LABEL: Record<string, string> = {
  ho_kinh_doanh: 'Hộ kinh doanh',
  doanh_nghiep: 'Doanh nghiệp',
  ca_nhan: 'Cá nhân',
  tat_ca: 'Mọi người',
};

function moc(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(0)} tỷ`;
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)} triệu`;
  return n.toLocaleString('vi-VN');
}

/** "sắp có hiệu lực" beats "đã có hiệu lực" as the thing worth a reader's attention. */
function hieuLucBadge(ngayHieuLuc: string | null): { text: string; upcoming: boolean } | null {
  if (!ngayHieuLuc) return null;
  const days = Math.round((new Date(ngayHieuLuc).getTime() - Date.now()) / 86_400_000);
  if (days > 0 && days <= 120) return { text: `Có hiệu lực trong ${days} ngày`, upcoming: true };
  if (days > 0) return { text: `Có hiệu lực ${new Date(ngayHieuLuc).toLocaleDateString('vi-VN')}`, upcoming: true };
  return { text: `Có hiệu lực từ ${new Date(ngayHieuLuc).toLocaleDateString('vi-VN')}`, upcoming: false };
}

function DocCard({ doc, index }: { doc: LegalDoc; index: number }) {
  const [open, setOpen] = useState(false);
  const Icon = LOAI_ICON[doc.loai];
  const badge = hieuLucBadge(doc.ngay_hieu_luc);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl bg-accent/40 overflow-hidden"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-3 flex items-start gap-2.5 hover:bg-accent/20 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
          <Icon size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              {LOAI_LABEL[doc.loai]} {doc.so_hieu.replace(/^(Luật|Nghị định|Thông tư)\s*/i, '')}
            </span>
            {badge && (
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  badge.upcoming
                    ? 'bg-mimi-amber/15 text-mimi-amber'
                    : 'bg-mimi-green/15 text-mimi-green'
                }`}
              >
                {badge.text}
              </span>
            )}
          </div>

          {/* The plain-language answer — the whole reason this card exists. */}
          <p className="text-sm text-foreground leading-snug">{doc.tom_tat_de_hieu}</p>

          {doc.con_so_moc != null && (
            <p className="mt-1.5 text-base font-bold text-foreground tabular-nums">
              {moc(doc.con_so_moc)}
              {doc.don_vi_moc && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  {doc.don_vi_moc}
                </span>
              )}
            </p>
          )}

          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            {doc.doi_tuong_ap_dung.map((d) => (
              <span
                key={d}
                className="text-[10px] text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded"
              >
                {DOI_TUONG_LABEL[d] ?? d}
              </span>
            ))}
          </div>
        </div>
        <ChevronDown
          size={14}
          className={`text-muted-foreground shrink-0 mt-1 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pl-[46px] space-y-2">
              {doc.tom_tat_chinh_thuc && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {doc.tom_tat_chinh_thuc}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {doc.co_quan_ban_hanh}
                {doc.ngay_hieu_luc &&
                  ` · Hiệu lực từ ${new Date(doc.ngay_hieu_luc).toLocaleDateString('vi-VN')}`}
              </p>
              <a
                href={doc.url_nguon}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Xem văn bản gốc <ExternalLink size={11} />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function LegalUpdates({ wide = false }: { wide?: boolean } = {}) {
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('legal_documents')
        .select(
          'id, so_hieu, ten, loai, co_quan_ban_hanh, ngay_hieu_luc, tom_tat_de_hieu, tom_tat_chinh_thuc, doi_tuong_ap_dung, con_so_moc, don_vi_moc, url_nguon',
        )
        .order('ngay_hieu_luc', { ascending: false });
      if (!cancelled) {
        setDocs((data ?? []) as LegalDoc[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Upcoming and just-effective dates surface first — that is the moment a
  // reader needs to act, not the moment a law was merely passed.
  const sorted = useMemo(() => {
    const now = Date.now();
    return [...docs].sort((a, b) => {
      const da = a.ngay_hieu_luc ? Math.abs(new Date(a.ngay_hieu_luc).getTime() - now) : Infinity;
      const db = b.ngay_hieu_luc ? Math.abs(new Date(b.ngay_hieu_luc).getTime() - now) : Infinity;
      return da - db;
    });
  }, [docs]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-16 bg-accent/40 rounded-xl" />
        ))}
      </div>
    );
  }

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có văn bản nào.</p>;
  }

  return (
    <div className="space-y-2.5">
      {/* Same reasoning as IndustryNews: two columns when the panel is wide.
          `items-start` matters here — a card whose "Căn cứ" section is expanded
          would otherwise stretch its row-mate to match. */}
      <div className={wide ? 'grid sm:grid-cols-2 gap-2.5 items-start' : 'space-y-2.5'}>
        {sorted.map((doc, i) => (
          <DocCard key={doc.id} doc={doc} index={i} />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground pt-1">
        Mỗi văn bản đã được đối chiếu với nguồn chính thức. Không thay thế tư vấn từ kế toán hoặc
        cơ quan thuế.
      </p>
    </div>
  );
}
