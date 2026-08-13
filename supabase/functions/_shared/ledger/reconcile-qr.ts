/**
 * Match incoming payments to the QR codes that asked for them.
 *
 * Getting this wrong marks somebody's invoice paid when it was not, or takes a
 * real payment and leaves the customer chased for money they already sent. So
 * it is a pure function with tests, like the internal-transfer matcher, and the
 * database work stays outside it.
 *
 * Two ways to match, both exact — there is no fuzzy matching here on purpose:
 *
 *   reference       Cas echoes our own `referenceNumber` back on the payment.
 *                   Nothing else in the system carries that string, so a hit is
 *                   conclusive.
 *   virtual_account Every QR gets its own one-off account number. A payment
 *                   that landed there was paying that QR and nothing else.
 *
 * The amount must agree in both cases. A QR for 2.000.000 settled by a payment
 * of 1.500.000 is a part payment, and quietly closing the invoice would hide
 * the 500.000 still owed. Those are left for a person to look at.
 */

export interface PendingQr {
  id: string;
  reference_number: string;
  amount: number;
  virtual_account_number: string | null;
  invoice_id: string | null;
}

export interface CandidateTx {
  id: string;
  /** Signed: positive is money in. Only incoming payments can settle a QR. */
  amount: number;
  payment_reference: string | null;
  virtual_account_number: string | null;
}

export type MatchBasis = 'reference' | 'virtual_account';

export interface QrMatch {
  qr_id: string;
  transaction_id: string;
  invoice_id: string | null;
  amount: number;
  basis: MatchBasis;
}

/** A payment that names a QR but disagrees with it — never auto-applied. */
export interface QrMismatch {
  qr_id: string;
  transaction_id: string;
  basis: MatchBasis;
  expected: number;
  received: number;
  reason: 'amount_mismatch';
}

export interface ReconcileResult {
  matched: QrMatch[];
  mismatched: QrMismatch[];
}

function norm(v: string | null | undefined): string {
  return (v ?? '').trim();
}

export function matchQrPayments(
  pending: PendingQr[],
  transactions: CandidateTx[],
): ReconcileResult {
  const matched: QrMatch[] = [];
  const mismatched: QrMismatch[] = [];

  // A transaction settles at most one QR and a QR is settled by at most one
  // transaction. Without this, two QRs raised for the same amount against the
  // same virtual account would both claim the same payment.
  const usedTx = new Set<string>();
  const settledQr = new Set<string>();

  const consider = (qr: PendingQr, tx: CandidateTx, basis: MatchBasis): boolean => {
    if (usedTx.has(tx.id) || settledQr.has(qr.id)) return false;
    // Money out can never settle a request for money in.
    if (tx.amount <= 0) return false;

    if (tx.amount !== qr.amount) {
      mismatched.push({
        qr_id: qr.id,
        transaction_id: tx.id,
        basis,
        expected: qr.amount,
        received: tx.amount,
        reason: 'amount_mismatch',
      });
      return false;
    }

    matched.push({
      qr_id: qr.id,
      transaction_id: tx.id,
      invoice_id: qr.invoice_id,
      amount: qr.amount,
      basis,
    });
    usedTx.add(tx.id);
    settledQr.add(qr.id);
    return true;
  };

  // Reference first. It is the stronger signal, so when both could apply the
  // conclusive one should claim the payment rather than the circumstantial one.
  for (const qr of pending) {
    const ref = norm(qr.reference_number);
    if (!ref) continue;
    for (const tx of transactions) {
      if (norm(tx.payment_reference) !== ref) continue;
      if (consider(qr, tx, 'reference')) break;
    }
  }

  for (const qr of pending) {
    const va = norm(qr.virtual_account_number);
    if (!va || settledQr.has(qr.id)) continue;
    for (const tx of transactions) {
      if (norm(tx.virtual_account_number) !== va) continue;
      if (consider(qr, tx, 'virtual_account')) break;
    }
  }

  return { matched, mismatched };
}
