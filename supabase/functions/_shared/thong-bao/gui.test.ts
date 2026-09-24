import { describe, expect, it, vi } from 'vitest';
import { dayThongBao, ghiThongBao, type MayDay } from './gui';

/** CSDL giả đủ cho ghi và đẩy thông báo, có khoá duy nhất (user_id, company_id, khoa). */
function dbGia(bang: Record<string, Record<string, unknown>[]>) {
  const q = (ten: string) => {
    const loc: ((r: Record<string, unknown>) => boolean)[] = [];
    let capNhat: Record<string, unknown> | null = null;
    let xoa = false;
    let chen: Record<string, unknown>[] | null = null;
    const rows = () => (bang[ten] ??= []).filter((r) => loc.every((f) => f(r)));
    const b: Record<string, unknown> = {
      select: () => b, order: () => b, limit: () => b,
      eq: (c: string, v: unknown) => { loc.push((r) => r[c] === v); return b; },
      is: (c: string, v: unknown) => { loc.push((r) => (r[c] ?? null) === v); return b; },
      gte: (c: string, v: string) => { loc.push((r) => String(r[c]) >= v); return b; },
      in: (c: string, v: unknown[]) => { loc.push((r) => v.includes(r[c])); return b; },
      maybeSingle: async () => ({ data: rows()[0] ?? null }),
      update: (u: Record<string, unknown>) => { capNhat = u; return b; },
      delete: () => { xoa = true; return b; },
      upsert: (ds: Record<string, unknown>[]) => {
        const moi: Record<string, unknown>[] = [];
        for (const r of ds) {
          const trung = (bang[ten] ??= []).some((x) => x.user_id === r.user_id && x.company_id === r.company_id && x.khoa === r.khoa);
          if (!trung) { const d = { id: `tb${bang[ten].length + 1}`, tao_luc: '2026-09-24T08:00:00Z', da_day_luc: null, ...r }; bang[ten].push(d); moi.push(d); }
        }
        chen = moi;
        return b;
      },
      then: (ok: (v: unknown) => unknown) => {
        if (chen) return Promise.resolve({ data: chen, error: null }).then(ok);
        if (capNhat) { for (const r of rows()) Object.assign(r, capNhat); return Promise.resolve({ error: null }).then(ok); }
        if (xoa) { bang[ten] = (bang[ten] ?? []).filter((r) => !loc.every((f) => f(r))); return Promise.resolve({ error: null }).then(ok); }
        return Promise.resolve({ data: rows(), error: null }).then(ok);
      },
    };
    return b;
  };
  return { from: q, bang };
}

const NHAP = [{ khoa: 'han:2026-q3:7', loai: 'han_thue' as const, muc_do: 'can_chu_y' as const, tieu_de: 'Còn 7 ngày', noi_dung: 'x', duong_dan: '/dashboard/to-khai', hanh_dong: [] }];

describe('ghi thông báo', () => {
  it('mỗi người nhận một dòng; chạy lại không báo hai lần', async () => {
    const db = dbGia({ thanh_vien_cong_ty: [{ company_id: 'c', user_id: 'u1' }, { company_id: 'c', user_id: 'u2' }], companies: [{ id: 'c', user_id: 'u1' }] });
    expect(await ghiThongBao(db, 'c', NHAP)).toBe(2);
    expect(await ghiThongBao(db, 'c', NHAP)).toBe(0);
    expect(db.bang.thong_bao).toHaveLength(2);
  });
});

describe('đẩy thông báo', () => {
  const coSan = () => dbGia({
    thong_bao: [
      { id: 't1', user_id: 'u1', loai: 'han_thue', tieu_de: 'Còn 7 ngày', noi_dung: 'x', duong_dan: '/dashboard/to-khai', khoa: 'han:2026-q3:7', tao_luc: '2026-09-24T08:00:00Z', da_day_luc: null },
      { id: 't2', user_id: 'u1', loai: 'luat_moi', tieu_de: 'Văn bản mới', noi_dung: 'y', duong_dan: null, khoa: 'luat:CB-1', tao_luc: '2026-09-24T08:00:00Z', da_day_luc: null },
    ],
    dang_ky_day: [{ id: 'd1', user_id: 'u1', endpoint: 'https://push/1', p256dh: 'p', auth: 'a' }],
    cai_dat_thong_bao: [{ user_id: 'u1', loai_tat: ['luat_moi'] }],
  });

  it('đẩy loại đang bật, bỏ loại người dùng đã tắt, rồi đánh dấu đã xử lý cả hai', async () => {
    const db = coSan();
    const may: MayDay = { day: vi.fn(async () => {}) };
    expect(await dayThongBao(db, may, new Date('2026-09-24T09:00:00Z'))).toEqual({ da_day: 1, go_thiet_bi: 0 });
    expect(JSON.parse((may.day as ReturnType<typeof vi.fn>).mock.calls[0][1])).toMatchObject({ tieu_de: 'Còn 7 ngày', duong_dan: '/dashboard/to-khai', the: 'han' });
    expect(db.bang.thong_bao.every((t) => t.da_day_luc)).toBe(true);
  });

  it('thiết bị đã huỷ (410): gỡ đăng ký', async () => {
    const db = coSan();
    const may: MayDay = { day: vi.fn(async () => { throw Object.assign(new Error('gone'), { isGone: () => true }); }) };
    expect((await dayThongBao(db, may, new Date('2026-09-24T09:00:00Z'))).go_thiet_bi).toBe(1);
    expect(db.bang.dang_ky_day).toEqual([]);
  });

  it('chưa cấu hình khoá đẩy: vẫn đánh dấu, không ném lỗi — thông báo vẫn ở trong app', async () => {
    const db = coSan();
    expect(await dayThongBao(db, null, new Date('2026-09-24T09:00:00Z'))).toEqual({ da_day: 0, go_thiet_bi: 0 });
  });
});
