import { motion, AnimatePresence } from 'framer-motion';
import { companyProfile } from '@/lib/mockData';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { useSubscriptionStore, TIERS } from '@/store/useSubscriptionStore';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { User, Building, Bell, Shield, CreditCard, ChevronRight, LogOut, Loader2, ExternalLink, Check, Crown, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

type NotificationPrefs = { invoice_due: boolean; disbursement: boolean; cashflow: boolean };
const DEFAULT_PREFS: NotificationPrefs = { invoice_due: true, disbursement: true, cashflow: false };

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const } },
};

function SettingsSection({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <motion.div variants={fadeUp} className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border/30">
        <div className="w-8 h-8 rounded-xl bg-primary/8 flex items-center justify-center">
          <Icon size={15} className="text-primary" />
        </div>
        <h3 className="font-display font-bold text-foreground">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </motion.div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/20 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground font-medium">{value}</span>
    </div>
  );
}

function SubscriptionSection() {
  const { subscribed, productId, subscriptionEnd, loading, checkSubscription, createCheckout, openPortal } = useSubscriptionStore();
  const { t } = useTranslation();

  useEffect(() => { checkSubscription(); }, [checkSubscription]);

  const currentTier = Object.values(TIERS).find(t => t.product_id === productId);

  const handleCheckout = async (priceId: string) => {
    try {
      await createCheckout(priceId);
    } catch {
      toast.error('Không thể tạo phiên thanh toán');
    }
  };

  const handlePortal = async () => {
    try {
      await openPortal();
    } catch {
      toast.error('Không thể mở cổng quản lý');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-muted-foreground" size={20} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {subscribed && currentTier && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-3">
            <Crown size={18} className="text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">{currentTier.name}</p>
              <p className="text-xs text-muted-foreground">
                {t('settings.expires')}: {subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString('vi-VN') : '—'}
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePortal}
            className="flex items-center gap-1.5 text-xs bg-accent text-foreground px-4 py-2 rounded-xl font-medium hover:brightness-110 transition-all"
          >
            {t('settings.manage')} <ExternalLink size={12} />
          </motion.button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(TIERS).map(([key, tier]) => {
          const isActive = productId === tier.product_id;
          return (
            <div
              key={key}
              className={`relative p-5 rounded-xl border transition-all ${
                isActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border/40 bg-card/40 hover:border-border'
              }`}
            >
              {isActive && (
                <div className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  {t('settings.using')}
                </div>
              )}
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-display font-bold text-foreground">{tier.name}</h4>
                {key === 'growth' && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{t('settings.popular')}</span>}
              </div>
              <p className="text-2xl font-mono font-bold text-foreground">
                {tier.price.toLocaleString('vi-VN')}₫
                <span className="text-xs text-muted-foreground font-normal">/tháng</span>
              </p>
              <ul className="mt-3 space-y-1.5">
                {(key === 'starter'
                  ? ['Phân tích dòng tiền', 'AI Chatbot cơ bản', 'Báo cáo tháng']
                  : ['Tất cả Starter', 'Dự báo AI nâng cao', 'Ứng vốn hóa đơn', 'Tin tức thị trường']
                ).map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check size={12} className="text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {!isActive && (
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCheckout(tier.price_id)}
                  className={`mt-4 w-full text-xs py-2.5 rounded-xl font-medium transition-all ${
                    key === 'growth'
                      ? 'bg-primary text-primary-foreground hover:brightness-110'
                      : 'bg-accent text-foreground hover:brightness-110'
                  }`}
                >
                  {subscribed ? t('settings.switchPlan') : t('settings.subscribe')}
                </motion.button>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={checkSubscription} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
        {t('settings.refreshStatus')}
      </button>
    </div>
  );
}

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (password.length < 6) {
      toast.error('Mật khẩu cần tối thiểu 6 ký tự');
      return;
    }
    if (password !== confirm) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Đã đổi mật khẩu thành công');
    setPassword('');
    setConfirm('');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-foreground">Đổi mật khẩu</h3>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Mật khẩu mới</label>
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Xác nhận mật khẩu</label>
                <input
                  type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary/50"
                />
              </div>
              <button
                onClick={handleSubmit} disabled={saving}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />} Xác nhận đổi mật khẩu
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NotificationToggles() {
  const session = useAuthStore((s) => s.session);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('profiles')
      .select('notification_prefs')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.notification_prefs) setPrefs({ ...DEFAULT_PREFS, ...(data.notification_prefs as Partial<NotificationPrefs>) });
        setLoading(false);
      });
  }, [session]);

  const toggle = async (key: keyof NotificationPrefs) => {
    if (!session) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    const { error } = await supabase
      .from('profiles')
      .update({ notification_prefs: next })
      .eq('user_id', session.user.id);
    if (error) {
      setPrefs(prefs);
      toast.error('Không lưu được cài đặt thông báo');
    }
  };

  const { t } = useTranslation();
  const items: { key: keyof NotificationPrefs; label: string }[] = [
    { key: 'invoice_due', label: t('settings.notifInvoiceDue') },
    { key: 'disbursement', label: t('settings.notifDisbursement') },
    { key: 'cashflow', label: t('settings.notifCashflow') },
  ];

  return (
    <div className="space-y-4">
      {items.map((n) => (
        <div key={n.key} className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{n.label}</span>
          <button
            disabled={loading}
            onClick={() => toggle(n.key)}
            className={`w-10 h-6 rounded-full relative transition-colors disabled:opacity-50 ${prefs[n.key] ? 'bg-primary' : 'bg-accent'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-primary-foreground absolute top-1 transition-all ${prefs[n.key] ? 'right-1' : 'left-1'}`} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const securityItems = [
    { label: t('settings.changePassword'), onClick: () => setShowPasswordModal(true) },
    { label: t('settings.twoFactor'), onClick: () => toast('Tính năng xác thực 2 lớp đang được phát triển, sẽ ra mắt sớm') },
    { label: t('settings.manageDevices'), onClick: () => toast('Tính năng quản lý thiết bị đang được phát triển, sẽ ra mắt sớm') },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-2xl">
      <motion.div variants={fadeUp}>
        <h2 className="text-2xl font-display font-extrabold text-foreground tracking-tight">{t('settings.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('settings.subtitle')}</p>
      </motion.div>

      <SettingsSection icon={User} title={t('settings.personalInfo')}>
        <InfoRow label={t('settings.fullName')} value={user?.user_metadata?.full_name || t('settings.user')} />
        <InfoRow label={t('settings.email')} value={user?.email || ''} />
        <InfoRow label={t('settings.phone')} value={user?.user_metadata?.phone || ''} />
      </SettingsSection>

      <SettingsSection icon={Building} title={t('settings.business')}>
        <InfoRow label={t('settings.companyName')} value={companyProfile.name} />
        <InfoRow label={t('settings.taxId')} value={companyProfile.taxId} />
        <InfoRow label={t('settings.industry')} value={companyProfile.industry} />
        <InfoRow label={t('settings.province')} value={companyProfile.province} />
      </SettingsSection>

      <SettingsSection icon={CreditCard} title={t('settings.subscription')}>
        <SubscriptionSection />
      </SettingsSection>

      <SettingsSection icon={Bell} title={t('settings.notifications')}>
        <NotificationToggles />
      </SettingsSection>

      <SettingsSection icon={Shield} title={t('settings.securityTitle')}>
        <div className="space-y-1">
          {securityItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="w-full flex items-center justify-between py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
              <ChevronRight size={14} />
            </button>
          ))}
        </div>
      </SettingsSection>

      <motion.div variants={fadeUp}>
        <button
          onClick={() => { logout(); navigate('/'); }}
          className="flex items-center gap-2 text-sm text-destructive hover:underline font-medium"
        >
          <LogOut size={14} /> {t('sidebar.logout')}
        </button>
      </motion.div>

      <ChangePasswordModal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </motion.div>
  );
}
