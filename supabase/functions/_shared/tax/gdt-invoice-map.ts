/**
 * Narrow a GDT e-invoice down to what bookkeeping needs.
 *
 * Two reasons this is a pure function with tests rather than a few lines inside
 * the sync handler.
 *
 * **It decides revenue.** An invoice this company issued is revenue; one it
 * received is cost. Getting the direction backwards would move money to the
 * wrong side of the books, and revenue is what the 1 tỷ/năm exemption threshold
 * is measured against — so the error would not just be wrong, it would be wrong
 * about somebody's tax liability.
 *
 * **The source carries far more than we want.** A GDT invoice includes the
 * buyer's `idCardNumber`, `passportNumber`, `nationality`, phone, email and
 * bank account, plus digital-signature certificates for all parties. None of
 * that is needed to keep books. This maps an allow-list, so a field nobody
 * asked for cannot arrive by accident — including fields the tax authority
 * adds after this was written.
 */

export interface GdtInvoiceRaw {
  id?: string;
  invoiceFormCode?: string;
  invoiceFormName?: string;
  invoiceSerial?: string;
  invoiceNumber?: number | string;
  seller?: { taxCode?: string; name?: string };
  buyer?: { taxCode?: string; name?: string; displayName?: string };
  financials?: {
    currency?: string;
    subtotalAmount?: number | string;
    totalTaxAmount?: number | string;
    totalPaymentAmount?: number | string;
    taxRateBreakdown?: Array<{
      taxRate?: string;
      taxableAmount?: number | string;
      taxAmount?: number | string;
    }>;
  };
  timestamps?: { issuedAt?: string; issuancePeriod?: number | string };
  status?: { invoiceStatus?: number; processingStatus?: number };
  hashes?: { invoiceLookupCode?: string; invoiceAuthCode?: string };
}

export type InvoiceDirection = 'issued' | 'received';

export interface GdtInvoiceRow {
  gdt_id: string;
  direction: InvoiceDirection;
  invoice_serial: string | null;
  invoice_number: string | null;
  invoice_form_code: string | null;
  invoice_form_name: string | null;
  /** The other party. Tax code and name only — never their ID document. */
  counterparty_tax_code: string | null;
  counterparty_name: string | null;
  currency: string;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  tax_rate_breakdown: Array<{ rate: string; taxable: number; tax: number }>;
  issued_at: string | null;
  issuance_period: number | null;
  invoice_lookup_code: string | null;
  invoice_auth_code: string | null;
  invoice_status: number | null;
}

export interface MapGdtOptions {
  /** The company's own tax code. Decides which side of the invoice it is on. */
  companyTaxCode: string;
}

export interface MapGdtResult {
  rows: GdtInvoiceRow[];
  /** Invoices that could not be mapped, with the reason. Never silently dropped. */
  rejected: string[];
}

function num(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** Tax codes are compared without spaces or dashes: "0316-794479" is one code. */
function normaliseTaxCode(v: unknown): string {
  return typeof v === 'string' ? v.replace(/[\s-]/g, '') : '';
}

export function mapGdtInvoices(
  invoices: GdtInvoiceRaw[],
  options: MapGdtOptions,
): MapGdtResult {
  const own = normaliseTaxCode(options.companyTaxCode);
  const rows: GdtInvoiceRow[] = [];
  const rejected: string[] = [];

  if (!own) {
    // Without the company's own tax code there is no way to tell revenue from
    // cost, and guessing would put money on the wrong side of the books.
    return { rows: [], rejected: [`no company tax code: ${invoices.length} invoices skipped`] };
  }

  for (const inv of invoices) {
    const id = str(inv.id);
    if (!id) {
      rejected.push('invoice without an id');
      continue;
    }

    const sellerTax = normaliseTaxCode(inv.seller?.taxCode);
    const buyerTax = normaliseTaxCode(inv.buyer?.taxCode);

    let direction: InvoiceDirection;
    if (sellerTax === own) direction = 'issued';
    else if (buyerTax === own) direction = 'received';
    else {
      // Neither side is us. Rather than assume, say so — an invoice booked to
      // the wrong company is worse than one left out and reported.
      rejected.push(`${id}: neither party matches ${own} (seller ${sellerTax || '?'}, buyer ${buyerTax || '?'})`);
      continue;
    }

    const f = inv.financials ?? {};
    const other = direction === 'issued' ? inv.buyer : inv.seller;

    rows.push({
      gdt_id: id,
      direction,
      invoice_serial: str(inv.invoiceSerial),
      invoice_number: inv.invoiceNumber != null ? String(inv.invoiceNumber) : null,
      invoice_form_code: str(inv.invoiceFormCode),
      invoice_form_name: str(inv.invoiceFormName),
      counterparty_tax_code: str(other?.taxCode),
      counterparty_name:
        str((other as { displayName?: string } | undefined)?.displayName) ?? str(other?.name),
      currency: str(f.currency) ?? 'VND',
      subtotal_amount: num(f.subtotalAmount),
      tax_amount: num(f.totalTaxAmount),
      total_amount: num(f.totalPaymentAmount),
      tax_rate_breakdown: (f.taxRateBreakdown ?? [])
        .filter(Boolean)
        .map((b) => ({
          rate: str(b?.taxRate) ?? '',
          taxable: num(b?.taxableAmount),
          tax: num(b?.taxAmount),
        })),
      issued_at: str(inv.timestamps?.issuedAt),
      issuance_period:
        inv.timestamps?.issuancePeriod != null ? num(inv.timestamps.issuancePeriod) : null,
      invoice_lookup_code: str(inv.hashes?.invoiceLookupCode),
      invoice_auth_code: str(inv.hashes?.invoiceAuthCode),
      invoice_status: typeof inv.status?.invoiceStatus === 'number' ? inv.status.invoiceStatus : null,
    });
  }

  return { rows, rejected };
}

/**
 * Revenue for a period, straight from what the tax authority holds.
 *
 * This is the number the 1 tỷ exemption is measured against, and until now it
 * could only be inferred from bank statement descriptions. An issued invoice is
 * not an inference.
 *
 * Cancelled invoices are excluded: GDT `invoiceStatus` 1 means in force.
 * Anything else — replaced, adjusted, cancelled — must not count as revenue,
 * and counting it would push a household over the threshold on paper.
 */
export function revenueFromInvoices(rows: GdtInvoiceRow[]): number {
  return rows
    .filter((r) => r.direction === 'issued' && (r.invoice_status === null || r.invoice_status === 1))
    .reduce((sum, r) => sum + r.total_amount, 0);
}
