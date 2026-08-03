const m = {
  landing: {
    hero: {
      titleLine1: 'Capital in your account',
      titleLine2: 'before your customer pays',
      subtitle:
        'Mimi Wallet scores your business creditworthiness from real transaction data, then advances up to 80% of the value of your unpaid invoices.',
      pills: [
        'AI scoring in ~3 seconds',
        'Quantum-resistant encryption',
        'Invoice financing',
        'Personalized Fintech learning',
      ],
    },
    metrics: {
      items: [
        { prefix: '~', suffix: ' sec', label: 'Scoring time', sub: 'Runs on production infrastructure' },
        { prefix: 'ML-KEM-', suffix: '', label: 'Quantum-resistant encryption', sub: 'NIST FIPS 203 standard' },
        { prefix: '', suffix: ' months', label: 'Data per scoring run', sub: 'Real business transactions' },
        { prefix: '', suffix: '/52', label: 'Automated tests', sub: 'All currently passing' },
      ],
    },
    tech: {
      badge: 'Core technology',
      title: 'Fast, transparent, secure to international standards',
      subtitle: 'Three technology pillars, clearly visible right inside the app.',
      pillars: [
        { title: 'Quantum-resistant encryption', tag: 'ML-KEM-768 · NIST FIPS 203', desc: 'Identity data stays secure even against future quantum computers.' },
        { title: 'AI scoring in ~3 seconds', tag: 'Machine Learning · explainable', desc: 'Credit score calculated from 12 months of real data, with factor analysis.' },
        { title: 'Per-business security', tag: 'Row-Level Security', desc: 'Each business only sees its own data, enforced at the database layer.' },
      ],
    },
    process: {
      goToStep: 'Go to step {{num}}: {{title}}',
      step1Tags: ['Vietcombank', 'BIDV', 'MISA', 'Shopee'],
      step2Tags: ['Credit Score', 'Cash Flow', 'Risk'],
      step3Tags: ['₫100M — ₫10B', '24h'],
      bankDemo: ['Vietcombank', 'BIDV', 'Techcombank', 'VPBank'],
      aiMetrics: [
        { label: 'Credit Score', value: '701' },
        { label: 'Risk Level', value: 'Low' },
        { label: 'Cash Flow', value: '+15.5%' },
        { label: 'Approval', value: '98%' },
      ],
      timeline: [
        { step: 'Document review', time: '2 hours' },
        { step: 'E-contract signing', time: '30 minutes' },
        { step: 'Disbursement', time: '4 hours' },
      ],
    },
    solutions: {
      greenFinanceBadge: '2026 Roadmap',
      greenFinanceDesc: 'Planned direction: preferential capital for ESG projects and sustainable development',
      greenFinanceNote: 'Preferential interest rates and limits will be announced once partnership with a green credit institution is finalized.',
      carbonTitle: 'Carbon footprint',
      carbonDesc: 'Estimates emissions from your business transactions using a spend-based methodology',
      carbonNotDeployed: 'Not yet deployed — expected 2026',
      carbonFeatures: [
        'Track emissions by business activity',
        'Convert and trade carbon credits',
        'Export reports for green financing assessment',
      ],
    },
    ai: {
      networkLabels: ['Transactions', 'Features', 'ML Model', 'Score'],
    },
    proof: {
      sectionLabel: 'Proof of operation',
      title: 'Actually running, not a simulation',
      subtitle: 'Scoring model results returned for a sample business, computed directly on production infrastructure from 12 months of transaction data.',
      items: [
        { value: '701', unit: '/ 850', label: 'Credit score', note: 'Grade B — Good' },
        { value: '34.1', unit: '%', label: 'Probability of default (PD)', note: 'Logistic regression' },
        { value: '1.36', unit: 'B ₫', label: 'Available credit limit', note: 'Suggested by the model' },
      ],
      footnote: 'Data from a demo account on production infrastructure — open the app to recompute it yourself.',
    },
    cta: {
      title: 'Ready to accelerate your cash flow?',
      subtitle: 'Sign up for free — no credit card, set up in 5 minutes',
      thanks: 'Thank you!',
      willContact: 'We\'ll be in touch within 24 hours.',
      button: 'Get started',
      successToast: 'Successfully signed up!',
      errorToast: 'Something went wrong, please try again.',
    },
  },
};

export default m;
