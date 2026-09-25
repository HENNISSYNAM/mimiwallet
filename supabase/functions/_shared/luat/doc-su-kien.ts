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
import { docSoLieuDoanhThu } from '../doanh-thu/so-lieu.ts';
import { chiaTheoHoatDong, khoanTuNhap, type ChiaHoatDong, type PhanLoaiHoatDong } from '../doanh-thu/theo-hoat-dong.ts';
import {
  chonDoanhThu, HO_SO_TRONG, loaiTuTaiKhoan,
  type DoanhThuDaDoc, type HoSoThue, type LoaiNguoiNop, type NguonDoanhThu, type SuKienThue,
} from './he-luat.ts';
import { dangHoatDong } from '../mst/tra-cuu.ts';

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

export interface DoanhThuTheoQuy extends DoanhThuDaDoc {
  so_hoa_don: number;
  co_ket_noi_ngan_hang: boolean;
  /** Cặp chuyển khoản nội bộ suy ra (không chắc chắn) đã bị loại khỏi doanh thu. */
  can_xem_lai: number;
  /** Khoản tiền vào NGƯỜI DÙNG đã xác nhận không phải doanh thu (Bảng giải trình), đã trừ. */
  da_giai_trinh?: { so: number; tong: number };
  /** Doanh thu theo nhóm hoạt động từng nguồn. Thiếu = bản cũ, coi như mọi khoản chưa rõ nhóm. */
  hoat_dong?: { ngan_hang: ChiaHoatDong; hoa_don: ChiaHoatDong | null; phan_loai: PhanLoaiHoatDong[] };
}

/**
 * Doanh thu từng quý của một năm, từ hoá đơn điện tử và từ sao kê. Cùng một nguồn với mốc 1 tỷ trên
 * Tổng quan (`tax-summary`) — xem `_shared/doanh-thu/so-lieu.ts`.
 * `laDemo`: công ty demo thì đọc cả dòng minh hoạ — cả sổ của nó là minh hoạ. Xem `_shared/minh-hoa.ts`.
 */
export async function docDoanhThuQuy(db: Db, companyId: string, nam: number, laDemo = false): Promise<DoanhThuTheoQuy> {
  const s = await docSoLieuDoanhThu(db, companyId, nam, laDemo);
  return {
    hoa_don: s.hoa_don_theo_quy,
    // Khoản NGƯỜI đã xác nhận là tiền vay, tiền người nhà… đã bị trừ; gợi ý của máy không bao giờ trừ gì.
    ngan_hang: s.so_giao_dich ? s.uoc_tinh_theo_quy : null,
    so_hoa_don: s.so_hoa_don,
    co_ket_noi_ngan_hang: s.co_ket_noi_ngan_hang,
    can_xem_lai: s.can_xem_lai,
    da_giai_trinh: { so: s.so_khong_phai_doanh_thu, tong: s.khong_phai_doanh_thu },
    hoat_dong: s.hoat_dong,
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
  if (chon.nguon === 'ngan_hang' && o.doanhThu.da_giai_trinh?.so) {
    canhBao.push(`Đã trừ ${o.doanhThu.da_giai_trinh.so} khoản bạn xác nhận không phải doanh thu (tiền vay, tiền người nhà…), tổng ${o.doanhThu.da_giai_trinh.tong.toLocaleString('vi-VN')} đồng — xem Bảng giải trình sao kê.`);
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
      // Nhóm hoạt động của ĐÚNG nguồn đang dùng để khai — không lấy nhóm của nguồn khác.
      hoatDong: chon.nguon === 'hoa_don_dien_tu'
        ? o.doanhThu.hoat_dong?.hoa_don ?? null
        : chon.nguon === 'ngan_hang'
          ? o.doanhThu.hoat_dong?.ngan_hang ?? null
          : chon.nguon === 'tu_khai' && chon.quy
            ? chiaTheoHoatDong('tu_nhap', khoanTuNhap(o.nam, chon.quy), o.doanhThu.hoat_dong?.phan_loai ?? [])
            : null,
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
