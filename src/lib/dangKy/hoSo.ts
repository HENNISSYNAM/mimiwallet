/**
 * Bảng hỏi đăng ký kinh doanh — kiểu dữ liệu, giá trị rỗng, kiểm tra, lưu ở trình duyệt.
 *
 * KHÔNG LƯU LÊN MÁY CHỦ. Bảng hỏi chứa số định danh cá nhân, ngày sinh, địa chỉ của nhiều người;
 * MIMI không cần những thứ đó để làm gì khác ngoài in ra giấy. Nên chỉ giữ trong localStorage của
 * trình duyệt người dùng (có nút xoá), và mọi lần đọc/ghi đều bọc try/catch — trình duyệt riêng tư
 * hoặc chặn bộ nhớ thì trang vẫn chạy, chỉ là không nhớ.
 */

import i18n from 'i18next';
import type { LoaiHinh } from './loaiHinh';

export interface DiaChi {
  so_nha: string;
  xa: string;
  tinh: string;
  quoc_gia: string;
}

export interface CaNhan {
  ho_ten: string;
  ngay_sinh: string;
  gioi_tinh: string;
  so_dinh_danh: string;
  quoc_tich: string;
  dan_toc: string;
  dia_chi: DiaChi;
  dien_thoai: string;
  email: string;
}

/** Thành viên (TNHH 2TV) hoặc cổ đông sáng lập (CTCP) là cá nhân. */
export interface NguoiGopVon extends CaNhan {
  /** Giá trị vốn góp, đồng. */
  von: number;
  /** Ngày cấp giấy tờ pháp lý (cột 5 Mẫu số 6, 7 ghi "số, ngày cấp, cơ quan cấp"). */
  ngay_cap: string;
  noi_cap: string;
}

/** Một dòng của Mẫu số 10 — các cột 2–18. Tỷ lệ ghi dạng chuỗi như người dùng muốn in ("90", "33,33"). */
export interface ChuSoHuuHuongLoi {
  ho_ten: string;
  ngay_sinh: string;
  gioi_tinh: string;
  so_giay_to: string;
  quoc_tich: string;
  dan_toc: string;
  dia_chi: string;
  ty_le_von_truc_tiep: string;
  ty_le_von_gian_tiep: string;
  ty_le_cp_truc_tiep: string;
  ty_le_cp_gian_tiep: string;
  kiem_soat: string;
  nguoi_quan_ly: string;
}

export type PhuongPhapGtgt = 'khau_tru' | 'truc_tiep_gtgt' | 'truc_tiep_doanh_so' | 'khong_nop';
export type PhuongThucBhxh = 'hang_thang' | 'ba_thang' | 'sau_thang';

export interface NganhNghe {
  ma: string;
  ten: string;
}

export interface HoSoDangKy {
  loai: LoaiHinh;
  /** "Kính gửi" — ví dụ "Phòng Đăng ký kinh doanh Thành phố Hồ Chí Minh". */
  co_quan: string;
  dia_danh: string;
  ngay_ky: string;
  ten_vi: string;
  ten_nuoc_ngoai: string;
  ten_viet_tat: string;
  tru_so: DiaChi & { dien_thoai: string; fax: string; email: string; website: string };
  nganh: NganhNghe[];
  /** Chỉ số ngành chính trong `nganh`. */
  nganh_chinh: number;
  /** Vốn điều lệ (doanh nghiệp) / vốn kinh doanh (hộ), đồng. */
  von: number;
  /** Mệnh giá cổ phần (CTCP), đồng. */
  menh_gia: number;
  /** Người đại diện theo pháp luật (doanh nghiệp) / chủ hộ (hộ kinh doanh). Cũng là người ký "Tôi là". */
  dai_dien: CaNhan;
  chuc_danh: string;
  /** TNHH 1TV: chủ sở hữu là chính người đại diện (chỉ hỗ trợ chủ sở hữu cá nhân). */
  mo_hinh_1tv: 'hdtv' | 'chu_tich';
  /** TNHH 2TV: thành viên; CTCP: cổ đông sáng lập. Chỉ cá nhân. */
  thanh_vien: NguoiGopVon[];
  thoi_han_gop: string;
  giam_doc_la_dai_dien: boolean;
  ke_toan: { ho_ten: string; ngay_sinh: string; gioi_tinh: string; so_dinh_danh: string; dien_thoai: string };
  ngay_bat_dau: string;
  nam_tai_chinh_tu: string;
  nam_tai_chinh_den: string;
  so_lao_dong: string;
  gtgt: PhuongPhapGtgt;
  bhxh: PhuongThucBhxh;
  chu_so_huu_huong_loi: ChuSoHuuHuongLoi[];
  // Hộ kinh doanh
  hkd_gtgt: 'ke_khai' | 'khoan';
  hkd_khong_tai_tru_so: boolean;
  noi_o_hien_tai: DiaChi;
}

const diaChiRong = (): DiaChi => ({ so_nha: '', xa: '', tinh: '', quoc_gia: 'Việt Nam' });

export const caNhanRong = (): CaNhan => ({
  ho_ten: '', ngay_sinh: '', gioi_tinh: '', so_dinh_danh: '', quoc_tich: 'Việt Nam', dan_toc: '',
  dia_chi: diaChiRong(), dien_thoai: '', email: '',
});

export const nguoiGopVonRong = (): NguoiGopVon => ({ ...caNhanRong(), von: 0, ngay_cap: '', noi_cap: '' });

export function hoSoRong(loai: LoaiHinh = 'ctcp'): HoSoDangKy {
  return {
    loai,
    co_quan: '',
    dia_danh: '',
    ngay_ky: '',
    ten_vi: '', ten_nuoc_ngoai: '', ten_viet_tat: '',
    tru_so: { ...diaChiRong(), dien_thoai: '', fax: '', email: '', website: '' },
    nganh: [{ ma: '', ten: '' }],
    nganh_chinh: 0,
    von: 0,
    menh_gia: 10_000,
    dai_dien: caNhanRong(),
    chuc_danh: 'Giám đốc',
    mo_hinh_1tv: 'chu_tich',
    thanh_vien: loai === 'ctcp' ? [nguoiGopVonRong(), nguoiGopVonRong(), nguoiGopVonRong()] : loai === 'tnhh2' ? [nguoiGopVonRong(), nguoiGopVonRong()] : [],
    thoi_han_gop: 'Trong thời hạn 90 ngày kể từ ngày được cấp Giấy chứng nhận đăng ký doanh nghiệp',
    giam_doc_la_dai_dien: true,
    ke_toan: { ho_ten: '', ngay_sinh: '', gioi_tinh: '', so_dinh_danh: '', dien_thoai: '' },
    ngay_bat_dau: '',
    nam_tai_chinh_tu: '01/01',
    nam_tai_chinh_den: '31/12',
    so_lao_dong: '',
    gtgt: 'khau_tru',
    bhxh: 'hang_thang',
    chu_so_huu_huong_loi: [],
    hkd_gtgt: 'ke_khai',
    hkd_khong_tai_tru_so: false,
    noi_o_hien_tai: diaChiRong(),
  };
}

// ───────────────────────── Số → chữ ─────────────────────────

const CHU_SO = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function docBaChuSo(n: number, dayDu: boolean): string {
  const tram = Math.floor(n / 100);
  const chuc = Math.floor((n % 100) / 10);
  const dv = n % 10;
  const ra: string[] = [];
  if (tram > 0 || dayDu) ra.push(`${CHU_SO[tram]} trăm`);
  if (chuc === 0) {
    if (dv > 0 && (tram > 0 || dayDu)) ra.push('lẻ');
  } else if (chuc === 1) ra.push('mười');
  else ra.push(`${CHU_SO[chuc]} mươi`);
  if (dv > 0) {
    if (dv === 1 && chuc > 1) ra.push('mốt');
    else if (dv === 5 && chuc > 0) ra.push('lăm');
    else if (dv === 4 && chuc > 1) ra.push('tư');
    else ra.push(CHU_SO[dv]);
  }
  return ra.join(' ');
}

/**
 * 3000000000 → "Ba tỷ đồng". Giấy đề nghị có ô "Vốn điều lệ (bằng chữ; VNĐ)" — đọc sai ở đây là
 * hồ sơ bị trả, nên hàm có test cho các ca khó: lẻ, mốt, lăm, tư, hàng tỷ lặp.
 */
export function soBangChu(so: number): string {
  if (!Number.isFinite(so) || so < 0) return '';
  let n = Math.floor(so);
  if (n === 0) return 'Không đồng';
  const DON_VI = ['', 'nghìn', 'triệu'];
  const nhom: string[] = [];
  let ty = 0;
  // Tách theo tỷ: phần dưới tỷ đọc nghìn/triệu; phần trên tỷ đọc đệ quy rồi thêm "tỷ".
  const duoiTy = n % 1_000_000_000;
  ty = Math.floor(n / 1_000_000_000);
  n = duoiTy;
  const cacNhom: number[] = [n % 1000, Math.floor(n / 1000) % 1000, Math.floor(n / 1_000_000) % 1000];
  const cao = cacNhom.reduce((m, g, i) => (g > 0 ? i : m), -1);
  for (let i = cao; i >= 0; i--) {
    const g = cacNhom[i];
    if (g === 0) continue;
    const dayDu = ty > 0 || i < cao;
    nhom.push(`${docBaChuSo(g, dayDu)}${DON_VI[i] ? ' ' + DON_VI[i] : ''}`);
  }
  const phanTy = ty > 0 ? `${soBangChu(ty).replace(/ đồng$/, '').toLowerCase()} tỷ` : '';
  const chu = [phanTy, ...nhom].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  return chu.charAt(0).toUpperCase() + chu.slice(1) + ' đồng';
}

/** 3000000000 → "3.000.000.000". */
export const soCoDau = (n: number): string => (Number.isFinite(n) && n > 0 ? Math.round(n).toLocaleString('vi-VN').replace(/[,\s]/g, '.') : '');

/** Tỷ lệ phần trăm, tối đa hai số lẻ, dấu phẩy thập phân: 0,3333 → "33,33". */
export function tyLe(phan: number, tong: number): string {
  if (!(tong > 0) || !(phan >= 0)) return '';
  const p = Math.round((phan / tong) * 10000) / 100;
  return String(p).replace('.', ',');
}

export const ngayViet = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso.trim();
};

export const diaChiMotDong = (d: DiaChi): string => [d.so_nha, d.xa, d.tinh, d.quoc_gia].map((s) => s.trim()).filter(Boolean).join(', ');

// ───────────────────────── Chủ sở hữu hưởng lợi ─────────────────────────

/**
 * Gợi ý chủ sở hữu hưởng lợi qua sở hữu TRỰC TIẾP: cá nhân giữ từ 25% vốn điều lệ (TNHH) hoặc
 * 25% tổng số cổ phần có quyền biểu quyết (CTCP); chủ sở hữu cá nhân TNHH 1TV. Ngưỡng 25% theo
 * chú thích 4, 5 Mẫu số 10 (Thông tư 121/2026/TT-BTC).
 *
 * Chỉ là gợi ý: sở hữu gián tiếp, nhóm có quan hệ gia đình/hợp đồng và quyền chi phối MIMI không
 * biết — người dùng phải tự bổ sung. Vì cổ phần MIMI soạn đều là cổ phần phổ thông (có quyền biểu
 * quyết), tỷ lệ cổ phần biểu quyết = tỷ lệ vốn.
 */
export function goiYChuSoHuuHuongLoi(hs: HoSoDangKy): ChuSoHuuHuongLoi[] {
  const tu = (c: CaNhan, ngayCap = '', noiCap = ''): Omit<ChuSoHuuHuongLoi, 'ty_le_von_truc_tiep' | 'ty_le_von_gian_tiep' | 'ty_le_cp_truc_tiep' | 'ty_le_cp_gian_tiep' | 'kiem_soat' | 'nguoi_quan_ly'> => ({
    ho_ten: c.ho_ten, ngay_sinh: c.ngay_sinh, gioi_tinh: c.gioi_tinh,
    so_giay_to: [c.so_dinh_danh, ngayCap && `cấp ngày ${ngayViet(ngayCap)}`, noiCap].filter(Boolean).join(', '),
    quoc_tich: c.quoc_tich, dan_toc: c.dan_toc, dia_chi: diaChiMotDong(c.dia_chi),
  });
  const rong = { ty_le_von_gian_tiep: '', ty_le_cp_gian_tiep: '', kiem_soat: '', nguoi_quan_ly: '' };
  if (hs.loai === 'hkd') return [];
  if (hs.loai === 'tnhh1') {
    return [{ ...tu(hs.dai_dien), ...rong, ty_le_von_truc_tiep: '100', ty_le_cp_truc_tiep: '' }];
  }
  const tong = hs.thanh_vien.reduce((s, t) => s + (t.von || 0), 0);
  return hs.thanh_vien
    .filter((t) => tong > 0 && t.von / tong >= 0.25)
    .map((t) => {
      const tl = tyLe(t.von, tong);
      return {
        ...tu(t, t.ngay_cap, t.noi_cap), ...rong,
        ty_le_von_truc_tiep: hs.loai === 'tnhh2' ? tl : '',
        ty_le_cp_truc_tiep: hs.loai === 'ctcp' ? tl : '',
      };
    });
}

// ───────────────────────── Kiểm tra ─────────────────────────

export interface LoiHoSo {
  truong: string;
  thong_bao: string;
}

/**
 * Lỗi chặn in: thiếu ô bắt buộc hoặc sai điều kiện loại hình. Không phải kiểm tra pháp lý đầy đủ —
 * chỉ những lỗi chắc chắn làm hồ sơ bị trả.
 */
export function kiemTraHoSo(hs: HoSoDangKy): LoiHoSo[] {
  const loi: LoiHoSo[] = [];
  const thieu = (gia: string, truong: string, ten: string) => { if (!gia.trim()) loi.push({ truong, thong_bao: i18n.t('ui1.dkl.thieu', { ten }) }); };
  thieu(hs.ten_vi, 'ten_vi', hs.loai === 'hkd' ? i18n.t('ui1.dkl.tenHo') : i18n.t('ui1.dkl.tenCty'));
  thieu(hs.tru_so.so_nha, 'tru_so', i18n.t('ui1.dkl.soNha'));
  thieu(hs.tru_so.xa, 'tru_so', i18n.t('ui1.dkl.xa'));
  thieu(hs.tru_so.tinh, 'tru_so', i18n.t('ui1.dkl.tinh'));
  thieu(hs.dai_dien.ho_ten, 'dai_dien', hs.loai === 'hkd' ? i18n.t('ui1.dkl.hoTenChuHo') : i18n.t('ui1.dkl.hoTenDaiDien'));
  thieu(hs.dai_dien.so_dinh_danh, 'dai_dien', i18n.t('ui1.dkl.dinhDanhKy'));

  const nganh = hs.nganh.filter((n) => n.ma.trim() || n.ten.trim());
  if (nganh.length === 0) loi.push({ truong: 'nganh', thong_bao: i18n.t('ui1.dkl.itNhatNganh') });
  hs.nganh.forEach((n, i) => {
    if (!n.ma.trim() && !n.ten.trim()) return;
    const laChinh = i === hs.nganh_chinh;
    // Doanh nghiệp: mọi ngành ghi mã cấp bốn. Hộ kinh doanh: chỉ ngành chính bắt buộc mã (chú thích 2 Mẫu số 1 PL II).
    const canMa = hs.loai !== 'hkd' || laChinh;
    if (canMa && !/^\d{4}$/.test(n.ma.trim())) loi.push({ truong: 'nganh', thong_bao: i18n.t('ui1.dkl.ma4So', { nganh: n.ten || n.ma }) });
    if (!n.ten.trim()) loi.push({ truong: 'nganh', thong_bao: i18n.t('ui1.dkl.thieuTenNganh', { ma: n.ma }) });
  });
  if (!(hs.nganh_chinh >= 0 && hs.nganh_chinh < hs.nganh.length) || !(hs.nganh[hs.nganh_chinh]?.ma.trim() || hs.nganh[hs.nganh_chinh]?.ten.trim())) {
    loi.push({ truong: 'nganh', thong_bao: i18n.t('ui1.dkl.chonNganhChinh') });
  }
  if (!(hs.von > 0)) loi.push({ truong: 'von', thong_bao: hs.loai === 'hkd' ? i18n.t('ui1.dkl.thieuVonKd') : i18n.t('ui1.dkl.thieuVonDl') });

  if (hs.loai === 'tnhh2' || hs.loai === 'ctcp') {
    const tv = hs.thanh_vien;
    if (hs.loai === 'tnhh2' && (tv.length < 2 || tv.length > 50)) loi.push({ truong: 'thanh_vien', thong_bao: i18n.t('ui1.dkl.tnhh2SoTv') });
    if (hs.loai === 'ctcp' && tv.length < 3) loi.push({ truong: 'thanh_vien', thong_bao: i18n.t('ui1.dkl.ctcpSoCd') });
    tv.forEach((t, i) => {
      if (!t.ho_ten.trim()) loi.push({ truong: 'thanh_vien', thong_bao: i18n.t(hs.loai === 'ctcp' ? 'ui1.dkl.cdThieuTen' : 'ui1.dkl.tvThieuTen', { n: i + 1 }) });
      if (!(t.von > 0)) loi.push({ truong: 'thanh_vien', thong_bao: i18n.t(hs.loai === 'ctcp' ? 'ui1.dkl.cdThieuVon' : 'ui1.dkl.tvThieuVon', { n: i + 1 }) });
    });
    const tong = tv.reduce((s, t) => s + (t.von || 0), 0);
    if (hs.von > 0 && tong > 0 && tong !== hs.von) {
      loi.push({ truong: 'thanh_vien', thong_bao: i18n.t('ui1.dkl.tongVonLech', { tong: soCoDau(tong), von: soCoDau(hs.von) }) });
    }
    if (hs.loai === 'ctcp') {
      if (!(hs.menh_gia > 0)) loi.push({ truong: 'menh_gia', thong_bao: i18n.t('ui1.dkl.thieuMenhGia') });
      else {
        if (hs.von % hs.menh_gia !== 0) loi.push({ truong: 'menh_gia', thong_bao: i18n.t('ui1.dkl.chiaHet') });
        tv.forEach((t, i) => { if (t.von > 0 && t.von % hs.menh_gia !== 0) loi.push({ truong: 'thanh_vien', thong_bao: i18n.t('ui1.dkl.cdKhongChiaHet', { n: i + 1 }) }); });
      }
    }
  }
  return loi;
}

// ───────────────────────── Lưu ở trình duyệt ─────────────────────────

export const KHOA_LUU = 'mimi.dangKyKinhDoanh.v1';

export function docHoSoDaLuu(kho: Pick<Storage, 'getItem'> | undefined = khoMacDinh()): HoSoDangKy | null {
  try {
    const s = kho?.getItem(KHOA_LUU);
    if (!s) return null;
    const v = JSON.parse(s) as Partial<HoSoDangKy>;
    if (!v || typeof v !== 'object' || typeof v.loai !== 'string') return null;
    // Trộn với bản rỗng: bản lưu từ phiên bản cũ thiếu trường mới thì vẫn đủ hình.
    const goc = hoSoRong(v.loai as LoaiHinh);
    return { ...goc, ...v, tru_so: { ...goc.tru_so, ...(v.tru_so ?? {}) }, dai_dien: { ...goc.dai_dien, ...(v.dai_dien ?? {}) }, ke_toan: { ...goc.ke_toan, ...(v.ke_toan ?? {}) } } as HoSoDangKy;
  } catch {
    return null;
  }
}

export function luuHoSo(hs: HoSoDangKy, kho: Pick<Storage, 'setItem'> | undefined = khoMacDinh()): boolean {
  try {
    kho?.setItem(KHOA_LUU, JSON.stringify(hs));
    return !!kho;
  } catch {
    return false;
  }
}

export function xoaHoSoDaLuu(kho: Pick<Storage, 'removeItem'> | undefined = khoMacDinh()): void {
  try { kho?.removeItem(KHOA_LUU); } catch { /* trình duyệt chặn bộ nhớ: không có gì để xoá */ }
}

function khoMacDinh(): Storage | undefined {
  try { return typeof window !== 'undefined' ? window.localStorage : undefined; } catch { return undefined; }
}
