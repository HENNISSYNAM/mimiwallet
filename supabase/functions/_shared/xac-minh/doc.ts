/**
 * Đọc dữ liệu cho báo cáo "Doanh thu đã xác minh" — cùng nguồn, cùng bộ lọc với `docNguonTienVao` (so-lieu.ts):
 * dòng minh hoạ chỉ tính ở công ty demo, tài khoản của chính mình để nhận ra chuyển nội bộ, người xác nhận thắng
 * cặp nội bộ chỉ do máy suy đoán. Khác ở chỗ kỳ có thể vắt qua hai năm (12 tháng gần nhất), nên đọc theo khoảng
 * ngày rồi ghép cặp nội bộ trên cả kỳ — cặp chuyển ngày 31/12 → 01/01 không bị bỏ sót.
 *
 * Cột người chuyển, nội dung chuyển khoản KHÔNG được đọc. Số tài khoản chỉ dùng để nhận ra chuyển nội bộ và
 * không đi vào báo cáo.
 */
import { findInternalTransfers, type LedgerTx } from '../ledger/internal-transfer.ts';
import { taiKhoanCuaToi } from '../ledger/tai-khoan.ts';
import { congTyLaDemo, locMinhHoa } from '../minh-hoa.ts';
import { docHet } from '../doc-het.ts';
import { ganNoiBoTheoNguoi, type XacNhanTinh } from '../doanh-thu/so-lieu.ts';
import { lapBaoCao, type BaoCaoXacMinh, type KyBaoCao, type PhanLoaiXacMinh } from './bao-cao.ts';

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

const ngayCuoi = (t: string) => {
  const [y, m] = t.split('-').map(Number);
  return `${t}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;
};

export async function dungBaoCao(db: Db, companyId: string, ky: KyBaoCao, lapNgay: string): Promise<BaoCaoXacMinh> {
  const laDemo = await congTyLaDemo(db, companyId);
  const tu = `${ky.tu_thang}-01`;
  const den = ngayCuoi(ky.den_thang);
  const [giaoDich, taiKhoan, phanLoai, suKien, congTy] = await Promise.all([
    docHet((a, b) => locMinhHoa(db.from('transactions')
      .select('id, amount, type, transaction_date, account_number, counter_account_number, is_synthetic')
      .eq('company_id', companyId), laDemo)
      .gte('transaction_date', tu).lte('transaction_date', den)
      .order('transaction_date', { ascending: true }).order('id', { ascending: true })
      .range(a, b), 'giao dịch'),
    taiKhoanCuaToi(db, companyId),
    docHet((a, b) => db.from('revenue_classifications')
      .select('transaction_id, confirmed_type, revenue_effect, suggestion_source')
      .eq('company_id', companyId).order('transaction_id', { ascending: true }).range(a, b), 'phân loại tiền vào'),
    docHet((a, b) => db.from('revenue_classification_events')
      .select('id, transaction_id')
      .eq('company_id', companyId).order('id', { ascending: true }).range(a, b), 'lịch sử phân loại'),
    db.from('companies').select('name').eq('id', companyId).maybeSingle(),
  ]);
  const dong = (giaoDich as Row[]).map((t) => ({ ...t, amount: Number(t.amount) }));
  const noiBo = findInternalTransfers(dong as LedgerTx[], { ownAccounts: taiKhoan });
  const { internalIds, suyDoanIds } = ganNoiBoTheoNguoi(noiBo, phanLoai as XacNhanTinh[]);
  const idKy = new Set(dong.map((t) => String(t.id)));
  return lapBaoCao({
    ky,
    lap_ngay: lapNgay,
    ten_doanh_nghiep: (congTy?.data?.name as string | null | undefined) ?? null,
    // Chỉ chuyển sang bộ máy tính những cột nó cần — không mang số tài khoản đi tiếp.
    giao_dich: dong.map((t) => ({ id: String(t.id), amount: t.amount, type: t.type ?? null, transaction_date: String(t.transaction_date) })),
    phan_loai: phanLoai as PhanLoaiXacMinh[],
    noi_bo_ids: internalIds,
    suy_doan_ids: suyDoanIds,
    so_tai_khoan: taiKhoan.length,
    so_lan_doi_phan_loai: (suKien as Row[]).filter((e) => idKy.has(String(e.transaction_id))).length,
    du_lieu_minh_hoa: laDemo,
  });
}

