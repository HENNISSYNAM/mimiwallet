import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { khopChiTacTu, type GiaoDichRa, type YeuCauChoKhop } from "./khop-chi.ts";

/**
 * Nối `khopChiTacTu` vào database. Quyết định nằm trong hàm thuần; file này chỉ
 * đọc, ghi, và để lại dấu vết trong nhật ký.
 *
 * Gọi sau mỗi lần ghi giao dịch từ ngân hàng, cùng chỗ với đối soát mã QR.
 */

const SO_NGAY_NHIN_LAI = 45;

export async function doiSoatChiTacTu(
  supabase: SupabaseClient,
  companyId: string,
): Promise<{ khop: number; lech: number }> {
  const { data: choChi, error: e1 } = await supabase
    .from("yeu_cau_chi")
    .select("id, ma_tham_chieu, so_tien, tac_tu_id")
    .eq("company_id", companyId)
    .eq("trang_thai", "da_duyet");

  if (e1) {
    console.error(`đối soát chi agent: không đọc được yêu cầu của ${companyId}`, e1.message);
    return { khop: 0, lech: 0 };
  }
  if (!choChi?.length) return { khop: 0, lech: 0 };

  const tu = new Date(Date.now() - SO_NGAY_NHIN_LAI * 86_400_000).toISOString().slice(0, 10);

  const [{ data: gd, error: e2 }, { data: daGan, error: e3 }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, amount, type, payment_reference, is_synthetic")
      .eq("company_id", companyId)
      .eq("is_synthetic", false)
      .gte("transaction_date", tu)
      .not("payment_reference", "is", null),
    supabase
      .from("yeu_cau_chi")
      .select("giao_dich_id")
      .eq("company_id", companyId)
      .not("giao_dich_id", "is", null),
  ]);

  if (e2 || e3) {
    console.error(`đối soát chi agent: lỗi đọc cho ${companyId}`, e2?.message ?? e3?.message);
    return { khop: 0, lech: 0 };
  }

  const kq = khopChiTacTu(
    choChi.map((r) => ({ id: r.id, maThamChieu: r.ma_tham_chieu, soTien: Number(r.so_tien) })) as YeuCauChoKhop[],
    (gd ?? []) as GiaoDichRa[],
    new Set((daGan ?? []).map((r) => r.giao_dich_id as string)),
  );

  const tacTuCua = new Map(choChi.map((r) => [r.id, r.tac_tu_id as string]));
  const bayGio = new Date().toISOString();
  let soKhop = 0;

  for (const k of kq.khop) {
    // Chặn theo trạng thái để webhook và lần đồng bộ chạy đè nhau không ghi hai lần.
    const { data: nhan } = await supabase
      .from("yeu_cau_chi")
      .update({
        trang_thai: "da_chi",
        giao_dich_id: k.giaoDichId,
        so_tien_thuc_chi: k.soTien,
        da_chi_luc: bayGio,
        updated_at: bayGio,
      })
      .eq("id", k.yeuCauId)
      .eq("trang_thai", "da_duyet")
      .select("id")
      .maybeSingle();
    if (!nhan) continue;
    soKhop++;

    await supabase.from("nhat_ky_tac_tu").insert({
      company_id: companyId,
      tac_tu_id: tacTuCua.get(k.yeuCauId) ?? null,
      yeu_cau_id: k.yeuCauId,
      su_kien: "da_chi",
      nguoi: "he_thong",
      chi_tiet: { giao_dich_id: k.giaoDichId, so_tien: k.soTien, can_cu: "ma_tham_chieu_trong_sao_ke" },
    });
  }

  for (const x of kq.lech) {
    // Chỉ ghi log, không đổi trạng thái: trả một phần hay gõ nhầm số là việc
    // một người phải quyết. Màn hình vẫn hiện yêu cầu ở "đã duyệt, chờ trả".
    console.warn(`chi agent ${x.yeuCauId}: giao dịch ${x.giaoDichId} ${x.thucTe}đ, lệnh trả ${x.mongDoi}đ`);
  }

  return { khop: soKhop, lech: kq.lech.length };
}
