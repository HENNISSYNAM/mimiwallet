/**
 * Các chế độ xem không cần WebGL của Văn phòng kế toán: lưới bàn 2D, danh sách, hàng duyệt, bảng chi tiết khách.
 * Cùng dữ liệu, cùng màu đèn, cùng màu agent với cảnh 3D.
 */
import { X } from 'lucide-react';
import meoDi from '@/assets/mimi/walk.png';
import type { AgentDangLam, KhachVanPhong } from '@/lib/goiVanPhong';
import { AGENT, MAU_DEN, cauLyDo, cauNgan, chu, luc, ngayGon, tienGon, type NgonNgu } from './chu';
import type { LoaiHanhDong } from './hanhDong';

export type DiToi = (khachId: string, viec: LoaiHanhDong) => void;

function Den({ k, n }: { k: KhachVanPhong; n: NgonNgu }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium" data-den={k.muc}>
      <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: MAU_DEN[k.muc] }} />
      {chu(n).den[k.muc]}
    </span>
  );
}

export function MeoNho({ a, n }: { a: AgentDangLam; n: NgonNgu }) {
  const m = AGENT[a.agent];
  return (
    <span title={`${m.ten[n]} — ${m.viec[n]}`} className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium text-white" style={{ background: m.mau }}>
      <img src={meoDi} alt="" className="h-4 w-4 object-contain" />
      {m.ten[n]}
    </span>
  );
}

export function LuoiBan({ khach, agent, n, chon, onChon }: {
  khach: KhachVanPhong[]; agent: AgentDangLam[]; n: NgonNgu; chon: string | null; onChon: (id: string) => void;
}) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="luoi-ban">
      {khach.map((k) => {
        const o = agent.filter((a) => a.company_id === k.id);
        return (
          <li key={k.id}>
            <button
              type="button"
              onClick={() => onChon(k.id)}
              aria-pressed={chon === k.id}
              aria-label={`${k.ten}: ${chu(n).den[k.muc]}`}
              className={`w-full rounded-2xl border bg-card p-4 text-left shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${chon === k.id ? 'ring-2 ring-primary' : ''}`}
              style={{ borderTop: `4px solid ${MAU_DEN[k.muc]}` }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-foreground line-clamp-2">{k.ten}</span>
                <Den k={k} n={n} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{cauNgan(k, n)}</p>
              {o.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{o.map((a) => <MeoNho key={a.agent} a={a} n={n} />)}</div>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function DanhSach({ khach, n, onChon }: { khach: KhachVanPhong[]; n: NgonNgu; onChon: (id: string) => void }) {
  const c = chu(n);
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full text-sm" data-testid="danh-sach-khach">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr><th className="px-4 py-2">{c.cot.khach}</th><th className="px-4 py-2">{c.cot.den}</th><th className="px-4 py-2">{c.cot.viec}</th><th className="px-4 py-2">{c.cot.han}</th><th className="px-4 py-2 text-right">{c.cot.doanhThu}</th></tr>
        </thead>
        <tbody>
          {khach.map((k) => (
            <tr key={k.id} className="border-t">
              <td className="px-4 py-2"><button type="button" className="font-medium text-primary hover:underline" onClick={() => onChon(k.id)}>{k.ten}</button></td>
              <td className="px-4 py-2"><Den k={k} n={n} /></td>
              <td className="px-4 py-2 text-muted-foreground">{cauNgan(k, n)}</td>
              <td className="px-4 py-2 whitespace-nowrap">{k.thue?.moc_ke_tiep ? `${ngayGon(k.thue.moc_ke_tiep.han, n)}` : '—'}</td>
              <td className="px-4 py-2 text-right whitespace-nowrap">{k.doanh_thu ? tienGon(k.doanh_thu.uoc_tinh, n) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BangKhach({ k, agent, n, onDong, diToi }: {
  k: KhachVanPhong; agent: AgentDangLam[]; n: NgonNgu; onDong: () => void; diToi: DiToi;
}) {
  const c = chu(n);
  const o = agent.filter((a) => a.company_id === k.id);
  const Hang = ({ nhan, gt }: { nhan: string; gt: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-3 py-2 text-sm"><dt className="text-muted-foreground">{nhan}</dt><dd className="text-right font-medium text-foreground">{gt}</dd></div>
  );
  return (
    <aside role="dialog" aria-label={k.ten} data-testid="bang-khach"
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col overflow-y-auto border-l bg-background p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{k.ten}</h2>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><Den k={k} n={n} /> · {c.vaiTro[k.vai_tro] ?? k.vai_tro}{k.la_demo ? ` · ${c.demo}` : ''}</p>
        </div>
        <button type="button" onClick={onDong} aria-label={c.dong} className="rounded-lg p-2 hover:bg-muted"><X size={18} /></button>
      </div>

      {k.ly_do.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {k.ly_do.map((l, i) => (
            <li key={i} className="flex gap-2 text-sm"><span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: MAU_DEN[l.muc] }} />{cauLyDo(l, n)}</li>
          ))}
        </ul>
      )}

      {k.loi ? <p className="mt-4 text-sm text-muted-foreground">{c.khongDocDuoc}</p> : (
        <dl className="mt-4 divide-y">
          {k.doanh_thu && <Hang nhan={c.doanhThu} gt={<>{tienGon(k.doanh_thu.uoc_tinh, n)}{k.doanh_thu.can_duoi !== k.doanh_thu.can_tren && <span className="block text-xs font-normal text-muted-foreground">{c.khoang(tienGon(k.doanh_thu.can_duoi, n), tienGon(k.doanh_thu.can_tren, n))}</span>}</>} />}
          {k.tien_vao_cho_xac_nhan && <Hang nhan={c.choXacNhan} gt={`${c.khoan(k.tien_vao_cho_xac_nhan.so_khoan)}${k.tien_vao_cho_xac_nhan.so_khoan ? ` · ${tienGon(k.tien_vao_cho_xac_nhan.so_tien, n)}` : ''}`} />}
          {k.thue && <Hang nhan={c.thue} gt={c.sanSang[k.thue.trang_thai] ?? '—'} />}
          {k.thue?.moc_ke_tiep && <Hang nhan={c.hanKeTiep} gt={<>{k.thue.moc_ke_tiep.ten}<span className="block text-xs font-normal text-muted-foreground">{ngayGon(k.thue.moc_ke_tiep.han, n)}{k.thue.moc_ke_tiep.con_lai !== null ? ` · ${c.conNgay(k.thue.moc_ke_tiep.con_lai)}` : ''}</span></>} />}
          <Hang nhan={c.viecMo} gt={k.viec_mo.so} />
          <Hang nhan={c.banHomNay} gt={k.ban_hang_hom_nay ? c.banGhi(k.ban_hang_hom_nay.so_lan, tienGon(k.ban_hang_hom_nay.tong, n)) : c.chuaCoPos} />
          {k.dong_tien_30_ngay && <Hang nhan={c.dongTien} gt={`${c.vao} ${tienGon(k.dong_tien_30_ngay.tien_vao, n)} · ${c.ra} ${tienGon(k.dong_tien_30_ngay.tien_ra, n)}`} />}
        </dl>
      )}

      <section className="mt-4">
        <h3 className="text-sm font-semibold text-foreground">{c.hoatDong}</h3>
        {o.length === 0 && !k.hoat_dong_24h.gan_nhat ? <p className="mt-1 text-sm text-muted-foreground">{c.khongHoatDong}</p> : (
          <ul className="mt-2 space-y-1.5 text-sm">
            {o.map((a) => <li key={a.agent} className="flex flex-wrap items-center gap-2"><MeoNho a={a} n={n} /><span className="text-muted-foreground">{a.ly_do === 'su_kien_24h' ? `${c.agentMoi} · ${luc(a.luc, n)}` : c.agentChoViec}</span></li>)}
            {k.hoat_dong_24h.gan_nhat && <li className="text-xs text-muted-foreground">{luc(k.hoat_dong_24h.gan_nhat, n)}</li>}
          </ul>
        )}
      </section>

      <div className="mt-auto grid gap-2 pt-6">
        <button type="button" onClick={() => diToi(k.id, 'mo_khach')} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">{c.moKhach}</button>
        <button type="button" onClick={() => diToi(k.id, 'xem_tien_vao')} className="rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-muted">{c.xemTienVao}</button>
        <button type="button" onClick={() => diToi(k.id, 'soan_to_khai')} className="rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-muted">{c.soanToKhai}</button>
      </div>
    </aside>
  );
}
