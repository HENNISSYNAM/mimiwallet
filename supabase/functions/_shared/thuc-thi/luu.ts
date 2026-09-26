/**
 * Lớp thực thi — phần chạm CSDL (Prompt 5). Nơi gọi (edge function `tro-ly`) đã kiểm vai trò.
 *
 * Kênh duy nhất đang chạy: NGƯỜI DÙNG TỰ NỘP (sổ năng lực: TVAN và ký XML chưa hỗ trợ). Chuỗi:
 *   chuẩn bị (đóng băng phiên bản + mã băm, kiểm, dựng bản xem trước) → người có quyền xác nhận →
 *   người dùng tự nộp trên Cổng rồi ghi biên nhận → chờ cơ quan → người dùng ghi thông báo kết quả →
 *   xong, hồ sơ việc đóng theo.
 * Mọi bước ghi `nhat_ky_thay_doi`. CSDL tự chặn chuyển trạng thái sai (migration 20260926100000).
 */
import { bam } from '../tai-lieu/dung.ts';
import { ghiNhatKy, danhDauBuoc, docHanhTrinh } from '../hanh-trinh/luu.ts';
import { khoaChongTrung, xacNhanConHieuLuc, type TrangThaiThucThi } from './may-trang-thai.ts';
import { kiemNangLuc } from './nang-luc.ts';
import { nguoiDungTuNop } from './nha-cung-cap.ts';

// deno-lint-ignore no-explicit-any
type Db = any;

export class LoiNop extends Error {}

export interface YeuCauNop {
  id: string; loai: string; trang_thai: TrangThaiThucThi; tai_lieu_id: string | null; phien_ban: number | null;
  nha_cung_cap: string; xem_truoc: Record<string, unknown>; loi_kiem: string[]; tham_chieu_ngoai: string | null;
  nguon_tham_chieu: string | null; ngay_nop: string | null; trang_thai_co_quan: string | null; ket_qua_co_quan: string | null;
  nguon_ket_qua: string | null; han: string | null; tao_luc: string; gui_luc: string | null; xong_luc: string | null;
  hanh_trinh_id: string | null; ho_so_viec_id: string | null; xac_nhan_luc: string | null;
}
const COT = 'id, loai, trang_thai, tai_lieu_id, phien_ban, nha_cung_cap, xem_truoc, loi_kiem, tham_chieu_ngoai, nguon_tham_chieu, ngay_nop, trang_thai_co_quan, ket_qua_co_quan, nguon_ket_qua, han, tao_luc, gui_luc, xong_luc, hanh_trinh_id, ho_so_viec_id, xac_nhan_luc, ma_bam_noi_dung, ma_bam_du_lieu, xac_nhan_phien_ban, xac_nhan_ma_bam, xac_nhan_boi';

async function docGoiHienTai(db: Db, companyId: string, taiLieuId: string) {
  const { data: tl } = await db.from('tai_lieu').select('id, loai, tieu_de, trang_thai, do_day, phien_ban_hien_tai, hanh_trinh_id, ho_so_viec_id, ky')
    .eq('company_id', companyId).eq('id', taiLieuId).maybeSingle();
  if (!tl) throw new LoiNop('Không tìm thấy tài liệu.');
  const { data: pb } = await db.from('phien_ban_tai_lieu').select('so, noi_dung_bam')
    .eq('tai_lieu_id', taiLieuId).eq('company_id', companyId).eq('so', tl.phien_ban_hien_tai).maybeSingle();
  if (!pb) throw new LoiNop('Tài liệu chưa có phiên bản nào.');
  return { tl, pb };
}

/** Mã băm dữ liệu gửi đi: đúng tài liệu, đúng phiên bản, đúng nội dung, đúng kênh. */
const bamDuLieu = (o: { tai_lieu_id: string; so: number; ma_bam: string; kenh: string }) => bam(JSON.stringify(o));

/** Kiểm trước khi nộp (mục 13, bản cho kênh tự nộp). Trả danh sách chặn; rỗng = được đi tiếp. */
export function kiemTruocKhiNop(tl: { trang_thai: string; do_day: string | null; loai: string }): string[] {
  const chan: string[] = [];
  if (['submitted', 'accepted', 'signed'].includes(tl.trang_thai)) chan.push('Tài liệu này đã nộp hoặc đã ký — tạo bản mới nếu cần nộp lại.');
  if (tl.trang_thai === 'rejected') chan.push('Tài liệu đang ở trạng thái "không duyệt" — sửa và duyệt lại trước khi nộp.');
  if (tl.trang_thai === 'needs_review') chan.push('Tài liệu đang chờ xem lại — người có quyền duyệt trước khi nộp.');
  if (tl.do_day === 'INCOMPLETE') chan.push('Gói còn thiếu giấy tờ — bổ sung trước khi nộp.');
  if (tl.loai === 'financial_review_memo' || tl.loai === 'cashflow_report') chan.push('Báo cáo phân tích nội bộ không phải hồ sơ nộp cơ quan.');
  return chan;
}

export async function chuanBiNop(db: Db, o: { companyId: string; userId: string; taiLieuId: string; han?: string | null }): Promise<YeuCauNop> {
  const kn = kiemNangLuc({ nha_cung_cap: 'nguoi_dung', nang_luc: 'manual_submission', moiTruong: 'production', co: () => false });
  if (!kn.duoc) throw new LoiNop(kn.ly_do);
  const { tl, pb } = await docGoiHienTai(db, o.companyId, o.taiLieuId);
  const chan = kiemTruocKhiNop(tl);
  if (chan.length) throw new LoiNop(chan.join(' '));
  const maBamDuLieu = await bamDuLieu({ tai_lieu_id: tl.id, so: pb.so, ma_bam: pb.noi_dung_bam, kenh: 'nguoi_dung' });
  const khoa = khoaChongTrung({ companyId: o.companyId, loai: 'tax_submission', maBamNoiDung: pb.noi_dung_bam, ky: tl.ky, dich: 'cong_dvc' });

  // Bấm "Chuẩn bị nộp" hai lần → trả lại yêu cầu đang sống (chỉ mục duy nhất ở CSDL).
  const { data: cu } = await db.from('yeu_cau_thuc_thi').select(COT).eq('company_id', o.companyId).eq('khoa_chong_trung', khoa)
    .not('trang_thai', 'in', '(cancelled,failed,rejected,resolved)').maybeSingle();
  if (cu) return cu;

  const xem_truoc = {
    se_xay_ra: 'MIMI khoá bản tài liệu này để nộp. Bạn tự nộp trên Cổng dịch vụ công của cơ quan thuế; MIMI không gửi gì thay bạn.',
    nguoi_nhan: 'Cơ quan thuế quản lý bạn (qua Cổng dịch vụ công — bạn tự đăng nhập và nộp).',
    tai_lieu: `${tl.tieu_de} — phiên bản ${pb.so}, mã băm ${String(pb.noi_dung_bam).slice(0, 12)}…`,
    du_lieu_chia_se: 'Chỉ nội dung tài liệu bạn tự tải lên Cổng. MIMI không chia sẻ dữ liệu nào ra ngoài.',
    khong_hoan_tac: 'Sau khi ghi nhận đã nộp, phiên bản này bị khoá. Muốn sửa thì tạo bản mới và nộp bổ sung theo thủ tục.',
    ket_qua_mong_doi: 'Cơ quan thuế gửi thông báo tiếp nhận, rồi chấp nhận hoặc không chấp nhận. MIMI giữ việc mở tới khi bạn ghi kết quả.',
    rui_ro: 'Nộp sai mẫu hoặc sai kỳ có thể bị từ chối. Kiểm lại kỳ, mẫu và số liệu trên bản khoá trước khi nộp.',
  };
  const { data, error } = await db.from('yeu_cau_thuc_thi').insert({
    company_id: o.companyId, loai: 'tax_submission', ho_so_viec_id: tl.ho_so_viec_id, hanh_trinh_id: tl.hanh_trinh_id,
    tai_lieu_id: tl.id, phien_ban: pb.so, ma_bam_noi_dung: pb.noi_dung_bam, ma_bam_du_lieu: maBamDuLieu,
    nha_cung_cap: 'nguoi_dung', nang_luc: 'manual_submission', trang_thai: 'needs_confirmation', khoa_chong_trung: khoa,
    ky: tl.ky, han: o.han ?? null, xem_truoc, yeu_cau_boi: o.userId,
  }).select(COT).single();
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return chuanBiNop(db, o);
    throw new Error(`chuẩn bị nộp: ${error.message}`);
  }
  await ghiNhatKy(db, { companyId: o.companyId, doiTuong: 'yeu_cau_thuc_thi', id: data.id, hanhDong: 'chuan_bi', boi: o.userId,
    sau: { trang_thai: 'needs_confirmation', tai_lieu: tl.id, phien_ban: pb.so, ma_bam: pb.noi_dung_bam, ma_bam_du_lieu: maBamDuLieu }, nguon: 'nguoi_dung' });
  return data;
}

async function docYeuCau(db: Db, companyId: string, id: string) {
  const { data } = await db.from('yeu_cau_thuc_thi').select(COT).eq('company_id', companyId).eq('id', id).maybeSingle();
  if (!data) throw new LoiNop('Không tìm thấy yêu cầu nộp.');
  return data;
}

async function doiTrangThai(db: Db, companyId: string, id: string, sua: Record<string, unknown>) {
  const { data, error } = await db.from('yeu_cau_thuc_thi').update(sua).eq('company_id', companyId).eq('id', id).select(COT).single();
  if (error) throw new LoiNop(/Không chuyển được|Chưa có xác nhận|phải có/.test(error.message) ? error.message : 'Chưa cập nhật được yêu cầu nộp.');
  return data;
}

/** Xác nhận gắn với ĐÚNG gói. Tài liệu đổi sau khi chuẩn bị → xác nhận không được nhận, phải chuẩn bị lại. */
export async function xacNhanNop(db: Db, o: { companyId: string; userId: string; id: string; xacNhan: boolean }): Promise<YeuCauNop> {
  if (o.xacNhan !== true) throw new LoiNop('Cần bạn xác nhận rõ ràng.');
  const yc = await docYeuCau(db, o.companyId, o.id);
  if (yc.trang_thai !== 'needs_confirmation') throw new LoiNop('Yêu cầu này không ở bước chờ xác nhận.');
  const { pb } = await docGoiHienTai(db, o.companyId, yc.tai_lieu_id);
  const hienTai = { tai_lieu_id: yc.tai_lieu_id, phien_ban: pb.so, ma_bam_noi_dung: pb.noi_dung_bam, ma_bam_du_lieu: await bamDuLieu({ tai_lieu_id: yc.tai_lieu_id, so: pb.so, ma_bam: pb.noi_dung_bam, kenh: 'nguoi_dung' }) };
  const kiem = xacNhanConHieuLuc({ tai_lieu_id: yc.tai_lieu_id, phien_ban: yc.phien_ban, ma_bam_noi_dung: yc.ma_bam_noi_dung, ma_bam_du_lieu: yc.ma_bam_du_lieu, boi: o.userId, luc: '' }, hienTai);
  if (kiem.ok === false) {
    await doiTrangThai(db, o.companyId, o.id, { trang_thai: 'needs_validation', loi_kiem: [kiem.ly_do] });
    throw new LoiNop(`${kiem.ly_do} Bấm "Chuẩn bị nộp" lại để khoá bản mới.`);
  }
  const moi = await doiTrangThai(db, o.companyId, o.id, {
    trang_thai: 'ready', xac_nhan_boi: o.userId, xac_nhan_luc: new Date().toISOString(), xac_nhan_phien_ban: yc.phien_ban, xac_nhan_ma_bam: yc.ma_bam_noi_dung,
  });
  await ghiNhatKy(db, { companyId: o.companyId, doiTuong: 'yeu_cau_thuc_thi', id: o.id, hanhDong: 'xac_nhan', boi: o.userId,
    truoc: { trang_thai: 'needs_confirmation' }, sau: { trang_thai: 'ready', phien_ban: yc.phien_ban, ma_bam: yc.ma_bam_noi_dung }, nguon: 'nguoi_dung' });
  return moi;
}

/** Người dùng đã tự nộp trên Cổng: ghi biên nhận. Không phải "xong" — chuyển sang chờ cơ quan. */
export async function ghiDaNop(db: Db, o: { companyId: string; userId: string; id: string; bienNhan: string; ngayNop: string }): Promise<YeuCauNop> {
  const yc = await docYeuCau(db, o.companyId, o.id);
  if (yc.trang_thai !== 'ready') throw new LoiNop('Cần xác nhận trước khi ghi đã nộp.');
  const goi = { thuc_thi_id: yc.id, loai: yc.loai, tai_lieu_id: yc.tai_lieu_id, phien_ban: yc.phien_ban, ma_bam_noi_dung: yc.ma_bam_noi_dung, ma_bam_du_lieu: yc.ma_bam_du_lieu, tham_so: { bien_nhan: o.bienNhan, ngay_nop: o.ngayNop } };
  const loi = nguoiDungTuNop.kiem(goi);
  if (loi.length) throw new LoiNop(loi.join(' '));
  // Tài liệu không được đổi giữa lúc xác nhận và lúc nộp.
  const { pb } = await docGoiHienTai(db, o.companyId, yc.tai_lieu_id);
  if (pb.so !== yc.phien_ban || pb.noi_dung_bam !== yc.ma_bam_noi_dung) throw new LoiNop('Tài liệu đã đổi sau khi xác nhận — chuẩn bị nộp lại.');

  await doiTrangThai(db, o.companyId, o.id, { trang_thai: 'submitting', lan_thu_cuoi: new Date().toISOString() });
  const kq = await nguoiDungTuNop.gui(goi);
  const bayGio = new Date().toISOString();
  await doiTrangThai(db, o.companyId, o.id, { trang_thai: 'submitted', tham_chieu_ngoai: kq.tham_chieu_ngoai, nguon_tham_chieu: kq.nguon, ngay_nop: o.ngayNop, gui_luc: bayGio });
  const moi = await doiTrangThai(db, o.companyId, o.id, { trang_thai: 'waiting_external', trang_thai_co_quan: 'cho_ket_qua', kiem_luc: bayGio });

  // Khoá tài liệu (CSDL chặn sửa sau 'submitted') và đẩy bước "nộp" của hành trình sang chờ bên ngoài.
  await db.from('tai_lieu').update({ trang_thai: 'submitted' }).eq('company_id', o.companyId).eq('id', yc.tai_lieu_id).not('trang_thai', 'in', '(submitted,accepted)');
  if (yc.hanh_trinh_id) {
    const ht = await docHanhTrinh(db, o.companyId, yc.hanh_trinh_id);
    const b = ht?.buoc.find((x) => x.khoa === 'nguoi_dung_nop');
    if (b && b.trang_thai !== 'completed' && b.trang_thai !== 'waiting_external' && b.trang_thai !== 'blocked') {
      await danhDauBuoc(db, { companyId: o.companyId, userId: o.userId, id: yc.hanh_trinh_id, khoa: 'nguoi_dung_nop', trangThai: 'waiting_external' }).catch(() => undefined);
    }
  }
  await ghiNhatKy(db, { companyId: o.companyId, doiTuong: 'yeu_cau_thuc_thi', id: o.id, hanhDong: 'da_nop', boi: o.userId,
    truoc: { trang_thai: 'ready' }, sau: { trang_thai: 'waiting_external', tham_chieu: kq.tham_chieu_ngoai, nguon: kq.nguon, ngay_nop: o.ngayNop }, nguon: 'nguoi_dung' });
  return moi;
}

/**
 * Người dùng ghi thông báo kết quả của cơ quan. Chấp nhận → xong, hồ sơ việc đóng theo.
 * Không chấp nhận → giữ việc mở và tăng mức gấp (mục 33).
 */
export async function ghiKetQua(db: Db, o: { companyId: string; userId: string; id: string; ketQua: 'accepted' | 'rejected'; thongBao: string }): Promise<YeuCauNop> {
  const tb = o.thongBao.trim();
  if (tb.length < 5 || tb.length > 1000) throw new LoiNop('Ghi số / ngày thông báo của cơ quan (5–1000 ký tự).');
  if (o.ketQua !== 'accepted' && o.ketQua !== 'rejected') throw new LoiNop('Kết quả không hợp lệ.');
  const yc = await docYeuCau(db, o.companyId, o.id);
  if (yc.trang_thai !== 'waiting_external' && yc.trang_thai !== 'submitted') throw new LoiNop('Yêu cầu này chưa ở bước chờ kết quả.');
  const bayGio = new Date().toISOString();
  let moi = await doiTrangThai(db, o.companyId, o.id, { trang_thai: o.ketQua, ket_qua_co_quan: tb, nguon_ket_qua: 'nguoi_dung_khai', trang_thai_co_quan: o.ketQua, kiem_luc: bayGio });
  if (o.ketQua === 'accepted') {
    moi = await doiTrangThai(db, o.companyId, o.id, { trang_thai: 'resolved', xong_luc: bayGio });
    await db.from('tai_lieu').update({ trang_thai: 'accepted' }).eq('company_id', o.companyId).eq('id', yc.tai_lieu_id).eq('trang_thai', 'submitted');
    if (yc.hanh_trinh_id) {
      const ht = await docHanhTrinh(db, o.companyId, yc.hanh_trinh_id);
      if (ht?.buoc.some((x) => x.khoa === 'nguoi_dung_nop' && x.trang_thai === 'waiting_external')) {
        await danhDauBuoc(db, { companyId: o.companyId, userId: o.userId, id: yc.hanh_trinh_id, khoa: 'nguoi_dung_nop', trangThai: 'completed' }).catch(() => undefined);
      }
      await danhDauBuoc(db, { companyId: o.companyId, userId: o.userId, id: yc.hanh_trinh_id, khoa: 'kiem_ket_qua', trangThai: 'completed', ketQua: tb }).catch(() => undefined);
    }
  } else if (yc.ho_so_viec_id) {
    await db.from('ho_so_viec').update({ muc_do: 'gap', cap_nhat_luc: bayGio }).eq('company_id', o.companyId).eq('id', yc.ho_so_viec_id);
  }
  await ghiNhatKy(db, { companyId: o.companyId, doiTuong: 'yeu_cau_thuc_thi', id: o.id, hanhDong: 'ket_qua', boi: o.userId,
    truoc: { trang_thai: yc.trang_thai }, sau: { trang_thai: moi.trang_thai, ket_qua: o.ketQua, thong_bao: tb, nguon: 'nguoi_dung_khai' }, nguon: 'nguoi_dung' });
  return moi;
}

export async function huyNop(db: Db, o: { companyId: string; userId: string; id: string }): Promise<YeuCauNop> {
  const yc = await docYeuCau(db, o.companyId, o.id);
  if (!['draft', 'needs_validation', 'needs_confirmation', 'ready', 'failed'].includes(yc.trang_thai)) throw new LoiNop('Đã nộp thì không huỷ được ở đây — nộp bổ sung hoặc huỷ theo thủ tục của cơ quan.');
  const moi = await doiTrangThai(db, o.companyId, o.id, { trang_thai: 'cancelled' });
  await ghiNhatKy(db, { companyId: o.companyId, doiTuong: 'yeu_cau_thuc_thi', id: o.id, hanhDong: 'huy', boi: o.userId, truoc: { trang_thai: yc.trang_thai }, sau: { trang_thai: 'cancelled' }, nguon: 'nguoi_dung' });
  return moi;
}

export async function dsYeuCauNop(db: Db, companyId: string): Promise<YeuCauNop[]> {
  const { data, error } = await db.from('yeu_cau_thuc_thi').select(COT).eq('company_id', companyId).order('cap_nhat_luc', { ascending: false }).limit(100);
  if (error) throw new Error(`đọc yêu cầu nộp: ${error.message}`);
  return data ?? [];
}
