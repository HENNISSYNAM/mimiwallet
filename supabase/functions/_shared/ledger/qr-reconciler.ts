import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { matchQrPayments, type PendingQr, type CandidateTx } from "./reconcile-qr.ts";

/**
 * Database glue around `matchQrPayments`.
 *
 * Kept apart from the matcher so the decision — which payment settles which
 * invoice — stays a pure function with tests, and this file only moves rows.
 *
 * Runs after every ingest on both paths. A payment can reach us pushed by Cas
 * or found by the next poll, and an invoice must close the same way whichever
 * happened first.
 */

/** How far back to look for a payment that might settle an open QR. */
const LOOKBACK_DAYS = 30;

export interface ReconcileSummary {
  checked: number;
  settled: number;
  mismatched: number;
}

export async function reconcileCompanyQr(
  supabase: SupabaseClient,
  companyId: string,
): Promise<ReconcileSummary> {
  const { data: pending, error: pendingError } = await supabase
    .from("qr_payments")
    .select("id, reference_number, amount, virtual_account_number, invoice_id")
    .eq("company_id", companyId)
    .eq("status", "pending");

  if (pendingError) {
    console.error(`qr reconcile: cannot read pending for ${companyId}`, pendingError.message);
    return { checked: 0, settled: 0, mismatched: 0 };
  }
  if (!pending?.length) return { checked: 0, settled: 0, mismatched: 0 };

  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);

  // Only rows carrying one of the two threads back to a QR. Everything else
  // cannot match by construction, so there is no reason to load it.
  const { data: txs, error: txError } = await supabase
    .from("transactions")
    .select("id, amount, payment_reference, virtual_account_number")
    .eq("company_id", companyId)
    .gte("transaction_date", since.toISOString().slice(0, 10))
    .or("payment_reference.not.is.null,virtual_account_number.not.is.null");

  if (txError) {
    console.error(`qr reconcile: cannot read transactions for ${companyId}`, txError.message);
    return { checked: pending.length, settled: 0, mismatched: 0 };
  }

  const { matched, mismatched } = matchQrPayments(
    pending as PendingQr[],
    (txs ?? []) as CandidateTx[],
  );

  for (const m of matched) {
    // Guarded on `status = 'pending'` so a concurrent webhook and poll cannot
    // both settle the same QR and fire two "invoice paid" transitions.
    const { data: claimed } = await supabase
      .from("qr_payments")
      .update({
        status: "paid",
        paid_transaction_id: m.transaction_id,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", m.qr_id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (!claimed) continue;

    if (m.invoice_id) {
      // `advanced` means the receivable was already financed against, so the
      // money arriving does not put it back to a plain "paid" — that would
      // erase the fact that it was advanced.
      await supabase
        .from("invoices")
        .update({ status: "paid", updated_at: new Date().toISOString() })
        .eq("id", m.invoice_id)
        .eq("company_id", companyId)
        .in("status", ["pending", "overdue"]);
    }

    console.log(
      `qr ${m.qr_id} settled by ${m.transaction_id} (${m.basis}), invoice ${m.invoice_id ?? "none"}`,
    );
  }

  for (const x of mismatched) {
    // Deliberately only logged. A part payment against a QR is a real event
    // that a person has to decide about; closing it automatically would hide
    // money still owed, and rejecting it silently would hide money received.
    console.warn(
      `qr ${x.qr_id}: payment ${x.transaction_id} expected ${x.expected} got ${x.received} (${x.basis})`,
    );
  }

  return { checked: pending.length, settled: matched.length, mismatched: mismatched.length };
}
