/**
 * Tiếng Hàn — bản dịch từ bản tiếng Việt (nguồn gốc của mọi chuỗi trong MIMI).
 *
 * MỘT FILE CHO CẢ BỐN NHÓM KHOÁ. Bản vi và en tách theo module vì lịch sử; ko và zh gom một
 * file để người dịch thấy hết ngữ cảnh trong một lần đọc. Test `dongBoNgonNgu.test.ts` so khoá
 * của ko/zh với vi: thêm chuỗi tiếng Việt mà quên dịch là test đỏ ngay.
 *
 * SỐ HIỆU VĂN BẢN PHÁP LUẬT, TÊN NGÂN HÀNG, TÊN THƯƠNG HIỆU GIỮ NGUYÊN — dịch số hiệu nghị định
 * ra tiếng Hàn thì người đọc không tra lại được bản gốc.
 */
const ko = {
  nav: {
    solutions: '솔루션',
    features: '기능',
    pricing: '요금',
    customers: '고객',
    about: '회사 소개',
    login: '로그인',
    startFree: '지금 체험하기 →',
    startFreeMobile: '지금 체험하기',
  },


  hero: {
    badge: '가게와 소규모 기업을 위한 지출 비서',
    titleLine1: '매출이 아니라',
    titleLine2: '이익에 대해 세금을 냅니다',
    subtitle: '법은 세금 계산 방식을 선택할 수 있게 해줍니다 — 비용을 증빙할 수 있을 때만. MIMI가 은행 거래내역을 읽어 그 비용 자료를 미리 만들어 둡니다.',
    subtitleBold: '매일 몇 번의 터치로, 신고 기한이 오면 장부는 이미 끝나 있습니다.',
    ctaPrimary: '데모 바로 보기 →',
    ctaSecondary: '2분 데모 보기',
    trustGreen: '2026년 정액세 폐지',
    trustCarbon: '증빙이 있는 비용',
    trustAI: '세무당국 전자세금계산서 읽기',
    trustNetZero: '녹색 금융',
  },

  process: {
    sectionLabel: '진행 과정',
    title: '거래 내역부터 신고 서류까지 —',
    titleHighlight: '3단계',
    subtitle: '은행은 읽기 전용으로 연결, MIMI가 항목별로 분류, 신고 전에 직접 확인',
    step: '단계',
    steps: [
      {
        title: '계좌 연결',
        desc: '은행을 연결하면 MIMI가 거래내역을 읽습니다',
        detail: '읽기 전용 — 송금은 불가능합니다',
      },
      {
        title: '비용 분류',
        desc: '지출 건마다 알맞은 항목이 붙습니다',
        detail: '한 번 확인하면 다음부터 MIMI가 자동 적용합니다',
      },
      {
        title: '세금 신고',
        desc: '신고 기간에 맞춘 증빙 자료 준비 완료',
        detail: '두 가지 계산 방식을 비교해 유리한 쪽을 고릅니다',
      },
    ],
    riskLevel: '낮음',
    disbursedAmount: '기록된 비용',
    disbursedSuccess: '✓ 대조 완료',
    reviewDocs: '거래내역 읽기',
    signContract: '비용 분류',
    disburse: '신고서 내보내기',
  },

  solutions: {
    sectionLabel: '솔루션',
    title: '깨끗한 장부',
    titleHighlight: '신고 기한 전에',
    cashFlow: '거래내역 자동 읽기',
    cashFlowDesc: '은행 계좌를 연결하면 거래가 바로 장부로 들어오고, 내부 이체는 매출에서 미리 분리됩니다',
    invoice: '비용 분류',
    invoiceDesc: '매일 몇 번의 터치로 어떤 지출이 사업 비용인지 확인합니다. 한 거래처에 한 번 답하면 다음부터 자동 적용됩니다.',
    loan: '두 가지 세금 계산 방식 비교',
    loanDesc: '매출 비율로 낼지, 이익의 15%로 낼지 — 두 숫자를 모두 보여드립니다',
    security: '양자 저항 암호화',
    securityDesc: '은행 토큰은 ML-KEM-768(NIST FIPS 203)로 암호화하고, 데이터는 Row-Level Security로 회사별로 분리합니다',
    dashboard: '입금과 청구서 대조',
    dashboardDesc: '고객이 QR로 결제하면 해당 판매 청구서가 자동으로 맞춰져, 누가 지불했고 누가 미납인지 바로 보입니다',
    greenFinance: '녹색 금융',
    greenFinanceDesc: '귀사의 거래에서 바로 만든 배출 자료, 녹색 신용 심사 서류에 사용합니다',
    interestRate: '금리',
    creditLimit: '한도',
    carbonCredits: '탄소 배출권',
    carbonCreditsDesc: '탄소 발자국 거래, 추적 및 보고',
    offsetted: '상쇄 완료',
    netZero: '넷제로 2050',
    sustainableFuture: '지속 가능한 미래를 향해',
  },

  footer: {
    tagline: '사장님과 회계 담당자를 위한 장부 비서.',
    products: '제품',
    productLinks: [],
    company: '회사',
    companyLinks: [],
    legal: '법적 고지',
    legalLinks: [],
    copyright: '',
  },

  login: {
    title: 'MIMI WALLET 로그인',
    tagline: '사장님과 회계 담당자를 위한 장부 비서',
    email: '이메일',
    emailPlaceholder: 'email@company.vn',
    password: '비밀번호',
    submit: '로그인',
    noAccount: '계정이 없으신가요?',
    register: '무료 가입',
    errorEmpty: '이메일과 비밀번호를 입력하세요',
    errorInvalid: '이메일 또는 비밀번호가 올바르지 않습니다',
    errorNotOpened: '이 이메일로 열린 MIMI 계정이 아직 없습니다. 실제 버전은 MIMI에 문의하시거나 먼저 데모를 써 보세요.',
  },

  sidebar: {
    overview: '개요',
    cashflow: '현금흐름',
    invoices: '세금계산서',
    creditScore: '신용점수',
    fintechHub: '은행 & 결제',
    reports: '보고서',
    settings: '설정',
    support: '지원',
    logout: '로그아웃',
    greenPlan: 'Green 요금제 ⭐',
    groupAgent: '에이전트 및 지출',
    groupDocs: '세금계산서 및 증빙',
    groupLedger: '장부 및 대조',
    groupMore: '기타',
  },

  dashboard: {
    greeting: '안녕하세요',
    lastUpdate: '마지막 업데이트: 14:32',
    totalBalance: '총 잔액',
    monthlyRevenue: '이번 달 입금',
    pendingInvoices: '미수금 세금계산서',
    creditScoreLabel: 'MIMI 신용점수',
    progress: '진행률',
    invoicesActive: '건의 세금계산서가 진행 중',
    invoicesDue: '건의 세금계산서가 기한 임박',
    rankA: 'B등급 — ↑ +12점',
    veryGood: '양호',
    cashFlowTitle: '현금흐름',
    aiInsights: 'MIMI의 알림',
    recentTx: '최근 거래',
    viewAll: '전체 보기',
    quickActions: '빠른 작업',
    createInvoice: '새 세금계산서 만들기',
    advanceInvoice: '세금계산서 선지급',
    viewReports: '보고서 보기',
    applyLoan: '비용 분류',
    warning: '경고',
    opportunity: '기회',
    reminder: '알림',
    viewSolution: '해결 방법 보기',
    income: '수입',
    expense: '지출',
    net: '순액',
  },

  settings: {
    title: '설정',
    subtitle: '계정 및 사업체 관리',
    personalInfo: '개인 정보',
    fullName: '성명',
    email: '이메일',
    phone: '전화번호',
    business: '사업체',
    companyName: '이름',
    taxId: '사업자번호',
    industry: '업종',
    province: '시/도',
    subscription: '요금제',
    notifications: '알림',
    notifInvoiceDue: '세금계산서 기한 도래 시 이메일',
    notifCashflow: '현금흐름 경고 이메일',
    securityTitle: '보안',
    changePassword: '비밀번호 변경',
    twoFactor: '2단계 인증',
    manageDevices: '기기 관리',
    using: '사용 중',
    popular: '인기',
    expires: '만료',
    manage: '관리',
    switchPlan: '요금제 변경',
    subscribe: '구독하기',
    refreshStatus: '상태 새로고침 ↻',
    user: '사용자',
  },

  notFound: {
    title: '404',
    heading: '페이지가 없습니다',
    desc: '찾으시는 페이지가 없거나 삭제되었습니다.',
    back: '← 홈으로',
  },


  heroBadges: {
    cashflow: '현금흐름',
  },


  landing: {
    video: { dung: '영상 일시정지', phat: '영상 재생' },
    hero: {
      titleLine1: '에이전트가 지출합니다.',
      titleLine2: '결정권은 당신에게 있습니다.',
      subtitle:
        'MIMI는 귀사의 정책에 따라 지출 건마다 심사하고, VietQR 결제 지시를 만들고, 은행 거래내역과 전자세금계산서를 대조해 돈이 실제로 어디로 갔는지 알려줍니다. MIMI는 귀사의 돈을 보관하지 않습니다.',
      pills: [
        '돈이 나가기 전에 승인',
        '낯선 수취인 차단',
        '거래내역과 세금계산서 대조',
        '양자 저항 암호화',
      ],
    },
    agentAi: {
      title: 'AI가 당신의 규칙대로 지출합니다.',
      subtitle:
        'MIMI의 에이전트는 귀사가 정한 정책 안에서 작동하고, 모든 결정에 사유를 기록하며, 필요한 순간에는 멈추고 물어봅니다.',
      items: [
        {
          title: '정한 상한 안에서 쉬지 않고 일합니다.',
          desc: '에이전트는 MCP나 API로 언제든 지출 요청을 보냅니다. 각 건은 1회·1일·1개월 상한에 따라 즉시 심사되고, 상한을 넘으면 거절됩니다.',
        },
        {
          title: '당신의 정책대로만 움직입니다.',
          desc: '허용 지출 항목, 등록된 수취인, 자동 승인 기준 — 언제든 정하고 바꿀 수 있습니다. 모든 결정에는 다시 읽을 수 있는 사유 코드가 붙습니다.',
        },
        {
          title: '스스로 할 때와 물어볼 때를 구분합니다.',
          desc: '정책 안의 소액은 자동 승인됩니다. 기준을 넘는 금액이나 새 수취인은 항상 당신을 기다리고 — 돈은 당신이 은행 앱에서 보낼 때만 나갑니다.',
        },
      ],
    },
    metrics: {
      items: [
        { prefix: '~', suffix: '초', label: '점수 산정 시간', sub: '실제 서버에서 측정' },
        { prefix: 'ML-KEM-', suffix: '', label: '양자 저항 암호화', sub: 'NIST FIPS 203 표준' },
        { prefix: '', suffix: '개월', label: '한 번 산정에 쓰는 데이터', sub: '해당 기업의 거래내역' },
        { prefix: '', suffix: '/52', label: '자동 테스트', sub: '코드를 고칠 때마다 재실행' },
      ],
    },
    tech: {
      badge: '핵심 기술',
      title: '아래에서 돌아가는 두 가지',
      subtitle: '말로 듣는 것이 아니라 앱에서 바로 확인할 수 있습니다.',
      pillars: [
        { title: '양자 저항 암호화', tag: 'ML-KEM-768 · NIST FIPS 203 표준', desc: '은행 토큰을 양자컴퓨터도 아직 풀지 못한 알고리즘으로 암호화합니다.' },
        { title: '회사별 데이터 분리', tag: '데이터베이스 계층의 Row-Level Security', desc: '코드의 필터 구문이 아니라 데이터베이스 안에서 바로 차단합니다.' },
      ],
    },
    process: {
      goToStep: '{{num}}단계로 이동: {{title}}',
      step1Tags: ['Vietcombank', 'BIDV', 'MISA', 'Shopee'],
      step2Tags: ['비용 유형', '세금계산서', '확인 필요'],
      step3Tags: ['증빙이 있는 비용', '두 가지 세금 계산 방식'],
      bankDemo: ['Vietcombank', 'BIDV', 'Techcombank', 'VPBank'],
      aiMetrics: [
        { label: '서버', value: '소프트웨어' },
        { label: '광고', value: '판매비' },
        { label: '인쇄', value: '증빙 없음' },
        { label: 'AI API', value: '다시 확인' },
      ],
      timeline: [
        { step: '거래내역 읽기', time: '2분' },
        { step: '세금계산서와 거래내역 대조', time: '기간별' },
        { step: '신고서 내보내기', time: '기말' },
      ],
    },
  },


  fin: {
    invoices: {
      khongPhaiHddt: '외상 판매와 고객 미수금을 관리하는 장부이며, 법정 전자세금계산서가 아닙니다. 전자세금계산서는 기존 발행 프로그램에서 발행하세요.',
      title: '세금계산서',
      activeCount: '{{count}}건의 세금계산서가 진행 중',
      createInvoice: '세금계산서 만들기',
      stats: {
        total: '전체 세금계산서',
        pending: '미결제',
        overdue: '기한 초과',
        paid: '수금 완료',
        advanced: '선지급 완료',
      },
      searchPlaceholder: '고객, 계산서 번호로 검색...',
      filters: {
        all: '전체',
        pending: '미결제',
        overdue: '기한 초과',
        paid: '결제 완료',
        advanced: '선지급',
      },
      status: {
        pending: '미결제',
        overdue: '기한 초과',
        paid: '결제 완료',
        advanced: '선지급 완료',
      },
      table: {
        number: '계산서 번호',
        client: '고객',
        issued: '발행일',
        due: '만기일',
        amount: '금액',
        status: '상태',
      },
      advanceAction: '자세히',
      emptyTitle: '세금계산서가 없습니다',
      emptyDesc: '"세금계산서 만들기"를 눌러 첫 계산서를 추가하세요.',
      modal: {
        title: '새 세금계산서 만들기',
        client: '고객',
        clientPlaceholder: '예: ABC 주식회사',
        amountBeforeTax: '세전 금액',
        amountPlaceholder: '예: 50000000',
        vat: 'VAT (%)',
        dueDate: '만기일',
        submit: '세금계산서 만들기',
      },
      detail: {
        client: '고객',
        amountBeforeTax: '세전 금액',
        vat: 'VAT ({{rate}}%)',
        total: '합계',
        issuedDate: '발행일',
        dueDate: '만기일',
        advanceTitle: '세금계산서 선지급 — 아직 제공하지 않습니다',
        advanceAmount: '선지급 가능 추정액(80%)',
        advanceFee: '참고 수수료(30일당 1.5%)',
        advanceNow: '지금 선지급 →',
        advanceUnavailable:
          'MIMI는 자금을 공급하지 않습니다. 위 두 숫자는 감을 잡기 위한 추정치이며 승인된 금액이 아닙니다 — 눌러도 입금되지 않습니다.',
      },
      toast: {
        fillRequired: '고객, 금액, 만기일을 모두 입력하세요',
        companyNotFound: '회사 정보를 아직 찾지 못했어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.',
        createFailed: '세금계산서 생성 실패: {{error}}',
        createSuccess: '세금계산서 {{number}}을 만들었습니다',
        advanceFailed: '선지급 실패: {{error}}',
        advanceSuccess: '세금계산서 {{number}}에 대해 {{amount}}을 선지급했습니다',
      },
    },
    reports: {
      title: '들어온 돈, 나간 돈',
      subtitle: '은행 거래내역에서 가져왔어요. 아직 재무보고서는 아닙니다.',
      export: 'CSV 내보내기',
      revenueExpense: {
        title: '월별 입금 및 출금',
        revenue: '입금',
        expense: '출금',
        profit: '순현금흐름',
      },
      invoiceAging: {
        title: '고객이 얼마나 오래 미납 중인지',
      },
      expenseBreakdown: {
        title: '분류별 출금',
      },
    },
  },

  pg: {
    fintech: {
      title: '은행 & 결제',
      subtitle: '은행 연결, 결제, 법적 서류',
      tabs: {
        banking: '은행 연결',
        payment: '결제',
        compliance: '법적 서류',
      },
    },
  },
};

export default ko;
