/**
 * MỘT chỗ tính tiền vào và doanh thu cho cả MIMI.
 *
 * Trước 24/09/2026 có ba chỗ tự cộng: `tax-summary` (mốc 1 tỷ trên Tổng quan), `docDoanhThuQuy`
 * (tờ khai nháp) và `lapBangTienVao` (hàng đợi tiền vào). `tax-summary` không trừ khoản người dùng
 * đã xác nhận là tiền vay, tiền người nhà — nên Tổng quan và tờ khai nháp có thể báo hai con số
 * doanh thu khác nhau cho cùng một năm. Cả ba cũng đọc giao dịch một lần, mà PostgREST trả tối đa
 * 1000 dòng: công ty đầu tiên vượt 1000 giao dịch một năm sẽ bị cộng thiếu mà không ai hay.
 *
 * Bốn con số, KHÔNG TRỘN:
 *   tien_vao     mọi tiền vào tài khoản (không tính dòng minh hoạ).
 *   uoc_tinh     tien_vao trừ tiền chuyển giữa các tài khoản của chính mình, trừ khoản NGƯỜI đã xác
 *                nhận không phải doanh thu. Khoản chưa ai xác nhận vẫn tính là doanh thu: máy không
 *                bao giờ tự làm giảm doanh thu khai thuế.
 *   da_xac_nhan  phần của uoc_tinh mà người đã xác nhận là tiền bán hàng.
 *   hoa_don      LUÔN null từ 29/09/2026: đã gỡ hoá đơn điện tử (Casso chưa bật sản phẩm hoá đơn điện tử cho app production).
 *                Giữ trường để hợp đồng phản hồi không đổi; hàm tính hoá đơn bên dưới đóng băng.
 * Con số đưa vào tờ khai nháp do `chonDoanhThu` (`luat/he-luat.ts`) chọn giữa hoa_don, uoc_tinh và
 * số người dùng tự nhập.
 *
 * Tiền bán thu bằng tiền mặt không đi qua ngân hàng, cũng không có trong hoá đơn nếu chưa xuất —
 * MIMI không thấy nó, và nói ra điều đó (`CHUA_GOM`) thay vì để người dùng tưởng con số là đủ.
 */
import { findInternalTransfers, type LedgerTx } from '../ledger/internal-transfer.ts';
import { taiKhoanCuaToi } from '../ledger/tai-khoan.ts';
import { locMinhHoa } from '../minh-hoa.ts';
import { chieuTien, doLonTien } from '../tien/chieu-tien.ts';
import { docHet } from '../doc-het.ts';
import { goiYTienVao, laTienSanTmdt } from '../phan-loai/tien-vao.ts';
import { chiaTheoHoatDong, HOAT_DONG, type ChiaHoatDong, type KhoanDoanhThu, type PhanLoaiHoatDong, type HoatDong } from './theo-hoat-dong.ts';
import { doChacChanNhom, thangThieuDuLieu, tinhDoChacChan, tuBig, type KetQuaDoChacChan, type UngVienCauHoi } from './do-chac-chan.ts';
import { goiYPhanLoai, mauNoiDung } from './phan-loai.ts';

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

type Bon = [number, number, number, number];
const bon = (): Bon => [0, 0, 0, 0];
const quyCuaThang = (thang: number) => Math.max(1, Math.min(4, Math.ceil(thang / 3)));

export const CHUA_GOM = 'Chưa gồm tiền bán thu bằng tiền mặt: MIMI chỉ thấy tiền qua tài khoản ngân hàng.';

export interface GiaoDichTinh {
  id: string;
  amount: number | string;
  type?: string | null;
  transaction_date: string;
}

export interface XacNhanTinh {
  transaction_id: string;
  revenue_effect: 'include' | 'exclude' | 'pending' | string;
}

export interface SoLieuTienVao {
  nam: number;
  so_khoan_vao: number;
  tien_vao: number;
  noi_bo: number;
  khong_phai_doanh_thu: number;
  so_khong_phai_doanh_thu: number;
  da_xac_nhan: number;
  /** Chưa ai xác nhận, hoặc "Tôi chưa chắc" — đang tạm tính là doanh thu. */
  chua_ro: number;
  so_chua_ro: number;
  uoc_tinh: number;
  uoc_tinh_theo_quy: Bon;
  /**
   * Phần giá trị tiền vào đã có lời giải thích: chuyển nội bộ, hoặc người đã xác nhận là doanh thu /
   * không phải doanh thu. "Tôi chưa chắc" chưa phải lời giải thích. Null khi năm đó chưa có tiền vào.
   */
  ty_le_da_giai_thich: number | null;
  /** Phần `chua_ro` chia theo quý (đã nằm trong `uoc_tinh_theo_quy`). */
  chua_ro_theo_quy: Bon;
  /**
   * Tiền vào MIMI đã LOẠI khỏi doanh thu chỉ bằng SUY ĐOÁN (cặp "chuyển nội bộ" cùng số tiền, sát ngày,
   * chưa ai xác nhận). Không nằm trong `uoc_tinh` — nhưng nếu máy đoán sai thì doanh thu thật cao hơn
   * chừng này. Chỉ để tính khoảng [can_duoi, can_tren] ở `do-chac-chan.ts`.
   */
  noi_bo_suy_doan: number;
  so_noi_bo_suy_doan: number;
  noi_bo_suy_doan_theo_quy: Bon;
  /**
   * Dòng ghi là tiền VÀO nhưng số tiền ÂM (hoàn / huỷ giao dịch, hoặc dữ liệu nhập sai). Trước 30/09/2026
   * `doLonTien` lấy trị tuyệt đối nên -5 triệu bị cộng THÀNH +5 triệu doanh thu. Giờ không cộng, không
   * trừ: chưa biết bản chất thì không đụng tới con số — chỉ mở rộng cận dưới và hỏi người dùng.
   */
  am_bat_thuong: number;
  so_am_bat_thuong: number;
  am_bat_thuong_theo_quy: Bon;
  /** Số dòng bị bỏ vì trùng `id` (đọc chồng trang, gộp hai nguồn). Mỗi id chỉ tính một lần. */
  so_trung_id: number;
  /** Số dòng có số tiền không đọc được (NaN, chữ). Không tính vào đâu cả. */
  so_khong_doc_duoc: number;
  /** Doanh thu ước tính theo THÁNG "YYYY-MM" — để biết tháng lớn nhất khi ước mức tối đa của tháng thiếu sao kê. */
  uoc_tinh_theo_thang: Record<string, number>;
  /**
   * Như `uoc_tinh_theo_thang` nhưng CỘNG THÊM khoản bị loại chỉ bằng suy đoán: mức tối đa có thể của một
   * tháng, dùng để chặn trên tháng thiếu sao kê (một tháng thật không nhỏ hơn số này bị máy loại nhầm).
   */
  toi_da_theo_thang: Record<string, number>;
  /** Mọi tháng "YYYY-MM" có ít nhất một giao dịch (cả vào lẫn ra) trong năm. */
  thang_co_giao_dich: string[];
}

const VN_GMT7_MS = 7 * 3_600_000;

/**
 * Ngày theo LỊCH VIỆT NAM của một mốc thời gian. Cột `transaction_date` là DATE nên thường là
 * "2026-12-31" và giữ nguyên — đó đã là ngày ngân hàng ghi. Nhưng nếu nơi gọi đưa mốc có múi giờ
 * ("2026-12-31T18:30:00Z" = 01/01/2027 01:30 giờ Việt Nam), cắt 10 ký tự đầu xếp khoản đó vào NĂM CŨ và
 * QUÝ CŨ: sai cả năm khai, sai cả quý bắt đầu nghĩa vụ. Chuỗi không có múi giờ là giờ ngân hàng, giữ.
 */
export function ngayVN(v: unknown): string {
  const s = String(v ?? '').trim();
  const m = /^(\d{4}-\d{2}-\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?)?$/.exec(s);
  if (!m) return s.slice(0, 10);
  if (!m[2]) return m[1];
  const chuan = s.replace(' ', 'T').replace(/\s+/g, '').replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  const t = Date.parse(chuan);
  return Number.isNaN(t) ? m[1] : new Date(t + VN_GMT7_MS).toISOString().slice(0, 10);
}

/**
 * Cặp "chuyển nội bộ" mà chỉ có SUY ĐOÁN (`basis: 'paired'`) thì NGƯỜI có tiếng nói cuối. Trước đây
 * người dùng bấm "đây là tiền bán hàng" cho một khoản bị máy ghép nhầm vào cặp nội bộ thì vẫn không có
 * tác dụng: chuyển nội bộ "thắng mọi phân loại" — mà bản chất là một phỏng đoán không sửa được. Giờ:
 *   - người xác nhận `include` một chân THU của cặp suy đoán → bỏ cả cặp (cả hai chân) khỏi nội bộ;
 *   - cặp suy đoán mà người đã quyết (include/exclude) thì hết là "chưa chắc".
 * Chuyển nội bộ theo TÀI KHOẢN ĐỐI ỨNG (`basis: 'counterparty'`) là sự thật, không ai override.
 */
export function ganNoiBoTheoNguoi(
  noiBo: { internalIds: Set<string>; matches?: { inId: string; outId: string | null; basis: string }[] },
  xacNhan: XacNhanTinh[],
): { internalIds: Set<string>; suyDoanIds: Set<string> } {
  const hl = new Map(xacNhan.map((x) => [String(x.transaction_id), x.revenue_effect]));
  const internalIds = new Set(noiBo.internalIds);
  const suyDoanIds = new Set<string>();
  for (const m of noiBo.matches ?? []) {
    if (m.basis !== 'paired') continue;
    const quyet = hl.get(m.inId);
    if (quyet === 'include') {
      internalIds.delete(m.inId);
      if (m.outId) internalIds.delete(m.outId);
    } else if (quyet !== 'exclude') {
      suyDoanIds.add(m.inId);
      if (m.outId) suyDoanIds.add(m.outId);
    }
  }
  return { internalIds, suyDoanIds };
}

/** Hàm thuần: cùng dữ liệu vào thì cùng con số ra, ở mọi màn hình. */
export function tinhTienVao(
  nam: number, giaoDich: GiaoDichTinh[], xacNhan: XacNhanTinh[], noiBoIds: Set<string>, suyDoanIds: Set<string> = new Set(),
): SoLieuTienVao {
  const hieuLuc = new Map(xacNhan.map((x) => [String(x.transaction_id), x.revenue_effect]));
  const s: SoLieuTienVao = {
    nam, so_khoan_vao: 0, tien_vao: 0, noi_bo: 0, khong_phai_doanh_thu: 0, so_khong_phai_doanh_thu: 0,
    da_xac_nhan: 0, chua_ro: 0, so_chua_ro: 0, uoc_tinh: 0, uoc_tinh_theo_quy: bon(), ty_le_da_giai_thich: null,
    chua_ro_theo_quy: bon(), noi_bo_suy_doan: 0, so_noi_bo_suy_doan: 0, noi_bo_suy_doan_theo_quy: bon(),
    am_bat_thuong: 0, so_am_bat_thuong: 0, am_bat_thuong_theo_quy: bon(), so_trung_id: 0, so_khong_doc_duoc: 0,
    uoc_tinh_theo_thang: {}, toi_da_theo_thang: {}, thang_co_giao_dich: [],
  };
  const tienTo = String(nam);
  const daThay = new Set<string>();
  const thangCo = new Set<string>();
  for (const t of giaoDich) {
    const ngay = ngayVN(t.transaction_date);
    if (!ngay.startsWith(tienTo)) continue;
    const id = String(t.id);
    // Một id chỉ được tính một lần: hai trang đọc chồng nhau hay hai nguồn gộp lại không được cộng đôi tiền.
    if (daThay.has(id)) { s.so_trung_id += 1; continue; }
    daThay.add(id);
    thangCo.add(ngay.slice(0, 7));
    if (chieuTien(t) !== 'vao') continue;
    const goc = Number(t.amount);
    if (!Number.isFinite(goc)) { s.so_khong_doc_duoc += 1; continue; }
    // Đồng là đơn vị nhỏ nhất: làm tròn từng dòng để tổng luôn là số nguyên đồng, so với ngưỡng không lệch 1e-7.
    const tien = Math.round(Math.abs(goc));
    const q = quyCuaThang(Number(ngay.slice(5, 7))) - 1;
    const hl = hieuLuc.get(id);
    // Tiền VÀO mà số ÂM: không cộng thành dương. Người đã quyết thì thôi; chưa ai quyết thì là "chưa chắc".
    if (goc < 0) {
      if (hl === undefined || hl === 'pending') { s.am_bat_thuong += tien; s.so_am_bat_thuong += 1; s.am_bat_thuong_theo_quy[q] += tien; }
      continue;
    }
    s.so_khoan_vao += 1;
    s.tien_vao += tien;
    // Chuyển nội bộ thắng mọi phân loại: tiền của mình chuyển cho mình không bao giờ là doanh thu.
    // (Cặp chỉ do máy SUY ĐOÁN đã được người override từ trước, xem `ganNoiBoTheoNguoi`.)
    if (noiBoIds.has(id)) {
      s.noi_bo += tien;
      if (suyDoanIds.has(id)) {
        s.noi_bo_suy_doan += tien; s.so_noi_bo_suy_doan += 1; s.noi_bo_suy_doan_theo_quy[q] += tien;
        s.toi_da_theo_thang[ngay.slice(0, 7)] = (s.toi_da_theo_thang[ngay.slice(0, 7)] ?? 0) + tien;
      }
      continue;
    }
    if (hl === 'exclude') { s.khong_phai_doanh_thu += tien; s.so_khong_phai_doanh_thu += 1; continue; }
    if (hl === 'include') s.da_xac_nhan += tien;
    else { s.chua_ro += tien; s.so_chua_ro += 1; s.chua_ro_theo_quy[q] += tien; }
    s.uoc_tinh += tien;
    s.uoc_tinh_theo_quy[q] += tien;
    const thang = ngay.slice(0, 7);
    s.uoc_tinh_theo_thang[thang] = (s.uoc_tinh_theo_thang[thang] ?? 0) + tien;
    s.toi_da_theo_thang[thang] = (s.toi_da_theo_thang[thang] ?? 0) + tien;
  }
  s.thang_co_giao_dich = [...thangCo].sort();
  if (s.tien_vao > 0) s.ty_le_da_giai_thich = (s.noi_bo + s.khong_phai_doanh_thu + s.da_xac_nhan) / s.tien_vao;
  return s;
}

/**
 * Các khoản tiền vào ĐANG TÍNH là doanh thu (cùng bộ lọc với `tinhTienVao`: bỏ nội bộ, bỏ khoản người
 * đã xác nhận không phải doanh thu). Đây là thứ được chia theo nhóm hoạt động.
 */
export function khoanDoanhThuNganHang(nam: number, giaoDich: GiaoDichTinh[], xacNhan: XacNhanTinh[], noiBoIds: Set<string>): KhoanDoanhThu[] {
  const loai = new Set(xacNhan.filter((x) => x.revenue_effect === 'exclude').map((x) => String(x.transaction_id)));
  const tienTo = String(nam);
  const daThay = new Set<string>();
  const ra: KhoanDoanhThu[] = [];
  // Cùng bộ lọc với `tinhTienVao` (năm theo lịch Việt Nam, mỗi id một lần, bỏ số âm) để tổng theo nhóm
  // hoạt động luôn bằng `uoc_tinh`.
  for (const t of giaoDich) {
    const ngay = ngayVN(t.transaction_date);
    const id = String(t.id);
    if (!ngay.startsWith(tienTo) || daThay.has(id)) continue;
    daThay.add(id);
    if (chieuTien(t) !== 'vao' || !(Number(t.amount) >= 0) || noiBoIds.has(id) || loai.has(id)) continue;
    ra.push({ nguon: 'giao_dich', id, so_tien: Math.round(doLonTien(t)), ngay });
  }
  return ra;
}

/** Hoá đơn còn hiệu lực, thành từng khoản để chia theo nhóm hoạt động. */
export function khoanHoaDon(rows: Row[]): KhoanDoanhThu[] {
  return rows
    .filter((r) => r.direction === 'issued' && (r.invoice_status === null || r.invoice_status === undefined || Number(r.invoice_status) === 1))
    .map((r) => {
      const p = Number(r.issuance_period ?? 0);
      return { nguon: 'hoa_don' as const, id: String(r.id), so_tien: Number(r.total_amount ?? 0), ngay: `${Math.floor(p / 100)}-${String(p % 100).padStart(2, '0')}-15` };
    });
}

/** Hoá đơn đang có hiệu lực mới là doanh thu; hoá đơn huỷ, thay thế, điều chỉnh thì không. */
export function tinhHoaDon(rows: Row[]): { tong: number; theo_quy: Bon; so: number } | null {
  const hieuLuc = rows.filter(
    (r) => r.direction === 'issued' && (r.invoice_status === null || r.invoice_status === undefined || Number(r.invoice_status) === 1),
  );
  if (!hieuLuc.length) return null;
  const theoQuy = bon();
  for (const r of hieuLuc) theoQuy[quyCuaThang(Number(r.issuance_period ?? 0) % 100) - 1] += Number(r.total_amount ?? 0);
  return { tong: theoQuy.reduce((a, b) => a + b, 0), theo_quy: theoQuy, so: hieuLuc.length };
}

export interface NguonTienVao {
  giao_dich: Row[];
  tai_khoan: string[];
  xac_nhan: Row[];
  noi_bo: { internalIds: Set<string>; needsReview: unknown[]; suyDoanIds: Set<string> };
}

/**
 * Đọc đủ (từng trang) giao dịch cả năm, tài khoản của chính mình và phân loại người đã xác nhận.
 * `cotThem`: cột giao dịch mà nơi gọi cần thêm để hiện (tên người chuyển, nội dung…).
 */
export async function docNguonTienVao(db: Db, companyId: string, nam: number, laDemo: boolean, cotThem = ''): Promise<NguonTienVao> {
  const [giaoDich, taiKhoan, xacNhan] = await Promise.all([
    // Tiền giả của sandbox không được nằm trong con số quyết định nghĩa vụ thuế của công ty thật.
    docHet((a, b) => locMinhHoa(db.from('transactions')
      .select(`id, amount, type, transaction_date, account_number, counter_account_number, is_synthetic${cotThem}`)
      .eq('company_id', companyId), laDemo)
      .gte('transaction_date', `${nam}-01-01`).lte('transaction_date', `${nam}-12-31`)
      .order('transaction_date', { ascending: true }).order('id', { ascending: true })
      .range(a, b), 'giao dịch'),
    taiKhoanCuaToi(db, companyId),
    docHet((a, b) => db.from('revenue_classifications')
      .select('transaction_id, confirmed_type, revenue_effect, ghi_chu, confirmed_role, confirmed_at')
      .eq('company_id', companyId).order('transaction_id', { ascending: true }).range(a, b), 'phân loại tiền vào'),
  ]);
  const dong = giaoDich.map((t) => ({ ...t, amount: Number(t.amount) }));
  const noiBo = findInternalTransfers(dong as LedgerTx[], { ownAccounts: taiKhoan });
  // Người xác nhận "đây là tiền bán hàng" thắng cặp nội bộ chỉ do máy suy đoán — xem `ganNoiBoTheoNguoi`.
  const { internalIds, suyDoanIds } = ganNoiBoTheoNguoi(noiBo, xacNhan as XacNhanTinh[]);
  return { giao_dich: dong, tai_khoan: taiKhoan, xac_nhan: xacNhan, noi_bo: { internalIds, needsReview: noiBo.needsReview, suyDoanIds } };
}

export interface PhanTichTienVao {
  /** Khoản CHƯA ai xác nhận mà MIMI đoán không phải doanh thu (vay, góp vốn, người nhà…): đang tạm tính là doanh thu. */
  goi_y_loai_ra: { so_tien: number; so_khoan: number };
  /** Tiền sàn TMĐT trả về (ròng, đã trừ phí) — doanh thu tính thuế là giá bán, cao hơn. */
  tien_san_tmdt: { so_tien: number; so_khoan: number };
}

/**
 * Hai con số giúp giao diện KHÔNG kết luận ngưỡng quá sớm (29/09/2026, xem docs/PHAN_HOI_GIA_LAP_WTP.md):
 * vừa nhập sao kê, khoản vay 200 triệu chưa ai xác nhận đẩy doanh thu qua 1 tỷ; và sàn trả tiền ròng.
 */
export function phanTichTienVao(nam: number, giaoDich: (GiaoDichTinh & Row)[], xacNhan: XacNhanTinh[], noiBoIds: Set<string>): PhanTichTienVao {
  const daXacNhan = new Set(xacNhan.filter((x) => x.revenue_effect === 'include' || x.revenue_effect === 'exclude').map((x) => String(x.transaction_id)));
  const kq: PhanTichTienVao = { goi_y_loai_ra: { so_tien: 0, so_khoan: 0 }, tien_san_tmdt: { so_tien: 0, so_khoan: 0 } };
  const tienTo = String(nam);
  const daThay = new Set<string>();
  for (const t of giaoDich) {
    const id = String(t.id);
    if (chieuTien(t) !== 'vao' || !ngayVN(t.transaction_date).startsWith(tienTo) || noiBoIds.has(id) || daThay.has(id) || !(Number(t.amount) >= 0)) continue;
    daThay.add(id);
    const k = { merchant_name: t.merchant_name ?? null, counter_account_name: t.counter_account_name ?? null, payment_reference: t.payment_reference ?? null };
    if (laTienSanTmdt(k)) { kq.tien_san_tmdt.so_tien += doLonTien(t); kq.tien_san_tmdt.so_khoan += 1; }
    // Dòng mang type 'loan' (CHECK của bảng `transactions` cho phép) là tiền vay rõ ràng dù nội dung không nói.
    if (!daXacNhan.has(id) && (goiYTienVao(k) || t.type === 'loan')) { kq.goi_y_loai_ra.so_tien += doLonTien(t); kq.goi_y_loai_ra.so_khoan += 1; }
  }
  return kq;
}

// ── Độ chắc chắn: từ số liệu sang khoảng, ngưỡng và MỘT câu hỏi (do-chac-chan.ts) ────────────────

export const TOI_DA_UNG_VIEN = 30;
const NGAN_NHOM = 500;

const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;
const ddmm = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;

/** FNV-1a 32 bit: khoá nhóm ngắn, ổn định, không chứa chữ tiếng Việt. */
function bamChuoi(x: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < x.length; i++) { h ^= x.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/**
 * Những thứ chưa rõ mà trả lời được làm khoảng hẹp lại: từng khoản, cả nhóm khoản giống nhau (một câu
 * trả lời cho cả nhóm), cặp nội bộ suy đoán, dòng số âm. Mỗi thứ có khoá ổn định theo dữ liệu gốc.
 * Chỉ giữ `TOI_DA_UNG_VIEN` thứ lớn nhất — câu hỏi chỉ cần thứ lớn nhất; phần còn lại chỉ để đếm.
 */
export function ungVienChuaRo(
  nam: number, giaoDich: (GiaoDichTinh & Row)[], xacNhan: XacNhanTinh[], noiBoIds: Set<string>, suyDoanIds: Set<string>,
): { ds: UngVienCauHoi[]; tong: number } {
  const hl = new Map(xacNhan.map((x) => [String(x.transaction_id), x.revenue_effect]));
  const tienTo = String(nam);
  const daThay = new Set<string>();
  const chuaRo: { id: string; tien: number; k: Row }[] = [];
  const ra: UngVienCauHoi[] = [];
  for (const t of giaoDich) {
    const id = String(t.id);
    const ngay = ngayVN(t.transaction_date);
    if (!ngay.startsWith(tienTo) || daThay.has(id) || chieuTien(t) !== 'vao') continue;
    daThay.add(id);
    const goc = Number(t.amount);
    if (!Number.isFinite(goc)) continue;
    const tien = Math.round(Math.abs(goc));
    const quyet = hl.get(id);
    const ten = (t.counter_account_name ?? '').toString().trim();
    const nd = (t.merchant_name ?? t.payment_reference ?? '').toString().trim();
    const tenNguoi = `${ten ? ` từ ${ten}` : ''}${nd ? ` — “${nd.slice(0, 40)}”` : ''}`;
    if (goc < 0) {
      if (quyet === undefined || quyet === 'pending') {
        ra.push({ khoa: `am:${id}`, loai: 'am_bat_thuong', so_tien: tien, mo_ta: `khoản −${vnd(tien)} ngày ${ddmm(ngay)}${tenNguoi}`, transaction_ids: [id], goi_y: null });
      }
      continue;
    }
    if (noiBoIds.has(id)) {
      if (suyDoanIds.has(id) && tien > 0) {
        ra.push({ khoa: `noi_bo:${id}`, loai: 'noi_bo_suy_doan', so_tien: tien, mo_ta: `khoản ${vnd(tien)} ngày ${ddmm(ngay)}${tenNguoi}`, transaction_ids: [id], goi_y: 'internal_transfer' });
      }
      continue;
    }
    if (quyet === 'include' || quyet === 'exclude' || tien === 0) continue;
    const k = { merchant_name: t.merchant_name ?? null, counter_account_name: t.counter_account_name ?? null, payment_reference: t.payment_reference ?? null };
    const goiY = goiYPhanLoai(k)?.loai ?? (t.type === 'loan' ? 'loan' as const : null);
    chuaRo.push({ id, tien, k });
    ra.push({ khoa: `gd:${id}`, loai: 'khoan_tien_vao', so_tien: tien, mo_ta: `khoản ${vnd(tien)} ngày ${ddmm(ngay)}${tenNguoi}`, transaction_ids: [id], goi_y: goiY });
  }
  // Nhóm: cùng người chuyển + cùng kiểu nội dung, từ 2 khoản — trả lời một lần cho cả nhóm.
  const theoMau = new Map<string, typeof chuaRo>();
  for (const r of chuaRo) {
    const m = mauNoiDung(r.k as never);
    theoMau.set(m, [...(theoMau.get(m) ?? []), r]);
  }
  for (const [mau, ds] of theoMau) {
    if (ds.length < 2) continue;
    // Lớn nhất trước rồi theo id: kết quả không phụ thuộc thứ tự đọc dòng, và nếu phải cắt 500 thì cắt phần nhỏ.
    const dau = [...ds].sort((x, y) => (y.tien - x.tien) || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0)).slice(0, NGAN_NHOM);
    const tong = dau.reduce((x, r) => x + r.tien, 0);
    const nguoi = (dau[0].k.counter_account_name ?? '').toString().trim();
    const goiY = dau.map((r) => goiYPhanLoai(r.k as never)?.loai).find(Boolean) ?? null;
    ra.push({
      khoa: `nhom:${bamChuoi(mau)}`, loai: 'nhom_khoan', so_tien: tong, so_khoan: dau.length,
      mo_ta: `${dau.length} khoản ${nguoi ? `từ ${nguoi}` : 'cùng kiểu nội dung'} (tổng ${vnd(tong)})`,
      transaction_ids: dau.map((r) => r.id), goi_y: goiY,
    });
  }
  const cmp = (a: UngVienCauHoi, b: UngVienCauHoi) => (Number(b.so_tien) - Number(a.so_tien)) || (a.khoa < b.khoa ? -1 : a.khoa > b.khoa ? 1 : 0);
  return { ds: ra.sort(cmp).slice(0, TOI_DA_UNG_VIEN), tong: ra.length };
}

/**
 * Độ chắc chắn của DOANH THU NĂM (ước tính từ ngân hàng): khoảng, ngưỡng luật, đúng một câu hỏi.
 * `ungVien` từ `ungVienChuaRo`.
 */
export function doChacChanDoanhThu(
  s: SoLieuTienVao, o: { coGiaoDich: boolean; ungVien?: { ds: UngVienCauHoi[]; tong: number } },
): KetQuaDoChacChan {
  const ds = [...(o.ungVien?.ds ?? [])];
  // Tháng nằm giữa hai tháng có dữ liệu mà trống trơn: sao kê có thể thiếu. Mức tối đa của một tháng
  // thiếu = tháng lớn nhất ĐÃ THẤY (suy từ dữ liệu, không bịa; cận này nói rõ ở `khoang_trong`).
  const thangThieu = thangThieuDuLieu(s.thang_co_giao_dich);
  const toiDaThang = Math.max(0, ...Object.values(s.toi_da_theo_thang));
  for (const t of thangThieu) {
    ds.push({ khoa: `thieu_thang:${t}`, loai: 'thang_thieu', so_tien: toiDaThang, mo_ta: `tháng ${t.slice(5, 7)}/${t.slice(0, 4)}` });
  }
  if (!o.coGiaoDich) ds.push({ khoa: 'thieu_sao_ke', loai: 'thieu_sao_ke', so_tien: null, mo_ta: `năm ${s.nam}` });
  return tinhDoChacChan({
    gia_tri: s.uoc_tinh,
    // Số âm không nằm trong uoc_tinh nhưng có thể là hoàn/huỷ làm doanh thu thật thấp hơn: nới cận dưới.
    co_the_giam: s.chua_ro + s.am_bat_thuong,
    co_the_tang: s.noi_bo_suy_doan,
    khoang_trong: thangThieu.length ? { so_thang: thangThieu.length, toi_da_moi_thang: toiDaThang, thang: thangThieu } : undefined,
    co_du_lieu: o.coGiaoDich,
    theo_quy: {
      gia_tri: [...s.uoc_tinh_theo_quy],
      co_the_giam: s.chua_ro_theo_quy.map((x, i) => x + s.am_bat_thuong_theo_quy[i]),
      co_the_tang: [...s.noi_bo_suy_doan_theo_quy],
    },
    ung_vien: ds,
    tong_ung_vien: (o.ungVien?.tong ?? 0) + thangThieu.length,
  });
}

export interface SoLieuDoanhThu extends SoLieuTienVao, PhanTichTienVao {
  hoa_don: number | null;
  hoa_don_theo_quy: Bon | null;
  so_hoa_don: number;
  /** Mọi giao dịch trong năm, cả vào lẫn ra. */
  so_giao_dich: number;
  /** Số giao dịch (cả hai phía) bị coi là chuyển giữa tài khoản của chính mình. */
  so_giao_dich_noi_bo: number;
  /** Cặp chuyển nội bộ MIMI đoán (không chắc chắn), chưa ai xác nhận, và đã trừ khỏi doanh thu. */
  can_xem_lai: number;
  co_ket_noi_ngan_hang: boolean;
  /** Doanh thu theo nhóm hoạt động, từng nguồn — xem `theo-hoat-dong.ts`. */
  hoat_dong: { ngan_hang: ChiaHoatDong; hoa_don: ChiaHoatDong | null; phan_loai: PhanLoaiHoatDong[] };
  /** Khoảng, ngưỡng và MỘT câu hỏi của doanh thu năm — xem `do-chac-chan.ts`. */
  do_chac_chan: KetQuaDoChacChan;
  /** Độ chắc chắn của doanh thu từng nhóm hoạt động (phần chưa xếp nhóm có thể thuộc nhóm nào cũng được). */
  do_chac_chan_nhom: Record<HoatDong, KetQuaDoChacChan>;
}

/**
 * Dựng toàn bộ số liệu doanh thu từ dữ liệu ĐÃ ĐỌC. Tách khỏi `docSoLieuDoanhThu` để test đối kháng
 * chạy cả đường đi (nội bộ → phân loại → khoảng → câu hỏi) mà không cần CSDL.
 */
export function dungSoLieuDoanhThu(
  nam: number, nguon: NguonTienVao, phanLoai: PhanLoaiHoatDong[], hoaDon: Row[] = [],
): SoLieuDoanhThu {
  const gd = nguon.giao_dich as (GiaoDichTinh & Row)[];
  const xn = nguon.xac_nhan as XacNhanTinh[];
  const { internalIds, suyDoanIds } = nguon.noi_bo;
  const tv = tinhTienVao(nam, gd, xn, internalIds, suyDoanIds);
  const hd = tinhHoaDon(hoaDon);
  const khoan = khoanDoanhThuNganHang(nam, gd, xn, internalIds);
  const chia = chiaTheoHoatDong('giao_dich', khoan, phanLoai);
  const ungVien = ungVienChuaRo(nam, gd, xn, internalIds, suyDoanIds);
  const idChuaXep = new Set(chia.nhom.chua_ro.ids);
  const chuaXep = khoan.filter((k) => idChuaXep.has(k.id));
  const nhom = Object.fromEntries(HOAT_DONG.map((h) => [h, doChacChanNhom(chia.nhom[h].so_tien, chia.nhom.chua_ro.so_tien, chia.tong, chuaXep)])) as Record<HoatDong, KetQuaDoChacChan>;
  return {
    ...tv,
    ...phanTichTienVao(nam, gd, xn, internalIds),
    hoa_don: hd?.tong ?? null,
    hoa_don_theo_quy: hd?.theo_quy ?? null,
    so_hoa_don: hd?.so ?? 0,
    so_giao_dich: nguon.giao_dich.length,
    so_giao_dich_noi_bo: internalIds.size,
    can_xem_lai: (nguon.noi_bo.needsReview as { inId?: string }[]).filter((m) => m.inId && suyDoanIds.has(m.inId)).length,
    co_ket_noi_ngan_hang: nguon.tai_khoan.length > 0,
    hoat_dong: {
      ngan_hang: chia,
      hoa_don: hd ? chiaTheoHoatDong('hoa_don', khoanHoaDon(hoaDon), phanLoai) : null,
      phan_loai: phanLoai,
    },
    do_chac_chan: doChacChanDoanhThu(tv, { coGiaoDich: nguon.giao_dich.length > 0, ungVien }),
    do_chac_chan_nhom: nhom,
  };
}

export async function docSoLieuDoanhThu(db: Db, companyId: string, nam: number, laDemo = false): Promise<SoLieuDoanhThu> {
  // 29/09/2026: KHÔNG đọc `gdt_invoices` nữa — Casso chưa bật sản phẩm hoá đơn điện tử cho app production, bảng luôn trống.
  // Doanh thu mọi nơi (tax-summary, tờ khai nháp, trợ lý) là ước tính từ ngân hàng.
  const [nguon, phanLoai] = await Promise.all([
    docNguonTienVao(db, companyId, nam, laDemo, ', merchant_name, counter_account_name, payment_reference'),
    docHet((a, b) => db.from('phan_loai_hoat_dong')
      .select('nguon, nguon_id, hoat_dong')
      .eq('company_id', companyId).order('id', { ascending: true }).range(a, b), 'nhóm hoạt động'),
  ]);
  return dungSoLieuDoanhThu(nam, nguon, phanLoai as PhanLoaiHoatDong[]);
}
