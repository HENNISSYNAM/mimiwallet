/**
 * Mimi đang mang gương mặt nào, và vì sao.
 *
 * HAI MƯƠI TẤM ẢNH, SÁU TẤM ĐANG DÙNG. Phần còn lại nằm trong `src/assets/mimi/`
 * từ 11/08 mà chưa có đường nào gọi tới. File này là đường đó.
 *
 * NGUYÊN TẮC, VÀ NÓ QUAN TRỌNG HƠN CHUYỆN ĐẸP: gương mặt phải suy ra từ **sự
 * việc có thật trong dữ liệu**, không phải từ đồng hồ hay `Math.random()`. Một
 * con mèo đổi mặt ngẫu nhiên là hình dán. Một con mèo ngẩng lên đúng lúc tiền
 * về là bạn đồng hành — và người ta quay lại vì cái thứ hai.
 *
 * MẶT VUI KHÔNG ĐƯỢC ĐÈ LÊN TIN XẤU. Đây là cùng một lỗi với ngõ cụt "bấm Cập
 * nhật" ngày 04/09: giao diện nói một câu dễ chịu trong khi sự thật là chuyện
 * khác. Nên thứ tự ưu tiên dưới đây là **việc cần xử lý trước, tin vui sau** —
 * cố định trong mã, không phải quy ước ai cũng phải nhớ.
 *
 * KHÔNG BỊA CẢM XÚC KHI KHÔNG BIẾT GÌ. Không có dữ liệu thì Mimi ngủ, chứ không
 * cười. Một cái ngáp thành thật hơn một nụ cười trống rỗng.
 */

export type Pose =
  | 'idle' | 'blink' | 'content' | 'happy' | 'wink' | 'love'
  | 'laugh' | 'sleep' | 'watch' | 'surprised' | 'look-far' | 'look-side'
  | 'paw' | 'run' | 'walk' | 'sit' | 'stretch' | 'wave' | 'agent' | 'hero';

/** Sự việc có thật lấy từ dữ liệu — không có trường nào là "tâm trạng". */
export interface TinhHinh {
  /** Chưa liên kết ngân hàng, chưa có giao dịch nào. */
  chuaCoDuLieu?: boolean;
  /** Có liên kết đang hỏng, hoá đơn quá hạn — việc người dùng phải xử lý. */
  soViecCanXuLy?: number;
  /** Đang đồng bộ / đang chạy tác vụ nền. */
  dangChay?: boolean;
  /** Vừa có tiền về kể từ lần mở gần nhất. */
  vuaCoTienVe?: boolean;
  /** Phát hiện bất thường: chi tiêu lạ, giao dịch lớn ngoài thói quen. */
  coBatThuong?: boolean;
  /** Lần đầu người dùng mở ứng dụng. */
  lanDau?: boolean;
}

export interface TamTrang {
  pose: Pose;
  /** Câu Mimi "nói" — hoặc null nếu không có gì đáng nói. Không bịa câu vui vẻ. */
  cau: string | null;
}

/**
 * Thứ tự dưới đây là thứ tự ưu tiên, đọc từ trên xuống, dừng ở dòng khớp đầu.
 *
 * `coBatThuong` và `soViecCanXuLy` đứng TRÊN `vuaCoTienVe` là chủ ý: tiền vừa
 * về không xoá được việc đang hỏng, và để nó xoá thì Mimi thành ra đang giấu.
 */
export function tamTrang(t: TinhHinh): TamTrang {
  if (t.lanDau) {
    return { pose: 'wave', cau: 'Chào bạn. Mình bắt đầu từ đâu nhỉ?' };
  }
  if (t.chuaCoDuLieu) {
    // Ngủ, không cười. Chưa có gì để vui.
    return { pose: 'sleep', cau: 'Chưa có dữ liệu nào — liên kết ngân hàng để mình bắt đầu.' };
  }
  if (t.coBatThuong) {
    return { pose: 'surprised', cau: 'Có khoản khác thường. Bạn xem giúp mình với.' };
  }
  if (t.soViecCanXuLy && t.soViecCanXuLy > 0) {
    return {
      pose: 'look-side',
      cau: `Có ${t.soViecCanXuLy} việc đang chờ bạn.`,
    };
  }
  if (t.dangChay) {
    return { pose: 'watch', cau: 'Đang đồng bộ, mình canh cho.' };
  }
  if (t.vuaCoTienVe) {
    return { pose: 'laugh', cau: 'Tiền về rồi!' };
  }
  // Không có việc, không có tin — ngồi yên. Đây là trạng thái *tốt*, và nó im
  // lặng: không có câu nào, vì không có gì cần nói.
  return { pose: 'content', cau: null };
}

/** Tất cả pose từng được trả về — dùng để nạp trước ảnh, và để test không sót. */
export const POSE_DUNG: readonly Pose[] = [
  'wave', 'sleep', 'surprised', 'look-side', 'watch', 'laugh', 'content',
] as const;
