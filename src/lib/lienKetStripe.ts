/**
 * Đường mua gói qua Stripe Payment Link.
 *
 * BỐI CẢNH, VÀ NÓ QUAN TRỌNG. Stripe từng bị gỡ khỏi sản phẩm này có lý do ghi
 * lại trong `SubscriptionPayment.tsx`: *Stripe không nhận merchant Việt Nam*,
 * nên nút "Nâng cấp" cũ dẫn tới một cổng thanh toán không bao giờ thu được tiền
 * của khách hàng Việt. Nó được thay bằng chuyển khoản + VietQR, và đó vẫn là
 * đường thu tiền thật.
 *
 * File này KHÔNG thay đường đó. Nó thêm một lối phụ cho hai việc: trình diễn
 * (hồ sơ thi, nhà đầu tư) và khách nước ngoài trả bằng thẻ quốc tế.
 *
 * TỰ NHẬN BIẾT CHẾ ĐỘ THỬ. Payment Link ở chế độ thử có tiền tố `test_` trong
 * đường dẫn. Hàm dưới đây đọc chính đường dẫn để biết, thay vì dựa vào một cờ
 * cấu hình mà ai đó phải nhớ bật tắt. Lý do: một nút thu tiền ở chế độ thử mà
 * trông y hệt nút thật là loại lỗi im lặng tệ nhất — khách bấm, thấy "thành
 * công", và không có đồng nào chuyển đi.
 *
 * GẮN `client_reference_id` LÀ BẮT BUỘC, KHÔNG PHẢI TUỲ CHỌN. Payment Link
 * không tự biết ai vừa mua. Thiếu tham số này thì tiền vào tài khoản Stripe
 * nhưng gói của công ty không bao giờ được kích hoạt, và phải có người đối
 * chiếu tay. Đây đúng loại bẫy đã gặp cả ngày: nút bấm được, nhìn như chạy, mà
 * trạng thái không đổi.
 */

/**
 * Link do chủ tài khoản Stripe tạo. Đổi gói thì đổi ở đây.
 *
 * Để rỗng là tắt hẳn lối này — giao diện không hiện nút.
 */
export const LINK_MUA_GOI = 'https://buy.stripe.com/test_3cI00ka8c0Jd9STd3V3ZK00';

export interface TrangThaiLink {
  /** Có bật lối Stripe không. */
  bat: boolean;
  /** Đang ở chế độ thử — không thu được tiền thật. */
  cheDoThu: boolean;
  /** Đường dẫn đã gắn mã tham chiếu. `null` khi tắt. */
  duongDan: string | null;
}

/**
 * Dựng đường dẫn mua gói cho một công ty cụ thể.
 *
 * `companyId` đi vào `client_reference_id` để webhook Stripe biết ai vừa trả.
 * Không có `companyId` thì vẫn trả link, nhưng đánh dấu để bên gọi biết là
 * chưa gắn được người mua.
 */
export function duongDanMuaGoi(companyId?: string | null): TrangThaiLink {
  const goc = LINK_MUA_GOI.trim();
  if (!goc) return { bat: false, cheDoThu: false, duongDan: null };

  // `test_` nằm ngay sau dấu gạch chéo cuối cùng của đường dẫn Payment Link.
  const cheDoThu = /\/test_/.test(goc);

  if (!companyId) return { bat: true, cheDoThu, duongDan: goc };

  const noi = goc.includes('?') ? '&' : '?';
  return {
    bat: true,
    cheDoThu,
    duongDan: `${goc}${noi}client_reference_id=${encodeURIComponent(companyId)}`,
  };
}
