/** Prompt 5 mục 41, 43 — kịch bản vàng cho lớp thực thi (không gọi mạng thật nào). */
import { describe, expect, it } from 'vitest';
import { CHUYEN, kiemChuyen, khoaChongTrung, quaHan, thuLaiDuoc, trangThaiTuKetQua, TRANG_THAI, xacNhanConHieuLuc } from './may-trang-thai';
import { kiemNangLuc, SO_NANG_LUC } from './nang-luc';
import { duocDungO, giaLap, LoiThucThi, nguoiDungTuNop } from './nha-cung-cap';

const GOI = { tai_lieu_id: 't1', phien_ban: 2, ma_bam_noi_dung: 'a'.repeat(64), ma_bam_du_lieu: 'b'.repeat(64) };

describe('máy trạng thái', () => {
  it('mọi trạng thái có luật chuyển; không có đường tắt draft → accepted', () => {
    for (const t of TRANG_THAI) expect(CHUYEN[t]).toBeDefined();
    expect(kiemChuyen('draft', 'accepted')).toContain('Không chuyển được');
    expect(kiemChuyen('draft', 'submitted')).toContain('Không chuyển được');
  });

  it('vào "sẵn sàng" cần xác nhận; "đã gửi" cần mã tham chiếu; "chấp nhận" cần kết quả của cơ quan', () => {
    expect(kiemChuyen('needs_confirmation', 'ready')).toContain('xác nhận');
    expect(kiemChuyen('needs_confirmation', 'ready', { xac_nhan_hop_le: true })).toBeNull();
    expect(kiemChuyen('submitting', 'submitted', {})).toContain('mã tham chiếu');
    expect(kiemChuyen('waiting_external', 'accepted', {})).toContain('kết quả của cơ quan');
    expect(kiemChuyen('waiting_external', 'accepted', { ket_qua_co_quan: 'TB 123 ngày 2026-10-20' })).toBeNull();
  });

  it('(5) nhà cung cấp nhận, cơ quan chưa rõ → vẫn chờ bên ngoài, không phải "xong"', () => {
    expect(trangThaiTuKetQua('provider_received')).toBe('waiting_external');
    expect(trangThaiTuKetQua('authority_received')).toBe('waiting_external');
    expect(trangThaiTuKetQua('unknown')).toBe('waiting_external');
    expect(trangThaiTuKetQua('accepted')).toBe('accepted');
    expect(trangThaiTuKetQua('needs_amendment')).toBe('rejected');
  });
});

describe('cổng xác nhận (mục 4, 43)', () => {
  const xn = { ...GOI, boi: 'u', luc: '2026-09-26T00:00:00Z' };
  it('chưa xác nhận → không chạy', () => expect(xacNhanConHieuLuc(null, GOI).ok).toBe(false));
  it('xác nhận đúng gói → chạy', () => expect(xacNhanConHieuLuc(xn, GOI).ok).toBe(true));
  it('(3) tài liệu đổi sau khi xác nhận → mất hiệu lực', () => {
    const r = xacNhanConHieuLuc(xn, { ...GOI, phien_ban: 3, ma_bam_noi_dung: 'c'.repeat(64) });
    expect(r).toEqual({ ok: false, ly_do: 'Tài liệu đã đổi sau khi xác nhận — cần xác nhận lại bản mới.' });
  });
  it('dữ liệu gửi đi đổi → mất hiệu lực', () => expect(xacNhanConHieuLuc(xn, { ...GOI, ma_bam_du_lieu: 'd'.repeat(64) }).ok).toBe(false));
});

describe('chống trùng, thử lại, quá hạn', () => {
  it('(4) bấm Nộp hai lần → cùng một khoá', () => {
    const k = { companyId: 'c', loai: 'tax_submission' as const, maBamNoiDung: 'x', ky: '2026-Q3' };
    expect(khoaChongTrung(k)).toBe(khoaChongTrung({ ...k }));
    expect(khoaChongTrung(k)).not.toBe(khoaChongTrung({ ...k, companyId: 'khac' }));
  });
  it('(7, 8) chỉ thử lại lỗi đường truyền, và không bao giờ sau khi đã gửi', () => {
    expect(thuLaiDuoc({ ma_loi: 'MANG', da_gui: false })).toBe(true);
    expect(thuLaiDuoc({ ma_loi: 'MANG', da_gui: true })).toBe(false);
    expect(thuLaiDuoc({ ma_loi: 'DU_LIEU_SAI', da_gui: false })).toBe(false);
  });
  it('(14) nộp đúng hạn rồi chờ kết quả qua hạn → KHÔNG quá hạn', () => {
    expect(quaHan({ han: '2026-10-31', nop_luc: '2026-10-30T09:00:00Z', homNay: '2026-11-05', trang_thai: 'waiting_external' })).toBe(false);
    expect(quaHan({ han: '2026-10-31', nop_luc: null, homNay: '2026-11-05', trang_thai: 'ready' })).toBe(true);
  });
});

describe('sổ năng lực (mục 37–39)', () => {
  const tat = () => false;
  const bat = () => true;
  it('nộp tờ khai qua TVAN và ký XML: chưa hỗ trợ, kèm lý do — bật cờ cũng không mở', () => {
    for (const nl of ['tax_submission', 'tax_xml_signing'] as const) {
      const r = kiemNangLuc({ nha_cung_cap: 'cas', nang_luc: nl, moiTruong: 'production', co: bat });
      expect(r.duoc).toBe(false);
      expect(r.ly_do.length).toBeGreaterThan(20);
    }
  });
  it('ký PDF chỉ ở môi trường thử, và phải bật cờ', () => {
    expect(kiemNangLuc({ nha_cung_cap: 'cas', nang_luc: 'document_signing', moiTruong: 'production', co: bat }).duoc).toBe(false);
    expect(kiemNangLuc({ nha_cung_cap: 'cas', nang_luc: 'document_signing', moiTruong: 'sandbox', co: tat }).duoc).toBe(false);
    expect(kiemNangLuc({ nha_cung_cap: 'cas', nang_luc: 'document_signing', moiTruong: 'sandbox', co: bat }).duoc).toBe(true);
  });
  it('tự nộp: được, ở production', () => {
    expect(kiemNangLuc({ nha_cung_cap: 'nguoi_dung', nang_luc: 'manual_submission', moiTruong: 'production', co: tat }).duoc).toBe(true);
  });
  it('mọi dòng có lý do và ngày xác minh', () => {
    for (const d of SO_NANG_LUC) { expect(d.ly_do.length).toBeGreaterThan(10); expect(d.xac_minh_luc).toMatch(/^\d{4}-\d{2}-\d{2}$/); }
  });
});

describe('bộ chuyển nhà cung cấp', () => {
  it('bộ giả lập không bao giờ dùng được ngoài test (mục 38)', () => {
    expect(duocDungO(giaLap({}), 'production')).toBe(false);
    expect(duocDungO(giaLap({}), 'sandbox')).toBe(false);
    expect(duocDungO(nguoiDungTuNop, 'production')).toBe(true);
  });
  it('tự nộp: đòi biên nhận và ngày; ghi rõ nguồn là người dùng khai; không tự bịa kết quả', async () => {
    const g = { thuc_thi_id: 'e', loai: 'tax_submission', ...GOI, tham_so: {} as Record<string, string> };
    expect(nguoiDungTuNop.kiem(g)).toHaveLength(2);
    const ok = { ...g, tham_so: { bien_nhan: ' 11020260000123 ', ngay_nop: '2026-10-15' } };
    expect(nguoiDungTuNop.kiem(ok)).toEqual([]);
    expect(await nguoiDungTuNop.gui(ok)).toEqual({ tham_chieu_ngoai: '11020260000123', nguon: 'nguoi_dung_khai' });
    expect(await nguoiDungTuNop.trangThai('x')).toBeNull();
  });
  it('lỗi của nhà cung cấp mang cờ thử lại', async () => {
    const ncc = giaLap({ gui: new LoiThucThi('MANG', 'mất mạng', true) });
    await expect(ncc.gui({} as never)).rejects.toMatchObject({ ma: 'MANG', thuLai: true });
  });
});
