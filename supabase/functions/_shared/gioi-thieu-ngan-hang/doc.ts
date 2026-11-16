/**
 * Đọc dữ liệu cho dấu hiệu tăng trưởng của MỘT công ty (16/11/2026). `companyId` phải là công ty đã qua kiểm thành viên;
 * mọi truy vấn lọc `company_id`. Chỉ đọc.
 */
import { docHet } from '../doc-het.ts';
import { locMinhHoa } from '../minh-hoa.ts';
import { docSoLieuDoanhThu } from '../doanh-thu/so-lieu.ts';
import { congThang } from '../tai-chinh/du-bao.ts';
import type { QuyetDinhChu } from '../dong-tien/phan-nhom.ts';
import type { CoSoTH, DauVaoTinHieu, DoanhThuNamTH, GiaoDichNguon } from './tin-hieu.ts';
import type { GoiNganHang } from './khop-goi.ts';

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

const thieuBang = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|could not find the table/i.test(e.message ?? ''));

export async function docDauVaoTinHieu(db: Db, companyId: string, homNay: string, laDemo: boolean): Promise<DauVaoTinHieu> {
  const tu = `${congThang(homNay.slice(0, 7), -24)}-01`;
  const nam = Number(homNay.slice(0, 4));
  const [gd, pl, kn, cs, cstk, sl] = await Promise.all([
    docHet((a, b) => locMinhHoa(db.from('transactions')
      .select('id, company_id, amount, type, transaction_date, merchant_name, counter_account_name, payment_reference, category, account_number, counter_account_number, is_synthetic')
      .eq('company_id', companyId), laDemo)
      .gte('transaction_date', tu).lte('transaction_date', homNay)
      .order('transaction_date', { ascending: true }).order('id', { ascending: true })
      .range(a, b), 'giao dịch', 100_000),
    docHet((a, b) => db.from('revenue_classifications').select('company_id, transaction_id, confirmed_type, revenue_effect')
      .eq('company_id', companyId).order('transaction_id', { ascending: true }).range(a, b), 'phân loại tiền vào'),
    db.from('bank_connections').select('company_id, account_number').eq('company_id', companyId),
    db.from('co_so').select('id, company_id, ten, tao_luc').eq('company_id', companyId).order('tao_luc', { ascending: true }).limit(200),
    db.from('co_so_tai_khoan').select('company_id, so_tai_khoan, co_so_id').eq('company_id', companyId).limit(1000),
    docSoLieuDoanhThu(db, companyId, nam, laDemo).catch((e: unknown) => { console.error('gioi-thieu: doanh thu năm:', e instanceof Error ? e.message : e); return null; }),
  ]);
  if (kn.error) throw new Error(`kết nối ngân hàng: ${kn.error.message}`);
  if (cs.error && !thieuBang(cs.error)) throw new Error(`cơ sở: ${cs.error.message}`);
  if (cstk.error && !thieuBang(cstk.error)) throw new Error(`tài khoản cơ sở: ${cstk.error.message}`);

  // Phòng truy vấn hỏng: bỏ mọi dòng mang công ty khác.
  const cua = (r: Row) => String(r.company_id) === companyId;
  const giaoDich: GiaoDichNguon[] = gd.filter(cua).map((t) => ({
    id: String(t.id), amount: Number(t.amount), type: t.type ?? null, transaction_date: String(t.transaction_date),
    merchant_name: t.merchant_name, counter_account_name: t.counter_account_name, payment_reference: t.payment_reference,
    category: t.category, account_number: t.account_number, counter_account_number: t.counter_account_number,
  }));
  const quyetDinh: Record<string, QuyetDinhChu> = {};
  for (const r of pl.filter(cua)) quyetDinh[String(r.transaction_id)] = { loai: r.confirmed_type ?? null, hieu_luc: r.revenue_effect ?? null };
  const tkCoSo = ((cstk.data ?? []) as Row[]).filter(cua);
  const coSo: CoSoTH[] = ((cs.data ?? []) as Row[]).filter(cua).map((c) => ({
    id: String(c.id), ten: String(c.ten ?? ''), tao_luc: String(c.tao_luc ?? ''),
    tai_khoan: tkCoSo.filter((t) => String(t.co_so_id) === String(c.id)).map((t) => String(t.so_tai_khoan)),
  }));
  let doanhThuNam: DoanhThuNamTH | null = null;
  if (sl) {
    const dc = (sl as Row).do_chac_chan ?? {};
    doanhThuNam = {
      nam, uoc_tinh: Number(dc.gia_tri ?? 0), can_duoi: Number(dc.can_duoi ?? 0), can_tren: Number(dc.can_tren ?? 0),
      trang_thai: (dc.trang_thai ?? 'chua_du_du_lieu') as DoanhThuNamTH['trang_thai'],
    };
  }
  return {
    hom_nay: homNay,
    giao_dich: giaoDich,
    quyet_dinh_chu: quyetDinh,
    tai_khoan_cua_minh: [...((kn.data ?? []) as Row[]).filter(cua).map((r) => String(r.account_number ?? '')), ...tkCoSo.map((t) => String(t.so_tai_khoan))],
    doanh_thu_nam: doanhThuNam,
    co_so: coSo,
  };
}

export const COT_GOI = 'id, ma, ngan_hang, phap_nhan_nhan, ten_goi, nhu_cau, mo_ta, tieu_chi, da_xac_minh, nguon, dang_hoat_dong';

export async function docDanhMucGoi(db: Db): Promise<GoiNganHang[]> {
  const { data, error } = await db.from('goi_ngan_hang').select(COT_GOI).eq('dang_hoat_dong', true).order('ma', { ascending: true }).limit(500);
  if (error) {
    if (thieuBang(error)) return [];
    throw new Error(`danh mục gói: ${error.message}`);
  }
  return ((data ?? []) as Row[]).map((g) => ({
    id: String(g.id), ma: String(g.ma), ngan_hang: String(g.ngan_hang), phap_nhan_nhan: String(g.phap_nhan_nhan ?? g.ngan_hang),
    ten_goi: String(g.ten_goi), nhu_cau: String(g.nhu_cau), mo_ta: String(g.mo_ta ?? ''),
    tieu_chi: g.da_xac_minh === true && g.tieu_chi && typeof g.tieu_chi === 'object' ? g.tieu_chi : null,
    da_xac_minh: g.da_xac_minh === true, nguon: g.nguon ?? null, dang_hoat_dong: g.dang_hoat_dong !== false,
  }));
}
