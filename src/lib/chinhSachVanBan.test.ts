import { describe, expect, it } from 'vitest';
import { tomTatChinhSach, vanBanChinhSach, type ChinhSachDoc } from './chinhSachVanBan';

/** Chính sách mặc định của agent mới: mọi khoản phải duyệt, chỉ người trong danh sách. */
const MAC_DINH: ChinhSachDoc = {
  han_muc_moi_lan: 1_000_000,
  han_muc_ngay: 3_000_000,
  han_muc_thang: 20_000_000,
  nguong_can_duyet: 0,
  nhom_chi_duoc_phep: null,
  chi_tra_nguoi_nhan_da_duyet: true,
  het_han: null,
  so_yeu_cau_moi_gio: 30,
};

describe('văn bản chính sách chi', () => {
  it('agent mới: mọi khoản phải duyệt, người lạ bị từ chối', () => {
    const vb = vanBanChinhSach(MAC_DINH).join('\n');
    expect(vb).toContain('Mọi khoản đều phải có người duyệt.');
    expect(vb).toContain('Tài khoản khác bị từ chối.');
    expect(vb).toContain('Được chi cho mọi nhóm chi.');
    expect(vb).not.toContain('tự duyệt nếu đạt');
  });

  it('có ngưỡng thì nói rõ trên ngưỡng hỏi, dưới ngưỡng mới được tự duyệt', () => {
    const vb = vanBanChinhSach({ ...MAC_DINH, nguong_can_duyet: 500_000 }).join('\n');
    expect(vb).toContain('Khoản trên 500.000đ phải có người duyệt.');
    expect(vb).toContain('trở xuống được tự duyệt nếu đạt mọi luật khác');
  });

  it('người lạ để "hỏi" thì không được viết thành "từ chối"', () => {
    const dongNguoiLa = vanBanChinhSach({ ...MAC_DINH, chi_tra_nguoi_nhan_da_duyet: false })[3];
    expect(dongNguoiLa).toContain('phải có người duyệt');
    expect(dongNguoiLa).not.toContain('từ chối');
  });

  it('nhóm chi dùng tên tiếng Việt, không lộ mã', () => {
    const vb = vanBanChinhSach({ ...MAC_DINH, nhom_chi_duoc_phep: ['ha_tang_ai', 'quang_cao'] }).join('\n');
    expect(vb).toContain('Hạ tầng AI, API, máy chủ, Quảng cáo');
    expect(vb).not.toContain('ha_tang_ai');
  });

  it('ngày hết hạn đọc theo giờ Việt Nam', () => {
    // 23:59:59 ngày 31/12 giờ VN là 16:59:59 UTC — đọc theo UTC vẫn ra 31/12, nhưng
    // lưu lúc 00:30 VN ngày 01/01 thì UTC còn là 31/12; phải ra 01/01.
    const cs = { ...MAC_DINH, het_han: '2026-12-31T17:30:00.000Z' };
    expect(vanBanChinhSach(cs).join('\n')).toContain('sau ngày 01/01/2027');
    expect(tomTatChinhSach(cs, 0)['het-han']).toBe('Tới 01/01/2027');
  });

  it('tóm tắt từng hàng', () => {
    expect(tomTatChinhSach(MAC_DINH, 3)).toEqual({
      duyet: 'Mọi khoản',
      'nguoi-la': 'Từ chối',
      'han-muc': '1.000.000đ / khoản',
      'tan-suat': '30 / giờ',
      'het-han': 'Không hết hạn',
      'nhom-chi': 'Mọi nhóm',
      'nguoi-nhan': '3 tài khoản',
    });
    expect(tomTatChinhSach({ ...MAC_DINH, so_yeu_cau_moi_gio: null }, 0)['tan-suat']).toBe('Không giới hạn');
  });
});
