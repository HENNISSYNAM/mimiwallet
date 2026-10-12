import { describe, expect, it } from 'vitest';
import { docBanSuaTraLoi, docTraLoiNghiaVu, traLoiTuDong, xuLyHoSoNghiaVu } from './ho-so-nghia-vu';
import { suyLuan, type SuKienThue } from './he-luat';
import { lichThue } from './lich-thue';
import type { VaiTro } from '../quyen/vai-tro';

/**
 * CSDL giả: một dòng `ho_so_thue` và một dòng `companies`. `upsert` gộp đúng các cột được gửi, như
 * PostgREST `merge-duplicates` — để kiểm "trả lời một câu không xoá các câu khác".
 */
function csdl(dau: Record<string, unknown> | null = null, o: { loiDoc?: string; loaiTheoMst?: string | null } = {}) {
  const st = { hs: dau ? { ...dau } : null as Record<string, unknown> | null, upsert: [] as Record<string, unknown>[] };
  const db = {
    rpc: async () => ({ data: true, error: null }),
    from: (bang: string) => {
      const q = {
        select: () => q, eq: () => q,
        maybeSingle: async () => {
          if (bang === 'companies') return { data: { loai_theo_mst: o.loaiTheoMst ?? null }, error: null };
          if (o.loiDoc) return { data: null, error: { message: o.loiDoc } };
          return { data: st.hs, error: null };
        },
        upsert: async (dong: Record<string, unknown>) => {
          st.upsert.push(dong);
          st.hs = { ...(st.hs ?? {}), ...dong };
          return { error: null };
        },
      };
      return q;
    },
  };
  return { db, st };
}

const ctx = (vaiTro: VaiTro) => ({ companyId: 'cty-1', userId: 'u-1', vaiTro });

describe('kiểm câu trả lời gửi lên', () => {
  it('nhận đúng lựa chọn hoặc null (xoá), từ chối trường lạ và giá trị lạ', () => {
    expect(docBanSuaTraLoi({ tra_luong: true })).toEqual({ ok: true, sua: { tra_luong: true } });
    expect(docBanSuaTraLoi({ ky_khai_gtgt: null })).toEqual({ ok: true, sua: { ky_khai_gtgt: null } });
    expect(docBanSuaTraLoi({ ky_khai_gtgt: 'nam' }).ok).toBe(false);
    expect(docBanSuaTraLoi({ tra_luong: 'co' }).ok).toBe(false);
    expect(docBanSuaTraLoi({ loai_nguoi_nop: 'doanh_nghiep' }).ok).toBe(false);
    expect(docBanSuaTraLoi({}).ok).toBe(false);
    expect(docBanSuaTraLoi(null).ok).toBe(false);
  });

  it('dòng CSDL có giá trị lạ → coi như chưa trả lời', () => {
    expect(traLoiTuDong({ tra_luong: 'x', ky_khai_gtgt: 'quy', sieu_nho: null })).toEqual({ tra_luong: null, ky_khai_gtgt: 'quy', sieu_nho: null, phuong_phap_tndn: null });
  });
});

describe('quyền ghi — cùng quyền "sửa hồ sơ thuế" như luu_ho_so', () => {
  for (const vai of ['nguoi_xem', 'nguoi_duyet'] as VaiTro[]) {
    it(`${vai} KHÔNG ghi được câu trả lời, ngành, hay xác nhận nhóm — 403, CSDL không đổi`, async () => {
      const { db, st } = csdl();
      for (const [hd, than] of [
        ['luu_tra_loi_nghia_vu', { tra_loi: { tra_luong: true } }],
        ['luu_nganh', { nganh: [{ ma: '4711', ten: 'Bán lẻ' }] }],
        ['luu_nganh', { xac_nhan_nhom: 'phan_phoi_hang_hoa' }],
      ] as const) {
        const r = await xuLyHoSoNghiaVu(db, ctx(vai), hd, than);
        expect(r.status).toBe(403);
        expect(r.body.ma).toBe('KHONG_DU_QUYEN');
        expect(String(r.body.error)).toContain('Kế toán');
      }
      expect(st.upsert).toHaveLength(0);
    });
  }

  it('người xem vẫn ĐỌC được ngành', async () => {
    const { db } = csdl({ nganh_vsic: [{ ma: '4711', ten: 'Bán lẻ' }], nganh_chinh: '4711', nhom_nganh: [] });
    const r = await xuLyHoSoNghiaVu(db, ctx('nguoi_xem'), 'doc_nganh', {});
    expect(r.status).toBe(200);
    expect(r.body.nganh_chinh).toBe('4711');
  });

  it('kế toán ghi được; chỉ ghi trường được gửi, không đè câu đã trả lời trước', async () => {
    const { db, st } = csdl({ ky_khai_gtgt: 'quy', nhom_nganh: ['dich_vu'] });
    const r = await xuLyHoSoNghiaVu(db, ctx('ke_toan'), 'luu_tra_loi_nghia_vu', { tra_loi: { tra_luong: true } });
    expect(r.status).toBe(200);
    expect(st.upsert[0]).toMatchObject({ company_id: 'cty-1', tra_luong: true, updated_by: 'u-1' });
    expect('ky_khai_gtgt' in st.upsert[0]).toBe(false);
    expect(r.body.tra_loi).toEqual({ tra_luong: true, ky_khai_gtgt: 'quy', sieu_nho: null, phuong_phap_tndn: null });
  });

  it('câu trả lời sai → 400, không ghi', async () => {
    const { db, st } = csdl();
    const r = await xuLyHoSoNghiaVu(db, ctx('chu_so_huu'), 'luu_tra_loi_nghia_vu', { tra_loi: { ky_khai_gtgt: 'nam' } });
    expect(r.status).toBe(400);
    expect(st.upsert).toHaveLength(0);
  });
});

describe('lưu xong → lịch đọc lại đổi đúng (đường doc-lich-thue)', () => {
  const NGAY = '2026-10-12';
  const sk: SuKienThue = {
    nam: 2026, homNay: NGAY, loai: 'doanh_nghiep', doanhThuQuy: null, nguonDoanhThu: null, nhomNganh: [], kenh: null,
    phuongPhapTncn: null, batDauKinhDoanh: null, daNopThueTrongNam: null, nganhDacThu: null, doanhThuNamTruoc: null, coQuanHeLienKet: null,
  };
  const lichTu = async (db: unknown) => {
    const tl = await docTraLoiNghiaVu(db, 'cty-1');
    return lichThue({ sk, sl: suyLuan(sk), homNay: NGAY, kyKhaiGtgt: tl.ky_khai_gtgt, sieuNho: tl.sieu_nho, phuongPhapTndn: tl.phuong_phap_tndn, traLuong: tl.tra_luong });
  };

  it('trả lời "có trả lương" + "khai GTGT theo tháng" → 05/KK-TNCN phải làm, GTGT hạn 20/10', async () => {
    const { db } = csdl();
    expect((await lichTu(db)).find((m) => m.khoa === 'tncn_khai_quy:2026-q3')?.trang_thai).toBe('can_xac_minh');
    await xuLyHoSoNghiaVu(db, ctx('ke_toan'), 'luu_tra_loi_nghia_vu', { tra_loi: { tra_luong: true } });
    await xuLyHoSoNghiaVu(db, ctx('ke_toan'), 'luu_tra_loi_nghia_vu', { tra_loi: { ky_khai_gtgt: 'thang' } });
    const l = await lichTu(db);
    expect(l.find((m) => m.khoa === 'tncn_khai_quy:2026-q3')).toMatchObject({ trang_thai: 'phai_lam', han: '2026-10-31' });
    expect(l.find((m) => m.khoa.startsWith('gtgt:'))?.han).toBe('2026-10-20');
    expect(l.some((m) => m.khoa === 'gtgt_ky_khai')).toBe(false);
    // Sửa lại: xoá câu trả lời → quay về cần xác minh.
    await xuLyHoSoNghiaVu(db, ctx('ke_toan'), 'luu_tra_loi_nghia_vu', { tra_loi: { tra_luong: null } });
    expect((await lichTu(db)).find((m) => m.khoa === 'tncn_khai_quy:2026-q3')?.trang_thai).toBe('can_xac_minh');
  });

  it('migration chưa áp (lỗi đọc cột) → lịch không hỏng, coi như chưa trả lời', async () => {
    const { db } = csdl(null, { loiDoc: 'column ho_so_thue.tra_luong does not exist' });
    expect(await docTraLoiNghiaVu(db, 'cty-1')).toEqual({ tra_luong: null, ky_khai_gtgt: null, sieu_nho: null, phuong_phap_tndn: null });
  });
});

describe('ngành VSIC và gợi ý nhóm cho hộ kinh doanh', () => {
  it('lưu ngành, ngành chính mặc định là ngành đầu; hộ kinh doanh nhận gợi ý, xác nhận thì THÊM nhóm', async () => {
    const { db, st } = csdl({ nhom_nganh: ['dich_vu'] }, { loaiTheoMst: 'ho_kinh_doanh' });
    const r = await xuLyHoSoNghiaVu(db, ctx('chu_so_huu'), 'luu_nganh', { nganh: [{ ma: '4711', ten: 'Bán lẻ trong cửa hàng tổng hợp' }, { ma: '5610', ten: 'Nhà hàng' }] });
    expect(r.status).toBe(200);
    expect(r.body.nganh_chinh).toBe('4711');
    expect(r.body.goi_y).toMatchObject({ ma: '4711', nhom: 'phan_phoi_hang_hoa', da_co: false });
    // Chưa xác nhận thì hồ sơ thuế chưa đổi.
    expect(st.hs?.nhom_nganh).toEqual(['dich_vu']);
    const x = await xuLyHoSoNghiaVu(db, ctx('chu_so_huu'), 'luu_nganh', { xac_nhan_nhom: 'phan_phoi_hang_hoa' });
    expect(st.hs?.nhom_nganh).toEqual(['dich_vu', 'phan_phoi_hang_hoa']);
    expect(x.body.goi_y.da_co).toBe(true);
  });

  it('doanh nghiệp: lưu ngành nhưng không gợi ý nhóm tỷ lệ của hộ', async () => {
    const { db } = csdl(null, { loaiTheoMst: 'doanh_nghiep' });
    const r = await xuLyHoSoNghiaVu(db, ctx('chu_so_huu'), 'luu_nganh', { nganh: [{ ma: '4711', ten: 'Bán lẻ' }] });
    expect(r.body.goi_y).toBeNull();
  });

  it('ngành chính không nằm trong danh sách, nhóm lạ → 400', async () => {
    const { db, st } = csdl();
    expect((await xuLyHoSoNghiaVu(db, ctx('chu_so_huu'), 'luu_nganh', { nganh: [{ ma: '4711', ten: 'Bán lẻ' }], nganh_chinh: '5610' })).status).toBe(400);
    expect((await xuLyHoSoNghiaVu(db, ctx('chu_so_huu'), 'luu_nganh', { xac_nhan_nhom: 'ban_si' })).status).toBe(400);
    expect(st.upsert).toHaveLength(0);
  });
});
