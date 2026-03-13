import { motion } from 'framer-motion';
import { companyProfile } from '@/lib/mockData';
import { useAuthStore } from '@/store/useAuthStore';
import { useSubscriptionStore, TIERS } from '@/store/useSubscriptionStore';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { User, Building, Bell, Shield, CreditCard, ChevronRight, LogOut, Loader2, ExternalLink, Check, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { t } = useTranslation();

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
        <div className="space-y-4">
          {[
            { label: t('settings.notifInvoiceDue'), checked: true },
            { label: t('settings.notifDisbursement'), checked: true },
            { label: t('settings.notifCashflow'), checked: false },
          ].map((n) => (
            <div key={n.label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{n.label}</span>
              <div className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${n.checked ? 'bg-primary' : 'bg-accent'}`}>
                <div className={`w-4 h-4 rounded-full bg-primary-foreground absolute top-1 transition-all ${n.checked ? 'right-1' : 'left-1'}`} />
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection icon={Shield} title={t('settings.securityTitle')}>
        <div className="space-y-1">
          {[t('settings.changePassword'), t('settings.twoFactor'), t('settings.manageDevices')].map((item) => (
            <button key={item} className="w-full flex items-center justify-between py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
              {item}
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
    </motion.div>
  );
}
