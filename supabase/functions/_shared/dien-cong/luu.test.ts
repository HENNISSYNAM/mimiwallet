/**
 * Phần máy chủ của điền hộ trên CSDL giả trong bộ nhớ: sai công ty, bản nháp đổi, bản mới hơn, chống trùng, chuyển trạng
 * thái sai luật, nhật ký sai khuôn. CSDL giả chỉ hiểu đúng các câu `luu.ts` dùng — RLS thật nằm ở migration.
 */
import { describe, expect, it } from 'vitest';
import { docNhiemVu, ghiBuoc, LoiDien, taoPhien } from './luu';

type Row = Record<string, unknown>;
function dbBoNho(bang: Record<string, Row[]>) {
  return {
    bang,
    from(ten: string) {
      const loc: ((r: Row) => boolean)[] = [];
      let sapXep: { cot: string; tang: boolean } | null = null;
      let gioiHan = Infinity;
      let sua: Row | null = null;
      let them: Row[] | null = null;
      const rows = () => (bang[ten] ??= []);
      const chay = () => {
        if (them) { rows().push(...them); return them; }
        let hop = rows().filter((r) => loc.every((f) => f(r)));
        if (sua) { hop.forEach((r) => Object.assign(r, sua)); return hop; }
        if (sapXep) { const { cot, tang } = sapXep; hop = [...hop].sort((a, b) => (String(a[cot]) < String(b[cot]) ? -1 : 1) * (tang ? 1 : -1)); }
        return hop.slice(0, gioiHan);
      };
      // deno-lint-ignore no-explicit-any
      const q: any = {
        select: () => q,
        eq: (c: string, v: unknown) => { loc.push((r) => r[c] === v); return q; },
        order: (cot: string, o: { ascending: boolean }) => { sapXep = { cot, tang: o.ascending }; return q; },
        limit: (n: number) => { gioiHan = n; return q; },
        insert: (v: Row | Row[]) => { them = (Array.isArray(v) ? v : [v]).map((x) => ({ ...x })); return q; },
        update: (v: Row) => { sua = v; return q; },
        maybeSingle: async () => ({ data: chay()[0] ?? null, error: null }),
        single: async () => ({ data: chay()[0], error: null }),
        then: (ok: (v: unknown) => unknown, hong: (e: unknown) => unknown) => Promise.resolve({ data: chay(), error: null }).then(ok, hong),
      };
      return q;
    },
  };
}

const NHAP = (id: string, ma_bam: string, tao: string, tong = 812_345_678, cty = 'cty-A') => ({
  id, company_id: cty, mau: '01/TKN-CNKD', nam: 2025, ky_loai: 'nam', quy: null, ma_bam, created_at: tao,
  du_lieu: {
    mau: '01/TKN-CNKD', danh_dau: [{ nhan: 'Hộ ≤ 1 tỷ', chon: true }, { nhan: 'Mới ra kinh doanh', chon: false }],
    dong: [{ ma: '[08a]', o: { tong_dt: tong, thue_gtgt: null, thue_tncn: null } }, { ma: '[11]', o: { tong_dt: tong, thue_gtgt: null, thue_tncn: null } }],
    san_sang: { trang_thai: 'san_sang' },
  },
});
const HO = { mst: '0123456789', ten: 'Hộ thử' };
const BAY_GIO = new Date('2026-10-10T10:00:00Z');
const coBan = () => dbBoNho({ to_khai_nhap: [NHAP('n1', 'a'.repeat(64), '2026-10-01T00:00:00Z')], phien_dien_cong: [], nhat_ky_dien_cong: [] });
const tao = (db: ReturnType<typeof dbBoNho>, sua: Partial<Parameters<typeof taoPhien>[1]> = {}) =>
  taoPhien(db, { companyId: 'cty-A', userId: 'u1', nhapId: 'n1', boChuyen: 'tkn-cnkd-thu', khoaChongTrung: 'dien-khoa-0001', hoSo: HO, bayGio: BAY_GIO, ...sua });

describe('phiên điền hộ — máy chủ', () => {
  it('tạo phiên từ bản nháp đã băm; cùng khoá chống trùng trả lại đúng phiên cũ, không tạo thêm', async () => {
    const db = coBan();
    const a = await tao(db);
    const b = await tao(db);
    expect(a.ok && b.ok && a.nhiem_vu.id === b.nhiem_vu.id).toBe(true);
    expect(db.bang.phien_dien_cong).toHaveLength(1);
    if (a.ok) expect(a.nhiem_vu.truong.find((t) => t.khoa === 'dt_11')?.gia_tri).toBe('812345678');
  });

  it('bản nháp của công ty khác: không tìm thấy; phiên của công ty khác: không tìm thấy (không lộ là có)', async () => {
    const db = coBan();
    db.bang.to_khai_nhap.push(NHAP('nB', 'c'.repeat(64), '2026-10-01T00:00:00Z', 1, 'cty-B'));
    await expect(tao(db, { nhapId: 'nB' })).rejects.toMatchObject({ ma: 'KHONG_THAY_NHAP', status: 404 });
    const a = await tao(db);
    if (!a.ok) throw new Error('phải tạo được');
    await expect(docNhiemVu(db, { companyId: 'cty-B', userId: 'u2', phienId: a.nhiem_vu.id, duocSoanToKhai: true, hoSo: HO, bayGio: BAY_GIO }))
      .rejects.toBeInstanceOf(LoiDien);
    await expect(ghiBuoc(db, { companyId: 'cty-B', phienId: a.nhiem_vu.id, dong: [], trangThaiMoi: 'dang_dien' })).rejects.toMatchObject({ status: 404 });
  });

  it('thiếu quyền soạn tờ khai khi tiếp tục: nhiệm vụ không còn hiệu lực', async () => {
    const db = coBan();
    const a = await tao(db);
    if (!a.ok) throw new Error('phải tạo được');
    const r = await docNhiemVu(db, { companyId: 'cty-A', userId: 'u1', phienId: a.nhiem_vu.id, duocSoanToKhai: false, hoSo: HO, bayGio: BAY_GIO });
    expect(r.ok).toBe(false);
  });

  it('bản nháp đổi sau khi tạo phiên, hoặc có bản nháp mới hơn cùng kỳ, hoặc MST hồ sơ đổi: kế hoạch cũ mất hiệu lực', async () => {
    const db = coBan();
    const a = await tao(db);
    if (!a.ok) throw new Error('phải tạo được');
    const doc = (hoSo = HO) => docNhiemVu(db, { companyId: 'cty-A', userId: 'u1', phienId: a.nhiem_vu.id, duocSoanToKhai: true, hoSo, bayGio: BAY_GIO });
    expect((await doc()).ok).toBe(true);
    expect((await doc({ mst: '9999999999', ten: 'Hộ thử' })).ok).toBe(false);
    db.bang.to_khai_nhap.push(NHAP('n2', 'b'.repeat(64), '2026-10-05T00:00:00Z', 900_000_000));
    expect((await doc()).ok).toBe(false);
    db.bang.to_khai_nhap.pop();
    (db.bang.to_khai_nhap[0] as Row).ma_bam = 'd'.repeat(64);
    expect((await doc()).ok).toBe(false);
  });

  it('hết hạn 30 phút: dừng', async () => {
    const db = coBan();
    const a = await tao(db);
    if (!a.ok) throw new Error('phải tạo được');
    const r = await docNhiemVu(db, { companyId: 'cty-A', userId: 'u1', phienId: a.nhiem_vu.id, duocSoanToKhai: true, hoSo: HO, bayGio: new Date(BAY_GIO.getTime() + 31 * 60_000) });
    expect(r.ok).toBe(false);
  });

  it('chuyển trạng thái theo luật; không nhảy thẳng sang bàn giao; nhật ký sai khuôn hoặc mang giá trị thô bị từ chối', async () => {
    const db = coBan();
    const a = await tao(db);
    if (!a.ok) throw new Error('phải tạo được');
    const id = a.nhiem_vu.id;
    await expect(ghiBuoc(db, { companyId: 'cty-A', phienId: id, dong: [], trangThaiMoi: 'ban_giao' })).rejects.toMatchObject({ ma: 'CHUYEN_SAI' });
    await ghiBuoc(db, { companyId: 'cty-A', phienId: id, dong: [], trangThaiMoi: 'dang_dien' });
    await expect(ghiBuoc(db, { companyId: 'cty-A', phienId: id, dong: [{ tac_nhan: 'bo_chay', hanh_dong: 'dien', khoa_truong: 'dt_11', ket_qua: 'ok', gia_tri: '812345678' }] }))
      .resolves.toEqual({ ok: true }); // trường lạ bị bỏ khi ghi: chỉ cột đã khai báo đi vào bảng
    expect(JSON.stringify(db.bang.nhat_ky_dien_cong)).not.toContain('812345678');
    await expect(ghiBuoc(db, { companyId: 'cty-A', phienId: id, dong: [{ tac_nhan: 'bo_chay', hanh_dong: 'dien', ket_qua: 'ok', ma_bam_gia_tri: '812345678' }] }))
      .rejects.toMatchObject({ ma: 'NHAT_KY_SAI' });
    await ghiBuoc(db, { companyId: 'cty-A', phienId: id, dong: [], trangThaiMoi: 'da_doi_chieu' });
    await ghiBuoc(db, { companyId: 'cty-A', phienId: id, dong: [], trangThaiMoi: 'ban_giao' });
    await expect(ghiBuoc(db, { companyId: 'cty-A', phienId: id, dong: [], trangThaiMoi: 'dang_dien' })).rejects.toMatchObject({ ma: 'CHUYEN_SAI' });
    // Phiên điền không có trạng thái "đã nộp" / "đã chấp nhận" — trạng thái hồ sơ nằm ở luồng nộp riêng.
    await expect(ghiBuoc(db, { companyId: 'cty-A', phienId: id, dong: [], trangThaiMoi: 'da_nop' })).rejects.toMatchObject({ ma: 'TRANG_THAI_SAI' });
  });
});
