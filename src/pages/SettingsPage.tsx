import { motion } from 'framer-motion';
import { companyProfile } from '@/lib/mockData';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { User, Building, Bell, Shield, CreditCard, ChevronRight, LogOut } from 'lucide-react';

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

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-2xl">
      <motion.div variants={fadeUp}>
        <h2 className="text-2xl font-display font-extrabold text-foreground tracking-tight">Cài đặt</h2>
        <p className="text-sm text-muted-foreground mt-1">Quản lý tài khoản và doanh nghiệp</p>
      </motion.div>

      <SettingsSection icon={User} title="Thông tin cá nhân">
        <InfoRow label="Họ và tên" value={user?.name || 'Anh Minh'} />
        <InfoRow label="Email" value={user?.email || 'minh@ducphat.vn'} />
        <InfoRow label="Số điện thoại" value="0912 345 678" />
      </SettingsSection>

      <SettingsSection icon={Building} title="Doanh nghiệp">
        <InfoRow label="Tên" value={companyProfile.name} />
        <InfoRow label="Mã số thuế" value={companyProfile.taxId} />
        <InfoRow label="Ngành" value={companyProfile.industry} />
        <InfoRow label="Tỉnh/TP" value={companyProfile.province} />
      </SettingsSection>

      <SettingsSection icon={CreditCard} title="Gói dịch vụ">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground font-semibold">Growth ⭐</p>
            <p className="text-xs text-muted-foreground mt-0.5">990,000₫/tháng · Thanh toán tiếp 01/04/2026</p>
          </div>
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="text-xs bg-primary text-primary-foreground px-5 py-2 rounded-xl font-medium hover:brightness-110 transition-all"
          >
            Nâng cấp
          </motion.button>
        </div>
      </SettingsSection>

      <SettingsSection icon={Bell} title="Thông báo">
        <div className="space-y-4">
          {[
            { label: 'Email khi hóa đơn đến hạn', checked: true },
            { label: 'SMS khi giải ngân thành công', checked: true },
            { label: 'Cảnh báo dòng tiền qua email', checked: false },
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

      <SettingsSection icon={Shield} title="Bảo mật">
        <div className="space-y-1">
          {['Đổi mật khẩu', 'Xác thực 2 bước', 'Quản lý thiết bị'].map((item) => (
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
          <LogOut size={14} /> Đăng xuất
        </button>
      </motion.div>
    </motion.div>
  );
}
