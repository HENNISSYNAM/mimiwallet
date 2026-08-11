import { describe, it, expect } from 'vitest';
import {
  mapBankhubTransactions,
  inferDirectionConvention,
  latestReference,
  type BankhubTransaction,
  type BankhubTransactionsResponse,
} from './bankhub-map';

/**
 * A statement where the balance rises on a positive amount and falls on a
 * negative one — i.e. positive means money in. Starting balance 10,000,000đ.
 */
function signedStatement(): BankhubTransaction[] {
  return [
    {
      reference: 'FT001',
      transactionDate: '2026-08-01',
      transactionDateTime: '2026-08-01T09:00:00+07:00',
      amount: 5_000_000,
      runningBalance: 15_000_000,
      accountNumber: '1123456789',
      description: 'CK den',
      counterAccountName: 'CONG TY TNHH ABC',
    },
    {
      reference: 'FT002',
      transactionDate: '2026-08-02',
      transactionDateTime: '2026-08-02T10:30:00+07:00',
      amount: -2_000_000,
      runningBalance: 13_000_000,
      accountNumber: '1123456789',
      description: 'Thanh toan dien',
      counterAccountName: 'EVN HCMC',
    },
    {
      reference: 'FT003',
      transactionDate: '2026-08-03',
      transactionDateTime: '2026-08-03T14:15:00+07:00',
      amount: 1_200_000,
      runningBalance: 14_200_000,
      accountNumber: '1123456789',
      description: 'CK den',
      counterAccountName: 'NGUYEN VAN A',
    },
  ];
}

/** The same money movements under the opposite sign convention. */
function invertedStatement(): BankhubTransaction[] {
  return signedStatement().map((tx) => ({ ...tx, amount: -(tx.amount as number) }));
}

const wrap = (transactions: BankhubTransaction[]): BankhubTransactionsResponse => ({
  requestId: 'req_1',
  transactions,
  accounts: [
    { accountNumber: '1123456789', accountName: 'NGUYEN VAN NAM', currency: 'VND', balance: 14_200_000 },
  ],
});

describe('inferDirectionConvention', () => {
  it('reads a signed statement from its running balance', () => {
    const r = inferDirectionConvention(signedStatement());
    expect(r.convention).toBe('signed');
    expect(r.signedVotes).toBe(2);
    expect(r.invertedVotes).toBe(0);
  });

  it('detects the inverted convention rather than mislabelling every row', () => {
    // This is the case the whole mechanism exists for. If Cas ever sends
    // debit-positive amounts, guessing would swap revenue and costs and the
    // credit model would read a healthy business as a failing one.
    const r = inferDirectionConvention(invertedStatement());
    expect(r.convention).toBe('inverted');
    expect(r.invertedVotes).toBe(2);
  });

  it('reports unknown when there is only one transaction to go on', () => {
    expect(inferDirectionConvention([signedStatement()[0]]).convention).toBe('unknown');
  });

  it('reports unknown when the bank leaves runningBalance empty', () => {
    const stripped = signedStatement().map((tx) => ({ ...tx, runningBalance: null }));
    expect(inferDirectionConvention(stripped).convention).toBe('unknown');
  });

  it('does not mix running balances belonging to different accounts', () => {
    // Two accounts interleaved. Compared blindly the deltas are nonsense and
    // would vote at random; grouped by account each one is internally coherent.
    const other: BankhubTransaction[] = [
      {
        reference: 'GT001',
        transactionDateTime: '2026-08-01T09:30:00+07:00',
        amount: 300_000,
        runningBalance: 800_000,
        accountNumber: '9998887776',
      },
      {
        reference: 'GT002',
        transactionDateTime: '2026-08-02T09:30:00+07:00',
        amount: 200_000,
        runningBalance: 1_000_000,
        accountNumber: '9998887776',
      },
    ];
    const r = inferDirectionConvention([...signedStatement(), ...other]);
    expect(r.convention).toBe('signed');
    expect(r.signedVotes).toBe(3); // 2 from the first account, 1 from the second
    expect(r.abstained).toBe(0);
  });

  it('abstains on a pair whose balances do not explain the amount', () => {
    const broken = signedStatement();
    broken[1] = { ...broken[1], runningBalance: 99_999_999 };
    const r = inferDirectionConvention(broken);
    expect(r.abstained).toBeGreaterThan(0);
  });
});

describe('mapBankhubTransactions', () => {
  it('maps a signed statement to the right side of the ledger', () => {
    const { rows, applied } = mapBankhubTransactions(wrap(signedStatement()), {
      sourceBank: 'Vietcombank',
    });
    expect(applied).toBe('signed');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      amount: 5_000_000,
      type: 'income',
      transaction_date: '2026-08-01',
      source_bank: 'Vietcombank',
      merchant_name: 'CONG TY TNHH ABC',
      reference_id: 'bankhub:FT001',
    });
    expect(rows[1]).toMatchObject({ amount: 2_000_000, type: 'expense', merchant_name: 'EVN HCMC' });
  });

  it('produces the same ledger from an inverted statement', () => {
    // Same three real-world movements, opposite signs on the wire. The rows
    // that reach the database must be identical either way.
    const signed = mapBankhubTransactions(wrap(signedStatement()), { sourceBank: 'Vietcombank' });
    const inverted = mapBankhubTransactions(wrap(invertedStatement()), { sourceBank: 'Vietcombank' });
    expect(inverted.applied).toBe('inverted');
    expect(inverted.rows).toEqual(signed.rows);
  });

  it('stores a positive magnitude, never a negative amount', () => {
    const { rows } = mapBankhubTransactions(wrap(signedStatement()));
    expect(rows.every((r) => r.amount > 0)).toBe(true);
  });

  it('honours an explicit convention over what it would have derived', () => {
    // Once the convention is confirmed against a real account it is pinned, so
    // a later one-transaction sync cannot silently fall back to the default.
    const one = [signedStatement()[1]]; // amount is negative
    const { rows } = mapBankhubTransactions(wrap(one), { convention: 'inverted' });
    expect(rows[0].type).toBe('income');
  });

  it('derives a stable reference_id, so a re-sync deduplicates', () => {
    const a = mapBankhubTransactions(wrap(signedStatement()));
    const b = mapBankhubTransactions(wrap(signedStatement()));
    expect(a.rows.map((r) => r.reference_id)).toEqual(b.rows.map((r) => r.reference_id));
  });

  it('filters to a single account when asked', () => {
    const mixed = [
      ...signedStatement(),
      { reference: 'ZZ1', transactionDate: '2026-08-04', amount: 50_000, accountNumber: '000' },
    ];
    const { rows } = mapBankhubTransactions(wrap(mixed), { accountNumber: '1123456789' });
    expect(rows).toHaveLength(3);
  });

  it('rejects a transaction with no reference instead of storing it', () => {
    const { rows, rejected } = mapBankhubTransactions(
      wrap([{ ...signedStatement()[0], reference: undefined }])
    );
    expect(rows).toHaveLength(0);
    expect(rejected[0]).toMatch(/missing reference/);
  });

  it('rejects zero-value entries', () => {
    const { rows, rejected } = mapBankhubTransactions(
      wrap([{ ...signedStatement()[0], amount: 0 }])
    );
    expect(rows).toHaveLength(0);
    expect(rejected[0]).toMatch(/zero amount/);
  });

  it('rejects an unparseable date rather than defaulting to today', () => {
    const { rows } = mapBankhubTransactions(
      wrap([{ ...signedStatement()[0], transactionDate: 'hom qua', transactionDateTime: undefined }])
    );
    expect(rows).toHaveLength(0);
  });

  it('keeps the bank calendar day for a transaction just after midnight', () => {
    const { rows } = mapBankhubTransactions(
      wrap([
        {
          ...signedStatement()[0],
          transactionDate: undefined,
          transactionDateTime: '2026-09-01T00:20:00+07:00',
        },
      ])
    );
    expect(rows[0].transaction_date).toBe('2026-09-01');
  });

  it('parses amounts that arrive as formatted strings, keeping the sign', () => {
    const { rows } = mapBankhubTransactions(
      wrap([
        { ...signedStatement()[0], amount: '5.000.000' },
        { ...signedStatement()[1], amount: '-2.000.000' },
      ])
    );
    expect(rows[0]).toMatchObject({ amount: 5_000_000, type: 'income' });
    expect(rows[1]).toMatchObject({ amount: 2_000_000, type: 'expense' });
  });

  it('falls back to description when there is no counterparty name', () => {
    const { rows } = mapBankhubTransactions(
      wrap([{ ...signedStatement()[0], counterAccountName: null }])
    );
    expect(rows[0].merchant_name).toBe('CK den');
  });

  it('survives null, undefined and an empty payload', () => {
    expect(mapBankhubTransactions(null).rows).toEqual([]);
    expect(mapBankhubTransactions(undefined).rows).toEqual([]);
    expect(mapBankhubTransactions({}).rows).toEqual([]);
  });
});

describe('latestReference', () => {
  it('returns the newest reference so the next sync can resume from it', () => {
    expect(latestReference(signedStatement())).toBe('FT003');
  });

  it('scopes to one account', () => {
    const mixed = [
      ...signedStatement(),
      { reference: 'ZZ9', transactionDateTime: '2027-01-01T00:00:00+07:00', accountNumber: '000' },
    ];
    expect(latestReference(mixed, '1123456789')).toBe('FT003');
  });

  it('returns null when there is nothing to resume from', () => {
    expect(latestReference([])).toBeNull();
  });
});
