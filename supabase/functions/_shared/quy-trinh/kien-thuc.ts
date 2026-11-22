/**
 * KHO KIẾN THỨC CHO BỘ DỰNG WORKFLOW (22/11/2026) — MIMI "học" trước khi dựng, để workflow đạt chuẩn nghề cho doanh
 * nghiệp lớn. Chỉ dẫn chuẩn / văn bản có thật; không trích số điều khoản khi chưa đối chiếu nguyên văn.
 *
 *   Kiểm soát nội bộ: COSO Internal Control – Integrated Framework (2013): phân tách nhiệm vụ (người lập ≠ người duyệt ≠
 *     người chi), phê duyệt theo hạn mức, đối chiếu định kỳ, lưu bằng chứng.
 *   Chu trình tài chính: Procure-to-Pay (khớp 3 bên đơn hàng – nhận hàng – hoá đơn), Order-to-Cash, Record-to-Report.
 *   An toàn thông tin: NIST SP 800-61 (ứng phó sự cố), ISO/IEC 27001 (kiểm soát truy cập, quyền tối thiểu).
 *   Việt Nam: Luật Quản lý thuế số 38/2019/QH14; Nghị định 123/2020/NĐ-CP về hoá đơn, chứng từ; Luật Phòng, chống rửa tiền
 *     số 14/2022/QH15; Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân; Bộ luật Lao động số 45/2019/QH14.
 */
import type { DoThiHien, LinhVuc, NutHien } from './do-thi.ts';

export interface KienThuc {
  chuan: string[];
  nguyen_tac: string[];
  /** Vị trí trong doanh nghiệp (dùng gán người phụ trách). */
  vai_tro: string[];
  /** Kỹ thuật nghiệp vụ. */
  ky_thuat: string[];
  /** Tên gọi chuyên môn: "thuật ngữ — nghĩa". */
  thuat_ngu: string[];
  /** Giấy tờ, chứng từ của nghề. */
  giay_to: string[];
}

export const KIEN_THUC: Record<LinhVuc, KienThuc> = {
  tai_chinh: {
    chuan: ['COSO 2013', 'Record-to-Report', 'Chế độ kế toán doanh nghiệp (Thông tư 200/2014/TT-BTC)', 'Luật Quản lý thuế 38/2019/QH14', 'Nghị định 123/2020/NĐ-CP (hoá đơn, chứng từ)'],
    nguyen_tac: [
      'Đối chiếu sổ với sao kê ngân hàng trước khi khoá kỳ; chênh lệch phải có giải trình.',
      'Mọi bút toán điều chỉnh có người lập và người duyệt khác nhau, kèm chứng từ gốc.',
      'Khoá kỳ sau khi kế toán trưởng ký; sửa sau khoá kỳ phải mở kỳ có phê duyệt.',
      'Tờ khai nộp trước hạn; người ký nộp là người đại diện hoặc được uỷ quyền.',
    ],
    vai_tro: ['Kế toán viên', 'Kế toán công nợ', 'Kế toán thuế', 'Kế toán tổng hợp', 'Kế toán trưởng', 'Kiểm soát viên tài chính (Financial Controller)', 'Giám đốc tài chính (CFO)', 'Kiểm toán nội bộ'],
    ky_thuat: ['Đối chiếu ngân hàng (bank reconciliation)', 'Bút toán trích trước (accrual) và phân bổ chi phí trả trước', 'Danh mục việc đóng sổ (close checklist) có hạn từng việc',
      'Phân tích biến động (variance analysis) so kỳ trước / ngân sách', 'Đối chiếu công nợ với khách hàng, nhà cung cấp', 'Khoá sổ kỳ (period lock)'],
    thuat_ngu: ['Sổ cái (GL) — sổ tổng hợp mọi tài khoản', 'Bảng cân đối số phát sinh (trial balance)', 'Bút toán (journal entry)', 'Kỳ kế toán', 'Quyết toán thuế TNDN', 'Báo cáo tài chính (BCTC)'],
    giay_to: ['Hoá đơn điện tử', 'Phiếu thu / phiếu chi', 'Uỷ nhiệm chi', 'Sao kê ngân hàng', 'Biên bản đối chiếu công nợ', 'Bảng cân đối số phát sinh',
      'Báo cáo tài chính B01-DN, B02-DN, B03-DN, B09-DN', 'Tờ khai thuế GTGT', 'Tờ khai quyết toán thuế TNDN'],
  },
  thanh_toan: {
    chuan: ['COSO 2013 — phân tách nhiệm vụ', 'Procure-to-Pay (khớp 3 bên)', 'Ma trận phân quyền phê duyệt (Delegation of Authority)', 'Kiểm soát gian lận thanh toán / giả mạo email doanh nghiệp (BEC)'],
    nguyen_tac: [
      'Người lập lệnh chi, người duyệt và người thực hiện chuyển tiền phải là ba vai khác nhau.',
      'Khớp đơn hàng – phiếu nhận hàng – hoá đơn trước khi trả; lệch thì dừng.',
      'Tài khoản người nhận mới hoặc vừa đổi phải xác minh ngoài kênh (gọi số đã lưu) trước khi trả.',
      'Phê duyệt theo hạn mức: khoản lớn cần cấp duyệt cao hơn.',
      'Sau khi chi phải đối soát sao kê và đánh dấu hoá đơn đã trả.',
    ],
    vai_tro: ['Nhân viên mua hàng', 'Trưởng bộ phận mua hàng', 'Kế toán phải trả (AP)', 'Thủ quỹ', 'Kế toán trưởng', 'Trưởng ngân quỹ (Treasury)', 'Giám đốc tài chính (CFO)'],
    ky_thuat: ['Khớp 3 bên (three-way match)', 'Duyệt theo ma trận phân quyền (DoA) theo hạn mức', 'Xác minh ngoài kênh (call-back verification)',
      'Chạy thanh toán theo lô (payment run) theo lịch', 'Quản lý danh mục nhà cung cấp (vendor master) — mọi thay đổi tài khoản phải duyệt', 'Phát hiện thanh toán trùng'],
    thuat_ngu: ['Đơn mua hàng (PO)', 'Phiếu nhận hàng / biên bản giao nhận (GRN)', 'Hồ sơ nhà cung cấp (vendor master data)', 'Điều khoản thanh toán (ví dụ Net 30)', 'Đề nghị thanh toán'],
    giay_to: ['Đơn mua hàng (PO)', 'Biên bản giao nhận / phiếu nhập kho', 'Hoá đơn GTGT', 'Đề nghị thanh toán', 'Uỷ nhiệm chi', 'Sao kê ngân hàng', 'Hợp đồng mua bán'],
  },
  bao_mat: {
    chuan: ['NIST SP 800-61 (ứng phó sự cố)', 'ISO/IEC 27001 (kiểm soát truy cập)', 'Nghị định 13/2023/NĐ-CP (dữ liệu cá nhân)'],
    nguyen_tac: [
      'Ứng phó theo pha: phát hiện & phân tích → khoanh vùng → khắc phục & phục hồi → rút kinh nghiệm.',
      'Quyền tối thiểu; thu hồi quyền ngay khi người dùng nghỉ hoặc đổi vai trò.',
      'Ghi nhật ký mọi thay đổi quyền và mọi hành động ứng phó, giữ làm bằng chứng.',
      'Sự cố lộ dữ liệu cá nhân phải đánh giá nghĩa vụ thông báo theo quy định.',
    ],
    vai_tro: ['Chuyên viên giám sát an ninh (SOC)', 'Quản trị hệ thống', 'Giám đốc an toàn thông tin (CISO)', 'Người phụ trách bảo vệ dữ liệu cá nhân', 'Pháp chế', 'Trưởng bộ phận'],
    ky_thuat: ['Phân loại mức độ sự cố (triage)', 'Khoanh vùng (containment): khoá tài khoản, tách máy', 'Thu thập chứng cứ số, giữ chuỗi chứng cứ',
      'Quyền tối thiểu (least privilege) và cấp quyền theo vai trò (RBAC)', 'Rà soát quyền định kỳ (access recertification)', 'Xác thực nhiều lớp (MFA)', 'Xoay vòng khoá / mật khẩu (key rotation)'],
    thuat_ngu: ['Dấu hiệu xâm nhập (IOC)', 'Hệ thống giám sát sự kiện an ninh (SIEM)', 'Lừa đảo qua thư (phishing)', 'Giả mạo email doanh nghiệp (BEC)', 'Kịch bản ứng phó (playbook)'],
    giay_to: ['Báo cáo sự cố', 'Nhật ký truy cập', 'Biên bản thu hồi quyền', 'Danh mục tài sản CNTT', 'Hồ sơ đánh giá tác động xử lý dữ liệu cá nhân'],
  },
  ho_so: {
    chuan: ['Luật Phòng, chống rửa tiền 14/2022/QH15 (nhận biết khách hàng)', 'COSO 2013 — lưu trữ bằng chứng'],
    nguyen_tac: [
      'Lập danh mục giấy tờ bắt buộc trước, đối chiếu với giấy tờ đã có, chỉ xin phần thiếu.',
      'Phân mức rủi ro khách hàng; rủi ro cao cần thẩm định tăng cường và người duyệt cấp cao.',
      'Văn bản gửi ra ngoài phải có người ký có thẩm quyền.',
      'Lưu hồ sơ đầy đủ, truy được ai nộp, ai duyệt, khi nào.',
    ],
    vai_tro: ['Chuyên viên hồ sơ', 'Chuyên viên quan hệ khách hàng (RM)', 'Chuyên viên tuân thủ', 'Pháp chế', 'Người đại diện theo pháp luật'],
    ky_thuat: ['Nhận biết khách hàng (KYC / CDD)', 'Thẩm định tăng cường cho rủi ro cao (EDD)', 'Xác định chủ sở hữu hưởng lợi',
      'Sàng lọc danh sách cảnh báo / cấm vận', 'Phân mức rủi ro khách hàng', 'Danh mục hồ sơ (checklist) theo loại thủ tục'],
    thuat_ngu: ['Chủ sở hữu hưởng lợi', 'Người có ảnh hưởng chính trị (PEP)', 'Phương án kinh doanh / phương án vay vốn', 'Tài sản bảo đảm'],
    giay_to: ['Giấy chứng nhận đăng ký doanh nghiệp', 'Điều lệ công ty', 'CCCD người đại diện', 'Giấy uỷ quyền', 'Báo cáo tài chính', 'Tờ khai thuế', 'Hợp đồng kinh tế', 'Phương án vay vốn'],
  },
  nhan_su: {
    chuan: ['Bộ luật Lao động 45/2019/QH14', 'ISO/IEC 27001 — cấp và thu hồi quyền', 'Nghị định 13/2023/NĐ-CP (dữ liệu cá nhân)'],
    nguyen_tac: [
      'Hợp đồng lao động ký trước ngày làm việc đầu tiên.',
      'Cấp quyền hệ thống theo vai trò, thu hồi ngay ngày làm việc cuối.',
      'Bảng lương: người lập khác người duyệt; chuyển lương do người thực hiện.',
      'Dữ liệu cá nhân người lao động chỉ người có nhiệm vụ mới xem.',
    ],
    vai_tro: ['Chuyên viên tuyển dụng', 'Chuyên viên lương thưởng – phúc lợi (C&B)', 'Đối tác nhân sự (HRBP)', 'Trưởng phòng nhân sự', 'Kế toán lương', 'Quản trị hệ thống', 'Trưởng bộ phận'],
    ky_thuat: ['Danh mục việc đón nhân viên (onboarding checklist)', 'Cấp quyền theo vai trò (RBAC)', 'Chốt công và tính lương gross → net',
      'Khấu trừ bảo hiểm và thuế TNCN', 'Danh mục việc khi nghỉ việc (offboarding): bàn giao, thu hồi quyền, chốt lương'],
    thuat_ngu: ['Thư mời nhận việc (offer letter)', 'Thời gian thử việc', 'Lương gross / net', 'Người phụ thuộc (giảm trừ gia cảnh)'],
    giay_to: ['Hợp đồng lao động', 'Thư mời nhận việc', 'Tờ khai tham gia BHXH, BHYT', 'Bảng chấm công', 'Bảng lương', 'Quyết định nghỉ việc', 'Biên bản bàn giao'],
  },
  cong_viec: {
    chuan: ['Mô hình RACI (người làm – người chịu trách nhiệm – tham vấn – được báo)', 'Cấu trúc phân rã công việc (WBS)'],
    nguyen_tac: [
      'Mỗi bước có một người chịu trách nhiệm và đầu ra rõ.',
      'Có mốc kiểm tra tiến độ và tiêu chí nghiệm thu trước khi đóng việc.',
    ],
    vai_tro: ['Người phụ trách', 'Trưởng nhóm', 'Quản lý dự án (PM)', 'Quản lý trực tiếp'],
    ky_thuat: ['Phân rã công việc (WBS)', 'Ma trận RACI', 'Mốc (milestone) và tiêu chí nghiệm thu', 'Họp rà soát định kỳ'],
    thuat_ngu: ['Mốc (milestone)', 'Tiêu chí nghiệm thu', 'Rủi ro và phương án xử lý'],
    giay_to: ['Kế hoạch công việc', 'Biên bản họp', 'Báo cáo tiến độ', 'Biên bản nghiệm thu'],
  },
};

/** Đoạn kiến thức chèn vào lời nhắc dựng workflow. */
export function kienThucChoLoiNhac(lv: LinhVuc): string {
  const k = KIEN_THUC[lv];
  return [
    `KIẾN THỨC NGHỀ PHẢI TUÂN (${lv}):`,
    `Chuẩn: ${k.chuan.join('; ')}.`,
    `Nguyên tắc:\n- ${k.nguyen_tac.join('\n- ')}`,
    `Vị trí trong doanh nghiệp (dùng cho vai_tro): ${k.vai_tro.join(', ')}.`,
    `Kỹ thuật nghiệp vụ: ${k.ky_thuat.join('; ')}.`,
    `Tên gọi chuyên môn (dùng đúng trong tên bước): ${k.thuat_ngu.join('; ')}.`,
    `Giấy tờ / chứng từ (dùng cho dau_vao, dau_ra, bang_chung): ${k.giay_to.join(', ')}.`,
  ].join('\n');
}

// ── Kiểm chuẩn workflow đã dựng (máy kiểm, không nhờ AI) ─────────────────────────────────────

export interface CanhBaoChuan { muc: 'loi' | 'nen'; cau: string; nut_id?: string }
const bo = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
const co = (n: NutHien, re: RegExp) => re.test(bo(`${n.ten} ${n.mo_ta} ${n.cong_cu ?? ''}`));

export function kiemChuan(d: DoThiHien, lv: LinhVuc): CanhBaoChuan[] {
  const ra: CanhBaoChuan[] = [];
  const nut = d.nut.filter((n) => n.loai !== 'kich_hoat');
  const chi = nut.filter((n) => n.tac_dong === 'chuyen_tien');
  if (chi.length) {
    if (!nut.some((n) => co(n, /nguoi nhan|tai khoan nhan|xac minh/))) ra.push({ muc: 'loi', cau: 'Có bước chuyển tiền nhưng chưa có bước kiểm / xác minh người nhận (chống giả mạo đổi tài khoản).' });
    if (!nut.some((n) => co(n, /doi soat|doi chieu|sao ke/))) ra.push({ muc: 'nen', cau: 'Nên có bước đối soát sao kê sau khi chi.' });
    for (const c of chi) {
      const vt = (c.vai_tro ?? '').trim();
      const duyetTruoc = d.canh.filter((e) => e.den === c.id).map((e) => d.nut.find((x) => x.id === e.tu)).find((x) => x?.loai === 'duyet');
      if (vt && duyetTruoc?.vai_tro && bo(vt) === bo(duyetTruoc.vai_tro)) ra.push({ muc: 'loi', nut_id: c.id, cau: `Phân tách nhiệm vụ: "${duyetTruoc.vai_tro}" vừa duyệt vừa chuyển tiền.` });
    }
  }
  if (lv === 'tai_chinh' && nut.some((n) => co(n, /khoa so|khoa ky|nop/)) && !nut.some((n) => co(n, /doi soat|doi chieu|sao ke/))) {
    ra.push({ muc: 'nen', cau: 'Nên đối chiếu sổ với sao kê trước khi khoá kỳ / nộp.' });
  }
  if (lv === 'bao_mat' && /su co|tan cong|ro ri/.test(bo(nut.map((n) => n.ten).join(' '))) && !nut.some((n) => co(n, /rut kinh nghiem|bai hoc/))) {
    ra.push({ muc: 'nen', cau: 'NIST SP 800-61: thiếu pha rút kinh nghiệm sau sự cố.' });
  }
  for (const n of nut) {
    if ((n.loai === 'nguoi' || n.loai === 'duyet') && !(n.vai_tro ?? '').trim()) ra.push({ muc: 'nen', nut_id: n.id, cau: `"${n.ten}": chưa ghi vai trò phụ trách.` });
    if (n.tac_dong === 'ghi' && !(n.bang_chung ?? '').trim()) ra.push({ muc: 'nen', nut_id: n.id, cau: `"${n.ten}": bước ghi dữ liệu nên ghi rõ bằng chứng lưu lại.` });
  }
  return ra.slice(0, 12);
}
