import {
  ArrowLeftRight, Bot, CircleDollarSign, Clock, FileSearch, FileText, Images, Landmark, LayoutDashboard, Receipt,
  Scale, ShieldCheck, SlidersHorizontal, Sparkles, TrendingUp, UserRound, Users,
} from 'lucide-react';

const ICON: Record<string, typeof Images> = {
  thu_vien: Images,
  thieu_chung_tu: FileSearch,
  nhac_thue: Clock,
  bao_cao: TrendingUp,
  giao_dich: LayoutDashboard,
  dong_tien: ArrowLeftRight,
  doi_soat: Scale,
  lien_ket_ngan_hang: Landmark,
  duyet_chi: ShieldCheck,
  tra_trung: Receipt,
  kiem_soat_agent: Bot,
  chinh_sach_chi: SlidersHorizontal,
  chi_phi_ai: CircleDollarSign,
  model_re_hon: Sparkles,
  hoa_don_ban: FileText,
  cong_no: UserRound,
  khach_hang: Users,
};

export function IconCongCu({ khoa, size = 18, className = '' }: { khoa: string; size?: number; className?: string }) {
  const I = ICON[khoa] ?? Sparkles;
  return <I size={size} className={`shrink-0 ${className}`} aria-hidden />;
}
