/**
 * Mã tham chiếu của một lần thu tiền: sinh ra, và đọc lại từ nội dung chuyển khoản.
 *
 * VÌ SAO TÁCH RA THÀNH MODULE RIÊNG. Hai đầu của cùng một sợi dây nằm ở hai
 * hàm khác nhau — `bank-link` sinh mã, `sepay-map` đọc mã — và trước hôm nay
 * chúng không biết nhau. Cụ thể: `bank-link` sinh 20 ký tự hex ngẫu nhiên, còn
 * `mapSepayWebhook` **không hề đặt `payment_reference`**. Nghĩa là dù khách gõ
 * đúng mã vào nội dung chuyển khoản, `matchQrPayments` vẫn so `null` với mã đó
 * và không bao giờ khớp.
 *
 * Đây là mắt xích thứ hai bị đứt trên cùng một đường, cạnh mắt xích đã nối
 * ngày 07/09 (không ai gọi `reconcileCompanyQr` sau khi ghi giao dịch SePay).
 * Nối một cái mà không nối cái kia thì vòng vẫn hở, và triệu chứng y hệt: tiền
 * về, hoá đơn không đóng.
 *
 * ĐỊNH DẠNG, VÀ VÌ SAO KHÔNG DÙNG HEX NỮA:
 *
 *   MIMI + 6 ký tự từ bảng 32 chữ
 *
 * `MIMI` là mỏ neo. Nội dung chuyển khoản thật không bao giờ chỉ có mã: ngân
 * hàng chèn thêm tên người gửi, mã giao dịch, chữ "chuyen tien". Không có tiền
 * tố thì không có cách nào biết đoạn nào trong câu là mã. Có nó thì việc đọc
 * lại là một biểu thức chính quy, không phải một phép đoán.
 *
 * Bảng chữ bỏ `0 O 1 I L U` — `U` bỏ vì để tránh sinh ra từ thô tục ngoài ý
 * muốn trong một chuỗi khách phải gõ tay và đọc to. Số còn lại không có cặp nào
 * nhìn giống nhau trên màn hình điện thoại, nên mã đọc qua điện thoại rồi gõ
 * lại vẫn đúng.
 *
 * 10 ký tự cũng vừa với ô nội dung chuyển khoản của mọi app ngân hàng, kể cả
 * ô ngắn nhất từng gặp.
 */

/** Bảng chữ không có ký tự nào dễ nhìn nhầm ký tự khác. */
const BANG_CHU = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Tiền tố cố định, viết hoa. Đổi cái này là mọi mã cũ không đọc lại được. */
export const TIEN_TO = 'MIMI';

/** Số ký tự ngẫu nhiên sau tiền tố. */
export const SO_KY_TU_NGAU_NHIEN = 6;

/**
 * Sinh một mã tham chiếu mới.
 *
 * DÙNG `crypto.getRandomValues`, KHÔNG DÙNG `Math.random`. Mã này là thứ quyết
 * định hoá đơn nào được đánh dấu đã thu. Ai đoán được mã kế tiếp thì tạo được
 * một khoản thu trùng mã với hoá đơn của người khác. `Math.random` đoán được.
 *
 * Lấy dư theo `% BANG_CHU.length` có lệch phân phối, nhưng 256 chia 30 lệch
 * chưa tới 7% — không đủ để thu hẹp không gian tìm kiếm 30^6 xuống mức đáng lo.
 */
export function sinhMaThamChieu(): string {
  const bytes = new Uint8Array(SO_KY_TU_NGAU_NHIEN);
  crypto.getRandomValues(bytes);
  let s = TIEN_TO;
  for (const b of bytes) s += BANG_CHU[b % BANG_CHU.length];
  return s;
}

/** Một chuỗi có đúng dạng mã tham chiếu không. */
export function laMaThamChieu(s: string): boolean {
  return new RegExp(`^${TIEN_TO}[${BANG_CHU}]{${SO_KY_TU_NGAU_NHIEN}}$`).test(s);
}

/**
 * Tìm mã tham chiếu trong nội dung chuyển khoản ngân hàng gửi về.
 *
 * BA THỨ PHẢI CHỊU ĐỰNG, cả ba đều là hành vi thật của ngân hàng Việt Nam:
 *
 *  1. Ngân hàng bọc mã trong câu của họ:
 *     "NGUYEN VAN A chuyen tien MIMIK7P2QX-Ma GD 0123456"
 *  2. Có ngân hàng chèn dấu cách hoặc gạch giữa các cụm, kể cả giữa chừng mã.
 *  3. Khách gõ thường: "mimik7p2qx".
 *
 * Nên: viết hoa, bỏ dấu tiếng Việt, bỏ mọi ký tự không phải chữ-số, rồi mới
 * tìm. Bỏ ký tự phân cách có thể dán hai cụm liền nhau, nhưng mã phải bắt đầu
 * đúng bằng `MIMI` và đủ 6 ký tự sau đó nên xác suất trùng ngẫu nhiên là không
 * đáng kể.
 *
 * TRẢ VỀ `null` KHI CÓ TỪ HAI MÃ KHÁC NHAU TRỞ LÊN. Một nội dung mang hai mã
 * là chuyện không giải thích được, và đoán lấy mã đầu tiên là chọn hộ xem hoá
 * đơn nào được tất toán. Để `null` thì khoản tiền vẫn được ghi nhận, chỉ là
 * không tự khớp — có người nhìn, thay vì máy đoán sai.
 */
export function docMaThamChieu(noiDung: string | null | undefined): string | null {
  if (!noiDung) return null;

  const phang = noiDung
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  const tim = new RegExp(`${TIEN_TO}[${BANG_CHU}]{${SO_KY_TU_NGAU_NHIEN}}`, 'g');
  const thay = new Set(phang.match(tim) ?? []);

  if (thay.size !== 1) return null;
  return [...thay][0];
}
