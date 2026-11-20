/**
 * QUẦY TIN — Agent Soát Bill: lời dặn mô hình thị giác và chuẩn hoá thứ mô hình trả về.
 *
 * Mô hình có thể trả JSON hỏng, bọc trong ```json, thiếu trường, số tiền dạng "150.000 VND", giờ không múi.
 * Mọi thứ không đúng kiểu → null. Không bao giờ ném lỗi: lỗi đọc = `la_bill: false` → loa nói "không đọc được".
 */
import type { BillDoc } from './doi-chieu.ts';
import { docMaThamChieu } from '../bank/ma-tham-chieu.ts';

export const LOI_DAN_DOC_BILL = `Bạn đọc ảnh chụp màn hình/biên lai CHUYỂN KHOẢN ngân hàng hoặc ví ở Việt Nam.
Chỉ trả về MỘT đối tượng JSON, không giải thích, theo đúng khuôn:
{"la_bill": boolean, "so_tien": number|null, "tk_nhan_cuoi": string|null, "ten_nhan": string|null,
 "ngan_hang_gui": string|null, "thoi_diem": string|null, "noi_dung": string|null, "tin_cay": number}
Quy tắc:
- la_bill=false nếu ảnh không phải xác nhận chuyển tiền đã thành công.
- so_tien: số nguyên đồng, bỏ dấu chấm/phẩy và chữ VND. "150.000 VND" → 150000.
- tk_nhan_cuoi: 4 chữ số cuối của tài khoản NHẬN tiền (không phải tài khoản gửi). Không thấy → null.
- thoi_diem: giờ trên bill theo giờ Việt Nam, dạng "YYYY-MM-DDTHH:mm:ss+07:00". Không thấy → null.
- noi_dung: nguyên văn nội dung/lời nhắn chuyển khoản.
- tin_cay: 0..1, mức chắc chắn của bạn về so_tien và tk_nhan_cuoi.
- KHÔNG đoán. Không đọc rõ trường nào thì để null.
- Không đánh giá thật/giả. Chỉ đọc.`;

const KHONG_DOC: BillDoc = {
  la_bill: false, so_tien: null, tk_nhan_cuoi: null, ten_nhan: null, ngan_hang_gui: null,
  thoi_diem: null, noi_dung: null, ma_mimi: null, tin_cay: 0,
};

const chuoi = (v: unknown, toiDa = 200): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, toiDa) : null;

/** "150.000 VND", "150,000đ", 150000 → 150000. Số lẻ / âm / quá 10 tỷ → null. */
export function chuanSoTien(v: unknown): number | null {
  let n: number;
  if (typeof v === 'number') n = v;
  else if (typeof v === 'string') {
    const s = v.replace(/\s|vnd|vnđ|đ|d$/gi, '').replace(/[.,](?=\d{3}(\D|$))/g, '');
    if (!/^\d{1,13}$/.test(s)) return null;
    n = Number(s);
  } else return null;
  if (!Number.isSafeInteger(n) || n <= 0 || n > 10_000_000_000) return null;
  return n;
}

/** Giờ trên bill → ISO. Không có múi giờ thì hiểu là giờ Việt Nam. */
export function chuanThoiDiem(v: unknown): string | null {
  const s = chuoi(v, 40);
  if (!s) return null;
  const coMui = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);
  const t = Date.parse(coMui ? s : `${s.replace(' ', 'T')}+07:00`);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/** Lấy đối tượng JSON đầu tiên trong câu trả lời (chịu được ```json … ``` và chữ thừa). */
function layJson(van: string): Record<string, unknown> | null {
  const dau = van.indexOf('{');
  const cuoi = van.lastIndexOf('}');
  if (dau < 0 || cuoi <= dau) return null;
  try {
    const o = JSON.parse(van.slice(dau, cuoi + 1));
    return o && typeof o === 'object' && !Array.isArray(o) ? o as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function chuanHoaBill(van: string | null | undefined): BillDoc {
  const o = layJson(van ?? '');
  if (!o) return { ...KHONG_DOC };
  const tk = chuoi(o.tk_nhan_cuoi, 40)?.replace(/\D/g, '').slice(-4) ?? null;
  const noiDung = chuoi(o.noi_dung, 300);
  const tc = typeof o.tin_cay === 'number' && Number.isFinite(o.tin_cay) ? Math.min(1, Math.max(0, o.tin_cay)) : 0;
  return {
    la_bill: o.la_bill === true,
    so_tien: chuanSoTien(o.so_tien),
    tk_nhan_cuoi: tk && tk.length === 4 ? tk : null,
    ten_nhan: chuoi(o.ten_nhan, 120),
    ngan_hang_gui: chuoi(o.ngan_hang_gui, 80),
    thoi_diem: chuanThoiDiem(o.thoi_diem),
    noi_dung: noiDung,
    ma_mimi: docMaThamChieu(noiDung),
    tin_cay: tc,
  };
}
