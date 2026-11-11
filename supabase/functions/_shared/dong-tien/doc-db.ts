/**
 * ĐỌC CSDL CHO DỰ BÁO DÒNG TIỀN (10/11/2026). Không import Deno: test chạy với CSDL giả.
 *
 * QUY MÔ. Giao dịch đọc theo trang bằng CON TRỎ (keyset) trên (transaction_date, id) — không dùng OFFSET (càng về sau
 * càng chậm) và không có một lệnh select khổng lồ. Mỗi trang đổ thẳng vào `BoGom` rồi bỏ. Chỉ mục
 * `transactions_company_date_id_idx` (migration 20261110120000) phục vụ đúng thứ tự này. Dừng khi trang RỖNG, không
 * phải khi trang ngắn — máy chủ API có thể tự cắt số dòng mỗi trang thấp hơn số xin.
 *
 * AN TOÀN. Mọi truy vấn lọc `company_id`; dòng trả về mang công ty khác → `LoiKhacCongTy` (bộ gom ném). Con trỏ chỉ
 * nhận ngày YYYY-MM-DD và uuid trước khi ghép vào bộ lọc. Kế toán một cơ sở: chỉ giao dịch của tài khoản thuộc cơ sở
 * (`trongPhamVi`), và không dùng mô hình học từ cả công ty.
 */
import { trongPhamVi, type PhamViCoSo } from '../da-co-so/pham-vi.ts';
import { BoGom, LoiKhacCongTy, type GiaoDichDT } from './tong-hop.ts';
import { duBaoTuTongHop, type DuBaoDongTienML } from './du-bao.ts';
import { deXuatPhanLoai, huanLuyen, trangThaiCuoi, type DeXuatPhanLoai, type MauHoc, type ThamSoPhanLoai } from './hoc-phan-loai.ts';
import { NHOM, type QuyetDinhChu } from './phan-nhom.ts';
import type { NgonDT } from './loi.ts';

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

export const COT_GIAO_DICH = 'id, company_id, amount, type, transaction_date, merchant_name, counter_account_name, payment_reference, category, account_number, counter_account_number';
export const TRANG_DT = 1000;
/** Trần an toàn — 300k dòng ≈ 2 năm của một cửa hàng rất đông khách. */
export const TOI_DA_DT = 300_000;
export const NGAY_NHIN_LAI = 730;

const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class LoiConTro extends Error {}

export interface KetQuaDoc { so_dong: number; so_trang: number; bi_cat: boolean }

/** Đọc toàn bộ giao dịch của MỘT công ty theo trang con trỏ; gọi `moiTrang` cho từng trang. */
export async function docGiaoDichTheoTrang(
  db: Db, companyId: string,
  o: { tuNgay: string; denNgay: string; laDemo: boolean; phamVi?: PhamViCoSo | null; trang?: number; toiDa?: number },
  moiTrang: (ds: GiaoDichDT[]) => void,
): Promise<KetQuaDoc> {
  const trang = o.trang ?? TRANG_DT; const toiDa = o.toiDa ?? TOI_DA_DT;
  let conTro: { d: string; id: string } | null = null;
  let soDong = 0, soTrang = 0;
  for (;;) {
    // Cửa hàng thật không bao giờ thấy dòng thử; cửa hàng mẫu chỉ có dòng thử.
    let q = db.from('transactions').select(COT_GIAO_DICH).eq('company_id', companyId)
      .in('is_synthetic', o.laDemo ? [true, false] : [false])
      .gte('transaction_date', o.tuNgay).lte('transaction_date', o.denNgay);
    if (conTro) {
      if (!NGAY_RE.test(conTro.d) || !UUID_RE.test(conTro.id)) throw new LoiConTro('Con trỏ phân trang không hợp lệ.');
      q = q.or(`transaction_date.gt.${conTro.d},and(transaction_date.eq.${conTro.d},id.gt.${conTro.id})`);
    }
    const { data, error } = await q.order('transaction_date', { ascending: true }).order('id', { ascending: true }).limit(trang);
    if (error) throw new Error(`giao dịch: ${error.message}`);
    const ds = (data ?? []) as Row[];
    soTrang++;
    if (!ds.length) return { so_dong: soDong, so_trang: soTrang, bi_cat: false };
    for (const r of ds) if (r.company_id !== companyId) throw new LoiKhacCongTy();
    const cuoi = ds[ds.length - 1];
    conTro = { d: String(cuoi.transaction_date).slice(0, 10), id: String(cuoi.id) };
    const loc = o.phamVi ? ds.filter((r) => trongPhamVi(o.phamVi!, r.account_number)) : ds;
    moiTrang(loc as GiaoDichDT[]);
    soDong += ds.length;
    if (soDong >= toiDa) return { so_dong: soDong, so_trang: soTrang, bi_cat: true };
  }
}

/** Đọc hết một bảng nhỏ-vừa theo trang con trỏ trên cột `cot` (đơn điệu). */
async function docTheoCot(db: Db, bang: string, chon: string, companyId: string, cot: string, them: (q: Db) => Db = (q) => q, toiDa = 50_000): Promise<Row[]> {
  const out: Row[] = []; let sau: string | number | null = null;
  for (;;) {
    let q = them(db.from(bang).select(chon).eq('company_id', companyId));
    if (sau !== null) q = q.gt(cot, sau);
    const { data, error } = await q.order(cot, { ascending: true }).limit(TRANG_DT);
    if (error) throw new Error(`${bang}: ${error.message}`);
    const ds = (data ?? []) as Row[];
    if (!ds.length) return out;
    for (const r of ds) if (r.company_id !== undefined && r.company_id !== companyId) throw new LoiKhacCongTy();
    out.push(...ds); sau = ds[ds.length - 1][cot];
    if (out.length >= toiDa) return out;
  }
}

const congNgay = (s: string, n: number) => new Date(Date.parse(`${s}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export interface KetQuaDongTien extends DuBaoDongTienML {
  doc: KetQuaDoc;
  de_xuat_phan_loai: DeXuatPhanLoai[];
  mo_hinh_phan_loai: { so_nhan: number; hoc_lai: boolean; dung: boolean; ly_do: string | null };
}

/** Dấu vân tay dữ liệu nhãn: đổi khi có sự kiện/nhãn mới → học lại. */
async function vanTayNhan(db: Db, companyId: string): Promise<string> {
  const [e, l] = await Promise.all([
    db.from('revenue_classification_events').select('id').eq('company_id', companyId).order('id', { ascending: false }).limit(1),
    db.from('transaction_labels').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('source', 'human'),
  ]);
  return `${e.data?.[0]?.id ?? 0}:${l.count ?? 0}`;
}

async function hocMoHinh(db: Db, companyId: string): Promise<{ ts: ThamSoPhanLoai; daCoNhan: Set<string>; vao: Map<string, string> }> {
  const suKien = await docTheoCot(db, 'revenue_classification_events', 'id, company_id, transaction_id, to_type', companyId, 'id', (q) => q, 20_000);
  const vao = trangThaiCuoi(suKien as { id: number; transaction_id: string; to_type: string | null }[]);
  const nhanRa = await docTheoCot(db, 'transaction_labels', 'id, company_id, transaction_id, category, is_personal', companyId, 'id', (q) => q.eq('source', 'human'), 20_000);
  const ra = new Map<string, string>();
  for (const r of nhanRa) { const n = r.is_personal ? 'ca_nhan' : r.category ? String(r.category) : null; if (n) ra.set(String(r.transaction_id), n); }
  const ids = [...new Set([...vao.keys(), ...ra.keys()])].slice(0, 5000);
  const gd: Row[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db.from('transactions').select('id, company_id, amount, merchant_name, payment_reference, counter_account_name, counter_account_number')
      .eq('company_id', companyId).eq('is_synthetic', false).in('id', ids.slice(i, i + 200));
    if (error) throw new Error(`giao dịch có nhãn: ${error.message}`);
    for (const r of (data ?? []) as Row[]) { if (r.company_id !== companyId) throw new LoiKhacCongTy(); gd.push(r); }
  }
  const tan = new Map<string, number>();
  const khoa = (r: Row) => String(r.counter_account_number || r.counter_account_name || '');
  for (const r of gd) tan.set(khoa(r), (tan.get(khoa(r)) ?? 0) + 1);
  const mau: MauHoc[] = [];
  for (const r of gd) {
    const id = String(r.id); const noi = `${r.merchant_name ?? ''} ${r.payment_reference ?? ''}`;
    const base = { noi_dung: noi, so_tien: Math.abs(Number(r.amount) || 0), tan_suat_doi_tac: tan.get(khoa(r)) ?? 1 };
    if (vao.has(id)) mau.push({ ...base, chieu: 'vao', nhan: vao.get(id)! });
    else if (ra.has(id)) mau.push({ ...base, chieu: 'ra', nhan: ra.get(id)! });
  }
  return { ts: huanLuyen(mau), daCoNhan: new Set(ra.keys()), vao };
}

/**
 * Toàn bộ dự báo cho công ty đang dùng. `companyId` phải là công ty đã kiểm thành viên (`resolveCompanyVaiTro`).
 */
export async function duBaoDongTienTuCsdl(db: Db, companyId: string, o: {
  homNay: string; laDemo: boolean; phamVi?: PhamViCoSo | null; soDuHienTai?: number | null; ngon?: NgonDT; trang?: number;
}): Promise<KetQuaDongTien> {
  const ngon = o.ngon ?? 'vi';
  const [ketNoi, phanLoai] = await Promise.all([
    db.from('bank_connections').select('account_number').eq('company_id', companyId),
    docTheoCot(db, 'revenue_classifications', 'company_id, transaction_id, confirmed_type, revenue_effect', companyId, 'transaction_id'),
  ]);
  if (ketNoi.error) throw new Error(`kết nối ngân hàng: ${ketNoi.error.message}`);
  const quyetDinhChu: Record<string, QuyetDinhChu> = {};
  for (const r of phanLoai) quyetDinhChu[String(r.transaction_id)] = { loai: r.confirmed_type ?? null, hieu_luc: r.revenue_effect ?? null };

  // Mô hình học từ chủ: chỉ cho người thấy cả công ty.
  let ts: ThamSoPhanLoai | null = null; let daCoNhan = new Set<string>();
  const mh: KetQuaDongTien['mo_hinh_phan_loai'] = { so_nhan: 0, hoc_lai: false, dung: false, ly_do: null };
  if (o.phamVi) mh.ly_do = ngon === 'vi' ? 'Kế toán một cơ sở không dùng mô hình học từ cả công ty.' : 'Branch accountants do not use the company-wide model.';
  else {
    try {
      const vt = await vanTayNhan(db, companyId);
      const { data: luu } = await db.from('dong_tien_mo_hinh').select('company_id, van_tay, tham_so, da_co_nhan').eq('company_id', companyId).maybeSingle();
      if (luu && luu.company_id === companyId && luu.van_tay === vt && luu.tham_so?.phien_ban === 1) {
        ts = luu.tham_so as ThamSoPhanLoai; daCoNhan = new Set((luu.da_co_nhan ?? []) as string[]);
      } else {
        const h = await hocMoHinh(db, companyId);
        ts = h.ts; daCoNhan = h.daCoNhan; mh.hoc_lai = true;
        const { error } = await db.from('dong_tien_mo_hinh').upsert({
          company_id: companyId, van_tay: vt, tham_so: ts, so_nhan: ts.so_nhan, da_co_nhan: [...daCoNhan].slice(0, 20_000), cap_nhat_luc: new Date().toISOString(),
        }, { onConflict: 'company_id' });
        if (error) console.error('dong_tien_mo_hinh:', error.message);
      }
      mh.so_nhan = ts.so_nhan; mh.dung = true;
    } catch (e) {
      // Hỏng phần học không được làm mất dự báo.
      if (e instanceof LoiKhacCongTy) throw e;
      mh.ly_do = ngon === 'vi' ? 'Chưa đọc được nhãn để học.' : 'Could not read labels to learn from.';
      console.error('hoc phan loai:', e instanceof Error ? e.message : e);
    }
  }

  const bo = new BoGom({
    companyId, homNay: o.homNay, quyetDinhChu, daCoNhan, ngayUngVien: 30,
    taiKhoanCuaMinh: ((ketNoi.data ?? []) as Row[]).map((r) => r.account_number),
  });
  const doc = await docGiaoDichTheoTrang(db, companyId, {
    tuNgay: congNgay(o.homNay, -NGAY_NHIN_LAI), denNgay: congNgay(o.homNay, -1), laDemo: o.laDemo, phamVi: o.phamVi ?? null, trang: o.trang,
  }, (ds) => bo.them(ds));
  const th = bo.ketThuc();
  const kq = duBaoTuTongHop(th, { ngon, soDuHienTai: o.soDuHienTai ?? null });

  const demDT = new Map<number, number>();
  for (let i = 0; i < th.doiTac.length; i++) demDT.set(th.doiTac[i], (demDT.get(th.doiTac[i]) ?? 0) + 1);
  const deXuat = deXuatPhanLoai(ts, th.ungVien.map((u) => ({
    id: u.id, chieu: u.chieu === 0 ? 'vao' : 'ra', noi_dung: u.noi_dung, so_tien: u.so_tien, tan_suat_doi_tac: demDT.get(u.doi_tac) ?? 1, nhom: NHOM[u.nhom],
  })), ngon).slice(0, 50);

  return { ...kq, doc, de_xuat_phan_loai: deXuat, mo_hinh_phan_loai: mh };
}
