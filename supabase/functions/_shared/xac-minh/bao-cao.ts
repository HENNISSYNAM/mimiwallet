/**
 * DOANH THU ĐÃ XÁC MINH (10/11/2026) — chặng 1 của hành trình thuế → doanh thu xác minh → hồ sơ vay → tín dụng.
 *
 * Báo cáo này là thứ chủ hộ đưa cho người khác (ngân hàng, đối tác) xem, nên mọi con số phải đi ra từ CÙNG bộ
 * máy tính doanh thu mà tờ khai nháp và Tổng quan đang dùng — không có cách cộng thứ hai:
 *   - `tinhTienVao` (doanh-thu/so-lieu.ts): tiền vào, nội bộ, khoản người đã xác nhận, phần chưa rõ;
 *   - `tinhDoChacChan` (doanh-thu/do-chac-chan.ts): khoảng [cận dưới, cận trên] bằng BigInt, và cờ "kết luận
 *     phụ thuộc phần chưa rõ" khi khoảng cắt ngưỡng 01 tỷ / 03 tỷ đồng.
 * Không gọi mô hình ngôn ngữ ở đâu cả. Câu giải thích là câu viết sẵn, điền số.
 *
 * KHÔNG có trong báo cáo (và test khẳng định điều đó): từng giao dịch, tên người chuyển, nội dung chuyển khoản,
 * số tài khoản. Hàm chỉ NHẬN id, số tiền, chiều và ngày — muốn lộ cũng không có gì để lộ.
 *
 * Hàm thuần: cùng đầu vào → cùng báo cáo → cùng mã băm (chuan-hoa.ts).
 */
import { CHUA_GOM, ngayVN, tinhTienVao, type GiaoDichTinh, type SoLieuTienVao, type XacNhanTinh } from '../doanh-thu/so-lieu.ts';
import { NGUONG_HO_KINH_DOANH, sangBig, thangThieuDuLieu, tinhDoChacChan, type TienDauVao } from '../doanh-thu/do-chac-chan.ts';
import { chieuTien } from '../tien/chieu-tien.ts';

export const PHIEN_BAN_BAO_CAO = 1;
export const LUU_Y = {
  vi: 'Báo cáo do chủ hộ chia sẻ, không phải điểm tín dụng.',
  en: 'Shared by the business owner. This is not a credit score.',
} as const;

// ── Kỳ báo cáo ──────────────────────────────────────────────────────────────

export interface KyBaoCao {
  loai: 'nam' | '12_thang';
  /** Tháng đầu và tháng cuối, "YYYY-MM", tính cả hai đầu. */
  tu_thang: string;
  den_thang: string;
}

const thangSau = (t: string, n: number) => {
  const [y, m] = t.split('-').map(Number);
  const k = y * 12 + (m - 1) + n;
  return `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}`;
};

/** Tháng gần nhất ĐÃ KẾT THÚC so với `homNay` ("YYYY-MM-DD", giờ Việt Nam). */
export const thangDaDong = (homNay: string) => thangSau(homNay.slice(0, 7), -1);

/** Năm dương lịch. Năm đang chạy chỉ tính tới tháng đã kết thúc; chưa có tháng nào kết thúc → null. */
export function kyTheoNam(nam: number, homNay: string): KyBaoCao | null {
  if (!Number.isInteger(nam) || nam < 2000) return null;
  const dong = thangDaDong(homNay);
  const tu = `${nam}-01`;
  const den = `${nam}-12` <= dong ? `${nam}-12` : dong;
  return den < tu ? null : { loai: 'nam', tu_thang: tu, den_thang: den };
}

/** 12 tháng đã kết thúc gần nhất. */
export function ky12Thang(homNay: string): KyBaoCao {
  const den = thangDaDong(homNay);
  return { loai: '12_thang', tu_thang: thangSau(den, -11), den_thang: den };
}

export function cacThang(ky: KyBaoCao): string[] {
  const ra: string[] = [];
  for (let t = ky.tu_thang; t <= ky.den_thang && ra.length < 120; t = thangSau(t, 1)) ra.push(t);
  return ra;
}

const ngayCuoiThang = (t: string) => {
  const [y, m] = t.split('-').map(Number);
  return `${t}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;
};

// ── Đầu vào ─────────────────────────────────────────────────────────────────

/** Chỉ những cột cần để tính. Không tên, không nội dung, không số tài khoản. */
export type GiaoDichXacMinh = GiaoDichTinh;

export interface PhanLoaiXacMinh extends XacNhanTinh {
  confirmed_type?: string | null;
  /** Ai đưa ra gợi ý mà chủ hộ đã xác nhận: quy tắc, mẫu lặp, mô hình, hay chủ hộ tự chọn. */
  suggestion_source?: 'rule' | 'pattern' | 'model' | 'human' | string | null;
}

export interface DauVaoBaoCao {
  ky: KyBaoCao;
  /** Ngày lập, "YYYY-MM-DD" giờ Việt Nam. Nằm trong phần được băm. */
  lap_ngay: string;
  ten_doanh_nghiep: string | null;
  giao_dich: GiaoDichXacMinh[];
  phan_loai: PhanLoaiXacMinh[];
  /** Từ `findInternalTransfers` + `ganNoiBoTheoNguoi` (so-lieu.ts). */
  noi_bo_ids: Set<string>;
  suy_doan_ids: Set<string>;
  so_tai_khoan: number;
  /** Số lần phân loại tiền vào bị đổi (revenue_classification_events) của các khoản trong kỳ. */
  so_lan_doi_phan_loai: number;
  du_lieu_minh_hoa: boolean;
}

// ── Báo cáo ─────────────────────────────────────────────────────────────────

export type NhomLoaiTru = 'tien_vay' | 'gop_von' | 'nguoi_nha' | 'hoan_tien' | 'dat_coc' | 'khac';

const NHOM_CUA_LOAI: Record<string, NhomLoaiTru> = {
  loan: 'tien_vay', capital_contribution: 'gop_von', family_transfer: 'nguoi_nha', refund: 'hoan_tien', deposit: 'dat_coc',
};

export interface CauGiaiThich {
  doanh_thu: string;
  khoang: string;
  theo_thang: string;
  xac_nhan: string;
  loai_tru: string;
  pham_vi: string;
}

export interface BaoCaoXacMinh {
  loai: 'doanh_thu_da_xac_minh';
  phien_ban: number;
  doanh_nghiep: { ten: string | null };
  ky: { loai: KyBaoCao['loai']; tu_ngay: string; den_ngay: string };
  lap_ngay: string;
  don_vi: 'VND';
  du_lieu_minh_hoa: boolean;
  doanh_thu: {
    uoc_tinh: TienDauVao;
    can_duoi: TienDauVao;
    can_tren: TienDauVao;
    trang_thai: 'chac' | 'can_xem' | 'chua_du_du_lieu';
    ket_luan_phu_thuoc: boolean;
    nguong: { ma: string; gia_tri: number; phia: 'tren' | 'duoi' | 'chua_chac' }[];
  };
  theo_thang: { thang: string; doanh_thu: number; co_du_lieu: boolean }[];
  tien_vao: {
    tong: number;
    so_khoan: number;
    chu_xac_nhan: number;
    tu_dong_noi_bo: number;
    chua_ro: number;
    /** Phần vạn (0–10000) của `tong`; ba số cộng lại đúng 10000 khi có tiền vào. */
    ty_le_chu_xac_nhan_pv: number | null;
    ty_le_tu_dong_pv: number | null;
    ty_le_chua_ro_pv: number | null;
    nguon_xac_nhan: { theo_goi_y_quy_tac: number; theo_goi_y_mo_hinh: number; tu_chon: number };
    so_lan_doi_phan_loai: number;
  };
  loai_tru: Record<NhomLoaiTru, number> & { chuyen_noi_bo: number; tong: number };
  pham_vi: { so_tai_khoan: number; so_thang: number; thang_co_du_lieu: string[]; thang_khong_co_du_lieu: string[] };
  chua_gom: string;
  ly_do: { vi: CauGiaiThich; en: CauGiaiThich };
  luu_y: typeof LUU_Y;
}

/** 1234567 → "1.234.567" — tự viết để chuỗi không phụ thuộc bản ICU của từng máy. */
export function nhomSo(n: TienDauVao): string {
  const s = String(n);
  const am = s.startsWith('-');
  const so = am ? s.slice(1) : s;
  return `${am ? '-' : ''}${so.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}
const vnd = (n: TienDauVao) => `${nhomSo(n)}đ`;
const vndEn = (n: TienDauVao) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} VND`;
const pctVi = (pv: number | null) => (pv === null ? '—' : `${Math.floor(pv / 100)},${String(pv % 100).padStart(2, '0').slice(0, 1)}%`);
const pctEn = (pv: number | null) => (pv === null ? '—' : `${Math.floor(pv / 100)}.${String(pv % 100).padStart(2, '0').slice(0, 1)}%`);

function gop(ds: SoLieuTienVao[]): SoLieuTienVao {
  const so = (k: keyof SoLieuTienVao) => ds.reduce((s, x) => s + (x[k] as number), 0);
  const gopMap = (k: 'uoc_tinh_theo_thang' | 'toi_da_theo_thang') =>
    ds.reduce<Record<string, number>>((m, x) => { for (const [t, v] of Object.entries(x[k])) m[t] = (m[t] ?? 0) + v; return m; }, {});
  const bon = (k: 'uoc_tinh_theo_quy' | 'chua_ro_theo_quy' | 'noi_bo_suy_doan_theo_quy' | 'am_bat_thuong_theo_quy') =>
    [0, 1, 2, 3].map((i) => ds.reduce((s, x) => s + x[k][i], 0)) as [number, number, number, number];
  const tienVao = so('tien_vao');
  return {
    nam: ds[0]?.nam ?? 0,
    so_khoan_vao: so('so_khoan_vao'), tien_vao: tienVao, noi_bo: so('noi_bo'), khong_phai_doanh_thu: so('khong_phai_doanh_thu'),
    so_khong_phai_doanh_thu: so('so_khong_phai_doanh_thu'), da_xac_nhan: so('da_xac_nhan'), chua_ro: so('chua_ro'), so_chua_ro: so('so_chua_ro'),
    uoc_tinh: so('uoc_tinh'), uoc_tinh_theo_quy: bon('uoc_tinh_theo_quy'), ty_le_da_giai_thich: null, chua_ro_theo_quy: bon('chua_ro_theo_quy'),
    noi_bo_suy_doan: so('noi_bo_suy_doan'), so_noi_bo_suy_doan: so('so_noi_bo_suy_doan'), noi_bo_suy_doan_theo_quy: bon('noi_bo_suy_doan_theo_quy'),
    am_bat_thuong: so('am_bat_thuong'), so_am_bat_thuong: so('so_am_bat_thuong'), am_bat_thuong_theo_quy: bon('am_bat_thuong_theo_quy'),
    so_trung_id: so('so_trung_id'), so_khong_doc_duoc: so('so_khong_doc_duoc'),
    uoc_tinh_theo_thang: gopMap('uoc_tinh_theo_thang'), toi_da_theo_thang: gopMap('toi_da_theo_thang'),
    thang_co_giao_dich: [...new Set(ds.flatMap((x) => x.thang_co_giao_dich))].sort(),
  };
}

/** Phần vạn, ba phần cộng đúng 10000 (phần cuối nhận phần làm tròn). */
function phanVan(a: number, b: number, tong: number): [number, number, number] | null {
  if (tong <= 0) return null;
  const pa = Number((BigInt(a) * 10000n) / BigInt(tong));
  const pb = Number((BigInt(b) * 10000n) / BigInt(tong));
  return [pa, pb, Math.max(0, 10000 - pa - pb)];
}

const TEN_NGUONG_VI: Record<string, string> = { mien_thue_1_ty: '01 tỷ đồng', phuong_phap_3_ty: '03 tỷ đồng' };
const TEN_NGUONG_EN: Record<string, string> = { mien_thue_1_ty: 'VND 1 billion', phuong_phap_3_ty: 'VND 3 billion' };

export function lapBaoCao(dv: DauVaoBaoCao): BaoCaoXacMinh {
  const thang = cacThang(dv.ky);
  const trongKy = new Set(thang);
  const gd = dv.giao_dich.filter((t) => trongKy.has(ngayVN(t.transaction_date).slice(0, 7)));
  const nam = [...new Set(thang.map((t) => Number(t.slice(0, 4))))];
  const s = gop(nam.map((y) => tinhTienVao(y, gd, dv.phan_loai, dv.noi_bo_ids, dv.suy_doan_ids)));

  // Tiền đã loại theo loại người xác nhận — cùng bộ lọc với `tinhTienVao` để tổng khớp `khong_phai_doanh_thu`.
  const pl = new Map(dv.phan_loai.map((p) => [String(p.transaction_id), p]));
  const loaiTru: Record<NhomLoaiTru, number> = { tien_vay: 0, gop_von: 0, nguoi_nha: 0, hoan_tien: 0, dat_coc: 0, khac: 0 };
  const nguon = { theo_goi_y_quy_tac: 0, theo_goi_y_mo_hinh: 0, tu_chon: 0 };
  const daThay = new Set<string>();
  for (const t of gd) {
    const id = String(t.id);
    if (daThay.has(id)) continue;
    daThay.add(id);
    const goc = Number(t.amount);
    if (chieuTien(t) !== 'vao' || !Number.isFinite(goc) || goc < 0 || dv.noi_bo_ids.has(id)) continue;
    const p = pl.get(id);
    if (!p || (p.revenue_effect !== 'include' && p.revenue_effect !== 'exclude')) continue;
    const src = p.suggestion_source ?? 'human';
    if (src === 'rule' || src === 'pattern') nguon.theo_goi_y_quy_tac += 1;
    else if (src === 'model') nguon.theo_goi_y_mo_hinh += 1;
    else nguon.tu_chon += 1;
    if (p.revenue_effect === 'exclude') loaiTru[NHOM_CUA_LOAI[String(p.confirmed_type ?? '')] ?? 'khac'] += Math.round(goc);
  }

  const thangCo = s.thang_co_giao_dich.filter((t) => trongKy.has(t));
  const thangKhong = thang.filter((t) => !thangCo.includes(t));
  const thieuGiua = thangThieuDuLieu(thangCo);
  const toiDaThang = Math.max(0, ...Object.values(s.toi_da_theo_thang));
  const dc = tinhDoChacChan({
    gia_tri: s.uoc_tinh,
    co_the_giam: s.chua_ro + s.am_bat_thuong,
    co_the_tang: s.noi_bo_suy_doan,
    khoang_trong: thieuGiua.length ? { so_thang: thieuGiua.length, toi_da_moi_thang: toiDaThang, thang: thieuGiua } : undefined,
    co_du_lieu: gd.length > 0,
    nguong: NGUONG_HO_KINH_DOANH.filter((n) => n.ma === 'mien_thue_1_ty' || n.ma === 'phuong_phap_3_ty'),
  });

  const tuDong = s.noi_bo - s.noi_bo_suy_doan;
  const chuXacNhan = s.da_xac_nhan + s.khong_phai_doanh_thu;
  const chuaRo = s.chua_ro + s.noi_bo_suy_doan;
  const pv = phanVan(chuXacNhan, tuDong, s.tien_vao);
  const tongLoai = Object.values(loaiTru).reduce((a, b) => a + b, 0);

  const nguongCat = dc.nguong.filter((n) => n.phia === 'chua_chac').map((n) => n.ma);
  const nhoThang = thieuGiua.length
    ? { vi: ` Có ${thieuGiua.length} tháng nằm giữa kỳ mà không có giao dịch nào (sao kê có thể thiếu); cận trên đã cộng thêm cho những tháng đó.`,
        en: ` ${thieuGiua.length} month(s) inside the period have no transactions (statements may be missing); the upper bound allows for them.` }
    : { vi: '', en: '' };
  const khoang = dc.trang_thai === 'chua_du_du_lieu'
    ? { vi: 'Chưa có giao dịch nào trong kỳ, chưa đủ dữ liệu để kết luận.', en: 'No transactions in this period, so there is not enough data to conclude.' }
    : nguongCat.length
      ? { vi: `Doanh thu thật nằm trong khoảng này. Khoảng này cắt ngưỡng ${nguongCat.map((m) => TEN_NGUONG_VI[m]).join(' và ')}, nên chưa nói chắc được là vượt hay chưa.`,
          en: `Actual revenue lies within this range. The range crosses the ${nguongCat.map((m) => TEN_NGUONG_EN[m]).join(' and ')} threshold, so it cannot yet be said whether it is above or below.` }
      : dc.trang_thai === 'can_xem'
        ? { vi: 'Doanh thu thật nằm trong khoảng này. Phần chưa rõ còn lớn (hơn 10% số tiền), nên khoảng còn rộng.',
            en: 'Actual revenue lies within this range. The unclear part is still large (over 10% of the money), so the range is wide.' }
        : { vi: 'Doanh thu thật nằm trong khoảng này. Phần chưa rõ nhỏ và không làm đổi kết luận so với ngưỡng 01 tỷ và 03 tỷ đồng.',
            en: 'Actual revenue lies within this range. The unclear part is small and does not change the conclusion against the VND 1 billion and 3 billion thresholds.' };

  const ly_do = {
    vi: {
      doanh_thu: `Cộng tiền vào ${dv.so_tai_khoan} tài khoản ngân hàng trong kỳ, bỏ tiền chuyển giữa các tài khoản của chủ hộ và những khoản chủ hộ đã xác nhận không phải tiền bán hàng. Khoản chưa ai xác nhận vẫn tạm tính là doanh thu.`,
      khoang: khoang.vi + nhoThang.vi,
      theo_thang: 'Doanh thu từng tháng theo ngày ngân hàng ghi (giờ Việt Nam). Tháng không có giao dịch nào ghi là chưa có dữ liệu, không phải bằng 0.',
      xac_nhan: `Chủ hộ đã tự xác nhận ${pctVi(pv?.[0] ?? null)} số tiền vào; ${pctVi(pv?.[1] ?? null)} là tiền chuyển giữa các tài khoản của chính chủ hộ (nhận ra theo số tài khoản); ${pctVi(pv?.[2] ?? null)} còn chưa rõ.`,
      loai_tru: `Đã bỏ ra khỏi doanh thu ${vnd(tongLoai)} mà chủ hộ xác nhận là tiền vay, góp vốn, người nhà chuyển, hoàn tiền, đặt cọc hoặc khoản khác; và ${vnd(s.noi_bo)} tiền chuyển giữa các tài khoản của chính mình.`,
      pham_vi: `Dữ liệu từ ${dv.so_tai_khoan} tài khoản ngân hàng, ${thangCo.length}/${thang.length} tháng có giao dịch. Không gồm tiền bán thu bằng tiền mặt.`,
    },
    en: {
      doanh_thu: `Money received into ${dv.so_tai_khoan} bank account(s) during the period, minus transfers between the owner's own accounts and amounts the owner confirmed are not sales. Amounts nobody has confirmed yet are still counted as revenue.`,
      khoang: khoang.en + nhoThang.en,
      theo_thang: 'Revenue per month by the date the bank recorded (Vietnam time). A month with no transactions is shown as no data, not as zero.',
      xac_nhan: `The owner confirmed ${pctEn(pv?.[0] ?? null)} of the money received; ${pctEn(pv?.[1] ?? null)} is transfers between the owner's own accounts (recognised by account number); ${pctEn(pv?.[2] ?? null)} is still unclear.`,
      loai_tru: `Excluded from revenue: ${vndEn(tongLoai)} the owner confirmed as loans, owner capital, family transfers, refunds, deposits or other; and ${vndEn(s.noi_bo)} moved between the owner's own accounts.`,
      pham_vi: `Data from ${dv.so_tai_khoan} bank account(s); ${thangCo.length} of ${thang.length} months have transactions. Cash sales are not included.`,
    },
  };

  return {
    loai: 'doanh_thu_da_xac_minh',
    phien_ban: PHIEN_BAN_BAO_CAO,
    doanh_nghiep: { ten: dv.ten_doanh_nghiep },
    ky: { loai: dv.ky.loai, tu_ngay: `${dv.ky.tu_thang}-01`, den_ngay: ngayCuoiThang(dv.ky.den_thang) },
    lap_ngay: dv.lap_ngay,
    don_vi: 'VND',
    du_lieu_minh_hoa: dv.du_lieu_minh_hoa,
    doanh_thu: {
      uoc_tinh: dc.gia_tri, can_duoi: dc.can_duoi, can_tren: dc.can_tren, trang_thai: dc.trang_thai,
      ket_luan_phu_thuoc: dc.ket_luan_phu_thuoc,
      nguong: dc.nguong.map((n) => ({ ma: n.ma, gia_tri: n.gia_tri, phia: n.phia })),
    },
    theo_thang: thang.map((t) => ({ thang: t, doanh_thu: s.uoc_tinh_theo_thang[t] ?? 0, co_du_lieu: thangCo.includes(t) })),
    tien_vao: {
      tong: s.tien_vao, so_khoan: s.so_khoan_vao, chu_xac_nhan: chuXacNhan, tu_dong_noi_bo: tuDong, chua_ro: chuaRo,
      ty_le_chu_xac_nhan_pv: pv?.[0] ?? null, ty_le_tu_dong_pv: pv?.[1] ?? null, ty_le_chua_ro_pv: pv?.[2] ?? null,
      nguon_xac_nhan: nguon, so_lan_doi_phan_loai: dv.so_lan_doi_phan_loai,
    },
    loai_tru: { ...loaiTru, chuyen_noi_bo: s.noi_bo, tong: tongLoai + s.noi_bo },
    pham_vi: { so_tai_khoan: dv.so_tai_khoan, so_thang: thang.length, thang_co_du_lieu: thangCo, thang_khong_co_du_lieu: thangKhong },
    chua_gom: CHUA_GOM,
    ly_do,
    luu_y: LUU_Y,
  };
}

/** Kiểm nhanh hình dạng một báo cáo đọc từ CSDL/từ mạng trước khi hiển thị (không tin mù). */
export function laBaoCao(x: unknown): x is BaoCaoXacMinh {
  const b = x as BaoCaoXacMinh;
  return !!b && b.loai === 'doanh_thu_da_xac_minh' && typeof b.phien_ban === 'number' && !!b.doanh_thu
    && sangBig(b.doanh_thu.uoc_tinh) !== null && Array.isArray(b.theo_thang) && !!b.ly_do?.vi && !!b.ly_do?.en;
}
