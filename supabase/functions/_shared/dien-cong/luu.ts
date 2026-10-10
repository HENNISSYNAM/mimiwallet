/**
 * Điền hộ trên cổng ngoài — phần chạm CSDL (máy chủ). Nơi gọi (`to-khai`) đã kiểm đăng nhập, thành viên và vai trò.
 *
 * Máy chủ là nguồn sự thật của NHIỆM VỤ: giá trị từng ô lấy từ bản nháp đã băm, không từ trình duyệt hay bộ chạy.
 * Bộ chạy tại máy hỏi lại máy chủ trước khi bắt đầu, trước mỗi lượt ghi và khi tiếp tục (`docNhiemVu`).
 */
import { BO_CHUYEN, chuoiKeHoach, kiemPhien, layTruongTKN, timBoChuyen, type TrangThaiPhien } from './bo-chuyen.ts';

// deno-lint-ignore no-explicit-any
type Db = any;

export class LoiDien extends Error {
  constructor(public ma: string, message: string, public status = 400) { super(message); }
}

const THOI_HAN_PHUT = 30;

async function sha256(chu: string): Promise<string> {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(chu));
  return Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');
}

/** Chuyển trạng thái vận hành hợp lệ. Trạng thái cuối không đi đâu nữa. */
export const CHUYEN_PHIEN: Record<TrangThaiPhien, readonly TrangThaiPhien[]> = {
  tao: ['dang_dien', 'huy', 'het_han'],
  dang_dien: ['tam_dung', 'da_doi_chieu', 'lech', 'loi', 'dung', 'het_han'],
  tam_dung: ['dang_dien', 'dung', 'huy', 'het_han'],
  da_doi_chieu: ['ban_giao', 'dung'],
  lech: ['ban_giao', 'dung'],
  ban_giao: [],
  dung: [],
  loi: [],
  het_han: [],
  huy: [],
};

export function duocChuyen(tu: TrangThaiPhien, toi: TrangThaiPhien): boolean {
  return CHUYEN_PHIEN[tu]?.includes(toi) ?? false;
}

interface HoSo { ten: string | null; mst: string | null }

async function docNhap(db: Db, companyId: string, nhapId: string) {
  const { data, error } = await db.from('to_khai_nhap').select('id, mau, nam, ky_loai, quy, du_lieu, ma_bam, created_at')
    .eq('id', nhapId).eq('company_id', companyId).maybeSingle();
  if (error) throw error;
  return data as { id: string; mau: string; nam: number; ky_loai: string; du_lieu: unknown; ma_bam: string } | null;
}

/** Dựng nhiệm vụ từ bản nháp + bộ chuyển. Dùng cả lúc tạo và lúc kiểm lại (để phát hiện kế hoạch đổi). */
async function dungNhiemVu(o: { phienId: string; userId: string; companyId: string; nhap: NonNullable<Awaited<ReturnType<typeof docNhap>>>; boChuyenId: string; hoSo: HoSo; hetHan: string; khoa: string }) {
  const bc = timBoChuyen(o.boChuyenId);
  if (!bc || !bc.bat) throw new LoiDien('BO_CHUYEN_TAT', 'Bộ chuyển này đang tắt hoặc chưa được xác minh.', 409);
  if (o.nhap.mau !== bc.mau) throw new LoiDien('SAI_MAU', `Bộ chuyển chỉ điền mẫu ${bc.mau}.`, 409);
  if (!bc.ky_ho_tro.includes(o.nhap.ky_loai as 'nam')) throw new LoiDien('SAI_KY', 'Bộ chuyển chưa hỗ trợ kỳ kê khai này.', 409);
  const lay = layTruongTKN(o.nhap.du_lieu, { loai: o.nhap.ky_loai, nam: o.nhap.nam }, o.hoSo);
  if (!lay.ok) throw new LoiDien('NHAP_KHONG_DIEN_DUOC', lay.ly_do, 409);
  const maBamKeHoach = await sha256(chuoiKeHoach({
    nhap_id: o.nhap.id, ma_bam_nhap: o.nhap.ma_bam, bo_chuyen: bc.id, phien_ban: bc.phien_ban, chu_the: lay.chu_the, truong: lay.truong,
  }));
  return {
    id: o.phienId,
    nguoi_dung_id: o.userId,
    cong_ty_id: o.companyId,
    nhap_id: o.nhap.id,
    ma_bam_nhap: o.nhap.ma_bam,
    ma_bam_ke_hoach: maBamKeHoach,
    nang_luc: 'dien_bieu_mau' as const,
    bo_chuyen: bc.id,
    phien_ban_bo_chuyen: bc.phien_ban,
    origin_cho_phep: bc.origin,
    het_han: o.hetHan,
    khoa_chong_trung: o.khoa,
    chu_the: lay.chu_the,
    truong: lay.truong,
  };
}

export async function taoPhien(db: Db, o: { companyId: string; userId: string; nhapId: string; boChuyen: string; khoaChongTrung: string; hoSo: HoSo; bayGio?: Date }) {
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(o.khoaChongTrung)) throw new LoiDien('THAM_SO', 'Khoá chống trùng không hợp lệ.');
  const { data: cu } = await db.from('phien_dien_cong').select('id, trang_thai, het_han, nhap_id, bo_chuyen')
    .eq('company_id', o.companyId).eq('khoa_chong_trung', o.khoaChongTrung).maybeSingle();
  if (cu) return docNhiemVu(db, { companyId: o.companyId, userId: o.userId, phienId: cu.id, duocSoanToKhai: true, hoSo: o.hoSo, bayGio: o.bayGio });

  const nhap = await docNhap(db, o.companyId, o.nhapId);
  if (!nhap) throw new LoiDien('KHONG_THAY_NHAP', 'Không tìm thấy bản nháp của công ty này.', 404);
  const bayGio = o.bayGio ?? new Date();
  const hetHan = new Date(bayGio.getTime() + THOI_HAN_PHUT * 60_000).toISOString();
  const tam = await dungNhiemVu({ phienId: crypto.randomUUID(), userId: o.userId, companyId: o.companyId, nhap, boChuyenId: o.boChuyen, hoSo: o.hoSo, hetHan, khoa: o.khoaChongTrung });
  const { data, error } = await db.from('phien_dien_cong').insert({
    id: tam.id, company_id: o.companyId, user_id: o.userId, nhap_id: nhap.id, ma_bam_nhap: nhap.ma_bam,
    ma_bam_ke_hoach: tam.ma_bam_ke_hoach, bo_chuyen: tam.bo_chuyen, phien_ban_bo_chuyen: tam.phien_ban_bo_chuyen,
    khoa_chong_trung: o.khoaChongTrung, het_han: hetHan, trang_thai: 'tao',
  }).select('id').single();
  if (error) throw error;
  await ghiNhatKy(db, { phienId: data.id, companyId: o.companyId, maBamNhap: nhap.ma_bam, phienBan: tam.phien_ban_bo_chuyen }, [
    { tac_nhan: 'nguoi_dung', hanh_dong: 'tao_phien', ket_qua: 'ok', ghi_chu: `Bộ chuyển ${tam.bo_chuyen} ${tam.phien_ban_bo_chuyen}, ${tam.truong.length} ô.` },
  ]);
  return { ok: true as const, nhiem_vu: tam };
}

/**
 * Đọc lại và KIỂM nhiệm vụ: còn hạn, còn quyền, bản nháp chưa đổi, chưa có bản mới hơn, bộ chuyển chưa đổi, và kế hoạch
 * dựng lại từ bản nháp phải ra đúng mã băm cũ. Có lỗi là trả danh sách lỗi — bộ chạy phải dừng.
 */
export async function docNhiemVu(db: Db, o: { companyId: string; userId: string; phienId: string; duocSoanToKhai: boolean; hoSo: HoSo; bayGio?: Date }) {
  const { data: p, error } = await db.from('phien_dien_cong')
    .select('id, company_id, user_id, nhap_id, ma_bam_nhap, ma_bam_ke_hoach, bo_chuyen, phien_ban_bo_chuyen, khoa_chong_trung, trang_thai, het_han')
    .eq('id', o.phienId).maybeSingle();
  if (error) throw error;
  // Phiên của công ty khác: trả như không có — không lộ là có tồn tại.
  if (!p || p.company_id !== o.companyId) throw new LoiDien('KHONG_THAY_PHIEN', 'Không tìm thấy phiên điền hộ.', 404);
  const nhap = await docNhap(db, o.companyId, p.nhap_id);
  const { data: moiNhat } = nhap
    ? await db.from('to_khai_nhap').select('id').eq('company_id', o.companyId).eq('mau', nhap.mau).eq('nam', nhap.nam).eq('ky_loai', nhap.ky_loai)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    : { data: null };
  const loi = kiemPhien({
    trang_thai: p.trang_thai, het_han: p.het_han, nhap_id: p.nhap_id, ma_bam_nhap: p.ma_bam_nhap, bo_chuyen: p.bo_chuyen, phien_ban: p.phien_ban_bo_chuyen,
  }, { bayGio: o.bayGio ?? new Date(), duocSoanToKhai: o.duocSoanToKhai, nhapHienTai: nhap ? { id: nhap.id, ma_bam: nhap.ma_bam } : null, nhapMoiNhatCungKy: moiNhat ?? null });
  if (loi.length || !nhap) return { ok: false as const, loi, trang_thai: p.trang_thai as TrangThaiPhien };
  const nv = await dungNhiemVu({ phienId: p.id, userId: p.user_id, companyId: o.companyId, nhap, boChuyenId: p.bo_chuyen, hoSo: o.hoSo, hetHan: p.het_han, khoa: p.khoa_chong_trung });
  if (nv.ma_bam_ke_hoach !== p.ma_bam_ke_hoach) {
    return { ok: false as const, loi: ['Kế hoạch dựng lại không còn khớp (hồ sơ hoặc bộ chuyển đã đổi) — tạo phiên mới.'], trang_thai: p.trang_thai as TrangThaiPhien };
  }
  return { ok: true as const, nhiem_vu: nv, trang_thai: p.trang_thai as TrangThaiPhien };
}

export interface DongNhatKy {
  tac_nhan: 'nguoi_dung' | 'bo_chay' | 'may_chu';
  hanh_dong: string;
  khoa_truong?: string | null;
  ket_qua: 'ok' | 'chan' | 'lech' | 'loi' | 'khong_ro';
  ma_bam_gia_tri?: string | null;
  ghi_chu?: string | null;
}

/** Kiểm từng dòng nhật ký bộ chạy gửi lên — không tin khuôn từ bên ngoài. */
export function dongNhatKyHopLe(d: unknown): d is DongNhatKy {
  if (!d || typeof d !== 'object') return false;
  const x = d as Record<string, unknown>;
  return ['nguoi_dung', 'bo_chay', 'may_chu'].includes(String(x.tac_nhan))
    && typeof x.hanh_dong === 'string' && /^[a-z_]{3,40}$/.test(x.hanh_dong)
    && (x.khoa_truong === undefined || x.khoa_truong === null || (typeof x.khoa_truong === 'string' && /^[a-z][a-z0-9_]{1,39}$/.test(x.khoa_truong)))
    && ['ok', 'chan', 'lech', 'loi', 'khong_ro'].includes(String(x.ket_qua))
    && (x.ma_bam_gia_tri === undefined || x.ma_bam_gia_tri === null || (typeof x.ma_bam_gia_tri === 'string' && /^[0-9a-f]{64}$/.test(x.ma_bam_gia_tri)))
    && (x.ghi_chu === undefined || x.ghi_chu === null || (typeof x.ghi_chu === 'string' && x.ghi_chu.length <= 300));
}

export async function ghiNhatKy(db: Db, p: { phienId: string; companyId: string; maBamNhap: string; phienBan: string }, dong: DongNhatKy[]) {
  if (!dong.length) return;
  const { error } = await db.from('nhat_ky_dien_cong').insert(dong.slice(0, 60).map((d) => ({
    phien_id: p.phienId, company_id: p.companyId, tac_nhan: d.tac_nhan, hanh_dong: d.hanh_dong, khoa_truong: d.khoa_truong ?? null,
    ket_qua: d.ket_qua, ma_bam_gia_tri: d.ma_bam_gia_tri ?? null, ghi_chu: d.ghi_chu ?? null, ma_bam_nhap: p.maBamNhap, phien_ban_bo_chuyen: p.phienBan,
  })));
  if (error) throw error;
}

/** Ghi nhật ký và (nếu có) chuyển trạng thái. Chuyển sai luật là từ chối — bộ chạy không tự đặt trạng thái tuỳ ý. */
export async function ghiBuoc(db: Db, o: { companyId: string; phienId: string; dong: unknown[]; trangThaiMoi?: unknown; ketQua?: unknown }) {
  const { data: p } = await db.from('phien_dien_cong').select('id, company_id, trang_thai, ma_bam_nhap, phien_ban_bo_chuyen').eq('id', o.phienId).maybeSingle();
  if (!p || p.company_id !== o.companyId) throw new LoiDien('KHONG_THAY_PHIEN', 'Không tìm thấy phiên điền hộ.', 404);
  const dong = o.dong.filter(dongNhatKyHopLe);
  if (dong.length !== o.dong.length) throw new LoiDien('NHAT_KY_SAI', 'Nhật ký gửi lên không đúng khuôn.');
  await ghiNhatKy(db, { phienId: p.id, companyId: p.company_id, maBamNhap: p.ma_bam_nhap, phienBan: p.phien_ban_bo_chuyen }, dong);
  if (o.trangThaiMoi !== undefined) {
    const toi = String(o.trangThaiMoi) as TrangThaiPhien;
    if (!(toi in CHUYEN_PHIEN)) throw new LoiDien('TRANG_THAI_SAI', 'Trạng thái không hợp lệ.');
    if (toi !== p.trang_thai) {
      if (!duocChuyen(p.trang_thai, toi)) throw new LoiDien('CHUYEN_SAI', `Không chuyển được từ "${p.trang_thai}" sang "${toi}".`, 409);
      const ketQua = o.ketQua && typeof o.ketQua === 'object' ? o.ketQua : undefined;
      // Điều kiện trạng thái cũ ngay trong câu UPDATE: hai lần gửi cùng lúc không cùng chuyển được.
      const { data: ud, error } = await db.from('phien_dien_cong').update({ trang_thai: toi, cap_nhat_luc: new Date().toISOString(), ...(ketQua ? { ket_qua: ketQua } : {}) })
        .eq('id', p.id).eq('trang_thai', p.trang_thai).select('id');
      if (error) throw error;
      if (!ud?.length) throw new LoiDien('CHUYEN_SAI', 'Phiên vừa đổi trạng thái ở nơi khác — đọc lại.', 409);
    }
  }
  return { ok: true };
}

export async function dsPhien(db: Db, companyId: string) {
  const { data, error } = await db.from('phien_dien_cong')
    .select('id, nhap_id, bo_chuyen, phien_ban_bo_chuyen, trang_thai, het_han, ket_qua, tao_luc, cap_nhat_luc')
    .eq('company_id', companyId).order('tao_luc', { ascending: false }).limit(20);
  if (error) throw error;
  return { ds: data ?? [], bo_chuyen: BO_CHUYEN.map((b) => ({ id: b.id, ten: b.ten, phien_ban: b.phien_ban, trang_thai: b.trang_thai, bat: b.bat, mau: b.mau })) };
}
