/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { locMinhHoa } from "../minh-hoa.ts";
import { kiemKhoan, quetSaoKe, type CanhBao, type DauHieu, type KhoanRa } from "./phat-hien.ts";
import { tuGiaoDich, tuYeuCau, type DongGiaoDich, type DongYeuCau } from "./nguon.ts";

type Db = SupabaseClient<any, any, any, any, any>;

/** Lịch sử để so: 180 ngày. Đủ dài để nhận ra nhà cung cấp trả theo quý. */
export const SO_NGAY_LICH_SU = 180;
/** Trần số dòng đọc. Chạm trần thì báo lịch sử chưa đủ, không im lặng coi là đủ. */
export const TRAN_DONG = 5000;

const COT_GD = "id, amount, type, transaction_date, counter_account_name, counter_account_number, merchant_name, payment_reference";

function lui(homNay: string, soNgay: number): string {
  const d = new Date(`${homNay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - soNgay);
  return d.toISOString().slice(0, 10);
}

export interface LichSu {
  khoan: KhoanRa[];
  /** false = chạm trần đọc; "người nhận mới" khi đó có thể là người nhận cũ nằm ngoài phần đã đọc. */
  du: boolean;
  tinCay: Set<string>;
}

/** `laDemo`: chỉ để HIỆN cảnh báo trong công ty demo. Kiểm yêu cầu chi thật (`kiemYeuCau`) không bao giờ bật. */
export async function docLichSu(db: Db, companyId: string, homNay: string, boQuaYeuCau?: string, laDemo = false): Promise<LichSu> {
  const [gd, yc, nn] = await Promise.all([
    locMinhHoa(db.from("transactions").select(`${COT_GD}, is_synthetic`, { count: "exact" })
      .eq("company_id", companyId), laDemo)
      .gte("transaction_date", lui(homNay, SO_NGAY_LICH_SU))
      // Mới nhất trước: chạm trần thì phần bị bỏ là lịch sử cũ nhất, không phải cửa sổ đang quét.
      .order("transaction_date", { ascending: false })
      .limit(TRAN_DONG),
    // Khoản đã khớp với một giao dịch sao kê (`giao_dich_id`) thì đã có mặt trong sao kê —
    // lấy thêm lần nữa là đếm một lần trả thành hai, và "tách nhỏ" sẽ bắn oan.
    db.from("yeu_cau_chi").select("id, so_tien, ten_nguoi_nhan, so_tai_khoan, muc_dich, created_at, quyet_luc")
      .eq("company_id", companyId).in("trang_thai", ["da_duyet", "da_chi"]).is("giao_dich_id", null)
      .gte("created_at", lui(homNay, SO_NGAY_LICH_SU))
      .limit(TRAN_DONG),
    db.from("nguoi_nhan_duoc_phep").select("so_tai_khoan").eq("company_id", companyId).limit(TRAN_DONG),
  ]);
  if (gd.error) throw gd.error;
  if (yc.error) throw yc.error;
  if (nn.error) throw nn.error;

  const dongGd = (gd.data ?? []) as DongGiaoDich[];
  const dongYc = ((yc.data ?? []) as DongYeuCau[]).filter((y) => y.id !== boQuaYeuCau);
  return {
    khoan: [...tuGiaoDich(dongGd), ...dongYc.map(tuYeuCau)],
    du: (gd.count ?? dongGd.length) <= dongGd.length && dongYc.length < TRAN_DONG,
    tinCay: new Set(((nn.data ?? []) as { so_tai_khoan: string | null }[])
      .map((r) => String(r.so_tai_khoan ?? "").replace(/\D/g, ""))
      .filter((s) => s.length >= 4)),
  };
}

/** Kiểm một khoản chi đang chờ duyệt, trước khi cho duyệt. */
export async function kiemYeuCau(db: Db, companyId: string, y: DongYeuCau, homNay: string): Promise<{ dau_hieu: DauHieu[]; lich_su_du: boolean }> {
  const ls = await docLichSu(db, companyId, homNay, y.id);
  const khoan: KhoanRa = { ...tuYeuCau(y), ngay: homNay };
  return { dau_hieu: kiemKhoan(khoan, ls.khoan, { daTinCay: ls.tinCay }), lich_su_du: ls.du };
}

/** Quét sao kê 30 ngày gần nhất cho màn Tổng quan và MIMI Assistant. */
export async function quetCongTy(db: Db, companyId: string, homNay: string, soNgay = 30, laDemo = false): Promise<{ canh_bao: CanhBao[]; lich_su_du: boolean; so_khoan_da_xet: number }> {
  const ls = await docLichSu(db, companyId, homNay, undefined, laDemo);
  // Chỉ quét giao dịch sao kê: khoản đã duyệt trong MIMI là để làm lịch sử, không để cảnh báo lại.
  const tuSaoKe = ls.khoan.filter((k) => !k.id.startsWith("yc:"));
  const lichSuYc = ls.khoan.filter((k) => k.id.startsWith("yc:"));
  const canhBao = quetSaoKe([...lichSuYc, ...tuSaoKe], homNay, soNgay, { daTinCay: ls.tinCay })
    .filter((c) => !c.khoan.id.startsWith("yc:"));
  return { canh_bao: canhBao, lich_su_du: ls.du, so_khoan_da_xet: tuSaoKe.length };
}
