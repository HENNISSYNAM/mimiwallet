/**
 * Thuế TNCN tổ chức trả lương khấu trừ của người lao động — tính theo từng tháng, từng người.
 *
 * PHẠM VI. Chỉ tính cho cá nhân CƯ TRÚ có hợp đồng lao động từ 03 tháng trở lên: lũy tiến từng phần
 * trên thu nhập tính thuế = thu nhập chịu thuế − bảo hiểm bắt buộc − giảm trừ bản thân − giảm trừ người
 * phụ thuộc. Hai nhóm còn lại (cư trú không có HĐLĐ từ 03 tháng — "vãng lai"; và cá nhân không cư trú)
 * MIMI KHÔNG tự tính: mức/ngưỡng khấu trừ của hai nhóm này chưa có trong kho văn bản MIMI đã đối chiếu,
 * nên người dùng nhập số thuế đã khấu trừ, MIMI chỉ cộng vào tờ khai. Đoán một thuế suất cho đủ ô là
 * điều không được làm ở đây.
 *
 * NGUỒN CỦA CÁC CON SỐ — CHƯA ĐỐI CHIẾU CÔNG BÁO. Biểu thuế 5 bậc (Luật Thuế TNCN số 109/2025/QH15,
 * Điều 9 theo nguồn thứ cấp) và mức giảm trừ gia cảnh 15,5 triệu/6,2 triệu đồng/tháng (Nghị quyết
 * 110/2025/UBTVQH15, áp dụng từ kỳ tính thuế 2026) lấy từ nguồn thứ cấp (trang tin pháp luật, cổng
 * thông tin tỉnh), CHƯA đối chiếu với văn bản đăng Công báo. Kho luật MIMI (CSDL) chưa có hai văn bản
 * này ở dạng đoạn để `kiemCanCu` kiểm. Vì vậy tờ khai dùng các số này luôn mang vướng `CAN_CU_CHUA_DOI_CHIEU`
 * (không chặn, nhưng không bao giờ "sẵn sàng" im lặng) — xem `to-khai-05.ts`.
 *
 * TIỀN LÀ SỐ NGUYÊN ĐỒNG. Không nhân số thực với tiền: thuế suất giữ dạng phần trăm nguyên, cộng tử số
 * (tiền × %) của mọi bậc rồi chia 100 MỘT lần, làm tròn nửa đồng lên. Văn bản trong kho không quy định
 * cách làm tròn số thuế khấu trừ tháng; đây là quy tắc MIMI chọn và ghi ra trong `cach_tinh`.
 *
 * Hàm thuần, test bằng vitest.
 */

/** Một bậc: thu nhập tính thuế THÁNG đến `den` đồng (null = không giới hạn), thuế suất `phan_tram` %. */
export interface BacThue {
  den: number | null;
  phan_tram: number;
}

/** Nguồn thứ cấp, chưa đối chiếu Công báo — xem chú thích đầu tệp. */
export const BIEU_LUY_TIEN_2026: readonly BacThue[] = [
  { den: 10_000_000, phan_tram: 5 },
  { den: 30_000_000, phan_tram: 10 },
  { den: 60_000_000, phan_tram: 20 },
  { den: 100_000_000, phan_tram: 30 },
  { den: null, phan_tram: 35 },
];

/** Nguồn thứ cấp, chưa đối chiếu Công báo — xem chú thích đầu tệp. */
export const GIAM_TRU_BAN_THAN_THANG_2026 = 15_500_000;
export const GIAM_TRU_PHU_THUOC_THANG_2026 = 6_200_000;

/** Kỳ tính thuế đầu tiên áp dụng biểu và mức giảm trừ trên (theo nguồn thứ cấp: từ kỳ tính thuế năm 2026). */
export const NAM_AP_DUNG_BIEU_2026 = 2026;

export type LoaiNguoiLaoDong = 'cu_tru_hdld' | 'cu_tru_khac' | 'khong_cu_tru';

export const TEN_LOAI_NGUOI: Record<LoaiNguoiLaoDong, string> = {
  cu_tru_hdld: 'Cư trú, có hợp đồng lao động từ 03 tháng trở lên',
  cu_tru_khac: 'Cư trú, không có hợp đồng lao động từ 03 tháng trở lên',
  khong_cu_tru: 'Không cư trú',
};

export interface ThangLuong {
  /** Thu nhập chịu thuế trả trong tháng (đồng). */
  thu_nhap_chiu_thue: number;
  /** Bảo hiểm bắt buộc người lao động đóng trong tháng (đồng) — chỉ trừ cho người cư trú có HĐLĐ. */
  bao_hiem_bat_buoc: number;
}

export interface NguoiLaoDong {
  ho_ten: string;
  loai: LoaiNguoiLaoDong;
  so_nguoi_phu_thuoc: number;
  /** Đúng 3 tháng của quý, theo thứ tự. */
  thang: [ThangLuong, ThangLuong, ThangLuong];
  /** Chỉ cho `cu_tru_khac`, `khong_cu_tru`: số thuế đơn vị đã khấu trừ trong quý — người dùng nhập. */
  thue_da_khau_tru_quy: number | null;
}

/** Tiền hợp lệ: số nguyên đồng, không âm, dưới 10 nghìn tỷ (chặn số gõ nhầm, không chặn lương thật). */
const TIEN_TOI_DA = 10_000_000_000_000;
export const SO_NGUOI_TOI_DA = 1000;
const NPT_TOI_DA = 20;

/** Làm tròn tử số (đồng × %) về đồng: chia 100, nửa đồng làm tròn lên. Tử số không âm. */
export function lamTronPhanTram(tuSo: number): number {
  return Math.floor((tuSo + 50) / 100);
}

/** Thuế lũy tiến từng phần của một tháng, trên thu nhập tính thuế tháng (đồng, nguyên, ≥ 0). */
export function thueLuyTienThang(thuNhapTinhThue: number, bieu: readonly BacThue[] = BIEU_LUY_TIEN_2026): number {
  if (!Number.isSafeInteger(thuNhapTinhThue) || thuNhapTinhThue < 0) throw new Error('Thu nhập tính thuế phải là số nguyên đồng, không âm.');
  let tuSo = 0;
  let duoi = 0;
  for (const b of bieu) {
    if (thuNhapTinhThue <= duoi) break;
    const tren = b.den === null ? thuNhapTinhThue : Math.min(thuNhapTinhThue, b.den);
    tuSo += (tren - duoi) * b.phan_tram;
    if (b.den === null) break;
    duoi = b.den;
  }
  return lamTronPhanTram(tuSo);
}

export interface KetQuaThang {
  thu_nhap_chiu_thue: number;
  bao_hiem: number;
  giam_tru_gia_canh: number;
  thu_nhap_tinh_thue: number;
  thue: number;
}

/** Một tháng của một người cư trú có HĐLĐ: giảm trừ rồi lũy tiến. */
export function thueThangCuTru(t: ThangLuong, soNguoiPhuThuoc: number): KetQuaThang {
  const giamTru = GIAM_TRU_BAN_THAN_THANG_2026 + soNguoiPhuThuoc * GIAM_TRU_PHU_THUOC_THANG_2026;
  const tinhThue = Math.max(0, t.thu_nhap_chiu_thue - t.bao_hiem_bat_buoc - giamTru);
  return {
    thu_nhap_chiu_thue: t.thu_nhap_chiu_thue,
    bao_hiem: t.bao_hiem_bat_buoc,
    giam_tru_gia_canh: giamTru,
    thu_nhap_tinh_thue: tinhThue,
    thue: thueLuyTienThang(tinhThue),
  };
}

export interface KetQuaNguoi {
  thu_tu: number;
  ho_ten: string;
  loai: LoaiNguoiLaoDong;
  thu_nhap_chiu_thue_quy: number;
  /** null: MIMI không tính (nhóm không có HĐLĐ từ 03 tháng / không cư trú). */
  thu_nhap_tinh_thue_quy: number | null;
  thue_quy: number;
  /** true: số thuế do MIMI tính; false: người dùng nhập. */
  mimi_tinh: boolean;
  thang: KetQuaThang[] | null;
}

export function tinhNguoi(n: NguoiLaoDong, thuTu: number): KetQuaNguoi {
  const tnct = n.thang.reduce((s, t) => s + t.thu_nhap_chiu_thue, 0);
  if (n.loai === 'cu_tru_hdld') {
    const thang = n.thang.map((t) => thueThangCuTru(t, n.so_nguoi_phu_thuoc));
    return {
      thu_tu: thuTu, ho_ten: n.ho_ten, loai: n.loai, thu_nhap_chiu_thue_quy: tnct,
      thu_nhap_tinh_thue_quy: thang.reduce((s, t) => s + t.thu_nhap_tinh_thue, 0),
      thue_quy: thang.reduce((s, t) => s + t.thue, 0),
      mimi_tinh: true, thang,
    };
  }
  return {
    thu_tu: thuTu, ho_ten: n.ho_ten, loai: n.loai, thu_nhap_chiu_thue_quy: tnct,
    thu_nhap_tinh_thue_quy: null, thue_quy: n.thue_da_khau_tru_quy ?? 0, mimi_tinh: false, thang: null,
  };
}

// ---------------------------------------------------------------------------------------------
// Đọc bảng lương do trình duyệt gửi lên — máy chủ không tin gì, kiểm từng ô.
// ---------------------------------------------------------------------------------------------

const LOAI_HOP_LE: readonly LoaiNguoiLaoDong[] = ['cu_tru_hdld', 'cu_tru_khac', 'khong_cu_tru'];

function docTien(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return 0;
  let n: number;
  if (typeof v === 'number') n = v;
  else {
    // Chỉ nhận dấu chấm làm dấu nghìn đúng nhóm 3 số ("15.500.000"). "1,5" hay "1.5" là số lẻ đồng → từ chối,
    // không đoán người gõ ý gì.
    const s = String(v).replace(/\s/g, '');
    if (!/^\d+$/.test(s) && !/^\d{1,3}(\.\d{3})+$/.test(s)) return null;
    n = Number(s.replace(/\./g, ''));
  }
  if (!Number.isSafeInteger(n) || n < 0 || n > TIEN_TOI_DA) return null;
  return n;
}

export type KetQuaDoc = { ok: true; ds: NguoiLaoDong[] } | { ok: false; cau: string };

/**
 * Kiểm và chuẩn hoá bảng lương. Câu lỗi chỉ nhắc SỐ DÒNG, không nhắc họ tên hay số định danh — câu
 * lỗi có thể đi vào log ở đâu đó.
 */
export function docBangLuong(v: unknown): KetQuaDoc {
  if (!Array.isArray(v)) return { ok: false, cau: 'Bảng lương phải là danh sách người lao động.' };
  if (!v.length) return { ok: false, cau: 'Bảng lương chưa có ai. Thêm ít nhất một người lao động.' };
  if (v.length > SO_NGUOI_TOI_DA) return { ok: false, cau: `Một tờ khai tối đa ${SO_NGUOI_TOI_DA} người trong bảng nhập của MIMI.` };
  const ds: NguoiLaoDong[] = [];
  for (let i = 0; i < v.length; i++) {
    const d = `Dòng ${i + 1}`;
    const o = v[i] as Record<string, unknown> | null;
    if (!o || typeof o !== 'object') return { ok: false, cau: `${d}: không đọc được.` };
    const hoTen = typeof o.ho_ten === 'string' ? o.ho_ten.trim().replace(/\s+/g, ' ') : '';
    if (!hoTen) return { ok: false, cau: `${d}: thiếu họ tên.` };
    if (hoTen.length > 200) return { ok: false, cau: `${d}: họ tên quá dài.` };
    const loai = o.loai as LoaiNguoiLaoDong;
    if (!LOAI_HOP_LE.includes(loai)) return { ok: false, cau: `${d}: chọn cư trú có HĐLĐ từ 03 tháng, cư trú khác, hoặc không cư trú.` };
    const npt = o.so_nguoi_phu_thuoc === undefined || o.so_nguoi_phu_thuoc === null || o.so_nguoi_phu_thuoc === '' ? 0 : Number(o.so_nguoi_phu_thuoc);
    if (!Number.isInteger(npt) || npt < 0 || npt > NPT_TOI_DA) return { ok: false, cau: `${d}: số người phụ thuộc phải là số nguyên từ 0 đến ${NPT_TOI_DA}.` };
    if (!Array.isArray(o.thang) || o.thang.length !== 3) return { ok: false, cau: `${d}: cần số liệu đúng 3 tháng của quý.` };
    const thang: ThangLuong[] = [];
    for (let j = 0; j < 3; j++) {
      const t = (o.thang[j] ?? {}) as Record<string, unknown>;
      const tn = docTien(t.thu_nhap_chiu_thue);
      const bh = docTien(t.bao_hiem_bat_buoc);
      if (tn === null || bh === null) return { ok: false, cau: `${d}, tháng thứ ${j + 1}: số tiền phải là số nguyên đồng, không âm.` };
      if (bh > tn) return { ok: false, cau: `${d}, tháng thứ ${j + 1}: bảo hiểm bắt buộc lớn hơn thu nhập chịu thuế — kiểm lại.` };
      thang.push({ thu_nhap_chiu_thue: tn, bao_hiem_bat_buoc: bh });
    }
    let thueNhap: number | null = null;
    if (loai !== 'cu_tru_hdld') {
      if (o.thue_da_khau_tru_quy === undefined || o.thue_da_khau_tru_quy === null || o.thue_da_khau_tru_quy === '') {
        return { ok: false, cau: `${d}: MIMI không tự tính thuế cho người không có HĐLĐ từ 03 tháng hoặc không cư trú — nhập số thuế đã khấu trừ trong quý (0 nếu không khấu trừ).` };
      }
      thueNhap = docTien(o.thue_da_khau_tru_quy);
      if (thueNhap === null) return { ok: false, cau: `${d}: số thuế đã khấu trừ phải là số nguyên đồng, không âm.` };
      const tnQuy = thang.reduce((s, t) => s + t.thu_nhap_chiu_thue, 0);
      if (thueNhap > tnQuy) return { ok: false, cau: `${d}: số thuế đã khấu trừ lớn hơn thu nhập chịu thuế cả quý — kiểm lại.` };
    }
    ds.push({
      ho_ten: hoTen, loai, so_nguoi_phu_thuoc: loai === 'cu_tru_hdld' ? npt : 0,
      thang: [thang[0], thang[1], thang[2]], thue_da_khau_tru_quy: thueNhap,
    });
  }
  return { ok: true, ds };
}
