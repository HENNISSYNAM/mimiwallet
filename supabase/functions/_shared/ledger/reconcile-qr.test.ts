import { describe, it, expect } from 'vitest';
import { matchQrPayments, type PendingQr, type CandidateTx } from './reconcile-qr';

const qr = (over: Partial<PendingQr> = {}): PendingQr => ({
  id: 'qr1',
  reference_number: 'abc123',
  amount: 2_000_000,
  virtual_account_number: 'VA0001',
  invoice_id: 'inv1',
  ...over,
});

const tx = (over: Partial<CandidateTx> = {}): CandidateTx => ({
  id: 'tx1',
  amount: 2_000_000,
  payment_reference: null,
  virtual_account_number: null,
  ...over,
});

describe('matchQrPayments', () => {
  it('matches on the echoed reference', () => {
    const r = matchQrPayments([qr()], [tx({ payment_reference: 'abc123' })]);
    expect(r.matched).toEqual([
      { qr_id: 'qr1', transaction_id: 'tx1', invoice_id: 'inv1', amount: 2_000_000, basis: 'reference' },
    ]);
    expect(r.mismatched).toHaveLength(0);
  });

  it('matches on the virtual account when no reference came back', () => {
    const r = matchQrPayments([qr()], [tx({ virtual_account_number: 'VA0001' })]);
    expect(r.matched[0].basis).toBe('virtual_account');
  });

  it('prefers the reference when both could apply', () => {
    const r = matchQrPayments(
      [qr()],
      [tx({ id: 'txVA', virtual_account_number: 'VA0001' }), tx({ id: 'txRef', payment_reference: 'abc123' })],
    );
    expect(r.matched).toHaveLength(1);
    expect(r.matched[0]).toMatchObject({ transaction_id: 'txRef', basis: 'reference' });
  });

  it('does not settle a QR from a part payment', () => {
    const r = matchQrPayments([qr()], [tx({ payment_reference: 'abc123', amount: 1_500_000 })]);
    expect(r.matched).toHaveLength(0);
    expect(r.mismatched).toEqual([
      {
        qr_id: 'qr1',
        transaction_id: 'tx1',
        basis: 'reference',
        expected: 2_000_000,
        received: 1_500_000,
        reason: 'amount_mismatch',
      },
    ]);
  });

  it('does not settle a QR from an overpayment either', () => {
    const r = matchQrPayments([qr()], [tx({ payment_reference: 'abc123', amount: 2_500_000 })]);
    expect(r.matched).toHaveLength(0);
    expect(r.mismatched[0].received).toBe(2_500_000);
  });

  it('never settles a QR with money going out', () => {
    const r = matchQrPayments([qr()], [tx({ payment_reference: 'abc123', amount: -2_000_000 })]);
    expect(r.matched).toHaveLength(0);
    expect(r.mismatched).toHaveLength(0);
  });

  it('gives one payment to one QR, not to both', () => {
    // Two QRs for the same amount against the same virtual account: without a
    // claim, a single payment would close both invoices.
    const r = matchQrPayments(
      [qr({ id: 'qrA', reference_number: 'refA' }), qr({ id: 'qrB', reference_number: 'refB', invoice_id: 'inv2' })],
      [tx({ virtual_account_number: 'VA0001' })],
    );
    expect(r.matched).toHaveLength(1);
  });

  it('does not let one QR consume two payments', () => {
    const r = matchQrPayments(
      [qr()],
      [tx({ id: 'tx1', payment_reference: 'abc123' }), tx({ id: 'tx2', payment_reference: 'abc123' })],
    );
    expect(r.matched).toHaveLength(1);
    expect(r.matched[0].transaction_id).toBe('tx1');
  });

  it('matches several QRs to their own payments', () => {
    const r = matchQrPayments(
      [
        qr({ id: 'qrA', reference_number: 'refA', amount: 1_000_000, virtual_account_number: 'VA1' }),
        qr({ id: 'qrB', reference_number: 'refB', amount: 3_000_000, virtual_account_number: 'VA2', invoice_id: 'inv2' }),
      ],
      [
        tx({ id: 'txB', amount: 3_000_000, payment_reference: 'refB' }),
        tx({ id: 'txA', amount: 1_000_000, payment_reference: 'refA' }),
      ],
    );
    expect(r.matched).toHaveLength(2);
    expect(r.matched.find((m) => m.qr_id === 'qrA')?.transaction_id).toBe('txA');
    expect(r.matched.find((m) => m.qr_id === 'qrB')?.invoice_id).toBe('inv2');
  });

  it('ignores blank and whitespace-only references rather than matching them together', () => {
    const r = matchQrPayments(
      [qr({ reference_number: '   ' })],
      [tx({ payment_reference: '' }), tx({ id: 'tx2', payment_reference: '   ' })],
    );
    expect(r.matched).toHaveLength(0);
  });

  it('trims before comparing, so padding from a provider does not lose a payment', () => {
    const r = matchQrPayments([qr()], [tx({ payment_reference: ' abc123 ' })]);
    expect(r.matched).toHaveLength(1);
  });

  it('leaves a QR pending when nothing matches', () => {
    const r = matchQrPayments([qr()], [tx({ payment_reference: 'somethingelse' })]);
    expect(r.matched).toHaveLength(0);
    expect(r.mismatched).toHaveLength(0);
  });

  it('handles empty input on both sides', () => {
    expect(matchQrPayments([], [])).toEqual({ matched: [], mismatched: [] });
    expect(matchQrPayments([qr()], [])).toEqual({ matched: [], mismatched: [] });
  });
});
