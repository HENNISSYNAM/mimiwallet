/**
 * QUẦY TIN — Agent Đối Chiếu. Luật thuần, không đọc CSDL, không gọi mô hình.
 *
 * Vào: bill AI đã đọc (chỉ là GỢI Ý), tài khoản của quán, tiền vào thật từ ngân hàng.
 * Ra: một đèn và một câu loa.
 *
 * N1 — ẢNH KHÔNG BAO GIỜ LÀM ĐÈN XANH. Xanh chỉ khi có một dòng TIỀN VÀO thật trong `transactions`.
 *      Bill đẹp đến đâu mà không có tiền về thì vẫn đỏ; bill mờ mà tiền đã về thì vẫn xanh.
 * R2.6 — Một giao dịch thật chỉ làm xanh MỘT ca soát (`daDung`): chụp lại cùng một bill thật để lấy hàng
 *      lần hai thì lần hai đỏ.
 */
import { cauNoi, type Den, type LyDo } from './cau-noi.ts';
import { maCuaGiaoDich } from '../pos/ban-hang.ts';

export interface BillDoc {
  la_bill: boolean;
  so_tien: number | null;
  /** 4 số cuối tài khoản nhận đọc được trên bill. */
  tk_nhan_cuoi: string | null;
  ten_nhan: string | null;
  ngan_hang_gui: string | null;
  /** ISO. Giờ trên bill — do người đưa bill kiểm soát, nên chỉ dùng để khoanh vùng tìm, không để tin. */
  thoi_diem: string | null;
  noi_dung: string | null;
  /** Mã đơn MIMIxxxxxx nếu đọc thấy trong nội dung. */
  ma_mimi: string | null;
  tin_cay: number;
}

export interface TaiKhoanQuan { account_number: string; bank_name: string | null }

export interface TienVao {
  id: string;
  amount: number | string;
  type: string | null;
  /**
   * Lúc MIMI nhận khoản tiền (`transactions.created_at`). Bảng chỉ lưu NGÀY ngân hàng ghi (`transaction_date` kiểu
   * DATE), không có giờ — với tiền về qua webhook, lúc nhận là mốc gần nhất với lúc tiền vào tài khoản.
   */
  luc: string;
  payment_reference: string | null;
  merchant_name?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
}

export interface KetQuaSoat {
  den: Den;
  ly_do: LyDo;
  cau_noi: string;
  giao_dich_id: string | null;
  so_tien: number | null;
  thuc_te: number | null;
}

/** Ngưỡng tin cậy tối thiểu để coi là đã đọc được bill. */
export const TIN_CAY_TOI_THIEU = 0.6;
/** Tiền về có thể ghi sớm hơn giờ trên bill một chút (đồng hồ máy khách lệch). */
export const SOM_TOI_DA_MS = 5 * 60_000;
/** Tiền về trễ hơn giờ trên bill tối đa ngần này vẫn tính là của bill đó. */
export const TRE_TOI_DA_MS = 30 * 60_000;
/** Cửa sổ chờ mặc định trước khi đổi vàng → đỏ. Chỉnh theo số đo độ trễ webhook thật. */
export const CUA_SO_CHO_MAC_DINH_MS = 10 * 60_000;
/** Bill có giờ cũ hơn ngần này so với lúc soát: không đi tìm tiền cũ nữa. */
export const TUOI_BILL_TOI_DA_MS = 2 * 3_600_000;

const chiSo = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');
const laTienVao = (g: TienVao) => g.type === 'income' || (g.type !== 'expense' && Number(g.amount) > 0);

/** Bill đủ tin để đối chiếu không. */
export function docDuoc(b: BillDoc | null): b is BillDoc & { so_tien: number } {
  return !!b && b.la_bill && b.tin_cay >= TIN_CAY_TOI_THIEU && typeof b.so_tien === 'number' && b.so_tien > 0;
}

function ketQua(den: Den, ly_do: LyDo, o: { g?: TienVao; so_tien?: number | null; thuc_te?: number | null } = {}): KetQuaSoat {
  const thucTe = o.thuc_te ?? (o.g ? Math.abs(Number(o.g.amount)) : null);
  return {
    den, ly_do, giao_dich_id: o.g?.id ?? null, so_tien: o.so_tien ?? null, thuc_te: thucTe,
    cau_noi: cauNoi(ly_do, { so_tien: o.so_tien ?? null, thuc_te: thucTe, ngan_hang: o.g?.bank_name ?? null, luc: o.g?.luc ?? null }),
  };
}

export interface DauVaoPhanXu {
  bill: BillDoc | null;
  taiKhoanQuan: TaiKhoanQuan[];
  tienVao: TienVao[];
  /** id giao dịch đã làm xanh ca soát khác hoặc đã gắn lần bán POS. */
  daDung: ReadonlySet<string>;
  /** Lúc bắt đầu soát (lần kiểm lại giữ nguyên mốc này). */
  batDau: Date;
  bayGio: Date;
  cuaSoChoMs?: number;
}

export function phanXu(v: DauVaoPhanXu): KetQuaSoat {
  const { bill, taiKhoanQuan, tienVao, daDung, batDau, bayGio } = v;
  const cuaSoCho = v.cuaSoChoMs ?? CUA_SO_CHO_MAC_DINH_MS;

  // 1. Không đọc được → nói thật, không đoán.
  if (!docDuoc(bill)) return ketQua('khong_doc_duoc', 'khong_doc_duoc');
  const soTien = Math.round(bill.so_tien);

  // 2. Tài khoản nhận trên bill không phải của quán.
  const cuoi = chiSo(bill.tk_nhan_cuoi).slice(-4);
  if (cuoi.length === 4 && taiKhoanQuan.length && !taiKhoanQuan.some((t) => chiSo(t.account_number).endsWith(cuoi))) {
    return ketQua('do', 'sai_tai_khoan', { so_tien: soTien });
  }

  const vao = tienVao.filter((g) => laTienVao(g) && !daDung.has(g.id));
  // Nếu cả bill lẫn giao dịch đều có số tài khoản, khác nhau thì không phải tiền của bill này.
  const cungTk = (g: TienVao) => cuoi.length !== 4 || !chiSo(g.account_number) || chiSo(g.account_number).endsWith(cuoi);

  // 3. Có mã đơn MIMI → khớp bằng mã, số tiền để kiểm (cùng luật POS).
  const ma = (bill.ma_mimi ?? '').toUpperCase();
  if (ma) {
    const cungMa = vao.filter((g) => maCuaGiaoDich(g) === ma && cungTk(g));
    const dung = cungMa.find((g) => Math.abs(Number(g.amount)) === soTien);
    if (dung) return ketQua('xanh', 'khop_ma', { g: dung, so_tien: soTien });
    if (cungMa.length) {
      const g = cungMa[0];
      const thuc = Math.abs(Number(g.amount));
      return ketQua('lech', thuc < soTien ? 'thieu_tien' : 'du_tien', { g, so_tien: soTien, thuc_te: thuc });
    }
  }

  // Mốc thời gian: giờ trên bill nếu hợp lý, không thì lúc bắt đầu soát. Giờ ở tương lai → kẹp về lúc soát.
  const tBill = bill.thoi_diem ? Date.parse(bill.thoi_diem) : NaN;
  const moc = Number.isFinite(tBill) ? Math.min(tBill, batDau.getTime()) : batDau.getTime();

  // 4. Tiền vào đúng số, gần mốc nhất.
  const ung = vao
    .filter((g) => Math.abs(Number(g.amount)) === soTien && cungTk(g))
    .map((g) => ({ g, t: Date.parse(g.luc) }))
    .filter((x) => Number.isFinite(x.t) && x.t >= moc - SOM_TOI_DA_MS && x.t <= moc + TRE_TOI_DA_MS && x.t >= bayGio.getTime() - TUOI_BILL_TOI_DA_MS - TRE_TOI_DA_MS)
    .sort((a, b) => Math.abs(a.t - moc) - Math.abs(b.t - moc));
  if (ung.length) return ketQua('xanh', 'khop_so_tien', { g: ung[0].g, so_tien: soTien });

  // Bill cũ: không chờ tiền của hôm qua.
  if (bayGio.getTime() - moc > TUOI_BILL_TOI_DA_MS) return ketQua('do', 'bill_cu', { so_tien: soTien });

  // 5. Còn trong cửa sổ chờ (tính từ lúc bắt đầu soát — người đưa bill không kéo dài được bằng cách sửa giờ).
  if (bayGio.getTime() - batDau.getTime() < cuaSoCho) return ketQua('vang', 'dang_cho', { so_tien: soTien });

  // 6. Hết chờ.
  return ketQua('do', 'chua_thay_tien', { so_tien: soTien });
}
