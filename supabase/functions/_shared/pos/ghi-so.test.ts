/**
 * POS → sổ, chạy qua CSDL giả trong bộ nhớ: tiền mặt vào sổ đúng một lần, tiền về khớp lần bán và được phân
 * loại "tiền bán hàng", webhook gửi lại không ghi hai lần, sai số tiền không khớp.
 */
import { describe, expect, it } from 'vitest';
import { doiSoatBanHangPos, ghiSoBan } from './ghi-so';
import { doiSoatSauKhiGhi } from '../tac-tu/doi-soat';

type Row = Record<string, unknown>;
const MAY = '00000000-0000-0000-0000-000000000000';

function dbGia(bang: Record<string, Row[]>) {
  let dem = 0;
  return {
    bang,
    from(ten: string) {
      const loc: ((r: Row) => boolean)[] = [];
      let sua: Row | null = null;
      const rows = () => (bang[ten] ??= []).filter((r) => loc.every((f) => f(r)));
      const chay = () => { const ds = rows(); if (sua) ds.forEach((r) => Object.assign(r, Object.fromEntries(Object.entries(sua!).filter(([, v]) => v !== undefined)))); return ds; };
      // deno-lint-ignore no-explicit-any
      const q: any = {
        select: () => q, order: () => q, limit: () => q, lt: () => q,
        eq: (c: string, v: unknown) => { loc.push((r) => r[c] === v); return q; },
        is: (c: string, v: unknown) => { loc.push((r) => (r[c] ?? null) === v); return q; },
        in: (c: string, v: unknown[]) => { loc.push((r) => v.includes(r[c])); return q; },
        gte: (c: string, v: string) => { loc.push((r) => String(r[c] ?? '') >= v); return q; },
        not: (c: string) => { loc.push((r) => r[c] !== null && r[c] !== undefined); return q; },
        or: () => q,
        update: (v: Row) => { sua = v; return q; },
        insert: async (v: Row | Row[]) => { for (const r of [v].flat()) (bang[ten] ??= []).push({ id: `id${++dem}`, ...r }); return { error: null }; },
        upsert: async (v: Row, o: { onConflict: string }) => {
          const khoa = o.onConflict.split(',');
          if (!(bang[ten] ??= []).some((r) => khoa.every((k) => r[k] === v[k]))) bang[ten].push({ id: `id${++dem}`, ...v });
          return { error: null };
        },
        maybeSingle: async () => ({ data: chay()[0] ?? null, error: null }),
        then: (ok: (v: unknown) => unknown) => Promise.resolve({ data: chay(), error: null }).then(ok),
      };
      return q;
    },
  };
}

const HOM_NAY = new Date().toISOString().slice(0, 10);
const banCho = (o: Row = {}): Row => ({ id: 'b1', company_id: 'c1', reference: 'MIMIK7P2QX', amount: 150_000, status: 'pending', method: 'transfer', matched_transaction_id: null, book_transaction_id: null, created_at: new Date().toISOString(), ...o });
const gdVao = (o: Row = {}): Row => ({ id: 't1', company_id: 'c1', amount: 150_000, type: 'income', payment_reference: null, merchant_name: 'NGUYEN VAN A chuyen tien MIMIK7P2QX', transaction_date: HOM_NAY, ...o });

describe('ghi sổ tiền mặt', () => {
  it('một dòng transactions source=pos + phân loại tiền bán hàng; gọi lại không ghi thêm', async () => {
    const db = dbGia({ transactions: [], revenue_classifications: [], revenue_classification_events: [] });
    const b = { id: 'b9', company_id: 'c1', amount: 35_000, reference: 'MIMIABCDEF', note: 'cà phê', sold_at: '2026-11-10T16:30:00Z', method: 'cash' as const };
    // deno-lint-ignore no-explicit-any
    const id1 = await ghiSoBan(db as any, b, 'u-1', 'ke_toan');
    // deno-lint-ignore no-explicit-any
    const id2 = await ghiSoBan(db as any, b, 'u-1', 'ke_toan');
    expect(id1).toBe(id2);
    expect(db.bang.transactions).toHaveLength(1);
    expect(db.bang.transactions[0]).toMatchObject({ amount: 35_000, type: 'income', source: 'pos', reference_id: 'pos:b9', transaction_date: '2026-11-10', is_synthetic: false });
    expect(db.bang.revenue_classifications).toHaveLength(1);
    expect(db.bang.revenue_classifications[0]).toMatchObject({ confirmed_type: 'business_revenue', revenue_effect: 'include', reason_code: 'pos_tien_mat', confirmed_by: 'u-1' });
  });
});

describe('đối soát chuyển khoản', () => {
  it('tiền về đúng mã đúng số → đã thu, phân loại tiền bán hàng (ghi đè đoán của máy)', async () => {
    const db = dbGia({
      ban_hang_pos: [banCho()],
      transactions: [gdVao()],
      revenue_classifications: [{ transaction_id: 't1', confirmed_by: MAY, confirmed_type: 'unknown', revenue_effect: 'pending' }],
      revenue_classification_events: [],
    });
    // deno-lint-ignore no-explicit-any
    const r = await doiSoatBanHangPos(db as any, 'c1');
    expect(r).toEqual({ khop: 1, lech: 0 });
    expect(db.bang.ban_hang_pos[0]).toMatchObject({ status: 'paid', matched_transaction_id: 't1', paid_basis: 'bank_match' });
    expect(db.bang.revenue_classifications[0]).toMatchObject({ confirmed_type: 'business_revenue', revenue_effect: 'include', reason_code: 'pos_chuyen_khoan' });
  });

  it('sai số tiền → vẫn chờ, không phân loại', async () => {
    const db = dbGia({ ban_hang_pos: [banCho()], transactions: [gdVao({ amount: 15_000 })], revenue_classifications: [], revenue_classification_events: [] });
    // deno-lint-ignore no-explicit-any
    expect(await doiSoatBanHangPos(db as any, 'c1')).toEqual({ khop: 0, lech: 1 });
    expect(db.bang.ban_hang_pos[0].status).toBe('pending');
    expect(db.bang.revenue_classifications).toEqual([]);
  });

  it('webhook gửi lại hai lần → lần hai không làm gì', async () => {
    const db = dbGia({ ban_hang_pos: [banCho()], transactions: [gdVao()], revenue_classifications: [], revenue_classification_events: [] });
    // deno-lint-ignore no-explicit-any
    await doiSoatSauKhiGhi(db as any, 'c1');
    // deno-lint-ignore no-explicit-any
    const lan2 = await doiSoatSauKhiGhi(db as any, 'c1');
    expect(lan2.pos).toEqual({ khop: 0, lech: 0 });
    expect(db.bang.revenue_classification_events).toHaveLength(1);
    expect(db.bang.ban_hang_pos[0]).toMatchObject({ status: 'paid', matched_transaction_id: 't1' });
  });

  it('người đã phân loại khoản đó là khác → giữ quyết định của người', async () => {
    const db = dbGia({ ban_hang_pos: [banCho()], transactions: [gdVao()], revenue_classifications: [{ transaction_id: 't1', confirmed_by: 'u-1', confirmed_type: 'personal', revenue_effect: 'exclude' }], revenue_classification_events: [] });
    // deno-lint-ignore no-explicit-any
    await doiSoatBanHangPos(db as any, 'c1');
    expect(db.bang.revenue_classifications[0]).toMatchObject({ confirmed_by: 'u-1', confirmed_type: 'personal' });
  });

  it('đã xác nhận tay rồi tiền mới về → gắn giao dịch, gỡ dòng sổ tạm khỏi doanh thu (không cộng hai lần)', async () => {
    const db = dbGia({
      ban_hang_pos: [banCho({ status: 'paid', paid_basis: 'manual', book_transaction_id: 'tam' })],
      transactions: [gdVao(), { id: 'tam', company_id: 'c1', amount: 150_000, type: 'income', reference_id: 'pos:b1', transaction_date: HOM_NAY }],
      revenue_classifications: [{ transaction_id: 'tam', confirmed_by: 'u-1', confirmed_type: 'business_revenue', revenue_effect: 'include' }],
      revenue_classification_events: [],
    });
    // deno-lint-ignore no-explicit-any
    await doiSoatBanHangPos(db as any, 'c1');
    expect(db.bang.ban_hang_pos[0]).toMatchObject({ paid_basis: 'manual_then_bank', matched_transaction_id: 't1' });
    const tam = db.bang.revenue_classifications.find((r) => r.transaction_id === 'tam');
    const that = db.bang.revenue_classifications.find((r) => r.transaction_id === 't1');
    expect(tam).toMatchObject({ revenue_effect: 'exclude', reason_code: 'pos_trung_sao_ke' });
    expect(that).toMatchObject({ revenue_effect: 'include' });
  });
});
