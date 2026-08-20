import { describe, it, expect } from "vitest";
import {
  strip,
  detectTopic,
  detectImpact,
  classify,
  personalImpact,
  type CompanyContext,
} from "./analysis";

const ctx = (over: Partial<CompanyContext> = {}): CompanyContext => ({
  outstandingDebt: 0,
  factorScores: {},
  netCashFlow: 0,
  ...over,
});

describe("strip", () => {
  it("folds Vietnamese diacritics and đ so keywords match either way", () => {
    expect(strip("Lãi suất")).toBe("lai suat");
    expect(strip("Đồng")).toBe("dong");
    expect(strip("Tỷ giá USD")).toBe("ty gia usd");
  });
});

describe("detectTopic", () => {
  it("recognises the macro topics we act on", () => {
    expect(detectTopic("NHNN hạ lãi suất điều hành")).toBe("interest_rate");
    expect(detectTopic("Nới room tín dụng cho ngân hàng")).toBe("credit");
    expect(detectTopic("Tỷ giá USD/VND lập đỉnh")).toBe("fx");
    expect(detectTopic("Thông tư mới của Ngân hàng Nhà nước")).toBe("policy");
  });

  it("falls back to general for unrelated headlines", () => {
    expect(detectTopic("Giá vé máy bay dịp lễ")).toBe("general");
  });

  it("matches even when the headline drops diacritics", () => {
    expect(detectTopic("NHNN ha lai suat dieu hanh")).toBe("interest_rate");
  });
});

describe("detectImpact", () => {
  it("reads rate rises as bad for a borrower, cuts as good", () => {
    expect(detectImpact("Lãi suất tăng mạnh", "interest_rate")).toBe("negative");
    expect(detectImpact("Lãi suất giảm về đáy", "interest_rate")).toBe("positive");
  });

  it("reads credit loosening as good and tightening as bad", () => {
    expect(detectImpact("Nới room tín dụng", "credit")).toBe("positive");
    expect(detectImpact("Siết tín dụng bất động sản", "credit")).toBe("negative");
  });

  it("reads a weaker dong as bad because imports cost more", () => {
    expect(detectImpact("Tỷ giá tăng", "fx")).toBe("negative");
  });

  it("stays neutral when direction is absent or contradictory", () => {
    expect(detectImpact("Hội thảo về lãi suất", "interest_rate")).toBe("neutral");
    expect(detectImpact("Lãi suất tăng rồi giảm", "interest_rate")).toBe("neutral");
  });
});

describe("classify", () => {
  it("returns topic and impact together", () => {
    expect(classify("NHNN tăng lãi suất điều hành")).toEqual({
      topic: "interest_rate",
      impact: "negative",
    });
  });
});

describe("personalImpact", () => {
  it("stays silent on rate news for a company with no debt", () => {
    expect(personalImpact("interest_rate", "negative", ctx())).toBeNull();
  });

  it("quantifies rate exposure using the company's actual debt", () => {
    const msg = personalImpact(
      "interest_rate",
      "negative",
      ctx({ outstandingDebt: 180_000_000 })
    );
    expect(msg).toContain("180 triệu");
  });

  it("sharpens the warning when repayment is already the weak factor", () => {
    const msg = personalImpact(
      "interest_rate",
      "negative",
      ctx({ outstandingDebt: 180_000_000, factorScores: { loanRepaymentRatio: 45 } })
    );
    expect(msg).toContain("trả nợ");
  });

  it("frames a rate cut as a refinancing opportunity", () => {
    const msg = personalImpact(
      "interest_rate",
      "positive",
      ctx({ outstandingDebt: 500_000_000 })
    );
    expect(msg).toContain("cơ cấu lại");
  });

  it("only warns on FX when the expense ratio is actually weak", () => {
    expect(personalImpact("fx", "negative", ctx())).toBeNull();
    expect(
      personalImpact("fx", "negative", ctx({ factorScores: { expenseToIncomeRatio: 40 } }))
    ).toContain("nhập hàng");
  });
});

describe('classify chỉ đọc tiêu đề — hồi quy từ dữ liệu thật 20/08/2026', () => {
  /*
   * Sáu tiêu đề dưới đây là tin THẬT lấy từ bảng `macro_news`, và cả sáu đều bị
   * bản cũ gán nhãn sai vì nó quét cả tóm tắt. Giữ nguyên văn làm test hồi quy:
   * ai định cho tóm tắt tham gia phân loại trở lại sẽ thấy chúng đỏ.
   */
  const chiLaTinThuong = [
    'CEO hãng robot hình người hàng đầu Trung Quốc thành tỷ phú',
    'OCB duy trì đóng góp ngân sách nghìn tỷ, gia tăng giá trị cho nền kinh tế',
    'Dồn nguồn lực cho mục tiêu 1,14 triệu căn nhà ở xã hội',
    'Cam kết bền vững của ngành thời trang có thực sự… bền vững?',
    'Nhà ở cho thuê là phân khúc chiến lược, phục vụ đông đảo người dân',
  ];

  it.each(chiLaTinThuong)('không gán nhãn chủ đề cho tin thường: %s', (tieuDe) => {
    expect(classify(tieuDe).topic).toBe('general');
  });

  it('tóm tắt KHÔNG được kéo bài vào một chủ đề nó không nói về', () => {
    // Đây chính xác là cách bản cũ hỏng: "USD" nằm trong tóm tắt.
    const r = classify(
      'Bitcoin trở lại mốc 70.000 USD',
      'Giá Bitcoin tăng mạnh khi lãi suất tại Mỹ hạ nhiệt, USD suy yếu',
    );
    expect(r.topic).not.toBe('interest_rate');
  });

  it('tiêu đề nói rõ tỷ giá thì vẫn nhận đúng', () => {
    expect(classify('Những “vùng đệm” hỗ trợ tỷ giá ổn định từ nay đến cuối năm').topic)
      .toBe('fx');
  });
});

describe('dấu câu là ranh giới, không phải rác cần xoá', () => {
  it('hai từ rời hai bên dấu phẩy KHÔNG ghép thành cụm từ khoá', () => {
    // "nghìn tỷ, gia tăng" từng đọc thành "tỷ giá" sau khi xoá dấu phẩy.
    expect(classify('OCB duy trì đóng góp ngân sách nghìn tỷ, gia tăng giá trị').topic)
      .toBe('general');
  });

  it('cụm từ trong CÙNG một mệnh đề vẫn khớp bình thường', () => {
    expect(classify('Tỷ giá USD tăng mạnh phiên cuối tuần').topic).toBe('fx');
    expect(classify('NHNN giảm lãi suất điều hành').topic).toBe('interest_rate');
  });
});
