/**
 * Đọc dữ liệu thật của công ty rồi dựng `SuKienThue` cho hệ luật.
 *
 * HAI NGUỒN DOANH THU, KHÔNG TRỘN. Hoá đơn điện tử từ cổng Tổng cục Thuế là bản ghi của cơ quan
 * thuế; tiền về ngân hàng là suy ra. Hàm này trả cả hai theo từng quý và để `chonDoanhThu`
 * (`he-luat.ts`) chọn, kèm cảnh báo khi hai nguồn lệch — vì chỗ lệch là thông tin, không phải lỗi
 * cần xoá. Chuyển khoản giữa các tài khoản của chính chủ bị loại trước khi cộng, bằng đúng bộ
 * `internal-transfer.ts` mà `tax-summary` dùng: một khoản chuyển nội bộ bị tính thành doanh thu
 * đủ để đẩy một hộ từ diện miễn sang diện phải nộp.
 *
 * Dòng dữ liệu thử (`is_synthetic`) không bao giờ được vào đây — trừ công ty demo, nơi cả sổ là
 * minh hoạ (`_shared/minh-hoa.ts`).
 */
import { findInternalTransfers, revenueExcludingInternal, type LedgerTx } from '../ledger/internal-transfer.ts';
import {
  chonDoanhThu, HO_SO_TRONG, loaiTuTaiKhoan,
  type DoanhThuDaDoc, type HoSoThue, type LoaiNguoiNop, type NguonDoanhThu, type SuKienThue,
} from './he-luat.ts';
import { dangHoatDong } from '../mst/tra-cuu.ts';
import { locMinhHoa } from '../minh-hoa.ts';

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

export interface DoanhThuTheoQuy extends DoanhThuDaDoc {
  so_hoa_don: number;
  co_ket_noi_ngan_hang: boolean;
  /** Cặp chuyển khoản nội bộ suy ra (không chắc chắn) đã bị loại khỏi doanh thu. */
  can_xem_lai: number;
}

const bon = (): [number, number, number, number] => [0, 0, 0, 0];
const quyCuaThang = (thang: number) => Math.max(1, Math.min(4, Math.ceil(thang / 3)));

/** Doanh thu từng quý của một năm, từ hoá đơn điện tử và từ sao kê. */
/** `laDemo`: công ty demo thì đọc cả dòng minh hoạ — cả sổ của nó là minh hoạ. Xem `_shared/minh-hoa.ts`. */
export async function docDoanhThuQuy(db: Db, companyId: string, nam: number, laDemo = false): Promise<DoanhThuTheoQuy> {
  const hd = await db.from('gdt_invoices')
    .select('direction, total_amount, invoice_status, issuance_period')
    .eq('company_id', companyId)
    .gte('issuance_period', nam * 100 + 1)
    .lte('issuance_period', nam * 100 + 12)
    .limit(20000);
  if (hd.error) throw new Error(`Không đọc được hoá đơn điện tử: ${hd.error.message}`);
  const hoaDonRows = ((hd.data ?? []) as Row[]).filter(
    (r) => r.direction === 'issued' && (r.invoice_status === null || r.invoice_status === undefined || Number(r.invoice_status) === 1),
  );
  let hoaDon: [number, number, number, number] | null = null;
  if (hoaDonRows.length) {
    hoaDon = bon();
    for (const r of hoaDonRows) {
      const thang = Number(r.issuance_period ?? 0) % 100;
      hoaDon[quyCuaThang(thang) - 1] += Number(r.total_amount ?? 0);
    }
  }

  // Tiền giả của sandbox không được nằm trong con số quyết định nghĩa vụ thuế của công ty thật.
  const gd = await locMinhHoa(db.from('transactions')
    .select('id, amount, type, transaction_date, account_number, counter_account_number, is_synthetic')
    .eq('company_id', companyId), laDemo)
    .gte('transaction_date', `${nam}-01-01`)
    .lte('transaction_date', `${nam}-12-31`)
    .limit(20000);
  if (gd.error) throw new Error(`Không đọc được sao kê: ${gd.error.message}`);
  const kn = await db.from('bank_connections').select('account_number').eq('company_id', companyId).is('revoked_at', null);
  if (kn.error) throw new Error(`Không đọc được kết nối ngân hàng: ${kn.error.message}`);

  const taiKhoan = ((kn.data ?? []) as Row[])
    .map((c) => (typeof c.account_number === 'string' ? c.account_number : null))
    .filter((a): a is string => !!a && !a.startsWith('grant:'));
  const rows = ((gd.data ?? []) as Row[]).map((t) => ({ ...t, amount: Number(t.amount) })) as LedgerTx[];
  const noiBo = findInternalTransfers(rows, { ownAccounts: taiKhoan });

  let nganHang: [number, number, number, number] | null = null;
  if (rows.length) {
    nganHang = bon();
    for (let q = 1; q <= 4; q++) {
      const tu = `${nam}-${String((q - 1) * 3 + 1).padStart(2, '0')}-01`;
      const den = q === 4 ? `${nam}-12-31` : `${nam}-${String(q * 3 + 1).padStart(2, '0')}-01`;
      const tong = revenueExcludingInternal(rows, noiBo.internalIds, { from: tu, to: den });
      // Khoảng của quý 1–3 lấy tới hết ngày cuối quý: trừ đi phần thuộc ngày đầu quý sau.
      nganHang[q - 1] = q === 4 ? tong : tong - revenueExcludingInternal(rows, noiBo.internalIds, { from: den, to: den });
    }
  }

  return {
    hoa_don: hoaDon,
    ngan_hang: nganHang,
    so_hoa_don: hoaDonRows.length,
    co_ket_noi_ngan_hang: taiKhoan.length > 0,
    can_xem_lai: noiBo.needsReview.length,
  };
}

/** Điều Tổng cục Thuế nói về mã số thuế — xem `_shared/mst/tra-cuu.ts`. Máy chủ ghi, người dùng không sửa. */
export interface TheoMst {
  ten: string | null;
  dia_chi: string | null;
  co_quan_thue: string | null;
  trang_thai: string | null;
  con_hoat_dong: boolean;
  tra_luc: string;
}

export interface HoSoCongTy {
  id: string;
  /** Tên đăng ký thuế nếu đã tra được, không thì tên người dùng đặt. Dùng cho tờ khai. */
  ten: string | null;
  mst: string | null;
  account_type: string | null;
  /**
   * Hộ kinh doanh hay doanh nghiệp, theo đăng ký thuế — hoặc theo mã 12 số (số định danh cá
   * nhân, chỉ hộ và cá nhân dùng) khi chưa tra được. Có giá trị thì KHÔNG hỏi người dùng nữa.
   */
  loai_theo_mst: LoaiNguoiNop | null;
  theo_mst: TheoMst | null;
}

/** Cột `companies` mà `docHoSo` đọc. Tách ra để test dựng dòng giả cho đúng. */
export const COT_CONG_TY = 'id, name, tax_id, account_type, ten_theo_mst, dia_chi_theo_mst, co_quan_thue, loai_theo_mst, trang_thai_mst, mst_tra_luc';

export function hoSoCongTy(companyId: string, r: Row | null): HoSoCongTy {
  const mst: string | null = r?.tax_id ?? null;
  const daTraThay = !!(r?.mst_tra_luc && r?.ten_theo_mst);
  const loai: LoaiNguoiNop | null = r?.loai_theo_mst === 'ho_kinh_doanh' || r?.loai_theo_mst === 'doanh_nghiep'
    ? r.loai_theo_mst
    : mst && /^\d{12}$/.test(mst) ? 'ho_kinh_doanh' : null;
  return {
    id: companyId,
    ten: (daTraThay ? r?.ten_theo_mst : null) ?? r?.name ?? null,
    mst,
    account_type: r?.account_type ?? null,
    loai_theo_mst: loai,
    theo_mst: daTraThay
      ? {
        ten: r?.ten_theo_mst ?? null,
        dia_chi: r?.dia_chi_theo_mst ?? null,
        co_quan_thue: r?.co_quan_thue ?? null,
        trang_thai: r?.trang_thai_mst ?? null,
        con_hoat_dong: dangHoatDong(r?.trang_thai_mst),
        tra_luc: String(r?.mst_tra_luc),
      }
      : null,
  };
}

export async function docHoSo(db: Db, companyId: string): Promise<{ cong_ty: HoSoCongTy; ho_so: HoSoThue }> {
  const ct = await db.from('companies').select(COT_CONG_TY).eq('id', companyId).maybeSingle();
  if (ct.error) throw new Error(`Không đọc được thông tin công ty: ${ct.error.message}`);
  const congTy = hoSoCongTy(companyId, ct.data ?? null);
  const hs = await db.from('ho_so_thue')
    .select('loai_nguoi_nop, nhom_nganh, kenh, phuong_phap_tncn, bat_dau_kinh_doanh, da_nop_thue_trong_nam, nganh_dac_thu, doanh_thu_nam_truoc, co_quan_he_lien_ket')
    .eq('company_id', companyId).maybeSingle();
  if (hs.error) throw new Error(`Không đọc được hồ sơ thuế: ${hs.error.message}`);
  const r = (hs.data ?? null) as Row | null;
  return {
    cong_ty: congTy,
    // Đăng ký thuế thắng câu trả lời tay: người dùng từng bấm "doanh nghiệp" cho một mã mà cơ
    // quan thuế ghi là hộ kinh doanh thì tờ khai theo cơ quan thuế — và câu đó thôi không hỏi.
    ho_so: r
      ? {
        loai_nguoi_nop: congTy.loai_theo_mst ?? r.loai_nguoi_nop ?? null,
        nhom_nganh: Array.isArray(r.nhom_nganh) ? r.nhom_nganh : [],
        kenh: r.kenh ?? null,
        phuong_phap_tncn: r.phuong_phap_tncn ?? null,
        bat_dau_kinh_doanh: r.bat_dau_kinh_doanh ?? null,
        da_nop_thue_trong_nam: r.da_nop_thue_trong_nam ?? null,
        nganh_dac_thu: r.nganh_dac_thu ?? null,
        doanh_thu_nam_truoc: r.doanh_thu_nam_truoc === null || r.doanh_thu_nam_truoc === undefined ? null : Number(r.doanh_thu_nam_truoc),
        co_quan_he_lien_ket: r.co_quan_he_lien_ket ?? null,
      }
      : { ...HO_SO_TRONG, loai_nguoi_nop: congTy.loai_theo_mst },
  };
}

export interface SuKienDaDung {
  su_kien: SuKienThue;
  doanh_thu: DoanhThuTheoQuy;
  nguon: NguonDoanhThu | null;
  canh_bao: string[];
}

/** Gộp hồ sơ, doanh thu và số người dùng tự nhập thành sự kiện cho hệ luật. */
export function dungSuKien(o: {
  nam: number;
  homNay: string;
  congTy: HoSoCongTy;
  hoSo: HoSoThue;
  doanhThu: DoanhThuTheoQuy;
  tuNhap?: [number, number, number, number] | null;
}): SuKienDaDung {
  const chon = chonDoanhThu({ hoa_don: o.doanhThu.hoa_don, ngan_hang: o.doanhThu.ngan_hang }, o.tuNhap ?? null);
  const canhBao = [...chon.canh_bao];
  if (chon.nguon === 'ngan_hang' && !o.doanhThu.co_ket_noi_ngan_hang) {
    canhBao.push('Chưa liên kết ngân hàng hay Tổng cục Thuế: doanh thu chỉ dựa trên dữ liệu đã nhập, chưa đủ để dựa vào khi khai thuế.');
  }
  if (o.doanhThu.can_xem_lai > 0) {
    canhBao.push(`${o.doanhThu.can_xem_lai} cặp giao dịch bị coi là chuyển khoản nội bộ theo suy đoán (cùng số tiền, sát ngày) và đã trừ khỏi doanh thu. Xem lại nếu thực ra là tiền bán hàng.`);
  }
  return {
    su_kien: {
      nam: o.nam,
      homNay: o.homNay,
      loai: o.hoSo.loai_nguoi_nop ?? loaiTuTaiKhoan(o.congTy.account_type),
      doanhThuQuy: chon.quy,
      nguonDoanhThu: chon.nguon,
      nhomNganh: o.hoSo.nhom_nganh,
      kenh: o.hoSo.kenh,
      phuongPhapTncn: o.hoSo.phuong_phap_tncn,
      batDauKinhDoanh: o.hoSo.bat_dau_kinh_doanh,
      daNopThueTrongNam: o.hoSo.da_nop_thue_trong_nam,
      nganhDacThu: o.hoSo.nganh_dac_thu,
      doanhThuNamTruoc: o.hoSo.doanh_thu_nam_truoc,
      coQuanHeLienKet: o.hoSo.co_quan_he_lien_ket,
    },
    doanh_thu: o.doanhThu,
    nguon: chon.nguon,
    canh_bao: canhBao,
  };
}
