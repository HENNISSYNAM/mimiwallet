/**
 * KHOẢN ĐỊNH KỲ (10/11/2026): lương, tiền nhà, thuê bao, trả góp, khách quen trả đều.
 *
 * Với mỗi đối tác (cùng số TK đối ứng / tên / chữ ký nội dung, cùng chiều tiền), gộp các lần theo ngày rồi xét:
 *   - CHU KỲ: trung vị khoảng cách giữa các lần (tối đa 12 khoảng gần nhất) rơi vào một chu kỳ chuẩn
 *     (tuần 7±1, hai tuần 14±2, tháng 30,44±4, quý 91,3±8).
 *   - ĐỀU ĐẶN = tỉ lệ khoảng cách nằm trong dung sai của chu kỳ đó.
 *   - SỐ TIỀN GIỐNG NHAU: hệ số biến thiên (độ lệch chuẩn / trung bình) của ≤12 lần gần nhất; điểm = 1 − cv/0,5.
 *   - ĐỦ LẦN: số lần / (tối thiểu của chu kỳ + 2), tối đa 1.
 *   độ tin cậy = đều đặn × (0,5 + 0,5 × điểm số tiền) × điểm đủ lần.
 * Còn hoạt động khi lần cuối cách hôm nay không quá một chu kỳ + 2 dung sai. Ngày kế tiếp: tháng → cùng ngày trong
 * tháng (trung vị 3 lần gần nhất, kẹp theo độ dài tháng); chu kỳ khác → lần cuối + k × chu kỳ, lần đầu ≥ hôm nay.
 * Số tiền dự kiến = trung vị 6 lần gần nhất.
 */
import { NHOM, NHOM_NOI_BO, type Nhom } from './phan-nhom.ts';
import { ngayTrongThang, ngayTu, type TongHop } from './tong-hop.ts';

export type ChuKy = 'tuan' | 'hai_tuan' | 'thang' | 'quy';
export type LoaiDinhKy = 'luong' | 'mat_bang' | 'tra_no' | 'thue' | 'thue_bao' | 'khach_quen' | 'nha_cung_cap' | 'dinh_ky_khac';

const CHU_KY: { ten: ChuKy; p: number; dung_sai: number; toi_thieu: number }[] = [
  { ten: 'tuan', p: 7, dung_sai: 1, toi_thieu: 4 },
  { ten: 'hai_tuan', p: 14, dung_sai: 2, toi_thieu: 3 },
  { ten: 'thang', p: 30.44, dung_sai: 4, toi_thieu: 3 },
  { ten: 'quy', p: 91.3, dung_sai: 8, toi_thieu: 3 },
];

export interface DongDinhKy {
  ma: number;
  ten: string;
  chieu: 'vao' | 'ra';
  nhom: Nhom;
  loai: LoaiDinhKy;
  chu_ky: ChuKy;
  so_lan: number;
  so_tien_du_kien: number;
  lan_cuoi: string;
  ngay_ke_tiep: string;
  /** Chỉ số ngày của lần kế tiếp — để dựng lịch. */
  ke_tiep: number;
  do_tin_cay: number;
  dang_hoat_dong: boolean;
}

/** Ngưỡng hiện ra danh sách / ngưỡng được cộng vào lịch dự báo. */
export const TIN_CAY_HIEN = 0.5;
export const TIN_CAY_LICH = 0.6;

const THUE_BAO = /\b(google|microsoft|zalo|netflix|aws|amazon|icloud|apple|canva|adobe|spotify|youtube|facebook|meta|tiktok ads|internet|fpt|viettel|vnpt|dien luc|evn|nuoc|cap nuoc)\b/;

const trungViSo = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

function thangKeTiep(lanCuoi: number, ngayTT: number, homNay: number): number {
  const d = new Date(lanCuoi * 86_400_000);
  let y = d.getUTCFullYear(); let m = d.getUTCMonth();
  for (let k = 0; k < 40; k++) {
    m++; if (m > 11) { m = 0; y++; }
    const dai = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const i = Date.UTC(y, m, Math.min(ngayTT, dai)) / 86_400_000;
    if (i >= homNay) return i;
  }
  return homNay;
}

export function phatHienDinhKy(th: TongHop): DongDinhKy[] {
  // Đếm và gom chỉ số dòng theo đối tác (sắp xếp đếm — O(n)).
  const soDT = th.tenDoiTac.length;
  const dem = new Int32Array(soDT + 1);
  for (let i = 0; i < th.ngay.length; i++) if (th.nhom[i] !== NHOM_NOI_BO) dem[th.doiTac[i] + 1]++;
  for (let k = 0; k < soDT; k++) dem[k + 1] += dem[k];
  const viTri = dem.slice();
  const chiSo = new Int32Array(dem[soDT]);
  for (let i = 0; i < th.ngay.length; i++) if (th.nhom[i] !== NHOM_NOI_BO) chiSo[viTri[th.doiTac[i]]++] = i;

  const out: DongDinhKy[] = [];
  for (let ma = 0; ma < soDT; ma++) {
    const a = dem[ma], b = dem[ma + 1];
    if (b - a < 3) continue;
    const ds = Array.from(chiSo.subarray(a, b)).sort((x, y) => th.ngay[x] - th.ngay[y]);
    // Gộp theo ngày.
    const ngay: number[] = []; const tien: number[] = []; const demNhom = new Map<number, number>();
    for (const i of ds) {
      demNhom.set(th.nhom[i], (demNhom.get(th.nhom[i]) ?? 0) + th.tien[i]);
      if (ngay.length && ngay[ngay.length - 1] === th.ngay[i]) tien[tien.length - 1] += th.tien[i];
      else { ngay.push(th.ngay[i]); tien.push(th.tien[i]); }
    }
    if (ngay.length < 3) continue;
    const kc: number[] = [];
    for (let k = Math.max(1, ngay.length - 12); k < ngay.length; k++) kc.push(ngay[k] - ngay[k - 1]);
    const tv = trungViSo(kc);
    const ck = CHU_KY.find((c) => Math.abs(tv - c.p) <= c.dung_sai);
    if (!ck) continue;
    const deu = kc.filter((g) => Math.abs(g - ck.p) <= ck.dung_sai).length / kc.length;
    const gan = tien.slice(-12);
    const tb = gan.reduce((s, x) => s + x, 0) / gan.length;
    const cv = tb > 0 ? Math.sqrt(gan.reduce((s, x) => s + (x - tb) ** 2, 0) / gan.length) / tb : 1;
    const diemTien = Math.max(0, Math.min(1, 1 - cv / 0.5));
    const diemLan = Math.min(1, ngay.length / (ck.toi_thieu + 2));
    const tin = Math.round(deu * (0.5 + 0.5 * diemTien) * diemLan * 100) / 100;
    if (tin < TIN_CAY_HIEN) continue;

    const lanCuoi = ngay[ngay.length - 1];
    const hoatDong = th.homNay - lanCuoi <= ck.p + 2 * ck.dung_sai;
    let keTiep: number;
    if (ck.ten === 'thang') keTiep = thangKeTiep(lanCuoi, Math.round(trungViSo(ngay.slice(-3).map(ngayTrongThang))), th.homNay);
    else { const p = Math.round(ck.p); keTiep = lanCuoi + p * Math.max(1, Math.ceil((th.homNay - lanCuoi) / p)); }

    const nhomChinh = [...demNhom.entries()].sort((x, y) => y[1] - x[1])[0][0];
    const nhom = NHOM[nhomChinh];
    const chieu = th.chieuDoiTac[ma] === 0 ? 'vao' : 'ra';
    const soTien = Math.round(trungViSo(tien.slice(-6)));
    const tenThuong = th.tenDoiTac[ma].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    let loai: LoaiDinhKy = 'dinh_ky_khac';
    if (nhom === 'luong' || nhom === 'mat_bang' || nhom === 'tra_no' || nhom === 'thue' || nhom === 'nha_cung_cap') loai = nhom;
    else if (chieu === 'vao' && nhom === 'ban_hang') loai = 'khach_quen';
    else if (chieu === 'ra' && (THUE_BAO.test(` ${tenThuong} `) || (cv < 0.05 && ck.ten !== 'quy'))) loai = 'thue_bao';
    out.push({
      ma, ten: th.tenDoiTac[ma], chieu, nhom, loai, chu_ky: ck.ten, so_lan: ngay.length, so_tien_du_kien: soTien,
      lan_cuoi: ngayTu(lanCuoi), ngay_ke_tiep: ngayTu(keTiep), ke_tiep: keTiep, do_tin_cay: tin, dang_hoat_dong: hoatDong,
    });
  }
  return out.sort((x, y) => y.do_tin_cay - x.do_tin_cay || y.so_tien_du_kien - x.so_tien_du_kien || x.ma - y.ma);
}

/** Các lần dự kiến trong [tu, tu + soNgay): mảng tiền vào / ra theo ngày. */
export function lichDinhKy(ds: readonly DongDinhKy[], tu: number, soNgay: number): { vao: Float64Array; ra: Float64Array; theoDong: Map<number, number> } {
  const vao = new Float64Array(soNgay); const ra = new Float64Array(soNgay);
  const theoDong = new Map<number, number>();
  const ck: Record<ChuKy, number> = { tuan: 7, hai_tuan: 14, thang: 0, quy: 91 };
  for (const d of ds) {
    if (!d.dang_hoat_dong || d.do_tin_cay < TIN_CAY_LICH) continue;
    const dich = d.chieu === 'vao' ? vao : ra;
    const ngayTT = Number(d.ngay_ke_tiep.slice(8, 10));
    let i = d.ke_tiep; let tong = 0;
    while (i - tu < soNgay) {
      if (i >= tu) { dich[i - tu] += d.so_tien_du_kien; tong += d.so_tien_du_kien; }
      i = d.chu_ky === 'thang' ? thangKeTiep(i, ngayTT, i + 1) : i + ck[d.chu_ky];
    }
    theoDong.set(d.ma, tong);
  }
  return { vao, ra, theoDong };
}
