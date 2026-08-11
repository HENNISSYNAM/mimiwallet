import { describe, it, expect } from 'vitest';
import {
  findInternalTransfers,
  revenueExcludingInternal,
  thresholdStatus,
  EXEMPTION_THRESHOLD_VND,
  type LedgerTx,
} from './internal-transfer';

const VCB = '0011001234567';
const MB = '9704229876543';
const OWN = [VCB, MB];

let n = 0;
function tx(p: Partial<LedgerTx> & Pick<LedgerTx, 'amount' | 'type'>): LedgerTx {
  return {
    id: `t${++n}`,
    transaction_date: '2026-03-10',
    account_number: VCB,
    counter_account_number: null,
    ...p,
  };
}

describe('findInternalTransfers — counterparty is decisive', () => {
  it('marks a row whose counterparty is another account we own', () => {
    const rows = [
      tx({ amount: 20_000_000, type: 'income', account_number: MB, counter_account_number: VCB }),
    ];
    const r = findInternalTransfers(rows, { ownAccounts: OWN });
    expect(r.internalIds.has(rows[0].id)).toBe(true);
    expect(r.matches[0].basis).toBe('counterparty');
    // A fact from the provider needs no human check.
    expect(r.needsReview).toHaveLength(0);
  });

  it('leaves a payment from a real customer alone', () => {
    const rows = [
      tx({ amount: 20_000_000, type: 'income', counter_account_number: '1900123456789' }),
    ];
    const r = findInternalTransfers(rows, { ownAccounts: OWN });
    expect(r.internalIds.size).toBe(0);
  });

  it('ignores a row whose counterparty is the account itself', () => {
    // Banks emit these as fee reversals and interest postings; treating one as
    // a transfer would delete a real credit.
    const rows = [
      tx({ amount: 12_000, type: 'income', account_number: VCB, counter_account_number: VCB }),
    ];
    expect(findInternalTransfers(rows, { ownAccounts: OWN }).internalIds.size).toBe(0);
  });
});

describe('findInternalTransfers — pairing when the counterparty is unknown', () => {
  it('pairs equal opposite legs across two owned accounts', () => {
    const out = tx({ amount: 50_000_000, type: 'expense', account_number: VCB });
    const inc = tx({ amount: 50_000_000, type: 'income', account_number: MB });
    const r = findInternalTransfers([out, inc], { ownAccounts: OWN });
    expect(r.internalIds.has(out.id)).toBe(true);
    expect(r.internalIds.has(inc.id)).toBe(true);
    expect(r.matches[0].basis).toBe('paired');
  });

  it('sends every inferred pair to review, because a tax figure depends on it', () => {
    const out = tx({ amount: 50_000_000, type: 'expense', account_number: VCB });
    const inc = tx({ amount: 50_000_000, type: 'income', account_number: MB });
    const r = findInternalTransfers([out, inc], { ownAccounts: OWN });
    expect(r.needsReview).toHaveLength(1);
  });

  it('does not pair legs sitting on the same account', () => {
    const out = tx({ amount: 5_000_000, type: 'expense', account_number: VCB });
    const inc = tx({ amount: 5_000_000, type: 'income', account_number: VCB });
    expect(findInternalTransfers([out, inc], { ownAccounts: OWN }).internalIds.size).toBe(0);
  });

  it('does not pair across a gap wider than the window', () => {
    const out = tx({ amount: 5_000_000, type: 'expense', account_number: VCB, transaction_date: '2026-03-01' });
    const inc = tx({ amount: 5_000_000, type: 'income', account_number: MB, transaction_date: '2026-03-20' });
    expect(findInternalTransfers([out, inc], { ownAccounts: OWN }).internalIds.size).toBe(0);
  });

  it('pairs across a weekend but not beyond', () => {
    const out = tx({ amount: 5_000_000, type: 'expense', account_number: VCB, transaction_date: '2026-03-06' });
    const inc = tx({ amount: 5_000_000, type: 'income', account_number: MB, transaction_date: '2026-03-09' });
    expect(findInternalTransfers([out, inc], { ownAccounts: OWN }).internalIds.size).toBe(2);
    expect(findInternalTransfers([out, inc], { ownAccounts: OWN, windowDays: 1 }).internalIds.size).toBe(0);
  });

  it('ignores legs on accounts we do not own', () => {
    // One visible leg is not evidence of a transfer; it is just a transaction.
    const out = tx({ amount: 5_000_000, type: 'expense', account_number: '8888888888' });
    const inc = tx({ amount: 5_000_000, type: 'income', account_number: MB });
    expect(findInternalTransfers([out, inc], { ownAccounts: OWN }).internalIds.size).toBe(0);
  });

  it('does not pair amounts that merely look close', () => {
    const out = tx({ amount: 5_000_000, type: 'expense', account_number: VCB });
    const inc = tx({ amount: 5_000_001, type: 'income', account_number: MB });
    expect(findInternalTransfers([out, inc], { ownAccounts: OWN }).internalIds.size).toBe(0);
  });

  it('consumes each leg once, so three equal rows do not all cancel', () => {
    const out = tx({ amount: 2_000_000, type: 'expense', account_number: VCB });
    const inc1 = tx({ amount: 2_000_000, type: 'income', account_number: MB });
    const inc2 = tx({ amount: 2_000_000, type: 'income', account_number: MB });
    const r = findInternalTransfers([out, inc1, inc2], { ownAccounts: OWN });
    // One transfer out can only explain one arrival; the other is real income.
    expect(r.internalIds.size).toBe(2);
  });

  it('prefers the nearest leg in time', () => {
    const far = tx({ amount: 7_000_000, type: 'expense', account_number: VCB, transaction_date: '2026-03-08' });
    const near = tx({ amount: 7_000_000, type: 'expense', account_number: VCB, transaction_date: '2026-03-10' });
    const inc = tx({ amount: 7_000_000, type: 'income', account_number: MB, transaction_date: '2026-03-10' });
    const r = findInternalTransfers([far, near, inc], { ownAccounts: OWN });
    expect(r.matches[0].outId).toBe(near.id);
    expect(r.matches[0].gapDays).toBe(0);
  });

  it('tolerates spaces and dashes in stored account numbers', () => {
    const rows = [
      tx({ amount: 1_000_000, type: 'income', account_number: '9704 2298 76543', counter_account_number: '0011-0012-34567' }),
    ];
    expect(findInternalTransfers(rows, { ownAccounts: OWN }).internalIds.size).toBe(1);
  });

  it('survives empty and malformed input', () => {
    expect(findInternalTransfers([], { ownAccounts: OWN }).internalIds.size).toBe(0);
    expect(findInternalTransfers([tx({ amount: 0, type: 'income' })], { ownAccounts: OWN }).internalIds.size).toBe(0);
    expect(findInternalTransfers([tx({ amount: 100, type: 'income' })], { ownAccounts: [] }).internalIds.size).toBe(0);
  });
});

describe('revenueExcludingInternal', () => {
  it('leaves internal transfers out of revenue', () => {
    const sale = tx({ amount: 30_000_000, type: 'income', counter_account_number: '1900999' });
    const moved = tx({ amount: 50_000_000, type: 'income', account_number: MB, counter_account_number: VCB });
    const cost = tx({ amount: 8_000_000, type: 'expense' });
    const all = [sale, moved, cost];
    const { internalIds } = findInternalTransfers(all, { ownAccounts: OWN });
    // Without the exclusion this reads 80,000,000 — the number that would push
    // a household over the exemption threshold on money it never earned.
    expect(revenueExcludingInternal(all, internalIds)).toBe(30_000_000);
  });

  it('respects a date range', () => {
    const jan = tx({ amount: 10_000_000, type: 'income', transaction_date: '2026-01-15' });
    const mar = tx({ amount: 20_000_000, type: 'income', transaction_date: '2026-03-15' });
    const r = revenueExcludingInternal([jan, mar], new Set(), { from: '2026-02-01', to: '2026-12-31' });
    expect(r).toBe(20_000_000);
  });
});

describe('thresholdStatus', () => {
  it('reports the distance to the 1 tỷ exemption threshold', () => {
    const s = thresholdStatus(850_000_000);
    expect(s.threshold).toBe(EXEMPTION_THRESHOLD_VND);
    expect(s.remaining).toBe(150_000_000);
    expect(s.crossed).toBe(false);
    expect(s.ratio).toBeCloseTo(0.85);
  });

  it('treats exactly one tỷ as crossed', () => {
    // The exemption applies to revenue "từ 1 tỷ trở xuống", so the boundary
    // itself still qualifies — but for a warning UI, reaching it is the moment
    // the owner needs to know, not the moment they pass it.
    expect(thresholdStatus(1_000_000_000).crossed).toBe(true);
  });
});
