import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, LineChart, Loader2, Repeat } from 'lucide-react';
import { goiTroLy } from '@/lib/goiTroLy';
import type { DuBaoDongTienML } from '../../../supabase/functions/_shared/dong-tien/du-bao.ts';

/**
 * Biểu đồ dự báo dòng tiền 13 tuần (10/11/2026) — mở dưới câu trả lời "dự báo dòng tiền" của trợ lý.
 *
 * Mọi con số do máy chủ tính (`_shared/dong-tien/`, action `du_bao_dong_tien_ml`); giao diện chỉ vẽ và viết nhãn.
 * Bấm mới tải (đọc toàn bộ sao kê là việc nặng). Số dư hôm nay chủ tự nhập, KHÔNG lưu ở đâu — chỉ gửi kèm lần tính này.
 * Đề xuất phân loại chỉ hiện để chủ biết; xác nhận vẫn ở màn phân loại tiền vào như cũ — ở đây không có nút áp dụng.
 */

/** Hợp đồng của action `du_bao_dong_tien_ml` (xem `_shared/dong-tien/doc-db.ts`, KetQuaDongTien). */
type Kq = DuBaoDongTienML & { doc: { so_dong: number }; de_xuat_phan_loai: { transaction_id: string }[] };

const CHU = {
  vi: {
    mo: 'Xem biểu đồ dự báo 13 tuần', dangTinh: 'MIMI đang đọc sao kê và chạy thử các cách dự báo…', loi: 'Chưa tính được dự báo',
    soDu: 'Số dư tài khoản hôm nay (không bắt buộc, không lưu)', tinhLai: 'Tính lại', tieuDe: 'Số dư dự kiến 13 tuần tới',
    tieuDeTuongDoi: 'Tiền tăng/giảm so với hôm nay, 13 tuần tới', khoang: 'Khoảng 8/10 khả năng', giua: 'Khả năng cao nhất',
    ruiRo: 'Tuần cần chú ý', dinhKy: 'Khoản đều đặn', dongChinh: 'Điều quyết định 13 tuần tới', thang: '3 tháng tới',
    vao: 'Tiền vào', ra: 'Tiền ra', rong: 'Chênh lệch', lanToi: 'lần tới', tinCay: 'chắc', deXuat: 'MIMI đoán (chờ bạn xác nhận)',
    caoRuiRo: 'Dễ âm', vuaRuiRo: 'Có thể âm', duLieu: (n: number, s: string) => `Tính trên ${n} giao dịch từ ${s}.`,
    chuKy: { tuan: 'hằng tuần', hai_tuan: '2 tuần/lần', thang: 'hằng tháng', quy: 'mỗi quý' } as Record<string, string>,
  },
  en: {
    mo: 'Show the 13-week forecast chart', dangTinh: 'MIMI is reading your statements and testing forecast methods…', loi: 'Could not compute the forecast',
    soDu: "Today's account balance (optional, not stored)", tinhLai: 'Recalculate', tieuDe: 'Expected balance, next 13 weeks',
    tieuDeTuongDoi: 'Change in cash vs today, next 13 weeks', khoang: '8 in 10 range', giua: 'Most likely',
    ruiRo: 'Weeks to watch', dinhKy: 'Regular flows', dongChinh: 'What drives the next 13 weeks', thang: 'Next 3 months',
    vao: 'In', ra: 'Out', rong: 'Net', lanToi: 'next', tinCay: 'sure', deXuat: 'MIMI guesses (waiting for your confirmation)',
    caoRuiRo: 'Likely negative', vuaRuiRo: 'May go negative', duLieu: (n: number, s: string) => `Based on ${n} transactions since ${s}.`,
    chuKy: { tuan: 'weekly', hai_tuan: 'every 2 weeks', thang: 'monthly', quy: 'quarterly' } as Record<string, string>,
  },
};

const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} ₫`;
const gon = (n: number) => {
  const a = Math.abs(n);
  const s = a >= 1e9 ? `${(a / 1e9).toFixed(1)} tỷ` : a >= 1e6 ? `${(a / 1e6).toFixed(0)} tr` : `${Math.round(a / 1e3)}k`;
  return n < 0 ? `−${s}` : s;
};
const ngan = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

function BieuDo({ kq, c }: { kq: Kq; c: (typeof CHU)['vi'] }) {
  const W = 640, H = 220, L = 56, R = 12, T = 12, B = 28;
  const ds = kq.tuan;
  const goc = kq.so_du_hien_tai ?? 0;
  const ys = [goc, 0, ...ds.flatMap((t) => [t.so_du.p10, t.so_du.p90])];
  const min = Math.min(...ys), max = Math.max(...ys);
  const pad = (max - min) * 0.08 || 1;
  const y = (v: number) => T + (H - T - B) * (1 - (v - (min - pad)) / (max - min + 2 * pad));
  const x = (i: number) => L + ((W - L - R) * i) / ds.length;
  const tren = ds.map((t, i) => `${x(i + 1)},${y(t.so_du.p90)}`);
  const duoi = ds.map((t, i) => `${x(i + 1)},${y(t.so_du.p10)}`).reverse();
  const vung = `M${x(0)},${y(goc)} L${tren.join(' L')} L${duoi.join(' L')} Z`;
  const giua = `M${x(0)},${y(goc)} ` + ds.map((t, i) => `L${x(i + 1)},${y(t.so_du.p50)}`).join(' ');
  const moc = [min, (min + max) / 2, max];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={kq.so_du_tuong_doi ? c.tieuDeTuongDoi : c.tieuDe}>
      {moc.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity={0.08} />
          <text x={L - 6} y={y(v) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">{gon(v)}</text>
        </g>
      ))}
      {min < 0 && max > 0 && <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="#B4532A" strokeDasharray="4 3" strokeOpacity={0.7} />}
      {ds.map((t, i) => t.rui_ro && (
        <rect key={t.tu} x={x(i)} width={x(1) - x(0)} y={T} height={H - T - B} fill={t.rui_ro === 'cao' ? '#B4532A' : '#B7791F'} fillOpacity={0.1} />
      ))}
      <path d={vung} fill="#1E7A4F" fillOpacity={0.15} />
      <path d={giua} fill="none" stroke="#1E7A4F" strokeWidth={2} />
      {ds.map((t, i) => i % 2 === 0 && (
        <text key={t.tu} x={x(i + 1)} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-[10px]">{ngan(t.den)}</text>
      ))}
    </svg>
  );
}

export function DuBaoDongTien() {
  const { i18n } = useTranslation();
  const ngon = i18n.language?.startsWith('vi') ? 'vi' : 'en';
  const c = CHU[ngon];
  const [kq, setKq] = useState<Kq | null>(null);
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [soDu, setSoDu] = useState('');

  async function tai() {
    setDang(true); setLoi(null);
    try {
      const so = soDu.replace(/[^\d-]/g, '');
      setKq((await goiTroLy('du_bao_dong_tien_ml', so ? { so_du_hien_tai: Number(so) } : {})) as unknown as Kq);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : c.loi);
    } finally {
      setDang(false);
    }
  }

  if (!kq) {
    return (
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => void tai()} disabled={dang}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-accent disabled:opacity-60">
          {dang ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <LineChart size={15} aria-hidden />}
          {dang ? c.dangTinh : c.mo}
        </button>
        {loi && <p className="text-sm text-mimi-amber">{c.loi}: {loi}</p>}
      </div>
    );
  }

  const dk = kq.dinh_ky.filter((d) => d.dang_hoat_dong).slice(0, 8);
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
      <p className="text-sm text-foreground">{kq.tom_tat}</p>
      {kq.che_do !== 'khong_du' && (
        <>
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); void tai(); }}>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {c.soDu}
              <input inputMode="numeric" value={soDu} onChange={(e) => setSoDu(e.target.value)} placeholder="0"
                className="h-8 w-48 rounded-md border border-border bg-background px-2 text-sm tabular-nums text-foreground" />
            </label>
            <button type="submit" disabled={dang} className="h-8 rounded-md border border-border px-3 text-sm hover:bg-accent disabled:opacity-60">
              {dang ? <Loader2 size={14} className="animate-spin" aria-hidden /> : c.tinhLai}
            </button>
          </form>
          <div>
            <p className="mb-1 text-sm font-medium text-foreground">{kq.so_du_tuong_doi ? c.tieuDeTuongDoi : c.tieuDe}</p>
            <BieuDo kq={kq} c={c} />
            <p className="mt-1 flex gap-4 text-xs text-muted-foreground">
              <span><span className="mr-1 inline-block h-2 w-3 rounded-sm bg-[#1E7A4F]/20" />{c.khoang}</span>
              <span><span className="mr-1 inline-block h-0.5 w-3 bg-[#1E7A4F] align-middle" />{c.giua}</span>
            </p>
          </div>
          {kq.tuan_rui_ro.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-medium text-foreground">{c.ruiRo}</p>
              <ul className="flex flex-col gap-1">
                {kq.tuan_rui_ro.map((t) => (
                  <li key={t.tu} className="flex items-center gap-2 text-sm">
                    <AlertTriangle size={14} className={t.muc === 'cao' ? 'text-[#B4532A]' : 'text-mimi-amber'} aria-hidden />
                    {ngan(t.tu)}–{ngan(t.den)} · {t.muc === 'cao' ? c.caoRuiRo : c.vuaRuiRo}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-medium text-foreground">{c.dongChinh}</p>
              <ul className="flex flex-col gap-1 text-sm">
                {kq.dong_chinh.slice(0, 6).map((d) => (
                  <li key={d.khoa} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{d.nhan}</span>
                    <span className={`tabular-nums ${d.chieu === 'ra' ? 'text-foreground' : 'text-mimi-green'}`}>{d.chieu === 'ra' ? '−' : '+'}{vnd(d.tong)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-foreground">{c.thang}</p>
              <ul className="flex flex-col gap-1 text-sm">
                {kq.thang.map((t) => (
                  <li key={t.khoa} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{t.khoa.slice(5, 7)}/{t.khoa.slice(0, 4)}</span>
                    <span className="tabular-nums text-foreground" title={`${vnd(t.rong.p10)} … ${vnd(t.rong.p90)}`}>{c.rong}: {vnd(t.rong.p50)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
      {dk.length > 0 && (
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-foreground"><Repeat size={14} aria-hidden />{c.dinhKy}</p>
          <ul className="flex flex-col gap-1 text-sm">
            {dk.map((d) => (
              <li key={`${d.ten}-${d.chieu}-${d.chu_ky}`} className="flex flex-wrap justify-between gap-x-3">
                <span className="text-foreground">{d.ten} <span className="text-muted-foreground">· {c.chuKy[d.chu_ky]} · {c.lanToi} {ngan(d.ngay_ke_tiep)} · {Math.round(d.do_tin_cay * 100)}% {c.tinCay}</span></span>
                <span className="tabular-nums">{d.chieu === 'ra' ? '−' : '+'}{vnd(d.so_tien_du_kien)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {kq.de_xuat_phan_loai.length > 0 && (
        <p className="text-xs text-muted-foreground">{c.deXuat}: {kq.de_xuat_phan_loai.length}</p>
      )}
      <ul className="flex flex-col gap-1 border-t border-border pt-3 text-xs text-muted-foreground">
        {kq.giai_thich.map((g) => <li key={g}>{g}</li>)}
        {kq.tu_ngay && <li>{c.duLieu(kq.doc.so_dong, ngan(kq.tu_ngay) + '/' + kq.tu_ngay.slice(0, 4))}</li>}
      </ul>
    </div>
  );
}
