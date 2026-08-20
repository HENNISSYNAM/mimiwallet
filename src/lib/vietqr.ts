/**
 * Dựng chuỗi VietQR (EMVCo) để vẽ mã QR ngay tại máy khách.
 *
 * VÌ SAO TỰ DỰNG THAY VÌ GỌI img.vietqr.io:
 *
 * Dịch vụ đó chạy thật (đã kiểm ngày 19/08/2026, trả PNG 73KB), và dùng nó thì
 * nhanh hơn. Nhưng nó nghĩa là mỗi lần khách mở màn hình thanh toán, trình duyệt
 * của họ gọi sang máy chủ bên thứ ba kèm số tài khoản, số tiền và mã tham chiếu.
 * Với một sản phẩm tài chính, thêm một bên vào đường đi của thông tin thanh toán
 * là thứ phải có lý do — và ở đây không có lý do nào, vì `qrcode@1.5.4` đã nằm
 * sẵn trong dự án và `QrPayDialog` đã vẽ QR tại chỗ từ trước.
 *
 * Tự dựng còn bỏ được một điểm hỏng: dịch vụ ngoài chết là màn hình thanh toán
 * chết theo.
 *
 * VÌ SAO QR QUAN TRỌNG HƠN VẺ TIỆN LỢI:
 *
 * Cách thu tiền này khớp bằng **mã tham chiếu nằm trong nội dung chuyển khoản**.
 * Bắt khách gõ tay `MIMIABC234` là mời gõ sai — và gõ sai thì `doiSoatThueBao`
 * không khớp, tiền vào mà thuê bao không kích hoạt, rồi có người phải xử lý tay.
 * Mã QR nhét sẵn cả **số tiền lẫn nội dung**, nên đường sai đó biến mất.
 *
 * ĐỊNH DẠNG: EMVCo TLV — mỗi trường là `ID(2) + độ dài(2) + giá trị`, lồng nhau.
 * Trường cuối luôn là CRC, và CRC được tính trên toàn chuỗi ĐÃ GỒM `"6304"`.
 */

/** Một trường TLV: id hai chữ số, độ dài hai chữ số, rồi giá trị. */
function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  if (value.length > 99) throw new Error(`Trường ${id} dài quá 99 ký tự`);
  return `${id}${len}${value}`;
}

/**
 * CRC-16/CCITT-FALSE: đa thức 0x1021, khởi tạo 0xFFFF, không đảo bit, không XOR
 * cuối. Đây là biến thể EMVCo chỉ định — dùng nhầm biến thể khác cho ra bốn ký
 * tự trông rất hợp lệ mà ứng dụng ngân hàng nào cũng từ chối.
 */
export function crc16(s: string): string {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Bỏ dấu tiếng Việt khỏi nội dung chuyển khoản.
 *
 * EMVCo chỉ bảo đảm ASCII. Ứng dụng ngân hàng gặp ký tự có dấu thì mỗi bên xử
 * lý một kiểu — có bên cắt cụt, có bên từ chối cả mã. Mã tham chiếu vốn đã chỉ
 * gồm A–Z và số, nhưng hàm này bảo vệ cho cả trường hợp người gọi truyền vào
 * một câu tiếng Việt.
 */
export function boDau(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export interface VietQrInput {
  /** Mã BIN ngân hàng, 6 số. Techcombank = 970407. */
  bankBin: string;
  accountNumber: string;
  /** Số tiền VND. Bỏ trống thì khách tự nhập — dùng cho mã tĩnh. */
  amount?: number;
  /** Nội dung chuyển khoản, chính là mã tham chiếu. */
  addInfo?: string;
}

/**
 * Dựng chuỗi VietQR hoàn chỉnh.
 *
 * `QRIBFTTA` là mã dịch vụ "chuyển nhanh tới **tài khoản**". Bản còn lại,
 * `QRIBFTTC`, là chuyển tới **thẻ** — dùng nhầm thì ngân hàng đi tìm một số thẻ
 * không tồn tại.
 */
export function taoChuoiVietQr(input: VietQrInput): string {
  const { bankBin, accountNumber, amount, addInfo } = input;

  if (!/^\d{6}$/.test(bankBin)) throw new Error('Mã BIN ngân hàng phải là 6 chữ số');
  if (!/^\d+$/.test(accountNumber)) throw new Error('Số tài khoản chỉ gồm chữ số');
  if (amount !== undefined && (!Number.isInteger(amount) || amount <= 0)) {
    throw new Error('Số tiền phải là số nguyên dương');
  }

  // 38 — Thông tin đơn vị thụ hưởng, lồng ba tầng.
  const beneficiary = tlv('00', bankBin) + tlv('01', accountNumber);
  const merchantAccount =
    tlv('00', 'A000000727') + tlv('01', beneficiary) + tlv('02', 'QRIBFTTA');

  let payload =
    tlv('00', '01') +
    /*
     * "11" = mã dùng lại được, "12" = dùng một lần. Chọn theo có số tiền hay
     * không: mã đã gắn số tiền của một hoá đơn cụ thể thì quét lần hai là trả
     * trùng, nên nó phải là mã một lần.
     */
    tlv('01', amount ? '12' : '11') +
    tlv('38', merchantAccount) +
    tlv('53', '704') + // VND
    (amount ? tlv('54', String(amount)) : '') +
    tlv('58', 'VN');

  if (addInfo) {
    // 62 — Dữ liệu bổ sung; 08 bên trong là nội dung chuyển khoản.
    payload += tlv('62', tlv('08', boDau(addInfo)));
  }

  // CRC tính trên toàn chuỗi đã nối sẵn "6304".
  const withCrcHeader = `${payload}6304`;
  return withCrcHeader + crc16(withCrcHeader);
}
