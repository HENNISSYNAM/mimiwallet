const en = {
  // Navbar
  nav: {
    solutions: 'Solutions',
    features: 'Features',
    pricing: 'Pricing',
    customers: 'Customers',
    about: 'About us',
    login: 'Sign In',
    startFree: 'Get Started Free →',
    startFreeMobile: 'Get Started Free',
  },

  // Loading
  loading: 'Loading...',

  // Hero
  // See the note on the Vietnamese hero block: working capital was removed
  // because MIMI cannot lend, and replaced with the 2026 tax change it can
  // actually act on.
  hero: {
    badge: 'The spend control layer for AI-powered businesses',
    titleLine1: 'Pay tax on profit,',
    titleLine2: 'not on revenue',
    subtitle: 'The law lets you choose how your tax is calculated — but only if you can document your costs. MIMI reads your bank statements and builds that cost record for you.',
    subtitleBold: 'A few taps a day, and your books are ready when filing season arrives.',
    ctaPrimary: 'Start Free — 5 minutes →',
    ctaSecondary: 'Watch 2-min demo',
    trustGreen: 'Lump-sum tax ends 2026',
    trustCarbon: 'Documented costs',
    trustAI: 'Reads tax-authority invoices',
    trustNetZero: 'Green finance',
  },

  // Process
  process: {
    sectionLabel: 'Process',
    title: 'From bank statement to filing pack —',
    titleHighlight: '3 steps',
    subtitle: 'Read-only bank link, MIMI sorts every line, you review before you file',
    step: 'Step',
    steps: [
      {
        title: 'Connect account',
        desc: 'Link your bank, MIMI reads the statement',
        detail: 'Read-only — it cannot move money',
      },
      {
        title: 'Sort costs',
        desc: 'Every expense gets the right category',
        detail: 'Confirm once, MIMI applies it next time',
      },
      {
        title: 'File the return',
        desc: 'A document pack ready for the tax period',
        detail: 'Compare both methods, pick the cheaper one',
      },
    ],
    riskLevel: 'Low',
    disbursedAmount: 'Costs recorded',
    disbursedSuccess: '✓ Reconciled',
    reviewDocs: 'Read statement',
    signContract: 'Sort costs',
    disburse: 'Export return',
  },

  // Solutions
  // See the note on the Vietnamese block: this carried an invoice-advance SLA,
  // a ₫10bn credit limit, a 94% accuracy figure and an ISO 27001 certification,
  // none of which MIMI has. Every line now names something in this repository.
  solutions: {
    sectionLabel: 'Solutions',
    title: 'Clean books',
    titleHighlight: 'before filing season',
    cashFlow: 'Automatic statement import',
    cashFlowDesc: 'Connect your bank account; transactions land in your books with internal transfers already separated from revenue',
    invoice: 'Expense classification',
    invoiceDesc: 'A few taps a day to confirm which outflows are business costs. Answer once for a counterparty and it applies from then on.',
    loan: 'Compare both tax methods',
    loanDesc: 'A percentage of revenue, or 15% of profit — both figures shown side by side so you can choose',
    security: 'Quantum-resistant encryption',
    securityDesc: 'Bank tokens encrypted with ML-KEM-768 (NIST FIPS 203); each company’s data isolated by Row-Level Security',
    dashboard: 'Tax-authority invoice matching',
    dashboardDesc: 'Reads the e-invoices already held by the tax authority and reconciles them against money actually received',
    greenFinance: 'Green Finance',
    greenFinanceDesc: 'An emissions record built from your own transactions, for use in green credit applications',
    interestRate: 'Interest rate',
    creditLimit: 'Credit limit',
    carbonCredits: 'Carbon Credits',
    carbonCreditsDesc: 'Trade, track and report carbon footprint',
    offsetted: 'Offset',
    netZero: 'Net Zero 2050',
    sustainableFuture: 'Towards a sustainable future',
  },

  // Footer
  footer: {
    tagline: 'Green wallet for a sustainable future.',
    products: 'Products',
    // 'Invoice Financing' and 'Loans' listed products MIMI does not sell.
    productLinks: [],
    company: 'Company',
    companyLinks: [],
    legal: 'Legal',
    legalLinks: [],
    // Removed: "Licensed by State Bank of Vietnam" — no such licence exists —
    // along with a wrong legal name and the placeholder tax ID 0123456789.
    // Legal identity now comes from src/config/company.ts.
    copyright: '',
  },

  // Login
  login: {
    title: 'Sign in to MIMI WALLET',
    tagline: 'Green wallet for a sustainable future',
    email: 'Email',
    emailPlaceholder: 'email@company.vn',
    password: 'Password',
    submit: 'Sign In',
    noAccount: 'Don\'t have an account?',
    register: 'Sign up for free',
    errorEmpty: 'Please enter email and password',
    errorInvalid: 'Invalid email or password',
  },

  // Dashboard Sidebar
  sidebar: {
    overview: 'Overview',
    cashflow: 'Cash Flow',
    invoices: 'Invoices',
    creditScore: 'Credit Score',
    fintechHub: 'Fintech Hub',
    reports: 'Reports',
    settings: 'Settings',
    support: 'Support',
    logout: 'Sign Out',
    greenPlan: 'Green Plan ⭐',
    groupAgent: 'Agents & spend',
    groupDocs: 'Invoices & documents',
    groupLedger: 'Ledger & reconciliation',
    groupMore: 'More',
  },

  // Dashboard Overview
  dashboard: {
    greeting: 'Hello, Anh Minh',
    lastUpdate: 'Last updated: 14:32',
    totalBalance: 'Total balance',
    monthlyRevenue: 'Money in this month',
    pendingInvoices: 'Pending invoices',
    creditScoreLabel: 'MIMI Credit Score',
    progress: 'Progress',
    invoicesActive: 'active invoices',
    invoicesDue: 'invoices due soon',
    rankA: 'Rank B — ↑ +12 points',
    veryGood: 'Good',
    cashFlowTitle: 'Cash Flow',
    aiInsights: 'AI Insights',
    recentTx: 'Recent transactions',
    viewAll: 'View all',
    quickActions: 'Quick actions',
    createInvoice: 'Create new invoice',
    advanceInvoice: 'Advance invoice',
    viewReports: 'View reports',
    // Was 'Apply for loan' — a quick action for something MIMI cannot do.
    applyLoan: 'Classify expenses',
    warning: 'Warning',
    opportunity: 'Opportunity',
    reminder: 'Reminder',
    viewSolution: 'View solution',
    income: 'Income',
    expense: 'Expense',
    net: 'Net',
  },

  // Settings
  settings: {
    title: 'Settings',
    subtitle: 'Manage your account and business',
    personalInfo: 'Personal Information',
    fullName: 'Full name',
    email: 'Email',
    phone: 'Phone number',
    business: 'Business',
    companyName: 'Name',
    taxId: 'Tax ID',
    industry: 'Industry',
    province: 'Province/City',
    subscription: 'Subscription',
    notifications: 'Notifications',
    notifInvoiceDue: 'Email when invoice is due',
    notifCashflow: 'Cash flow alerts via email',
    securityTitle: 'Security',
    changePassword: 'Change password',
    twoFactor: 'Two-factor authentication',
    manageDevices: 'Manage devices',
    using: 'Active',
    popular: 'Popular',
    expires: 'Expires',
    manage: 'Manage',
    switchPlan: 'Switch plan',
    subscribe: 'Subscribe',
    refreshStatus: 'Refresh status ↻',
    user: 'User',
  },

  // 404
  notFound: {
    title: '404',
    heading: 'Page not found',
    desc: 'The page you\'re looking for doesn\'t exist or has been removed.',
    back: '← Back to home',
  },

  // Onboarding
  onboarding: {
    steps: [
      { title: 'Create account', desc: 'Secure & private' },
      { title: 'Business', desc: 'Business information' },
      { title: 'Connect data', desc: 'Increase credit limit' },
      { title: 'Funding needs', desc: 'Tailored solutions' },
      { title: 'eKYC verification', desc: 'Complete profile' },
    ],
    smartCapital: 'Smart capital for SMEs',
    next: 'Continue',
    prev: 'Back',
    complete: 'Complete Registration',
    fullName: 'Full name',
    email: 'Business email',
    phone: 'Phone number',
    password: 'Password',
    confirmPassword: 'Confirm password',
    agreeTerms: 'I agree to the Terms of Service and Privacy Policy',
    emailWarn: 'A business email helps MIMI recognise your company',
    taxIdLabel: 'Tax ID',
    companyName: 'Company name',
    industry: 'Industry',
    province: 'Province/City',
    yearsOp: 'Years operating',
    revenue: 'Monthly revenue',
    employees: 'Number of employees',
    connectBanks: 'Connect banks',
    estimatedLimit: 'Estimated credit limit',
    successTitle: 'Application submitted successfully!',
    successSub: 'AI is analyzing your data',
    goToDashboard: 'Go to Dashboard →',
    contactIn24h: 'We\'ll contact you within 24 hours',
    estimatedLimitLabel: 'Estimated credit limit',
  },

  // Floating Badges (Hero)
  heroBadges: {
    cashflow: 'Cash Flow',
  },

  // AI Chat Widget
  aiChat: {
    title: 'MIMI Assistant',
    placeholder: 'Ask about finance...',
    // Was 'advise on loans'. The assistant should offer what the product does.
    greeting: 'Hello! I\'m the MIMI WALLET AI assistant. I can help classify expenses, track tax thresholds and analyze cash flow.',
  },
};

export default en;
