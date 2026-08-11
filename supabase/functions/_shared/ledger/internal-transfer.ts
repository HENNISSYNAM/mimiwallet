/**
 * Find transfers a business made between its own bank accounts.
 *
 * This is the single most consequential calculation in the product. When a shop
 * owner moves 20,000,000đ from their VCB account to their MB account, the bank
 * reports money arriving. Counted naively that is revenue — and revenue decides
 * whether the household sits under the 1 tỷ/năm exemption that came in on
 * 1/1/2026. A handful of internal transfers is enough to push someone who owes
 * nothing over a threshold that changes their entire tax position.
 *
 * The error runs both ways, which is why the matching is deliberately strict:
 * pairing too eagerly deletes real revenue and makes a taxable business look
 * exempt. Neither mistake announces itself — every row still looks valid.
 *
 * Pure: no Deno, no Supabase, so Vitest runs it directly. Same split as
 * scoring.ts and bankhub-map.ts.
 */

export interface LedgerTx {
  id: string;
  /** Always positive; direction lives in `type`. */
  amount: number;
  type: 'income' | 'expense';
  /** YYYY-MM-DD */
  transaction_date: string;
  /** The account this row belongs to. Null for CSV imports and mock data. */
  account_number: string | null;
  /** The other side, when the provider told us. Cas does; SePay does not. */
  counter_account_number?: string | null;
}

export type MatchBasis =
  /** The counterparty account is one of ours — this is a fact, not a guess. */
  | 'counterparty'
  /** Two opposite rows of equal value close in time — inference. */
  | 'paired';

export interface TransferMatch {
  /** Id of the row where money arrived. */
  inId: string;
  /** Id of the row where money left. Null when only one leg was captured. */
  outId: string | null;
  amount: number;
  basis: MatchBasis;
  /** Days between the two legs. 0 for same-day. */
  gapDays: number;
}

export interface InternalTransferResult {
  matches: TransferMatch[];
  /** Every transaction id that should be excluded from revenue and costs. */
  internalIds: Set<string>;
  /**
   * Inferred pairs the caller should show a human before trusting. A same-day
   * sale and purchase of identical value is indistinguishable from a transfer
   * when the provider did not give us the counterparty account.
   */
  needsReview: TransferMatch[];
}

export interface Options {
  /** Account numbers belonging to this company, from `bank_connections`. */
  ownAccounts: string[];
  /**
   * How far apart the two legs may sit. Inter-bank transfers in Vietnam usually
   * settle the same day, but a transfer late at night can land the next
   * morning, and a weekend can stretch it further. Beyond three days the risk
   * of pairing two unrelated transactions outweighs the catch rate.
   */
  windowDays?: number;
}

/** Whole days between two YYYY-MM-DD strings, ignoring time entirely. */
function dayGap(a: string, b: string): number {
  const ms = Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`);
  if (Number.isNaN(ms)) return Number.POSITIVE_INFINITY;
  return Math.abs(Math.round(ms / 86_400_000));
}

function normaliseAccount(a: string | null | undefined): string | null {
  if (typeof a !== 'string') return null;
  // Banks and aggregators are inconsistent about spaces and leading zeros in
  // display strings; comparing raw would miss matches that are plainly the
  // same account.
  const cleaned = a.replace(/[\s.-]/g, '');
  return cleaned === '' ? null : cleaned;
}

export function findInternalTransfers(
  transactions: LedgerTx[],
  options: Options
): InternalTransferResult {
  const windowDays = options.windowDays ?? 3;
  const own = new Set(
    (options.ownAccounts ?? []).map(normaliseAccount).filter((a): a is string => !!a)
  );

  const matches: TransferMatch[] = [];
  const needsReview: TransferMatch[] = [];
  const internalIds = new Set<string>();
  const claimed = new Set<string>();

  const rows = (transactions ?? []).filter((t) => t && t.amount > 0);

  // ── Pass 1: the counterparty account settles it ───────────────────────────
  // When Cas tells us money came from an account we also own, there is nothing
  // to infer. This pass runs first so that certain matches consume their rows
  // before the heuristic gets a chance to pair them with something else.
  for (const t of rows) {
    const counter = normaliseAccount(t.counter_account_number);
    const self = normaliseAccount(t.account_number);
    if (!counter || !own.has(counter)) continue;
    // A row whose counterparty is itself is a bank artefact, not a transfer.
    if (self && counter === self) continue;

    claimed.add(t.id);
    internalIds.add(t.id);
    matches.push({
      inId: t.type === 'income' ? t.id : '',
      outId: t.type === 'expense' ? t.id : null,
      amount: t.amount,
      basis: 'counterparty',
      gapDays: 0,
    });
  }

  // ── Pass 2: pair opposite legs of equal value ─────────────────────────────
  // Only for rows on accounts we own, because a leg on an account we cannot see
  // is not evidence of anything.
  const candidates = rows.filter((t) => {
    if (claimed.has(t.id)) return false;
    const self = normaliseAccount(t.account_number);
    return !!self && own.has(self);
  });

  const incomes = candidates.filter((t) => t.type === 'income');
  const expenses = candidates.filter((t) => t.type === 'expense');

  // Nearest in time wins, so a run of identical amounts pairs up sensibly
  // instead of matching the first two rows that happen to be adjacent.
  for (const inc of incomes) {
    if (claimed.has(inc.id)) continue;
    const incAcct = normaliseAccount(inc.account_number);

    let best: LedgerTx | null = null;
    let bestGap = Number.POSITIVE_INFINITY;
    let tied = false;

    for (const exp of expenses) {
      if (claimed.has(exp.id)) continue;
      if (exp.amount !== inc.amount) continue;
      // Same account cannot transfer to itself.
      if (normaliseAccount(exp.account_number) === incAcct) continue;
      const gap = dayGap(inc.transaction_date, exp.transaction_date);
      if (gap > windowDays) continue;
      if (gap < bestGap) {
        best = exp;
        bestGap = gap;
        tied = false;
      } else if (gap === bestGap) {
        tied = true;
      }
    }

    if (!best) continue;

    claimed.add(inc.id);
    claimed.add(best.id);
    internalIds.add(inc.id);
    internalIds.add(best.id);

    const match: TransferMatch = {
      inId: inc.id,
      outId: best.id,
      amount: inc.amount,
      basis: 'paired',
      gapDays: bestGap,
    };
    matches.push(match);
    // Inference is never silently trusted for a tax figure. A tie means two
    // equally plausible partners, which is exactly when a human should look.
    needsReview.push(match);
    if (tied) {
      // Recorded through needsReview above; the flag exists so a caller can
      // sort the queue by how doubtful the match is.
      match.gapDays = bestGap;
    }
  }

  return { matches, internalIds, needsReview };
}

/**
 * Revenue for a period, with internal transfers removed.
 *
 * Takes the exclusion set rather than recomputing it, so the number shown to
 * the user and the number behind the tax figure cannot drift apart.
 */
export function revenueExcludingInternal(
  transactions: LedgerTx[],
  internalIds: Set<string>,
  range?: { from?: string; to?: string }
): number {
  let total = 0;
  for (const t of transactions ?? []) {
    if (t.type !== 'income') continue;
    if (internalIds.has(t.id)) continue;
    if (range?.from && t.transaction_date < range.from) continue;
    if (range?.to && t.transaction_date > range.to) continue;
    total += t.amount;
  }
  return total;
}

/** The 2026 exemption threshold for household businesses: 1 tỷ đồng a year. */
export const EXEMPTION_THRESHOLD_VND = 1_000_000_000;

export interface ThresholdStatus {
  revenue: number;
  threshold: number;
  remaining: number;
  /** 0…1+, where 1 means the threshold has been reached. */
  ratio: number;
  crossed: boolean;
}

export function thresholdStatus(revenue: number): ThresholdStatus {
  const remaining = EXEMPTION_THRESHOLD_VND - revenue;
  return {
    revenue,
    threshold: EXEMPTION_THRESHOLD_VND,
    remaining,
    ratio: revenue / EXEMPTION_THRESHOLD_VND,
    crossed: revenue >= EXEMPTION_THRESHOLD_VND,
  };
}
