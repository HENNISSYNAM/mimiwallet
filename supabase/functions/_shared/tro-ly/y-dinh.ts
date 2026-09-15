/**
 * Nhận ý định từ một câu hỏi, không cần mô hình.
 *
 * Đây là đường chạy thật khi máy chủ chưa có khoá mô hình (tới 15/09/2026 là vậy), và
 * là đường dự phòng khi cổng mô hình lỗi. Chỉ nhận những gì nhận ra chắc chắn; không
 * nhận ra thì trả mảng rỗng để màn hình nói thật là chưa hiểu, thay vì đoán sai.
 */
import type { NhomNangLuc } from './kieu.ts';

export const boDau = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** Năng lực mặc định khi người dùng đã chọn một nhóm mà câu hỏi không chỉ rõ. */
export const MAC_DINH_THEO_NHOM: Record<NhomNangLuc, string> = {
  tro_ly: 'yeu_cau_cho_duyet',
  chi_phi: 'chi_phi_thang',
  chung_tu: 'thieu_chung_tu',
  ngan_hang: 'dong_tien',
  ai_token: 'chi_phi_ai',
  bao_cao: 'bao_cao_tai_chinh',
  ket_noi: 'tat_ca_ket_noi',
};

const LUAT: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b(cho (toi |minh )?duyet|can duyet|phe duyet|duyet|yeu cau chi)\b/, 'yeu_cau_cho_duyet'],
  [/\b(agent|agents|tac tu|bot)\b/, 'tinh_hinh_agent'],
  [/\btoken\b/, 'token_ai'],
  [/\b(chi phi ai|chi ai|ngan sach ai|dich vu ai|tien ai|openai|gpt|chatgpt|claude|anthropic|gemini|openrouter|llm|ngan sach)\b/, 'chi_phi_ai'],
  [/\b(re hon|model re|mo hinh re|doi model|doi mo hinh|thay model|toi uu model|toi uu mo hinh)\b/, 'model_re_hon'],
  [/\b(chung tu|thieu hoa don|chua co hoa don|hoa don dau vao|hoa don mua vao)\b/, 'thieu_chung_tu'],
  [/\b(qua han|cong no|phai thu|khach no|hoa don ban)\b/, 'hoa_don_qua_han'],
  [/\b(doi soat|khop tien|tien ve|da thu|chua khop)\b/, 'doi_soat'],
  [/\b(dong tien|thu chi|tien vao|tien ra)\b/, 'dong_tien'],
  [/\b(ngan hang|sao ke|casso|sepay|dong bo)\b/, 'ket_noi_ngan_hang'],
  [/\b(bao cao|loi nhuan|doanh thu|lai lo)\b/, 'bao_cao_tai_chinh'],
  [/\b(tiet kiem|cat giam|giam chi|bi trung|tra trung|tru hai lan|trung lap)\b/, 'phan_tich_tiet_kiem'],
  [/\b(ket noi|tich hop|plugin|tong cuc thue|co quan thue)\b/, 'tat_ca_ket_noi'],
  [/\b(chi phi|khoan chi|chi tieu)\b/, 'chi_phi_thang'],
];

export const SO_NANG_LUC_TOI_DA = 3;

export function nhanYDinh(cau: string, phamVi?: NhomNangLuc | null): string[] {
  const s = ` ${boDau(cau).replace(/[^a-z0-9]+/g, ' ').trim()} `;
  const khop: string[] = [];
  for (const [re, id] of LUAT) if (re.test(s) && !khop.includes(id)) khop.push(id);

  // "Khoản chi" có mặt trong rất nhiều câu cụ thể hơn ("khoản chi AI", "khoản chi chưa có
  // hoá đơn"). Chi phí chung chỉ là câu trả lời khi không có ý nào cụ thể hơn.
  if (khop.length > 1) {
    const i = khop.indexOf('chi_phi_thang');
    if (i >= 0) khop.splice(i, 1);
  }
  // Muốn đề xuất model rẻ hơn thì phải thấy đang chi bao nhiêu trước.
  if (khop.includes('model_re_hon') && !khop.includes('chi_phi_ai')) khop.unshift('chi_phi_ai');
  // "Hoá đơn" không kèm chữ nào khác: cả hai phía đều có thể là điều người dùng hỏi.
  if (khop.length === 0 && /\bhoa don\b/.test(s)) khop.push('hoa_don_qua_han', 'thieu_chung_tu');

  if (khop.length === 0 && phamVi) khop.push(MAC_DINH_THEO_NHOM[phamVi]);
  return khop.slice(0, SO_NANG_LUC_TOI_DA);
}
