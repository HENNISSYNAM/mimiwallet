const m = {
  landing: {
    /*
     * This is the headline the page actually renders (`landing.hero.*`); the
     * root `hero.*` block only supplies the badge and secondary CTA.
     *
     * It read "Vốn về tài khoản trước khi khách trả tiền" until 17/08/2026 —
     * a promise of money arriving, from a product with no credit licence and no
     * disbursement partner. Nothing behind it could ever have paid out.
     *
     * The replacement is a promise about money too, but one MIMI controls: from
     * 01/01/2026 thuế khoán is gone, every household business self-declares on
     * real revenue, and the 500 triệu–3 tỷ band chooses between 15% on profit
     * and a percentage of revenue. Only someone who can document costs gets to
     * choose. MIMI holds the outflows that document them.
     */
    hero: {
      titleLine1: 'Đóng thuế trên lợi nhuận,',
      titleLine2: 'không phải trên doanh thu',
      subtitle:
        'Từ 2026 hết thuế khoán, bạn tự kê khai theo doanh thu thật. Luật cho bạn chọn cách tính — nhưng chỉ khi chứng minh được chi phí. Mimi Wallet đọc sao kê ngân hàng và dựng sẵn bộ chi phí đó.',
      pills: [
        'Phân loại chi phí mỗi ngày',
        'Đối chiếu hoá đơn cơ quan thuế',
        'So sánh hai cách tính thuế',
        'Mã hóa kháng lượng tử',
      ],
    },
    metrics: {
      items: [
        { prefix: '~', suffix: ' giây', label: 'Thời gian chấm điểm', sub: 'Đo trên máy chủ thật' },
        { prefix: 'ML-KEM-', suffix: '', label: 'Mã hóa kháng lượng tử', sub: 'Chuẩn NIST FIPS 203' },
        { prefix: '', suffix: ' tháng', label: 'Dữ liệu mỗi lần chấm', sub: 'Sao kê của chính doanh nghiệp' },
        { prefix: '', suffix: '/52', label: 'Kiểm thử tự động', sub: 'Chạy lại mỗi lần sửa mã' },
      ],
    },
    tech: {
      badge: 'Công nghệ lõi',
      title: 'Ba thứ chạy bên dưới',
      subtitle: 'Xem được ngay trong ứng dụng, không phải nghe kể.',
      pillars: [
        { title: 'Mã hoá kháng lượng tử', tag: 'ML-KEM-768 · chuẩn NIST FIPS 203', desc: 'Token ngân hàng mã hoá bằng thuật toán máy tính lượng tử chưa giải được.' },
        { title: 'Chấm điểm trong 3 giây', tag: 'Học máy · xem được từng yếu tố', desc: 'Tính từ 12 tháng giao dịch của chính bạn, và chỉ ra yếu tố nào kéo điểm xuống.' },
        { title: 'Tách dữ liệu từng công ty', tag: 'Row-Level Security ở tầng CSDL', desc: 'Chặn ngay trong cơ sở dữ liệu, không phải bằng câu lệnh lọc trong mã.' },
      ],
    },
    process: {
      goToStep: 'Chuyển đến bước {{num}}: {{title}}',
      step1Tags: ['Vietcombank', 'BIDV', 'MISA', 'Shopee'],
      step2Tags: ['Điểm tín dụng', 'Dòng tiền', 'Rủi ro'],
      // Bỏ '₫100M — ₫10 tỷ' và '24h': MIMI không cho vay và không giải ngân.
      step3Tags: ['Chi phí có chứng từ', 'Hai cách tính thuế'],
      bankDemo: ['Vietcombank', 'BIDV', 'Techcombank', 'VPBank'],
      aiMetrics: [
        { label: 'Điểm tín dụng', value: '701' },
        { label: 'Mức rủi ro', value: 'Thấp' },
        { label: 'Dòng tiền', value: '+15,5%' },
        // Bỏ 'Approval 98%': không có ai duyệt, và con số đó chưa từng có nguồn.
      ],
      timeline: [
        { step: 'Đọc sao kê', time: '2 phút' },
        { step: 'Phân loại chi phí', time: 'mỗi ngày' },
        { step: 'Kết xuất tờ khai', time: 'cuối kỳ' },
      ],
    },
    solutions: {
      greenFinanceBadge: 'Lộ trình 2026',
      greenFinanceDesc: 'Dự định làm: kết nối nguồn vốn ưu đãi cho dự án môi trường',
      greenFinanceNote: 'Lãi suất và hạn mức ưu đãi sẽ được công bố khi hợp tác với tổ chức tín dụng xanh hoàn tất.',
      carbonTitle: 'Dấu chân carbon',
      carbonDesc: 'Ước tính phát thải từ chi tiêu của doanh nghiệp (phương pháp spend-based)',
      carbonNotDeployed: 'Chưa triển khai — dự kiến 2026',
      carbonFeatures: [
        'Theo dõi phát thải theo hoạt động kinh doanh',
        'Quy đổi và giao dịch tín chỉ carbon',
        'Xuất báo cáo phục vụ thẩm định vốn xanh',
      ],
    },
    ai: {
      networkLabels: ['Giao dịch', 'Đặc trưng', 'Mô hình', 'Điểm số'],
    },
    proof: {
      sectionLabel: 'Bằng chứng vận hành',
      title: 'Số này lấy từ hệ thống đang chạy',
      subtitle: 'Mô hình chấm điểm tính cho một doanh nghiệp mẫu, từ 12 tháng giao dịch, trên đúng máy chủ đang phục vụ khách.',
      items: [
        { value: '701', unit: '/ 850', label: 'Điểm tín dụng', note: 'Hạng B — Tốt' },
        { value: '34,1', unit: '%', label: 'Xác suất vỡ nợ (PD)', note: 'Hồi quy logistic' },
        // Bỏ "Hạn mức khả dụng 1,36 tỷ": nghe như một khoản vay đã được duyệt,
        // trong khi MIMI không cho vay và không có đối tác giải ngân.
        { value: '12', unit: ' tháng', label: 'Dữ liệu dùng để chấm', note: 'Sao kê thật của doanh nghiệp' },
      ],
      footnote: 'Lấy từ tài khoản demo. Mở ứng dụng là tự tính lại được.',
    },
    cta: {
      title: 'Mở tài khoản',
      subtitle: 'Miễn phí, không cần thẻ. Nối ngân hàng xong là dùng được.',
      thanks: 'Cảm ơn bạn!',
      willContact: 'Chúng tôi sẽ liên hệ trong 24 giờ.',
      button: 'Bắt đầu ngay',
      successToast: 'Đã đăng ký thành công!',
      errorToast: 'Có lỗi xảy ra, vui lòng thử lại.',
    },
  },
};

export default m;
