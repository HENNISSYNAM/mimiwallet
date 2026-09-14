import { useId } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * "AI chi tiêu theo luật của bạn" — ba nguyên tắc của agent MIMI, mỗi nguyên tắc
 * một hình nét mảnh.
 *
 * HÌNH VẼ RIÊNG CỦA MIMI. Phong cách nét mảnh + đường chấm + vùng chấm li ti là
 * một thể loại minh hoạ phổ biến; ba hình dưới đây vẽ đúng ba cơ chế MIMI đang
 * chạy (khung trần, công tắc luật, cổng chờ người duyệt), không sao chép hình
 * của sản phẩm nào khác.
 *
 * CHỮ CHỈ NÓI ĐIỀU CÓ THẬT. Không có "học theo thời gian" hay số khách hàng: bộ
 * luật của MIMI là tất định (`_shared/tac-tu/chinh-sach.ts`), và mỗi câu dưới đây
 * ứng với một mã lý do có sẵn.
 *
 * Màu lấy từ `currentColor` và token (fill-background, fill-primary) nên đúng cả
 * nền sáng lẫn tối. Chuyển động nằm ở lớp `.mimi-luong` trong index.css và tắt khi
 * người dùng bật giảm chuyển động.
 */

function useMaCham() {
  // useId trả ":r1:" — dấu hai chấm làm hỏng url(#...) ở vài trình duyệt.
  return `cham-${useId().replace(/:/g, '')}`;
}

function MauCham({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={id} width="3" height="3" patternUnits="userSpaceOnUse">
        <circle cx="1.5" cy="1.5" r="0.7" className="fill-primary" stroke="none" />
      </pattern>
    </defs>
  );
}

const svgChung = {
  viewBox: '0 0 160 110',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.25,
  className: 'h-[110px] w-auto',
  'aria-hidden': true,
} as const;

/** Agent nối về lệnh chi bên trong khung chính sách; agent ngoài khung bị chặn. */
function HinhTrongTran() {
  const cham = useMaCham();
  const agent: Array<[number, number]> = [[34, 32], [88, 32], [34, 78], [88, 78]];
  return (
    <svg {...svgChung}>
      <MauCham id={cham} />
      <rect x="16" y="10" width="90" height="90" />
      {agent.map(([x, y]) => (
        <line key={`d${x}-${y}`} x1={x} y1={y} x2={61} y2={55} className="mimi-luong" />
      ))}
      {agent.map(([x, y]) => (
        <circle key={`a${x}-${y}`} cx={x} cy={y} r={7} className="fill-background" />
      ))}
      <circle cx={61} cy={55} r={10} fill={`url(#${cham})`} />
      <line x1={133} y1={55} x2={115} y2={55} className="mimi-luong" />
      <line x1={112} y1={44} x2={112} y2={66} strokeWidth={2.5} />
      <circle cx={140} cy={55} r={7} className="fill-background" />
    </svg>
  );
}

/** Văn bản chính sách tách thành các công tắc luật; điều khoản đang áp dụng được tô. */
function HinhChinhSach() {
  const cham = useMaCham();
  const hang = [30, 55, 80];
  const noi: Array<[number, number]> = [[34, 30], [62, 55], [90, 80]];
  return (
    <svg {...svgChung}>
      <MauCham id={cham} />
      <path d="M12 10 H48 L60 22 V100 H12 Z" />
      <path d="M48 10 V22 H60" />
      {[34, 48, 62, 76, 90].map((y, i) => (
        <line key={y} x1={20} y1={y} x2={i === 2 ? 52 : 44} y2={y} />
      ))}
      {noi.map(([tu, toi]) => (
        <path key={tu} d={`M56 ${tu} C 74 ${tu}, 74 ${toi}, 92 ${toi}`} className="mimi-luong" />
      ))}
      {hang.map((y, i) => (
        <g key={y}>
          <rect x={96} y={y - 7} width={30} height={14} rx={7} fill={i === 1 ? `url(#${cham})` : 'none'} />
          <circle cx={i === 1 ? 119 : 103} cy={y} r={4.5} className="fill-background" />
          <line x1={134} y1={y} x2={152} y2={y} />
        </g>
      ))}
    </svg>
  );
}

/** Điểm rẽ: nhánh trên tự duyệt, nhánh dưới dừng ở cổng chờ người. */
function HinhHoiNguoi() {
  const cham = useMaCham();
  return (
    <svg {...svgChung}>
      <MauCham id={cham} />
      <line x1={8} y1={55} x2={46} y2={55} className="mimi-luong" />
      <path d="M60 41 L74 55 L60 69 L46 55 Z" fill={`url(#${cham})`} />
      <path d="M74 55 L123 30" className="mimi-luong" />
      <circle cx={132} cy={25} r={10} className="fill-background" />
      <path d="M127.5 25 l3.5 3.5 l6.5 -7" />
      <path d="M74 55 L104 81" className="mimi-luong" />
      <line x1={108} y1={68} x2={108} y2={98} />
      <line x1={108} y1={78} x2={121} y2={78} strokeDasharray="2 3" />
      <circle cx={139} cy={73} r={6} className="fill-background" />
      <path d="M127 99 C127 87 151 87 151 99" />
    </svg>
  );
}

const HINH = [HinhTrongTran, HinhChinhSach, HinhHoiNguoi];

export default function AgentAiSection() {
  const { t } = useTranslation();
  const muc = t('landing.agentAi.items', { returnObjects: true }) as Array<{ title: string; desc: string }>;

  return (
    <section id="agent-ai" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl">
          <h2 className="font-serif font-normal text-foreground text-balance leading-[1.05] tracking-[-0.015em] text-[clamp(2rem,4.2vw,3.25rem)]">
            {t('landing.agentAi.title')}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{t('landing.agentAi.subtitle')}</p>
        </div>

        <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
          {muc.map((m, i) => {
            const Hinh = HINH[i] ?? HinhTrongTran;
            return (
              <article key={m.title} className="max-w-sm">
                <div className="text-foreground">
                  <Hinh />
                </div>
                <h3 className="mt-8 font-display text-[17px] font-semibold text-foreground">{m.title}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{m.desc}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
