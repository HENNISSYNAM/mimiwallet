/**
 * DỰ BÁO DÒNG TIỀN VÀ CẢNH BÁO (16/10/2026) — hàm thuần, không đọc CSDL, không gọi mô hình.
 *
 * Trước đây MIMI trả "chưa có dự báo dòng tiền". Chủ đề E của FinTechathon 2026 (SME Finance Copilot) đòi "quản lý dòng
 * tiền có cảnh báo", và các công cụ kế toán toàn cầu đều có dự báo ngắn hạn — nên đây là khoảng trống đã đo được.
 *
 * NGUYÊN TẮC TRUNG THỰC (giữ nguyên tinh thần của cả sản phẩm):
 *  - Không có số dư tài khoản trong dữ liệu → dự báo DÒNG TIỀN RÒNG theo tháng, không dự báo số dư, không nói "còn đủ tiền
 *    tới ngày…".
 *  - Dưới 3 tháng đã khép sổ → KHÔNG dự báo, nói rõ thiếu gì. Không có số "tạm tính" để trông cho đủ.
 *  - Ba kịch bản lấy từ PHÂN VỊ của chính các tháng đã có (tốt = phân vị 75 tiền vào, 25 tiền ra; xấu = ngược lại; cơ sở =
 *    trung vị). Đây là khoảng thô để thấy rủi ro, không phải mô hình thống kê và không có độ tin cậy 95%.
 *  - Tiền vào đã được làm sạch ở nơi gọi: khoản nghi là vay/góp vốn/người nhà/hoàn tiền không được coi là dòng tiền kinh doanh.
 */

export interface ThangTien { khoa: string; vao: number; ra: number }
export interface ThangDuBao { khoa: string; vao: number; ra: number; rong: number }
export type TenKichBan = 'tot' | 'co_so' | 'xau';
export interface KichBan { ten: TenKichBan; thang: ThangDuBao[]; tong_rong: number }
export type MucDoCanhBao = 'cao' | 'vua';
export interface CanhBaoDongTien { ma: string; muc_do: MucDoCanhBao; cau: string }
export interface KhachTop { ten: string; ty_le: number; so_khoan: number }

export interface KetQuaDuBao {
  du_du_lieu: boolean;
  ly_do_thieu: string | null;
  so_thang_da_khep: number;
  /** Trung vị tiền vào / tiền ra / ròng của các tháng đã khép (tối đa 6 tháng gần nhất). */
  trung_vi: { vao: number; ra: number; rong: number } | null;
  he_so_bien_dong_vao: number | null;
  kich_ban: KichBan[];
  canh_bao: CanhBaoDongTien[];
}

export const SO_THANG_TOI_THIEU = 3;
export const SO_THANG_DU_BAO = 3;
const SO_THANG_NHIN_LAI = 6;
/** Ngưỡng cảnh báo — hằng số có tên để đổi một chỗ và để test đọc được ý định. */
export const NGUONG = {
  cong_no_qua_han_tren_doanh_thu_thang: 0.25,
  khach_chiem_tren: 0.4,
  he_so_bien_dong: 0.5,
  chi_vuot_trung_vi: 1.3,
  /** Chỉ so tháng đang chạy khi đã qua ít nhất ngần này phần của tháng, kẻo ngày đầu tháng ra tỉ lệ vô nghĩa. */
  phan_thang_toi_thieu: 0.3,
} as const;

const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} ₫`;

export function phanVi(a: readonly number[], p: number): number {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}
export const trungVi = (a: readonly number[]) => phanVi(a, 0.5);

function heSoBienDong(a: readonly number[]): number | null {
  if (a.length < 2) return null;
  const tb = a.reduce((x, y) => x + y, 0) / a.length;
  if (tb <= 0) return null;
  const pt = a.reduce((x, y) => x + (y - tb) ** 2, 0) / a.length;
  return Math.sqrt(pt) / tb;
}

/** Khoá tháng "YYYY-MM" cộng n tháng. */
export function congThang(khoa: string, n: number): string {
  const [y, m] = khoa.split('-').map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}

export function duBaoDongTien(
  thang: readonly ThangTien[],
  o: { homNay: string; congNoQuaHan: number; khachTop?: KhachTop | null },
): KetQuaDuBao {
  const khoaNay = o.homNay.slice(0, 7);
  const daKhep = [...thang].filter((t) => t.khoa < khoaNay).sort((a, b) => a.khoa.localeCompare(b.khoa)).slice(-SO_THANG_NHIN_LAI);
  const dangChay = thang.find((t) => t.khoa === khoaNay) ?? null;

  if (daKhep.length < SO_THANG_TOI_THIEU) {
    return {
      du_du_lieu: false,
      ly_do_thieu: `Mới có ${daKhep.length} tháng sao kê đã khép sổ; cần ít nhất ${SO_THANG_TOI_THIEU} tháng để dự báo mà không phải đoán.`,
      so_thang_da_khep: daKhep.length, trung_vi: null, he_so_bien_dong_vao: null, kich_ban: [], canh_bao: [],
    };
  }

  const vao = daKhep.map((t) => t.vao);
  const ra = daKhep.map((t) => t.ra);
  const tvVao = trungVi(vao);
  const tvRa = trungVi(ra);
  const kichBan = (ten: TenKichBan, v: number, r: number): KichBan => {
    const ds: ThangDuBao[] = Array.from({ length: SO_THANG_DU_BAO }, (_, i) => ({ khoa: congThang(khoaNay, i + 1), vao: Math.round(v), ra: Math.round(r), rong: Math.round(v - r) }));
    return { ten, thang: ds, tong_rong: ds.reduce((s, x) => s + x.rong, 0) };
  };
  const kb = [
    kichBan('tot', phanVi(vao, 0.75), phanVi(ra, 0.25)),
    kichBan('co_so', tvVao, tvRa),
    kichBan('xau', phanVi(vao, 0.25), phanVi(ra, 0.75)),
  ];

  const canh: CanhBaoDongTien[] = [];
  const rong = daKhep.map((t) => t.vao - t.ra);
  const bagGanNhat = rong.slice(-3);
  if (bagGanNhat.filter((x) => x < 0).length >= 2) {
    canh.push({ ma: 'rong_am_lien_tiep', muc_do: 'cao', cau: `${bagGanNhat.filter((x) => x < 0).length}/${bagGanNhat.length} tháng gần nhất tiền ra nhiều hơn tiền vào (chênh lệch ròng ${bagGanNhat.map(vnd).join(', ')}).` });
  }
  const xau = kb[2];
  if (xau.tong_rong < 0) {
    canh.push({ ma: 'kich_ban_xau_thieu_hut', muc_do: kb[1].tong_rong < 0 ? 'cao' : 'vua', cau: `Nếu ba tháng tới giống tháng yếu nhất vừa qua, dòng tiền ròng cộng dồn là ${vnd(xau.tong_rong)}. Kịch bản cơ sở: ${vnd(kb[1].tong_rong)}.` });
  }
  if (tvVao > 0 && o.congNoQuaHan >= NGUONG.cong_no_qua_han_tren_doanh_thu_thang * tvVao) {
    canh.push({ ma: 'cong_no_qua_han_lon', muc_do: 'vua', cau: `Công nợ phải thu quá hạn ${vnd(o.congNoQuaHan)}, bằng ${Math.round((o.congNoQuaHan / tvVao) * 100)}% tiền vào một tháng điển hình. Thu được khoản này là cách rẻ nhất để lấp thiếu hụt.` });
  }
  if (o.khachTop && o.khachTop.so_khoan >= 3 && o.khachTop.ty_le >= NGUONG.khach_chiem_tren) {
    canh.push({ ma: 'tap_trung_khach', muc_do: 'vua', cau: `${o.khachTop.ten} chiếm ${Math.round(o.khachTop.ty_le * 100)}% tiền vào kinh doanh (${o.khachTop.so_khoan} khoản). Mất khách này thì dòng tiền đổi hẳn.` });
  }
  const cv = heSoBienDong(vao);
  if (cv !== null && cv >= NGUONG.he_so_bien_dong) {
    canh.push({ ma: 'doanh_thu_bien_dong', muc_do: 'vua', cau: `Tiền vào các tháng chênh nhau nhiều (hệ số biến động ${cv.toFixed(2)}), nên dự báo có khoảng rộng — đừng dựa vào một con số.` });
  }
  if (dangChay) {
    const ngay = Number(o.homNay.slice(8, 10));
    const [y, m] = khoaNay.split('-').map(Number);
    const soNgay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const phan = ngay / soNgay;
    if (phan >= NGUONG.phan_thang_toi_thieu && tvRa > 0) {
      const uocCaThang = dangChay.ra / phan;
      if (uocCaThang >= NGUONG.chi_vuot_trung_vi * tvRa) {
        canh.push({ ma: 'chi_vuot_thuong_le', muc_do: 'vua', cau: `Tháng này đã chi ${vnd(dangChay.ra)} sau ${ngay}/${soNgay} ngày; giữ nhịp này cả tháng sẽ khoảng ${vnd(uocCaThang)}, cao hơn trung vị ${vnd(tvRa)}.` });
      }
    }
  }

  return {
    du_du_lieu: true, ly_do_thieu: null, so_thang_da_khep: daKhep.length,
    trung_vi: { vao: Math.round(tvVao), ra: Math.round(tvRa), rong: Math.round(tvVao - tvRa) },
    he_so_bien_dong_vao: cv, kich_ban: kb, canh_bao: canh,
  };
}
