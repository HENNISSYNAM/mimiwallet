/**
 * Sổ xu ở máy chủ — chỉ gọi hàm SQL `tru_xu` (migration 20261011120000_so_xu.sql), không tự cộng trừ.
 *
 * Vì sao mọi thao tác đi qua MỘT hàm SQL: hàm khoá dòng công ty trước khi cộng sổ, nên hai câu hỏi
 * cùng lúc không cùng thấy "còn 3 xu" rồi cùng trừ 3 — số dư không bao giờ âm. Cùng hàm đó nạp đầy
 * hạn mức đầu tháng, nên không có cửa sổ nào "đã sang tháng mà chưa nạp".
 */
import { hanMucXuThang } from '../billing/bang-gia.ts';
import { docQuyenLoi } from '../billing/thu-tien.ts';
import type { GiaModel } from '../chi-phi-ai/bang-gia.ts';
import { kyThangVN, xuCuaLuot, type LanGoiTinhXu } from './xu.ts';

// deno-lint-ignore no-explicit-any
type Db = any;

export interface KetQuaTruXu {
  da_tru: number;
  /** Phần không trừ được vì số dư không đủ (hai lượt chạy song song khi chỉ còn ít xu). */
  thieu: number;
  so_du: number;
}

export interface XuTruocLuot {
  han_muc: number;
  ky_thang: string;
  so_du: number;
}

async function goiTruXu(db: Db, companyId: string, soXu: number, hanMuc: number, kyThang: string, thamChieu: string | null, chiTiet: Record<string, unknown>): Promise<KetQuaTruXu> {
  const { data, error } = await db.rpc('tru_xu', {
    p_company: companyId, p_so_xu: soXu, p_han_muc_thang: hanMuc, p_ky_thang: kyThang, p_tham_chieu: thamChieu, p_chi_tiet: chiTiet,
  });
  if (error) throw new Error(`tru_xu: ${error.message}`);
  return { da_tru: Number(data?.da_tru ?? 0), thieu: Number(data?.thieu ?? 0), so_du: Number(data?.so_du ?? 0) };
}

/**
 * Trước khi gọi mô hình: còn bao nhiêu xu (và nạp đầy nếu đã sang tháng mới). Hạn mức lấy theo gói
 * do MÁY CHỦ đọc (`docQuyenLoi`) — không nhận từ trình duyệt.
 */
export async function docXuTruocLuot(db: Db, companyId: string, homNay: string, bayGio: Date = new Date()): Promise<XuTruocLuot> {
  const ql = await docQuyenLoi(db, companyId, homNay);
  const hanMuc = hanMucXuThang(ql.goi?.plan ?? null);
  const kyThang = kyThangVN(bayGio);
  const kq = await goiTruXu(db, companyId, 0, hanMuc, kyThang, null, {});
  return { han_muc: hanMuc, ky_thang: kyThang, so_du: kq.so_du };
}

/** Sau lượt hỏi: tính xu theo token thật của các lần gọi rồi trừ. Không gọi mô hình lần nào thì 0 xu, không ghi sổ. */
export async function truXuSauLuot(db: Db, companyId: string, truoc: XuTruocLuot, lanGoi: LanGoiTinhXu[], thamChieu: string | null): Promise<KetQuaTruXu & { xu: number }> {
  if (!lanGoi.some((l) => l.thanh_cong)) return { xu: 0, da_tru: 0, thieu: 0, so_du: truoc.so_du };
  const { data: bang, error } = await db.from('bang_gia_model').select('model_id, ten, gia_vao_usd_moi_trieu, gia_ra_usd_moi_trieu').limit(5000);
  // Không đọc được bảng giá thì vẫn trừ — theo mức cố định cho từng lần gọi (xuCuaLuot với bảng rỗng).
  if (error) console.error('xu: đọc bảng giá', error.message);
  const tinh = xuCuaLuot(lanGoi, ((bang ?? []) as GiaModel[]).map((g) => ({
    ...g, gia_vao_usd_moi_trieu: Number(g.gia_vao_usd_moi_trieu), gia_ra_usd_moi_trieu: Number(g.gia_ra_usd_moi_trieu),
  })));
  if (tinh.xu <= 0) return { xu: 0, da_tru: 0, thieu: 0, so_du: truoc.so_du };
  const kq = await goiTruXu(db, companyId, tinh.xu, truoc.han_muc, truoc.ky_thang, thamChieu, {
    usd: Math.round(tinh.usd * 1e6) / 1e6,
    so_lan_goi: tinh.so_lan_goi,
    khong_ro_gia: tinh.khong_ro_gia,
    mo_hinh: [...new Set(lanGoi.filter((l) => l.thanh_cong).map((l) => l.mo_hinh))].slice(0, 5),
    token_vao: lanGoi.reduce((s, l) => s + (l.token_vao ?? 0), 0),
    token_ra: lanGoi.reduce((s, l) => s + (l.token_ra ?? 0), 0),
  });
  return { xu: tinh.xu, ...kq };
}
