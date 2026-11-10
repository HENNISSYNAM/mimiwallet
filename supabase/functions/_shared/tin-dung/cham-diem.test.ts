import { describe, expect, it } from 'vitest';
import {
  bamDauVao, danhGiaSanSangVay, jsonOnDinh, NHAN_TRUNG_THUC, PHIEN_BAN_DANH_GIA, SO_THANG_TOI_THIEU, tangTruong, traGopThang, TRONG_SO,
  type DauVaoDanhGia, type KetQuaDanhGia,
} from './cham-diem';
import { GIA_DINH, sucChuaGoc } from '../tai-chinh/phuong-an';
import { chuanBiDauVao, laTraNoVay } from './du-lieu';

const thang = (n: number, vao = 100_000_000, ra = 70_000_000) =>
  Array.from({ length: n }, (_, i) => ({ khoa: `2026-${String(i + 1).padStart(2, '0')}`, vao, ra }));

const dv = (p: Partial<DauVaoDanhGia> = {}): DauVaoDanhGia => ({
  thang: thang(10), so_tien_de_nghi: 100_000_000, ky_han_thang: 12, cong_no_qua_han: 0, ty_le_khach_lon_nhat: 0.1,
  tien_nghi_chua_xac_nhan: 0, tong_tien_vao: 1_000_000_000,
  vay_hien_co: { tien_vay_vao: 0, so_khoan_vay_vao: 0, tra_no_ra: 0, so_khoan_tra_no: 0 },
  ...p,
});
const co = (k: KetQuaDanhGia) => { if (!k.co_diem) throw new Error('không có điểm'); return k; };
const yt = (k: KetQuaDanhGia, khoa: string) => co(k).yeu_to.find((y) => y.khoa === khoa)!;

describe('bảng điểm sẵn sàng vay', () => {
  it('trọng số cộng đúng 100 và mỗi yếu tố có mặt đúng một lần', () => {
    expect(Object.values(TRONG_SO).reduce((s, x) => s + x, 0)).toBe(100);
    const k = co(danhGiaSanSangVay(dv()));
    expect(k.yeu_to.map((y) => y.khoa)).toEqual(Object.keys(TRONG_SO));
    expect(k.diem).toBe(k.yeu_to.reduce((s, y) => s + y.diem, 0));
    for (const y of k.yeu_to) {
      expect(y.diem).toBeGreaterThanOrEqual(0);
      expect(y.diem).toBeLessThanOrEqual(y.toi_da);
      expect(y.ly_do.length).toBeGreaterThan(10);
      expect(y.ma_ly_do).toBe(`${y.khoa}.${y.muc}`);
      if (y.diem < y.toi_da) expect(y.goi_y.length).toBeGreaterThan(5); else expect(y.goi_y).toBe('');
    }
  });

  it('hồ sơ khoẻ, khoản nhỏ → "Sẵn sàng", không có điều kiện chặn', () => {
    const k = co(danhGiaSanSangVay(dv({ thang: thang(12) })));
    expect(k.muc).toBe('vung');
    expect(k.diem).toBeGreaterThanOrEqual(75);
    expect(k.chan).toEqual([]);
  });

  it('nhãn trung thực và phiên bản luôn đi kèm, kể cả khi không chấm', () => {
    const a = danhGiaSanSangVay(dv());
    const b = danhGiaSanSangVay(dv({ thang: thang(2) }));
    for (const k of [a, b]) {
      expect(k.nhan).toBe(NHAN_TRUNG_THUC.vi);
      expect(k.nhan).toContain('NĐ 58/2021');
      expect(k.phien_ban).toBe(PHIEN_BAN_DANH_GIA);
    }
    expect(danhGiaSanSangVay(dv(), 'en').nhan).toContain('not a credit score');
  });

  it('tái lập: cùng đầu vào → cùng kết quả và cùng mã băm; thứ tự tháng không đổi kết quả', async () => {
    const a = danhGiaSanSangVay(dv());
    const b = danhGiaSanSangVay(dv({ thang: [...thang(10)].reverse() }));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(await bamDauVao(dv())).toBe(await bamDauVao(dv()));
    expect(await bamDauVao(dv())).toMatch(/^[0-9a-f]{64}$/);
    expect(await bamDauVao(dv({ so_tien_de_nghi: 100_000_001 }))).not.toBe(await bamDauVao(dv()));
    expect(jsonOnDinh({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe(jsonOnDinh({ a: [2, { c: 2, d: 1 }], b: 1 }));
  });

  it(`dưới ${SO_THANG_TOI_THIEU} tháng: không chấm, nói rõ thiếu gì`, () => {
    for (const n of [0, 1, 2]) {
      const k = danhGiaSanSangVay(dv({ thang: thang(n) }));
      expect(k.co_diem).toBe(false);
      if (!k.co_diem) {
        expect(k.so_thang).toBe(n);
        expect(k.ly_do).toContain(`hiện có ${n}`);
        expect(k.goi_y.length).toBeGreaterThan(0);
      }
    }
    expect(danhGiaSanSangVay(dv({ thang: thang(3) })).co_diem).toBe(true);
  });

  it('không có tiền vào: dòng tiền không dương → chặn, mức "chưa nên", khả năng trả 0 điểm', () => {
    const k = co(danhGiaSanSangVay(dv({ thang: thang(6, 0, 10_000_000), tong_tien_vao: 0 })));
    expect(k.chan.map((c) => c.ma)).toEqual(['dong_tien_khong_duong']);
    expect(k.muc).toBe('chua_nen');
    expect(yt(k, 'tra_no').diem).toBe(0);
    expect(yt(k, 'tra_no').muc).toBe('khong_do');
    expect(k.so_lieu.ty_le_tra_no).toBeNull();
  });

  it('đề nghị khổng lồ: trả góp vượt cả dòng tiền ròng → chặn "vượt sức trả" dù các yếu tố khác tốt', () => {
    const k = co(danhGiaSanSangVay(dv({ so_tien_de_nghi: 50_000_000_000, ky_han_thang: 12 })));
    expect(k.chan.map((c) => c.ma)).toEqual(['vuot_suc_tra']);
    expect(k.muc).toBe('chua_nen');
    expect(yt(k, 'tra_no').diem).toBe(0);
    expect(k.ly_do_chinh[0].khoa).toBe('tra_no');
  });

  it('khả năng trả: trả góp, trả tối đa và gốc tối đa khớp công thức phương án tài trợ', () => {
    const k = co(danhGiaSanSangVay(dv()));
    const rong = 30_000_000;
    expect(k.so_lieu.rong_tb).toBe(rong);
    expect(k.so_lieu.tra_toi_da_thang).toBe(Math.round(rong * GIA_DINH.ty_le_tra_no_tren_dong_tien_rong));
    expect(k.so_lieu.goc_toi_da.thap).toBe(Math.round(sucChuaGoc(rong * 0.3, 12, GIA_DINH.lai_nam_cao)));
    expect(k.so_lieu.goc_toi_da.cao).toBe(Math.round(sucChuaGoc(rong * 0.3, 12, GIA_DINH.lai_nam_thap)));
    expect(k.so_lieu.tra_gop_thang.cao).toBe(Math.round(traGopThang(100_000_000, 12, GIA_DINH.lai_nam_cao)));
    // Trả góp và sức chứa là hai chiều của cùng một công thức.
    expect(sucChuaGoc(traGopThang(100_000_000, 24, 0.12), 24, 0.12)).toBeCloseTo(100_000_000, 0);
    expect(traGopThang(1_200_000, 12, 0)).toBe(100_000);
    expect(traGopThang(0, 12, 0.1)).toBe(0);
  });

  it('khả năng trả: đúng 30% → tối đa; trên mức an toàn giảm điểm và vào lý do chính', () => {
    // Trả góp ≈ 9 triệu/tháng = 30% của 30 triệu.
    const goc30 = Math.floor(sucChuaGoc(9_000_000, 12, GIA_DINH.lai_nam_cao));
    expect(yt(danhGiaSanSangVay(dv({ so_tien_de_nghi: goc30 })), 'tra_no').diem).toBe(25);
    const k = co(danhGiaSanSangVay(dv({ so_tien_de_nghi: 250_000_000 })));
    expect(yt(k, 'tra_no').diem).toBeLessThan(25);
    expect(yt(k, 'tra_no').goi_y).toMatch(/tối đa khoảng/);
    expect(k.ly_do_chinh.some((l) => l.khoa === 'tra_no')).toBe(true);
  });

  it('lịch sử: 3 tháng ít điểm, 12 tháng tối đa', () => {
    expect(yt(danhGiaSanSangVay(dv({ thang: thang(3) })), 'lich_su').diem).toBe(Math.round(15 / 10));
    expect(yt(danhGiaSanSangVay(dv({ thang: thang(12) })), 'lich_su').diem).toBe(15);
  });

  it('ổn định: doanh thu dao động mạnh bị trừ điểm', () => {
    const daoDong = [40, 160, 40, 160, 40, 160].map((v, i) => ({ khoa: `2026-0${i + 1}`, vao: v * 1e6, ra: 50e6 }));
    const y = yt(danhGiaSanSangVay(dv({ thang: daoDong })), 'on_dinh');
    expect(y.diem).toBeLessThan(5);
    expect(y.ly_do).toMatch(/dao động/);
  });

  it('xu hướng: giảm mạnh bị trừ điểm; tăng được tối đa; công thức k tháng gần so với k tháng trước', () => {
    expect(tangTruong([100, 100, 100, 50, 50, 50])).toBeCloseTo(-0.5);
    expect(tangTruong([100, 120])).toBeCloseTo(0.2);
    expect(tangTruong([100])).toBeNull();
    const giam = [100, 100, 100, 50, 50, 50].map((v, i) => ({ khoa: `2026-0${i + 1}`, vao: v * 1e6, ra: 20e6 }));
    const y = yt(danhGiaSanSangVay(dv({ thang: giam })), 'xu_huong');
    expect(y.diem).toBe(0);
    expect(y.ly_do).toMatch(/giảm 50%/);
    const tang = [50, 50, 50, 100, 100, 100].map((v, i) => ({ khoa: `2026-0${i + 1}`, vao: v * 1e6, ra: 20e6 }));
    expect(yt(danhGiaSanSangVay(dv({ thang: tang })), 'xu_huong').diem).toBe(10);
  });

  it('công nợ quá hạn: bằng nửa tháng doanh thu → 0 điểm, kèm lời nhắc thu nợ', () => {
    const y = yt(danhGiaSanSangVay(dv({ cong_no_qua_han: 50_000_000 })), 'thu_no');
    expect(y.diem).toBe(0);
    expect(y.goi_y).toMatch(/quá hạn/);
    expect(yt(danhGiaSanSangVay(dv()), 'thu_no').ly_do).toBe('Không có hoá đơn bán ra quá hạn.');
  });

  it('phụ thuộc khách lớn: 60% → 0 điểm; không biết tên khách → nửa điểm, mức "không đo"', () => {
    expect(yt(danhGiaSanSangVay(dv({ ty_le_khach_lon_nhat: 0.6 })), 'tap_trung').diem).toBe(0);
    const y = yt(danhGiaSanSangVay(dv({ ty_le_khach_lon_nhat: null })), 'tap_trung');
    expect(y.muc).toBe('khong_do');
    expect(y.diem).toBe(Math.round(5 * 0.5));
    expect(y.gia_tri).toBeNull();
  });

  it('doanh thu đã xác nhận: 20% khoản nghi chưa xác nhận → 0 điểm', () => {
    const y = yt(danhGiaSanSangVay(dv({ tien_nghi_chua_xac_nhan: 200_000_000, tong_tien_vao: 1_000_000_000 })), 'minh_bach');
    expect(y.diem).toBe(0);
    expect(y.ly_do).toMatch(/chưa xác nhận/);
  });

  it('nợ vay đang có: trả nợ nặng bị trừ; có giải ngân mà không thấy trả → câu hỏi riêng, nửa điểm', () => {
    const nang = yt(danhGiaSanSangVay(dv({ vay_hien_co: { tien_vay_vao: 0, so_khoan_vay_vao: 0, tra_no_ra: 300_000_000, so_khoan_tra_no: 10 } })), 'no_hien_co');
    expect(nang.diem).toBe(0);
    expect(nang.ly_do).toMatch(/chồng nợ/);
    const la = yt(danhGiaSanSangVay(dv({ vay_hien_co: { tien_vay_vao: 200_000_000, so_khoan_vay_vao: 1, tra_no_ra: 0, so_khoan_tra_no: 0 } })), 'no_hien_co');
    expect(la.muc).toBe('khong_do');
    expect(la.diem).toBe(3);
    expect(la.ly_do).toMatch(/chưa thấy khoản trả nợ/);
    expect(yt(danhGiaSanSangVay(dv()), 'no_hien_co').diem).toBe(5);
  });

  it('ba lý do chính: xếp theo điểm mất, chỉ yếu tố chưa tốt, tối đa 3', () => {
    const k = co(danhGiaSanSangVay(dv({ cong_no_qua_han: 50_000_000, ty_le_khach_lon_nhat: 0.6, so_tien_de_nghi: 250_000_000 })));
    expect(k.ly_do_chinh.length).toBeLessThanOrEqual(3);
    const mat = k.ly_do_chinh.map((l) => l.diem_mat);
    expect([...mat].sort((a, b) => b - a)).toEqual(mat);
    expect(k.ly_do_chinh.map((l) => l.khoa)).toContain('thu_no');
    for (const l of k.ly_do_chinh) expect(l.cau.length).toBeGreaterThan(10);
    expect(co(danhGiaSanSangVay(dv({ thang: thang(12) }))).ly_do_chinh.every((l) => l.diem_mat > 0)).toBe(true);
  });

  it('tiếng Anh: cùng điểm, lời bằng tiếng Anh', () => {
    const vi = co(danhGiaSanSangVay(dv()));
    const en = co(danhGiaSanSangVay(dv(), 'en'));
    expect(en.diem).toBe(vi.diem);
    expect(en.yeu_to[0].ten).toBe('Ability to repay this loan');
    expect(en.yeu_to[0].ly_do).toMatch(/VND/);
  });
});

describe('chuẩn bị đầu vào từ sao kê', () => {
  const gd = (id: string, ngay: string, amount: number, type: 'income' | 'expense', nd = 'KHACH THANH TOAN', ten: string | null = 'KHACH A') =>
    ({ id, amount, type, transaction_date: ngay, merchant_name: null, category: null, counter_account_name: ten, payment_reference: nd });

  it('loại tiền vay khỏi tiền vào, nhận ra giải ngân và trả nợ, đủ 12 dòng tháng (tháng trống = null)', () => {
    const ds = [
      gd('1', '2026-08-05', 100e6, 'income'), gd('2', '2026-08-20', 60e6, 'expense', 'MUA HANG'),
      gd('3', '2026-09-05', 100e6, 'income'), gd('4', '2026-09-10', 500e6, 'income', 'GIAI NGAN HDTD 123', 'NGAN HANG X'),
      gd('5', '2026-09-25', 10e6, 'expense', 'TRA NO GOC LAI HDTD 123', 'NGAN HANG X'),
      gd('6', '2026-10-05', 100e6, 'income'), gd('7', '2026-11-02', 999e6, 'income'),
    ];
    const r = chuanBiDauVao({ homNay: '2026-11-10', giaoDich: ds, phanLoai: {}, hoaDonBan: [] }, { so_tien: 1e8, ky_han_thang: 12 });
    expect(r.bang_thang).toHaveLength(12);
    expect(r.bang_thang[11].khoa).toBe('2026-10');
    expect(r.bang_thang[0].khoa).toBe('2025-11');
    expect(r.bang_thang[0].vao).toBeNull();
    expect(r.dau_vao.thang.map((t) => t.khoa)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(r.dau_vao.thang[1].vao).toBe(100e6); // giải ngân 500 triệu không phải tiền vào kinh doanh
    expect(r.dau_vao.vay_hien_co).toEqual({ tien_vay_vao: 500e6, so_khoan_vay_vao: 1, tra_no_ra: 10e6, so_khoan_tra_no: 1 });
    expect(r.dau_vao.tien_nghi_chua_xac_nhan).toBe(500e6);
    expect(r.tien_vao_bi_loai.so_khoan).toBe(1);
    // Tháng đang chạy không vào bảng điểm.
    expect(r.dau_vao.thang.some((t) => t.khoa === '2026-11')).toBe(false);
  });

  it('chủ đã xác nhận "là doanh thu" thì không coi là tiền vay', () => {
    const ds = [gd('1', '2026-09-10', 50e6, 'income', 'GIAI NGAN HDTD 9'), gd('2', '2026-08-10', 50e6, 'income'), gd('3', '2026-10-10', 50e6, 'income')];
    const r = chuanBiDauVao({ homNay: '2026-11-10', giaoDich: ds, phanLoai: { '1': 'include' }, hoaDonBan: [] }, { so_tien: 1e8, ky_han_thang: 12 });
    expect(r.dau_vao.vay_hien_co.tien_vay_vao).toBe(0);
    expect(r.dau_vao.tien_nghi_chua_xac_nhan).toBe(0);
    expect(r.dau_vao.thang.find((t) => t.khoa === '2026-09')?.vao).toBe(50e6);
  });

  it('công nợ quá hạn và hoá đơn chưa tới hạn', () => {
    const hd = [
      { id: 'a', invoice_number: '1', client_name: 'X', total: 20e6, issued_date: '2026-09-01', due_date: '2026-10-01', status: 'pending' },
      { id: 'b', invoice_number: '2', client_name: 'Y', total: 5e6, issued_date: '2026-11-01', due_date: '2026-12-01', status: 'pending' },
      { id: 'c', invoice_number: '3', client_name: 'Z', total: 7e6, issued_date: '2026-09-01', due_date: '2026-09-15', status: 'paid' },
    ];
    const r = chuanBiDauVao({ homNay: '2026-11-10', giaoDich: [], phanLoai: {}, hoaDonBan: hd }, { so_tien: 1e8, ky_han_thang: 12 });
    expect(r.dau_vao.cong_no_qua_han).toBe(20e6);
    expect(r.hoa_don_cho_chua_han).toEqual({ tong: 5e6, so: 1 });
  });

  it('nhận ra nội dung trả nợ vay, không nhầm khoản chi thường', () => {
    expect(laTraNoVay({ merchant_name: null, counter_account_name: 'VIETCOMBANK', payment_reference: 'TRA GOC VAY THANG 9' })).toBe(true);
    expect(laTraNoVay({ merchant_name: null, counter_account_name: null, payment_reference: 'Trả nợ HĐTD 01/2026' })).toBe(true);
    expect(laTraNoVay({ merchant_name: null, counter_account_name: 'CTY A', payment_reference: 'THANH TOAN TIEN HANG' })).toBe(false);
  });
});
