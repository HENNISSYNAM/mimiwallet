import { describe, expect, it } from 'vitest';
import {
  doChacChanNhom, khongXetNguong, nhanDoTinCay, sangBig, thangThieuDuLieu, tinhDoChacChan, tuBig, TY_LE_CHUA_RO_CHAP_NHAN,
  type UngVienCauHoi,
} from './do-chac-chan';
import { NGUONG_DOANH_THU, NGUONG_KHAI_THANG, NGUONG_THU_NHAP } from '../luat/he-luat';

const T = NGUONG_DOANH_THU;
const uv = (khoa: string, so_tien: number | null, loai: UngVienCauHoi['loai'] = 'khoan_tien_vao', them: Partial<UngVienCauHoi> = {}): UngVienCauHoi =>
  ({ khoa, loai, so_tien, mo_ta: `khoản ${khoa}`, transaction_ids: [khoa], ...them });
const nguong1 = (kq: ReturnType<typeof tinhDoChacChan>) => kq.nguong.find((n) => n.ma === 'mien_thue_1_ty')!;

describe('khoảng [can_duoi, can_tren]', () => {
  it('dưới = giá trị − có thể giảm; trên = giá trị + có thể tăng + khoảng trống', () => {
    const kq = tinhDoChacChan({ gia_tri: 500e6, co_the_giam: 50e6, co_the_tang: 20e6, co_du_lieu: true });
    expect(kq).toMatchObject({ can_duoi: 450e6, can_tren: 520e6, chua_ro: 70e6, gia_tri: 500e6 });
    expect(kq.vat_chat.tuyet_doi).toBe(70e6);
  });

  it('tỷ lệ chưa rõ tính theo TIỀN, không theo số khoản: 1 khoản 90 triệu nặng hơn 50 khoản 100 nghìn', () => {
    const lon = tinhDoChacChan({ gia_tri: 400e6, co_the_giam: 90e6, co_du_lieu: true });
    const nho = tinhDoChacChan({ gia_tri: 400e6, co_the_giam: 5e6, co_du_lieu: true });
    expect(lon.vat_chat.ti_le_tren_tong).toBeCloseTo(0.225, 6);
    expect(lon.vat_chat.la_vat_chat).toBe(true);
    expect(nho.vat_chat.la_vat_chat).toBe(false);
  });

  it('cận dưới không âm', () => {
    expect(tinhDoChacChan({ gia_tri: 10, co_the_giam: 30, co_du_lieu: true }).can_duoi).toBe(0);
  });

  it('tính đúng tới từng đồng ngay cả khi vượt số nguyên an toàn của JS (chuỗi số nguyên → BigInt)', () => {
    const kq = tinhDoChacChan({ gia_tri: '9007199254740993', co_the_tang: '1', co_du_lieu: true });
    expect(kq.can_tren).toBe('9007199254740994');
    expect(tuBig(sangBig('9007199254740993') as bigint)).toBe('9007199254740993');
    expect(tuBig(123n)).toBe(123);
  });
});

describe('ngưỡng luật: đúng bằng vẫn là "trở xuống"; khoảng cắt ngưỡng thì KHÔNG kết luận', () => {
  it('hằng số ngưỡng lấy nguyên từ he-luat.ts, không con số nào mới', () => {
    const kq = tinhDoChacChan({ gia_tri: 1, co_du_lieu: true });
    expect(kq.nguong.map((n) => n.gia_tri)).toEqual([NGUONG_DOANH_THU, NGUONG_THU_NHAP, NGUONG_KHAI_THANG]);
    expect(kq.nguong.map((n) => n.ma)).toEqual(['mien_thue_1_ty', 'phuong_phap_3_ty', 'khai_thang_50_ty']);
  });

  it.each([
    ['cả khoảng nằm trên ngưỡng', T + 1, 0, 0, 'tren', false],
    ['cận dưới đúng bằng ngưỡng: chưa vượt, nhưng cận trên vượt → chưa chắc', T, 0, 1, 'chua_chac', true],
    ['cận trên đúng bằng ngưỡng: chắc chắn chưa vượt', T - 5, 0, 5, 'duoi', false],
    ['khoảng cắt ngưỡng', T - 3, 3, 5, 'chua_chac', true],
    ['ước tính trên ngưỡng nhưng cận dưới dưới ngưỡng', T + 3, 5, 0, 'chua_chac', true],
  ] as const)('%s', (_ten, giaTri, giam, tang, phia, phuThuoc) => {
    const kq = tinhDoChacChan({ gia_tri: giaTri, co_the_giam: giam, co_the_tang: tang, co_du_lieu: true, ung_vien: [uv('x', 5)] });
    expect(nguong1(kq).phia).toBe(phia);
    expect(kq.ket_luan_phu_thuoc).toBe(phuThuoc);
    expect(kq.trang_thai === 'can_xem').toBe(phuThuoc || kq.vat_chat.la_vat_chat);
    if (phuThuoc) expect(kq.cau_hoi).not.toBeNull();
  });

  it('5 triệu chưa rõ (0,5%) nhưng nằm đúng quanh 1 tỷ: logic cũ nói "độ tin cậy cao", giờ phải hỏi', () => {
    const kq = tinhDoChacChan({ gia_tri: T + 3_000_000, co_the_giam: 5_000_000, co_du_lieu: true, ung_vien: [uv('k', 5_000_000)] });
    expect(kq.vat_chat.ti_le_tren_tong).toBeLessThan(TY_LE_CHUA_RO_CHAP_NHAN);
    expect(kq.trang_thai).toBe('can_xem');
    expect(kq.ket_luan_phu_thuoc).toBe(true);
    expect(kq.nguong_gan_nhat?.ma).toBe('mien_thue_1_ty');
  });

  it('60 triệu chưa rõ trên doanh thu 100 triệu (60%): xa mọi ngưỡng nên nghĩa vụ vẫn chắc; con số thì cần xem', () => {
    const kq = tinhDoChacChan({ gia_tri: 100e6, co_the_giam: 60e6, co_du_lieu: true, ung_vien: [uv('k', 60e6)] });
    expect(kq.ket_luan_phu_thuoc).toBe(false);
    expect(kq.trang_thai).toBe('can_xem');
    expect(kq.cau_hoi?.khoa).toBe('k');
    expect(nhanDoTinCay(kq.trang_thai)).toBe('trung_binh');
  });

  it('ngưỡng 03 tỷ và 50 tỷ cũng được soi, độc lập nhau', () => {
    const kq = tinhDoChacChan({ gia_tri: NGUONG_THU_NHAP + 1, co_the_giam: 10, co_du_lieu: true, ung_vien: [uv('k', 10)] });
    expect(kq.nguong_chua_chac).toEqual(['phuong_phap_3_ty']);
    expect(kq.nguong.find((n) => n.ma === 'mien_thue_1_ty')?.phia).toBe('tren');
  });

  it('khoảng cách tới ngưỡng: ước tính đã vượt thì âm', () => {
    const kq = tinhDoChacChan({ gia_tri: T + 10, co_du_lieu: true });
    expect(nguong1(kq).cach_gia_tri).toBe(-10);
    const duoi = tinhDoChacChan({ gia_tri: T - 10, co_du_lieu: true });
    expect(nguong1(duoi).cach_gia_tri).toBe(10);
  });
});

describe('quý vượt ngưỡng 01 tỷ', () => {
  it('cả hai kịch bản đều vượt ngưỡng nhưng ở quý khác nhau: ngưỡng chắc, QUÝ chưa chắc', () => {
    const kq = tinhDoChacChan({
      gia_tri: 1_500e6, co_the_giam: 400e6, co_du_lieu: true, ung_vien: [uv('vay', 400e6)],
      theo_quy: { gia_tri: [600e6, 600e6, 300e6, 0], co_the_giam: [400e6, 0, 0, 0], co_the_tang: [0, 0, 0, 0] },
    });
    expect(nguong1(kq).phia).toBe('tren');
    expect(kq.quy_vuot).toEqual({ som_nhat: 2, muon_nhat: 3, chac: false });
    expect(kq.nguong_chua_chac).toEqual(['quy_vuot_1_ty']);
    expect(kq.ket_luan_phu_thuoc).toBe(true);
    expect(kq.cau_hoi?.khoa).toBe('vay');
  });

  it('cùng một quý ở cả hai kịch bản: chắc', () => {
    const kq = tinhDoChacChan({
      gia_tri: 1_200e6, co_the_giam: 50e6, co_du_lieu: true,
      theo_quy: { gia_tri: [300e6, 300e6, 300e6, 300e6], co_the_giam: [0, 0, 0, 50e6], co_the_tang: [0, 0, 0, 0] },
    });
    expect(kq.quy_vuot).toEqual({ som_nhat: 4, muon_nhat: 4, chac: true });
    expect(kq.ket_luan_phu_thuoc).toBe(false);
  });

  it('khoản bị máy loại nhầm (co_the_tang) có thể đẩy quý vượt sớm hơn', () => {
    const kq = tinhDoChacChan({
      gia_tri: 1_050e6, co_the_tang: 400e6, co_du_lieu: true,
      theo_quy: { gia_tri: [350e6, 350e6, 350e6, 0], co_the_giam: [0, 0, 0, 0], co_the_tang: [400e6, 0, 0, 0] },
    });
    expect(kq.quy_vuot).toEqual({ som_nhat: 2, muon_nhat: 3, chac: false });
  });
});

describe('đúng MỘT câu hỏi: khoản chưa rõ lớn nhất trước, khoá ổn định', () => {
  const dv = (ds: UngVienCauHoi[]) => tinhDoChacChan({ gia_tri: T + 50, co_the_giam: 200, co_du_lieu: true, ung_vien: ds });

  it('lớn nhất trước; đếm số việc còn lại', () => {
    const kq = dv([uv('a', 30), uv('b', 90), uv('c', 80)]);
    expect(kq.cau_hoi).toMatchObject({ khoa: 'b', so_tien: 90, con_lai: 2 });
  });

  it('hoà thì theo khoá, không theo thứ tự đầu vào', () => {
    expect(dv([uv('z', 50), uv('m', 50), uv('c', 50)]).cau_hoi?.khoa).toBe('c');
    expect(dv([uv('c', 50), uv('z', 50), uv('m', 50)]).cau_hoi?.khoa).toBe('c');
  });

  it('thứ chưa biết số tiền (thiếu sao kê) xếp trên cùng — chưa biết nghĩa là có thể lớn nhất', () => {
    expect(dv([uv('a', 1_000), uv('thieu', null, 'thieu_sao_ke')]).cau_hoi?.khoa).toBe('thieu');
  });

  it('khoản 0 đồng không phải câu hỏi', () => {
    expect(dv([uv('a', 0), uv('b', 7)]).cau_hoi?.khoa).toBe('b');
  });

  it('không có ai chỉ ra khoản nào mà vẫn có tiền chưa rõ: hỏi theo tổng, không để trống câu hỏi', () => {
    const kq = dv([]);
    expect(kq.cau_hoi).toMatchObject({ khoa: 'tong_chua_ro', loai: 'tong_chua_ro', hanh_dong: 'xac_nhan_tien_vao' });
  });

  it('câu hỏi nói vì sao (ngưỡng nào) và có lựa chọn khớp hành động backend có thật', () => {
    const kq = dv([uv('a', 200, 'khoan_tien_vao', { goi_y: 'loan', mo_ta: 'khoản 200đ ngày 10/06' })]);
    expect(kq.cau_hoi?.cau).toBe('Có phải khoản 200đ ngày 10/06 là tiền bán hàng của bạn không?');
    expect(kq.cau_hoi?.vi_sao).toContain('ngưỡng 01 tỷ');
    expect(kq.cau_hoi?.lua_chon.map((l) => [l.ma, l.hieu_luc])).toEqual([
      ['business_revenue', 'include'], ['internal_transfer', 'exclude'], ['loan', 'exclude'], ['unknown', 'pending'],
    ]);
  });

  it('chac thì không có câu hỏi', () => {
    expect(tinhDoChacChan({ gia_tri: 100e6, co_du_lieu: true, ung_vien: [uv('a', 5)] }).cau_hoi).toBeNull();
  });
});

describe('chưa đủ dữ liệu', () => {
  it('chưa có giao dịch nào: chua_du_du_lieu, hỏi kết nối ngân hàng / nhập sao kê, nhãn cũ "thấp"', () => {
    const kq = tinhDoChacChan({ gia_tri: 0, co_du_lieu: false });
    expect(kq.trang_thai).toBe('chua_du_du_lieu');
    expect(kq.cau_hoi).toMatchObject({ khoa: 'thieu_sao_ke', hanh_dong: 'ket_noi_ngan_hang' });
    expect(kq.cau_hoi?.lua_chon.map((l) => l.ma)).toEqual(['ket_noi_ngan_hang', 'nhap_sao_ke']);
    expect(kq.ket_luan_phu_thuoc).toBe(false);
    expect(nhanDoTinCay(kq.trang_thai)).toBe('thap');
  });

  it.each([[NaN], [Infinity], ['12a'], [-0.5e400]])('số không đọc được (%s) không bị đoán thành 0', (x) => {
    const kq = tinhDoChacChan({ gia_tri: x as number, co_du_lieu: true });
    expect(kq.trang_thai).toBe('chua_du_du_lieu');
  });

  it('phần chưa rõ âm là dữ liệu hỏng, không phải "cộng thêm"', () => {
    expect(tinhDoChacChan({ gia_tri: 100, co_the_giam: -5, co_du_lieu: true }).trang_thai).toBe('chua_du_du_lieu');
  });
});

describe('doanh nghiệp: ngưỡng hộ kinh doanh không phải luật của họ', () => {
  it('khongXetNguong bỏ ngưỡng và cờ dừng, giữ "chưa rõ đáng kể"', () => {
    const kq = tinhDoChacChan({ gia_tri: T + 3, co_the_giam: 5, co_du_lieu: true, ung_vien: [uv('k', 5)] });
    expect(kq.ket_luan_phu_thuoc).toBe(true);
    const dn = khongXetNguong(kq);
    expect(dn).toMatchObject({ ket_luan_phu_thuoc: false, trang_thai: 'chac', cau_hoi: null, nguong: [] });
    const lon = khongXetNguong(tinhDoChacChan({ gia_tri: 100, co_the_giam: 60, co_du_lieu: true, ung_vien: [uv('k', 60)] }));
    expect(lon.trang_thai).toBe('can_xem');
    expect(lon.cau_hoi?.khoa).toBe('k');
  });
});

describe('doanh thu MỘT nhóm hoạt động', () => {
  it('phần chưa xếp nhóm có thể thuộc nhóm này: tăng cận trên; không soi ngưỡng cả năm; hỏi khoản chưa xếp lớn nhất', () => {
    const kq = doChacChanNhom(300e6, 100e6, 1_000e6, [{ id: 'k1', so_tien: 40e6, ngay: '2026-03-05' }, { id: 'k2', so_tien: 60e6, ngay: '2026-04-06' }]);
    expect(kq).toMatchObject({ can_duoi: 300e6, can_tren: 400e6, nguong: [], ket_luan_phu_thuoc: false, trang_thai: 'can_xem' });
    expect(kq.vat_chat.ti_le_tren_doanh_thu_nam).toBeCloseTo(0.1, 6);
    expect(kq.cau_hoi).toMatchObject({ khoa: 'hoat_dong:k2', transaction_ids: ['k2'] });
    expect(kq.cau_hoi?.cau).toContain('06/04');
  });

  it('không còn khoản chưa xếp nhóm: chắc', () => {
    expect(doChacChanNhom(300e6, 0, 300e6).trang_thai).toBe('chac');
  });
});

describe('thangThieuDuLieu', () => {
  it('chỉ tháng nằm GIỮA tháng đầu và cuối có dữ liệu', () => {
    expect(thangThieuDuLieu(['2026-01', '2026-01', '2026-04', '2026-06'])).toEqual(['2026-02', '2026-03', '2026-05']);
    expect(thangThieuDuLieu(['2026-03'])).toEqual([]);
    expect(thangThieuDuLieu([])).toEqual([]);
    expect(thangThieuDuLieu(['2026-01', '2026-02'])).toEqual([]);
  });
  it('bỏ qua chuỗi không phải tháng', () => {
    expect(thangThieuDuLieu(['abc', '', '2026-01', '2026-03'])).toEqual(['2026-02']);
  });
});
