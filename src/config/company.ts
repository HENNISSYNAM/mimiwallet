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
  email: '',
  website: '',
} as const;

/** Đã điền đủ kênh liên hệ chưa — dùng để ẩn/hiện phần liên hệ. */
export const hasContact = (): boolean => Boolean(CONTACT.email || CONTACT.website);

/** Ngày ban hành/cập nhật gần nhất của bộ văn bản pháp lý trong ứng dụng. */
export const LEGAL_UPDATED_ON = '19/08/2026';
