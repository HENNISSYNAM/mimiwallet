/**
 * Classifies macro-economic headlines and ties them to one company's own
 * numbers.
 *
 * Deliberately deterministic keyword matching, not an LLM. Two reasons: it
 * costs nothing and cannot go down mid-demo, and a headline classifier is a
 * problem keyword rules genuinely solve — "lãi suất tăng" means the same thing
 * every time. The UI says plainly that this is rule-based; calling it AI when
 * it is a lookup table would be the kind of overclaim we have been removing.
 *
 * The part that is actually worth something is `personalImpact`: the same
 * headline lands differently on a company sitting on debt than on one with
 * none, and we know which is which.
 *
 * No Deno imports — index.ts holds the I/O so this stays Vitest-testable, the
 * same split credit-scoring/scoring.ts uses.
 */

export type Topic = 'interest_rate' | 'credit' | 'fx' | 'policy' | 'general';
export type Impact = 'positive' | 'negative' | 'neutral';

/** Lowercase, strip Vietnamese diacritics, fold đ→d. Mirrors chat/index.ts. */
export const strip = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

/**
 * Collapse to single-spaced words and pad the ends, so a phrase can be matched
 * on whole-word boundaries. Plain `includes` is wrong here: "hạ" (to cut) is a
 * substring of "điều hành" and "thảo", which made "Hội thảo về lãi suất" read
 * as a rate cut and "NHNN tăng lãi suất điều hành" read as both directions at
 * once.
 */
/**
 * Chuẩn hoá để so cụm từ theo biên từ.
 *
 * DẤU CÂU LÀ RANH GIỚI, KHÔNG PHẢI RÁC CẦN XOÁ. Bản trước thay mọi ký tự không
 * phải chữ-số bằng khoảng trắng, và điều đó cho phép hai từ rời hai bên dấu
 * phẩy **dính lại thành một cụm từ khoá**. Trường hợp thật bắt được ngày
 * 20/08/2026:
 *
 *   "OCB duy trì đóng góp ngân sách nghìn tỷ, gia tăng giá trị cho nền kinh tế"
 *      → bỏ dấu, xoá dấu phẩy →  "... nghin ty gia tang ..."
 *      → chứa cụm "ty gia"  →  bị gán nhãn TỶ GIÁ
 *
 * Một bài PR ngân hàng thành tin tỷ giá vì chữ "tỷ" đứng cạnh chữ "gia".
 *
 * Nên dấu câu ngắt mệnh đề được đổi thành `#` — ký tự không bao giờ nằm trong
 * từ khoá — thay vì bị xoá. Cụm từ vẫn khớp bình thường trong cùng một mệnh đề,
 * nhưng không ghép được qua ranh giới nữa.
 */
const pad = (s: string) =>
  ` ${strip(s)
    .replace(/[,.;:!?()[\]{}"'«»‘’“”\-–—/|]+/g, ' # ')
    .replace(/[^a-z0-9#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;

const hasPhrase = (padded: string, phrases: string[]) =>
  phrases.some((p) => padded.includes(` ${p} `));

const TOPIC_KEYWORDS: { topic: Topic; words: string[] }[] = [
  { topic: 'interest_rate', words: ['lai suat', 'lai vay'] },
  { topic: 'credit', words: ['tin dung', 'room tin dung', 'cho vay', 'no xau', 'giai ngan'] },
  { topic: 'fx', words: ['ty gia', 'usd', 'ngoai te', 'dong bac xanh'] },
  { topic: 'policy', words: ['ngan hang nha nuoc', 'nhnn', 'chinh sach', 'thong tu', 'nghi dinh', 'quy dinh'] },
];

/** Numeric direction, for topics that are a rate or a price. */
const UP = ['tang', 'nang', 'leo thang', 'vot', 'cao nhat', 'lap dinh'];
const DOWN = ['giam', 'ha', 'thap nhat', 'cat giam'];

/**
 * Credit moves on an availability axis, not a numeric one — "nới" and "siết"
 * describe how open the tap is. Folding these into UP/DOWN inverted the
 * meaning, because tightening is a restriction rather than an increase.
 */
const CREDIT_LOOSEN = ['noi', 'noi room', 'noi long', 'mo rong', 'go bo', 'ha room'];
const CREDIT_TIGHTEN = ['siet', 'that chat', 'han che', 'kiem soat chat', 'khoa room'];

export function detectTopic(text: string): Topic {
  const t = pad(text);
  for (const { topic, words } of TOPIC_KEYWORDS) {
    if (hasPhrase(t, words)) return topic;
  }
  return 'general';
}

/**
 * Impact is judged for an SME that borrows — the audience of this app. Rates
 * going up is bad news here even though it is good news for a depositor, and
 * saying so is more useful than a neutral label.
 */
export function detectImpact(text: string, topic: Topic): Impact {
  const t = pad(text);

  if (topic === 'credit') {
    const loosen = hasPhrase(t, CREDIT_LOOSEN);
    const tighten = hasPhrase(t, CREDIT_TIGHTEN);
    if (loosen === tighten) return 'neutral';
    return loosen ? 'positive' : 'negative';
  }

  const up = hasPhrase(t, UP);
  const down = hasPhrase(t, DOWN);
  if (up === down) return 'neutral'; // both or neither — no clear direction

  switch (topic) {
    case 'interest_rate':
      return up ? 'negative' : 'positive'; // cost of borrowing
    case 'fx':
      return up ? 'negative' : 'positive'; // weaker dong raises import costs
    default:
      return 'neutral';
  }
}

/**
 * Phân loại một bài báo. CHỈ ĐỌC TIÊU ĐỀ, có chủ ý.
 *
 * Bản trước quét `title + summary`, và đo trên 200 tin thật ngày 20/08/2026 cho
 * thấy nó hỏng theo một kiểu cụ thể: **một lần nhắc tới từ khoá ở bất kỳ đâu
 * trong tóm tắt là đủ để gán nhãn.** Bài không có khái niệm "bài này nói VỀ cái
 * gì". Kết quả thật:
 *
 *   fx            ← "CEO hãng robot hình người Trung Quốc thành tỷ phú"
 *   fx            ← "OCB duy trì đóng góp ngân sách nghìn tỷ"
 *   credit        ← "Dồn nguồn lực cho mục tiêu 1,14 triệu căn nhà ở xã hội"
 *   policy        ← "Cam kết bền vững của ngành thời trang có thực sự bền vững?"
 *   interest_rate ← "Bitcoin trở lại mốc 70.000 USD"
 *
 * Bài về Bitcoin có "USD" trong tóm tắt thành tin tỷ giá. Bài PR ngân hàng có
 * chữ "tỷ" thành tin tỷ giá.
 *
 * Tiêu đề thì khác: nó là chỗ toà soạn tuyên bố bài viết nói về cái gì, và với
 * báo tiếng Việt nó thường mang cả chiều ("tăng", "giảm"). Đổi sang chỉ đọc tiêu
 * đề làm số tin qua cổng lọc giảm từ 24 xuống 9 trên cùng 200 tin — ít hơn,
 * nhưng 33 nhãn đổi và mọi trường hợp kiểm tay đều đổi theo hướng đúng, gồm cả
 * "Những vùng đệm hỗ trợ tỷ giá ổn định" từ `interest_rate` sang `fx`.
 *
 * Ít mà đúng thì hơn nhiều mà sai: thẻ tin hằng ngày chỉ hiện MỘT mục, nên một
 * nhãn sai đẩy thẳng một bài không liên quan lên chỗ trang trọng nhất màn hình.
 *
 * `summary` giữ lại trong chữ ký để nơi gọi không phải đổi, và để lần sau ai đó
 * định dùng nó thì đọc được ghi chú này trước.
 */
export function classify(
  title: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  summary = '',
): { topic: Topic; impact: Impact } {
  const topic = detectTopic(title);
  return { topic, impact: detectImpact(title, topic) };
}

export interface CompanyContext {
  /** Outstanding loan principal, VND. */
  outstandingDebt: number;
  /** Normalised 0–100 scores keyed by factor name, from credit_score_factors. */
  factorScores: Record<string, number>;
  /** Net operating cash flow over the trailing window, VND. */
  netCashFlow: number;
}

const fmtVnd = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} tỷ ₫`;
  if (abs >= 1_000_000) return `${Math.round(n / 1_000_000)} triệu ₫`;
  return `${Math.round(n).toLocaleString('vi-VN')} ₫`;
};

/**
 * Why this headline matters to *this* company, or null when it genuinely does
 * not. Returning null is the point: a company with no debt should not be shown
 * a warning about interest rates just to fill the card.
 */
export function personalImpact(topic: Topic, impact: Impact, ctx: CompanyContext): string | null {
  const weakRepayment = (ctx.factorScores.loanRepaymentRatio ?? 100) < 60;
  const weakCashFlow = (ctx.factorScores.cashFlowVolatility ?? 100) < 60;
  const weakExpense = (ctx.factorScores.expenseToIncomeRatio ?? 100) < 60;

  if (topic === 'interest_rate' && ctx.outstandingDebt > 0) {
    const base = `Bạn đang có dư nợ ${fmtVnd(ctx.outstandingDebt)}`;
    if (impact === 'negative') {
      return weakRepayment
        ? `${base} và chỉ số trả nợ đang yếu — lãi suất tăng sẽ tác động trực tiếp tới chi phí vốn.`
        : `${base} — lãi suất tăng làm chi phí vốn nhích lên, nên cân nhắc trước khi vay thêm.`;
    }
    if (impact === 'positive') return `${base} — lãi suất hạ là cơ hội để cơ cấu lại khoản vay.`;
  }

  if (topic === 'credit') {
    if (impact === 'positive') return 'Tín dụng nới lỏng là thời điểm thuận lợi để xin tăng hạn mức.';
    if (impact === 'negative' && weakRepayment)
      return 'Tín dụng bị siết trong khi chỉ số trả nợ của bạn đang yếu — nên ưu tiên cải thiện điểm trước khi vay.';
  }

  if (topic === 'fx' && impact === 'negative' && weakExpense) {
    return 'Tỷ giá tăng đẩy chi phí nhập hàng lên, trong khi tỷ lệ chi phí/doanh thu của bạn đang cao.';
  }

  if (topic === 'policy' && weakCashFlow && ctx.netCashFlow < 0) {
    return 'Dòng tiền ròng của bạn đang âm — theo dõi thay đổi chính sách để chủ động kế hoạch vốn.';
  }

  return null;
}
