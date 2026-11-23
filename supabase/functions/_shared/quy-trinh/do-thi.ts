/**
 * WORKFLOW CỦA AGENTIC AI SPACE (22/11/2026) — lõi thuần: định nghĩa, luật an toàn, ba phương án, nhãn, mẫu.
 *
 * Người dùng gõ một câu ở chat chính → MIMI dựng một ĐỒ THỊ (nút + cạnh). Mỗi nút là một bước; ai làm bước đó phụ
 * thuộc PHƯƠNG ÁN người dùng chọn:
 *   nguoi    — mọi bước do người làm (mốc so sánh);
 *   nguoi_ai — agent đọc / đề xuất; bước ghi dữ liệu do agent soạn rồi NGƯỜI duyệt;
 *   ai       — agent làm mọi bước làm được; người chỉ còn ở CỔNG BẮT BUỘC.
 *
 * LUẬT CỨNG (máy kiểm, AI không bỏ được): bước có tác động `chuyen_tien`, `nop`, `gui_ra_ngoai`, `xoa` luôn có một
 * nút NGƯỜI DUYỆT ngay trước, ở MỌI phương án; và MIMI không bao giờ tự chuyển tiền — bước chuyển tiền luôn do người.
 *
 * NHÃN mỗi nút: tu_dong (agent làm, công cụ có thật) · can_ket_noi (agent làm được nhưng công cụ chưa kết nối) ·
 * nguoi_lam (người làm / người duyệt).
 */

export const LOAI_NUT = ['kich_hoat', 'agent', 'nguoi', 'duyet', 'api', 'mcp', 'thong_bao'] as const;
export type LoaiNut = (typeof LOAI_NUT)[number];
export const TAC_DONG = ['doc', 'de_xuat', 'ghi', 'chuyen_tien', 'nop', 'gui_ra_ngoai', 'xoa'] as const;
export type TacDong = (typeof TAC_DONG)[number];
export const TAC_DONG_PHAI_DUYET: readonly TacDong[] = ['chuyen_tien', 'nop', 'gui_ra_ngoai', 'xoa'];

export const LINH_VUC = ['tai_chinh', 'thanh_toan', 'bao_mat', 'ho_so', 'nhan_su', 'cong_viec'] as const;
export type LinhVuc = (typeof LINH_VUC)[number];
export const TEN_LINH_VUC: Record<LinhVuc, string> = {
  tai_chinh: 'Tài chính & thuế', thanh_toan: 'Thanh toán qua agent', bao_mat: 'Bảo mật',
  ho_so: 'Hồ sơ', nhan_su: 'Nhân sự', cong_viec: 'Công việc',
};

export const PHUONG_AN = ['nguoi', 'nguoi_ai', 'ai'] as const;
export type PhuongAn = (typeof PHUONG_AN)[number];
export const TEN_PHUONG_AN: Record<PhuongAn, string> = { nguoi: 'Người làm', nguoi_ai: 'Người + AI', ai: 'AI tối đa' };

/**
 * Công cụ agent chạy THẬT được trong workflow hôm nay (có bộ thực thi ở `quy-trinh/thuc-thi.ts`). Ngoài danh sách →
 * "cần kết nối" — kể cả khi MIMI có trang làm việc đó, nếu workflow chưa gọi được thì không giả vờ là tự động.
 */
export const CONG_CU_CO_SAN = ['doc_sao_ke', 'phan_loai_tien_vao', 'hang_duyet', 'lich_thue', 'kiem_to_khai', 'soan_van_ban'] as const;
const CO_SAN = new Set<string>(CONG_CU_CO_SAN);

export interface Nut {
  id: string;
  loai: LoaiNut;
  ten: string;
  mo_ta: string;
  /** Bước này agent làm được (về bản chất), nếu phương án cho phép. */
  ai_duoc: boolean;
  tac_dong: TacDong;
  cong_cu: string | null;
  // Trường kỹ thuật chuẩn nghề (22/11/2026) — có thì hiện và kiểm, thiếu thì `kiemChuan` nhắc.
  vai_tro?: string;
  dau_vao?: string;
  dau_ra?: string;
  kiem_soat?: 'phong_ngua' | 'phat_hien' | null;
  bang_chung?: string;
  sla_gio?: number | null;
  /** Mèo người dùng tự chọn cho bước agent (để trống: MIMI chọn theo việc). */
  meo_chon?: Meo;
}
/** Nhãn nhánh sau bước duyệt: "dat" (duyệt) / "can_sua" (từ chối → trả lại sửa). Không nhãn: luôn đi. */
export type NhanhCanh = 'dat' | 'can_sua';
export interface Canh { tu: string; den: string; nhanh?: NhanhCanh }
export interface DoThi { nut: Nut[]; canh: Canh[] }

// ── Đội mèo agent (22/11/2026): mỗi bước agent do MỘT con mèo cụ thể đảm nhận; người dùng chọn được ──────────
export const MEO = [
  'phan_loai', 'thue', 'dong_tien', 'ho_so', 'bao_ve', 'doi_soat', 'cong_no', 'mua_hang', 'luong', 'tuan_thu', 'bao_cao', 'thu_ky',
] as const;
export type Meo = (typeof MEO)[number];
export const laMeo = (v: unknown): v is Meo => (MEO as readonly string[]).includes(String(v));
export const TEN_MEO: Record<Meo, string> = {
  phan_loai: 'Mèo Phân loại', thue: 'Mèo Thuế', dong_tien: 'Mèo Dòng tiền', ho_so: 'Mèo Hồ sơ', bao_ve: 'Mèo Bảo vệ',
  doi_soat: 'Mèo Đối soát', cong_no: 'Mèo Công nợ', mua_hang: 'Mèo Mua hàng', luong: 'Mèo Lương', tuan_thu: 'Mèo Tuân thủ',
  bao_cao: 'Mèo Báo cáo', thu_ky: 'Mèo Thư ký',
};
export const VIEC_MEO: Record<Meo, string> = {
  phan_loai: 'Tách tiền vào: doanh thu hay không', thue: 'Lịch thuế, tờ khai, quyết toán', dong_tien: 'Lệnh chi, ngân quỹ, dòng tiền',
  ho_so: 'Giấy tờ, văn bản, hồ sơ', bao_ve: 'An ninh, chống giả mạo, sự cố', doi_soat: 'Đối chiếu ngân hàng, khớp sổ',
  cong_no: 'Phải thu, nhắc nợ, đối chiếu công nợ', mua_hang: 'Đơn mua hàng, nhà cung cấp, khớp 3 bên', luong: 'Chấm công, bảng lương, bảo hiểm',
  tuan_thu: 'KYC, phòng chống rửa tiền, kiểm soát nội bộ', bao_cao: 'Báo cáo tài chính, phân tích biến động', thu_ky: 'Kế hoạch, nhắc hạn, biên bản',
};
const MEO_THEO_CONG_CU: Record<string, Meo> = {
  doc_sao_ke: 'doi_soat', phan_loai_tien_vao: 'phan_loai', hang_duyet: 'phan_loai',
  lich_thue: 'thue', kiem_to_khai: 'thue', tra_cuu_mst: 'tuan_thu',
  soan_lenh_chi_vietqr: 'dong_tien', doi_soat_sao_ke: 'doi_soat', core_banking: 'dong_tien',
  soan_van_ban: 'ho_so', doc_chung_tu: 'ho_so', tim_khoan_thieu_chung_tu: 'ho_so', thu_vien: 'ho_so',
  erp: 'mua_hang', hoa_don: 'cong_no', gmail: 'thu_ky', hrm: 'luong', siem: 'bao_ve', quan_tri_tai_khoan: 'bao_ve',
};
const MEO_THEO_TU: [RegExp, Meo][] = [
  [/bao mat|lua dao|xac minh|kiem nguoi nhan|bat thuong|su co|quyen truy cap/, 'bao_ve'],
  [/doi soat|doi chieu|khop/, 'doi_soat'], [/cong no|nhac no|phai thu|thu no/, 'cong_no'],
  [/mua hang|nha cung cap|don hang/, 'mua_hang'], [/luong|cham cong|bao hiem/, 'luong'],
  [/kyc|tham dinh|rua tien|tuan thu|rui ro/, 'tuan_thu'], [/bao cao|bien dong|phan tich/, 'bao_cao'],
  [/ke hoach|nhac han|bien ban|theo doi/, 'thu_ky'], [/thue|to khai|quyet toan/, 'thue'], [/lenh chi|chuyen tien|ngan quy/, 'dong_tien'],
  [/phan loai|tien vao/, 'phan_loai'],
];
const MEO_THEO_LINH_VUC: Record<LinhVuc, Meo> = {
  tai_chinh: 'phan_loai', thanh_toan: 'dong_tien', bao_mat: 'bao_ve', ho_so: 'ho_so', nhan_su: 'luong', cong_viec: 'thu_ky',
};
const boDauMeo = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
/** Con mèo đảm nhận một bước agent: người dùng chọn → theo tên việc → theo công cụ → theo lĩnh vực. */
export function meoCua(n: Pick<Nut, 'cong_cu' | 'ten'> & { meo_chon?: Meo }, lv: LinhVuc): Meo {
  if (n.meo_chon && laMeo(n.meo_chon)) return n.meo_chon;
  const t = boDauMeo(n.ten);
  for (const [re, m] of MEO_THEO_TU) if (re.test(t)) return m;
  if (n.cong_cu && MEO_THEO_CONG_CU[n.cong_cu]) return MEO_THEO_CONG_CU[n.cong_cu];
  return MEO_THEO_LINH_VUC[lv];
}

export type NguoiLam = 'agent' | 'nguoi';
export type Nhan = 'tu_dong' | 'can_ket_noi' | 'nguoi_lam';
export interface NutHien extends Nut { lam: NguoiLam; nhan: Nhan; them_boi_luat?: boolean; meo?: Meo }
export interface DoThiHien { nut: NutHien[]; canh: Canh[] }

export const TOI_DA_NUT = 16;
const ID_RE = /^[a-z0-9_]{1,24}$/;

// ── Kiểm & chuẩn hoá đồ thị (đầu vào có thể từ AI: không tin) ───────────────────────────────

export class LoiDoThi extends Error {}

/** Đồ thị hợp lệ: id duy nhất, cạnh trỏ đúng nút, không chu trình, có đúng 1 nút kích hoạt đứng đầu. Sửa nhẹ được thì sửa. */
export function chuanHoa(tho: unknown): DoThi {
  const d = tho as { nut?: unknown; canh?: unknown };
  if (!d || !Array.isArray(d.nut)) throw new LoiDoThi('Đồ thị thiếu danh sách bước.');
  const nut: Nut[] = [];
  const daCo = new Set<string>();
  for (const x of d.nut.slice(0, TOI_DA_NUT)) {
    const r = x as Record<string, unknown>;
    const id = String(r.id ?? '').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 24);
    if (!ID_RE.test(id) || daCo.has(id)) continue;
    const loai = (LOAI_NUT as readonly string[]).includes(String(r.loai)) ? (r.loai as LoaiNut) : 'nguoi';
    // Giá trị lạ / thiếu → 'ghi' (chặt hơn 'doc'): không để AI hạ cấp một bước có tác động xuống "chỉ đọc".
    const tac = (TAC_DONG as readonly string[]).includes(String(r.tac_dong)) ? (r.tac_dong as TacDong) : 'ghi';
    const ten = String(r.ten ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!ten) continue;
    daCo.add(id);
    const cc = r.cong_cu == null || r.cong_cu === '' ? null : String(r.cong_cu).toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40);
    nut.push({
      id, loai, ten, mo_ta: String(r.mo_ta ?? '').replace(/\s+/g, ' ').trim().slice(0, 200), tac_dong: tac, cong_cu: cc,
      // Chuyển tiền: MIMI không bao giờ làm → không phải việc của agent, ở mọi phương án.
      ai_duoc: tac === 'chuyen_tien' ? false : loai === 'duyet' ? false : r.ai_duoc !== false && loai !== 'nguoi',
      ...truongKyThuat(r),
    });
  }
  if (!nut.length) throw new LoiDoThi('Đồ thị không có bước hợp lệ.');
  // Đúng một nút kích hoạt, đứng đầu.
  const kh = nut.filter((n) => n.loai === 'kich_hoat');
  if (!kh.length) nut.unshift({ id: 'bat_dau', loai: 'kich_hoat', ten: 'Bắt đầu', mo_ta: 'Bấm tay', ai_duoc: false, tac_dong: 'doc', cong_cu: null });
  else for (const k of kh.slice(1)) k.loai = 'nguoi';

  const ids = new Set(nut.map((n) => n.id));
  let canh: Canh[] = (Array.isArray(d.canh) ? d.canh : [])
    .map((c) => {
      const x = c as Canh;
      const nh = x.nhanh === 'dat' || x.nhanh === 'can_sua' ? x.nhanh : undefined;
      return { tu: String(x.tu ?? ''), den: String(x.den ?? ''), ...(nh ? { nhanh: nh } : {}) };
    })
    .filter((c) => ids.has(c.tu) && ids.has(c.den) && c.tu !== c.den);
  // Nhãn nhánh chỉ có nghĩa sau bước duyệt.
  for (const c of canh) if (c.nhanh && nut.find((n) => n.id === c.tu)?.loai !== 'duyet') delete c.nhanh;
  canh = [...new Map(canh.map((c) => [`${c.tu}>${c.den}`, c])).values()];
  // Thiếu cạnh → nối thẳng theo thứ tự.
  if (!canh.length) canh = nut.slice(1).map((n, i) => ({ tu: nut[i].id, den: n.id }));
  if (coChuTrinh(nut, canh)) throw new LoiDoThi('Đồ thị có vòng lặp.');
  // Nút mồ côi (không ai trỏ tới, không phải kích hoạt) → nối sau nút kích hoạt.
  const dau = nut.find((n) => n.loai === 'kich_hoat')!.id;
  for (const n of nut) if (n.id !== dau && !canh.some((c) => c.den === n.id)) canh.push({ tu: dau, den: n.id });
  return { nut, canh };
}

const chu = (v: unknown, n: number) => { const s = String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n); return s || undefined; };
function truongKyThuat(r: Record<string, unknown>): Partial<Nut> {
  const o: Partial<Nut> = {};
  const vt = chu(r.vai_tro, 60), vao = chu(r.dau_vao, 160), ra = chu(r.dau_ra, 160), bc = chu(r.bang_chung, 160);
  if (vt) o.vai_tro = vt;
  if (vao) o.dau_vao = vao;
  if (ra) o.dau_ra = ra;
  if (bc) o.bang_chung = bc;
  if (r.kiem_soat === 'phong_ngua' || r.kiem_soat === 'phat_hien') o.kiem_soat = r.kiem_soat;
  const sla = Number(r.sla_gio);
  if (Number.isFinite(sla) && sla > 0 && sla <= 720) o.sla_gio = Math.round(sla);
  if (laMeo(r.meo_chon)) o.meo_chon = r.meo_chon;
  return o;
}

function coChuTrinh(nut: Nut[], canh: Canh[]): boolean {
  const vao = new Map(nut.map((n) => [n.id, 0]));
  for (const c of canh) vao.set(c.den, (vao.get(c.den) ?? 0) + 1);
  const hang = nut.filter((n) => !vao.get(n.id)).map((n) => n.id);
  let da = 0;
  while (hang.length) {
    const x = hang.shift()!; da++;
    for (const c of canh) if (c.tu === x) { vao.set(c.den, vao.get(c.den)! - 1); if (!vao.get(c.den)) hang.push(c.den); }
  }
  return da !== nut.length;
}

/** Thứ tự chạy (topo, giữ thứ tự khai báo khi hoà). */
export function thuTu(d: { nut: { id: string }[]; canh: Canh[] }): string[] {
  const vao = new Map(d.nut.map((n) => [n.id, 0]));
  for (const c of d.canh) vao.set(c.den, (vao.get(c.den) ?? 0) + 1);
  const ra: string[] = [];
  const con = d.nut.map((n) => n.id);
  while (con.length) {
    const i = con.findIndex((id) => !vao.get(id));
    if (i < 0) break;
    const id = con.splice(i, 1)[0];
    ra.push(id);
    for (const c of d.canh) if (c.tu === id) vao.set(c.den, vao.get(c.den)! - 1);
  }
  return ra;
}

// ── Phương án + luật cứng ──────────────────────────────────────────────────

const coDuyetTruoc = (id: string, nut: Nut[], canh: Canh[]) =>
  canh.filter((c) => c.den === id).some((c) => nut.find((n) => n.id === c.tu)?.loai === 'duyet');

const ngoaiMuonDuyet = (n: { lam: NguoiLam; cong_cu: string | null; tac_dong: TacDong }) =>
  n.lam === 'agent' && !!n.cong_cu && !CO_SAN.has(n.cong_cu) && n.tac_dong !== 'doc';

/** Chèn nút duyệt ngay trước `id` (mọi cạnh vào `id` đi qua nút duyệt). */
function chenDuyet(d: { nut: NutHien[]; canh: Canh[] }, id: string, ten: string) {
  const n = d.nut.find((x) => x.id === id)!;
  const moi: NutHien = {
    id: `duyet_${id}`.slice(0, 24), loai: 'duyet', ten, mo_ta: `Người duyệt trước khi: ${n.ten}`,
    ai_duoc: false, tac_dong: 'doc', cong_cu: null, lam: 'nguoi', nhan: 'nguoi_lam', them_boi_luat: true,
  };
  if (d.nut.some((x) => x.id === moi.id)) return;
  d.nut.splice(d.nut.indexOf(n), 0, moi);
  d.canh = [...d.canh.map((c) => (c.den === id ? { tu: c.tu, den: moi.id } : c)), { tu: moi.id, den: id }];
}

/** Đồ thị hiển thị cho một phương án: ai làm từng bước, nhãn, và cổng duyệt luật bắt buộc. */
export function apPhuongAn(goc: DoThi, pa: PhuongAn, o: { daKetNoi?: Set<string>; linhVuc?: LinhVuc } = {}): DoThiHien {
  const coSan = (cc: string) => CO_SAN.has(cc) || !!o.daKetNoi?.has(cc);
  const d: { nut: NutHien[]; canh: Canh[] } = {
    nut: goc.nut.map((n) => {
      // "Người làm": không agent nào. Hai phương án còn lại: agent làm mọi bước làm được; khác nhau ở cổng duyệt (dưới).
      const agentLam = n.ai_duoc && n.loai !== 'kich_hoat' && pa !== 'nguoi';
      const lam: NguoiLam = n.loai === 'kich_hoat' ? 'agent' : agentLam ? 'agent' : 'nguoi';
      const nhan: Nhan = lam === 'nguoi' ? 'nguoi_lam' : n.cong_cu && !coSan(n.cong_cu) ? 'can_ket_noi' : 'tu_dong';
      return { ...n, lam, nhan, ...(lam === 'agent' && n.loai !== 'kich_hoat' ? { meo: meoCua(n, o.linhVuc ?? 'cong_viec') } : {}) };
    }),
    canh: goc.canh.map((c) => ({ ...c })),
  };
  for (const n of [...d.nut]) {
    if (n.loai === 'kich_hoat' || n.loai === 'duyet') continue;
    const batBuoc = TAC_DONG_PHAI_DUYET.includes(n.tac_dong);
    // Người + AI: bước GHI do agent soạn → người duyệt trước khi ghi.
    const muonDuyet = pa === 'nguoi_ai' && n.lam === 'agent' && n.tac_dong === 'ghi';
    // Công cụ NGOÀI MIMI (API / MCP người dùng nối) mà ghi hoặc đề xuất → luôn có người duyệt, kể cả "AI tối đa".
    const ngoai = ngoaiMuonDuyet(n);
    if ((batBuoc || muonDuyet || ngoai) && !coDuyetTruoc(n.id, d.nut, d.canh)) chenDuyet(d, n.id, batBuoc || ngoai ? 'Người duyệt (bắt buộc)' : 'Người duyệt');
  }
  return d;
}

export interface SoBuoc { nguoi: number; agent: number; duyet: number; can_ket_noi: number; tong: number }
export function demBuoc(d: DoThiHien): SoBuoc {
  const s = { nguoi: 0, agent: 0, duyet: 0, can_ket_noi: 0, tong: 0 };
  for (const n of d.nut) {
    if (n.loai === 'kich_hoat') continue;
    s.tong++;
    if (n.loai === 'duyet') s.duyet++;
    else if (n.lam === 'nguoi') s.nguoi++;
    else s.agent++;
    if (n.nhan === 'can_ket_noi') s.can_ket_noi++;
  }
  return s;
}

// ── Tài nguyên mỗi bước cần (22/11/2026) ─────────────────────────────────────────────────────
// Bước NGƯỜI làm → Gmail của người phụ trách; bước AGENT gọi công cụ → API; bước dùng ỨNG DỤNG ngoài (loại mcp) → MCP.

export type KieuTaiNguyen = 'gmail' | 'api' | 'mcp';
export interface TaiNguyenCan { nut_id: string; kieu: KieuTaiNguyen; ten_buoc: string; can: string; co_san: boolean }
export interface GanTaiNguyen { email?: string }

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
export const laEmail = (s: unknown): s is string => typeof s === 'string' && s.length <= 254 && EMAIL_RE.test(s.trim());

export function taiNguyenCan(d: DoThiHien, gan: Record<string, GanTaiNguyen> = {}, daKetNoi: Set<string> = new Set()): TaiNguyenCan[] {
  const ra: TaiNguyenCan[] = [];
  for (const n of d.nut) {
    if (n.loai === 'kich_hoat') continue;
    if (n.lam === 'nguoi') {
      const e = gan[n.id]?.email;
      ra.push({ nut_id: n.id, kieu: 'gmail', ten_buoc: n.ten, can: e ? e : 'Gmail người phụ trách', co_san: laEmail(e) });
    } else if (n.cong_cu) {
      const kieu: KieuTaiNguyen = n.loai === 'mcp' ? 'mcp' : 'api';
      ra.push({ nut_id: n.id, kieu, ten_buoc: n.ten, can: n.cong_cu, co_san: daKetNoi.has(n.cong_cu) || (n.loai !== 'mcp' && CO_SAN.has(n.cong_cu)) });
    }
  }
  return ra;
}

/** Luật cứng giữ ở MỌI phương án — dùng cho test và kiểm trước khi chạy. */
export function viPhamLuat(d: DoThiHien): string[] {
  const loi: string[] = [];
  for (const n of d.nut) {
    if (TAC_DONG_PHAI_DUYET.includes(n.tac_dong) && !coDuyetTruoc(n.id, d.nut, d.canh)) loi.push(`${n.ten}: thiếu người duyệt trước`);
    if (n.tac_dong === 'chuyen_tien' && n.lam !== 'nguoi') loi.push(`${n.ten}: chuyển tiền phải do người`);
    if (ngoaiMuonDuyet(n) && !coDuyetTruoc(n.id, d.nut, d.canh)) loi.push(`${n.ten}: công cụ ngoài MIMI cần người duyệt trước`);
  }
  return loi;
}

// ── Nhận lĩnh vực + mẫu (dùng khi chưa có mô hình, và làm ví dụ cho mô hình) ─────────────────

const boDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

export function nhanLinhVuc(cau: string): LinhVuc {
  const c = boDau(cau);
  if (/thanh toan|tra tien|chi tien|nha cung cap|ncc|lenh chi|payment|hoa don dau vao can tra/.test(c)) return 'thanh_toan';
  if (/bao mat|lua dao|dang nhap la|doi so tai khoan|tai khoan nhan|phishing|gian lan|ma doc|ro ri/.test(c)) return 'bao_mat';
  if (/nhan su|nhan vien|tuyen|nghi phep|bang luong|luong|onboard|hop dong lao dong|bhxh/.test(c)) return 'nhan_su';
  if (/ho so|giay to|vay|cong van|giai trinh|dang ky kinh doanh|tham dinh/.test(c)) return 'ho_so';
  if (/thue|to khai|chot so|quy \d|doanh thu|phan loai|tien vao|chung tu|doi soat|bao cao tai chinh/.test(c)) return 'tai_chinh';
  return 'cong_viec';
}

const n = (id: string, loai: LoaiNut, ten: string, mo_ta: string, tac_dong: TacDong = 'doc', cong_cu: string | null = null, ai_duoc = true): Nut =>
  ({ id, loai, ten, mo_ta, tac_dong, cong_cu, ai_duoc });
const noi = (...ids: string[]): Canh[] => ids.slice(1).map((d, i) => ({ tu: ids[i], den: d }));

export const MAU: Record<LinhVuc, { tieu_de: string; do_thi: DoThi }> = {
  tai_chinh: {
    tieu_de: 'Chốt quý và chuẩn bị tờ khai',
    do_thi: {
      nut: [
        n('bat_dau', 'kich_hoat', 'Bắt đầu', 'Bấm tay hoặc 10 ngày trước hạn khai', 'doc', null, false),
        n('doc_sk', 'agent', 'Đọc sao kê quý', 'Kéo mọi giao dịch của quý từ ngân hàng đã liên kết', 'doc', 'doc_sao_ke'),
        n('phan_loai', 'agent', 'Phân loại tiền vào', 'Tách tiền bán hàng khỏi tiền nhà, tiền vay, chuyển nội bộ — kèm lý do', 'de_xuat', 'phan_loai_tien_vao'),
        n('ghi_pl', 'agent', 'Ghi phân loại vào sổ', 'Ghi các khoản đã chốt vào sổ doanh thu', 'ghi', 'hang_duyet'),
        n('thieu_ct', 'agent', 'Tìm khoản chi thiếu chứng từ', 'Liệt kê khoản chi chưa có hoá đơn để nhắc khách', 'doc', 'tim_khoan_thieu_chung_tu'),
        n('to_khai', 'agent', 'Soạn tờ khai', 'Điền mẫu tờ khai theo doanh thu đã chốt và lịch thuế', 'de_xuat', 'kiem_to_khai'),
        n('nop', 'nguoi', 'Nộp tờ khai', 'Nộp trên cổng thuế điện tử — MIMI không tự nộp', 'nop', null, false),
      ],
      canh: noi('bat_dau', 'doc_sk', 'phan_loai', 'ghi_pl', 'thieu_ct', 'to_khai', 'nop'),
    },
  },
  thanh_toan: {
    tieu_de: 'Thanh toán nhà cung cấp qua agent',
    do_thi: {
      nut: [
        n('bat_dau', 'kich_hoat', 'Có hoá đơn cần trả', 'Hoá đơn đầu vào tới hạn hoặc được gửi lên', 'doc', null, false),
        n('doc_hd', 'agent', 'Đọc hoá đơn', 'Trích số tiền, người nhận, số tài khoản, hạn trả', 'doc', 'doc_chung_tu'),
        n('kiem_nhan', 'agent', 'Kiểm người nhận', 'So số tài khoản với các lần trả trước: đổi tài khoản, người nhận lạ', 'de_xuat', 'doi_soat_sao_ke'),
        n('lenh_chi', 'agent', 'Soạn lệnh chi VietQR', 'Mã QR đúng số tiền và nội dung — chưa chuyển', 'de_xuat', 'soan_lenh_chi_vietqr'),
        n('chuyen', 'nguoi', 'Chuyển tiền', 'Người có quyền quét mã trên app ngân hàng — MIMI không chuyển tiền', 'chuyen_tien', null, false),
        n('doi_soat', 'agent', 'Đối soát sao kê', 'Khớp khoản đã chi với lệnh, đánh dấu hoá đơn đã trả', 'ghi', 'doi_soat_sao_ke'),
      ],
      canh: noi('bat_dau', 'doc_hd', 'kiem_nhan', 'lenh_chi', 'chuyen', 'doi_soat'),
    },
  },
  bao_mat: {
    tieu_de: 'Xử lý thay đổi tài khoản nhận tiền đáng ngờ',
    do_thi: {
      nut: [
        n('bat_dau', 'kich_hoat', 'Có yêu cầu đổi tài khoản nhận', 'Email / tin nhắn báo đối tác đổi số tài khoản', 'doc', null, false),
        n('doc_yc', 'agent', 'Đọc yêu cầu', 'Trích tên đối tác, số tài khoản mới, kênh gửi', 'doc', 'doc_chung_tu'),
        n('so_lich_su', 'agent', 'So với lịch sử trả tiền', 'Tài khoản mới có từng nhận tiền chưa, tên chủ có khớp không', 'de_xuat', 'doi_soat_sao_ke'),
        n('xac_minh', 'nguoi', 'Gọi xác minh qua số cũ', 'Gọi đối tác bằng số điện thoại đã lưu từ trước, không dùng số trong email', 'doc', null, false),
        n('cap_nhat', 'agent', 'Cập nhật danh bạ người nhận', 'Ghi tài khoản mới đã xác minh, khoá tài khoản cũ', 'ghi', 'thong_bao_trong_app'),
        n('bao_doi', 'agent', 'Báo cả đội', 'Thông báo ai được phép chuyển tới tài khoản mới', 'gui_ra_ngoai', 'thong_bao_trong_app'),
      ],
      canh: noi('bat_dau', 'doc_yc', 'so_lich_su', 'xac_minh', 'cap_nhat', 'bao_doi'),
    },
  },
  ho_so: {
    tieu_de: 'Chuẩn bị hồ sơ',
    do_thi: {
      nut: [
        n('bat_dau', 'kich_hoat', 'Bắt đầu', 'Bấm tay', 'doc', null, false),
        n('danh_muc', 'agent', 'Lập danh mục giấy tờ cần có', 'Theo loại hồ sơ và quy định hiện hành', 'de_xuat', 'soan_van_ban'),
        n('tim_co', 'agent', 'Tìm giấy tờ đã có', 'Đối chiếu với thư viện chứng từ', 'doc', 'doc_chung_tu'),
        n('xin_thieu', 'nguoi', 'Bổ sung giấy tờ còn thiếu', 'Người phụ trách tải lên phần còn thiếu', 'ghi', null, false),
        n('soan', 'agent', 'Soạn văn bản kèm theo', 'Đơn, công văn, bảng kê từ dữ liệu thật', 'de_xuat', 'soan_van_ban'),
        n('gui', 'nguoi', 'Gửi hồ sơ', 'Gửi tới nơi nhận', 'gui_ra_ngoai', null, false),
      ],
      canh: noi('bat_dau', 'danh_muc', 'tim_co', 'xin_thieu', 'soan', 'gui'),
    },
  },
  nhan_su: {
    tieu_de: 'Đón nhân viên mới',
    do_thi: {
      nut: [
        n('bat_dau', 'kich_hoat', 'Có nhân viên mới', 'Ngày bắt đầu đã chốt', 'doc', null, false),
        n('ds_viec', 'agent', 'Lập danh sách việc đón người mới', 'Giấy tờ, tài khoản, thiết bị, người hướng dẫn', 'de_xuat', 'soan_van_ban'),
        n('hop_dong', 'agent', 'Soạn hợp đồng lao động', 'Từ mẫu của công ty và thông tin đã có', 'de_xuat', 'soan_van_ban'),
        n('tai_khoan', 'agent', 'Tạo tài khoản email & công cụ', 'Cần kết nối hệ thống quản trị tài khoản của công ty', 'ghi', 'quan_tri_tai_khoan'),
        n('ky', 'nguoi', 'Ký hợp đồng', 'Hai bên ký', 'gui_ra_ngoai', null, false),
        n('bhxh', 'agent', 'Nhắc khai báo bảo hiểm', 'Nhắc hạn khai báo lao động mới', 'doc', 'lich_thue'),
      ],
      canh: noi('bat_dau', 'ds_viec', 'hop_dong', 'tai_khoan', 'ky', 'bhxh'),
    },
  },
  cong_viec: {
    tieu_de: 'Quy trình công việc',
    do_thi: {
      nut: [
        n('bat_dau', 'kich_hoat', 'Bắt đầu', 'Bấm tay', 'doc', null, false),
        n('lam_ro', 'agent', 'Làm rõ yêu cầu', 'Tách việc thành các phần nhỏ, hỏi lại chỗ còn thiếu', 'de_xuat', 'soan_van_ban'),
        n('giao', 'nguoi', 'Giao người phụ trách', 'Chọn ai làm phần nào', 'ghi', null, false),
        n('theo_doi', 'agent', 'Theo dõi và nhắc hạn', 'Nhắc khi gần hạn, gom tiến độ', 'doc', 'thong_bao_trong_app'),
        n('tong_ket', 'agent', 'Tổng kết', 'Soạn báo cáo kết quả', 'de_xuat', 'soan_van_ban'),
      ],
      canh: noi('bat_dau', 'lam_ro', 'giao', 'theo_doi', 'tong_ket'),
    },
  },
};
