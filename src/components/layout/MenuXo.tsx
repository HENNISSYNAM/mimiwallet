import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Bot, Calculator, CheckCircle2, ChevronDown, Code2, Handshake, Landmark, ListChecks, Lock, Plug, QrCode, Receipt, ShieldAlert, Sparkles, type LucideIcon } from 'lucide-react';
import mimiLogo from '@/assets/mimi-cat.png';
import sokhcnLogo from '@/assets/logos/sokhcn.png';
import { CONTACT } from '@/config/company';

/**
 * Bốn menu xổ lớn của trang chủ: Sản phẩm, Giải pháp, Đối tác, Tài nguyên.
 *
 * LUẬT CHUNG — menu là danh sách đầu tiên người ta đọc về MIMI, nên nó không
 * được khoe nhiều hơn app làm được:
 *   - Sản phẩm và Giải pháp trỏ tới trang riêng (/san-pham/…, /giai-phap/…),
 *     nội dung ở `content/trangNoiDung.ts`; test đòi mọi liên kết có trang.
 *   - Chưa xong thì gắn nhãn ngay trong menu ("Đang xây").
 *   - "Đối tác": MIMI CHƯA có chương trình đối tác chính thức. Menu chỉ nêu gói
 *     cho văn phòng kế toán, các dịch vụ MIMI đang kết nối (ghi rõ không phải
 *     thoả thuận đối tác), công nhận ươm tạo có số quyết định, và lối liên hệ.
 *   - "Tài nguyên": chỉ thứ có thật; chưa có blog, trợ giúp, tuyển dụng.
 */

type NgonNgu = 'vi' | 'en' | 'ko' | 'zh';
/** Chữ đủ bốn ngôn ngữ; thiếu ko/zh thì rơi về tiếng Anh. */
type Chu = { vi: string; en: string; ko?: string; zh?: string };
export const ch = (c: Chu, nn: NgonNgu): string => c[nn] ?? c.en;
export type KhoaMenu = 'san-pham' | 'giai-phap' | 'doi-tac' | 'tai-nguyen';

interface MucMenu {
  ten: Chu;
  mo?: Chu;
  href: string;
  icon?: LucideIcon;
  nhan?: Chu;
  /** Mục nổi thành một hộp nền xám, như lời mời hành động. */
  hop?: boolean;
}

interface NhomMenu {
  tieuDe: Chu;
  muc: MucMenu[];
  ghiChu?: Chu;
}

interface NoiBat {
  kieu: 'meo' | 'ma-lenh' | 'logo' | 'moi';
  tieuDe: Chu;
  mo: Chu;
  href: string;
}

export interface CauHinhMenu {
  khoa: KhoaMenu;
  ten: Chu;
  /** Mỗi phần tử là một cột; một cột có thể xếp nhiều nhóm. */
  cot: NhomMenu[][];
  hangDuoi?: NhomMenu;
  noiBat: NoiBat;
}

/** Email hợp tác kèm tiêu đề; chưa cấu hình email thì về khu đăng ký, không để liên kết chết. */
const email = (chuDe: string) =>
  CONTACT.email ? `mailto:${CONTACT.email}?subject=${encodeURIComponent(chuDe)}` : '#dang-ky';

const MENU_SAN_PHAM: CauHinhMenu = {
  khoa: 'san-pham',
  ten: { vi: 'Sản phẩm', en: 'Products', ko: '제품', zh: '产品' },
  cot: [
    [{
      tieuDe: { vi: 'Chi tiêu & duyệt', en: 'Spend & approvals', ko: '지출 및 승인', zh: '支出与审批' },
      muc: [
        { icon: Bot, ten: { vi: 'Kiểm soát agent', en: 'Agent controls', ko: '에이전트 통제', zh: '智能体管控' }, mo: { vi: 'Hạn mức, duyệt, nhật ký', en: 'Limits, approvals, audit log', ko: '한도, 승인, 감사 로그', zh: '额度、审批、审计日志' }, href: '/san-pham/kiem-soat-agent' },
        { icon: CheckCircle2, ten: { vi: 'Duyệt chi', en: 'Spend approvals', ko: '지출 승인', zh: '支出审批' }, mo: { vi: 'Một chạm, tiền đi khi bạn trả', en: 'One tap, money moves when you pay', ko: '한 번 누르면 끝, 돈은 직접 지급할 때 나갑니다', zh: '一键审批，您付款时资金才转出' }, href: '/san-pham/duyet-chi' },
        { icon: ShieldAlert, ten: { vi: 'Chống chuyển nhầm', en: 'Transfer protection', ko: '오송금 방지', zh: '防止转错账' }, mo: { vi: 'Bắt đổi số tài khoản, giữ người nhận mới', en: 'Catch account swaps, hold new payees', ko: '계좌 변경 탐지, 신규 수취인 보류', zh: '识别账号变更，冷静期内不放行新收款人' }, href: '/san-pham/chong-chuyen-nham' },
      ],
    }],
    [{
      tieuDe: { vi: 'Hoá đơn & chứng từ', en: 'Invoices & documents', ko: '인보이스 및 증빙', zh: '发票与凭证' },
      muc: [
        { icon: QrCode, ten: { vi: 'Hoá đơn kèm mã QR', en: 'QR invoices', ko: 'QR 인보이스', zh: '二维码发票' }, mo: { vi: 'Tự khớp khi tiền về', en: 'Reconcile when money arrives', ko: '입금되면 자동 대조', zh: '款项到账时自动对账' }, href: '/san-pham/hoa-don-qr' },
        { icon: Receipt, ten: { vi: 'Chứng từ chi phí', en: 'Expense records', ko: '비용 증빙', zh: '费用凭证' }, mo: { vi: 'Sổ chi phí kèm nguồn từng dòng', en: 'Every line with its source', ko: '모든 항목에 출처 표시', zh: '每一行都附有来源' }, href: '/san-pham/chung-tu-chi-phi' },
      ],
    }],
    [{
      tieuDe: { vi: 'Sổ & thuế', en: 'Ledger & tax', ko: '장부 및 세금', zh: '账簿与税务' },
      muc: [
        { icon: Landmark, ten: { vi: 'Đối soát sao kê', en: 'Statement matching', ko: '거래내역 대조', zh: '银行流水对账' }, mo: { vi: 'Khớp tiền theo mã tham chiếu', en: 'Match money by reference code', ko: '참조 코드로 입금 대조', zh: '按参考码匹配款项' }, href: '/san-pham/doi-soat-sao-ke' },
        { icon: Calculator, ten: { vi: 'Hai cách tính thuế', en: 'Two tax methods', ko: '두 가지 세금 계산 방식', zh: '两种计税方式' }, mo: { vi: 'Cho hộ kinh doanh từ 2026', en: 'For household businesses from 2026', ko: '2026년부터 가구 사업자용', zh: '适用于 2026 年起的个体工商户' }, href: '/san-pham/hai-cach-tinh-thue' },
      ],
    }],
  ],
  hangDuoi: {
    tieuDe: { vi: 'Nền tảng', en: 'Platform', ko: '플랫폼', zh: '平台' },
    muc: [
      { icon: Sparkles, ten: { vi: 'Trí tuệ nhân tạo', en: 'Intelligence', ko: '인공지능', zh: '人工智能' }, mo: { vi: 'Agent làm gì, và bạn giữ gì', en: 'What agents do, what you keep', ko: '에이전트가 하는 일과 사용자가 쥐는 권한', zh: '智能体做什么，您掌握什么' }, href: '/tri-tue-nhan-tao' },
      { icon: Code2, ten: { vi: 'MCP & API cho agent', en: 'MCP & agent API', ko: '에이전트용 MCP·API', zh: '智能体 MCP 与 API' }, mo: { vi: 'Nối Claude, Cursor trong một lệnh', en: 'Connect Claude, Cursor in one command', ko: '명령 한 줄로 Claude, Cursor 연결', zh: '一条命令接入 Claude、Cursor' }, href: '/san-pham/mcp-api' },
      { icon: Lock, ten: { vi: 'Bảo mật', en: 'Security', ko: '보안', zh: '安全' }, mo: { vi: 'Mã hoá kháng lượng tử, tách dữ liệu', en: 'Post-quantum encryption, data isolation', ko: '양자 내성 암호화, 데이터 분리', zh: '抗量子加密，数据隔离' }, href: '/san-pham/bao-mat' },
      { icon: Plug, ten: { vi: 'Kết nối', en: 'Connections', ko: '연결', zh: '连接' }, mo: { vi: 'Ngân hàng, sao kê', en: 'Banks, statements', ko: '은행, 거래내역', zh: '银行、对账单' }, href: '/san-pham/ket-noi' },
    ],
  },
  noiBat: {
    kieu: 'meo',
    tieuDe: { vi: 'Xem MIMI làm việc', en: 'Watch MIMI work', ko: 'MIMI 작동 보기', zh: '观看 MIMI 工作' },
    mo: { vi: 'Hai khung tự chạy: duyệt chi và bắt đổi số tài khoản.', en: 'Two self-running panels: approvals and account-swap alerts.', ko: '자동으로 움직이는 두 패널: 지출 승인과 계좌 변경 경고.', zh: '两个自动运行的面板：支出审批与账号变更警报。' },
    href: '/kham-pha/demo',
  },
};

const MENU_GIAI_PHAP: CauHinhMenu = {
  khoa: 'giai-phap',
  ten: { vi: 'Giải pháp', en: 'Solutions', ko: '솔루션', zh: '解决方案' },
  cot: [
    [{
      tieuDe: { vi: 'Theo quy mô', en: 'By size', ko: '규모별', zh: '按规模' },
      muc: [
        { ten: { vi: 'Startup & công ty công nghệ', en: 'Startups & tech companies', ko: '스타트업 및 기술 기업', zh: '初创与科技公司' }, mo: { vi: 'Đã dùng AI, bắt đầu giao việc cho agent', en: 'Already on AI, starting to hand work to agents', ko: '이미 AI를 쓰고 에이전트에게 일을 맡기기 시작한 팀', zh: '已在使用 AI，开始把工作交给智能体' }, href: '/giai-phap/startup-cong-nghe' },
        { ten: { vi: 'Doanh nghiệp nhỏ và vừa', en: 'Small & medium businesses', ko: '중소기업', zh: '中小企业' }, mo: { vi: 'Duyệt chi, chống chuyển nhầm, đối soát sao kê', en: 'Approvals, transfer protection, statement matching', ko: '지출 승인, 오송금 방지, 거래내역 대조', zh: '审批、防转错账、流水对账' }, href: '/giai-phap/doanh-nghiep-nho-va-vua' },
        { ten: { vi: 'Hộ kinh doanh', en: 'Household businesses', ko: '가구 사업자', zh: '个体工商户' }, mo: { vi: 'Chứng từ chi phí và hai cách tính thuế', en: 'Expense records and two tax methods', ko: '비용 증빙과 두 가지 세금 계산 방식', zh: '费用凭证与两种计税方式' }, href: '/giai-phap/ho-kinh-doanh' },
        { ten: { vi: 'Văn phòng kế toán', en: 'Accounting firms', ko: '회계 사무소', zh: '会计事务所' }, mo: { vi: 'Nhiều khách hàng, liên hệ để dùng', en: 'Many clients, contact us to start', ko: '여러 고객 관리 — 문의 후 이용', zh: '多个客户 — 联系我们开始使用' }, href: '/giai-phap/van-phong-ke-toan' },
        { ten: { vi: 'Dùng thử cùng đội MIMI', en: 'Try it with the MIMI team', ko: 'MIMI 팀과 함께 체험', zh: '与 MIMI 团队一起试用' }, mo: { vi: 'Để lại email, chúng tôi liên hệ trong 24 giờ', en: 'Leave your email, we reply within 24 hours', ko: '이메일을 남기면 24시간 내에 연락드립니다', zh: '留下邮箱，我们会在 24 小时内联系您' }, href: '#dang-ky', hop: true },
      ],
    }],
    [{
      tieuDe: { vi: 'Theo ngành', en: 'By industry', ko: '업종별', zh: '按行业' },
      muc: [
        { ten: { vi: 'Agency & quảng cáo', en: 'Agencies & advertising', ko: '에이전시 및 광고', zh: '代理与广告' }, mo: { vi: 'Duyệt ngân sách quảng cáo trước khi nạp', en: 'Approve ad budgets before top-ups', ko: '충전 전에 광고 예산 승인', zh: '充值前先审批广告预算' }, href: '/giai-phap/agency-quang-cao' },
        { ten: { vi: 'Thương mại điện tử', en: 'E-commerce', ko: '전자상거래', zh: '电子商务' }, mo: { vi: 'Thu tiền bằng mã QR, tự khớp khi tiền về', en: 'Collect by QR, reconcile when money arrives', ko: 'QR로 수금, 입금되면 자동 대조', zh: '二维码收款，到账自动对账' }, href: '/giai-phap/thuong-mai-dien-tu' },
        { ten: { vi: 'Phần mềm & AI', en: 'Software & AI', ko: '소프트웨어 및 AI', zh: '软件与 AI' }, mo: { vi: 'Giới hạn chi cho API, máy chủ, công cụ AI', en: 'Cap spend on APIs, servers and AI tools', ko: 'API, 서버, AI 도구 지출 한도 설정', zh: '为 API、服务器和 AI 工具设置支出上限' }, href: '/giai-phap/phan-mem-ai' },
        { ten: { vi: 'Dịch vụ chuyên môn', en: 'Professional services', ko: '전문 서비스', zh: '专业服务' }, mo: { vi: 'Hoá đơn, chứng từ và công nợ khách hàng', en: 'Invoices, records and client receivables', ko: '인보이스, 증빙, 고객 미수금', zh: '发票、凭证与客户应收款' }, href: '/giai-phap/dich-vu-chuyen-mon' },
        { ten: { vi: 'Bán lẻ & dịch vụ', en: 'Retail & services', ko: '소매 및 서비스', zh: '零售与服务' }, mo: { vi: 'Sổ chi phí sẵn cho kỳ kê khai', en: 'Expense books ready for filing', ko: '신고 기간에 맞춰 준비된 비용 장부', zh: '为申报期备好的费用账簿' }, href: '/giai-phap/ban-le-dich-vu' },
      ],
    }],
  ],
  noiBat: {
    kieu: 'ma-lenh',
    tieuDe: { vi: 'Nối agent vào MIMI trong một lệnh', en: 'Connect an agent in one command', ko: '명령 한 줄로 에이전트 연결', zh: '一条命令接入智能体' },
    mo: { vi: 'MCP server có sẵn cho Claude, Cursor và mọi ứng dụng hỗ trợ MCP.', en: 'A ready MCP server for Claude, Cursor and any MCP client.', ko: 'Claude, Cursor 등 모든 MCP 클라이언트를 위한 MCP 서버를 바로 사용하세요.', zh: '为 Claude、Cursor 及任何 MCP 客户端准备好的 MCP 服务器。' },
    href: '/san-pham/mcp-api',
  },
};

const MENU_DOI_TAC: CauHinhMenu = {
  khoa: 'doi-tac',
  ten: { vi: 'Đối tác', en: 'Partners', ko: '파트너', zh: '合作伙伴' },
  cot: [
    [{
      tieuDe: { vi: 'Cho văn phòng kế toán', en: 'For accounting firms', ko: '회계 사무소용', zh: '面向会计事务所' },
      muc: [
        { ten: { vi: 'Gói cho văn phòng kế toán', en: 'Plan for accounting firms', ko: '회계 사무소 요금제', zh: '会计事务所套餐' }, mo: { vi: 'Nhiều doanh nghiệp, liên hệ để dùng', en: 'Many businesses, contact us to start', ko: '여러 기업 관리 — 문의 후 이용', zh: '多家企业 — 联系我们开始使用' }, href: email('Gói văn phòng kế toán') },
        { icon: Handshake, ten: { vi: 'Hợp tác cùng văn phòng kế toán', en: 'Partner as an accounting firm', ko: '회계 사무소로 협력하기', zh: '以会计事务所身份合作' }, mo: { vi: 'Để lại liên hệ, đội MIMI trả lời trực tiếp', en: 'Leave your details, the MIMI team replies directly', ko: '연락처를 남기면 MIMI 팀이 직접 답변합니다', zh: '留下联系方式，MIMI 团队会直接回复' }, href: email('Hợp tác văn phòng kế toán') },
      ],
    }],
    [{
      tieuDe: { vi: 'Hợp tác cùng MIMI', en: 'Build with MIMI', ko: 'MIMI와 함께 만들기', zh: '与 MIMI 共建' },
      muc: [
        { ten: { vi: 'Ngân hàng & ví điện tử', en: 'Banks & e-wallets', ko: '은행 및 전자지갑', zh: '银行与电子钱包' }, mo: { vi: 'Đường tiền cho doanh nghiệp dùng agent', en: 'Payment rails for agent-run businesses', ko: '에이전트를 쓰는 기업을 위한 결제 경로', zh: '为使用智能体的企业提供支付通道' }, href: email('Hợp tác ngân hàng và ví') },
        { ten: { vi: 'Phần mềm kế toán & ERP', en: 'Accounting software & ERP', ko: '회계 소프트웨어 및 ERP', zh: '会计软件与 ERP' }, mo: { vi: 'Đưa khoản chi đã đối soát vào sổ', en: 'Send reconciled spend to the books', ko: '대조를 마친 지출을 장부에 반영', zh: '把已对账的支出送入账簿' }, href: email('Hợp tác phần mềm kế toán') },
        { ten: { vi: 'Ươm tạo & nhà đầu tư', en: 'Incubators & investors', ko: '인큐베이터 및 투자자', zh: '孵化器与投资人' }, mo: { vi: 'Trao đổi về MIMI', en: 'Talk to us about MIMI', ko: 'MIMI에 대해 이야기해요', zh: '来聊聊 MIMI' }, href: email('Ươm tạo và đầu tư') },
      ],
      ghiChu: { vi: 'Chưa có chương trình đối tác chính thức — chúng tôi trả lời từng liên hệ.', en: 'No formal partner program yet — we answer every enquiry.', ko: '아직 공식 파트너 프로그램은 없습니다 — 모든 문의에 답변드립니다.', zh: '暂无正式合作伙伴计划 — 我们会回复每一条咨询。' },
    }],
  ],
  noiBat: {
    kieu: 'logo',
    tieuDe: { vi: 'Được tuyển chọn ươm tạo', en: 'Selected for incubation', ko: '인큐베이팅 선정', zh: '入选孵化' },
    mo: { vi: 'Trung tâm Khởi nghiệp Sáng tạo TP.HCM · Quyết định 231/QĐ-KNST, 25/11/2025', en: 'Ho Chi Minh City Innovative Startup Center · Decision 231/QĐ-KNST, 25/11/2025', ko: '호치민시 혁신 창업 센터 · 결정 제231/QĐ-KNST호, 2025년 11월 25일', zh: '胡志明市创新创业中心 · 第 231/QĐ-KNST 号决定，2025 年 11 月 25 日' },
    href: '#cong-nhan',
  },
};

const MENU_TAI_NGUYEN: CauHinhMenu = {
  khoa: 'tai-nguyen',
  ten: { vi: 'Tài nguyên', en: 'Resources', ko: '자료', zh: '资源' },
  cot: [
    [{
      tieuDe: { vi: 'Khám phá', en: 'Discover', ko: '둘러보기', zh: '探索' },
      muc: [
        { icon: Bell, ten: { vi: 'Cập nhật sản phẩm', en: 'Product updates', ko: '제품 업데이트', zh: '产品动态' }, mo: { vi: 'Những gì vừa chạy thật trên MIMI', en: 'What just shipped on MIMI', ko: 'MIMI에서 방금 실제로 작동하기 시작한 것들', zh: 'MIMI 上刚刚真正上线的功能' }, href: '/kham-pha/cap-nhat' },
        { icon: ListChecks, ten: { vi: 'Nhật ký agent', en: 'Agent activity log', ko: '에이전트 활동 로그', zh: '智能体活动日志' }, mo: { vi: 'Mỗi bước đều để lại dấu vết', en: 'Every step leaves a trace', ko: '모든 단계가 기록으로 남습니다', zh: '每一步都会留下痕迹' }, href: '/kham-pha/agent-ai#nhat-ky' },
      ],
    }],
    [{
      tieuDe: { vi: 'Đọc thêm', en: 'Read', ko: '읽을거리', zh: '阅读' },
      muc: [
        { ten: { vi: 'Sự kiện & Webinar', en: 'Events & webinars', ko: '이벤트 및 웨비나', zh: '活动与网络研讨会' }, href: '/tai-nguyen/su-kien' },
        { ten: { vi: 'Blog', en: 'Blog', ko: '블로그', zh: '博客' }, href: '/tai-nguyen/blog' },
        { ten: { vi: 'Góc nhìn', en: 'Insights', ko: '인사이트', zh: '观点' }, href: '/tai-nguyen/goc-nhin' },
        { ten: { vi: 'Báo cáo', en: 'Reports', ko: '보고서', zh: '报告' }, href: '/tai-nguyen/bao-cao' },
        { ten: { vi: 'Tin tức', en: 'News', ko: '뉴스', zh: '新闻' }, href: '/tai-nguyen/tin-tuc' },
        { ten: { vi: 'Tuyển dụng', en: 'Careers', ko: '채용', zh: '招聘' }, href: '/tuyen-dung' },
      ],
    }],
    [{
      tieuDe: { vi: 'Kết nối', en: 'Connect', ko: '연결', zh: '联系' },
      muc: [
        { ten: { vi: 'Về chúng tôi', en: 'About us', ko: '회사 소개', zh: '关于我们' }, href: '/about' },
        { ten: { vi: 'Đội ngũ', en: 'Team', ko: '팀', zh: '团队' }, href: '/about?muc=doi-ngu' },
        { ten: { vi: 'Công nhận & ươm tạo', en: 'Recognition & incubation', ko: '인정 및 인큐베이팅', zh: '认可与孵化' }, href: '#cong-nhan' },
        { ten: { vi: 'Bộ nhận diện thương hiệu', en: 'Brand kit', ko: '브랜드 키트', zh: '品牌资源包' }, href: '/thuong-hieu' },
        { ten: { vi: 'Liên hệ', en: 'Contact', ko: '문의', zh: '联系' }, href: '#dang-ky' },
      ],
    }],
    [{
      tieuDe: { vi: 'Pháp lý', en: 'Legal', ko: '법적 고지', zh: '法律' },
      muc: [
        { ten: { vi: 'Quyền riêng tư', en: 'Privacy', ko: '개인정보', zh: '隐私' }, href: '/privacy' },
        { ten: { vi: 'Điều khoản sử dụng', en: 'Terms of use', ko: '이용약관', zh: '使用条款' }, href: '/terms' },
      ],
    }],
  ],
  noiBat: {
    kieu: 'moi',
    tieuDe: { vi: 'Mới: ba luật chống chuyển nhầm', en: 'New: three transfer-safety rules', ko: '신규: 오송금 방지 규칙 3가지', zh: '新增：三条防转错账规则' },
    mo: { vi: 'Chặn vòng lặp, giữ người nhận mới 24 giờ, cảnh báo đổi số tài khoản.', en: 'Loop limits, 24-hour payee hold, account-swap alerts.', ko: '반복 호출 제한, 신규 수취인 24시간 보류, 계좌 변경 경고.', zh: '循环限制、新收款人 24 小时冷静期、账号变更警报。' },
    href: '/san-pham/chong-chuyen-nham',
  },
};

export const CAC_MENU: CauHinhMenu[] = [MENU_SAN_PHAM, MENU_GIAI_PHAP, MENU_DOI_TAC, MENU_TAI_NGUYEN];

export const ngonNguMenu = (lang: string): NgonNgu => (lang.startsWith('en') ? 'en' : lang.startsWith('ko') ? 'ko' : lang.startsWith('zh') ? 'zh' : 'vi');

const TIEU_DE_NOI_BAT: Chu = { vi: 'Nổi bật', en: 'Featured', ko: '추천', zh: '精选' };

type Dan = (href: string) => string;

/**
 * Một liên kết trong menu. Trang riêng ("/…") đi bằng router để không tải lại
 * cả ứng dụng; mốc trên trang chủ ("#…") qua `anchor`; thư ("mailto:") giữ nguyên.
 */
function LienKet({ href, anchor, dong, className, children }: { href: string; anchor: Dan; dong: () => void; className: string; children: ReactNode }) {
  if (href.startsWith('/')) {
    return <Link to={href} onClick={dong} className={className}>{children}</Link>;
  }
  return <a href={href.startsWith('#') ? anchor(href) : href} onClick={dong} className={className}>{children}</a>;
}

function Muc({ m, nn, anchor, dong }: { m: MucMenu; nn: NgonNgu; anchor: Dan; dong: () => void }) {
  const nhan = m.nhan && (
    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">{ch(m.nhan, nn)}</span>
  );

  if (m.hop) {
    return (
      <LienKet href={m.href} anchor={anchor} dong={dong} className="mt-2 block rounded-lg border border-border bg-muted px-5 py-4 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="block text-[15px] font-medium text-foreground">{ch(m.ten, nn)}</span>
        {m.mo && <span className="block text-sm text-muted-foreground">{ch(m.mo, nn)}</span>}
      </LienKet>
    );
  }

  if (m.icon) {
    const Icon = m.icon;
    return (
      <LienKet href={m.href} anchor={anchor} dong={dong} className="group -m-2 flex items-start gap-3.5 rounded-lg p-2 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-foreground transition-colors group-hover:bg-background">
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-[15px] font-medium text-foreground">{ch(m.ten, nn)}{nhan}</span>
          {m.mo && <span className="block text-sm text-muted-foreground">{ch(m.mo, nn)}</span>}
        </span>
      </LienKet>
    );
  }

  return (
    <LienKet href={m.href} anchor={anchor} dong={dong} className="-mx-2 block rounded-md px-2 py-1 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="flex items-center gap-2 text-[15px] font-medium text-foreground">{ch(m.ten, nn)}{nhan}</span>
      {m.mo && <span className="block text-sm text-muted-foreground">{ch(m.mo, nn)}</span>}
    </LienKet>
  );
}

function Nhom({ nhom, nn, anchor, dong }: { nhom: NhomMenu; nn: NgonNgu; anchor: Dan; dong: () => void }) {
  const coIcon = nhom.muc.some((m) => m.icon);
  return (
    <div>
      <p className="mb-5 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">{ch(nhom.tieuDe, nn)}</p>
      <div className={`grid ${coIcon ? 'gap-5' : 'gap-3'}`}>
        {nhom.muc.map((m) => <Muc key={m.ten.vi} m={m} nn={nn} anchor={anchor} dong={dong} />)}
      </div>
      {nhom.ghiChu && <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{ch(nhom.ghiChu, nn)}</p>}
    </div>
  );
}

function CotNoiBat({ nb, nn, anchor, dong }: { nb: NoiBat; nn: NgonNgu; anchor: Dan; dong: () => void }) {
  return (
    <div className="hidden border-l border-border bg-muted/40 p-8 lg:block">
      <p className="mb-5 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">{ch(TIEU_DE_NOI_BAT, nn)}</p>
      <LienKet href={nb.href} anchor={anchor} dong={dong} className="group block focus-visible:outline-none">
        {nb.kieu === 'meo' && (
          <span className="mimi-hero-warm grid h-36 place-items-center overflow-hidden rounded-lg border border-border">
            <img src={mimiLogo} alt="" aria-hidden draggable={false} className="h-20 w-20 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
          </span>
        )}
        {nb.kieu === 'ma-lenh' && (
          // Dòng ngắn và không tự xuống hàng: bản trước dòng dài tự gãy, tràn quá khung cao cố định và bị cắt.
          <span className="block min-h-36 overflow-hidden whitespace-nowrap rounded-lg bg-foreground p-4 font-mono text-[11px] leading-relaxed text-background">
            <span className="block opacity-60">$ claude mcp add mimi \</span>
            <span className="block">&nbsp;&nbsp;…/functions/v1/mcp \</span>
            <span className="block">&nbsp;&nbsp;--header "x-mimi-agent-key: …"</span>
            <span className="mt-2 block text-emerald-400">✓ xin_chi</span>
            <span className="block text-emerald-400">✓ xem_chinh_sach · xem_yeu_cau</span>
          </span>
        )}
        {nb.kieu === 'moi' && (
          <span className="block h-36 overflow-hidden rounded-lg border border-border bg-card p-4">
            <span className="block font-mono text-[11px] text-muted-foreground">14/09/2026</span>
            {['VUOT_TAN_SUAT', 'NGUOI_NHAN_MOI_THEM', 'DOI_SO_TAI_KHOAN'].map((ma) => (
              <span key={ma} className="mt-2 flex items-center gap-2 font-mono text-[11px] text-foreground">
                <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-500/15 text-[9px] text-emerald-700 dark:text-emerald-400">✓</span>
                {ma}
              </span>
            ))}
          </span>
        )}
        {nb.kieu === 'logo' && (
          <span className="grid h-36 place-items-center rounded-lg border border-border bg-white">
            <img src={sokhcnLogo} alt="" aria-hidden draggable={false} className="h-20 w-20 object-contain" />
          </span>
        )}
        <span className="mt-4 block text-[15px] font-medium text-foreground underline-offset-4 group-hover:underline">{ch(nb.tieuDe, nn)}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{ch(nb.mo, nn)}</span>
      </LienKet>
    </div>
  );
}

/** Tấm menu trên máy tính. `anchor` đổi "#demo" thành "/#demo" khi không ở trang chủ. */
export function TamMenu({ cauHinh, lang, anchor, dong }: { cauHinh: CauHinhMenu; lang: string; anchor: Dan; dong: () => void }) {
  const nn = ngonNguMenu(lang);
  const lopCot = cauHinh.cot.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3';
  return (
    <div className="grid overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_60px_-24px_rgba(15,23,42,0.35)] lg:grid-cols-[1fr_300px]">
      <div className="p-8">
        <div className={`grid gap-8 ${lopCot}`}>
          {cauHinh.cot.map((cot, i) => (
            <div key={i} className={`grid content-start gap-8 ${i > 0 ? 'md:border-l md:border-border md:pl-8' : ''}`}>
              {cot.map((nhom) => <Nhom key={nhom.tieuDe.vi} nhom={nhom} nn={nn} anchor={anchor} dong={dong} />)}
            </div>
          ))}
        </div>
        {cauHinh.hangDuoi && (
          <>
            <div className="my-7 border-t border-border" />
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">{ch(cauHinh.hangDuoi.tieuDe, nn)}</p>
            <div className={`grid gap-5 md:grid-cols-2 ${cauHinh.hangDuoi.muc.length > 4 ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
              {cauHinh.hangDuoi.muc.map((m) => <Muc key={m.ten.vi} m={m} nn={nn} anchor={anchor} dong={dong} />)}
            </div>
          </>
        )}
      </div>
      <CotNoiBat nb={cauHinh.noiBat} nn={nn} anchor={anchor} dong={dong} />
    </div>
  );
}

/** Bản điện thoại: mỗi menu là một mục xổ xuống trong menu toàn màn hình. */
export function MenuDiDong({ cauHinh, lang, anchor, dong }: { cauHinh: CauHinhMenu; lang: string; anchor: Dan; dong: () => void }) {
  const nn = ngonNguMenu(lang);
  const [mo, setMo] = useState(false);
  const cacNhom = [...cauHinh.cot.flat(), ...(cauHinh.hangDuoi ? [cauHinh.hangDuoi] : [])];
  return (
    <div className="w-full max-w-sm">
      <button
        type="button"
        onClick={() => setMo((v) => !v)}
        aria-expanded={mo}
        className="flex w-full items-center justify-center gap-2 text-2xl font-display font-bold text-foreground"
      >
        {ch(cauHinh.ten, nn)}
        <ChevronDown size={22} className={`transition-transform ${mo ? 'rotate-180' : ''}`} />
      </button>
      {mo && (
        <div className="mt-6 grid gap-6 text-left">
          {cacNhom.map((nhom) => <Nhom key={nhom.tieuDe.vi} nhom={nhom} nn={nn} anchor={anchor} dong={dong} />)}
        </div>
      )}
    </div>
  );
}
