/**
 * Golden financial cases — Prompt 4 mục 34, 38. Định dạng bộ ca đã được NGƯỜI duyệt, dùng để chấm và
 * (về sau, nếu đủ và đo được lợi ích) làm dữ liệu tinh chỉnh.
 *
 * QUY TẮC:
 *   - `nguon` luôn là 'tu_viet' (fixture viết tay). Không lấy dữ liệu khách thật làm golden case mặc định
 *     (mục 39): trường này chặn điều đó ngay ở kiểu và ở test.
 *   - Ca mới vào ở `draft`. Chỉ `approved` (có người duyệt, có ngày) mới được dùng ngoài bộ chấm.
 *   - Chưa tinh chỉnh mô hình (mục 38): chưa đủ ca đã duyệt, chưa có đường cơ sở đo được.
 */
export type TrangThaiDuyetCa = 'draft' | 'reviewed' | 'approved' | 'rejected';

export interface GoldenCase {
  id: string;
  question: string;
  context: string;
  financial_facts: Record<string, number | string>;
  expected_analysis: string;
  expected_classification: string | null;
  expected_action: string;
  evidence: string[];
  confidence: 'cao' | 'trung_binh' | 'thap';
  human_review_status: TrangThaiDuyetCa;
  reviewed_by?: string;
  reviewed_at?: string;
  nguon: 'tu_viet';
}

export function kiemGoldenCase(c: GoldenCase): string[] {
  const loi: string[] = [];
  if (!/^GC-\d{3}$/.test(c.id)) loi.push('id phải dạng GC-001');
  if (c.question.trim().length < 5) loi.push('thiếu câu hỏi');
  if (!c.expected_analysis.trim()) loi.push('thiếu phân tích mong đợi');
  if (!c.expected_action.trim()) loi.push('thiếu việc mong đợi');
  if (!c.evidence.length) loi.push('thiếu bằng chứng mong đợi');
  if (c.nguon !== 'tu_viet') loi.push('golden case chỉ từ fixture viết tay');
  if ((c.human_review_status === 'approved' || c.human_review_status === 'reviewed') && (!c.reviewed_by || !c.reviewed_at)) loi.push('đã duyệt thì phải có người duyệt và ngày');
  return loi;
}

/** Ca đầu tiên — viết ngày 25/09/2026, CHƯA ai duyệt. */
export const GOLDEN_CASES: GoldenCase[] = [
  {
    id: 'GC-001', question: 'Doanh thu tháng này tăng nhưng tiền trong tài khoản lại giảm, vì sao?',
    context: 'Hộ kinh doanh bán hàng hoá, một tài khoản ngân hàng, lập hoá đơn trong MIMI.',
    financial_facts: { hoa_don_thang_truoc: 10_000_000, hoa_don_thang_nay: 15_000_000, tien_vao_thang_nay: 6_000_000, tien_ra_thang_nay: 7_000_000, hoa_don_chua_thu: 7_000_000 },
    expected_analysis: 'Sự thật: hoá đơn tăng 5 triệu; dòng tiền ròng giảm. Suy luận: 7 triệu hoá đơn chưa thu nên tiền chưa về. Chưa biết: tiền mặt ngoài ngân hàng.',
    expected_classification: null, expected_action: 'Nhắc thu hoá đơn chưa thanh toán; kiểm khoản chi tăng.',
    evidence: ['hoa_don_ban', 'giao_dich'], confidence: 'trung_binh', human_review_status: 'draft', nguon: 'tu_viet',
  },
  {
    id: 'GC-002', question: 'Mẹ tôi chuyển 3 triệu, có phải khai là doanh thu không?',
    context: 'Hộ kinh doanh; khoản tiền vào có nội dung "me chuyen".',
    financial_facts: { so_tien: 3_000_000, noi_dung: 'me chuyen' },
    expected_analysis: 'Tiền người nhà cho không phải doanh thu bán hàng; MIMI chỉ ra, người dùng xác nhận.',
    expected_classification: 'khong_phai_doanh_thu', expected_action: 'Xác nhận khoản này là tiền người nhà trong hàng đợi tiền vào.',
    evidence: ['giao_dich'], confidence: 'cao', human_review_status: 'draft', nguon: 'tu_viet',
  },
  {
    id: 'GC-003', question: 'Tôi cần chuẩn bị gì trước hạn thuế?',
    context: 'Doanh nghiệp khai GTGT theo quý; còn 1 khoản tiền vào chưa phân loại.',
    financial_facts: { han: '2026-10-31', so_khoan_chua_phan_loai: 1 },
    expected_analysis: 'Việc kế tiếp: khai GTGT quý 3, hạn 31/10/2026; thiếu phân loại 1 khoản.',
    expected_classification: null, expected_action: 'Xác nhận khoản chưa rõ, rồi kiểm bản nháp tờ khai; người dùng tự nộp.',
    evidence: ['lich_thue', 'giao_dich'], confidence: 'trung_binh', human_review_status: 'draft', nguon: 'tu_viet',
  },
  {
    id: 'GC-004', question: 'Thuế yêu cầu tôi giải trình doanh thu quý 2.',
    context: 'Hộ kinh doanh nhận thông báo; kỳ bị hỏi 2026-04 đến 2026-06.',
    financial_facts: { ky_tu: '2026-04', ky_den: '2026-06' },
    expected_analysis: 'Mở việc trả lời giải trình; gom sao kê, phân loại, hoá đơn khớp; liệt kê còn thiếu.',
    expected_classification: null, expected_action: 'Tạo gói bằng chứng và công văn nháp; người dùng duyệt, ký, tự gửi.',
    evidence: ['giao_dich', 'hoa_don_ban'], confidence: 'trung_binh', human_review_status: 'draft', nguon: 'tu_viet',
  },
];
