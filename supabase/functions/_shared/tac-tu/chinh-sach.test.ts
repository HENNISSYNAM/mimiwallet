import { describe, expect, it } from 'vitest';
import {
  xetYeuCau,
  hanMucConLai,
  dauNgayVN,
  dauThangVN,
  docKhungGio,
  moTaKhungGio,
  phutVaThuVN,
  trongKhungGio,
  type ChinhSach,
  type BoiCanh,
  type YeuCau,
} from './chinh-sach';

const cs = (sua: Partial<ChinhSach> = {}): ChinhSach => ({
  hanMucMoiLan: 2_000_000,
  hanMucNgay: 5_000_000,
  hanMucThang: 20_000_000,
  nguongCanDuyet: 1_000_000,
  nhomChiDuocPhep: ['ha_tang_ai', 'phan_mem'],
  chiTraNguoiNhanDaDuyet: true,
  hetHan: null,
  ...sua,
});

const bc = (sua: Partial<BoiCanh> = {}): BoiCanh => ({
  trangThaiTacTu: 'hoat_dong',
  daGiuNgay: 0,
  daGiuThang: 0,
  nguoiNhanDaDuyet: [{ nganHangBin: '970422', soTaiKhoan: '2431122002' }],
  nganHangHopLe: true,
  luc: new Date('2026-09-10T03:00:00Z'),
  ...sua,
});

const yc = (sua: Partial<YeuCau> = {}): YeuCau => ({
  soTien: 500_000,
  nganHangBin: '970422',
  soTaiKhoan: '2431122002',
  nhomChi: 'ha_tang_ai',
  mucDich: 'Nạp tiền API mô hình tháng 9',
  ...sua,
});

const ma = (q: ReturnType<typeof xetYeuCau>) => q.lyDo.map((l) => l.ma);

describe('ba kết quả', () => {
  it('trong chính sách thì tự duyệt', () => {
    const q = xetYeuCau(yc(), cs(), bc());
    expect(q.ketQua).toBe('tu_dong_duyet');
    expect(ma(q)).toEqual(['TRONG_CHINH_SACH']);
  });

  it('trên ngưỡng duyệt thì chờ người', () => {
    const q = xetYeuCau(yc({ soTien: 1_500_000 }), cs(), bc());
    expect(q.ketQua).toBe('cho_duyet');
    expect(ma(q)).toEqual(['TREN_NGUONG_DUYET']);
  });

  it('ngưỡng 0 nghĩa là mọi khoản đều phải duyệt — mặc định chặt', () => {
    const q = xetYeuCau(yc({ soTien: 1_000 }), cs({ nguongCanDuyet: 0 }), bc());
    expect(q.ketQua).toBe('cho_duyet');
  });

  it('đúng bằng ngưỡng thì chưa phải duyệt — "trên" là trên', () => {
    expect(xetYeuCau(yc({ soTien: 1_000_000 }), cs(), bc()).ketQua).toBe('tu_dong_duyet');
  });
});

describe('hạn mức là trần, không phải gợi ý', () => {
  it('vượt trần một lần thì từ chối, không đẩy sang người duyệt', () => {
    const q = xetYeuCau(yc({ soTien: 2_500_000 }), cs(), bc());
    expect(q.ketQua).toBe('tu_choi');
    expect(ma(q)).toContain('VUOT_HAN_MUC_MOI_LAN');
    // Trên ngưỡng duyệt nữa, nhưng từ chối thắng: không có lý do "chờ duyệt".
    expect(ma(q)).not.toContain('TREN_NGUONG_DUYET');
  });

  it('hạn mức ngày tính cả các khoản đang giữ chỗ', () => {
    const q = xetYeuCau(yc(), cs(), bc({ daGiuNgay: 4_600_000 }));
    expect(q.ketQua).toBe('tu_choi');
    expect(ma(q)).toEqual(['VUOT_HAN_MUC_NGAY']);
  });

  it('chạm đúng trần ngày vẫn được', () => {
    expect(xetYeuCau(yc(), cs(), bc({ daGiuNgay: 4_500_000 })).ketQua).toBe('tu_dong_duyet');
  });

  it('hạn mức tháng', () => {
    const q = xetYeuCau(yc(), cs(), bc({ daGiuThang: 19_800_000 }));
    expect(ma(q)).toEqual(['VUOT_HAN_MUC_THANG']);
  });

  it('hạn mức còn lại cho agent hỏi trước', () => {
    expect(hanMucConLai(cs(), 4_000_000, 10_000_000)).toEqual({ moiLan: 1_000_000, ngay: 1_000_000, thang: 10_000_000 });
    expect(hanMucConLai(cs(), 9_000_000, 0).ngay).toBe(0);
  });
});

describe('người nhận', () => {
  it('người lạ bị từ chối khi chính sách chỉ cho người đã duyệt', () => {
    const q = xetYeuCau(yc({ soTaiKhoan: '19999999' }), cs(), bc());
    expect(q.ketQua).toBe('tu_choi');
    expect(ma(q)).toEqual(['NGUOI_NHAN_CHUA_DUYET']);
  });

  it('người lạ phải có người xác nhận khi chính sách mở', () => {
    const q = xetYeuCau(yc({ soTaiKhoan: '19999999' }), cs({ chiTraNguoiNhanDaDuyet: false }), bc());
    expect(q.ketQua).toBe('cho_duyet');
    expect(ma(q)).toEqual(['NGUOI_NHAN_MOI']);
  });

  it('cùng số tài khoản nhưng khác ngân hàng là người khác', () => {
    const q = xetYeuCau(yc({ nganHangBin: '970436' }), cs(), bc());
    expect(ma(q)).toContain('NGUOI_NHAN_CHUA_DUYET');
  });
});

describe('dữ liệu yêu cầu', () => {
  it('số tiền lẻ, âm hay 0 đều bị từ chối', () => {
    for (const soTien of [0, -1, 1.5, Number.NaN]) {
      expect(ma(xetYeuCau(yc({ soTien }), cs(), bc()))).toContain('SO_TIEN_KHONG_HOP_LE');
    }
  });

  it('mục đích bỏ trống bị từ chối', () => {
    expect(ma(xetYeuCau(yc({ mucDich: '  ' }), cs(), bc()))).toContain('THIEU_MUC_DICH');
  });

  it('mục đích hỏng mã hoá bị từ chối — chuỗi thật đã lọt vào sổ ngày 10/09', () => {
    const q = xetYeuCau(yc({ mucDich: 'Th? v�ng ki?m so�t chi c?a MIMI' }), cs(), bc());
    expect(q.ketQua).toBe('tu_choi');
    expect(ma(q)).toEqual(['MUC_DICH_LOI_MA_HOA']);
    // Tiếng Việt đúng UTF-8 vẫn qua.
    expect(ma(xetYeuCau(yc({ mucDich: 'Thử vòng kiểm soát chi của MIMI' }), cs(), bc()))).not.toContain('MUC_DICH_LOI_MA_HOA');
  });

  it('nhóm chi không có trong danh mục khác với nhóm chi không được phép', () => {
    expect(ma(xetYeuCau(yc({ nhomChi: 'an_choi' }), cs(), bc()))).toEqual(['NHOM_CHI_KHONG_RO']);
    expect(ma(xetYeuCau(yc({ nhomChi: 'quang_cao' }), cs(), bc()))).toEqual(['NHOM_CHI_KHONG_DUOC_PHEP']);
    expect(xetYeuCau(yc({ nhomChi: 'quang_cao' }), cs({ nhomChiDuocPhep: null }), bc()).ketQua).toBe('tu_dong_duyet');
  });

  it('ngân hàng không rõ và số tài khoản sai', () => {
    const q = xetYeuCau(yc({ soTaiKhoan: '12ab' }), cs(), bc({ nganHangHopLe: false }));
    expect(ma(q)).toEqual(expect.arrayContaining(['NGAN_HANG_KHONG_RO', 'SO_TAI_KHOAN_KHONG_HOP_LE']));
  });
});

describe('trạng thái agent và chính sách', () => {
  it('tạm dừng, thu hồi, hết hạn đều chặn', () => {
    expect(ma(xetYeuCau(yc(), cs(), bc({ trangThaiTacTu: 'tam_dung' })))).toContain('TAC_TU_TAM_DUNG');
    expect(ma(xetYeuCau(yc(), cs(), bc({ trangThaiTacTu: 'thu_hoi' })))).toContain('TAC_TU_DA_THU_HOI');
    expect(ma(xetYeuCau(yc(), cs({ hetHan: '2026-09-10T02:59:59Z' }), bc()))).toContain('CHINH_SACH_HET_HAN');
    expect(xetYeuCau(yc(), cs({ hetHan: '2026-09-11T00:00:00Z' }), bc()).ketQua).toBe('tu_dong_duyet');
  });

  it('gom đủ mọi lý do trong một lần trả lời', () => {
    const q = xetYeuCau(
      yc({ soTien: 3_000_000, nhomChi: 'quang_cao', soTaiKhoan: '19999999' }),
      cs(),
      bc({ trangThaiTacTu: 'tam_dung' }),
    );
    expect(q.ketQua).toBe('tu_choi');
    expect(ma(q)).toEqual(
      expect.arrayContaining(['TAC_TU_TAM_DUNG', 'NHOM_CHI_KHONG_DUOC_PHEP', 'VUOT_HAN_MUC_MOI_LAN', 'NGUOI_NHAN_CHUA_DUYET']),
    );
    for (const l of q.lyDo) expect(l.cau.length).toBeGreaterThan(10);
  });
});

describe('ngày và tháng theo giờ Việt Nam', () => {
  it('1 giờ 30 sáng 11/09 giờ VN thuộc ngày 11/09, không phải 10/09', () => {
    expect(dauNgayVN(new Date('2026-09-10T18:30:00Z')).toISOString()).toBe('2026-09-10T17:00:00.000Z');
  });

  it('0 giờ 30 sáng 01/09 giờ VN thuộc tháng 9', () => {
    expect(dauThangVN(new Date('2026-08-31T17:30:00Z')).toISOString()).toBe('2026-08-31T17:00:00.000Z');
    expect(dauThangVN(new Date('2026-08-31T16:59:00Z')).toISOString()).toBe('2026-07-31T17:00:00.000Z');
  });
});

describe('khung giờ được chi', () => {
  const k = { tuPhut: 480, denPhut: 1200, thu: [1, 2, 3, 4, 5] };

  it('đọc phút và thứ theo giờ VN, Chủ nhật là 7', () => {
    // 17:00 UTC thứ Bảy 12/09 = 00:00 Chủ nhật 13/09 giờ VN.
    expect(phutVaThuVN(new Date('2026-09-12T17:00:00Z'))).toEqual({ phut: 0, thu: 7 });
    expect(phutVaThuVN(new Date('2026-09-14T03:15:00Z'))).toEqual({ phut: 615, thu: 1 });
  });

  it('"từ" gồm, "đến" không gồm', () => {
    expect(trongKhungGio(k, new Date('2026-09-14T01:00:00Z'))).toBe(true); // 08:00 T2
    expect(trongKhungGio(k, new Date('2026-09-14T13:00:00Z'))).toBe(false); // 20:00 T2
  });

  it('chính sách cũ không có khung giờ thì không đổi kết quả', () => {
    const q = xetYeuCau(yc(), cs(), bc({ luc: new Date('2026-09-12T20:00:00Z') }));
    expect(q.ketQua).toBe('tu_dong_duyet');
  });

  it('lý do ngoài giờ nói rõ khung giờ cho người đọc', () => {
    const q = xetYeuCau(yc(), cs({ khungGioChi: k }), bc({ luc: new Date('2026-09-10T15:00:00Z') }));
    expect(q.ketQua).toBe('cho_duyet');
    expect(q.lyDo[0].cau).toContain('08:00–20:00, thứ Hai–thứ Sáu');
  });

  it('docKhungGio: nhận dạng lưu, chặn sai khuôn', () => {
    expect(docKhungGio(null)).toBeNull();
    expect(docKhungGio(undefined)).toBeNull();
    expect(docKhungGio({ tu_phut: 480, den_phut: 1200, thu: [5, 1, 2] })).toEqual({ tuPhut: 480, denPhut: 1200, thu: [1, 2, 5] });
    expect(docKhungGio({ tu_phut: 480, den_phut: 480, thu: [1] })).toBe('sai');
    expect(docKhungGio({ tu_phut: -1, den_phut: 600, thu: [1] })).toBe('sai');
    expect(docKhungGio({ tu_phut: 0, den_phut: 1441, thu: [1] })).toBe('sai');
    expect(docKhungGio({ tu_phut: 0, den_phut: 600, thu: [] })).toBe('sai');
    expect(docKhungGio({ tu_phut: 0, den_phut: 600, thu: [1, 1] })).toBe('sai');
    expect(docKhungGio({ tu_phut: 0, den_phut: 600, thu: [8] })).toBe('sai');
    expect(docKhungGio({ tu_phut: 8.5, den_phut: 600, thu: [1] })).toBe('sai');
    expect(docKhungGio('08:00-20:00')).toBe('sai');
  });

  it('moTaKhungGio', () => {
    expect(moTaKhungGio({ tuPhut: 0, denPhut: 1440, thu: [1, 2, 3, 4, 5, 6, 7] })).toBe('00:00–24:00, mọi ngày');
    expect(moTaKhungGio({ tuPhut: 1320, denPhut: 360, thu: [6, 7] })).toBe('22:00–06:00, thứ Bảy, Chủ nhật');
  });
});

describe('trần mỗi người nhận trong tháng', () => {
  it('không có bối cảnh đã giữ thì tính là 0', () => {
    expect(xetYeuCau(yc(), cs({ hanMucMoiNguoiNhanThang: 500_000 }), bc()).ketQua).toBe('tu_dong_duyet');
    expect(ma(xetYeuCau(yc(), cs({ hanMucMoiNguoiNhanThang: 499_999 }), bc()))).toContain('VUOT_HAN_MUC_NGUOI_NHAN');
  });

  it('gom cùng các lý do khác trong một lần', () => {
    const q = xetYeuCau(yc({ soTien: 3_000_000 }), cs({ hanMucMoiNguoiNhanThang: 1_000_000 }), bc());
    expect(ma(q)).toEqual(expect.arrayContaining(['VUOT_HAN_MUC_NGUOI_NHAN', 'VUOT_HAN_MUC_MOI_LAN']));
  });
});
