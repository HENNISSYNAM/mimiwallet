import { describe, expect, it } from 'vitest';
import { docSoLieuDoanhThu, tinhHoaDon, tinhTienVao } from './so-lieu';
import { docHet, QuaGioiHan } from '../doc-het';
import { docDoanhThuQuy } from '../luat/doc-su-kien';

// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

/**
 * CSDL giả trả tối đa 1000 dòng mỗi lần như PostgREST thật — kể cả khi không gọi `.range`. Chính
 * mốc này đã làm các chỗ cộng tiền cũ đọc thiếu mà không báo gì.
 */
function dbGia(bang: Record<string, Row[]>) {
  const trang: string[] = [];
  const db = {
    from(ten: string) {
      const loc: ((r: Row) => boolean)[] = [];
      let tu = 0;
      let den = Number.POSITIVE_INFINITY;
      // deno-lint-ignore no-explicit-any
      const q: any = {
        select: () => q,
        order: () => q,
        eq: (c: string, v: unknown) => { loc.push((r) => r[c] === v); return q; },
        is: (c: string, v: unknown) => { loc.push((r) => (r[c] ?? null) === v); return q; },
        gte: (c: string, v: string | number) => { loc.push((r) => r[c] >= v); return q; },
        lte: (c: string, v: string | number) => { loc.push((r) => r[c] <= v); return q; },
        range: (a: number, b: number) => { tu = a; den = b; trang.push(`${ten}:${a}`); return q; },
        then: (ok: (v: unknown) => unknown, hong: (e: unknown) => unknown) => {
          const hop = (bang[ten] ?? []).filter((r) => loc.every((f) => f(r)));
          return Promise.resolve({ data: hop.slice(tu, Math.min(den + 1, tu + 1000)), error: null }).then(ok, hong);
        },
      };
      return q;
    },
  };
  return { db, trang };
}

const gd = (id: string, amount: number, ngay: string, them: Row = {}): Row => ({
  id, company_id: 'c1', amount, type: amount >= 0 ? 'income' : 'expense', transaction_date: ngay,
  account_number: '111', counter_account_number: null, is_synthetic: false, ...them,
});

describe('tinhTienVao — bốn con số không trộn', () => {
  const ds = [
    { id: 'a', amount: 100, type: 'income', transaction_date: '2026-02-01' },  // chưa ai xác nhận
    { id: 'b', amount: 200, type: 'income', transaction_date: '2026-05-01' },  // người xác nhận: doanh thu
    { id: 'c', amount: 300, type: 'income', transaction_date: '2026-08-01' },  // người xác nhận: tiền vay
    { id: 'd', amount: 400, type: 'income', transaction_date: '2026-11-01' },  // chuyển nội bộ
    { id: 'e', amount: 70, type: 'income', transaction_date: '2026-12-31' },   // "Tôi chưa chắc"
    { id: 'f', amount: 50, type: 'expense', transaction_date: '2026-03-01' },  // tiền ra: không tính
    { id: 'g', amount: 999, type: 'income', transaction_date: '2025-12-31' },  // năm khác
  ];
  const xn = [
    { transaction_id: 'b', revenue_effect: 'include' },
    { transaction_id: 'c', revenue_effect: 'exclude' },
    // Đã xác nhận "không phải doanh thu" nhưng thực ra là chuyển nội bộ: tính một lần, ở nội bộ.
    { transaction_id: 'd', revenue_effect: 'exclude' },
    { transaction_id: 'e', revenue_effect: 'pending' },
  ];
  const s = tinhTienVao(2026, ds, xn, new Set(['d']));

  it('tách tiền vào, nội bộ, không phải doanh thu, đã xác nhận, chưa rõ', () => {
    expect(s).toMatchObject({
      so_khoan_vao: 5, tien_vao: 1070, noi_bo: 400, khong_phai_doanh_thu: 300, so_khong_phai_doanh_thu: 1,
      da_xac_nhan: 200, chua_ro: 170, so_chua_ro: 2, uoc_tinh: 370,
    });
    expect(s.tien_vao).toBe(s.noi_bo + s.khong_phai_doanh_thu + s.uoc_tinh);
    expect(s.uoc_tinh).toBe(s.da_xac_nhan + s.chua_ro);
  });

  it('khoản chưa ai xác nhận vẫn tính là doanh thu — máy không tự làm giảm doanh thu', () => {
    const khongAi = tinhTienVao(2026, ds, [], new Set());
    expect(khongAi.uoc_tinh).toBe(1070);
    expect(khongAi.ty_le_da_giai_thich).toBe(0);
  });

  it('"Tôi chưa chắc" chưa phải lời giải thích', () => {
    expect(s.ty_le_da_giai_thich).toBeCloseTo((400 + 300 + 200) / 1070, 10);
  });

  it('chia quý theo ngày giao dịch, ngày cuối quý thuộc quý đó', () => {
    const q = tinhTienVao(2026, [
      { id: '1', amount: 1, type: 'income', transaction_date: '2026-03-31' },
      { id: '2', amount: 10, type: 'income', transaction_date: '2026-04-01' },
      { id: '3', amount: 100, type: 'income', transaction_date: '2026-09-30' },
      { id: '4', amount: 1000, type: 'income', transaction_date: '2026-12-31T23:00:00' },
    ], [], new Set());
    expect(q.uoc_tinh_theo_quy).toEqual([1, 10, 100, 1000]);
  });

  it('năm chưa có tiền vào: tỷ lệ là null, không phải 0%', () => {
    expect(tinhTienVao(2026, [], [], new Set()).ty_le_da_giai_thich).toBeNull();
  });
});

describe('tinhHoaDon', () => {
  it('chỉ hoá đơn đã xuất và còn hiệu lực', () => {
    const hd = tinhHoaDon([
      { direction: 'issued', invoice_status: 1, total_amount: 100, issuance_period: 202602 },
      { direction: 'issued', invoice_status: null, total_amount: 10, issuance_period: 202611 },
      { direction: 'issued', invoice_status: '1', total_amount: 1, issuance_period: 202607 },
      { direction: 'issued', invoice_status: 3, total_amount: 5000, issuance_period: 202605 },
      { direction: 'received', invoice_status: 1, total_amount: 7000, issuance_period: 202605 },
    ]);
    expect(hd).toEqual({ tong: 111, theo_quy: [100, 0, 1, 10], so: 3 });
  });

  it('không có hoá đơn thì null — khác với "hoá đơn tổng 0 đồng"', () => {
    expect(tinhHoaDon([{ direction: 'received', total_amount: 5 }])).toBeNull();
  });
});

describe('docHet', () => {
  it('đọc đủ qua nhiều trang', async () => {
    const rows = Array.from({ length: 2500 }, (_, i) => ({ i }));
    const r = await docHet(async (a, b) => ({ data: rows.slice(a, Math.min(b + 1, a + 1000)), error: null }), 'dòng');
    expect(r).toHaveLength(2500);
  });

  it('lỗi thì ném, không trả tổng thiếu', async () => {
    await expect(docHet(async () => ({ data: null, error: { message: 'mất kết nối' } }), 'giao dịch'))
      .rejects.toThrow('Không đọc được giao dịch: mất kết nối');
  });

  it('quá giới hạn thì báo, không cắt im lặng', async () => {
    await expect(docHet(async () => ({ data: Array.from({ length: 1000 }, () => ({})), error: null }), 'dòng', 3000))
      .rejects.toBeInstanceOf(QuaGioiHan);
  });
});

describe('docSoLieuDoanhThu — một nguồn cho Tổng quan và tờ khai', () => {
  // 1500 khoản bán hàng 1 triệu: 1,5 tỷ — vượt mốc 1 tỷ. Đọc một lần chỉ thấy 1000 triệu.
  const banHang = Array.from({ length: 1500 }, (_, i) =>
    gd(`s${String(i).padStart(4, '0')}`, 1_000_000, `2026-${String((i % 12) + 1).padStart(2, '0')}-15`));
  const bang = {
    transactions: [
      ...banHang,
      gd('vay', 200_000_000, '2026-03-10'),
      gd('gia', 900_000_000, '2026-04-10', { is_synthetic: true }),
    ],
    revenue_classifications: [{ company_id: 'c1', transaction_id: 'vay', revenue_effect: 'exclude' }],
    gdt_invoices: [],
    bank_connections: [{ company_id: 'c1', account_number: '111', revoked_at: null }],
    sao_ke_nhap: [],
  };

  it('đọc qua mốc 1000 dòng và trừ khoản người đã xác nhận', async () => {
    const { db, trang } = dbGia(bang);
    const s = await docSoLieuDoanhThu(db, 'c1', 2026);
    expect(s.so_giao_dich).toBe(1501);
    expect(trang.filter((t) => t.startsWith('transactions:'))).toEqual(['transactions:0', 'transactions:1000']);
    expect(s.tien_vao).toBe(1_700_000_000);
    expect(s.khong_phai_doanh_thu).toBe(200_000_000);
    expect(s.uoc_tinh).toBe(1_500_000_000);
    expect(s.hoa_don).toBeNull();
    expect(s.co_ket_noi_ngan_hang).toBe(true);
  });

  it('dòng minh hoạ chỉ được tính trong công ty demo', async () => {
    const demo = await docSoLieuDoanhThu(dbGia(bang).db, 'c1', 2026, true);
    expect(demo.tien_vao).toBe(2_600_000_000);
  });

  it('tờ khai nháp và mốc 1 tỷ ra cùng một con số', async () => {
    const s = await docSoLieuDoanhThu(dbGia(bang).db, 'c1', 2026);
    const q = await docDoanhThuQuy(dbGia(bang).db, 'c1', 2026);
    expect(q.ngan_hang).toEqual(s.uoc_tinh_theo_quy);
    expect(q.ngan_hang!.reduce((a, b) => a + b, 0)).toBe(s.uoc_tinh);
    expect(q.da_giai_trinh).toEqual({ so: 1, tong: 200_000_000 });
  });
});
