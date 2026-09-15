import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCongCuGhim } from '@/hooks/useCongCuGhim';
import { duongDanCongCu } from '@/lib/congCu';
import { IconCongCu } from '@/components/cong-cu/IconCongCu';
import { KhoCongCu } from '@/components/cong-cu/KhoCongCu';
import {
  AlertTriangle, ArrowDown, ArrowRight, ArrowUp, Check, Cpu, FileText, Landmark, LayoutGrid, Lightbulb, Loader2,
  Paperclip, QrCode, RotateCcw, Shuffle, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { NenVongHat } from '@/components/tro-ly/NenVongHat';
import MimiCat from '@/components/brand/MimiCat';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { NutQuetChungTu } from '@/components/chung-tu/NutQuetChungTu';
import { DauKetNoi } from '@/components/tro-ly/DauKetNoi';
import { dongBoSaoKe, goiTroLy } from '@/lib/goiTroLy';
import { goiTacTu } from '@/lib/goiTacTu';
import { goiChiPhiAi } from '@/lib/goiChiPhiAi';
import {
  canXacNhan, dinhDang, dinhTien, GOI_Y_THEO_NHOM, laCotSo, NHOM_NANG_LUC, TEN_NHOM, thucHienDeXuat,
  type BoiCanh, type DeXuat, type KetNoiHienThi, type KetQuaNangLuc, type KetQuaQuet, type NhomNangLuc, type PhanTichNhanh,
  type The, type TraLoi,
} from '@/lib/troLy';
import claudeLogo from '@/assets/logos/claude.webp';
import geminiLogo from '@/assets/logos/gemini.png';
import thueLogo from '@/assets/logos/tax-authority.png';

/**
 * MIMI Assistant — một màn hình thay cho bảy trang cạnh tranh sự chú ý.
 *
 * Bố cục theo mẫu "sau khi tinh giảm" người dùng gửi (15/09/2026): mèo MIMI và câu hỏi, ô
 * hỏi có chip nhóm việc bên trong, hàng kết nối, ba thẻ "MIMI vừa phân tích cho bạn" (chi
 * phí AI, đề xuất tối ưu, cần bạn xác nhận), mẹo nhanh. Số trong mẫu là minh hoạ; ở đây
 * mọi số đến từ `boi_canh` của edge function `tro-ly`, không có thì nói chưa có.
 *
 * Người dùng hỏi bằng lời; MIMI đọc dữ liệu thật, tính, trả lời bằng tiền và việc, rồi đưa
 * các việc làm được ngay dưới dạng nút. Việc đổi dữ liệu luôn qua hộp xác nhận và chạy
 * bằng đúng backend của trang chi tiết tương ứng.
 */

import { TRANG_CHI_TIET } from '@/lib/trangChiTiet';

/** Việc đã có thẻ riêng ở màn đầu thì không lặp lại thành chip. */
const VIEC_DA_CO_THE = new Set(['cho_duyet', 'ngan_sach_ai']);

/** Lượt 0 là các nút trên thẻ màn đầu, không thuộc câu hỏi nào. */
const LUOT_MAN_DAU = 0;

interface Luot {
  id: number;
  cau: string;
  phamVi: NhomNangLuc | null;
  traLoi?: TraLoi;
  loi?: string;
}

type TrangThaiViec = { trangThai: 'dang' | 'xong' | 'loi'; cau: string };

const TEN_TRANG_THAI_KET_NOI: Record<KetNoiHienThi['trang_thai'], string> = {
  dang_chay: 'Đang chạy', can_xu_ly: 'Cần xử lý', chua_ket_noi: 'Chưa kết nối', chi_nhap_file: 'Nhập file',
};

const MAU_CHAM_KET_NOI: Record<KetNoiHienThi['trang_thai'], string> = {
  dang_chay: 'bg-mimi-green', can_xu_ly: 'bg-mimi-amber', chua_ket_noi: 'bg-muted-foreground/40', chi_nhap_file: 'bg-primary/60',
};

const THE = 'flex flex-col rounded-2xl border border-border bg-card p-5 text-left';

export default function TroLyPage() {
  const navigate = useNavigate();
  const [boiCanh, setBoiCanh] = useState<BoiCanh | null>(null);
  const [loiBoiCanh, setLoiBoiCanh] = useState<string | null>(null);
  const [luot, setLuot] = useState<Luot[]>([]);
  const [nhap, setNhap] = useState('');
  const [phamVi, setPhamVi] = useState<NhomNangLuc | null>(null);
  const [dangHoi, setDangHoi] = useState(false);
  const [viec, setViec] = useState<Record<string, TrangThaiViec>>({});
  const [xacNhan, setXacNhan] = useState<{ luotId: number; dx: DeXuat } | null>(null);
  const [moTrangChiTiet, setMoTrangChiTiet] = useState(false);
  const [hienMeo, setHienMeo] = useState(true);
  const demLuot = useRef(0);
  const [moKhoCongCu, setMoKhoCongCu] = useState(false);
  const congCu = useCongCuGhim();
  const [thamSo, datThamSo] = useSearchParams();
  const daHoiTuDuongDan = useRef(false);
  const cuoiHoiThoai = useRef<HTMLDivElement>(null);

  const taiBoiCanh = useCallback(async () => {
    try {
      setBoiCanh((await goiTroLy('boi_canh')) as BoiCanh);
      setLoiBoiCanh(null);
    } catch (e) {
      setLoiBoiCanh(e instanceof Error ? e.message : 'Chưa đọc được tình hình công ty.');
    }
  }, []);

  useEffect(() => { void taiBoiCanh(); }, [taiBoiCanh]);

  useEffect(() => {
    if (luot.length) cuoiHoiThoai.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [luot.length]);

  const hoi = useCallback(async (cauHoi: string, pv: NhomNangLuc | null = phamVi) => {
    const cau = cauHoi.trim();
    if (!cau || dangHoi) return;
    const id = ++demLuot.current;
    const lichSu = luot
      .filter((l) => l.traLoi)
      .slice(-3)
      .flatMap((l) => [{ vai: 'nguoi_dung', noi_dung: l.cau }, { vai: 'tro_ly', noi_dung: (l.traLoi as TraLoi).cau }]);
    setLuot((ds) => [...ds, { id, cau, phamVi: pv }]);
    setNhap('');
    setMoTrangChiTiet(false);
    setDangHoi(true);
    try {
      const traLoi = (await goiTroLy('hoi', { cau, pham_vi: pv, lich_su: lichSu })) as TraLoi;
      setLuot((ds) => ds.map((l) => (l.id === id ? { ...l, traLoi } : l)));
    } catch (e) {
      setLuot((ds) => ds.map((l) => (l.id === id ? { ...l, loi: e instanceof Error ? e.message : 'Không hỏi được MIMI.' } : l)));
    } finally {
      setDangHoi(false);
    }
  }, [dangHoi, luot, phamVi]);

  // Công cụ dạng câu hỏi mở trang này với ?hoi=… — hỏi đúng một lần rồi xoá khỏi địa chỉ,
  // để bấm "quay lại" hay tải lại trang không hỏi lặp.
  useEffect(() => {
    const cau = thamSo.get('hoi');
    if (!cau || daHoiTuDuongDan.current) return;
    daHoiTuDuongDan.current = true;
    datThamSo({}, { replace: true });
    void hoi(cau.slice(0, 1000), null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thamSo]);

  const lamDeXuat = useCallback(async (luotId: number, dx: DeXuat) => {
    if (dx.loai === 'mo_trang') {
      navigate(String(dx.tham_so.duong_dan ?? '/dashboard'));
      return;
    }
    const k = `${luotId}:${dx.khoa}`;
    setViec((m) => ({ ...m, [k]: { trangThai: 'dang', cau: '' } }));
    try {
      const cau = await thucHienDeXuat(dx, { goiTacTu, goiChiPhiAi, goiTroLy, dongBoSaoKe });
      setViec((m) => ({ ...m, [k]: { trangThai: 'xong', cau } }));
      // Thẻ ở màn đầu sẽ tải lại và khoản vừa làm biến khỏi thẻ — nên báo kết quả bằng toast.
      if (luotId === LUOT_MAN_DAU) toast.success(cau);
      void taiBoiCanh();
    } catch (e) {
      const cau = e instanceof Error ? e.message : 'Chưa làm được việc này.';
      setViec((m) => ({ ...m, [k]: { trangThai: 'loi', cau } }));
      if (luotId === LUOT_MAN_DAU) toast.error(cau);
    }
  }, [navigate, taiBoiCanh]);

  const viecKhac = (boiCanh?.viec ?? []).filter((v) => !VIEC_DA_CO_THE.has(v.khoa));
  const ketNoi = boiCanh?.ket_noi ?? [];
  const coHoiThoai = luot.length > 0;
  const goiYMeo = phamVi
    ? GOI_Y_THEO_NHOM[phamVi].slice(0, 2)
    : [GOI_Y_THEO_NHOM.ai_token[0], GOI_Y_THEO_NHOM.chung_tu[0]];

  return (
    <div className="pb-10">
      {/* Nền vòng hạt tràn hết vùng nội dung: bù lại phần đệm của <main>. */}
      <section
        aria-label="Hỏi MIMI Assistant"
        className={`mimi-tro-ly-nen relative -mx-4 -mt-4 overflow-hidden px-4 lg:-mx-6 lg:-mt-6 lg:px-6 ${coHoiThoai ? 'pb-8 pt-8' : 'pb-10 pt-10 sm:pt-14'}`}
      >
        <NenVongHat />
        <div className="relative z-10 mx-auto w-full max-w-4xl text-center">
          {!coHoiThoai && (
            <div className="mx-auto mb-3 h-20 w-20 sm:h-24 sm:w-24">
              <MimiCat variant="live" glow="none" className="w-full" />
            </div>
          )}
          <h2 className={`font-display font-semibold tracking-tight text-foreground ${coHoiThoai ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-5xl'}`}>
            MIMI có thể giúp gì cho bạn?
          </h2>
          {!coHoiThoai && (
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Hỏi, yêu cầu hoặc giao việc — MIMI đọc số liệu của {boiCanh?.cong_ty ?? 'công ty bạn'} và đề xuất cách làm. Việc nào đổi dữ liệu, bạn xác nhận là xong.
            </p>
          )}

          {/* Ô hỏi, chip nhóm việc nằm bên trong như mẫu */}
          <form
            onSubmit={(e) => { e.preventDefault(); void hoi(nhap); }}
            className="mx-auto mt-7 max-w-3xl rounded-2xl border border-border bg-card text-left shadow-[0_8px_30px_hsla(220,30%,20%,0.08)]"
          >
            <label htmlFor="o-hoi-mimi" className="sr-only">Câu hỏi cho MIMI</label>
            <textarea
              id="o-hoi-mimi"
              value={nhap}
              onChange={(e) => setNhap(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void hoi(nhap);
                }
              }}
              rows={coHoiThoai ? 1 : 2}
              maxLength={1000}
              placeholder="Bạn muốn MIMI xử lý việc gì?"
              className="block w-full resize-none rounded-t-2xl bg-transparent px-5 pt-4 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <div className="flex items-end gap-2 px-3 pb-3 pt-2">
              <div className="-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 pb-0.5" role="group" aria-label="Chọn nhóm việc">
                {NHOM_NANG_LUC.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={phamVi === n}
                    onClick={() => setPhamVi((p) => (p === n ? null : n))}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      phamVi === n ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground hover:bg-accent'
                    }`}
                  >
                    {TEN_NHOM[n]}
                  </button>
                ))}
              </div>
              <NutQuetChungTu
                coMoHinh={boiCanh ? boiCanh.co_mo_hinh : undefined}
                onDaLuu={() => void taiBoiCanh()}
                nhanAn="Chụp hoặc tải ảnh chứng từ"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Paperclip size={18} />
              </NutQuetChungTu>
              <button
                type="submit"
                disabled={!nhap.trim() || dangHoi}
                aria-label="Gửi câu hỏi"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {dangHoi ? <Loader2 size={17} className="animate-spin" /> : <ArrowUp size={18} />}
              </button>
            </div>
          </form>

          {/* Hàng kết nối */}
          {!coHoiThoai && (
            <div className="mx-auto mt-4 flex max-w-4xl items-center gap-3" role="region" aria-label="Kết nối">
              <span className="hidden shrink-0 text-sm font-medium text-foreground sm:inline">Kết nối</span>
              <ul className="-mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                {!boiCanh && !loiBoiCanh && <li className="py-2 text-sm text-muted-foreground">Đang đọc kết nối…</li>}
                {ketNoi.map((k) => (
                  <li key={k.khoa} className="shrink-0">
                    <Link
                      to={k.duong_dan}
                      title={k.cau}
                      className="flex items-center gap-2.5 rounded-xl border border-border bg-card/90 px-3 py-2 text-left hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <DauKetNoi khoa={k.khoa} />
                      <span>
                        <span className="block text-sm font-medium leading-tight text-foreground">{k.ten}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className={`h-1.5 w-1.5 rounded-full ${MAU_CHAM_KET_NOI[k.trang_thai]}`} aria-hidden />
                          {TEN_TRANG_THAI_KET_NOI[k.trang_thai]}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link to="/dashboard/fintech" className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline md:inline-flex">
                Quản lý kết nối <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {boiCanh && !boiCanh.co_mo_hinh && (
            <p className="mx-auto mt-4 max-w-lg text-xs leading-relaxed text-muted-foreground">
              MIMI đang hiểu câu hỏi theo các mẫu có sẵn. Hỏi ngắn và đúng việc — như gợi ý ở mẹo nhanh — để có câu trả lời chính xác.
            </p>
          )}
          {loiBoiCanh && <p className="mt-4 text-sm text-destructive">{loiBoiCanh}</p>}
        </div>
      </section>

      {/* Màn đầu: MIMI vừa phân tích cho bạn */}
      {!coHoiThoai && (
        <div className="mx-auto mt-8 max-w-5xl">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">MIMI vừa phân tích cho bạn</h2>
            <button
              type="button"
              aria-expanded={moTrangChiTiet}
              onClick={() => setMoTrangChiTiet((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <LayoutGrid size={15} /> Trang chi tiết
            </button>
          </div>

          {moTrangChiTiet && (
            <div className="mb-4 grid gap-1 rounded-xl border border-border bg-card p-2 sm:grid-cols-2 lg:grid-cols-4" role="region" aria-label="Trang chi tiết">
              {TRANG_CHI_TIET.map((t) => (
                <Link key={t.duong_dan} to={t.duong_dan} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-accent">
                  <span className="text-foreground">{t.nhan}</span>
                  <span className="text-xs text-muted-foreground">{TEN_NHOM[t.nhom]}</span>
                </Link>
              ))}
            </div>
          )}

          <div className="mb-4" role="region" aria-label="Công cụ của bạn">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {congCu.ds.map((c) => (
                <Link
                  key={c.khoa}
                  to={duongDanCongCu(c)}
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm text-foreground hover:bg-accent"
                >
                  <IconCongCu khoa={c.khoa} size={16} className="text-muted-foreground" /> {c.ten}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => setMoKhoCongCu(true)}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-border px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                + Tuỳ chỉnh công cụ
              </button>
            </div>
          </div>
          <KhoCongCu mo={moKhoCongCu} onDong={() => setMoKhoCongCu(false)} />

          {viecKhac.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2" role="region" aria-label="Cũng cần để ý">
              {viecKhac.map((v) => (
                <button
                  key={v.khoa}
                  type="button"
                  onClick={() => void hoi(v.hoi, v.nhom)}
                  disabled={dangHoi}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-foreground hover:bg-accent disabled:opacity-60"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${v.muc_do === 'can_chu_y' ? 'bg-mimi-amber' : 'bg-muted-foreground/50'}`} aria-hidden />
                  {v.cau}
                </button>
              ))}
            </div>
          )}

          {boiCanh ? (
            <div className="grid gap-4 md:grid-cols-3">
              <TheChiPhiAi p={boiCanh.phan_tich.chi_phi_ai} />
              <TheToiUu p={boiCanh.phan_tich.toi_uu} onHoi={(c) => void hoi(c, 'ai_token')} />
              <TheCanXacNhan
                p={boiCanh.phan_tich.can_xac_nhan}
                viec={viec}
                onDuyet={(dx) => setXacNhan({ luotId: LUOT_MAN_DAU, dx })}
              />
            </div>
          ) : !loiBoiCanh ? (
            <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 size={15} className="animate-spin" /> MIMI đang đọc số liệu…</p>
          ) : null}

          {hienMeo && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm" role="note">
              <Lightbulb size={17} className="mt-0.5 shrink-0 text-mimi-amber" aria-hidden />
              <p className="flex-1 leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Mẹo nhanh:</span> Bạn có thể hỏi{' '}
                {goiYMeo.map((g, i) => (
                  <span key={g}>
                    {i > 0 && ' hoặc '}“<button type="button" onClick={() => void hoi(g, phamVi)} className="text-foreground underline underline-offset-4 hover:text-primary">{g}</button>”
                  </span>
                ))}{' '}
                để MIMI xử lý ngay.
              </p>
              <button type="button" onClick={() => setHienMeo(false)} aria-label="Ẩn mẹo" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
                <X size={15} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hội thoại */}
      {coHoiThoai && (
        <div ref={cuoiHoiThoai} className="mx-auto mt-8 flex max-w-3xl flex-col gap-8" aria-live="polite">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => { setLuot([]); setViec({}); void taiBoiCanh(); }}
              disabled={dangHoi}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-accent disabled:opacity-50"
            >
              <RotateCcw size={14} /> Cuộc hỏi mới
            </button>
          </div>
          {luot.map((l) => (
            <article key={l.id} aria-label={`Câu hỏi: ${l.cau}`} className="flex flex-col gap-4">
              <div className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] text-primary-foreground">{l.cau}</p>
              </div>
              {!l.traLoi && !l.loi && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={15} className="animate-spin" /> MIMI đang đọc dữ liệu và tính…
                </p>
              )}
              {l.loi && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
                  <span className="text-foreground">{l.loi}</span>
                  <button type="button" onClick={() => void hoi(l.cau, l.phamVi)} className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4">
                    <RotateCcw size={14} /> Hỏi lại
                  </button>
                </div>
              )}
              {l.traLoi && (
                <TraLoiMimi
                  luotId={l.id}
                  traLoi={l.traLoi}
                  viec={viec}
                  onChon={(dx) => (canXacNhan(dx) ? setXacNhan({ luotId: l.id, dx }) : void lamDeXuat(l.id, dx))}
                />
              )}
            </article>
          ))}
        </div>
      )}

      <AlertDialog open={!!xacNhan} onOpenChange={(mo) => { if (!mo) setXacNhan(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{xacNhan?.dx.nhan}</AlertDialogTitle>
            <AlertDialogDescription>{xacNhan?.dx.mo_ta}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Để sau</AlertDialogCancel>
            <AlertDialogAction
              data-mimi-khong-tu-bam={xacNhan && dinhTien(xacNhan.dx) ? '' : undefined}
              className={xacNhan?.dx.loai === 'tu_choi_yeu_cau' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
              onClick={() => { if (xacNhan) void lamDeXuat(xacNhan.luotId, xacNhan.dx); setXacNhan(null); }}
            >
              {xacNhan?.dx.loai === 'duyet_yeu_cau' ? 'Xác nhận duyệt' : xacNhan?.dx.loai === 'tu_choi_yeu_cau' ? 'Xác nhận từ chối' : 'Xác nhận'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Màn đầu ─────────────────────────────────────────────────────────────────

function TheChiPhiAi({ p }: { p: PhanTichNhanh['chi_phi_ai'] }) {
  return (
    <section aria-labelledby="the-chi-phi-ai" className={THE}>
      <h3 id="the-chi-phi-ai" className="text-base font-semibold text-foreground">Chi phí AI tháng này</h3>
      {!p ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">Chưa có số liệu chi phí AI. MIMI chỉ ghi đúng số nhà cung cấp tính, không tự ước tính.</p>
          <Link to="/dashboard/chi-phi-ai" className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-primary hover:underline">
            Tải file hoặc bật tự động <ArrowRight size={14} />
          </Link>
        </>
      ) : (
        <>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-foreground">{dinhDang(p.thang_nay_usd, 'usd')}</p>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            {p.thay_doi_phan_tram === null ? 'Chưa có số tháng trước để so' : (
              <>
                {p.thay_doi_phan_tram >= 0 ? <ArrowUp size={14} aria-hidden /> : <ArrowDown size={14} aria-hidden />}
                {Math.abs(p.thay_doi_phan_tram)}% so với cùng kỳ tháng trước
              </>
            )}
          </p>
          {p.ngan_sach_usd !== null && (
            <p className={`mt-1 text-sm ${p.phan_tram_ngan_sach !== null && p.phan_tram_ngan_sach >= 100 ? 'font-medium text-mimi-amber' : 'text-muted-foreground'}`}>
              Đã dùng {p.phan_tram_ngan_sach}% ngân sách {dinhDang(p.ngan_sach_usd, 'usd')}
            </p>
          )}
          <BieuDoThang ds={p.theo_thang} />
        </>
      )}
    </section>
  );
}

/** Cột theo tháng, một dãy số nên không cần chú giải; tháng chưa có số hiện gạch, không vẽ cột 0. */
function BieuDoThang({ ds }: { ds: { khoa: string; nhan: string; usd: number | null }[] }) {
  const lonNhat = Math.max(0, ...ds.map((d) => d.usd ?? 0));
  return (
    <figure className="mt-auto pt-5">
      <div className="flex h-24 items-end gap-3" aria-hidden>
        {ds.map((d, i) => (
          <div key={d.khoa} className="flex h-full flex-1 flex-col items-center justify-end" title={d.usd === null ? `${d.nhan}: chưa có số liệu` : `${d.nhan}: ${dinhDang(d.usd, 'usd')}`}>
            {d.usd === null ? (
              <span className="mb-1 text-xs text-muted-foreground">—</span>
            ) : (
              <span
                className={`w-full max-w-[28px] rounded-t-[4px] ${i === ds.length - 1 ? 'bg-primary' : 'bg-primary/35'}`}
                style={{ height: `${lonNhat > 0 ? Math.max(3, (d.usd / lonNhat) * 100) : 3}%` }}
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-3 text-xs text-muted-foreground" aria-hidden>
        {ds.map((d) => <span key={d.khoa} className="flex-1 text-center">{d.nhan}</span>)}
      </div>
      <table className="sr-only">
        <caption>Chi phí AI 5 tháng gần nhất</caption>
        <tbody>
          {ds.map((d) => <tr key={d.khoa}><th scope="row">{d.nhan}</th><td>{d.usd === null ? 'Chưa có số liệu' : dinhDang(d.usd, 'usd')}</td></tr>)}
        </tbody>
      </table>
    </figure>
  );
}

function TheToiUu({ p, onHoi }: { p: PhanTichNhanh['toi_uu']; onHoi: (cau: string) => void }) {
  return (
    <section aria-labelledby="the-toi-uu" className={THE}>
      <h3 id="the-toi-uu" className="text-base font-semibold text-foreground">Đề xuất tối ưu</h3>
      <p className="text-sm text-muted-foreground">Từ số liệu thật của công ty</p>
      <ul className="mt-3 space-y-2">
        {p.y.map((y) => (
          <li key={y} className="flex gap-2 text-sm text-foreground">
            <Check size={16} className="mt-0.5 shrink-0 text-mimi-green" aria-hidden /> {y}
          </li>
        ))}
      </ul>
      {p.tiet_kiem_usd !== null && (
        <div className="mt-4 rounded-xl bg-mimi-green/10 px-4 py-3">
          <p className="text-xs text-muted-foreground">Tiết kiệm ước tính</p>
          <p className="font-display text-xl font-semibold tabular-nums text-foreground">~ {dinhDang(p.tiet_kiem_usd, 'usd')} / 30 ngày</p>
        </div>
      )}
      <button type="button" onClick={() => onHoi(p.hoi)} className="mt-auto inline-flex items-center gap-1 self-start pt-4 text-sm font-medium text-primary hover:underline">
        Hỏi MIMI chi tiết <ArrowRight size={14} />
      </button>
    </section>
  );
}

function TheCanXacNhan({ p, viec, onDuyet }: {
  p: PhanTichNhanh['can_xac_nhan'];
  viec: Record<string, TrangThaiViec>;
  onDuyet: (dx: DeXuat) => void;
}) {
  return (
    <section aria-labelledby="the-can-xac-nhan" className={THE}>
      <h3 id="the-can-xac-nhan" className="text-base font-semibold text-foreground">Cần bạn xác nhận</h3>
      <p className="text-sm text-muted-foreground">
        {p.so_khoan ? `${p.so_khoan} khoản chi cần phê duyệt, tổng ${dinhDang(p.tong_tien, 'vnd')}` : 'Không có khoản nào đang chờ bạn duyệt.'}
      </p>
      {p.muc.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {p.muc.map((m) => {
            const tt = m.duyet ? viec[`${LUOT_MAN_DAU}:${m.duyet.khoa}`] : undefined;
            return (
              <li key={m.yeu_cau_id} className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 gap-2">
                  <FileText size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{m.muc_dich}</p>
                    <p className="text-sm font-semibold tabular-nums text-foreground">{dinhDang(m.so_tien, 'vnd')}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.agent} · {m.nguoi_nhan} · {dinhDang(m.ngay, 'ngay')}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link to="/dashboard/tac-tu?tab=yeu-cau" className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm text-foreground hover:bg-accent">Xem</Link>
                  {m.duyet && (
                    <button
                      type="button"
                      onClick={() => onDuyet(m.duyet as DeXuat)}
                      disabled={tt?.trangThai === 'dang'}
                      data-mimi-khong-tu-bam=""
                      aria-label={`Phê duyệt ${dinhDang(m.so_tien, 'vnd')} cho ${m.nguoi_nhan}`}
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50"
                    >
                      {tt?.trangThai === 'dang' && <Loader2 size={13} className="animate-spin" />} Phê duyệt
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {p.so_khoan > p.muc.length && (
        <Link to="/dashboard/tac-tu?tab=yeu-cau" className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-medium text-primary hover:underline">
          Xem cả {p.so_khoan} khoản <ArrowRight size={14} />
        </Link>
      )}
    </section>
  );
}

// ── Câu trả lời ─────────────────────────────────────────────────────────────

function TraLoiMimi({ luotId, traLoi, viec, onChon }: {
  luotId: number;
  traLoi: TraLoi;
  viec: Record<string, TrangThaiViec>;
  onChon: (dx: DeXuat) => void;
}) {
  // Duyệt xong một khoản thì nút "Từ chối" của chính khoản đó cũng hết nghĩa.
  const yeuCauDaXong = useMemo(() => {
    const s = new Set<string>();
    for (const r of traLoi.ket_qua) {
      for (const dx of r.de_xuat) {
        if (viec[`${luotId}:${dx.khoa}`]?.trangThai === 'xong' && dx.tham_so.yeu_cau_id) s.add(String(dx.tham_so.yeu_cau_id));
      }
    }
    return s;
  }, [traLoi, viec, luotId]);

  return (
    <div className="flex flex-col gap-4">
      {traLoi.buoc.length > 1 && (
        <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="MIMI đã làm gì">
          {traLoi.buoc.map((b) => (
            <li key={b.ten} className="inline-flex items-center gap-1"><Check size={12} className="text-mimi-green" aria-hidden /> {b.cau}</li>
          ))}
        </ol>
      )}
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground">{traLoi.cau}</p>
      {traLoi.ket_qua.map((r) => (
        <KetQua key={r.nang_luc} luotId={luotId} r={r} viec={viec} yeuCauDaXong={yeuCauDaXong} onChon={onChon} />
      ))}
    </div>
  );
}

function KetQua({ luotId, r, viec, yeuCauDaXong, onChon }: {
  luotId: number;
  r: KetQuaNangLuc;
  viec: Record<string, TrangThaiViec>;
  yeuCauDaXong: Set<string>;
  onChon: (dx: DeXuat) => void;
}) {
  if (!r.the.length && !r.de_xuat.length && !r.trang.length) return null;
  return (
    <section aria-label={TEN_NHOM[r.nhom]} className="rounded-xl border border-border bg-card p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{TEN_NHOM[r.nhom]}</p>
      <div className="flex flex-col gap-4">
        {r.the.map((t, i) => <TheKetQua key={i} the={t} />)}
      </div>

      {r.de_xuat.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2 border-t border-border pt-4" aria-label="Việc bạn có thể làm">
          {r.de_xuat.map((dx) => {
            const tt = viec[`${luotId}:${dx.khoa}`];
            const hetNghia = !tt && dx.tham_so.yeu_cau_id && yeuCauDaXong.has(String(dx.tham_so.yeu_cau_id));
            return (
              <li key={dx.khoa} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <button
                  type="button"
                  disabled={(!!tt && tt.trangThai !== 'loi') || !!hetNghia}
                  onClick={() => onChon(dx)}
                  data-mimi-khong-tu-bam={dinhTien(dx) ? '' : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    dx.loai === 'tu_choi_yeu_cau'
                      ? 'border-border text-destructive hover:bg-destructive/5'
                      : 'border-foreground/15 bg-foreground text-background hover:bg-foreground/90'
                  }`}
                >
                  {tt?.trangThai === 'dang' && <Loader2 size={14} className="animate-spin" />}
                  {dx.nhan}
                </button>
                {tt?.trangThai === 'xong' && (
                  <span className="inline-flex items-center gap-1 text-sm text-mimi-green"><Check size={14} /> {tt.cau}</span>
                )}
                {tt?.trangThai === 'loi' && (
                  <span className="inline-flex items-center gap-1 text-sm text-destructive"><AlertTriangle size={14} /> {tt.cau}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {(r.trang.length > 0 || r.nguon.length > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {r.trang.map((t) => (
            <Link key={t.duong_dan} to={t.duong_dan} className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80">
              {t.nhan}
            </Link>
          ))}
          {r.nguon.length > 0 && (
            <span className="text-xs text-muted-foreground">
              Nguồn:{' '}
              {r.nguon.map((n, i) => (
                <span key={n.ten} title={n.mo_ta}>{i > 0 ? ' · ' : ''}{n.ten}</span>
              ))}
            </span>
          )}
        </div>
      )}
    </section>
  );
}

function TheKetQua({ the }: { the: The }) {
  if (the.loai === 'ghi_chu') {
    return (
      <p className={`flex gap-2 rounded-lg px-3 py-2 text-sm ${the.muc_do === 'can_chu_y' ? 'bg-mimi-amber/10 text-foreground' : 'bg-accent text-muted-foreground'}`}>
        {the.muc_do === 'can_chu_y' && <AlertTriangle size={15} className="mt-0.5 shrink-0 text-mimi-amber" aria-hidden />}
        {the.cau}
      </p>
    );
  }
  if (the.loai === 'so_lieu') {
    return (
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">{the.tieu_de}</p>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {the.muc.map((m) => (
            <div key={m.nhan} className="rounded-lg bg-accent/60 px-3 py-2">
              <dt className="text-xs text-muted-foreground">{m.nhan}</dt>
              <dd className={`mt-0.5 font-display text-lg font-semibold tabular-nums ${m.can_chu_y ? 'text-mimi-amber' : 'text-foreground'}`}>
                {dinhDang(m.gia_tri, m.don_vi)}
              </dd>
              {m.ghi_chu && <dd className="text-xs text-muted-foreground">{m.ghi_chu}</dd>}
            </div>
          ))}
        </dl>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <caption className="mb-2 text-left text-sm font-medium text-foreground">{the.tieu_de}</caption>
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            {the.cot.map((c) => (
              <th key={c.nhan} scope="col" className={`py-2 pr-3 font-medium ${laCotSo(c.don_vi) ? 'text-right' : 'text-left'}`}>{c.nhan}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {the.dong.map((dong, i) => (
            <tr key={i} className="border-b border-border/60 last:border-0">
              {dong.map((o, j) => (
                <td key={j} className={`py-2 pr-3 ${laCotSo(the.cot[j]?.don_vi ?? 'chu') ? 'text-right tabular-nums' : 'text-left'} text-foreground`}>
                  {dinhDang(o, the.cot[j]?.don_vi ?? 'chu')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!!the.con_lai && <p className="mt-2 text-xs text-muted-foreground">Còn {the.con_lai} dòng nữa ở trang chi tiết.</p>}
    </div>
  );
}

