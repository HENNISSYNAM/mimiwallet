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
 * Dòng dữ liệu thử (`is_synthetic`) không bao giờ được vào đây.
 */
import { findInternalTransfers, revenueExcludingInternal, type LedgerTx } from '../ledger/internal-transfer.ts';
import {
  chonDoanhThu, HO_SO_TRONG, loaiTuTaiKhoan,
  type DoanhThuDaDoc, type HoSoThue, type NguonDoanhThu, type SuKienThue,
} from './he-luat.ts';

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
export async function docDoanhThuQuy(db: Db, companyId: string, nam: number): Promise<DoanhThuTheoQuy> {
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

  const gd = await db.from('transactions')
    .select('id, amount, type, transaction_date, account_number, counter_account_number, is_synthetic')
    .eq('company_id', companyId)
    // Tiền giả của sandbox không được nằm trong con số quyết định nghĩa vụ thuế.
    .eq('is_synthetic', false)
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

export interface HoSoCongTy {
  id: string;
  ten: string | null;
  mst: string | null;
  account_type: string | null;
}

export async function docHoSo(db: Db, companyId: string): Promise<{ cong_ty: HoSoCongTy; ho_so: HoSoThue }> {
  const ct = await db.from('companies').select('id, name, tax_id, account_type').eq('id', companyId).maybeSingle();
  if (ct.error) throw new Error(`Không đọc được thông tin công ty: ${ct.error.message}`);
  const hs = await db.from('ho_so_thue')
    .select('loai_nguoi_nop, nhom_nganh, kenh, phuong_phap_tncn, bat_dau_kinh_doanh, da_nop_thue_trong_nam, doanh_thu_nam_truoc, co_quan_he_lien_ket')
    .eq('company_id', companyId).maybeSingle();
  if (hs.error) throw new Error(`Không đọc được hồ sơ thuế: ${hs.error.message}`);
  const r = (hs.data ?? null) as Row | null;
  return {
    cong_ty: {
      id: companyId,
      ten: ct.data?.name ?? null,
      mst: ct.data?.tax_id ?? null,
      account_type: ct.data?.account_type ?? null,
    },
    ho_so: r
      ? {
        loai_nguoi_nop: r.loai_nguoi_nop ?? null,
        nhom_nganh: Array.isArray(r.nhom_nganh) ? r.nhom_nganh : [],
        kenh: r.kenh ?? null,
        phuong_phap_tncn: r.phuong_phap_tncn ?? null,
        bat_dau_kinh_doanh: r.bat_dau_kinh_doanh ?? null,
        da_nop_thue_trong_nam: r.da_nop_thue_trong_nam ?? null,
        doanh_thu_nam_truoc: r.doanh_thu_nam_truoc === null || r.doanh_thu_nam_truoc === undefined ? null : Number(r.doanh_thu_nam_truoc),
        co_quan_he_lien_ket: r.co_quan_he_lien_ket ?? null,
      }
      : { ...HO_SO_TRONG },
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
      doanhThuNamTruoc: o.hoSo.doanh_thu_nam_truoc,
      coQuanHeLienKet: o.hoSo.co_quan_he_lien_ket,
    },
    doanh_thu: o.doanhThu,
    nguon: chon.nguon,
    canh_bao: canhBao,
  };
}
