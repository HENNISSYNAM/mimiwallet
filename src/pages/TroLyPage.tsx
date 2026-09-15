import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeftRight, ArrowUp, Check, FileText, Landmark, LayoutGrid, Loader2, Plus, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { NenVongHat } from '@/components/tro-ly/NenVongHat';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { dongBoSaoKe, goiTroLy } from '@/lib/goiTroLy';
import { goiTacTu } from '@/lib/goiTacTu';
import { goiChiPhiAi } from '@/lib/goiChiPhiAi';
import {
  canXacNhan, dinhDang, dinhTien, GOI_Y_THEO_NHOM, laCotSo, NHOM_NANG_LUC, TEN_NHOM, thucHienDeXuat,
  type BoiCanh, type DeXuat, type KetNoiHienThi, type KetQuaNangLuc, type KetQuaQuet, type NhomNangLuc, type The, type TraLoi,
} from '@/lib/troLy';
import claudeLogo from '@/assets/logos/claude.webp';
import geminiLogo from '@/assets/logos/gemini.png';
import thueLogo from '@/assets/logos/tax-authority.png';

/**
 * MIMI Assistant — một màn hình thay cho bảy trang cạnh tranh sự chú ý.
 *
 * Người dùng hỏi bằng lời; MIMI đọc dữ liệu thật, tính, trả lời bằng tiền và việc, rồi
 * đưa các việc làm được ngay dưới dạng nút. Việc nào đổi dữ liệu thì luôn qua hộp xác
 * nhận, và chạy bằng đúng backend của trang chi tiết tương ứng. Các trang cũ vẫn còn,
 * mở từ kết quả hoặc từ "Trang chi tiết".
 *
 * Người dùng là chủ doanh nghiệp và kế toán, không phải kỹ sư: không mã lỗi, không khoá,
 * không tên bảng. Mọi con số đi kèm nguồn.
 */

const TRANG_CHI_TIET: { nhom: NhomNangLuc; nhan: string; duong_dan: string }[] = [
  { nhom: 'tro_ly', nhan: 'Kiểm soát agent', duong_dan: '/dashboard/tac-tu' },
  { nhom: 'chi_phi', nhan: 'Chính sách chi', duong_dan: '/dashboard/chinh-sach' },
  { nhom: 'chung_tu', nhan: 'Chứng từ chi phí', duong_dan: '/dashboard/chung-tu' },
  { nhom: 'chung_tu', nhan: 'Hoá đơn', duong_dan: '/dashboard/invoices' },
  { nhom: 'ngan_hang', nhan: 'Kết nối ngân hàng & thuế', duong_dan: '/dashboard/fintech' },
  { nhom: 'ai_token', nhan: 'Chi phí AI', duong_dan: '/dashboard/chi-phi-ai' },
  { nhom: 'bao_cao', nhan: 'Báo cáo', duong_dan: '/dashboard/reports' },
];

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

const ANH_TOI_DA = 4 * 1024 * 1024;

/** Ảnh điện thoại thường 5–10 MB: thu về cạnh dài 2000px, JPEG, trước khi gửi. */
async function anhThanhDataUrl(file: File): Promise<string> {
  const docThang = () => new Promise<string>((ok, hong) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => hong(new Error('Không đọc được ảnh.'));
    r.readAsDataURL(file);
  });
  if (file.size <= ANH_TOI_DA && /^image\/(jpeg|png|webp)$/.test(file.type)) return docThang();
  if (typeof createImageBitmap !== 'function') throw new Error('Ảnh quá lớn — chụp lại gần hơn.');
  const bmp = await createImageBitmap(file);
  const tiLe = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * tiLe);
  canvas.height = Math.round(bmp.height * tiLe);
  canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

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
  const [moBang, setMoBang] = useState<'ket_noi' | 'trang' | null>(null);
  const [quet, setQuet] = useState<{ dangDoc: true } | { ketQua: KetQuaQuet; goiY: GoiYGiaoDich | null } | null>(null);
  const demLuot = useRef(0);
  const oNhap = useRef<HTMLTextAreaElement>(null);
  const oAnh = useRef<HTMLInputElement>(null);
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
    setMoBang(null);
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
      void taiBoiCanh();
    } catch (e) {
      setViec((m) => ({ ...m, [k]: { trangThai: 'loi', cau: e instanceof Error ? e.message : 'Chưa làm được việc này.' } }));
    }
  }, [navigate, taiBoiCanh]);

  const moQuet = () => {
    if (boiCanh && !boiCanh.co_mo_hinh) {
      toast.info('MIMI chưa bật đọc ảnh chứng từ. Bạn vẫn đối chiếu chứng từ ở trang Chứng từ chi phí.');
      return;
    }
    oAnh.current?.click();
  };

  const chonAnh = async (file: File | undefined) => {
    if (!file) return;
    setQuet({ dangDoc: true });
    try {
      const anh = await anhThanhDataUrl(file);
      const kq = await goiTroLy('quet_chung_tu', { anh });
      setQuet({ ketQua: kq.ket_qua as KetQuaQuet, goiY: (kq.giao_dich_goi_y as GoiYGiaoDich | null) ?? null });
    } catch (e) {
      setQuet(null);
      toast.error(e instanceof Error ? e.message : 'Chưa đọc được ảnh.');
    } finally {
      if (oAnh.current) oAnh.current.value = '';
    }
  };

  const viecCanLam = boiCanh?.viec ?? [];
  const ketNoi = boiCanh?.ket_noi ?? [];
  const soCanXuLy = ketNoi.filter((k) => k.trang_thai === 'can_xu_ly').length;
  const coHoiThoai = luot.length > 0;

  return (
    <div className="pb-8">
      {/* Nền vòng hạt tràn hết vùng nội dung: bù lại phần đệm của <main>. */}
      <section
        aria-label="Hỏi MIMI Assistant"
        className={`mimi-tro-ly-nen relative -mx-4 -mt-4 overflow-hidden px-4 lg:-mx-6 lg:-mt-6 lg:px-6 ${
          coHoiThoai ? 'pb-8 pt-10' : 'flex min-h-[calc(100vh-4rem)] items-center pb-16 pt-12'
        }`}
      >
        <NenVongHat />
        <div className="relative z-10 mx-auto w-full max-w-3xl text-center">
          <p className="text-sm font-medium text-muted-foreground">MIMI Assistant</p>
          <h2 className={`mt-2 font-display font-semibold tracking-tight text-foreground ${coHoiThoai ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-5xl'}`}>
            Hôm nay cần xử lý gì?
          </h2>
          {!coHoiThoai && (
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              MIMI đọc sao kê, chứng từ, chi phí AI và yêu cầu chi của {boiCanh?.cong_ty ?? 'công ty bạn'}, rồi đề xuất việc cần làm.
              Việc nào đổi dữ liệu, bạn xác nhận thì MIMI mới làm.
            </p>
          )}

          {/* Ô hỏi */}
          <form
            onSubmit={(e) => { e.preventDefault(); void hoi(nhap); }}
            className="mt-7 rounded-2xl border border-border bg-card text-left shadow-[0_8px_30px_hsla(220,30%,20%,0.08)]"
          >
            <label htmlFor="o-hoi-mimi" className="sr-only">Câu hỏi cho MIMI</label>
            <textarea
              id="o-hoi-mimi"
              ref={oNhap}
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
              placeholder="Hỏi MIMI về tiền, chứng từ, chi phí AI của công ty…"
              className="block w-full resize-none rounded-t-2xl bg-transparent px-5 pt-4 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <div className="flex items-center gap-2 px-3 pb-3 pt-2">
              <button
                type="button"
                onClick={moQuet}
                aria-label="Chụp hoặc tải ảnh chứng từ"
                title="Chụp hoặc tải ảnh chứng từ"
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus size={20} />
              </button>
              <input
                ref={oAnh}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                aria-label="Ảnh chứng từ"
                onChange={(e) => void chonAnh(e.target.files?.[0])}
              />
              {phamVi && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent py-1 pl-3 pr-1 text-xs font-medium text-foreground">
                  {TEN_NHOM[phamVi]}
                  <button
                    type="button"
                    onClick={() => setPhamVi(null)}
                    aria-label={`Bỏ phạm vi ${TEN_NHOM[phamVi]}`}
                    className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-background"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              <span className="ml-auto" />
              <button
                type="submit"
                disabled={!nhap.trim() || dangHoi}
                aria-label="Gửi câu hỏi"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {dangHoi ? <Loader2 size={17} className="animate-spin" /> : <ArrowUp size={18} />}
              </button>
            </div>
          </form>

          {/* Dải dưới ô hỏi: lối tắt tới dữ liệu chi tiết và các kết nối. */}
          <nav aria-label="Lối tắt" className="mx-3 flex flex-wrap items-center gap-x-1 gap-y-1 rounded-b-xl bg-card/70 px-2 py-1.5 text-sm text-muted-foreground backdrop-blur-sm">
            <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-accent hover:text-foreground">
              <ArrowLeftRight size={15} /> Giao dịch
            </Link>
            <Link to="/dashboard/chung-tu" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-accent hover:text-foreground">
              <FileText size={15} /> Chứng từ
            </Link>
            <button
              type="button"
              aria-expanded={moBang === 'ket_noi'}
              onClick={() => setMoBang((b) => (b === 'ket_noi' ? null : 'ket_noi'))}
              className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-accent hover:text-foreground"
            >
              <span className="flex -space-x-1.5" aria-hidden>
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card"><Landmark size={13} /></span>
                <img src={thueLogo} alt="" className="h-6 w-6 rounded-full border border-border bg-white object-contain p-0.5" />
                <img src={claudeLogo} alt="" className="h-6 w-6 rounded-full border border-border bg-white object-contain p-0.5" />
                <img src={geminiLogo} alt="" className="h-6 w-6 rounded-full border border-border bg-white object-contain" />
              </span>
              Kết nối
              {soCanXuLy > 0 && (
                <span className="rounded-full bg-mimi-amber/15 px-1.5 text-xs font-semibold text-mimi-amber">{soCanXuLy} cần xử lý</span>
              )}
            </button>
            <span className="ml-auto" />
            <button
              type="button"
              aria-expanded={moBang === 'trang'}
              onClick={() => setMoBang((b) => (b === 'trang' ? null : 'trang'))}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-accent hover:text-foreground"
            >
              <LayoutGrid size={15} /> Trang chi tiết
            </button>
          </nav>

          {moBang === 'ket_noi' && (
            <div className="mx-3 mt-2 rounded-xl border border-border bg-card p-3 text-left" role="region" aria-label="Các kết nối">
              {!boiCanh && !loiBoiCanh && <p className="text-sm text-muted-foreground">Đang đọc kết nối…</p>}
              {loiBoiCanh && <p className="text-sm text-destructive">{loiBoiCanh}</p>}
              <ul className="divide-y divide-border">
                {ketNoi.map((k) => (
                  <li key={k.khoa} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-center sm:gap-3">
                    <span className="w-32 shrink-0 text-sm font-medium text-foreground">{k.ten}</span>
                    <span className={`w-28 shrink-0 text-xs font-medium ${k.trang_thai === 'can_xu_ly' ? 'text-mimi-amber' : k.trang_thai === 'dang_chay' ? 'text-mimi-green' : 'text-muted-foreground'}`}>
                      {TEN_TRANG_THAI_KET_NOI[k.trang_thai]}
                    </span>
                    <span className="flex-1 text-sm text-muted-foreground">{k.cau}</span>
                    <Link to={k.duong_dan} className="text-sm font-medium text-foreground underline underline-offset-4">Mở</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {moBang === 'trang' && (
            <div className="mx-3 mt-2 grid gap-1 rounded-xl border border-border bg-card p-2 text-left sm:grid-cols-2" role="region" aria-label="Trang chi tiết">
              {TRANG_CHI_TIET.map((t) => (
                <Link key={t.duong_dan} to={t.duong_dan} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-accent">
                  <span className="text-foreground">{t.nhan}</span>
                  <span className="text-xs text-muted-foreground">{TEN_NHOM[t.nhom]}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Việc cần làm hôm nay — tính từ dữ liệu thật; bấm là hỏi MIMI đúng việc đó. */}
          {viecCanLam.length > 0 && (
            <div className="mt-5" role="region" aria-label="Việc cần làm hôm nay">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Việc cần làm hôm nay</p>
              <div className="flex flex-wrap justify-center gap-2">
                {viecCanLam.map((v) => (
                  <button
                    key={v.khoa}
                    type="button"
                    onClick={() => void hoi(v.hoi, v.nhom)}
                    disabled={dangHoi}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card/90 px-3.5 py-1.5 text-sm text-foreground hover:bg-card disabled:opacity-60"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${v.muc_do === 'can_chu_y' ? 'bg-mimi-amber' : 'bg-muted-foreground/50'}`} aria-hidden />
                    {v.cau}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nhóm việc và câu hỏi gợi ý — chỉ khi chưa hỏi gì, để màn đầu không trống. */}
          {!coHoiThoai && (
            <div className="mt-6">
              <div className="flex flex-wrap justify-center gap-1.5" role="group" aria-label="Chọn nhóm việc">
                {NHOM_NANG_LUC.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={phamVi === n}
                    onClick={() => setPhamVi((p) => (p === n ? null : n))}
                    className={`rounded-full px-3 py-1 text-sm transition-colors ${
                      phamVi === n ? 'bg-foreground text-background' : 'bg-card/70 text-muted-foreground hover:bg-card hover:text-foreground'
                    }`}
                  >
                    {TEN_NHOM[n]}
                  </button>
                ))}
              </div>
              <ul className="mx-auto mt-4 flex max-w-xl flex-col gap-1.5" aria-label="Câu hỏi gợi ý">
                {(phamVi ? GOI_Y_THEO_NHOM[phamVi] : [GOI_Y_THEO_NHOM.tro_ly[0], GOI_Y_THEO_NHOM.chung_tu[0], GOI_Y_THEO_NHOM.ai_token[0]]).map((g) => (
                  <li key={g}>
                    <button
                      type="button"
                      onClick={() => void hoi(g, phamVi)}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-card/80"
                    >
                      {g}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {boiCanh && !boiCanh.co_mo_hinh && (
            <p className="mx-auto mt-5 max-w-lg text-xs leading-relaxed text-muted-foreground">
              MIMI đang hiểu câu hỏi theo các mẫu có sẵn. Hỏi ngắn và đúng việc — như các gợi ý ở trên — để có câu trả lời chính xác.
            </p>
          )}
          {loiBoiCanh && moBang !== 'ket_noi' && (
            <p className="mt-4 text-sm text-destructive">{loiBoiCanh}</p>
          )}
        </div>
      </section>

      {/* Hội thoại */}
      {coHoiThoai && (
        <div ref={cuoiHoiThoai} className="mx-auto mt-8 flex max-w-3xl flex-col gap-8" aria-live="polite">
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

      <HopQuetChungTu
        quet={quet}
        onDong={() => setQuet(null)}
        onDaLuu={() => { setQuet(null); toast.success('Đã lưu chứng từ.'); void taiBoiCanh(); }}
      />
    </div>
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
                  disabled={!!tt && tt.trangThai !== 'loi' || !!hetNghia}
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

// ── Quét chứng từ ───────────────────────────────────────────────────────────

interface GoiYGiaoDich {
  id: string;
  ngay: string;
  nguoi_nhan: string | null;
  so_tien: number;
}

const TRUONG: { khoa: keyof KetQuaQuet; nhan: string; kieu: 'chu' | 'ngay' | 'tien' }[] = [
  { khoa: 'ben_ban', nhan: 'Bên bán', kieu: 'chu' },
  { khoa: 'ma_so_thue_ben_ban', nhan: 'Mã số thuế bên bán', kieu: 'chu' },
  { khoa: 'so_hoa_don', nhan: 'Số hoá đơn', kieu: 'chu' },
  { khoa: 'ky_hieu', nhan: 'Ký hiệu', kieu: 'chu' },
  { khoa: 'ngay', nhan: 'Ngày', kieu: 'ngay' },
  { khoa: 'tien_truoc_thue', nhan: 'Tiền trước thuế (₫)', kieu: 'tien' },
  { khoa: 'tien_thue', nhan: 'Tiền thuế (₫)', kieu: 'tien' },
  { khoa: 'tong_tien', nhan: 'Tổng tiền (₫)', kieu: 'tien' },
];

function HopQuetChungTu({ quet, onDong, onDaLuu }: {
  quet: { dangDoc: true } | { ketQua: KetQuaQuet; goiY: GoiYGiaoDich | null } | null;
  onDong: () => void;
  onDaLuu: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [gan, setGan] = useState(true);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const ketQua = quet && 'ketQua' in quet ? quet.ketQua : null;
  const goiY = quet && 'ketQua' in quet ? quet.goiY : null;

  useEffect(() => {
    if (!ketQua) return;
    const f: Record<string, string> = {};
    for (const t of TRUONG) {
      const v = ketQua[t.khoa];
      f[t.khoa] = v === null || v === undefined ? '' : String(v);
    }
    setForm(f);
    setGan(true);
    setLoi(null);
  }, [ketQua]);

  const luu = async () => {
    if (!ketQua) return;
    setDangLuu(true);
    setLoi(null);
    const so = (s: string) => (s.replace(/[^\d]/g, '') ? Number(s.replace(/[^\d]/g, '')) : null);
    try {
      await goiTroLy('luu_chung_tu', {
        loai: ketQua.loai,
        ben_ban: form.ben_ban || null,
        ma_so_thue_ben_ban: form.ma_so_thue_ben_ban || null,
        so_hoa_don: form.so_hoa_don || null,
        ky_hieu: form.ky_hieu || null,
        ngay: form.ngay || null,
        tien_truoc_thue: so(form.tien_truoc_thue ?? ''),
        tien_thue: so(form.tien_thue ?? ''),
        tong_tien: so(form.tong_tien ?? ''),
        giao_dich_id: goiY && gan ? goiY.id : null,
      });
      onDaLuu();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Chưa lưu được chứng từ.');
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <Dialog open={!!quet} onOpenChange={(mo) => { if (!mo && !dangLuu) onDong(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Xem lại chứng từ</DialogTitle>
          <DialogDescription>
            MIMI đọc từ ảnh bạn chụp. Kiểm từng ô rồi bấm lưu — MIMI không lưu ảnh, chỉ lưu các ô dưới đây.
          </DialogDescription>
        </DialogHeader>
        {!ketQua ? (
          <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Đang đọc ảnh…</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); void luu(); }} className="grid gap-3 sm:grid-cols-2">
            {TRUONG.map((t) => {
              const canXem = ketQua.can_xem_lai.includes(t.khoa);
              return (
                <label key={t.khoa} className={`flex flex-col gap-1 text-sm ${t.khoa === 'ben_ban' ? 'sm:col-span-2' : ''}`}>
                  <span className="text-muted-foreground">{t.nhan}{canXem && <span className="ml-1 text-mimi-amber">· kiểm lại</span>}</span>
                  <input
                    type={t.kieu === 'ngay' ? 'date' : 'text'}
                    inputMode={t.kieu === 'tien' ? 'numeric' : undefined}
                    value={form[t.khoa] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [t.khoa]: e.target.value }))}
                    className={`rounded-lg border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${canXem ? 'border-mimi-amber' : 'border-border'}`}
                  />
                </label>
              );
            })}
            {goiY && (
              <label className="flex items-start gap-2 rounded-lg bg-accent px-3 py-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={gan} onChange={(e) => setGan(e.target.checked)} className="mt-0.5" />
                <span className="text-foreground">
                  Gắn với khoản chi {dinhDang(goiY.so_tien, 'vnd')} ngày {dinhDang(goiY.ngay, 'ngay')}{goiY.nguoi_nhan ? ` cho ${goiY.nguoi_nhan}` : ''}
                </span>
              </label>
            )}
            {loi && <p className="text-sm text-destructive sm:col-span-2">{loi}</p>}
            <DialogFooter className="sm:col-span-2">
              <button type="button" onClick={onDong} className="rounded-lg border border-border px-4 py-2 text-sm">Huỷ</button>
              <button type="submit" disabled={dangLuu || !form.tong_tien} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {dangLuu && <Loader2 size={14} className="animate-spin" />} Lưu chứng từ
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
