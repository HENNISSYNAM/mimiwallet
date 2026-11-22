import {
  ArrowLeftRight, BadgeCheck, Bot, Building2, CircleDollarSign, ClipboardList, FileSearch, FileSpreadsheet, FileText,
  FolderOpen, HandCoins, Images, Landmark, Receipt, ReceiptText, ScrollText, ShieldAlert, SlidersHorizontal, Sparkles,
  SplitSquareHorizontal, Store, TrendingUp, Users,
} from 'lucide-react';

export const ICON_CONG_CU: Record<string, typeof Images> = {
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
  // 22/11/2026: mỗi công cụ một icon riêng — trước đây 5 công cụ rơi về icon mặc định, hoá đơn trùng giấy tờ.
  hoa_don_ban: ReceiptText,
  doc_bao_cao: FileSpreadsheet,
  van_phong: Building2,
  viec_can_lam: ClipboardList,
  tai_lieu: FolderOpen,
  khach_hang: Users,
  vay_von: HandCoins,
  doanh_thu_xac_minh: BadgeCheck,
};

export function IconCongCu({ khoa, size = 18, className = '' }: { khoa: string; size?: number; className?: string }) {
  const I = ICON_CONG_CU[khoa] ?? Sparkles;
  return <I size={size} className={`shrink-0 ${className}`} aria-hidden />;
}
