/**
 * Trò chuyện thường khi CHƯA có mô hình AI (26/09/2026).
 *
 * "mimi ơi", "nói chuyện được không", "bạn là ai", "cảm ơn" không phải câu hỏi về số liệu, nhưng trả
 * "Mình chưa hiểu câu này" cho chúng làm MIMI thành cái máy. Ở đây trả lời tự nhiên cho vài kiểu câu
 * giao tiếp. Không bịa số, không trả lời kiến thức chuyên môn bằng câu viết sẵn — phần đó cần mô hình
 * AI hoặc năng lực đọc dữ liệu thật.
 */
import { boDau } from './y-dinh.ts';

const GIOI_THIEU = 'Mình là MIMI — trợ lý AI của công ty bạn, mạnh nhất về kế toán – kiểm toán, thuế, hải quan, tài chính và đầu tư.';
const GOI_Y = 'Bạn có thể hỏi mình kiểu: "Doanh thu quý này bao nhiêu?", "Sắp tới hạn thuế nào?", "Khoản chi nào thiếu hoá đơn?", "Ai đang nợ tôi?".';

const MAU: ReadonlyArray<readonly [RegExp, string]> = [
  [/^(cam on|thank|thanks|tks|ok cam on)\b/, 'Không có gì! Cần gì về sổ sách, thuế hay dòng tiền cứ gọi mình nhé.'],
  [/\b(ban la ai|may la ai|mimi la ai|ban la gi|gioi thieu)\b/, `${GIOI_THIEU} Mình đọc dữ liệu thật của công ty (ngân hàng, hoá đơn, chứng từ) để trả lời, và chỉ làm việc gì khi bạn xác nhận. ${GOI_Y}`],
  [/\b(lam duoc gi|giup duoc gi|biet lam gi|co the lam gi)\b/, `Mình theo dõi tiền vào – ra, doanh thu, hạn thuế, hoá đơn, chứng từ và công nợ của công ty, soạn giấy tờ và nhắc việc trước hạn. ${GOI_Y}`],
  [/\b(noi chuyen|nch|tro chuyen|chat|tam su)\b/, `Được chứ, mình nghe đây! ${GIOI_THIEU} Bạn đang cần xem gì hôm nay?`],
  [/^(mimi|mi mi)?\s*(oi|a|ah|day)?\s*$|^(xin chao|chao|hello|hi|alo|hey)\b|^mimi (oi|a)\b/, `Mình đây! ${GIOI_THIEU} Hôm nay bạn cần mình xem gì — dòng tiền, doanh thu, hạn thuế hay chứng từ?`],
];

/** Câu giao tiếp thường → câu đáp tự nhiên; không phải thì `null`. */
export function traLoiTroChuyen(cau: string | undefined): string | null {
  const s = boDau(cau ?? '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s || s.length > 80) return null;
  for (const [re, tl] of MAU) if (re.test(s)) return tl;
  return null;
}

/** Không nhận ra câu (và chưa có mô hình AI): nói thật vì sao, và hỏi được gì — không cụt lủn. */
export const CAU_CHUA_HIEU_TU_NHIEN =
  `Câu này mình chưa trả lời được: MIMI đang chạy ở chế độ hiểu theo mẫu có sẵn nên chưa trò chuyện tự do như một AI đầy đủ. ${GOI_Y}`;
