import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import {
  docDong, docTep, doanTaiKhoan, goiSaoKe, nhanCot, TEN_COT,
  type BanDoCot, type Cot, type O,
} from '@/lib/saoKe';

/**
 * Tải sao kê lên — đường vào dữ liệu cho người chưa liên kết được ngân hàng.
 *
 * Việc số một của bản kiểm toán ra mắt (P-1): Cas đang tắc, SePay không có lịch sử, nên đây là
 * cách duy nhất đưa 12 tháng sao kê vào MIMI. Ngân hàng nào cũng cho tải sao kê Excel.
 *
 * Hỏi tối thiểu: MIMI tự nhận cột và tự đọc số tài khoản ở đầu sao kê; người dùng chỉ sửa khi
 * MIMI đoán sai. Xem trước rồi mới nhập. Nhập lại cùng tệp không sinh dòng trùng.
 */

const so = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n));
const ngay = (ymd: string) => ymd.split('-').reverse().join('/');
const LO = 3000;
const COT_SUA: Cot[] = ['ngay', 'co', 'no', 'so_tien', 'noi_dung', 'ten_doi_ung', 'so_tham_chieu', 'so_du'];

export function NhapSaoKe() {
  const [tenTep, setTenTep] = useState<string | null>(null);
  const [bang, setBang] = useState<O[][] | null>(null);
  const [banDo, setBanDo] = useState<BanDoCot | null>(null);
  const [taiKhoan, setTaiKhoan] = useState('');
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, setDang] = useState(false);
  const [suaCot, setSuaCot] = useState(false);
  const [ketQua, setKetQua] = useState<{ moi: number; trung: number; hong: number } | null>(null);

  const xem = useMemo(() => (bang && banDo ? docDong(bang, banDo) : null), [bang, banDo]);

  const chonTep = async (tep: File | undefined) => {
    if (!tep) return;
    setLoi(null); setKetQua(null); setTenTep(tep.name);
    try {
      const b = await docTep(tep);
      setBang(b);
      const bd = nhanCot(b);
      setBanDo(bd);
      setSuaCot(!bd);
      setTaiKhoan((tk) => tk || doanTaiKhoan(b) || '');
      if (!bd) setLoi('MIMI chưa nhận ra cột ngày và cột tiền trong tệp này. Chọn giúp MIMI bên dưới.');
    } catch (e) {
      setBang(null); setBanDo(null);
      setLoi(e instanceof Error ? e.message : 'Không đọc được tệp.');
    }
  };

  const doiCot = (cot: Cot, chiSo: string) => {
    const goc: BanDoCot = banDo ?? { dong_tieu_de: 0, cot: {}, tieu_de: (bang?.[0] ?? []).map((o) => String(o ?? '')) };
    const moi = { ...goc.cot };
    if (chiSo === '') delete moi[cot]; else moi[cot] = Number(chiSo);
    setBanDo({ ...goc, cot: moi });
  };

  const doiDongTieuDe = (i: number) => {
    const tieuDe = (bang?.[i] ?? []).map((o) => String(o ?? ''));
    setBanDo({ dong_tieu_de: i, cot: banDo?.cot ?? {}, tieu_de: tieuDe });
  };

  const nhap = async () => {
    if (!xem?.dong.length) return;
    setDang(true); setLoi(null);
    try {
      let importId: string | null = null;
      let moi = 0; let trung = 0; let hong = 0;
      for (let i = 0; i < xem.dong.length; i += LO) {
        const r = await goiSaoKe('nhap', { tai_khoan: taiKhoan, ten_tep: tenTep, dong: xem.dong.slice(i, i + LO), import_id: importId });
        importId = String(r.import_id);
        moi += Number(r.moi ?? 0); trung += Number(r.trung ?? 0); hong += Number(r.so_hong ?? 0);
      }
      setKetQua({ moi, trung, hong });
      setBang(null); setBanDo(null);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Chưa nhập được sao kê.');
    } finally {
      setDang(false);
    }
  };

  const vao = xem?.dong.filter((d) => d.type === 'income') ?? [];
  const ra = xem?.dong.filter((d) => d.type === 'expense') ?? [];
  const ngays = xem?.dong.map((d) => d.transaction_date).sort() ?? [];
  const tieuDe = banDo?.tieu_de ?? (bang?.[0] ?? []).map((o) => String(o ?? ''));

  return (
    <section aria-labelledby="nhap-sao-ke" className="rounded-2xl border border-border bg-card p-5">
      <h2 id="nhap-sao-ke" className="flex items-center gap-2 text-base font-semibold text-foreground"><FileSpreadsheet size={18} className="text-primary" /> Tải sao kê lên</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tải tệp sao kê Excel (.xlsx) hoặc .csv từ ứng dụng ngân hàng của bạn — MIMI tự nhận cột, tự tách tiền vào, tiền ra.
        Không cần liên kết ngân hàng. Nhập lại cùng tệp không bị trùng.
      </p>

      <label className="mt-3 inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-110">
        <Upload size={15} /> Chọn tệp sao kê
        <input type="file" accept=".xlsx,.csv,.txt,.xls" className="sr-only" onChange={(e) => void chonTep(e.target.files?.[0])} aria-label="Chọn tệp sao kê" />
      </label>
      {tenTep && <span className="ml-3 text-xs text-muted-foreground">{tenTep}</span>}

      {loi && <p role="alert" className="mt-3 rounded-xl border border-mimi-amber/30 bg-mimi-amber/5 p-3 text-sm text-foreground">{loi}</p>}

      {ketQua && (
        <div className="mt-3 rounded-xl border border-mimi-green/30 bg-mimi-green/5 p-3 text-sm text-foreground">
          Đã thêm {so(ketQua.moi)} giao dịch mới{ketQua.trung ? `, bỏ qua ${so(ketQua.trung)} dòng đã có` : ''}{ketQua.hong ? `, ${so(ketQua.hong)} dòng không dùng được` : ''}.{' '}
          <Link to="/dashboard" className="font-medium text-primary hover:underline">Xem tiền vào cần xem</Link>
        </div>
      )}

      {bang && (
        <div className="mt-4 space-y-3">
          {xem && xem.dong.length > 0 && (
            <p className="text-sm text-foreground">
              MIMI đọc được <span className="font-medium">{so(xem.dong.length)} giao dịch</span> từ {ngay(ngays[0])} đến {ngay(ngays[ngays.length - 1])}:
              {' '}{so(vao.length)} khoản tiền vào ({so(vao.reduce((s, d) => s + d.amount, 0))}đ), {so(ra.length)} khoản tiền ra ({so(ra.reduce((s, d) => s + d.amount, 0))}đ).
              {xem.loi.length > 0 && <span className="text-mimi-amber"> {xem.loi.length} dòng không đọc được (dòng {xem.loi.slice(0, 3).map((l) => l.dong).join(', ')}…).</span>}
            </p>
          )}

          <button type="button" onClick={() => setSuaCot(!suaCot)} className="text-xs font-medium text-primary hover:underline">
            {suaCot ? 'Ẩn cách đọc cột' : 'MIMI đọc sai cột? Sửa cách đọc'}
          </button>
          {suaCot && (
            <div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
              <label className="text-xs text-muted-foreground sm:col-span-2">
                Dòng tiêu đề
                <select value={banDo?.dong_tieu_de ?? 0} onChange={(e) => doiDongTieuDe(Number(e.target.value))} className="ml-2 h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground">
                  {bang.slice(0, 15).map((h, i) => <option key={i} value={i}>Dòng {i + 1}: {h.filter((o) => o !== null && o !== '').slice(0, 3).join(' | ').slice(0, 60)}</option>)}
                </select>
              </label>
              {COT_SUA.map((c) => (
                <label key={c} className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  {TEN_COT[c]}
                  <select value={banDo?.cot[c] ?? ''} onChange={(e) => doiCot(c, e.target.value)} className="h-8 max-w-[55%] rounded-lg border border-border bg-background px-2 text-xs text-foreground">
                    <option value="">— không có —</option>
                    {tieuDe.map((t, i) => <option key={i} value={i}>{t || `Cột ${i + 1}`}</option>)}
                  </select>
                </label>
              ))}
            </div>
          )}

          {xem && xem.dong.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[520px] text-xs">
                <caption className="sr-only">Năm dòng đầu MIMI đọc được</caption>
                <thead><tr className="text-left text-muted-foreground">{['Ngày', 'Vào / Ra', 'Số tiền', 'Nội dung'].map((h) => <th key={h} scope="col" className="px-2 py-1.5 font-medium">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-border">
                  {xem.dong.slice(0, 5).map((d, i) => (
                    <tr key={i}><td className="px-2 py-1.5">{ngay(d.transaction_date)}</td><td className="px-2 py-1.5">{d.type === 'income' ? 'Vào' : 'Ra'}</td><td className="px-2 py-1.5 text-right tabular-nums">{so(d.amount)}</td><td className="px-2 py-1.5 font-mono">{d.merchant_name ?? '—'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <label className="block text-sm text-foreground">
            Sao kê của tài khoản nào?
            <input value={taiKhoan} onChange={(e) => setTaiKhoan(e.target.value)} placeholder="Số tài khoản, ví dụ 0123456789"
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm sm:w-72" aria-label="Số tài khoản của sao kê" />
            <span className="mt-1 block text-xs text-muted-foreground">Để MIMI nhận ra tiền chuyển giữa các tài khoản của chính bạn — khoản đó không phải doanh thu.</span>
          </label>

          <button type="button" onClick={() => void nhap()} disabled={dang || !xem?.dong.length || !taiKhoan.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-40">
            {dang && <Loader2 size={15} className="animate-spin" />} Nhập {xem?.dong.length ? so(xem.dong.length) : ''} giao dịch
          </button>
        </div>
      )}
    </section>
  );
}
