import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { goiCongTy } from '@/lib/goiCongTy';

/**
 * Cơ sở của công ty (22/10/2026) — mỗi cơ sở một tài khoản, một kế toán. Khai báo ở đây thì MIMI tách dòng tiền từng
 * cơ sở, thấy cơ sở nào đang bù cho cơ sở nào, và hợp nhất mà không đếm hai lần tiền chuyển giữa các cơ sở.
 * Mọi nút đều có backend thật (`cong-ty` → co_so_*); máy chủ kiểm quyền lại và câu từ chối được hiện nguyên văn.
 */

type Khai = 'tap_trung' | 'rieng' | 'chua_ro';
interface CoSo { id: string; ten: string; ma_so_thue: string | null; tinh: string | null; khai_thue: Khai }
interface DuLieu {
  co_so: CoSo[];
  tai_khoan: { so_tai_khoan: string; co_so_id: string }[];
  tai_khoan_tren_sao_ke: string[];
  thanh_vien: { user_id: string; vai_tro: string; email: string | null; co_so_id: string | null }[];
  duoc_sua: boolean;
}

const TEN_KHAI: Record<Khai, string> = { tap_trung: 'Khai tập trung ở trụ sở', rieng: 'Tự khai riêng', chua_ro: 'Chưa rõ' };
const O = 'rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60';

export function CoSoCongTy() {
  const [d, setD] = useState<DuLieu | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, setDang] = useState<string | null>(null);
  const [moi, setMoi] = useState({ ten: '', ma_so_thue: '', khai_thue: 'chua_ro' as Khai });

  const tai = useCallback(async () => {
    setLoi(null);
    try { setD(await goiCongTy('co_so') as DuLieu); } catch (e) { setLoi(e instanceof Error ? e.message : 'Chưa đọc được danh sách cơ sở.'); }
  }, []);
  useEffect(() => { void tai(); }, [tai]);

  const lam = async (khoa: string, hanhDong: string, du: Record<string, unknown>, bao: string) => {
    setDang(khoa);
    try { await goiCongTy(hanhDong, du); toast.success(bao); await tai(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Chưa làm được.'); } finally { setDang(null); }
  };

  if (loi) return <p className="text-sm text-destructive">{loi}</p>;
  if (!d) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Đang đọc cơ sở…</p>;

  const coSoCuaTk = new Map(d.tai_khoan.map((x) => [x.so_tai_khoan, x.co_so_id]));
  const tatCaTk = [...new Set([...d.tai_khoan_tren_sao_ke, ...d.tai_khoan.map((x) => x.so_tai_khoan)])];
  const sua = d.duoc_sua;

  return (
    <div className="space-y-5 text-sm">
      <p className="text-muted-foreground">
        Mỗi chi nhánh, cửa hàng hay cơ sở thường có tài khoản và kế toán riêng. Khai báo ở đây để MIMI tách dòng tiền từng nơi,
        thấy nơi nào đang được nơi khác chuyển tiền bù, và cộng hợp nhất toàn hệ thống mà không đếm hai lần.
      </p>

      <section aria-label="Danh sách cơ sở" className="space-y-2">
        {d.co_so.length === 0 && <p className="text-muted-foreground">Chưa có cơ sở nào.</p>}
        {d.co_so.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2">
            <span className="min-w-0 flex-1 font-medium text-foreground">{c.ten}{c.ma_so_thue ? <span className="ml-2 font-normal text-muted-foreground">MST {c.ma_so_thue}</span> : null}</span>
            <select aria-label={`Cách khai thuế của ${c.ten}`} disabled={!sua || dang !== null} value={c.khai_thue} className={O}
              onChange={(e) => void lam(`khai:${c.id}`, 'co_so_luu', { id: c.id, ten: c.ten, ma_so_thue: c.ma_so_thue, tinh: c.tinh, khai_thue: e.target.value }, 'Đã lưu cách khai thuế.')}>
              {(Object.keys(TEN_KHAI) as Khai[]).map((k) => <option key={k} value={k}>{TEN_KHAI[k]}</option>)}
            </select>
            {sua && (
              <button type="button" aria-label={`Xoá ${c.ten}`} disabled={dang !== null} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-destructive"
                onClick={() => { if (window.confirm(`Xoá cơ sở "${c.ten}"? Tài khoản và kế toán của cơ sở này trở về "chưa gán".`)) void lam(`xoa:${c.id}`, 'co_so_xoa', { id: c.id }, 'Đã xoá cơ sở.'); }}>
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
        {sua && (
          <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (moi.ten.trim()) void lam('them', 'co_so_luu', { ...moi, ma_so_thue: moi.ma_so_thue || null }, 'Đã thêm cơ sở.').then(() => setMoi({ ten: '', ma_so_thue: '', khai_thue: 'chua_ro' })); }}>
            <input aria-label="Tên cơ sở" placeholder="Tên cơ sở (vd: Cơ sở Thủ Đức)" value={moi.ten} onChange={(e) => setMoi({ ...moi, ten: e.target.value })} className={`${O} min-w-[12rem] flex-1`} />
            <input aria-label="Mã số thuế cơ sở" placeholder="MST (vd: 0319436143-001)" value={moi.ma_so_thue} onChange={(e) => setMoi({ ...moi, ma_so_thue: e.target.value })} className={`${O} w-48`} />
            <select aria-label="Cách khai thuế" value={moi.khai_thue} onChange={(e) => setMoi({ ...moi, khai_thue: e.target.value as Khai })} className={O}>
              {(Object.keys(TEN_KHAI) as Khai[]).map((k) => <option key={k} value={k}>{TEN_KHAI[k]}</option>)}
            </select>
            <button type="submit" disabled={dang !== null || !moi.ten.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground disabled:opacity-50">
              <Plus size={15} /> Thêm cơ sở
            </button>
          </form>
        )}
      </section>

      {d.co_so.length > 0 && tatCaTk.length > 0 && (
        <section aria-label="Tài khoản theo cơ sở" className="space-y-2">
          <h4 className="font-medium text-foreground">Tài khoản ngân hàng thuộc cơ sở nào</h4>
          {tatCaTk.map((tk) => (
            <div key={tk} className="flex items-center gap-2">
              <span className="w-32 tabular-nums text-muted-foreground">•••{tk.slice(-4)}</span>
              <select aria-label={`Cơ sở của tài khoản đuôi ${tk.slice(-4)}`} disabled={!sua || dang !== null} value={coSoCuaTk.get(tk) ?? ''} className={`${O} flex-1`}
                onChange={(e) => void lam(`tk:${tk}`, 'co_so_gan_tai_khoan', { so_tai_khoan: tk, co_so_id: e.target.value || null }, 'Đã gán tài khoản.')}>
                <option value="">Chưa gán</option>
                {d.co_so.map((c) => <option key={c.id} value={c.id}>{c.ten}</option>)}
              </select>
            </div>
          ))}
        </section>
      )}

      {d.co_so.length > 0 && (
        <section aria-label="Người phụ trách cơ sở" className="space-y-2">
          <h4 className="font-medium text-foreground">Ai phụ trách cơ sở nào</h4>
          {d.thanh_vien.map((v) => (
            <div key={v.user_id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{v.email ?? 'Thành viên'}</span>
              <select aria-label={`Cơ sở phụ trách của ${v.email ?? 'thành viên'}`} disabled={!sua || dang !== null} value={v.co_so_id ?? ''} className={O}
                onChange={(e) => void lam(`tv:${v.user_id}`, 'co_so_gan_thanh_vien', { user_id: v.user_id, co_so_id: e.target.value || null }, 'Đã giao cơ sở.')}>
                <option value="">Toàn công ty</option>
                {d.co_so.map((c) => <option key={c.id} value={c.id}>{c.ten}</option>)}
              </select>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Hôm nay đây là ghi nhận ai phụ trách nơi nào; MIMI chưa giới hạn kế toán một cơ sở chỉ thấy số của cơ sở đó.</p>
        </section>
      )}
    </div>
  );
}
