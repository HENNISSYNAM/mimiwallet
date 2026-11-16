/**
 * HÀNG DUYỆT kiểu Cursor: mỗi đề xuất của agent là một thay đổi xem lại được — khách, đề xuất, bằng chứng, tác động lên
 * con số — với Chấp nhận / Bỏ qua / Mở khách và phím tắt:
 *   J / ↓ việc sau · K / ↑ việc trước · Enter hoặc Tab chấp nhận · Esc bỏ qua · O mở khách · Ctrl/⌘+K bảng lệnh.
 *
 * Chấp nhận một đề xuất phân loại = gọi máy chủ ghi quyết định của NGƯỜI (xem `chapNhanDeXuat`). Việc chỉ dẫn đường
 * (hạn, dòng tiền, hồ sơ) thì "chấp nhận" là mở trang làm việc đó. "Bỏ qua" không ghi gì lên máy chủ — chỉ ẩn ở phiên này.
 * Duyệt hàng loạt chỉ cho việc không thể làm giảm doanh thu.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DeXuat, KhachVanPhong } from '@/lib/goiVanPhong';
import { AGENT, MAU_DEN, ngayGon, tienGon, type NgonNgu } from './chu';
import { boDau } from './hangDuyet';
import type { LoaiHanhDong } from './hanhDong';

const TEN_LOAI: Record<string, { vi: string; en: string }> = {
  business_revenue: { vi: 'tiền bán hàng (doanh thu)', en: 'sales revenue' },
  internal_transfer: { vi: 'chuyển giữa tài khoản của mình', en: 'own-account transfer' },
  loan: { vi: 'tiền vay', en: 'a loan' },
  capital_contribution: { vi: 'góp vốn', en: 'a capital contribution' },
  family_transfer: { vi: 'tiền người nhà, không phải doanh thu', en: 'family money, not revenue' },
  personal: { vi: 'tiền cá nhân', en: 'personal money' },
  refund: { vi: 'hoàn tiền', en: 'a refund' },
  deposit: { vi: 'đặt cọc', en: 'a deposit' },
  collection_on_behalf: { vi: 'thu hộ', en: 'collected on behalf of others' },
  other: { vi: 'khác', en: 'other' },
  unknown: { vi: 'chưa rõ', en: 'unclear' },
};

const T = {
  vi: {
    tieuDe: (n: number) => `Hàng chờ bạn duyệt · ${n}`,
    moTa: 'Agent đã làm phần máy làm được; mỗi dòng là một thay đổi chờ bạn quyết. Việc nặng đứng trước.',
    phim: 'J/K chọn · Enter chấp nhận · Esc bỏ qua · O mở khách · Ctrl+K bảng lệnh',
    chapNhan: 'Chấp nhận', boQua: 'Bỏ qua', moKhach: 'Mở khách', moTrang: 'Mở trang',
    hangLoat: (n: number) => `Chấp nhận ${n} việc rủi ro thấp`,
    hangLoatGhiChu: 'Chỉ gồm việc xác nhận là tiền bán hàng — không việc nào làm giảm doanh thu.',
    rong: 'Không còn việc nào chờ duyệt. Đèn các bàn đã xanh.',
    dangGhi: 'Đang ghi…',
    deXuatPl: (loai: string, tien: string) => `Xếp khoản ${tien} là ${loai}`,
    mayDaQuyet: 'MIMI đã tự xếp, chưa người nào ký nhận',
    han: (ten: string, ngay: string, n: number) => `${ten}: hạn ${ngay} (${n === 0 ? 'hôm nay' : `còn ${n} ngày`})`,
    toKhaiSan: (ten: string, ngay: string) => `Tờ khai đã đủ số: ${ten}, hạn ${ngay}`,
    dongTien: (t: string) => `30 ngày qua tiền ra nhiều hơn tiền vào ${t}`,
    viec: (n: number) => `${n} hồ sơ việc còn mở`,
    nguong: (t: string) => `Doanh thu có thể trên hoặc dưới ${t} — cần xem tiền vào`,
    bangChung: 'Bằng chứng', nguon: { quy_tac_noi_dung: 'Quy tắc đọc nội dung chuyển khoản', than_trong: 'Không có dấu hiệu nào — nguyên tắc thận trọng', lich_thue: 'Lịch thuế của khách', so_lieu: 'Số liệu sổ của khách' } as Record<string, string>,
    tinCay: { cao: 'tin cậy cao', trung_binh: 'tin cậy trung bình', thap: 'tin cậy thấp' } as Record<string, string>,
    tacDong: 'Tác động lên doanh thu năm', truoc: 'trước', sau: 'sau',
    phia: { tren: 'trên', duoi: 'dưới', chua_chac: 'chưa chắc' } as Record<string, string>,
    nguongTen: (t: string) => `Ngưỡng ${t}`,
    khongDuQuyen: 'Vai trò của bạn ở khách này không được xác nhận tiền vào.',
    bangLenh: 'Tìm khách hoặc lệnh…', khongThay: 'Không thấy.',
    lenh: { mo: 'Mở', tienVao: 'Xem tiền vào', toKhai: 'Soạn tờ khai', toi: 'Tới việc của' },
  },
  en: {
    tieuDe: (n: number) => `Review queue · ${n}`,
    moTa: 'The agents did what a machine can; each row is a change waiting for your decision. Hardest first.',
    phim: 'J/K move · Enter accept · Esc reject · O open client · Ctrl+K command palette',
    chapNhan: 'Accept', boQua: 'Reject', moKhach: 'Open client', moTrang: 'Open page',
    hangLoat: (n: number) => `Accept ${n} low-risk items`,
    hangLoatGhiChu: 'Only items confirming sales revenue — none of them can reduce revenue.',
    rong: 'Nothing left to review. All desks are green.',
    dangGhi: 'Saving…',
    deXuatPl: (loai: string, tien: string) => `Classify ${tien} as ${loai}`,
    mayDaQuyet: 'MIMI classified this itself; no person has signed off yet',
    han: (ten: string, ngay: string, n: number) => `${ten}: due ${ngay} (${n === 0 ? 'today' : `${n} days left`})`,
    toKhaiSan: (ten: string, ngay: string) => `Return has all its numbers: ${ten}, due ${ngay}`,
    dongTien: (t: string) => `${t} more went out than came in over 30 days`,
    viec: (n: number) => `${n} open case file${n === 1 ? '' : 's'}`,
    nguong: (t: string) => `Sales may be above or below ${t} — review incoming money`,
    bangChung: 'Evidence', nguon: { quy_tac_noi_dung: 'Bank-memo reading rule', than_trong: 'No sign of anything else — prudence rule', lich_thue: 'Client tax calendar', so_lieu: 'Client ledger numbers' } as Record<string, string>,
    tinCay: { cao: 'high confidence', trung_binh: 'medium confidence', thap: 'low confidence' } as Record<string, string>,
    tacDong: 'Effect on this year’s sales', truoc: 'before', sau: 'after',
    phia: { tren: 'above', duoi: 'below', chua_chac: 'unclear' } as Record<string, string>,
    nguongTen: (t: string) => `${t} threshold`,
    khongDuQuyen: 'Your role at this client cannot confirm incoming money.',
    bangLenh: 'Find a client or command…', khongThay: 'Nothing found.',
    lenh: { mo: 'Open', tienVao: 'Review incoming money', toKhai: 'Draft return', toi: 'Go to items of' },
  },
};

export function tieuDeDeXuat(d: DeXuat, n: NgonNgu): string {
  const t = T[n];
  switch (d.loai) {
    case 'phan_loai': return t.deXuatPl(TEN_LOAI[d.phan_loai!.de_xuat]?.[n] ?? d.phan_loai!.de_xuat, tienGon(d.so ?? 0, n));
    case 'han_thue': return t.han(d.ten_viec ?? '', ngayGon(d.ngay, n), d.so ?? 0);
    case 'to_khai_san_sang': return t.toKhaiSan(d.ten_viec ?? '', ngayGon(d.ngay, n));
    case 'dong_tien': return t.dongTien(tienGon(d.so ?? 0, n));
    case 'viec': return t.viec(d.so ?? 0);
    case 'nguong': return t.nguong(tienGon(d.so ?? 0, n));
  }
}

/** Việc chỉ dẫn đường: mở trang nào. */
export const TRANG_CUA: Record<Exclude<DeXuat['loai'], 'phan_loai'>, LoaiHanhDong> = {
  han_thue: 'soan_to_khai', to_khai_san_sang: 'soan_to_khai', dong_tien: 'dong_tien', viec: 'ho_so_viec', nguong: 'xem_tien_vao',
};

interface Props {
  hang: DeXuat[];
  khach: KhachVanPhong[];
  n: NgonNgu;
  dangGhi: ReadonlySet<string>;
  loi: Record<string, string>;
  onChapNhan: (ds: DeXuat[]) => void;
  onBoQua: (d: DeXuat) => void;
  diToi: (khachId: string, viec: LoaiHanhDong) => void;
  onChonKhach: (id: string) => void;
}

interface Lenh { khoa: string; nhan: string; chay: () => void }

export default function HangDuyetCursor({ hang, khach, n, dangGhi, loi, onChapNhan, onBoQua, diToi, onChonKhach }: Props) {
  const t = T[n];
  const [i, setI] = useState(0);
  const [moLenh, setMoLenh] = useState(false);
  const [tim, setTim] = useState('');
  const [iLenh, setILenh] = useState(0);
  const khung = useRef<HTMLDivElement>(null);
  const oTim = useRef<HTMLInputElement>(null);
  const chiSo = Math.min(i, Math.max(0, hang.length - 1));
  const dang = hang[chiSo] ?? null;
  const hangLoat = hang.filter((d) => d.duyet_hang_loat && !dangGhi.has(d.khoa));

  const chapNhan = (d: DeXuat | null) => {
    if (!d || dangGhi.has(d.khoa)) return;
    if (d.loai === 'phan_loai') { if (d.co_the_duyet) onChapNhan([d]); return; }
    diToi(d.company_id, TRANG_CUA[d.loai]);
  };

  // Ctrl/⌘+K ở bất kỳ đâu trên trang.
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setMoLenh(true); setTim(''); setILenh(0); }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);
  useEffect(() => { if (moLenh) oTim.current?.focus(); }, [moLenh]);
  useEffect(() => {
    khung.current?.querySelector<HTMLElement>(`[data-chi-so="${chiSo}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }, [chiSo]);

  const phim = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k === 'j' || k === 'J' || k === 'ArrowDown') { e.preventDefault(); setI(Math.min(hang.length - 1, chiSo + 1)); }
    else if (k === 'k' || k === 'K' || k === 'ArrowUp') { e.preventDefault(); setI(Math.max(0, chiSo - 1)); }
    else if (k === 'Enter' || (k === 'Tab' && !e.shiftKey)) { if (dang) { e.preventDefault(); chapNhan(dang); } }
    else if (k === 'Escape') { if (dang) { e.preventDefault(); onBoQua(dang); } }
    else if (k === 'o' || k === 'O') { if (dang) { e.preventDefault(); onChonKhach(dang.company_id); } }
  };

  const lenh = useMemo<Lenh[]>(() => {
    const ds: Lenh[] = [];
    if (hangLoat.length) ds.push({ khoa: 'hang-loat', nhan: t.hangLoat(hangLoat.length), chay: () => onChapNhan(hangLoat) });
    for (const k of khach) {
      ds.push({ khoa: `mo:${k.id}`, nhan: `${t.lenh.mo} ${k.ten}`, chay: () => onChonKhach(k.id) });
      const vt = hang.findIndex((d) => d.company_id === k.id);
      if (vt >= 0) ds.push({ khoa: `toi:${k.id}`, nhan: `${t.lenh.toi} ${k.ten}`, chay: () => { setI(vt); khung.current?.focus(); } });
      ds.push({ khoa: `tv:${k.id}`, nhan: `${t.lenh.tienVao} — ${k.ten}`, chay: () => diToi(k.id, 'xem_tien_vao') });
      ds.push({ khoa: `tk:${k.id}`, nhan: `${t.lenh.toKhai} — ${k.ten}`, chay: () => diToi(k.id, 'soan_to_khai') });
    }
    return ds;
  }, [khach, hang, hangLoat, t, onChapNhan, onChonKhach, diToi]);
  const timThay = useMemo(() => {
    const q = boDau(tim.trim());
    return (q ? lenh.filter((l) => q.split(/\s+/).every((w) => boDau(l.nhan).includes(w))) : lenh).slice(0, 12);
  }, [lenh, tim]);
  const chayLenh = (l: Lenh | undefined) => { if (!l) return; setMoLenh(false); l.chay(); };

  return (
    <section aria-labelledby="hang-duyet-tieu-de" className="rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="hang-duyet-tieu-de" className="text-base font-semibold text-foreground">{t.tieuDe(hang.length)}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t.moTa}</p>
          <p className="mt-1 text-[11px] text-muted-foreground"><kbd>{t.phim}</kbd></p>
        </div>
        {hangLoat.length > 0 && (
          <div className="text-right">
            <button type="button" onClick={() => onChapNhan(hangLoat)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
              {t.hangLoat(hangLoat.length)}
            </button>
            <p className="mt-1 max-w-[260px] text-[11px] text-muted-foreground">{t.hangLoatGhiChu}</p>
          </div>
        )}
      </div>

      {hang.length === 0 ? <p className="mt-3 text-sm text-muted-foreground" data-testid="hang-duyet-rong">{t.rong}</p> : (
        <div ref={khung} tabIndex={0} role="listbox" aria-label={t.tieuDe(hang.length)} aria-activedescendant={dang ? `de-xuat-${chiSo}` : undefined}
          onKeyDown={phim} data-testid="hang-duyet"
          className="mt-3 max-h-[560px] overflow-y-auto rounded-xl border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          {hang.map((d, j) => {
            const chon = j === chiSo;
            const m = AGENT[d.agent];
            return (
              <div key={d.khoa} id={`de-xuat-${j}`} role="option" aria-selected={chon} data-chi-so={j} data-khoa={d.khoa}
                onClick={() => setI(j)}
                className={`border-b p-3 last:border-b-0 ${chon ? 'bg-primary/5' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: MAU_DEN[d.muc] }} />
                  <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ background: m.mau }}>{m.ten[n]}</span>
                  <span className="text-sm font-medium text-foreground">{d.ten_khach}</span>
                  <span className="min-w-0 flex-1 text-sm text-muted-foreground">— {tieuDeDeXuat(d, n)}</span>
                </div>
                {chon && (
                  <div className="mt-2 space-y-2 pl-5 text-xs">
                    {d.phan_loai?.may_da_quyet && <p className="text-amber-700 dark:text-amber-400">{t.mayDaQuyet}</p>}
                    <div>
                      <p className="font-semibold text-foreground">{t.bangChung}</p>
                      {d.bang_chung.dong.map((b) => (
                        <p key={b.transaction_id} className="font-mono text-[11px] text-foreground">{ngayGon(b.ngay, n)} · {tienGon(b.so_tien, n)} · {b.noi_dung}</p>
                      ))}
                      <p className="text-muted-foreground">{t.nguon[d.bang_chung.nguon]} · {t.tinCay[d.bang_chung.tin_cay]}{d.bang_chung.ly_do ? ` — “${d.bang_chung.ly_do}”` : ''}</p>
                    </div>
                    {d.tac_dong && (
                      <div data-testid="tac-dong">
                        <p className="font-semibold text-foreground">{t.tacDong}</p>
                        <p className="text-foreground">
                          {t.truoc}: {tienGon(d.tac_dong.truoc.can_duoi, n)} – {tienGon(d.tac_dong.truoc.can_tren, n)} → {t.sau}: {tienGon(d.tac_dong.sau.can_duoi, n)} – {tienGon(d.tac_dong.sau.can_tren, n)}
                        </p>
                        {d.tac_dong.nguong.map((g) => (
                          <p key={g.ma} className={g.truoc !== g.sau ? 'font-medium text-red-600' : 'text-muted-foreground'}>
                            {t.nguongTen(tienGon(g.gia_tri, n))}: {t.phia[g.truoc]} → {t.phia[g.sau]}
                          </p>
                        ))}
                      </div>
                    )}
                    {d.loai === 'phan_loai' && !d.co_the_duyet && <p className="text-muted-foreground">{t.khongDuQuyen}</p>}
                    {loi[d.khoa] && <p role="alert" className="text-red-600">{loi[d.khoa]}</p>}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2 pl-5">
                  {d.loai === 'phan_loai' ? (
                    <button type="button" disabled={!d.co_the_duyet || dangGhi.has(d.khoa)} onClick={(e) => { e.stopPropagation(); chapNhan(d); }}
                      className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-40">
                      {dangGhi.has(d.khoa) ? t.dangGhi : t.chapNhan}
                    </button>
                  ) : (
                    <button type="button" onClick={(e) => { e.stopPropagation(); chapNhan(d); }} className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">{t.moTrang}</button>
                  )}
                  <button type="button" onClick={(e) => { e.stopPropagation(); onBoQua(d); }} className="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-muted">{t.boQua}</button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); onChonKhach(d.company_id); }} className="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-muted">{t.moKhach}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {moLenh && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[15vh]" onClick={() => setMoLenh(false)}>
          <div role="dialog" aria-label={t.bangLenh} data-testid="bang-lenh" onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-2xl border bg-background shadow-2xl">
            <input ref={oTim} value={tim} placeholder={t.bangLenh} aria-label={t.bangLenh}
              onChange={(e) => { setTim(e.target.value); setILenh(0); }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { e.preventDefault(); setMoLenh(false); }
                else if (e.key === 'ArrowDown') { e.preventDefault(); setILenh((x) => Math.min(timThay.length - 1, x + 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setILenh((x) => Math.max(0, x - 1)); }
                else if (e.key === 'Enter') { e.preventDefault(); chayLenh(timThay[iLenh]); }
              }}
              className="w-full border-b bg-transparent px-4 py-3 text-sm outline-none" />
            <ul role="listbox" className="max-h-80 overflow-y-auto py-1">
              {timThay.length === 0 && <li className="px-4 py-2 text-sm text-muted-foreground">{t.khongThay}</li>}
              {timThay.map((l, j) => (
                <li key={l.khoa} role="option" aria-selected={j === iLenh}>
                  <button type="button" onClick={() => chayLenh(l)} className={`w-full px-4 py-2 text-left text-sm ${j === iLenh ? 'bg-muted' : ''}`}>{l.nhan}</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

export const chuHang = (n: NgonNgu) => T[n];
