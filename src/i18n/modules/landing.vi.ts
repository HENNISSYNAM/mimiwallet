const m = {
  landing: {
    video: { dung: 'Tạm dừng video', phat: 'Phát video' },
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
     * real revenue, and the 1 tỷ–3 tỷ band chooses between 15% on profit
     * and a percentage of revenue. Only someone who can document costs gets to
     * choose. MIMI holds the outflows that document them.
     */
    // 14/09/2026: đổi chữ phần đầu theo định vị mới (docs/CHIEN_LUOC_MIMI.md mục 2);
    // hình ảnh và hiệu ứng của trang giữ nguyên theo yêu cầu chủ dự án.
    hero: {
      titleLine1: 'AI xin chi tiền.',
      titleLine2: 'Bạn là người quyết.',
      subtitle:
        'MIMI kiểm từng khoản chi theo mức bạn đặt, soạn sẵn mã VietQR để bạn trả, rồi dò sao kê và hoá đơn xem tiền đã đi đâu. MIMI không giữ tiền của bạn.',
      pills: [
        'Duyệt trước khi tiền đi',
        'Chặn người nhận lạ',
        'Khớp sao kê với hoá đơn',
        'Mã hoá chống máy tính lượng tử',
      ],
    },
    // Mục ba nguyên tắc agent — src/components/landing/AgentAiSection.tsx.
    agentAi: {
      title: 'AI chi theo luật bạn đặt.',
      subtitle:
        'Bạn đặt mức chi và danh sách người được nhận tiền. Khoản nào AI xin chi cũng có ghi lý do. Gặp khoản lớn hay người nhận mới, MIMI dừng lại hỏi bạn.',
      items: [
        {
          title: 'Chạy cả ngày, không vượt mức bạn đặt.',
          desc: 'AI gửi yêu cầu chi lúc nào cũng được. MIMI xét ngay theo mức mỗi lần, mỗi ngày, mỗi tháng. Vượt mức là từ chối.',
        },
        {
          title: 'Làm đúng luật bạn đặt.',
          desc: 'Bạn chọn nhóm chi được phép, người được nhận tiền và mức tự duyệt, sửa lúc nào cũng được. Khoản nào cũng ghi lý do để bạn xem lại.',
        },
        {
          title: 'Biết khi nào tự làm, khi nào hỏi bạn.',
          desc: 'Khoản nhỏ, đúng luật thì tự duyệt. Khoản lớn hơn mức, hoặc gửi cho người nhận mới, thì chờ bạn. Tiền chỉ đi khi bạn trả trong app ngân hàng.',
        },
      ],
    },
    metrics: {
      items: [
        { prefix: '~', suffix: ' giây', label: 'Thời gian chấm điểm', sub: 'Đo trên máy chủ đang chạy' },
        { prefix: 'ML-KEM-', suffix: '', label: 'Mã hóa kháng lượng tử', sub: 'Chuẩn NIST FIPS 203' },
        { prefix: '', suffix: ' tháng', label: 'Dữ liệu mỗi lần chấm', sub: 'Sao kê của chính doanh nghiệp' },
        { prefix: '', suffix: '/52', label: 'Bài kiểm tra tự động', sub: 'Tự chạy lại mỗi lần cập nhật' },
      ],
    },
    tech: {
      badge: 'Bảo mật',
      title: 'Hai lớp giữ dữ liệu an toàn',
      subtitle: 'Bạn xem được ngay trong ứng dụng.',
      pillars: [
        { title: 'Mã hoá chống máy tính lượng tử', tag: 'ML-KEM-768 · chuẩn NIST FIPS 203', desc: 'Khoá kết nối ngân hàng được mã hoá bằng thuật toán mà máy tính lượng tử chưa phá được.' },
        { title: 'Dữ liệu mỗi công ty để riêng', tag: 'Row-Level Security ở tầng CSDL', desc: 'Công ty này không đọc được dữ liệu của công ty khác. Chặn ngay trong cơ sở dữ liệu.' },
      ],
    },
    process: {
      goToStep: 'Chuyển đến bước {{num}}: {{title}}',
      step1Tags: ['Vietcombank', 'BIDV', 'MISA', 'Shopee'],
      step2Tags: ['Loại chi phí', 'Hoá đơn', 'Cần hỏi lại'],
      // Bỏ '₫100M — ₫10 tỷ' và '24h': MIMI không cho vay và không giải ngân.
      step3Tags: ['Chi phí có chứng từ', 'Hai cách tính thuế'],
      bankDemo: ['Vietcombank', 'BIDV', 'Techcombank', 'VPBank'],
      aiMetrics: [
        // Ví dụ xếp loại, không phải số đo. Trước là "Điểm tín dụng 701 · Rủi ro thấp · +15,5%":
        // MIMI không cho vay, và +15,5% chưa từng có nguồn.
        { label: 'Máy chủ', value: 'Phần mềm' },
        { label: 'Quảng cáo', value: 'Bán hàng' },
        { label: 'In ấn', value: 'Thiếu HĐ' },
        { label: 'API AI', value: 'Hỏi lại' },
      ],
      timeline: [
        { step: 'Đọc sao kê', time: '2 phút' },
        // Trước ghi "Phân loại chi phí · mỗi ngày": chưa có code tự phân loại (sepay-map ghi category: null).
        { step: 'Ghép hoá đơn với sao kê', time: 'theo kỳ' },
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
