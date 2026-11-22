import {
  ArrowLeftRight, BadgeCheck, Bot, CircleDollarSign, FileSearch, FileText, HandCoins, Images, Landmark, Receipt,
  ScrollText, ShieldAlert, SlidersHorizontal, Sparkles, SplitSquareHorizontal, Store, TrendingUp, Users,
} from 'lucide-react';

const ICON: Record<string, typeof Images> = {
  soan_to_khai: ScrollText,
  thieu_chung_tu: FileSearch,
  bao_cao: TrendingUp,
  dong_tien: ArrowLeftRight,
  lien_ket_ngan_hang: Landmark,
  tra_trung: Receipt,
  kiem_truoc_khi_chuyen: ShieldAlert,
  soan_giay_to: FileText,
  tach_chi_ca_nhan: SplitSquareHorizontal,
  kiem_soat_agent: Bot,
  chinh_sach_chi: SlidersHorizontal,
  chi_phi_ai: CircleDollarSign,
  model_re_hon: Sparkles,
  hoa_don_ban: FileText,
  khach_hang: Users,
  vay_von: HandCoins,
  doanh_thu_xac_minh: BadgeCheck,
};

export function IconCongCu({ khoa, size = 18, className = '' }: { khoa: string; size?: number; className?: string }) {
  const I = ICON[khoa] ?? Sparkles;
  return <I size={size} className={`shrink-0 ${className}`} aria-hidden />;
}
