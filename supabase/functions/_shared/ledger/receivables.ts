/**
 * Đối soát tiền khách trả với hoá đơn bán hàng — công nợ phải thu.
 *
 * ĐÂY LÀ ỨNG DỤNG THỨ BA CỦA CÙNG MỘT PHÉP TOÁN, và ghi lại điều đó ở đây vì nó
 * là lõi của sản phẩm chứ không phải trùng lặp tình cờ:
 *
 *   tiền RA  ↔ chứng từ chi phí      → khấu trừ thuế        (sổ chi phí)
 *   tiền VÀO ↔ hoá đơn bán hàng      → công nợ phải thu     (file này)
 *   tiền VÀO ↔ hoá đơn thuê bao      → thu phí MIMI         (billing/subscription.ts)
 *   tiền VÀO ↔ mã QR đã phát         → xác nhận thanh toán  (ledger/reconcile-qr.ts)
 *
 * Bốn nghiệp vụ, một động cơ: lấy một dòng trong sao kê, tìm chứng từ tương ứng,
 * ghi lại mối liên hệ sao cho truy vết được. Mở rộng sang tệp khách hàng mới
 * không phải xây tính năng mới — chỉ là một cặp ghép khác trên cùng động cơ.
 *
 * KHÁC BIỆT SO VỚI HAI BẢN KIA, và vì sao không dùng lại nguyên si:
 *
 * Thuê bao là quan hệ 1–1 nghiêm ngặt: một lần chuyển tiền trả đúng một kỳ, sai
 * số tiền là không tính. B2B thì không như vậy. Thực tế công nợ ở Việt Nam:
 *
 *   - Khách gộp nhiều hoá đơn vào một lần chuyển  (1 giao dịch → n hoá đơn)
 *   - Khách trả làm nhiều đợt cho một hoá đơn     (n giao dịch → 1 hoá đơn)
 *   - Nội dung chuyển khoản do kế toán bên kia gõ, mỗi người một kiểu
 *
 * Nên ở đây **trả một phần là hợp lệ**, và số dư còn lại được theo dõi tiếp —
 * ngược hẳn với quy tắc của thuê bao. Đó là lý do hai hàm tách riêng thay vì ép
 * chung một trừu tượng khi mới có hai ví dụ.
 */

export interface Receivable {
  id: string;
  /** Số hoá đơn, thứ kế toán bên mua hay gõ vào nội dung chuyển khoản. */
  invoice_number: string;
  /** Tên khách, dùng làm căn cứ phụ khi nội dung không có số hoá đơn. */
  client_name: string;
  /** Tổng phải thu. */
  total: number;
  /** Đã thu được bao nhiêu từ các lần trước. */
  paid: number;
}

export interface IncomingPayment {
  id: string;
  /** Dương là tiền vào. Tiền ra không thanh toán công nợ của ai. */
  amount: number;
  description: string | null;
  /** Ngày giao dịch, dùng để ưu tiên hoá đơn cũ trước khi khớp theo tên. */
  date: string;
}

export type MatchBasis = 'invoice_number' | 'client_name';

export interface ReceivableMatch {
  receivable_id: string;
  payment_id: string;
  /** Số tiền phân bổ cho hoá đơn này từ lần chuyển tiền đó. */
  applied: number;
  /** Còn nợ lại bao nhiêu sau khi phân bổ. 0 là đã tất toán. */
  remaining: number;
  basis: MatchBasis;
}

export interface ReceivableResult {
  matched: ReceivableMatch[];
  /** Tiền vào không nhận ra được thuộc hoá đơn nào — để người xử lý. */
  unmatched: string[];
  /**
   * Tiền vào nhiều hơn tổng nợ. Không tự ghi nhận.
   *
   * `receivable_id` có giá trị khi nội dung chuyển khoản nêu đích danh một hoá
   * đơn **đã tất toán** — trường hợp đó gần như luôn là trả trùng, và nói rõ
   * "trả lại HD001 vốn đã thu đủ" hữu ích hơn nhiều so với xếp chung vào nhóm
   * không nhận diện được.
   */
  overpaid: { payment_id: string; excess: number; receivable_id?: string }[];
}

/**
 * Chuẩn hoá nội dung trước khi so khớp.
 *
 * Nội dung chuyển khoản đi qua ngân hàng bị bỏ dấu, viết hoa, và chèn thêm chữ
 * của chính ngân hàng. Bỏ hết ký tự không phải chữ-số để "HD 001/2026" và
 * "HD0012026" thành một chuỗi.
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
 * Ghép tiền khách trả với công nợ đang mở.
 *
 * Thứ tự ưu tiên căn cứ, và lý do:
 *
 * 1. **Số hoá đơn** — chắc chắn nhất. Kế toán bên mua gõ đúng số thì không còn
 *    gì phải đoán.
 * 2. **Tên khách hàng** — dùng khi nội dung không có số hoá đơn, trường hợp rất
 *    phổ biến. Khi đó phân bổ vào **hoá đơn cũ nhất trước**, đúng thông lệ kế
 *    toán: nợ cũ tất toán trước nợ mới.
 *
 * Trả thừa **không** tự ghi nhận. Ở thuê bao trả thừa là dấu hiệu gõ nhầm; ở
 * công nợ nó có thể là ứng trước cho đơn sau, hoặc trả cho một hoá đơn chưa nhập
 * vào hệ thống. Cả hai đều là quyết định của con người, không phải của máy.
 */
export function doiSoatCongNo(
  receivables: Receivable[],
  payments: IncomingPayment[],
): ReceivableResult {
  const matched: ReceivableMatch[] = [];
  const unmatched: string[] = [];
  const overpaid: ReceivableResult['overpaid'] = [];

  // Bản sao số dư, để nhiều lần trả cùng cộng dồn đúng trong một lượt chạy.
  const conNo = new Map(receivables.map((r) => [r.id, Math.max(0, r.total - r.paid)]));

  for (const p of payments) {
    if (p.amount <= 0) continue;

    const noiDung = chuanHoa(p.description ?? '');
    if (!noiDung) {
      unmatched.push(p.id);
      continue;
    }

    // Căn cứ 1: số hoá đơn nằm trong nội dung.
    const theoSo = receivables.filter(
      (r) => (conNo.get(r.id) ?? 0) > 0 && noiDung.includes(chuanHoa(r.invoice_number)),
    );

    // Căn cứ 2: tên khách, và chỉ khi không tìm thấy theo số hoá đơn.
    const ungVien = theoSo.length
      ? theoSo
      : receivables
          .filter(
            (r) =>
              (conNo.get(r.id) ?? 0) > 0 &&
              chuanHoa(r.client_name).length >= 4 &&
              noiDung.includes(chuanHoa(r.client_name)),
          )
          // Nợ cũ tất toán trước nợ mới.
          .sort((a, b) => a.invoice_number.localeCompare(b.invoice_number));

    if (!ungVien.length) {
      /*
       * Trước khi bỏ vào nhóm không nhận diện được, kiểm xem nội dung có nêu
       * đích danh một hoá đơn đã tất toán không. Có thì đó là tín hiệu cụ thể
       * (nhiều khả năng trả trùng), không phải khoản tiền vô danh.
       */
      const daTatToan = receivables.find(
        (r) => (conNo.get(r.id) ?? 0) <= 0 && noiDung.includes(chuanHoa(r.invoice_number)),
      );
      if (daTatToan) overpaid.push({ payment_id: p.id, excess: p.amount, receivable_id: daTatToan.id });
      else unmatched.push(p.id);
      continue;
    }

    const basis: MatchBasis = theoSo.length ? 'invoice_number' : 'client_name';
    let conLai = p.amount;

    for (const r of ungVien) {
      if (conLai <= 0) break;
      const no = conNo.get(r.id) ?? 0;
      if (no <= 0) continue;

      // Trả một phần là hợp lệ ở công nợ B2B — khác hẳn quy tắc của thuê bao.
      const phanBo = Math.min(no, conLai);
      conNo.set(r.id, no - phanBo);
      conLai -= phanBo;

      matched.push({
        receivable_id: r.id,
        payment_id: p.id,
        applied: phanBo,
        remaining: no - phanBo,
        basis,
      });
    }

    if (conLai > 0) overpaid.push({ payment_id: p.id, excess: conLai });
  }

  return { matched, unmatched, overpaid };
}

/** Tổng còn phải thu sau khi đã đối soát. */
export function tongConPhaiThu(receivables: Receivable[]): number {
  return receivables.reduce((s, r) => s + Math.max(0, r.total - r.paid), 0);
}
