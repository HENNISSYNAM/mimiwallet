/**
 * TCCN-12 + giấy tờ hành chính — danh mục các loại giấy tờ MIMI soạn nháp.
 *
 * Dùng chung cho MIMI Assistant (edge function) và trang Soạn giấy tờ (trình duyệt), để lời
 * giới thiệu và lời lưu ý về một loại giấy tờ chỉ viết ở một chỗ.
 *
 * KHÔNG TRÍCH ĐIỀU LUẬT. Kho văn bản MIMI đã đối chiếu nguyên văn (xem `luat/he-luat.ts`) chưa
 * có văn bản nào về huỷ tờ khai, giải trình với cơ quan thuế hay tra soát giao dịch ngân hàng.
 * Trích một điều khoản chưa đối chiếu là đúng loại sai mà MIMI-P0-003 được lập ra để chặn. Bản
 * nháp chỉ nêu sự việc và đề nghị; căn cứ pháp lý (nếu cần) do người dùng hoặc kế toán điền.
 *
 * MIMI SOẠN, NGƯỜI DÙNG KÝ VÀ GỬI. MIMI không gửi giấy tờ thay ai.
 */

export const LOAI_GIAY_TO = ['don_tra_soat', 'cong_van_giai_trinh', 'cong_van_huy_to_khai'] as const;
export type LoaiGiayTo = (typeof LOAI_GIAY_TO)[number];

export interface MoTaGiayTo {
  ten: string;
  gui_toi: string;
  khi_nao: string;
  /** Điều người dùng phải biết trước khi gửi. */
  luu_y: string;
}

export const MO_TA_GIAY_TO: Record<LoaiGiayTo, MoTaGiayTo> = {
  don_tra_soat: {
    ten: 'Đơn đề nghị tra soát giao dịch',
    gui_toi: 'Ngân hàng nơi bạn mở tài khoản chuyển tiền',
    khi_nao: 'Chuyển nhầm số tài khoản, nhầm số tiền, chuyển trùng, hoặc nghi đã chuyển cho kẻ lừa đảo.',
    luu_y: 'Càng gửi sớm càng dễ lấy lại tiền: gọi tổng đài ngân hàng ngay, rồi nộp đơn này. Nếu nghi lừa đảo, trình báo cơ quan công an. Ngân hàng chỉ đề nghị được bên nhận hoàn trả — MIMI không bảo đảm lấy lại được tiền.',
  },
  cong_van_giai_trinh: {
    ten: 'Công văn giải trình',
    gui_toi: 'Cơ quan thuế đang quản lý bạn',
    khi_nao: 'Cơ quan thuế gửi thông báo đề nghị giải trình, bổ sung thông tin về tờ khai, doanh thu hoặc hoá đơn.',
    luu_y: 'Trả lời đúng từng nội dung trong thông báo và trong thời hạn thông báo ghi. Số liệu đưa vào phải khớp chứng từ bạn gửi kèm. MIMI không điền căn cứ pháp lý vì chưa đối chiếu văn bản hướng dẫn việc này.',
  },
  cong_van_huy_to_khai: {
    ten: 'Công văn đề nghị huỷ tờ khai',
    gui_toi: 'Cơ quan thuế đang quản lý bạn',
    khi_nao: 'Nộp nhầm mẫu tờ khai, nhầm kỳ tính thuế, nộp trùng, hoặc nộp tờ khai cho nghĩa vụ không phát sinh.',
    luu_y: 'Không phải tờ khai nào cũng huỷ được — sai số liệu thường phải nộp tờ khai bổ sung thay vì huỷ. Hỏi cơ quan thuế quản lý hoặc kế toán trước khi gửi; bản nháp đã có câu đề nghị cơ quan thuế hướng dẫn cách điều chỉnh nếu không huỷ được.',
  },
};

export const duongDanGiayTo = (loai: LoaiGiayTo, giaoDichId?: string) =>
  `/dashboard/giay-to?loai=${loai}${giaoDichId ? `&giao_dich=${encodeURIComponent(giaoDichId)}` : ''}`;
