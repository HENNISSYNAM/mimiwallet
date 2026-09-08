import { describe, it, expect } from 'vitest';
import { cachSua, laLienKetQr, cacLoiNhac, phuDe, type LienKet, laLienKetThue, tenDong, giaLapLoiDuoc } from './lienKetNganHang';

const lk = (over: Partial<LienKet> = {}): LienKet => ({
  id: 'c1',
  status: 'connected',
  scopes: 'transaction',
  ...over,
});

describe('cachSua — nút nào được mời bấm', () => {
  it('liên kết QR hỏng thì mời LIÊN KẾT LẠI, không mời cập nhật', () => {
    // Sự việc thật 04/09/2026: MBBank VietQR Official trả về "Dịch vụ tài chính
    // này không hỗ trợ Update Mode". Nút "Cập nhật" là nút duy nhất được mời
    // bấm, và là nút duy nhất không dùng được.
    expect(cachSua(lk({ status: 'needs_relink', scopes: 'qrpay' }))).toBe('lien_ket_lai');
  });

  it('liên kết đọc sao kê hỏng thì vẫn mời CẬP NHẬT — case 5 đã nghiệm thu đạt', () => {
    expect(cachSua(lk({ status: 'needs_relink', scopes: 'transaction' }))).toBe('cap_nhat');
  });

  it('liên kết thuế hỏng cũng dùng cập nhật', () => {
    expect(cachSua(lk({ status: 'needs_relink', scopes: 'gdt' }))).toBe('cap_nhat');
  });

  it('dòng cũ chưa có scopes thì mặc định cập nhật, không đoán bừa là QR', () => {
    expect(cachSua(lk({ status: 'needs_relink', scopes: null }))).toBe('cap_nhat');
  });

  it('đang chạy tốt thì không mời sửa gì', () => {
    expect(cachSua(lk({ status: 'connected', scopes: 'qrpay' }))).toBe('khong_can');
  });

  it('đã ngắt thì cũng không mời sửa — chỉ liên kết mới từ đầu được', () => {
    expect(cachSua(lk({ status: 'disconnected', scopes: 'qrpay' }))).toBe('khong_can');
  });
});

describe('laLienKetQr', () => {
  it('chỉ đúng scopes qrpay', () => {
    expect(laLienKetQr({ scopes: 'qrpay' })).toBe(true);
    expect(laLienKetQr({ scopes: 'transaction' })).toBe(false);
    expect(laLienKetQr({ scopes: 'gdt' })).toBe(false);
    expect(laLienKetQr({ scopes: null })).toBe(false);
  });
});

describe('cacLoiNhac — hai nhóm, hai câu khác nhau', () => {
  it('chỉ có liên kết QR hỏng thì KHÔNG nói "bấm Cập nhật"', () => {
    // Đây là hồi quy cho chính lỗi đã gặp: banner cũ chỉ nhìn `status` nên nói
    // "bấm Cập nhật" cho cả dòng không cập nhật được.
    const nhac = cacLoiNhac([lk({ status: 'needs_relink', scopes: 'qrpay' })]);
    expect(nhac).toHaveLength(1);
    expect(nhac[0].nhom).toBe('lien_ket_lai');
    expect(nhac[0].cau).not.toContain('Cập nhật');
    expect(nhac[0].cau).toContain('Liên kết để nhận tiền QR');
  });

  it('chỉ có liên kết sao kê hỏng thì giữ nguyên câu cũ', () => {
    const nhac = cacLoiNhac([lk({ status: 'needs_relink', scopes: 'transaction' })]);
    expect(nhac).toHaveLength(1);
    expect(nhac[0].nhom).toBe('cap_nhat');
    expect(nhac[0].cau).toContain('Cập nhật');
  });

  it('có cả hai loại thì ra HAI câu, không gộp làm một', () => {
    const nhac = cacLoiNhac([
      lk({ id: 'a', status: 'needs_relink', scopes: 'transaction' }),
      lk({ id: 'b', status: 'needs_relink', scopes: 'qrpay' }),
    ]);
    expect(nhac.map((n) => n.nhom)).toEqual(['cap_nhat', 'lien_ket_lai']);
  });

  it('đếm đúng số lượng từng nhóm', () => {
    const nhac = cacLoiNhac([
      lk({ id: 'a', status: 'needs_relink', scopes: 'qrpay' }),
      lk({ id: 'b', status: 'needs_relink', scopes: 'qrpay' }),
      lk({ id: 'c', status: 'needs_relink', scopes: 'transaction' }),
      lk({ id: 'd', status: 'connected', scopes: 'transaction' }),
    ]);
    expect(nhac.find((n) => n.nhom === 'lien_ket_lai')!.soLuong).toBe(2);
    expect(nhac.find((n) => n.nhom === 'cap_nhat')!.soLuong).toBe(1);
  });

  it('không có gì hỏng thì không nhắc gì', () => {
    expect(cacLoiNhac([lk(), lk({ id: 'b', status: 'disconnected' })])).toEqual([]);
  });
});

describe('phuDe — ghi chú cụ thể phải thắng câu chung', () => {
  it('có ghi chú từ ngân hàng thì hiện ghi chú đó', () => {
    // Hồi quy: ternary cũ xếp `needs_relink` trước, nên ghi chú lấy từ phản hồi
    // thật của Cas bị câu chung nuốt mất — kể cả khi nó là câu duy nhất nói
    // đúng chuyện gì đang xảy ra.
    const ra = phuDe(lk({ status: 'needs_relink', scopes: 'qrpay' }), 'Dịch vụ này không hỗ trợ Update Mode');
    expect(ra).toBe('Dịch vụ này không hỗ trợ Update Mode');
  });

  it('không có ghi chú thì câu chung theo đúng loại liên kết', () => {
    expect(phuDe(lk({ status: 'needs_relink', scopes: 'qrpay' })))
      .toBe('Liên kết nhận tiền QR đã hỏng — cần tạo lại');
    expect(phuDe(lk({ status: 'needs_relink', scopes: 'transaction' })))
      .toBe('Ngân hàng yêu cầu đăng nhập lại');
  });

  it('liên kết đang tốt và không có ghi chú thì không có phụ đề', () => {
    expect(phuDe(lk())).toBeNull();
  });

  it('liên kết QR đang tốt phải tự nói nó là gì, không để rơi vào "chưa đồng bộ"', () => {
    // Hồi quy cho chuyện thấy trên màn hình 04/09: dòng QR đã xanh nhưng phụ đề
    // là "Chưa đồng bộ lần nào" — gợi ý một việc đang chờ, trong khi grant
    // `qrpay` không bao giờ có sao kê để đồng bộ. Nó sẽ đứng ở đó vĩnh viễn.
    const ra = phuDe(lk({ status: 'connected', scopes: 'qrpay' }));
    expect(ra).toContain('Sẵn sàng nhận tiền QR');
    expect(ra).not.toContain('Chưa đồng bộ');
  });

  it('ghi chú thật vẫn thắng câu chung của liên kết QR đang tốt', () => {
    expect(phuDe(lk({ status: 'connected', scopes: 'qrpay' }), 'Ngân hàng đang bảo trì'))
      .toBe('Ngân hàng đang bảo trì');
  });

  it('liên kết đang tốt nhưng có ghi chú thì vẫn hiện ghi chú', () => {
    // Đây là ca "đồng bộ lỗi nhưng chưa tới mức phải liên kết lại" — ghi chú
    // hổ phách phải bám lại, đúng như bản vá case 7.
    expect(phuDe(lk({ status: 'connected' }), 'Tài khoản đang bật chặn đăng nhập từ website'))
      .toBe('Tài khoản đang bật chặn đăng nhập từ website');
  });
});

/**
 * Liên kết Tổng Cục Thuế — lần thứ ba của cùng một họ lỗi.
 *
 * Grant `gdt` nối tới cơ quan thuế, không tới ngân hàng nào. Trước 08/09/2026
 * màn hình gọi nó là "Tài khoản ngân hàng", kèm một chuỗi bốn ký tự trông như
 * số tài khoản, và phụ đề "Chưa đồng bộ lần nào" — một câu hứa việc đang chờ.
 *
 * Nhưng không nơi nào trong giao diện gọi `gdt-sync`, và nút Đồng bộ chung thì
 * bỏ qua grant `gdt`. Nối xong là bảng hoá đơn trống vĩnh viễn.
 */
describe('liên kết Tổng Cục Thuế', () => {
  const thue = { id: 'g', status: 'connected', scopes: 'gdt' };

  it('không bị nhầm là liên kết QR', () => {
    expect(laLienKetThue(thue)).toBe(true);
    expect(laLienKetQr(thue)).toBe(false);
  });

  it('gọi đúng tên cơ quan, không mượn nhãn ngân hàng', () => {
    // `exchange` ghi nhãn dự phòng này khi Cas không trả về tên tổ chức.
    expect(tenDong({ ...thue, bank_name: 'Tài khoản ngân hàng' })).toBe('Tổng Cục Thuế');
    // Kể cả khi có account_name, dòng thuế vẫn phải đọc ra là thuế.
    expect(tenDong({ ...thue, account_name: 'DINH VAN NAM' })).toBe('Tổng Cục Thuế');
  });

  it('dòng ngân hàng vẫn giữ tên cũ', () => {
    const nh = { id: 'b', status: 'connected', scopes: 'transaction' };
    expect(tenDong({ ...nh, account_name: 'DINH VAN NAM', bank_name: 'MB Bank' })).toBe(
      'DINH VAN NAM',
    );
    expect(tenDong({ ...nh, account_name: null, bank_name: 'MB Bank' })).toBe('MB Bank');
  });

  it('phụ đề nói việc bấm được, không nói "chưa đồng bộ lần nào"', () => {
    // Câu dự phòng cũ gợi ý một việc đang chờ mà nút chung không làm được.
    expect(phuDe(thue)).toBe('Đã kết nối · bấm đồng bộ để tải hoá đơn điện tử');
  });

  it('liên kết thuế hỏng thì vẫn dùng Update Mode như liên kết đọc sao kê', () => {
    // Chỉ `qrpay` mới bắt buộc liên kết lại từ đầu — xem ghi chú đầu file.
    expect(cachSua({ ...thue, status: 'needs_relink' })).toBe('cap_nhat');
  });
});

/**
 * Ô "Giả lập lỗi" chỉ hiện ở nơi nó chạy được.
 *
 * `/sandbox/grant/reset-login` là thao tác Open Banking. Thử nó trên grant
 * `qrpay` hoặc `gdt` thì Cas trả *"Dịch vụ này không hỗ trợ Open Banking"* —
 * quan sát thật ngày 08/09/2026, khi đang thử ép điều kiện của case 4.
 */
describe('giaLapLoiDuoc', () => {
  it('cho phép trên liên kết đọc sao kê đang kết nối', () => {
    expect(giaLapLoiDuoc({ status: 'connected', scopes: 'transaction' })).toBe(true);
  });

  it('không cho trên liên kết QR và liên kết thuế', () => {
    expect(giaLapLoiDuoc({ status: 'connected', scopes: 'qrpay' })).toBe(false);
    expect(giaLapLoiDuoc({ status: 'connected', scopes: 'gdt' })).toBe(false);
  });

  it('không cho khi liên kết chưa ở trạng thái kết nối', () => {
    // Không có phiên đăng nhập đang sống thì không có gì để làm hỏng.
    expect(giaLapLoiDuoc({ status: 'needs_relink', scopes: 'transaction' })).toBe(false);
    expect(giaLapLoiDuoc({ status: 'disconnected', scopes: 'transaction' })).toBe(false);
  });
});
