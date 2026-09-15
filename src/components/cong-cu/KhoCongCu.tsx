import { useMemo, useState } from 'react';
import { Check, Loader2, Plus, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCongCuGhim } from '@/hooks/useCongCuGhim';
import { SO_CONG_CU_TOI_DA, TEN_NHOM_CONG_CU, timCongCu, type NhomCongCu } from '@/lib/congCu';
import { IconCongCu } from './IconCongCu';

/**
 * Kho công cụ: tìm công cụ tài chính theo việc cần làm và ghim vào lối vào (thanh bên, MIMI
 * Assistant, bảng "Thêm" trên điện thoại). Ghim/bỏ ghim lưu ngay vào tài khoản.
 */
export function KhoCongCu({ mo, onDong }: { mo: boolean; onDong: () => void }) {
  const { ds, ghim, boGhim, dangLuu, loi } = useCongCuGhim();
  const [tuKhoa, setTuKhoa] = useState('');
  const daGhim = useMemo(() => new Set(ds.map((c) => c.khoa)), [ds]);
  const kq = timCongCu(tuKhoa);
  const nhom = [...new Set(kq.map((c) => c.nhom))] as NhomCongCu[];

  return (
    <Dialog open={mo} onOpenChange={(v) => { if (!v) onDong(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Công cụ</DialogTitle>
          <DialogDescription>
            Ghim công cụ bạn dùng hằng ngày lên thanh bên và màn MIMI Assistant. Tối đa {SO_CONG_CU_TOI_DA} công cụ, đang ghim {ds.length}.
          </DialogDescription>
        </DialogHeader>

        <label className="flex h-11 items-center gap-2 rounded-lg border border-border bg-background px-3">
          <Search size={16} className="text-muted-foreground" aria-hidden />
          <span className="sr-only">Tìm công cụ</span>
          <input
            value={tuKhoa}
            onChange={(e) => setTuKhoa(e.target.value)}
            placeholder="Tìm theo việc: hoá đơn, tờ khai, đối soát…"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {dangLuu && <Loader2 size={15} className="animate-spin text-muted-foreground" aria-label="Đang lưu" />}
        </label>
        {loi && <p className="text-sm text-destructive" role="alert">{loi}</p>}

        {kq.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Không có công cụ khớp “{tuKhoa}”.</p>}

        <div className="space-y-5">
          {nhom.map((n) => (
            <section key={n} aria-labelledby={`nhom-cc-${n}`}>
              <h3 id={`nhom-cc-${n}`} className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{TEN_NHOM_CONG_CU[n]}</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {kq.filter((c) => c.nhom === n).map((c) => {
                  const on = daGhim.has(c.khoa);
                  return (
                    <li key={c.khoa} className="flex items-start gap-3 rounded-xl border border-border p-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-foreground"><IconCongCu khoa={c.khoa} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{c.ten}</p>
                        <p className="text-xs text-muted-foreground">{c.mo_ta}</p>
                      </div>
                      <button
                        type="button"
                        aria-pressed={on}
                        aria-label={on ? `Bỏ ghim ${c.ten}` : `Ghim ${c.ten}`}
                        disabled={dangLuu}
                        onClick={() => void (on ? boGhim(c.khoa) : ghim(c.khoa))}
                        className={`inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-medium disabled:opacity-50 ${
                          on ? 'bg-primary/10 text-primary' : 'border border-border text-foreground hover:bg-accent'
                        }`}
                      >
                        {on ? <><Check size={13} /> Đã ghim</> : <><Plus size={13} /> Ghim</>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
