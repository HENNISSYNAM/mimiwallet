import { describe, expect, it } from 'vitest';
import {
  chuanHoaTen,
  timTaiKhoanKhacCungTen,
  xetYeuCau,
  type BoiCanh,
  type ChinhSach,
  type YeuCau,
} from './chinh-sach';

// Ba luật an toàn thêm 14/09/2026: trần tần suất, giữ người nhận mới 24 giờ, đổi số tài khoản.

const LUC = new Date('2026-09-14T03:00:00Z');
const GIO = 3_600_000;

const cs = (sua: Partial<ChinhSach> = {}): ChinhSach => ({
  hanMucMoiLan: 5_000_000,
  hanMucNgay: 20_000_000,
  hanMucThang: 100_000_000,
  nguongCanDuyet: 2_000_000,
  nhomChiDuocPhep: null,
  chiTraNguoiNhanDaDuyet: false,
  hetHan: null,
  soYeuCauMoiGio: 30,
  ...sua,
});

const bc = (sua: Partial<BoiCanh> = {}): BoiCanh => ({
  trangThaiTacTu: 'hoat_dong',
  daGiuNgay: 0,
  daGiuThang: 0,
  nguoiNhanDaDuyet: [
    { nganHangBin: '970422', soTaiKhoan: '2431122002', themLuc: new Date(LUC.getTime() - 30 * 24 * GIO).toISOString() },
  ],
  nganHangHopLe: true,
  luc: LUC,
  soYeuCauGioQua: 0,
  tenNguoiNhan: 'CÔNG TY TNHH ABC',
  taiKhoanDaBiet: [],
  ...sua,
});

const yc = (sua: Partial<YeuCau> = {}): YeuCau => ({
  soTien: 500_000,
  nganHangBin: '970422',
  soTaiKhoan: '2431122002',
  nhomChi: 'quang_cao',
  mucDich: 'Nạp ngân sách quảng cáo tháng 9',
  ...sua,
});

const ma = (q: ReturnType<typeof xetYeuCau>) => q.lyDo.map((l) => l.ma);

describe('trần tần suất — chặn agent chạy vòng lặp', () => {
  it('dưới trần thì không ảnh hưởng', () => {
    const q = xetYeuCau(yc(), cs(), bc({ soYeuCauGioQua: 28 }));
    expect(q.ketQua).toBe('tu_dong_duyet');
  });

  it('yêu cầu thứ 30 vẫn được, thứ 31 bị từ chối', () => {
    expect(xetYeuCau(yc(), cs(), bc({ soYeuCauGioQua: 29 })).ketQua).toBe('tu_dong_duyet');
    const q = xetYeuCau(yc(), cs(), bc({ soYeuCauGioQua: 30 }));
    expect(q.ketQua).toBe('tu_choi');
    expect(ma(q)).toContain('VUOT_TAN_SUAT');
  });

  it('null = không giới hạn; chính sách cũ không có trường cũng không bị chặn', () => {
    expect(xetYeuCau(yc(), cs({ soYeuCauMoiGio: null }), bc({ soYeuCauGioQua: 5000 })).ketQua).toBe('tu_dong_duyet');
    const { soYeuCauMoiGio: _bo, ...cu } = cs();
    expect(xetYeuCau(yc(), cu as ChinhSach, bc({ soYeuCauGioQua: 5000 })).ketQua).toBe('tu_dong_duyet');
  });

  it('tần suất là từ chối, thắng cả chờ duyệt', () => {
    const q = xetYeuCau(yc({ soTien: 3_000_000 }), cs(), bc({ soYeuCauGioQua: 40 }));
    expect(q.ketQua).toBe('tu_choi');
    expect(ma(q)).toEqual(['VUOT_TAN_SUAT']);
  });
});

describe('người nhận vừa thêm vào danh sách — giữ 24 giờ', () => {
  const vuaThem = (gioTruoc: number) => [
    { nganHangBin: '970422', soTaiKhoan: '2431122002', themLuc: new Date(LUC.getTime() - gioTruoc * GIO).toISOString() },
  ];

  it('thêm 2 giờ trước: chưa được tự duyệt dù dưới ngưỡng', () => {
    const q = xetYeuCau(yc(), cs(), bc({ nguoiNhanDaDuyet: vuaThem(2) }));
    expect(q.ketQua).toBe('cho_duyet');
    expect(ma(q)).toEqual(['NGUOI_NHAN_MOI_THEM']);
  });

  it('thêm 25 giờ trước: tự duyệt bình thường', () => {
    expect(xetYeuCau(yc(), cs(), bc({ nguoiNhanDaDuyet: vuaThem(25) })).ketQua).toBe('tu_dong_duyet');
  });

  it('không có mốc thêm (dữ liệu cũ) thì không giữ', () => {
    const q = xetYeuCau(yc(), cs(), bc({ nguoiNhanDaDuyet: [{ nganHangBin: '970422', soTaiKhoan: '2431122002' }] }));
    expect(q.ketQua).toBe('tu_dong_duyet');
  });

  it('vượt trần tiền vẫn là từ chối, không bị luật giữ biến thành chờ duyệt', () => {
    const q = xetYeuCau(yc({ soTien: 6_000_000 }), cs(), bc({ nguoiNhanDaDuyet: vuaThem(1) }));
    expect(q.ketQua).toBe('tu_choi');
  });
});

describe('đổi số tài khoản cùng tên — lừa đảo giả danh nhà cung cấp', () => {
  const lichSu = [{ nganHangBin: '970436', soTaiKhoan: '0071000123456', ten: 'Cong ty TNHH ABC' }];

  it('người nhận lạ, cùng tên với tài khoản cũ khác: chờ duyệt kèm cảnh báo', () => {
    const q = xetYeuCau(
      yc({ soTaiKhoan: '9999888877' }),
      cs(),
      bc({ taiKhoanDaBiet: lichSu }),
    );
    expect(q.ketQua).toBe('cho_duyet');
    expect(ma(q)).toEqual(expect.arrayContaining(['NGUOI_NHAN_MOI', 'DOI_SO_TAI_KHOAN']));
    expect(q.lyDo.find((l) => l.ma === 'DOI_SO_TAI_KHOAN')?.cau).toContain('••••3456');
  });

  it('tài khoản đã trong danh sách hơn 24 giờ: chủ doanh nghiệp đã kiểm, không cảnh báo', () => {
    const q = xetYeuCau(yc(), cs(), bc({ taiKhoanDaBiet: lichSu }));
    expect(q.ketQua).toBe('tu_dong_duyet');
  });

  it('chính sách chặt: người lạ vẫn bị từ chối, cảnh báo không làm nhẹ đi', () => {
    const q = xetYeuCau(
      yc({ soTaiKhoan: '9999888877' }),
      cs({ chiTraNguoiNhanDaDuyet: true }),
      bc({ taiKhoanDaBiet: lichSu }),
    );
    expect(q.ketQua).toBe('tu_choi');
  });

  it('không có tên thì không so', () => {
    const q = xetYeuCau(yc({ soTaiKhoan: '9999888877' }), cs(), bc({ tenNguoiNhan: null, taiKhoanDaBiet: lichSu }));
    expect(ma(q)).not.toContain('DOI_SO_TAI_KHOAN');
  });
});

describe('chuẩn hoá tên và tìm tài khoản khác', () => {
  it('bỏ dấu, đ, hoa thường, ký tự lạ', () => {
    expect(chuanHoaTen('Công ty TNHH Đông Á.')).toBe('CONG TY TNHH DONG A');
    expect(chuanHoaTen('CONG  TY tnhh   dong a')).toBe('CONG TY TNHH DONG A');
    expect(chuanHoaTen(null)).toBe('');
  });

  it('bỏ trùng và bỏ chính tài khoản đang xin', () => {
    const r = timTaiKhoanKhacCungTen('ABC Studio', { nganHangBin: '970422', soTaiKhoan: '111111' }, [
      { nganHangBin: '970422', soTaiKhoan: '111111', ten: 'ABC STUDIO' },
      { nganHangBin: '970436', soTaiKhoan: '222222', ten: 'abc studio' },
      { nganHangBin: '970436', soTaiKhoan: '222222', ten: 'ABC Studio' },
      { nganHangBin: '970436', soTaiKhoan: '333333', ten: 'XYZ Studio' },
    ]);
    expect(r).toEqual([{ nganHangBin: '970436', soTaiKhoan: '222222', ten: 'abc studio' }]);
  });

  it('tên quá ngắn không so, tránh trùng nhầm', () => {
    expect(timTaiKhoanKhacCungTen('An', { nganHangBin: '1', soTaiKhoan: '1' }, [
      { nganHangBin: '2', soTaiKhoan: '2', ten: 'AN' },
    ])).toEqual([]);
  });
});
