/**
 * Tìm mã QR Cas mà một khoản tiền SePay đang trả, qua mã tài khoản ảo trong nội dung.
 *
 * VÌ SAO CÓ. Ngày 14/09/2026 (nghiệm thu case 15) khách trả đúng mã QR tạo qua
 * Cas, SePay ghi được khoản tiền, nhưng mã QR vẫn `pending`: nội dung chuyển
 * khoản của mã Cas KHÔNG chứa mã tham chiếu MIMI (Cas giới hạn mô tả 9 ký tự),
 * và SePay không trả `subAccount`, nên cả hai đường khớp đều trượt.
 *
 * Thứ nội dung CÓ mang là mã tài khoản ảo, bỏ tiền tố `VQR`. Quan sát trên hai
 * mẫu thật, không phải đoán từ tài liệu:
 *
 *   07/09  VA `VQRQALVCF0444` → nội dung bắt đầu `Qalvcf0444  CASSO11707 …`
 *   14/09  VA `VQRQAMAEE7338` → nội dung bắt đầu `Qamaee7338  CASSO11728 …`
 *
 * CHỈ KHỚP VỚI TÀI KHOẢN ẢO MIMI ĐÃ LƯU. Không có regex "trông giống mã" nào —
 * danh sách đầu vào là tài khoản ảo của chính các mã QR đang chờ của công ty
 * đó, nên một chuỗi lạ trong nội dung không thể tự sinh ra lượt khớp.
 *
 * So theo TỪ NGUYÊN VẸN, không phân biệt hoa thường. Nhiều hơn một tài khoản
 * ảo cùng xuất hiện thì trả `null`: khoản tiền vẫn được ghi, chỉ không tự khớp —
 * cùng nguyên tắc với `docMaThamChieu`.
 */

const TIEN_TO = /^VQR/i;
/** Mã quá ngắn thì dễ trùng một từ bình thường trong nội dung. */
const DO_DAI_TOI_THIEU = 8;

function maTrongNoiDung(va: string): string | null {
  const ma = va.trim().replace(TIEN_TO, '').toUpperCase();
  return ma.length >= DO_DAI_TOI_THIEU && /^[A-Z0-9]+$/.test(ma) ? ma : null;
}

export function timTaiKhoanAoTrongNoiDung(
  noiDung: string | null | undefined,
  taiKhoanAo: Array<string | null | undefined>,
): string | null {
  if (!noiDung) return null;
  const tu = new Set(noiDung.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean));

  const trung = new Set<string>();
  for (const va of taiKhoanAo) {
    if (!va) continue;
    const ma = maTrongNoiDung(va);
    if (ma && tu.has(ma)) trung.add(va.trim());
  }
  return trung.size === 1 ? [...trung][0] : null;
}
