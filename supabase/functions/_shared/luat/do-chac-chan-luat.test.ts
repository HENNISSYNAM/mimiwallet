/**
 * Độ chắc chắn đi vào hệ luật, lịch thuế và "sẵn sàng khai thuế" (30/09/2026):
 * khi doanh thu ước tính CẮT một ngưỡng luật thì MIMI không kết luận nghĩa vụ — dừng, và hỏi đúng một câu.
 */
import { describe, expect, it } from 'vitest';
import { suyLuan, type SuKienThue } from './he-luat';
import { lichThue, mocKeTiep, type MocThue } from './lich-thue';
import { sanSangThue } from './san-sang-thue';
import { chuaChacTuDoChacChan } from './doc-su-kien';
import { tinhDoChacChan } from '../doanh-thu/do-chac-chan';

const HOM_NAY = '2026-09-25';
const CAU = 'Có phải khoản 200.000.000đ ngày 10/06 là tiền bán hàng của bạn không?';
const chuaChac = (p: Partial<NonNullable<SuKienThue['doanhThuChuaChac']>> = {}): NonNullable<SuKienThue['doanhThuChuaChac']> => ({
  nguong_1_ty: true, nguong_3_ty: false, nguong_50_ty: false, quy_vuot: false, cau_hoi: { khoa: 'gd:vay', cau: CAU, vi_sao: 'Doanh thu đang sát ngưỡng 01 tỷ.' }, ...p,
});
const sk = (p: Partial<SuKienThue> = {}): SuKienThue => ({
  nam: 2026, homNay: HOM_NAY, loai: 'ho_kinh_doanh', doanhThuQuy: [300e6, 300e6, 300e6, 150e6], nguonDoanhThu: 'ngan_hang',
  nhomNganh: ['dich_vu'], kenh: 'dia_diem_co_dinh', phuongPhapTncn: 'doanh_thu', batDauKinhDoanh: null,
  daNopThueTrongNam: null, nganhDacThu: null, doanhThuNamTruoc: null, coQuanHeLienKet: null, ...p,
});
const id = (s: SuKienThue) => suyLuan(s).ket_luan.map((k) => k.id);

describe('hệ luật dừng khi doanh thu ước tính cắt ngưỡng 01 tỷ', () => {
  it('đối chứng: không cờ chưa chắc thì kết luận như cũ (1,05 tỷ → chịu GTGT, khai theo quý)', () => {
    const ids = id(sk());
    expect(ids).toContain('tren_nguong');
    expect(ids).toContain('khai_theo_quy');
    expect(ids).toContain('hoa_don_co_ma');
  });

  it('cờ nguong_1_ty: KHÔNG có "dưới ngưỡng" hay "trên ngưỡng", không miễn, không nghĩa vụ; có câu hỏi trong thiếu', () => {
    const s = sk({ doanhThuChuaChac: chuaChac() });
    const sl = suyLuan(s);
    const ids = sl.ket_luan.map((k) => k.id);
    for (const cam of ['duoi_nguong', 'tren_nguong', 'khong_chiu_gtgt', 'khong_nop_tncn', 'chiu_gtgt', 'nop_tncn', 'khai_theo_quy', 'thong_bao_doanh_thu', 'hoa_don_co_ma']) {
      expect(ids, cam).not.toContain(cam);
    }
    expect(ids).toContain('doanh_thu_nam');
    expect(sl.thieu).toContainEqual({ truong: 'doanh_thu_chua_chac', cau: CAU });
    expect(sl.quy_vuot).toBeNull();
  });

  it('cùng doanh thu DƯỚI ngưỡng cũng vậy: khoảng cắt ngưỡng thì không nói "miễn"', () => {
    const s = sk({ doanhThuQuy: [200e6, 200e6, 200e6, 200e6], doanhThuChuaChac: chuaChac() });
    expect(id(s)).not.toContain('khong_nop_tncn');
    expect(id(s)).not.toContain('duoi_nguong');
  });

  it('lịch thuế: không có mốc khai quý hay thông báo doanh thu; có ĐÚNG MỘT mốc "cần xác minh" mang câu hỏi', () => {
    const s = sk({ doanhThuChuaChac: chuaChac() });
    const l = lichThue({ sk: s, sl: suyLuan(s), homNay: HOM_NAY });
    expect(l.filter((m) => m.loai === 'khai_va_nop' || m.loai === 'thong_bao_doanh_thu')).toEqual([]);
    const cx = l.filter((m) => m.trang_thai === 'can_xac_minh');
    expect(cx).toHaveLength(1);
    expect(cx[0]).toMatchObject({ khoa: 'hkd_doanh_thu_chua_chac', han: null, cau_hoi: CAU, con_lai: null });
    // Mốc không có hạn giả.
    expect(mocKeTiep(l)).toBeNull();
  });

  it('quý vượt chưa chắc: vẫn nói vượt 1 tỷ (chắc), nhưng KHÔNG nêu quý bắt đầu khai, hạn quý, hạn hoá đơn có mã', () => {
    const s = sk({ doanhThuChuaChac: chuaChac({ nguong_1_ty: false, quy_vuot: true }) });
    const sl = suyLuan(s);
    const ids = sl.ket_luan.map((k) => k.id);
    expect(ids).toContain('tren_nguong');
    expect(ids).toContain('chiu_gtgt');
    expect(ids).toContain('nop_tncn');
    for (const cam of ['khai_tu_quy_vuot', 'khai_theo_quy', 'hoa_don_co_ma']) expect(ids, cam).not.toContain(cam);
    expect(sl.ket_luan.find((k) => k.id === 'tren_nguong')?.cau).not.toMatch(/quý \d\//);
    expect(sl.thieu.some((t) => t.truong === 'doanh_thu_chua_chac')).toBe(true);
    const l = lichThue({ sk: s, sl, homNay: HOM_NAY });
    expect(l.some((m) => m.khoa === 'hkd_doanh_thu_chua_chac' && m.trang_thai === 'can_xac_minh')).toBe(true);
    expect(l.some((m) => m.loai === 'khai_va_nop')).toBe(false);
  });

  it('ngưỡng 03 tỷ chưa chắc: không chốt phương pháp tính TNCN, nghĩa vụ 01 tỷ vẫn giữ', () => {
    const s = sk({ doanhThuQuy: [1_000e6, 1_000e6, 1_000e6, 0], phuongPhapTncn: null, doanhThuChuaChac: chuaChac({ nguong_1_ty: false, nguong_3_ty: true }) });
    const sl = suyLuan(s);
    const ids = sl.ket_luan.map((k) => k.id);
    expect(ids).toContain('nop_tncn');
    expect(ids).not.toContain('phuong_phap_tncn');
    expect(ids).not.toContain('tam_nop_va_quyet_toan');
    expect(sl.phuong_phap).toBeNull();
    expect(sl.thieu.some((t) => t.truong === 'doanh_thu_chua_chac')).toBe(true);
  });

  it('ngưỡng 50 tỷ chưa chắc: không chốt khai theo quý hay theo tháng', () => {
    const s = sk({ doanhThuQuy: [15_000e6, 15_000e6, 15_000e6, 4_500e6], doanhThuChuaChac: chuaChac({ nguong_1_ty: false, nguong_50_ty: true }) });
    const ids = id(s);
    expect(ids).not.toContain('khai_theo_quy');
    expect(ids).not.toContain('khai_theo_thang');
  });

  it('doanh nghiệp: cờ không ảnh hưởng (ngưỡng năm nay không phải luật của doanh nghiệp)', () => {
    const a = id(sk({ loai: 'doanh_nghiep', doanhNamTruoc: undefined } as never));
    const b = id(sk({ loai: 'doanh_nghiep', doanhThuChuaChac: chuaChac() }));
    expect(b).toEqual(a);
  });

  it('không cờ (nguồn hoá đơn / số tự khai): không bao giờ dừng', () => {
    const s = sk({ nguonDoanhThu: 'hoa_don_dien_tu', doanhThuChuaChac: null });
    expect(id(s)).toContain('khai_theo_quy');
  });
});

describe('chuaChacTuDoChacChan: từ kết quả độ chắc chắn sang cờ cho hệ luật', () => {
  it('chắc thì null; chưa chắc thì mang đúng câu hỏi và đúng ngưỡng', () => {
    expect(chuaChacTuDoChacChan(undefined)).toBeNull();
    expect(chuaChacTuDoChacChan(tinhDoChacChan({ gia_tri: 100e6, co_du_lieu: true }))).toBeNull();
    const dc = tinhDoChacChan({
      gia_tri: 1_050e6, co_the_giam: 200e6, co_du_lieu: true,
      ung_vien: [{ khoa: 'gd:vay', loai: 'khoan_tien_vao', so_tien: 200e6, mo_ta: 'khoản 200.000.000đ ngày 10/06' }],
    });
    expect(chuaChacTuDoChacChan(dc)).toMatchObject({ nguong_1_ty: true, nguong_3_ty: false, nguong_50_ty: false, quy_vuot: false, cau_hoi: { khoa: 'gd:vay' } });
  });
});

describe('sẵn sàng khai thuế đi qua độ chắc chắn — hình dạng cũ vẫn giữ, có thêm trường mới', () => {
  const moc = (o: Partial<MocThue> = {}): MocThue => ({ khoa: 'gtgt_q3', ten: 'Khai thuế GTGT quý 3/2026', loai: 'khai_va_nop', trang_thai: 'phai_lam', han: '2026-10-31', con_lai: 36, vi_sao: 'x', can_cu: [], ...o });
  const s = (o: Record<string, number | boolean> = {}) => ({ uoc_tinh: 500_000_000, da_xac_nhan: 450_000_000, chua_ro: 50_000_000, so_chua_ro: 3, co_ket_noi_ngan_hang: true, so_giao_dich: 120, ...o });

  it('đúng các trường cũ và các trường mới có mặt', () => {
    const r = sanSangThue([moc()], s());
    for (const k of ['ky', 'loai_nghia_vu', 'ten_viec', 'trang_thai', 'han', 'con_lai', 'doanh_thu_biet', 'doanh_thu_da_phan_loai', 'doanh_thu_chua_phan_loai', 'so_khoan_chua_phan_loai', 'giay_to_can', 'giay_to_thieu', 'chan', 'du_kien_thieu', 'viec_tiep', 'do_tin_cay', 'nguon']) {
      expect(r, k).toHaveProperty(k);
    }
    for (const k of ['do_chac_chan', 'khoang_doanh_thu', 'ket_luan_phu_thuoc', 'cau_hoi_can_xem', 'chi_tiet_do_chac_chan']) expect(r, k).toHaveProperty(k);
    expect(r).toMatchObject({ do_tin_cay: 'cao', do_chac_chan: 'chac', ket_luan_phu_thuoc: false, cau_hoi_can_xem: null, khoang_doanh_thu: { can_duoi: 450_000_000, can_tren: 500_000_000 } });
  });

  it('nhãn cũ: chac→cao, can_xem→trung_binh, chua_du_du_lieu→thap', () => {
    expect(sanSangThue([moc()], s({ chua_ro: 0, so_chua_ro: 0, da_xac_nhan: 500e6 })).do_tin_cay).toBe('cao');
    expect(sanSangThue([moc()], s({ da_xac_nhan: 100e6, chua_ro: 400e6 })).do_tin_cay).toBe('trung_binh');
    expect(sanSangThue([moc()], s({ so_giao_dich: 0, co_ket_noi_ngan_hang: false, uoc_tinh: 0, da_xac_nhan: 0, chua_ro: 0, so_chua_ro: 0 })).do_tin_cay).toBe('thap');
  });

  it('5 triệu chưa rõ quanh 1 tỷ: cũ "cao" và nói nghĩa vụ; giờ can_xac_minh, đúng một câu hỏi đứng đầu việc tiếp, không hỏi trùng', () => {
    const r = sanSangThue([moc()], s({ uoc_tinh: 1_003e6, da_xac_nhan: 998e6, chua_ro: 5e6, so_chua_ro: 1 }));
    expect(r.trang_thai).toBe('can_xac_minh');
    expect(r).toMatchObject({ do_tin_cay: 'trung_binh', do_chac_chan: 'can_xem', ket_luan_phu_thuoc: true });
    expect(r.khoang_doanh_thu).toEqual({ can_duoi: 998e6, can_tren: 1_003e6 });
    expect(r.cau_hoi_can_xem).toMatchObject({ khoa: 'tong_chua_ro', hanh_dong: 'xac_nhan_tien_vao' });
    expect(r.viec_tiep[0]).toMatch(/^Trả lời: /);
    expect(r.viec_tiep.some((v) => v.startsWith('Xác nhận '))).toBe(false);
  });

  it('không có mốc có hạn (lịch chỉ có mốc "cần xác minh" không hạn) mà kết luận phụ thuộc: vẫn là can_xac_minh + câu hỏi, KHÔNG phải "không có việc"', () => {
    const r = sanSangThue([], s({ uoc_tinh: 1_003e6, da_xac_nhan: 998e6, chua_ro: 5e6, so_chua_ro: 1 }));
    expect(r.trang_thai).toBe('can_xac_minh');
    expect(r.viec_tiep[0]).toMatch(/^Trả lời: /);
  });

  it('doanh nghiệp: cùng số liệu không bị dừng vì ngưỡng của hộ kinh doanh', () => {
    const r = sanSangThue([moc()], s({ uoc_tinh: 1_003e6, da_xac_nhan: 998e6, chua_ro: 5e6, so_chua_ro: 1 }), null, 'doanh_nghiep');
    expect(r.ket_luan_phu_thuoc).toBe(false);
    expect(r.trang_thai).not.toBe('can_xac_minh');
    expect(r.do_tin_cay).toBe('cao');
  });

  it('dùng khoảng đã tính sẵn từ dữ liệu từng khoản nếu có', () => {
    const dc = tinhDoChacChan({
      gia_tri: 985e6, co_the_tang: 20e6, co_du_lieu: true,
      ung_vien: [{ khoa: 'noi_bo:B', loai: 'noi_bo_suy_doan', so_tien: 20e6, mo_ta: 'khoản 20.000.000đ ngày 10/05' }],
    });
    const r = sanSangThue([moc()], { ...s({ uoc_tinh: 985e6, da_xac_nhan: 985e6, chua_ro: 0, so_chua_ro: 0 }), do_chac_chan: dc });
    expect(r.cau_hoi_can_xem?.khoa).toBe('noi_bo:B');
    expect(r.khoang_doanh_thu).toEqual({ can_duoi: 985e6, can_tren: 1_005e6 });
    expect(r.trang_thai).toBe('can_xac_minh');
  });

  it('còn nhóm hoạt động chưa xếp thì vẫn "bị chặn", chặn đứng trước câu hỏi về ngưỡng', () => {
    const r = sanSangThue([moc()], s({ uoc_tinh: 1_003e6, da_xac_nhan: 998e6, chua_ro: 5e6, so_chua_ro: 1 }), { so_tien: 10e6, so_khoan: 2 });
    expect(r.trang_thai).toBe('bi_chan');
  });
});
