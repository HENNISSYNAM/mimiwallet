import { useTranslation } from 'react-i18next';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/**
 * Biểu đồ giá 30 phiên.
 *
 * LUÔN GHI TÊN SÀN. Chuỗi này lấy từ MỘT sàn, không trộn — nến của hai sàn
 * không xếp chồng lên nhau được vì cửa sổ 24 giờ của chúng bắt đầu ở hai thời
 * điểm khác nhau (đo được 09/09/2026, xem `gia-san.ts`). Một biểu đồ không ghi
 * nguồn thì người xem mặc định coi nó là "giá", trong khi nó là "giá theo
 * Binance" hoặc "giá theo Coinbase" — hai thứ gần nhau nhưng không bằng nhau.
 *
 * MỐC THIẾU PHẢI HIỆN THÀNH CHỮ. Biểu đồ đường nối thẳng qua chỗ trống mà không
 * để lại dấu vết nào, nên người xem thấy một đường liền và tưởng dữ liệu liền.
 * Không có cách vẽ nào sửa được điều đó một cách trung thực, nên nói bằng chữ.
 *
 * TRỤC GIÁ KHÔNG BẮT ĐẦU TỪ 0, và đó là chủ ý cho biểu đồ giá tài sản: bắt đầu
 * từ 0 thì mọi biến động trong tháng bị nén thành một đường phẳng. Nhưng vì thế
 * mà biên độ trông lớn hơn thực tế — nên khoảng giá thấp nhất/cao nhất được ghi
 * rõ ngay dưới, để con số nói lại điều mà hình vẽ phóng đại.
 */

export interface ChuoiGiaUI {
  ma: string;
  san: string;
  nen: Array<{ t: number; mo: number; cao: number; thap: number; dong: number }>;
  thapNhat: number | null;
  caoNhat: number | null;
  doiPhanTram: number | null;
  soMocThieu: number;
  ghiChu: string;
}

export function BieuDoGia({ chuoi }: { chuoi: ChuoiGiaUI }) {
  const { i18n } = useTranslation();
  const loc = i18n.language === 'en' ? 'en-US' : 'vi-VN';
  const so = (n: number, le = 2) => n.toLocaleString(loc, { maximumFractionDigits: le });

  if (!chuoi.nen.length) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
        <p className="text-sm font-semibold text-foreground">{chuoi.ma}</p>
        <p className="mt-1 text-sm text-muted-foreground">{chuoi.ghiChu}</p>
      </div>
    );
  }

  const duLieu = chuoi.nen.map((n) => ({
    t: n.t,
    dong: n.dong,
    nhan: new Date(n.t).toLocaleDateString(loc, { day: '2-digit', month: '2-digit' }),
  }));

  const len = (chuoi.doiPhanTram ?? 0) >= 0;
  const mau = len ? 'hsl(var(--mimi-green))' : 'hsl(var(--destructive))';

  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-sm font-semibold text-foreground">{chuoi.ma}</p>
        {chuoi.doiPhanTram !== null && (
          <p className={`font-mono text-sm font-semibold ${len ? 'text-mimi-green' : 'text-destructive'}`}>
            {len ? '+' : '−'}
            {so(Math.abs(chuoi.doiPhanTram))}%
          </p>
        )}
      </div>

      <div className="mt-3 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={duLieu} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={`to-${chuoi.ma}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={mau} stopOpacity={0.25} />
                <stop offset="100%" stopColor={mau} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="nhan"
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
              interval="preserveStartEnd"
              minTickGap={28}
            />
            {/*
              `domain={['auto','auto']}` chứ không từ 0 — xem ghi chú đầu file.
              Khoảng thật được ghi bằng chữ ở dưới để bù lại phần hình phóng đại.
            */}
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
              width={54}
              tickFormatter={(v: number) => so(v, 0)}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 12,
                fontSize: 12,
              }}
              labelFormatter={(l) => String(l)}
              formatter={(v: number) => [`${so(v)} USD`, chuoi.ma]}
            />
            <Area type="monotone" dataKey="dong" stroke={mau} strokeWidth={2} fill={`url(#to-${chuoi.ma})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {chuoi.thapNhat !== null && chuoi.caoNhat !== null && (
          <>
            {so(chuoi.thapNhat)} – {so(chuoi.caoNhat)} USD ·{' '}
          </>
        )}
        {chuoi.ghiChu}
      </p>
    </div>
  );
}
