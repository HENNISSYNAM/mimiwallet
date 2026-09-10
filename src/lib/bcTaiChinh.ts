/**
 * Gộp giao dịch và hoá đơn thành số liệu cho trang Báo cáo.
 *
 * VÌ SAO PHẢI VIẾT. Tới 10/09/2026 trang Báo cáo vẫn vẽ ba biểu đồ từ
 * `src/lib/mockData.ts` — doanh thu 12 tỷ, lợi nhuận âm 2,7 tỷ, tuổi hoá đơn,
 * phân bổ chi phí — tất cả đều là số bịa, hiện cho mọi người dùng như số của
 * chính họ. Nút **Export** còn xuất đúng những số đó ra CSV, nên chúng có thể
 * đi ra khỏi ứng dụng và vào một tờ khai.
 *
 * Cùng lỗi với trang Cài đặt đã sửa hôm qua, nhưng nặng hơn: Cài đặt hiện sai
 * tên công ty, còn Báo cáo hiện sai tiền.
 *
 * HÀM THUẦN VÀ CÓ TEST, vì đây là số người dùng sẽ mang đi quyết định.
 *
 * HAI QUY TẮC:
 *
 *  1. Không có dữ liệu thì trả mảng rỗng, KHÔNG trả số 0 cho mọi tháng. Một
 *     biểu đồ toàn số 0 trông như "làm ăn không ra gì", còn mảng rỗng để giao
 *     diện nói được "chưa có dữ liệu".
 *  2. Chỉ đếm giao dịch thật. Người gọi lọc `is_synthetic` trước khi truyền
 *     vào — và có test cho việc một dòng thử lọt vào sẽ làm sai con số.
 */

export interface GiaoDich {
  amount: number;
  type: string;
  transaction_date: string;
  category: string | null;
}

export interface HoaDon {
  total: number | null;
  amount: number | null;
  status: string;
  due_date: string | null;
}

export interface ThangTaiChinh {
  /** Nhãn hiển thị, ví dụ "T09". */
  thang: string;
  /** Khoá sắp xếp, dạng YYYY-MM. */
  khoa: string;
  doanhThu: number;
  chiPhi: number;
  loiNhuan: number;
}

export interface NhomTuoi {
  nhan: string;
  tien: number;
  soHoaDon: number;
}

export interface NhomChiPhi {
  ten: string;
  tien: number;
}

/** Ngưỡng chia nhóm tuổi hoá đơn, tính theo ngày quá hạn. */
export const MOC_TUOI = [30, 60, 90] as const;

/**
 * Doanh thu và chi phí theo tháng.
 *
 * Chỉ trả về những tháng CÓ giao dịch. Đắp thêm tháng rỗng cho biểu đồ đẹp là
 * vẽ ra những tháng doanh thu bằng 0 chưa từng xảy ra.
 */
export function theoThang(gd: GiaoDich[]): ThangTaiChinh[] {
  const gom = new Map<string, { thu: number; chi: number }>();

  for (const t of gd) {
    const khoa = String(t.transaction_date).slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(khoa)) continue;
    const o = gom.get(khoa) ?? { thu: 0, chi: 0 };
    const tien = Math.abs(Number(t.amount));
    if (!Number.isFinite(tien)) continue;
    if (t.type === 'income' || Number(t.amount) > 0) o.thu += tien;
    else o.chi += tien;
    gom.set(khoa, o);
  }

  return [...gom.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([khoa, o]) => ({
      khoa,
      thang: `T${khoa.slice(5)}`,
      doanhThu: o.thu,
      chiPhi: o.chi,
      loiNhuan: o.thu - o.chi,
    }));
}

/**
 * Tuổi hoá đơn chưa thu, tính từ hạn thanh toán.
 *
 * CHỈ TÍNH HOÁ ĐƠN CHƯA THU. Hoá đơn đã thu không còn là khoản phải đòi, nên
 * gộp vào sẽ thổi phồng số tiền đang bị nợ.
 *
 * Hoá đơn không có hạn thì không xếp nhóm được — bỏ ra và đếm riêng, chứ không
 * dồn vào nhóm gần nhất.
 */
export function tuoiHoaDon(hd: HoaDon[], luc: Date = new Date()): NhomTuoi[] {
  const nhom: NhomTuoi[] = [
    { nhan: '0–30 ngày', tien: 0, soHoaDon: 0 },
    { nhan: '31–60 ngày', tien: 0, soHoaDon: 0 },
    { nhan: '61–90 ngày', tien: 0, soHoaDon: 0 },
    { nhan: 'Trên 90 ngày', tien: 0, soHoaDon: 0 },
  ];

  const homNay = new Date(luc.getFullYear(), luc.getMonth(), luc.getDate()).getTime();
  let coDuLieu = false;

  for (const h of hd) {
    if (h.status === 'paid' || !h.due_date) continue;
    const tien = Number(h.total ?? h.amount ?? 0);
    if (!Number.isFinite(tien) || tien <= 0) continue;

    const d = new Date(h.due_date);
    const han = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const quaHan = Math.max(0, Math.round((homNay - han) / 86_400_000));

    const i = quaHan <= MOC_TUOI[0] ? 0 : quaHan <= MOC_TUOI[1] ? 1 : quaHan <= MOC_TUOI[2] ? 2 : 3;
    nhom[i].tien += tien;
    nhom[i].soHoaDon += 1;
    coDuLieu = true;
  }

  return coDuLieu ? nhom : [];
}

/**
 * Phân bổ chi phí theo nhóm.
 *
 * Giao dịch chưa phân loại gom vào "Chưa phân loại" thay vì bỏ đi — bỏ đi thì
 * tổng của biểu đồ nhỏ hơn tổng chi phí thật, và không ai biết vì sao.
 */
export function phanBoChiPhi(gd: GiaoDich[]): NhomChiPhi[] {
  const gom = new Map<string, number>();

  for (const t of gd) {
    if (t.type !== 'expense' && Number(t.amount) >= 0) continue;
    const tien = Math.abs(Number(t.amount));
    if (!Number.isFinite(tien) || tien <= 0) continue;
    const ten = t.category?.trim() || 'Chưa phân loại';
    gom.set(ten, (gom.get(ten) ?? 0) + tien);
  }

  return [...gom.entries()]
    .map(([ten, tien]) => ({ ten, tien }))
    .sort((a, b) => b.tien - a.tien);
}
