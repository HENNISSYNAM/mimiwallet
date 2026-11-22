/**
 * KẾT NỐI AGENT (MCP) — 22/11/2026. Kế toán tạo khoá để Claude / Cursor / ChatGPT đọc văn phòng và gửi đề xuất phân
 * loại vào hàng duyệt. Agent không ghi sổ; người vẫn duyệt. Khoá thô hiện ĐÚNG MỘT LẦN, không lưu ở trình duyệt.
 */
import { useCallback, useEffect, useState } from 'react';
import { DIA_CHI_MCP, dsKhoaMcp, taoKhoaMcp, thuHoiKhoaMcp, type KhoaHien } from '@/lib/goiVanPhong';
import type { NgonNgu } from './chu';

const CHU = {
  vi: {
    tieuDe: 'Kết nối agent (MCP)',
    moTa: 'Cho Claude, Cursor hoặc ChatGPT đọc danh mục khách, hàng duyệt và gửi đề xuất phân loại tiền vào. Agent không ghi sổ — đề xuất của nó hiện trong hàng duyệt, bạn bấm duyệt.',
    tenKhoa: 'Tên khoá', goiY: 'Ví dụ: Claude của chị Lan', tao: 'Tạo khoá', dangTao: 'Đang tạo…',
    chuaCo: 'Chưa có khoá nào.', thuHoi: 'Thu hồi', xacNhanThuHoi: (t: string) => `Thu hồi khoá "${t}"? Agent dùng khoá này sẽ mất quyền ngay.`,
    taoLuc: 'Tạo', dungLan: 'Dùng gần nhất', chuaDung: 'chưa dùng',
    khoaMoi: 'Khoá mới — chép ngay, MIMI không hiện lại lần nữa:', chep: 'Chép', daChep: 'Đã chép',
    claudeCode: 'Claude Code', khac: 'Cursor / Claude Desktop / client khác (cấu hình JSON)', dong: 'Đã chép xong, ẩn khoá',
    loi: 'Chưa thực hiện được. Thử lại sau ít phút.',
  },
  en: {
    tieuDe: 'Connect an agent (MCP)',
    moTa: 'Let Claude, Cursor or ChatGPT read your client list and review queue and propose categories for incoming money. The agent never writes to the books — its proposals land in your review queue for you to approve.',
    tenKhoa: 'Key name', goiY: "e.g. Lan's Claude", tao: 'Create key', dangTao: 'Creating…',
    chuaCo: 'No keys yet.', thuHoi: 'Revoke', xacNhanThuHoi: (t: string) => `Revoke "${t}"? Any agent using it loses access immediately.`,
    taoLuc: 'Created', dungLan: 'Last used', chuaDung: 'never',
    khoaMoi: 'New key — copy it now, MIMI will not show it again:', chep: 'Copy', daChep: 'Copied',
    claudeCode: 'Claude Code', khac: 'Cursor / Claude Desktop / other clients (JSON config)', dong: 'I copied it, hide the key',
    loi: 'That did not work. Try again in a few minutes.',
  },
} as const;

const gio = (s: string | null, n: NgonNgu) =>
  s ? new Date(s).toLocaleString(n === 'vi' ? 'vi-VN' : 'en-GB', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }) : null;

export const lenhClaudeCode = (khoa: string) => `claude mcp add --transport http mimi ${DIA_CHI_MCP} --header "x-mimi-key: ${khoa}"`;
export const cauHinhJson = (khoa: string) =>
  JSON.stringify({ mcpServers: { mimi: { type: 'http', url: DIA_CHI_MCP, headers: { 'x-mimi-key': khoa } } } }, null, 2);

function KhoiChep({ nhan, noiDung, c }: { nhan: string; noiDung: string; c: (typeof CHU)[NgonNgu] }) {
  const [da, setDa] = useState(false);
  const chep = async () => {
    try { await navigator.clipboard.writeText(noiDung); setDa(true); setTimeout(() => setDa(false), 1500); } catch { /* trình duyệt chặn: người dùng tự bôi đen */ }
  };
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{nhan}</span>
        <button type="button" onClick={() => void chep()} className="rounded-md border px-2 py-0.5 text-foreground hover:bg-muted">{da ? c.daChep : c.chep}</button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-muted p-3 text-xs">{noiDung}</pre>
    </div>
  );
}

export default function KetNoiMcp({ n }: { n: NgonNgu }) {
  const c = CHU[n];
  const [ds, setDs] = useState<KhoaHien[] | null>(null);
  const [ten, setTen] = useState('');
  const [dangTao, setDangTao] = useState(false);
  const [moi, setMoi] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  const tai = useCallback(async () => {
    try { setDs(await dsKhoaMcp()); } catch (e) { setLoi(e instanceof Error ? e.message : c.loi); }
  }, [c.loi]);
  useEffect(() => { void tai(); }, [tai]);

  const tao = async () => {
    const t = ten.trim();
    if (!t) return;
    setDangTao(true); setLoi(null);
    try {
      const kq = await taoKhoaMcp(t);
      setMoi(kq.khoa_moi);
      setTen('');
      await tai();
    } catch (e) { setLoi(e instanceof Error ? e.message : c.loi); }
    finally { setDangTao(false); }
  };

  const thuHoi = async (k: KhoaHien) => {
    if (!window.confirm(c.xacNhanThuHoi(k.ten))) return;
    setLoi(null);
    try { await thuHoiKhoaMcp(k.id); await tai(); } catch (e) { setLoi(e instanceof Error ? e.message : c.loi); }
  };

  return (
    <section aria-label={c.tieuDe} className="space-y-4 rounded-2xl border bg-card p-4 md:p-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">{c.tieuDe}</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{c.moTa}</p>
      </div>

      {moi && (
        <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/30" data-testid="khoa-moi">
          <p className="text-sm font-medium text-foreground">{c.khoaMoi}</p>
          <KhoiChep nhan="x-mimi-key" noiDung={moi} c={c} />
          <KhoiChep nhan={c.claudeCode} noiDung={lenhClaudeCode(moi)} c={c} />
          <KhoiChep nhan={c.khac} noiDung={cauHinhJson(moi)} c={c} />
          <button type="button" onClick={() => setMoi(null)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">{c.dong}</button>
        </div>
      )}

      <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); void tao(); }}>
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{c.tenKhoa}</span>
          <input value={ten} onChange={(e) => setTen(e.target.value)} maxLength={60} placeholder={c.goiY}
            className="rounded-lg border bg-background px-3 py-2 text-sm" />
        </label>
        <button type="submit" disabled={dangTao || !ten.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {dangTao ? c.dangTao : c.tao}
        </button>
      </form>

      {loi && <p role="alert" className="text-sm text-destructive">{loi}</p>}

      {ds && (ds.length === 0 ? <p className="text-sm text-muted-foreground">{c.chuaCo}</p> : (
        <ul className="divide-y rounded-xl border">
          {ds.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-foreground">{k.ten} <span className="font-mono text-xs text-muted-foreground">{k.hien}</span></p>
                <p className="text-xs text-muted-foreground">{c.taoLuc} {gio(k.tao_luc, n)} · {c.dungLan} {gio(k.dung_lan_cuoi, n) ?? c.chuaDung}</p>
              </div>
              <button type="button" onClick={() => void thuHoi(k)} className="rounded-lg border px-3 py-1 text-sm text-destructive hover:bg-destructive/10">{c.thuHoi}</button>
            </li>
          ))}
        </ul>
      ))}
    </section>
  );
}
