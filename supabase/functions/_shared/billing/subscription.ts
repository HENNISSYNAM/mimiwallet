/**
 * Thu tiền thuê bao bằng chuyển khoản ngân hàng, đối soát tự động.
 *
 * Vì sao không dùng cổng thanh toán: đường thanh toán đang có trong repo chạy
 * trên Stripe, mà **Stripe không nhận merchant Việt Nam**. Kể cả lách được bằng
 * pháp nhân nước ngoài thì khách của MIMI — hộ kinh doanh ngoài chợ — cũng không
 * trả bằng thẻ quốc tế. Nghĩa là hôm nay MIMI không có cách nào thu được tiền.
 *
 * Đường đi được ở Việt Nam là thứ ai cũng đã biết dùng: **quét mã, chuyển khoản,
 * ghi nội dung**. Và MIMI đã có sẵn ba mảnh để tự động hoá nó — đọc sao kê ngân
 * hàng, sinh mã VietQR, và một bộ đối soát (`reconcile-qr.ts`). Đây là dùng chính
 * sản phẩm để thu tiền của chính mình.
 *
 * Không cần giấy phép trung gian thanh toán: tiền đi thẳng từ tài khoản khách
 * sang tài khoản MIMI. MIMI không giữ hộ tiền của ai.
 */

/** Tiền tệ là VND, không có phần thập phân. Mọi số ở đây là đồng. */
export interface SubscriptionInvoice {
  id: string;
  company_id: string;
  /** Mã ghi trong nội dung chuyển khoản. Xem `taoMaThamChieu`. */
  reference_code: string;
  amount: number;
  status: 'pending' | 'paid' | 'underpaid' | 'overpaid';
}

/** Một giao dịch tiền vào tài khoản MIMI, đọc từ sao kê. */
export interface IncomingTransfer {
  id: string;
  /** Dương là tiền vào. Tiền ra không bao giờ thanh toán được hoá đơn nào. */
  amount: number;
  description: string | null;
}

export interface InvoiceMatch {
  invoice_id: string;
  transaction_id: string;
  amount: number;
  /** Lệch so với số phải trả. 0 là khớp; âm là thiếu; dương là thừa. */
  delta: number;
}

export interface ReconcileSubsResult {
  matched: InvoiceMatch[];
  /** Trả đúng mã nhưng sai số tiền — không bao giờ tự kích hoạt. */
  mismatched: InvoiceMatch[];
  /** Tiền vào không mang mã nào nhận ra được. */
  unmatched: string[];
}

/**
 * Chuẩn hoá nội dung chuyển khoản trước khi so khớp.
 *
 * Nội dung đi qua ngân hàng bị biến dạng theo những cách không kiểm soát được:
 * bỏ dấu, viết hoa hết, cắt bớt, và **chèn thêm chữ của chính ngân hàng**
 * ("CHUYEN TIEN", tên người gửi, mã giao dịch nội bộ). Nên không thể so bằng
 * dấu bằng — phải tìm mã nằm lẫn trong một chuỗi rác.
 *
 * Bỏ hết ký tự không phải chữ-số để "MIMI-A1B2 C3" và "MIMIA1B2C3" thành một.
 */
export function chuanHoa(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Mã tham chiếu cho một kỳ thuê bao.
 *
 * Ràng buộc quyết định hình dạng: **khách phải gõ tay mã này vào ô nội dung
 * chuyển khoản trên app ngân hàng của họ.** Nên nó phải ngắn, không có ký tự dễ
 * nhìn nhầm, và sai một ký tự thì không được trùng với mã của người khác.
 *
 * Bỏ `O`, `I`, `1`, `0` khỏi bảng chữ vì trên màn hình điện thoại chúng lẫn vào
 * nhau, và một khoản tiền vào sai mã là một khoản không ai đối soát được.
 */
const BANG_CHU = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function taoMaThamChieu(random: () => number = Math.random): string {
  let ma = '';
  for (let i = 0; i < 6; i++) {
    ma += BANG_CHU[Math.floor(random() * BANG_CHU.length)];
  }
  return `MIMI${ma}`;
}

/** Mã có đúng hình dạng do `taoMaThamChieu` sinh ra không. */
export function laMaHopLe(ma: string): boolean {
  return /^MIMI[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(chuanHoa(ma));
}

/**
 * Ghép tiền vào với hoá đơn thuê bao đang chờ.
 *
 * Ba quy tắc, mỗi quy tắc vì một lý do cụ thể:
 *
 * 1. **Chỉ tiền vào.** Số âm là tiền ra; nó không bao giờ thanh toán gì.
 * 2. **Sai số tiền thì không tự kích hoạt.** Trả thiếu 200k so với 249k không
 *    phải là đã trả. Trả thừa cũng vậy — có thể khách gộp hai kỳ, hoặc gõ nhầm,
 *    và đoán hộ họ là cách nhanh nhất để cãi nhau về tiền. Ghi vào `mismatched`
 *    để người xử lý.
 * 3. **Một giao dịch chỉ thanh toán một hoá đơn.** Nếu không, hai kỳ cùng mã sẽ
 *    cùng được đánh dấu đã trả bởi một lần chuyển tiền duy nhất.
 */
export function doiSoatThueBao(
  invoices: SubscriptionInvoice[],
  transfers: IncomingTransfer[],
): ReconcileSubsResult {
  const matched: InvoiceMatch[] = [];
  const mismatched: InvoiceMatch[] = [];
  const unmatched: string[] = [];

  const conCho = invoices.filter((i) => i.status === 'pending');
  const daDung = new Set<string>();

  for (const tx of transfers) {
    if (tx.amount <= 0) continue; // quy tắc 1

    const noiDung = chuanHoa(tx.description ?? '');
    if (!noiDung) {
      unmatched.push(tx.id);
      continue;
    }

    const hoaDon = conCho.find(
      (i) => !daDung.has(i.id) && noiDung.includes(chuanHoa(i.reference_code)),
    );

    if (!hoaDon) {
      unmatched.push(tx.id);
      continue;
    }

    daDung.add(hoaDon.id); // quy tắc 3
    const ket: InvoiceMatch = {
      invoice_id: hoaDon.id,
      transaction_id: tx.id,
      amount: tx.amount,
      delta: tx.amount - hoaDon.amount,
    };

    if (ket.delta === 0) matched.push(ket);
    else mismatched.push(ket); // quy tắc 2
  }

  return { matched, mismatched, unmatched };
}

/**
 * Ngày kết thúc kỳ tiếp theo, tính từ ngày bắt đầu.
 *
 * Cộng theo tháng lịch chứ không phải 30 ngày: khách trả ngày 31/01 thì kỳ sau
 * kết thúc 28/02, không phải 02/03. Cộng 30 ngày sẽ khiến ngày thu tiền trôi dần
 * qua các tháng và không bao giờ khớp với ngày khách nhớ.
 *
 * Ngày 31 rơi vào tháng ngắn thì lùi về ngày cuối tháng đó — cùng cách mọi dịch
 * vụ thuê bao xử lý, và là cách duy nhất không đẻ ra ngày 31/02.
 */
export function ketThucKy(batDau: Date, soThang = 1): Date {
  const ngay = batDau.getUTCDate();
  const d = new Date(Date.UTC(batDau.getUTCFullYear(), batDau.getUTCMonth() + soThang, 1));
  const ngayCuoiThang = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(ngay, ngayCuoiThang));
  return d;
}
