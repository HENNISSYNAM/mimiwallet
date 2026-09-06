/**
 * Kỳ kê khai thuế kế tiếp, và còn bao nhiêu ngày.
 *
 * VÌ SAO ĐÁNG CÓ. Từ 01/01/2026 hộ kinh doanh tự kê khai theo quý. Hạn là ngày
 * cuối của tháng liền sau quý: quý I hết hạn 30/04, quý II 31/07, quý III
 * 31/10, quý IV 31/01 năm sau.
 *
 * Đây là **thứ duy nhất trong sản phẩm có đồng hồ đang chạy**. Mọi tính năng
 * khác thì làm hôm nay hay tuần sau cũng thế; riêng cái này trễ là bị phạt.
 * Vậy mà trước hôm nay không có chỗ nào trong ứng dụng đếm nó.
 *
 * VIẾT THÀNH HÀM THUẦN vì đây là logic ngày tháng, và ngày tháng là chỗ sai
 * lặng lẽ: lệch một tháng thì người dùng tin mình còn thời gian trong khi đã
 * trễ. Test khoá từng mốc chuyển quý.
 *
 * KHÔNG TỰ ĐỘNG GIA HẠN, KHÔNG ĐOÁN NGÀY NGHỈ LỄ. Nếu hạn rơi vào cuối tuần
 * hoặc ngày lễ thì luật cho lùi, nhưng lùi bao nhiêu phụ thuộc lịch nghỉ từng
 * năm. Hiển thị ngày luật định và để người dùng biết đó là mốc sớm nhất — an
 * toàn hơn là hiển thị một ngày muộn hơn mà mình tự suy ra.
 */

export interface KyKeKhai {
  /** Quý 1–4. */
  quy: number;
  /** Năm của quý đó. */
  nam: number;
  /** Hạn nộp, theo giờ địa phương. */
  han: Date;
  /** Số NGÀY LỊCH còn lại. 0 nghĩa là hôm nay đúng hạn — xem `soNgayLich`. */
  conLai: number;
  /** Đã quá hạn chưa. */
  daTre: boolean;
  /** Câu ngắn cho giao diện. */
  cau: string;
}

/**
 * Số NGÀY LỊCH giữa hai mốc, không phải số khoảng 24 giờ.
 *
 * Khác biệt này quan trọng: hạn là 23:59 ngày 31/10. Nếu lấy hiệu thời gian rồi
 * `Math.ceil`, thì lúc 12h trưa ngày 31/10 còn ~12 giờ → làm tròn thành "1
 * ngày", tức màn hình báo còn một ngày trong đúng ngày cuối cùng. Người đọc tin
 * là mai vẫn kịp.
 *
 * Nên cắt cả hai mốc về nửa đêm rồi mới trừ: cùng ngày là 0, hôm trước là 1.
 */
function soNgayLich(tu: Date, den: Date): number {
  const a = new Date(tu.getFullYear(), tu.getMonth(), tu.getDate()).getTime();
  const b = new Date(den.getFullYear(), den.getMonth(), den.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Hạn nộp của một quý: ngày cuối tháng liền sau quý. */
function hanCuaQuy(quy: number, nam: number): Date {
  // Quý 1 → hết 30/04; quý 4 → hết 31/01 năm sau.
  const thangSauQuy = quy * 3; // 0-indexed: quý 1 → tháng 3 (tức tháng 4)
  const namHan = quy === 4 ? nam + 1 : nam;
  const thangHan = quy === 4 ? 0 : thangSauQuy;
  // Ngày 0 của tháng kế tiếp = ngày cuối của tháng này.
  return new Date(namHan, thangHan + 1, 0, 23, 59, 59, 999);
}

/**
 * Kỳ kê khai kế tiếp tính từ `luc`.
 *
 * Trả về kỳ **chưa quá hạn gần nhất**. Nếu hạn của quý vừa kết thúc đã trôi
 * qua, chuyển sang quý tiếp theo — không giữ lại một hạn đã trễ, vì việc cần
 * làm khi đó là chuẩn bị cho kỳ tới chứ không phải nhìn một con số âm.
 */
export function kyKeKhaiKeTiep(luc: Date = new Date()): KyKeKhai {
  const nam = luc.getFullYear();
  const quyHienTai = Math.floor(luc.getMonth() / 3) + 1;

  // Bắt đầu từ quý ngay TRƯỚC quý hiện tại — đó là quý đang tới hạn nộp.
  let quy = quyHienTai - 1;
  let namQuy = nam;
  if (quy === 0) { quy = 4; namQuy = nam - 1; }

  // Trượt tới kỳ đầu tiên chưa quá hạn.
  for (let i = 0; i < 8; i++) {
    const han = hanCuaQuy(quy, namQuy);
    if (han.getTime() >= luc.getTime()) {
      const conLai = soNgayLich(luc, han);
      return { quy, nam: namQuy, han, conLai, daTre: false, cau: cauNhac(quy, namQuy, conLai) };
    }
    quy += 1;
    if (quy > 4) { quy = 1; namQuy += 1; }
  }

  // Không tới được trong thực tế; giữ cho kiểu trả về luôn đầy đủ.
  const han = hanCuaQuy(quy, namQuy);
  return { quy, nam: namQuy, han, conLai: 0, daTre: true, cau: 'Không tính được kỳ kế tiếp.' };
}

function cauNhac(quy: number, nam: number, conLai: number): string {
  const ngay = `${String(hanCuaQuy(quy, nam).getDate()).padStart(2, '0')}/${String(
    hanCuaQuy(quy, nam).getMonth() + 1,
  ).padStart(2, '0')}`;

  if (conLai <= 0) return `Hôm nay là hạn nộp tờ khai quý ${quy}.`;
  if (conLai === 1) return `Còn 1 ngày tới hạn nộp tờ khai quý ${quy} (${ngay}).`;
  if (conLai <= 14) return `Còn ${conLai} ngày tới hạn nộp tờ khai quý ${quy} (${ngay}).`;
  return `Hạn nộp tờ khai quý ${quy} là ${ngay}, còn ${conLai} ngày.`;
}

/**
 * Mức khẩn, để giao diện chọn màu mà không tự đặt ngưỡng riêng ở mỗi nơi.
 *
 * Ngưỡng đặt ở đây chứ không rải trong component: hai màn hình dùng hai ngưỡng
 * khác nhau cho cùng một hạn thì người dùng không biết tin cái nào.
 */
export type MucKhan = 'con_xa' | 'sap_toi' | 'gap';

export function mucKhan(conLai: number): MucKhan {
  if (conLai <= 7) return 'gap';
  if (conLai <= 30) return 'sap_toi';
  return 'con_xa';
}
