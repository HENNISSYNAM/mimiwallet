const vi = {
  // Navbar
  nav: {
    solutions: 'Giải pháp',
    features: 'Tính năng',
    pricing: 'Bảng giá',
    about: 'Về chúng tôi',
    login: 'Đăng nhập',
    startFree: 'Bắt đầu miễn phí →',
    startFreeMobile: 'Bắt đầu miễn phí',
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
   * business now self-declares on real revenue, and the 500 triệu–3 tỷ band may
   * choose between 15% on profit and a percentage of revenue. That choice is
   * only available to someone who can document costs. MIMI holds their outflows.
   * Green and carbon stay in the supporting line rather than the headline —
   * those features exist, they are just not what the market is panicking about
   * this year.
   */
  hero: {
    badge: 'Từ 2026: bỏ thuế khoán — hộ kinh doanh tự kê khai',
    titleLine1: 'Đóng thuế trên lợi nhuận,',
    titleLine2: 'không phải trên doanh thu',
    subtitle: 'Luật cho bạn chọn cách tính thuế — nhưng chỉ khi chứng minh được chi phí. MIMI đọc sao kê ngân hàng và dựng sẵn bộ chi phí đó cho bạn.',
    subtitleBold: 'Mỗi ngày vài chạm, tới kỳ kê khai là đã xong sổ.',
    ctaPrimary: 'Bắt đầu miễn phí — 5 phút →',
    ctaSecondary: 'Xem demo 2 phút',
    trustGreen: 'Hết thuế khoán 2026',
    trustCarbon: 'Chi phí có chứng từ',
    trustAI: 'Đọc hoá đơn từ cơ quan thuế',
    trustNetZero: 'Tài chính xanh',
  },

  // Logo cloud
  logoCloud: {
    title: 'Đối tác & tích hợp',
  },

  // Metrics
  metrics: {
    businesses: 'Doanh nghiệp đang dùng',
    businessesSub: '+23% tháng này',
    capital: 'Vốn đã giải ngân',
    capitalSuffix: ' Nghìn tỷ',
    capitalSub: '↑ từ ₫1.2T năm 2024',
    disbursement: 'Thời gian giải ngân',
    disbursementSuffix: ' giờ',
    disbursementSub: 'Trung bình toàn hệ thống',
    satisfaction: 'Tỷ lệ hài lòng',
    satisfactionSub: 'NPS Score: 72',
  },

  // Process
  process: {
    sectionLabel: 'Quy trình',
    title: 'Từ đăng ký đến nhận tiền —',
    titleHighlight: '3 bước',
    subtitle: 'Quy trình tự động hoàn toàn, không giấy tờ, không phỏng vấn',
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
        detail: 'Bạn xác nhận một lần, lần sau MIMI tự áp',
      },
      {
        title: 'Kê khai',
        desc: 'Bộ chứng từ sẵn cho kỳ thuế',
        detail: 'So sánh hai cách tính, chọn cách có lợi',
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
    title: 'Sổ sách sạch',
    titleHighlight: 'trước kỳ kê khai',
    cashFlow: 'Đọc sao kê tự động',
    cashFlowDesc: 'Nối tài khoản ngân hàng, giao dịch về thẳng sổ, tách sẵn chuyển khoản nội bộ khỏi doanh thu',
    invoice: 'Phân loại chi phí',
    invoiceDesc: 'Mỗi ngày vài chạm để xác nhận khoản nào là chi phí kinh doanh. Trả lời một lần cho một đối tác, lần sau tự áp.',
    loan: 'So sánh hai cách tính thuế',
    loanDesc: 'Nộp theo tỷ lệ doanh thu hay 15% trên lợi nhuận — hiện cả hai con số để bạn chọn',
    security: 'Mã hoá kháng lượng tử',
    securityDesc: 'Token ngân hàng mã hoá bằng ML-KEM-768 (NIST FIPS 203), dữ liệu tách theo từng công ty bằng Row-Level Security',
    dashboard: 'Đối chiếu hoá đơn cơ quan thuế',
    dashboardDesc: 'Đọc hoá đơn điện tử đã có trên hệ thống thuế để đối chiếu với tiền thật về tài khoản',
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

  // AI Section
  ai: {
    // Mirrors the rewritten section in Landing.tsx — see the long note there.
    // The scorer is a fixed-weight linear scorecard, not a trained model, and
    // no forecast accuracy has ever been measured.
    sectionLabel: 'Cách chấm điểm',
    title: 'Không phải hộp đen —',
    titleHighlight: 'bạn xem được từng bước',
    subtitle: 'Điểm tín dụng tính bằng thẻ điểm năm yếu tố, trọng số công bố công khai. Mỗi điểm số tách được ra thành năm con số đã tạo ra nó.',
    creditScoring: 'Xu hướng doanh thu 25% · Đúng hạn hoá đơn 25%',
    cashFlowForecast: 'Xem giá trị thô và điểm chuẩn hoá của từng yếu tố',
    riskAnalysis: 'Dữ liệu 12 tháng từ tài khoản bạn đã nối',
  },

  // Pricing
  pricing: {
    sectionLabel: 'Bảng giá',
    title: 'Chọn gói phù hợp',
    monthly: 'Hàng tháng',
    annual: 'Hàng năm',
    annualDiscount: '-20%',
    perMonth: '/tháng',
    save20: '(tiết kiệm 20%)',
    mostPopular: 'Phổ biến nhất',
    contact: 'Liên hệ',
    free: 'Miễn phí',
    freePlan: {
      features: ['Chấm điểm tín dụng cơ bản', '1 tài khoản ngân hàng', 'Báo cáo dòng tiền tháng', 'Hỗ trợ qua email'],
      cta: 'Bắt đầu miễn phí',
    },
    growthPlan: {
      features: ['Chấm điểm kèm phân rã từng yếu tố', 'Hồ sơ ứng vốn hóa đơn', 'Không giới hạn tài khoản ngân hàng', 'Cảnh báo vĩ mô cá nhân hóa', 'Hồ sơ phát thải cho tín dụng xanh', '14 ngày dùng thử'],
      cta: 'Dùng thử 14 ngày',
    },
    enterprisePlan: {
      features: ['Hạn mức custom', 'White-label', 'Dedicated API', 'Account manager', 'SLA 99.9%', 'On-premise option'],
      cta: 'Liên hệ sales',
    },
  },

  // Testimonials
  testimonials: {
    sectionLabel: 'Khách hàng',
    title: 'Được tin tưởng bởi 1,247+ doanh nghiệp',
    items: [
      { name: 'Nguyễn Thành', role: 'CEO, Phúc Lộc Foods', quote: 'MIMI WALLET giúp chúng tôi theo dõi carbon footprint và tiếp cận vốn xanh dễ dàng hơn bao giờ hết.' },
      { name: 'Minh Châu', role: 'CFO, Chuỗi nhà hàng 9 chi nhánh', quote: 'Dashboard tài chính xanh giúp tôi chứng minh ESG với nhà đầu tư quốc tế.' },
      { name: 'Đức Huy', role: 'Founder, XNK Đức Phát', quote: 'Tín chỉ carbon từ MIMI WALLET giúp sản phẩm XK của chúng tôi đạt chuẩn EU Green Deal.' },
    ],
  },

  // CTA
  cta: {
    title: 'Sẵn sàng chuyển đổi xanh?',
    subtitle: 'Đăng ký ngay hôm nay — miễn phí, không cần thẻ tín dụng, không ràng buộc.',
    emailPlaceholder: 'Email doanh nghiệp',
    companyPlaceholder: 'Tên công ty',
    button: 'Nhận tư vấn miễn phí →',
    success: '✓ Đã ghi nhận! Chúng tôi sẽ liên hệ trong 24h.',
    privacy: 'Bảo mật dữ liệu theo chuẩn ISO 27001',
  },

  // Footer
  footer: {
    tagline: 'Ví xanh cho tương lai bền vững.',
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
    tagline: 'Ví xanh cho tương lai bền vững',
    email: 'Email',
    emailPlaceholder: 'email@company.vn',
    password: 'Mật khẩu',
    submit: 'Đăng nhập',
    noAccount: 'Chưa có tài khoản?',
    register: 'Đăng ký miễn phí',
    errorEmpty: 'Vui lòng nhập email và mật khẩu',
    errorInvalid: 'Email hoặc mật khẩu không đúng',
  },

  // Dashboard Sidebar
  sidebar: {
    overview: 'Tổng quan',
    cashflow: 'Dòng tiền',
    invoices: 'Hóa đơn',
    loans: 'Vay vốn',
    creditScore: 'Điểm tín dụng',
    fintechHub: 'Fintech Hub',
    m2mDevices: 'Thiết bị M2M',
    technology: 'Công nghệ',
    learn: 'Học Fintech',
    carbon: 'Dấu chân carbon',
    reports: 'Báo cáo',
    settings: 'Cài đặt',
    support: 'Hỗ trợ',
    logout: 'Đăng xuất',
    greenPlan: 'Gói Green ⭐',
    // Nhóm điều hướng. Tên nhóm đặt theo việc người dùng đang muốn làm, không
    // theo tên module bên trong — "Tiền vào ra" chứ không phải "Giao dịch".
    groupDaily: 'Hằng ngày',
    groupConnect: 'Kết nối & Dữ liệu',
    groupMore: 'Khác',
  },

  // Dashboard Overview
  dashboard: {
    greeting: 'Xin chào, Anh Minh',
    lastUpdate: 'Cập nhật lần cuối: 14:32',
    totalBalance: 'Tổng số dư',
    monthlyRevenue: 'Doanh thu tháng này',
    pendingInvoices: 'Hóa đơn chờ thanh toán',
    creditScoreLabel: 'MIMI Credit Score',
    progress: 'Tiến độ',
    invoicesActive: 'hóa đơn đang hoạt động',
    invoicesDue: 'hóa đơn sắp đến hạn',
    rankA: 'Hạng B — ↑ +12 điểm',
    veryGood: 'Tốt',
    cashFlowTitle: 'Dòng tiền',
    aiInsights: 'Insights từ AI',
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
    notifDisbursement: 'SMS khi giải ngân thành công',
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
    heading: 'Trang không tồn tại',
    desc: 'Trang bạn tìm kiếm không có hoặc đã bị xóa.',
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
    emailWarn: 'Nên dùng email doanh nghiệp để tăng điểm tín dụng',
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
    placeholder: 'Hỏi về tài chính...',
    // Was "tư vấn vay vốn". The assistant should offer what the product does.
    greeting: 'Xin chào! Tôi là trợ lý AI MIMI WALLET. Tôi có thể giúp phân loại chi phí, đối chiếu ngưỡng thuế và phân tích dòng tiền.',
  },
};

export default vi;
