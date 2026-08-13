import { describe, it, expect } from 'vitest';
import { mapGdtInvoices, revenueFromInvoices, type GdtInvoiceRaw } from './gdt-invoice-map';

const OWN = '0316794479';

/** Shaped after the example at https://cas.so/general/api/gdt-invoices. */
const invoice = (over: Partial<GdtInvoiceRaw> = {}): GdtInvoiceRaw => ({
  id: 'inv-1',
  invoiceFormCode: '01',
  invoiceFormName: 'Hóa đơn giá trị gia tăng',
  invoiceSerial: 'C26HSD',
  invoiceNumber: 262,
  seller: { taxCode: OWN, name: 'CONG TY MIMI' },
  buyer: { taxCode: '0999001100', name: 'KHACH HANG A' },
  financials: {
    currency: 'VND',
    subtotalAmount: 5_764_856,
    totalTaxAmount: 461_188,
    totalPaymentAmount: 6_226_044,
    taxRateBreakdown: [{ taxRate: '8%', taxableAmount: 5_764_856, taxAmount: 461_188 }],
  },
  timestamps: { issuedAt: '2026-03-20T17:00:00.000Z', issuancePeriod: 202603 },
  status: { invoiceStatus: 1, processingStatus: 5 },
  hashes: { invoiceLookupCode: 'V0999...', invoiceAuthCode: '001945A7' },
  ...over,
});

describe('mapGdtInvoices', () => {
  it('books an invoice we issued as revenue and one we received as cost', () => {
    const { rows } = mapGdtInvoices(
      [
        invoice(),
        invoice({
          id: 'inv-2',
          seller: { taxCode: '0999001100', name: 'NHA CUNG CAP B' },
          buyer: { taxCode: OWN, name: 'CONG TY MIMI' },
        }),
      ],
      { companyTaxCode: OWN },
    );
    expect(rows.map((r) => r.direction)).toEqual(['issued', 'received']);
  });

  it('names the other party, whichever side we are on', () => {
    const { rows } = mapGdtInvoices([invoice()], { companyTaxCode: OWN });
    expect(rows[0].counterparty_name).toBe('KHACH HANG A');

    const { rows: got } = mapGdtInvoices(
      [invoice({ seller: { taxCode: '0999001100', name: 'NHA CUNG CAP B' }, buyer: { taxCode: OWN } })],
      { companyTaxCode: OWN },
    );
    expect(got[0].counterparty_name).toBe('NHA CUNG CAP B');
  });

  it('never carries the buyer identity documents through', () => {
    // The GDT payload includes idCardNumber, passportNumber and nationality.
    // Keeping books needs none of them.
    const raw = invoice({
      buyer: {
        taxCode: '0999001100',
        name: 'KHACH HANG A',
        // deliberately extra, as the real payload has them
        ...({ idCardNumber: '079300001111', passportNumber: 'C1234567', nationality: 'VN' } as object),
      },
    });
    const { rows } = mapGdtInvoices([raw], { companyTaxCode: OWN });
    const serialised = JSON.stringify(rows[0]);
    expect(serialised).not.toContain('079300001111');
    expect(serialised).not.toContain('C1234567');
    expect(serialised).not.toContain('nationality');
  });

  it('refuses an invoice belonging to neither party rather than guessing', () => {
    const { rows, rejected } = mapGdtInvoices(
      [invoice({ seller: { taxCode: '111' }, buyer: { taxCode: '222' } })],
      { companyTaxCode: OWN },
    );
    expect(rows).toHaveLength(0);
    expect(rejected[0]).toContain('neither party matches');
  });

  it('refuses everything when the company has no tax code', () => {
    // Without it there is no way to tell revenue from cost.
    const { rows, rejected } = mapGdtInvoices([invoice()], { companyTaxCode: '' });
    expect(rows).toHaveLength(0);
    expect(rejected[0]).toContain('no company tax code');
  });

  it('compares tax codes ignoring spaces and dashes', () => {
    const { rows } = mapGdtInvoices([invoice({ seller: { taxCode: '0316-794479' } })], {
      companyTaxCode: '0316 794479',
    });
    expect(rows[0].direction).toBe('issued');
  });

  it('reads amounts that arrive as strings', () => {
    const { rows } = mapGdtInvoices(
      [invoice({ financials: { totalPaymentAmount: '6226044', totalTaxAmount: '461188' } })],
      { companyTaxCode: OWN },
    );
    expect(rows[0].total_amount).toBe(6_226_044);
    expect(rows[0].tax_amount).toBe(461_188);
  });

  it('reports an invoice with no id instead of dropping it quietly', () => {
    const { rows, rejected } = mapGdtInvoices([invoice({ id: undefined })], { companyTaxCode: OWN });
    expect(rows).toHaveLength(0);
    expect(rejected).toHaveLength(1);
  });

  it('survives missing financials without inventing amounts', () => {
    const { rows } = mapGdtInvoices([invoice({ financials: undefined })], { companyTaxCode: OWN });
    expect(rows[0].total_amount).toBe(0);
    expect(rows[0].currency).toBe('VND');
    expect(rows[0].tax_rate_breakdown).toEqual([]);
  });
});

describe('revenueFromInvoices', () => {
  const rows = (raw: GdtInvoiceRaw[]) => mapGdtInvoices(raw, { companyTaxCode: OWN }).rows;

  it('counts only what we issued', () => {
    const r = rows([
      invoice(),
      invoice({ id: 'inv-2', seller: { taxCode: '999' }, buyer: { taxCode: OWN } }),
    ]);
    expect(revenueFromInvoices(r)).toBe(6_226_044);
  });

  it('excludes an invoice no longer in force', () => {
    // A cancelled or replaced invoice counted as revenue would push a household
    // over the 1 tỷ threshold on paper alone.
    const r = rows([invoice(), invoice({ id: 'inv-2', status: { invoiceStatus: 3 } })]);
    expect(revenueFromInvoices(r)).toBe(6_226_044);
  });

  it('counts an invoice whose status GDT did not report', () => {
    const r = rows([invoice({ status: undefined })]);
    expect(revenueFromInvoices(r)).toBe(6_226_044);
  });

  it('is zero with nothing issued', () => {
    expect(revenueFromInvoices([])).toBe(0);
  });
});
