/**
 * Chấm điểm dự đoán về thị trường.
 *
 * VÌ SAO MODULE NÀY TỒN TẠI: mọi kịch bản về kinh tế đều nghe hợp lý lúc đọc.
 * "Lãi suất giảm nên doanh nghiệp sẽ vay nhiều hơn" và "lãi suất giảm nhưng
 * doanh nghiệp vẫn ngại vay" — cả hai đều là câu có lý, và không có cách nào
 * phân biệt bên nào đúng nếu không **ghi lại trước, đối chiếu sau**.
 *
 * Đây là điều kiện để một công cụ mô phỏng trở thành công cụ thay vì máy kể
 * chuyện. Không có vòng chấm điểm, MiroFish (hay bất kỳ mô hình nào) chỉ sinh ra
 * văn bản thuyết phục mà không ai kiểm được — đúng loại số liệu mà repo này đã
 * phải gỡ ra nhiều lần.
 *
 * HAI CON SỐ, VÀ CON SỐ THỨ HAI MỚI QUAN TRỌNG
 *
 * `diemBrier` đo sai số. Nhưng **điểm Brier đứng một mình không có nghĩa gì**:
 * 0,20 là tốt hay tệ? Không biết, cho tới khi so với việc đoán bừa.
 *
 * Nên `soSanhVoiNenTang` mới là thứ đáng nhìn: nó so điểm của dự đoán thật với
 * điểm của một "người dự đoán ngu" luôn đọc đúng tỷ lệ nền. Thua nền nghĩa là
 * mô hình đang làm hại, dù các kịch bản nó viết ra nghe hay tới đâu.
 */

export type KetCuc = 'pending' | 'correct' | 'wrong' | 'unresolvable';

export interface DuDoan {
  id: string;
  /** Phát biểu kiểm chứng được. Xem `laPhatBieuKiemChungDuoc`. */
  claim: string;
  /** Xác suất tự nhận, 0–1. 0,5 nghĩa là không biết gì. */
  confidence: number;
  /** Ngày phải đối chiếu. Có ngày thì không lảng tránh được. */
  resolve_on: string;
  outcome: KetCuc;
}

/**
 * Điểm Brier cho một dự đoán: bình phương sai lệch giữa xác suất nói ra và
 * thực tế (1 nếu xảy ra, 0 nếu không). Thấp là tốt. Tối đa 1.
 *
 * Dùng Brier chứ không dùng "tỷ lệ đúng" vì tỷ lệ đúng bỏ qua độ tự tin: nói
 * "chắc 51%" rồi trúng, và nói "chắc 99%" rồi trúng, không phải cùng một thành
 * tích. Brier phạt đúng chỗ đó.
 */
export function brier(confidence: number, xayRa: boolean): number {
  const p = Math.min(1, Math.max(0, confidence));
  return (p - (xayRa ? 1 : 0)) ** 2;
}

/** Chỉ những dự đoán đã có kết luận mới được chấm. */
export function daKetLuan(ds: DuDoan[]): DuDoan[] {
  return ds.filter((d) => d.outcome === 'correct' || d.outcome === 'wrong');
}

/**
 * Điểm Brier trung bình. `null` khi chưa có dự đoán nào kết luận — trả `null`
 * chứ không trả 0, vì 0 là điểm hoàn hảo và hiển thị nhầm thành "dự đoán tuyệt
 * đối chính xác" trong khi thực tế là "chưa đo được gì".
 */
export function diemBrier(ds: DuDoan[]): number | null {
  const xong = daKetLuan(ds);
  if (!xong.length) return null;
  const tong = xong.reduce((s, d) => s + brier(d.confidence, d.outcome === 'correct'), 0);
  return tong / xong.length;
}

export interface SoSanhNenTang {
  /** Số dự đoán đã kết luận. */
  soLuong: number;
  /** Tỷ lệ dự đoán thành hiện thực — chính là tỷ lệ nền. */
  tyLeNen: number;
  diem: number;
  /** Điểm của người luôn đọc đúng tỷ lệ nền, không biết gì thêm. */
  diemNenTang: number;
  /** Dương là hơn nền. Âm là đang làm hại. */
  hon: number;
  /**
   * Chỉ tin khi đã đủ mẫu. Dưới ngưỡng thì mọi so sánh là nhiễu — mười dự đoán
   * may mắn trông y hệt mười dự đoán giỏi.
   */
  duMau: boolean;
}

export const MAU_TOI_THIEU = 20;

/**
 * So thành tích với nền.
 *
 * "Nền" ở đây là người dự đoán không biết gì ngoài tần suất quá khứ: nếu 30%
 * các dự đoán từng thành hiện thực, người đó nói 0,30 cho mọi câu hỏi. Đánh bại
 * được người đó mới là có thông tin thật.
 *
 * HỆ QUẢ QUAN TRỌNG, dễ hiểu nhầm: **ai luôn nói cùng một con số thì không bao
 * giờ hơn được nền.** Nói 0,9 cho mọi câu và đúng 90% số lần nghe rất giỏi,
 * nhưng tỷ lệ nền khi đó cũng là 0,9 — hai bên trùng nhau, `hon` bằng 0.
 *
 * Năng lực nằm ở chỗ **phân biệt**: nói cao cho thứ sẽ xảy ra và nói thấp cho
 * thứ sẽ không. Một mô hình chỉ biết hô "sắp tăng" cho mọi tin sẽ lộ ra ở đây,
 * dù các kịch bản nó viết có thuyết phục tới đâu.
 */
export function soSanhVoiNenTang(ds: DuDoan[]): SoSanhNenTang | null {
  const xong = daKetLuan(ds);
  if (!xong.length) return null;

  const soDung = xong.filter((d) => d.outcome === 'correct').length;
  const tyLeNen = soDung / xong.length;

  const diem = diemBrier(xong)!;
  const diemNenTang =
    xong.reduce((s, d) => s + brier(tyLeNen, d.outcome === 'correct'), 0) / xong.length;

  return {
    soLuong: xong.length,
    tyLeNen,
    diem,
    diemNenTang,
    // Điểm thấp hơn là tốt hơn, nên đảo dấu để "dương = hơn".
    hon: diemNenTang - diem,
    duMau: xong.length >= MAU_TOI_THIEU,
  };
}

export interface OHieuChuan {
  /** Ví dụ "70–80%". */
  nhan: string;
  soLuong: number;
  /** Độ tự tin trung bình đã nói ra trong ô này. */
  tuTinTrungBinh: number;
  /** Tỷ lệ thực tế xảy ra. */
  thucTe: number;
}

/**
 * Hiệu chuẩn: nói "chắc 80%" thì có đúng khoảng 80% số lần không?
 *
 * Đây là thứ Brier không cho thấy. Một người luôn nói 90% mà chỉ đúng 60% có
 * điểm Brier tệ nhưng không biết vì sao; bảng hiệu chuẩn chỉ thẳng ra là **quá
 * tự tin**, và đó là lỗi sửa được.
 */
export function hieuChuan(ds: DuDoan[], soO = 5): OHieuChuan[] {
  const xong = daKetLuan(ds);
  const o: OHieuChuan[] = [];
  for (let i = 0; i < soO; i++) {
    const tu = i / soO;
    const den = (i + 1) / soO;
    // Ô cuối lấy cả biên phải, nếu không dự đoán 100% rơi ra ngoài mọi ô.
    const trong = xong.filter(
      (d) => d.confidence >= tu && (i === soO - 1 ? d.confidence <= den : d.confidence < den),
    );
    if (!trong.length) continue;
    o.push({
      nhan: `${Math.round(tu * 100)}–${Math.round(den * 100)}%`,
      soLuong: trong.length,
      tuTinTrungBinh: trong.reduce((s, d) => s + d.confidence, 0) / trong.length,
      thucTe: trong.filter((d) => d.outcome === 'correct').length / trong.length,
    });
  }
  return o;
}

/**
 * Chặn những phát biểu không đối chiếu được.
 *
 * "Thị trường sẽ biến động" thì đúng trong mọi trường hợp, nên ghi lại cũng vô
 * ích — sau này không ai chấm sai được. Một dự đoán chấm được phải có **mốc thời
 * gian** và một **điều kiện dứt khoát**.
 *
 * Đây là hàng rào quan trọng nhất của cả module: nếu để lọt phát biểu mơ hồ,
 * điểm Brier sẽ đẹp dần theo thời gian mà không phản ánh năng lực nào.
 */
const TU_MO_HO = [
  'có thể', 'có lẽ', 'khả năng', 'biến động', 'ảnh hưởng', 'tác động',
  'nhìn chung', 'nói chung', 'một số', 'nhiều khả năng',
];

export function laPhatBieuKiemChungDuoc(claim: string): { ok: boolean; lyDo?: string } {
  const c = claim.trim().toLowerCase();
  if (c.length < 15) return { ok: false, lyDo: 'Quá ngắn để nêu điều kiện dứt khoát' };

  const mo = TU_MO_HO.find((t) => c.includes(t));
  if (mo) return { ok: false, lyDo: `Chứa từ mơ hồ "${mo}" — không chấm sai được` };

  // Phải có con số hoặc mốc so sánh dứt khoát.
  if (!/\d/.test(c) && !/(tăng|giảm|vượt|dưới|trên|không đổi)/.test(c)) {
    return { ok: false, lyDo: 'Không có con số hay chiều so sánh để đối chiếu' };
  }
  return { ok: true };
}
