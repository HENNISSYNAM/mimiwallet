/**
 * Ghép tiền đã chi với hoá đơn đầu vào, để biết khoản nào còn thiếu giấy tờ.
 *
 * ĐÂY LÀ NỖI ĐAU SỐ MỘT CỦA HỘ KINH DOANH. Từ 2026 họ được chọn tính thuế
 * theo lợi nhuận — nhưng chỉ khi chứng minh được chi phí. Không có giấy tờ thì
 * không được trừ, và phải tính theo doanh thu, thường là đắt hơn.
 *
 * VÌ SAO CHỈ MIMI LÀM ĐƯỢC. Việc này cần hai nguồn cùng lúc: tiền ra khỏi tài
 * khoản (sao kê) và hoá đơn đầu vào (Tổng Cục Thuế). Ngân hàng có nguồn thứ
 * nhất, hãng phần mềm hoá đơn có nguồn thứ hai. MIMI có cả hai.
 *
 * HÀM THUẦN, VÌ ĐÂY LÀ SỐ ĐI VÀO TỜ KHAI THUẾ. Ghép sai thì người dùng khai
 * một khoản chi phí không có thật, hoặc bỏ sót một khoản có thật. Cả hai đều
 * dẫn tới nộp sai.
 *
 * BA QUY TẮC, CẢ BA ĐỀU VỀ VIỆC KHÔNG ĐOÁN:
 *
 *  1. Ghép mơ hồ thì KHÔNG ghép. Hai hoá đơn cùng số tiền trong cùng tuần —
 *     chọn đại một cái là chọn hộ người dùng. Xếp vào "cần xem".
 *  2. Hoá đơn không tìm thấy khoản chi tương ứng KHÔNG phải lỗi. Rất có thể
 *     họ trả tiền mặt. Hoá đơn vẫn là giấy tờ hợp lệ.
 *  3. Khoản chi không có hoá đơn là "chưa có giấy tờ", KHÔNG phải "không hợp
 *     lệ". Có thể họ có hoá đơn giấy chưa nhập vào. Nói đúng chữ đó.
 */

/** Một khoản tiền đi ra khỏi tài khoản. */
export interface KhoanChi {
  id: string;
  /** Số tiền, luôn dương. */
  soTien: number;
  /** Ngày giao dịch, dạng YYYY-MM-DD. */
  ngay: string;
  /** Nội dung chuyển khoản hoặc tên nơi nhận. Dùng để dò số hoá đơn. */
  noiDung: string | null;
  /** Tên tài khoản nhận, nếu ngân hàng có trả về. */
  tenNguoiNhan: string | null;
}

/** Một hoá đơn mua vào, lấy từ Tổng Cục Thuế. */
export interface HoaDonVao {
  id: string;
  soTien: number;
  /** Ngày phát hành, dạng YYYY-MM-DD. */
  ngay: string;
  soHoaDon: string | null;
  tenBenBan: string | null;
  maSoThueBenBan: string | null;
}

export type CachGhep = 'so_hoa_don' | 'so_tien_va_ngay';

export interface CapDaGhep {
  khoanChiId: string;
  hoaDonId: string;
  soTien: number;
  cach: CachGhep;
}

export interface CanXem {
  khoanChiId: string;
  /** Các hoá đơn cùng khớp — máy không chọn hộ. */
  hoaDonId: string[];
  soTien: number;
}

export interface KetQuaGhep {
  daGhep: CapDaGhep[];
  /** Khoản chi chưa tìm được hoá đơn. Sắp giảm dần — to nhất ảnh hưởng thuế nhiều nhất. */
  chuaCoGiay: KhoanChi[];
  /** Khoản chi khớp nhiều hoá đơn cùng lúc, cần người xem. */
  canXem: CanXem[];
  /** Hoá đơn chưa thấy khoản chi tương ứng. Không phải lỗi — có thể trả tiền mặt. */
  hoaDonChuaThayTien: HoaDonVao[];

  /** Tổng tiền đã chi trong kỳ. */
  tongDaChi: number;
  /** Tổng giá trị hoá đơn đầu vào — đây là chi phí chứng minh được. */
  tongCoGiay: number;
  /** Tổng khoản chi chưa có hoá đơn. Con số cần đi đòi chứng từ. */
  tongChuaCoGiay: number;
}

/** Số ngày lệch cho phép giữa ngày hoá đơn và ngày trả tiền. */
export const SO_NGAY_LECH = 7;

/** Sai số tiền cho phép, tính theo đồng. Chuyển khoản đôi khi lệch vài đồng phí. */
export const LECH_TIEN = 1000;

function soNgayCach(a: string, b: string): number {
  const x = new Date(`${a}T00:00:00`).getTime();
  const y = new Date(`${b}T00:00:00`).getTime();
  return Math.abs(Math.round((x - y) / 86_400_000));
}

/**
 * Bỏ dấu, viết thường, bỏ ký tự lạ — để dò số hoá đơn trong nội dung chuyển
 * khoản. Ngân hàng hay viết hoa toàn bộ và chèn dấu gạch.
 */
function phang(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Ghép khoản chi với hoá đơn.
 *
 * Chạy hai vòng, vòng chắc chắn trước:
 *
 *   1. Số hoá đơn xuất hiện trong nội dung chuyển khoản. Không gì chắc hơn.
 *   2. Đúng số tiền và trong khoảng ngày cho phép — chỉ khi có đúng MỘT hoá
 *      đơn khớp. Nhiều hơn một thì để người xem.
 *
 * Mỗi khoản chi ghép nhiều nhất một hoá đơn, và ngược lại. Thiếu ràng buộc này
 * thì hai khoản chi cùng số tiền sẽ cùng nhận một hoá đơn, và tổng chi phí
 * chứng minh được bị đếm hai lần.
 */
export function ghepChungTu(
  chi: KhoanChi[],
  hoaDon: HoaDonVao[],
  soNgayLech: number = SO_NGAY_LECH,
): KetQuaGhep {
  const daGhep: CapDaGhep[] = [];
  const canXem: CanXem[] = [];
  const chiDaDung = new Set<string>();
  const hoaDonDaDung = new Set<string>();

  // ── Vòng 1: số hoá đơn nằm trong nội dung chuyển khoản ──────────────────
  for (const c of chi) {
    if (chiDaDung.has(c.id)) continue;
    const noi = phang(`${c.noiDung ?? ''} ${c.tenNguoiNhan ?? ''}`);
    if (!noi) continue;

    for (const h of hoaDon) {
      if (hoaDonDaDung.has(h.id)) continue;
      const so = h.soHoaDon ? phang(h.soHoaDon) : '';
      // Số hoá đơn quá ngắn thì bỏ qua: "1" sẽ khớp với mọi nội dung có chữ số.
      if (so.length < 4 || !noi.includes(so)) continue;

      daGhep.push({ khoanChiId: c.id, hoaDonId: h.id, soTien: h.soTien, cach: 'so_hoa_don' });
      chiDaDung.add(c.id);
      hoaDonDaDung.add(h.id);
      break;
    }
  }

  // ── Vòng 2: đúng số tiền, trong khoảng ngày ─────────────────────────────
  for (const c of chi) {
    if (chiDaDung.has(c.id)) continue;

    const ungVien = hoaDon.filter(
      (h) =>
        !hoaDonDaDung.has(h.id) &&
        Math.abs(h.soTien - c.soTien) <= LECH_TIEN &&
        soNgayCach(h.ngay, c.ngay) <= soNgayLech,
    );

    if (ungVien.length === 1) {
      const h = ungVien[0];
      daGhep.push({ khoanChiId: c.id, hoaDonId: h.id, soTien: h.soTien, cach: 'so_tien_va_ngay' });
      chiDaDung.add(c.id);
      hoaDonDaDung.add(h.id);
    } else if (ungVien.length > 1) {
      /*
       * Nhiều hoá đơn cùng khớp. Không chọn.
       *
       * Chọn cái đầu tiên thì tổng vẫn đúng, nhưng khi người dùng bấm vào xem
       * chi tiết sẽ thấy một cặp ghép sai — và mất lòng tin vào cả bảng.
       */
      canXem.push({ khoanChiId: c.id, hoaDonId: ungVien.map((h) => h.id), soTien: c.soTien });
      chiDaDung.add(c.id);
    }
  }

  const idCanXem = new Set(canXem.map((x) => x.khoanChiId));
  const chuaCoGiay = chi
    .filter((c) => !chiDaDung.has(c.id) && !idCanXem.has(c.id))
    .sort((a, b) => b.soTien - a.soTien);

  const hoaDonChuaThayTien = hoaDon.filter((h) => !hoaDonDaDung.has(h.id));

  /*
   * `tongCoGiay` cộng TẤT CẢ hoá đơn đầu vào, kể cả hoá đơn chưa ghép được với
   * khoản chi nào.
   *
   * Vì hoá đơn mới là giấy tờ chứng minh chi phí, không phải dòng sao kê. Một
   * hoá đơn trả bằng tiền mặt vẫn được trừ; chỉ là MIMI không thấy đường tiền
   * đi. Cộng theo khoản chi đã ghép sẽ bỏ sót đúng nhóm đó.
   */
  const tongCoGiay = hoaDon.reduce((s, h) => s + h.soTien, 0);
  const tongDaChi = chi.reduce((s, c) => s + c.soTien, 0);
  const tongChuaCoGiay = chuaCoGiay.reduce((s, c) => s + c.soTien, 0);

  return {
    daGhep,
    chuaCoGiay,
    canXem,
    hoaDonChuaThayTien,
    tongDaChi,
    tongCoGiay,
    tongChuaCoGiay,
  };
}
