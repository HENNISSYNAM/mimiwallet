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

const NHIP_SOAN_LUAT = [1400, 1800, 3400] as const;

function KhungSoanLuat() {
  const { khung, buoc } = useCanh(NHIP_SOAN_LUAT, 2);

  return (
    <Khung khungRef={khung} nen="bg-primary/5" nhan="Đang xây · minh hoạ">
      <div className="relative w-full max-w-md">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <p className="text-lg font-semibold text-foreground">Chính sách chi tiêu · Công ty ABC</p>
          <p className="mt-1 text-[12px] text-muted-foreground">Cập nhật 09/2026 · Áp dụng cho mọi agent</p>

          <p className="mt-4 text-[13px] font-semibold text-foreground">2.1 Quảng cáo</p>
          <p className={`mt-1 rounded px-1 -mx-1 text-[13px] leading-relaxed text-foreground transition-colors ${buoc >= 1 ? 'bg-primary/10' : ''}`}>
            Khoản quảng cáo trên 2 triệu đồng phải có giám đốc duyệt.
          </p>
          <p className="mt-3 text-[13px] font-semibold text-foreground">2.2 Nhà cung cấp mới</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Không chuyển tiền cho tài khoản mới khi chưa gọi xác nhận qua số điện thoại đã lưu.
          </p>
        </div>

        {buoc === 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-[13px] text-foreground shadow-md"
          >
            <span className="grid grid-cols-2 gap-0.5" aria-hidden>
              {[0, 1, 2, 3].map((i) => <span key={i} className="h-1 w-1 animate-pulse rounded-full bg-foreground" style={{ animationDelay: `${i * 150}ms` }} />)}
            </span>
            Đang soạn gợi ý
          </motion.div>
        )}

        {buoc === 2 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-lg border border-primary/40 bg-card p-4 shadow-sm">
            <p className="text-[12px] font-semibold text-primary">Đề xuất luật · trích mục 2.1</p>
            <p className="mt-1.5 font-mono text-[12px] text-foreground">nhom_chi: quang_cao · nguong_can_duyet: 2.000.000đ</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <span className="grid h-8 place-items-center rounded-lg border border-border text-[12px] text-foreground">Bỏ qua</span>
              <span className="grid h-8 place-items-center rounded-lg bg-primary text-[12px] font-semibold text-primary-foreground">Áp dụng</span>
            </div>
          </motion.div>
        )}
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
          <article>
            <KhungSoanLuat />
            <h3 className="mt-6 font-display text-xl font-semibold text-foreground text-balance">Viết chính sách bằng lời, MIMI đề xuất luật.</h3>
            <p className="mt-2 max-w-lg leading-relaxed text-muted-foreground">
              Tải văn bản chính sách; MIMI gợi ý từng luật kèm trích điều khoản, bạn duyệt trước khi áp dụng. Chức năng đang xây.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
