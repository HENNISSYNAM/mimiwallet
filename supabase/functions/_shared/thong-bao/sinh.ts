/**
 * Bộ lọc ngầm: từ dữ liệu của một công ty, sinh những thông báo đáng gửi.
 *
 * Hàm thuần — edge function `thong-bao` đọc dữ liệu, gọi các hàm ở đây, rồi ghi và đẩy. Mỗi bản
 * nháp có một `khoa` cố định: cron chạy mỗi giờ, và cùng một khoá thì không bao giờ báo hai lần
 * (ràng buộc duy nhất ở bảng `thong_bao`).
 *
 * NGUYÊN TẮC: chỉ báo điều người dùng làm được gì đó, và nói luôn việc đó. Không báo cho có.
 */
import { goiYTienVao, TEN_LOAI_TIEN_VAO, type KhoanTienVao, type LoaiTienVao } from '../phan-loai/tien-vao.ts';
import { TU_GOI_Y } from '../doanh-thu/phan-loai.ts';
import { cacKyKeTiep } from '../thue/han-ke-khai.ts';

export type LoaiThongBao = 'han_thue' | 'luat_moi' | 'tien_vao' | 'goi' | 'thanh_toan' | 'khac';
export const LOAI_THONG_BAO: LoaiThongBao[] = ['han_thue', 'luat_moi', 'tien_vao', 'goi', 'thanh_toan', 'khac'];

export const TEN_LOAI_THONG_BAO: Record<LoaiThongBao, string> = {
  han_thue: 'Hạn khai thuế',
  luat_moi: 'Văn bản luật mới',
  tien_vao: 'Tiền vào cần xác nhận',
  goi: 'Gói sắp hết hạn',
  thanh_toan: 'Thanh toán đã nhận',
  khac: 'Khác',
};

export interface HanhDongThongBao {
  nhan: string;
  /** Hành động của edge function `to-khai` mà nút này gọi, kèm tham số. */
  goi: 'xac_nhan_tien_vao';
  tham_so: Record<string, unknown>;
  chinh?: boolean;
}

export interface BanNhapThongBao {
  khoa: string;
  loai: LoaiThongBao;
  muc_do: 'thong_tin' | 'can_chu_y' | 'gap';
  tieu_de: string;
  noi_dung: string;
  duong_dan: string | null;
  hanh_dong: HanhDongThongBao[];
}

const so = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n));
const ngayVN = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

/** Báo trước hạn nộp tờ khai vào đúng các mốc này (số ngày còn lại). */
export const MOC_NHAC_HAN = [14, 7, 3, 1, 0];

/** `lucVN`: giờ Việt Nam (xem `lucGioVietNam`). */
export function thongBaoHanThue(lucVN: Date): BanNhapThongBao[] {
  const ra: BanNhapThongBao[] = [];
  for (const k of cacKyKeTiep(lucVN, 1)) {
    if (!MOC_NHAC_HAN.includes(k.conLai)) continue;
    ra.push({
      khoa: `han:${k.nam}-q${k.quy}:${k.conLai}`,
      loai: 'han_thue',
      muc_do: k.conLai <= 3 ? 'gap' : 'can_chu_y',
      tieu_de: k.conLai === 0 ? `Hôm nay là hạn nộp tờ khai quý ${k.quy}/${k.nam}` : `Còn ${k.conLai} ngày tới hạn nộp tờ khai quý ${k.quy}/${k.nam}`,
      noi_dung: `Hạn nộp ${ngayVN(k.han)}. MIMI đã soạn sẵn bản nháp từ sao kê và hoá đơn — mở ra kiểm lại rồi nộp trên Cổng dịch vụ công.`,
      duong_dan: '/dashboard/to-khai',
      hanh_dong: [],
    });
  }
  return ra;
}

export interface VanBanMoi {
  ma_cong_bao: string;
  so_hieu: string | null;
  ten: string;
  ngay_hieu_luc: string | null;
}

export function thongBaoLuatMoi(vanBan: VanBanMoi[]): BanNhapThongBao[] {
  return vanBan.map((v) => ({
    khoa: `luat:${v.ma_cong_bao}`,
    loai: 'luat_moi' as const,
    muc_do: 'thong_tin' as const,
    tieu_de: `Văn bản mới: ${v.so_hieu ?? v.ten}`.slice(0, 200),
    noi_dung: `${v.ten}${v.ngay_hieu_luc ? ` — hiệu lực từ ${v.ngay_hieu_luc.split('-').reverse().join('/')}` : ''}. MIMI đã đưa vào kho và áp dụng khi trả lời, soạn tờ khai.`.slice(0, 1000),
    duong_dan: '/dashboard/nhac-thue',
    hanh_dong: [],
  }));
}

export interface TienVaoGanDay extends KhoanTienVao {
  id: string;
  amount: number;
  transaction_date: string;
}

/**
 * Bộ lọc tiền vào — lớp chạy ngầm thay cho một trang riêng. Khoản nào nội dung chuyển khoản giống
 * tiền vay, tiền người nhà, góp vốn… mà người dùng chưa quyết thì báo, kèm hai nút một chạm.
 * Không tự trừ: trừ nhầm một khoản bán hàng là khai thiếu doanh thu.
 */
export function thongBaoTienVao(ds: TienVaoGanDay[], daQuyet: Set<string>): BanNhapThongBao[] {
  const ra: BanNhapThongBao[] = [];
  for (const t of ds) {
    if (daQuyet.has(t.id)) continue;
    const g = goiYTienVao(t);
    if (!g) continue;
    const ten = TEN_LOAI_TIEN_VAO[g.loai as LoaiTienVao].toLowerCase();
    const noiDung = [t.counter_account_name, t.merchant_name].filter(Boolean).join(' — ');
    ra.push({
      khoa: `tien_vao:${t.id}`,
      loai: 'tien_vao',
      muc_do: 'can_chu_y',
      tieu_de: `${so(Math.abs(t.amount))}đ có vẻ là ${ten} — đang được tính vào doanh thu`,
      noi_dung: `Ngày ${t.transaction_date.slice(0, 10).split('-').reverse().join('/')}: “${noiDung}”. ${g.ly_do}`.slice(0, 1000),
      duong_dan: '/dashboard/nhac-thue',
      hanh_dong: [
        { nhan: `Đúng, không tính`, goi: 'xac_nhan_tien_vao', tham_so: { transaction_ids: [t.id], loai: TU_GOI_Y[g.loai as LoaiTienVao] }, chinh: true },
        { nhan: 'Là tiền bán hàng', goi: 'xac_nhan_tien_vao', tham_so: { transaction_ids: [t.id], loai: 'business_revenue' } },
      ],
    });
  }
  return ra;
}

/** Gói còn 3 ngày, và ngày hết hạn. */
export function thongBaoGoi(goi: { plan: string; current_period_end: string } | null, homNay: string): BanNhapThongBao[] {
  if (!goi) return [];
  const con = Math.round((Date.parse(goi.current_period_end) - Date.parse(homNay)) / 86_400_000);
  if (con !== 3 && con !== 0) return [];
  return [{
    khoa: `goi:${goi.current_period_end}:${con}`,
    loai: 'goi',
    muc_do: con === 0 ? 'gap' : 'can_chu_y',
    tieu_de: con === 0 ? 'Gói của bạn hết hạn hôm nay' : 'Gói của bạn còn 3 ngày',
    noi_dung: `Hết hạn ${goi.current_period_end.split('-').reverse().join('/')}. Gia hạn bằng chuyển khoản trong Cài đặt — tiền về là gói tự chạy tiếp, cộng dồn từ ngày hết hạn cũ.`,
    duong_dan: '/dashboard/settings',
    hanh_dong: [],
  }];
}

/** Tiền trả cho MIMI đã về — gọi từ đối soát thu phí. */
export function thongBaoThanhToan(hoaDon: { id: string; amount: number; so_luot: number | null; plan: string }): BanNhapThongBao {
  return {
    khoa: `thanh_toan:${hoaDon.id}`,
    loai: 'thanh_toan',
    muc_do: 'thong_tin',
    tieu_de: hoaDon.so_luot ? `Đã nhận ${so(hoaDon.amount)}đ — cộng ${hoaDon.so_luot} lượt xuất tờ khai` : `Đã nhận ${so(hoaDon.amount)}đ — gói đã kích hoạt`,
    noi_dung: 'MIMI đã đối chiếu khoản chuyển khoản với mã thanh toán của bạn.',
    duong_dan: hoaDon.so_luot ? '/dashboard/to-khai' : '/dashboard/settings',
    hanh_dong: [],
  };
}

/** Giờ yên lặng: 21:00–07:00 giờ Việt Nam vẫn lưu thông báo, nhưng đợi sáng mới đẩy lên điện thoại. */
export function trongGioYenLang(lucVN: Date): boolean {
  const h = lucVN.getHours();
  return h >= 21 || h < 7;
}
