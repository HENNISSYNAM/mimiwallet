import { describe, expect, it } from 'vitest';
import { docQuyenLoi, doiSoatTienVeMimi, khoaKy, laTaiKhoanMimi } from './thu-tien';

/*
 * CSDL giả trong bộ nhớ: đủ select/eq/is/gte/update/insert/upsert để chạy đúng mã thật, và có
 * ràng buộc duy nhất như bảng thật (`luot_to_khai.hoa_don_id`) để thử chuyện chạy trùng.
 */
type Dong = Record<string, unknown>;
function dbGia(bang: Record<string, Dong[]>) {
  let so = 0;
  const q = (ten: string) => {
    const loc: ((r: Dong) => boolean)[] = [];
    let capNhat: Dong | null = null;
    let traVe = false;
    const rows = () => (bang[ten] ??= []).filter((r) => loc.every((f) => f(r)));
    const chay = () => {
      if (capNhat) {
        const ds = rows();
        for (const r of ds) Object.assign(r, capNhat);
        return { data: traVe ? ds.map((r) => ({ id: r.id })) : null, error: null };
      }
      return { data: rows(), error: null };
    };
    const b: Record<string, unknown> = {
      select: () => { if (capNhat) traVe = true; return b; },
      eq: (c: string, v: unknown) => { loc.push((r) => r[c] === v); return b; },
      is: (c: string, v: unknown) => { loc.push((r) => (r[c] ?? null) === v); return b; },
      gte: (c: string, v: string) => { loc.push((r) => String(r[c]) >= v); return b; },
      update: (u: Dong) => { capNhat = u; return b; },
      maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
      insert: async (r: Dong) => {
        if (ten === 'luot_to_khai' && r.hoa_don_id && (bang[ten] ?? []).some((x) => x.hoa_don_id === r.hoa_don_id)) {
          return { error: { message: 'duplicate key value violates unique constraint' } };
        }
        (bang[ten] ??= []).push({ id: `id${++so}`, ...r });
        return { error: null };
      },
      upsert: async (r: Dong) => {
        const ds = (bang[ten] ??= []);
        const cu = ds.find((x) => x.company_id === r.company_id);
        if (cu) Object.assign(cu, r); else ds.push(r);
        return { error: null };
      },
      then: (ok: (v: unknown) => unknown) => Promise.resolve(chay()).then(ok),
    };
    return b;
  };
  return { from: q, bang };
}

const BAY_GIO = new Date('2026-09-24T08:00:00Z');
const hoaDon = (p: Dong) => ({ status: 'pending', plan: 'luot_to_khai', so_luot: null, ...p });
const tien = (p: Dong) => ({ hoa_don_id: null, ngay_giao_dich: '2026-09-24', ...p });

describe('nhận ra tài khoản của MIMI', () => {
  it('so theo chữ số, bỏ khoảng trắng', () => {
    expect(laTaiKhoanMimi('0123 456 789', '0123456789')).toBe(true);
    expect(laTaiKhoanMimi('0123456788', '0123456789')).toBe(false);
  });
  it('chưa cấu hình tài khoản MIMI thì không khớp gì', () => {
    expect(laTaiKhoanMimi('0123456789', '')).toBe(false);
    expect(laTaiKhoanMimi('', '')).toBe(false);
  });
});

describe('tiền về MIMI → tự duyệt', () => {
  it('mua 4 lượt 40.000đ: tiền về đúng mã, đúng số → cộng 4 lượt', async () => {
    const db = dbGia({
      subscription_invoices: [hoaDon({ id: 'h1', company_id: 'c1', reference_code: 'MIMIABCDEF', amount: 40_000, so_luot: 4 })],
      tien_ve_mimi: [tien({ id: 't1', so_tien: 40_000, noi_dung: 'NGUYEN VAN A CHUYEN TIEN MIMIABCDEF' })],
    });
    expect(await doiSoatTienVeMimi(db, BAY_GIO)).toEqual({ da_kich_hoat: 1, lech_so_tien: 0, chua_khop: 0 });
    expect(db.bang.subscription_invoices[0].status).toBe('paid');
    expect(db.bang.tien_ve_mimi[0].hoa_don_id).toBe('h1');
    expect(db.bang.luot_to_khai).toEqual([expect.objectContaining({ company_id: 'c1', thay_doi: 4, ly_do: 'mua', hoa_don_id: 'h1' })]);
  });

  it('gói tháng: kích hoạt tới cùng ngày tháng sau', async () => {
    const db = dbGia({
      subscription_invoices: [hoaDon({ id: 'h1', company_id: 'c1', reference_code: 'MIMIGROWTH', amount: 249_000, plan: 'growth' })],
      tien_ve_mimi: [tien({ id: 't1', so_tien: 249_000, noi_dung: 'MIMIGROWTH' })],
    });
    await doiSoatTienVeMimi(db, BAY_GIO);
    expect(db.bang.subscriptions).toEqual([expect.objectContaining({ company_id: 'c1', plan: 'growth', current_period_end: '2026-10-24' })]);
  });

  it('gia hạn sớm thì cộng dồn từ ngày hết hạn cũ, không cắt mất ngày còn lại', async () => {
    const db = dbGia({
      subscription_invoices: [hoaDon({ id: 'h1', company_id: 'c1', reference_code: 'MIMIGROWTH', amount: 249_000, plan: 'growth' })],
      tien_ve_mimi: [tien({ id: 't1', so_tien: 249_000, noi_dung: 'MIMIGROWTH' })],
      subscriptions: [{ company_id: 'c1', plan: 'growth', current_period_end: '2026-10-05' }],
    });
    await doiSoatTienVeMimi(db, BAY_GIO);
    expect(db.bang.subscriptions[0].current_period_end).toBe('2026-11-05');
  });

  it('chuyển thiếu thì ghi "thiếu", không kích hoạt, không cộng lượt', async () => {
    const db = dbGia({
      subscription_invoices: [hoaDon({ id: 'h1', company_id: 'c1', reference_code: 'MIMIABCDEF', amount: 40_000, so_luot: 4 })],
      tien_ve_mimi: [tien({ id: 't1', so_tien: 30_000, noi_dung: 'MIMIABCDEF' })],
    });
    expect((await doiSoatTienVeMimi(db, BAY_GIO)).lech_so_tien).toBe(1);
    expect(db.bang.subscription_invoices[0].status).toBe('underpaid');
    expect(db.bang.luot_to_khai ?? []).toEqual([]);
  });

  it('webhook và cron chạy trùng: chỉ cộng lượt một lần', async () => {
    const db = dbGia({
      subscription_invoices: [hoaDon({ id: 'h1', company_id: 'c1', reference_code: 'MIMIABCDEF', amount: 10_000, so_luot: 1 })],
      tien_ve_mimi: [tien({ id: 't1', so_tien: 10_000, noi_dung: 'MIMIABCDEF' })],
    });
    await Promise.all([doiSoatTienVeMimi(db, BAY_GIO), doiSoatTienVeMimi(db, BAY_GIO)]);
    await doiSoatTienVeMimi(db, BAY_GIO);
    expect((await docQuyenLoi(db, 'c1', '2026-09-24')).con_luot).toBe(1);
  });

  it('tiền về không mang mã nào: để đó cho người xem, không đoán', async () => {
    const db = dbGia({
      subscription_invoices: [hoaDon({ id: 'h1', company_id: 'c1', reference_code: 'MIMIABCDEF', amount: 10_000, so_luot: 1 })],
      tien_ve_mimi: [tien({ id: 't1', so_tien: 10_000, noi_dung: 'chuyen tien' })],
    });
    expect((await doiSoatTienVeMimi(db, BAY_GIO)).chua_khop).toBe(1);
    expect(db.bang.subscription_invoices[0].status).toBe('pending');
  });
});

describe('quyền lợi', () => {
  it('gói hết hạn hôm qua thì không còn; số lượt = mua trừ đã xuất', async () => {
    const db = dbGia({
      subscriptions: [{ company_id: 'c1', plan: 'growth', current_period_end: '2026-09-23' }],
      luot_to_khai: [{ company_id: 'c1', thay_doi: 4 }, { company_id: 'c1', thay_doi: -1 }, { company_id: 'c2', thay_doi: 9 }],
    });
    expect(await docQuyenLoi(db, 'c1', '2026-09-24')).toEqual({ goi: null, con_luot: 3, gia_mot_to: 10_000 });
  });

  it('một kỳ khai có một khoá: sửa số rồi xuất lại không bị tính thêm', () => {
    expect(khoaKy('01/CNKD', { loai: 'quy', nam: 2026, quy: 3 })).toBe('01/CNKD|2026|quy|3');
    expect(khoaKy('01/TKN-CNKD', { loai: 'nam', nam: 2026 })).toBe('01/TKN-CNKD|2026|nam|');
  });
});
