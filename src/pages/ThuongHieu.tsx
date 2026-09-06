import { useEffect, useState } from 'react';
import MimiCat from '@/components/brand/MimiCat';

/**
 * Bộ nhận diện MIMI — trang sống, không phải file tài liệu.
 *
 * VÌ SAO LÀ MỘT TRANG CHỨ KHÔNG PHẢI MỘT FILE .MD. Bài học lặp lại suốt ngày
 * 04/09: tài liệu trôi khỏi thực tế, và không ai biết cho tới lúc nó gây hại.
 * Mục "Cần bạn" trong nghiệm thu vẫn xin chạy sáu case đã đóng từ ba tuần
 * trước. Trang chủ vẫn hứa "Nhận vốn 24h" ba tuần sau khi mục Vay vốn bị gỡ vì
 * không có giấy phép.
 *
 * Một bộ nhận diện viết bằng chữ sẽ trôi y hệt. Nên trang này **đọc thẳng
 * token đang chạy** bằng `getComputedStyle` — ai đổi màu trong `index.css` thì
 * ô màu ở đây đổi theo, không cần ai nhớ cập nhật.
 *
 * VÀ NÓ TỰ KIỂM. Tỉ lệ tương phản tính tại chỗ từ giá trị thật, không chép từ
 * ghi chú. Đổi một token làm tụt tương phản thì trang này báo ngay, thay vì
 * phải chờ ai đó soát lại bằng mắt.
 */

/** Chuyển "220 8% 96%" (dạng token) sang RGB để tính tương phản. */
function hslSangRgb(chuoi: string): [number, number, number] | null {
  const m = chuoi.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!m) return null;
  const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const kenh = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [kenh(h + 1 / 3) * 255, kenh(h) * 255, kenh(h - 1 / 3) * 255];
}

/** Độ sáng tương đối theo WCAG 2.1. */
function doSang([r, g, b]: [number, number, number]): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function tuongPhan(a: string, b: string): number | null {
  const ra = hslSangRgb(a), rb = hslSangRgb(b);
  if (!ra || !rb) return null;
  const la = doSang(ra), lb = doSang(rb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const MAU = [
  { ten: '--bg-base', vaiTro: 'Nền trang' },
  { ten: '--bg-card', vaiTro: 'Mặt thẻ' },
  { ten: '--border-subtle', vaiTro: 'Đường viền' },
  { ten: '--text-primary', vaiTro: 'Chữ chính', doTuongPhanVoi: '--bg-base' },
  { ten: '--text-secondary', vaiTro: 'Chữ phụ', doTuongPhanVoi: '--bg-base' },
  { ten: '--text-muted', vaiTro: 'Chữ mờ', doTuongPhanVoi: '--bg-base' },
  { ten: '--blue-500', vaiTro: 'Hành động chính', doTuongPhanVoi: '--bg-surface' },
  { ten: '--green-500', vaiTro: 'Tiền vào, thành công', doTuongPhanVoi: '--bg-surface' },
  { ten: '--amber-500', vaiTro: 'Cần để ý', doTuongPhanVoi: '--bg-surface' },
  { ten: '--red-500', vaiTro: 'Tiền ra, lỗi', doTuongPhanVoi: '--bg-surface' },
];

/**
 * Quy tắc viết. Đây là phần một file tài liệu không thay được, và cũng là phần
 * người nhận xét ngày 04/09 chỉ ra là hỏng nặng nhất.
 *
 * Rút ra từ đọc fundiin.vn — chữ thật trên trang thật, không phải phỏng đoán.
 */
const GIONG = [
  {
    y: 'Tiêu đề là cụm động từ ngắn, không tính từ',
    nen: 'Nối tài khoản · Tách chi phí · Kê khai',
    dung: 'Nhanh gọn, minh bạch, an toàn chuẩn quốc tế',
    vi: 'Ba tính từ xếp cạnh nhau không nói được điều gì. Fundiin đặt tiêu đề là "Vay tín chấp", "Mua trước trả sau" — ba bốn chữ, người đọc biết ngay đó là gì.',
  },
  {
    y: 'Số liệu luôn có nhãn tiếng Việt',
    nen: 'Điểm tín dụng · 701',
    dung: 'Credit Score: 701',
    vi: 'Nhãn tiếng Anh trong giao diện tiếng Việt làm người đọc khựng lại đúng chỗ đáng lẽ họ phải đọc nhanh nhất.',
  },
  {
    y: 'Tiếng Anh chỉ cho thuật ngữ đã quen, và dịch kèm',
    nen: 'Row-Level Security ở tầng cơ sở dữ liệu',
    dung: 'hạ tầng production · setup trong 5 phút',
    vi: 'Fundiin viết "Mua trước trả sau (BNPL — Buy Now, Pay Later)": tiếng Việt trước, tiếng Anh trong ngoặc. Không bao giờ ngược lại.',
  },
  {
    y: 'Nút bấm nói việc sắp làm, không hô khẩu hiệu',
    nen: 'Mở tài khoản · Tạo mã QR · Xem chi tiết',
    dung: 'Sẵn sàng tăng tốc dòng tiền?',
    vi: 'Câu hỏi tu từ ở nút bấm là chỗ duy nhất người dùng không muốn suy nghĩ.',
  },
  {
    y: 'Không hứa thứ sản phẩm không làm được',
    nen: 'Bộ chứng từ sẵn cho kỳ thuế',
    dung: 'Nhận vốn 24h · Giải ngân 4 giờ · Hạn mức 1,36 tỷ',
    vi: 'MIMI không có giấy phép tín dụng và không có đối tác giải ngân. Những câu trên sống trên trang chủ ba tuần sau khi mục Vay vốn bị gỡ vì đúng lý do đó.',
  },
  {
    y: 'Trạng thái tốt thì im lặng',
    nen: 'Không có gì cần xử lý → hiện ngày tháng',
    dung: 'Chúc bạn một ngày tốt lành!',
    vi: 'Một câu vui vẻ mỗi lần mở app là tiếng ồn. Người dùng học cách bỏ qua nó, rồi bỏ qua luôn lúc nó nói thật.',
  },
  {
    y: 'Không dịch thẳng từ tiếng Anh',
    nen: 'Số này lấy từ hệ thống đang chạy',
    dung: 'Đã chạy thật, không phải mô phỏng',
    vi: '"Chạy thật" là dịch nguyên si "actually running". Đọc lên cấn vì tiếng Việt không nói vậy.',
  },
];

export default function ThuongHieu() {
  const [gt, setGt] = useState<Record<string, string>>({});

  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const ra: Record<string, string> = {};
    for (const m of MAU) ra[m.ten] = cs.getPropertyValue(m.ten).trim();
    ra['--bg-surface'] = cs.getPropertyValue('--bg-surface').trim();
    ra['--radius'] = cs.getPropertyValue('--radius').trim();
    setGt(ra);
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 space-y-16">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Bộ nhận diện
        </p>
        <h1 className="mt-3 font-serif text-[clamp(2rem,5vw,3.25rem)] font-normal leading-[1.05] tracking-[-0.02em]">
          MIMI viết và trông như thế nào
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Trang này đọc thẳng token đang chạy. Đổi màu trong <code className="font-mono text-xs">index.css</code> thì
          ô màu ở đây đổi theo — không ai phải nhớ cập nhật tài liệu.
        </p>
      </header>

      {/* ── Giọng viết ────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="font-serif text-3xl font-normal tracking-[-0.015em]">Giọng viết</h2>
        <p className="text-sm text-muted-foreground">
          Rút ra từ đọc fundiin.vn, và từ những câu đã phải gỡ khỏi chính sản phẩm này.
        </p>
        <div className="space-y-4">
          {GIONG.map((g) => (
            <div key={g.y} className="rounded-2xl border border-border/60 bg-card/50 p-5">
              <p className="font-semibold">{g.y}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <p className="rounded-xl bg-mimi-green/8 px-3 py-2 text-sm">
                  <span className="mr-1.5 font-mono text-[10px] uppercase text-mimi-green">Nên</span>
                  {g.nen}
                </p>
                <p className="rounded-xl bg-destructive/8 px-3 py-2 text-sm line-through decoration-destructive/40">
                  <span className="mr-1.5 font-mono text-[10px] uppercase text-destructive no-underline">Đừng</span>
                  {g.dung}
                </p>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{g.vi}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Màu ───────────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="font-serif text-3xl font-normal tracking-[-0.015em]">Màu</h2>
        <p className="text-sm text-muted-foreground">
          Tỉ lệ tương phản tính tại chỗ từ giá trị thật, không chép từ ghi chú. Dưới 4.5 là
          chưa đạt AA cho chữ thường.
        </p>
        <div className="overflow-hidden rounded-2xl border border-border/60">
          {MAU.map((m) => {
            const tp = m.doTuongPhanVoi ? tuongPhan(gt[m.ten] ?? '', gt[m.doTuongPhanVoi] ?? '') : null;
            return (
              <div key={m.ten} className="flex items-center gap-4 border-b border-border/40 p-3 last:border-0">
                <div
                  className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-border/60"
                  style={{ background: `hsl(${gt[m.ten] ?? '0 0% 50%'})` }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs">{m.ten}</p>
                  <p className="text-sm text-muted-foreground">{m.vaiTro}</p>
                </div>
                <p className="hidden font-mono text-xs text-muted-foreground sm:block">{gt[m.ten]}</p>
                {tp && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] ${
                      tp >= 4.5 ? 'bg-mimi-green/12 text-mimi-green' : 'bg-destructive/12 text-destructive'
                    }`}
                  >
                    {tp.toFixed(2)}:1
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Chữ ───────────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="font-serif text-3xl font-normal tracking-[-0.015em]">Ba giọng chữ</h2>
        <div className="space-y-4">
          {[
            { ten: 'Serif — Playfair Display', dung: 'Câu tuyên bố cỡ lớn, từ 28px trở lên', mau: <p className="font-serif text-3xl font-normal">Đóng thuế trên lợi nhuận</p>, ghi: 'Độ đậm dừng ở 500. Sức nặng đến từ khoảng lặng, không từ nét đậm.' },
            { ten: 'Sans — Inter', dung: 'Toàn bộ giao diện: nút, nhãn, thân bài', mau: <p className="text-base">Khách quét mã, tiền vào thẳng tài khoản của bạn.</p>, ghi: 'Giọng làm việc. Không dùng cho câu cảm xúc cỡ lớn.' },
            { ten: 'Mono — JetBrains Mono', dung: 'Số liệu, mã, nhãn viết hoa cỡ nhỏ', mau: <p className="font-mono text-sm">₫5.000 · Bgv44JpvIbxfvfmr</p>, ghi: 'Số tiền và mã tham chiếu luôn dùng mono để cột thẳng hàng.' },
          ].map((v) => (
            <div key={v.ten} className="rounded-2xl border border-border/60 bg-card/50 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">{v.ten}</p>
                <p className="text-xs text-muted-foreground">{v.dung}</p>
              </div>
              <div className="mt-3">{v.mau}</div>
              <p className="mt-3 text-sm text-muted-foreground">{v.ghi}</p>
            </div>
          ))}
        </div>
        <p className="rounded-xl border border-mimi-amber/30 bg-mimi-amber/8 p-4 text-sm">
          <strong>Không dùng DM Serif Display.</strong> Hướng dẫn thiết kế hay đề xuất font này, nhưng
          nó <strong>không có dấu tiếng Việt</strong> — mọi chữ "ế", "ộ", "ạ" sẽ rơi sang font khác giữa
          câu. Đã kiểm bằng cách dò dải U+1EA0 trong bảng CSS của Google Fonts.
        </p>
      </section>

      {/* ── Mimi ──────────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="font-serif text-3xl font-normal tracking-[-0.015em]">Mimi</h2>
        <div className="flex flex-wrap items-end gap-8 rounded-2xl border border-border/60 bg-card/50 p-6">
          <div className="text-center">
            <MimiCat variant="mark" className="mx-auto w-14" />
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">mark</p>
          </div>
          <div className="text-center">
            <MimiCat variant="live" glow="none" className="mx-auto w-20" tilt={8} />
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">live</p>
          </div>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>· <strong className="text-foreground">mark</strong> cho thanh điều hướng và chân trang — không chuyển động. Một dấu hiệu nhận diện mà nhúc nhích trong khung là tiếng ồn.</li>
          <li>· <strong className="text-foreground">live</strong> cho hero, màn hình chờ, lời chào. Cô ấy nháy mắt và phản ứng khi bị chạm.</li>
          <li>· Mặt Mimi mang <strong className="text-foreground">suy ra từ dữ liệu thật</strong>, không ngẫu nhiên. Chưa có dữ liệu thì ngủ, không cười.</li>
          <li>· Quầng sáng màu ngọc bích, không phải cam. Lông cam trên quầng cam thì mất viền.</li>
        </ul>
      </section>
    </div>
  );
}
