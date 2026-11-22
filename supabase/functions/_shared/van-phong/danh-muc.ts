/**
 * VĂN PHÒNG KẾ TOÁN (11/11/2026) — danh mục khách của người đang đăng nhập, cho trang /dashboard/van-phong.
 *
 * Một văn phòng kế toán dịch vụ giữ sổ cho nhiều hộ kinh doanh; mỗi hộ là một công ty trong MIMI mà kế toán là
 * thành viên. Trang văn phòng cần, cho TỪNG khách, đúng những con số các màn khác đã tính — không tính lại kiểu khác:
 *   - doanh thu năm nay dạng KHOẢNG + ngưỡng 01 tỷ / 03 tỷ (`doanh-thu/so-lieu.ts`, `do-chac-chan.ts`);
 *   - số khoản tiền vào chờ chủ xác nhận (cùng số liệu đó: `so_chua_ro`);
 *   - sẵn sàng khai thuế + mốc kế tiếp (`luat/doc-lich-thue.ts` → `san-sang-thue.ts`, `lich-thue.ts`);
 *   - hồ sơ việc còn mở (`ho_so_viec`); bán tại quầy hôm nay (`ban_hang_pos`, nếu bảng có);
 *   - hoạt động của các agent trong 24 giờ (`nhiem_vu_agent`, `thong_bao`, `revenue_classification_events`).
 *
 * QUYỀN. Chỉ công ty mà người gọi là chủ sở hữu, quản trị hoặc kế toán. Người duyệt chi / người xem không thấy
 * văn phòng (họ không làm sổ). Thành viên bị giới hạn vào MỘT cơ sở (`biGioiHan`) bị LOẠI hẳn khỏi danh mục chứ không
 * hiện số một phần: doanh thu, thuế, ngưỡng đều là số của cả công ty, mà họ không được đọc (`da-co-so/pham-vi.ts`).
 * Mọi truy vấn lọc theo đúng tập công ty đã qua kiểm thành viên ở bước 1; dòng trả về mang công ty khác bị bỏ.
 *
 * TẤT ĐỊNH. Không gọi mô hình. Cùng dữ liệu, cùng giờ → cùng kết quả, cùng thứ tự.
 *
 * GIỚI HẠN. Tính tối đa `TOI_DA_CONG_TY` khách mỗi lần (theo tên), song song `SONG_SONG`; phân trang trên danh sách đã
 * xếp "cần làm trước". Quá trần thì nói số khách bị bỏ ngoài (`loai_tru.vuot_tran`), không im lặng cắt.
 */
import { docNguonTienVao, dungSoLieuDoanhThu, ngayVN, type SoLieuDoanhThu } from '../doanh-thu/so-lieu.ts';
import type { TrangThaiDoChacChan } from '../doanh-thu/do-chac-chan.ts';
import { docHet } from '../doc-het.ts';
import { docLichCongTy } from '../luat/doc-lich-thue.ts';
import { mocKeTiep, type LoaiMoc } from '../luat/lich-thue.ts';
import type { TrangThaiSanSang } from '../luat/san-sang-thue.ts';
import { biGioiHan } from '../da-co-so/pham-vi.ts';
import { laVaiTro, type VaiTro } from '../quyen/vai-tro.ts';
import { chieuTien, doLonTien } from '../tien/chieu-tien.ts';
import type { PhanLoaiHoatDong } from '../doanh-thu/theo-hoat-dong.ts';
import { deXuatDieuHuong, deXuatPhanLoai, soSanhDeXuat, TOI_DA_HANG_DUYET, type DeXuat, type YKienNgoai } from './hang-duyet.ts';
import { LOAI_PHAN_LOAI, type LoaiPhanLoai } from '../doanh-thu/phan-loai.ts';

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

/** Vai trò làm sổ: thấy văn phòng. */
export const VAI_TRO_VAN_PHONG: readonly VaiTro[] = ['chu_so_huu', 'quan_tri', 'ke_toan'];
export const TOI_DA_THANH_VIEN = 500;
export const TOI_DA_CONG_TY = 100;
export const KICH_THUOC_MAC_DINH = 24;
export const KICH_THUOC_TOI_DA = 50;
export const SONG_SONG = 6;
/** Trần dòng đọc mỗi bảng hoạt động cho cả danh mục — đủ cho 100 khách bận rộn trong 24 giờ. */
export const TRAN_HOAT_DONG = 2000;
export const NGAY_CUA_SO_DONG_TIEN = 30;
/** Ngưỡng hạn: "gấp" và "sắp tới". Tham số sản phẩm, không phải luật. */
export const HAN_GAP_NGAY = 7;
export const HAN_SAP_NGAY = 30;

export type MucKhach = 'do' | 'vang' | 'xanh';
export type MaLyDo =
  | 'khong_doc_duoc'
  | 'han_gan_chua_san_sang'
  | 'viec_chan'
  | 'nguong_chua_chac'
  | 'to_khai_bi_chan'
  | 'tien_vao_cho_xac_nhan'
  | 'han_trong_30_ngay'
  | 'viec_mo'
  | 'dong_tien_am_30_ngay'
  | 'to_khai_thieu_du_lieu'
  | 'can_xac_minh_nghia_vu'
  | 'da_vuot_nguong';

export interface LyDo { ma: MaLyDo; muc: MucKhach; so?: number; nguong?: number; ngay?: string | null }

export type TenAgentVP = 'phan_loai' | 'thue' | 'du_bao' | 'ban_hang' | 'tai_lieu';
export const AGENT_VAN_PHONG: readonly TenAgentVP[] = ['phan_loai', 'thue', 'du_bao', 'ban_hang', 'tai_lieu'];

export interface NguongKhach { ma: string; gia_tri: number; phia: 'tren' | 'duoi' | 'chua_chac' }

export interface KhachVanPhong {
  id: string;
  ten: string;
  vai_tro: VaiTro;
  la_demo: boolean;
  muc: MucKhach;
  ly_do: LyDo[];
  doanh_thu: {
    nam: number;
    uoc_tinh: number;
    can_duoi: number;
    can_tren: number;
    trang_thai: TrangThaiDoChacChan;
    nguong: NguongKhach[];
    /** Khoảng doanh thu cắt ngưỡng 01 tỷ hoặc 03 tỷ: chưa được kết luận vượt hay không. */
    can_xem: boolean;
  } | null;
  tien_vao_cho_xac_nhan: { so_khoan: number; so_tien: number } | null;
  thue: {
    trang_thai: TrangThaiSanSang;
    ten_viec: string | null;
    han: string | null;
    con_lai: number | null;
    moc_ke_tiep: { ten: string; loai: LoaiMoc; han: string | null; con_lai: number | null } | null;
  } | null;
  viec_mo: { so: number; chan: number; gap: number };
  /** null: máy chủ chưa có bảng bán tại quầy. */
  ban_hang_hom_nay: { so_lan: number; tong: number; gan_nhat: string | null } | null;
  dong_tien_30_ngay: { tu: string; tien_vao: number; tien_ra: number; rong: number } | null;
  hoat_dong_24h: {
    phan_loai: number;
    thong_bao: number;
    nhiem_vu: { agent: string; trang_thai: string; luc: string }[];
    gan_nhat: string | null;
  };
  loi: string | null;
}

export interface AgentDangLam {
  agent: TenAgentVP;
  company_id: string | null;
  /** su_kien_24h: có việc THẬT trong 24 giờ qua; viec_cho: không có sự kiện mới, đang đứng ở khách có việc chờ. */
  ly_do: 'su_kien_24h' | 'viec_cho' | null;
  luc: string | null;
  so: number;
}

export interface DanhMucKhach {
  hom_nay: string;
  nam: number;
  tong: number;
  trang: number;
  kich_thuoc: number;
  so_trang: number;
  khach: KhachVanPhong[];
  agent: AgentDangLam[];
  dem: { do: number; vang: number; xanh: number };
  loai_tru: { gioi_han_co_so: number; vai_tro_khong_lam_so: number; vuot_tran: number };
  co_bang_ban_hang: boolean;
  /** Hàng duyệt kiểu Cursor trên mọi khách đã tính (không chỉ trang này), nặng trước — xem `hang-duyet.ts`. */
  hang_duyet: DeXuat[];
  /** Tổng số đề xuất trước khi cắt ở `TOI_DA_HANG_DUYET`. */
  hang_duyet_tong: number;
}

// ── Thời gian theo giờ Việt Nam ─────────────────────────────────────────────

const GMT7 = 7 * 3_600_000;
export const homNayVN = (bayGio: number) => new Date(bayGio + GMT7).toISOString().slice(0, 10);
const congNgay = (ymd: string, n: number) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
/** Nửa đêm hôm nay giờ Việt Nam, dạng ISO UTC để lọc cột timestamptz. */
const dauNgayVN = (ymd: string) => new Date(Date.parse(`${ymd}T00:00:00Z`) - GMT7).toISOString();

// ── Đọc ─────────────────────────────────────────────────────────────────────

export interface ThanhVien { company_id: string; ten: string; vai_tro: VaiTro; co_so_id: string | null; la_demo: boolean }

export async function docThanhVien(db: Db, userId: string): Promise<{ duoc: ThanhVien[]; gioiHan: number; khongLamSo: number }> {
  const { data, error } = await db.from('thanh_vien_cong_ty')
    .select('company_id, vai_tro, co_so_id, tao_luc, companies!inner(id, name, la_demo)')
    .eq('user_id', userId).order('tao_luc', { ascending: true }).limit(TOI_DA_THANH_VIEN);
  if (error) throw new Error(`Không đọc được danh sách công ty: ${error.message}`);
  const duoc: ThanhVien[] = [];
  let gioiHan = 0, khongLamSo = 0;
  const daCo = new Set<string>();
  for (const r of (data ?? []) as Row[]) {
    const ct = Array.isArray(r.companies) ? r.companies[0] : r.companies;
    if (!ct || !laVaiTro(r.vai_tro) || String(ct.id) !== String(r.company_id) || daCo.has(String(ct.id))) continue;
    daCo.add(String(ct.id));
    if (!VAI_TRO_VAN_PHONG.includes(r.vai_tro)) { khongLamSo++; continue; }
    if (biGioiHan(r.vai_tro, r.co_so_id)) { gioiHan++; continue; }
    duoc.push({ company_id: String(ct.id), ten: String(ct.name ?? '').trim() || '—', vai_tro: r.vai_tro, co_so_id: r.co_so_id ?? null, la_demo: ct.la_demo === true });
  }
  return { duoc, gioiHan, khongLamSo };
}

const thieuBang = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|could not find the table/i.test(e.message ?? ''));

/** Đọc một bảng hoạt động cho cả tập công ty; bỏ mọi dòng mang công ty ngoài tập (phòng truy vấn hỏng). */
async function docTheoTap(
  ten: string, ids: Set<string>, q: PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>, choPhepThieu = false,
): Promise<Row[] | null> {
  const { data, error } = await q;
  if (error) {
    if (choPhepThieu && thieuBang(error)) return null;
    throw new Error(`Không đọc được ${ten}: ${error.message}`);
  }
  return ((data ?? []) as Row[]).filter((r) => ids.has(String(r.company_id)));
}

interface SoLieuMotKhach { s: SoLieuDoanhThu; lich: Awaited<ReturnType<typeof docLichCongTy>>; giaoDich: Row[]; noiBo: Set<string>; xacNhan: Row[] }

async function docMotKhach(db: Db, tv: ThanhVien, nam: number, homNay: string): Promise<SoLieuMotKhach> {
  const [nguon, phanLoai] = await Promise.all([
    docNguonTienVao(db, tv.company_id, nam, tv.la_demo, ', merchant_name, counter_account_name, payment_reference'),
    docHet((a, b) => db.from('phan_loai_hoat_dong')
      .select('nguon, nguon_id, hoat_dong')
      .eq('company_id', tv.company_id).order('id', { ascending: true }).range(a, b), 'nhóm hoạt động'),
  ]);
  const s = dungSoLieuDoanhThu(nam, nguon, phanLoai as PhanLoaiHoatDong[]);
  const lich = await docLichCongTy(db, tv.company_id, { nam, homNay, laDemo: tv.la_demo, s });
  return { s, lich, giaoDich: nguon.giao_dich, noiBo: nguon.noi_bo.internalIds, xacNhan: nguon.xac_nhan };
}

async function songSong<T, R>(ds: T[], n: number, f: (x: T) => Promise<R>): Promise<R[]> {
  const ra = new Array<R>(ds.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, ds.length) }, async () => {
    while (i < ds.length) { const k = i++; ra[k] = await f(ds[k]); }
  }));
  return ra;
}

// ── Thuần: từ số liệu sang khách ──────────────────────────────────────────────

const so = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/** Dòng tiền ròng của cửa sổ 30 ngày tới hôm nay (trong năm đang đọc), bỏ chuyển giữa tài khoản của chính mình. */
export function dongTien30Ngay(giaoDich: Row[], noiBo: Set<string>, homNay: string): { tu: string; tien_vao: number; tien_ra: number; rong: number } {
  const dauNam = `${homNay.slice(0, 4)}-01-01`;
  const tu = [congNgay(homNay, -(NGAY_CUA_SO_DONG_TIEN - 1)), dauNam].sort()[1];
  let vao = 0, ra = 0;
  const daThay = new Set<string>();
  for (const t of giaoDich) {
    const id = String(t.id);
    if (daThay.has(id) || noiBo.has(id)) continue;
    daThay.add(id);
    const ngay = ngayVN(t.transaction_date);
    if (ngay < tu || ngay > homNay) continue;
    const c = chieuTien(t);
    if (c === 'vao') vao += doLonTien(t);
    else if (c === 'ra') ra += doLonTien(t);
  }
  return { tu, tien_vao: Math.round(vao), tien_ra: Math.round(ra), rong: Math.round(vao - ra) };
}

const HANG: Record<MucKhach, number> = { do: 0, vang: 1, xanh: 2 };

/** Đèn của một khách và lý do, theo thứ tự nặng trước. */
export function danhGiaKhach(k: Omit<KhachVanPhong, 'muc' | 'ly_do'>): { muc: MucKhach; ly_do: LyDo[] } {
  const ly: LyDo[] = [];
  if (k.loi) ly.push({ ma: 'khong_doc_duoc', muc: 'vang' });
  const t = k.thue;
  const chuaSanSang = !!t && t.trang_thai !== 'san_sang' && t.trang_thai !== 'khong_co_viec';
  const moc = t?.moc_ke_tiep ?? null;
  const conLai = moc?.con_lai ?? null;
  if (chuaSanSang && conLai !== null && conLai <= HAN_GAP_NGAY) ly.push({ ma: 'han_gan_chua_san_sang', muc: 'do', so: conLai, ngay: moc?.han ?? null });
  if (k.viec_mo.chan > 0) ly.push({ ma: 'viec_chan', muc: 'do', so: k.viec_mo.chan });
  for (const n of k.doanh_thu?.nguong ?? []) {
    if (n.ma !== 'mien_thue_1_ty' && n.ma !== 'phuong_phap_3_ty') continue;
    if (n.phia === 'chua_chac') ly.push({ ma: 'nguong_chua_chac', muc: 'do', nguong: n.gia_tri });
  }
  if (t?.trang_thai === 'bi_chan') ly.push({ ma: 'to_khai_bi_chan', muc: conLai !== null && conLai <= HAN_SAP_NGAY ? 'do' : 'vang' });
  if ((k.tien_vao_cho_xac_nhan?.so_khoan ?? 0) > 0) ly.push({ ma: 'tien_vao_cho_xac_nhan', muc: 'vang', so: k.tien_vao_cho_xac_nhan!.so_khoan });
  if (conLai !== null && conLai <= HAN_SAP_NGAY && !ly.some((l) => l.ma === 'han_gan_chua_san_sang')) {
    ly.push({ ma: 'han_trong_30_ngay', muc: chuaSanSang ? 'vang' : 'xanh', so: conLai, ngay: moc?.han ?? null });
  }
  const viecThuong = k.viec_mo.so - k.viec_mo.chan;
  if (viecThuong > 0) ly.push({ ma: 'viec_mo', muc: 'vang', so: viecThuong });
  if (k.dong_tien_30_ngay && k.dong_tien_30_ngay.rong < 0) ly.push({ ma: 'dong_tien_am_30_ngay', muc: 'vang', so: -k.dong_tien_30_ngay.rong });
  if (t?.trang_thai === 'thieu_du_lieu') ly.push({ ma: 'to_khai_thieu_du_lieu', muc: 'vang' });
  if (t?.trang_thai === 'can_xac_minh') ly.push({ ma: 'can_xac_minh_nghia_vu', muc: 'vang' });
  for (const n of k.doanh_thu?.nguong ?? []) {
    if ((n.ma === 'mien_thue_1_ty' || n.ma === 'phuong_phap_3_ty') && n.phia === 'tren') ly.push({ ma: 'da_vuot_nguong', muc: 'xanh', nguong: n.gia_tri });
  }
  ly.sort((a, b) => HANG[a.muc] - HANG[b.muc]);
  const muc: MucKhach = ly.some((l) => l.muc === 'do') ? 'do' : ly.some((l) => l.muc === 'vang') ? 'vang' : 'xanh';
  return { muc, ly_do: ly };
}

/** "Cần làm trước": đỏ → vàng → xanh; trong cùng màu: nhiều việc nặng hơn, hạn gần hơn, nhiều tiền chờ hơn, rồi tên. */
export function soSanhKhach(a: KhachVanPhong, b: KhachVanPhong): number {
  const nang = (k: KhachVanPhong) => k.ly_do.filter((l) => l.muc !== 'xanh').length;
  const han = (k: KhachVanPhong) => k.thue?.moc_ke_tiep?.con_lai ?? Number.POSITIVE_INFINITY;
  const cho = (k: KhachVanPhong) => k.tien_vao_cho_xac_nhan?.so_khoan ?? 0;
  return (HANG[a.muc] - HANG[b.muc])
    || (nang(b) - nang(a))
    || (han(a) - han(b))
    || (cho(b) - cho(a))
    || a.ten.localeCompare(b.ten, 'vi')
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

const AGENT_TU_NHIEM_VU: Record<string, TenAgentVP> = { thue: 'thue', tai_chinh: 'du_bao', tai_lieu: 'tai_lieu', trinh_duyet: 'tai_lieu' };
const AGENT_TU_THONG_BAO: Record<string, TenAgentVP> = { han_thue: 'thue', tien_vao: 'phan_loai' };

export interface SuKienAgent { agent: TenAgentVP; company_id: string; luc: string }

/**
 * Mỗi agent đứng ở MỘT bàn. Ưu tiên việc thật trong 24 giờ (sự kiện mới nhất thắng); không có thì tới khách có việc
 * chờ đúng sở trường của agent; không có nữa thì ngồi nghỉ (company_id null). Tất định: hoà thì theo id.
 */
export function phanCongAgent(khach: KhachVanPhong[], suKien: SuKienAgent[]): AgentDangLam[] {
  const ids = new Set(khach.map((k) => k.id));
  const cmpId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const choViec: Record<TenAgentVP, (k: KhachVanPhong) => number> = {
    phan_loai: (k) => k.tien_vao_cho_xac_nhan?.so_khoan ?? 0,
    // Hạn càng gần càng cần; chỉ khi chưa sẵn sàng và trong 30 ngày.
    thue: (k) => {
      const t = k.thue; const c = t?.moc_ke_tiep?.con_lai;
      if (!t || c === null || c === undefined || c > HAN_SAP_NGAY || t.trang_thai === 'san_sang' || t.trang_thai === 'khong_co_viec') return 0;
      return HAN_SAP_NGAY + 1 - c;
    },
    du_bao: (k) => (k.dong_tien_30_ngay && k.dong_tien_30_ngay.rong < 0 ? -k.dong_tien_30_ngay.rong : 0),
    ban_hang: () => 0,
    // Hồ sơ "chặn" nặng hơn mười hồ sơ thường.
    tai_lieu: (k) => k.viec_mo.so + 10 * k.viec_mo.chan,
  };
  return AGENT_VAN_PHONG.map((agent) => {
    const cua = suKien.filter((e) => e.agent === agent && ids.has(e.company_id));
    if (cua.length) {
      const moi = [...cua].sort((a, b) => (b.luc < a.luc ? -1 : b.luc > a.luc ? 1 : cmpId(a.company_id, b.company_id)))[0];
      return { agent, company_id: moi.company_id, ly_do: 'su_kien_24h' as const, luc: moi.luc, so: cua.filter((e) => e.company_id === moi.company_id).length };
    }
    let tot: KhachVanPhong | null = null, diem = 0;
    for (const k of khach) {
      const d = choViec[agent](k);
      if (d > diem || (d === diem && d > 0 && tot && cmpId(k.id, tot.id) < 0)) { tot = k; diem = d; }
    }
    return tot ? { agent, company_id: tot.id, ly_do: 'viec_cho' as const, luc: null, so: diem } : { agent, company_id: null, ly_do: null, luc: null, so: 0 };
  });
}

// ── Cửa chính ─────────────────────────────────────────────────────────────

/** Gom ý kiến agent ngoài theo công ty → transaction_id; dòng đầu (mới nhất) thắng. Thuần. */
export function yKienTheoCongTy(ds: Row[] | null): Map<string, Map<string, YKienNgoai>> {
  const ra = new Map<string, Map<string, YKienNgoai>>();
  for (const r of ds ?? []) {
    if (!(LOAI_PHAN_LOAI as readonly string[]).includes(r.loai)) continue;
    const k = Array.isArray(r.khoa_mcp) ? r.khoa_mcp[0] : r.khoa_mcp;
    // Ý kiến từ khoá MCP đã thu hồi không còn giá trị.
    if (r.nguon !== 'agent_mimi' && (!k || k.thu_hoi_luc)) continue;
    const cty = String(r.company_id), gd = String(r.transaction_id);
    const m = ra.get(cty) ?? new Map<string, YKienNgoai>();
    if (!m.has(gd)) m.set(gd, { loai: r.loai as LoaiPhanLoai, ly_do: String(r.ly_do ?? ''), ten_agent: String((r.nguon === 'agent_mimi' ? r.ten_agent : k?.ten) ?? 'Agent') });
    ra.set(cty, m);
  }
  return ra;
}

export interface TuyChonDanhMuc { trang?: number; kichThuoc?: number; bayGio?: number }

export async function docDanhMucKhach(db: Db, userId: string, o: TuyChonDanhMuc = {}): Promise<DanhMucKhach> {
  const bayGio = o.bayGio ?? Date.now();
  const homNay = homNayVN(bayGio);
  const nam = Number(homNay.slice(0, 4));
  const kichThuoc = Math.max(1, Math.min(KICH_THUOC_TOI_DA, Math.floor(Number(o.kichThuoc) || KICH_THUOC_MAC_DINH)));

  const { duoc, gioiHan, khongLamSo } = await docThanhVien(db, userId);
  const xepTen = [...duoc].sort((a, b) => a.ten.localeCompare(b.ten, 'vi') || (a.company_id < b.company_id ? -1 : 1));
  const tinh = xepTen.slice(0, TOI_DA_CONG_TY);
  const vuotTran = xepTen.length - tinh.length;
  const ids = new Set(tinh.map((t) => t.company_id));
  const dsId = [...ids];

  const truoc24h = new Date(bayGio - 86_400_000).toISOString();
  const [viec, nhiemVu, thongBao, phanLoai, banHang, yKienNgoai] = dsId.length ? await Promise.all([
    docTheoTap('hồ sơ việc', ids, db.from('ho_so_viec').select('id, company_id, trang_thai, muc_do')
      .in('company_id', dsId).in('trang_thai', ['mo', 'dang_xu_ly', 'cho_ben_ngoai'])
      .order('id', { ascending: true }).limit(TRAN_HOAT_DONG)),
    docTheoTap('nhiệm vụ agent', ids, db.from('nhiem_vu_agent').select('id, company_id, agent, trang_thai, cap_nhat_luc')
      .in('company_id', dsId).gte('cap_nhat_luc', truoc24h)
      .order('cap_nhat_luc', { ascending: false }).limit(TRAN_HOAT_DONG)),
    // Thông báo là của từng người nhận: chỉ thông báo gửi cho chính người gọi.
    docTheoTap('thông báo', ids, db.from('thong_bao').select('id, company_id, loai, tao_luc')
      .eq('user_id', userId).in('company_id', dsId).gte('tao_luc', truoc24h)
      .order('tao_luc', { ascending: false }).limit(TRAN_HOAT_DONG)),
    docTheoTap('lịch sử phân loại tiền vào', ids, db.from('revenue_classification_events').select('id, company_id, at')
      .in('company_id', dsId).gte('at', truoc24h)
      .order('at', { ascending: false }).limit(TRAN_HOAT_DONG)),
    docTheoTap('bán tại quầy', ids, db.from('ban_hang_pos').select('id, company_id, amount, status, sold_at')
      .in('company_id', dsId).eq('status', 'paid').gte('sold_at', dauNgayVN(homNay))
      .order('sold_at', { ascending: false }).limit(TRAN_HOAT_DONG), true),
    // Ý kiến của agent ngoài (MCP), mới trước. Bảng chưa có (chưa chạy migration) thì bỏ qua.
    docTheoTap('đề xuất của agent ngoài', ids, db.from('de_xuat_agent_ngoai')
      .select('company_id, transaction_id, loai, ly_do, tao_luc, nguon, ten_agent, khoa_mcp(ten, thu_hoi_luc)')
      .in('company_id', dsId)
      .order('tao_luc', { ascending: false }).limit(TRAN_HOAT_DONG), true),
  ]) : [[], [], [], [], [] as Row[], [] as Row[]];

  const theoCty = <T>(ds: Row[] | null, f: (r: Row) => T) => {
    const m = new Map<string, T[]>();
    for (const r of ds ?? []) { const k = String(r.company_id); m.set(k, [...(m.get(k) ?? []), f(r)]); }
    return m;
  };
  const viecTheo = theoCty(viec, (r) => String(r.muc_do));
  const nvTheo = theoCty(nhiemVu, (r) => ({ agent: String(r.agent), trang_thai: String(r.trang_thai), luc: String(r.cap_nhat_luc) }));
  const tbTheo = theoCty(thongBao, (r) => String(r.tao_luc));
  const plTheo = theoCty(phanLoai, (r) => String(r.at));
  const bhTheo = theoCty(banHang, (r) => ({ tien: so(r.amount), luc: String(r.sold_at) }));
  const ngoaiTheo = yKienTheoCongTy(yKienNgoai);

  const phanLoaiTheo = new Map<string, DeXuat[]>();
  const khach = await songSong(tinh, SONG_SONG, async (tv): Promise<KhachVanPhong> => {
    const id = tv.company_id;
    const vm = viecTheo.get(id) ?? [];
    const nv = nvTheo.get(id) ?? [];
    const tb = tbTheo.get(id) ?? [];
    const pl = plTheo.get(id) ?? [];
    const bh = bhTheo.get(id) ?? [];
    const lucs = [...nv.map((x) => x.luc), ...tb, ...pl, ...bh.map((x) => x.luc)].sort();
    const goc: Omit<KhachVanPhong, 'muc' | 'ly_do'> = {
      id, ten: tv.ten, vai_tro: tv.vai_tro, la_demo: tv.la_demo,
      doanh_thu: null, tien_vao_cho_xac_nhan: null, thue: null,
      viec_mo: { so: vm.length, chan: vm.filter((m) => m === 'chan').length, gap: vm.filter((m) => m === 'gap').length },
      ban_hang_hom_nay: banHang === null ? null : { so_lan: bh.length, tong: bh.reduce((a, x) => a + x.tien, 0), gan_nhat: bh[0]?.luc ?? null },
      dong_tien_30_ngay: null,
      hoat_dong_24h: { phan_loai: pl.length, thong_bao: tb.length, nhiem_vu: nv.slice(0, 5), gan_nhat: lucs.at(-1) ?? null },
      loi: null,
    };
    try {
      const { s, lich, giaoDich, noiBo, xacNhan } = await docMotKhach(db, tv, nam, homNay);
      const dc = s.do_chac_chan;
      phanLoaiTheo.set(id, deXuatPhanLoai({ company_id: id, ten: tv.ten, vai_tro: tv.vai_tro, nam, giaoDich, xacNhan, noiBo, s, dc, ngoai: ngoaiTheo.get(id) }));
      const nguong = dc.nguong.map((n) => ({ ma: n.ma, gia_tri: n.gia_tri, phia: n.phia }));
      goc.doanh_thu = {
        nam, uoc_tinh: so(dc.gia_tri), can_duoi: so(dc.can_duoi), can_tren: so(dc.can_tren), trang_thai: dc.trang_thai, nguong,
        can_xem: nguong.some((n) => (n.ma === 'mien_thue_1_ty' || n.ma === 'phuong_phap_3_ty') && n.phia === 'chua_chac'),
      };
      goc.tien_vao_cho_xac_nhan = { so_khoan: s.so_chua_ro, so_tien: Math.round(s.chua_ro) };
      const moc = mocKeTiep(lich.lich);
      goc.thue = {
        trang_thai: lich.sanSang.trang_thai, ten_viec: lich.sanSang.ten_viec, han: lich.sanSang.han, con_lai: lich.sanSang.con_lai,
        moc_ke_tiep: moc ? { ten: moc.ten, loai: moc.loai, han: moc.han, con_lai: moc.con_lai } : null,
      };
      goc.dong_tien_30_ngay = giaoDich.length ? dongTien30Ngay(giaoDich, noiBo, homNay) : null;
    } catch (e) {
      // Một khách hỏng không làm hỏng cả văn phòng; khách đó hiện "không đọc được", không hiện số giả.
      console.error(`van-phong: không đọc được khách ${id}:`, e instanceof Error ? e.message : String(e));
      goc.loi = 'khong_doc_duoc';
    }
    return { ...goc, ...danhGiaKhach(goc) };
  });

  khach.sort(soSanhKhach);

  const hangDuyet = khach.flatMap((k) => {
    const pl = phanLoaiTheo.get(k.id) ?? [];
    return [...pl, ...deXuatDieuHuong(k, pl.length > 0)];
  }).sort(soSanhDeXuat);

  const suKien: SuKienAgent[] = [
    ...(phanLoai ?? []).map((r) => ({ agent: 'phan_loai' as const, company_id: String(r.company_id), luc: String(r.at) })),
    ...(thongBao ?? []).flatMap((r) => AGENT_TU_THONG_BAO[r.loai] ? [{ agent: AGENT_TU_THONG_BAO[r.loai], company_id: String(r.company_id), luc: String(r.tao_luc) }] : []),
    ...(nhiemVu ?? []).flatMap((r) => AGENT_TU_NHIEM_VU[r.agent] ? [{ agent: AGENT_TU_NHIEM_VU[r.agent], company_id: String(r.company_id), luc: String(r.cap_nhat_luc) }] : []),
    ...(banHang ?? []).map((r) => ({ agent: 'ban_hang' as const, company_id: String(r.company_id), luc: String(r.sold_at) })),
  ];

  const tong = khach.length;
  const soTrang = Math.max(1, Math.ceil(tong / kichThuoc));
  const trang = Math.max(1, Math.min(soTrang, Math.floor(Number(o.trang) || 1)));
  const dem = { do: 0, vang: 0, xanh: 0 };
  for (const k of khach) dem[k.muc]++;
  return {
    hom_nay: homNay, nam, tong, trang, kich_thuoc: kichThuoc, so_trang: soTrang,
    khach: khach.slice((trang - 1) * kichThuoc, trang * kichThuoc),
    agent: phanCongAgent(khach, suKien),
    dem,
    loai_tru: { gioi_han_co_so: gioiHan, vai_tro_khong_lam_so: khongLamSo, vuot_tran: vuotTran },
    co_bang_ban_hang: banHang !== null,
    hang_duyet: hangDuyet.slice(0, TOI_DA_HANG_DUYET),
    hang_duyet_tong: hangDuyet.length,
  };
}
