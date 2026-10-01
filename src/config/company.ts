/**
 * Thông tin pháp nhân của đơn vị vận hành MIMI Wallet.
 *
 * MỘT NGUỒN DUY NHẤT, và đó là lý do file này tồn tại thay vì gõ thẳng vào JSX.
 * Bộ dữ liệu này sắp xuất hiện ở ít nhất năm chỗ: chân trang, trang Chính sách
 * bảo mật, trang Điều khoản, hồ sơ nộp App Store / Play Store, và thông tin
 * xuất hoá đơn cho khách. Địa chỉ vừa đổi theo đợt sáp nhập xã/phường năm 2025;
 * nếu nó nằm rải rác trong mã nguồn thì lần đổi sau sẽ sót một chỗ, và chỗ sót
 * đó là một địa chỉ pháp lý sai đăng công khai.
 *
 * MỌI TRƯỜNG Ở ĐÂY LÀ THÔNG TIN ĐĂNG KÝ DOANH NGHIỆP THẬT, tra được trên hệ
 * thống của cơ quan thuế theo mã số 0319436143. Không thêm trường nào không có
 * trên giấy đăng ký — đặc biệt là giấy phép, chứng nhận hay đối tác. Repo này
 * đã phải gỡ "ISO 27001" hai lần vì nó được viết ra mà không ai cấp.
 */

export const COMPANY = {
  /** Tên đầy đủ theo giấy chứng nhận đăng ký doanh nghiệp. */
  legalName: 'CÔNG TY CỔ PHẦN CLI NUTRIX',
  internationalName: 'CLI NUTRIX JOINT STOCK COMPANY',
  shortName: 'CLI NUTRIX JSC',

  /** Mã số thuế 10 số — cũng là mã số doanh nghiệp. */
  taxCode: '0319436143',

  legalForm: 'Công ty cổ phần',

  /** Ngày cấp giấy chứng nhận đăng ký doanh nghiệp. */
  incorporatedOn: '11/03/2026',

  /**
   * Địa chỉ trụ sở sau sáp nhập đơn vị hành chính.
   *
   * Ghi nguyên dạng đã cập nhật, không rút gọn: đây là địa chỉ dùng cho hoá đơn
   * và cho hồ sơ nộp store, nơi sai một chữ là phải nộp lại.
   */
  address: '829 Huỳnh Tấn Phát, Phường Phú Thuận, Thành phố Hồ Chí Minh, Việt Nam',

  /**
   * Nơi cấp giấy chứng nhận đăng ký doanh nghiệp (Nghị định 52/2013 Điều 29 và Nghị định
   * 248/2026 đòi công bố "số, ngày cấp, nơi cấp"). CHƯA CÓ trong mã nguồn — rỗng thì hiện
   * token `{{NOI_CAP_DKDN}}`.
   */
  registrationPlace: 'Phòng Đăng ký kinh doanh, Sở Tài chính Thành phố Hồ Chí Minh',

  /** Người đại diện theo pháp luật. */
  legalRepresentative: {
    name: 'ĐINH VĂN NAM',
    title: 'Tổng giám đốc',
    nationality: 'Việt Nam',
  },

  /** Sản phẩm do công ty này vận hành. */
  product: {
    name: 'MIMI Wallet',
    tagline: 'Ví xanh cho tương lai bền vững',
  },
} as const;

/**
 * Kênh liên hệ công khai.
 *
 * Để riêng khỏi `COMPANY` vì đây là thứ đổi theo vận hành, còn `COMPANY` đổi
 * theo giấy tờ.
 *
 * CHƯA ĐIỀN. Cả hai trường này là bắt buộc khi nộp App Store (Support URL) và
 * Play Store, và chúng sẽ hiện công khai ở chân trang. Chúng để trống có chủ ý
 * thay vì điền tạm một địa chỉ đoán ra: một email hỗ trợ không ai đọc hoặc một
 * tên miền không tồn tại còn tệ hơn là chưa có, vì khách sẽ gửi thư vào đó.
 *
 * Nên dùng email theo tên miền công ty (vd hotro@…) chứ không dùng email cá
 * nhân, vì địa chỉ này đăng công khai vĩnh viễn trên trang sản phẩm của store.
 * Giao diện tự ẩn dòng liên hệ khi trường còn rỗng.
 */
export const CONTACT = {
  /**
   * 30/09/2026 — điền cho hồ sơ thông báo TMĐT (Bộ Công Thương / online.gov.vn): trang công bố
   * phải có ít nhất một phương thức liên hệ trực tuyến. Đây là địa chỉ hỗ trợ ĐÃ dùng trong app
   * (menu tài khoản, `mailto:` ở DashboardLayout) — không phải địa chỉ đoán ra. Nên thay bằng
   * email theo tên miền công ty khi có (xem docs/bo-cong-thuong/HUONG_DAN_NOP.md).
   */
  email: 'hoc.qk2@gmail.com',
  /** Tên miền chạy thật — cũng là `HTTP-Referer` máy chủ gửi cổng mô hình (`_shared/ai/nha-cung-cap.ts`). */
  website: 'https://www.mimiwallet.online',
  /**
   * Số điện thoại hỗ trợ. CHƯA CÓ trong mã nguồn — để trống thì giao diện hiện token
   * `{{SO_DIEN_THOAI}}` ở trang công bố để chủ doanh nghiệp thấy mà điền, không bịa số.
   */
  phone: '0984988359',
  /** Trang Facebook chính thức của MIMI (chủ dự án cung cấp 16/09/2026). */
  facebook: 'https://www.facebook.com/profile.php?id=61593186898315',
} as const;

/** Đã điền đủ kênh liên hệ chưa — dùng để ẩn/hiện phần liên hệ ở chân trang. */
export const hasContact = (): boolean => Boolean(CONTACT.email || CONTACT.website || CONTACT.facebook);

/**
 * Có kênh nhận yêu cầu về dữ liệu cá nhân bằng văn bản chưa.
 *
 * KHÁC `hasContact` MỘT CÁCH CÓ CHỦ Ý. Chân trang hiện được cả Facebook, nên
 * `hasContact()` trả true chỉ nhờ có trang Facebook. Trang Chính sách bảo mật
 * dùng chung phép kiểm đó nhưng lại chỉ in `email` và `website` — hai trường
 * đang rỗng — nên câu ở mục Liên hệ ra thành:
 *
 *     "Mọi câu hỏi hoặc yêu cầu liên quan tới dữ liệu cá nhân, xin gửi tới ."
 *
 * Một câu cụt, không có địa chỉ nào. Agent đóng vai một khách hàng ở Berlin
 * phát hiện ngày 23/09/2026: "The sentence just... stops."
 *
 * Yêu cầu về dữ liệu cá nhân cần một kênh có địa chỉ và lưu vết được — email
 * hoặc trang liên hệ. Một trang Facebook không phải chỗ để gửi yêu cầu xoá dữ
 * liệu, nên nó không tính ở đây; khi chưa có kênh nào thì trang lùi về trụ sở
 * đăng ký, vốn luôn có thật.
 */
export const coKenhLienHeVanBan = (): boolean => Boolean(CONTACT.email || CONTACT.website);

/** Ngày ban hành/cập nhật gần nhất của bộ văn bản pháp lý trong ứng dụng. */
export const LEGAL_UPDATED_ON = '30/09/2026';

/** Giá trị còn thiếu thì hiện token để chủ doanh nghiệp điền — không bao giờ tự bịa. */
export const hoacToken = (giaTri: string, token: string): string => giaTri.trim() || `{{${token}}}`;

/**
 * Logo "Đã thông báo Bộ Công Thương". Chỉ điền SAU KHI hồ sơ được xác nhận: `url` là đường dẫn
 * xác nhận do online.gov.vn cấp cho website, `anh` là địa chỉ ảnh logo trong đoạn mã họ gửi.
 * Gắn logo khi chưa được xác nhận là công bố sai — nên cả hai rỗng thì chân trang không hiện gì.
 */
export const THONG_BAO_BCT = {
  url: '',
  anh: '',
} as const;
