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
 *   hoa_don      tổng hoá đơn điện tử đã xuất, theo Tổng cục Thuế. Không phải ước tính.
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

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

type Bon = [number, number, number, number];
const bon = (): Bon => [0, 0, 0, 0];
const quyCuaThang = (thang: number) => Math.max(1, Math.min(4, Math.ceil(thang / 3)));

export const CHUA_GOM = 'Chưa gồm tiền bán thu bằng tiền mặt: MIMI chỉ thấy tiền qua tài khoản ngân hàng và hoá đơn điện tử.';

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
}

/** Hàm thuần: cùng dữ liệu vào thì cùng con số ra, ở mọi màn hình. */
export function tinhTienVao(nam: number, giaoDich: GiaoDichTinh[], xacNhan: XacNhanTinh[], noiBoIds: Set<string>): SoLieuTienVao {
  const hieuLuc = new Map(xacNhan.map((x) => [String(x.transaction_id), x.revenue_effect]));
  const s: SoLieuTienVao = {
    nam, so_khoan_vao: 0, tien_vao: 0, noi_bo: 0, khong_phai_doanh_thu: 0, so_khong_phai_doanh_thu: 0,
    da_xac_nhan: 0, chua_ro: 0, so_chua_ro: 0, uoc_tinh: 0, uoc_tinh_theo_quy: bon(), ty_le_da_giai_thich: null,
  };
  const tienTo = String(nam);
  for (const t of giaoDich) {
    if (chieuTien(t) !== 'vao' || !String(t.transaction_date).startsWith(tienTo)) continue;
    const tien = doLonTien(t);
    s.so_khoan_vao += 1;
    s.tien_vao += tien;
    const id = String(t.id);
    // Chuyển nội bộ thắng mọi phân loại: tiền của mình chuyển cho mình không bao giờ là doanh thu.
    if (noiBoIds.has(id)) { s.noi_bo += tien; continue; }
    const hl = hieuLuc.get(id);
    if (hl === 'exclude') { s.khong_phai_doanh_thu += tien; s.so_khong_phai_doanh_thu += 1; continue; }
    if (hl === 'include') s.da_xac_nhan += tien;
    else { s.chua_ro += tien; s.so_chua_ro += 1; }
    s.uoc_tinh += tien;
    s.uoc_tinh_theo_quy[quyCuaThang(Number(String(t.transaction_date).slice(5, 7))) - 1] += tien;
  }
  if (s.tien_vao > 0) s.ty_le_da_giai_thich = (s.noi_bo + s.khong_phai_doanh_thu + s.da_xac_nhan) / s.tien_vao;
  return s;
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
  noi_bo: { internalIds: Set<string>; needsReview: unknown[] };
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
  return { giao_dich: dong, tai_khoan: taiKhoan, xac_nhan: xacNhan, noi_bo: noiBo };
}

export interface SoLieuDoanhThu extends SoLieuTienVao {
  hoa_don: number | null;
  hoa_don_theo_quy: Bon | null;
  so_hoa_don: number;
  /** Mọi giao dịch trong năm, cả vào lẫn ra. */
  so_giao_dich: number;
  /** Số giao dịch (cả hai phía) bị coi là chuyển giữa tài khoản của chính mình. */
  so_giao_dich_noi_bo: number;
  /** Cặp chuyển nội bộ MIMI đoán (không chắc chắn) và đã trừ khỏi doanh thu. */
  can_xem_lai: number;
  co_ket_noi_ngan_hang: boolean;
}

export async function docSoLieuDoanhThu(db: Db, companyId: string, nam: number, laDemo = false): Promise<SoLieuDoanhThu> {
  const [nguon, hoaDon] = await Promise.all([
    docNguonTienVao(db, companyId, nam, laDemo),
    docHet((a, b) => db.from('gdt_invoices')
      .select('direction, total_amount, invoice_status, issuance_period')
      .eq('company_id', companyId)
      .gte('issuance_period', nam * 100 + 1).lte('issuance_period', nam * 100 + 12)
      .order('id', { ascending: true }).range(a, b), 'hoá đơn điện tử'),
  ]);
  const tv = tinhTienVao(nam, nguon.giao_dich as GiaoDichTinh[], nguon.xac_nhan as XacNhanTinh[], nguon.noi_bo.internalIds);
  const hd = tinhHoaDon(hoaDon);
  return {
    ...tv,
    hoa_don: hd?.tong ?? null,
    hoa_don_theo_quy: hd?.theo_quy ?? null,
    so_hoa_don: hd?.so ?? 0,
    so_giao_dich: nguon.giao_dich.length,
    so_giao_dich_noi_bo: nguon.noi_bo.internalIds.size,
    can_xem_lai: nguon.noi_bo.needsReview.length,
    co_ket_noi_ngan_hang: nguon.tai_khoan.length > 0,
  };
}
