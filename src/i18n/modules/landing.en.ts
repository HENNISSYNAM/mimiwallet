const m = {
  landing: {
    // See the note on the Vietnamese hero: the invoice-advance promise was
    // removed because MIMI cannot lend, and replaced with the 2026 tax change.
    hero: {
      titleLine1: 'Let agents spend.',
      titleLine2: 'Keep the final say.',
      subtitle:
        'MIMI checks every spend request against your policy, builds a VietQR payment order, then matches bank statements and e-invoices so you know where the money actually went. MIMI never holds your money.',
      pills: [
        'Approve before money moves',
        'Unknown recipients blocked',
        'Matched to statements and invoices',
        'Quantum-resistant encryption',
      ],
    },
    agentAi: {
      title: 'AI that spends by your rules.',
      subtitle:
        'MIMI agents run inside the policy you set, record a reason for every decision, and stop to ask you exactly when it matters.',
      items: [
        {
          title: 'Always on, inside your caps.',
          desc: 'Agents submit spend requests any time via MCP or the API. Each one is checked instantly against per-transaction, daily and monthly caps — over the cap means rejected.',
        },
        {
          title: 'Runs on your policy.',
          desc: 'Allowed categories, approved recipients, auto-approve threshold — you set them and change them any time. Every decision carries a reason code you can read back.',
        },
        {
          title: 'Knows when to act and when to ask.',
          desc: 'Small in-policy spend is auto-approved. Anything above threshold or to a new recipient always waits for you — and money only moves when you pay in your banking app.',
        },
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
      subtitle: 'Two technology pillars, visible right inside the app.',
      pillars: [
        { title: 'Quantum-resistant encryption', tag: 'ML-KEM-768 · NIST FIPS 203', desc: 'Identity data stays secure even against future quantum computers.' },
        { title: 'Per-business security', tag: 'Row-Level Security', desc: 'Each business only sees its own data, enforced at the database layer.' },
      ],
    },
    process: {
      goToStep: 'Go to step {{num}}: {{title}}',
      step1Tags: ['Vietcombank', 'BIDV', 'MISA', 'Shopee'],
      step2Tags: ['Cost type', 'Invoice', 'Needs a question'],
      // Dropped: MIMI does not lend and does not disburse. See vi.ts.
      step3Tags: ['Documented costs', 'Two tax methods'],
      bankDemo: ['Vietcombank', 'BIDV', 'Techcombank', 'VPBank'],
      aiMetrics: [
        { label: 'Servers', value: 'Software' },
        { label: 'Ads', value: 'Sales' },
        { label: 'Printing', value: 'No invoice' },
        { label: 'AI API', value: 'Ask you' },
      ],
      timeline: [
        { step: 'Read bank statement', time: '2 minutes' },
        { step: 'Match invoices to statement', time: 'per period' },
        { step: 'Export return', time: 'end of period' },
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
