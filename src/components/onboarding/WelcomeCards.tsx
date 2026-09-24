import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { congTyDangDung, idCongTyDangDung } from '@/lib/congTyDangDung';
import { MST_HOP_LE, chuanHoaMst } from '@/lib/maSoThue';
import { traMst, type KetQuaTraMst } from '@/lib/traMst';
import { goiToKhai } from '@/lib/goiToKhai';
import mimiWatch from '@/assets/mimi/watch.png';

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
 *
 * MÃ SỐ THUẾ ĐỨNG ĐẦU (24/09/2026). Trước đó thẻ hỏi tên cửa hàng và "hộ hay doanh
 * nghiệp" trước, rồi mới xin mã số thuế ở thẻ sau — tức là hỏi hai điều mà chính mã
 * đó trả lời được. Giờ mã đứng đầu: gõ xong, MIMI tra dữ liệu đăng ký thuế, hiện tên
 * đăng ký và loại hình, và thẻ chỉ còn một nút "Đúng, tiếp tục". Không có mã, hoặc
 * tra không thấy, thì hỏi như cũ.
 */

type Step = {
  key: 'account_type' | 'industry' | 'size' | 'goal';
  title: string;
  hint?: string;
  options: { value: string; label: string }[];
};

/**
 * Vietnamese tax IDs are 10 digits, or 13 when a branch suffix is present
 * (10 digits, a dash, then 3). Checked here only for shape — confirming the
 * code actually belongs to this business needs Cas IDKit, which is not yet
 * enabled on the contract. Storing an unverified code is fine; presenting it as
 * verified would not be.
 */
// Quy tac dung chung voi trang Cai dat — xem `src/lib/maSoThue.ts`.
const TAX_ID_OK = MST_HOP_LE;

const STEPS: Step[] = [
  {
    key: 'account_type',
    title: 'Bạn đang dùng MIMI cho việc gì?',
    hint: 'Quyết định phần thuế và báo cáo nào áp dụng cho bạn.',
    options: [
      { value: 'household', label: 'Hộ kinh doanh' },
      { value: 'business', label: 'Doanh nghiệp' },
      { value: 'personal', label: 'Chi tiêu cá nhân' },
    ],
  },
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
  const [taxId, setTaxId] = useState('');
  const [tra, setTra] = useState<KetQuaTraMst | { trang_thai: 'rong' | 'dang_tra' }>({ trang_thai: 'rong' });

  // Gõ đủ mã thì tra. Chờ người dùng ngừng gõ một chút, và bỏ kết quả của mã đã bị sửa.
  useEffect(() => {
    if (!TAX_ID_OK(taxId)) { setTra({ trang_thai: 'rong' }); return; }
    let bo = false;
    setTra({ trang_thai: 'dang_tra' });
    const hen = setTimeout(async () => {
      const kq = await traMst(chuanHoaMst(taxId));
      if (bo) return;
      setTra(kq);
      if (kq.trang_thai === 'thay') setName(kq.ten);
    }, 450);
    return () => { bo = true; clearTimeout(hen); };
  }, [taxId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Câu hỏi về hồ sơ công ty chỉ dành cho chủ sở hữu: người được mời (kế toán, người xem)
      // không có quyền sửa công ty, nên hỏi họ là hỏi một câu mà câu trả lời không lưu được.
      const ct = await congTyDangDung();
      if (!ct || ct.vai_tro !== 'chu_so_huu') return;
      const { data } = await supabase
        .from('companies')
        .select('id, name, tax_id, onboarding_done_at')
        .eq('id', ct.id)
        .maybeSingle();
      // Never shown again once answered or skipped.
      if (cancelled || !data || data.onboarding_done_at) return;
      setCompanyId(data.id);
      setName(data.name ?? '');
      setTaxId(data.tax_id ?? '');
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
        ...(final.account_type ? { account_type: final.account_type } : {}),
        ...(TAX_ID_OK(taxId) ? { tax_id: chuanHoaMst(taxId) } : {}),
        ...(final.industry ? { industry: final.industry } : {}),
        ...(final.size ? { employee_count: final.size } : {}),
        ...(final.goal ? { primary_goal: final.goal } : {}),
        onboarding_done_at: new Date().toISOString(),
      })
      .eq('id', companyId);
    setSaving(false);
    setVisible(false);
    // Máy chủ tra mã và ghi địa chỉ, cơ quan thuế vào hồ sơ — để trang thuế khỏi hỏi lại.
    if (TAX_ID_OK(taxId)) void goiToKhai('ho_so').catch(() => {});
  };

  const choose = (value: string) => {
    const next = { ...answers, [STEPS[step].key]: value };
    setAnswers(next);
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish(next);
  };

  if (!visible) return null;
  const s = STEPS[step];
  const thay = step === 0 && tra.trang_thai === 'thay' ? tra : null;

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
            <p className="text-base sm:text-lg font-display font-bold text-foreground">{thay ? 'MIMI đã tìm thấy cửa hàng của bạn' : s.title}</p>
            {!thay && s.hint && <p className="text-xs text-muted-foreground mt-0.5">{s.hint}</p>}
          </div>
        </div>

        {/* Mã số thuế trước, vì nó trả lời được câu tên và câu loại hình bên dưới. */}
        {step === 0 && (
          <div className="mt-4">
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Mã số thuế <span className="text-muted-foreground/60">(nếu có — MIMI tự điền tên và loại hình)</span>
            </label>
            <input
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              inputMode="numeric"
              placeholder="0319436143"
              className={`w-full bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/10 transition-all ${
                taxId && !TAX_ID_OK(taxId) ? 'border-mimi-red' : 'border-border focus:border-primary'
              }`}
            />
            {taxId && !TAX_ID_OK(taxId) && (
              <p className="text-xs text-mimi-red mt-1">Mã số thuế gồm 10 chữ số (có thể kèm “-” và 3 số chi nhánh), hoặc 12 chữ số với hộ kinh doanh.</p>
            )}
            {tra.trang_thai === 'dang_tra' && <p className="text-xs text-muted-foreground mt-1">Đang tra dữ liệu đăng ký thuế…</p>}
            {tra.trang_thai === 'khong_thay' && <p className="text-xs text-muted-foreground mt-1">Chưa thấy mã này trên dữ liệu thuế. Vẫn lưu được — điền tên bên dưới.</p>}
          </div>
        )}

        {thay && (
          <div className="mt-3 rounded-xl border border-mimi-green/40 bg-mimi-green/5 px-3 py-2.5">
            <p className="text-sm font-medium text-foreground">{thay.ten}</p>
            <p className="text-xs text-muted-foreground">
              {thay.loai === 'doanh_nghiep' ? 'Doanh nghiệp' : thay.loai === 'ho_kinh_doanh' ? 'Hộ kinh doanh' : 'Theo đăng ký thuế'} · {thay.trang_thai_nnt}
            </p>
            {!thay.con_hoat_dong && <p className="text-xs text-mimi-red mt-1">Mã này không còn hoạt động trên dữ liệu thuế — kiểm lại xem có gõ nhầm.</p>}
          </div>
        )}

        {/* Pre-filled. The trigger names a new company after the person, which is
            a guess — right often enough to keep, wrong often enough to offer.
            Hidden once the tax code has given the registered name. */}
        {step === 0 && !thay && (
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
          {/* Loại hình đã biết theo mã số thuế thì không hỏi — chỉ còn một nút đi tiếp. */}
          {thay?.loai ? (
            <button
              disabled={saving}
              onClick={() => choose(thay.loai === 'doanh_nghiep' ? 'business' : 'household')}
              className="px-4 py-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50"
            >
              Đúng, tiếp tục
            </button>
          ) : s.options.map((o) => (
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
