/**
 * MIMI-P1-005 (phần nhật ký quyết định) — kết quả của một quyết định do MÁY CHỦ chốt, không chỉ tin
 * lời trình duyệt.
 *
 * Trước đây `nhat_ky_quyet_dinh.ket_qua` ghi đúng điều giao diện báo lại; trình duyệt tắt giữa
 * chừng thì dòng nằm ở `cho_chay` mãi. Với việc chạm tiền (duyệt/từ chối yêu cầu chi) máy chủ có
 * bằng chứng độc lập: trạng thái hiện tại của chính yêu cầu đó. Nên:
 *
 *   - giao diện báo xong  → đối chiếu trạng thái; lệch thì ghi LECH_KET_QUA, không ghi "thành công";
 *   - giao diện im lặng quá hạn → máy chủ tự chốt theo trạng thái, hoặc ghi KHONG_CO_KET_QUA.
 *
 * Việc không có bằng chứng phía máy chủ (đồng bộ, mở trang…) thì vẫn dựa vào lời giao diện, và
 * ghi rõ nguồn.
 */

export const PHUT_TREO = 15;

export interface KetLuan {
  ket_qua: 'thanh_cong' | 'loi';
  cau: string;
  ma_loi: string | null;
}

const TRANG_THAI_MONG: Record<string, string[]> = {
  duyet_yeu_cau: ['da_duyet', 'da_chi'],
  tu_choi_yeu_cau: ['tu_choi'],
};

export const coBangChungMayChu = (loai: string) => loai in TRANG_THAI_MONG;

export function doiChieuQuyetDinh(p: {
  loai: string;
  /** true/false = giao diện báo; null = không báo gì (quyết định bị treo). */
  baoOk: boolean | null;
  baoCau?: string;
  /** Trạng thái hiện tại của yêu cầu chi; null = không đọc được hoặc không còn. */
  trangThai: string | null;
}): KetLuan {
  const mong = TRANG_THAI_MONG[p.loai];
  if (mong) {
    if (p.trangThai && mong.includes(p.trangThai)) {
      return { ket_qua: 'thanh_cong', cau: `Máy chủ đối chiếu: yêu cầu chi đang ở trạng thái "${p.trangThai}".`, ma_loi: null };
    }
    if (p.trangThai === null) {
      return { ket_qua: 'loi', cau: 'Máy chủ không đọc được yêu cầu chi này để đối chiếu.', ma_loi: 'KHONG_THAY_YEU_CAU' };
    }
    if (p.baoOk === true) {
      return { ket_qua: 'loi', cau: `Giao diện báo đã xong nhưng yêu cầu chi vẫn ở trạng thái "${p.trangThai}".`, ma_loi: 'LECH_KET_QUA' };
    }
    if (p.baoOk === false) {
      return { ket_qua: 'loi', cau: p.baoCau || 'Giao diện báo lỗi.', ma_loi: null };
    }
    return { ket_qua: 'loi', cau: `Không nhận được kết quả sau ${PHUT_TREO} phút; yêu cầu chi vẫn ở trạng thái "${p.trangThai}".`, ma_loi: 'KHONG_CO_KET_QUA' };
  }
  // Không có bằng chứng phía máy chủ: dựa vào lời giao diện, ghi rõ nguồn.
  if (p.baoOk === null) {
    return { ket_qua: 'loi', cau: `Không nhận được kết quả sau ${PHUT_TREO} phút — không xác định được việc đã chạy hay chưa.`, ma_loi: 'KHONG_CO_KET_QUA' };
  }
  return { ket_qua: p.baoOk ? 'thanh_cong' : 'loi', cau: `(giao diện báo) ${p.baoCau ?? ''}`.trim(), ma_loi: p.baoOk ? null : 'LOI_GIAO_DIEN' };
}
