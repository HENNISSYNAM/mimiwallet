/**
 * ORCHESTRATOR agent cloud — phần chạm CSDL và vòng gọi runtime (13/10/2026, `docs/CLOUD_AGENT_RUNTIME.md`).
 *
 * Edge fn `agent-dieu-phoi` đã kiểm đăng nhập + thành viên + vai trò trước khi gọi vào đây. File này:
 *   - lưu nhiệm vụ (`nhiem_vu_agent`), khoá chống trùng theo công ty;
 *   - chuyển trạng thái NGUYÊN TỬ (điều kiện trạng thái cũ nằm trong câu UPDATE, như `dien-cong/luu.ts`);
 *   - ký lệnh, gọi runtime từng lượt, ghi nhật ký từng bước (giá trị `dien` bị che);
 *   - KHÔNG BAO GIỜ chạy lại bước 'ngoai' đã thử: chỉ số đó bị gạch khỏi `da_duyet` trước khi gửi, và lỗi giữa chừng ở
 *     bước 'ngoai' (hoặc mất kết nối khi lượt có bước 'ngoai' đã duyệt) → 'loi' kèm "chưa rõ kết quả", trạng thái cuối.
 *
 * Phụ thuộc bên ngoài (CSDL, runtime, khoá ký, đồng hồ) đều được tiêm vào để test chạy trên CSDL giả.
 */
import { cheKeHoach, DANG_KY_AGENT, moTaBuoc, SO_BUOC_TOI_DA, type BuocCongCu, type TenAgent } from './dang-ky.ts';
import { kyLenh, sangBase64Url } from './chuan-hoa-json.ts';
import type { HanhDong } from '../quyen/vai-tro.ts';

// deno-lint-ignore no-explicit-any
type Db = any;

export class LoiDieuPhoi extends Error {
  constructor(public ma: string, message: string, public status = 400) { super(message); }
}

export const TRANG_THAI = ['cho', 'dang_chay', 'cho_duyet', 'ban_giao', 'xong', 'loi', 'huy', 'het_han'] as const;
export type TrangThaiNhiemVu = (typeof TRANG_THAI)[number];

/**
 * Chuyển hợp lệ. `dang_chay → cho`: hết số lượt trong một lần gọi (runtime trả 'tiep') hoặc mất kết nối khi chưa có
 * bước 'ngoai' nào đang chờ chạy — người dùng bấm chạy tiếp được. `cho_duyet → cho`: người dùng đã duyệt bước.
 * `ban_giao` chỉ còn huỷ: mỗi lượt runtime mở trình duyệt mới nên phần người dùng tự làm (OTP, đăng nhập) không
 * nối tiếp được vào nhiệm vụ này — nói thật thay vì giả vờ chạy tiếp.
 */
export const CHUYEN: Record<TrangThaiNhiemVu, readonly TrangThaiNhiemVu[]> = {
  cho: ['dang_chay', 'huy', 'het_han'],
  dang_chay: ['cho', 'cho_duyet', 'ban_giao', 'xong', 'loi', 'het_han'],
  cho_duyet: ['cho', 'huy', 'het_han'],
  ban_giao: ['huy', 'het_han'],
  xong: [],
  loi: [],
  huy: [],
  het_han: [],
};

export const duocChuyen = (tu: TrangThaiNhiemVu, toi: TrangThaiNhiemVu) => CHUYEN[tu]?.includes(toi) ?? false;

/** Quyền theo vai trò sẵn có (`quyen/vai-tro.ts`). Duyệt bước 'ngoai' của agent tài chính cần quyền duyệt chi. */
export function quyenCan(hanhDong: string, agent?: TenAgent | null): HanhDong | null {
  switch (hanhDong) {
    case 'xem': case 'ds': return 'xem';
    case 'tao': case 'chay': case 'huy': return 'ghi_chung_tu';
    case 'duyet_buoc': return agent === 'tai_chinh' ? 'duyet_chi' : 'soan_to_khai';
    default: return null;
  }
}

export const THOI_HAN_NHIEM_VU_GIO = 24;
export const SO_LUOT_MOI_LAN_CHAY = 4;
export const NGAN_SACH_LUOT_MS = 45_000;
/** Edge fn Supabase bị cắt ở ~150 giây; chừa dư để kịp ghi trạng thái cuối. */
export const TONG_THOI_GIAN_MS = 110_000;
const HAN_LENH_MS = 55_000;

export interface DongNhiemVu {
  id: string; company_id: string; user_id: string; agent: TenAgent; muc_tieu: string; ke_hoach: BuocCongCu[];
  mien_cho_phep: string[]; trang_thai: TrangThaiNhiemVu; buoc_tiep: number; url_hien_tai: string | null;
  da_duyet: number[]; ket_qua: Record<string, unknown>; loi: string | null; khoa_chong_trung: string;
  het_han: string; so_luot: number; tao_luc: string; cap_nhat_luc: string;
}

const COT = 'id, company_id, user_id, agent, muc_tieu, ke_hoach, mien_cho_phep, trang_thai, buoc_tiep, url_hien_tai, da_duyet, ket_qua, loi, khoa_chong_trung, het_han, so_luot, tao_luc, cap_nhat_luc';

async function docDong(db: Db, companyId: string, id: string): Promise<DongNhiemVu> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new LoiDieuPhoi('KHONG_THAY', 'Không tìm thấy nhiệm vụ.', 404);
  const { data, error } = await db.from('nhiem_vu_agent').select(COT).eq('id', id).maybeSingle();
  if (error) throw error;
  // Nhiệm vụ công ty khác: trả như không có — không lộ là có tồn tại.
  if (!data || data.company_id !== companyId) throw new LoiDieuPhoi('KHONG_THAY', 'Không tìm thấy nhiệm vụ.', 404);
  return { ...data, da_duyet: data.da_duyet ?? [], ket_qua: data.ket_qua ?? {}, mien_cho_phep: data.mien_cho_phep ?? [] } as DongNhiemVu;
}

/** Chuyển trạng thái có điều kiện trạng thái cũ trong câu UPDATE: hai lần gọi cùng lúc không cùng chuyển được. */
async function chuyen(db: Db, nv: DongNhiemVu, toi: TrangThaiNhiemVu, them: Partial<DongNhiemVu> = {}, bayGio = new Date()): Promise<DongNhiemVu> {
  if (!duocChuyen(nv.trang_thai, toi)) throw new LoiDieuPhoi('CHUYEN_SAI', `Không chuyển được từ "${nv.trang_thai}" sang "${toi}".`, 409);
  const moi = { ...them, trang_thai: toi, cap_nhat_luc: bayGio.toISOString() };
  const { data, error } = await db.from('nhiem_vu_agent').update(moi).eq('id', nv.id).eq('company_id', nv.company_id).eq('trang_thai', nv.trang_thai).select('id');
  if (error) throw error;
  if (!data?.length) throw new LoiDieuPhoi('DOI_TRANG_THAI', 'Nhiệm vụ vừa đổi trạng thái ở nơi khác — tải lại.', 409);
  return { ...nv, ...moi } as DongNhiemVu;
}

/** Cập nhật cùng trạng thái (giữa các lượt) — vẫn có điều kiện trạng thái. */
async function capNhat(db: Db, nv: DongNhiemVu, them: Partial<DongNhiemVu>, bayGio = new Date()): Promise<DongNhiemVu> {
  const moi = { ...them, cap_nhat_luc: bayGio.toISOString() };
  const { data, error } = await db.from('nhiem_vu_agent').update(moi).eq('id', nv.id).eq('company_id', nv.company_id).eq('trang_thai', nv.trang_thai).select('id');
  if (error) throw error;
  if (!data?.length) throw new LoiDieuPhoi('DOI_TRANG_THAI', 'Nhiệm vụ vừa đổi trạng thái ở nơi khác — tải lại.', 409);
  return { ...nv, ...moi } as DongNhiemVu;
}

export interface DongNhatKy {
  tac_nhan: 'nguoi_dung' | 'runtime' | 'may_chu';
  hanh_dong: string;
  luot?: number | null; buoc?: number | null; cong_cu?: string | null; tac_dong?: 'doc' | 'ngoai' | null;
  ok?: boolean | null; ms?: number | null; tom_tat?: string | null; loi?: string | null;
}

async function ghiNhatKy(db: Db, nv: { id: string; company_id: string }, dong: DongNhatKy[]) {
  if (!dong.length) return;
  const { error } = await db.from('nhat_ky_nhiem_vu_agent').insert(dong.slice(0, 60).map((d) => ({
    nhiem_vu_id: nv.id, company_id: nv.company_id, tac_nhan: d.tac_nhan, hanh_dong: d.hanh_dong,
    luot: d.luot ?? null, buoc: d.buoc ?? null, cong_cu: d.cong_cu ?? null, tac_dong: d.tac_dong ?? null,
    ok: d.ok ?? null, ms: d.ms ?? null, tom_tat: d.tom_tat ? d.tom_tat.slice(0, 600) : null, loi: d.loi ? d.loi.slice(0, 300) : null,
  })));
  // Nhật ký hỏng không được làm hỏng nhiệm vụ đang chạy giữa chừng — nhưng phải để lại dấu.
  if (error) console.error('nhat ky nhiem vu agent:', error.message);
}

// ── Hiển thị ──────────────────────────────────────────────────────────────────────────────────────
export interface NhiemVuHienThi {
  id: string; agent: TenAgent; ten_agent: string; muc_tieu: string; trang_thai: TrangThaiNhiemVu;
  buoc: { chi_so: number; mo_ta: string; cong_cu: string; xong: boolean; can_duyet: boolean }[];
  buoc_tiep: number; url_hien_tai: string | null; loi: string | null;
  tom_tat: string | null; nguon: { url: string; tieu_de: string | null }[];
  can_duyet: { buoc: number; mo_ta: string } | null;
  ke_hoach_tu: 'mau' | 'mo_hinh' | null;
  tao_luc: string; cap_nhat_luc: string;
}

export function hienThi(nv: DongNhiemVu): NhiemVuHienThi {
  const kh = cheKeHoach(nv.ke_hoach ?? []);
  const kq = nv.ket_qua ?? {};
  const nguon = Array.isArray(kq.nguon) ? (kq.nguon as { url: string; tieu_de: string | null }[]).slice(0, 10) : [];
  const xongHet = nv.trang_thai === 'xong';
  return {
    id: nv.id, agent: nv.agent, ten_agent: DANG_KY_AGENT[nv.agent]?.ten_hien_thi ?? nv.agent, muc_tieu: nv.muc_tieu,
    trang_thai: nv.trang_thai,
    buoc: kh.map((b, i) => ({
      chi_so: i, mo_ta: moTaBuoc(b), cong_cu: b.cong_cu, xong: xongHet || i < nv.buoc_tiep,
      can_duyet: b.cong_cu === 'nhan' && b.tac_dong === 'ngoai' && !nv.da_duyet.includes(i),
    })),
    buoc_tiep: nv.buoc_tiep, url_hien_tai: nv.url_hien_tai, loi: nv.loi,
    tom_tat: typeof kq.tom_tat === 'string' ? kq.tom_tat : null,
    nguon,
    can_duyet: nv.trang_thai === 'cho_duyet' && kh[nv.buoc_tiep]
      ? { buoc: nv.buoc_tiep, mo_ta: moTaBuoc(kh[nv.buoc_tiep]) } : null,
    ke_hoach_tu: kq.ke_hoach_tu === 'mau' || kq.ke_hoach_tu === 'mo_hinh' ? kq.ke_hoach_tu : null,
    tao_luc: nv.tao_luc, cap_nhat_luc: nv.cap_nhat_luc,
  };
}

// ── Tạo ───────────────────────────────────────────────────────────────────────────────────────────
export async function taoNhiemVu(db: Db, o: {
  companyId: string; userId: string; agent: TenAgent; mucTieu: string; buoc: BuocCongCu[]; mien: string[];
  keHoachTu: 'mau' | 'mo_hinh'; khoaChongTrung: string; bayGio?: Date;
}): Promise<{ nhiem_vu: DongNhiemVu; moi: boolean }> {
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(o.khoaChongTrung)) throw new LoiDieuPhoi('THAM_SO', 'Khoá chống trùng không hợp lệ.');
  if (!o.buoc.length || o.buoc.length > SO_BUOC_TOI_DA) throw new LoiDieuPhoi('KE_HOACH', `Kế hoạch phải có 1–${SO_BUOC_TOI_DA} bước.`);
  const { data: cu, error: e1 } = await db.from('nhiem_vu_agent').select('id').eq('company_id', o.companyId).eq('khoa_chong_trung', o.khoaChongTrung).maybeSingle();
  if (e1) throw e1;
  if (cu) return { nhiem_vu: await docDong(db, o.companyId, cu.id), moi: false };
  const bayGio = o.bayGio ?? new Date();
  const dong = {
    id: crypto.randomUUID(), company_id: o.companyId, user_id: o.userId, agent: o.agent, muc_tieu: o.mucTieu.slice(0, 1000),
    ke_hoach: o.buoc, mien_cho_phep: o.mien, trang_thai: 'cho', buoc_tiep: 0, url_hien_tai: null, da_duyet: [],
    ket_qua: { ke_hoach_tu: o.keHoachTu }, loi: null, khoa_chong_trung: o.khoaChongTrung,
    het_han: new Date(bayGio.getTime() + THOI_HAN_NHIEM_VU_GIO * 3600_000).toISOString(), so_luot: 0,
    tao_luc: bayGio.toISOString(), cap_nhat_luc: bayGio.toISOString(),
  };
  const { error } = await db.from('nhiem_vu_agent').insert(dong);
  if (error) {
    // Hai lần tạo cùng khoá chạy song song: lần sau đụng UNIQUE → trả lại dòng của lần trước.
    if (String(error.code) === '23505') {
      const { data: lai } = await db.from('nhiem_vu_agent').select('id').eq('company_id', o.companyId).eq('khoa_chong_trung', o.khoaChongTrung).maybeSingle();
      if (lai) return { nhiem_vu: await docDong(db, o.companyId, lai.id), moi: false };
    }
    throw error;
  }
  await ghiNhatKy(db, dong, [{
    tac_nhan: 'nguoi_dung', hanh_dong: 'tao', ok: true,
    tom_tat: `${DANG_KY_AGENT[o.agent].ten_hien_thi}, ${o.buoc.length} bước (${o.keHoachTu === 'mau' ? 'mẫu' : 'mô hình lập, đã kiểm'}).`,
  }]);
  return { nhiem_vu: dong as DongNhiemVu, moi: true };
}

// ── Duyệt / huỷ / xem / ds ────────────────────────────────────────────────────────────────────────
export async function duyetBuoc(db: Db, o: { companyId: string; id: string; buoc: number; bayGio?: Date }) {
  const nv = await docDong(db, o.companyId, o.id);
  if (nv.trang_thai !== 'cho_duyet') throw new LoiDieuPhoi('KHONG_CHO_DUYET', 'Nhiệm vụ không đang chờ duyệt.', 409);
  // Chỉ duyệt ĐÚNG bước runtime đang dừng — không duyệt trước bước khác (người dùng phải thấy từng bước).
  if (!Number.isInteger(o.buoc) || o.buoc !== nv.buoc_tiep) throw new LoiDieuPhoi('SAI_BUOC', 'Chỉ duyệt được bước đang chờ.', 409);
  if (daThuNgoai(nv).includes(o.buoc)) throw new LoiDieuPhoi('DA_THU', 'Bước này đã thử một lần — không chạy lại.', 409);
  const moi = await chuyen(db, nv, 'cho', { da_duyet: [...new Set([...nv.da_duyet, o.buoc])] }, o.bayGio);
  await ghiNhatKy(db, nv, [{ tac_nhan: 'nguoi_dung', hanh_dong: 'duyet_buoc', buoc: o.buoc, ok: true, tom_tat: moTaBuoc(cheKeHoach(nv.ke_hoach)[o.buoc]) }]);
  return moi;
}

export async function huyNhiemVu(db: Db, o: { companyId: string; id: string; bayGio?: Date }) {
  const nv = await docDong(db, o.companyId, o.id);
  if (nv.trang_thai === 'huy') return nv;
  const moi = await chuyen(db, nv, 'huy', {}, o.bayGio);
  await ghiNhatKy(db, nv, [{ tac_nhan: 'nguoi_dung', hanh_dong: 'huy', ok: true }]);
  return moi;
}

export const xemNhiemVu = (db: Db, o: { companyId: string; id: string }) => docDong(db, o.companyId, o.id);

export async function dsNhiemVu(db: Db, companyId: string): Promise<DongNhiemVu[]> {
  const { data, error } = await db.from('nhiem_vu_agent').select(COT).eq('company_id', companyId).order('tao_luc', { ascending: false }).limit(20);
  if (error) throw error;
  return (data ?? []) as DongNhiemVu[];
}

export async function docNhatKy(db: Db, companyId: string, id: string) {
  const { data } = await db.from('nhat_ky_nhiem_vu_agent').select('luot, buoc, cong_cu, tac_dong, ok, ms, tom_tat, loi, tac_nhan, hanh_dong, luc')
    .eq('nhiem_vu_id', id).eq('company_id', companyId).order('luc', { ascending: true }).limit(200);
  return data ?? [];
}

// ── Chạy ──────────────────────────────────────────────────────────────────────────────────────────
export interface KetQuaBuoc { buoc: number; cong_cu: string; tac_dong: 'doc' | 'ngoai'; ok: boolean; du_lieu?: unknown; loi?: string; ms: number }
export interface KetQuaLuot {
  nhiem_vu_id: string; trang_thai: 'xong' | 'tiep' | 'cho_duyet' | 'ban_giao' | 'loi';
  buoc_tiep: number; url_hien_tai: string | null; ket_qua_buoc: KetQuaBuoc[]; loi?: string;
}

/** Kết quả runtime là đầu vào từ bên ngoài: kiểm khuôn, không tin mù. */
export function docKetQuaLuot(j: unknown, nhiemVuId: string, soBuoc: number): KetQuaLuot | null {
  if (!j || typeof j !== 'object') return null;
  const x = j as Record<string, unknown>;
  if (x.nhiem_vu_id !== nhiemVuId) return null;
  if (!['xong', 'tiep', 'cho_duyet', 'ban_giao', 'loi'].includes(String(x.trang_thai))) return null;
  const bt = Number(x.buoc_tiep);
  if (!Number.isInteger(bt) || bt < 0 || bt > soBuoc) return null;
  if (!Array.isArray(x.ket_qua_buoc)) return null;
  const kqb: KetQuaBuoc[] = [];
  for (const r0 of x.ket_qua_buoc.slice(0, SO_BUOC_TOI_DA)) {
    const r = r0 as Record<string, unknown>;
    const b = Number(r?.buoc);
    if (!Number.isInteger(b) || b < 0 || b >= soBuoc) return null;
    kqb.push({
      buoc: b, cong_cu: String(r.cong_cu ?? '').slice(0, 30), tac_dong: r.tac_dong === 'ngoai' ? 'ngoai' : 'doc', ok: r.ok === true,
      du_lieu: r.du_lieu, loi: typeof r.loi === 'string' ? r.loi.slice(0, 300) : undefined, ms: Number.isFinite(Number(r.ms)) ? Math.max(0, Math.round(Number(r.ms))) : 0,
    });
  }
  const url = typeof x.url_hien_tai === 'string' && x.url_hien_tai.length <= 2000 ? x.url_hien_tai : null;
  return { nhiem_vu_id: nhiemVuId, trang_thai: x.trang_thai as KetQuaLuot['trang_thai'], buoc_tiep: bt, url_hien_tai: url, ket_qua_buoc: kqb, loi: typeof x.loi === 'string' ? x.loi.slice(0, 300) : undefined };
}

/** Các bước 'ngoai' đã gửi đi thử (thành công, lỗi hay chưa rõ) — không bao giờ được gửi duyệt lần nữa. */
export const daThuNgoai = (nv: DongNhiemVu): number[] => (Array.isArray(nv.ket_qua?.ngoai_da_thu) ? (nv.ket_qua.ngoai_da_thu as number[]) : []);

/** Tóm tắt dữ liệu một bước để ghi nhật ký: không lưu ảnh, không lưu giá trị điền. */
function tomTatBuoc(b: BuocCongCu | undefined, r: KetQuaBuoc): string | null {
  if (!b) return null;
  if (b.cong_cu === 'dien') return `Điền ô "${b.nhan}" (giá trị đã che)`;
  if (b.cong_cu === 'chup_man_hinh') return 'Ảnh chụp màn hình (không lưu trong nhật ký)';
  const d = r.du_lieu;
  if (typeof d === 'string') return d.replace(/\s+/g, ' ').slice(0, 300);
  if (d && typeof d === 'object') {
    const o = d as Record<string, unknown>;
    if (typeof o.url === 'string' || typeof o.tieu_de === 'string') return `${String(o.tieu_de ?? '').slice(0, 150)} — ${String(o.url ?? '').slice(0, 200)}`;
    if (typeof o.noi_dung === 'string') return o.noi_dung.replace(/\s+/g, ' ').slice(0, 300);
  }
  return moTaBuoc(b);
}

/** Gom dữ liệu đọc được qua các lượt để tóm tắt: nội dung trang + nguồn (URL, tiêu đề). */
function gomDuLieu(ketQua: Record<string, unknown>, buoc: BuocCongCu[], kqb: KetQuaBuoc[], urlHienTai: string | null) {
  const trang = Array.isArray(ketQua.trang) ? [...(ketQua.trang as { url: string | null; noi_dung: string }[])] : [];
  const nguon = Array.isArray(ketQua.nguon) ? [...(ketQua.nguon as { url: string; tieu_de: string | null }[])] : [];
  for (const r of kqb) {
    if (!r.ok) continue;
    const b = buoc[r.buoc];
    const d = r.du_lieu as Record<string, unknown> | string | undefined;
    if (b?.cong_cu === 'doc_noi_dung') {
      const nd = typeof d === 'string' ? d : typeof d?.noi_dung === 'string' ? d.noi_dung : typeof d?.chu === 'string' ? d.chu : '';
      if (nd) trang.push({ url: (typeof d === 'object' && typeof d?.url === 'string' ? d.url : null) ?? urlHienTai, noi_dung: nd.slice(0, 8000) });
    }
    if (b?.cong_cu === 'lay_url_tieu_de' && d && typeof d === 'object' && typeof d.url === 'string') {
      nguon.push({ url: d.url.slice(0, 2000), tieu_de: typeof d.tieu_de === 'string' ? d.tieu_de.slice(0, 300) : null });
    }
  }
  if (urlHienTai && !nguon.some((n) => n.url === urlHienTai)) nguon.push({ url: urlHienTai, tieu_de: null });
  return { trang: trang.slice(-4), nguon: nguon.slice(-10) };
}

export interface PhuThuocChay {
  /** Khoá ký; null → "runtime chưa cấu hình". */
  khoa: CryptoKey | null;
  /** URL runtime; rỗng → "runtime chưa cấu hình". */
  runtimeUrl: string | null;
  /** Gọi runtime. Ném lỗi = mất kết nối/hết giờ (chưa rõ runtime đã làm tới đâu). */
  goiRuntime: (url: string, lenh: Record<string, unknown>, jwt: string) => Promise<unknown>;
  /** Tóm tắt khi xong (có thể dùng mô hình, đã trừ xu ở nơi gọi). */
  tomTat: (mucTieu: string, trang: { url: string | null; noi_dung: string }[]) => Promise<string>;
  bayGio?: () => Date;
  soLuot?: number;
  tongThoiGianMs?: number;
}

export class LoiChuaCauHinh extends LoiDieuPhoi {
  constructor() { super('RUNTIME_CHUA_CAU_HINH', 'Runtime chưa cấu hình (thiếu khoá ký hoặc địa chỉ runtime) — agent chưa chạy được, MIMI không giả vờ chạy.', 503); }
}

/**
 * Chạy nhiệm vụ tới khi xong / cho_duyet / ban_giao / loi, hoặc hết số lượt / thời gian (→ về 'cho', chạy tiếp được).
 * `nguoiDungId` là người đang bấm chạy — runtime so với `sub` trong JWT gửi kèm.
 */
export async function chayNhiemVu(db: Db, o: { companyId: string; id: string; nguoiDungId: string; jwt: string }, p: PhuThuocChay): Promise<DongNhiemVu> {
  if (!p.khoa || !p.runtimeUrl) throw new LoiChuaCauHinh();
  const bayGio = p.bayGio ?? (() => new Date());
  const batDau = bayGio().getTime();
  let nv = await docDong(db, o.companyId, o.id);
  if (nv.trang_thai !== 'cho') {
    if (['xong', 'loi', 'huy', 'het_han', 'ban_giao', 'cho_duyet'].includes(nv.trang_thai)) return nv; // không có gì để chạy
    throw new LoiDieuPhoi('DANG_CHAY', 'Nhiệm vụ đang chạy ở nơi khác.', 409);
  }
  if (new Date(nv.het_han).getTime() < batDau) return await chuyen(db, nv, 'het_han', {}, bayGio());
  nv = await chuyen(db, nv, 'dang_chay', { loi: null }, bayGio());

  const soLuot = p.soLuot ?? SO_LUOT_MOI_LAN_CHAY;
  const tong = p.tongThoiGianMs ?? TONG_THOI_GIAN_MS;
  for (let l = 0; l < soLuot; l++) {
    const conLai = tong - (bayGio().getTime() - batDau);
    if (conLai < 20_000) break;
    const nganSach = Math.min(NGAN_SACH_LUOT_MS, conLai - 15_000);
    const daThu = daThuNgoai(nv);
    // Gạch bước 'ngoai' đã thử khỏi danh sách duyệt gửi đi: kể cả có lỗi logic chỗ khác, runtime cũng không chạy lại.
    const daDuyetGui = nv.da_duyet.filter((i) => !daThu.includes(i));
    const lenh = await kyLenh({
      phien_ban: 1, nhiem_vu_id: nv.id, cong_ty_id: nv.company_id, nguoi_dung_id: o.nguoiDungId, agent: nv.agent,
      mien_cho_phep: nv.mien_cho_phep, url_bat_dau: nv.url_hien_tai, tu_buoc: nv.buoc_tiep, buoc: nv.ke_hoach,
      da_duyet: daDuyetGui, ngan_sach_ms: nganSach, het_han: new Date(bayGio().getTime() + HAN_LENH_MS).toISOString(),
      nonce: sangBase64Url(crypto.getRandomValues(new Uint8Array(18))),
    }, p.khoa);
    const soLuotMoi = nv.so_luot + 1;
    // Bước 'ngoai' đã duyệt mà lượt này có thể chạm tới — mất kết nối thì KHÔNG biết nó đã chạy chưa.
    const ngoaiCoTheChay = nv.ke_hoach.map((b, i) => ({ b, i }))
      .filter(({ b, i }) => i >= nv.buoc_tiep && b.cong_cu === 'nhan' && daDuyetGui.includes(i)).map(({ i }) => i);

    let tho: unknown;
    try {
      tho = await p.goiRuntime(p.runtimeUrl, lenh, o.jwt);
    } catch (e) {
      const cau = e instanceof Error ? e.message.slice(0, 200) : 'mất kết nối';
      if (ngoaiCoTheChay.length) {
        await ghiNhatKy(db, nv, [{ tac_nhan: 'may_chu', hanh_dong: 'khong_ro', luot: soLuotMoi, ok: false, loi: `Mất kết nối runtime khi có bước cần duyệt: ${cau}` }]);
        return await chuyen(db, nv, 'loi', {
          so_luot: soLuotMoi, loi: 'Chưa rõ kết quả bước đã duyệt (mất kết nối runtime) — MIMI không chạy lại. Kiểm tra trên cổng.',
          ket_qua: { ...nv.ket_qua, ngoai_da_thu: [...new Set([...daThu, ...ngoaiCoTheChay])] },
        }, bayGio());
      }
      await ghiNhatKy(db, nv, [{ tac_nhan: 'may_chu', hanh_dong: 'goi_runtime', luot: soLuotMoi, ok: false, loi: cau }]);
      return await chuyen(db, nv, 'cho', { so_luot: soLuotMoi, loi: `Chưa gọi được runtime: ${cau}. Bấm chạy lại.` }, bayGio());
    }

    const kq = docKetQuaLuot(tho, nv.id, nv.ke_hoach.length);
    if (!kq) {
      // Runtime trả sai khuôn: coi như chưa rõ nếu lượt có bước 'ngoai' đã duyệt.
      return await chuyen(db, nv, 'loi', {
        so_luot: soLuotMoi, loi: ngoaiCoTheChay.length ? 'Runtime trả kết quả sai khuôn — chưa rõ kết quả bước đã duyệt, không chạy lại.' : 'Runtime trả kết quả sai khuôn.',
        ket_qua: { ...nv.ket_qua, ngoai_da_thu: [...new Set([...daThu, ...ngoaiCoTheChay])] },
      }, bayGio());
    }

    // Ghi nhật ký từng bước.
    await ghiNhatKy(db, nv, kq.ket_qua_buoc.map((r) => ({
      tac_nhan: 'runtime' as const, hanh_dong: 'buoc', luot: soLuotMoi, buoc: r.buoc, cong_cu: r.cong_cu, tac_dong: r.tac_dong,
      ok: r.ok, ms: r.ms, tom_tat: tomTatBuoc(nv.ke_hoach[r.buoc], r), loi: r.loi ?? null,
    })));

    const ngoaiDaThu = [...new Set([...daThu, ...kq.ket_qua_buoc.filter((r) => r.tac_dong === 'ngoai').map((r) => r.buoc)])];
    const gom = gomDuLieu(nv.ket_qua, nv.ke_hoach, kq.ket_qua_buoc, kq.url_hien_tai);
    const ketQua = { ...nv.ket_qua, ngoai_da_thu: ngoaiDaThu, trang: gom.trang, nguon: gom.nguon };
    const chung = { so_luot: soLuotMoi, buoc_tiep: kq.buoc_tiep, url_hien_tai: kq.url_hien_tai };

    switch (kq.trang_thai) {
      case 'tiep':
        if (kq.buoc_tiep <= nv.buoc_tiep && kq.ket_qua_buoc.length === 0) {
          return await chuyen(db, nv, 'loi', { ...chung, ket_qua: ketQua, loi: 'Runtime không tiến thêm bước nào.' }, bayGio());
        }
        nv = await capNhat(db, nv, { ...chung, ket_qua: ketQua }, bayGio());
        continue;
      case 'cho_duyet':
        return await chuyen(db, nv, 'cho_duyet', { ...chung, ket_qua: ketQua }, bayGio());
      case 'ban_giao':
        return await chuyen(db, nv, 'ban_giao', { ...chung, ket_qua: ketQua, loi: kq.loi ?? 'Cần bạn tự làm (đăng nhập, OTP hoặc mã xác nhận).' }, bayGio());
      case 'loi': {
        const hongNgoai = kq.ket_qua_buoc.some((r) => r.tac_dong === 'ngoai' && !r.ok);
        return await chuyen(db, nv, 'loi', {
          ...chung, ket_qua: ketQua,
          loi: hongNgoai ? `Chưa rõ kết quả bước cần duyệt — MIMI không chạy lại. ${kq.loi ?? ''}`.trim() : (kq.loi ?? 'Runtime báo lỗi.'),
        }, bayGio());
      }
      case 'xong': {
        let tomTat: string;
        try {
          tomTat = (await p.tomTat(nv.muc_tieu, gom.trang)).slice(0, 2000);
        } catch {
          tomTat = '';
        }
        // Đã có tóm tắt thì bỏ nội dung thô khỏi kết quả lưu — giữ bảng nhỏ, không giữ trang lâu hơn cần.
        return await chuyen(db, nv, 'xong', { ...chung, ket_qua: { ...ketQua, tom_tat: tomTat || null, trang: tomTat ? [] : gom.trang } }, bayGio());
      }
    }
  }
  // Hết lượt/thời gian trong lần gọi này: trả về 'cho', người dùng (hoặc giao diện) gọi chạy tiếp.
  return await chuyen(db, nv, 'cho', { loi: null }, bayGio());
}
