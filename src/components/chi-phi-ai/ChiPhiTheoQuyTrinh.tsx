import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { locTrungNguon, usd, type DongChiPhiAi } from '@/lib/chiPhiAi';
import {
  duAnDaGan, tinhTheoQuyTrinh, type KetQuaQt, type QuyTrinh,
} from '../../../supabase/functions/_shared/chi-phi-ai/quy-trinh.ts';

/**
 * MIMI-P1-006 — chi phí AI theo quy trình, và chi phí cho mỗi việc thành công.
 *
 * Nhà cung cấp chỉ biết project/workspace; người dùng biết project nào phục vụ việc gì. Khối này
 * cho gán project vào quy trình và nhập số việc làm xong mỗi tháng. Tiền của project chưa gán
 * được hiện riêng — không chia đều cho quy trình nào. Chưa nhập số việc thì không có "chi phí mỗi
 * việc" — hiện "—", không đoán.
 */

type Goi = (nhan: string, hanhDong: string, du: Record<string, unknown>, thanhCong?: string) => Promise<unknown>;

const O = 'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60';
const phanTram = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);

export default function ChiPhiTheoQuyTrinh({ chiPhi, quyTrinh, ketQua, goi, dangLam }: {
  chiPhi: DongChiPhiAi[];
  quyTrinh: QuyTrinh[];
  ketQua: KetQuaQt[];
  goi: Goi;
  dangLam: string | null;
}) {
  const cacKy = useMemo(() => [...new Set(chiPhi.map((d) => d.ngay.slice(0, 7)))].sort().reverse(), [chiPhi]);
  const [ky, setKy] = useState<string>(() => cacKy[0] ?? new Date().toISOString().slice(0, 7));
  const bang = useMemo(() => tinhTheoQuyTrinh(locTrungNguon(chiPhi), quyTrinh, ketQua, ky), [chiPhi, quyTrinh, ketQua, ky]);
  const tatCaDuAn = useMemo(() => [...new Set(chiPhi.map((d) => d.du_an))].sort(), [chiPhi]);

  const [sua, setSua] = useState<{ id: string | null; ten: string; don_vi_ket_qua: string; khop_du_an: string[] } | null>(null);
  const [nhap, setNhap] = useState<{ q: QuyTrinh; tc: string; tb: string } | null>(null);
  const [xoa, setXoa] = useState<QuyTrinh | null>(null);

  const cuaQuyTrinhKhac = (d: string) => (sua ? duAnDaGan([d], quyTrinh.filter((q) => q.id !== sua.id)).length > 0 : false);

  return (
    <section aria-labelledby="theo-quy-trinh" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="theo-quy-trinh" className="text-sm font-semibold text-foreground">Chi phí theo quy trình</h2>
        <div className="flex items-center gap-2">
          {cacKy.length > 1 && (
            <select aria-label="Tháng" value={ky} onChange={(e) => setKy(e.target.value)} className="rounded-lg border border-border bg-card px-2 py-1 text-xs">
              {cacKy.map((k) => <option key={k} value={k}>{k.slice(5)}/{k.slice(0, 4)}</option>)}
            </select>
          )}
          <button type="button" onClick={() => setSua({ id: null, ten: '', don_vi_ket_qua: 'việc', khop_du_an: [] })} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground">
            <Plus size={12} /> Quy trình
          </button>
        </div>
      </div>

      {quyTrinh.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Chưa có quy trình nào. Tạo quy trình (ví dụ "Chatbot chăm sóc khách"), chọn các project AI thuộc về nó, rồi nhập số việc làm xong
          mỗi tháng — MIMI tính ra chi phí cho mỗi việc thành công. Đây là con số để so hai model cho công bằng, không phải giá token.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm" aria-label="Chi phí theo quy trình">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Quy trình</th>
                <th className="px-3 py-2 text-right font-medium">Chi phí</th>
                <th className="px-3 py-2 text-right font-medium">Thành công</th>
                <th className="px-3 py-2 text-right font-medium">Tỷ lệ</th>
                <th className="px-3 py-2 text-right font-medium">Mỗi việc thành công</th>
                <th className="px-3 py-2"><span className="sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {bang.dong.map((d) => (
                <tr key={d.quy_trinh.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <p className="font-medium text-foreground">{d.quy_trinh.ten}</p>
                    <p className="text-xs text-muted-foreground">{d.quy_trinh.khop_du_an.join(', ') || 'Chưa chọn project'}</p>
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{usd(d.chi_phi_usd)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{d.so_thanh_cong === null ? '—' : `${d.so_thanh_cong.toLocaleString('vi-VN')} ${d.quy_trinh.don_vi_ket_qua}`}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{phanTram(d.ty_le_thanh_cong)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{d.moi_viec_usd === null ? '—' : usd(d.moi_viec_usd)}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2 text-xs">
                      <button type="button" onClick={() => setNhap({ q: d.quy_trinh, tc: d.so_thanh_cong === null ? '' : String(d.so_thanh_cong), tb: d.so_that_bai === null ? '' : String(d.so_that_bai) })} className="font-medium text-primary hover:underline">
                        Nhập số việc
                      </button>
                      <button type="button" aria-label={`Sửa ${d.quy_trinh.ten}`} onClick={() => setSua({ ...d.quy_trinh })} className="text-muted-foreground hover:text-foreground"><Pencil size={12} /></button>
                      <button type="button" aria-label={`Xoá ${d.quy_trinh.ten}`} onClick={() => setXoa(d.quy_trinh)} className="text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {bang.chua_gan.chi_phi_usd > 0 && (
                <tr className="text-muted-foreground">
                  <td className="px-3 py-2">
                    <p>Chưa gán quy trình</p>
                    <p className="text-xs">{bang.chua_gan.du_an.join(', ')}</p>
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{usd(bang.chua_gan.chi_phi_usd)}</td>
                  <td colSpan={4} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={sua !== null} onOpenChange={(m) => { if (!m) setSua(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{sua?.id ? 'Sửa quy trình' : 'Quy trình mới'}</DialogTitle>
            <DialogDescription>Mỗi project chỉ thuộc một quy trình, để chi phí không bị tính hai lần.</DialogDescription>
          </DialogHeader>
          {sua && (
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Tên quy trình</span>
                <input value={sua.ten} onChange={(e) => setSua({ ...sua, ten: e.target.value })} placeholder="Chatbot chăm sóc khách" className={O} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Một việc thành công là gì</span>
                <input value={sua.don_vi_ket_qua} onChange={(e) => setSua({ ...sua, don_vi_ket_qua: e.target.value })} placeholder="cuộc trò chuyện giải quyết xong" className={O} />
              </label>
              <fieldset>
                <legend className="text-sm font-medium">Project thuộc quy trình này</legend>
                {tatCaDuAn.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">Chưa có project nào trong dữ liệu chi phí.</p>
                ) : (
                  <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                    {tatCaDuAn.map((d) => {
                      const khac = cuaQuyTrinhKhac(d);
                      return (
                        <label key={d} className={`flex items-center gap-2 text-sm ${khac ? 'text-muted-foreground' : ''}`}>
                          <input
                            type="checkbox"
                            disabled={khac}
                            checked={sua.khop_du_an.includes(d)}
                            onChange={(e) => setSua({ ...sua, khop_du_an: e.target.checked ? [...sua.khop_du_an, d] : sua.khop_du_an.filter((x) => x !== d) })}
                          />
                          {d}{khac && <span className="text-xs">(đã thuộc quy trình khác)</span>}
                        </label>
                      );
                    })}
                  </div>
                )}
              </fieldset>
            </div>
          )}
          <DialogFooter>
            <button
              type="button"
              disabled={dangLam !== null || !sua || sua.ten.trim().length < 2}
              onClick={async () => {
                if (!sua) return;
                const kq = await goi('quy_trinh', 'quy_trinh_luu', { id: sua.id, ten: sua.ten, don_vi_ket_qua: sua.don_vi_ket_qua, khop_du_an: sua.khop_du_an }, 'Đã lưu quy trình.');
                if (kq) setSua(null);
              }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              Lưu
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={nhap !== null} onOpenChange={(m) => { if (!m) setNhap(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Số việc tháng {ky.slice(5)}/{ky.slice(0, 4)} — {nhap?.q.ten}</DialogTitle>
            <DialogDescription>Đếm theo đơn vị: {nhap?.q.don_vi_ket_qua}. Nhập lại sẽ ghi đè số cũ của tháng này.</DialogDescription>
          </DialogHeader>
          {nhap && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Thành công</span>
                <input inputMode="numeric" value={nhap.tc} onChange={(e) => setNhap({ ...nhap, tc: e.target.value.replace(/\D/g, '') })} className={O} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Thất bại</span>
                <input inputMode="numeric" value={nhap.tb} onChange={(e) => setNhap({ ...nhap, tb: e.target.value.replace(/\D/g, '') })} className={O} />
              </label>
            </div>
          )}
          <DialogFooter>
            <button
              type="button"
              disabled={dangLam !== null || !nhap || nhap.tc === ''}
              onClick={async () => {
                if (!nhap) return;
                const kq = await goi('ket_qua', 'ket_qua_luu', { quy_trinh_id: nhap.q.id, ky, so_thanh_cong: Number(nhap.tc), so_that_bai: Number(nhap.tb || 0) }, 'Đã lưu số việc.');
                if (kq) setNhap(null);
              }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              Lưu
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={xoa !== null} onOpenChange={(m) => { if (!m) setXoa(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá quy trình "{xoa?.ten}"?</DialogTitle>
            <DialogDescription>Số việc đã nhập của quy trình này cũng bị xoá. Chi phí AI không mất — chỉ về lại mục "Chưa gán quy trình".</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" onClick={() => setXoa(null)} className="rounded-lg border border-border px-4 py-2 text-sm">Huỷ</button>
            <button
              type="button"
              onClick={async () => { const q = xoa; setXoa(null); if (q) await goi('xoa_qt', 'quy_trinh_xoa', { id: q.id }, 'Đã xoá quy trình.'); }}
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground"
            >
              Xoá quy trình
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
