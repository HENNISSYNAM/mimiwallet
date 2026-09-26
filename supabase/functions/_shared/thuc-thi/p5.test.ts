/** Prompt 5 — sự kiện ngoài, xung đột hoá đơn, kiểm trước khi nộp, trợ lý (không gọi mạng nào). */
import { describe, expect, it } from 'vitest';
import { chuanHoaSuKien, xungDotHoaDon } from './su-kien-ngoai';
import { kiemTruocKhiNop } from './luu';
import { nhanYDinh } from '../tro-ly/y-dinh';
import { NANG_LUC, duLieuTrong, type DuLieu } from '../tro-ly/tinh-toan';

const moi = (p: Partial<DuLieu> = {}): DuLieu => ({ ...duLieuTrong('2026-09-26', { tu: '2026-07-01', den: '2026-09-30', nhan: 'q3' }), ...p });

describe('(10) webhook là gợi ý', () => {
  const sk = (p: Partial<Parameters<typeof chuanHoaSuKien>[0]>) => chuanHoaSuKien({ loai: 'TRANSACTIONS', ma: null, doi_tuong: null, moi_truong: 'production', khoa_hop_le: true, da_kiem_lai_nguon: false, ...p });
  it('chưa hỏi lại nguồn → chưa được đổi trạng thái', () => expect(sk({})).toMatchObject({ verification_status: 'unverified', duoc_doi_trang_thai: false }));
  it('đã hỏi lại nguồn → được', () => expect(sk({ da_kiem_lai_nguon: true })).toMatchObject({ verification_status: 'verified', duoc_doi_trang_thai: true }));
  it('khoá giả / sai → từ chối', () => expect(sk({ khoa_hop_le: false, da_kiem_lai_nguon: true })).toMatchObject({ verification_status: 'rejected', duoc_doi_trang_thai: false }));
  it('INVOICE / TVAN / SIGN: không kiểm được → không bao giờ đổi trạng thái', () => {
    for (const loai of ['INVOICE', 'TVAN', 'SIGN', 'AUTO_DEBIT'] as const) expect(sk({ loai, da_kiem_lai_nguon: true }).duoc_doi_trang_thai).toBe(false);
  });
  it('môi trường dev → sandbox', () => expect(sk({ moi_truong: 'dev' }).environment).toBe('sandbox'));
});

describe('(11) xung đột hoá đơn — ghi lại, không ghi đè', () => {
  it('cùng trạng thái hoặc bên ngoài chưa rõ → không xung đột', () => {
    expect(xungDotHoaDon({ trong: 'paid', ngoai: 'paid', nguonNgoai: 'nha_cung_cap' })).toBeNull();
    expect(xungDotHoaDon({ trong: 'paid', ngoai: 'unknown', nguonNgoai: 'co_quan_thue' })).toBeNull();
  });
  it('cơ quan thuế ghi đã huỷ, MIMI ghi đã thu → xung đột, bên ngoài đáng tin hơn, gợi ý kiểm trước khi kê khai', () => {
    const x = xungDotHoaDon({ trong: 'paid', ngoai: 'cancelled', nguonNgoai: 'co_quan_thue' })!;
    expect(x.thang).toBe('ngoai');
    expect(x.goi_y).toContain('kiểm trên cổng');
  });
  it('bên ngoài ghi đã thu mà MIMI chưa thấy tiền → không tự ghi "đã thu"', () => {
    expect(xungDotHoaDon({ trong: 'issued', ngoai: 'paid', nguonNgoai: 'nha_cung_cap' })!.goi_y).toContain('chỉ ghi "đã thu" khi đối soát');
  });
});

describe('(13) kiểm trước khi nộp', () => {
  it('chặn: đã nộp, đang chờ xem lại, gói thiếu, báo cáo nội bộ', () => {
    expect(kiemTruocKhiNop({ trang_thai: 'submitted', do_day: null, loai: 'explanation_letter' })).not.toEqual([]);
    expect(kiemTruocKhiNop({ trang_thai: 'needs_review', do_day: null, loai: 'explanation_letter' })).not.toEqual([]);
    expect(kiemTruocKhiNop({ trang_thai: 'generated', do_day: 'INCOMPLETE', loai: 'audit_pack' })).not.toEqual([]);
    expect(kiemTruocKhiNop({ trang_thai: 'approved', do_day: null, loai: 'financial_review_memo' })).not.toEqual([]);
  });
  it('cho qua: công văn đã duyệt, gói đủ', () => {
    expect(kiemTruocKhiNop({ trang_thai: 'approved', do_day: null, loai: 'explanation_letter' })).toEqual([]);
    expect(kiemTruocKhiNop({ trang_thai: 'generated', do_day: 'COMPLETE', loai: 'audit_pack' })).toEqual([]);
  });
});

describe('trợ lý thực thi (mục 29–30, 47)', () => {
  it('"Nộp hồ sơ này giúp tôi" → không tự nộp; nói kênh TVAN chưa hỗ trợ; chỉ cách chuẩn bị nộp', () => {
    expect(nhanYDinh('Nộp hồ sơ này giúp tôi.')).toEqual(['khong_nop_thay']);
    const r = NANG_LUC.khong_nop_thay.chay(moi({ thucThi: { yeu_cau: [], tai_lieu_cho_nop: [{ id: 't', tieu_de: 'Công văn giải trình', loai: 'explanation_letter' }] } }));
    const chu = JSON.stringify(r);
    expect(chu).toContain('chưa hỗ trợ');
    expect(chu).toContain('Công văn giải trình');
    expect(chu).toContain('Chuẩn bị nộp');
    expect(r.de_xuat.every((d) => d.loai === 'mo_trang')).toBe(true);
  });

  it('"Hồ sơ của tôi tới đâu rồi?" → trạng thái đã ghi, nói rõ nguồn, không nói "xong" khi mới nộp', () => {
    expect(nhanYDinh('Hồ sơ của tôi tới đâu rồi?')).toEqual(['trang_thai_ho_so']);
    const y = { id: 'y', loai: 'tax_submission', trang_thai: 'waiting_external', tai_lieu_id: 't', phien_ban: 1, nha_cung_cap: 'nguoi_dung', xem_truoc: { tai_lieu: 'Công văn giải trình — phiên bản 1' }, loi_kiem: [], tham_chieu_ngoai: '11020260000123', nguon_tham_chieu: 'nguoi_dung_khai', ngay_nop: '2026-10-15', trang_thai_co_quan: 'cho_ket_qua', ket_qua_co_quan: null, nguon_ket_qua: null, han: null, tao_luc: '', gui_luc: '', xong_luc: null, hanh_trinh_id: null, ho_so_viec_id: null, xac_nhan_luc: '' };
    const r = NANG_LUC.trang_thai_ho_so.chay(moi({ thucThi: { yeu_cau: [y as never], tai_lieu_cho_nop: [] } }));
    expect(r.tom_tat).toContain('đang chờ thông báo của cơ quan thuế');
    expect(r.tom_tat).toContain('theo thông tin bạn ghi');
    expect(r.tom_tat).toContain('chưa phải là xong');
  });

  it('"Ký văn bản này" → nói thật kênh ký chưa bật, phân biệt PDF và XML', () => {
    expect(nhanYDinh('Ký văn bản này giúp tôi')).toEqual(['ky_van_ban']);
    const chu = JSON.stringify(NANG_LUC.ky_van_ban.chay(moi()));
    expect(chu).toContain('Ký văn bản PDF');
    expect(chu).toContain('Ký tờ khai XML');
  });

  it('"kỳ thuế" không bị hiểu nhầm là "ký"', () => {
    expect(nhanYDinh('Kỳ thuế tiếp theo là khi nào?')).not.toContain('ky_van_ban');
  });
});
