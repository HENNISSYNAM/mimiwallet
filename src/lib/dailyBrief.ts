/**
 * Bản tin mỗi ngày — một thẻ duy nhất trên Tổng quan.
 *
 * QUAN TRỌNG, VÀ ĐÂY LÀ RÀNG BUỘC THIẾT KẾ CHỨ KHÔNG PHẢI GHI CHÚ:
 * module này **chọn**, không **sinh ra**. Không có chỗ nào ở đây viết ra một
 * dòng tin kinh tế mới. Tin đến từ `macro_news`, vốn được `macro-news` kéo về
 * từ RSS công khai của VnExpress và CafeF, có `url` gốc để bấm vào kiểm chứng.
 * Một mô hình ngôn ngữ viết ra "lãi suất hôm nay giảm 0,5%" sẽ trông y hệt tin
 * thật và không ai phát hiện được — nên đường đó bị đóng ngay từ kiến trúc.
 *
 * Phần duy nhất do MIMI tự viết là các TIP: kiến thức vận hành, mỗi tip có
 * `nguon` khi nó dẫn luật. Tip không giả làm tin, và giao diện phải hiển thị
 * hai loại này khác nhau.
 *
 * VÌ SAO TẤT ĐỊNH THEO NGÀY (`ngay` → cùng một thẻ):
 * Người dùng mở app ba lần một ngày. Nếu mỗi lần một thẻ khác thì đó là máy
 * quay số, không phải bản tin — và người ta sẽ bấm lại cho tới khi ra thẻ vừa
 * ý thay vì đọc. Cùng một ngày, cùng một công ty ⇒ cùng một thẻ.
 */

export type BriefKind = 'news' | 'tip';

export interface NewsItem {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  source: string;
  published_at: string;
  topic: string;
  impact: string;
}

export interface Tip {
  id: string;
  /** Dòng nhỏ phía trên tiêu đề. */
  eyebrow: string;
  title: string;
  body: string;
  /** Bắt buộc khi tip dẫn luật hoặc số liệu. Để trống chỉ khi là thói quen vận hành. */
  nguon?: string;
}

export type DailyBrief =
  | { kind: 'news'; item: NewsItem }
  | { kind: 'tip'; tip: Tip };

/**
 * Băm chuỗi thành số nguyên không âm (FNV-1a 32-bit).
 *
 * Dùng băm thay vì `Date.getTime() % n` để hai công ty mở app cùng ngày không
 * nhận đúng một thẻ — `companyId` nằm trong chuỗi băm.
 */
export function bam(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Số ngày kể từ mốc epoch — dùng làm chỉ số xoay vòng cho tip. */
export function chiSoNgay(ngay: string): number {
  return Math.floor(Date.parse(`${ngay}T00:00:00Z`) / 86_400_000);
}

/**
 * Tin có đáng lên thẻ hôm nay không.
 *
 * Ba điều kiện, và cả ba đều nhằm một việc: thẻ chiếm chỗ đẹp nhất màn hình,
 * nên nó phải trả lại thứ gì đó dùng được, không phải một dòng tiêu đề bất kỳ.
 *
 *   1. Còn mới — quá `SO_NGAY_CON_MOI` ngày thì đó là lưu trữ, không phải tin.
 *   2. Có chủ đề — `general` nghĩa là bộ phân loại không nhận ra đây nói về
 *      lãi suất, tín dụng, tỷ giá hay chính sách. Không nhận ra thì không có
 *      cơ sở nào nói nó liên quan tới người đọc.
 *   3. Có chiều — `neutral` nghĩa là không biết tin này tốt hay xấu cho một
 *      doanh nghiệp đang vay. Nói "có tin về lãi suất" mà không nói tăng hay
 *      giảm thì chưa giúp được gì.
 *
 * Không đủ ba điều kiện thì thà đưa tip. Một tip đúng có ích hơn một tiêu đề
 * chung chung được đóng khung cho ra vẻ quan trọng.
 */
export const SO_NGAY_CON_MOI = 3;

export function tinDangDua(item: NewsItem, ngay: string): boolean {
  const tuoi = (Date.parse(`${ngay}T23:59:59Z`) - Date.parse(item.published_at)) / 86_400_000;
  if (!Number.isFinite(tuoi) || tuoi < 0 || tuoi > SO_NGAY_CON_MOI) return false;
  if (item.topic === 'general') return false;
  if (item.impact === 'neutral') return false;
  return true;
}

/**
 * Cứ `CHU_KY_TIP` ngày thì một ngày dành cho tip, kể cả khi có tin tốt.
 *
 * Đây là "lâu lâu sẽ là tip" được viết thành quy tắc. Nếu tip chỉ xuất hiện khi
 * không có tin nào đạt chuẩn thì tip thành thứ lấp chỗ trống, và vào tuần nhiều
 * tin sẽ biến mất hẳn — trong khi tip mới là phần dạy người dùng dùng sản phẩm.
 */
export const CHU_KY_TIP = 3;

export function laNgayCuaTip(ngay: string, companyId: string): boolean {
  return (chiSoNgay(ngay) + bam(companyId)) % CHU_KY_TIP === 0;
}

/**
 * Chọn thẻ cho hôm nay.
 *
 * `news` chỉ được chọn trong số tin đạt chuẩn, và chọn tất định: cùng ngày,
 * cùng công ty, cùng danh sách ⇒ cùng tin.
 */
export function chonBanTin(
  news: NewsItem[],
  tips: Tip[],
  ngay: string,
  companyId: string,
): DailyBrief | null {
  const uuTienTip = laNgayCuaTip(ngay, companyId);

  if (!uuTienTip) {
    const dat = news
      .filter((n) => tinDangDua(n, ngay))
      // Sắp xếp theo id để thứ tự truy vấn đổi cũng không đổi kết quả.
      .sort((a, b) => a.id.localeCompare(b.id));
    if (dat.length) {
      return { kind: 'news', item: dat[bam(`${ngay}|${companyId}`) % dat.length] };
    }
  }

  if (!tips.length) return null;
  // Xoay vòng theo ngày để tip không lặp lại hai hôm liền.
  return { kind: 'tip', tip: tips[(chiSoNgay(ngay) + bam(companyId)) % tips.length] };
}

/**
 * Bộ tip do MIMI viết.
 *
 * Mỗi tip dẫn luật đều có `nguon`. Các mốc thuế dưới đây đã được đối chiếu với
 * công bố trên baochinhphu.vn — đặc biệt là ngày hiệu lực 01/07/2026, thứ trước
 * đây từng bị ghi nhầm thành 01/01/2026 trong chính repo này vì suy ra thay vì
 * đọc. Sửa một tip ở đây là sửa thứ hiển thị cho người dùng, nên đừng thêm số
 * nào mà không có nguồn đi kèm.
 */
export const TIPS: Tip[] = [
  {
    id: 'thue-khoan-bo',
    eyebrow: 'Từ 2026: bỏ thuế khoán',
    title: 'Đóng thuế trên lợi nhuận, không phải trên doanh thu',
    body:
      'Thuế khoán chấm dứt từ 01/01/2026, hộ kinh doanh tự kê khai theo doanh thu thật. ' +
      'Với mức doanh thu 500 triệu – 3 tỷ, luật cho bạn CHỌN tính theo lợi nhuận hay theo ' +
      '% doanh thu — nhưng chọn theo lợi nhuận chỉ có nghĩa khi chứng minh được chi phí. ' +
      'MIMI đọc sao kê ngân hàng và dựng sẵn bộ chi phí đó.',
    nguon: 'Luật Thuế thu nhập cá nhân, áp dụng cho thu nhập kinh doanh từ 01/07/2026',
  },
  {
    id: 'noi-dung-chuyen-khoan',
    eyebrow: 'Mẹo vận hành',
    title: 'Số hoá đơn trong nội dung chuyển khoản đáng giá bằng một buổi đối soát',
    body:
      'Khi khách ghi rõ số hoá đơn, MIMI khớp được ngay và không cần ai xác nhận. ' +
      'Khi chỉ có tên công ty, hệ thống phải đoán và phân bổ vào hoá đơn cũ nhất. ' +
      'Một dòng đề nghị trong email báo công nợ đổi được phần lớn số này.',
  },
  {
    id: 'mst-doi-tac',
    eyebrow: 'Rủi ro công nợ',
    title: 'Tra mã số thuế đối tác trước khi giao hàng chịu',
    body:
      'Một công ty đã ngừng hoạt động và đóng mã số thuế vẫn nhận hàng bình thường — ' +
      'chỉ khoản phải thu là không đòi được. Trạng thái người nộp thuế tra được trong ' +
      'vài giây từ Danh bạ khách hàng, và MIMI ghi lại ngày tra để bạn biết thông tin ' +
      'đó còn mới hay đã cũ.',
  },
  {
    id: 'so-dinh-danh',
    eyebrow: 'Thay đổi giấy tờ',
    title: 'Mã số thuế cá nhân đã được thay bằng số căn cước 12 số',
    body:
      'Từ 01/07/2025, số định danh cá nhân dùng thay cho mã số thuế của cá nhân và ' +
      'hộ kinh doanh. Nếu danh bạ của bạn còn mã 10 số cũ cho một hộ kinh doanh, ' +
      'nhiều khả năng nó đã hết dùng được cho tra cứu và hoá đơn.',
    nguon: 'Quy định về sử dụng số định danh cá nhân thay mã số thuế, hiệu lực 01/07/2025',
  },
  {
    id: 'chi-phi-tien-mat',
    eyebrow: 'Chuẩn bị hồ sơ',
    title: 'Chi tiền mặt là khoản khó chứng minh nhất khi quyết toán',
    body:
      'Khoản chi qua ngân hàng để lại dấu vết ngày, số tiền và người nhận — dựng thành ' +
      'chứng từ được. Khoản chi tiền mặt không để lại gì ngoài trí nhớ. Chuyển dần các ' +
      'khoản chi thường xuyên sang chuyển khoản là cách rẻ nhất để tăng phần chi phí ' +
      'được chấp nhận.',
  },
  {
    id: 'doi-soat-som',
    eyebrow: 'Mẹo vận hành',
    title: 'Đối soát hằng tuần rẻ hơn đối soát cuối quý rất nhiều',
    body:
      'Một giao dịch không rõ nguồn gốc, hỏi lại sau ba ngày thì kế toán bên kia còn nhớ. ' +
      'Hỏi sau ba tháng thì thành một buổi truy tìm. Số lượng giao dịch chưa khớp là chỉ ' +
      'số đáng theo dõi hằng tuần hơn là số dư.',
  },
  {
    id: 'nguong-doanh-thu',
    eyebrow: 'Ngưỡng cần biết',
    title: 'Doanh thu vượt mốc làm đổi cả bậc thuế lẫn nghĩa vụ sổ sách',
    body:
      'Các mốc 500 triệu, 3 tỷ và 50 tỷ chia ra những bậc thuế khác nhau cho thu nhập ' +
      'kinh doanh. Biết mình đang cách mốc kế tiếp bao xa vào giữa năm thì còn xoay được; ' +
      'biết vào tháng 12 thì chỉ còn cách chấp nhận.',
    nguon: 'Biểu thuế thu nhập cá nhân đối với thu nhập từ kinh doanh',
  },
];
