import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Check, ChevronRight, X } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Chip, useCanh } from '@/components/landing/DemoTuChay';

/**
 * Trí tuệ nhân tạo (/tri-tue-nhan-tao) — các thẻ tính năng kiểu Ramp Intelligence,
 * bản MIMI.
 *
 * MỖI THẺ PHẢI TRỎ VỀ CODE ĐANG CHẠY, hoặc ghi "Đang xây". Hình trong thẻ là
 * minh hoạ bằng dữ liệu ví dụ; mã lý do (VUOT_HAN_MUC_NGAY, DOI_SO_TAI_KHOAN…) và
 * tên công cụ MCP (xem_chinh_sach) là tên thật trong `_shared/tac-tu/chinh-sach.ts`
 * và `_shared/mcp/may-chu.ts`.
 *
 * Đã kiểm trước khi viết:
 *   - Tự phân loại sao kê: CHƯA có code (`sepay-map.ts` ghi `category: null`) → Đang xây.
 *   - Khớp yêu cầu chi với hoá đơn: yêu cầu có trường `so_hoa_don` nhưng chưa có
 *     bước đối chiếu với hoá đơn cơ quan thuế → Đang xây.
 *   - Bảng luật chặn nhiều nhất, gợi ý chỉnh chính sách: chưa có → Đang xây, không số liệu.
 *
 * Những thẻ Ramp có mà MIMI không làm (so giá với dữ liệu doanh nghiệp khác, tự
 * trả tiền, đàm phán thay) nằm ở mục cuối, kèm lý do — không lặng lẽ bỏ đi.
 */

type TrangThaiThe = 'chay' | 'xay';

function NhanTrangThai({ tt }: { tt: TrangThaiThe }) {
  return tt === 'chay' ? (
    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Đang chạy</span>
  ) : (
    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">Đang xây</span>
  );
}

/** Thẻ: vùng hình phía trên, chữ phía dưới. `khungRef` để hoạ tiết chỉ chạy khi thấy. */
function The({
  tt, tieuDe, mo, nen, cao = 'min-h-[300px]', khungRef, children,
}: {
  tt: TrangThaiThe;
  tieuDe: string;
  mo: string;
  nen: string;
  cao?: string;
  khungRef?: React.RefObject<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div ref={khungRef} className={`relative flex items-center justify-center p-5 sm:p-7 ${cao} ${nen}`}>
        <span className="absolute right-3 top-3 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {tt === 'xay' ? 'Đang xây · minh hoạ' : 'Minh hoạ'}
        </span>
        {children}
      </div>
      <div className="flex flex-1 flex-col border-t border-border p-6">
        <NhanTrangThai tt={tt} />
        <h3 className="mt-3 font-display text-xl font-semibold text-foreground text-balance">{tieuDe}</h3>
        <p className="mt-2 leading-relaxed text-muted-foreground">{mo}</p>
      </div>
    </article>
  );
}

const Hop = ({ children, rong = 'max-w-sm' }: { children: ReactNode; rong?: string }) => (
  <div className={`w-full ${rong} rounded-lg border border-border bg-card p-4 shadow-sm`}>{children}</div>
);

/* ── A1. Tự duyệt khi an toàn ─────────────────────────────────────── */
type DongKiem = { chu: string; dat: boolean | 'hoi' };
const CA_DUYET: Array<{
  agent: string; tien: string; mucDich: string; kiem: DongKiem[];
  ketQua: { loai: 'duyet' | 'cho' | 'chan'; chu: string };
}> = [
  {
    agent: 'agent-ha-tang', tien: '850.000đ', mucDich: 'Nạp tiền API tháng 9',
    kiem: [
      { chu: 'Dưới ngưỡng tự duyệt 1.000.000đ', dat: true },
      { chu: 'Người nhận trong danh sách', dat: true },
      { chu: 'Nhóm chi được phép: Hạ tầng AI', dat: true },
    ],
    ketQua: { loai: 'duyet', chu: 'Tự duyệt · chờ bạn trả' },
  },
  {
    agent: 'agent-quang-cao', tien: '4.500.000đ', mucDich: 'Nạp ngân sách quảng cáo tuần',
    kiem: [
      { chu: 'Trên ngưỡng tự duyệt 1.000.000đ', dat: 'hoi' },
      { chu: 'Người nhận trong danh sách', dat: true },
      { chu: 'Còn trong hạn mức tháng', dat: true },
    ],
    ketQua: { loai: 'cho', chu: 'Chờ bạn duyệt' },
  },
  {
    agent: 'agent-mua-hang', tien: '9.000.000đ', mucDich: 'Đặt thêm hàng mẫu',
    kiem: [
      { chu: 'Vượt hạn mức ngày 5.000.000đ', dat: false },
      { chu: 'Người nhận trong danh sách', dat: true },
      { chu: 'Nhóm chi được phép', dat: true },
    ],
    ketQua: { loai: 'chan', chu: 'Từ chối · VUOT_HAN_MUC_NGAY' },
  },
];
const NHIP_CA = [3200, 3200, 3200] as const;

function IconKiem({ dat }: { dat: DongKiem['dat'] }) {
  if (dat === true) return <Check size={13} className="shrink-0 text-emerald-600" />;
  if (dat === 'hoi') return <AlertTriangle size={13} className="shrink-0 text-amber-600" />;
  return <X size={13} className="shrink-0 text-destructive" />;
}

function TheTuDuyet() {
  const { khung, buoc } = useCanh(NHIP_CA, 0);
  const ca = CA_DUYET[buoc];
  return (
    <The
      khungRef={khung}
      tt="chay"
      nen="bg-secondary/60"
      cao="min-h-[340px]"
      tieuDe="Tự duyệt khi an toàn. Hỏi bạn khi không."
      mo="Khoản nào nằm gọn trong chính sách thì agent không phải chờ bạn. Trên ngưỡng, người nhận mới hay số tài khoản lạ thì dừng lại hỏi. Vượt hạn mức thì từ chối, kèm mã lý do agent đọc được. Kể cả khi tự duyệt, tiền vẫn chỉ đi khi bạn trả trong app ngân hàng."
    >
      <Hop>
        <motion.div key={buoc} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] text-muted-foreground">{ca.agent}</span>
            <Chip loai={ca.ketQua.loai}>{ca.ketQua.chu}</Chip>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">{ca.tien}</p>
          <p className="text-[13px] text-muted-foreground">{ca.mucDich}</p>
          <ul className="mt-3 grid gap-1.5 border-t border-border pt-3">
            {ca.kiem.map((k) => (
              <li key={k.chu} className="flex items-center gap-2 text-[12px] text-foreground">
                <IconKiem dat={k.dat} /> {k.chu}
              </li>
            ))}
          </ul>
        </motion.div>
        <div className="mt-3 flex gap-1" aria-hidden>
          {CA_DUYET.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i === buoc ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
      </Hop>
    </The>
  );
}

/* ── A2. Agent hỏi trong chính sách ────────────────────────────────── */
const NHIP_HOI = [1300, 1300, 1500, 3200] as const;

function TheHoiChinhSach() {
  const { khung, buoc } = useCanh(NHIP_HOI, 3);
  const hien = (i: number) => buoc >= i;
  return (
    <The
      khungRef={khung}
      tt="chay"
      nen="bg-primary/5"
      cao="min-h-[340px]"
      tieuDe="Agent tự hỏi còn được chi bao nhiêu."
      mo="Qua MCP, trước khi xin chi agent gọi xem_chinh_sach và nhận lại hạn mức còn lại hôm nay, tháng này, nhóm chi được phép. Agent biết luật trước khi đụng tới tiền, nên ít yêu cầu vô ích tới tay bạn."
    >
      <div className="grid w-full max-w-sm gap-2 text-[12px]">
        {hien(0) && (
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3 py-2 text-primary-foreground">
            Nạp thêm 6.000.000đ quảng cáo hôm nay được không?
          </motion.p>
        )}
        {hien(1) && (
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="w-fit rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground">
            → gọi <span className="text-foreground">xem_chinh_sach</span>
          </motion.p>
        )}
        {hien(2) && (
          <motion.pre initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="overflow-x-auto rounded-md bg-foreground p-3 font-mono text-[11px] leading-relaxed text-background">
{`han_muc_con_lai: {
  moi_lan: 5000000,
  ngay:    3500000,
  thang:  18200000
}`}
          </motion.pre>
        )}
        {hien(3) && (
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-[90%] rounded-lg rounded-bl-sm border border-border bg-card px-3 py-2 text-foreground">
            Hôm nay chỉ còn 3.500.000đ, và mỗi khoản tối đa 5.000.000đ. Tôi không gửi yêu cầu 6.000.000đ — bạn muốn nạp 3.500.000đ không?
          </motion.p>
        )}
      </div>
    </The>
  );
}

/* ── B1. Biết đang trả cho gì ──────────────────────────────────────── */
function TheTraChoGi() {
  return (
    <The
      tt="chay"
      nen="bg-secondary/60"
      tieuDe="Biết rõ đang trả cho gì, và vì sao."
      mo="Mỗi yêu cầu mang mục đích, nhóm chi, người nhận, số tiền bằng chữ và lý do vì sao cần bạn xem. Không phải đoán từ một dòng sao kê cụt."
    >
      <Hop>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Cần xem</span>
          <span className="font-mono text-[11px] text-muted-foreground">agent-nha-cung-cap</span>
        </div>
        <p className="mt-2 font-mono text-xl font-bold tabular-nums text-foreground">12.800.000đ</p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
          <dt className="text-muted-foreground">Mục đích</dt><dd className="text-foreground">Thanh toán lô bao bì tháng 9</dd>
          <dt className="text-muted-foreground">Nhóm chi</dt><dd className="text-foreground">Nhà cung cấp hàng hoá</dd>
          <dt className="text-muted-foreground">Hoá đơn</dt><dd className="font-mono text-foreground">00001234</dd>
        </dl>
        <p className="mt-3 rounded-md bg-destructive/5 px-2.5 py-1.5 font-mono text-[11px] text-destructive">DOI_SO_TAI_KHOAN</p>
      </Hop>
    </The>
  );
}

/* ── B2. Luật nào chặn nhiều nhất (đang xây) ───────────────────────── */
const LUAT_MINH_HOA = [
  ['TREN_NGUONG_DUYET', 88],
  ['NGUOI_NHAN_MOI', 61],
  ['VUOT_HAN_MUC_NGAY', 40],
  ['DOI_SO_TAI_KHOAN', 18],
] as const;

function TheLuatChan() {
  const { khung, buoc } = useCanh([900, 3600] as const, 1);
  return (
    <The
      khungRef={khung}
      tt="xay"
      nen="bg-primary/5"
      tieuDe="Thấy luật nào đang chặn nhiều nhất."
      mo="Gom mã lý do trong nhật ký theo tuần, để biết agent vướng luật nào nhiều — và luật nào có lẽ đang đặt quá chặt. Độ dài cột trong hình là ví dụ, không phải số liệu."
    >
      <Hop>
        <p className="text-[11px] text-muted-foreground">Lý do dừng · 7 ngày</p>
        <div className="mt-3 grid gap-2.5">
          {LUAT_MINH_HOA.map(([ma, dai], i) => (
            <div key={ma}>
              <p className="font-mono text-[11px] text-foreground">{ma}</p>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <motion.span
                  className="block h-full rounded-full bg-primary"
                  initial={false}
                  animate={{ width: buoc >= 1 ? `${dai}%` : '0%' }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          ))}
        </div>
      </Hop>
    </The>
  );
}

/* ── B3. Gợi ý chỉnh chính sách (đang xây) ─────────────────────────── */
function TheGoiY() {
  return (
    <The
      tt="xay"
      nen="bg-secondary/60"
      tieuDe="Chính sách tốt lên theo cách bạn duyệt."
      mo="Khi bạn liên tục duyệt tay cùng một kiểu khoản, MIMI đề xuất một thay đổi luật cụ thể. Đề xuất chỉ là đề xuất: không bấm Áp dụng thì không có gì đổi."
    >
      <Hop>
        <p className="text-[11px] font-semibold text-primary">Gợi ý chính sách</p>
        <p className="mt-2 text-[13px] leading-relaxed text-foreground">
          Nâng ngưỡng tự duyệt của nhóm <strong>Hạ tầng AI, API, máy chủ</strong> lên <span className="font-mono">1.000.000đ</span>?
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">Mọi khoản dưới mức này trong 30 ngày qua bạn đều đã duyệt tay.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <span className="grid h-8 place-items-center rounded-lg border border-border text-[12px] text-foreground">Bỏ qua</span>
          <span className="grid h-8 place-items-center rounded-lg bg-primary text-[12px] font-semibold text-primary-foreground">Áp dụng</span>
        </div>
      </Hop>
    </The>
  );
}

/* ── C1. Chặn lừa đảo ──────────────────────────────────────────────── */
const NHIP_LUA = [1400, 3400] as const;

function TheLuaDao() {
  const { khung, buoc } = useCanh(NHIP_LUA, 1);
  return (
    <The
      khungRef={khung}
      tt="chay"
      nen="bg-destructive/5"
      cao="min-h-[320px]"
      tieuDe="Chặn lừa đảo trước khi tiền đi."
      mo="Cùng tên người nhận mà khác số tài khoản so với 180 ngày trước: cảnh báo đỏ. Người nhận mới thêm dưới 24 giờ: chưa được tự duyệt. Agent gọi dồn dập: chặn theo số yêu cầu mỗi giờ. Đây là ba kiểu kẻ gian hay dùng nhất khi chen vào một lệnh chuyển khoản."
    >
      <Hop>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">CÔNG TY TNHH ABC</span>
          {buoc >= 1 ? <Chip loai="chan">Nghi đổi số tài khoản</Chip> : <Chip loai="cho">Đang xét</Chip>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-md border border-border p-2">
            <p className="text-muted-foreground">Lần trước</p>
            <p className="font-mono text-foreground">MB · ••••6789</p>
          </div>
          <div className={`rounded-md border p-2 transition-colors ${buoc >= 1 ? 'border-destructive/50 bg-destructive/5' : 'border-border'}`}>
            <p className="text-muted-foreground">Lần này</p>
            <p className="font-mono text-foreground">VCB · ••••1188</p>
          </div>
        </div>
        {buoc >= 1 && (
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-[11px] text-muted-foreground">
            Gọi xác nhận qua số điện thoại bạn đã lưu từ trước — không dùng số trong tin nhắn đòi tiền.
          </motion.p>
        )}
      </Hop>
    </The>
  );
}

/* ── C2. Khớp ba chiều ─────────────────────────────────────────────── */
const BA_CHIEU: Array<{ tu: string; toi: string; tt: TrangThaiThe; cach: string }> = [
  { tu: 'Yêu cầu chi', toi: 'Sao kê', tt: 'chay', cach: 'Khớp theo nội dung chuyển khoản MIMI…' },
  { tu: 'Sao kê', toi: 'Hoá đơn điện tử', tt: 'chay', cach: 'Trong Chứng từ chi phí' },
  { tu: 'Yêu cầu chi', toi: 'Hoá đơn điện tử', tt: 'xay', cach: 'Theo số hoá đơn agent gửi kèm' },
];

function TheBaChieu() {
  return (
    <The
      tt="chay"
      nen="bg-secondary/60"
      cao="min-h-[320px]"
      tieuDe="Khớp ba chiều: yêu cầu, sao kê, hoá đơn."
      mo="Một khoản chỉ thành “Đã chi” khi sao kê xác nhận, không có nút nào tự đánh dấu. Tiền đã ra thì được ghép với hoá đơn đầu vào từ cơ quan thuế. Chiều thứ ba, ghép thẳng yêu cầu với hoá đơn, đang xây."
    >
      <div className="grid w-full max-w-sm gap-2">
        {BA_CHIEU.map((c) => (
          <div key={c.tu + c.toi} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                {c.tu} <ArrowRight size={12} className="text-muted-foreground" /> {c.toi}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">{c.cach}</p>
            </div>
            {c.tt === 'chay'
              ? <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500/15"><Check size={13} className="text-emerald-700 dark:text-emerald-400" /></span>
              : <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">Đang xây</span>}
          </div>
        ))}
      </div>
    </The>
  );
}

/* ── D. Bớt việc tay ───────────────────────────────────────────────── */
const DONG_PHAN_LOAI = [
  ['OPENAI API', 'Hạ tầng AI'],
  ['Quảng cáo Facebook', 'Quảng cáo'],
  ['In ấn ABC', 'Nhà cung cấp'],
] as const;

function ThePhanLoai() {
  return (
    <The
      tt="xay"
      nen="bg-primary/5"
      cao="min-h-[260px]"
      tieuDe="Không nhập tay nhóm chi từng dòng."
      mo="Dòng tiền ra trong sao kê được đề xuất nhóm chi, bạn chỉ sửa dòng sai. Hôm nay sao kê về MIMI chưa có nhóm chi — phần này đang xây."
    >
      <Hop>
        {DONG_PHAN_LOAI.map(([ten, nhom]) => (
          <div key={ten} className="flex items-center justify-between gap-3 border-b border-border/60 py-2 text-[12px] last:border-b-0">
            <span className="truncate text-foreground">{ten}</span>
            <span className="shrink-0 rounded-full border border-dashed border-primary/40 px-2 py-0.5 text-[11px] text-primary">{nhom}?</span>
          </div>
        ))}
      </Hop>
    </The>
  );
}

function TheHoaDon() {
  return (
    <The
      tt="chay"
      nen="bg-secondary/60"
      cao="min-h-[260px]"
      tieuDe="Không phải đi xin lại hoá đơn."
      mo="Hoá đơn điện tử mua vào đã nằm trên hệ thống cơ quan thuế. MIMI kéo về — chỉ đọc, chỉ sau khi bạn đồng ý — rồi chỉ ra khoản chi nào còn thiếu giấy tờ."
    >
      <Hop>
        {[['CÔNG TY IN ẤN ABC', true], ['VIETTEL IDC', true], ['Chuyển khoản 3.200.000đ', false]].map(([ten, co]) => (
          <div key={String(ten)} className="flex items-center justify-between gap-3 border-b border-border/60 py-2 text-[12px] last:border-b-0">
            <span className="truncate text-foreground">{ten}</span>
            {co
              ? <span className="flex shrink-0 items-center gap-1 text-emerald-700 dark:text-emerald-400"><Check size={12} /> Có hoá đơn</span>
              : <span className="shrink-0 text-amber-700 dark:text-amber-400">Thiếu hoá đơn</span>}
          </div>
        ))}
      </Hop>
    </The>
  );
}

function TheMaLyDo() {
  return (
    <The
      tt="chay"
      nen="bg-primary/5"
      cao="min-h-[260px]"
      tieuDe="Agent biết vì sao bị dừng."
      mo="Mỗi quyết định trả về mã lý do cố định kèm một câu tiếng Việt. Agent đọc mã để tự sửa yêu cầu; bạn đọc câu để hiểu. Không có “bị từ chối” mà không rõ vì sao."
    >
      <div className="w-full max-w-sm rounded-lg bg-foreground p-4 font-mono text-[11px] leading-relaxed text-background">
        <p className="opacity-60">{'{'} "ket_qua": "cho_duyet",</p>
        <p className="opacity-60">&nbsp;&nbsp;"ly_do": [</p>
        <p>&nbsp;&nbsp;&nbsp;&nbsp;{'{'} "ma": <span className="text-amber-300">"NGUOI_NHAN_MOI"</span>,</p>
        <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"cau": "Lần đầu chi cho người nhận này…" {'}'}</p>
        <p className="opacity-60">&nbsp;&nbsp;] {'}'}</p>
      </div>
    </The>
  );
}

/* ── Chưa làm ──────────────────────────────────────────────────────── */
const CHUA_LAM = [
  {
    ten: 'So giá bạn trả với doanh nghiệp khác',
    vi: 'Muốn so thì phải gộp dữ liệu chi tiêu của nhiều khách hàng. MIMI không dùng dữ liệu của bạn để trả lời câu hỏi của người khác.',
  },
  {
    ten: 'Tự trả tiền thay bạn',
    vi: 'MIMI không giữ và không chuyển tiền; muốn làm thế phải có giấy phép trung gian thanh toán. Khi ngân hàng mở khởi tạo thanh toán, lệnh vẫn do bạn xác nhận trong app ngân hàng.',
  },
  {
    ten: 'Nhắn tin, đàm phán với nhà cung cấp thay bạn',
    vi: 'Gửi lời thay bạn là cam kết thay bạn. Agent của bạn có thể làm việc đó; MIMI chỉ là lớp kiểm soát chi, không nói chuyện với bên thứ ba.',
  },
];

function TieuDeKhu({ nhan, children, mo }: { nhan: string; children: ReactNode; mo?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{nhan}</p>
      <h2 className="mt-3 font-serif font-normal text-foreground text-balance leading-[1.08] tracking-[-0.015em] text-[clamp(1.6rem,3vw,2.3rem)]">
        {children}
      </h2>
      {mo && <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{mo}</p>}
    </div>
  );
}

export default function TriTueNhanTaoPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen landing-light bg-background">
      <Navbar />

      <section className="mimi-hero-warm border-b border-border/60">
        <div className="container mx-auto px-4 pt-32 pb-16 lg:pt-40 lg:pb-20">
          <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Trang chủ</Link>
            <ChevronRight size={14} />
            <span>Sản phẩm</span>
            <ChevronRight size={14} />
            <span>Trí tuệ nhân tạo</span>
          </nav>
          <h1
            className="mt-6 max-w-3xl font-serif font-normal text-foreground text-balance leading-[1.05] tracking-[-0.02em]"
            style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}
          >
            Agent làm việc. Luật giữ tiền.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Agent AI của bạn xin chi, hỏi hạn mức, gửi kèm hoá đơn. Còn quyết định tiền có đi hay không thì MIMI xét
            bằng bộ luật cố định bạn đọc được — cùng một yêu cầu luôn ra cùng một kết quả, không phụ thuộc mô hình
            ngôn ngữ hôm đó trả lời thế nào.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-display text-[15px] font-semibold text-primary-foreground hover:bg-primary/90">
              Bắt đầu miễn phí <ArrowRight size={16} />
            </Link>
            <Link to="/san-pham/kiem-soat-agent" className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-6 text-[15px] font-medium text-foreground hover:bg-muted/60">
              Kiểm soát agent hoạt động thế nào
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <TieuDeKhu nhan="Duyệt chi" mo="Phần lớn khoản chi không cần bạn. Phần còn lại đến tay bạn kèm đủ lý do để quyết trong một chạm.">
            Duyệt đúng khoản cần duyệt.
          </TieuDeKhu>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <TheTuDuyet />
            <TheHoiChinhSach />
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-secondary/30 py-20">
        <div className="container mx-auto px-4">
          <TieuDeKhu nhan="Hiểu khoản chi">Thấy rõ, rồi mới chỉnh.</TieuDeKhu>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <TheTraChoGi />
            <TheLuatChan />
            <TheGoiY />
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <TieuDeKhu nhan="An toàn" mo="Ở Đông Nam Á, gần một nửa thiệt hại do lừa đảo đi qua chuyển khoản ngân hàng. Kẻ gian thắng bằng sự vội — nên MIMI làm chậm đúng lúc.">
            Kiểm hai lần trước khi tiền rời tài khoản.
          </TieuDeKhu>
          <a href="https://www.gasa.org/knowledge-base/blog/new-study-reveals-63-of-southeast-asians-experienced-scams-in-past-year" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
            Nguồn: GASA, State of Scams in Southeast Asia 2025
          </a>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <TheLuaDao />
            <TheBaChieu />
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-secondary/30 py-20">
        <div className="container mx-auto px-4">
          <TieuDeKhu nhan="Bớt việc tay">Việc lặp lại để máy làm.</TieuDeKhu>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <TheMaLyDo />
            <TheHoaDon />
            <ThePhanLoai />
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[1fr_1.6fr]">
          <TieuDeKhu nhan="Ranh giới" mo="Có những việc AI tài chính ở nơi khác làm mà MIMI chủ ý không làm.">
            Chưa làm — và vì sao.
          </TieuDeKhu>
          <ul className="divide-y divide-border border-y border-border">
            {CHUA_LAM.map((c) => (
              <li key={c.ten} className="flex gap-4 py-5">
                <X size={18} className="mt-1 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">{c.ten}</p>
                  <p className="mt-1 leading-relaxed text-muted-foreground">{c.vi}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Footer />
    </div>
  );
}
