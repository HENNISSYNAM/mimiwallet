import { describe, expect, it } from 'vitest';
import { suyLuan, type SuKienThue } from './he-luat';
import { CAN_CU, CAN_CU_CHUA_DOI_CHIEU, nhanCanCu } from './he-luat';
import { CAU_HOI_SIEU_NHO, CAU_HOI_TRA_LUONG, han90NgaySauNam, lichThue, mocKeTiep, nghiaVuTuLich } from './lich-thue';

const HOM_NAY = '2026-09-25';
const sk = (p: Partial<SuKienThue> = {}): SuKienThue => ({
  nam: 2026, homNay: HOM_NAY, loai: 'ho_kinh_doanh', doanhThuQuy: [200e6, 200e6, 200e6, 0], nguonDoanhThu: 'hoa_don_dien_tu',
  nhomNganh: ['dich_vu'], kenh: 'dia_diem_co_dinh', phuongPhapTncn: 'doanh_thu', batDauKinhDoanh: null,
  daNopThueTrongNam: null, nganhDacThu: null, doanhThuNamTruoc: null, coQuanHeLienKet: null, ...p,
});
const lich = (s: SuKienThue, p: Record<string, unknown> = {}) => lichThue({ sk: s, sl: suyLuan(s), homNay: HOM_NAY, ...p });

describe('lịch thuế — một nguồn, không tự coi "chưa biết" là "bắt buộc"', () => {
  it('dưới ngưỡng: chỉ thông báo doanh thu năm — KHÔNG có "kỳ khai quý 3"', () => {
    const l = lich(sk());
    expect(l.some((m) => m.loai === 'thong_bao_doanh_thu' && m.han === '2027-01-31')).toBe(true);
    expect(l.some((m) => m.loai === 'khai_va_nop')).toBe(false);
  });

  it('đúng bằng 01 tỷ vẫn là dưới ngưỡng ("trở xuống")', () => {
    const l = lich(sk({ doanhThuQuy: [250e6, 250e6, 250e6, 250e6] }));
    expect(l.some((m) => m.loai === 'khai_va_nop')).toBe(false);
  });

  it('trên ngưỡng: khai và nộp theo quý, có hạn thật', () => {
    const l = lich(sk({ doanhThuQuy: [600e6, 600e6, 0, 0] }));
    expect(l.some((m) => m.loai === 'khai_va_nop' && m.trang_thai === 'phai_lam' && m.han)).toBe(true);
  });

  it('thiếu doanh thu: cần xác minh, không có ngày giả', () => {
    const l = lich(sk({ doanhThuQuy: null }));
    const m = l.find((x) => x.khoa === 'hkd_chua_ro_doanh_thu')!;
    expect(m.trang_thai).toBe('can_xac_minh');
    expect(m.han).toBeNull();
    expect(m.cau_hoi).toBeTruthy();
  });

  it('đang tạm ngừng: kỳ khai chuyển sang "cần xác minh" với căn cứ NĐ 252 Điều 7', () => {
    const l = lich(sk(), { trangThai: 'tam_ngung' });
    const m = l.find((x) => x.loai === 'thong_bao_doanh_thu')!;
    expect(m.trang_thai).toBe('can_xac_minh');
    expect(m.can_cu).toContain('nd252_d7_c1');
  });

  it('doanh nghiệp: tạm nộp TNDN quý, quyết toán TNDN; GTGT chưa biết kỳ thì HỎI', () => {
    const l = lich(sk({ loai: 'doanh_nghiep' }));
    expect(l.find((m) => m.khoa === 'tndn_tam_nop:2026-q2')?.han).toBe('2026-07-31');
    expect(l.find((m) => m.khoa === 'tndn_tam_nop:2026-q3')?.han).toBe('2026-10-31');
    expect(l.find((m) => m.khoa === 'tndn_quyet_toan:2026')?.han).toBe('2027-03-31');
    const gtgt = l.find((m) => m.khoa === 'gtgt_ky_khai')!;
    expect(gtgt).toMatchObject({ trang_thai: 'can_xac_minh', han: null });
    expect(gtgt.cau_hoi).toContain('theo tháng hay theo quý');
  });

  it('doanh nghiệp khai GTGT theo tháng: hạn ngày 20 tháng sau', () => {
    const l = lich(sk({ loai: 'doanh_nghiep' }), { kyKhaiGtgt: 'thang' });
    // Kỳ đang chạy (tháng 9) hạn 20/10; kỳ vừa hết (tháng 8) hạn 20/09 vẫn hiện (đã qua) như tạm nộp TNDN.
    expect(l.filter((m) => m.khoa.startsWith('gtgt:')).map((m) => [m.han, m.trang_thai])).toEqual([['2026-09-20', 'phai_lam'], ['2026-10-20', 'phai_lam']]);
  });

  it('chỉ mình tôi → TNCN khấu trừ không áp dụng; chưa biết → hỏi', () => {
    expect(lich(sk({ loai: 'doanh_nghiep' }), { soNguoi: '1' }).find((m) => m.khoa === 'tncn_khau_tru')?.trang_thai).toBe('khong_ap_dung');
    expect(lich(sk({ loai: 'doanh_nghiep' })).find((m) => m.khoa.startsWith('tncn_quyet_toan'))?.cau_hoi).toContain('trả lương');
  });

  it('mốc kế tiếp là mốc chưa qua hạn, gần nhất', () => {
    const m = mocKeTiep(lich(sk({ loai: 'doanh_nghiep' })));
    expect(m?.khoa).toBe('tndn_tam_nop:2026-q3');
    expect(m?.con_lai).toBe(36);
  });
});

describe('báo cáo tài chính năm (TT 58/2026)', () => {
  const dn = sk({ loai: 'doanh_nghiep' });
  const bc = (p: Record<string, unknown>) => lich(dn, p).filter((m) => m.loai === 'nop_bao_cao');

  it('hạn đúng 90 ngày sau khi hết năm: 31/3 năm thường, 30/3 năm nhuận', () => {
    expect(han90NgaySauNam(2025)).toBe('2026-03-31');
    expect(han90NgaySauNam(2027)).toBe('2028-03-30');
  });

  it('siêu nhỏ, TNDN theo thu nhập → phải nộp, căn cứ điểm a', () => {
    const m = bc({ sieuNho: true, phuongPhapTndn: 'thu_nhap' });
    expect(m.map((x) => x.trang_thai)).toEqual(['phai_lam', 'phai_lam']);
    expect(m[0].can_cu).toEqual(['tt58_d10_k1a']);
    expect(m[1]).toMatchObject({ ten: 'Nộp báo cáo tài chính năm 2026', han: '2027-03-31' });
  });

  it('siêu nhỏ, TNDN theo tỷ lệ % → không áp dụng, căn cứ điểm b', () => {
    expect(bc({ sieuNho: true, phuongPhapTndn: 'ty_le' }).every((x) => x.trang_thai === 'khong_ap_dung')).toBe(true);
  });

  it('chưa biết → cần xác minh, hỏi đúng một câu; không phải siêu nhỏ → không khẳng định hạn', () => {
    expect(bc({})[0]).toMatchObject({ trang_thai: 'can_xac_minh', cau_hoi: 'Công ty nộp thuế TNDN theo thu nhập tính thuế hay theo tỷ lệ % trên doanh thu?' });
    expect(bc({ sieuNho: false })[0].vi_sao).toContain('chưa đối chiếu được');
  });

  it('hộ kinh doanh không có mốc báo cáo tài chính', () => {
    expect(lich(sk({ loai: 'ho_kinh_doanh' })).some((m) => m.loai === 'nop_bao_cao')).toBe(false);
  });
});

describe('khai TNCN đã khấu trừ theo quý — mẫu 05/KK-TNCN (TT 89/2026, chưa đối chiếu Công báo)', () => {
  const dn = sk({ loai: 'doanh_nghiep' });
  const tncnQuy = (p: Record<string, unknown>, homNay = HOM_NAY) =>
    lichThue({ sk: { ...dn, homNay }, sl: suyLuan(dn), homNay, ...p }).filter((m) => m.khoa.startsWith('tncn_khai_quy:'));

  it('đã xác nhận trả lương → phải làm, hạn theo NĐ 252 Điều 10 khoản 3 (cuối tháng đầu quý sau)', () => {
    const m = tncnQuy({ soNguoi: '2-9', traLuong: true });
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ khoa: 'tncn_khai_quy:2026-q3', trang_thai: 'phai_lam', han: '2026-10-31', mau: '05/KK-TNCN', loai: 'khai_va_nop' });
    expect(m[0].can_cu).toEqual(['nd252_d10_k3', 'tt89_tncn_khai_quy']);
    expect(m[0].cau_hoi).toBeUndefined();
  });

  it('chưa xác nhận (kể cả soNguoi "2-9") → cần xác minh với đúng một câu hỏi, không bao giờ "phải làm"', () => {
    for (const p of [{}, { soNguoi: '2-9' }, { soNguoi: null, traLuong: null }]) {
      const m = tncnQuy(p);
      expect(m.length).toBeGreaterThan(0);
      for (const x of m) expect(x).toMatchObject({ trang_thai: 'can_xac_minh', cau_hoi: CAU_HOI_TRA_LUONG });
    }
  });

  it('chỉ mình tôi, hoặc xác nhận không trả lương → không có mốc khai quý; TNCN không áp dụng', () => {
    expect(tncnQuy({ soNguoi: '1' })).toHaveLength(0);
    const l = lich(dn, { soNguoi: '10-49', traLuong: false });
    expect(l.some((m) => m.khoa.startsWith('tncn_'))).toBe(true);
    expect(l.find((m) => m.khoa === 'tncn_khau_tru')).toMatchObject({ trang_thai: 'khong_ap_dung' });
    expect(l.some((m) => m.khoa.startsWith('tncn_khai_quy') || m.khoa.startsWith('tncn_quyet_toan'))).toBe(false);
  });

  it('trả lương thì quyết toán TNCN năm cũng thành phải làm (cùng câu trả lời)', () => {
    expect(lich(dn, { traLuong: true }).find((m) => m.khoa === 'tncn_quyet_toan:2025')).toMatchObject({ trang_thai: 'phai_lam' });
  });

  it('không sinh kỳ trước quý 3/2026 (trước TT 89 là quy định cũ); quý 4 hạn 31/01 năm sau', () => {
    expect(tncnQuy({ traLuong: true }, '2026-05-10')).toHaveLength(0);
    expect(tncnQuy({ traLuong: true }, '2026-11-02').map((m) => [m.khoa, m.han])).toEqual([
      ['tncn_khai_quy:2026-q3', '2026-10-31'], ['tncn_khai_quy:2026-q4', '2027-01-31'],
    ]);
  });

  it('hộ kinh doanh không có mốc 05/KK-TNCN', () => {
    expect(lich(sk(), { traLuong: true }).some((m) => m.khoa.startsWith('tncn_khai_quy'))).toBe(false);
  });

  it('tạm ngừng: kỳ khai TNCN quý cũng chuyển sang cần xác minh', () => {
    expect(tncnQuy({ traLuong: true, trangThai: 'tam_ngung' })[0]).toMatchObject({ trang_thai: 'can_xac_minh' });
  });
});

describe('nghĩa vụ theo mã số thuế', () => {
  const dn = sk({ loai: 'doanh_nghiep' });

  it('đơn vị trực thuộc: không khẳng định — một mốc cần xác minh với đúng một câu hỏi', () => {
    const m = lich(dn, { donViTrucThuoc: true }).find((x) => x.khoa === 'don_vi_truc_thuoc')!;
    expect(m).toMatchObject({ trang_thai: 'can_xac_minh', han: null });
    expect(m.cau_hoi).toContain('đơn vị chủ quản');
    expect(lich(dn).some((x) => x.khoa === 'don_vi_truc_thuoc')).toBe(false);
  });

  it('ngừng hoạt động / đã đóng MST: không còn mốc nào "phải làm" — tất cả cần xác minh, không xoá', () => {
    for (const trangThai of ['ngung_chua_dong_mst', 'da_dong_mst', 'khong_o_dia_chi']) {
      const goc = lich(dn, { traLuong: true });
      const l = lich(dn, { traLuong: true, trangThai });
      expect(l).toHaveLength(goc.length);
      expect(l.some((m) => m.trang_thai === 'phai_lam')).toBe(false);
      expect(l.find((m) => m.khoa === 'tndn_tam_nop:2026-q3')?.vi_sao).toContain('Cơ quan thuế ghi');
    }
  });

  it('đang hoạt động: kết luận như cũ', () => {
    expect(lich(dn, { trangThai: 'dang_hoat_dong' })).toEqual(lich(dn));
  });
});

describe('căn cứ của mọi mốc', () => {
  it('mỗi mã căn cứ hoặc đã có câu trích trong kho, hoặc nằm trong danh sách CHƯA đối chiếu có nhãn rõ', () => {
    const dn = sk({ loai: 'doanh_nghiep' });
    const moi = [
      ...lich(dn, { traLuong: true, donViTrucThuoc: true }), ...lich(dn, { trangThai: 'tam_ngung' }),
      ...lich(sk()), ...lich(sk({ doanhThuQuy: [600e6, 600e6, 0, 0] })),
    ];
    for (const m of moi) for (const c of m.can_cu) expect(CAN_CU[c] ?? CAN_CU_CHUA_DOI_CHIEU[c], `${m.khoa} → ${c}`).toBeTruthy();
    expect(nhanCanCu('tt89_tncn_khai_quy')).toEqual({ nhan: '89/2026/TT-BTC (chưa đối chiếu Công báo)', chua_doi_chieu: true });
    expect(nhanCanCu('nd252_d10_k3')).toEqual({ nhan: '252/2026/NĐ-CP · Điều 10 khoản 3', chua_doi_chieu: false });
    // Căn cứ chưa đối chiếu không được giả làm căn cứ đã có câu trích.
    for (const k of Object.keys(CAN_CU_CHUA_DOI_CHIEU)) expect(CAN_CU[k]).toBeUndefined();
  });
});

describe('hồ sơ nghĩa vụ — gom từ CÙNG lịch', () => {
  it('một nghĩa vụ nhiều kỳ thành một dòng, kèm số kỳ và hạn gần nhất chưa qua', () => {
    const l = lich(sk({ loai: 'doanh_nghiep' }), { traLuong: true, soNguoi: '2-9' });
    const nv = nghiaVuTuLich(l);
    const tndn = nv.phai_lam.find((x) => x.khoa === 'tndn_tam_nop')!;
    expect(tndn.so_ky).toBe(2);
    expect(tndn.han).toBe('2026-10-31');
    expect(nv.phai_lam.find((x) => x.khoa === 'tncn_khai_quy')).toMatchObject({ mau: '05/KK-TNCN' });
    expect(nv.can_xac_minh.find((x) => x.khoa === 'gtgt_ky_khai')?.cau_hoi).toBeTruthy();
    const tong = Object.values(nv).reduce((a, ds) => a + ds.reduce((b, x) => b + x.so_ky, 0), 0);
    expect(tong).toBe(l.length);
  });
});

describe('câu trả lời đã lưu đổi lịch (12/10/2026 — sửa L16)', () => {
  const NGAY = '2026-10-12';
  const dn = sk({ loai: 'doanh_nghiep', homNay: NGAY });
  const l = (p: Record<string, unknown> = {}) => lichThue({ sk: dn, sl: suyLuan(dn), homNay: NGAY, ...p });

  it('mỗi câu "cần xác minh" trả lời được mang đúng trường để lưu; câu cho kế toán thì không', () => {
    const goc = l();
    expect(goc.find((m) => m.khoa === 'gtgt_ky_khai')?.tra_loi).toBe('ky_khai_gtgt');
    expect(goc.find((m) => m.khoa === 'tncn_khai_quy:2026-q3')?.tra_loi).toBe('tra_luong');
    expect(goc.find((m) => m.khoa === 'bctc:2026')?.tra_loi).toBe('phuong_phap_tndn');
    expect(l({ sieuNho: false }).find((m) => m.khoa === 'bctc:2026')?.tra_loi).toBeUndefined();
    expect(nghiaVuTuLich(goc).can_xac_minh.find((n) => n.khoa === 'gtgt_ky_khai')?.tra_loi).toBe('ky_khai_gtgt');
  });

  it('traLuong=true → 05/KK-TNCN quý 3 "phải làm", hạn 31/10; không còn câu hỏi', () => {
    const m = l({ traLuong: true }).find((x) => x.khoa === 'tncn_khai_quy:2026-q3')!;
    expect(m).toMatchObject({ trang_thai: 'phai_lam', han: '2026-10-31', mau: '05/KK-TNCN' });
    expect(m.cau_hoi).toBeUndefined();
    expect(m.tra_loi).toBeUndefined();
  });

  it('xác nhận có trả lương thắng "chỉ mình tôi" lúc đăng ký (đã thuê thêm người)', () => {
    expect(l({ soNguoi: '1', traLuong: true }).find((x) => x.khoa === 'tncn_khai_quy:2026-q3')?.trang_thai).toBe('phai_lam');
    expect(l({ soNguoi: '1' }).find((x) => x.khoa === 'tncn_khau_tru')?.trang_thai).toBe('khong_ap_dung');
  });

  it("kyKhaiGtgt='thang' ngày 12/10 → hạn gần nhất 20/10 (kỳ tháng 9), rồi 20/11; hết câu hỏi GTGT", () => {
    const ds = l({ kyKhaiGtgt: 'thang' });
    expect(ds.some((m) => m.khoa === 'gtgt_ky_khai')).toBe(false);
    const g = ds.filter((m) => m.khoa.startsWith('gtgt:'));
    expect(g.map((m) => [m.ten, m.han, m.trang_thai])).toEqual([
      ['Khai và nộp thuế GTGT tháng 9/2026 (theo tháng)', '2026-10-20', 'phai_lam'],
      ['Khai và nộp thuế GTGT tháng 10/2026 (theo tháng)', '2026-11-20', 'phai_lam'],
    ]);
    expect(g[0].con_lai).toBe(8);
  });

  it("kyKhaiGtgt='thang' tháng 1 → kỳ tháng 12 năm trước hạn 20/01", () => {
    const sk1 = sk({ loai: 'doanh_nghiep', homNay: '2027-01-05', nam: 2027 });
    const g = lichThue({ sk: sk1, sl: suyLuan(sk1), homNay: '2027-01-05', kyKhaiGtgt: 'thang' }).filter((m) => m.khoa.startsWith('gtgt:'));
    expect(g.map((m) => m.han)).toEqual(['2027-01-20', '2027-02-20']);
  });

  it("kyKhaiGtgt='quy' ngày 12/10 → quý 3 vừa hết hạn 31/10, quý 4 đang chạy hạn 31/01/2027", () => {
    const g = l({ kyKhaiGtgt: 'quy' }).filter((m) => m.khoa.startsWith('gtgt:'));
    expect(g.map((m) => m.han)).toEqual(['2026-10-31', '2027-01-31']);
    expect(g[0].can_cu).toEqual(['nd252_d10_k3']);
  });

  it('báo cáo tài chính: đã trả lời phương pháp mà chưa biết siêu nhỏ → hỏi câu siêu nhỏ (không hỏi lại câu cũ)', () => {
    const m = l({ phuongPhapTndn: 'thu_nhap' }).find((x) => x.khoa === 'bctc:2026')!;
    expect(m).toMatchObject({ trang_thai: 'can_xac_minh', cau_hoi: CAU_HOI_SIEU_NHO, tra_loi: 'sieu_nho' });
    expect(l({ phuongPhapTndn: 'thu_nhap', sieuNho: true }).find((x) => x.khoa === 'bctc:2026')?.trang_thai).toBe('phai_lam');
  });

  it('tạm ngừng: mốc bị chuyển sang câu hỏi tạm ngừng thì không mang nút trả lời của câu khác', () => {
    for (const m of l({ traLuong: true, kyKhaiGtgt: 'thang', trangThai: 'tam_ngung' })) {
      if (m.cau_hoi === 'Thời gian tạm ngừng có trọn kỳ này không?') expect(m.tra_loi).toBeUndefined();
    }
  });
});
