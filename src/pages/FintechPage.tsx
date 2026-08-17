import { useState } from 'react';
import { motion } from 'framer-motion';
import OpenBanking from '@/components/fintech/OpenBanking';
import KYCVerification from '@/components/fintech/KYCVerification';
import PaymentMethods from '@/components/fintech/PaymentMethods';
import ComplianceDashboard from '@/components/fintech/ComplianceDashboard';
import { Shield, Link2, CreditCard, Fingerprint } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassTabs, AmbientMotifField } from '@/components/ui/glass-tabs';

export default function FintechPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('banking');
  const tabs = [
    { key: 'banking', label: t('pg.fintech.tabs.banking'), icon: Link2 },
    { key: 'kyc', label: t('pg.fintech.tabs.kyc'), icon: Fingerprint },
    { key: 'payment', label: t('pg.fintech.tabs.payment'), icon: CreditCard },
    { key: 'compliance', label: t('pg.fintech.tabs.compliance'), icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-extrabold text-foreground tracking-tight">{t('pg.fintech.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('pg.fintech.subtitle')}</p>
      </div>

      {/* Tab Navigation — first tab bar in the app to carry actual Liquid Glass
          plus MIMI's own ambient motif field, matching NewsAndLawPanel. This is
          the page people switch between most (banking / eKYC / payment /
          compliance), so it earns the fuller treatment; InvoicesPage's denser
          filter row keeps the same moving pill but stays opaque instead. */}
      <div className="relative overflow-hidden rounded-2xl">
        <AmbientMotifField />
        <div className="relative overflow-x-auto p-1">
          <GlassTabs ambient tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {activeTab === 'banking' && <OpenBanking />}
        {activeTab === 'kyc' && <KYCVerification />}
        {activeTab === 'payment' && <PaymentMethods />}
        {activeTab === 'compliance' && <ComplianceDashboard />}
      </motion.div>
    </div>
  );
}
