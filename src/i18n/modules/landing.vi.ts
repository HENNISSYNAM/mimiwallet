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
        { prefix: '~', suffix: ' giây', label: 'Thời gian chấm điểm', sub: 'Chạy trên hạ tầng production' },
        { prefix: 'ML-KEM-', suffix: '', label: 'Mã hóa kháng lượng tử', sub: 'Chuẩn NIST FIPS 203' },
        { prefix: '', suffix: ' tháng', label: 'Dữ liệu mỗi lần chấm', sub: 'Giao dịch thật của doanh nghiệp' },
        { prefix: '', suffix: '/52', label: 'Kiểm thử tự động', sub: 'Toàn bộ đang pass' },
      ],
    },
    tech: {
      badge: 'Công nghệ lõi',
      title: 'Nhanh gọn, minh bạch, an toàn chuẩn quốc tế',
      subtitle: 'Ba trụ cột công nghệ được hiển thị rõ ngay trên ứng dụng.',
      pillars: [
        { title: 'Mã hóa kháng lượng tử', tag: 'ML-KEM-768 · NIST FIPS 203', desc: 'Dữ liệu định danh an toàn kể cả trước máy tính lượng tử tương lai.' },
        { title: 'Chấm điểm AI ~3 giây', tag: 'Machine Learning · giải thích được', desc: 'Điểm tín dụng tính từ 12 tháng dữ liệu thật, kèm phân tích yếu tố.' },
        { title: 'Bảo mật theo doanh nghiệp', tag: 'Row-Level Security', desc: 'Mỗi doanh nghiệp chỉ thấy đúng dữ liệu của mình, áp ở tầng CSDL.' },
      ],
    },
    process: {
      goToStep: 'Chuyển đến bước {{num}}: {{title}}',
      step1Tags: ['Vietcombank', 'BIDV', 'MISA', 'Shopee'],
      step2Tags: ['Credit Score', 'Cash Flow', 'Risk'],
      step3Tags: ['₫100M — ₫10 tỷ', '24h'],
      bankDemo: ['Vietcombank', 'BIDV', 'Techcombank', 'VPBank'],
      aiMetrics: [
        { label: 'Credit Score', value: '701' },
        { label: 'Risk Level', value: 'Thấp' },
        { label: 'Cash Flow', value: '+15.5%' },
        { label: 'Approval', value: '98%' },
      ],
      timeline: [
        { step: 'Duyệt hồ sơ', time: '2 giờ' },
        { step: 'Ký hợp đồng điện tử', time: '30 phút' },
        { step: 'Giải ngân', time: '4 giờ' },
      ],
    },
    solutions: {
      greenFinanceBadge: 'Lộ trình 2026',
      greenFinanceDesc: 'Định hướng phát triển: vốn ưu đãi cho dự án ESG và phát triển bền vững',
      greenFinanceNote: 'Lãi suất và hạn mức ưu đãi sẽ được công bố khi hợp tác với tổ chức tín dụng xanh hoàn tất.',
      carbonTitle: 'Dấu chân carbon',
      carbonDesc: 'Ước tính phát thải từ chính giao dịch của doanh nghiệp, theo phương pháp spend-based',
      carbonNotDeployed: 'Chưa triển khai — dự kiến 2026',
      carbonFeatures: [
        'Theo dõi phát thải theo hoạt động kinh doanh',
        'Quy đổi và giao dịch tín chỉ carbon',
        'Xuất báo cáo phục vụ thẩm định vốn xanh',
      ],
    },
    ai: {
      networkLabels: ['Giao dịch', 'Đặc trưng', 'Mô hình ML', 'Điểm số'],
    },
    proof: {
      sectionLabel: 'Bằng chứng vận hành',
      title: 'Đã chạy thật, không phải mô phỏng',
      subtitle: 'Kết quả mô hình chấm điểm trả về cho doanh nghiệp mẫu, tính trực tiếp trên hạ tầng production từ 12 tháng dữ liệu giao dịch.',
      items: [
        { value: '701', unit: '/ 850', label: 'Điểm tín dụng', note: 'Hạng B — Tốt' },
        { value: '34,1', unit: '%', label: 'Xác suất vỡ nợ (PD)', note: 'Hồi quy logistic' },
        { value: '1,36', unit: ' tỷ ₫', label: 'Hạn mức khả dụng', note: 'Do mô hình đề xuất' },
      ],
      footnote: 'Số liệu từ tài khoản demo trên hạ tầng production — mở ứng dụng để tự tính lại.',
    },
    cta: {
      title: 'Sẵn sàng tăng tốc dòng tiền?',
      subtitle: 'Đăng ký miễn phí — không cần thẻ tín dụng, setup trong 5 phút',
      thanks: 'Cảm ơn bạn!',
      willContact: 'Chúng tôi sẽ liên hệ trong 24 giờ.',
      button: 'Bắt đầu ngay',
      successToast: 'Đã đăng ký thành công!',
      errorToast: 'Có lỗi xảy ra, vui lòng thử lại.',
    },
  },
};

export default m;
