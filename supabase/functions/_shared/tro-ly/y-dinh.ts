/**
 * Nhận ý định từ một câu hỏi, không cần mô hình.
 *
 * Đây là đường chạy thật khi máy chủ chưa có khoá mô hình (tới 15/09/2026 là vậy), và
 * là đường dự phòng khi cổng mô hình lỗi. Chỉ nhận những gì nhận ra chắc chắn; không
 * nhận ra thì trả mảng rỗng để màn hình nói thật là chưa hiểu, thay vì đoán sai.
 */
import type { NhomNangLuc } from './kieu.ts';
import { canTraLuat } from '../luat/nguon-luat.ts';

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
  [/\b(tra soat|chuyen nham|chuyen sai|chuyen trung)\b/, 'giay_to_tra_soat'],
  [/\b(giai trinh|cong van giai trinh)\b/, 'giay_to_giai_trinh'],
  [/\b(huy to khai|nop nham|nop trung|to khai nop nham|khai nham)\b/, 'giay_to_huy_to_khai'],
  [/\b(bat thuong|lua dao|dang ngo|kha nghi|gia danh|gia mao|doi so tai khoan|bi lua)\b/, 'giao_dich_bat_thuong'],
  [/\b(cho (toi |minh )?duyet|can duyet|phe duyet|duyet|yeu cau chi)\b/, 'yeu_cau_cho_duyet'],
  [/\b(agent|agents|tac tu|bot)\b/, 'tinh_hinh_agent'],
  [/\b(token|cache)\b/, 'token_ai'],
  [/\b(chi phi ai|chi ai|ngan sach ai|dich vu ai|tien ai|openai|gpt|chatgpt|claude|anthropic|gemini|openrouter|llm|ngan sach)\b/, 'chi_phi_ai'],
  [/\b(re hon|model re|mo hinh re|doi model|doi mo hinh|thay model|toi uu model|toi uu mo hinh)\b/, 'model_re_hon'],
  [/\b(to khai|khai thue|nop thue|nghia vu thue|mien thue|thue gtgt|thue tncn|thue thu nhap|thong bao doanh thu|nguong doanh thu|ty le thue|quyet toan|cnkd|mau 01)\b/, 'nghia_vu_thue'],
  [/\b(chung tu|thieu hoa don|chua co hoa don|hoa don dau vao|hoa don mua vao)\b/, 'thieu_chung_tu'],
  [/\b(qua han|cong no|phai thu|khach no|no tien|chua thu|hoa don ban)\b/, 'hoa_don_qua_han'],
  [/\b(doi soat|doi chieu|khop tien|tien ve|da thu|chua khop)\b/, 'doi_soat'],
  [/\b(dong tien|thu chi|tien vao|tien ra)\b/, 'dong_tien'],
  [/\b(ngan hang|sao ke|casso|sepay|dong bo)\b/, 'ket_noi_ngan_hang'],
  [/\b(bao cao|loi nhuan|doanh thu|lai lo)\b/, 'bao_cao_tai_chinh'],
  [/\b(tiet kiem|cat giam|giam chi|bi trung|tra trung|tru hai lan|trung lap)\b/, 'phan_tich_tiet_kiem'],
  [/\b(ket noi|tich hop|plugin|tong cuc thue|co quan thue)\b/, 'tat_ca_ket_noi'],
  [/\b(chi phi|khoan chi|chi tieu|chi bao nhieu|chi het bao nhieu|tieu bao nhieu)\b/, 'chi_phi_thang'],
];

/**
 * Hai lối thoát an toàn, xét TRƯỚC mọi luật khác và trả về ngay.
 *
 * Chúng phải đứng trước vì bộ luật bên trên khớp theo danh từ. Ngày 24/09/2026, thử
 * trợ lý bằng câu hỏi của chuyên gia cho thấy:
 *
 *   "Có người gọi xưng công an bảo chuyển tiền vào tài khoản tạm giữ"
 *       → khớp "tiền vào" → BẢNG DÒNG TIỀN.
 *   "Làm sao khai doanh thu thấp hơn thực tế cho đỡ thuế?"
 *       → khớp "doanh thu" → BẢNG DÒNG TIỀN, không một lời từ chối.
 *
 * Với câu đầu, điều nguy hiểm không chỉ là trả sai: nếu định tuyến sang quét giao
 * dịch bất thường thì sao kê của người chưa chuyển đồng nào là sạch, và MIMI sẽ
 * nói "không thấy dấu hiệu bất thường" — trấn an đúng người đang bị lừa.
 */
const DANG_BI_HOI_CHUYEN_TIEN =
  /\b(xung (la )?(cong an|can bo|nhan vien ngan hang|vien kiem sat|toa an|canh sat)|tai khoan tam giu|tai khoan an toan|rua tien|xac minh tai khoan|can bo dieu tra|(bao|bat|yeu cau|doi) (toi |minh )?chuyen tien)\b/;
/**
 * Nhờ MIMI làm hai việc MIMI không bao giờ làm. "hộ" bỏ dấu thành "ho", trùng với
 * "hộ kinh doanh", nên chỉ nhận "nộp hộ tôi/mình", không nhận "ho" đứng một mình.
 */
const NHO_NOP_THAY =
  /\b(nop (thue |to khai )?(gium|giup|thay)|nop\b.*\b(gium|giup) (toi|minh)|nop ho (toi|minh)|(gium|giup) (toi |minh )?nop)\b/;
const NHO_CHUYEN_TIEN =
  /\b(chuyen\b.*\b(gium|giup) (toi|minh)|(gium|giup) (toi |minh )?chuyen)\b/;
const KHAI_SAI_TRON_THUE =
  /\b(khai (doanh thu )?thap hon|khai giam doanh thu|giau doanh thu|tron thue|ne thue|lach thue|khai sai (de|cho)|khong khai doanh thu)\b/;

/**
 * Mảng MIMI chưa làm. Khớp thì trả đúng câu "chưa làm được", và gỡ năng lực dữ liệu
 * bị kéo vào vì trùng chữ — "công nợ phải trả" từng lấy ra công nợ PHẢI THU.
 */
const CHUA_LAM_DUOC: ReadonlyArray<readonly [RegExp, string, string[]]> = [
  [/\b(phai tra|no nha cung cap|tra nha cung cap|no ncc)\b/, 'chua_co_cong_no_phai_tra', ['hoa_don_qua_han']],
  [/\b(ton kho|hang ton|kiem kho)\b/, 'chua_co_ton_kho', []],
  [/\b(khau hao)\b/, 'chua_co_khau_hao', []],
  [/\b(du bao|du doan dong tien)\b/, 'chua_co_du_bao', ['dong_tien', 'bao_cao_tai_chinh']],
  [/\b(bang luong|tinh luong|tra luong bao nhieu)\b/, 'chua_co_luong', []],
];

/**
 * Câu hỏi thủ tục thuế bị một danh từ dữ liệu cướp mất.
 *
 * "Khoản chi 6 triệu trả tiền mặt có được tính vào chi phí không?" là câu hỏi về
 * điều kiện được trừ chi phí — MIMI từng trả tổng chi tháng này. "Hoá đơn ghi sai
 * mã số thuế thì xử lý sao?" từng trả bảng khoản chi thiếu chứng từ. Chỉ khớp những
 * cụm gần như không bao giờ xuất hiện trong câu hỏi xin số liệu; "thế nào", "ra
 * sao" đứng một mình thì KHÔNG khớp, vì "thu chi tháng này thế nào" là hỏi số.
 */
const THU_TUC_THUE =
  /\b(co duoc (tinh|tru|khau tru|hach toan|dua)|duoc (tinh|khau tru) vao chi phi|xu ly (sao|the nao|ra sao)|tinh tu (ngay|khi|thang)|tra lai hang|hoa don dieu chinh|hoa don thay the)\b/;
const NANG_LUC_SO_LIEU = ['chi_phi_thang', 'bao_cao_tai_chinh', 'thieu_chung_tu', 'dong_tien'];

/**
 * Hai câu gom từ một người dùng thật ngày 24/09/2026 (hộ kinh doanh, ba mẹ lớn tuổi,
 * con ở xa). Trước đó câu đầu ra bảng dòng tiền, câu sau "Mình chưa hiểu câu này".
 */
const TIEN_VAO_KHONG_PHAI_DOANH_THU =
  /\b((tien|khoan) (con|nguoi nha|gia dinh|ba me|bo me|cha me|vay|gop von|dat coc|hoan)\b.*\bdoanh thu|khoan vay\b.*\bdoanh thu|doanh thu\b.*\b(tien vay|khoan vay|gop von|nguoi nha))\b/;
const GIUP_NGUOI_NHA =
  /\b((o xa|tu xa)\b.*\b(theo doi|giup|ho tro)|(theo doi|giup|ho tro) (giup |ho )?(ba me|bo me|cha me|nguoi nha|gia dinh))\b/;
/** "có vượt 1 tỷ không" là hỏi ngưỡng thuế, không phải xin bảng dòng tiền. */
const HOI_NGUONG = /\b(vuot (1|mot) ty|qua (1|mot) ty|vuot nguong|cham nguong|toi nguong)\b/;

export const SO_NANG_LUC_TOI_DA = 3;

export function nhanYDinh(cau: string, phamVi?: NhomNangLuc | null): string[] {
  const s = ` ${boDau(cau).replace(/[^a-z0-9]+/g, ' ').trim()} `;
  if (KHAI_SAI_TRON_THUE.test(s)) return ['tu_choi_khai_sai'];
  if (DANG_BI_HOI_CHUYEN_TIEN.test(s)) return ['dang_bi_hoi_chuyen_tien'];
  if (NHO_NOP_THAY.test(s)) return ['khong_nop_thay'];
  if (NHO_CHUYEN_TIEN.test(s)) return ['khong_chuyen_tien'];
  const khop: string[] = [];
  for (const [re, id] of LUAT) if (re.test(s) && !khop.includes(id)) khop.push(id);

  // "Khoản chi" có mặt trong rất nhiều câu cụ thể hơn ("khoản chi AI", "khoản chi chưa có
  // hoá đơn"). Chi phí chung chỉ là câu trả lời khi không có ý nào cụ thể hơn.
  if (khop.length > 1) {
    const i = khop.indexOf('chi_phi_thang');
    if (i >= 0) khop.splice(i, 1);
  }
  // "Thông báo doanh thu" là tên một hồ sơ thuế (mẫu 01/TKN-CNKD), không phải hỏi báo cáo
  // doanh thu — chữ "doanh thu" trong đó kéo cả năng lực báo cáo vào nếu không chặn.
  if (/\bthong bao doanh thu\b/.test(s)) {
    const i = khop.indexOf('bao_cao_tai_chinh');
    if (i >= 0) khop.splice(i, 1);
  }
  // Muốn đề xuất model rẻ hơn thì phải thấy đang chi bao nhiêu trước.
  if (khop.includes('model_re_hon') && !khop.includes('chi_phi_ai')) khop.unshift('chi_phi_ai');
  // "Hoá đơn" không kèm chữ nào khác: cả hai phía đều có thể là điều người dùng hỏi.
  if (khop.length === 0 && /\bhoa don\b/.test(s)) khop.push('hoa_don_qua_han', 'thieu_chung_tu');

  // Hỏi soạn giấy tờ về tờ khai ("huỷ tờ khai nộp nhầm", "giải trình tờ khai") không phải hỏi
  // nghĩa vụ thuế: chữ "tờ khai" trong đó kéo năng lực nghĩa vụ thuế vào nếu không chặn.
  if (khop.includes('giay_to_huy_to_khai') || khop.includes('giay_to_giai_trinh')) {
    const i = khop.indexOf('nghia_vu_thue');
    if (i >= 0) khop.splice(i, 1);
  }
  // Hỏi thuế có chữ "doanh thu" ("doanh thu bao nhiêu thì phải nộp thuế") là hỏi ngưỡng thuế,
  // không phải xin báo cáo dòng tiền.
  if (khop.includes('nghia_vu_thue')) {
    const i = khop.indexOf('bao_cao_tai_chinh');
    if (i >= 0) khop.splice(i, 1);
  }
  if (TIEN_VAO_KHONG_PHAI_DOANH_THU.test(s)) {
    for (const g of ['bao_cao_tai_chinh', 'ket_noi_ngan_hang', 'dong_tien']) { const i = khop.indexOf(g); if (i >= 0) khop.splice(i, 1); }
    if (!khop.includes('tien_vao_khong_phai_doanh_thu')) khop.unshift('tien_vao_khong_phai_doanh_thu');
  }
  if (GIUP_NGUOI_NHA.test(s) && !khop.includes('giup_nguoi_nha')) khop.unshift('giup_nguoi_nha');
  if (HOI_NGUONG.test(s)) {
    const i = khop.indexOf('bao_cao_tai_chinh'); if (i >= 0) khop.splice(i, 1);
    if (!khop.includes('nghia_vu_thue')) khop.unshift('nghia_vu_thue');
  }
  for (const [re, id, go] of CHUA_LAM_DUOC) {
    if (!re.test(s)) continue;
    for (const g of go) { const i = khop.indexOf(g); if (i >= 0) khop.splice(i, 1); }
    if (!khop.includes(id)) khop.unshift(id);
  }
  if (THU_TUC_THUE.test(s)) {
    for (const g of NANG_LUC_SO_LIEU) { const i = khop.indexOf(g); if (i >= 0) khop.splice(i, 1); }
    if (!khop.includes('tra_cuu_luat')) khop.unshift('tra_cuu_luat');
  }
  // Câu pháp lý chung không thuộc việc nào của công ty: tra kho văn bản (trước cả nhóm đang chọn,
  // vì trả số liệu cho một câu hỏi luật là trả lời sai câu hỏi).
  if (khop.length === 0 && canTraLuat(cau)) khop.push('tra_cuu_luat');
  if (khop.length === 0 && phamVi) khop.push(MAC_DINH_THEO_NHOM[phamVi]);
  return khop.slice(0, SO_NANG_LUC_TOI_DA);
}
