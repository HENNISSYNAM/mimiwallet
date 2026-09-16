import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, Bot, Calculator, CheckCircle2, ChevronDown, Code2, FileText, Handshake, Landmark, LineChart, ListChecks, Lock,
  Plug, QrCode, Receipt, ShieldAlert, Sparkles, type LucideIcon,
} from 'lucide-react';
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

type NgonNgu = 'vi' | 'en';
type Chu = Record<NgonNgu, string>;
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
  ten: { vi: 'Sản phẩm', en: 'Products' },
  cot: [
    [{
      tieuDe: { vi: 'Chi tiêu & duyệt', en: 'Spend & approvals' },
      muc: [
        { icon: Bot, ten: { vi: 'Kiểm soát agent', en: 'Agent controls' }, mo: { vi: 'Hạn mức, duyệt, nhật ký', en: 'Limits, approvals, audit log' }, href: '/san-pham/kiem-soat-agent' },
        { icon: CheckCircle2, ten: { vi: 'Duyệt chi', en: 'Spend approvals' }, mo: { vi: 'Một chạm, tiền đi khi bạn trả', en: 'One tap, money moves when you pay' }, href: '/san-pham/duyet-chi' },
        { icon: ShieldAlert, ten: { vi: 'Chống chuyển nhầm', en: 'Transfer protection' }, mo: { vi: 'Bắt đổi số tài khoản, giữ người nhận mới', en: 'Catch account swaps, hold new payees' }, href: '/san-pham/chong-chuyen-nham' },
      ],
    }],
    [{
      tieuDe: { vi: 'Hoá đơn & chứng từ', en: 'Invoices & documents' },
      muc: [
        { icon: QrCode, ten: { vi: 'Hoá đơn kèm mã QR', en: 'QR invoices' }, mo: { vi: 'Tự khớp khi tiền về', en: 'Reconcile when money arrives' }, href: '/san-pham/hoa-don-qr' },
        { icon: Receipt, ten: { vi: 'Chứng từ chi phí', en: 'Expense records' }, mo: { vi: 'Sổ chi phí kèm nguồn từng dòng', en: 'Every line with its source' }, href: '/san-pham/chung-tu-chi-phi' },
        { icon: FileText, ten: { vi: 'Hoá đơn điện tử', en: 'E-invoices' }, mo: { vi: 'Đọc từ cơ quan thuế, chỉ đọc', en: 'Read-only from the tax authority' }, href: '/san-pham/hoa-don-dien-tu' },
      ],
    }],
    [{
      tieuDe: { vi: 'Sổ & thuế', en: 'Ledger & tax' },
      muc: [
        { icon: Landmark, ten: { vi: 'Đối soát sao kê', en: 'Statement matching' }, mo: { vi: 'Khớp tiền theo mã tham chiếu', en: 'Match money by reference code' }, href: '/san-pham/doi-soat-sao-ke' },
        { icon: Calculator, ten: { vi: 'Hai cách tính thuế', en: 'Two tax methods' }, mo: { vi: 'Cho hộ kinh doanh từ 2026', en: 'For household businesses from 2026' }, href: '/san-pham/hai-cach-tinh-thue' },
      ],
    }],
  ],
  hangDuoi: {
    tieuDe: { vi: 'Nền tảng', en: 'Platform' },
    muc: [
      { icon: Sparkles, ten: { vi: 'Trí tuệ nhân tạo', en: 'Intelligence' }, mo: { vi: 'Agent làm gì, và bạn giữ gì', en: 'What agents do, what you keep' }, href: '/tri-tue-nhan-tao' },
      { icon: Code2, ten: { vi: 'MCP & API cho agent', en: 'MCP & agent API' }, mo: { vi: 'Nối Claude, Cursor trong một lệnh', en: 'Connect Claude, Cursor in one command' }, href: '/san-pham/mcp-api' },
      { icon: LineChart, ten: { vi: 'Chi phí AI', en: 'AI costs' }, mo: { vi: 'Thấy và giới hạn chi phí AI', en: 'See and cap your AI spend' }, href: '/san-pham/chi-phi-ai', nhan: { vi: 'Đang xây', en: 'In progress' } },
      { icon: Lock, ten: { vi: 'Bảo mật', en: 'Security' }, mo: { vi: 'Mã hoá kháng lượng tử, tách dữ liệu', en: 'Post-quantum encryption, data isolation' }, href: '/san-pham/bao-mat' },
      { icon: Plug, ten: { vi: 'Kết nối', en: 'Connections' }, mo: { vi: 'Ngân hàng, SePay, hoá đơn điện tử', en: 'Banks, SePay, e-invoices' }, href: '/san-pham/ket-noi' },
    ],
  },
  noiBat: {
    kieu: 'meo',
    tieuDe: { vi: 'Xem MIMI làm việc', en: 'Watch MIMI work' },
    mo: { vi: 'Bốn khung tự chạy: duyệt chi, bắt đổi số tài khoản, và hai chức năng đang xây.', en: 'Four self-running panels: approvals, account-swap alerts, and two features in progress.' },
    href: '#demo',
  },
};

const MENU_GIAI_PHAP: CauHinhMenu = {
  khoa: 'giai-phap',
  ten: { vi: 'Giải pháp', en: 'Solutions' },
  cot: [
    [{
      tieuDe: { vi: 'Theo quy mô', en: 'By size' },
      muc: [
        { ten: { vi: 'Startup & công ty công nghệ', en: 'Startups & tech companies' }, mo: { vi: 'Đã dùng AI, bắt đầu giao việc cho agent', en: 'Already on AI, starting to hand work to agents' }, href: '/giai-phap/startup-cong-nghe' },
        { ten: { vi: 'Doanh nghiệp nhỏ và vừa', en: 'Small & medium businesses' }, mo: { vi: 'Duyệt chi, chống chuyển nhầm, đối soát sao kê', en: 'Approvals, transfer protection, statement matching' }, href: '/giai-phap/doanh-nghiep-nho-va-vua' },
        { ten: { vi: 'Hộ kinh doanh', en: 'Household businesses' }, mo: { vi: 'Chứng từ chi phí và hai cách tính thuế', en: 'Expense records and two tax methods' }, href: '/giai-phap/ho-kinh-doanh' },
        { ten: { vi: 'Văn phòng kế toán', en: 'Accounting firms' }, mo: { vi: 'Nhiều khách hàng, liên hệ để dùng', en: 'Many clients, contact us to start' }, href: '/giai-phap/van-phong-ke-toan' },
        { ten: { vi: 'Dùng thử cùng đội MIMI', en: 'Try it with the MIMI team' }, mo: { vi: 'Để lại email, chúng tôi liên hệ trong 24 giờ', en: 'Leave your email, we reply within 24 hours' }, href: '#dang-ky', hop: true },
      ],
    }],
    [{
      tieuDe: { vi: 'Theo ngành', en: 'By industry' },
      muc: [
        { ten: { vi: 'Agency & quảng cáo', en: 'Agencies & advertising' }, mo: { vi: 'Duyệt ngân sách quảng cáo trước khi nạp', en: 'Approve ad budgets before top-ups' }, href: '/giai-phap/agency-quang-cao' },
        { ten: { vi: 'Thương mại điện tử', en: 'E-commerce' }, mo: { vi: 'Thu tiền bằng mã QR, tự khớp khi tiền về', en: 'Collect by QR, reconcile when money arrives' }, href: '/giai-phap/thuong-mai-dien-tu' },
        { ten: { vi: 'Phần mềm & AI', en: 'Software & AI' }, mo: { vi: 'Giới hạn chi cho API, máy chủ, công cụ AI', en: 'Cap spend on APIs, servers and AI tools' }, href: '/giai-phap/phan-mem-ai' },
        { ten: { vi: 'Dịch vụ chuyên môn', en: 'Professional services' }, mo: { vi: 'Hoá đơn, chứng từ và công nợ khách hàng', en: 'Invoices, records and client receivables' }, href: '/giai-phap/dich-vu-chuyen-mon' },
        { ten: { vi: 'Bán lẻ & dịch vụ', en: 'Retail & services' }, mo: { vi: 'Sổ chi phí sẵn cho kỳ kê khai', en: 'Expense books ready for filing' }, href: '/giai-phap/ban-le-dich-vu' },
      ],
    }],
  ],
  noiBat: {
    kieu: 'ma-lenh',
    tieuDe: { vi: 'Nối agent vào MIMI trong một lệnh', en: 'Connect an agent in one command' },
    mo: { vi: 'MCP server có sẵn cho Claude, Cursor và mọi ứng dụng hỗ trợ MCP.', en: 'A ready MCP server for Claude, Cursor and any MCP client.' },
    href: '/san-pham/mcp-api',
  },
};

const MENU_DOI_TAC: CauHinhMenu = {
  khoa: 'doi-tac',
  ten: { vi: 'Đối tác', en: 'Partners' },
  cot: [
    [{
      tieuDe: { vi: 'Cho văn phòng kế toán', en: 'For accounting firms' },
      muc: [
        { ten: { vi: 'Gói cho văn phòng kế toán', en: 'Plan for accounting firms' }, mo: { vi: 'Nhiều doanh nghiệp, liên hệ để dùng', en: 'Many businesses, contact us to start' }, href: email('Gói văn phòng kế toán') },
        { icon: Handshake, ten: { vi: 'Hợp tác cùng văn phòng kế toán', en: 'Partner as an accounting firm' }, mo: { vi: 'Để lại liên hệ, đội MIMI trả lời trực tiếp', en: 'Leave your details, the MIMI team replies directly' }, href: email('Hợp tác văn phòng kế toán') },
      ],
    }],
    [{
      tieuDe: { vi: 'Hợp tác cùng MIMI', en: 'Build with MIMI' },
      muc: [
        { ten: { vi: 'Ngân hàng & ví điện tử', en: 'Banks & e-wallets' }, mo: { vi: 'Đường tiền cho doanh nghiệp dùng agent', en: 'Payment rails for agent-run businesses' }, href: email('Hợp tác ngân hàng và ví') },
        { ten: { vi: 'Phần mềm kế toán & ERP', en: 'Accounting software & ERP' }, mo: { vi: 'Đưa khoản chi đã đối soát vào sổ', en: 'Send reconciled spend to the books' }, href: email('Hợp tác phần mềm kế toán') },
        { ten: { vi: 'Ươm tạo & nhà đầu tư', en: 'Incubators & investors' }, mo: { vi: 'Trao đổi về MIMI', en: 'Talk to us about MIMI' }, href: email('Ươm tạo và đầu tư') },
      ],
      ghiChu: { vi: 'Chưa có chương trình đối tác chính thức — chúng tôi trả lời từng liên hệ.', en: 'No formal partner program yet — we answer every enquiry.' },
    }],
  ],
  noiBat: {
    kieu: 'logo',
    tieuDe: { vi: 'Được tuyển chọn ươm tạo', en: 'Selected for incubation' },
    mo: { vi: 'Trung tâm Khởi nghiệp Sáng tạo TP.HCM · Quyết định 231/QĐ-KNST, 25/11/2025', en: 'Ho Chi Minh City Innovative Startup Center · Decision 231/QĐ-KNST, 25/11/2025' },
    href: '#cong-nhan',
  },
};

const MENU_TAI_NGUYEN: CauHinhMenu = {
  khoa: 'tai-nguyen',
  ten: { vi: 'Tài nguyên', en: 'Resources' },
  cot: [
    [{
      tieuDe: { vi: 'Khám phá', en: 'Discover' },
      muc: [
        { icon: Bell, ten: { vi: 'Cập nhật sản phẩm', en: 'Product updates' }, mo: { vi: 'Những gì vừa chạy thật trên MIMI', en: 'What just shipped on MIMI' }, href: '#cap-nhat' },
        { icon: ListChecks, ten: { vi: 'Nhật ký agent', en: 'Agent activity log' }, mo: { vi: 'Mỗi bước đều để lại dấu vết', en: 'Every step leaves a trace' }, href: '#nhat-ky' },
      ],
    }],
    [{
      tieuDe: { vi: 'Kết nối', en: 'Connect' },
      muc: [
        { ten: { vi: 'Về chúng tôi', en: 'About us' }, href: '/about' },
        { ten: { vi: 'Đội ngũ', en: 'Team' }, href: '/about?muc=doi-ngu' },
        { ten: { vi: 'Công nhận & ươm tạo', en: 'Recognition & incubation' }, href: '#cong-nhan' },
        { ten: { vi: 'Bộ nhận diện thương hiệu', en: 'Brand kit' }, href: '/thuong-hieu' },
        { ten: { vi: 'Liên hệ', en: 'Contact' }, href: '#dang-ky' },
      ],
    }],
    [{
      tieuDe: { vi: 'Pháp lý', en: 'Legal' },
      muc: [
        { ten: { vi: 'Quyền riêng tư', en: 'Privacy' }, href: '/privacy' },
        { ten: { vi: 'Điều khoản sử dụng', en: 'Terms of use' }, href: '/terms' },
      ],
    }],
  ],
  noiBat: {
    kieu: 'moi',
    tieuDe: { vi: 'Mới: ba luật chống chuyển nhầm', en: 'New: three transfer-safety rules' },
    mo: { vi: 'Chặn vòng lặp, giữ người nhận mới 24 giờ, cảnh báo đổi số tài khoản.', en: 'Loop limits, 24-hour payee hold, account-swap alerts.' },
    href: '/san-pham/chong-chuyen-nham',
  },
};

export const CAC_MENU: CauHinhMenu[] = [MENU_SAN_PHAM, MENU_GIAI_PHAP, MENU_DOI_TAC, MENU_TAI_NGUYEN];

export const ngonNguMenu = (lang: string): NgonNgu => (lang.startsWith('en') ? 'en' : 'vi');

const TIEU_DE_NOI_BAT: Chu = { vi: 'Nổi bật', en: 'Featured' };

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
    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">{m.nhan[nn]}</span>
  );

  if (m.hop) {
    return (
      <LienKet href={m.href} anchor={anchor} dong={dong} className="mt-2 block rounded-lg border border-border bg-muted px-5 py-4 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="block text-[15px] font-medium text-foreground">{m.ten[nn]}</span>
        {m.mo && <span className="block text-sm text-muted-foreground">{m.mo[nn]}</span>}
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
          <span className="flex items-center gap-2 text-[15px] font-medium text-foreground">{m.ten[nn]}{nhan}</span>
          {m.mo && <span className="block text-sm text-muted-foreground">{m.mo[nn]}</span>}
        </span>
      </LienKet>
    );
  }

  return (
    <LienKet href={m.href} anchor={anchor} dong={dong} className="-mx-2 block rounded-md px-2 py-1 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="flex items-center gap-2 text-[15px] font-medium text-foreground">{m.ten[nn]}{nhan}</span>
      {m.mo && <span className="block text-sm text-muted-foreground">{m.mo[nn]}</span>}
    </LienKet>
  );
}

function Nhom({ nhom, nn, anchor, dong }: { nhom: NhomMenu; nn: NgonNgu; anchor: Dan; dong: () => void }) {
  const coIcon = nhom.muc.some((m) => m.icon);
  return (
    <div>
      <p className="mb-5 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">{nhom.tieuDe[nn]}</p>
      <div className={`grid ${coIcon ? 'gap-5' : 'gap-3'}`}>
        {nhom.muc.map((m) => <Muc key={m.ten.vi} m={m} nn={nn} anchor={anchor} dong={dong} />)}
      </div>
      {nhom.ghiChu && <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{nhom.ghiChu[nn]}</p>}
    </div>
  );
}

function CotNoiBat({ nb, nn, anchor, dong }: { nb: NoiBat; nn: NgonNgu; anchor: Dan; dong: () => void }) {
  return (
    <div className="hidden border-l border-border bg-muted/40 p-8 lg:block">
      <p className="mb-5 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">{TIEU_DE_NOI_BAT[nn]}</p>
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
        <span className="mt-4 block text-[15px] font-medium text-foreground underline-offset-4 group-hover:underline">{nb.tieuDe[nn]}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{nb.mo[nn]}</span>
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
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">{cauHinh.hangDuoi.tieuDe[nn]}</p>
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
        {cauHinh.ten[nn]}
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
