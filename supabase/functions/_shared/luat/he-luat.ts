/**
 * Hệ luật thuế của MIMI — từ dữ liệu thật của người dùng suy ra nghĩa vụ thuế, theo đúng chuỗi
 * nhân quả mà các văn bản pháp luật đặt ra (16/09/2026).
 *
 * VÌ SAO LÀ MỘT HỆ SUY LUẬN, KHÔNG PHẢI MỘT CÂU HỎI CHO MÔ HÌNH. Các quy định thuế nối vào nhau:
 * doanh thu năm quyết định có chịu thuế GTGT không, có nộp thuế TNCN không; hai điều đó quyết
 * định dùng mẫu nào; mẫu quyết định hạn nộp. Một mô hình ngôn ngữ nhớ ngưỡng cũ (100 triệu,
 * 500 triệu) và nối sai các mắt xích. Ở đây mỗi kết luận:
 *   - chỉ sinh ra khi tiền đề (`vi`) đã có — đó là cạnh nhân quả, giao diện vẽ lại được;
 *   - mang căn cứ (`can_cu`) là câu trích NGUYÊN VĂN trong kho Công báo MIMI đã cào
 *     (`doan_phap_luat`). Edge function đối chiếu từng câu trích với kho mỗi lần chạy
 *     (`doc-can-cu.ts`); câu nào không còn khớp thì màn hình nói "chưa đối chiếu được".
 *
 * VÍ DỤ CHUỖI. "Khai thuế GTGT bằng 0 thì được miễn thuế TNCN" là cách hiểu sai thứ tự: không
 * chịu GTGT và không nộp TNCN là HAI hệ quả song song của CÙNG một điều kiện — doanh thu năm
 * từ 01 tỷ đồng trở xuống (NĐ 68/2026 Điều 3, Điều 4, mức sửa bởi NĐ 141/2026). Doanh thu vượt
 * 01 tỷ thì cả hai cùng phát sinh, dù ai đó ghi số thuế GTGT bằng 0.
 *
 * PHẠM VI. Chế độ thuế hộ kinh doanh, cá nhân kinh doanh từ 01/01/2026 (NĐ 68/2026, NĐ 141/2026,
 * TT 18/2026, TT 50/2026) và vài nghĩa vụ của doanh nghiệp nhỏ (miễn TNDN, GTGT trực tiếp).
 * Không có quy tắc nào không có căn cứ trong kho. Điều chưa có căn cứ thì nói chưa hỗ trợ.
 *
 * File không import gì: trình duyệt (`src/lib/heLuat.ts`) và Deno cùng đọc.
 */

// ── Văn bản và căn cứ ───────────────────────────────────────────────────────────

export const VAN_BAN: Record<string, { ten: string; ngay_ban_hanh: string }> = {
  '68/2026/NĐ-CP': { ten: 'Nghị định 68/2026/NĐ-CP về chính sách thuế và quản lý thuế đối với hộ kinh doanh, cá nhân kinh doanh', ngay_ban_hanh: '2026-03-05' },
  '141/2026/NĐ-CP': { ten: 'Nghị định 141/2026/NĐ-CP sửa đổi Nghị định 68/2026/NĐ-CP và Nghị định 320/2025/NĐ-CP', ngay_ban_hanh: '2026-04-29' },
  '09/2026/QH16': { ten: 'Luật số 09/2026/QH16 sửa đổi Luật Thuế TNCN, Luật Thuế GTGT, Luật Thuế TNDN, Luật Thuế TTĐB', ngay_ban_hanh: '2026-04-24' },
  '109/2025/QH15': { ten: 'Luật Thuế thu nhập cá nhân số 109/2025/QH15', ngay_ban_hanh: '2025-12-10' },
  '48/2024/QH15': { ten: 'Luật Thuế giá trị gia tăng số 48/2024/QH15', ngay_ban_hanh: '2024-11-26' },
  '18/2026/TT-BTC': { ten: 'Thông tư 18/2026/TT-BTC về hồ sơ, thủ tục quản lý thuế đối với hộ kinh doanh, cá nhân kinh doanh', ngay_ban_hanh: '2026-03-05' },
  '50/2026/TT-BTC': { ten: 'Thông tư 50/2026/TT-BTC sửa đổi Thông tư 18/2026/TT-BTC, thay mẫu 01/TKN-CNKD và 01/CNKD', ngay_ban_hanh: '2026-05-13' },
  '69/2025/TT-BTC': { ten: 'Thông tư 69/2025/TT-BTC hướng dẫn Luật Thuế GTGT và Nghị định 181/2025/NĐ-CP', ngay_ban_hanh: '2025-07-01' },
};

export interface CanCu {
  van_ban: string;
  /** Nhãn Điều trong kho (`doan_phap_luat.nhan`, bỏ "(tiếp)") — dùng để tìm đoạn đối chiếu. */
  dieu: string;
  /** Vị trí đọc cho người: "Điều 3 khoản 1", "Mẫu 01/TKN-CNKD, Ghi chú". */
  vi_tri: string;
  /** Câu trích nguyên văn. So sau khi gộp khoảng trắng. */
  trich: string;
  /** Giải thích một câu, bằng lời thường. */
  y: string;
}

const SUA_1_TY = 'Mức "500 triệu đồng" trong câu trích đã được Nghị định 141/2026/NĐ-CP sửa thành "01 tỷ đồng", áp dụng từ 01/01/2026.';

export const CAN_CU: Record<string, CanCu> = {
  nd141_d1_k1: { van_ban: '141/2026/NĐ-CP', dieu: 'Điều 1', vi_tri: 'Điều 1 khoản 1', trich: 'Sửa đổi cụm từ “500 triệu đồng” thành “01 tỷ đồng” tại Điều 3, Điều 4, khoản 1 Điều 8, Điều 9, Điều 10', y: 'Ngưỡng doanh thu của hộ kinh doanh nâng từ 500 triệu lên 01 tỷ đồng/năm.' },
  nd141_d1_k2a: { van_ban: '141/2026/NĐ-CP', dieu: 'Điều 1', vi_tri: 'Điều 1 khoản 2 (khoản 5 Điều 8 NĐ 68/2026), điểm a', trich: 'Hộ kinh doanh, cá nhân kinh doanh có doanh thu năm trên 01 tỷ đồng thì phải áp dụng hóa đơn điện tử có mã của cơ quan thuế', y: 'Doanh thu năm trên 01 tỷ phải dùng hoá đơn điện tử có mã của cơ quan thuế.' },
  nd141_d1_k2c: { van_ban: '141/2026/NĐ-CP', dieu: 'Điều 1', vi_tri: 'Điều 1 khoản 2 (khoản 5 Điều 8 NĐ 68/2026), điểm c', trich: 'đăng ký sử dụng hóa đơn điện tử trong thời gian 30 ngày kể từ ngày cuối cùng của kỳ tính thuế có doanh thu lũy kế trên 01 tỷ đồng.', y: 'Đăng ký hoá đơn điện tử trong 30 ngày sau kỳ doanh thu lũy kế vượt 01 tỷ.' },
  nd141_d2_k15: { van_ban: '141/2026/NĐ-CP', dieu: 'Điều 2', vi_tri: 'Điều 2 (khoản 15 Điều 4 NĐ 320/2025)', trich: 'Thu nhập của doanh nghiệp, tổ chức được thành lập theo quy định của pháp luật Việt Nam có tổng doanh thu năm từ 01 tỷ đồng trở xuống', y: 'Doanh nghiệp có tổng doanh thu năm từ 01 tỷ trở xuống được miễn thuế TNDN.' },
  nd141_d2_a: { van_ban: '141/2026/NĐ-CP', dieu: 'Điều 2', vi_tri: 'Điều 2, điểm a', trich: 'tờ khai quyết toán thuế thu nhập doanh nghiệp của kỳ tính thuế năm trước liền kề', y: 'Doanh thu để xét miễn là số trên quyết toán TNDN của năm trước liền kề.' },
  nd141_d2_c: { van_ban: '141/2026/NĐ-CP', dieu: 'Điều 2', vi_tri: 'Điều 2, điểm c', trich: 'dự kiến tổng doanh thu trong kỳ tính thuế không quá 01 tỷ đồng thì doanh nghiệp không phải tạm nộp thuế thu nhập doanh nghiệp.', y: 'Doanh nghiệp mới thành lập dự kiến doanh thu không quá 01 tỷ thì không tạm nộp TNDN.' },
  nd141_d2_d: { van_ban: '141/2026/NĐ-CP', dieu: 'Điều 2', vi_tri: 'Điều 2, điểm d', trich: 'Quy định miễn thuế tại khoản này không áp dụng đối với doanh nghiệp được thành lập theo quy định của pháp luật Việt Nam là công ty con hoặc công ty có quan hệ liên kết', y: 'Công ty con, công ty liên kết với doanh nghiệp không đủ điều kiện thì không được miễn.' },
  nd141_d3: { van_ban: '141/2026/NĐ-CP', dieu: 'Điều 3', vi_tri: 'Điều 3', trich: 'Nghị định này có hiệu lực thi hành từ ngày 01 tháng 01 năm 2026.', y: 'Ngưỡng 01 tỷ áp dụng từ 01/01/2026.' },
  nd141_d4_k1: { van_ban: '141/2026/NĐ-CP', dieu: 'Điều 4', vi_tri: 'Điều 4 khoản 1', trich: 'mà đã kê khai nộp thuế thu nhập cá nhân, thuế giá trị gia tăng theo quy định tại Nghị định số 68/2026/NĐ-CP thì được xử lý tiền thuế đã nộp theo quy định tại Điều 12 Nghị định số 68/2026/NĐ-CP.', y: 'Hộ doanh thu từ 01 tỷ trở xuống mà đã nộp GTGT, TNCN thì tiền đó được xử lý như nộp thừa.' },

  luat09_d1: { van_ban: '09/2026/QH16', dieu: 'Điều 1', vi_tri: 'Điều 1 (khoản 1 Điều 7 Luật Thuế TNCN)', trich: 'Cá nhân cư trú có hoạt động sản xuất, kinh doanh có doanh thu năm từ mức quy định của Chính phủ trở xuống không phải nộp thuế thu nhập cá nhân.', y: 'Luật giao Chính phủ quy định mức doanh thu không phải nộp TNCN.' },
  luat09_d2: { van_ban: '09/2026/QH16', dieu: 'Điều 2', vi_tri: 'Điều 2 (khoản 25 Điều 5 Luật Thuế GTGT)', trich: 'Hàng hóa, dịch vụ của hộ, cá nhân sản xuất, kinh doanh có doanh thu năm từ mức quy định của Chính phủ trở xuống', y: 'Luật giao Chính phủ quy định mức doanh thu không chịu GTGT.' },
  luat09_d3: { van_ban: '09/2026/QH16', dieu: 'Điều 3', vi_tri: 'Điều 3 (khoản 14a Điều 4 Luật Thuế TNDN)', trich: 'có tổng doanh thu năm từ mức quy định của Chính phủ trở xuống được miễn thuế thu nhập doanh nghiệp.', y: 'Luật giao Chính phủ quy định mức doanh thu doanh nghiệp được miễn TNDN.' },

  nd68_d3_k1: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 3', vi_tri: 'Điều 3 khoản 1', trich: 'Hộ kinh doanh, cá nhân kinh doanh có hoạt động sản xuất, kinh doanh có mức doanh thu năm từ 500 triệu đồng trở xuống thuộc đối tượng không chịu thuế giá trị gia tăng.', y: `Doanh thu năm dưới ngưỡng thì không chịu GTGT. ${SUA_1_TY}` },
  nd68_d3_k2: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 3', vi_tri: 'Điều 3 khoản 2', trich: 'có mức doanh thu năm trên 500 triệu đồng thuộc đối tượng chịu thuế giá trị gia tăng và áp dụng phương pháp tính trực tiếp theo doanh thu bằng tỷ lệ % nhân (x) doanh thu', y: `Trên ngưỡng thì chịu GTGT, tính bằng tỷ lệ % nhân doanh thu. ${SUA_1_TY}` },
  nd68_d4_k1: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 4', vi_tri: 'Điều 4 khoản 1', trich: 'có mức doanh thu năm từ 500 triệu đồng trở xuống không phải nộp thuế thu nhập cá nhân.', y: `Doanh thu năm dưới ngưỡng thì không nộp TNCN. ${SUA_1_TY}` },
  nd68_d4_k3: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 4', vi_tri: 'Điều 4 khoản 3', trich: 'cá nhân được áp dụng mức trừ 500 triệu đồng trước khi tính thuế thu nhập cá nhân đối với một hoặc một số ngành, nghề kinh doanh hoặc địa điểm kinh doanh do cá nhân lựa chọn theo phương án có lợi nhất', y: `Được trừ một mức doanh thu mỗi năm trước khi tính TNCN theo tỷ lệ. ${SUA_1_TY}` },
  nd68_d4_k5a: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 4', vi_tri: 'Điều 4 khoản 5 điểm a', trich: 'Phương pháp tính thuế thu nhập cá nhân theo thuế suất nhân (x) doanh thu tính thuế áp dụng đối với cá nhân kinh doanh có doanh thu năm trên 500 triệu đồng đến 03 tỷ đồng.', y: `Từ trên ngưỡng đến 03 tỷ: được tính TNCN theo thuế suất nhân doanh thu tính thuế. ${SUA_1_TY}` },
  nd68_d4_k5b: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 4', vi_tri: 'Điều 4 khoản 5 điểm b', trich: 'Phương pháp tính thuế thu nhập cá nhân theo thu nhập tính thuế nhân (x) thuế suất áp dụng đối với cá nhân kinh doanh có doanh thu năm trên 03 tỷ đồng', y: 'Trên 03 tỷ: tính TNCN trên thu nhập (doanh thu trừ chi phí).' },
  nd68_d4_k5d: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 4', vi_tri: 'Điều 4 khoản 5 điểm d', trich: 'thì thực hiện ổn định phương pháp tính thuế trong 02 năm liên tục kể từ năm đầu tiên áp dụng.', y: 'Chọn tính trên thu nhập thì giữ nguyên 2 năm liên tục.' },
  nd68_d4_k5d2: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 4', vi_tri: 'Điều 4 khoản 5 điểm d', trich: 'nếu hết năm xác định doanh thu thực tế năm trên 03 tỷ đồng thì từ năm tiếp theo phải chuyển sang áp dụng phương pháp tính thuế thu nhập cá nhân theo thu nhập tính thuế nhân (x) thuế suất.', y: 'Đang tính theo doanh thu mà cả năm vượt 03 tỷ thì năm sau phải chuyển sang tính trên thu nhập.' },
  nd68_d5_k1: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 5', vi_tri: 'Điều 5 khoản 1', trich: 'Doanh thu là toàn bộ tiền bán hàng, tiền gia công, tiền cung ứng dịch vụ kể cả trợ giá, phụ thu, phụ trội mà hộ kinh doanh, cá nhân kinh doanh được hưởng, không phân biệt đã thu được tiền hay chưa thu được tiền', y: 'Doanh thu là toàn bộ tiền bán hàng, có hoá đơn hay không, đã thu tiền hay chưa.' },
  nd68_d6_k1: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 6', vi_tri: 'Điều 6 khoản 1', trich: 'có đủ hóa đơn, chứng từ theo quy định của pháp luật về hóa đơn, chứng từ, pháp luật về kế toán và chứng từ thanh toán không dùng tiền mặt đối với các khoản thanh toán từng lần có giá trị từ 05 triệu đồng trở lên', y: 'Chi phí được trừ phải có hoá đơn, chứng từ; khoản từ 5 triệu phải trả không dùng tiền mặt.' },
  nd68_d8_k1a: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 8', vi_tri: 'Điều 8 khoản 1 điểm a', trich: 'thông báo doanh thu thực tế phát sinh trong năm với cơ quan thuế chậm nhất là ngày 31 tháng 01 của năm dương lịch tiếp theo.', y: `Dưới ngưỡng thì thông báo doanh thu năm, hạn 31/01 năm sau. ${SUA_1_TY}` },
  nd68_d8_k1a_vuot: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 8', vi_tri: 'Điều 8 khoản 1 điểm a', trich: 'Trường hợp hộ kinh doanh, cá nhân kinh doanh phát sinh doanh thu thực tế trên 500 triệu đồng trong năm thì thực hiện khai thuế, nộp thuế kể từ quý phát sinh doanh thu trên 500 triệu đồng.', y: `Vượt ngưỡng trong năm thì khai, nộp thuế từ quý vượt. ${SUA_1_TY}` },
  nd68_d8_k1b_ho_tro: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 8', vi_tri: 'Điều 8 khoản 1 điểm b', trich: 'Việc hỗ trợ của cơ quan thuế không thay thế trách nhiệm khai thuế và xác định số thuế phải nộp của hộ kinh doanh, cá nhân kinh doanh.', y: 'Tờ khai được soạn sẵn không thay trách nhiệm khai thuế của người nộp thuế.' },
  nd68_d8_k3a: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 8', vi_tri: 'Điều 8 khoản 3 điểm a', trich: 'Trường hợp khai thuế theo quý thì thời hạn nộp hồ sơ khai thuế chậm nhất là ngày cuối cùng của tháng đầu tiên của quý tiếp theo;', y: 'Khai theo quý: hạn là ngày cuối tháng đầu của quý sau.' },
  nd68_d8_k3c: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 8', vi_tri: 'Điều 8 khoản 3 điểm c', trich: 'Trường hợp khai quyết toán thuế thu nhập cá nhân theo năm thì thời hạn nộp hồ sơ khai thuế chậm nhất là ngày 31 tháng 3 của năm dương lịch tiếp theo;', y: 'Quyết toán TNCN năm: hạn 31/3 năm sau.' },
  nd68_d8_k3e: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 8', vi_tri: 'Điều 8 khoản 3 điểm e', trich: 'Thời hạn nộp thuế chậm nhất là ngày cuối cùng của thời hạn nộp hồ sơ khai thuế.', y: 'Hạn nộp tiền thuế trùng hạn nộp tờ khai.' },
  nd68_d8_k4a: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 8', vi_tri: 'Điều 8 khoản 4 điểm a', trich: 'Hộ kinh doanh, cá nhân kinh doanh nộp hồ sơ khai thuế bằng phương thức điện tử.', y: 'Hồ sơ khai thuế nộp điện tử.' },
  nd68_d9_k1: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 9', vi_tri: 'Điều 9 khoản 1', trich: 'Hộ kinh doanh, cá nhân kinh doanh bắt đầu hoạt động sản xuất, kinh doanh trong 06 tháng đầu năm nếu có doanh thu thực tế từ 500 triệu đồng trở xuống thì thực hiện thông báo doanh thu thực tế phát sinh kể từ khi bắt đầu hoạt động sản xuất, kinh doanh đến hết ngày 30 tháng 6 với cơ quan thuế quản lý trực tiếp chậm nhất là ngày 31 tháng 7', y: `Mới kinh doanh trong 6 tháng đầu năm: thông báo doanh thu tới 30/6, hạn 31/7. ${SUA_1_TY}` },
  nd68_d10_k1a: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 10', vi_tri: 'Điều 10 khoản 1 điểm a', trich: 'Trường hợp có doanh thu năm từ 50 tỷ đồng trở xuống thực hiện khai thuế, nộp thuế giá trị gia tăng theo quý;', y: 'Doanh thu năm đến 50 tỷ: khai GTGT theo quý.' },
  nd68_d10_k1b: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 10', vi_tri: 'Điều 10 khoản 1 điểm b', trich: 'Trường hợp có doanh thu năm trên 50 tỷ đồng thực hiện khai thuế, nộp thuế giá trị gia tăng theo tháng.', y: 'Doanh thu năm trên 50 tỷ: khai GTGT theo tháng.' },
  nd68_d10_k2b: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 10', vi_tri: 'Điều 10 khoản 2 điểm b', trich: 'Số thuế thu nhập cá nhân tạm nộp bằng thuế suất nhân (x) doanh thu tính thuế của tháng, quý và khai quyết toán thuế thu nhập cá nhân theo năm.', y: 'Tính trên thu nhập: mỗi quý tạm nộp theo tỷ lệ trên doanh thu, cuối năm quyết toán.' },
  nd68_d11_k1: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 11', vi_tri: 'Điều 11 khoản 1', trich: 'có trách nhiệm thực hiện khấu trừ, khai thay và nộp thay số thuế đã khấu trừ đối với mỗi giao dịch cung cấp hàng hóa, dịch vụ của hộ kinh doanh, cá nhân kinh doanh', y: 'Sàn thương mại điện tử có chức năng thanh toán khấu trừ, khai và nộp thuế thay người bán.' },
  nd68_d13_k4: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 13', vi_tri: 'Điều 13 khoản 4', trich: 'thực hiện thông báo cho cơ quan thuế theo phương thức điện tử tất cả các số tài khoản mở tại tổ chức cung ứng dịch vụ thanh toán', y: 'Phải báo cơ quan thuế mọi tài khoản ngân hàng, ví điện tử dùng cho kinh doanh.' },

  tt18_d4_k1a: { van_ban: '18/2026/TT-BTC', dieu: 'Điều 4', vi_tri: 'Điều 4 khoản 1 điểm a', trich: 'thông báo doanh thu thực tế phát sinh trong năm và kê khai các loại thuế khác theo Mẫu số 01/TKN-CNKD ban hành kèm theo Thông tư này.', y: 'Hộ không chịu GTGT, không nộp TNCN dùng mẫu 01/TKN-CNKD.' },
  tt18_d4_k1b: { van_ban: '18/2026/TT-BTC', dieu: 'Điều 4', vi_tri: 'Điều 4 khoản 1 điểm b', trich: 'hồ sơ khai thuế giá trị gia tăng, thuế thu nhập cá nhân và các loại thuế khác là Tờ khai theo Mẫu số 01/CNKD ban hành kèm theo Thông tư này.', y: 'Hộ nộp GTGT, TNCN khai trên mẫu 01/CNKD.' },
  tt18_d4_k1c: { van_ban: '18/2026/TT-BTC', dieu: 'Điều 4', vi_tri: 'Điều 4 khoản 1 điểm c', trich: 'Hồ sơ khai quyết toán thuế thu nhập cá nhân là Tờ khai quyết toán thuế thu nhập cá nhân theo Mẫu số 02/CNKD-TNCN-QTT ban hành kèm theo Thông tư này.', y: 'Quyết toán TNCN dùng mẫu 02/CNKD-TNCN-QTT.' },
  tt18_d4_k1d: { van_ban: '18/2026/TT-BTC', dieu: 'Điều 4', vi_tri: 'Điều 4 khoản 1 điểm d', trich: 'Hộ kinh doanh, cá nhân kinh doanh mới ra kinh doanh gửi Thông báo số tài khoản/số hiệu ví điện tử theo mẫu số 01/BK-STK ban hành kèm theo Thông tư này kèm theo Thông báo doanh thu hoặc Tờ khai thuế đầu tiên của năm.', y: 'Thông báo số tài khoản dùng mẫu 01/BK-STK.' },
  tt18_d4_k3: { van_ban: '18/2026/TT-BTC', dieu: 'Điều 4', vi_tri: 'Điều 4 khoản 3', trich: 'Đối với cá nhân trực tiếp ký hợp đồng làm đại lý xổ số, đại lý bảo hiểm, đại lý bán hàng đa cấp, hoạt động kinh doanh khác chưa khấu trừ, nộp thuế trong năm là Tờ khai thuế năm theo Mẫu số 01/TKN-CNKD ban hành kèm theo Thông tư này.', y: 'Đại lý xổ số, bảo hiểm, bán hàng đa cấp: phần chưa bị khấu trừ thì khai theo năm trên mẫu 01/TKN-CNKD.' },
  tt18_d4_k4: { van_ban: '18/2026/TT-BTC', dieu: 'Điều 4', vi_tri: 'Điều 4 khoản 4', trich: 'Đối với cá nhân cho thuê bất động sản trực tiếp khai thuế với cơ quan thuế là Tờ khai thuế đối với hoạt động cho thuê bất động sản theo Mẫu số 01/BĐS và Phụ lục Bảng kê chi tiết bất động sản theo Mẫu số 01/BK-BĐS ban hành kèm theo Thông tư này.', y: 'Cho thuê bất động sản khai trên mẫu 01/BĐS kèm phụ lục 01/BK-BĐS.' },
  nd68_d8_k3d: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 8', vi_tri: 'Điều 8 khoản 3 điểm d', trich: 'Trường hợp cá nhân trực tiếp khai thuế đối với hoạt động cho thuê bất động sản thì cá nhân được lựa chọn khai thuế hai lần trong năm tính thuế hoặc khai thuế một lần theo năm tính thuế.', y: 'Cho thuê bất động sản: được chọn khai hai lần trong năm hoặc một lần theo năm.' },
  luat109_d7_k4: { van_ban: '109/2025/QH15', dieu: 'Điều 7', vi_tri: 'Điều 7 khoản 4', trich: 'Cá nhân cho thuê bất động sản, trừ hoạt động kinh doanh lưu trú, nộp thuế thu nhập cá nhân được xác định bằng phần doanh thu vượt trên mức quy định tại khoản 1 Điều này nhân (x) với thuế suất 5%.', y: 'Cho thuê bất động sản: TNCN 5% trên phần doanh thu vượt ngưỡng.' },
  nd68_d7: { van_ban: '68/2026/NĐ-CP', dieu: 'Điều 7', vi_tri: 'Điều 7', trich: 'Trường hợp hộ kinh doanh, cá nhân kinh doanh có hoạt động sản xuất, kinh doanh hàng hóa, dịch vụ thuộc đối tượng chịu thuế tiêu thụ đặc biệt, thuế tài nguyên, thuế bảo vệ môi trường theo quy định của pháp luật thuế thì việc xác định nghĩa vụ thuế được thực hiện theo quy định của pháp luật về từng loại thuế tương ứng.', y: 'Hàng chịu thuế tiêu thụ đặc biệt, tài nguyên, bảo vệ môi trường thì theo luật của từng loại thuế đó.' },
  tt18_d5_k1: { van_ban: '18/2026/TT-BTC', dieu: 'Điều 5', vi_tri: 'Điều 5 khoản 1', trich: 'Hồ sơ đề nghị hoàn thuế nộp thừa đối với hộ kinh doanh, cá nhân kinh doanh nộp thuế thu nhập cá nhân theo phương pháp thuế suất nhân (x) với doanh thu tính thuế là Tờ khai thuế theo Mẫu số 01/TKN-CNKD ban hành kèm theo Thông tư này.', y: 'Đề nghị hoàn thuế nộp thừa khai trên mẫu 01/TKN-CNKD.' },
  tt50_d3: { van_ban: '50/2026/TT-BTC', dieu: 'Điều 3', vi_tri: 'Điều 3', trich: 'Thay thế Mẫu số 01/TKN-CNKD, Mẫu số 01/CNKD, Mẫu số 01/BĐS, Mẫu số 02/BK-KTBĐS theo danh mục mẫu biểu ban hành kèm theo Thông tư số 18/2026/TT-BTC', y: 'Mẫu 01/TKN-CNKD và 01/CNKD đang dùng là bản kèm Thông tư 50/2026.' },
  tt50_d4_k2: { van_ban: '50/2026/TT-BTC', dieu: 'Điều 4', vi_tri: 'Điều 4 khoản 2', trich: 'thì gửi Thông báo số tài khoản/số hiệu ví điện tử theo Mẫu số 01/BK-STK ban hành kèm theo Thông tư số 18/2026/TT-BTC chậm nhất là ngày 31 tháng 7 năm 2026.', y: 'Hộ doanh thu từ 01 tỷ trở xuống chưa gửi thông báo số tài khoản thì hạn là 31/07/2026.' },
  tt50_mau_tkn: { van_ban: '50/2026/TT-BTC', dieu: 'Điều 4', vi_tri: 'Mẫu số 01/TKN-CNKD, Ghi chú', trich: 'Đối với trường hợp hộ kinh doanh, cá nhân kinh doanh có doanh thu năm từ 01 tỷ đồng trở xuống thì chỉ thực hiện thông báo doanh thu; không thực hiện khai số thuế GTGT, thuế TNCN phải nộp.', y: 'Trên mẫu 01/TKN-CNKD, hộ dưới ngưỡng chỉ ghi doanh thu, không ghi số thuế.' },
  tt50_mau_cnkd: { van_ban: '50/2026/TT-BTC', dieu: 'Điều 4', vi_tri: 'Mẫu số 01/CNKD', trich: '(Áp dụng cho hộ kinh doanh, cá nhân kinh doanh có doanh thu năm trên 01 tỷ đồng)', y: 'Mẫu 01/CNKD dành cho hộ doanh thu năm trên 01 tỷ.' },

  luat109_d7_k2: { van_ban: '109/2025/QH15', dieu: 'Điều 7', vi_tri: 'Điều 7 khoản 2 điểm b', trich: 'Cá nhân kinh doanh có doanh thu năm trên mức quy định tại khoản 1 Điều này đến 03 tỷ đồng: thuế suất 15%;', y: 'Tính trên thu nhập, doanh thu đến 03 tỷ: thuế suất 15%.' },
  luat109_d7_k3a: { van_ban: '109/2025/QH15', dieu: 'Điều 7', vi_tri: 'Điều 7 khoản 3 điểm a', trich: 'Doanh thu tính thuế được xác định bằng phần doanh thu vượt trên mức quy định tại khoản 1 Điều này;', y: 'Tính theo tỷ lệ: chỉ phần doanh thu vượt ngưỡng mới tính thuế.' },
  luat109_d7_k3b: { van_ban: '109/2025/QH15', dieu: 'Điều 7', vi_tri: 'Điều 7 khoản 3 điểm b', trich: 'Phân phối, cung cấp hàng hoá: thuế suất 0,5%;', y: 'TNCN phân phối hàng hoá: 0,5%.' },
  luat109_d7_k3c: { van_ban: '109/2025/QH15', dieu: 'Điều 7', vi_tri: 'Điều 7 khoản 3 điểm c', trich: 'Dịch vụ, xây dựng không bao thầu nguyên vật liệu: thuế suất 2%. Riêng hoạt động cho thuê tài sản, đại lý bảo hiểm, đại lý xổ số, đại lý bán hàng đa cấp: thuế suất 5%;', y: 'TNCN dịch vụ: 2%; cho thuê tài sản, đại lý: 5%.' },
  luat109_d7_k3d: { van_ban: '109/2025/QH15', dieu: 'Điều 7', vi_tri: 'Điều 7 khoản 3 điểm d', trich: 'Sản xuất, vận tải, dịch vụ có gắn với hàng hoá, xây dựng có bao thầu nguyên vật liệu: thuế suất 1,5%;', y: 'TNCN sản xuất, vận tải: 1,5%.' },
  luat109_d7_k3dd: { van_ban: '109/2025/QH15', dieu: 'Điều 7', vi_tri: 'Điều 7 khoản 3 điểm đ', trich: 'Hoạt động cung cấp sản phẩm và dịch vụ nội dung thông tin số về giải trí, trò chơi điện tử, phim số, ảnh số, nhạc số, quảng cáo số: thuế suất 5%;', y: 'TNCN nội dung số: 5%.' },
  luat109_d7_k3e: { van_ban: '109/2025/QH15', dieu: 'Điều 7', vi_tri: 'Điều 7 khoản 3 điểm e', trich: 'Hoạt động kinh doanh khác: thuế suất 1%.', y: 'TNCN hoạt động khác: 1%.' },

  luat48_d12_k2a1: { van_ban: '48/2024/QH15', dieu: 'Điều 12', vi_tri: 'Điều 12 khoản 2 điểm a1', trich: 'Doanh nghiệp, hợp tác xã, liên hiệp hợp tác xã có doanh thu hằng năm dưới mức ngưỡng doanh thu 01 tỷ đồng, trừ trường hợp tự nguyện áp dụng phương pháp khấu trừ thuế', y: 'Doanh nghiệp doanh thu dưới 01 tỷ nộp GTGT trực tiếp trên doanh thu, trừ khi tự nguyện khấu trừ.' },
  luat48_d12_k2b1: { van_ban: '48/2024/QH15', dieu: 'Điều 12', vi_tri: 'Điều 12 khoản 2 điểm b1', trich: 'b1) Phân phối, cung cấp hàng hóa: 1%;', y: 'GTGT phân phối hàng hoá: 1%.' },
  luat48_d12_k2b2: { van_ban: '48/2024/QH15', dieu: 'Điều 12', vi_tri: 'Điều 12 khoản 2 điểm b2', trich: 'b2) Dịch vụ, xây dựng không bao thầu nguyên vật liệu: 5%;', y: 'GTGT dịch vụ: 5%.' },
  luat48_d12_k2b3: { van_ban: '48/2024/QH15', dieu: 'Điều 12', vi_tri: 'Điều 12 khoản 2 điểm b3', trich: 'b3) Sản xuất, vận tải, dịch vụ có gắn với hàng hóa, xây dựng có bao thầu nguyên vật liệu: 3%;', y: 'GTGT sản xuất, vận tải: 3%.' },
  luat48_d12_k2b4: { van_ban: '48/2024/QH15', dieu: 'Điều 12', vi_tri: 'Điều 12 khoản 2 điểm b4', trich: 'b4) Hoạt động kinh doanh khác: 2%;', y: 'GTGT hoạt động khác: 2%.' },
  tt69_pl1_cho_thue: { van_ban: '69/2025/TT-BTC', dieu: 'Điều 10', vi_tri: 'Phụ lục I, nhóm dịch vụ (tỷ lệ 5%)', trich: 'o) Cho thuê tài sản gồm: - Cho thuê nhà, đất, cửa hàng, nhà xưởng, kho bãi trừ dịch vụ lưu trú.', y: 'Cho thuê tài sản thuộc nhóm dịch vụ, tỷ lệ GTGT 5%.' },
  tt69_d5_k2: { van_ban: '69/2025/TT-BTC', dieu: 'Điều 5', vi_tri: 'Điều 5 khoản 2', trich: 'phải áp dụng theo mức tỷ lệ % cao nhất của hàng hóa, dịch vụ mà cơ sở sản xuất, kinh doanh trên toàn bộ doanh thu tính thuế của kỳ tính thuế đó.', y: 'Nhiều ngành mà không tách doanh thu thì áp tỷ lệ GTGT cao nhất cho toàn bộ doanh thu.' },
};

// ── Sự kiện đầu vào ─────────────────────────────────────────────────────────────

export type LoaiNguoiNop = 'ho_kinh_doanh' | 'doanh_nghiep';
export type NhomNganh = 'phan_phoi_hang_hoa' | 'dich_vu' | 'cho_thue_tai_san' | 'san_xuat_van_tai' | 'noi_dung_so' | 'khac';
export type Kenh = 'dia_diem_co_dinh' | 'tmdt_khong_thanh_toan' | 'tmdt_co_thanh_toan';
export type PhuongPhapTncn = 'doanh_thu' | 'thu_nhap';
export type NguonDoanhThu = 'hoa_don_dien_tu' | 'ngan_hang' | 'tu_khai';

/**
 * Hoạt động có tờ khai RIÊNG, không dùng mẫu 01/CNKD hay 01/TKN-CNKD thường.
 *
 * Đây là câu hỏi MIMI hỏi ngay lúc bắt đầu, vì ngành quyết định mẫu tờ khai: người cho thuê
 * nhà khai 01/BĐS, người làm đại lý bảo hiểm khai theo năm sau khi bị khấu trừ, còn người bán
 * hàng chịu thuế tiêu thụ đặc biệt còn phải khai thêm loại thuế đó.
 */
export type NganhDacThu = 'khong' | 'cho_thue_bat_dong_san' | 'dai_ly_xo_so_bao_hiem_da_cap' | 'hang_thue_khac';

export const NGANH_DAC_THU: readonly NganhDacThu[] = ['khong', 'cho_thue_bat_dong_san', 'dai_ly_xo_so_bao_hiem_da_cap', 'hang_thue_khac'];

export const NHOM_NGANH: readonly NhomNganh[] = ['phan_phoi_hang_hoa', 'dich_vu', 'cho_thue_tai_san', 'san_xuat_van_tai', 'noi_dung_so', 'khac'];
export const KENH: readonly Kenh[] = ['dia_diem_co_dinh', 'tmdt_khong_thanh_toan', 'tmdt_co_thanh_toan'];

/** Tên nhóm ngành đúng chữ trên mẫu 01/TKN-CNKD và 01/CNKD. */
export const TEN_NHOM_NGANH: Record<NhomNganh, string> = {
  phan_phoi_hang_hoa: 'Phân phối, cung cấp hàng hóa',
  dich_vu: 'Dịch vụ, xây dựng không bao thầu nguyên vật liệu',
  cho_thue_tai_san: 'Hoạt động cho thuê tài sản trừ bất động sản',
  san_xuat_van_tai: 'Sản xuất, vận tải, dịch vụ có gắn với hàng hóa, xây dựng có bao thầu nguyên vật liệu',
  noi_dung_so: 'Hoạt động cung cấp sản phẩm nội dung thông tin số về giải trí, trò chơi điện tử, phim số, ảnh số, nhạc số, quảng cáo số',
  khac: 'Hoạt động kinh doanh khác',
};

export const TEN_KENH: Record<Kenh, string> = {
  dia_diem_co_dinh: 'Có địa điểm kinh doanh cố định',
  tmdt_khong_thanh_toan: 'Bán trên nền tảng số không có chức năng đặt hàng, thanh toán',
  tmdt_co_thanh_toan: 'Bán trên sàn có chức năng thanh toán (sàn khấu trừ thuế thay)',
};

export const TEN_NGANH_DAC_THU: Record<NganhDacThu, string> = {
  khong: 'Không có hoạt động đặc thù',
  cho_thue_bat_dong_san: 'Cho thuê bất động sản (nhà, đất, mặt bằng)',
  dai_ly_xo_so_bao_hiem_da_cap: 'Đại lý xổ số, bảo hiểm, bán hàng đa cấp',
  hang_thue_khac: 'Hàng chịu thuế tiêu thụ đặc biệt, tài nguyên hoặc bảo vệ môi trường',
};

export const TEN_NGUON_DOANH_THU: Record<NguonDoanhThu, string> = {
  hoa_don_dien_tu: 'theo hoá đơn điện tử đã xuất',
  ngan_hang: 'ước tính theo tiền về ngân hàng',
  tu_khai: 'theo số bạn tự nhập',
};

export interface SuKienThue {
  nam: number;
  /** YYYY-MM-DD, giờ Việt Nam. */
  homNay: string;
  loai: LoaiNguoiNop | null;
  /** Doanh thu từng quý của năm; null khi chưa có nguồn nào. */
  doanhThuQuy: [number, number, number, number] | null;
  nguonDoanhThu: NguonDoanhThu | null;
  nhomNganh: NhomNganh[];
  kenh: Kenh | null;
  phuongPhapTncn: PhuongPhapTncn | null;
  batDauKinhDoanh: string | null;
  daNopThueTrongNam: boolean | null;
  nganhDacThu: NganhDacThu | null;
  /** Doanh nghiệp: tổng doanh thu trên quyết toán TNDN năm trước. */
  doanhThuNamTruoc: number | null;
  coQuanHeLienKet: boolean | null;
}

// ── Ngưỡng và tỷ lệ (mỗi con số trỏ về căn cứ) ──────────────────────────────────

/**
 * MIMI-P0-003: phiên bản bộ quy tắc thuế. Đổi mỗi khi đổi ngưỡng, tỷ lệ, câu trích hay quy tắc
 * suy luận — bản nháp tờ khai lưu kèm phiên bản này, để sau đối chiếu được "hôm đó MIMI dùng luật nào".
 */
export const PHIEN_BAN_HE_LUAT = '2026-09-17.1';

export const NAM_AP_DUNG = 2026;
/** NĐ 68/2026 Điều 3, 4 — sửa bởi NĐ 141/2026 Điều 1 khoản 1. "Trở xuống": đúng bằng vẫn dưới ngưỡng. */
export const NGUONG_DOANH_THU = 1_000_000_000;
/** NĐ 68/2026 Điều 4 khoản 5. */
export const NGUONG_THU_NHAP = 3_000_000_000;
/** NĐ 68/2026 Điều 10 khoản 1. */
export const NGUONG_KHAI_THANG = 50_000_000_000;

export const TY_LE_GTGT: Record<NhomNganh, { ty_le: number | null; can_cu: string[] }> = {
  phan_phoi_hang_hoa: { ty_le: 0.01, can_cu: ['luat48_d12_k2b1'] },
  dich_vu: { ty_le: 0.05, can_cu: ['luat48_d12_k2b2'] },
  cho_thue_tai_san: { ty_le: 0.05, can_cu: ['luat48_d12_k2b2', 'tt69_pl1_cho_thue'] },
  san_xuat_van_tai: { ty_le: 0.03, can_cu: ['luat48_d12_k2b3'] },
  // Luật 48/2024 và Phụ lục I TT 69/2025 trong kho không nêu riêng nhóm này: không đoán.
  noi_dung_so: { ty_le: null, can_cu: [] },
  khac: { ty_le: 0.02, can_cu: ['luat48_d12_k2b4'] },
};

export const TY_LE_TNCN: Record<NhomNganh, { ty_le: number; can_cu: string[] }> = {
  phan_phoi_hang_hoa: { ty_le: 0.005, can_cu: ['luat109_d7_k3b'] },
  dich_vu: { ty_le: 0.02, can_cu: ['luat109_d7_k3c'] },
  cho_thue_tai_san: { ty_le: 0.05, can_cu: ['luat109_d7_k3c'] },
  san_xuat_van_tai: { ty_le: 0.015, can_cu: ['luat109_d7_k3d'] },
  noi_dung_so: { ty_le: 0.05, can_cu: ['luat109_d7_k3dd'] },
  khac: { ty_le: 0.01, can_cu: ['luat109_d7_k3e'] },
};

// ── Kết quả suy luận ────────────────────────────────────────────────────────────

export type LoaiKetLuan = 'su_kien' | 'mien' | 'nghia_vu' | 'phuong_phap' | 'quyen_loi' | 'canh_bao' | 'giai_thich' | 'chua_ho_tro';

export interface KetLuan {
  id: string;
  loai: LoaiKetLuan;
  cau: string;
  /** Kết luận làm tiền đề — cạnh nhân quả. Luôn trỏ về kết luận đứng trước. */
  vi: string[];
  can_cu: string[];
  /** Hạn phải làm, YYYY-MM-DD. */
  han?: string[];
  mau?: string;
}

export type TruongThieu =
  | 'loai' | 'doanh_thu' | 'nhom_nganh' | 'kenh' | 'phuong_phap_tncn' | 'doanh_thu_nam_truoc' | 'co_quan_he_lien_ket' | 'tach_doanh_thu_nganh';

export interface ThieuThongTin {
  truong: TruongThieu;
  cau: string;
}

export interface SuyLuan {
  ket_luan: KetLuan[];
  thieu: ThieuThongTin[];
  doanh_thu_nam: number | null;
  /** Năm chưa kết thúc: doanh thu là lũy kế tới hôm nay. */
  tam_tinh: boolean;
  /** Quý đầu tiên doanh thu lũy kế vượt 01 tỷ; null nếu chưa vượt. */
  quy_vuot: number | null;
  /** Phương pháp TNCN áp cho năm này, sau khi xét ngưỡng và lựa chọn của người dùng. */
  phuong_phap: PhuongPhapTncn | null;
}

// ── Ngày và tiền ────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');
const cuoiThang = (nam: number, thang: number) => `${nam}-${pad(thang)}-${pad(new Date(Date.UTC(nam, thang, 0)).getUTCDate())}`;

/** Ngày cuối quý. */
export const cuoiQuy = (quy: number, nam: number) => cuoiThang(nam, quy * 3);

/** Hạn nộp tờ khai quý: ngày cuối của tháng đầu quý sau (NĐ 68/2026 Điều 8 khoản 3 điểm a). */
export function hanNopQuy(quy: number, nam: number): string {
  return quy === 4 ? cuoiThang(nam + 1, 1) : cuoiThang(nam, quy * 3 + 1);
}

export function congNgayLich(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const tienVN = (n: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} đồng`;
export const ngayVN = (ymd: string) => ymd.slice(0, 10).split('-').reverse().join('/');
const phanTram = (x: number) => `${String(Math.round(x * 1000) / 10).replace('.', ',')}%`;

// ── Suy luận ────────────────────────────────────────────────────────────────────

export function suyLuan(sk: SuKienThue): SuyLuan {
  const ketLuan: KetLuan[] = [];
  const thieu: ThieuThongTin[] = [];
  const co = new Set<string>();
  const them = (k: KetLuan) => {
    // Tiền đề chưa có thì kết luận không được đứng: lỗi lập trình, không phải dữ liệu.
    for (const v of k.vi) if (!co.has(v)) throw new Error(`Kết luận ${k.id} thiếu tiền đề ${v}`);
    ketLuan.push(k);
    co.add(k.id);
  };
  const tamTinh = sk.homNay <= `${sk.nam}-12-31`;
  const ketQua = (dt: number | null, quyVuot: number | null, pp: PhuongPhapTncn | null): SuyLuan =>
    ({ ket_luan: ketLuan, thieu, doanh_thu_nam: dt, tam_tinh: tamTinh, quy_vuot: quyVuot, phuong_phap: pp });

  if (sk.nam < NAM_AP_DUNG) {
    them({ id: 'ngoai_pham_vi', loai: 'chua_ho_tro', cau: `MIMI chỉ áp quy định có hiệu lực từ 01/01/${NAM_AP_DUNG}. Năm ${sk.nam} theo chế độ cũ, MIMI không suy luận.`, vi: [], can_cu: ['nd141_d3'] });
    return ketQua(null, null, null);
  }

  const dt = sk.doanhThuQuy ? sk.doanhThuQuy.reduce((s, x) => s + x, 0) : null;
  if (dt === null) {
    thieu.push({ truong: 'doanh_thu', cau: 'Chưa có doanh thu năm. Kết nối Tổng cục Thuế hoặc ngân hàng, hoặc nhập doanh thu từng quý.' });
  } else {
    them({
      id: 'doanh_thu_nam', loai: 'su_kien', vi: [], can_cu: ['nd68_d5_k1'],
      cau: `Doanh thu năm ${sk.nam}${tamTinh ? ` (lũy kế tới ${ngayVN(sk.homNay)})` : ''}: ${tienVN(dt)}${sk.nguonDoanhThu ? `, ${TEN_NGUON_DOANH_THU[sk.nguonDoanhThu]}` : ''}.`,
    });
  }

  if (!sk.loai) {
    thieu.push({ truong: 'loai', cau: 'Bạn là hộ kinh doanh (cá nhân kinh doanh) hay doanh nghiệp? Hai loại theo hai bộ quy định khác nhau.' });
    return ketQua(dt, null, null);
  }

  if (sk.loai === 'doanh_nghiep') return suyLuanDoanhNghiep(sk, dt, them, thieu, ketQua);

  // ── Hộ kinh doanh, cá nhân kinh doanh ──
  if (!sk.nhomNganh.length) thieu.push({ truong: 'nhom_nganh', cau: 'Bạn kinh doanh nhóm ngành nào? Tỷ lệ thuế và dòng trên tờ khai tính theo nhóm ngành.' });
  if (!sk.kenh) thieu.push({ truong: 'kenh', cau: 'Bạn bán ở địa điểm cố định hay trên nền tảng số? Tờ khai tách hai phần này.' });

  let quyVuot: number | null = null;
  let pp: PhuongPhapTncn | null = null;

  if (dt !== null && dt <= NGUONG_DOANH_THU) {
    them({ id: 'duoi_nguong', loai: 'su_kien', cau: 'Doanh thu năm từ 01 tỷ đồng trở xuống.', vi: ['doanh_thu_nam'], can_cu: ['nd141_d1_k1', 'luat09_d1', 'luat09_d2'] });
    them({ id: 'khong_chiu_gtgt', loai: 'mien', cau: 'Không chịu thuế giá trị gia tăng.', vi: ['duoi_nguong'], can_cu: ['nd68_d3_k1', 'nd141_d1_k1'] });
    them({ id: 'khong_nop_tncn', loai: 'mien', cau: 'Không phải nộp thuế thu nhập cá nhân.', vi: ['duoi_nguong'], can_cu: ['nd68_d4_k1', 'nd141_d1_k1'] });
    them({
      id: 'giai_thich_hai_thue', loai: 'giai_thich', vi: ['khong_chiu_gtgt', 'khong_nop_tncn'], can_cu: [],
      cau: 'Không chịu GTGT và không nộp TNCN là hai hệ quả song song của cùng một điều kiện — doanh thu năm từ 01 tỷ đồng trở xuống. Khai số thuế GTGT bằng 0 không tự làm phát sinh miễn TNCN: doanh thu vượt 01 tỷ thì cả hai thuế cùng phát sinh.',
    });
    const bd = sk.batDauKinhDoanh;
    if (bd && Number(bd.slice(0, 4)) === sk.nam && Number(bd.slice(5, 7)) <= 6) {
      them({
        id: 'thong_bao_doanh_thu', loai: 'nghia_vu', mau: '01/TKN-CNKD', han: [`${sk.nam}-07-31`, `${sk.nam + 1}-01-31`],
        vi: ['khong_chiu_gtgt', 'khong_nop_tncn'], can_cu: ['nd68_d9_k1', 'nd141_d1_k1', 'tt18_d4_k1a', 'tt50_d3', 'tt50_mau_tkn'],
        cau: `Mới kinh doanh trong 6 tháng đầu năm: thông báo doanh thu từ ngày bắt đầu tới 30/06 (hạn 31/07/${sk.nam}), rồi doanh thu 6 tháng cuối năm (hạn 31/01/${sk.nam + 1}). Chỉ thông báo doanh thu, không khai số thuế.`,
      });
    } else {
      them({
        id: 'thong_bao_doanh_thu', loai: 'nghia_vu', mau: '01/TKN-CNKD', han: [`${sk.nam + 1}-01-31`],
        vi: ['khong_chiu_gtgt', 'khong_nop_tncn'], can_cu: ['nd68_d8_k1a', 'nd141_d1_k1', 'tt18_d4_k1a', 'tt50_d3', 'tt50_mau_tkn'],
        cau: `Thông báo doanh thu thực tế năm ${sk.nam} với cơ quan thuế, hạn 31/01/${sk.nam + 1}. Chỉ thông báo doanh thu, không khai số thuế phải nộp.`,
      });
    }
    if (sk.daNopThueTrongNam) {
      them({
        id: 'duoc_xu_ly_nop_thua', loai: 'quyen_loi', mau: '01/TKN-CNKD', vi: ['khong_chiu_gtgt', 'khong_nop_tncn'], can_cu: ['nd141_d4_k1', 'tt18_d5_k1'],
        cau: 'Tiền thuế GTGT, TNCN bạn đã nộp trong năm được xử lý như tiền nộp thừa — bù trừ hoặc hoàn trả. Đề nghị hoàn ghi ở phần E của mẫu 01/TKN-CNKD.',
      });
    }
  } else if (dt !== null) {
    let luyKe = 0;
    for (let q = 1; q <= 4 && quyVuot === null; q++) {
      luyKe += (sk.doanhThuQuy as number[])[q - 1];
      if (luyKe > NGUONG_DOANH_THU) quyVuot = q;
    }
    const qv = quyVuot as number;
    them({ id: 'tren_nguong', loai: 'su_kien', cau: `Doanh thu năm vượt 01 tỷ đồng, bắt đầu từ quý ${qv}/${sk.nam}.`, vi: ['doanh_thu_nam'], can_cu: ['nd141_d1_k1'] });
    them({ id: 'chiu_gtgt', loai: 'nghia_vu', cau: 'Chịu thuế giá trị gia tăng, tính trực tiếp: tỷ lệ % nhân doanh thu.', vi: ['tren_nguong'], can_cu: ['nd68_d3_k2', 'nd141_d1_k1'] });
    them({ id: 'nop_tncn', loai: 'nghia_vu', cau: 'Phải nộp thuế thu nhập cá nhân.', vi: ['tren_nguong'], can_cu: ['nd68_d4_k1', 'nd141_d1_k1'] });
    them({
      id: 'giai_thich_hai_thue', loai: 'giai_thich', vi: ['chiu_gtgt', 'nop_tncn'], can_cu: [],
      cau: 'GTGT và TNCN cùng phát sinh vì cùng một điều kiện: doanh thu năm vượt 01 tỷ đồng. Ghi số thuế GTGT bằng 0 không làm mất nghĩa vụ TNCN.',
    });
    them({
      id: 'khai_tu_quy_vuot', loai: 'nghia_vu', vi: ['chiu_gtgt', 'nop_tncn'], can_cu: ['nd68_d8_k1a_vuot', 'nd141_d1_k1'],
      cau: `Khai thuế, nộp thuế kể từ quý ${qv}/${sk.nam} — quý doanh thu lũy kế vượt 01 tỷ đồng.`,
    });
    if (dt <= NGUONG_KHAI_THANG) {
      const han: string[] = [];
      for (let q = qv; q <= 4; q++) han.push(hanNopQuy(q, sk.nam));
      them({
        id: 'khai_theo_quy', loai: 'nghia_vu', mau: '01/CNKD', han, vi: ['khai_tu_quy_vuot'],
        can_cu: ['nd68_d10_k1a', 'tt18_d4_k1b', 'tt50_d3', 'tt50_mau_cnkd', 'nd68_d8_k3a', 'nd68_d8_k3e'],
        cau: 'Khai GTGT, TNCN theo quý trên Tờ khai mẫu 01/CNKD. Hạn nộp tờ khai và nộp tiền: ngày cuối tháng đầu của quý sau.',
      });
    } else {
      them({ id: 'khai_theo_thang', loai: 'chua_ho_tro', vi: ['khai_tu_quy_vuot'], can_cu: ['nd68_d10_k1b'], cau: 'Doanh thu năm trên 50 tỷ đồng: khai GTGT theo tháng. MIMI chưa soạn tờ khai tháng.' });
    }
    them({
      id: 'hoa_don_co_ma', loai: 'nghia_vu', vi: ['tren_nguong'], can_cu: ['nd141_d1_k2a', 'nd141_d1_k2c'],
      han: [congNgayLich(cuoiQuy(qv, sk.nam), 30)],
      cau: 'Phải dùng hoá đơn điện tử có mã của cơ quan thuế (hoặc khởi tạo từ máy tính tiền nối với cơ quan thuế); đăng ký trong 30 ngày kể từ cuối kỳ doanh thu lũy kế vượt 01 tỷ đồng.',
    });

    // Phương pháp tính TNCN.
    if (dt > NGUONG_THU_NHAP) {
      if (sk.phuongPhapTncn === 'doanh_thu' && tamTinh) {
        pp = 'doanh_thu';
        them({
          id: 'phuong_phap_tncn', loai: 'canh_bao', vi: ['nop_tncn'], can_cu: ['nd68_d4_k5d2'],
          cau: 'Bạn đang tính TNCN theo tỷ lệ trên doanh thu mà doanh thu lũy kế đã quá 03 tỷ đồng: nếu cả năm vẫn trên 03 tỷ thì từ năm sau phải chuyển sang tính trên thu nhập.',
        });
      } else {
        pp = 'thu_nhap';
        them({ id: 'phuong_phap_tncn', loai: 'phuong_phap', vi: ['nop_tncn'], can_cu: ['nd68_d4_k5b'], cau: 'Doanh thu năm trên 03 tỷ đồng: tính TNCN trên thu nhập (doanh thu trừ chi phí) nhân thuế suất.' });
      }
    } else if (sk.phuongPhapTncn) {
      pp = sk.phuongPhapTncn;
      them({
        id: 'phuong_phap_tncn', loai: 'phuong_phap', vi: ['nop_tncn'],
        can_cu: pp === 'doanh_thu' ? ['nd68_d4_k5a', 'nd141_d1_k1'] : ['nd68_d4_k5b', 'nd68_d4_k5d', 'luat109_d7_k2'],
        cau: pp === 'doanh_thu'
          ? 'Bạn chọn tính TNCN theo thuế suất nhân doanh thu tính thuế.'
          : 'Bạn chọn tính TNCN trên thu nhập (doanh thu trừ chi phí), thuế suất 15% với doanh thu đến 03 tỷ; giữ phương pháp này 2 năm liên tục.',
      });
    } else {
      thieu.push({ truong: 'phuong_phap_tncn', cau: 'Doanh thu trên 01 tỷ đến 03 tỷ: bạn chọn tính TNCN theo tỷ lệ trên doanh thu, hay trên thu nhập (doanh thu trừ chi phí)?' });
    }
    if (pp === 'doanh_thu') {
      them({
        id: 'tncn_theo_ty_le', loai: 'phuong_phap', vi: ['phuong_phap_tncn'], can_cu: ['luat109_d7_k3a', 'nd68_d4_k3', 'nd141_d1_k1'],
        cau: 'TNCN = thuế suất theo ngành × phần doanh thu vượt 01 tỷ đồng; mức trừ 01 tỷ đồng tính cho cả năm.',
      });
    }
    if (pp === 'thu_nhap') {
      them({
        id: 'tam_nop_va_quyet_toan', loai: 'nghia_vu', mau: '02/CNKD-TNCN-QTT', han: [`${sk.nam + 1}-03-31`], vi: ['phuong_phap_tncn'],
        can_cu: ['nd68_d10_k2b', 'tt18_d4_k1c', 'nd68_d8_k3c'],
        cau: `Mỗi quý tạm nộp TNCN theo tỷ lệ trên doanh thu; cuối năm quyết toán trên mẫu 02/CNKD-TNCN-QTT, hạn 31/03/${sk.nam + 1}.`,
      });
      them({
        id: 'chi_phi_can_chung_tu', loai: 'nghia_vu', vi: ['phuong_phap_tncn'], can_cu: ['nd68_d6_k1'],
        cau: 'Khoản chi chỉ được trừ khi có hoá đơn, chứng từ; khoản từ 05 triệu đồng phải trả không dùng tiền mặt. Khoản thiếu chứng từ làm tăng thuế.',
      });
    }

    // Tỷ lệ theo ngành đã chọn.
    for (const n of sk.nhomNganh) {
      const g = TY_LE_GTGT[n];
      const t = TY_LE_TNCN[n];
      them({
        id: `ty_le_${n}`, loai: 'phuong_phap', vi: ['chiu_gtgt', 'nop_tncn'], can_cu: [...g.can_cu, ...t.can_cu],
        cau: `${TEN_NHOM_NGANH[n]}: GTGT ${g.ty_le === null ? 'MIMI chưa có căn cứ tỷ lệ riêng cho nhóm này trong kho — hỏi cơ quan thuế' : phanTram(g.ty_le)}; TNCN ${phanTram(t.ty_le)}.`,
      });
    }
    if (sk.nhomNganh.length > 1) {
      them({
        id: 'nhieu_nganh', loai: 'canh_bao', vi: ['chiu_gtgt'], can_cu: ['tt69_d5_k2'],
        cau: 'Kinh doanh nhiều nhóm ngành: tách doanh thu theo từng nhóm; không tách được thì GTGT áp tỷ lệ cao nhất cho toàn bộ doanh thu.',
      });
    }
  }

  // Ngành đặc thù dùng mẫu khác — đây là lý do MIMI hỏi ngành ngay lúc bắt đầu.
  if (sk.nganhDacThu === 'cho_thue_bat_dong_san') {
    them({
      id: 'cho_thue_bds', loai: 'nghia_vu', mau: '01/BĐS', han: [`${sk.nam}-07-31`, `${sk.nam + 1}-01-31`], vi: [],
      can_cu: ['tt18_d4_k4', 'nd68_d8_k3d', 'luat109_d7_k4', 'nd141_d1_k1'],
      cau: `Cho thuê bất động sản khai riêng trên mẫu 01/BĐS kèm phụ lục 01/BK-BĐS: được chọn khai hai lần trong năm (hạn 31/07/${sk.nam} và 31/01/${sk.nam + 1}) hoặc một lần theo năm. TNCN 5% trên phần doanh thu vượt mức được trừ.`,
    });
    them({ id: 'chua_soan_bds', loai: 'chua_ho_tro', vi: ['cho_thue_bds'], can_cu: [], cau: 'MIMI chưa soạn mẫu 01/BĐS — phần trên là nghĩa vụ và hạn, tờ khai vẫn lập tay hoặc trên eTax.' });
  }
  if (sk.nganhDacThu === 'dai_ly_xo_so_bao_hiem_da_cap') {
    them({
      id: 'dai_ly_khau_tru', loai: 'nghia_vu', mau: '01/TKN-CNKD', han: [`${sk.nam + 1}-01-31`], vi: [],
      can_cu: ['tt18_d4_k3'],
      cau: 'Làm đại lý xổ số, bảo hiểm hoặc bán hàng đa cấp: doanh nghiệp trả hoa hồng đã khấu trừ thuế; phần doanh thu trong năm chưa bị khấu trừ thì bạn khai theo năm trên mẫu 01/TKN-CNKD.',
    });
  }
  if (sk.nganhDacThu === 'hang_thue_khac') {
    them({
      id: 'thue_khac', loai: 'nghia_vu', vi: [], can_cu: ['nd68_d7'],
      cau: 'Hàng hoá, dịch vụ chịu thuế tiêu thụ đặc biệt, thuế tài nguyên hoặc thuế bảo vệ môi trường: khai thêm các loại thuế đó theo pháp luật riêng của từng loại, cùng hồ sơ khai thuế của bạn.',
    });
  }

  if (sk.kenh === 'tmdt_co_thanh_toan') {
    them({
      id: 'san_khau_tru', loai: 'canh_bao', vi: [], can_cu: ['nd68_d11_k1'],
      cau: 'Sàn thương mại điện tử có chức năng thanh toán khấu trừ, khai và nộp thuế thay bạn cho từng giao dịch. Doanh thu đã qua sàn không khai lại để nộp lần hai.',
    });
  }

  them({ id: 'nop_dien_tu', loai: 'nghia_vu', vi: [], can_cu: ['nd68_d8_k4a'], cau: 'Hồ sơ khai thuế nộp bằng phương thức điện tử.' });
  them({
    id: 'thong_bao_tai_khoan', loai: 'nghia_vu', mau: '01/BK-STK', vi: [],
    can_cu: dt !== null && dt <= NGUONG_DOANH_THU && sk.nam === NAM_AP_DUNG ? ['nd68_d13_k4', 'tt18_d4_k1d', 'tt50_d4_k2'] : ['nd68_d13_k4', 'tt18_d4_k1d'],
    han: dt !== null && dt <= NGUONG_DOANH_THU && sk.nam === NAM_AP_DUNG ? [`${NAM_AP_DUNG}-07-31`] : undefined,
    cau: 'Báo cơ quan thuế mọi số tài khoản ngân hàng, ví điện tử dùng cho kinh doanh (mẫu 01/BK-STK), nếu bạn chưa gửi.',
  });
  them({
    id: 'trach_nhiem', loai: 'giai_thich', vi: [], can_cu: ['nd68_d8_k1b_ho_tro'],
    cau: 'Ngay cả tờ khai cơ quan thuế tự tạo lập cũng không thay trách nhiệm khai thuế của bạn — bản nháp MIMI soạn cũng vậy. Kiểm lại trước khi ký nộp.',
  });

  return ketQua(dt, quyVuot, pp);
}

function suyLuanDoanhNghiep(
  sk: SuKienThue,
  dt: number | null,
  them: (k: KetLuan) => void,
  thieu: ThieuThongTin[],
  ketQua: (dt: number | null, quyVuot: number | null, pp: PhuongPhapTncn | null) => SuyLuan,
): SuyLuan {
  const truoc = sk.doanhThuNamTruoc;
  if (truoc === null) {
    thieu.push({ truong: 'doanh_thu_nam_truoc', cau: `Tổng doanh thu năm ${sk.nam - 1} trên phụ lục kết quả kinh doanh kèm quyết toán TNDN là bao nhiêu? Đây là căn cứ xét miễn TNDN.` });
  } else {
    them({ id: 'doanh_thu_nam_truoc', loai: 'su_kien', vi: [], can_cu: ['nd141_d2_a'], cau: `Tổng doanh thu năm ${sk.nam - 1} theo quyết toán TNDN: ${tienVN(truoc)}.` });
    if (truoc <= NGUONG_DOANH_THU) {
      if (sk.coQuanHeLienKet === null) {
        thieu.push({ truong: 'co_quan_he_lien_ket', cau: 'Công ty có phải công ty con, hoặc có quan hệ liên kết với doanh nghiệp khác không? Điều này quyết định có được miễn TNDN.' });
      } else if (sk.coQuanHeLienKet) {
        them({ id: 'khong_mien_lien_ket', loai: 'canh_bao', vi: ['doanh_thu_nam_truoc'], can_cu: ['nd141_d2_d'], cau: 'Công ty con hoặc có quan hệ liên kết: chỉ được miễn TNDN khi doanh nghiệp liên kết cũng đủ điều kiện miễn. MIMI không kết luận thay bạn.' });
      } else {
        them({ id: 'mien_tndn', loai: 'mien', vi: ['doanh_thu_nam_truoc'], can_cu: ['nd141_d2_k15', 'luat09_d3'], cau: `Tổng doanh thu năm ${sk.nam - 1} từ 01 tỷ đồng trở xuống: thu nhập năm ${sk.nam} được miễn thuế TNDN.` });
      }
    }
    if (truoc < NGUONG_DOANH_THU) {
      them({ id: 'gtgt_truc_tiep', loai: 'phuong_phap', vi: ['doanh_thu_nam_truoc'], can_cu: ['luat48_d12_k2a1'], cau: 'Doanh thu năm dưới 01 tỷ đồng: nộp GTGT theo phương pháp trực tiếp trên doanh thu, trừ khi tự nguyện đăng ký phương pháp khấu trừ.' });
    }
  }
  const bd = sk.batDauKinhDoanh;
  if (bd && Number(bd.slice(0, 4)) === sk.nam && dt !== null && dt <= NGUONG_DOANH_THU) {
    them({ id: 'moi_thanh_lap', loai: 'mien', vi: ['doanh_thu_nam'], can_cu: ['nd141_d2_c'], cau: 'Doanh nghiệp mới thành lập trong năm, doanh thu tới nay chưa quá 01 tỷ đồng: nếu dự kiến cả năm không quá 01 tỷ thì không phải tạm nộp TNDN.' });
  }
  them({ id: 'chua_soan_to_khai_dn', loai: 'chua_ho_tro', vi: [], can_cu: [], cau: 'MIMI chưa soạn tờ khai của doanh nghiệp (GTGT, TNDN). Phần trên là nghĩa vụ suy ra từ văn bản; tờ khai vẫn lập bằng phần mềm kế toán hoặc HTKK.' });
  return ketQua(dt, null, null);
}

/** Mọi căn cứ các kết luận dùng, không lặp, giữ thứ tự xuất hiện. */
export function canCuDung(kl: { can_cu: string[] }[]): string[] {
  return [...new Set(kl.flatMap((k) => k.can_cu))];
}

// ── Từ dữ liệu đã lưu sang sự kiện ──────────────────────────────────────────────

export interface HoSoThue {
  loai_nguoi_nop: LoaiNguoiNop | null;
  nhom_nganh: NhomNganh[];
  kenh: Kenh | null;
  phuong_phap_tncn: PhuongPhapTncn | null;
  bat_dau_kinh_doanh: string | null;
  da_nop_thue_trong_nam: boolean | null;
  nganh_dac_thu: NganhDacThu | null;
  doanh_thu_nam_truoc: number | null;
  co_quan_he_lien_ket: boolean | null;
}

export const HO_SO_TRONG: HoSoThue = {
  loai_nguoi_nop: null, nhom_nganh: [], kenh: null, phuong_phap_tncn: null,
  bat_dau_kinh_doanh: null, da_nop_thue_trong_nam: null, nganh_dac_thu: null,
  doanh_thu_nam_truoc: null, co_quan_he_lien_ket: null,
};

/** Loại người nộp khi hồ sơ thuế chưa ghi: đọc loại tài khoản chọn lúc đăng ký. */
export function loaiTuTaiKhoan(accountType: string | null | undefined): LoaiNguoiNop | null {
  if (accountType === 'household' || accountType === 'personal') return 'ho_kinh_doanh';
  if (accountType === 'business') return 'doanh_nghiep';
  return null;
}

/** Kiểm và làm sạch hồ sơ gửi lên. Trả câu lỗi cho người dùng nếu sai. */
export function docHoSoThue(v: unknown): { ok: true; ho_so: HoSoThue } | { ok: false; cau: string } {
  if (!v || typeof v !== 'object') return { ok: false, cau: 'Hồ sơ thuế không hợp lệ.' };
  const o = v as Record<string, unknown>;
  const trongDs = <T extends string>(x: unknown, ds: readonly T[]): T | null => (typeof x === 'string' && (ds as readonly string[]).includes(x) ? (x as T) : null);
  const loai = o.loai_nguoi_nop == null ? null : trongDs(o.loai_nguoi_nop, ['ho_kinh_doanh', 'doanh_nghiep'] as const);
  if (o.loai_nguoi_nop != null && !loai) return { ok: false, cau: 'Loại người nộp thuế không hợp lệ.' };
  const nhom = Array.isArray(o.nhom_nganh) ? o.nhom_nganh : [];
  if (nhom.some((n) => !trongDs(n, NHOM_NGANH))) return { ok: false, cau: 'Nhóm ngành không hợp lệ.' };
  const kenh = o.kenh == null ? null : trongDs(o.kenh, KENH);
  if (o.kenh != null && !kenh) return { ok: false, cau: 'Kênh bán không hợp lệ.' };
  const pp = o.phuong_phap_tncn == null ? null : trongDs(o.phuong_phap_tncn, ['doanh_thu', 'thu_nhap'] as const);
  if (o.phuong_phap_tncn != null && !pp) return { ok: false, cau: 'Phương pháp tính TNCN không hợp lệ.' };
  let bd: string | null = null;
  if (o.bat_dau_kinh_doanh != null && o.bat_dau_kinh_doanh !== '') {
    if (typeof o.bat_dau_kinh_doanh !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.bat_dau_kinh_doanh) || Number.isNaN(Date.parse(o.bat_dau_kinh_doanh))) {
      return { ok: false, cau: 'Ngày bắt đầu kinh doanh không hợp lệ.' };
    }
    bd = o.bat_dau_kinh_doanh;
  }
  const nganh = o.nganh_dac_thu == null ? null : trongDs(o.nganh_dac_thu, NGANH_DAC_THU);
  if (o.nganh_dac_thu != null && !nganh) return { ok: false, cau: 'Hoạt động đặc thù không hợp lệ.' };
  const bool = (x: unknown) => (typeof x === 'boolean' ? x : null);
  let truoc: number | null = null;
  if (o.doanh_thu_nam_truoc != null && o.doanh_thu_nam_truoc !== '') {
    const n = Number(o.doanh_thu_nam_truoc);
    if (!Number.isFinite(n) || n < 0 || n > 1e15 || !Number.isInteger(n)) return { ok: false, cau: 'Doanh thu năm trước phải là số đồng, không âm.' };
    truoc = n;
  }
  return {
    ok: true,
    ho_so: {
      loai_nguoi_nop: loai, nhom_nganh: [...new Set(nhom as NhomNganh[])], kenh, phuong_phap_tncn: pp, bat_dau_kinh_doanh: bd,
      da_nop_thue_trong_nam: bool(o.da_nop_thue_trong_nam), nganh_dac_thu: nganh,
      doanh_thu_nam_truoc: truoc, co_quan_he_lien_ket: bool(o.co_quan_he_lien_ket),
    },
  };
}

export interface DoanhThuDaDoc {
  hoa_don: [number, number, number, number] | null;
  ngan_hang: [number, number, number, number] | null;
}

/**
 * Chọn doanh thu từng quý: số người dùng tự nhập → hoá đơn điện tử → tiền về ngân hàng.
 * Kèm cảnh báo khi các nguồn lệch nhau theo hướng có thể làm khai thiếu.
 */
export function chonDoanhThu(
  doc: DoanhThuDaDoc,
  tuNhap: [number, number, number, number] | null,
): { quy: [number, number, number, number] | null; nguon: NguonDoanhThu | null; canh_bao: string[] } {
  const canhBao: string[] = [];
  if (tuNhap) {
    if (doc.hoa_don && tuNhap.some((x, i) => x < (doc.hoa_don as number[])[i])) {
      canhBao.push('Có quý bạn nhập doanh thu thấp hơn tổng hoá đơn điện tử đã xuất. Doanh thu gồm toàn bộ tiền bán hàng — kiểm lại trước khi khai.');
    }
    return { quy: tuNhap, nguon: 'tu_khai', canh_bao: canhBao };
  }
  if (doc.hoa_don && doc.hoa_don.some((x) => x > 0)) {
    if (doc.ngan_hang) {
      const hd = doc.hoa_don.reduce((s, x) => s + x, 0);
      const nh = doc.ngan_hang.reduce((s, x) => s + x, 0);
      if (nh > hd * 1.1 && nh - hd >= 10_000_000) {
        canhBao.push(`Tiền về ngân hàng (${tienVN(nh)}) nhiều hơn tổng hoá đơn đã xuất (${tienVN(hd)}). Nếu có khoản bán hàng không xuất hoá đơn thì vẫn là doanh thu; nếu là tiền vay, góp vốn thì không. Kiểm lại, và sửa doanh thu nếu cần.`);
      }
    }
    return { quy: doc.hoa_don, nguon: 'hoa_don_dien_tu', canh_bao: canhBao };
  }
  if (doc.ngan_hang && doc.ngan_hang.some((x) => x > 0)) {
    canhBao.push('Doanh thu đang ước tính theo tiền về ngân hàng (đã bỏ chuyển khoản giữa các tài khoản của bạn). Tiền vay, góp vốn, hoàn tiền không phải doanh thu — kiểm lại trước khi khai.');
    return { quy: doc.ngan_hang, nguon: 'ngan_hang', canh_bao: canhBao };
  }
  return { quy: null, nguon: null, canh_bao: canhBao };
}
