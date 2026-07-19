import { describe, it, expect } from 'vitest';
import { parseTransactionsCsv } from '@/lib/parseTransactionsCsv';

describe('parseTransactionsCsv', () => {
  it('parses valid rows and skips the header', () => {
    const csv = [
      'date,description,amount,type',
      '2026-01-15,Highlands Coffee,48000000,income',
      '2026-01-16,Nguyen lieu,12500000,expense',
    ].join('\n');

    const { rows, errors } = parseTransactionsCsv(csv);

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      transaction_date: '2026-01-15',
      merchant_name: 'Highlands Coffee',
      amount: 48000000,
      type: 'income',
    });
    expect(rows[1].amount).toBe(-12500000);
    expect(rows[1].type).toBe('expense');
  });

  it('works without a header row', () => {
    const csv = '2026-01-15,Highlands Coffee,48000000,income';
    const { rows, errors } = parseTransactionsCsv(csv);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
  });

  it('is case-insensitive for the type column', () => {
    const csv = '2026-01-15,Test,100000,INCOME';
    const { rows } = parseTransactionsCsv(csv);
    expect(rows[0].type).toBe('income');
  });

  it('collects row-level errors without throwing', () => {
    const csv = [
      'date,description,amount,type',
      'not-a-date,Foo,1000,income',
      '2026-01-15,Bar,abc,expense',
      '2026-01-15,Baz,1000,unknown',
      '2026-01-15,Missing,1000',
    ].join('\n');

    const { rows, errors } = parseTransactionsCsv(csv);
    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(4);
  });

  it('rejects zero and negative amounts', () => {
    const csv = ['2026-01-15,Foo,0,income', '2026-01-15,Bar,-5,expense'].join('\n');
    const { rows, errors } = parseTransactionsCsv(csv);
    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(2);
  });

  it('returns an error for an empty file', () => {
    const { rows, errors } = parseTransactionsCsv('');
    expect(rows).toHaveLength(0);
    expect(errors).toEqual(['File CSV trống']);
  });
});
