/**
 * HOME = TỔNG QUAN TÀI CHÍNH (/dashboard, 22/11/2026). Học trang Home/Overview của ClickUp nhưng cho tài chính:
 * mở máy là biết tiền, ngưỡng doanh thu, hạn thuế và việc nào đang chờ mình quyết.
 *
 * Bỏ cái dở của ClickUp: không có khối Recent / Docs / Bookmarks chung chung, không ô trống, không dải thông báo.
 * Mọi con số do máy chủ tính (Văn phòng: `van-phong · danh_muc_khach`; Agentic AI Space: `agentic-space · bang`) cho
 * CÔNG TY ĐANG DÙNG — trang chỉ hiện, không tính lại kiểu khác.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarClock, Landmark, Orbit, Scale, Sparkles, Wallet } from 'lucide-react';
import { goiDanhMucKhach, type DeXuat, type KhachVanPhong } from '@/lib/goiVanPhong';
import { docBang, type BangViec } from '@/lib/goiSpace';
import { idCongTyDangDung, SU_KIEN_DOI_CONG_TY } from '@/lib/congTyDangDung';
import { DUONG_TRO_LY } from '@/lib/nguCanhModule';

export const tienGon = (n: number) => {
  const a = Math.abs(n);
  const dau = n < 0 ? '−' : '';
  if (a >= 1e9) return `${dau}${(Math.round(a / 1e7) / 100).toLocaleString('vi-VN')} tỷ`;
  if (a >= 1e6) return `${dau}${(Math.round(a / 1e5) / 10).toLocaleString('vi-VN')} triệu`;
  return `${dau}${Math.round(a).toLocaleString('vi-VN')} ₫`;
};

const PHIA: Record<string, string> = { tren: 'Trên', duoi: 'Dưới', chua_chac: 'Chưa chắc trên hay dưới' };
const SAN_SANG: Record<string, string> = {
  san_sang: 'Đủ dữ liệu để soạn', bi_chan: 'Đang bị chặn', thieu_du_lieu: 'Còn thiếu dữ liệu',
  can_xac_minh: 'Cần xác minh nghĩa vụ', khong_co_viec: 'Chưa có kỳ phải khai',
};

export interface ViecCanBan { khoa: string; chu: string; den: string; nut: string }

/** Gom việc đang chờ NGƯỜI quyết ở công ty này: câu hỏi của agent, tiền vào chờ duyệt, hạn thuế gần. Thuần. */
export function viecCanBan(k: KhachVanPhong | null, hang: DeXuat[], bang: BangViec | null, companyId: string | null): ViecCanBan[] {
  const ra: ViecCanBan[] = [];
  for (const v of bang?.viec ?? []) {
    if (v.company_id === companyId && v.trang_thai === 'can_ban' && v.hoi) {
      ra.push({ khoa: `space:${v.id}`, chu: `${v.tieu_de} — ${v.hoi.noi_dung}`, den: '/dashboard/space', nut: 'Xem việc' });
    }
  }
  const pl = hang.filter((d) => d.company_id === companyId && d.loai === 'phan_loai');
  if (pl.length) {
    const tong = pl.reduce((s, d) => s + (d.so ?? 0), 0);
    ra.push({ khoa: 'hang', chu: `${pl.length} khoản tiền vào (${tienGon(tong)}) chờ duyệt phân loại — agent đã soạn sẵn kèm bằng chứng.`, den: '/dashboard/van-phong', nut: 'Duyệt' });
  }
  const t = k?.thue;
  if (t?.han && t.con_lai !== null && t.con_lai !== undefined && t.con_lai <= 7 && t.trang_thai !== 'khong_co_viec') {
    ra.push({ khoa: 'thue', chu: `${t.ten_viec ?? 'Tờ khai'} hạn ${t.han.split('-').reverse().join('/')} — ${t.con_lai < 0 ? `quá hạn ${-t.con_lai} ngày` : `còn ${t.con_lai} ngày`}.`, den: '/dashboard/to-khai', nut: 'Mở tờ khai' });
  }
  return ra;
}

function O({ icon: Icon, ten, chinh, phu, den, canhBao }: { icon: typeof Wallet; ten: string; chinh: string; phu: string; den: string; canhBao?: boolean }) {
  return (
    <Link to={den} className={`group flex flex-col gap-2 rounded-2xl border bg-card p-4 transition hover:shadow ${canhBao ? 'border-amber-400' : ''}`}>
      <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Icon size={15} />{ten}</span>
      <span className="text-xl font-semibold tabular-nums text-foreground">{chinh}</span>
      <span className="text-xs text-muted-foreground">{phu}</span>
    </Link>
  );
}

export default function TongQuanPage() {
  const navigate = useNavigate();
  const [id, setId] = useState<string | null>(null);
  const [khach, setKhach] = useState<KhachVanPhong | null>(null);
  const [hang, setHang] = useState<DeXuat[]>([]);
  const [soKhach, setSoKhach] = useState(0);
  const [bang, setBang] = useState<BangViec | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState<string | null>(null);
  const [hoi, setHoi] = useState('');
  const [lan, setLan] = useState(0);

  useEffect(() => {
    const doi = () => setLan((x) => x + 1);
    window.addEventListener(SU_KIEN_DOI_CONG_TY, doi);
    return () => window.removeEventListener(SU_KIEN_DOI_CONG_TY, doi);
  }, []);

  useEffect(() => {
    let huy = false;
    (async () => {
      setDangTai(true); setLoi(null);
      try {
        const cid = await idCongTyDangDung();
        const [dm, b] = await Promise.all([goiDanhMucKhach({ kich_thuoc: 50 }), docBang().catch(() => null)]);
        if (huy) return;
        setId(cid);
        setKhach(dm.khach.find((x) => x.id === cid) ?? null);
        setHang(dm.hang_duyet);
        setSoKhach(dm.tong);
        setBang(b);
      } catch (e) {
        if (!huy) setLoi(e instanceof Error ? e.message : 'Chưa đọc được số liệu.');
      } finally {
        if (!huy) setDangTai(false);
      }
    })();
    return () => { huy = true; };
  }, [lan]);

  const can = useMemo(() => viecCanBan(khach, hang, bang, id), [khach, hang, bang, id]);
  const agentCty = useMemo(() => (bang?.viec ?? []).filter((v) => v.company_id === id && v.trang_thai !== 'xong'), [bang, id]);

  const dt = khach?.doanh_thu;
  const nguong = dt?.nguong.find((n) => n.ma === 'mien_thue_1_ty');
  const dong = khach?.dong_tien_30_ngay;
  const thue = khach?.thue;
  const cho = khach?.tien_vao_cho_xac_nhan;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Tổng quan tài chính</p>
        <h1 className="text-2xl font-bold text-foreground">{khach?.ten ?? (dangTai ? '…' : 'Công ty của bạn')}</h1>
        {!dangTai && !loi && (
          <p className="text-base text-foreground" data-testid="cau-dau">
            {can.length ? <>Hôm nay cần bạn quyết <strong>{can.length} việc</strong>.</> : 'Không có việc nào chờ bạn. Agent đang lo phần còn lại.'}
          </p>
        )}
      </header>

      {loi && <p role="alert" className="text-sm text-destructive">{loi}</p>}

      {!dangTai && !loi && !khach && (
        <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          Tổng quan tài chính dành cho chủ sở hữu, quản trị và kế toán của công ty. Vai trò của bạn chưa xem được số của cả công ty — hỏi MIMI bên dưới, hoặc nhờ chủ công ty đổi vai trò.
        </p>
      )}

      {khach && (
        <section aria-label="Chỉ số" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <O icon={Wallet} ten="Dòng tiền 30 ngày" den="/dashboard/cashflow"
            chinh={dong ? tienGon(dong.rong) : 'Chưa có giao dịch'}
            phu={dong ? `Vào ${tienGon(dong.tien_vao)} · Ra ${tienGon(dong.tien_ra)}` : 'Liên kết ngân hàng để thấy tiền thật'} canhBao={!!dong && dong.rong < 0} />
          <O icon={Scale} ten={`Doanh thu ${dt?.nam ?? ''}`} den="/dashboard/van-phong"
            chinh={dt ? `${tienGon(dt.can_duoi)} – ${tienGon(dt.can_tren)}` : '—'}
            phu={nguong ? `${PHIA[nguong.phia] ?? nguong.phia} ngưỡng 1 tỷ${dt?.can_xem ? ' — nên xem lại khoản lớn' : ''}` : 'Khoảng ước tính từ sao kê'} canhBao={!!dt?.can_xem} />
          <O icon={CalendarClock} ten="Hạn thuế kế tiếp" den="/dashboard/to-khai"
            chinh={thue?.moc_ke_tiep ? `Còn ${thue.moc_ke_tiep.con_lai} ngày` : '—'}
            phu={thue ? `${thue.moc_ke_tiep?.ten ?? thue.ten_viec ?? 'Tờ khai'} · ${SAN_SANG[thue.trang_thai] ?? thue.trang_thai}` : 'Chưa đọc được lịch thuế'}
            canhBao={!!thue?.moc_ke_tiep && thue.moc_ke_tiep.con_lai <= 7} />
          <O icon={Landmark} ten="Tiền vào chờ phân loại" den="/dashboard/van-phong"
            chinh={cho ? `${cho.so_khoan} khoản` : '0 khoản'}
            phu={cho && cho.so_khoan ? `${tienGon(cho.so_tien)} chưa rõ là doanh thu hay không` : 'Mọi khoản đã rõ'} canhBao={!!cho && cho.so_khoan > 0} />
        </section>
      )}

      {can.length > 0 && (
        <section aria-label="Cần bạn" className="space-y-2 rounded-2xl border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Cần bạn</h2>
          <ul className="divide-y">
            {can.map((c) => (
              <li key={c.khoa} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="flex-1 text-foreground">{c.chu}</span>
                <Link to={c.den} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">{c.nut} <ArrowRight size={12} /></Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-2 rounded-2xl border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Orbit size={16} className="text-primary" /> Agent đang làm cho công ty này</h2>
          {agentCty.length ? (
            <ul className="space-y-1 text-sm">
              {agentCty.slice(0, 4).map((v) => (
                <li key={v.id} className="flex justify-between gap-2"><span className="text-foreground">{v.tieu_de}</span><span className="shrink-0 text-xs text-muted-foreground">{v.buoc_xong}/{v.buoc_tong} bước</span></li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Chưa giao việc nào. Ví dụ: "Chốt quý 4" — Agent Thuế và Agent Phân loại sẽ tự phối hợp.</p>}
          <Link to="/dashboard/space" className="inline-flex items-center gap-1 text-sm font-medium text-primary">Giao việc cho agent <ArrowRight size={14} /></Link>
          {soKhach > 1 && <p className="text-xs text-muted-foreground">Bạn làm sổ cho {soKhach} khách — <Link to="/dashboard/van-phong" className="underline">mở Văn phòng</Link>.</p>}
        </div>

        <form className="space-y-2 rounded-2xl border bg-card p-4" onSubmit={(e) => { e.preventDefault(); if (hoi.trim()) navigate(`${DUONG_TRO_LY}?hoi=${encodeURIComponent(hoi.trim())}`); }}>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Sparkles size={16} className="text-primary" /> Hỏi MIMI</h2>
          <input value={hoi} onChange={(e) => setHoi(e.target.value)} maxLength={500} aria-label="Câu hỏi cho MIMI"
            placeholder="Vì sao tháng này tiền ra nhiều hơn tiền vào?" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          <button type="submit" disabled={!hoi.trim()} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">Hỏi</button>
        </form>
      </section>
    </div>
  );
}
