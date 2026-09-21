import { describe, expect, it } from 'vitest';
import {
  soanCongVanGiaiTrinh, soanCongVanHuyToKhai, soanDonTraSoat, vanBanThanhChu,
  type GiaoDichTraSoat, type ThongTinDonVi,
} from './giayTo';

const HOM_NAY = new Date(2026, 8, 21);

const donViDu: ThongTinDonVi = {
  ten: 'Hộ kinh doanh Thịnh Phát', ma_so_thue: '0312345678', dia_chi: '12 Lê Lợi, Quận 1',
  nguoi_dai_dien: 'Nguyễn Văn A', chuc_vu: 'Chủ hộ', dien_thoai: '0901234567', dia_danh: 'TP. Hồ Chí Minh',
};
const donViThieu: ThongTinDonVi = { ...donViDu, dia_chi: '', nguoi_dai_dien: ' ', dien_thoai: '' };

const gd: GiaoDichTraSoat = {
  ngay: '2026-09-14', so_tien: 45_000_000, tai_khoan_chuyen: '0011223344', ngan_hang: 'MB Bank – CN Sài Gòn',
  tai_khoan_nhan: '1234567890', ten_nguoi_nhan: 'NGUYEN VAN H', noi_dung: 'chuyen tien', ma_tham_chieu: 'FT2625712345',
};

const toanVan = (v: ReturnType<typeof soanDonTraSoat>) => vanBanThanhChu(v);

describe('không trích điều luật nào (kho đã đối chiếu chưa có văn bản cho các việc này)', () => {
  it('cả ba mẫu không có "Điều", "Luật số", "Nghị định", "Thông tư"', () => {
    const ds = [
      soanDonTraSoat({ donVi: donViDu, giaoDich: gd, lyDo: 'nghi_lua_dao', moTa: 'Người tự xưng công an gọi', homNay: HOM_NAY }),
      soanCongVanGiaiTrinh({ donVi: donViDu, coQuanThue: 'Thuế cơ sở 1 TP.HCM', soThongBao: '123/TB', ngayThongBao: '2026-09-01', noiDungYeuCau: 'doanh thu quý 2', giaiTrinh: 'Doanh thu giảm do sửa cửa hàng.', soLieu: [], homNay: HOM_NAY }),
      soanCongVanHuyToKhai({ donVi: donViDu, coQuanThue: 'Thuế cơ sở 1 TP.HCM', mauToKhai: '01/CNKD', kyTinhThue: 'Quý 2/2026', ngayNop: '2026-07-20', maGiaoDich: '11020260000123', lyDo: 'nop_trung', moTa: '', homNay: HOM_NAY }),
    ];
    for (const v of ds) expect(vanBanThanhChu(v)).not.toMatch(/Điều \d|Luật số|Nghị định|Thông tư|\d+\/\d{4}\/(NĐ|TT|QH)/);
  });
});

describe('Đơn đề nghị tra soát', () => {
  it('điền đủ từ giao dịch thật, có số tiền bằng chữ, không còn ô trống', () => {
    const v = soanDonTraSoat({ donVi: donViDu, giaoDich: gd, lyDo: 'chuyen_nham', moTa: 'gõ sai một chữ số tài khoản', homNay: HOM_NAY });
    expect(v.con_thieu).toEqual([]);
    expect(v.kinh_gui).toBe('Ngân hàng MB Bank – CN Sài Gòn');
    const chu = toanVan(v);
    expect(chu).toContain('Ngày 14/09/2026, chúng tôi đã chuyển tiền từ tài khoản số 0011223344');
    expect(chu).toContain('45.000.000 đồng (bằng chữ: ');
    expect(chu).toContain('FT2625712345');
    expect(chu).toContain('chuyển nhầm: gõ sai một chữ số tài khoản');
    expect(chu).toContain('TP. Hồ Chí Minh, ngày 21 tháng 09 năm 2026');
  });

  it('nghi lừa đảo: nhắc trình báo công an, đòi thêm bằng chứng tin nhắn — nhưng không hứa lấy lại được tiền', () => {
    const v = soanDonTraSoat({ donVi: donViDu, giaoDich: gd, lyDo: 'nghi_lua_dao', moTa: 'Người tự xưng công an gọi', homNay: HOM_NAY });
    const chu = toanVan(v);
    expect(chu).toContain('trình báo cơ quan công an');
    expect(v.kem_theo.join(' ')).toContain('Tin nhắn');
    expect(chu).not.toMatch(/bảo đảm|chắc chắn|cam kết hoàn/);
  });

  it('thiếu thông tin: để [Tên ô] và liệt kê đủ, không đoán, không lặp', () => {
    const v = soanDonTraSoat({ donVi: donViThieu, giaoDich: { ...gd, ma_tham_chieu: '', ngan_hang: '' }, lyDo: 'chuyen_nham', moTa: '', homNay: HOM_NAY });
    expect(v.con_thieu).toEqual(expect.arrayContaining(['Địa chỉ trụ sở', 'Người đại diện', 'Số điện thoại', 'Mã giao dịch', 'Tên ngân hàng và chi nhánh']));
    expect(new Set(v.con_thieu).size).toBe(v.con_thieu.length);
    expect(toanVan(v)).toContain('[Địa chỉ trụ sở]');
  });
});

describe('Công văn giải trình', () => {
  it('dẫn đúng thông báo của cơ quan thuế và đưa bảng số liệu người dùng nhập', () => {
    const v = soanCongVanGiaiTrinh({
      donVi: donViDu, coQuanThue: 'Thuế cơ sở 1 TP.HCM', soThongBao: '123/TB-TCS', ngayThongBao: '2026-09-01',
      noiDungYeuCau: 'doanh thu quý 2/2026', giaiTrinh: 'Doanh thu giảm do cửa hàng đóng cửa sửa chữa 20 ngày.',
      soLieu: [{ noi_dung: 'Doanh thu quý 2/2026', gia_tri: '312.000.000 đồng' }, { noi_dung: ' ', gia_tri: '' }], homNay: HOM_NAY,
    });
    expect(v.trich_yeu).toBe('V/v giải trình doanh thu quý 2/2026');
    expect(vanBanThanhChu(v)).toContain('văn bản số 123/TB-TCS của Thuế cơ sở 1 TP.HCM');
    // Dòng trống bị bỏ, không in ra một dòng rỗng trong bảng.
    expect(v.bang?.dong).toEqual([['Doanh thu quý 2/2026', '312.000.000 đồng']]);
  });

  it('không có số liệu thì không có bảng và không có câu nhắc tới bảng', () => {
    const v = soanCongVanGiaiTrinh({ donVi: donViDu, coQuanThue: 'X', soThongBao: '1', ngayThongBao: '2026-09-01', noiDungYeuCau: 'y', giaiTrinh: 'z', soLieu: [], homNay: HOM_NAY });
    expect(v.bang).toBeUndefined();
    expect(vanBanThanhChu(v)).not.toContain('bảng dưới đây');
  });
});

describe('Công văn đề nghị huỷ tờ khai', () => {
  it('nêu mẫu, kỳ, mã giao dịch, lý do — và luôn có câu xin hướng dẫn điều chỉnh nếu không huỷ được', () => {
    const v = soanCongVanHuyToKhai({
      donVi: donViDu, coQuanThue: 'Thuế cơ sở 1 TP.HCM', mauToKhai: '01/CNKD', kyTinhThue: 'Quý 2/2026',
      ngayNop: '2026-07-20', maGiaoDich: '11020260000123', lyDo: 'nham_ky', moTa: 'đúng ra là quý 3', homNay: HOM_NAY,
    });
    const chu = vanBanThanhChu(v);
    expect(v.trich_yeu).toBe('V/v đề nghị huỷ tờ khai 01/CNKD kỳ Quý 2/2026');
    expect(chu).toContain('mã giao dịch điện tử 11020260000123');
    expect(chu).toContain('nộp nhầm kỳ tính thuế: đúng ra là quý 3');
    expect(chu).toContain('Trường hợp tờ khai không thuộc trường hợp được huỷ');
  });
});
