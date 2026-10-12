/**
 * LƯU CÂU TRẢ LỜI "CẦN XÁC MINH" VÀ NGÀNH VSIC — cùng đường ghi với hồ sơ thuế của hộ (12/10/2026).
 *
 * Vì sao: lịch thuế doanh nghiệp (`lich-thue.ts`) đã biết dùng kỳ khai GTGT, siêu nhỏ, phương pháp TNDN,
 * có trả lương — nhưng không có nơi lưu câu trả lời, nên `doc-lich-thue.ts` không truyền gì và trang Nhắc
 * thuế hỏi mãi cùng một câu (lỗi L16, docs/DONG_BO_THONG_BAO_NHAC_THUE.md).
 *
 * KHÔNG DỰNG ĐƯỜNG THỨ HAI. Hồ sơ thuế của hộ lưu ở bảng `ho_so_thue`, ghi bằng service role qua edge
 * function `to-khai` (`luu_ho_so`, `luu_tien_mat`), quyền `sua_ho_so_thue` (chủ, quản trị, kế toán).
 * Các câu trả lời này cũng là "điều chỉ người dùng biết" → cùng bảng, cùng function, cùng quyền. Người
 * dùng không ghi thẳng được bảng này (RLS chỉ cho đọc). Các cột `*_theo_mst` ở `companies` vẫn chỉ máy
 * chủ ghi khi tra mã số thuế — file này không đụng tới.
 *
 * Mỗi lần lưu chỉ ghi ĐÚNG các trường được gửi (upsert một phần), không ghi đè cả hồ sơ: trả lời một câu
 * trên trang Nhắc thuế không được làm mất nhóm ngành, kênh bán… đã khai ở chỗ khác. Gửi `null` là xoá câu
 * trả lời (mốc quay về "cần xác minh") — để sửa lại khi trả lời nhầm.
 */

import { cauTuChoi, duocLam, type VaiTro } from '../quyen/vai-tro.ts';
import { LUA_CHON_TRA_LOI, TRA_LOI_TRONG, TRUONG_TRA_LOI, type TraLoiNghiaVu, type TruongTraLoi } from './lich-thue.ts';
import { docNganhVsic, goiYNhomChoHoSo, laNhomNganh, type NganhVsic } from './nganh-vsic.ts';
import { TEN_NHOM_NGANH } from './he-luat.ts';

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

/** Kiểm một bản sửa: chỉ các trường đã biết, giá trị trong `LUA_CHON_TRA_LOI` hoặc null (xoá câu trả lời). */
export function docBanSuaTraLoi(v: unknown): { ok: true; sua: Partial<TraLoiNghiaVu> } | { ok: false; cau: string } {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return { ok: false, cau: 'Câu trả lời không hợp lệ.' };
  const o = v as Record<string, unknown>;
  const khoa = Object.keys(o);
  if (khoa.length === 0) return { ok: false, cau: 'Chưa có câu trả lời nào.' };
  const sua: Record<string, unknown> = {};
  for (const k of khoa) {
    if (!(TRUONG_TRA_LOI as readonly string[]).includes(k)) return { ok: false, cau: `Không có câu hỏi "${k}".` };
    const gt = o[k];
    if (gt !== null && !(LUA_CHON_TRA_LOI[k as TruongTraLoi] as readonly unknown[]).includes(gt)) {
      return { ok: false, cau: 'Câu trả lời không nằm trong các lựa chọn.' };
    }
    sua[k] = gt;
  }
  return { ok: true, sua: sua as Partial<TraLoiNghiaVu> };
}

/** Dòng `ho_so_thue` → câu trả lời. Giá trị lạ (không qua ràng buộc CSDL) coi như chưa trả lời. */
export function traLoiTuDong(r: Row | null | undefined): TraLoiNghiaVu {
  if (!r) return { ...TRA_LOI_TRONG };
  const trong = <K extends TruongTraLoi>(k: K): TraLoiNghiaVu[K] =>
    ((LUA_CHON_TRA_LOI[k] as readonly unknown[]).includes(r[k]) ? r[k] : null) as TraLoiNghiaVu[K];
  return { tra_luong: trong('tra_luong'), ky_khai_gtgt: trong('ky_khai_gtgt'), sieu_nho: trong('sieu_nho'), phuong_phap_tndn: trong('phuong_phap_tndn') };
}

/**
 * Đọc câu trả lời cho lịch thuế. Lỗi đọc (ví dụ migration 20261012100000 chưa áp) KHÔNG làm hỏng lịch:
 * coi như chưa trả lời — lịch quay về "cần xác minh", đúng như trước khi có tính năng này.
 */
export async function docTraLoiNghiaVu(db: Db, companyId: string): Promise<TraLoiNghiaVu> {
  try {
    const { data, error } = await db.from('ho_so_thue')
      .select('tra_luong, ky_khai_gtgt, sieu_nho, phuong_phap_tndn').eq('company_id', companyId).maybeSingle();
    if (error) {
      console.error('đọc câu trả lời nghĩa vụ:', error.message);
      return { ...TRA_LOI_TRONG };
    }
    return traLoiTuDong(data);
  } catch (e) {
    console.error('đọc câu trả lời nghĩa vụ:', e instanceof Error ? e.message : e);
    return { ...TRA_LOI_TRONG };
  }
}

export interface NganhHoSo {
  nganh: NganhVsic[];
  nganh_chinh: string | null;
  nhom_nganh: string[];
  loai_nguoi_nop: string | null;
  /** Chỉ hộ kinh doanh: gợi ý nhóm tỷ lệ thuế từ ngành chính. null khi không gợi ý. */
  goi_y: { ma: string; nhom: string | null; ten_nhom: string | null; vi_sao: string; da_co: boolean } | null;
}

async function docNganhHoSo(db: Db, companyId: string): Promise<NganhHoSo> {
  const [{ data: hs, error }, { data: ct }] = await Promise.all([
    db.from('ho_so_thue').select('nganh_vsic, nganh_chinh, nhom_nganh, loai_nguoi_nop').eq('company_id', companyId).maybeSingle(),
    db.from('companies').select('loai_theo_mst').eq('id', companyId).maybeSingle(),
  ]);
  if (error) throw new Error(`Không đọc được ngành nghề: ${error.message}`);
  const nganh = Array.isArray(hs?.nganh_vsic) ? (hs.nganh_vsic as NganhVsic[]) : [];
  const nhom = Array.isArray(hs?.nhom_nganh) ? (hs.nhom_nganh as string[]) : [];
  // Đăng ký thuế thắng câu trả lời tay — như `docHoSo` (doc-su-kien.ts).
  const loai = ct?.loai_theo_mst ?? hs?.loai_nguoi_nop ?? null;
  const g = loai === 'ho_kinh_doanh' ? goiYNhomChoHoSo(hs?.nganh_chinh ?? null, nhom) : null;
  return {
    nganh, nganh_chinh: hs?.nganh_chinh ?? null, nhom_nganh: nhom, loai_nguoi_nop: loai,
    goi_y: g ? { ma: g.ma, nhom: g.nhom, ten_nhom: g.nhom ? TEN_NHOM_NGANH[g.nhom] : null, vi_sao: g.vi_sao, da_co: g.da_co } : null,
  };
}

export const HANH_DONG_HO_SO_NGHIA_VU = ['luu_tra_loi_nghia_vu', 'doc_nganh', 'luu_nganh'] as const;

/**
 * Xử lý ba hành động của `to-khai`. Vai trò không đủ quyền → 403 với đúng câu từ chối mà `kiemQuyen` của function trả.
 * Trả `{ status, body }` để function tự bọc thành Response.
 */
export async function xuLyHoSoNghiaVu(
  db: Db, ctx: { companyId: string; userId: string; vaiTro: VaiTro }, hanhDong: string, body: Row,
): Promise<{ status: number; body: Row }> {
  const loi = (ma: string, cau: string) => ({ status: 400, body: { error: cau, ma } });
  const bayGio = new Date().toISOString();

  /*
   * Giới hạn tần suất: cùng RPC `tang_luot_goi` như các hành động khác của `to-khai`, gọi ở đây để không
   * phải sửa bảng `GIOI_HAN` của function (phần đó đang có người khác sửa). Lỗi đếm không chặn người dùng.
   */
  const { data: duoc, error: loiDem } = await db.rpc('tang_luot_goi', {
    p_user: ctx.userId, p_hanh_dong: `to_khai_${hanhDong}`, p_cua_so_giay: 60, p_toi_da: hanhDong === 'doc_nganh' ? 60 : 30,
  });
  if (loiDem) console.error('ho-so-nghia-vu gioi han:', loiDem.message);
  else if (duoc === false) return { status: 429, body: { error: 'Bạn thao tác hơi nhanh. Đợi khoảng một phút rồi thử lại.', ma: 'QUA_NHIEU' } };

  if (hanhDong === 'doc_nganh') {
    return { status: 200, body: await docNganhHoSo(db, ctx.companyId) };
  }

  // Ghi: cùng quyền với `luu_ho_so` — chủ, quản trị, kế toán. Người xem, người duyệt chi không ghi được.
  if (!duocLam(ctx.vaiTro, 'sua_ho_so_thue')) {
    return { status: 403, body: { error: cauTuChoi(ctx.vaiTro, 'sua_ho_so_thue'), ma: 'KHONG_DU_QUYEN' } };
  }

  if (hanhDong === 'luu_tra_loi_nghia_vu') {
    const r = docBanSuaTraLoi(body.tra_loi);
    if (r.ok === false) return loi('TRA_LOI', r.cau);
    const { error } = await db.from('ho_so_thue').upsert(
      { company_id: ctx.companyId, ...r.sua, updated_by: ctx.userId, updated_at: bayGio },
      { onConflict: 'company_id' },
    );
    if (error) throw error;
    return { status: 200, body: { ok: true, tra_loi: await docTraLoiNghiaVu(db, ctx.companyId) } };
  }

  if (hanhDong === 'luu_nganh') {
    const dong: Row = { company_id: ctx.companyId, updated_by: ctx.userId, updated_at: bayGio };
    if (body.nganh !== undefined) {
      const r = docNganhVsic(body.nganh, body.nganh_chinh);
      if (r.ok === false) return loi('NGANH', r.cau);
      dong.nganh_vsic = r.nganh;
      dong.nganh_chinh = r.nganh_chinh;
    }
    /*
     * Người dùng bấm "Đúng, dùng nhóm này" cho gợi ý: THÊM nhóm vào `nhom_nganh` (không thay các nhóm đã
     * khai — hộ có thể kinh doanh nhiều nhóm). Chỉ nhận nhóm trong bộ mã của hệ luật.
     */
    if (body.xac_nhan_nhom !== undefined) {
      if (!laNhomNganh(body.xac_nhan_nhom)) return loi('NHOM', 'Nhóm hoạt động không hợp lệ.');
      const { data: hs, error } = await db.from('ho_so_thue').select('nhom_nganh').eq('company_id', ctx.companyId).maybeSingle();
      if (error) throw error;
      const daCo: string[] = Array.isArray(hs?.nhom_nganh) ? hs.nhom_nganh : [];
      dong.nhom_nganh = [...new Set([...daCo, body.xac_nhan_nhom])];
    }
    if (!('nganh_vsic' in dong) && !('nhom_nganh' in dong)) return loi('THAM_SO', 'Không có gì để lưu.');
    const { error } = await db.from('ho_so_thue').upsert(dong, { onConflict: 'company_id' });
    if (error) throw error;
    return { status: 200, body: { ok: true, ...(await docNganhHoSo(db, ctx.companyId)) } };
  }

  return loi('HANH_DONG', 'Hành động không hợp lệ.');
}
