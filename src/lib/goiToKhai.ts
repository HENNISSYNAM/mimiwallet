import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { LoiGoiHam } from '@/lib/loiGoiHam';
import { kemCongTy } from '@/lib/congTyDangDung';
import type { CanCuDaKiem, HoSoThue, KyToKhai, LoaiNguoiNop, SuKienThue, SuyLuan, ToKhai } from '@/lib/heLuat';
import type { TheoMst } from '../../supabase/functions/_shared/luat/doc-su-kien.ts';

/**
 * Công ty như máy chủ trả về. `loai_theo_mst` có giá trị thì màn hình KHÔNG hỏi "hộ hay doanh
 * nghiệp" nữa; `theo_mst` là điều Tổng cục Thuế ghi cho mã này (null khi chưa tra được).
 */
export interface DongPhuLucGiaiTrinh {
  ngay: string;
  so_tien: number;
  noi_dung: string;
  loai: string;
  ghi_chu: string | null;
  vai_tro: string;
  xac_nhan_luc: string;
}

export interface ThanhToanToKhai {
  goi: { plan: string; het_han: string } | null;
  con_luot: number;
  gia_mot_to: number;
  da_tra_ky_nay: boolean;
}

export interface CongTyTheoMst {
  ten: string | null;
  mst: string | null;
  loai_theo_mst: LoaiNguoiNop | null;
  theo_mst: TheoMst | null;
}

/** Đường dẫn Cổng dịch vụ công của cơ quan thuế, nơi người dùng tự nộp tờ khai. */
export const DUONG_DAN_NOP_TO_KHAI = 'https://dichvucong.gdt.gov.vn/tthc/homelogin';

export interface DoanhThuPhanTich {
  hoa_don: [number, number, number, number] | null;
  ngan_hang: [number, number, number, number] | null;
  so_hoa_don: number;
  co_ket_noi_ngan_hang: boolean;
  quy: [number, number, number, number] | null;
  nguon: SuKienThue['nguonDoanhThu'];
}

export interface KetQuaPhanTich {
  nam: number;
  hom_nay: string;
  cong_ty: CongTyTheoMst;
  /** Xuất được bằng gì: gói còn hạn, số lượt còn, kỳ đang xem đã trả chưa. */
  thanh_toan: ThanhToanToKhai;
  /** Khoản tiền vào người dùng đã xác nhận không phải doanh thu — in thành phụ lục kèm tờ khai. */
  phu_luc_giai_trinh?: DongPhuLucGiaiTrinh[];
  ho_so: HoSoThue;
  su_kien: SuKienThue;
  doanh_thu: DoanhThuPhanTich;
  suy_luan: SuyLuan;
  ky: KyToKhai;
  ky_goi_y: KyToKhai;
  to_khai: ToKhai | null;
  ly_do_khong_soan: string | null;
  canh_bao: string[];
  can_cu: CanCuDaKiem[];
  chua_doi_chieu: string[];
}

export interface BanNhap {
  id: string;
  mau: string;
  nam: number;
  ky_loai: string;
  quy: number | null;
  han_nop: string;
  ma_bam: string;
  created_at: string;
}

/** Gọi edge function `to-khai` bằng phiên của chủ doanh nghiệp. */
export async function goiToKhai(hanhDong: string, du: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new LoiGoiHam('Phiên đăng nhập đã hết. Đăng nhập lại.', 401, {});
  const res = await fetch(`${SUPABASE_URL}/functions/v1/to-khai`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ hanh_dong: hanhDong, ...(await kemCongTy(du)) }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || body?.error) {
    throw new LoiGoiHam(typeof body.error === 'string' ? body.error : `Lỗi ${res.status}`, res.status, body);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return body as Record<string, any>;
}
