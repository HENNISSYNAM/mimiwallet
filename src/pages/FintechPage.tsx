import { useState } from 'react';
import { motion } from 'framer-motion';
import OpenBanking from '@/components/fintech/OpenBanking';
import KYCVerification from '@/components/fintech/KYCVerification';
import PaymentMethods from '@/components/fintech/PaymentMethods';
import ComplianceDashboard from '@/components/fintech/ComplianceDashboard';
import { Shield, Link2, CreditCard, Fingerprint } from 'lucide-react';

const tabs = [
  { id: 'banking', label: 'Open Banking', icon: <Link2 size={16} /> },
  { id: 'kyc', label: 'eKYC', icon: <Fingerprint size={16} /> },
  { id: 'payment', label: 'Thanh toán', icon: <CreditCard size={16} /> },
  { id: 'compliance', label: 'Tuân thủ', icon: <Shield size={16} /> },
];

export default function FintechPage() {
  const [activeTab, setActiveTab] = useState('banking');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-extrabold text-foreground tracking-tight">Fintech Hub</h2>
        <p className="text-sm text-muted-foreground mt-1">Open Banking, eKYC, thanh toán & tuân thủ pháp lý</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-accent/30 rounded-xl p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
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
