/**
 * Chuỗi của trang Nhắc thuế và các nhắc thuế (02/10/2026, đồng bộ thông báo — `docs/DONG_BO_THONG_BAO_NHAC_THUE.md`).
 * Cùng bộ khoá với `tb.en.ts`, `tb.ko.ts`, `tb.zh.ts` (test `dongBoNgonNgu.test.ts` bắt thiếu khoá).
 * Tên văn bản pháp luật giữ nguyên tiếng Việt ở mọi ngôn ngữ: đó là nguyên văn để đối chiếu.
 */
const m = {
  tb: {
    trang: {
      tieuDe: 'Nhắc thuế',
      moTa: 'Các mốc nghĩa vụ thuế sắp tới, tính theo lịch kê khai và doanh thu thật của công ty.',
    },
    lich: {
      dangTinh: 'Đang tính lịch thuế của bạn…',
      loi: 'Chưa đọc được lịch thuế. Thử lại sau ít phút.',
      khongCoHan: 'Chưa có việc thuế nào có hạn MIMI biết chắc. Xem các mục cần xác minh bên dưới.',
      han: 'Hạn {{ngay}}',
      tieuDe: 'Lịch kê khai',
      chuaXacDinhHan: 'Chưa xác định hạn',
      moToKhai: 'Mở Tờ khai thuế',
      nopCong: 'Nộp trên Cổng dịch vụ công',
      kiemChungTu: 'Kiểm chứng từ',
      ghiChu: 'Nếu hạn rơi vào ngày nghỉ, luật cho lùi — ngày trên đây là mốc sớm nhất. MIMI soạn bản nháp; bạn xác nhận trước khi nộp.',
    },
    canXem: {
      tieuDe: 'MIMI cần bạn xem một khoản trước khi nói về nghĩa vụ thuế',
      moTa: 'Khoản chưa rõ này có thể làm đổi việc bạn phải khai và khai từ khi nào, nên MIMI chưa kết luận. Bạn trả lời giúp MIMI một câu:',
      conLai: 'Sau câu này còn {{n}} điều chưa rõ — MIMI hỏi từng câu một, không hỏi dồn.',
      traLoi: 'Trả lời ngay',
      hanPhuThuoc: 'Các hạn bên dưới chưa tính phần phụ thuộc câu trả lời này.',
    },
    nguong: {
      tieuDe: 'Ngưỡng doanh thu năm {{nam}}',
      tieuDeChung: 'Ngưỡng doanh thu năm',
      dangDoc: 'Đang đọc doanh thu…',
      loi: 'Chưa đọc được doanh thu năm. Thử lại sau ít phút.',
      doanhThu: 'Doanh thu đến hôm nay:',
      uocTinh: '(ước tính theo tiền về ngân hàng)',
      chuaLienKet: 'Chưa liên kết ngân hàng — con số này chưa đủ để dựa vào.',
      daVuot: 'Đã vượt {{tien}}',
      con: 'Còn {{tien}}',
      chuaChac: 'Chưa chắc — cần bạn xem một khoản',
      nguon: 'Nguồn: {{nguon}}.',
      moc1: {
        ten: 'Mốc 1 tỷ đồng/năm',
        y: 'Doanh thu đến 1 tỷ không phải nộp thuế GTGT và thuế TNCN. Vượt mốc thì phải nộp, và dùng hoá đơn điện tử có mã của cơ quan thuế.',
        nguon: 'Nghị định 68/2026/NĐ-CP, sửa đổi bởi Nghị định 141/2026/NĐ-CP',
      },
      moc3: {
        ten: 'Mốc 3 tỷ đồng/năm',
        y: 'Vượt mốc chỉ còn cách tính thuế trên thu nhập (doanh thu trừ chi phí), thuế suất 17% — khoản chi thiếu chứng từ bắt đầu tốn tiền.',
        nguon: 'Luật Thuế thu nhập cá nhân số 109/2025/QH15',
      },
    },
    giayTo: { tieuDe: 'Giấy tờ có thể cần' },
    cuoi: 'MIMI nhắc trong ứng dụng và đẩy thông báo lên máy khi bạn bật. Chưa gửi nhắc qua email hay Zalo.',
  },
};

export default m;
