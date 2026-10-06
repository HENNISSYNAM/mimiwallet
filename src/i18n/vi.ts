const vi = {
  // Navbar
  nav: {
    solutions: 'Giải pháp',
    features: 'Tính năng',
    pricing: 'Bảng giá',
    customers: 'Khách hàng',
    about: 'Về chúng tôi',
    login: 'Đăng nhập',
    startFree: 'Dùng thử ngay →',
    startFreeMobile: 'Dùng thử ngay',
  },

  // Loading
  loading: 'Đang tải...',

  // Hero
  /*
   * Led with "Vốn lưu động cho doanh nghiệp nhỏ và siêu nhỏ" until 17/08/2026.
   * MIMI has no credit licence and no disbursement partner, so working capital
   * was the largest promise on the site and the one it could not keep.
   *
   * What replaced it is not a softer promise — it is a harder one, because it
   * can be checked. Thuế khoán was abolished on 01/01/2026: every household
   * business now self-declares on real revenue, and the 1 tỷ–3 tỷ band may
   * choose between 15% on profit and a percentage of revenue. That choice is
   * only available to someone who can document costs. MIMI holds their outflows.
   * Green and carbon stay in the supporting line rather than the headline —
   * those features exist, they are just not what the market is panicking about
   * this year.
   */
  hero: {
    badge: 'Trợ lý chi tiêu cho shop và doanh nghiệp nhỏ',
    titleLine1: 'Đóng thuế trên lợi nhuận,',
    titleLine2: 'không phải trên doanh thu',
    subtitle: 'Luật cho bạn chọn cách tính thuế — nhưng chỉ khi chứng minh được chi phí. MIMI đọc sao kê ngân hàng và dựng sẵn bộ chi phí đó cho bạn.',
    subtitleBold: 'Mỗi ngày vài chạm, tới kỳ kê khai là đã xong sổ.',
    ctaPrimary: 'Xem demo ngay →',
    ctaSecondary: 'Xem demo 2 phút',
    trustGreen: 'Hết thuế khoán 2026',
    trustCarbon: 'Chi phí có chứng từ',
    trustAI: 'Đọc hoá đơn từ cơ quan thuế',
    trustNetZero: 'Tài chính xanh',
  },

  // Process
  process: {
    sectionLabel: 'Cách dùng',
    title: 'Từ sao kê đến bộ chứng từ trong',
    titleHighlight: '3 bước',
    subtitle: 'Nối ngân hàng (chỉ đọc), MIMI xếp từng khoản, bạn xem lại trước khi kê khai.',
    step: 'Bước',
    steps: [
      /*
       * Ba bước này từng kết thúc bằng "Nhận vốn 24h — từ ₫100M đến ₫10 tỷ".
       * Ngày 17/08/2026 mục "Vay vốn" đã bị gỡ khỏi thanh điều hướng vì MIMI
       * không có giấy phép tín dụng và không có đối tác giải ngân — nhưng chữ
       * trên trang chủ thì ở lại, nên trang vẫn hứa tiền suốt từ đó.
       *
       * Bước ba nay nói đúng thứ MIMI làm được: dựng bộ chứng từ chi phí để
       * người dùng tự chọn cách tính thuế. Không hứa ai sẽ cho vay.
       */
      {
        title: 'Nối tài khoản',
        desc: 'Liên kết ngân hàng, MIMI đọc sao kê',
        detail: 'Chỉ đọc, không chuyển được tiền',
      },
      {
        title: 'Tách chi phí',
        desc: 'Mỗi khoản chi được gắn đúng loại',
        detail: 'Bạn chọn một lần, lần sau MIMI tự làm',
      },
      {
        title: 'Kê khai',
        desc: 'Bộ chứng từ sẵn cho kỳ thuế',
        detail: 'Xem hai cách tính, chọn cách có lợi',
      },
    ],
    riskLevel: 'Thấp',
    disbursedAmount: 'Chi phí đã ghi nhận',
    disbursedSuccess: '✓ Đã đối chiếu xong',
    reviewDocs: 'Đọc sao kê',
    signContract: 'Phân loại chi phí',
    disburse: 'Kết xuất tờ khai',
  },

  /*
   * Rewritten 17/08/2026. The previous block carried four claims this product
   * could not stand behind, of three different kinds:
   *
   *   "Ứng tiền từ hóa đơn trong 4 giờ, lên đến 80%"  — a service SLA for a
   *                                                     service that does not exist
   *   "Hạn mức đến ₫10 tỷ, lãi suất cạnh tranh"       — a credit limit and a rate,
   *                                                     from a company with no licence
   *   "độ chính xác 94%"                              — a measured-sounding figure
   *                                                     nothing ever measured
   *   "chuẩn ISO 27001"                               — a certification MIMI does
   *                                                     not hold
   *
   * The last two are worse than the lending ones: an invented accuracy and a
   * claimed certification are the kind of thing a judge or an auditor checks.
   * Every line below names something that exists in this repository today.
   */
  solutions: {
    sectionLabel: 'Giải pháp',
    title: 'Sổ sách gọn gàng',
    titleHighlight: 'trước hạn kê khai',
    cashFlow: 'Đọc sao kê tự động',
    cashFlowDesc: 'Nối tài khoản ngân hàng là giao dịch tự vào sổ. Tiền bạn chuyển qua lại giữa các tài khoản của mình không bị tính là doanh thu.',
    invoice: 'Phân loại chi phí',
    invoiceDesc: 'Mỗi ngày vài chạm để chọn khoản nào là chi phí kinh doanh. Chọn một lần cho mỗi đối tác, lần sau MIMI tự làm.',
    loan: 'So sánh hai cách tính thuế',
    loanDesc: 'Nộp theo % doanh thu hay 15% trên lợi nhuận? MIMI tính sẵn cả hai để bạn chọn.',
    security: 'Mã hoá kháng lượng tử',
    securityDesc: 'Khoá kết nối ngân hàng được mã hoá theo chuẩn NIST FIPS 203. Dữ liệu mỗi công ty để riêng, công ty khác không xem được.',
    dashboard: 'Khớp tiền về với hoá đơn',
    dashboardDesc: 'Khách trả qua mã QR là hoá đơn tự khớp. Biết ngay ai đã trả, ai còn nợ.',
    greenFinance: 'Tài chính xanh',
    greenFinanceDesc: 'Hồ sơ phát thải dựng từ chính giao dịch của bạn, dùng khi làm hồ sơ tín dụng xanh',
    interestRate: 'Lãi suất',
    creditLimit: 'Hạn mức',
    carbonCredits: 'Tín chỉ Carbon',
    carbonCreditsDesc: 'Giao dịch, theo dõi và báo cáo carbon footprint',
    offsetted: 'Đã offset',
    netZero: 'Net Zero 2050',
    sustainableFuture: 'Hướng tới tương lai bền vững',
  },

  // Footer
  footer: {
    tagline: 'Trợ lý sổ sách cho chủ shop và kế toán.',
    products: 'Sản phẩm',
    // 'Invoice Financing' and 'Vay vốn' listed products MIMI does not sell.
    // Danh sách nhãn này không còn được Footer dùng: chân trang giờ chỉ liệt kê
    // đường dẫn có thật trong bảng route, thay vì nhãn gắn href="#".
    productLinks: [],
    company: 'Công ty',
    companyLinks: [],
    legal: 'Pháp lý',
    legalLinks: [],
    // Dòng cũ ghi "Được cấp phép bởi NHNN Việt Nam" — không có giấy phép nào
    // như vậy — kèm tên pháp nhân sai và mã số thuế placeholder 0123456789.
    // Bản quyền và danh tính pháp nhân giờ dựng từ src/config/company.ts.
    copyright: '',
  },

  // Login
  login: {
    title: 'Đăng nhập MIMI WALLET',
    tagline: 'Trợ lý sổ sách cho chủ shop và kế toán',
    email: 'Email',
    emailPlaceholder: 'email@company.vn',
    password: 'Mật khẩu',
    submit: 'Đăng nhập',
    noAccount: 'Chưa có tài khoản?',
    register: 'Đăng ký miễn phí',
    errorEmpty: 'Bạn nhập email và mật khẩu nhé.',
    errorInvalid: 'Email hoặc mật khẩu chưa đúng. Bạn kiểm tra lại nhé.',
  },

  // Dashboard Sidebar
  sidebar: {
    overview: 'Tổng quan',
    cashflow: 'Dòng tiền',
    invoices: 'Hóa đơn',
    creditScore: 'Điểm tín dụng',
    fintechHub: 'Ngân hàng & thanh toán',
    reports: 'Báo cáo',
    settings: 'Cài đặt',
    support: 'Hỗ trợ',
    logout: 'Đăng xuất',
    greenPlan: 'Gói Green ⭐',
    // Nhóm điều hướng. Tên nhóm đặt theo việc người dùng đang muốn làm, không
    // theo tên module bên trong — "Tiền vào ra" chứ không phải "Giao dịch".
    // Ba khu từ 14/09/2026 — xem docs/KE_HOACH_MIMI_CHAU_A.md mục 4.3.
    groupAgent: 'Agent & chi tiêu',
    groupDocs: 'Hoá đơn & chứng từ',
    groupLedger: 'Sổ & đối soát',
    groupMore: 'Khác',
  },

  // Dashboard Overview
  dashboard: {
    greeting: 'Xin chào, Anh Minh',
    lastUpdate: 'Cập nhật lần cuối: 14:32',
    totalBalance: 'Tổng số dư',
    monthlyRevenue: 'Tiền vào tháng này',
    pendingInvoices: 'Hóa đơn chờ thanh toán',
    creditScoreLabel: 'Điểm tín dụng MIMI',
    progress: 'Tiến độ',
    invoicesActive: 'hóa đơn đang hoạt động',
    invoicesDue: 'hóa đơn sắp đến hạn',
    rankA: 'Hạng B — ↑ +12 điểm',
    veryGood: 'Tốt',
    cashFlowTitle: 'Dòng tiền',
    aiInsights: 'MIMI nhắc bạn',
    recentTx: 'Giao dịch gần đây',
    viewAll: 'Xem tất cả',
    quickActions: 'Thao tác nhanh',
    createInvoice: 'Tạo hóa đơn mới',
    advanceInvoice: 'Ứng vốn hóa đơn',
    viewReports: 'Xem báo cáo',
    // Was 'Đăng ký vay vốn' — a quick action for something MIMI cannot do.
    applyLoan: 'Phân loại chi phí',
    warning: 'Cảnh báo',
    opportunity: 'Cơ hội',
    reminder: 'Nhắc nhở',
    viewSolution: 'Xem giải pháp',
    income: 'Thu',
    expense: 'Chi',
    net: 'Ròng',
  },

  // Settings
  settings: {
    title: 'Cài đặt',
    subtitle: 'Quản lý tài khoản và doanh nghiệp',
    personalInfo: 'Thông tin cá nhân',
    fullName: 'Họ và tên',
    email: 'Email',
    phone: 'Số điện thoại',
    business: 'Doanh nghiệp',
    companyName: 'Tên',
    taxId: 'Mã số thuế',
    industry: 'Ngành',
    province: 'Tỉnh/TP',
    subscription: 'Gói dịch vụ',
    notifications: 'Thông báo',
    notifInvoiceDue: 'Email khi hóa đơn đến hạn',
    notifCashflow: 'Cảnh báo dòng tiền qua email',
    securityTitle: 'Bảo mật',
    changePassword: 'Đổi mật khẩu',
    twoFactor: 'Xác thực 2 bước',
    manageDevices: 'Quản lý thiết bị',
    using: 'Đang dùng',
    popular: 'Phổ biến',
    expires: 'Hết hạn',
    manage: 'Quản lý',
    switchPlan: 'Chuyển gói',
    subscribe: 'Đăng ký',
    refreshStatus: 'Làm mới trạng thái ↻',
    user: 'Người dùng',
  },

  // 404
  notFound: {
    title: '404',
    heading: 'Không tìm thấy trang này',
    desc: 'Có thể đường dẫn bị sai, hoặc trang đã được gỡ.',
    back: '← Về trang chủ',
  },

  // Onboarding
  onboarding: {
    steps: [
      { title: 'Tạo tài khoản', desc: 'Bảo mật & riêng tư' },
      { title: 'Doanh nghiệp', desc: 'Thông tin kinh doanh' },
      { title: 'Kết nối dữ liệu', desc: 'Tăng hạn mức vốn' },
      { title: 'Nhu cầu vốn', desc: 'Giải pháp phù hợp' },
      { title: 'Xác minh eKYC', desc: 'Hoàn tất hồ sơ' },
    ],
    smartCapital: 'Sổ sách tự động cho SME',
    next: 'Tiếp tục',
    prev: 'Quay lại',
    complete: 'Hoàn tất đăng ký',
    fullName: 'Họ và tên',
    email: 'Email doanh nghiệp',
    phone: 'Số điện thoại',
    password: 'Mật khẩu',
    confirmPassword: 'Xác nhận mật khẩu',
    agreeTerms: 'Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật',
    emailWarn: 'Nên dùng email doanh nghiệp để MIMI nhận ra công ty của bạn',
    taxIdLabel: 'Mã số thuế',
    companyName: 'Tên công ty',
    industry: 'Ngành nghề',
    province: 'Tỉnh/Thành phố',
    yearsOp: 'Số năm hoạt động',
    revenue: 'Doanh thu hàng tháng',
    employees: 'Số nhân viên',
    connectBanks: 'Kết nối ngân hàng',
    estimatedLimit: 'Hạn mức dự kiến',
    successTitle: 'Hồ sơ đã được gửi thành công!',
    successSub: 'AI đang phân tích dữ liệu của bạn',
    goToDashboard: 'Vào Dashboard ngay →',
    contactIn24h: 'Chúng tôi sẽ liên hệ trong 24 giờ',
    estimatedLimitLabel: 'Dự kiến hạn mức',
  },

  // Floating Badges (Hero)
  heroBadges: {
    cashflow: 'Dòng tiền',
  },

  // AI Chat Widget
  aiChat: {
    title: 'Trợ lý MIMI',
    placeholder: 'Hỏi MIMI về tiền vào, tiền ra…',
    // Was "tư vấn vay vốn". The assistant should offer what the product does.
    greeting: 'Chào bạn, MIMI đây! MIMI giúp bạn phân loại chi phí, xem ngưỡng thuế và xem dòng tiền.',
  },
};

export default vi;
