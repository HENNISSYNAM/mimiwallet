// Static fintech micro-lesson library. Each lesson is tagged with a `factor`
// key matching the 5 credit-scoring features (see supabase credit-scoring), so
// LearnPage can surface lessons targeting a company's weakest factors first.
// Content is intentionally static (no LLM dependency) for reliability.

import {
  RevenueTrend,
  CostRatio,
  InvoiceDoc,
  BankPillars,
  FlowWave,
  LearnCap,
  type BrandIconProps,
} from '@/components/illustrations/BrandIcons';

export type FactorKey =
  | 'revenueTrend'
  | 'expenseToIncomeRatio'
  | 'invoicePunctuality'
  | 'loanRepaymentRatio'
  | 'cashFlowVolatility'
  | 'general';

export type Level = 'basic' | 'inter' | 'advanced';

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number; // index of correct option
}

export interface Lesson {
  id: string;
  factor: FactorKey;
  level: Level;
  title: string;
  minutes: number;
  summary: string;
  sections: { heading: string; body: string }[];
  quiz: QuizQuestion[];
}

export const FACTOR_LABEL: Record<FactorKey, string> = {
  revenueTrend: 'Xu hướng doanh thu',
  expenseToIncomeRatio: 'Tỷ lệ chi phí/doanh thu',
  invoicePunctuality: 'Lịch sử thanh toán hóa đơn',
  loanRepaymentRatio: 'Lịch sử trả nợ vay',
  cashFlowVolatility: 'Ổn định dòng tiền',
  general: 'Kiến thức nền',
};

/**
 * Line icons rather than emoji: emoji render differently on every platform,
 * cannot inherit colour, and read as placeholder art next to a real UI.
 */
export const FACTOR_ICON: Record<FactorKey, (p: BrandIconProps) => JSX.Element> = {
  revenueTrend: RevenueTrend,
  expenseToIncomeRatio: CostRatio,
  invoicePunctuality: InvoiceDoc,
  loanRepaymentRatio: BankPillars,
  cashFlowVolatility: FlowWave,
  general: LearnCap,
};

export const LEVEL_LABEL: Record<Level, string> = {
  basic: 'Cơ bản',
  inter: 'Trung cấp',
  advanced: 'Nâng cao',
};

export const LESSONS: Lesson[] = [
  // ── general ──
  {
    id: 'g-credit-score-101',
    factor: 'general',
    level: 'basic',
    title: 'Điểm tín dụng doanh nghiệp là gì?',
    minutes: 3,
    summary: 'Hiểu điểm 300–850 được tính thế nào và vì sao nó quyết định hạn mức, lãi suất bạn nhận được.',
    sections: [
      { heading: 'Điểm tín dụng phản ánh điều gì', body: 'Điểm tín dụng là con số 300–850 tóm tắt khả năng trả nợ của doanh nghiệp bạn. Điểm càng cao, tổ chức cho vay càng tin tưởng, nên bạn được hạn mức lớn hơn và lãi suất thấp hơn. Với Mimi Wallet, điểm được tính tự động từ dữ liệu giao dịch thật của bạn thay vì hồ sơ tài chính phức tạp.' },
      { heading: '5 yếu tố cấu thành', body: 'Điểm được ghép từ 5 yếu tố: (1) xu hướng doanh thu, (2) tỷ lệ chi phí trên doanh thu, (3) mức độ đúng hạn của hóa đơn, (4) lịch sử trả nợ vay, (5) độ ổn định của dòng tiền. Mỗi yếu tố được chuẩn hóa về thang 0–100 rồi cộng theo trọng số.' },
      { heading: 'Điểm có thay đổi được không', body: 'Có. Điểm cập nhật mỗi khi bạn thêm dữ liệu mới. Cải thiện hành vi ở yếu tố yếu nhất là cách nhanh nhất để tăng điểm — đó cũng là lý do các bài học ở đây được cá nhân hóa theo điểm yếu của bạn.' },
    ],
    quiz: [
      { q: 'Điểm tín dụng cao mang lại lợi ích gì?', options: ['Hạn mức lớn hơn, lãi suất thấp hơn', 'Không ảnh hưởng gì', 'Chỉ để trưng bày'], answer: 0 },
      { q: 'Điểm được tính từ đâu?', options: ['Cảm tính của nhân viên', 'Dữ liệu giao dịch thật, qua 5 yếu tố', 'Số vốn điều lệ'], answer: 1 },
    ],
  },
  {
    id: 'g-working-capital',
    factor: 'general',
    level: 'basic',
    title: 'Vốn lưu động: mạch máu của SME',
    minutes: 3,
    summary: 'Vốn lưu động là gì, vì sao thiếu nó khiến doanh nghiệp lành mạnh vẫn có thể "chết" vì kẹt tiền.',
    sections: [
      { heading: 'Định nghĩa đơn giản', body: 'Vốn lưu động = tài sản ngắn hạn (tiền, hàng tồn, khoản phải thu) trừ nợ ngắn hạn phải trả. Đây là lượng tiền bạn có thể xoay sở trong ngắn hạn để duy trì hoạt động: trả lương, nhập hàng, trả nhà cung cấp.' },
      { heading: 'Vì sao quan trọng', body: 'Một doanh nghiệp có lãi vẫn có thể phá sản nếu hết tiền mặt đúng lúc cần chi. Ví dụ: bạn bán được hàng nhưng khách trả chậm 60 ngày, trong khi nhà cung cấp đòi tiền ngay — khoảng trống đó chính là lúc cần vốn lưu động.' },
      { heading: 'Cách Mimi Wallet hỗ trợ', body: 'Bạn có thể ứng trước tiền từ hóa đơn chưa đến hạn (invoice factoring) hoặc vay vốn lưu động theo hạn mức dựa trên điểm tín dụng — lấp đúng khoảng trống tiền mặt mà không phải chờ khách thanh toán.' },
    ],
    quiz: [
      { q: 'Doanh nghiệp có lãi có thể gặp rủi ro gì?', options: ['Không rủi ro nào', 'Hết tiền mặt dù vẫn có lãi', 'Bị đánh thuế gấp đôi'], answer: 1 },
      { q: 'Ứng vốn hóa đơn giúp gì?', options: ['Nhận tiền sớm từ hóa đơn chưa tới hạn', 'Xóa nợ thuế', 'Tăng vốn điều lệ'], answer: 0 },
    ],
  },
  {
    id: 'g-cashflow-basics',
    factor: 'general',
    level: 'basic',
    title: 'Đọc dòng tiền trong 5 phút',
    minutes: 2,
    summary: 'Phân biệt lợi nhuận và dòng tiền — hai thứ dễ nhầm nhưng quyết định sự sống còn khác nhau.',
    sections: [
      { heading: 'Lợi nhuận ≠ dòng tiền', body: 'Lợi nhuận là con số kế toán (doanh thu trừ chi phí). Dòng tiền là tiền thật vào–ra tài khoản. Bạn có thể ghi nhận lãi trên sổ nhưng tiền chưa về (khách nợ), nên phải theo dõi dòng tiền để biết mình thực sự có bao nhiêu để chi.' },
      { heading: 'Dòng tiền ròng theo tháng', body: 'Mỗi tháng, lấy tổng thu trừ tổng chi ra dòng tiền ròng. Nếu ròng dương đều đặn, doanh nghiệp khỏe. Nếu âm nhiều tháng liên tiếp, cần hành động ngay: giục thu công nợ, giãn chi, hoặc bổ sung vốn.' },
    ],
    quiz: [
      { q: 'Điều nào đúng?', options: ['Lợi nhuận luôn bằng tiền mặt trong tài khoản', 'Có thể có lãi trên sổ nhưng chưa có tiền thật', 'Dòng tiền không cần theo dõi'], answer: 1 },
    ],
  },

  // ── revenueTrend ──
  {
    id: 'rt-grow-steady',
    factor: 'revenueTrend',
    level: 'basic',
    title: 'Tăng trưởng doanh thu đều đặn',
    minutes: 3,
    summary: 'Vì sao đà tăng ổn định quan trọng hơn một tháng bùng nổ rồi tụt dốc.',
    sections: [
      { heading: 'Xu hướng > con số tuyệt đối', body: 'Mô hình chấm điểm nhìn vào độ dốc doanh thu theo tháng (xu hướng), không chỉ số tiền một tháng. Doanh thu tăng đều 5%/tháng được đánh giá cao hơn một tháng tăng vọt rồi các tháng sau lao dốc, vì nó cho thấy hoạt động bền vững.' },
      { heading: '3 đòn bẩy tăng doanh thu bền', body: '1) Giữ chân khách cũ (chi phí thấp hơn tìm khách mới); 2) Tăng giá trị đơn hàng trung bình bằng bán kèm/nâng cấp; 3) Mở rộng kênh bán ổn định thay vì phụ thuộc một nguồn.' },
      { heading: 'Ghi nhận đầy đủ doanh thu', body: 'Đảm bảo mọi giao dịch thu được ghi vào hệ thống (qua sao kê hoặc nhập tay). Doanh thu bị bỏ sót làm điểm của bạn thấp hơn thực tế.' },
    ],
    quiz: [
      { q: 'Điều nào tốt cho điểm xu hướng doanh thu?', options: ['Tăng đều đặn nhiều tháng', 'Một tháng bùng nổ rồi tụt', 'Doanh thu thất thường'], answer: 0 },
      { q: 'Cách rẻ nhất để tăng doanh thu bền?', options: ['Chỉ tìm khách mới', 'Giữ chân khách cũ và bán kèm', 'Giảm giá liên tục'], answer: 1 },
    ],
  },
  {
    id: 'rt-diversify',
    factor: 'revenueTrend',
    level: 'inter',
    title: 'Đa dạng nguồn thu để giảm rủi ro',
    minutes: 3,
    summary: 'Phụ thuộc một khách lớn là con dao hai lưỡi — cách phân tán rủi ro doanh thu.',
    sections: [
      { heading: 'Rủi ro tập trung', body: 'Nếu 1 khách chiếm >40% doanh thu, mất họ là mất gần nửa doanh nghiệp. Tổ chức cho vay cũng e ngại điều này. Hãy đặt mục tiêu không khách nào vượt 20–30% doanh thu.' },
      { heading: 'Chiến lược mở rộng', body: 'Thêm dòng sản phẩm bổ trợ, tiếp cận nhóm khách mới (B2B song song B2C), hoặc thêm kênh phân phối (sàn TMĐT bên cạnh bán trực tiếp). Mỗi nguồn thu mới là một lớp đệm an toàn.' },
    ],
    quiz: [
      { q: 'Một khách chiếm 50% doanh thu là dấu hiệu gì?', options: ['Rất an toàn', 'Rủi ro tập trung cao', 'Không liên quan tín dụng'], answer: 1 },
    ],
  },

  // ── expenseToIncomeRatio ──
  {
    id: 'ex-cost-control',
    factor: 'expenseToIncomeRatio',
    level: 'basic',
    title: 'Kiểm soát tỷ lệ chi phí/doanh thu',
    minutes: 3,
    summary: 'Giữ chi phí dưới ngưỡng lành mạnh để mỗi đồng doanh thu tạo ra nhiều lợi nhuận hơn.',
    sections: [
      { heading: 'Tỷ lệ này nói gì', body: 'Tỷ lệ chi phí/doanh thu = tổng chi ÷ tổng thu. Ví dụ chi 65 triệu để tạo 100 triệu doanh thu → tỷ lệ 65%. Tỷ lệ dưới ~60% thường được xem là lành mạnh; càng thấp, biên lợi nhuận càng dày và điểm càng cao.' },
      { heading: 'Phân loại chi phí', body: 'Chia chi phí thành cố định (thuê mặt bằng, lương) và biến đổi (nhập hàng, vận chuyển). Rà soát định kỳ: chi phí cố định nào có thể đàm phán lại? Chi phí biến đổi nào tăng nhanh hơn doanh thu?' },
      { heading: 'Hành động nhanh', body: 'Đàm phán lại với nhà cung cấp lớn nhất, cắt các khoản đăng ký/dịch vụ không dùng, gộp đơn nhập để được chiết khấu. Ghi lại mọi khoản chi để hệ thống phản ánh đúng tỷ lệ.' },
    ],
    quiz: [
      { q: 'Chi 70 triệu tạo 100 triệu doanh thu, tỷ lệ chi phí là?', options: ['30%', '70%', '170%'], answer: 1 },
      { q: 'Ngưỡng tỷ lệ chi phí thường được coi là lành mạnh?', options: ['Dưới ~60%', 'Trên 90%', 'Đúng 100%'], answer: 0 },
    ],
  },
  {
    id: 'ex-margin',
    factor: 'expenseToIncomeRatio',
    level: 'inter',
    title: 'Hiểu biên lợi nhuận để định giá đúng',
    minutes: 3,
    summary: 'Định giá bán mà không biết biên lợi nhuận là đi trong bóng tối.',
    sections: [
      { heading: 'Biên lợi nhuận gộp', body: 'Biên gộp = (doanh thu − giá vốn) ÷ doanh thu. Nó cho biết mỗi đồng bán ra còn lại bao nhiêu sau khi trừ chi phí trực tiếp. Biết con số này giúp bạn định giá đủ bù chi phí cố định và có lãi.' },
      { heading: 'Bẫy giảm giá', body: 'Giảm giá 10% có thể xóa sạch lợi nhuận nếu biên gộp chỉ 20%. Trước khi khuyến mãi, tính xem cần bán thêm bao nhiêu để bù phần biên mất đi.' },
    ],
    quiz: [
      { q: 'Biên gộp thấp thì giảm giá mạnh sẽ?', options: ['Luôn có lợi', 'Dễ xóa sạch lợi nhuận', 'Không ảnh hưởng'], answer: 1 },
    ],
  },

  // ── invoicePunctuality ──
  {
    id: 'ip-collect-ontime',
    factor: 'invoicePunctuality',
    level: 'basic',
    title: 'Thu hồi công nợ đúng hạn',
    minutes: 3,
    summary: 'Hóa đơn được trả đúng hạn nâng điểm và giữ dòng tiền khỏe.',
    sections: [
      { heading: 'Vì sao đúng hạn quan trọng', body: 'Yếu tố này đo tỷ lệ hóa đơn được thanh toán đúng hạn so với quá hạn. Hóa đơn quá hạn vừa làm nghẽn dòng tiền, vừa kéo điểm tín dụng xuống. Đúng hạn = uy tín + tiền về đều.' },
      { heading: 'Quy trình thu nợ hiệu quả', body: '1) Ghi rõ hạn thanh toán trên hóa đơn; 2) Nhắc trước 3 ngày tới hạn; 3) Nhắc ngay ngày quá hạn đầu tiên; 4) Ưu đãi nhỏ cho khách trả sớm, phí trễ cho khách trả muộn.' },
      { heading: 'Dùng ứng vốn khi cần', body: 'Nếu khách lớn trả chậm nhưng bạn cần tiền, ứng vốn hóa đơn giúp nhận ~80% giá trị ngay, thay vì để tiền kẹt và dòng tiền âm.' },
    ],
    quiz: [
      { q: 'Hóa đơn quá hạn ảnh hưởng gì?', options: ['Nghẽn dòng tiền và giảm điểm', 'Tăng điểm tín dụng', 'Không ảnh hưởng'], answer: 0 },
      { q: 'Khi nào nên nhắc khách lần đầu?', options: ['Sau 30 ngày quá hạn', 'Trước khi tới hạn vài ngày', 'Không cần nhắc'], answer: 1 },
    ],
  },
  {
    id: 'ip-terms',
    factor: 'invoicePunctuality',
    level: 'inter',
    title: 'Thiết kế điều khoản thanh toán thông minh',
    minutes: 3,
    summary: 'Điều khoản rõ ràng ngăn tranh chấp và giúp tiền về nhanh hơn.',
    sections: [
      { heading: 'Điều khoản Net-X', body: 'Net-30 nghĩa là khách phải trả trong 30 ngày. Với dòng tiền chặt, cân nhắc Net-15 hoặc yêu cầu đặt cọc trước. Điều khoản ngắn hơn = tiền về nhanh hơn.' },
      { heading: 'Chiết khấu thanh toán sớm', body: 'Ưu đãi kiểu "2/10 Net-30" (giảm 2% nếu trả trong 10 ngày) khuyến khích khách trả sớm, cải thiện mạnh mức đúng hạn của hóa đơn.' },
    ],
    quiz: [
      { q: '"Net-15" nghĩa là gì?', options: ['Trả trong 15 ngày', 'Giảm 15%', 'Vay 15 tháng'], answer: 0 },
    ],
  },

  // ── loanRepaymentRatio ──
  {
    id: 'lr-repay-discipline',
    factor: 'loanRepaymentRatio',
    level: 'basic',
    title: 'Kỷ luật trả nợ đúng tiến độ',
    minutes: 3,
    summary: 'Lịch sử trả nợ tốt là bằng chứng mạnh nhất cho uy tín tín dụng.',
    sections: [
      { heading: 'Yếu tố này đo gì', body: 'Tỷ lệ trả nợ = số tiền đã hoàn trả ÷ tổng đã vay. Trả đúng và đủ theo tiến độ chứng minh bạn quản trị nợ tốt, giúp điểm tăng và mở đường cho các khoản vay lớn hơn sau này.' },
      { heading: 'Vay đúng nhu cầu', body: 'Chỉ vay số tiền và thời hạn phù hợp với dòng tiền trả nợ của bạn. Vay quá khả năng dẫn tới trễ hạn — hại điểm nhiều hơn lợi ích ngắn hạn.' },
      { heading: 'Lịch trả tự động', body: 'Đặt nhắc/tự động trích trả đúng ngày. Một lần trễ có thể xóa nhiều tháng xây dựng uy tín. Nếu lường trước khó khăn, chủ động thương lượng giãn nợ trước khi trễ.' },
    ],
    quiz: [
      { q: 'Điều gì tốt cho điểm trả nợ?', options: ['Trả đúng và đủ theo tiến độ', 'Trễ vài lần cũng được', 'Vay càng nhiều càng tốt'], answer: 0 },
      { q: 'Nên vay bao nhiêu?', options: ['Tối đa có thể', 'Phù hợp dòng tiền trả nợ', 'Không cần tính toán'], answer: 1 },
    ],
  },
  {
    id: 'lr-debt-structure',
    factor: 'loanRepaymentRatio',
    level: 'advanced',
    title: 'Cơ cấu nợ và chi phí vốn',
    minutes: 3,
    summary: 'Phân biệt nợ tốt và nợ xấu, và cách giữ chi phí vốn hợp lý.',
    sections: [
      { heading: 'Nợ tốt vs nợ xấu', body: 'Nợ tốt tạo ra dòng tiền lớn hơn chi phí lãi (vay nhập hàng bán có lãi). Nợ xấu tài trợ chi tiêu không sinh lời. Ưu tiên nợ tốt và trả dứt điểm nợ lãi cao trước.' },
      { heading: 'Lãi suất hiệu dụng', body: 'Đừng chỉ nhìn lãi suất công bố — tính cả phí để ra lãi hiệu dụng theo năm. So sánh các nguồn vốn trên cùng thước đo này trước khi quyết định.' },
    ],
    quiz: [
      { q: 'Nợ tốt là nợ như thế nào?', options: ['Tạo dòng tiền lớn hơn chi phí lãi', 'Lãi suất cao nhất', 'Vay để tiêu dùng'], answer: 0 },
    ],
  },

  // ── cashFlowVolatility ──
  {
    id: 'cf-smooth',
    factor: 'cashFlowVolatility',
    level: 'basic',
    title: 'Làm phẳng biến động dòng tiền',
    minutes: 3,
    summary: 'Dòng tiền ổn định giữa các tháng giúp điểm cao và giảm rủi ro kẹt tiền.',
    sections: [
      { heading: 'Vì sao ổn định quan trọng', body: 'Yếu tố này đo mức dao động của dòng tiền ròng giữa các tháng (hệ số biến thiên). Thu nhập lên xuống thất thường khó dự báo và rủi ro hơn, nên bị chấm thấp. Ổn định = dễ lập kế hoạch, dễ trả nợ.' },
      { heading: 'Cách giảm biến động', body: '1) Xây nguồn thu định kỳ (hợp đồng dài hạn, gói thuê bao); 2) Rải lịch thu–chi tránh dồn cục; 3) Giữ quỹ dự phòng 1–3 tháng chi phí để hấp thụ tháng thấp điểm.' },
      { heading: 'Dự báo đơn giản', body: 'Nhìn dòng tiền 3–6 tháng gần nhất để lường tháng thiếu hụt. Mimi Wallet cảnh báo sớm các tháng nguy cơ âm để bạn chuẩn bị vốn trước.' },
    ],
    quiz: [
      { q: 'Dòng tiền thất thường bị đánh giá thế nào?', options: ['Tốt hơn ổn định', 'Rủi ro hơn, điểm thấp hơn', 'Không liên quan'], answer: 1 },
      { q: 'Quỹ dự phòng nên đủ cho bao lâu?', options: ['1–3 tháng chi phí', 'Không cần quỹ', '10 năm'], answer: 0 },
    ],
  },
  {
    id: 'cf-seasonality',
    factor: 'cashFlowVolatility',
    level: 'inter',
    title: 'Quản lý mùa vụ trong kinh doanh',
    minutes: 3,
    summary: 'Nhiều SME có mùa cao–thấp điểm; cách để mùa vụ không phá vỡ dòng tiền.',
    sections: [
      { heading: 'Nhận diện mùa vụ', body: 'Xem doanh thu 12 tháng để tìm quy luật (ví dụ bán lẻ tăng dịp Tết, giảm sau Tết). Biết trước giúp bạn tích trữ tiền mùa cao để chi mùa thấp.' },
      { heading: 'Công cụ tài chính hỗ trợ', body: 'Dùng ứng vốn hóa đơn hoặc hạn mức vay ngắn hạn để lấp mùa thấp điểm, thay vì cắt giảm hoạt động cốt lõi. Trả lại khi mùa cao điểm quay lại.' },
    ],
    quiz: [
      { q: 'Cách tốt để vượt mùa thấp điểm?', options: ['Tích tiền mùa cao, dùng vốn ngắn hạn lấp mùa thấp', 'Ngừng kinh doanh', 'Bỏ qua, không chuẩn bị'], answer: 0 },
    ],
  },
];

export const LESSON_BY_ID: Record<string, Lesson> = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
