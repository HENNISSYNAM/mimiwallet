/**
 * Đối soát sau khi ghi giao dịch ngân hàng (12/10/2026): trước ngày này `doiSoatChiTacTu` không được ai gọi —
 * khoản chi agent đã duyệt không bao giờ tự sang "đã chi". Test chạy qua CSDL giả trong bộ nhớ.
 */
import { describe, expect, it } from 'vitest';
import { doiSoatSauKhiGhi } from './doi-soat';

type Row = Record<string, unknown>;
function dbGia(bang: Record<string, Row[]>) {
  return {
    bang,
    from(ten: string) {
      const loc: ((r: Row) => boolean)[] = [];
      let sua: Row | null = null;
      const rows = () => (bang[ten] ??= []).filter((r) => loc.every((f) => f(r)));
      const chay = () => {
        const ds = rows();
        if (sua) ds.forEach((r) => Object.assign(r, sua));
        return ds;
      };
      // deno-lint-ignore no-explicit-any
      const q: any = {
        select: () => q,
        eq: (c: string, v: unknown) => { loc.push((r) => r[c] === v); return q; },
        gte: (c: string, v: string) => { loc.push((r) => String(r[c] ?? '') >= v); return q; },
        not: (c: string, _op: string, _v: unknown) => { loc.push((r) => r[c] !== null && r[c] !== undefined); return q; },
        or: () => q,
        update: (v: Row) => { sua = v; return q; },
        insert: async (v: Row) => { (bang[ten] ??= []).push(v); return { error: null }; },
        maybeSingle: async () => ({ data: chay()[0] ?? null, error: null }),
        then: (ok: (v: unknown) => unknown) => Promise.resolve({ data: chay(), error: null }).then(ok),
      };
      return q;
    },
  };
}

const HOM_NAY = new Date().toISOString().slice(0, 10);

describe('đối soát sau khi ghi giao dịch', () => {
  it('khoản chi agent đã duyệt + giao dịch ra mang đúng mã tham chiếu và số tiền → "đã chi", có nhật ký; QR không bị đụng', async () => {
    const db = dbGia({
      yeu_cau_chi: [{ id: 'y1', company_id: 'c1', tac_tu_id: 'a1', ma_tham_chieu: 'MIMIK7P2QX', so_tien: 2_000_000, trang_thai: 'da_duyet', giao_dich_id: null }],
      transactions: [{ id: 't1', company_id: 'c1', amount: 2_000_000, type: 'expense', payment_reference: 'MIMIK7P2QX', is_synthetic: false, transaction_date: HOM_NAY }],
      qr_payments: [],
      nhat_ky_tac_tu: [],
    });
    // deno-lint-ignore no-explicit-any
    const r = await doiSoatSauKhiGhi(db as any, 'c1');
    expect(r.chi_agent.khop).toBe(1);
    expect(db.bang.yeu_cau_chi[0]).toMatchObject({ trang_thai: 'da_chi', giao_dich_id: 't1', so_tien_thuc_chi: 2_000_000 });
    expect(db.bang.nhat_ky_tac_tu).toEqual([expect.objectContaining({ yeu_cau_id: 'y1', su_kien: 'da_chi', nguoi: 'he_thong' })]);
  });

  it('không có giao dịch khớp: yêu cầu vẫn "đã duyệt"; lỗi đối soát agent không làm hỏng đối soát QR', async () => {
    const db = dbGia({
      yeu_cau_chi: [{ id: 'y1', company_id: 'c1', tac_tu_id: 'a1', ma_tham_chieu: 'MIMIK7P2QX', so_tien: 2_000_000, trang_thai: 'da_duyet' }],
      transactions: [],
      qr_payments: [],
    });
    // deno-lint-ignore no-explicit-any
    const r = await doiSoatSauKhiGhi(db as any, 'c1');
    expect(r.chi_agent.khop).toBe(0);
    expect(db.bang.yeu_cau_chi[0].trang_thai).toBe('da_duyet');
    expect(r).toMatchObject({ settled: 0, mismatched: 0 });
  });
});
