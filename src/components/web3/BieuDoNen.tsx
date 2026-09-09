import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Biểu đồ nến kèm khối lượng, vẽ bằng SVG.
 *
 * VÌ SAO TỰ VẼ THAY VÌ DÙNG THƯ VIỆN. Recharts đã có trong dự án nhưng không vẽ
 * nến — phải nhồi qua `Bar` với `shape` tuỳ biến, và khi đó phần khó (toạ độ,
 * thang, bấc, cột khối lượng) vẫn phải tự làm, chỉ thêm một lớp trung gian ở
 * giữa. Thêm một thư viện nến riêng thì nặng hơn cả trang.
 *
 * BỐN QUY TẮC VỀ TÍNH TRUNG THỰC CỦA HÌNH VẼ:
 *
 *  1. **Luôn ghi tên sàn.** Chuỗi lấy từ MỘT sàn (nến hai sàn không xếp chồng
 *     được — xem `chuoi-gia.ts`). Không ghi nguồn thì người xem coi nó là "giá",
 *     trong khi nó là "giá theo Binance".
 *  2. **Trục giá không từ 0**, vì từ 0 thì biến động cả tháng bị nén phẳng.
 *     Nhưng thế thì biên độ trông lớn hơn thật, nên khoảng thấp–cao ghi bằng số
 *     ngay dưới để con số nói lại điều hình vẽ phóng đại.
 *  3. **Mốc thiếu nói bằng chữ.** Nến vẽ liền nhau theo chỉ số, nên một ngày
 *     mất dữ liệu biến mất không dấu vết.
 *  4. **Khối lượng dùng thang riêng.** Gộp chung thang với giá thì cột khối
 *     lượng hoặc tàng hình hoặc nuốt cả biểu đồ.
 */

export type Khung = '1h' | '4h' | '1d' | '1w';

export interface ChuoiGiaUI {
  ma: string;
  san: string;
  nen: Array<{ t: number; mo: number; cao: number; thap: number; dong: number; kl: number }>;
  thapNhat: number | null;
  caoNhat: number | null;
  doiPhanTram: number | null;
  soMocThieu: number;
  khung: Khung;
  ghiChu: string;
}

const KHUNG: Khung[] = ['1h', '4h', '1d', '1w'];

const W = 600;
const H_GIA = 200;
const H_KL = 44;
const LE_PHAI = 62;
const LE_DUOI = 18;
const H = H_GIA + H_KL + LE_DUOI + 8;

export function BieuDoNen({
  chuoi,
  khung,
  onDoiKhung,
}: {
  chuoi: ChuoiGiaUI;
  khung: Khung;
  onDoiKhung: (k: Khung) => void;
}) {
  const { i18n } = useTranslation();
  const loc = i18n.language === 'en' ? 'en-US' : 'vi-VN';
  const so = (n: number, le = 2) => n.toLocaleString(loc, { maximumFractionDigits: le });
  const [tro, setTro] = useState<number | null>(null);

  const nen = chuoi.nen;

  const hinh = useMemo(() => {
    if (!nen.length) return null;
    const cao = Math.max(...nen.map((n) => n.cao));
    const thap = Math.min(...nen.map((n) => n.thap));
    // Đệm 4% mỗi đầu để nến cao nhất và thấp nhất không dính mép.
    const dem = (cao - thap) * 0.04 || cao * 0.01;
    const tren = cao + dem;
    const duoi = thap - dem;
    const klMax = Math.max(...nen.map((n) => n.kl), 1);

    const rongCot = (W - LE_PHAI) / nen.length;
    const rongThan = Math.max(1.5, Math.min(rongCot * 0.62, 14));

    const y = (gia: number) => ((tren - gia) / (tren - duoi)) * H_GIA;
    const x = (i: number) => i * rongCot + rongCot / 2;

    // Bốn mốc giá, làm tròn theo bậc của khoảng để nhãn đọc được.
    const moc = Array.from({ length: 5 }, (_, i) => duoi + ((tren - duoi) * i) / 4);

    return { tren, duoi, klMax, rongCot, rongThan, y, x, moc };
  }, [nen]);

  const chon = tro !== null && nen[tro] ? nen[tro] : nen.length ? nen[nen.length - 1] : null;
  const len = (chuoi.doiPhanTram ?? 0) >= 0;

  const nhanThoiGian = (t: number) =>
    khung === '1h' || khung === '4h'
      ? new Date(t).toLocaleString(loc, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      : new Date(t).toLocaleDateString(loc, { day: '2-digit', month: '2-digit', year: '2-digit' });

  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
      {/* ── Đầu thẻ: mã, giá cuối, đổi khung ────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-sm font-bold text-foreground">{chuoi.ma}</span>
          {chon && (
            <span className="font-mono text-lg font-bold text-foreground">{so(chon.dong)}</span>
          )}
          {chuoi.doiPhanTram !== null && (
            <span className={`font-mono text-xs font-semibold ${len ? 'text-mimi-green' : 'text-destructive'}`}>
              {len ? '+' : '−'}
              {so(Math.abs(chuoi.doiPhanTram))}%
            </span>
          )}
        </div>

        <div className="flex gap-0.5 rounded-lg bg-muted/60 p-0.5">
          {KHUNG.map((k) => (
            <button
              key={k}
              onClick={() => onDoiKhung(k)}
              className={`rounded-md px-2 py-1 font-mono text-[11px] transition-colors ${
                k === khung
                  ? 'bg-background font-semibold text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {!hinh || !nen.length ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{chuoi.ghiChu}</p>
      ) : (
        <>
          {/* Dòng OHLC của nến đang trỏ — đúng thói quen đọc của bảng giá. */}
          {chon && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-muted-foreground">
              <span>{nhanThoiGian(chon.t)}</span>
              <span>M {so(chon.mo)}</span>
              <span>C {so(chon.cao)}</span>
              <span>T {so(chon.thap)}</span>
              <span className={chon.dong >= chon.mo ? 'text-mimi-green' : 'text-destructive'}>
                Đ {so(chon.dong)}
              </span>
              <span>KL {so(chon.kl, 0)}</span>
            </div>
          )}

          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="mt-1 w-full touch-none"
            style={{ height: 'auto' }}
            onMouseLeave={() => setTro(null)}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const px = ((e.clientX - r.left) / r.width) * W;
              const i = Math.floor(px / hinh.rongCot);
              setTro(i >= 0 && i < nen.length ? i : null);
            }}
          >
            {/* Lưới ngang + nhãn giá bên phải, như bảng giá sàn. */}
            {hinh.moc.map((m, i) => (
              <g key={i}>
                <line
                  x1={0}
                  x2={W - LE_PHAI}
                  y1={hinh.y(m)}
                  y2={hinh.y(m)}
                  stroke="currentColor"
                  className="text-border"
                  strokeWidth={0.5}
                  strokeDasharray="2 3"
                />
                <text
                  x={W - LE_PHAI + 5}
                  y={hinh.y(m) + 3}
                  className="fill-muted-foreground"
                  style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace' }}
                >
                  {so(m, m > 1000 ? 0 : 2)}
                </text>
              </g>
            ))}

            {/* Nến: bấc mỏng, thân dày. Xanh khi đóng >= mở. */}
            {nen.map((n, i) => {
              const xanh = n.dong >= n.mo;
              const mau = xanh ? 'hsl(var(--mimi-green))' : 'hsl(var(--destructive))';
              const yT = hinh.y(Math.max(n.mo, n.dong));
              const cao = Math.max(1, Math.abs(hinh.y(n.mo) - hinh.y(n.dong)));
              return (
                <g key={n.t} opacity={tro === null || tro === i ? 1 : 0.55}>
                  <line
                    x1={hinh.x(i)}
                    x2={hinh.x(i)}
                    y1={hinh.y(n.cao)}
                    y2={hinh.y(n.thap)}
                    stroke={mau}
                    strokeWidth={1}
                  />
                  <rect
                    x={hinh.x(i) - hinh.rongThan / 2}
                    y={yT}
                    width={hinh.rongThan}
                    height={cao}
                    fill={mau}
                  />
                  {/* Cột khối lượng, thang riêng — xem quy tắc 4 ở đầu file. */}
                  <rect
                    x={hinh.x(i) - hinh.rongThan / 2}
                    y={H_GIA + 8 + (H_KL - (n.kl / hinh.klMax) * H_KL)}
                    width={hinh.rongThan}
                    height={Math.max(0.5, (n.kl / hinh.klMax) * H_KL)}
                    fill={mau}
                    opacity={0.35}
                  />
                </g>
              );
            })}

            {/* Vạch dóng theo con trỏ. */}
            {tro !== null && nen[tro] && (
              <line
                x1={hinh.x(tro)}
                x2={hinh.x(tro)}
                y1={0}
                y2={H_GIA + 8 + H_KL}
                stroke="currentColor"
                className="text-muted-foreground"
                strokeWidth={0.5}
                strokeDasharray="3 3"
              />
            )}

            {/* Nhãn thời gian: đầu, giữa, cuối. */}
            {[0, Math.floor(nen.length / 2), nen.length - 1].map((i, k) => (
              <text
                key={k}
                x={Math.min(Math.max(hinh.x(i), 20), W - LE_PHAI - 20)}
                y={H - 4}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace' }}
              >
                {nhanThoiGian(nen[i].t).split(',')[0]}
              </text>
            ))}
          </svg>

          <p className="mt-1 text-[11px] text-muted-foreground">
            {chuoi.thapNhat !== null && chuoi.caoNhat !== null && (
              <>
                {so(chuoi.thapNhat)} – {so(chuoi.caoNhat)} USD ·{' '}
              </>
            )}
            {chuoi.ghiChu}
          </p>
        </>
      )}
    </div>
  );
}
