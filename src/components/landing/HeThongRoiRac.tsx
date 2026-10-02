import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FileSpreadsheet, Folder, Lock, Mail } from 'lucide-react';

/**
 * "Những hệ thống chưa từng nói chuyện với nhau" — vấn đề trước khi có MIMI.
 *
 * Một bức ghép các mảnh rời rạc mà một khoản chi ở doanh nghiệp nhỏ Việt Nam
 * thường phải đi qua: tin nhắn nhóm, file Excel theo dõi, hoá đơn giấy, mã OTP
 * ngân hàng, hộp thư, cổng tra cứu hoá đơn. Mọi mảnh đều vẽ bằng HTML, không
 * dùng logo hay giao diện thật của sản phẩm nào — đây là minh hoạ một tình trạng,
 * không phải ảnh chụp của ai.
 *
 * Bức ghép dựng trên khung cố định 1100×680 rồi thu nhỏ theo bề rộng thật, để bố
 * cục giữ nguyên trên điện thoại thay vì vỡ thành một cột thẻ rời.
 */

const RONG = 1100;
const CAO = 680;

function The({ trai, tren, rong, xoay = 0, children }: { trai: number; tren: number; rong: number; xoay?: number; children: ReactNode }) {
  return (
    <div
      className="absolute rounded-lg border border-border bg-card text-left shadow-[0_14px_40px_-20px_rgba(15,23,42,0.45)]"
      style={{ left: trai, top: tren, width: rong, transform: `rotate(${xoay}deg)` }}
    >
      {children}
    </div>
  );
}

function BongChat({ trai, tren, ten, loi }: { trai: number; tren: number; ten: string; loi: string }) {
  return (
    <div
      className="absolute flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.45)]"
      style={{ left: trai, top: tren, maxWidth: 260 }}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
        {ten.charAt(0)}
      </span>
      <span>
        <span className="block text-[11px] text-muted-foreground">{ten}</span>
        <span className="block text-[13px] font-semibold leading-snug text-foreground">{loi}</span>
      </span>
    </div>
  );
}

function ThuMuc({ trai, tren, nhan }: { trai: number; tren: number; nhan: string }) {
  return (
    <div className="absolute flex w-36 flex-col items-center gap-1 text-center" style={{ left: trai, top: tren }}>
      <Folder size={44} className="fill-primary/25 text-primary" strokeWidth={1.2} />
      <span className="text-[12px] leading-tight text-muted-foreground">{nhan}</span>
    </div>
  );
}

const DUONG_NOI = [
  'M 330 150 C 380 210, 330 260, 250 300',
  'M 470 70 C 530 50, 560 70, 600 100',
  'M 850 140 C 890 170, 910 150, 900 110',
  'M 480 430 C 520 410, 540 395, 560 380',
  'M 660 380 C 660 360, 650 350, 640 345',
  'M 780 300 C 790 250, 760 220, 740 200',
  'M 960 420 C 1000 360, 1010 280, 990 200',
  'M 390 610 C 340 570, 300 540, 280 500',
  'M 800 600 C 780 550, 790 520, 790 480',
];

export default function HeThongRoiRac() {
  const ngoai = useRef<HTMLDivElement>(null);
  const [tiLe, setTiLe] = useState(1);

  useEffect(() => {
    const el = ngoai.current;
    if (!el) return;
    const tinh = () => setTiLe(Math.min(1, el.clientWidth / RONG));
    tinh();
    const ro = new ResizeObserver(tinh);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <section className="py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif font-normal text-foreground text-balance leading-[1.05] tracking-[-0.015em] text-[clamp(2rem,4.2vw,3.25rem)]">
            Những hệ thống chưa từng nói chuyện với nhau
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Một khoản chi phần mềm thường phải đi qua ngần này chỗ trước khi vào được sổ.
          </p>
        </div>

        <div ref={ngoai} className="relative mx-auto mt-12 w-full max-w-[1100px]" style={{ height: CAO * tiLe }} aria-hidden>
          <div className="absolute left-0 top-0 origin-top-left" style={{ width: RONG, height: CAO, transform: `scale(${tiLe})` }}>
            <svg className="absolute inset-0 text-muted-foreground/60" width={RONG} height={CAO} fill="none" stroke="currentColor" strokeWidth={1.25}>
              {DUONG_NOI.map((d) => <path key={d} d={d} className="mimi-luong" />)}
            </svg>

            {/* Tin nhắn nhóm */}
            <The trai={40} tren={30} rong={290}>
              <div className="border-b border-border px-3 py-2 text-[12px] font-semibold text-foreground">Nhóm "Kế toán + Sếp"</div>
              <div className="grid gap-2 p-3 text-[12px]">
                <p className="max-w-[85%] rounded-md bg-muted px-2.5 py-1.5 text-foreground">Em ơi tiền máy chủ tháng này chuyển chưa?</p>
                <p className="ml-auto max-w-[85%] rounded-md bg-primary/10 px-2.5 py-1.5 text-foreground">Sếp duyệt chưa chị? Em chưa thấy tin</p>
                <p className="max-w-[85%] rounded-md bg-muted px-2.5 py-1.5 text-foreground">Sếp bảo gửi lại số tài khoản mới 🙏</p>
              </div>
            </The>

            {/* Hoá đơn giấy */}
            <The trai={370} tren={10} rong={160} xoay={-4}>
              <div className="p-3 font-mono text-[9px] leading-relaxed text-foreground/80">
                <p className="text-center text-[11px] font-bold">HOÁ ĐƠN BÁN LẺ</p>
                <p className="text-center">Cửa hàng văn phòng phẩm</p>
                <div className="my-2 border-t border-dashed border-border" />
                <p className="flex justify-between"><span>Giấy A4 x5</span><span>325.000</span></p>
                <p className="flex justify-between"><span>Mực in</span><span>480.000</span></p>
                <div className="my-2 border-t border-dashed border-border" />
                <p className="flex justify-between font-bold"><span>Tổng</span><span>805.000</span></p>
                <p className="mt-2 text-center text-muted-foreground">(bị ướt góc, mờ chữ)</p>
              </div>
            </The>

            {/* OTP ngân hàng */}
            <The trai={600} tren={60} rong={250}>
              <div className="p-4">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground"><Lock size={13} /> Nhập mã OTP</p>
                <div className="mt-3 flex gap-1.5">
                  {[4, 8, 1, 0, '', ''].map((s, i) => (
                    <span key={i} className="grid h-8 w-8 place-items-center rounded-md border border-destructive/50 font-mono text-sm text-foreground">{s}</span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-destructive">Mã OTP đã hết hạn. Vui lòng thực hiện lại giao dịch.</p>
              </div>
            </The>

            {/* Hộp thư */}
            <The trai={880} tren={20} rong={190}>
              <div className="p-3">
                <p className="flex items-center justify-between text-[12px] font-semibold text-foreground">
                  <span className="flex items-center gap-1.5"><Mail size={13} /> Hộp thư</span>
                  <span className="rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">1.284</span>
                </p>
                <p className="mt-2 text-[11px] text-foreground">[Nhắc] Hoá đơn điện tử tháng 9 chưa nhận</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Fwd: Fwd: ủy nhiệm chi bản scan</p>
              </div>
            </The>

            {/* Excel theo dõi chi */}
            <The trai={50} tren={300} rong={430} xoay={-1}>
              <div className="flex items-center gap-1.5 rounded-t-lg bg-emerald-700 px-3 py-1.5 text-[11px] font-semibold text-white">
                <FileSpreadsheet size={12} /> Theo_doi_chi_T9_ban_cuoi_v3.xlsx
              </div>
              <table className="w-full font-mono text-[10px] text-foreground">
                <thead>
                  <tr className="bg-muted text-muted-foreground">
                    {['Ngày', 'Nội dung', 'Số tiền', 'Có HĐ?', 'Đã trả?'].map((h) => <th key={h} className="border border-border px-1.5 py-1 text-left font-medium">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['02/09', 'Máy chủ', '1.150.000', 'Chưa', 'Rồi?'],
                    ['05/09', 'Quảng cáo', '3.200.000', 'Có', 'Rồi'],
                    ['09/09', 'Phần mềm', '249.000', '', '?'],
                    ['12/09', 'In ấn', '2.400.000', 'Chưa', 'Chưa'],
                    ['14/09', 'API AI', '520.000', '', ''],
                  ].map((r) => (
                    <tr key={r[0] + r[1]}>
                      {r.map((c, i) => <td key={i} className={`border border-border px-1.5 py-1 ${c.includes('?') ? 'bg-amber-500/15' : ''}`}>{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </The>

            <ThuMuc trai={520} tren={330} nhan="Chứng từ T9 (thiếu hoá đơn)" />

            {/* Cổng tra cứu hoá đơn */}
            <The trai={640} tren={300} rong={270}>
              <div className="p-4 text-[12px]">
                <p className="font-semibold text-foreground">Tra cứu hoá đơn điện tử</p>
                <div className="mt-3 grid gap-2">
                  <span className="rounded-md border border-border px-2 py-1.5 text-muted-foreground">Mã số thuế người bán</span>
                  <span className="rounded-md border border-border px-2 py-1.5 text-muted-foreground">Mã tra cứu</span>
                  <span className="flex items-center justify-between rounded-md border border-border px-2 py-1.5 text-muted-foreground">
                    Mã xác nhận <span className="font-mono tracking-[0.3em] text-foreground line-through">x7Qk</span>
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-destructive">Không tìm thấy hoá đơn.</p>
              </div>
            </The>

            <BongChat trai={900} tren={430} ten="Chị Lan · kế toán" loi="Khoản 4.500.000 này chi cho gì vậy em?" />
            <ThuMuc trai={330} tren={570} nhan="Uy_nhiem_chi_scan.pdf" />
            <BongChat trai={660} tren={590} ten="Minh · marketing" loi="Anh ơi duyệt giúp em khoản quảng cáo" />
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-muted-foreground">
          Mỗi chỗ giữ một mảnh sự thật. Không chỗ nào biết khoản chi đã thật sự đi chưa, và có chứng từ chưa.
        </p>
      </div>
    </section>
  );
}
