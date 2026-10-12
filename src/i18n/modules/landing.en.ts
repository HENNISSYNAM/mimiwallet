const m = {
  landing: {
    video: { dung: 'Pause video', phat: 'Play video' },
    // See the note on the Vietnamese hero: the invoice-advance promise was
    // removed because MIMI cannot lend, and replaced with the 2026 tax change.
    hero: {
      titleLine1: 'Let agents spend.',
      titleLine2: 'Keep the final say.',
      subtitle:
        'MIMI checks every spend request against your policy, builds a VietQR payment order, then matches bank statements and receipts so you know where the money actually went. MIMI never holds your money.',
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
        'You set spending limits and who can be paid. Every AI spend request comes with a reason. For large amounts or new recipients, MIMI stops and asks you.',
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
        { prefix: '', suffix: '/52', label: 'Automated tests', sub: 'Re-run on every update' },
      ],
    },
    tech: {
      badge: 'Security',
      title: 'Two layers that keep your data safe',
      subtitle: 'You can see both right inside the app.',
      pillars: [
        { title: 'Quantum-resistant encryption', tag: 'ML-KEM-768 · NIST FIPS 203', desc: 'Bank connection keys are encrypted with an algorithm quantum computers have not broken.' },
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
  },
};

export default m;
