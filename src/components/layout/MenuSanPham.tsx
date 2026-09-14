import { useState } from 'react';
import {
  Bot, Calculator, CheckCircle2, ChevronDown, Code2, FileText, Landmark, LineChart, Lock, Plug, QrCode, Receipt, ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import mimiLogo from '@/assets/mimi-cat.webp';

/**
 * Menu "Sản phẩm" xổ lớn trên thanh điều hướng trang chủ.
 *
 * MỖI MỤC LÀ MỘT CHỨC NĂNG CÓ THẬT, trỏ tới đúng khu trên trang chủ nói về nó.
 * Chức năng chưa xong mang nhãn "Đang xây" ngay trong menu — menu là chỗ đầu
 * tiên người ta đọc danh sách sản phẩm, không được khoe nhiều hơn app làm được.
 *
 * Nhóm theo việc người dùng đến làm (chi tiêu, chứng từ, sổ), cùng cách chia ba
 * khu của thanh bên trong app, để trang chủ và app gọi một thứ bằng một tên.
 */

type NgonNgu = 'vi' | 'en';
type Chu = Record<NgonNgu, string>;

interface MucSanPham {
  icon: LucideIcon;
  ten: Chu;
  mo: Chu;
  href: string;
  nhan?: Chu;
}

interface NhomSanPham {
  ten: Chu;
  muc: MucSanPham[];
}

export const NHOM_SAN_PHAM: NhomSanPham[] = [
  {
    ten: { vi: 'Chi tiêu & duyệt', en: 'Spend & approvals' },
    muc: [
      { icon: Bot, ten: { vi: 'Kiểm soát agent', en: 'Agent controls' }, mo: { vi: 'Hạn mức, duyệt, nhật ký', en: 'Limits, approvals, audit log' }, href: '#agent-ai' },
      { icon: CheckCircle2, ten: { vi: 'Duyệt chi', en: 'Spend approvals' }, mo: { vi: 'Một chạm, tiền đi khi bạn trả', en: 'One tap, money moves when you pay' }, href: '#demo' },
      { icon: ShieldAlert, ten: { vi: 'Chống chuyển nhầm', en: 'Transfer protection' }, mo: { vi: 'Bắt đổi số tài khoản, giữ người nhận mới', en: 'Catch account swaps, hold new payees' }, href: '#demo' },
    ],
  },
  {
    ten: { vi: 'Hoá đơn & chứng từ', en: 'Invoices & documents' },
    muc: [
      { icon: QrCode, ten: { vi: 'Hoá đơn kèm mã QR', en: 'QR invoices' }, mo: { vi: 'Tự khớp khi tiền về', en: 'Reconcile when money arrives' }, href: '#solutions' },
      { icon: Receipt, ten: { vi: 'Chứng từ chi phí', en: 'Expense records' }, mo: { vi: 'Sổ chi phí kèm nguồn từng dòng', en: 'Every line with its source' }, href: '#solutions' },
      { icon: FileText, ten: { vi: 'Hoá đơn điện tử', en: 'E-invoices' }, mo: { vi: 'Đọc từ cơ quan thuế, chỉ đọc', en: 'Read-only from the tax authority' }, href: '#solutions' },
    ],
  },
  {
    ten: { vi: 'Sổ & thuế', en: 'Ledger & tax' },
    muc: [
      { icon: Landmark, ten: { vi: 'Đối soát sao kê', en: 'Statement matching' }, mo: { vi: 'Khớp tiền theo mã tham chiếu', en: 'Match money by reference code' }, href: '#features' },
      { icon: Calculator, ten: { vi: 'Hai cách tính thuế', en: 'Two tax methods' }, mo: { vi: 'Cho hộ kinh doanh từ 2026', en: 'For household businesses from 2026' }, href: '#solutions' },
    ],
  },
];

export const NEN_TANG: MucSanPham[] = [
  { icon: Code2, ten: { vi: 'MCP & API cho agent', en: 'MCP & agent API' }, mo: { vi: 'Nối Claude, Cursor trong một lệnh', en: 'Connect Claude, Cursor in one command' }, href: '#agent-ai' },
  { icon: LineChart, ten: { vi: 'Chi phí AI', en: 'AI costs' }, mo: { vi: 'Thấy và giới hạn chi phí AI', en: 'See and cap your AI spend' }, href: '#demo', nhan: { vi: 'Đang xây', en: 'In progress' } },
  { icon: Lock, ten: { vi: 'Bảo mật', en: 'Security' }, mo: { vi: 'Mã hoá kháng lượng tử, tách dữ liệu', en: 'Post-quantum encryption, data isolation' }, href: '#technology' },
  { icon: Plug, ten: { vi: 'Kết nối', en: 'Connections' }, mo: { vi: 'Ngân hàng, SePay, hoá đơn điện tử', en: 'Banks, SePay, e-invoices' }, href: '#features' },
];

const NHAN_TIEU_DE: Record<'noiBat' | 'nenTang' | 'xemDemo' | 'moDemo' | 'sanPham', Chu> = {
  sanPham: { vi: 'Sản phẩm', en: 'Products' },
  nenTang: { vi: 'Nền tảng', en: 'Platform' },
  noiBat: { vi: 'Nổi bật', en: 'Featured' },
  xemDemo: { vi: 'Xem MIMI làm việc', en: 'Watch MIMI work' },
  moDemo: {
    vi: 'Bốn khung tự chạy: duyệt chi, phân loại sao kê, bắt đổi số tài khoản.',
    en: 'Four self-running panels: approvals, statement sorting, account-swap alerts.',
  },
};

const ngonNgu = (lang: string): NgonNgu => (lang.startsWith('en') ? 'en' : 'vi');

function MucDong({ m, nn, href, dong }: { m: MucSanPham; nn: NgonNgu; href: string; dong: () => void }) {
  const Icon = m.icon;
  return (
    <a
      href={href}
      onClick={dong}
      className="group flex items-start gap-3.5 rounded-lg p-2 -m-2 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-foreground transition-colors group-hover:bg-background">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-[15px] font-medium text-foreground">
          {m.ten[nn]}
          {m.nhan && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
              {m.nhan[nn]}
            </span>
          )}
        </span>
        <span className="block text-sm text-muted-foreground">{m.mo[nn]}</span>
      </span>
    </a>
  );
}

/** Tấm menu trên máy tính. `anchor` đổi "#demo" thành "/#demo" khi không ở trang chủ. */
export function TamMenuSanPham({ lang, anchor, dong }: { lang: string; anchor: (h: string) => string; dong: () => void }) {
  const nn = ngonNgu(lang);
  return (
    <div className="grid overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_60px_-24px_rgba(15,23,42,0.35)] lg:grid-cols-[1fr_300px]">
      <div className="p-8">
        <div className="grid gap-8 md:grid-cols-3">
          {NHOM_SAN_PHAM.map((nhom) => (
            <div key={nhom.ten.vi}>
              <p className="mb-5 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">{nhom.ten[nn]}</p>
              <div className="grid gap-5">
                {nhom.muc.map((m) => <MucDong key={m.ten.vi} m={m} nn={nn} href={anchor(m.href)} dong={dong} />)}
              </div>
            </div>
          ))}
        </div>

        <div className="my-7 border-t border-border" />

        <p className="mb-5 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">{NHAN_TIEU_DE.nenTang[nn]}</p>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {NEN_TANG.map((m) => <MucDong key={m.ten.vi} m={m} nn={nn} href={anchor(m.href)} dong={dong} />)}
        </div>
      </div>

      <div className="hidden border-l border-border bg-muted/40 p-8 lg:block">
        <p className="mb-5 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">{NHAN_TIEU_DE.noiBat[nn]}</p>
        <a href={anchor('#demo')} onClick={dong} className="group block focus-visible:outline-none">
          <span className="mimi-hero-warm grid h-36 place-items-center overflow-hidden rounded-lg border border-border">
            <img src={mimiLogo} alt="" aria-hidden draggable={false} className="h-20 w-20 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
          </span>
          <span className="mt-4 block text-[15px] font-medium text-foreground group-hover:underline underline-offset-4">
            {NHAN_TIEU_DE.xemDemo[nn]}
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">{NHAN_TIEU_DE.moDemo[nn]}</span>
        </a>
      </div>
    </div>
  );
}

/** Bản điện thoại: một mục "Sản phẩm" xổ xuống trong menu toàn màn hình. */
export function MenuSanPhamDiDong({ lang, anchor, dong }: { lang: string; anchor: (h: string) => string; dong: () => void }) {
  const nn = ngonNgu(lang);
  const [mo, setMo] = useState(false);
  return (
    <div className="w-full max-w-sm">
      <button
        type="button"
        onClick={() => setMo((v) => !v)}
        aria-expanded={mo}
        className="flex w-full items-center justify-center gap-2 text-2xl font-display font-bold text-foreground"
      >
        {NHAN_TIEU_DE.sanPham[nn]}
        <ChevronDown size={22} className={`transition-transform ${mo ? 'rotate-180' : ''}`} />
      </button>
      {mo && (
        <div className="mt-6 grid gap-6 text-left">
          {[...NHOM_SAN_PHAM, { ten: NHAN_TIEU_DE.nenTang, muc: NEN_TANG }].map((nhom) => (
            <div key={nhom.ten.vi}>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">{nhom.ten[nn]}</p>
              <div className="grid gap-4">
                {nhom.muc.map((m) => <MucDong key={m.ten.vi} m={m} nn={nn} href={anchor(m.href)} dong={dong} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { NHAN_TIEU_DE };
