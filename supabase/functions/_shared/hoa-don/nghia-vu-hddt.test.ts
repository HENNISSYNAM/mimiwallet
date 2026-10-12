import { describe, expect, it } from 'vitest';
import { CAN_CU_HDDT, nghiaVuHoaDon, type HoSoHddt } from './nghia-vu-hddt.ts';

const tt = (hs: HoSoHddt) => Object.fromEntries(nghiaVuHoaDon(hs).map((m) => [m.khoa, m.trang_thai]));
const ho = (p: Partial<HoSoHddt> = {}): HoSoHddt => ({ loai: 'ho_kinh_doanh', doanhThuNam: 600_000_000, vuotNguongChac: false, banTrucTiep: false, ...p });

describe('nghiaVuHoaDon — hộ kinh doanh', () => {
  it('chắc trên 01 tỷ: phải dùng, phải đăng ký (30 ngày)', () => {
    const r = nghiaVuHoaDon(ho({ doanhThuNam: 1_200_000_000, vuotNguongChac: true }));
    expect(r.map((m) => m.trang_thai)).toEqual(['phai_lam', 'khong_ap_dung', 'phai_lam']);
    expect(r[2].vi_sao).toMatch(/30 ngày/);
  });
  it('chắc chưa tới ngưỡng, không bán lẻ: không áp dụng — nói được đăng ký nếu có nhu cầu', () => {
    const r = nghiaVuHoaDon(ho());
    expect(r.every((m) => m.trang_thai === 'khong_ap_dung')).toBe(true);
    expect(r[0].vi_sao).toMatch(/Có nhu cầu/);
  });
  it('doanh thu cắt ngưỡng (chưa chắc): cần xác minh, KHÔNG thành bắt buộc', () => {
    expect(tt(ho({ doanhThuNam: 1_050_000_000, vuotNguongChac: null }))).toEqual({ dung_hddt: 'can_xac_minh', ban_truc_tiep: 'khong_ap_dung', dang_ky: 'can_xac_minh' });
  });
  it('chưa có số liệu doanh thu: cần xác minh kèm câu hỏi', () => {
    const r = nghiaVuHoaDon(ho({ doanhThuNam: null, vuotNguongChac: null }));
    expect(r[0].trang_thai).toBe('can_xac_minh');
    expect(r[0].cau_hoi).toBeTruthy();
  });
  it('bán lẻ dưới 01 tỷ: hai nguồn chưa khớp → cần xác minh, có căn cứ chưa đối chiếu được gắn nhãn', () => {
    const r = nghiaVuHoaDon(ho({ banTrucTiep: true }));
    const m = r.find((x) => x.khoa === 'ban_truc_tiep')!;
    expect(m.trang_thai).toBe('can_xac_minh');
    expect(m.can_cu.some((c) => c.chua_doi_chieu)).toBe(true);
  });
  it('bán lẻ trên 01 tỷ: phải làm, nói rõ chọn MỘT trong hai loại', () => {
    const m = nghiaVuHoaDon(ho({ doanhThuNam: 2e9, vuotNguongChac: true, banTrucTiep: true })).find((x) => x.khoa === 'ban_truc_tiep')!;
    expect(m.trang_thai).toBe('phai_lam');
    expect(m.vi_sao).toMatch(/Chọn một/);
  });
  it('chưa biết có bán thẳng cho người tiêu dùng: hỏi', () => {
    const m = nghiaVuHoaDon(ho({ banTrucTiep: null })).find((x) => x.khoa === 'ban_truc_tiep')!;
    expect(m.trang_thai).toBe('can_xac_minh');
    expect(m.cau_hoi).toMatch(/người tiêu dùng/);
  });
});

describe('nghiaVuHoaDon — doanh nghiệp, chưa rõ loại', () => {
  it('doanh nghiệp: luôn phải dùng hoá đơn có mã và đăng ký, không phụ thuộc doanh thu', () => {
    expect(tt({ loai: 'doanh_nghiep', doanhThuNam: 0, vuotNguongChac: false, banTrucTiep: false })).toEqual({ dung_hddt: 'phai_lam', ban_truc_tiep: 'khong_ap_dung', dang_ky: 'phai_lam' });
  });
  it('doanh nghiệp bán lẻ: phải làm (máy tính tiền hoặc có mã)', () => {
    expect(tt({ loai: 'doanh_nghiep', doanhThuNam: null, vuotNguongChac: null, banTrucTiep: true }).ban_truc_tiep).toBe('phai_lam');
  });
  it('chưa biết loại hình: cần xác minh', () => {
    expect(tt({ loai: null, doanhThuNam: 5e9, vuotNguongChac: true, banTrucTiep: false }).dung_hddt).toBe('can_xac_minh');
  });
});

describe('căn cứ', () => {
  it('căn cứ đã đối chiếu có câu trích; chưa đối chiếu thì có nguồn để lần theo', () => {
    for (const [k, c] of Object.entries(CAN_CU_HDDT)) {
      if (c.chua_doi_chieu) expect(c.nguon, k).toMatch(/^https:\/\//);
      else expect(c.trich, k).toBeTruthy();
    }
  });
  it('ngưỡng là TRÊN 01 tỷ (điểm d) — đúng câu chữ văn bản', () => {
    expect(CAN_CU_HDDT.nd254_d6_k1d.trich).toMatch(/doanh thu năm trên 01 tỷ đồng/);
  });
});
