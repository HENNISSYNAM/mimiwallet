import { motion } from 'framer-motion';
import { Check, Clock, FileSearch, Landmark, QrCode, ShieldCheck, UserCheck, type LucideIcon } from 'lucide-react';
import { Chip, Khung, useCanh } from './DemoTuChay';

/**
 * "Mỗi bước của agent đều để lại dấu vết" — hai khung.
 *
 * TRÁI — NHẬT KÝ (CÓ THẬT). Từng dòng hiện dần theo đúng vòng mà
 * `_shared/tac-tu/cong-tac-tu.ts` chạy: xin chi → đối chiếu hạn mức → người nhận
 * → ngưỡng duyệt → người duyệt → lệnh trả → sao kê. Mã `TREN_NGUONG_DUYET` là mã
 * thật của bộ luật; số liệu là ví dụ.
 *
 * PHẢI — SOẠN LUẬT TỪ VĂN BẢN (ĐANG XÂY, S4). Ghi nhãn "Đang xây" trên khung và
 * trong câu mô tả, vì chức năng này chưa có trong app.
 */

interface DongNhatKy {
  icon: LucideIcon;
  chu: string;
  chip?: { loai: 'cho' | 'duyet' | 'chi'; chu: string };
}

const DONG: DongNhatKy[] = [
  { icon: FileSearch, chu: 'agent-quang-cao xin chi 4.500.000đ cho CÔNG TY TNHH ABC — nạp ngân sách quảng cáo tháng 10.' },
  { icon: ShieldCheck, chu: 'Đối chiếu chính sách: trong trần mỗi lần 5.000.000đ và trần ngày 20.000.000đ.' },
  { icon: Check, chu: 'Người nhận nằm trong danh sách được phép từ 30 ngày trước.' },
  { icon: Clock, chu: 'Trên ngưỡng tự duyệt 2.000.000đ — dừng lại chờ chủ doanh nghiệp.', chip: { loai: 'cho', chu: 'TREN_NGUONG_DUYET' } },
  { icon: UserCheck, chu: 'Chủ doanh nghiệp bấm Duyệt.', chip: { loai: 'duyet', chu: 'Đã duyệt' } },
  { icon: QrCode, chu: 'Dựng lệnh trả VietQR, nội dung chuyển khoản MIMI4KQ2P7.', chip: { loai: 'duyet', chu: 'Lệnh trả' } },
  { icon: Landmark, chu: 'Sao kê về, khớp mã tham chiếu.', chip: { loai: 'chi', chu: 'Đã chi' } },
];
const NHIP_NHAT_KY = [700, 1000, 1000, 1000, 1300, 1100, 1000, 3200] as const;

function KhungNhatKy() {
  const { khung, buoc } = useCanh(NHIP_NHAT_KY, DONG.length);

  return (
    <Khung khungRef={khung} nen="bg-secondary/60" nhan="Minh hoạ">
      {/* Hai thẻ mờ phía sau: bối cảnh mà nhật ký đang đọc tới. */}
      <div aria-hidden className="pointer-events-none absolute left-4 top-12 hidden w-44 rounded-lg border border-border bg-card p-3 opacity-40 xl:block">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Chính sách</p>
        {['Mỗi lần · 5.000.000đ', 'Mỗi ngày · 20.000.000đ', 'Ngưỡng duyệt · 2.000.000đ'].map((d) => (
          <p key={d} className="mt-1.5 font-mono text-[10px] text-foreground">{d}</p>
        ))}
      </div>
      <div aria-hidden className="pointer-events-none absolute bottom-10 right-4 hidden w-44 rounded-lg border border-border bg-card p-3 opacity-40 xl:block">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Sao kê MB ••••6789</p>
        {['− 4.500.000 · MIMI4KQ2P7', '− 520.000 · API AI', '+ 12.000.000 · khách trả'].map((d) => (
          <p key={d} className="mt-1.5 font-mono text-[10px] text-foreground">{d}</p>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md rounded-lg border border-primary/30 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <p className="text-[13px] font-semibold text-foreground">Nhật ký · agent-quang-cao</p>
          <span className="text-[10px] text-muted-foreground">chỉ thêm, không sửa</span>
        </div>
        <ol className="mt-3 grid min-h-[280px] content-start gap-2.5">
          {DONG.slice(0, buoc).map((d, i) => {
            const Icon = d.icon;
            return (
              <motion.li key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 text-[12.5px] leading-snug text-foreground">
                <Icon size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  {d.chu}
                  {d.chip && (
                    <span className="mt-1 block">
                      <Chip loai={d.chip.loai}>{d.chip.chu}</Chip>
                    </span>
                  )}
                </span>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </Khung>
  );
}

export default function NhatKyAgent() {
  return (
    <section id="nhat-ky" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl">
          <h2 className="font-serif font-normal text-foreground text-balance leading-[1.05] tracking-[-0.015em] text-[clamp(2rem,4.2vw,3.25rem)]">
            Mỗi bước của agent đều để lại dấu vết
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Agent xin gì, luật nào quyết, ai duyệt, sao kê xác nhận lúc nào — ghi vào nhật ký chỉ-thêm mà không ai sửa được.
          </p>
        </div>
        <div className="mt-14 grid gap-x-8 gap-y-14 lg:grid-cols-2">
          <article>
            <KhungNhatKy />
            <h3 className="mt-6 font-display text-xl font-semibold text-foreground text-balance">Mỗi quyết định truy được tới luật.</h3>
            <p className="mt-2 max-w-lg leading-relaxed text-muted-foreground">
              Không có bước nào "tự nhiên xảy ra": mỗi dòng mang mã lý do của bộ luật và thời điểm, để kế toán và kiểm toán đọc lại được.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
