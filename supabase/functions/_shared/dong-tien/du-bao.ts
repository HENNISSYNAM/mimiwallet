/**
 * DỰ BÁO DÒNG TIỀN 13 TUẦN / 3 THÁNG (10/11/2026) — điểm vào chính của thư mục `dong-tien`.
 *
 * Các bước (tất cả tất định — cùng dữ liệu, cùng hạt giống → cùng kết quả):
 *  1. Khoản định kỳ (`dinh-ky.ts`). Khoản đang hoạt động, tin cậy ≥ 0,6 được TÁCH khỏi lịch sử và đặt lại vào tương lai
 *     theo lịch của chính nó (lương ngày 5, tiền nhà ngày 1…) — mô hình chỉ học phần còn lại.
 *  2. Chuỗi gốc theo ngày: tiền vào KINH DOANH (bán hàng, đặt cọc, hoàn tiền, vào khác) và toàn bộ tiền ra. Tiền vay,
 *     góp vốn, người nhà… có trong lịch sử nhưng không ngoại suy. Chuyển nội bộ bị loại.
 *  3. ≥ 8 tuần: kiểm định quay vòng ba mô hình cho từng chuỗi, chọn MASE nhỏ nhất. < 8 tuần: trung bình theo thứ, nói rõ.
 *     < 14 ngày: không dự báo.
 *  4. Khoảng P10/P50/P90: bootstrap 500 đường từ sai số TUẦN của chính các lần kiểm định (dòng ròng), hạt giống cố định
 *     (mulberry32). Mỗi đường: dự báo điểm + một sai số tuần rút ngẫu nhiên, chia đều 7 ngày. Mọi phân vị (tuần, số dư,
 *     tháng) lấy trên cùng tập đường nên luôn P10 ≤ P50 ≤ P90.
 *  5. Số dư: không có trong dữ liệu ngân hàng. Chủ nhập số dư hôm nay → đường số dư và tuần có thể âm. Không nhập →
 *     "cần giữ tối thiểu" = −P10 của điểm thấp nhất trên đường dòng tiền cộng dồn.
 *
 * Không có mô hình ngôn ngữ nào tính số ở đây.
 */
import { CHI_SO_NHOM, NHOM, NHOM_RA, NHOM_VAO_KINH_DOANH, NHOM_VAO_TAI_CHINH, TEN_NHOM, type Nhom } from './phan-nhom.ts';
import { chuoiNgay, congNhom, gom, ngayTu, type GiaoDichDT, type TongHop, type TuyChonGom } from './tong-hop.ts';
import { lichDinhKy, phatHienDinhKy, TIN_CAY_LICH, type DongDinhKy } from './dinh-ky.ts';
import { chonMoHinh, kiemDinh, MO_HINH, type DiemMoHinh, type TenMoHinh } from './mo-hinh.ts';
import { LOI_DT, type NgonDT } from './loi.ts';

export const SO_TUAN = 13;
export const SO_THANG = 3;
export const NGAY_TOI_THIEU = 14;
export const NGAY_DU_HOC = 56;
export const SO_DUONG = 500;
export const HAT_GIONG = 20261110;
const TAM = 126; // 18 tuần: phủ 13 tuần và 3 tháng dương lịch kế tiếp.

export interface Khoang { p10: number; p50: number; p90: number }
export interface TuanDuBao { tu: string; den: string; vao_p50: number; ra_p50: number; rong: Khoang;
  /** Số dư cuối tuần. Chủ chưa nhập số dư → tính từ 0, tức là "thay đổi so với hôm nay" (`so_du_tuong_doi`). */
  so_du: Khoang; rui_ro: 'cao' | 'vua' | null }
export interface ThangDuBaoML { khoa: string; vao_p50: number; ra_p50: number; rong: Khoang }
export interface DongChinh { khoa: string; nhan: string; chieu: 'vao' | 'ra'; tong: number; dinh_ky: boolean }

export interface DuBaoDongTienML {
  phien_ban: 1;
  che_do: 'day_du' | 'du_phong' | 'khong_du';
  ly_do: string | null;
  hom_nay: string;
  tu_ngay: string | null;
  so_ngay_lich_su: number;
  so_giao_dich: number;
  so_noi_bo: number;
  mo_hinh: { vao: DiemMoHinh | null; ra: DiemMoHinh | null; ung_vien: (DiemMoHinh & { chuoi: 'vao' | 'ra' })[]; so_moc: number };
  tuan: TuanDuBao[];
  thang: ThangDuBaoML[];
  so_du_hien_tai: number | null;
  so_du_tuong_doi: boolean;
  can_giu_toi_thieu: number | null;
  tuan_rui_ro: { tu: string; den: string; muc: 'cao' | 'vua' }[];
  dinh_ky: Omit<DongDinhKy, 'ma' | 'ke_tiep'>[];
  dong_chinh: DongChinh[];
  tien_tai_chinh_lich_su: number;
  tom_tat: string;
  giai_thich: string[];
}

export interface TuyChonDuBao { ngon?: NgonDT; soDuHienTai?: number | null; hatGiong?: number }

/** PRNG mulberry32 — nhỏ, nhanh, tất định. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Phân vị nội suy tuyến tính (mảng sẽ bị sắp xếp). */
function phanVi(a: Float64Array, p: number): number {
  a.sort();
  const i = (a.length - 1) * p; const lo = Math.floor(i); const hi = Math.ceil(i);
  return a[lo] + (a[hi] - a[lo]) * (i - lo);
}
const khoang = (a: Float64Array): Khoang => ({ p10: Math.round(phanVi(a, 0.1)), p50: Math.round(phanVi(a, 0.5)), p90: Math.round(phanVi(a, 0.9)) });
const tong = (a: ArrayLike<number>, tu = 0, den = a.length) => { let s = 0; for (let i = tu; i < den; i++) s += a[i]; return s; };

function rong(homNay: string, ly_do: string, th: TongHop | null, dk: DongDinhKy[]): DuBaoDongTienML {
  return {
    phien_ban: 1, che_do: 'khong_du', ly_do, hom_nay: homNay, tu_ngay: th && th.soNgay > 0 ? ngayTu(th.d0) : null,
    so_ngay_lich_su: th?.soNgay ?? 0, so_giao_dich: th?.so_dong ?? 0, so_noi_bo: th?.so_noi_bo ?? 0,
    mo_hinh: { vao: null, ra: null, ung_vien: [], so_moc: 0 }, tuan: [], thang: [], so_du_hien_tai: null, so_du_tuong_doi: true, can_giu_toi_thieu: null,
    tuan_rui_ro: [], dinh_ky: dk.map(({ ma: _m, ke_tiep: _k, ...r }) => r), dong_chinh: [], tien_tai_chinh_lich_su: 0, tom_tat: ly_do, giai_thich: [],
  };
}

export function duBaoTuTongHop(th: TongHop, o: TuyChonDuBao = {}): DuBaoDongTienML {
  const ngon: NgonDT = o.ngon ?? 'vi';
  const L = LOI_DT[ngon];
  const homNay = ngayTu(th.homNay);
  const dinhKy = phatHienDinhKy(th);
  const coGd = th.ngay.length - th.so_noi_bo > 0;
  if (!coGd) return rong(homNay, L.khongCoGiaoDich, th, []);
  if (th.soNgay < NGAY_TOI_THIEU) return rong(homNay, L.itQua(th.soNgay), th, dinhKy);

  // 1–2. Tách định kỳ, dựng chuỗi gốc.
  const tach = new Set(dinhKy.filter((d) => d.dang_hoat_dong && d.do_tin_cay >= TIN_CAY_LICH).map((d) => d.ma));
  const c = chuoiNgay(th, tach);
  const yVao = congNhom(c, NHOM_VAO_KINH_DOANH.map((n) => CHI_SO_NHOM[n]));
  const yRa = congNhom(c, NHOM_RA.map((n) => CHI_SO_NHOM[n]));
  const tienTaiChinh = Math.round(tong(congNhom(chuoiNgay(th), NHOM_VAO_TAI_CHINH.map((n) => CHI_SO_NHOM[n]))));

  // 3. Chọn mô hình.
  let tenVao: TenMoHinh = 'trung_binh_thu'; let tenRa: TenMoHinh = 'trung_binh_thu';
  let diemVao: DiemMoHinh | null = null; let diemRa: DiemMoHinh | null = null;
  const ungVien: DuBaoDongTienML['mo_hinh']['ung_vien'] = [];
  let soMoc = 0;
  let saiSoRong: number[] = [];
  const kqVao = th.soNgay >= NGAY_DU_HOC ? kiemDinh(yVao, th.d0) : null;
  const kqRa = th.soNgay >= NGAY_DU_HOC ? kiemDinh(yRa, th.d0) : null;
  const tron = (d: DiemMoHinh) => ({ ...d, mase: Math.round(d.mase * 1000) / 1000, smape: Math.round(d.smape * 10) / 10 });
  if (kqVao && kqRa) {
    diemVao = tron(chonMoHinh(kqVao)); diemRa = tron(chonMoHinh(kqRa));
    tenVao = diemVao.ten; tenRa = diemRa.ten; soMoc = kqVao.moc.length;
    for (const d of kqVao.diem) ungVien.push({ ...tron(d), chuoi: 'vao' });
    for (const d of kqRa.diem) ungVien.push({ ...tron(d), chuoi: 'ra' });
    const sv = kqVao.saiSo[tenVao]; const sr = kqRa.saiSo[tenRa];
    for (let m = 0; m < sv.length; m++) for (let w = 0; w < sv[m].length; w++) saiSoRong.push(sv[m][w] - sr[m][w]);
  } else {
    // Dự phòng: sai số = độ lệch tổng tuần so với trung bình tuần.
    const soTuanLS = Math.floor(th.soNgay / 7);
    const w: number[] = [];
    for (let k = 0; k < soTuanLS; k++) { const a = th.soNgay - (k + 1) * 7; w.push(tong(yVao, a, a + 7) - tong(yRa, a, a + 7)); }
    const tb = w.reduce((s, x) => s + x, 0) / Math.max(1, w.length);
    saiSoRong = w.map((x) => x - tb);
  }
  if (saiSoRong.length < 2) saiSoRong = [0];
  const cheDo = kqVao && kqRa ? 'day_du' : 'du_phong';

  // Dự báo điểm.
  const fVao = MO_HINH[tenVao](yVao, TAM, th.d0);
  const fRa = MO_HINH[tenRa](yRa, TAM, th.d0);
  const lich = lichDinhKy(dinhKy, th.homNay, TAM);
  const rongNgay = new Float64Array(TAM);
  for (let i = 0; i < TAM; i++) rongNgay[i] = fVao[i] + lich.vao[i] - fRa[i] - lich.ra[i];

  // Tháng dương lịch kế tiếp.
  const dHom = new Date(th.homNay * 86_400_000);
  const thangKhoang: { khoa: string; tu: number; den: number }[] = [];
  for (let k = 1; k <= SO_THANG; k++) {
    const a = Date.UTC(dHom.getUTCFullYear(), dHom.getUTCMonth() + k, 1) / 86_400_000;
    const b = Date.UTC(dHom.getUTCFullYear(), dHom.getUTCMonth() + k + 1, 1) / 86_400_000;
    const khoa = ngayTu(a).slice(0, 7);
    thangKhoang.push({ khoa, tu: a - th.homNay, den: Math.min(TAM, b - th.homNay) });
  }

  // 4. Bootstrap.
  const soDu = typeof o.soDuHienTai === 'number' && Number.isFinite(o.soDuHienTai) ? o.soDuHienTai : null;
  const B0 = soDu ?? 0;
  const rnd = mulberry32(o.hatGiong ?? HAT_GIONG);
  const N = SO_DUONG;
  const tuanRong = Array.from({ length: SO_TUAN }, () => new Float64Array(N));
  const tuanCuoi = Array.from({ length: SO_TUAN }, () => new Float64Array(N));
  const tuanThap = Array.from({ length: SO_TUAN }, () => new Float64Array(N));
  const thangRong = Array.from({ length: SO_THANG }, () => new Float64Array(N));
  const thapNhat = new Float64Array(N);
  const soTuanTam = TAM / 7;
  const r = new Float64Array(soTuanTam);
  for (let p = 0; p < N; p++) {
    for (let w = 0; w < soTuanTam; w++) r[w] = saiSoRong[Math.floor(rnd() * saiSoRong.length)] / 7;
    let bal = B0; let min = Infinity; let thapTuan = Infinity; let rongTuan = 0;
    const thangTong = new Float64Array(SO_THANG);
    for (let i = 0; i < TAM; i++) {
      const v = rongNgay[i] + r[Math.floor(i / 7)];
      bal += v;
      const w = Math.floor(i / 7);
      if (w < SO_TUAN) {
        rongTuan += v; if (bal < thapTuan) thapTuan = bal; if (bal < min) min = bal;
        if (i % 7 === 6) { tuanRong[w][p] = rongTuan; tuanCuoi[w][p] = bal; tuanThap[w][p] = thapTuan; rongTuan = 0; thapTuan = Infinity; }
      }
      for (let k = 0; k < SO_THANG; k++) if (i >= thangKhoang[k].tu && i < thangKhoang[k].den) thangTong[k] += v;
    }
    thapNhat[p] = Math.min(min, B0);
    for (let k = 0; k < SO_THANG; k++) thangRong[k][p] = thangTong[k];
  }

  const tuan: TuanDuBao[] = [];
  const tuanRuiRo: DuBaoDongTienML['tuan_rui_ro'] = [];
  for (let w = 0; w < SO_TUAN; w++) {
    const tu = ngayTu(th.homNay + w * 7); const den = ngayTu(th.homNay + w * 7 + 6);
    let ruiRo: TuanDuBao['rui_ro'] = null;
    if (soDu !== null) {
      const thap = khoang(tuanThap[w]);
      ruiRo = thap.p50 < 0 ? 'cao' : thap.p10 < 0 ? 'vua' : null;
      if (ruiRo) tuanRuiRo.push({ tu, den, muc: ruiRo });
    }
    tuan.push({
      tu, den,
      vao_p50: Math.round(tong(fVao, w * 7, w * 7 + 7) + tong(lich.vao, w * 7, w * 7 + 7)),
      ra_p50: Math.round(tong(fRa, w * 7, w * 7 + 7) + tong(lich.ra, w * 7, w * 7 + 7)),
      rong: khoang(tuanRong[w]),
      so_du: khoang(tuanCuoi[w]),
      rui_ro: ruiRo,
    });
  }
  const thang: ThangDuBaoML[] = thangKhoang.map((t, k) => ({
    khoa: t.khoa,
    vao_p50: Math.round(tong(fVao, t.tu, t.den) + tong(lich.vao, t.tu, t.den)),
    ra_p50: Math.round(tong(fRa, t.tu, t.den) + tong(lich.ra, t.tu, t.den)),
    rong: khoang(thangRong[k]),
  }));
  const canGiu = soDu === null ? Math.max(0, -Math.round(phanVi(thapNhat, 0.1))) : null;

  // Dòng chính trong 13 tuần.
  const H13 = SO_TUAN * 7;
  const dongChinh: DongChinh[] = [
    { khoa: 'vao_kinh_doanh', nhan: ngon === 'vi' ? 'Tiền vào kinh doanh (ngoài khoản định kỳ)' : 'Business inflow (excluding regular items)', chieu: 'vao', tong: Math.round(tong(fVao, 0, H13)), dinh_ky: false },
    { khoa: 'ra_thuong', nhan: ngon === 'vi' ? 'Chi tiêu (ngoài khoản định kỳ)' : 'Spending (excluding regular items)', chieu: 'ra', tong: Math.round(tong(fRa, 0, H13)), dinh_ky: false },
  ];
  const lich13 = lichDinhKy(dinhKy, th.homNay, H13).theoDong;
  const theoNhom = new Map<string, { nhom: Nhom; chieu: 'vao' | 'ra'; tong: number }>();
  for (const d of dinhKy) {
    const t = lich13.get(d.ma); if (!t) continue;
    const k = `${d.chieu}:${d.nhom}`;
    const x = theoNhom.get(k) ?? { nhom: d.nhom, chieu: d.chieu, tong: 0 }; x.tong += t; theoNhom.set(k, x);
  }
  for (const [k, x] of theoNhom) dongChinh.push({ khoa: `dinh_ky:${k}`, nhan: `${TEN_NHOM[ngon][x.nhom]} (${ngon === 'vi' ? 'định kỳ' : 'regular'})`, chieu: x.chieu, tong: Math.round(x.tong), dinh_ky: true });
  dongChinh.sort((a, b) => b.tong - a.tong || a.khoa.localeCompare(b.khoa));

  // Lời.
  const vao13 = tuan.reduce((s, t) => s + t.vao_p50, 0);
  const ra13 = tuan.reduce((s, t) => s + t.ra_p50, 0);
  const cong = Float64Array.from({ length: N }, (_, p) => tuanRong.reduce((s, a) => s + a[p], 0));
  const kCong = khoang(cong);
  const giaiThich: string[] = [];
  if (cheDo === 'du_phong') giaiThich.push(L.duPhong(Math.floor(th.soNgay / 7)));
  else giaiThich.push(L.moHinh(tenVao, tenRa, diemVao!.mase, diemRa!.mase, soMoc));
  if (soDu !== null) {
    if (tuanRuiRo.length) for (const t of tuanRuiRo.slice(0, 3)) giaiThich.push(L.tuanRuiRo(t.tu, t.den, t.muc === 'cao'));
    else giaiThich.push(L.khongRuiRo);
  } else giaiThich.push(L.canGiu(canGiu ?? 0));
  for (const d of dinhKy.filter((x) => x.dang_hoat_dong && x.do_tin_cay >= TIN_CAY_LICH && x.chieu === 'ra').slice(0, 3)) {
    giaiThich.push(L.dinhKy(d.ten, L.loaiDinhKy[d.loai], L.chuKy[d.chu_ky], d.so_tien_du_kien, d.ngay_ke_tiep));
  }
  if (tienTaiChinh > 0) giaiThich.push(L.khongDuBaoTaiChinh(tienTaiChinh));
  if (th.so_noi_bo > 0) giaiThich.push(L.noiBo(th.so_noi_bo));
  giaiThich.push(L.luuY);

  return {
    phien_ban: 1, che_do: cheDo, ly_do: cheDo === 'du_phong' ? L.duPhong(Math.floor(th.soNgay / 7)) : null,
    hom_nay: homNay, tu_ngay: ngayTu(th.d0), so_ngay_lich_su: th.soNgay, so_giao_dich: th.so_dong, so_noi_bo: th.so_noi_bo,
    mo_hinh: { vao: diemVao, ra: diemRa, ung_vien: ungVien, so_moc: soMoc },
    tuan, thang, so_du_hien_tai: soDu, so_du_tuong_doi: soDu === null, can_giu_toi_thieu: canGiu, tuan_rui_ro: tuanRuiRo,
    dinh_ky: dinhKy.map(({ ma: _m, ke_tiep: _k, ...x }) => x),
    dong_chinh: dongChinh, tien_tai_chinh_lich_su: tienTaiChinh,
    tom_tat: L.tomTat(vao13, ra13, vao13 - ra13, kCong.p10, kCong.p90),
    giai_thich: giaiThich,
  };
}

/** Dự báo từ một mảng giao dịch đã đọc (trợ lý: ≤ 10k dòng trong bộ nhớ). */
export function duBaoDongTienML(ds: readonly GiaoDichDT[], gomO: TuyChonGom, o: TuyChonDuBao = {}): DuBaoDongTienML {
  return duBaoTuTongHop(gom(ds, gomO), o);
}

export { NHOM };
