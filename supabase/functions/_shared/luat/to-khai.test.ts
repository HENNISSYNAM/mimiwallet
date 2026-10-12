import { describe, expect, it } from 'vitest';
import { suyLuan, type SuKienThue } from './he-luat';
import { chonPhienBanTKN, kyGoiY, soanToKhai, type KyToKhai, type ToKhai } from './to-khai';
import { COT_TKN_TT89, dungDongTKN89, kiemCongThucTKN89 } from './mau-tkn-tt89';
import { chiaTheoHoatDong, type HoatDong, type KhoanDoanhThu, type PhanLoaiHoatDong } from '../doanh-thu/theo-hoat-dong';

/**
 * Doanh thu đã chia theo nhóm hoạt động, dựng như dữ liệu thật: mỗi quý một khoản cho mỗi nhóm.
 * `chua_ro` = khoản không ai xác nhận nhóm.
 */
function chia(theoNhom: Partial<Record<HoatDong | 'chua_ro', [number, number, number, number]>>) {
  const khoan: KhoanDoanhThu[] = [];
  const pl: PhanLoaiHoatDong[] = [];
  for (const [n, quy] of Object.entries(theoNhom)) {
    quy!.forEach((tien, i) => {
      if (!tien) return;
      const id = `${n}-q${i + 1}`;
      khoan.push({ nguon: 'hoa_don', id, so_tien: tien, ngay: `2026-${String(i * 3 + 1).padStart(2, '0')}-15` });
      if (n !== 'chua_ro') pl.push({ nguon: 'hoa_don', nguon_id: id, hoat_dong: n as HoatDong });
    });
  }
  return chiaTheoHoatDong('hoa_don', khoan, pl);
}

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

/*
 * Mẫu TT 50 còn dùng cho kỳ kết thúc trước 01/07/2026 (TT 89 Điều 100 khoản 1). Hệ luật MIMI chỉ suy luận từ năm
 * 2026 (NAM_AP_DUNG), nên kỳ thật duy nhất còn ra mẫu TT 50 là "6 tháng đầu năm 2026"; kỳ năm 2025 vẫn bị từ chối
 * như trước (test cuối file).
 */
const NUA_DAU: KyToKhai = { loai: '6_thang_dau', nam: 2026 };

describe('mẫu 01/TKN-CNKD bản TT 50 — thông báo doanh thu 6 tháng đầu năm 2026', () => {
  const s = sk({ doanhThuQuy: [400e6, 400e6, 0, 0] });
  const r = soan(s, NUA_DAU);
  const tk = (r as { ok: true; to_khai: ToKhai }).to_khai;

  it('đúng mẫu, đúng bản Thông tư 50/2026, hạn 31/07', () => {
    expect(r.ok).toBe(true);
    expect(tk.mau).toBe('01/TKN-CNKD');
    expect(tk.kem_theo).toContain('50/2026/TT-BTC');
    expect(tk.phien_ban_mau).toBe('TT50/2026');
    expect(tk.tieu_de).toBe('THÔNG BÁO DOANH THU/TỜ KHAI THUẾ NĂM');
    expect(tk.han_nop).toBe('2026-07-31');
    // Cấu trúc cũ y như trước: 7 cột, dòng theo nhóm ngành [08a]…, [11] tổng, không có phần B–E.
    expect(tk.cot.map((c) => c.khoa)).toEqual(['tong_dt', 'dt_khong_chiu', 'dt_0', 'thue_gtgt', 'dt_chiu_tncn', 'dt_duoc_tru', 'thue_tncn']);
    expect(tk.dong.map((d) => d.ma)).toEqual([
      '[08]', '[08a]', '[08b]', '[08c]', '[08d]', '[08e]', '[08g]', '[09]', '[09a]', '[09b]', '[09c]', '[09d]', '[09e]', '[09g]', '[10]', '[11]', '[12]', '[13]',
    ]);
    expect(tk.danh_dau).toHaveLength(4);
    expect(tk.phan_sau).toBeUndefined();
    expect(tk.danh_dau[1]).toEqual({ nhan: 'Hộ kinh doanh, cá nhân kinh doanh mới ra kinh doanh có doanh thu năm từ 01 tỷ đồng trở xuống', chon: true });
  });

  it('ngành đăng ký KHÔNG tự thành nhóm hoạt động: chưa ai xác nhận thì dòng ngành để trống và chặn xuất', () => {
    // Hồ sơ chỉ có "dịch vụ" — trước 25/09/2026 MIMI đổ cả 800 triệu vào [08b].
    expect(dong(tk, '[08b]')?.o.tong_dt).toBeNull();
    expect(dong(tk, '[11]')?.o.tong_dt).toBe(800e6);
    expect(tk.san_sang.trang_thai).toBe('bi_chan');
    const v = tk.san_sang.vuong.find((x) => x.ma === 'CHUA_RO_HOAT_DONG');
    expect(v?.so_tien).toBe(800e6);
    // Ngành đăng ký chỉ dùng làm GỢI Ý cho nút xác nhận một lần.
    expect(v?.nhom_goi_y).toBe('dich_vu');
  });

  it('điền doanh thu vào dòng đúng nhóm ngành và dòng tổng cộng', () => {
    const r2 = soan({ ...s, hoatDong: chia({ dich_vu: [400e6, 400e6, 0, 0] }) }, NUA_DAU);
    const tk = (r2 as { ok: true; to_khai: ToKhai }).to_khai;
    expect(tk.san_sang.vuong).toEqual([]);
    expect(tk.san_sang.trang_thai).toBe('san_sang');
    expect(dong(tk, '[08b]')?.o.tong_dt).toBe(800e6);
    expect(dong(tk, '[08b]')?.nguon_khoan?.so_khoan).toBe(2);
    expect(dong(tk, '[11]')?.o.tong_dt).toBe(800e6);
    expect(tk.chi_tieu.find((c) => c.ma === '[01b]')?.gia_tri).toBe('2026');
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
    expect(tk.cach_tinh.some((c) => c.includes('[11] Tổng cộng') && c.includes('quý 1 + quý 2'))).toBe(true);
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
  const s = sk({ doanhThuQuy: [300e6, 400e6, 500e6, 0], phuongPhapTncn: 'doanh_thu', hoatDong: chia({ dich_vu: [300e6, 400e6, 500e6, 0] }) });
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

  it('nhiều nhóm hoạt động: GTGT theo tỷ lệ của TỪNG nhóm, TNCN để trống chứ không đoán', () => {
    const b = soan(sk({
      doanhThuQuy: [2e9, 0, 0, 0], nhomNganh: ['phan_phoi_hang_hoa', 'dich_vu'], phuongPhapTncn: 'doanh_thu',
      hoatDong: chia({ phan_phoi_hang_hoa: [1e9, 0, 0, 0], dich_vu: [1e9, 0, 0, 0] }),
    }), { loai: 'quy', nam: 2026, quy: 1 });
    expect(b.ok).toBe(true);
    if (b.ok) {
      // Hàng hoá 1% × 1 tỷ + dịch vụ 5% × 1 tỷ — không còn "5% cho tất cả".
      expect(dong(b.to_khai, '(a)')?.o.thue_gtgt).toBe(10e6);
      expect(dong(b.to_khai, '(b)')?.o.thue_gtgt).toBe(50e6);
      expect(dong(b.to_khai, '[20]')?.o.thue_gtgt).toBe(60e6);
      expect(dong(b.to_khai, '(b)')?.o.thue_tncn).toBeNull();
      expect(b.to_khai.san_sang.trang_thai).toBe('can_xem');
      expect(b.to_khai.san_sang.vuong.map((v) => v.ma)).toEqual(['NHIEU_NHOM_TNCN']);
    }
  });

  it('nhóm nội dung số: kho chưa có tỷ lệ GTGT riêng thì để trống và nói ra', () => {
    const b = soan(sk({ doanhThuQuy: [2e9, 0, 0, 0], nhomNganh: ['noi_dung_so'], phuongPhapTncn: 'doanh_thu', hoatDong: chia({ noi_dung_so: [2e9, 0, 0, 0] }) }), { loai: 'quy', nam: 2026, quy: 1 });
    expect(b.ok).toBe(true);
    if (b.ok) {
      expect(dong(b.to_khai, '(đ)')?.o.thue_gtgt).toBeNull();
      expect(dong(b.to_khai, '(đ)')?.o.thue_tncn).toBe(50e6); // TNCN 5% × (2 tỷ − 1 tỷ)
      expect(b.to_khai.cach_tinh.join(' ')).toContain('chưa có tỷ lệ %');
      expect(b.to_khai.san_sang.vuong.some((v) => v.ma === 'THIEU_TY_LE' && v.chan)).toBe(true);
    }
  });

  it('bán trên nền tảng số không thanh toán thì điền vào phần II và đánh dấu đúng ô', () => {
    const b = soan(sk({ doanhThuQuy: [2e9, 0, 0, 0], kenh: 'tmdt_khong_thanh_toan', phuongPhapTncn: 'doanh_thu', hoatDong: chia({ dich_vu: [2e9, 0, 0, 0] }) }), { loai: 'quy', nam: 2026, quy: 1 });
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

/*
 * HỒI QUY cho đúng lỗi thấy trên công ty demo ngày 25/09/2026: hồ sơ một ngành "phân phối hàng hoá",
 * và TOÀN BỘ doanh thu bị đổ vào [08a]. Test này hỏng với bản cũ.
 */
describe('hồi quy: không dồn doanh thu chưa rõ nhóm vào ngành đăng ký', () => {
  // Kỳ 6 tháng đầu 2026 (mẫu TT 50, có dòng [08a]/[08b]); bản TT 89 có test riêng cho cùng nguyên tắc.
  const s = sk({
    doanhThuQuy: [500e6, 451_983_000, 0, 0], nhomNganh: ['phan_phoi_hang_hoa'],
    hoatDong: chia({
      phan_phoi_hang_hoa: [400e6, 300e6, 0, 0],           // 700 triệu hàng hoá
      dich_vu: [50e6, 100e6, 0, 0],                       // 150 triệu dịch vụ
      chua_ro: [50e6, 51_983_000, 0, 0],                  // 101.983.000 chưa ai xác nhận
    }),
  });
  const r = soan(s, NUA_DAU);
  const tk = (r as { ok: true; to_khai: ToKhai }).to_khai;

  it('mỗi dòng nhận đúng phần đã xác nhận; tổng vẫn là số thật', () => {
    expect(dong(tk, '[11]')?.o.tong_dt).toBe(951_983_000);
    expect(dong(tk, '[08a]')?.o.tong_dt).toBe(700e6);
    expect(dong(tk, '[08b]')?.o.tong_dt).toBe(150e6);
    // Bản cũ: [08a] = 951.983.000.
    expect(dong(tk, '[08a]')?.o.tong_dt).not.toBe(951_983_000);
  });

  it('101.983.000 chưa rõ nhóm chặn xuất, nói rõ số tiền và số khoản', () => {
    expect(tk.san_sang.trang_thai).toBe('bi_chan');
    const v = tk.san_sang.vuong.find((x) => x.ma === 'CHUA_RO_HOAT_DONG')!;
    expect(v.so_tien).toBe(101_983_000);
    expect(v.so_khoan).toBe(2);
    expect(v.hanh_dong).toBe('phan_loai_hoat_dong');
  });

  it('tổng các dòng ngành + phần chưa rõ = tổng cộng — không mất đồng nào', () => {
    const ngành = tk.dong.filter((d) => d.cap === 1).reduce((a, d) => a + (d.o.tong_dt ?? 0), 0);
    const v = tk.san_sang.vuong.find((x) => x.ma === 'CHUA_RO_HOAT_DONG')!;
    expect(ngành + (v.so_tien ?? 0)).toBe(dong(tk, '[11]')?.o.tong_dt);
  });

  it('tờ khai quý cũng vậy: phần chưa rõ làm tổng thuế để trống, không in tổng thiếu', () => {
    const q = soan({ ...s, nam: 2026, homNay: HOM_NAY, doanhThuQuy: [2e9, 0, 0, 0], phuongPhapTncn: 'doanh_thu', hoatDong: chia({ phan_phoi_hang_hoa: [1.5e9, 0, 0, 0], chua_ro: [0.5e9, 0, 0, 0] }) }, { loai: 'quy', nam: 2026, quy: 1 });
    expect(q.ok).toBe(true);
    if (q.ok) {
      expect(dong(q.to_khai, '(a)')?.o.tong_dt).toBe(1.5e9);
      expect(dong(q.to_khai, '(a)')?.o.thue_gtgt).toBe(15e6);
      expect(dong(q.to_khai, '[18]')?.o.tong_dt).toBe(2e9);
      expect(dong(q.to_khai, '[20]')?.o.thue_gtgt).toBeNull();
      expect(q.to_khai.san_sang.trang_thai).toBe('bi_chan');
    }
  });
});

describe('sẵn sàng khai: trạng thái doanh nghiệp và hồ sơ', () => {
  const s = sk({ doanhThuQuy: [200e6, 200e6, 200e6, 200e6], hoatDong: chia({ dich_vu: [200e6, 200e6, 200e6, 200e6] }) });

  it('đủ mọi thứ thì sẵn sàng', () => {
    const r = soanToKhai(s, suyLuan(s), HO_SO, { loai: '6_thang_dau', nam: 2026 }, { trangThai: 'dang_hoat_dong' });
    expect(r.ok && r.to_khai.san_sang.trang_thai).toBe('san_sang');
  });

  it('cơ quan thuế ghi tạm ngừng → chặn tờ khai kỳ thường', () => {
    const r = soanToKhai(s, suyLuan(s), HO_SO, { loai: '6_thang_dau', nam: 2026 }, { trangThai: 'tam_ngung' });
    expect(r.ok && r.to_khai.san_sang.vuong.map((v) => v.ma)).toEqual(['TRANG_THAI_DOANH_NGHIEP']);
    expect(r.ok && r.to_khai.san_sang.trang_thai).toBe('bi_chan');
  });

  it('thiếu mã số thuế → chặn', () => {
    const r = soanToKhai(s, suyLuan(s), { ten: 'X', mst: null }, { loai: '6_thang_dau', nam: 2026 });
    expect(r.ok && r.to_khai.san_sang.vuong.some((v) => v.ma === 'THIEU_MST' && v.chan)).toBe(true);
  });

  it('trạng thái chưa rõ KHÔNG chặn — không có dữ liệu khác với có dữ liệu xấu', () => {
    const r = soanToKhai(s, suyLuan(s), HO_SO, { loai: '6_thang_dau', nam: 2026 }, { trangThai: 'chua_ro' });
    expect(r.ok && r.to_khai.san_sang.trang_thai).toBe('san_sang');
  });
});

describe('chọn bản mẫu 01/TKN-CNKD theo kỳ (TT 89 Điều 100 khoản 1)', () => {
  it('kỳ kết thúc trước 01/07/2026 → TT 50; kỳ kết thúc từ 01/07/2026 → TT 89', () => {
    expect(chonPhienBanTKN({ loai: 'nam', nam: 2025 })).toBe('TT50/2026');
    expect(chonPhienBanTKN({ loai: '6_thang_dau', nam: 2026 })).toBe('TT50/2026');
    expect(chonPhienBanTKN({ loai: 'nam', nam: 2026 })).toBe('TT89/2026');
    expect(chonPhienBanTKN({ loai: '6_thang_dau', nam: 2027 })).toBe('TT89/2026');
  });

  it('6 tháng đầu năm 2026 vẫn ra mẫu TT 50, không còn vướng "mẫu đã thay"', () => {
    const s = sk({ doanhThuQuy: [200e6, 200e6, 200e6, 200e6], hoatDong: chia({ dich_vu: [200e6, 200e6, 200e6, 200e6] }) });
    const r = soan(s, { loai: '6_thang_dau', nam: 2026 });
    expect(r.ok && r.to_khai.phien_ban_mau).toBe('TT50/2026');
    expect(r.ok && r.to_khai.kem_theo).toContain('50/2026/TT-BTC');
    expect(r.ok && r.to_khai.san_sang.vuong.map((v) => v.ma)).toEqual([]);
  });
});

describe('mẫu 01/TKN-CNKD bản TT 89 — thông báo doanh thu năm 2026', () => {
  const s = sk({
    doanhThuQuy: [200e6, 250e6, 200e6, 151_983_123], nhomNganh: ['phan_phoi_hang_hoa', 'dich_vu'],
    hoatDong: chia({ phan_phoi_hang_hoa: [150e6, 200e6, 150e6, 100e6], dich_vu: [50e6, 50e6, 50e6, 51_983_123] }),
  });
  const r = soan(s, { loai: 'nam', nam: 2026 });
  const tk = (r as { ok: true; to_khai: ToKhai }).to_khai;
  const tien = (k: string) => COT_TKN_TT89.findIndex((c) => c.khoa === k);

  it('đúng bản TT 89, gỡ chặn: không còn MAU_DA_THAY, sẵn sàng xuất', () => {
    expect(r.ok).toBe(true);
    expect(tk.mau).toBe('01/TKN-CNKD');
    expect(tk.phien_ban_mau).toBe('TT89/2026');
    expect(tk.kem_theo).toBe('Kèm theo Thông tư số 89/2026/TT-BTC ngày 30 tháng 6 năm 2026 của Bộ trưởng Bộ Tài chính');
    expect(tk.ap_dung).toContain('cá nhân hợp tác kinh doanh với tổ chức');
    expect(tk.han_nop).toBe('2027-01-31');
    expect(tk.san_sang.vuong.map((v) => v.ma)).toEqual([]);
    expect(tk.san_sang.trang_thai).toBe('san_sang');
  });

  it('16 cột (1)…(16), cột (1) là nhóm ngành nghề; 6 ô đánh dấu; chỉ tiêu [06.1]…[07.2]', () => {
    expect(tk.cot).toHaveLength(16);
    expect(tk.cot.map((c) => c.so)).toEqual(Array.from({ length: 16 }, (_, i) => `(${i + 1})`));
    expect(tk.cot[0]).toMatchObject({ khoa: 'nhom_nganh', kieu: 'ma_nhom', nhan: 'Nhóm ngành nghề (chỉ áp dụng với mục 1, 2, 5)' });
    expect(tk.danh_dau).toHaveLength(6);
    expect(tk.danh_dau.map((d) => d.chon)).toEqual([true, false, false, false, false, false]);
    expect(tk.danh_dau[5].nhan).toBe('Giảm thuế do thiên tai, dịch bệnh, hỏa hoạn, tai nạn và bệnh hiểm nghèo');
    expect(tk.chi_tieu.map((c) => c.ma)).toEqual(['[01a]', '[01b]', '[01c]', '[02]', '[03]', '[04]', '[05]', '[06]', '[06.1]', '[06.2]', '[07]', '[07.1]', '[07.2]']);
  });

  it('dòng theo loại hoạt động, mỗi ngành nghề một dòng [08] mang mã nhóm; [13] có ô [13.1]…[13.15]', () => {
    const ma = [...new Set(tk.dong.map((d) => d.ma).filter(Boolean))];
    expect(ma).toEqual(['[08]', '[09]', '[10]', '[11]', '[12]', '[13]', '[14]', '[15]', '[16]', '[17]', '[18]', '[19]', '[20]', '[21]']);
    const d08 = tk.dong.filter((d) => d.ma === '[08]');
    expect(d08.map((d) => [d.o.nhom_nganh, d.o.tong_dt])).toEqual([[1, 600e6], [2, 201_983_123]]);
    expect(d08[1].stt).toBe('');
    expect(dong(tk, '[09]')?.o.tong_dt).toBeNull();
    const t13 = dong(tk, '[13]')!;
    expect(Object.values(t13.ma_o ?? {})).toEqual(Array.from({ length: 15 }, (_, i) => `[13.${i + 1}]`));
    expect(t13.ma_o?.tong_dt).toBe('[13.1]');
    expect(t13.ma_o?.nop_them_tncn).toBe('[13.13]');
    expect(dong(tk, '[15]')?.gop?.cong_thuc).toBe('[15]=[13.13]-[14]>=0');
    expect(dong(tk, '[21]')?.gop?.cong_thuc).toBe('[21]=[19.15]+[20]');
    expect(tien('nop_thua_tncn')).toBe(15);
  });

  it('công thức cộng: [13.1] = tổng cột (2) các dòng [08]…[12]; tiền là số nguyên', () => {
    const tongDong = tk.dong.filter((d) => ['[08]', '[09]', '[10]', '[11]', '[12]'].includes(d.ma ?? '')).reduce((a, d) => a + (d.o.tong_dt ?? 0), 0);
    expect(dong(tk, '[13]')?.o.tong_dt).toBe(tongDong);
    expect(tongDong).toBe(801_983_123);
    expect(kiemCongThucTKN89(tk.dong)).toEqual([]);
    for (const d of tk.dong) for (const v of Object.values(d.o)) if (v !== null) expect(Number.isSafeInteger(v)).toBe(true);
  });

  it('ô MIMI không biết thì để TRỐNG, không điền 0: số thuế, cột (3)–(16), [14]–[21]', () => {
    for (const d of tk.dong) {
      for (const k of COT_TKN_TT89.slice(2).map((c) => c.khoa)) expect(d.o[k]).toBeNull();
      if (d.gop) expect(d.gop.gia_tri).toBeNull();
    }
    expect(dong(tk, '[19]')?.o.tong_dt).toBeNull();
    expect(tk.cach_tinh.some((c) => c.includes('[13.1]') && c.includes('4 quý'))).toBe(true);
  });

  it('in nguyên văn phần B–E, bảng bù trừ, Ghi chú và khối ký mới', () => {
    expect(tk.phan_sau?.map((p) => p.tieu_de)).toEqual([
      'B. KÊ KHAI THUẾ TIÊU THỤ ĐẶC BIỆT',
      'C. KÊ KHAI THUẾ TÀI NGUYÊN, BẢO VỆ MÔI TRƯỜNG, PHÍ BẢO VỆ MÔI TRƯỜNG',
      'D. HỖ TRỢ THÔNG TIN NỘP THUẾ',
      'E. ĐỀ NGHỊ XỬ LÝ KHOẢN NỘP THỪA',
      null,
    ]);
    expect(tk.phan_sau?.[3].dong_ke?.[0]).toBe('[49] Đề nghị hoàn trả:');
    expect(tk.ghi_chu_mau).toHaveLength(4);
    expect(tk.ghi_chu_mau[0]).toContain('chỉ thực hiện thông báo doanh thu; không thực hiện khai số thuế GTGT, thuế TNCN phải nộp');
    expect(tk.ghi_chu_mau[1]).toContain('kê khai mỗi ngành nghề trên 01 dòng');
    expect(tk.cam_doan).toBe('Tôi cam đoan những nội dung kê khai trên là đúng và chịu trách nhiệm trước pháp luật về những nội dung đã khai./.');
    expect(tk.chu_ky?.dich_vu[0]).toBe('NGƯỜI TRỰC TIẾP THỰC HIỆN DỊCH VỤ LÀM THỦ TỤC VỀ THUẾ');
    // Mọi hàng của mỗi bảng phải đủ số cột (tính cả ô gộp) — bảng in lệch cột là in sai mẫu.
    for (const p of tk.phan_sau ?? []) {
      if (!p.bang) continue;
      const rong = p.bang.dau[0].reduce((a, x) => a + x.cot, 0);
      for (const h of [...p.bang.dau.slice(p.bang.dau[0].some((x) => x.hang > 1) ? 2 : 1), ...p.bang.than]) {
        expect(h.reduce((a, x) => a + x.cot, 0)).toBe(rong);
      }
    }
  });

  it('bán trên nền tảng số không thanh toán → dòng [09], [08] để trống', () => {
    const b = soan({ ...s, kenh: 'tmdt_khong_thanh_toan' }, { loai: 'nam', nam: 2026 });
    const t = (b as { ok: true; to_khai: ToKhai }).to_khai;
    expect(t.dong.filter((d) => d.ma === '[09]').map((d) => d.o.tong_dt)).toEqual([600e6, 201_983_123]);
    expect(dong(t, '[08]')?.o.tong_dt).toBeNull();
    expect(kiemCongThucTKN89(t.dong)).toEqual([]);
  });

  it('doanh thu chưa rõ nhóm: không ghi lên dòng nào, [13.1] vẫn là số thật, chặn xuất', () => {
    const b = soan({ ...s, hoatDong: chia({ dich_vu: [100e6, 0, 0, 0], chua_ro: [100e6, 250e6, 200e6, 151_983_123] }) }, { loai: 'nam', nam: 2026 });
    const t = (b as { ok: true; to_khai: ToKhai }).to_khai;
    expect(dong(t, '[08]')?.o).toMatchObject({ nhom_nganh: 2, tong_dt: 100e6 });
    expect(dong(t, '[13]')?.o.tong_dt).toBe(801_983_123);
    const v = t.san_sang.vuong.find((x) => x.ma === 'CHUA_RO_HOAT_DONG')!;
    expect(v.so_tien).toBe(701_983_123);
    expect(t.san_sang.trang_thai).toBe('bi_chan');
    expect(t.san_sang.vuong.some((x) => x.ma === 'SAI_CONG_THUC')).toBe(false);
  });

  it('không ai xác nhận nhóm nào: dòng [08] trống, không có mã nhóm bịa', () => {
    const b = soan({ ...s, hoatDong: undefined }, { loai: 'nam', nam: 2026 });
    const t = (b as { ok: true; to_khai: ToKhai }).to_khai;
    expect(dong(t, '[08]')?.o.nhom_nganh).toBeNull();
    expect(dong(t, '[08]')?.o.tong_dt).toBeNull();
    expect(t.san_sang.trang_thai).toBe('bi_chan');
  });
});

describe('kiểm công thức mẫu TT 89', () => {
  const dd = () => dungDongTKN89({ '[08]': [{ nhom: 'dich_vu', tong_dt: 100 }] });

  it('bắt tổng [13.k] lệch, tiền không nguyên, mã nhóm sai mục, [15]–[18] sai công thức', () => {
    const a = dd(); a.find((d) => d.ma === '[13]')!.o.tong_dt = 99;
    expect(kiemCongThucTKN89(a).join(' ')).toContain('[13.1]');
    const b = dd(); b.find((d) => d.ma === '[08]')!.o.tong_dt = 100.5;
    expect(kiemCongThucTKN89(b).length).toBeGreaterThan(0);
    const c = dd(); c.find((d) => d.ma === '[10]')!.o.nhom_nganh = 2;
    expect(kiemCongThucTKN89(c).join(' ')).toContain('mục 1, 2, 5');
    const e = dd();
    const t13 = e.find((d) => d.ma === '[13]')!;
    e.find((d) => d.ma === '[08]')!.o.nop_them_tncn = 40_000;
    t13.o.nop_them_tncn = 40_000;
    e.find((d) => d.ma === '[15]')!.gop!.gia_tri = 40_000;
    e.find((d) => d.ma === '[16]')!.gop!.gia_tri = 40_000;
    e.find((d) => d.ma === '[17]')!.gop!.gia_tri = 0;
    expect(kiemCongThucTKN89(e)).toEqual([]);
    e.find((d) => d.ma === '[17]')!.gop!.gia_tri = 40_000;
    expect(kiemCongThucTKN89(e).join(' ')).toContain('[17]');
  });
});

describe('kỳ năm 2025: không đổi so với trước', () => {
  it('hệ luật chỉ áp từ 2026 nên vẫn không soạn (như trước khi có mẫu TT 89); nếu soạn thì là mẫu TT 50', () => {
    const s25 = sk({ nam: 2025, homNay: '2026-01-05', doanhThuQuy: [200e6, 200e6, 200e6, 200e6] });
    expect(soan(s25, { loai: 'nam', nam: 2025 }).ok).toBe(false);
    expect(chonPhienBanTKN({ loai: 'nam', nam: 2025 })).toBe('TT50/2026');
  });
});
