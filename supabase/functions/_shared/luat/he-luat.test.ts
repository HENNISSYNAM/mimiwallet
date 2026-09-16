import { describe, expect, it } from 'vitest';
import {
  CAN_CU, chonDoanhThu, docHoSoThue, hanNopQuy, loaiTuTaiKhoan, NGUONG_DOANH_THU, suyLuan, VAN_BAN,
  type KetLuan, type SuKienThue,
} from './he-luat';

/** Mọi con số dưới đây là đầu vào của test, không đi vào sản phẩm. */
const HOM_NAY = '2026-09-16';

const sk = (p: Partial<SuKienThue> = {}): SuKienThue => ({
  nam: 2026,
  homNay: HOM_NAY,
  loai: 'ho_kinh_doanh',
  doanhThuQuy: [0, 0, 0, 0],
  nguonDoanhThu: 'hoa_don_dien_tu',
  nhomNganh: ['dich_vu'],
  kenh: 'dia_diem_co_dinh',
  phuongPhapTncn: null,
  batDauKinhDoanh: null,
  daNopThueTrongNam: null,
  doanhThuNamTruoc: null,
  coQuanHeLienKet: null,
  ...p,
});

const id = (ds: KetLuan[]) => ds.map((k) => k.id);
const tim = (ds: KetLuan[], k: string) => ds.find((x) => x.id === k);

describe('bộ căn cứ', () => {
  it('mỗi căn cứ có văn bản đã khai, nhãn Điều đúng khuôn, câu trích đủ dài', () => {
    for (const [k, c] of Object.entries(CAN_CU)) {
      expect(VAN_BAN[c.van_ban], `${k}: văn bản ${c.van_ban}`).toBeTruthy();
      expect(c.dieu, k).toMatch(/^Điều \d+$/);
      expect(c.trich.trim().length, k).toBeGreaterThan(25);
      expect(c.vi_tri.length, k).toBeGreaterThan(4);
      expect(c.y.length, k).toBeGreaterThan(10);
      // Câu trích là chữ trong văn bản, không phải lời MIMI.
      expect(c.trich, k).not.toMatch(/MIMI/);
    }
  });

  it('mọi kết luận chỉ dẫn căn cứ có thật', () => {
    const moiTinhHuong: SuKienThue[] = [
      sk({ doanhThuQuy: [100e6, 100e6, 100e6, 100e6] }),
      sk({ doanhThuQuy: [300e6, 400e6, 500e6, 0], phuongPhapTncn: 'doanh_thu' }),
      sk({ doanhThuQuy: [1e9, 1e9, 1e9, 1e9] }),
      sk({ doanhThuQuy: [20e9, 20e9, 20e9, 10e9], phuongPhapTncn: 'thu_nhap' }),
      sk({ loai: 'doanh_nghiep', doanhThuNamTruoc: 800e6, coQuanHeLienKet: false }),
      sk({ loai: 'doanh_nghiep', doanhThuNamTruoc: 800e6, coQuanHeLienKet: true }),
      sk({ loai: null }),
      sk({ nam: 2025 }),
      sk({ kenh: 'tmdt_co_thanh_toan', doanhThuQuy: [50e6, 0, 0, 0] }),
    ];
    for (const s of moiTinhHuong) {
      const r = suyLuan(s);
      for (const k of r.ket_luan) for (const c of k.can_cu) expect(CAN_CU[c], `${k.id} → ${c}`).toBeTruthy();
      for (const k of r.ket_luan) for (const h of k.han ?? []) expect(h).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe('hộ kinh doanh dưới ngưỡng', () => {
  const r = suyLuan(sk({ doanhThuQuy: [200e6, 200e6, 200e6, 200e6] }));

  it('không chịu GTGT, không nộp TNCN, và chỉ thông báo doanh thu năm', () => {
    expect(id(r.ket_luan)).toContain('khong_chiu_gtgt');
    expect(id(r.ket_luan)).toContain('khong_nop_tncn');
    const tb = tim(r.ket_luan, 'thong_bao_doanh_thu');
    expect(tb?.mau).toBe('01/TKN-CNKD');
    expect(tb?.han).toEqual(['2027-01-31']);
    expect(tb?.vi).toEqual(['khong_chiu_gtgt', 'khong_nop_tncn']);
    expect(r.quy_vuot).toBeNull();
  });

  it('nói rõ hai thứ đó là hai hệ quả của cùng một điều kiện, không phải cái này sinh ra cái kia', () => {
    const g = tim(r.ket_luan, 'giai_thich_hai_thue');
    expect(g?.cau).toContain('song song');
    expect(g?.cau).toContain('Khai số thuế GTGT bằng 0 không tự làm phát sinh miễn TNCN');
    expect(g?.vi).toEqual(['khong_chiu_gtgt', 'khong_nop_tncn']);
  });

  it('đúng bằng 01 tỷ vẫn dưới ngưỡng ("trở xuống")', () => {
    const b = suyLuan(sk({ doanhThuQuy: [NGUONG_DOANH_THU, 0, 0, 0] }));
    expect(id(b.ket_luan)).toContain('khong_nop_tncn');
    const tren = suyLuan(sk({ doanhThuQuy: [NGUONG_DOANH_THU + 1, 0, 0, 0] }));
    expect(id(tren.ket_luan)).toContain('nop_tncn');
  });

  it('mới ra kinh doanh nửa đầu năm thì thông báo hai lần', () => {
    const m = suyLuan(sk({ doanhThuQuy: [100e6, 100e6, 0, 0], batDauKinhDoanh: '2026-02-10' }));
    expect(tim(m.ket_luan, 'thong_bao_doanh_thu')?.han).toEqual(['2026-07-31', '2027-01-31']);
  });

  it('đã nộp thuế trong năm thì được xử lý nộp thừa', () => {
    const h = suyLuan(sk({ doanhThuQuy: [100e6, 0, 0, 0], daNopThueTrongNam: true }));
    expect(tim(h.ket_luan, 'duoc_xu_ly_nop_thua')?.can_cu).toContain('nd141_d4_k1');
  });
});

describe('hộ kinh doanh vượt ngưỡng', () => {
  const r = suyLuan(sk({ doanhThuQuy: [300e6, 400e6, 500e6, 0], phuongPhapTncn: 'doanh_thu' }));

  it('tìm đúng quý vượt và khai theo quý bằng mẫu 01/CNKD', () => {
    expect(r.quy_vuot).toBe(3);
    expect(tim(r.ket_luan, 'khai_tu_quy_vuot')?.cau).toContain('quý 3/2026');
    const q = tim(r.ket_luan, 'khai_theo_quy');
    expect(q?.mau).toBe('01/CNKD');
    expect(q?.han).toEqual([hanNopQuy(3, 2026), hanNopQuy(4, 2026)]);
  });

  it('bắt buộc hoá đơn điện tử có mã, đăng ký trong 30 ngày sau quý vượt', () => {
    expect(tim(r.ket_luan, 'hoa_don_co_ma')?.han).toEqual(['2026-10-30']);
  });

  it('chưa chọn phương pháp TNCN thì hỏi, không tự chọn', () => {
    const chua = suyLuan(sk({ doanhThuQuy: [600e6, 600e6, 0, 0] }));
    expect(chua.thieu.map((t) => t.truong)).toContain('phuong_phap_tncn');
    expect(chua.phuong_phap).toBeNull();
  });

  it('trên 03 tỷ thì phương pháp tính trên thu nhập, kèm quyết toán 31/3 và đòi chứng từ chi phí', () => {
    const b = suyLuan(sk({ doanhThuQuy: [1e9, 1e9, 1e9, 1e9] }));
    expect(b.phuong_phap).toBe('thu_nhap');
    expect(tim(b.ket_luan, 'tam_nop_va_quyet_toan')?.han).toEqual(['2027-03-31']);
    expect(id(b.ket_luan)).toContain('chi_phi_can_chung_tu');
  });

  it('trên 50 tỷ thì nói thẳng là chưa hỗ trợ tờ khai tháng', () => {
    const b = suyLuan(sk({ doanhThuQuy: [20e9, 20e9, 20e9, 10e9], phuongPhapTncn: 'thu_nhap' }));
    expect(tim(b.ket_luan, 'khai_theo_thang')?.loai).toBe('chua_ho_tro');
    expect(id(b.ket_luan)).not.toContain('khai_theo_quy');
  });

  it('nhiều nhóm ngành thì cảnh báo tách doanh thu', () => {
    const b = suyLuan(sk({ doanhThuQuy: [2e9, 0, 0, 0], nhomNganh: ['dich_vu', 'phan_phoi_hang_hoa'], phuongPhapTncn: 'doanh_thu' }));
    expect(tim(b.ket_luan, 'nhieu_nganh')?.can_cu).toContain('tt69_d5_k2');
  });
});

describe('doanh nghiệp', () => {
  it('doanh thu năm trước từ 01 tỷ trở xuống và không liên kết thì miễn TNDN', () => {
    const r = suyLuan(sk({ loai: 'doanh_nghiep', doanhThuQuy: [100e6, 0, 0, 0], doanhThuNamTruoc: 900e6, coQuanHeLienKet: false }));
    expect(tim(r.ket_luan, 'mien_tndn')?.can_cu).toEqual(['nd141_d2_k15', 'luat09_d3']);
    expect(id(r.ket_luan)).toContain('gtgt_truc_tiep');
    expect(id(r.ket_luan)).toContain('chua_soan_to_khai_dn');
  });

  it('có quan hệ liên kết thì không kết luận thay người dùng', () => {
    const r = suyLuan(sk({ loai: 'doanh_nghiep', doanhThuNamTruoc: 900e6, coQuanHeLienKet: true }));
    expect(id(r.ket_luan)).toContain('khong_mien_lien_ket');
    expect(id(r.ket_luan)).not.toContain('mien_tndn');
  });

  it('chưa biết doanh thu năm trước hay quan hệ liên kết thì hỏi', () => {
    const r = suyLuan(sk({ loai: 'doanh_nghiep' }));
    expect(r.thieu.map((t) => t.truong)).toContain('doanh_thu_nam_truoc');
    const b = suyLuan(sk({ loai: 'doanh_nghiep', doanhThuNamTruoc: 500e6 }));
    expect(b.thieu.map((t) => t.truong)).toContain('co_quan_he_lien_ket');
  });
});

describe('ngoài phạm vi và thiếu dữ liệu', () => {
  it('năm trước 2026 thì không suy luận', () => {
    const r = suyLuan(sk({ nam: 2025, doanhThuQuy: [100e6, 0, 0, 0] }));
    expect(id(r.ket_luan)).toEqual(['ngoai_pham_vi']);
  });

  it('không có doanh thu thì hỏi, không đoán số 0', () => {
    const r = suyLuan(sk({ doanhThuQuy: null }));
    expect(r.doanh_thu_nam).toBeNull();
    expect(r.thieu.map((t) => t.truong)).toContain('doanh_thu');
    expect(id(r.ket_luan)).not.toContain('khong_chiu_gtgt');
  });

  it('chưa biết là hộ hay doanh nghiệp thì dừng lại hỏi', () => {
    const r = suyLuan(sk({ loai: null, doanhThuQuy: [100e6, 0, 0, 0] }));
    expect(r.thieu.map((t) => t.truong)).toContain('loai');
    expect(id(r.ket_luan)).toEqual(['doanh_thu_nam']);
  });

  it('bán trên sàn có thanh toán thì nhắc sàn đã khấu trừ', () => {
    const r = suyLuan(sk({ kenh: 'tmdt_co_thanh_toan', doanhThuQuy: [100e6, 0, 0, 0] }));
    expect(tim(r.ket_luan, 'san_khau_tru')?.can_cu).toEqual(['nd68_d11_k1']);
  });
});

describe('hạn nộp theo quý', () => {
  it('ngày cuối tháng đầu quý sau', () => {
    expect(hanNopQuy(1, 2026)).toBe('2026-04-30');
    expect(hanNopQuy(2, 2026)).toBe('2026-07-31');
    expect(hanNopQuy(3, 2026)).toBe('2026-10-31');
    expect(hanNopQuy(4, 2026)).toBe('2027-01-31');
  });
});

describe('chọn doanh thu giữa các nguồn', () => {
  it('hoá đơn điện tử thắng sao kê; sao kê nhiều hơn thì cảnh báo', () => {
    const r = chonDoanhThu({ hoa_don: [100e6, 0, 0, 0], ngan_hang: [300e6, 0, 0, 0] }, null);
    expect(r.nguon).toBe('hoa_don_dien_tu');
    expect(r.quy).toEqual([100e6, 0, 0, 0]);
    expect(r.canh_bao.join(' ')).toContain('nhiều hơn tổng hoá đơn');
  });

  it('số tự nhập thắng tất cả, nhưng thấp hơn hoá đơn thì cảnh báo', () => {
    const r = chonDoanhThu({ hoa_don: [100e6, 0, 0, 0], ngan_hang: null }, [50e6, 0, 0, 0]);
    expect(r.nguon).toBe('tu_khai');
    expect(r.canh_bao.join(' ')).toContain('thấp hơn tổng hoá đơn');
  });

  it('chỉ có sao kê thì nói rõ là ước tính; không có gì thì trả null', () => {
    const r = chonDoanhThu({ hoa_don: null, ngan_hang: [10e6, 0, 0, 0] }, null);
    expect(r.nguon).toBe('ngan_hang');
    expect(r.canh_bao.join(' ')).toContain('ước tính');
    expect(chonDoanhThu({ hoa_don: null, ngan_hang: null }, null).quy).toBeNull();
  });
});

describe('hồ sơ thuế gửi lên', () => {
  it('nhận giá trị hợp lệ, chối giá trị lạ', () => {
    const ok = docHoSoThue({ loai_nguoi_nop: 'ho_kinh_doanh', nhom_nganh: ['dich_vu', 'dich_vu'], kenh: 'dia_diem_co_dinh', bat_dau_kinh_doanh: '2026-02-01', doanh_thu_nam_truoc: 900000000 });
    expect(ok.ok && ok.ho_so.nhom_nganh).toEqual(['dich_vu']);
    expect(docHoSoThue({ loai_nguoi_nop: 'ho gi do' }).ok).toBe(false);
    expect(docHoSoThue({ nhom_nganh: ['khong_co_nhom'] }).ok).toBe(false);
    expect(docHoSoThue({ kenh: 'xyz' }).ok).toBe(false);
    expect(docHoSoThue({ bat_dau_kinh_doanh: '01/02/2026' }).ok).toBe(false);
    expect(docHoSoThue({ doanh_thu_nam_truoc: -5 }).ok).toBe(false);
  });

  it('loại người nộp suy từ loại tài khoản khi hồ sơ chưa ghi', () => {
    expect(loaiTuTaiKhoan('household')).toBe('ho_kinh_doanh');
    expect(loaiTuTaiKhoan('personal')).toBe('ho_kinh_doanh');
    expect(loaiTuTaiKhoan('business')).toBe('doanh_nghiep');
    expect(loaiTuTaiKhoan(null)).toBeNull();
  });
});
