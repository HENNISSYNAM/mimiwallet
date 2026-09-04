/**
 * Bầu không khí theo giờ trong ngày.
 *
 * VÌ SAO CÓ FILE NÀY. Tệp khách hàng đang nhắm tới là Gen Z và Gen Alpha, và
 * thứ nhóm đó phản ứng không phải là "giao diện sạch" — mà là cảm giác app *ấm*
 * và *biết điều*. Cả một dòng nội dung cozy-core sống bằng đúng thứ đó. Với một
 * app thuế thì nó là khác biệt thật, vì ngành này mặc định gây lo âu.
 *
 * DỰNG BẰNG CSS, KHÔNG BẰNG ẢNH MƯỢN. Bầu trời ở đây là gradient, không phải
 * tranh tải về. Ba lý do, xếp theo thứ tự quan trọng:
 *
 *   1. Không rủi ro bản quyền. App sắp nộp App Store; ảnh có watermark của
 *      người khác là rủi ro rơi thẳng vào công ty.
 *   2. Vài KB thay vì vài trăm KB mỗi tấm, và không có cú nháy lúc ảnh tải.
 *   3. Chuyển màu mượt theo giờ. Ảnh thì nhảy cóc giữa các tấm.
 *
 * MIMI CỦA CHÍNH MÌNH ĐỨNG TRONG ĐÓ. 20 pose cắt từ `MIMI HOẠT ẢNH.png` là tài
 * sản của công ty, không phải ảnh sưu tầm. Ba pose lâu nay nằm không —
 * `stretch`, `sit`, `sleep` — chính là ba pose hợp nhất với sáng, chiều, khuya.
 *
 * KHÔNG LỄ HỘI ÂM LỊCH Ở ĐÂY. Trung thu và Tết rơi vào ngày âm, mà tính ngày âm
 * cho đúng thì cần bảng tra hoặc thư viện. Đoán bừa một khoảng dương lịch thì sẽ
 * có năm hiện sai — nên phần lễ hội để `dip` truyền vào từ ngoài, do người biết
 * ngày quyết định. Thà thiếu một tính năng còn hơn có một tính năng nói sai ngày.
 */

import type { Pose } from './mimiTamTrang';

export type Buoi = 'khuya' | 'sang' | 'trua' | 'chieu' | 'toi';

export interface KhongKhi {
  buoi: Buoi;
  /** Gradient nền, đã sẵn sàng gán thẳng vào `style.background`. */
  troi: string;
  /** Pose MIMI mang trong khung cảnh này. */
  pose: Pose;
  /** Một câu ngắn. Không phải thông tin — đây là chỗ được phép ấm áp. */
  cau: string;
  /** Nền sáng hay tối, để bên gọi chọn màu chữ cho tương phản. */
  toi: boolean;
}

/**
 * Giờ nào thuộc buổi nào.
 *
 * Cắt theo nhịp sinh hoạt Việt Nam chứ không theo mặc định phương Tây: trưa
 * tách riêng thành một buổi (11–14) vì đó là giờ nghỉ trưa thật, và "khuya" bắt
 * đầu từ 22h chứ không phải nửa đêm.
 */
export function buoiCuaGio(gio: number): Buoi {
  if (gio >= 22 || gio < 5) return 'khuya';
  if (gio < 11) return 'sang';
  if (gio < 14) return 'trua';
  if (gio < 18) return 'chieu';
  return 'toi';
}

const CANH: Record<Buoi, Omit<KhongKhi, 'buoi'>> = {
  // Đêm khuya: xanh mực, một quầng ấm nhỏ như đèn ngủ để không thành lạnh lẽo.
  khuya: {
    troi:
      'radial-gradient(120% 80% at 78% 12%, hsl(38 60% 62% / 0.14) 0%, transparent 55%), ' +
      'linear-gradient(180deg, hsl(224 42% 12%) 0%, hsl(228 38% 8%) 100%)',
    pose: 'sleep',
    cau: 'Khuya rồi. Sổ sách để mai cũng được.',
    toi: true,
  },
  // Sáng: hồng đào sang xanh nhạt. MIMI vươn vai.
  sang: {
    troi:
      'radial-gradient(110% 70% at 22% 8%, hsl(28 92% 88%) 0%, transparent 58%), ' +
      'linear-gradient(180deg, hsl(36 80% 96%) 0%, hsl(200 60% 94%) 100%)',
    pose: 'stretch',
    cau: 'Chào buổi sáng.',
    toi: false,
  },
  // Trưa: nắng gắt nhất, nền sáng nhất, MIMI ngồi trong nắng.
  trua: {
    troi:
      'radial-gradient(90% 60% at 50% 0%, hsl(48 100% 92%) 0%, transparent 60%), ' +
      'linear-gradient(180deg, hsl(196 82% 92%) 0%, hsl(190 60% 96%) 100%)',
    pose: 'sit',
    cau: 'Nắng đẹp. Nghỉ tay một lát đi.',
    toi: false,
  },
  // Chiều: hoàng hôn cam — đúng cái ấm của cozy-core, và hợp lông cam của MIMI.
  chieu: {
    troi:
      'radial-gradient(120% 80% at 82% 22%, hsl(24 95% 74% / 0.55) 0%, transparent 62%), ' +
      'linear-gradient(180deg, hsl(32 90% 92%) 0%, hsl(14 70% 90%) 100%)',
    pose: 'content',
    cau: 'Chiều rồi.',
    toi: false,
  },
  // Tối: tím chàm dịu, chưa tối hẳn.
  toi: {
    troi:
      'radial-gradient(120% 80% at 20% 15%, hsl(268 50% 40% / 0.35) 0%, transparent 60%), ' +
      'linear-gradient(180deg, hsl(250 40% 26%) 0%, hsl(238 42% 16%) 100%)',
    pose: 'watch',
    cau: 'Xong việc chưa?',
    toi: true,
  },
};

export function khongKhi(luc: Date = new Date()): KhongKhi {
  const buoi = buoiCuaGio(luc.getHours());
  return { buoi, ...CANH[buoi] };
}
