/**
 * Dòng tiền 6 tháng cho Home (22/11/2026). Việc của biểu đồ: so sánh độ lớn tiền vào / tiền ra từng tháng → cột đôi,
 * một trục, hai màu đã qua kiểm mù màu (`--bieu-do-vao`, `--bieu-do-ra`), chú thích luôn hiện, rê chuột thấy số và
 * chênh lệch. Có bảng số đi kèm cho người đọc màn hình. Chữ dùng màu chữ, không dùng màu của cột.
 */
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { KhoanLon, ThangDongTien } from '@/lib/soLieuHome';

export const truc = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e9) return `${Math.round(n / 1e8) / 10} tỷ`;
  if (a >= 1e6) return `${Math.round(n / 1e6)} tr`;
  if (a >= 1e3) return `${Math.round(n / 1e3)} k`;
  return String(n);
};
const dong = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} ₫`;

function GoiY({ active, payload }: { active?: boolean; payload?: { payload: ThangDongTien }[] }) {
  if (!active || !payload?.length) return null;
  const t = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow">
      <p className="mb-1 font-medium">Tháng {t.khoa.slice(5)}/{t.khoa.slice(0, 4)}</p>
      <p><span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: 'var(--bieu-do-vao)' }} />Vào {dong(t.vao)}</p>
      <p><span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: 'var(--bieu-do-ra)' }} />Ra {dong(t.ra)}</p>
      <p className="mt-1 text-muted-foreground">Chênh {t.rong < 0 ? '−' : '+'}{dong(Math.abs(t.rong))}</p>
    </div>
  );
}

export function BieuDoDongTien({ thang }: { thang: ThangDongTien[] }) {
  const rong = thang.every((t) => t.vao === 0 && t.ra === 0);
  return (
    <figure className="space-y-2">
      <div className="flex items-center gap-4 text-xs text-muted-foreground" aria-hidden>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--bieu-do-vao)' }} />Tiền vào</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--bieu-do-ra)' }} />Tiền ra</span>
      </div>
      {rong ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Chưa có giao dịch trong 6 tháng. Liên kết ngân hàng để thấy dòng tiền thật.</p>
      ) : (
        <div className="h-56" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={thang} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
              <XAxis dataKey="nhan" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tickFormatter={truc} tickLine={false} axisLine={false} width={48} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip content={<GoiY />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} />
              <Bar dataKey="vao" name="Tiền vào" fill="var(--bieu-do-vao)" radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="ra" name="Tiền ra" fill="var(--bieu-do-ra)" radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <table className="sr-only">
        <caption>Dòng tiền 6 tháng</caption>
        <thead><tr><th>Tháng</th><th>Tiền vào</th><th>Tiền ra</th><th>Chênh lệch</th></tr></thead>
        <tbody>{thang.map((t) => <tr key={t.khoa}><td>{t.khoa}</td><td>{dong(t.vao)}</td><td>{dong(t.ra)}</td><td>{dong(t.rong)}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

export function BangKhoanLon({ ds }: { ds: KhoanLon[] }) {
  if (!ds.length) return <p className="py-6 text-center text-sm text-muted-foreground">Không có giao dịch trong 30 ngày.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground">
          <th className="py-2 font-medium">Ngày</th><th className="py-2 font-medium">Nội dung</th><th className="py-2 text-right font-medium">Số tiền</th>
        </tr>
      </thead>
      <tbody>
        {ds.map((k) => (
          <tr key={k.id} className="border-b last:border-0">
            <td className="whitespace-nowrap py-2 pr-3 tabular-nums text-muted-foreground">{k.ngay.slice(8)}/{k.ngay.slice(5, 7)}</td>
            <td className="max-w-[16rem] truncate py-2 pr-3 text-foreground" title={k.noi_dung}>{k.noi_dung}</td>
            <td className="whitespace-nowrap py-2 text-right tabular-nums text-foreground">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: k.chieu === 'vao' ? 'var(--bieu-do-vao)' : 'var(--bieu-do-ra)' }} aria-hidden />
              {k.chieu === 'vao' ? '+' : '−'}{dong(k.so_tien)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
