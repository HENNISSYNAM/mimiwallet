/**
 * Turn a SePay webhook payload into a row for the `transactions` table.
 *
 * Kept as a pure function with no Deno or Supabase imports so Vitest can run it
 * directly — the same split as credit-scoring/scoring.ts, which is the only
 * reason the scoring arithmetic is testable at all.
 *
 * Everything here is defensive on purpose. This function reads a payload posted
 * by an outside system to a public endpoint; a malformed field must produce a
 * rejection, never a wrong row silently written to a credit file.
 */

export interface SepayWebhookPayload {
  id?: number | string;
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  subAccount?: string | null;
  code?: string | null;
  content?: string;
  transferType?: string;
  description?: string;
  transferAmount?: number | string;
  accumulated?: number | string;
  referenceCode?: string;
}

export interface TransactionRow {
  amount: number;
  type: 'income' | 'expense';
  category: string | null;
  merchant_name: string | null;
  transaction_date: string;
  source_bank: string | null;
  reference_id: string;
}

export interface MapResult {
  row: TransactionRow | null;
  /** Why the payload was rejected. Null when the mapping succeeded. */
  reason: string | null;
  /** The account the payload belongs to, so the caller can find the company. */
  accountNumber: string | null;
}

/** SePay sends amounts as a number, but JSON from a proxy can stringify them. */
function toAmount(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    // Vietnamese formatting sometimes reaches webhooks as "5.000.000" or
    // "5,000,000"; both mean five million, neither is a decimal.
    const cleaned = v.replace(/[.,\s]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * `transactions.transaction_date` is a DATE. SePay sends "2026-08-10 14:32:11".
 * Slicing rather than `new Date()` keeps the bank's own calendar day instead of
 * shifting it by whatever timezone the edge runtime happens to be in — a
 * transaction at 00:30 ICT would otherwise be filed to the previous day in UTC.
 */
function toDate(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${mo}-${d}`;
}

export function mapSepayWebhook(payload: SepayWebhookPayload | null | undefined): MapResult {
  const fail = (reason: string, accountNumber: string | null = null): MapResult =>
    ({ row: null, reason, accountNumber });

  if (!payload || typeof payload !== 'object') return fail('payload is not an object');

  const accountNumber =
    typeof payload.accountNumber === 'string' && payload.accountNumber.trim()
      ? payload.accountNumber.trim()
      : null;
  if (!accountNumber) return fail('missing accountNumber');

  // The reference is the deduplication key. Without it a retry would insert a
  // second copy, so a payload that lacks one is rejected rather than stored.
  const rawId = payload.id ?? payload.referenceCode;
  if (rawId === undefined || rawId === null || String(rawId).trim() === '') {
    return fail('missing id and referenceCode', accountNumber);
  }
  const reference_id = `sepay:${String(rawId).trim()}`;

  const direction = String(payload.transferType ?? '').toLowerCase();
  if (direction !== 'in' && direction !== 'out') {
    return fail(`unknown transferType "${payload.transferType}"`, accountNumber);
  }

  const amount = toAmount(payload.transferAmount);
  if (amount === null) return fail('transferAmount is not a number', accountNumber);
  // Zero-value notifications exist (account verification pings) and carry no
  // financial meaning; letting them through would drag cash-flow volatility
  // toward zero with events that never moved money.
  if (amount <= 0) return fail('transferAmount must be positive', accountNumber);

  const transaction_date = toDate(payload.transactionDate);
  if (!transaction_date) {
    return fail(`unparseable transactionDate "${payload.transactionDate}"`, accountNumber);
  }

  const label = (payload.content ?? payload.description ?? '').trim();

  return {
    row: {
      amount: Math.round(amount),
      type: direction === 'in' ? 'income' : 'expense',
      // Categorisation is a separate concern; leaving it null is honest, and the
      // scoring model does not read category.
      category: null,
      merchant_name: label ? label.slice(0, 255) : null,
      transaction_date,
      source_bank: payload.gateway?.trim() || null,
      reference_id,
    },
    reason: null,
    accountNumber,
  };
}
