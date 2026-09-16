import { describe, expect, it } from 'vitest';
import { suyLuan, type SuKienThue } from './he-luat';
import { kyGoiY, soanToKhai, type KyToKhai, type ToKhai } from './to-khai';

/** Mọi con số dưới đây là đầu vào của test, không đi vào sản phẩm. */
const HOM_NAY = '2027-01-05';
const HO_SO = { ten: 'HỘ KINH DOANH NAM ĐINH', mst: '0123456789' };

const sk = (p: Partial<SuKienThue> = {}): SuKienThue => ({
  nam: 2026, homNay: HOM_NAY, loai: 'ho_kinh_doanh', doanhThuQuy: [0, 0, 0, 0], nguonDoanhThu: 'hoa_don_dien_tu',
  nhomNganh: ['dich_vu'], kenh: 'dia_diem_co_dinh', phuongPhapTncn: null, batDauKinhDoanh: null,
  daNopThueTrongNam: null, nganhDacThu: null, doanhThuNamTruoc: null, coQuanHeLienKet: null, ...p,
});

function soan(s: SuKienThue, ky: KyToKhai) {
  return soanToKhai(s, suyLuan(s), HO_SO, ky);
}
const dong = (tk: ToKhai, ma: string) => tk.dong.find((d) => d.ma === ma);

describe('mẫu 01/TKN-CNKD — thông báo doanh thu năm', () => {
  const s = sk({ doanhThuQuy: [200e6, 200e6, 200e6, 200e6] });
  const r = soan(s, { loai: 'nam', nam: 2026 });
  const tk = (r as { ok: true; to_khai: ToKhai }).to_khai;

  it('đúng mẫu, đúng bản Thông tư 50/2026, hạn 31/01 năm sau', () => {
    expect(r.ok).toBe(true);
    expect(tk.mau).toBe('01/TKN-CNKD');
    expect(tk.kem_theo).toContain('50/2026/TT-BTC');
    expect(tk.tieu_de).toBe('THÔNG BÁO DOANH THU/TỜ KHAI THUẾ NĂM');
    expect(tk.han_nop).toBe('2027-01-31');
    expect(tk.danh_dau[0]).toEqual({ nhan: 'Hộ kinh doanh, cá nhân kinh doanh có doanh thu năm từ 01 tỷ đồng trở xuống', chon: true });
  });

  it('điền doanh thu vào dòng đúng nhóm ngành và dòng tổng cộng', () => {
    expect(dong(tk, '[08b]')?.o.tong_dt).toBe(800e6);
    expect(dong(tk, '[11]')?.o.tong_dt).toBe(800e6);
    expect(tk.chi_tieu.find((c) => c.ma === '[01a]')?.gia_tri).toBe('2026');
    expect(tk.chi_tieu.find((c) => c.ma === '[05]')?.gia_tri).toBe('0123456789');
  });

  it('để trống mọi ô số thuế, đúng Ghi chú của mẫu', () => {
    for (const d of tk.dong) {
      expect(d.o.thue_gtgt).toBeNull();
      expect(d.o.thue_tncn).toBeNull();
      expect(d.o.dt_khong_chiu).toBeNull();
    }
    expect(tk.ghi_chu_mau.join(' ')).toContain('chỉ thực hiện thông báo doanh thu; không thực hiện khai số thuế GTGT, thuế TNCN phải nộp');
  });

  it('mỗi con số điền vào đều có một dòng nói nó ra từ đâu', () => {
    expect(tk.cach_tinh.some((c) => c.includes('[11] Tổng cộng') && c.includes('4 quý'))).toBe(true);
  });

  it('vượt 01 tỷ thì không soạn mẫu năm mà chỉ đường sang tờ khai quý', () => {
    const v = soan(sk({ doanhThuQuy: [600e6, 600e6, 0, 0], phuongPhapTncn: 'doanh_thu' }), { loai: 'nam', nam: 2026 });
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.ly_do).toContain('01/CNKD');
      expect(v.can_cu).toContain('nd68_d8_k1a_vuot');
    }
  });

  it('nửa đầu năm của hộ mới ra kinh doanh: đánh dấu ô "mới ra kinh doanh", hạn 31/07', () => {
    const m = soan(sk({ doanhThuQuy: [100e6, 150e6, 0, 0], batDauKinhDoanh: '2026-02-01' }), { loai: '6_thang_dau', nam: 2026 });
    expect(m.ok).toBe(true);
    if (m.ok) {
      expect(m.to_khai.han_nop).toBe('2026-07-31');
      expect(m.to_khai.danh_dau[1].chon).toBe(true);
      expect(dong(m.to_khai, '[11]')?.o.tong_dt).toBe(250e6);
    }
  });
});

describe('mẫu 01/CNKD — tờ khai quý', () => {
  const s = sk({ doanhThuQuy: [300e6, 400e6, 500e6, 0], phuongPhapTncn: 'doanh_thu' });
  const r = soan(s, { loai: 'quy', nam: 2026, quy: 3 });
  const tk = (r as { ok: true; to_khai: ToKhai }).to_khai;

  it('tính thuế GTGT theo tỷ lệ ngành và TNCN trên phần vượt mức trừ', () => {
    expect(r.ok).toBe(true);
    // Dịch vụ: GTGT 5% × 500 triệu = 25 triệu.
    expect(dong(tk, '(b)')?.o.thue_gtgt).toBe(25e6);
    // Mức trừ 01 tỷ còn lại 300 triệu sau hai quý đầu (700 triệu).
    expect(dong(tk, '(b)')?.o.dt_duoc_tru).toBe(300e6);
    // TNCN 2% × (500 − 300) triệu = 4 triệu.
    expect(dong(tk, '(b)')?.o.thue_tncn).toBe(4e6);
    expect(dong(tk, '[18]')?.o.tong_dt).toBe(500e6);
    expect(dong(tk, '[20]')?.o.thue_gtgt).toBe(25e6);
    expect(tk.han_nop).toBe('2026-10-31');
    expect(tk.ky_chu).toBe('Quý 3/2026');
  });

  it('không bịa số vào ô không tính được', () => {
    expect(dong(tk, '[19]')?.o.thue_gtgt).toBeNull();
    expect(dong(tk, '(b)')?.o.dt_khong_chiu).toBeNull();
    expect(dong(tk, '(b)')?.o.dt_0).toBeNull();
  });

  it('nói rõ quý vượt ngưỡng là chỗ còn phải hỏi cơ quan thuế', () => {
    expect(tk.canh_bao.join(' ')).toContain('không nói rõ thuế GTGT có tính trên doanh thu các quý trước');
  });

  it('quý chưa tới lượt khai thì từ chối kèm lý do', () => {
    const q2 = soan(s, { loai: 'quy', nam: 2026, quy: 2 });
    expect(q2.ok).toBe(false);
    if (!q2.ok) expect(q2.ly_do).toContain('chưa phải khai');
  });

  it('doanh thu chưa vượt ngưỡng thì chỉ thông báo doanh thu năm', () => {
    const b = soan(sk({ doanhThuQuy: [100e6, 100e6, 100e6, 100e6] }), { loai: 'quy', nam: 2026, quy: 3 });
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.ly_do).toContain('01/TKN-CNKD');
  });

  it('chưa chọn phương pháp TNCN thì không đánh dấu bừa lên tờ khai', () => {
    const b = soan(sk({ doanhThuQuy: [600e6, 600e6, 0, 0] }), { loai: 'quy', nam: 2026, quy: 2 });
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.ly_do).toContain('phương pháp tính TNCN');
  });

  it('chọn tính trên thu nhập thì đánh dấu ô thứ hai và nhắc quyết toán', () => {
    const b = soan(sk({ doanhThuQuy: [2e9, 2e9, 0, 0], phuongPhapTncn: 'thu_nhap' }), { loai: 'quy', nam: 2026, quy: 1 });
    expect(b.ok).toBe(true);
    if (b.ok) {
      expect(b.to_khai.danh_dau[1].chon).toBe(true);
      expect(b.to_khai.canh_bao.join(' ')).toContain('02/CNKD-TNCN-QTT');
    }
  });

  it('nhiều nhóm ngành: GTGT theo tỷ lệ cao nhất, TNCN để trống chứ không đoán', () => {
    const b = soan(sk({ doanhThuQuy: [2e9, 0, 0, 0], nhomNganh: ['phan_phoi_hang_hoa', 'dich_vu'], phuongPhapTncn: 'doanh_thu' }), { loai: 'quy', nam: 2026, quy: 1 });
    expect(b.ok).toBe(true);
    if (b.ok) {
      // Dịch vụ 5% cao hơn phân phối hàng hoá 1%.
      expect(dong(b.to_khai, '(b)')?.o.thue_gtgt).toBe(100e6);
      expect(dong(b.to_khai, '(b)')?.o.thue_tncn).toBeNull();
      expect(b.to_khai.can_cu).toContain('tt69_d5_k2');
    }
  });

  it('nhóm nội dung số: kho chưa có tỷ lệ GTGT riêng thì để trống và nói ra', () => {
    const b = soan(sk({ doanhThuQuy: [2e9, 0, 0, 0], nhomNganh: ['noi_dung_so'], phuongPhapTncn: 'doanh_thu' }), { loai: 'quy', nam: 2026, quy: 1 });
    expect(b.ok).toBe(true);
    if (b.ok) {
      expect(dong(b.to_khai, '(đ)')?.o.thue_gtgt).toBeNull();
      expect(dong(b.to_khai, '(đ)')?.o.thue_tncn).toBe(50e6); // TNCN 5% × (2 tỷ − 1 tỷ)
      expect(b.to_khai.cach_tinh.join(' ')).toContain('chưa có tỷ lệ % riêng');
    }
  });

  it('bán trên nền tảng số không thanh toán thì điền vào phần II và đánh dấu đúng ô', () => {
    const b = soan(sk({ doanhThuQuy: [2e9, 0, 0, 0], kenh: 'tmdt_khong_thanh_toan', phuongPhapTncn: 'doanh_thu' }), { loai: 'quy', nam: 2026, quy: 1 });
    expect(b.ok).toBe(true);
    if (b.ok) {
      const dongTmdt = b.to_khai.dong.filter((d) => d.stt === '2.2');
      expect(dongTmdt[0]?.o.tong_dt).toBe(2e9);
      expect(b.to_khai.danh_dau[2].chon).toBe(true);
    }
  });
});

describe('không soạn khi không được phép', () => {
  it('sàn có thanh toán đã khấu trừ thay thì không soạn chồng', () => {
    const r = soan(sk({ doanhThuQuy: [2e9, 0, 0, 0], kenh: 'tmdt_co_thanh_toan', phuongPhapTncn: 'doanh_thu' }), { loai: 'quy', nam: 2026, quy: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.can_cu).toContain('nd68_d11_k1');
  });

  it('doanh nghiệp thì nói thẳng là chưa soạn', () => {
    const r = soan(sk({ loai: 'doanh_nghiep', doanhThuQuy: [100e6, 0, 0, 0] }), { loai: 'nam', nam: 2026 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.ly_do).toContain('HTKK');
  });

  it('chưa có doanh thu thì không dựng tờ khai rỗng', () => {
    const r = soan(sk({ doanhThuQuy: null }), { loai: 'nam', nam: 2026 });
    expect(r.ok).toBe(false);
  });

  it('trên 50 tỷ: chưa hỗ trợ tờ khai tháng', () => {
    const r = soan(sk({ doanhThuQuy: [20e9, 20e9, 20e9, 10e9], phuongPhapTncn: 'thu_nhap' }), { loai: 'quy', nam: 2026, quy: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.ly_do).toContain('theo tháng');
  });
});

describe('kỳ gợi ý', () => {
  it('dưới ngưỡng thì gợi ý thông báo doanh thu năm; vượt ngưỡng thì gợi ý quý vừa xong', () => {
    const duoi = sk({ doanhThuQuy: [100e6, 0, 0, 0], homNay: '2026-09-16' });
    expect(kyGoiY(duoi, suyLuan(duoi))).toEqual({ loai: 'nam', nam: 2026 });
    const tren = sk({ doanhThuQuy: [600e6, 600e6, 0, 0], homNay: '2026-09-16', phuongPhapTncn: 'doanh_thu' });
    expect(kyGoiY(tren, suyLuan(tren))).toEqual({ loai: 'quy', nam: 2026, quy: 2 });
  });
});
