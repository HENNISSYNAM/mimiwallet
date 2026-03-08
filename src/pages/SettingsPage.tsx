import { motion } from 'framer-motion';
import { companyProfile } from '@/lib/mockData';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { User, Building, Bell, Shield, CreditCard } from 'lucide-react';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.4, 0, 0.2, 1] as const },
});

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.h2 {...fadeUp(0)} className="text-xl font-display font-bold text-foreground">Cài đặt</motion.h2>

      <motion.div {...fadeUp(0.05)} className="card-base p-5 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <User size={18} className="text-primary" />
          <h3 className="font-display font-bold text-foreground">Thông tin cá nhân</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Họ và tên</label>
            <p className="text-sm text-foreground">{user?.name || 'Anh Minh'}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <p className="text-sm text-foreground">{user?.email || 'minh@ducphat.vn'}</p>
          </div>
        </div>
      </motion.div>

      <motion.div {...fadeUp(0.1)} className="card-base p-5 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Building size={18} className="text-primary" />
          <h3 className="font-display font-bold text-foreground">Doanh nghiệp</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Tên', value: companyProfile.name },
            { label: 'MST', value: companyProfile.taxId },
            { label: 'Ngành', value: companyProfile.industry },
            { label: 'Tỉnh/TP', value: companyProfile.province },
          ].map((f) => (
            <div key={f.label}>
              <label className="text-xs text-muted-foreground">{f.label}</label>
              <p className="text-sm text-foreground">{f.value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div {...fadeUp(0.15)} className="card-base p-5 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <CreditCard size={18} className="text-primary" />
          <h3 className="font-display font-bold text-foreground">Gói dịch vụ</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground font-semibold">Growth ⭐</p>
            <p className="text-xs text-muted-foreground">990,000₫/tháng</p>
          </div>
          <button className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-lg">Nâng cấp</button>
        </div>
      </motion.div>

      <motion.div {...fadeUp(0.2)}>
        <button
          onClick={() => { logout(); navigate('/'); }}
          className="text-sm text-destructive hover:underline"
        >
          Đăng xuất
        </button>
      </motion.div>
    </div>
  );
}
