import { chuanHoaTenModel } from '../../supabase/functions/_shared/chi-phi-ai/bang-gia.ts';
/**
 * Số liệu màn Chi phí AI, suy ra từ dòng chi phí thật đã lưu.
 *
 * Mọi ngày là ngày UTC — cách OpenAI và Anthropic chia bucket. "Tháng này" là tháng
 * UTC của hôm nay. Không có dữ liệu thì trả `null`/rỗng, không trả số 0 giả.
 *
 * API THẮNG FILE TRONG CÙNG NGÀY. Người dùng vừa đồng bộ API vừa nhập file cho cùng
 * một nhà cung cấp thì một ngày có hai nguồn cho cùng một khoản tiền. Cộng cả hai là
 * đếm đôi; giữ bản API vì nó là số của nhà cung cấp tại lần hỏi gần nhất.
 */

export type NhaCungCapAi = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'khac';

/** Thứ tự cố định: màu và vị trí đi theo nhà cung cấp, không theo thứ hạng. */
export const THU_TU_NCC: readonly NhaCungCapAi[] = ['openai', 'anthropic', 'gemini', 'openrouter', 'khac'];

export const TEN_NCC: Record<NhaCungCapAi, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Google Gemini',
  openrouter: 'OpenRouter',
  khac: 'Khác',
};

export interface DongChiPhiAi {
  nha_cung_cap: NhaCungCapAi;
  ngay: string;
  hang_muc: string;
  du_an: string;
  so_tien_usd: number;
  nguon: 'api' | 'nhap_file';
}

export interface NganSachAi {
  han_muc_thang_usd: number;
  canh_bao_phan_tram: number;
}

const DINH_DANG_USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const usd = (n: number) => DINH_DANG_USD.format(n);

export const ngayUTC = (d: Date) => d.toISOString().slice(0, 10);
const cong = (ds: DongChiPhiAi[]) => ds.reduce((s, d) => s + d.so_tien_usd, 0);

/**
 * Cùng nhà cung cấp, cùng ngày, CÙNG MODEL: số từ API thắng số từ file.
 *
 * Phải giữ ĐÚNG cùng khoá với `locTrungNguon` của MIMI Assistant (`_shared/tro-ly/tinh-toan.ts`)
 * — khoá khác nhau là trang này và trợ lý báo hai tổng khác nhau cho cùng một tháng. MIMI-P1-005
 * đổi khoá từ (nhà cung cấp, ngày) sang (nhà cung cấp, ngày, model) để không bỏ mất dòng file của
 * model mà API không trả về.
 */
export function locTrungNguon(ds: DongChiPhiAi[]): DongChiPhiAi[] {
  const khoa = (d: DongChiPhiAi) => `${d.nha_cung_cap}|${d.ngay}|${chuanHoaTenModel(d.hang_muc)}`;
  const coApi = new Set(ds.filter((d) => d.nguon === 'api').map(khoa));
  return ds.filter((d) => d.nguon === 'api' || !coApi.has(khoa(d)));
}

export interface TongQuanAi {
  coDuLieu: boolean;
  thangNay: number;
  /** Cùng số ngày đầu tháng trước; `null` khi không có dòng nào của tháng trước để so. */
  cungKyThangTruoc: number | null;
  thayDoiPhanTram: number | null;
  bayNgay: number;
  theoNcc: Array<{ ncc: NhaCungCapAi; tong: number }>;
  duLieuToi: string | null;
  nganSach: null | { han: number; daDung: number; conLai: number; phanTram: number; canhBao: boolean; vuot: boolean };
}

export function tongQuan(dsGoc: DongChiPhiAi[], homNay: Date, nganSach: NganSachAi | null): TongQuanAi {
  const ds = locTrungNguon(dsGoc);
  const hn = ngayUTC(homNay);
  const thang = hn.slice(0, 7);
  const y = homNay.getUTCFullYear();
  const mo = homNay.getUTCMonth();
  const ngayTrongThang = homNay.getUTCDate();
  const thangTruoc = ngayUTC(new Date(Date.UTC(y, mo - 1, 1))).slice(0, 7);
  const soNgayThangTruoc = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const denCungKy = `${thangTruoc}-${String(Math.min(ngayTrongThang, soNgayThangTruoc)).padStart(2, '0')}`;
  const bayNgayTu = ngayUTC(new Date(Date.UTC(y, mo, ngayTrongThang - 6)));

  const trongThang = ds.filter((d) => d.ngay.startsWith(thang) && d.ngay <= hn);
  const thangNay = cong(trongThang);
  const coThangTruoc = ds.some((d) => d.ngay.startsWith(thangTruoc));
  const cungKy = cong(ds.filter((d) => d.ngay.startsWith(thangTruoc) && d.ngay <= denCungKy));

  let ns: TongQuanAi['nganSach'] = null;
  if (nganSach) {
    const phanTram = (thangNay / nganSach.han_muc_thang_usd) * 100;
    ns = {
      han: nganSach.han_muc_thang_usd,
      daDung: thangNay,
      conLai: nganSach.han_muc_thang_usd - thangNay,
      phanTram,
      canhBao: phanTram >= nganSach.canh_bao_phan_tram,
      vuot: thangNay > nganSach.han_muc_thang_usd,
    };
  }

  return {
    coDuLieu: ds.length > 0,
    thangNay,
    cungKyThangTruoc: coThangTruoc ? cungKy : null,
    thayDoiPhanTram: coThangTruoc && cungKy > 0 ? ((thangNay - cungKy) / cungKy) * 100 : null,
    bayNgay: cong(ds.filter((d) => d.ngay >= bayNgayTu && d.ngay <= hn)),
    theoNcc: THU_TU_NCC
      .map((ncc) => ({ ncc, tong: cong(trongThang.filter((d) => d.nha_cung_cap === ncc)) }))
      .filter((x) => x.tong !== 0),
    duLieuToi: ds.reduce<string | null>((m, d) => (m === null || d.ngay > m ? d.ngay : m), null),
    nganSach: ns,
  };
}

const ngayVN = (iso: string) => iso.split('-').reverse().join('/');

/** Câu trợ lý đầu màn Chi phí AI. Chỉ nói điều số liệu cho biết; không có số thì nói việc cần làm. */
export function cauTomTatChiPhi(tq: TongQuanAi, homNay: Date): string {
  if (!tq.coDuLieu) {
    return 'Chưa có số liệu chi phí AI. Tải file báo cáo chi phí từ tài khoản của nhà cung cấp, hoặc bật tự động lấy số liệu cho OpenAI và Anthropic.';
  }
  let dau = `Tháng ${homNay.getUTCMonth() + 1} bạn đã chi ${usd(tq.thangNay)} cho dịch vụ AI`;
  if (tq.thayDoiPhanTram !== null && Math.round(tq.thayDoiPhanTram) !== 0) {
    dau += `, ${tq.thayDoiPhanTram > 0 ? 'tăng' : 'giảm'} ${Math.abs(Math.round(tq.thayDoiPhanTram))}% so với cùng kỳ tháng trước`;
  }
  const phan = [dau];
  const tong = tq.theoNcc.reduce((s, x) => s + x.tong, 0);
  const lonNhat = [...tq.theoNcc].sort((a, b) => b.tong - a.tong)[0];
  if (lonNhat && tq.theoNcc.length > 1 && tong > 0) phan.push(`${TEN_NCC[lonNhat.ncc]} chiếm ${Math.round((lonNhat.tong / tong) * 100)}%`);
  if (tq.nganSach) {
    phan.push(tq.nganSach.vuot ? `Đã vượt ngân sách tháng ${usd(-tq.nganSach.conLai)}` : `Còn ${usd(tq.nganSach.conLai)} trong ngân sách tháng`);
  }
  if (tq.duLieuToi) phan.push(`Số liệu cập nhật đến ${ngayVN(tq.duLieuToi)}`);
  return `${phan.join('. ')}.`;
}

export interface ViecChiPhi {
  khoa: string;
  loai: 'lay_tu_dong_loi' | 'dat_ngan_sach' | 'ngan_sach' | 'so_lieu_cu';
  cau: string;
  ncc?: NhaCungCapAi;
}

/** Số liệu cũ hơn chừng này ngày thì nhắc cập nhật. */
export const SO_NGAY_SO_LIEU_CU = 3;

export function viecCanLamChiPhi(
  tq: TongQuanAi,
  homNay: Date,
  layTuDongLoi: Array<{ nha_cung_cap: NhaCungCapAi; loi_cuoi: string | null }>,
): ViecChiPhi[] {
  const ds: ViecChiPhi[] = [];
  for (const k of layTuDongLoi) {
    ds.push({
      khoa: `loi-${k.nha_cung_cap}`,
      loai: 'lay_tu_dong_loi',
      ncc: k.nha_cung_cap,
      cau: `Không lấy được số liệu ${TEN_NCC[k.nha_cung_cap]} tự động${k.loi_cuoi ? ` — ${k.loi_cuoi}` : ''}`,
    });
  }
  if (tq.nganSach?.vuot) {
    ds.push({ khoa: 'vuot-ngan-sach', loai: 'ngan_sach', cau: `Chi phí AI tháng này đã vượt ngân sách ${usd(-tq.nganSach.conLai)}` });
  } else if (tq.nganSach?.canhBao) {
    ds.push({ khoa: 'canh-bao-ngan-sach', loai: 'ngan_sach', cau: `Đã dùng ${Math.round(tq.nganSach.phanTram)}% ngân sách chi phí AI tháng này` });
  }
  if (tq.coDuLieu && !tq.nganSach) {
    ds.push({ khoa: 'dat-ngan-sach', loai: 'dat_ngan_sach', cau: 'Chưa đặt ngân sách tháng — đặt để MIMI nhắc khi sắp chạm' });
  }
  if (tq.duLieuToi) {
    const cach = Math.round((Date.parse(`${ngayUTC(homNay)}T00:00:00Z`) - Date.parse(`${tq.duLieuToi}T00:00:00Z`)) / 86_400_000);
    if (cach >= SO_NGAY_SO_LIEU_CU) {
      ds.push({ khoa: 'so-lieu-cu', loai: 'so_lieu_cu', cau: `Số liệu mới đến ${ngayVN(tq.duLieuToi)}, cách đây ${cach} ngày — cập nhật hoặc tải file mới` });
    }
  }
  return ds;
}

export interface NgayChiPhi {
  ngay: string;
  theoNcc: Partial<Record<NhaCungCapAi, number>>;
  tong: number;
}

/** Từng ngày của tháng này, từ ngày 1 tới hôm nay (UTC), kể cả ngày không có chi phí. */
export function chuoiTheoNgay(dsGoc: DongChiPhiAi[], homNay: Date): NgayChiPhi[] {
  const ds = locTrungNguon(dsGoc);
  const y = homNay.getUTCFullYear();
  const mo = homNay.getUTCMonth();
  const ra: NgayChiPhi[] = Array.from({ length: homNay.getUTCDate() }, (_, i) => ({
    ngay: ngayUTC(new Date(Date.UTC(y, mo, i + 1))),
    theoNcc: {},
    tong: 0,
  }));
  const theoNgay = new Map(ra.map((d) => [d.ngay, d]));
  for (const d of ds) {
    const o = theoNgay.get(d.ngay);
    if (!o) continue;
    o.theoNcc[d.nha_cung_cap] = (o.theoNcc[d.nha_cung_cap] ?? 0) + d.so_tien_usd;
    o.tong += d.so_tien_usd;
  }
  return ra;
}

export interface HangMucChiPhi {
  ncc: NhaCungCapAi;
  hangMuc: string;
  duAn: string[];
  tong: number;
  phanTram: number;
}

/** Hạng mục (mô hình, dịch vụ) tốn nhất tháng này, kèm các dự án/workspace dùng nó. */
export function topHangMuc(dsGoc: DongChiPhiAi[], homNay: Date, soLuong = 10): HangMucChiPhi[] {
  const hn = ngayUTC(homNay);
  const thang = hn.slice(0, 7);
  const ds = locTrungNguon(dsGoc).filter((d) => d.ngay.startsWith(thang) && d.ngay <= hn);
  const tongThang = cong(ds);
  const m = new Map<string, { ncc: NhaCungCapAi; hangMuc: string; duAn: Set<string>; tong: number }>();
  for (const d of ds) {
    const k = `${d.nha_cung_cap}|${d.hang_muc}`;
    const o = m.get(k) ?? { ncc: d.nha_cung_cap, hangMuc: d.hang_muc || 'Khác', duAn: new Set<string>(), tong: 0 };
    if (d.du_an) o.duAn.add(d.du_an);
    o.tong += d.so_tien_usd;
    m.set(k, o);
  }
  return [...m.values()]
    .sort((a, b) => b.tong - a.tong)
    .slice(0, soLuong)
    .map((o) => ({ ncc: o.ncc, hangMuc: o.hangMuc, duAn: [...o.duAn], tong: o.tong, phanTram: tongThang > 0 ? (o.tong / tongThang) * 100 : 0 }));
}
