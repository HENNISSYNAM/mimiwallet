/**
 * Thư viện Tài liệu & Chứng từ — phần chạm CSDL và kho (service role). Nơi gọi đã kiểm vai trò.
 *
 * Mỗi lần ghi nội dung là MỘT PHIÊN BẢN MỚI (bảng `phien_ban_tai_lieu` chỉ ghi thêm, trigger chặn sửa):
 * v1 MIMI dựng, v2 bạn sửa, v3 đã duyệt… Tài liệu đã ký / đã nộp / được chấp nhận thì CSDL chặn sửa.
 */
import { bam, dungHtml } from './dung.ts';
import type { BanDung } from './tao.ts';
import { ghiNhatKy } from '../hanh-trinh/luu.ts';
import { ghiSuKien } from '../do-luong/su-kien.ts';

// deno-lint-ignore no-explicit-any
type Db = any;

export class LoiTaiLieu extends Error {}

export interface TaiLieuTom {
  id: string; loai: string; tieu_de: string; mo_ta: string; nhan: string; trang_thai: string; do_day: string | null;
  ky: string | null; phien_ban_hien_tai: number; tao_luc: string; cap_nhat_luc: string;
  hanh_trinh_id: string | null; ho_so_viec_id: string | null;
}

const COT = 'id, loai, tieu_de, mo_ta, nhan, trang_thai, do_day, ky, phien_ban_hien_tai, tao_luc, cap_nhat_luc, hanh_trinh_id, ho_so_viec_id';

export async function taoTaiLieu(db: Db, o: {
  companyId: string; userId: string; ban: BanDung; hanhTrinhId?: string | null; hoSoViecId?: string | null; hoiThoaiId?: string | null;
}): Promise<TaiLieuTom> {
  const html = dungHtml(o.ban.noi_dung);
  const kichThuoc = new TextEncoder().encode(html).length;
  if (kichThuoc > 5 * 1024 * 1024) throw new LoiTaiLieu('Tài liệu quá lớn.');
  const maBam = await bam(html);

  const { data: tl, error } = await db.from('tai_lieu').insert({
    company_id: o.companyId, hanh_trinh_id: o.hanhTrinhId ?? null, ho_so_viec_id: o.hoSoViecId ?? null, hoi_thoai_id: o.hoiThoaiId ?? null,
    loai: o.ban.loai, tieu_de: o.ban.tieu_de, mo_ta: o.ban.mo_ta, nhan: o.ban.nhan, ky: o.ban.ky,
    nguon: o.ban.nguon, bang_chung: o.ban.bang_chung, do_day: o.ban.do_day, tao_boi: o.userId, sinh_boi: 'mimi',
    trang_thai: o.ban.do_day === 'NEEDS_REVIEW' ? 'needs_review' : 'generated',
  }).select(COT).single();
  if (error) throw new Error(`tạo tài liệu: ${error.message}`);

  const duongDan = `${o.companyId}/${tl.id}/v1.html`;
  const { error: loiKho } = await db.storage.from('tai-lieu').upload(duongDan, new Blob([html], { type: 'text/html' }), { contentType: 'text/html; charset=utf-8', upsert: false });
  if (loiKho) throw new Error(`lưu tệp tài liệu: ${loiKho.message}`);
  const { error: loiPb } = await db.from('phien_ban_tai_lieu').insert({
    tai_lieu_id: tl.id, company_id: o.companyId, so: 1, trang_thai: 'generated', duong_dan: duongDan,
    mime: 'text/html', noi_dung_bam: maBam, kich_thuoc: kichThuoc, tao_boi: o.userId, ghi_chu: 'MIMI dựng',
  });
  if (loiPb) throw new Error(`ghi phiên bản: ${loiPb.message}`);

  await ghiNhatKy(db, { companyId: o.companyId, doiTuong: 'tai_lieu', id: tl.id, hanhDong: 'tao', boi: o.userId,
    sau: { loai: o.ban.loai, phien_ban: 1, ma_bam: maBam, do_day: o.ban.do_day }, nguon: 'mimi', bangChung: o.ban.bang_chung });
  await ghiSuKien(db, o.companyId, o.userId, 'artifact_generated', { loai: o.ban.loai });
  return tl;
}

export async function dsTaiLieu(db: Db, companyId: string): Promise<TaiLieuTom[]> {
  const { data, error } = await db.from('tai_lieu').select(COT).eq('company_id', companyId).order('cap_nhat_luc', { ascending: false }).limit(200);
  if (error) throw new Error(`đọc thư viện: ${error.message}`);
  return data ?? [];
}

/** URL ký tạm 5 phút cho phiên bản hiện tại (hoặc một phiên bản cụ thể). */
export async function moTaiLieu(db: Db, companyId: string, id: string, so?: number): Promise<{ url: string; so: number; ma_bam: string }> {
  const { data: tl } = await db.from('tai_lieu').select('id, phien_ban_hien_tai').eq('company_id', companyId).eq('id', id).maybeSingle();
  if (!tl) throw new LoiTaiLieu('Không tìm thấy tài liệu.');
  const { data: pb } = await db.from('phien_ban_tai_lieu').select('so, duong_dan, noi_dung_bam')
    .eq('tai_lieu_id', id).eq('company_id', companyId).eq('so', so ?? tl.phien_ban_hien_tai).maybeSingle();
  if (!pb) throw new LoiTaiLieu('Không tìm thấy phiên bản.');
  const { data, error } = await db.storage.from('tai-lieu').createSignedUrl(pb.duong_dan, 300);
  if (error || !data?.signedUrl) throw new Error(`ký URL tài liệu: ${error?.message ?? 'rỗng'}`);
  return { url: data.signedUrl, so: pb.so, ma_bam: pb.noi_dung_bam };
}

export type KetQuaDuyet = 'needs_review' | 'reviewed' | 'approved' | 'rejected';
const VAI_TRO_DUYET = { ke_toan: 'ke_toan', chu_so_huu: 'chu_doanh_nghiep', quan_tri: 'chu_doanh_nghiep' } as const;

/**
 * Mục 27: duyệt chuyên môn. `approved` cần xác nhận rõ (mục 26) — nút "Duyệt" ở giao diện gửi
 * `xac_nhan: true` sau hộp xác nhận. Ghi thêm một dòng duyệt; không sửa dòng cũ.
 */
export async function duyetTaiLieu(db: Db, o: {
  companyId: string; userId: string; vaiTro: string; id: string; ketQua: KetQuaDuyet; nhanXet?: string; xacNhan?: boolean;
}): Promise<TaiLieuTom> {
  if (!['needs_review', 'reviewed', 'approved', 'rejected'].includes(o.ketQua)) throw new LoiTaiLieu('Kết quả duyệt không hợp lệ.');
  const vaiDuyet = VAI_TRO_DUYET[o.vaiTro as keyof typeof VAI_TRO_DUYET];
  if (!vaiDuyet) throw new LoiTaiLieu('Vai trò của bạn không duyệt được tài liệu.');
  if (o.ketQua === 'approved' && o.xacNhan !== true) throw new LoiTaiLieu('Cần xác nhận trước khi duyệt.');
  const { data: tl } = await db.from('tai_lieu').select(COT).eq('company_id', o.companyId).eq('id', o.id).maybeSingle();
  if (!tl) throw new LoiTaiLieu('Không tìm thấy tài liệu.');
  if (['signed', 'submitted', 'accepted'].includes(tl.trang_thai)) throw new LoiTaiLieu('Tài liệu đã ký hoặc đã nộp — không duyệt lại được.');
  const nhanXet = (o.nhanXet ?? '').trim().slice(0, 2000) || null;
  if (o.ketQua === 'rejected' && !nhanXet) throw new LoiTaiLieu('Ghi lý do không duyệt.');

  const { error } = await db.from('duyet_tai_lieu').insert({
    tai_lieu_id: o.id, company_id: o.companyId, phien_ban_so: tl.phien_ban_hien_tai, vai_tro_duyet: vaiDuyet,
    ket_qua: o.ketQua, nhan_xet: nhanXet, boi: o.userId,
  });
  if (error) throw new Error(`ghi duyệt: ${error.message}`);
  const { data: moi, error: e2 } = await db.from('tai_lieu').update({ trang_thai: o.ketQua }).eq('id', o.id).eq('company_id', o.companyId).select(COT).single();
  if (e2) throw new Error(`cập nhật trạng thái tài liệu: ${e2.message}`);
  await ghiNhatKy(db, { companyId: o.companyId, doiTuong: 'duyet_tai_lieu', id: o.id, hanhDong: 'duyet', boi: o.userId,
    truoc: { trang_thai: tl.trang_thai }, sau: { trang_thai: o.ketQua, phien_ban: tl.phien_ban_hien_tai, nhan_xet: nhanXet }, nguon: vaiDuyet });
  await ghiSuKien(db, o.companyId, o.userId, 'artifact_reviewed', { ket_qua: o.ketQua, loai: tl.loai });
  return moi;
}

/**
 * Người dùng xác nhận đã tự nộp tài liệu (ngoài MIMI). MIMI không nộp gì — đây chỉ là ghi nhận, và
 * sau đó CSDL khoá tài liệu. Cần `xac_nhan: true`.
 */
export async function ghiNhanDaNop(db: Db, o: { companyId: string; userId: string; id: string; xacNhan?: boolean; ghiChu?: string }): Promise<TaiLieuTom> {
  if (o.xacNhan !== true) throw new LoiTaiLieu('Cần xác nhận bạn đã tự nộp tài liệu này.');
  const { data: tl } = await db.from('tai_lieu').select(COT).eq('company_id', o.companyId).eq('id', o.id).maybeSingle();
  if (!tl) throw new LoiTaiLieu('Không tìm thấy tài liệu.');
  if (tl.trang_thai === 'submitted' || tl.trang_thai === 'accepted') return tl;
  const { data: moi, error } = await db.from('tai_lieu').update({ trang_thai: 'submitted' }).eq('id', o.id).eq('company_id', o.companyId).select(COT).single();
  if (error) throw new Error(`ghi nhận đã nộp: ${error.message}`);
  await ghiNhatKy(db, { companyId: o.companyId, doiTuong: 'tai_lieu', id: o.id, hanhDong: 'da_nop', boi: o.userId,
    truoc: { trang_thai: tl.trang_thai }, sau: { trang_thai: 'submitted', ghi_chu: (o.ghiChu ?? '').slice(0, 500) || undefined }, nguon: 'nguoi_dung' });
  return moi;
}
