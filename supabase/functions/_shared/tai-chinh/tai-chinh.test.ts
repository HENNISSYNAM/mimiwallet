import { describe, expect, it } from 'vitest';
import { congThang, duBaoDongTien, phanVi, SO_THANG_TOI_THIEU, type ThangTien } from './du-bao';
import { ghepPhuongAn, GIA_DINH, sucChuaGoc, type HoSoTaiTro } from './phuong-an';
import { duLieuTrong, dongTienLamSach, NANG_LUC, type DuLieu, type GiaoDichTL, type HoaDonBanTL } from '../tro-ly/tinh-toan';
import { nhanYDinh } from '../tro-ly/y-dinh';

const th = (khoa: string, vao: number, ra: number): ThangTien => ({ khoa, vao, ra });
const SAU_THANG = [th('2026-03', 100e6, 70e6), th('2026-04', 110e6, 75e6), th('2026-05', 95e6, 72e6), th('2026-06', 105e6, 74e6), th('2026-07', 100e6, 71e6), th('2026-08', 108e6, 73e6)];
const HOM_NAY = '2026-09-15';

describe('dự báo dòng tiền', () => {
  it('dưới ba tháng đã khép sổ thì KHÔNG dự báo và nói rõ thiếu gì', () => {
    const r = duBaoDongTien([th('2026-07', 1e6, 1e6), th('2026-08', 1e6, 1e6)], { homNay: HOM_NAY, congNoQuaHan: 0 });
    expect(r.du_du_lieu).toBe(false);
    expect(r.kich_ban).toEqual([]);
    expect(r.ly_do_thieu).toContain(`${SO_THANG_TOI_THIEU} tháng`);
  });

  it('tháng đang chạy không được tính là tháng đã khép sổ', () => {
    const r = duBaoDongTien([...SAU_THANG.slice(-2), th('2026-09', 5e6, 1e6)], { homNay: HOM_NAY, congNoQuaHan: 0 });
    expect(r.du_du_lieu).toBe(false);
    expect(r.so_thang_da_khep).toBe(2);
  });

  it('ba kịch bản đúng thứ tự tốt ≥ cơ sở ≥ xấu và đi vào đúng ba tháng sau', () => {
    const r = duBaoDongTien(SAU_THANG, { homNay: HOM_NAY, congNoQuaHan: 0 });
    const [tot, co, xau] = r.kich_ban;
    expect(tot.tong_rong).toBeGreaterThanOrEqual(co.tong_rong);
    expect(co.tong_rong).toBeGreaterThanOrEqual(xau.tong_rong);
    expect(co.thang.map((t) => t.khoa)).toEqual(['2026-10', '2026-11', '2026-12']);
    expect(r.trung_vi?.rong).toBe(Math.round(r.trung_vi!.vao - r.trung_vi!.ra));
  });

  it('chuyển năm đúng khi cộng tháng', () => {
    expect(congThang('2026-11', 3)).toBe('2027-02');
    expect(congThang('2026-12', 1)).toBe('2027-01');
  });

  it('không có cảnh báo nào cho một hộ ổn định, khoẻ', () => {
    expect(duBaoDongTien(SAU_THANG, { homNay: HOM_NAY, congNoQuaHan: 0 }).canh_bao).toEqual([]);
  });

  it('cảnh báo chênh lệch âm liên tiếp, kịch bản xấu thiếu hụt, công nợ quá hạn, phụ thuộc một khách', () => {
    const yeu = [th('2026-05', 80e6, 60e6), th('2026-06', 60e6, 90e6), th('2026-07', 50e6, 85e6), th('2026-08', 55e6, 88e6)];
    const r = duBaoDongTien(yeu, { homNay: HOM_NAY, congNoQuaHan: 30e6, khachTop: { ten: 'KHACH A', ty_le: 0.6, so_khoan: 8 } });
    const ma = r.canh_bao.map((c) => c.ma);
    expect(ma).toContain('rong_am_lien_tiep');
    expect(ma).toContain('kich_ban_xau_thieu_hut');
    expect(ma).toContain('cong_no_qua_han_lon');
    expect(ma).toContain('tap_trung_khach');
  });

  it('khách lớn chỉ có một hai khoản thì không kết luận phụ thuộc', () => {
    const r = duBaoDongTien(SAU_THANG, { homNay: HOM_NAY, congNoQuaHan: 0, khachTop: { ten: 'X', ty_le: 0.9, so_khoan: 2 } });
    expect(r.canh_bao.map((c) => c.ma)).not.toContain('tap_trung_khach');
  });

  it('cảnh báo chi vượt thường lệ chỉ khi đã qua đủ phần tháng', () => {
    const dau = duBaoDongTien([...SAU_THANG, th('2026-09', 20e6, 60e6)], { homNay: '2026-09-02', congNoQuaHan: 0 });
    expect(dau.canh_bao.map((c) => c.ma)).not.toContain('chi_vuot_thuong_le');
    const giua = duBaoDongTien([...SAU_THANG, th('2026-09', 20e6, 60e6)], { homNay: '2026-09-15', congNoQuaHan: 0 });
    expect(giua.canh_bao.map((c) => c.ma)).toContain('chi_vuot_thuong_le');
  });

  it('phân vị nội suy đúng', () => {
    expect(phanVi([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(phanVi([], 0.5)).toBe(0);
  });
});

describe('ghép phương án tài trợ', () => {
  const khoe: HoSoTaiTro = {
    so_thang: 8, vao_lam_sach_tb: 100e6, ra_tb: 70e6, rong_tb: 30e6, he_so_bien_dong_vao: 0.1,
    tien_vao_bi_loai: { so_tien: 0, so_khoan: 0 }, cong_no_qua_han: 0, hoa_don_cho_chua_han: { tong: 50e6, so: 2 },
  };
  const pa = (h: Partial<HoSoTaiTro> = {}) => ghepPhuongAn({ ...khoe, ...h });
  const tim = (ds: ReturnType<typeof pa>, k: string) => ds.find((p) => p.khoa === k)!;

  it('sức chứa gốc tính đúng theo công thức trả đều và tăng khi lãi giảm', () => {
    expect(sucChuaGoc(10e6, 12, 0)).toBe(120e6);
    expect(sucChuaGoc(10e6, 12, 0.18)).toBeLessThan(sucChuaGoc(10e6, 12, 0.10));
    expect(sucChuaGoc(0, 12, 0.1)).toBe(0);
  });

  it('hộ khoẻ: hạn mức vốn lưu động có thể cân nhắc, sức chứa nằm trong khoảng giả định', () => {
    const hm = tim(pa(), 'han_muc_von_luu_dong');
    expect(hm.phu_hop).toBe('co_the');
    const tra = 30e6 * GIA_DINH.ty_le_tra_no_tren_dong_tien_rong;
    expect(hm.suc_chua!.thap).toBe(Math.round(sucChuaGoc(tra, GIA_DINH.ky_han_von_luu_dong_thang, GIA_DINH.lai_nam_cao)));
    expect(hm.suc_chua!.cao).toBe(Math.round(sucChuaGoc(tra, GIA_DINH.ky_han_von_luu_dong_thang, GIA_DINH.lai_nam_thap)));
    expect(hm.con_thieu).toEqual([]);
  });

  it('dòng tiền ròng âm: không phương án vay nào "có thể", không có sức chứa, nói lý do', () => {
    const r = pa({ rong_tb: -5e6 });
    const hm = tim(r, 'han_muc_von_luu_dong');
    expect(hm.phu_hop).toBe('chua_du');
    expect(hm.suc_chua).toBeNull();
    expect(hm.con_thieu.join(' ')).toContain('không dương');
  });

  it('mới có ba tháng sao kê thì chưa đủ điều kiện và nói thiếu bao nhiêu', () => {
    const hm = tim(pa({ so_thang: 3 }), 'han_muc_von_luu_dong');
    expect(hm.phu_hop).toBe('chua_du');
    expect(hm.con_thieu.join(' ')).toContain('Mới có 3 tháng');
  });

  it('có công nợ quá hạn thì phương án "thu nợ trước" đứng đầu và có sức chứa bằng đúng khoản đó', () => {
    const r = pa({ cong_no_qua_han: 27_428_000 });
    expect(r[0].khoa).toBe('thu_no_truoc');
    expect(r[0].phu_hop).toBe('co_the');
    expect(r[0].suc_chua).toEqual({ thap: 27_428_000, cao: 27_428_000 });
  });

  it('không có hoá đơn còn hạn thì không ứng vốn theo hoá đơn; có thì ứng đúng tỉ lệ giả định', () => {
    expect(tim(pa({ hoa_don_cho_chua_han: { tong: 0, so: 0 } }), 'ung_von_hoa_don').phu_hop).toBe('chua_du');
    expect(tim(pa(), 'ung_von_hoa_don').suc_chua).toEqual({ thap: 35e6, cao: 35e6 });
  });

  it('vay thiết bị luôn cần biết mục đích: không bao giờ tự "có thể"', () => {
    expect(tim(pa(), 'vay_thiet_bi').phu_hop).toBe('chua_du');
  });
});

describe('năng lực trong trợ lý', () => {
  const KY = { tu: '2026-07-01', den: '2026-09-30', nhan: 'quý III/2026' };
  const moi = (p: Partial<DuLieu> = {}): DuLieu => ({ ...duLieuTrong(HOM_NAY, KY), ...p });
  let so = 0;
  const gd = (p: Partial<GiaoDichTL>): GiaoDichTL => ({
    id: `g${++so}`, amount: 100_000, type: 'expense', transaction_date: HOM_NAY, merchant_name: null, category: null,
    counter_account_name: 'CONG TY A', payment_reference: null, ...p,
  });
  const sinh = (): GiaoDichTL[] => SAU_THANG.flatMap((t, i) => [
    gd({ type: 'income', amount: t.vao, transaction_date: `${t.khoa}-10`, counter_account_name: `KHACH ${i % 4}`, merchant_name: 'TT HOA DON' }),
    gd({ type: 'expense', amount: -t.ra, transaction_date: `${t.khoa}-20`, counter_account_name: 'NCC' }),
  ]);

  it('không có sao kê: nói chưa có, không có con số giả', () => {
    for (const id of ['du_bao_dong_tien', 'phuong_an_tai_tro']) {
      const r = NANG_LUC[id].chay(moi());
      expect(r.tom_tat).toMatch(/Chưa có giao dịch/);
      expect(r.tom_tat).not.toMatch(/\b0 ₫/);
    }
  });

  it('đủ sáu tháng: dự báo có bảng ba kịch bản và nói rõ là dòng tiền ròng, không phải số dư', () => {
    const r = NANG_LUC.du_bao_dong_tien.chay(moi({ giaoDich: sinh() }));
    expect(r.tom_tat).toContain('dòng tiền RÒNG');
    const bang = r.the.find((t) => t.loai === 'bang');
    expect(bang && bang.loai === 'bang' ? bang.dong.length : 0).toBe(4); // ba tháng + cộng dồn
    expect(JSON.stringify(r.the)).toContain('không phải số dư');
  });

  it('chỉ có hai tháng: không dự báo', () => {
    const r = NANG_LUC.du_bao_dong_tien.chay(moi({ giaoDich: sinh().slice(-4) }));
    expect(r.tom_tat).toContain('Chưa dự báo được');
    expect(r.the.some((t) => t.loai === 'bang')).toBe(false);
  });

  it('làm sạch tiền vào: khoản giải ngân vay không phải dòng tiền kinh doanh, trừ khi chủ xác nhận là doanh thu', () => {
    const vay = gd({ type: 'income', amount: 500e6, transaction_date: '2026-07-05', counter_account_name: 'NGAN HANG', merchant_name: 'GIAI NGAN HDTD 0126' });
    const d = moi({ giaoDich: [...sinh(), vay] });
    expect(dongTienLamSach(d).tienBiLoai).toBe(500e6);
    expect(dongTienLamSach({ ...d, phanLoaiTienVao: { [vay.id]: 'include' } }).tienBiLoai).toBe(0);
    expect(dongTienLamSach({ ...d, phanLoaiTienVao: { [vay.id]: 'exclude' } }).tienBiLoai).toBe(500e6);
  });

  it('sức trả nợ KHÔNG được làm đẹp bởi khoản vay cũ: có vay 500 triệu hay không thì sức chứa như nhau', () => {
    const vay = gd({ type: 'income', amount: 500e6, transaction_date: '2026-07-05', counter_account_name: 'NGAN HANG', merchant_name: 'GIAI NGAN HDTD 0126' });
    const a = NANG_LUC.phuong_an_tai_tro.chay(moi({ giaoDich: sinh() }));
    const b = NANG_LUC.phuong_an_tai_tro.chay(moi({ giaoDich: [...sinh(), vay] }));
    const bangA = a.the.find((t) => t.loai === 'bang'); const bangB = b.the.find((t) => t.loai === 'bang');
    expect(bangB && bangB.loai === 'bang' ? bangB.dong : null).toEqual(bangA && bangA.loai === 'bang' ? bangA.dong : undefined);
    expect(JSON.stringify(b.the)).toContain('Đã loại khỏi tiền vào');
  });

  it('phương án tài trợ luôn nói MIMI không cho vay và nêu giả định đề xuất', () => {
    const r = NANG_LUC.phuong_an_tai_tro.chay(moi({ giaoDich: sinh() }));
    expect(r.tom_tat).toContain('không cho vay');
    expect(JSON.stringify(r.the)).toContain('ĐỀ XUẤT');
  });

  it('có hoá đơn quá hạn thì dự báo đề xuất mở danh sách nhắc khách', () => {
    const qua: HoaDonBanTL = { id: 'h1', invoice_number: 'HD1', client_name: 'KHACH X', total: 60e6, issued_date: '2026-08-01', due_date: '2026-08-30', status: 'pending' };
    const r = NANG_LUC.du_bao_dong_tien.chay(moi({ giaoDich: sinh(), hoaDonBan: [qua] }));
    expect(r.de_xuat[0]).toMatchObject({ loai: 'mo_trang', tham_so: { duong_dan: '/dashboard/invoices?filter=overdue' } });
  });

  describe('thẻ dự báo và tài trợ theo ngôn ngữ câu hỏi', () => {
    const coDau = /[ạảãàáâậầấẩẫăắằặẳẵđêềếệểễôồốộổỗơờớợởỡưừứựửữ]/i;
    it('hỏi tiếng Anh: tiêu đề, cột, cảnh báo và tên phương án đều tiếng Anh', () => {
      const qua: HoaDonBanTL = { id: 'h1', invoice_number: 'HD1', client_name: 'KHACH X', total: 60e6, issued_date: '2026-08-01', due_date: '2026-08-30', status: 'pending' };
      for (const id of ['du_bao_dong_tien', 'phuong_an_tai_tro'] as const) {
        const r = NANG_LUC[id].chay(moi({ giaoDich: sinh(), hoaDonBan: [qua], cauHoi: 'Forecast my cash flow and financing options for the next 3 months' }));
        const chu = JSON.stringify({ t: r.tom_tat, the: r.the.map((t) => ({ ...t, bang_chung: undefined, muc: 'muc' in t ? t.muc.map((m) => ({ ...m, bang_chung: undefined })) : undefined })) });
        expect(chu.replace(/KHACH X|HD1|₫/g, '')).not.toMatch(coDau);
      }
    });
    it('hỏi tiếng Trung: dùng chữ Trung; không có câu hỏi: vẫn tiếng Việt như cũ', () => {
      const zh = NANG_LUC.phuong_an_tai_tro.chay(moi({ giaoDich: sinh(), cauHoi: '我的公司可以申请多少流动资金贷款？' }));
      expect(zh.tom_tat).toContain('MIMI 不放贷');
      expect(NANG_LUC.phuong_an_tai_tro.chay(moi({ giaoDich: sinh() })).tom_tat).toContain('không cho vay');
    });
  });
});

describe('định tuyến câu hỏi', () => {
  it('dự báo và vay vốn tới đúng năng lực, không còn "chưa làm"', () => {
    expect(nhanYDinh('Dự báo dòng tiền 3 tháng tới giúp tôi')).toContain('du_bao_dong_tien');
    expect(nhanYDinh('Tôi có nên vay vốn lưu động không, vay được bao nhiêu?')).toContain('phuong_an_tai_tro');
    expect(nhanYDinh('Dự báo dòng tiền 3 tháng tới giúp tôi')).not.toContain('chua_co_du_bao');
  });
  it('hỏi khoản vay có tính doanh thu không vẫn là câu về phân loại tiền vào', () => {
    const r = nhanYDinh('Khoản vay ngân hàng có tính vào doanh thu không?');
    expect(r[0]).toBe('tien_vao_khong_phai_doanh_thu');
    expect(r).not.toContain('phuong_an_tai_tro');
  });
});
