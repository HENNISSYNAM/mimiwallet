import { describe, expect, it, vi } from 'vitest';
import { danhDauNhacLoiThoi, dayThongBao, ghiThongBao, theThongBao, type MayDay } from './gui';
import type { MocThue } from '../luat/lich-thue';

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
      { id: 't1', user_id: 'u1', company_id: 'c', loai: 'han_thue', tieu_de: 'Còn 7 ngày', noi_dung: 'x', duong_dan: '/dashboard/to-khai', khoa: 'han:2026-q3:7', tao_luc: '2026-09-24T08:00:00Z', da_day_luc: null },
      { id: 't2', user_id: 'u1', company_id: 'c', loai: 'luat_moi', tieu_de: 'Văn bản mới', noi_dung: 'y', duong_dan: null, khoa: 'luat:CB-1', tao_luc: '2026-09-24T08:00:00Z', da_day_luc: null },
    ],
    dang_ky_day: [{ id: 'd1', user_id: 'u1', endpoint: 'https://push/1', p256dh: 'p', auth: 'a' }],
    cai_dat_thong_bao: [{ user_id: 'u1', loai_tat: ['luat_moi'] }],
    // Dòng thông báo chỉ được đẩy cho người còn là thành viên của đúng công ty (02/10/2026).
    thanh_vien_cong_ty: [{ company_id: 'c', user_id: 'u1' }],
  });

  it('đẩy loại đang bật, bỏ loại người dùng đã tắt, rồi đánh dấu đã xử lý cả hai', async () => {
    const db = coSan();
    const may: MayDay = { day: vi.fn(async () => {}) };
    expect(await dayThongBao(db, may, new Date('2026-09-24T09:00:00Z'))).toEqual({ da_day: 1, go_thiet_bi: 0 });
    expect(JSON.parse((may.day as ReturnType<typeof vi.fn>).mock.calls[0][1])).toMatchObject({ tieu_de: 'Còn 7 ngày', duong_dan: '/dashboard/to-khai', the: 'han:2026-q3' });
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

  it('người đã bị gỡ khỏi công ty không nhận push của dòng ghi trước khi bị gỡ', async () => {
    const db = coSan();
    db.bang.thanh_vien_cong_ty = [{ company_id: 'khac', user_id: 'u1' }];
    const may: MayDay = { day: vi.fn(async () => {}) };
    expect(await dayThongBao(db, may, new Date('2026-09-24T09:00:00Z'))).toEqual({ da_day: 0, go_thiet_bi: 0 });
    expect(may.day).not.toHaveBeenCalled();
    // Vẫn đánh dấu đã xử lý: không thử lại mãi.
    expect(db.bang.thong_bao.every((t) => t.da_day_luc)).toBe(true);
  });

  it('thông báo đã lỗi thời thì không đẩy', async () => {
    const db = coSan();
    db.bang.thong_bao[0].loi_thoi_luc = '2026-09-24T08:30:00Z';
    const may: MayDay = { day: vi.fn(async () => {}) };
    expect((await dayThongBao(db, may, new Date('2026-09-24T09:00:00Z'))).da_day).toBe(0);
  });
});

describe('tag của push theo mốc', () => {
  it('cùng một hạn: 14 → 10 → 5 ngày thay nhau; hai hạn khác nhau: hai tag', () => {
    const a14 = theThongBao('han:gtgt:2026-10-20:2026-10-20:14');
    expect(theThongBao('han:gtgt:2026-10-20:2026-10-20:5')).toBe(a14);
    expect(theThongBao('han:tndn_tam_nop:2026-q3:2026-10-30:2026-10-30:5')).not.toBe(a14);
    expect(theThongBao('luat:CB-1')).toBe('luat');
  });
});

describe('đánh dấu nhắc lỗi thời (không xoá)', () => {
  const moc = (o: Partial<MocThue>): MocThue => ({
    khoa: 'gtgt:2026-10-20', ten: 'Khai và nộp thuế GTGT (theo tháng)', loai: 'khai_va_nop', trang_thai: 'phai_lam',
    han: '2026-10-20', con_lai: 14, vi_sao: 'x', can_cu: [], ...o,
  });
  const dong = (id: string, khoa: string, loai = 'han_thue', noi_dung = 'Hạn 20/10/2026. x') =>
    ({ id, company_id: 'c', user_id: 'u1', loai, khoa, noi_dung, loi_thoi_luc: null, da_xu_ly_luc: null });

  it('hạn đã qua, mốc biến khỏi lịch, đổi trạng thái, câu hỏi cần xem đã khác, việc chờ đã xong → lỗi thời; còn đúng thì giữ', async () => {
    const db = dbGia({
      thong_bao: [
        dong('con_dung', 'han:gtgt:2026-10-20:2026-10-20:14'),
        dong('qua_han', 'han:gtgt:2026-09-20:2026-09-20:0'),
        dong('bien_mat', 'han:khai_theo_quy:2026-10-30:2026-10-30:14'),
        dong('doi_trang_thai', 'han:gtgt:2026-10-20:2026-10-20:10', 'han_thue', 'Hạn 20/10/2026, nếu việc này áp dụng cho bạn. MIMI chưa chắc: …'),
        dong('can_xem_cu', 'can_xem:2026:tong_chua_ro'),
        dong('cho_xong', 'theo_doi:v1:2026-10-01', 'viec'),
        dong('cho_con', 'theo_doi:v2:2026-10-06', 'viec'),
        dong('cho_cu', 'theo_doi:v2:2026-10-03', 'viec'),
        { ...dong('da_xu_ly', 'han:gtgt:2026-09-20:2026-09-20:1'), da_xu_ly_luc: '2026-09-19T00:00:00Z' },
      ],
      ho_so_viec: [{ id: 'v1', company_id: 'c', trang_thai: 'done' }, { id: 'v2', company_id: 'c', trang_thai: 'waiting_external' }],
    });
    const n = await danhDauNhacLoiThoi(db, 'c', { lich: [moc({})], sanSang: { ket_luan_phu_thuoc: false, cau_hoi_can_xem: null }, homNay: '2026-10-06', bayGio: new Date('2026-10-06T00:07:00Z') });
    const loiThoi = db.bang.thong_bao.filter((t) => t.loi_thoi_luc).map((t) => t.id).sort();
    expect(loiThoi).toEqual(['bien_mat', 'can_xem_cu', 'cho_cu', 'cho_xong', 'doi_trang_thai', 'qua_han']);
    expect(n).toBe(6);
    // Không xoá dòng nào; dòng người dùng đã xử lý giữ nguyên.
    expect(db.bang.thong_bao).toHaveLength(9);
    expect(db.bang.thong_bao.find((t) => t.id === 'da_xu_ly')?.loi_thoi_luc).toBeNull();
  });
});
