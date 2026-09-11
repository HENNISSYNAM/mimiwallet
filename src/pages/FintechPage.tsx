import { useState } from 'react';
import { motion } from 'framer-motion';
import OpenBanking from '@/components/fintech/OpenBanking';
import PaymentMethods from '@/components/fintech/PaymentMethods';
import ComplianceDashboard from '@/components/fintech/ComplianceDashboard';
import { Shield, Link2, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassTabs, AmbientMotifField } from '@/components/ui/glass-tabs';

/**
 * Tab eKYC gỡ ngày 10/09/2026. Nó cho tải ảnh CCCD lên và lưu lại, trong khi
 * MIMI không cần giấy tờ tuỳ thân cho bất kỳ việc nào nó làm, và thư gửi Casso
 * cam kết MIMI không giữ dữ liệu định danh. Thu một thứ không dùng là rủi ro
 * không đổi lấy gì.
 */
export default function FintechPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('banking');
  const tabs = [
    { key: 'banking', label: t('pg.fintech.tabs.banking'), icon: Link2 },
    { key: 'payment', label: t('pg.fintech.tabs.payment'), icon: CreditCard },
    { key: 'compliance', label: t('pg.fintech.tabs.compliance'), icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 data-mimi="fintech.ngan-hang" className="text-2xl font-display font-extrabold text-foreground tracking-tight">{t('pg.fintech.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('pg.fintech.subtitle')}</p>
      </div>

      {/* Tab Navigation — first tab bar in the app to carry actual Liquid Glass
          plus MIMI's own ambient motif field, matching NewsAndLawPanel. This is
          the page people switch between most (banking / payment / compliance),
          so it earns the fuller treatment; InvoicesPage's denser
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
        {activeTab === 'payment' && <PaymentMethods />}
        {activeTab === 'compliance' && <ComplianceDashboard />}
      </motion.div>
    </div>
  );
}
