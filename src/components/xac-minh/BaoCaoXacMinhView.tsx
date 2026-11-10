import { useEffect, useState } from 'react';
import { BadgeCheck, Clock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { nhomSo, type BaoCaoXacMinh } from '../../../supabase/functions/_shared/xac-minh/bao-cao.ts';
import { bamBaoCao } from '../../../supabase/functions/_shared/xac-minh/chuan-hoa.ts';
import type { TrangThaiNeo } from '@/lib/goiXacMinh';

/**
 * Hiển thị một báo cáo "Doanh thu đã xác minh" — dùng chung cho chủ hộ và người nhận đường dẫn.
 * Viết cho người không rành công nghệ: tiền đồng, ngày theo lịch Việt Nam, không mã kỹ thuật ngoài mã kiểm tra.
 * Tự băm lại báo cáo ngay trên máy người xem để so với mã kiểm tra — không cần tin MIMI.
 */

export type NgonNgu = 'vi' | 'en';

export const CHU = {
  vi: {
    doanhThu: 'Doanh thu', khoang: 'Doanh thu thật nằm trong khoảng', den: 'đến', ky: 'Kỳ', ky12: '12 tháng gần nhất', kyNam: 'Năm',
    lapNgay: 'Lập ngày', theoThang: 'Theo tháng', chuaCoDuLieu: 'chưa có dữ liệu', xacNhan: 'Tiền vào đã được giải thích',
    chuXacNhan: 'Chủ hộ tự xác nhận', tuDong: 'Chuyển giữa tài khoản của mình', chuaRo: 'Chưa rõ', loaiTru: 'Đã bỏ ra khỏi doanh thu',
    tienVay: 'Tiền vay', gopVon: 'Góp vốn', nguoiNha: 'Người nhà chuyển', hoanTien: 'Hoàn tiền', datCoc: 'Đặt cọc', khac: 'Khác',
    noiBo: 'Chuyển giữa tài khoản của mình', phamVi: 'Dữ liệu dùng để tính', vungChac: 'Kết luận chắc chắn', canXem: 'Còn phần chưa rõ',
    chuaDu: 'Chưa đủ dữ liệu', minhHoa: 'Đây là dữ liệu minh hoạ, không phải sổ sách thật.', maKiemTra: 'Mã kiểm tra (SHA-256)',
    khop: 'Đã băm lại trên máy bạn: khớp với mã kiểm tra.', khongKhop: 'Băm lại trên máy bạn KHÔNG khớp mã kiểm tra — đừng dùng báo cáo này.',
    dangKiem: 'Đang băm lại trên máy bạn…', neo: 'Dấu thời gian',
    neoChua: 'Chưa ghi dấu thời gian. MIMI sẽ tự thử lại.',
    neoCho: 'Đã gửi mã kiểm tra tới lịch công khai OpenTimestamps; đang chờ ghi vào Bitcoin (thường vài giờ).',
    neoXong: (k: number | null) => `Mã kiểm tra đã nằm trong khối Bitcoin số ${k ?? '—'}. Báo cáo không thể bị sửa sau thời điểm này mà không lộ.`,
    neoLoi: 'Bằng chứng dấu thời gian không hợp lệ.', taiOts: 'Tải tệp bằng chứng (.ots)',
    vuot: 'trên', duoi: 'dưới', chuaChac: 'chưa chắc', nguong1: 'Ngưỡng 01 tỷ', nguong3: 'Ngưỡng 03 tỷ',
  },
  en: {
    doanhThu: 'Revenue', khoang: 'Actual revenue is between', den: 'and', ky: 'Period', ky12: 'Last 12 months', kyNam: 'Year',
    lapNgay: 'Prepared on', theoThang: 'By month', chuaCoDuLieu: 'no data', xacNhan: 'Money received that is explained',
    chuXacNhan: 'Confirmed by the owner', tuDong: "Moved between the owner's accounts", chuaRo: 'Unclear', loaiTru: 'Excluded from revenue',
    tienVay: 'Loans', gopVon: 'Owner capital', nguoiNha: 'Family transfers', hoanTien: 'Refunds', datCoc: 'Deposits', khac: 'Other',
    noiBo: "Moved between the owner's accounts", phamVi: 'Data used', vungChac: 'Conclusion is firm', canXem: 'Some amounts are unclear',
    chuaDu: 'Not enough data', minhHoa: 'This is sample data, not real books.', maKiemTra: 'Check code (SHA-256)',
    khop: 'Re-hashed on your device: matches the check code.', khongKhop: 'Re-hashing on your device does NOT match the check code — do not rely on this report.',
    dangKiem: 'Re-hashing on your device…', neo: 'Timestamp',
    neoChua: 'Not timestamped yet. MIMI will retry automatically.',
    neoCho: 'The check code was sent to the public OpenTimestamps calendars; waiting to be recorded in Bitcoin (usually a few hours).',
    neoXong: (k: number | null) => `The check code is recorded in Bitcoin block ${k ?? '—'}. The report cannot be altered after this point without it showing.`,
    neoLoi: 'The timestamp proof is not valid.', taiOts: 'Download proof file (.ots)',
    vuot: 'above', duoi: 'below', chuaChac: 'not certain', nguong1: 'VND 1 billion threshold', nguong3: 'VND 3 billion threshold',
  },
} as const;

export const tien = (n: number | string, nn: NgonNgu) => (nn === 'vi' ? `${nhomSo(n)}đ` : `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} VND`);

/** "YYYY-MM-DD" hoặc mốc ISO → dd/mm/yyyy theo giờ Việt Nam. */
export function ngay(v: string | null | undefined): string {
  if (!v) return '—';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : (() => { const t = Date.parse(v); return Number.isNaN(t) ? '' : new Date(t + 7 * 3_600_000).toISOString().slice(0, 10); })();
  return d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '—';
}
const thang = (t: string) => `${t.slice(5, 7)}/${t.slice(0, 4)}`;
const pct = (pv: number | null, nn: NgonNgu) => (pv === null ? '—' : `${(pv / 100).toFixed(1).replace('.', nn === 'vi' ? ',' : '.')}%`);

function taiOts(b64: string, sha: string) {
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bin], { type: 'application/octet-stream' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `doanh-thu-${sha.slice(0, 12)}.ots`;
  a.click();
  URL.revokeObjectURL(url);
}

export function TrangThaiNeoDong({ trangThai, khoi, nn }: { trangThai: TrangThaiNeo | string; khoi: number | null; nn: NgonNgu }) {
  const c = CHU[nn];
  const [Icon, mau, cau] = trangThai === 'confirmed' ? [ShieldCheck, 'text-primary', c.neoXong(khoi)]
    : trangThai === 'pending' ? [Clock, 'text-mimi-amber', c.neoCho]
      : trangThai === 'failed' ? [ShieldAlert, 'text-destructive', c.neoLoi]
        : [Clock, 'text-muted-foreground', c.neoChua];
  return <p className={`flex items-start gap-2 text-sm ${mau}`}><Icon size={16} className="mt-0.5 shrink-0" /> <span>{cau}</span></p>;
}

export function BaoCaoXacMinhView({ bc, sha256, neo, nn }: {
  bc: BaoCaoXacMinh; sha256: string; nn: NgonNgu;
  neo: { trang_thai: TrangThaiNeo | string; khoi_bitcoin: number | null; ots?: string | null };
}) {
  const c = CHU[nn];
  const ld = bc.ly_do[nn];
  const [khop, setKhop] = useState<boolean | null>(null);
  useEffect(() => {
    let huy = false;
    bamBaoCao(bc).then((h) => { if (!huy) setKhop(h === sha256); }).catch(() => { if (!huy) setKhop(false); });
    return () => { huy = true; };
  }, [bc, sha256]);

  const dt = bc.doanh_thu;
  const nhanTrangThai = dt.trang_thai === 'chac' ? c.vungChac : dt.trang_thai === 'can_xem' ? c.canXem : c.chuaDu;
  const lonNhat = Math.max(1, ...bc.theo_thang.map((t) => t.doanh_thu));
  const loai: [string, number][] = [
    [c.tienVay, bc.loai_tru.tien_vay], [c.gopVon, bc.loai_tru.gop_von], [c.nguoiNha, bc.loai_tru.nguoi_nha],
    [c.hoanTien, bc.loai_tru.hoan_tien], [c.datCoc, bc.loai_tru.dat_coc], [c.khac, bc.loai_tru.khac], [c.noiBo, bc.loai_tru.chuyen_noi_bo],
  ];

  return (
    <div className="space-y-5">
      {bc.du_lieu_minh_hoa && <p className="rounded-xl bg-mimi-amber/15 px-3 py-2 text-sm text-mimi-amber">{c.minhHoa}</p>}

      <section className="rounded-2xl border border-border p-4">
        <p className="text-sm text-muted-foreground">
          {bc.doanh_nghiep.ten ? `${bc.doanh_nghiep.ten} · ` : ''}{c.ky}: {bc.ky.loai === '12_thang' ? c.ky12 : c.kyNam} ({ngay(bc.ky.tu_ngay)} – {ngay(bc.ky.den_ngay)}) · {c.lapNgay} {ngay(bc.lap_ngay)}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-foreground">{c.doanhThu}: {tien(dt.uoc_tinh, nn)}</h2>
        <p className="mt-1 text-sm text-foreground">{c.khoang} <b>{tien(dt.can_duoi, nn)}</b> {c.den} <b>{tien(dt.can_tren, nn)}</b>.</p>
        <p className="mt-1 text-xs text-muted-foreground">{nhanTrangThai}. {ld.khoang}</p>
        <ul className="mt-2 flex flex-wrap gap-2 text-xs">
          {dt.nguong.map((n) => (
            <li key={n.ma} className="rounded-full bg-accent px-2.5 py-1 text-foreground">
              {n.ma === 'mien_thue_1_ty' ? c.nguong1 : c.nguong3}: {n.phia === 'tren' ? c.vuot : n.phia === 'duoi' ? c.duoi : c.chuaChac}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">{ld.doanh_thu}</p>
      </section>

      <section className="rounded-2xl border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground">{c.theoThang}</h3>
        <ul className="mt-3 space-y-1.5">
          {bc.theo_thang.map((t) => (
            <li key={t.thang} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2 text-xs">
              <span className="text-muted-foreground">{thang(t.thang)}</span>
              <span className="h-2 rounded-full bg-accent"><span className="block h-2 rounded-full bg-primary" style={{ width: `${Math.round((t.doanh_thu / lonNhat) * 100)}%` }} /></span>
              <span className="text-right tabular-nums text-foreground">{t.co_du_lieu ? tien(t.doanh_thu, nn) : c.chuaCoDuLieu}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">{ld.theo_thang}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">{c.xacNhan}</h3>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between"><dt>{c.chuXacNhan}</dt><dd>{pct(bc.tien_vao.ty_le_chu_xac_nhan_pv, nn)}</dd></div>
            <div className="flex justify-between"><dt>{c.tuDong}</dt><dd>{pct(bc.tien_vao.ty_le_tu_dong_pv, nn)}</dd></div>
            <div className="flex justify-between"><dt>{c.chuaRo}</dt><dd>{pct(bc.tien_vao.ty_le_chua_ro_pv, nn)}</dd></div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">{ld.xac_nhan}</p>
        </div>
        <div className="rounded-2xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">{c.loaiTru}</h3>
          <dl className="mt-2 space-y-1 text-sm">
            {loai.filter(([, v]) => v > 0).map(([k, v]) => <div key={k} className="flex justify-between"><dt>{k}</dt><dd>{tien(v, nn)}</dd></div>)}
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">{ld.loai_tru}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground">{c.phamVi}</h3>
        <p className="mt-1 text-sm text-foreground">{ld.pham_vi}</p>
      </section>

      <section className="rounded-2xl border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground">{c.maKiemTra}</h3>
        <p className="mt-1 break-all font-mono text-xs text-foreground">{sha256}</p>
        <p className={`mt-1 flex items-center gap-1.5 text-xs ${khop === false ? 'text-destructive' : 'text-muted-foreground'}`}>
          {khop ? <BadgeCheck size={14} className="text-primary" /> : null}
          {khop === null ? c.dangKiem : khop ? c.khop : c.khongKhop}
        </p>
        <h3 className="mt-3 text-sm font-semibold text-foreground">{c.neo}</h3>
        <div className="mt-1"><TrangThaiNeoDong trangThai={neo.trang_thai} khoi={neo.khoi_bitcoin} nn={nn} /></div>
        {neo.ots ? (
          <button type="button" onClick={() => taiOts(neo.ots as string, sha256)} className="mt-2 text-xs font-medium text-primary underline">{c.taiOts}</button>
        ) : null}
      </section>

      <p className="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-foreground">{bc.luu_y[nn]}</p>
    </div>
  );
}
