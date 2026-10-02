import { describe, expect, it } from 'vitest';
import { ghepChungTu, LECH_TIEN, type HoaDonVao, type KhoanChi } from './khopChungTu';

const chi = (
  id: string,
  soTien: number,
  ngay: string,
  noiDung: string | null = null,
): KhoanChi => ({ id, soTien, ngay, noiDung, tenNguoiNhan: null });

const hd = (
  id: string,
  soTien: number,
  ngay: string,
  soHoaDon: string | null = null,
): HoaDonVao => ({
  id,
  soTien,
  ngay,
  soHoaDon,
  tenBenBan: null,
  maSoThueBenBan: null,
});

describe('ghép theo số hoá đơn', () => {
  it('ghép khi số hoá đơn nằm trong nội dung chuyển khoản', () => {
    const r = ghepChungTu(
      [chi('c1', 5_000_000, '2026-08-10', 'CK THANH TOAN HD 00012345 CTY ABC')],
      [hd('h1', 5_000_000, '2026-08-08', '00012345')],
    );
    expect(r.daGhep).toHaveLength(1);
    expect(r.daGhep[0].cach).toBe('so_hoa_don');
  });

  it('ghép được cả khi số tiền lệch — số hoá đơn mạnh hơn số tiền', () => {
    // Trả làm hai lần, hoặc có phí chuyển khoản. Số hoá đơn vẫn là bằng chứng.
    const r = ghepChungTu(
      [chi('c1', 4_800_000, '2026-08-10', 'TT HD 00012345')],
      [hd('h1', 5_000_000, '2026-08-08', '00012345')],
    );
    expect(r.daGhep[0].cach).toBe('so_hoa_don');
  });

  it('bỏ qua nội dung có dấu và viết hoa lộn xộn', () => {
    const r = ghepChungTu(
      [chi('c1', 1_000_000, '2026-08-10', 'Thanh toán hoá đơn 00098765')],
      [hd('h1', 1_000_000, '2026-08-10', '00098765')],
    );
    expect(r.daGhep).toHaveLength(1);
  });

  /*
   * Số hoá đơn quá ngắn sẽ khớp với bất kỳ nội dung nào có chữ số đó. Ghép bừa
   * một lần là người dùng mất lòng tin vào cả bảng.
   */
  it('không ghép khi số hoá đơn ngắn dưới 4 ký tự', () => {
    const r = ghepChungTu(
      [chi('c1', 9_999_999, '2026-08-10', 'CK 123 TIEN HANG')],
      [hd('h1', 500_000, '2026-08-10', '123')],
    );
    expect(r.daGhep).toHaveLength(0);
  });
});

describe('ghép theo số tiền và ngày', () => {
  it('ghép khi đúng số tiền và trong khoảng ngày', () => {
    const r = ghepChungTu([chi('c1', 3_000_000, '2026-08-12')], [hd('h1', 3_000_000, '2026-08-09')]);
    expect(r.daGhep[0].cach).toBe('so_tien_va_ngay');
  });

  it('cho phép lệch vài đồng phí chuyển khoản', () => {
    const r = ghepChungTu(
      [chi('c1', 3_000_000 + LECH_TIEN, '2026-08-10')],
      [hd('h1', 3_000_000, '2026-08-10')],
    );
    expect(r.daGhep).toHaveLength(1);
  });

  it('không ghép khi lệch ngày quá xa', () => {
    const r = ghepChungTu([chi('c1', 3_000_000, '2026-09-01')], [hd('h1', 3_000_000, '2026-08-01')]);
    expect(r.daGhep).toHaveLength(0);
    expect(r.chuaCoGiay.map((c) => c.id)).toEqual(['c1']);
  });

  /*
   * Test quan trọng nhất trong file.
   *
   * Hai hoá đơn cùng số tiền trong cùng tuần là chuyện thường: mua hàng định kỳ
   * của cùng nhà cung cấp. Chọn đại một cái thì TỔNG vẫn đúng — nên lỗi này
   * không lộ ra ở con số. Nó chỉ lộ khi người dùng bấm xem chi tiết và thấy một
   * cặp ghép sai, rồi thôi tin cả bảng.
   */
  it('nhiều hoá đơn cùng khớp thì không chọn hộ, đưa vào cần xem', () => {
    const r = ghepChungTu(
      [chi('c1', 2_000_000, '2026-08-10')],
      [hd('h1', 2_000_000, '2026-08-09'), hd('h2', 2_000_000, '2026-08-11')],
    );
    expect(r.daGhep).toHaveLength(0);
    expect(r.canXem).toHaveLength(1);
    expect(r.canXem[0].hoaDonId.sort()).toEqual(['h1', 'h2']);
    // Không nằm trong "chưa có giấy" — nó có giấy, chỉ chưa rõ giấy nào.
    expect(r.chuaCoGiay).toHaveLength(0);
  });

  it('một hoá đơn chỉ ghép cho một khoản chi', () => {
    // Thiếu ràng buộc này thì hai khoản chi cùng nhận một hoá đơn, và chi phí
    // chứng minh được bị đếm hai lần.
    const r = ghepChungTu(
      [chi('c1', 1_000_000, '2026-08-10'), chi('c2', 1_000_000, '2026-08-10')],
      [hd('h1', 1_000_000, '2026-08-10')],
    );
    expect(r.daGhep).toHaveLength(1);
    const idDaGhep = new Set(r.daGhep.map((g) => g.hoaDonId));
    expect(idDaGhep.size).toBe(1);
  });
});

describe('các con số tổng', () => {
  it('tổng chi phí có giấy cộng tất cả hoá đơn, kể cả hoá đơn chưa thấy tiền', () => {
    /*
     * Hoá đơn mới là giấy tờ chứng minh chi phí, không phải dòng sao kê. Trả
     * tiền mặt thì MIMI không thấy đường tiền đi, nhưng hoá đơn vẫn được trừ.
     * Cộng theo khoản chi đã ghép sẽ bỏ sót đúng nhóm này.
     */
    const r = ghepChungTu(
      [chi('c1', 1_000_000, '2026-08-10')],
      [hd('h1', 1_000_000, '2026-08-10'), hd('h2', 4_000_000, '2026-08-15')],
    );
    expect(r.tongCoGiay).toBe(5_000_000);
    expect(r.hoaDonChuaThayTien.map((h) => h.id)).toEqual(['h2']);
  });

  it('tổng chưa có giấy chỉ cộng khoản chi không ghép được', () => {
    const r = ghepChungTu(
      [chi('c1', 1_000_000, '2026-08-10'), chi('c2', 7_000_000, '2026-08-11')],
      [hd('h1', 1_000_000, '2026-08-10')],
    );
    expect(r.tongDaChi).toBe(8_000_000);
    expect(r.tongChuaCoGiay).toBe(7_000_000);
  });

  it('sắp khoản chưa có giấy theo số tiền giảm dần', () => {
    // Khoản to nhất ảnh hưởng tiền thuế nhiều nhất, nên phải đứng đầu danh sách
    // đi đòi chứng từ.
    const r = ghepChungTu(
      [chi('c1', 500_000, '2026-08-10'), chi('c2', 9_000_000, '2026-08-10'), chi('c3', 3_000_000, '2026-08-10')],
      [],
    );
    expect(r.chuaCoGiay.map((c) => c.id)).toEqual(['c2', 'c3', 'c1']);
  });

  it('không có gì thì mọi tổng bằng 0, không vỡ', () => {
    const r = ghepChungTu([], []);
    expect(r.tongDaChi).toBe(0);
    expect(r.tongCoGiay).toBe(0);
    expect(r.tongChuaCoGiay).toBe(0);
    expect(r.daGhep).toEqual([]);
  });
});

describe('chữ dùng phải đúng', () => {
  /*
   * Khoản chi không có hoá đơn điện tử là "chưa có giấy tờ", KHÔNG phải "không
   * hợp lệ". Rất có thể họ có hoá đơn giấy chưa nhập. Gọi sai chữ là buộc tội
   * người dùng về một việc mình chưa biết.
   *
   * Test này khoá tên trường, vì tên trường là thứ đi thẳng ra giao diện.
   */
  it('trường gọi là chuaCoGiay, không phải khongHopLe', () => {
    const r = ghepChungTu([chi('c1', 1, '2026-08-10')], []);
    expect(r).toHaveProperty('chuaCoGiay');
    expect(r).not.toHaveProperty('khongHopLe');
  });

  it('hoá đơn chưa thấy tiền không bị tính là lỗi', () => {
    const r = ghepChungTu([], [hd('h1', 1_000_000, '2026-08-10')]);
    expect(r.hoaDonChuaThayTien).toHaveLength(1);
    // Vẫn được cộng vào chi phí chứng minh được.
    expect(r.tongCoGiay).toBe(1_000_000);
  });
});
