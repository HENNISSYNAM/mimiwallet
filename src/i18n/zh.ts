/**
 * Tiếng Trung giản thể — bản dịch từ bản tiếng Việt (nguồn gốc của mọi chuỗi trong MIMI).
 *
 * Cùng quy tắc với `ko.ts`: một file cho hết các nhóm khoá, và test `dongBoNgonNgu.test.ts`
 * so khoá với bản tiếng Việt để không chuỗi nào bị bỏ sót.
 *
 * SỐ HIỆU VĂN BẢN PHÁP LUẬT, TÊN NGÂN HÀNG, TÊN THƯƠNG HIỆU GIỮ NGUYÊN.
 */
const zh = {
  nav: {
    solutions: '解决方案',
    features: '功能',
    pricing: '价格',
    customers: '客户',
    about: '关于我们',
    login: '登录',
    startFree: '立即试用 →',
    startFreeMobile: '立即试用',
  },


  hero: {
    badge: '给小店和小企业的支出助手',
    titleLine1: '按利润纳税，',
    titleLine2: '而不是按营业额',
    subtitle: '法律允许你选择计税方式 —— 但前提是能证明成本。MIMI 读取银行流水，替你把这套成本凭证准备好。',
    subtitleBold: '每天点几下，到了申报期账就已经做完了。',
    ctaPrimary: '立即查看演示 →',
    ctaSecondary: '看 2 分钟演示',
    trustGreen: '2026 年取消核定征收',
    trustCarbon: '有凭证的成本',
    trustAI: '读取税务机关的电子发票',
    trustNetZero: '绿色金融',
  },

  process: {
    sectionLabel: '流程',
    title: '从银行流水到申报材料 ——',
    titleHighlight: '3 步',
    subtitle: '银行只读连接，MIMI 逐笔分类，申报前由你确认',
    step: '第',
    steps: [
      {
        title: '连接账户',
        desc: '连接银行后，MIMI 读取流水',
        detail: '只读，无法转账',
      },
      {
        title: '拆分成本',
        desc: '每笔支出都归到正确的类别',
        detail: '你确认一次，之后 MIMI 自动套用',
      },
      {
        title: '纳税申报',
        desc: '申报期所需的凭证已备好',
        detail: '比较两种计税方式，选更有利的那一种',
      },
    ],
    riskLevel: '低',
    disbursedAmount: '已记录的成本',
    disbursedSuccess: '✓ 已核对完成',
    reviewDocs: '读取流水',
    signContract: '成本分类',
    disburse: '导出申报表',
  },

  solutions: {
    sectionLabel: '解决方案',
    title: '干净的账',
    titleHighlight: '在申报期之前',
    cashFlow: '自动读取流水',
    cashFlowDesc: '连接银行账户后交易直接进账，内部转账先从营业额中剔除',
    invoice: '成本分类',
    invoiceDesc: '每天点几下，确认哪些支出属于经营成本。对同一家供应商回答一次，之后自动套用。',
    loan: '比较两种计税方式',
    loanDesc: '按营业额比例纳税，还是按利润的 15% —— 两个数字都显示出来供你选择',
    security: '抗量子加密',
    securityDesc: '银行令牌用 ML-KEM-768（NIST FIPS 203）加密，数据通过 Row-Level Security 按公司隔离',
    dashboard: '到账与发票核对',
    dashboardDesc: '客户扫码付款后，对应的销售发票自动匹配——一眼看出谁已付款、谁仍欠款',
    greenFinance: '绿色金融',
    greenFinanceDesc: '用你自己的交易生成排放档案，用于绿色信贷申请',
    interestRate: '利率',
    creditLimit: '额度',
    carbonCredits: '碳信用',
    carbonCreditsDesc: '碳足迹的交易、跟踪与报告',
    offsetted: '已抵消',
    netZero: '净零 2050',
    sustainableFuture: '迈向可持续的未来',
  },

  footer: {
    tagline: '给店主和会计的记账助手。',
    products: '产品',
    productLinks: [],
    company: '公司',
    companyLinks: [],
    legal: '法律',
    legalLinks: [],
    copyright: '',
  },

  login: {
    title: '登录 MIMI WALLET',
    tagline: '给店主和会计的记账助手',
    email: '邮箱',
    emailPlaceholder: 'email@company.vn',
    password: '密码',
    submit: '登录',
    noAccount: '还没有账户？',
    register: '免费注册',
    errorEmpty: '请输入邮箱和密码',
    errorInvalid: '邮箱或密码不正确',
    errorNotOpened: '该邮箱尚未开通 MIMI 账户。请联系 MIMI 开通正式版，或先试用演示版。',
  },

  sidebar: {
    overview: '总览',
    cashflow: '现金流',
    invoices: '发票',
    creditScore: '信用评分',
    fintechHub: '银行与支付',
    reports: '报告',
    settings: '设置',
    support: '支持',
    logout: '退出登录',
    greenPlan: 'Green 套餐 ⭐',
    groupAgent: '智能体与支出',
    groupDocs: '发票与凭证',
    groupLedger: '账簿与核对',
    groupMore: '其他',
  },

  dashboard: {
    greeting: '你好',
    lastUpdate: '最后更新：14:32',
    totalBalance: '总余额',
    monthlyRevenue: '本月入账',
    pendingInvoices: '待收款发票',
    creditScoreLabel: 'MIMI 信用评分',
    progress: '进度',
    invoicesActive: '张发票正在进行',
    invoicesDue: '张发票即将到期',
    rankA: 'B 级 —— ↑ +12 分',
    veryGood: '良好',
    cashFlowTitle: '现金流',
    aiInsights: 'MIMI 提醒',
    recentTx: '最近交易',
    viewAll: '查看全部',
    quickActions: '快捷操作',
    createInvoice: '新建发票',
    advanceInvoice: '发票预支',
    viewReports: '查看报告',
    applyLoan: '成本分类',
    warning: '警告',
    opportunity: '机会',
    reminder: '提醒',
    viewSolution: '查看解决办法',
    income: '收入',
    expense: '支出',
    net: '净额',
  },

  settings: {
    title: '设置',
    subtitle: '管理账户与企业',
    personalInfo: '个人信息',
    fullName: '姓名',
    email: '邮箱',
    phone: '电话',
    business: '企业',
    companyName: '名称',
    taxId: '税号',
    industry: '行业',
    province: '省/市',
    subscription: '套餐',
    notifications: '通知',
    notifInvoiceDue: '发票到期时发邮件',
    notifCashflow: '现金流预警邮件',
    securityTitle: '安全',
    changePassword: '修改密码',
    twoFactor: '两步验证',
    manageDevices: '设备管理',
    using: '正在使用',
    popular: '热门',
    expires: '到期',
    manage: '管理',
    switchPlan: '更换套餐',
    subscribe: '订阅',
    refreshStatus: '刷新状态 ↻',
    user: '用户',
  },

  notFound: {
    title: '404',
    heading: '页面不存在',
    desc: '你要找的页面不存在或已被删除。',
    back: '← 回到首页',
  },


  heroBadges: {
    cashflow: '现金流',
  },


  landing: {
    video: { dung: '暂停视频', phat: '播放视频' },
    hero: {
      titleLine1: '智能体去花钱。',
      titleLine2: '决定权在你手里。',
      subtitle:
        'MIMI 按你的政策审核每一笔支出，生成 VietQR 付款指令，再把银行流水和电子发票核对一遍，让你知道钱到底去了哪里。MIMI 不保管你的钱。',
      pills: [
        '钱出去之前先审批',
        '拦住陌生收款人',
        '核对流水与发票',
        '抗量子加密',
      ],
    },
    agentAi: {
      title: 'AI 按你的规则花钱。',
      subtitle:
        'MIMI 的智能体在你设定的政策内运行，为每个决定记录理由，并在需要时停下来问你。',
      items: [
        {
          title: '不间断工作，但不越过你设的上限。',
          desc: '智能体可以随时通过 MCP 或 API 发起支出申请。每笔都按单次、每日、每月上限即时审核 —— 超限即拒。',
        },
        {
          title: '严格按你的政策运行。',
          desc: '允许的支出类别、名单内的收款人、自动审批阈值 —— 你随时设定和修改。每个决定都带可回查的理由代码。',
        },
        {
          title: '知道什么时候自己做，什么时候问你。',
          desc: '政策内的小额自动通过。超过阈值或发给新收款人的一定等你 —— 而钱只有在你用银行 App 付款时才会出去。',
        },
      ],
    },
    metrics: {
      items: [
        { prefix: '~', suffix: ' 秒', label: '评分耗时', sub: '在真实服务器上测得' },
        { prefix: 'ML-KEM-', suffix: '', label: '抗量子加密', sub: 'NIST FIPS 203 标准' },
        { prefix: '', suffix: ' 个月', label: '每次评分用的数据', sub: '企业自己的流水' },
        { prefix: '', suffix: '/52', label: '自动化测试', sub: '每次改代码都重跑' },
      ],
    },
    tech: {
      badge: '核心技术',
      title: '底层跑着的两样东西',
      subtitle: '在应用里就能看到，不用听人讲。',
      pillars: [
        { title: '抗量子加密', tag: 'ML-KEM-768 · NIST FIPS 203 标准', desc: '银行令牌用量子计算机尚未攻破的算法加密。' },
        { title: '按公司隔离数据', tag: '数据库层的 Row-Level Security', desc: '在数据库里直接拦住，不靠代码里的过滤语句。' },
      ],
    },
    process: {
      goToStep: '跳到第 {{num}} 步：{{title}}',
      step1Tags: ['Vietcombank', 'BIDV', 'MISA', 'Shopee'],
      step2Tags: ['费用类型', '发票', '需要确认'],
      step3Tags: ['有凭证的成本', '两种计税方式'],
      bankDemo: ['Vietcombank', 'BIDV', 'Techcombank', 'VPBank'],
      aiMetrics: [
        { label: '服务器', value: '软件' },
        { label: '广告', value: '销售费用' },
        { label: '印刷', value: '缺发票' },
        { label: 'AI API', value: '再问你' },
      ],
      timeline: [
        { step: '读取流水', time: '2 分钟' },
        { step: '发票与流水匹配', time: '按期' },
        { step: '导出申报表', time: '期末' },
      ],
    },
  },


  fin: {
    invoices: {
      khongPhaiHddt: '这里是赊销和客户欠款的跟踪记录，不是法定电子发票。电子发票请继续在您的发票软件中开具。',
      title: '发票',
      activeCount: '{{count}} 张发票正在进行',
      createInvoice: '新建发票',
      stats: {
        total: '发票总数',
        pending: '未付款',
        overdue: '已逾期',
        paid: '已收款',
        advanced: '已预支',
      },
      searchPlaceholder: '按客户、发票号搜索...',
      filters: {
        all: '全部',
        pending: '未付',
        overdue: '已逾期',
        paid: '已付',
        advanced: '已预支',
      },
      status: {
        pending: '未付',
        overdue: '已逾期',
        paid: '已付',
        advanced: '已预支',
      },
      table: {
        number: '发票号',
        client: '客户',
        issued: '开票日',
        due: '到期日',
        amount: '金额',
        status: '状态',
      },
      advanceAction: '详情',
      emptyTitle: '还没有发票',
      emptyDesc: '点“新建发票”添加第一张发票。',
      modal: {
        title: '新建发票',
        client: '客户',
        clientPlaceholder: '例：ABC 公司',
        amountBeforeTax: '税前金额',
        amountPlaceholder: '例：50000000',
        vat: 'VAT (%)',
        dueDate: '到期日',
        submit: '新建发票',
      },
      detail: {
        client: '客户',
        amountBeforeTax: '税前金额',
        vat: 'VAT ({{rate}}%)',
        total: '合计',
        issuedDate: '开票日',
        dueDate: '到期日',
        advanceTitle: '发票预支 —— 暂未提供',
        advanceAmount: '可预支估算（80%）',
        advanceFee: '参考费用（每 30 天 1.5%）',
        advanceNow: '立即预支 →',
        advanceUnavailable:
          'MIMI 不提供资金。上面两个数字只是让你有个概念的估算，不是已批准的额度 —— 点了也不会有钱到账。',
      },
      toast: {
        fillRequired: '请填写客户、金额和到期日',
        companyNotFound: '还没找到你的公司信息。请刷新页面后再试。',
        createFailed: '新建发票失败：{{error}}',
        createSuccess: '已创建发票 {{number}}',
        advanceFailed: '预支失败：{{error}}',
        advanceSuccess: '已为发票 {{number}} 预支 {{amount}}',
      },
    },
    reports: {
      title: '进账与出账',
      subtitle: '数据取自银行流水，还不是财务报表。',
      export: '导出 CSV',
      revenueExpense: {
        title: '每月资金流入与流出',
        revenue: '流入',
        expense: '流出',
        profit: '净现金流',
      },
      invoiceAging: {
        title: '客户欠款多久了',
      },
      expenseBreakdown: {
        title: '按类别的资金流出',
      },
    },
  },

  pg: {
    fintech: {
      title: '银行与支付',
      subtitle: '连接银行、支付与法律文件',
      tabs: {
        banking: '连接银行',
        payment: '支付',
        compliance: '法律文件',
      },
    },
  },
};

export default zh;
