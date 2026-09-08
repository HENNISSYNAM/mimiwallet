/**
 * Một liên kết ngân hàng đang hỏng thì mời người dùng làm gì.
 *
 * VÌ SAO TÁCH RA KHỎI COMPONENT: quy tắc này quyết định nút nào hiện lên và câu
 * nào được nói. Nói sai ở đây là dẫn người dùng đi bấm một nút không bao giờ
 * chạy — và đó chính là chuyện đã xảy ra ngày 04/09/2026.
 *
 * SỰ VIỆC. Liên kết QR Pay với MBBank VietQR Official rơi vào `needs_relink`.
 * Giao diện hiện nút "Cập nhật" và một dòng chữ hổ phách bảo *"bấm Cập nhật ở
 * tài khoản đó — bạn không phải liên kết lại từ đầu"*. Bấm vào thì Cas trả về
 * *"Dịch vụ tài chính này không hỗ trợ Update Mode"*. Ngõ cụt: nút duy nhất
 * được mời bấm là nút duy nhất không dùng được.
 *
 * Nguyên nhân gốc không phải mã lỗi thiếu trong bảng, mà là **giao diện không
 * biết `scopes`** — câu truy vấn không lấy cột đó, nên mọi dòng `needs_relink`
 * đều nhận cùng một lời khuyên.
 *
 * QUY TẮC, VÀ NÓ KHÔNG CẦN TRÍ NHỚ:
 *
 *   liên kết `qrpay`  → LUÔN liên kết lại từ đầu, không bao giờ Update Mode
 *   liên kết khác     → Update Mode, vì case 5 đã nghiệm thu đạt
 *
 * Không thể biết trước ngân hàng nào hỗ trợ Update Mode, nên đừng cố nhớ lần
 * bấm hỏng. Nhưng grant QR gắn với dịch vụ merchant của ngân hàng chứ không
 * gắn với phiên đăng nhập, nên "làm mới phiên" vốn không phải phép sửa đúng cho
 * nó — và chính `create-qr` phía máy chủ đã khuyên liên kết lại từ đầu rồi
 * (`bank-link/index.ts`). Trước khi có file này, hai nơi trong cùng ứng dụng nói
 * hai điều trái nhau về cùng một dòng dữ liệu.
 *
 * Cùng bài học của case 7: đổi quy tắc, đừng thêm dòng vào bảng mã lỗi vốn sẽ
 * luôn thiếu.
 */

export type HanhDongSua = 'cap_nhat' | 'lien_ket_lai' | 'khong_can';

export interface LienKet {
  id: string;
  status: string;
  /** `transaction` | `qrpay` | `gdt`. Có thể null với dòng cũ trước khi có cột. */
  scopes: string | null;
}

/** Liên kết QR không sửa được bằng Update Mode — xem ghi chú đầu file. */
export function laLienKetQr(lk: Pick<LienKet, 'scopes'>): boolean {
  return lk.scopes === 'qrpay';
}

/** Liên kết Tổng Cục Thuế: kéo hoá đơn điện tử, không kéo sao kê. */
export function laLienKetThue(lk: Pick<LienKet, 'scopes'>): boolean {
  return lk.scopes === 'gdt';
}

/**
 * Tên hiển thị của một dòng liên kết.
 *
 * VÌ SAO KHÔNG DÙNG THẲNG `account_name || bank_name`. Grant `gdt` nối tới
 * **Tổng Cục Thuế**, không tới ngân hàng nào — Cas không trả về tên tổ chức,
 * nên `exchange` ghi nhãn dự phòng "Tài khoản ngân hàng". Kết quả là màn hình
 * hiện một kết nối cơ quan thuế nằm trong danh sách "Tài khoản ngân hàng thật",
 * mang tên một ngân hàng không tồn tại.
 *
 * Người dùng không có cách nào biết dòng đó là gì, và cũng không có cách nào
 * biết dòng nào trong ba dòng giống nhau mới là cái họ vừa bấm.
 */
export function tenDong(
  lk: Pick<LienKet, 'scopes'> & { account_name?: string | null; bank_name?: string | null },
): string {
  if (laLienKetThue(lk)) return 'Tổng Cục Thuế';
  return lk.account_name || lk.bank_name || 'Tài khoản ngân hàng';
}

/**
 * Cách sửa đúng cho một liên kết.
 *
 * `khong_can` cho mọi trạng thái không phải `needs_relink` — kể cả
 * `disconnected`, vì dòng đã ngắt thì không có gì để sửa, chỉ có thể liên kết
 * mới từ đầu.
 */
export function cachSua(lk: LienKet): HanhDongSua {
  if (lk.status !== 'needs_relink') return 'khong_can';
  return laLienKetQr(lk) ? 'lien_ket_lai' : 'cap_nhat';
}

/**
 * Câu nói cho từng nhóm liên kết đang hỏng.
 *
 * Trả về mảng vì hai nhóm cần hai câu khác nhau, và trước đây chúng bị gộp làm
 * một câu duy nhất — đó là chỗ lời khuyên sai lọt ra.
 */
export interface LoiNhac {
  nhom: 'cap_nhat' | 'lien_ket_lai';
  soLuong: number;
  cau: string;
}

export function cacLoiNhac(dsach: LienKet[]): LoiNhac[] {
  const capNhat = dsach.filter((c) => cachSua(c) === 'cap_nhat');
  const lienKetLai = dsach.filter((c) => cachSua(c) === 'lien_ket_lai');
  const ra: LoiNhac[] = [];

  if (capNhat.length) {
    ra.push({
      nhom: 'cap_nhat',
      soLuong: capNhat.length,
      cau:
        `Có ${capNhat.length} tài khoản cần xác thực lại để tiếp tục đồng bộ. ` +
        'Bấm "Cập nhật" ở tài khoản đó — bạn không phải liên kết lại từ đầu, ' +
        'lịch sử giao dịch đã tải về vẫn giữ nguyên.',
    });
  }

  if (lienKetLai.length) {
    ra.push({
      nhom: 'lien_ket_lai',
      soLuong: lienKetLai.length,
      cau:
        `Có ${lienKetLai.length} liên kết nhận tiền QR đã hỏng. Liên kết loại này ` +
        'không cập nhật tại chỗ được — hãy bấm "Liên kết để nhận tiền QR" để ' +
        'tạo lại. Hoá đơn và mã QR đã phát hành vẫn giữ nguyên.',
    });
  }

  return ra;
}

/**
 * Phụ đề của một dòng.
 *
 * `ghiChu` (nếu có) THẮNG câu chung. Trước đây ngược lại: ternary xếp
 * `needs_relink` lên trước, nên ghi chú cụ thể lấy từ phản hồi thật của ngân
 * hàng bị câu chung "Ngân hàng yêu cầu đăng nhập lại" nuốt mất — kể cả khi ghi
 * chú đó là câu duy nhất nói đúng chuyện gì đang xảy ra.
 */
export function phuDe(lk: LienKet, ghiChu?: string): string | null {
  if (ghiChu) return ghiChu;

  if (lk.status === 'needs_relink') {
    return laLienKetQr(lk)
      ? 'Liên kết nhận tiền QR đã hỏng — cần tạo lại'
      : 'Ngân hàng yêu cầu đăng nhập lại';
  }

  /*
   * Liên kết QR đang tốt phải tự nói nó là gì.
   *
   * Trả `null` ở đây thì giao diện rơi xuống câu dự phòng *"Chưa đồng bộ lần
   * nào"* — và câu đó gợi ý một việc đang chờ, trong khi grant `qrpay` **không
   * bao giờ** có sao kê để đồng bộ. Nó sẽ đứng ở "chưa đồng bộ" vĩnh viễn, và
   * người dùng chờ một chuyện không đời nào xảy ra.
   *
   * Đây đúng là họ lỗi đã gỡ hai lần trong hai ngày: màn hình mô tả trạng thái
   * bằng một phép đo không áp dụng cho dòng đó. Xem `_shared/bank/dong-bo.ts`.
   */
  if (lk.status === 'connected' && laLienKetQr(lk)) {
    return 'Sẵn sàng nhận tiền QR · không có sao kê để đồng bộ';
  }

  /*
   * Lần thứ ba của cùng một họ lỗi, và lần này nó ẩn lâu nhất.
   *
   * Dòng `gdt` rơi xuống câu dự phòng *"Chưa đồng bộ lần nào"* — một câu gợi ý
   * việc đang chờ. Nhưng nút Đồng bộ chung gọi `action=sync`, mà `sync` bỏ qua
   * grant `gdt` (`coSaoKeDeDoc` trả false). Và **không nơi nào trong giao diện
   * gọi `gdt-sync`**, dù máy chủ đã có sẵn nhánh đó và `tax-summary` đã đọc
   * bảng `gdt_invoices`.
   *
   * Nghĩa là: nối được Tổng Cục Thuế, rồi bảng hoá đơn trống vĩnh viễn, và
   * `ThresholdClock` báo `gdtRevenue = null` mãi mãi. Kết nối chỉ để trưng.
   */
  if (lk.status === 'connected' && laLienKetThue(lk)) {
    return 'Đã kết nối · bấm đồng bộ để tải hoá đơn điện tử';
  }

  return null;
}
