/**
 * Hồ sơ việc — phần CHẠM CSDL (service role), Prompt 4B. Mọi quyết định ở `dong-co-viec.ts`; ở đây đọc,
 * gọi hàm thuần, ghi có điều kiện, để lại dấu vết. Nơi gọi (edge function `tro-ly`, cron `thong-bao`) đã
 * kiểm vai trò.
 *
 * CHỐNG TRÙNG Ở CSDL, KHÔNG Ở GIAO DIỆN
 *   - Một việc đang mở mỗi dấu vân tay: chỉ mục duy nhất `ho_so_viec_mot_dang_mo`; chèn trùng → đọc lại.
 *   - Một bằng chứng mỗi khoá: UNIQUE (ho_so_viec_id, khoa_trung); ghi lại → bỏ qua.
 *   - Ghi trạng thái có điều kiện theo `phien_ban` đã đọc; lệch (hai nơi cùng sửa) → đọc lại, tính lại.
 *   - Chuyển trạng thái sai / "đã xác minh" không bằng chứng: trigger CSDL từ chối, kể cả service role.
 */
import { danhDauBuoc, docHanhTrinh, ghiNhatKy, LoiHanhTrinh, moHanhTrinh, traLoi, type HanhTrinhDay } from '../hanh-trinh/luu.ts';
import type { LoaiHanhTrinh } from '../hanh-trinh/mau.ts';
import type { TrangThaiBuoc } from '../hanh-trinh/dong-co.ts';
import { ghiSuKien } from '../do-luong/su-kien.ts';
import { docLichCongTy, type LichCongTy } from '../luat/doc-lich-thue.ts';
import type { BanNhapThongBao } from '../thong-bao/sinh.ts';
import {
  cauTheoDoi, conCanLam, dieuKienGiaiQuyet, hanhDongTiepHanhTrinh, henKiemLaiKeTiep, khiNaoViec, lichTuViec, mucUuTienViec,
  ngayDaNop, ngayTuHanhTrinh, suyTrangThai, TEN_MUC, xepViec, type CotNgayViec, type DieuKienGiaiQuyet, type HanhDongTiep,
  type MucLich, type ViecCanLam,
} from './dong-co-viec.ts';
import { cauDaPhanLoaiHet, dauVanTayPhanLoai, LOAI_VIEC_PHAN_LOAI, tienGon, viecPhanLoaiDoanhThu } from './doanh-thu-viec.ts';
import { dongThoiGian, type DongNhatKy, type DongThoiGian } from './dong-thoi-gian.ts';
import {
  kiemBangChung, laDangMo, TEN_TRANG_THAI_VIEC, type BangChung, type LoaiBangChung, type NguonBangChung, type TrangThaiViec, type XacMinh,
} from './trang-thai.ts';

// deno-lint-ignore no-explicit-any
type Db = any;

export class LoiViec extends Error {}

const COT_VIEC = 'id, company_id, loai, tieu_de, trang_thai, muc_do, dau_van_tay, nguon, ky, doi_tuong, han_luat, han_luat_nguon, ngay_nen_lam, ngay_nen_lam_ly_do, hen_kiem_lai, so_lan_nhac, phien_ban, tao_luc, cap_nhat_luc, giai_quyet_luc, ket_qua';
const DANG_MO_SQL = '(needs_information,ready_to_act,in_progress,waiting_external,needs_review)';

export interface HoSoViecDong extends CotNgayViec {
  company_id: string; loai: string; muc_do: string; dau_van_tay: string;
  // deno-lint-ignore no-explicit-any
  nguon: any;
  ky: string | null; doi_tuong: string | null; so_lan_nhac: number; phien_ban: number;
  tao_luc: string; cap_nhat_luc: string; giai_quyet_luc: string | null; ket_qua: string | null;
}

const laTrung = (e: { code?: string; message?: string } | null) => !!e && (e.code === '23505' || /duplicate|unique/i.test(e.message ?? ''));

export async function docHoSoViec(db: Db, companyId: string, id: string): Promise<HoSoViecDong | null> {
  const { data, error } = await db.from('ho_so_viec').select(COT_VIEC).eq('company_id', companyId).eq('id', id).maybeSingle();
  if (error) throw new Error(`đọc hồ sơ việc: ${error.message}`);
  return data ?? null;
}

export async function docBangChung(db: Db, companyId: string, caseId: string): Promise<BangChung[]> {
  const { data, error } = await db.from('bang_chung_viec').select('loai, nguon, gia_tri, trang_thai_xac_minh, khoa_trung, tai_lieu_id, tao_luc')
    .eq('company_id', companyId).eq('ho_so_viec_id', caseId).order('tao_luc', { ascending: true });
  if (error) throw new Error(`đọc bằng chứng: ${error.message}`);
  return data ?? [];
}

/** Hành trình (bộ máy bước) của một hồ sơ việc — cái mới nhất, dù đã xong bước hay chưa. */
export async function docHanhTrinhCuaViec(db: Db, companyId: string, caseId: string): Promise<HanhTrinhDay | null> {
  const { data, error } = await db.from('hanh_trinh').select('id').eq('company_id', companyId).eq('ho_so_viec_id', caseId)
    .neq('trang_thai', 'da_huy').order('tao_luc', { ascending: false }).limit(1);
  if (error) throw new Error(`đọc hành trình của việc: ${error.message}`);
  const id = data?.[0]?.id;
  return id ? docHanhTrinh(db, companyId, id) : null;
}

// ── Bằng chứng ───────────────────────────────────────────────────────────────────────────────────
export async function themBangChung(db: Db, o: {
  companyId: string; caseId: string; loai: LoaiBangChung; nguon: NguonBangChung; xacMinh: XacMinh; khoaTrung: string;
  giaTri?: string | null; taiLieuId?: string | null; boi: string | null; nguonGhi?: string;
}): Promise<{ moi: boolean }> {
  const loiKiem = kiemBangChung({ loai: o.loai, nguon: o.nguon, trang_thai_xac_minh: o.xacMinh });
  if (loiKiem) throw new LoiViec(loiKiem);
  const giaTri = o.giaTri?.trim().slice(0, 1000) || null;
  const { error } = await db.from('bang_chung_viec').insert({
    company_id: o.companyId, ho_so_viec_id: o.caseId, loai: o.loai, nguon: o.nguon, gia_tri: giaTri,
    tai_lieu_id: o.taiLieuId ?? null, trang_thai_xac_minh: o.xacMinh, khoa_trung: o.khoaTrung.slice(0, 200), tao_boi: o.boi,
  });
  if (laTrung(error)) return { moi: false }; // bấm hai lần / gửi lại: một bằng chứng
  if (error) throw new Error(`ghi bằng chứng: ${error.message}`);
  await ghiNhatKy(db, {
    companyId: o.companyId, doiTuong: 'bang_chung_viec', id: `${o.caseId}:${o.khoaTrung}`.slice(0, 80), hanhDong: 'them', boi: o.boi,
    sau: { loai: o.loai, trang_thai_xac_minh: o.xacMinh, gia_tri: giaTri }, nguon: o.nguonGhi ?? (o.nguon === 'mimi_he_thong' ? 'mimi' : 'nguoi_dung'),
  });
  return { moi: true };
}

// ── Đồng bộ trạng thái (một chỗ duy nhất đổi trạng thái hồ sơ việc có hành trình) ──────────────────
function ketQuaGiaiQuyet(bc: readonly BangChung[]): string {
  const kq = [...bc].reverse().find((b) => b.loai === 'official_response' || b.loai === 'system_verified_event');
  if (kq?.gia_tri) return kq.gia_tri.slice(0, 2000);
  return 'Bạn xác nhận đã làm xong mọi bước.';
}

export async function dongBoTrangThaiViec(db: Db, o: { companyId: string; caseId: string; boi: string | null; homNay: string; nguon?: string }, lan = 0): Promise<HoSoViecDong> {
  const v = await docHoSoViec(db, o.companyId, o.caseId);
  if (!v) throw new LoiViec('Không tìm thấy việc này.');
  if (!laDangMo(v.trang_thai)) return v;
  const ht = await docHanhTrinhCuaViec(db, o.companyId, o.caseId);
  if (!ht) return v; // việc không có hành trình (vd. phân loại doanh thu): đồng bộ ở nơi khác
  const bc = await docBangChung(db, o.companyId, o.caseId);
  const tt = suyTrangThai(ht, bc, v.trang_thai as TrangThaiViec);
  const ngay = ngayTuHanhTrinh(ht.loai, ht.du_kien);
  const henKiem = tt === 'waiting_external'
    ? (v.hen_kiem_lai ?? henKiemLaiKeTiep(ngayDaNop(bc) ?? o.homNay, 0))
    : null;
  const sua: Record<string, unknown> = { ...ngay, hen_kiem_lai: henKiem };
  if (tt !== v.trang_thai) sua.trang_thai = tt;
  if (tt === 'resolved_user_confirmed' || tt === 'resolved_system_verified') {
    sua.giai_quyet_luc = new Date().toISOString();
    sua.giai_quyet_boi = o.boi;
    sua.ket_qua = ketQuaGiaiQuyet(bc);
  }
  const doi = Object.entries(sua).some(([k, x]) => (v as unknown as Record<string, unknown>)[k] !== x && !(k === 'giai_quyet_boi'));
  if (!doi) return v;
  const { data, error } = await db.from('ho_so_viec').update(sua).eq('id', v.id).eq('company_id', o.companyId).eq('phien_ban', v.phien_ban).select('id');
  if (error) throw new Error(`cập nhật hồ sơ việc: ${error.message}`);
  if (!data?.length) {
    // Có nơi khác vừa sửa (trợ lý và pet cùng lúc, hai tab): đọc lại và tính lại — không ghi đè mù.
    if (lan < 2) return dongBoTrangThaiViec(db, o, lan + 1);
    throw new LoiViec('Việc vừa được cập nhật ở nơi khác. Tải lại để xem trạng thái mới nhất.');
  }
  if (sua.trang_thai) {
    await ghiNhatKy(db, { companyId: o.companyId, doiTuong: 'ho_so_viec', id: v.id, hanhDong: 'chuyen_trang_thai', boi: o.boi, truoc: { trang_thai: v.trang_thai }, sau: { trang_thai: tt }, nguon: o.nguon ?? 'mimi' });
    if (tt === 'resolved_user_confirmed' || tt === 'resolved_system_verified') {
      await ghiSuKien(db, o.companyId, o.boi, 'first_case_resolved', { loai: v.loai });
      await ghiSuKien(db, o.companyId, o.boi, 'case_resolved', { loai: v.loai, muc: tt });
    }
  }
  return (await docHoSoViec(db, o.companyId, o.caseId)) as HoSoViecDong;
}

// ── Hành động của người dùng (mọi mặt: Việc cần làm, Trợ lý, Pet đi qua đây) ─────────────────────
export async function moViecHanhTrinh(db: Db, o: { companyId: string; userId: string; loai: LoaiHanhTrinh; yDinh: string; duKienBiet?: Record<string, string>; homNay: string }) {
  const r = await moHanhTrinh(db, o);
  if (!r.ht.ho_so_viec_id) return { ...r, viec: null };
  const viec = await dongBoTrangThaiViec(db, { companyId: o.companyId, caseId: r.ht.ho_so_viec_id, boi: o.userId, homNay: o.homNay });
  if (r.moi) await ghiSuKien(db, o.companyId, o.userId, 'first_issue_detected', { loai: viec.loai });
  return { ...r, viec };
}

async function viecCuaHanhTrinh(db: Db, companyId: string, htId: string): Promise<{ ht: HanhTrinhDay; caseId: string }> {
  const ht = await docHanhTrinh(db, companyId, htId);
  if (!ht) throw new LoiViec('Không tìm thấy việc này.');
  if (!ht.ho_so_viec_id) throw new LoiViec('Việc này chưa gắn hồ sơ.');
  return { ht, caseId: ht.ho_so_viec_id };
}

export async function traLoiViec(db: Db, o: { companyId: string; userId: string; htId: string; khoa: string; giaTri: unknown; homNay: string; nguon?: string }) {
  const ht = await traLoi(db, { companyId: o.companyId, userId: o.userId, id: o.htId, khoa: o.khoa, giaTri: o.giaTri, nguon: o.nguon });
  const viec = ht.ho_so_viec_id ? await dongBoTrangThaiViec(db, { companyId: o.companyId, caseId: ht.ho_so_viec_id, boi: o.userId, homNay: o.homNay }) : null;
  return { ht: (await docHanhTrinh(db, o.companyId, o.htId)) as HanhTrinhDay, viec };
}

/** Đánh dấu một bước. Bước xong do người dùng đánh dấu = một bằng chứng "bạn xác nhận" (không hơn). */
export async function danhDauBuocViec(db: Db, o: { companyId: string; userId: string; htId: string; khoa: string; trangThai: TrangThaiBuoc; ketQua?: string; homNay: string }) {
  const { caseId } = await viecCuaHanhTrinh(db, o.companyId, o.htId);
  if (o.khoa === 'nguoi_dung_nop' && o.trangThai === 'waiting_external') {
    return ghiNhanDaNop(db, { companyId: o.companyId, userId: o.userId, caseId, homNay: o.homNay });
  }
  if (o.trangThai === 'completed' && o.khoa === 'kiem_ket_qua') {
    return ghiNhanPhanHoi(db, { companyId: o.companyId, userId: o.userId, caseId, noiDung: o.ketQua ?? '', homNay: o.homNay });
  }
  await danhDauBuoc(db, { companyId: o.companyId, userId: o.userId, id: o.htId, khoa: o.khoa, trangThai: o.trangThai, ketQua: o.ketQua });
  if (o.trangThai === 'completed') {
    await themBangChung(db, { companyId: o.companyId, caseId, loai: 'user_confirmation', nguon: 'nguoi_dung', xacMinh: 'user_confirmed', khoaTrung: `buoc:${o.khoa}`, giaTri: `Bạn đánh dấu xong bước "${o.khoa}"`, boi: o.userId });
  }
  const viec = await dongBoTrangThaiViec(db, { companyId: o.companyId, caseId, boi: o.userId, homNay: o.homNay });
  return { ht: (await docHanhTrinh(db, o.companyId, o.htId)) as HanhTrinhDay, viec };
}

/**
 * "Tôi đã nộp" — bằng chứng mức "bạn xác nhận" (+ mã hồ sơ nếu có), việc chuyển sang CHỜ BÊN NGOÀI với
 * ngày hẹn kiểm lại. KHÔNG BAO GIỜ thành "đã xác minh" hay "được chấp nhận". Gọi lại → không trùng.
 */
export async function ghiNhanDaNop(db: Db, o: { companyId: string; userId: string; caseId: string; maHoSo?: string | null; taiLieuId?: string | null; homNay: string; nguon?: string }) {
  const ht = await docHanhTrinhCuaViec(db, o.companyId, o.caseId);
  if (!ht) throw new LoiViec('Việc này không có bước nộp hồ sơ.');
  const b = ht.buoc.find((x) => x.khoa === 'nguoi_dung_nop');
  if (!b) throw new LoiViec('Việc này không có bước nộp hồ sơ.');
  if (b.trang_thai === 'blocked') throw new LoiViec(b.ly_do_chan ?? 'Cần trả lời đủ câu hỏi trước khi nộp.');
  await themBangChung(db, { companyId: o.companyId, caseId: o.caseId, loai: 'user_confirmation', nguon: 'nguoi_dung', xacMinh: 'user_confirmed', khoaTrung: 'da_nop', giaTri: 'Bạn ghi nhận đã nộp hồ sơ', boi: o.userId, nguonGhi: o.nguon });
  const ma = o.maHoSo?.trim();
  if (ma) await themBangChung(db, { companyId: o.companyId, caseId: o.caseId, loai: 'reference_number', nguon: 'nguoi_dung', xacMinh: 'user_confirmed', khoaTrung: `ma_ho_so:${ma}`, giaTri: ma, boi: o.userId, nguonGhi: o.nguon });
  if (o.taiLieuId) await themBangChung(db, { companyId: o.companyId, caseId: o.caseId, loai: 'uploaded_document', nguon: 'nguoi_dung', xacMinh: 'user_confirmed', khoaTrung: `tai_lieu:${o.taiLieuId}`, taiLieuId: o.taiLieuId, giaTri: 'Biên nhận / hồ sơ đã nộp', boi: o.userId, nguonGhi: o.nguon });
  if (b.trang_thai !== 'waiting_external' && b.trang_thai !== 'completed') {
    await danhDauBuoc(db, { companyId: o.companyId, userId: o.userId, id: ht.id, khoa: 'nguoi_dung_nop', trangThai: 'waiting_external' });
  }
  const viec = await dongBoTrangThaiViec(db, { companyId: o.companyId, caseId: o.caseId, boi: o.userId, homNay: o.homNay, nguon: o.nguon });
  return { ht: (await docHanhTrinh(db, o.companyId, ht.id)) as HanhTrinhDay, viec };
}

/**
 * Người dùng báo có phản hồi của cơ quan (số thông báo, biên nhận, văn bản tải lên). Bằng chứng mức
 * "bạn xác nhận" — MIMI chưa có cách tra cơ quan, nên việc xong ở mức "theo xác nhận của bạn".
 */
export async function ghiNhanPhanHoi(db: Db, o: { companyId: string; userId: string; caseId: string; noiDung: string; taiLieuId?: string | null; homNay: string; nguon?: string }) {
  const noiDung = o.noiDung.trim();
  if (noiDung.length < 5 && !o.taiLieuId) throw new LoiViec('Ghi lại kết quả (vd. số thông báo chấp nhận, ngày nhận biên nhận) hoặc tải lên văn bản phản hồi.');
  const ht = await docHanhTrinhCuaViec(db, o.companyId, o.caseId);
  if (!ht) throw new LoiViec('Việc này không có bước kiểm kết quả.');
  if (ht.cau_hoi) throw new LoiViec(`Cần trả lời trước: ${ht.cau_hoi.cau}`);
  const khoa = `phan_hoi:${(noiDung || o.taiLieuId || '').toLowerCase().replace(/\s+/g, ' ').slice(0, 120)}`;
  await themBangChung(db, {
    companyId: o.companyId, caseId: o.caseId, loai: o.taiLieuId ? 'uploaded_document' : 'official_response', nguon: 'nguoi_dung', xacMinh: 'user_confirmed',
    khoaTrung: khoa, giaTri: noiDung || 'Văn bản phản hồi tải lên', taiLieuId: o.taiLieuId ?? null, boi: o.userId, nguonGhi: o.nguon,
  });
  if (o.taiLieuId && noiDung.length >= 5) {
    await themBangChung(db, { companyId: o.companyId, caseId: o.caseId, loai: 'official_response', nguon: 'nguoi_dung', xacMinh: 'user_confirmed', khoaTrung: `phan_hoi:${noiDung.toLowerCase().slice(0, 120)}`, giaTri: noiDung, boi: o.userId, nguonGhi: o.nguon });
  }
  for (const k of ['nguoi_dung_nop', 'kiem_ket_qua']) {
    const moi = await docHanhTrinh(db, o.companyId, ht.id);
    const b = moi?.buoc.find((x) => x.khoa === k);
    if (!moi || !b || b.trang_thai === 'completed' || b.trang_thai === 'skipped' || moi.trang_thai === 'hoan_tat') continue;
    await danhDauBuoc(db, { companyId: o.companyId, userId: o.userId, id: ht.id, khoa: k, trangThai: 'completed', ketQua: noiDung || 'Văn bản phản hồi đã tải lên' });
  }
  const viec = await dongBoTrangThaiViec(db, { companyId: o.companyId, caseId: o.caseId, boi: o.userId, homNay: o.homNay, nguon: o.nguon });
  return { ht: (await docHanhTrinh(db, o.companyId, ht.id)) as HanhTrinhDay, viec };
}

export async function huyViec(db: Db, o: { companyId: string; userId: string; caseId: string }) {
  const v = await docHoSoViec(db, o.companyId, o.caseId);
  if (!v) throw new LoiViec('Không tìm thấy việc này.');
  if (!laDangMo(v.trang_thai)) throw new LoiViec('Việc đã đóng.');
  if (v.loai === LOAI_VIEC_PHAN_LOAI) throw new LoiViec('Việc này tự đóng khi mọi khoản doanh thu đã có nhóm hoạt động — không huỷ tay được.');
  const { data, error } = await db.from('ho_so_viec').update({ trang_thai: 'cancelled' }).eq('id', v.id).eq('company_id', o.companyId).eq('phien_ban', v.phien_ban).select('id');
  if (error) throw new Error(`huỷ việc: ${error.message}`);
  if (!data?.length) throw new LoiViec('Việc vừa được cập nhật ở nơi khác. Tải lại rồi thử lại.');
  await db.from('hanh_trinh').update({ trang_thai: 'da_huy', cap_nhat_luc: new Date().toISOString() }).eq('company_id', o.companyId).eq('ho_so_viec_id', v.id);
  await ghiNhatKy(db, { companyId: o.companyId, doiTuong: 'ho_so_viec', id: v.id, hanhDong: 'huy', boi: o.userId, truoc: { trang_thai: v.trang_thai }, sau: { trang_thai: 'cancelled' }, nguon: 'nguoi_dung' });
  return docHoSoViec(db, o.companyId, v.id);
}

// ── Việc phân loại doanh thu (Revenue Truth → một việc chặn tờ khai) ───────────────────────────────
/**
 * Đồng bộ việc phân loại doanh thu của năm `nam` với số liệu MỚI NHẤT: cần mà chưa có → mở (một);
 * đã có → cập nhật tiêu đề/số tiền/hạn; hết phần chưa rõ → bằng chứng hệ thống + đóng "MIMI đã kiểm".
 * `lich`: lịch đã đọc (tránh đọc hai lần); không có thì tự đọc. Đọc lỗi → ném (không bao giờ tự đóng việc
 * vì đọc hỏng).
 */
export async function dongBoViecDoanhThu(db: Db, o: { companyId: string; nam: number; homNay: string; laDemo: boolean; boi: string | null; lich?: LichCongTy }): Promise<HoSoViecDong | null> {
  const l = o.lich ?? await docLichCongTy(db, o.companyId, { nam: o.nam, homNay: o.homNay, laDemo: o.laDemo });
  const chia = l.hoatDong;
  const muon = viecPhanLoaiDoanhThu({ nam: o.nam, laHoKinhDoanh: l.loaiNguoiNop === 'ho_kinh_doanh', chuaRo: chia ? { so_tien: chia.nhom.chua_ro.so_tien, so_khoan: chia.nhom.chua_ro.so_khoan } : null, lich: l.lich, homNay: o.homNay });
  const dvt = dauVanTayPhanLoai(o.nam);
  const { data: coSan, error } = await db.from('ho_so_viec').select(COT_VIEC).eq('company_id', o.companyId).eq('dau_van_tay', dvt)
    .in('trang_thai', DANG_MO_SQL.slice(1, -1).split(',')).maybeSingle();
  if (error) throw new Error(`đọc việc phân loại: ${error.message}`);

  if (muon && !coSan) {
    const { data: moi, error: e2 } = await db.from('ho_so_viec').insert({
      company_id: o.companyId, loai: LOAI_VIEC_PHAN_LOAI, tieu_de: muon.tieu_de, dau_van_tay: dvt, trang_thai: 'ready_to_act', muc_do: 'chan',
      ky: muon.ky, han_luat: muon.han_luat, han_luat_nguon: muon.han_luat_nguon, ngay_nen_lam: muon.ngay_nen_lam, ngay_nen_lam_ly_do: muon.ngay_nen_lam_ly_do,
      nguon: { so_tien: muon.so_tien, so_khoan: muon.so_khoan, nam: o.nam, nguon: 'doanh_thu_theo_hoat_dong' }, tao_boi: o.boi,
    }).select('id').single();
    if (laTrung(e2)) return dongBoViecDoanhThu(db, { ...o, lich: l }); // cron + trợ lý cùng lúc: bên kia đã mở
    if (e2) throw new Error(`mở việc phân loại: ${e2.message}`);
    await ghiNhatKy(db, { companyId: o.companyId, doiTuong: 'ho_so_viec', id: moi.id, hanhDong: 'mo', boi: o.boi, sau: { tieu_de: muon.tieu_de, loai: LOAI_VIEC_PHAN_LOAI }, nguon: 'mimi' });
    await ghiSuKien(db, o.companyId, o.boi, 'first_case_created', { loai: LOAI_VIEC_PHAN_LOAI });
    await ghiSuKien(db, o.companyId, o.boi, 'case_created', { loai: LOAI_VIEC_PHAN_LOAI });
    return docHoSoViec(db, o.companyId, moi.id);
  }
  if (muon && coSan) {
    const sua = { tieu_de: muon.tieu_de, han_luat: muon.han_luat, han_luat_nguon: muon.han_luat_nguon, ngay_nen_lam: muon.ngay_nen_lam, ngay_nen_lam_ly_do: muon.ngay_nen_lam_ly_do };
    const nguonMoi = { ...(coSan.nguon ?? {}), so_tien: muon.so_tien, so_khoan: muon.so_khoan };
    const khac = Object.entries(sua).some(([k, v]) => (coSan as unknown as Record<string, unknown>)[k] !== v) || coSan.nguon?.so_tien !== muon.so_tien;
    if (!khac) return coSan;
    const { data: d, error: e3 } = await db.from('ho_so_viec').update({ ...sua, nguon: nguonMoi }).eq('id', coSan.id).eq('phien_ban', coSan.phien_ban).select('id');
    if (e3) throw new Error(`cập nhật việc phân loại: ${e3.message}`);
    if (d?.length) await ghiNhatKy(db, { companyId: o.companyId, doiTuong: 'ho_so_viec', id: coSan.id, hanhDong: 'cap_nhat', boi: o.boi, truoc: { tieu_de: coSan.tieu_de }, sau: { tieu_de: muon.tieu_de }, nguon: 'mimi' });
    return docHoSoViec(db, o.companyId, coSan.id);
  }
  if (!muon && coSan) {
    // Chỉ đóng khi CHẮC: có doanh thu, và phần chưa rõ nhóm bằng 0. Mất dữ liệu (ngắt ngân hàng) thì để nguyên.
    if (!chia || chia.tong <= 0 || chia.nhom.chua_ro.so_tien > 0) return coSan;
    await themBangChung(db, {
      companyId: o.companyId, caseId: coSan.id, loai: 'system_verified_event', nguon: 'mimi_he_thong', xacMinh: 'system_verified',
      khoaTrung: `da_phan_loai_het:${o.nam}`, giaTri: cauDaPhanLoaiHet(o.nam, chia.tong), boi: o.boi, nguonGhi: 'mimi',
    });
    const { data: d, error: e4 } = await db.from('ho_so_viec').update({
      trang_thai: 'resolved_system_verified', giai_quyet_luc: new Date().toISOString(), giai_quyet_boi: o.boi, ket_qua: cauDaPhanLoaiHet(o.nam, chia.tong),
    }).eq('id', coSan.id).eq('phien_ban', coSan.phien_ban).select('id');
    if (e4) throw new Error(`đóng việc phân loại: ${e4.message}`);
    if (!d?.length) return dongBoViecDoanhThu(db, { ...o, lich: l });
    await ghiNhatKy(db, { companyId: o.companyId, doiTuong: 'ho_so_viec', id: coSan.id, hanhDong: 'chuyen_trang_thai', boi: o.boi, truoc: { trang_thai: coSan.trang_thai }, sau: { trang_thai: 'resolved_system_verified' }, nguon: 'mimi' });
    await ghiSuKien(db, o.companyId, o.boi, 'case_resolved', { loai: LOAI_VIEC_PHAN_LOAI, muc: 'resolved_system_verified' });
    return docHoSoViec(db, o.companyId, coSan.id);
  }
  return null;
}

// ── Việc cần làm (một danh sách cho Tổng quan, Trợ lý, Pet, Lịch) ─────────────────────────────────
function hanhDongPhanLoai(v: HoSoViecDong): HanhDongTiep {
  return {
    loai: 'phan_loai_doanh_thu', tieu_de: v.tieu_de,
    mo_ta: `${v.nguon?.so_khoan ?? 'Một số'} khoản doanh thu chưa có nhóm hoạt động (bán hàng, dịch vụ, cho thuê…).`,
    vi_sao: 'Mỗi nhóm hoạt động là một dòng và một tỷ lệ thuế riêng trên tờ khai; MIMI không tự xếp phần chưa rõ vào ngành đăng ký.',
    can_nhap: [], chan: true, dieu_kien_xong: 'Mọi khoản doanh thu của năm đều có nhóm hoạt động — MIMI tự kiểm và đóng việc.',
    nguon: ['Doanh thu theo nhóm hoạt động', 'Lịch thuế của công ty'], buoc: null, dich: '/dashboard/to-khai',
  };
}

export interface KetQuaViecCanLam {
  viec: ViecCanLam[];
  lich: MucLich[];
  /** Việc đã xong / huỷ gần đây — mức giải quyết nói rõ "theo bạn" hay "MIMI đã kiểm". */
  da_xong: { id: string; tieu_de: string; trang_thai: string; giai_quyet_luc: string | null; ket_qua: string | null }[];
  /** Nguồn nào đọc hỏng — giao diện nói "chưa đọc được", không hiện như "không có việc". */
  loi: { nguon: string; cau: string }[];
}

export async function dsViecCanLam(db: Db, o: {
  companyId: string; homNay: string; laDemo: boolean; boi: string | null; dongBoDoanhThu?: boolean;
  /** Lịch đã đọc sẵn (nơi gọi vừa đọc, hoặc bài kiểm). Không truyền → tự đọc. */
  lich?: LichCongTy;
}): Promise<KetQuaViecCanLam> {
  const loi: KetQuaViecCanLam['loi'] = [];
  const nam = Number(o.homNay.slice(0, 4));
  let lichThue: LichCongTy | null = o.lich ?? null;
  if (!lichThue) try {
    lichThue = await docLichCongTy(db, o.companyId, { nam, homNay: o.homNay, laDemo: o.laDemo });
  } catch (e) {
    loi.push({ nguon: 'lich_thue', cau: 'Chưa đọc được lịch thuế và doanh thu — danh sách có thể thiếu hạn thuế.' });
    console.error('viec_can_lam lịch:', e instanceof Error ? e.message : e);
  }
  if (lichThue && o.dongBoDoanhThu !== false) {
    try {
      await dongBoViecDoanhThu(db, { companyId: o.companyId, nam, homNay: o.homNay, laDemo: o.laDemo, boi: o.boi, lich: lichThue });
    } catch (e) {
      loi.push({ nguon: 'doanh_thu', cau: 'Chưa kiểm được doanh thu chưa rõ nhóm hoạt động.' });
      console.error('viec_can_lam doanh thu:', e instanceof Error ? e.message : e);
    }
  }

  const { data: hs, error } = await db.from('ho_so_viec').select(COT_VIEC).eq('company_id', o.companyId)
    .order('cap_nhat_luc', { ascending: false }).limit(200);
  if (error) throw new Error(`đọc việc: ${error.message}`);
  const tatCa = (hs ?? []) as HoSoViecDong[];
  const dangMo = tatCa.filter((v) => conCanLam(v.trang_thai));
  const ids = dangMo.map((v) => v.id);
  const [{ data: bcAll, error: e2 }, { data: htRows, error: e3 }] = await Promise.all([
    ids.length ? db.from('bang_chung_viec').select('ho_so_viec_id, loai, nguon, gia_tri, trang_thai_xac_minh, khoa_trung, tai_lieu_id, tao_luc').eq('company_id', o.companyId).in('ho_so_viec_id', ids) : { data: [], error: null },
    ids.length ? db.from('hanh_trinh').select('id, ho_so_viec_id, trang_thai, tao_luc').eq('company_id', o.companyId).in('ho_so_viec_id', ids).neq('trang_thai', 'da_huy') : { data: [], error: null },
  ]);
  if (e2) throw new Error(`đọc bằng chứng: ${e2.message}`);
  if (e3) throw new Error(`đọc hành trình: ${e3.message}`);
  const htCua = new Map<string, string>();
  for (const r of [...(htRows ?? [])].sort((a: { tao_luc: string }, b: { tao_luc: string }) => a.tao_luc.localeCompare(b.tao_luc))) htCua.set(r.ho_so_viec_id, r.id);

  const viec: ViecCanLam[] = [];
  for (const v of dangMo) {
    const bc = ((bcAll ?? []) as (BangChung & { ho_so_viec_id: string })[]).filter((b) => b.ho_so_viec_id === v.id);
    let hanhDong: HanhDongTiep | null = null;
    if (v.loai === LOAI_VIEC_PHAN_LOAI) hanhDong = hanhDongPhanLoai(v);
    else {
      const htId = htCua.get(v.id);
      const ht = htId ? await docHanhTrinh(db, o.companyId, htId) : null;
      if (ht) hanhDong = hanhDongTiepHanhTrinh(ht, v.trang_thai as TrangThaiViec, bc, o.homNay);
    }
    const muc = mucUuTienViec(v, o.homNay);
    viec.push({
      id: v.id, nguon: 'ho_so_viec', loai: v.loai, tieu_de: v.tieu_de, trang_thai: v.trang_thai, muc,
      vi_sao: hanhDong?.vi_sao ?? TEN_MUC[muc], khi: khiNaoViec(v), hanh_dong: hanhDong,
      can_ban: v.trang_thai !== 'waiting_external' || (!!v.hen_kiem_lai && v.hen_kiem_lai <= o.homNay),
      duong_dan: `/dashboard/viec-can-lam?viec=${v.id}`,
    });
  }

  // Nghĩa vụ sắp tới hạn trong 14 ngày (suy từ lịch — không lưu, không trùng với việc đã có).
  if (lichThue) {
    for (const m of lichThue.lich) {
      if (m.trang_thai === 'khong_ap_dung' || !m.han || m.con_lai === null || m.con_lai < 0 || m.con_lai > 14) continue;
      viec.push({
        id: `nghia_vu:${m.khoa}`, nguon: 'nghia_vu', loai: m.loai, tieu_de: m.ten, trang_thai: null, muc: 2,
        vi_sao: m.vi_sao || 'Hạn theo lịch thuế của công ty.',
        khi: { loai_ngay: 'han_luat', ngay: m.han, nhan: `Hạn pháp lý: ${m.han.split('-').reverse().join('/')}` },
        hanh_dong: {
          loai: 'lam_buoc', tieu_de: m.trang_thai === 'can_xac_minh' && m.cau_hoi ? `Trả lời: ${m.cau_hoi}` : `Chuẩn bị: ${m.ten}`,
          mo_ta: m.vi_sao, vi_sao: 'Hạn pháp lý sắp tới.', can_nhap: [], chan: false, dieu_kien_xong: 'Bạn nộp đúng hạn.',
          nguon: ['Lịch thuế của công ty'], buoc: null, dich: '/dashboard/nhac-thue',
        },
        can_ban: true, duong_dan: '/dashboard/nhac-thue',
      });
    }
    if (lichThue.soChuaRo > 0) {
      viec.push({
        id: `tien_vao:${nam}`, nguon: 'tien_vao', loai: 'tien_vao_chua_ro',
        tieu_de: `Xác nhận ${lichThue.soChuaRo} khoản tiền vào chưa rõ (${tienGon(lichThue.tienChuaRo)})`, trang_thai: null, muc: 5,
        vi_sao: 'Khoản chưa rõ đang được tính như doanh thu — có thể là tiền vay, tiền người nhà, chuyển nội bộ.', khi: null,
        hanh_dong: {
          loai: 'lam_buoc', tieu_de: `Xác nhận ${lichThue.soChuaRo} khoản tiền vào chưa rõ`, mo_ta: 'Mỗi khoản: doanh thu, tiền vay, góp vốn, chuyển nội bộ, hoàn tiền, tiền người nhà…',
          vi_sao: 'Để doanh thu tính thuế đúng.', can_nhap: [], chan: false, dieu_kien_xong: 'Không còn khoản tiền vào chưa rõ.', nguon: ['Tiền vào ngân hàng'], buoc: null, dich: '/dashboard',
        },
        can_ban: true, duong_dan: '/dashboard',
      });
    }
  }

  const lich = tatCa.filter((v) => conCanLam(v.trang_thai) || (v.giai_quyet_luc && v.giai_quyet_luc.slice(0, 10) >= congNgayLui(o.homNay, 60))).flatMap(lichTuViec);
  const da_xong = tatCa.filter((v) => !conCanLam(v.trang_thai)).slice(0, 20)
    .map((v) => ({ id: v.id, tieu_de: v.tieu_de, trang_thai: v.trang_thai, giai_quyet_luc: v.giai_quyet_luc, ket_qua: v.ket_qua }));
  return { viec: xepViec(viec), lich, da_xong, loi };
}

const congNgayLui = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

// ── Chi tiết một việc ────────────────────────────────────────────────────────────────────────────
export interface ChiTietViec {
  viec: HoSoViecDong & { ten_trang_thai: string };
  hanh_trinh: HanhTrinhDay | null;
  bang_chung: BangChung[];
  hanh_dong: HanhDongTiep | null;
  dieu_kien: DieuKienGiaiQuyet | null;
  lich: MucLich[];
  dong_thoi_gian: DongThoiGian[];
}

export async function docChiTietViec(db: Db, companyId: string, caseId: string, homNay: string): Promise<ChiTietViec | null> {
  const v = await docHoSoViec(db, companyId, caseId);
  if (!v) return null;
  const [ht, bc] = await Promise.all([docHanhTrinhCuaViec(db, companyId, caseId), docBangChung(db, companyId, caseId)]);
  const ids = [caseId, ...(ht ? [ht.id] : [])];
  const loc = [...ids.map((x) => `doi_tuong_id.eq.${x}`), ...ids.map((x) => `doi_tuong_id.like.${x}:*`)].join(',');
  const { data: nk, error } = await db.from('nhat_ky_thay_doi').select('doi_tuong, doi_tuong_id, hanh_dong, luc, truoc, sau, nguon')
    .eq('company_id', companyId).or(loc).order('luc', { ascending: true }).limit(500);
  if (error) throw new Error(`đọc dòng thời gian: ${error.message}`);
  const tenBuoc = Object.fromEntries((ht?.buoc ?? []).map((b) => [b.khoa, b.tieu_de]));
  return {
    viec: { ...v, ten_trang_thai: TEN_TRANG_THAI_VIEC[v.trang_thai as TrangThaiViec] ?? v.trang_thai },
    hanh_trinh: ht,
    bang_chung: bc,
    hanh_dong: v.loai === LOAI_VIEC_PHAN_LOAI ? (laDangMo(v.trang_thai) ? hanhDongPhanLoai(v) : null) : ht ? hanhDongTiepHanhTrinh(ht, v.trang_thai as TrangThaiViec, bc, homNay) : null,
    dieu_kien: ht ? dieuKienGiaiQuyet(ht, bc) : null,
    lich: lichTuViec(v),
    dong_thoi_gian: dongThoiGian((nk ?? []) as DongNhatKy[], tenBuoc),
  };
}

// ── Theo dõi (cron) ──────────────────────────────────────────────────────────────────────────────
/**
 * Việc đang chờ bên ngoài tới ngày hẹn kiểm lại → bản nháp thông báo (khoá theo việc + ngày hẹn: chạy lại
 * không báo trùng). Không nói gì về việc cơ quan đã xử lý hay chưa. Chỉ ĐỌC — dời ngày hẹn bằng
 * `daNhacTheoDoi` SAU KHI thông báo đã ghi được, để lỗi ghi không làm mất lời nhắc.
 */
export async function nhapTheoDoiDenHan(db: Db, companyId: string, homNay: string): Promise<{ nhap: BanNhapThongBao[]; viec: HoSoViecDong[] }> {
  const { data, error } = await db.from('ho_so_viec').select(COT_VIEC).eq('company_id', companyId).eq('trang_thai', 'waiting_external').lte('hen_kiem_lai', homNay).limit(50);
  if (error) throw new Error(`đọc việc chờ: ${error.message}`);
  const viec = (data ?? []) as HoSoViecDong[];
  const nhap: BanNhapThongBao[] = [];
  for (const v of viec) {
    const bc = await docBangChung(db, companyId, v.id);
    nhap.push({
      khoa: `theo_doi:${v.id}:${v.hen_kiem_lai}`, loai: 'viec', muc_do: 'can_chu_y',
      tieu_de: `Kiểm tra phản hồi: ${v.tieu_de}`.slice(0, 200), noi_dung: cauTheoDoi(ngayDaNop(bc), homNay),
      duong_dan: `/dashboard/viec-can-lam?viec=${v.id}`, hanh_dong: [],
    });
  }
  return { nhap, viec };
}

/** Dời ngày hẹn kiểm lại (+3 → +7 → +14) sau khi đã nhắc. Ghi có điều kiện theo phiên bản. */
export async function daNhacTheoDoi(db: Db, companyId: string, viec: readonly HoSoViecDong[], homNay: string): Promise<void> {
  for (const v of viec) {
    const { data: d } = await db.from('ho_so_viec').update({ hen_kiem_lai: henKiemLaiKeTiep(homNay, v.so_lan_nhac + 1), so_lan_nhac: Math.min(100, v.so_lan_nhac + 1) })
      .eq('id', v.id).eq('company_id', companyId).eq('phien_ban', v.phien_ban).select('id');
    if (d?.length) await ghiNhatKy(db, { companyId, doiTuong: 'ho_so_viec', id: v.id, hanhDong: 'nhac_theo_doi', boi: null, sau: { hen_kiem_lai: v.hen_kiem_lai }, nguon: 'mimi' });
  }
}

export { LoiHanhTrinh };
