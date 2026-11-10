/**
 * CHUẨN BỊ ĐẦU VÀO cho đánh giá sẵn sàng vay và hồ sơ vay (10/11/2026) — hàm thuần, không đọc CSDL.
 *
 * Dòng tiền làm sạch đi qua CHÍNH `dongTienLamSach` của trợ lý (cùng chỗ tính sức khoẻ tài chính, dự báo và phương án
 * tài trợ), nên màn Vay vốn và câu trả lời của MIMI không bao giờ ra hai con số khác nhau cho cùng dữ liệu.
 *
 * Thêm ở đây: nhận ra KHOẢN VAY ĐANG CÓ trong sao kê — tiền giải ngân vào và tiền trả nợ ra. Chỉ là những gì MIMI thấy
 * trong tài khoản đã kết nối; khoản vay trả từ tài khoản khác thì không thấy, và hồ sơ nói rõ điều đó.
 */
import { dongTienLamSach, duLieuTrong, type GiaoDichTL, type HoaDonBanTL } from '../tro-ly/tinh-toan.ts';
import { chieuTien, doLonTien } from '../tien/chieu-tien.ts';
import { goiYTienVao } from '../phan-loai/tien-vao.ts';
import { congThang } from '../tai-chinh/du-bao.ts';
import type { DauVaoDanhGia, DongBangThang, ThangDongTien, VayHienCo } from './cham-diem.ts';

export type PhanLoaiTien = Record<string, 'include' | 'exclude' | 'pending'>;

export interface DuLieuTho {
  /** YYYY-MM-DD theo giờ Việt Nam. */
  homNay: string;
  giaoDich: GiaoDichTL[];
  phanLoai: PhanLoaiTien;
  hoaDonBan: HoaDonBanTL[];
}

export type { DongBangThang };

export interface DauVaoDaChuanBi {
  dau_vao: DauVaoDanhGia;
  /** Đủ 12 tháng đã khép sổ gần nhất, cũ → mới; tháng không có dữ liệu ghi null. */
  bang_thang: DongBangThang[];
  /** Các tháng đã khép sổ có dữ liệu (đã làm sạch), cũ → mới — đầu vào cho dự báo. */
  thang_lam_sach: ThangDongTien[];
  tien_vao_bi_loai: { so_tien: number; so_khoan: number };
  hoa_don_qua_han: { tong: number; so: number };
  hoa_don_cho_chua_han: { tong: number; so: number };
}

const boDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** Nội dung chuyển khoản giống trả nợ vay (gốc, lãi, trả góp, tất toán). Chỉ xét tiền RA. */
const MAU_TRA_NO = /\b(tra no|tra goc|tra lai vay|lai vay|goc vay|thu no vay|tra gop|thanh toan khoan vay|tat toan|thu goc|thu lai|tra no vay|hdtd)\b/;

export function laTraNoVay(t: Pick<GiaoDichTL, 'merchant_name' | 'counter_account_name' | 'payment_reference'>): boolean {
  return MAU_TRA_NO.test(` ${boDau([t.merchant_name, t.counter_account_name, t.payment_reference].filter(Boolean).join(' '))} `);
}

export const laQuaHan = (h: HoaDonBanTL, homNay: string) => h.status === 'overdue' || (h.status === 'pending' && h.due_date < homNay);

export function chuanBiDauVao(d: DuLieuTho, deNghi: { so_tien: number; ky_han_thang: number }): DauVaoDaChuanBi {
  const khoaNay = d.homNay.slice(0, 7);
  const tl = duLieuTrong(d.homNay, { tu: d.homNay, den: d.homNay, nhan: '' });
  tl.giaoDich = d.giaoDich;
  tl.phanLoaiTienVao = d.phanLoai;
  tl.hoaDonBan = d.hoaDonBan;
  const ls = dongTienLamSach(tl);

  const tuKhoa = congThang(khoaNay, -12);
  const daKhep = ls.thang.filter((t) => t.khoa < khoaNay && t.khoa >= tuKhoa).slice(-12);
  const theoKhoa = new Map(daKhep.map((t) => [t.khoa, t]));
  const bang_thang: DongBangThang[] = Array.from({ length: 12 }, (_, i) => {
    const k = congThang(khoaNay, i - 12);
    const t = theoKhoa.get(k);
    return t ? { khoa: k, vao: Math.round(t.vao), ra: Math.round(t.ra), rong: Math.round(t.vao - t.ra) } : { khoa: k, vao: null, ra: null, rong: null };
  });

  // Tiền vào thô và khoản nghi chưa xác nhận, cùng kỳ với các tháng chấm (giống `sucKhoeTaiChinh`).
  const tu = daKhep[0]?.khoa ?? khoaNay;
  let tongVao = 0;
  let nghiChua = 0;
  const vay: VayHienCo = { tien_vay_vao: 0, so_khoan_vay_vao: 0, tra_no_ra: 0, so_khoan_tra_no: 0 };
  for (const t of d.giaoDich) {
    const k = String(t.transaction_date).slice(0, 7);
    if (k < tu || k >= khoaNay) continue;
    const c = chieuTien(t);
    if (!c) continue;
    const tien = doLonTien(t);
    const pl = d.phanLoai[String(t.id)];
    if (c === 'vao') {
      tongVao += tien;
      const nghi = t.type === 'loan' || goiYTienVao(t) !== null;
      if ((pl ?? 'pending') === 'pending' && nghi) nghiChua += tien;
      // Chủ đã nói "đây là doanh thu" thì không coi là tiền vay.
      if (pl !== 'include' && (t.type === 'loan' || goiYTienVao(t)?.loai === 'vay')) { vay.tien_vay_vao += tien; vay.so_khoan_vay_vao += 1; }
    } else if (laTraNoVay(t)) {
      vay.tra_no_ra += tien; vay.so_khoan_tra_no += 1;
    }
  }

  const quaHan = d.hoaDonBan.filter((h) => laQuaHan(h, d.homNay));
  const choChuaHan = d.hoaDonBan.filter((h) => h.status === 'pending' && h.due_date >= d.homNay);
  const tong = (ds: HoaDonBanTL[]) => ds.reduce((s, h) => s + Number(h.total || 0), 0);

  return {
    dau_vao: {
      thang: daKhep.map((t) => ({ khoa: t.khoa, vao: Math.round(t.vao), ra: Math.round(t.ra) })),
      so_tien_de_nghi: deNghi.so_tien,
      ky_han_thang: deNghi.ky_han_thang,
      cong_no_qua_han: Math.round(tong(quaHan)),
      ty_le_khach_lon_nhat: ls.khachTop ? Math.round(ls.khachTop.ty_le * 1e4) / 1e4 : null,
      tien_nghi_chua_xac_nhan: Math.round(nghiChua),
      tong_tien_vao: Math.round(tongVao),
      vay_hien_co: { ...vay, tien_vay_vao: Math.round(vay.tien_vay_vao), tra_no_ra: Math.round(vay.tra_no_ra) },
    },
    bang_thang,
    thang_lam_sach: ls.thang.map((t) => ({ khoa: t.khoa, vao: Math.round(t.vao), ra: Math.round(t.ra) })),
    tien_vao_bi_loai: { so_tien: Math.round(ls.tienBiLoai), so_khoan: ls.biLoai.length },
    hoa_don_qua_han: { tong: Math.round(tong(quaHan)), so: quaHan.length },
    hoa_don_cho_chua_han: { tong: Math.round(tong(choChuaHan)), so: choChuaHan.length },
  };
}
