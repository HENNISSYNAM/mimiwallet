import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as SuKienTro } from 'react';
import { ArrowLeft, ArrowRight, Camera, Check, Crop, FileDown, ImagePlus, Loader2, RotateCw, ScanLine, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CheDoQuet } from '@/lib/quet/lamRo';
import type { BonGoc } from '@/lib/quet/phoiCanh';
import { khungMacDinh } from '@/lib/quet/timGoc';
import { taoPdf } from '@/lib/quet/pdf';
import { blobThanhDataUrl, dungTrang, nhanAnh, timLaiGoc, type AnhNguon } from '@/lib/quet/trinhDuyet';
import { ngayTep, taiTep } from '@/lib/inTaiLieu';

/**
 * Quét giấy tờ thành PDF — làm như máy quét, chạy hoàn toàn trên trình duyệt.
 *
 * Chụp (hoặc chọn ảnh) → MIMI tự tìm bốn góc tờ giấy → người dùng kéo chỉnh nếu lệch → nắn
 * phẳng → "Tài liệu" (đen trắng, khử bóng) hoặc "Màu" → nhiều trang, sắp lại, xoay → một tệp PDF A4.
 *
 * Ảnh không rời máy ở bước nào trong đây. Chỉ khi người dùng bấm "Gửi MIMI đọc" thì trang đầu
 * mới đi vào luồng đọc chứng từ sẵn có (`onDungAnh`), giống như trước khi có máy quét.
 */

interface Trang extends AnhNguon {
  id: string;
  nguonUrl: string;
  goc: BonGoc;
  timThay: boolean;
  xoay: number;
  ketQua: Blob | null;
  ketQuaUrl: string | null;
  dangDung: boolean;
}

type Buoc = 'chup' | 'chinh' | 'ds';
type LoiMayAnh = 'bi_tu_choi' | 'khong_co' | 'khong_ho_tro' | 'loi';


/** Đổi lỗi getUserMedia thành lý do người dùng hiểu được. */
export function loiMayAnh(e: unknown): LoiMayAnh {
  const ten = (e as { name?: string } | null)?.name ?? '';
  if (ten === 'NotAllowedError' || ten === 'PermissionDeniedError' || ten === 'SecurityError') return 'bi_tu_choi';
  if (ten === 'NotFoundError' || ten === 'DevicesNotFoundError' || ten === 'OverconstrainedError') return 'khong_co';
  return 'loi';
}

const CHE_DO: CheDoQuet[] = ['tai_lieu', 'mau', 'goc'];

const kichCo = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
let dem = 0;
const idMoi = () => `t${Date.now().toString(36)}${(dem++).toString(36)}`;

export function QuetTaiLieu({ mo, onDong, onDungAnh, nhanDungAnh, cheDoMacDinh = 'tai_lieu', tenTep = 'quet-mimi' }: {
  mo: boolean;
  onDong: () => void;
  /** Có thì hiện nút đưa trang đầu (data URL JPEG) vào luồng sẵn có — đọc chứng từ, đính kèm. */
  onDungAnh?: (anh: string) => void;
  nhanDungAnh?: string;
  cheDoMacDinh?: CheDoQuet;
  tenTep?: string;
}) {
  const { t: dich } = useTranslation();
  const [buoc, setBuoc] = useState<Buoc>('chup');
  const [trang, setTrang] = useState<Trang[]>([]);
  const [dangChinh, setDangChinh] = useState<number>(-1);
  const [cheDo, setCheDo] = useState<CheDoQuet>(cheDoMacDinh);
  const [loiCam, setLoiCam] = useState<LoiMayAnh | null>(null);
  const [camSan, setCamSan] = useState(false);
  const [dangNhan, setDangNhan] = useState(false);
  const [dangXuat, setDangXuat] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const luong = useRef<MediaStream | null>(null);
  const dangMoCam = useRef(false);
  const canCam = useRef(false);
  const oChon = useRef<HTMLInputElement>(null);
  const oChup = useRef<HTMLInputElement>(null);
  // Bản mới nhất của danh sách trang cho các hàm bất đồng bộ (tránh đọc state cũ trong closure).
  const trangRef = useRef<Trang[]>([]);
  trangRef.current = trang;

  const tatMayAnh = useCallback(() => {
    luong.current?.getTracks().forEach((t) => t.stop());
    luong.current = null;
    setCamSan(false);
  }, []);

  const batMayAnh = useCallback(async () => {
    setLoiCam(null);
    // StrictMode gọi hiệu ứng hai lần: chặn mở hai luồng cùng lúc (luồng thừa sẽ giữ đèn máy ảnh sáng mãi).
    if (luong.current || dangMoCam.current) return;
    // Máy ảnh trực tiếp chỉ có trên HTTPS (hoặc localhost). Không có thì rơi về chọn ảnh.
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || (typeof window !== 'undefined' && window.isSecureContext === false)) {
      setLoiCam('khong_ho_tro');
      return;
    }
    dangMoCam.current = true;
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1440 } },
        audio: false,
      });
      // Người dùng đã đóng hộp / rời bước chụp trong lúc trình duyệt hỏi quyền: tắt ngay, không giữ máy ảnh.
      if (!canCam.current) { s.getTracks().forEach((t) => t.stop()); return; }
      luong.current = s;
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play().catch(() => undefined);
      }
      setCamSan(true);
    } catch (e) {
      setLoiCam(loiMayAnh(e));
    } finally {
      dangMoCam.current = false;
    }
  }, []);

  // Máy ảnh chỉ bật khi đang ở bước chụp và hộp đang mở — rời bước là tắt đèn máy ảnh ngay.
  useEffect(() => {
    canCam.current = mo && buoc === 'chup';
    if (canCam.current) void batMayAnh();
    else tatMayAnh();
  }, [mo, buoc, batMayAnh, tatMayAnh]);
  useEffect(() => () => tatMayAnh(), [tatMayAnh]);

  const donDep = useCallback(() => {
    for (const t of trangRef.current) {
      URL.revokeObjectURL(t.nguonUrl);
      if (t.ketQuaUrl) URL.revokeObjectURL(t.ketQuaUrl);
    }
    setTrang([]);
    setBuoc('chup');
    setDangChinh(-1);
    setCheDo(cheDoMacDinh);
  }, [cheDoMacDinh]);
  useEffect(() => () => { for (const t of trangRef.current) { URL.revokeObjectURL(t.nguonUrl); if (t.ketQuaUrl) URL.revokeObjectURL(t.ketQuaUrl); } }, []);

  const dong = () => { tatMayAnh(); donDep(); onDong(); };

  /** Dựng lại ảnh kết quả của một trang (sau khi chỉnh góc, xoay, đổi chế độ). */
  const dungLai = useCallback(async (id: string, cd: CheDoQuet) => {
    const t = trangRef.current.find((x) => x.id === id);
    if (!t) return;
    setTrang((ds) => ds.map((x) => (x.id === id ? { ...x, dangDung: true } : x)));
    // Nhường một nhịp cho giao diện vẽ vòng quay trước khi tính (nắn 2000px mất vài trăm ms trên điện thoại).
    await new Promise((r) => setTimeout(r, 0));
    try {
      const b = await dungTrang(t, t.goc, cd, t.xoay);
      setTrang((ds) => ds.map((x) => {
        if (x.id !== id) return x;
        if (x.ketQuaUrl) URL.revokeObjectURL(x.ketQuaUrl);
        return { ...x, ketQua: b, ketQuaUrl: URL.createObjectURL(b), dangDung: false };
      }));
    } catch (e) {
      setTrang((ds) => ds.map((x) => (x.id === id ? { ...x, dangDung: false } : x)));
      toast.error(e instanceof Error ? e.message : dich('ui1.quet.chuaDung'));
    }
  }, []);

  const themTrang = async (nguon: Blob | HTMLVideoElement) => {
    setDangNhan(true);
    try {
      const a = await nhanAnh(nguon);
      const t: Trang = { ...a, id: idMoi(), nguonUrl: URL.createObjectURL(a.blob), xoay: 0, ketQua: null, ketQuaUrl: null, dangDung: false };
      trangRef.current = [...trangRef.current, t];
      setTrang(trangRef.current);
      setDangChinh(trangRef.current.length - 1);
      setBuoc('chinh');
      if (!a.timThay) toast.info(dich('ui1.quet.chuaThayMep'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : dich('ui1.quet.khongDocAnh'));
    } finally {
      setDangNhan(false);
    }
  };

  const chonTep = async (ds: FileList | null) => {
    const tep = Array.from(ds ?? []).filter((f) => f.type.startsWith('image/'));
    if (oChon.current) oChon.current.value = '';
    if (oChup.current) oChup.current.value = '';
    if (!tep.length) return;
    if (tep.length === 1) { await themTrang(tep[0]); return; }
    // Chọn nhiều ảnh một lúc: tin góc tự tìm, dựng thẳng, ra danh sách — chỉnh từng trang sau nếu cần.
    setDangNhan(true);
    let lech = 0;
    for (const f of tep) {
      try {
        const a = await nhanAnh(f);
        if (!a.timThay) lech++;
        const t: Trang = { ...a, id: idMoi(), nguonUrl: URL.createObjectURL(a.blob), xoay: 0, ketQua: null, ketQuaUrl: null, dangDung: false };
        trangRef.current = [...trangRef.current, t];
        setTrang(trangRef.current);
        void dungLai(t.id, cheDo);
      } catch {
        toast.error(dich('ui1.quet.khongDocAnhTen', { ten: f.name }));
      }
    }
    setDangNhan(false);
    setBuoc('ds');
    if (lech) toast.info(dich('ui1.quet.lechNhieu', { n: lech }));
  };

  const chup = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    void themTrang(v);
  };

  const xongChinh = () => {
    const t = trang[dangChinh];
    setBuoc('ds');
    setDangChinh(-1);
    if (t) void dungLai(t.id, cheDo);
  };

  const doiGoc = (goc: BonGoc) => setTrang((ds) => ds.map((x, i) => (i === dangChinh ? { ...x, goc } : x)));

  const doiCheDo = (cd: CheDoQuet) => {
    setCheDo(cd);
    for (const t of trangRef.current) void dungLai(t.id, cd);
  };

  const xoayTrang = (id: string) => {
    trangRef.current = trangRef.current.map((x) => (x.id === id ? { ...x, xoay: (x.xoay + 1) % 4 } : x));
    setTrang(trangRef.current);
    void dungLai(id, cheDo);
  };

  const doiCho = (i: number, j: number) => setTrang((ds) => {
    if (j < 0 || j >= ds.length) return ds;
    const ra = [...ds];
    [ra[i], ra[j]] = [ra[j], ra[i]];
    return ra;
  });

  const xoaTrang = (id: string) => setTrang((ds) => {
    const t = ds.find((x) => x.id === id);
    if (t) { URL.revokeObjectURL(t.nguonUrl); if (t.ketQuaUrl) URL.revokeObjectURL(t.ketQuaUrl); }
    const ra = ds.filter((x) => x.id !== id);
    if (!ra.length) setBuoc('chup');
    return ra;
  });

  const dangBan = trang.some((t) => t.dangDung || !t.ketQua);

  const xuatPdf = async () => {
    if (!trang.length || dangBan) return;
    setDangXuat(true);
    try {
      const byte = await Promise.all(trang.map(async (t) => new Uint8Array(await (t.ketQua as Blob).arrayBuffer())));
      const pdf = taoPdf(byte, `${tenTep} ${ngayTep()}`);
      const ten = `${tenTep}-${ngayTep()}.pdf`;
      taiTep(new Blob([pdf], { type: 'application/pdf' }), ten);
      toast.success(dich('ui1.quet.daTai', { ten, n: trang.length, co: kichCo(pdf.length) }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : dich('ui1.quet.chuaPdf'));
    } finally {
      setDangXuat(false);
    }
  };

  const dungAnh = async () => {
    const dau = trang[0]?.ketQua;
    if (!dau || !onDungAnh) return;
    try {
      const anh = await blobThanhDataUrl(dau);
      tatMayAnh();
      donDep();
      onDungAnh(anh);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : dich('ui1.quet.khongDocTrang'));
    }
  };

  const tc = trang[dangChinh];
  const nut = 'inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium disabled:opacity-50';
  const nutPhu = `${nut} border border-border text-foreground hover:bg-accent`;
  const nutChinh = `${nut} bg-primary text-primary-foreground hover:brightness-110`;
  const nutNho = 'inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40';

  return (
    <Dialog open={mo} onOpenChange={(v) => { if (!v && !dangXuat) dong(); }}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ScanLine size={18} aria-hidden /> {dich('ui1.quet.tieuDe')}</DialogTitle>
          <DialogDescription>
            {buoc === 'chup' && dich('ui1.quet.moTaChup')}
            {buoc === 'chinh' && dich('ui1.quet.moTaChinh')}
            {buoc === 'ds' && dich('ui1.quet.moTaDs', { n: trang.length })}
          </DialogDescription>
        </DialogHeader>

        {/* Ô chọn ảnh dùng chung cho mọi bước. `capture` mở thẳng máy ảnh sau trên điện thoại. */}
        <input ref={oChon} type="file" accept="image/*" multiple className="hidden" aria-label={dich('ui1.quet.chonAnhAria')} onChange={(e) => void chonTep(e.target.files)} />
        <input ref={oChup} type="file" accept="image/*" capture="environment" className="hidden" aria-label={dich('ui1.quet.chupDtAria')} onChange={(e) => void chonTep(e.target.files)} />

        {buoc === 'chup' && (
          <div className="space-y-3">
            <div className="relative flex aspect-[3/4] max-h-[60vh] w-full items-center justify-center overflow-hidden rounded-xl bg-black sm:aspect-[4/3]">
              <video ref={video} playsInline muted className={`h-full w-full object-contain ${camSan ? '' : 'hidden'}`} />
              {!camSan && !loiCam && <Loader2 className="animate-spin text-white/70" aria-label={dich('ui1.quet.dangMoCam')} />}
              {loiCam && <p role="alert" className="max-w-sm px-6 text-center text-sm text-white">{dich(`ui1.quet.loi_${loiCam}`)}</p>}
              {dangNhan && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-white" role="status">
                  <Loader2 size={16} className="mr-2 animate-spin" /> {dich('ui1.quet.dangTimMep')}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {camSan && (
                <button type="button" onClick={chup} disabled={dangNhan} className={nutChinh}>
                  <Camera size={16} /> {dich('ui1.quet.chupTrang')}
                </button>
              )}
              {loiCam && (
                <button type="button" onClick={() => oChup.current?.click()} disabled={dangNhan} className={nutChinh}>
                  <Camera size={16} /> {dich('ui1.quet.chupMayAnh')}
                </button>
              )}
              <button type="button" onClick={() => oChon.current?.click()} disabled={dangNhan} className={nutPhu}>
                <ImagePlus size={16} /> {dich('ui1.quet.chonAnh')}
              </button>
              {loiCam && loiCam !== 'khong_ho_tro' && (
                <button type="button" onClick={() => void batMayAnh()} className={nutPhu}>{dich('ui1.quet.moLaiCam')}</button>
              )}
              {trang.length > 0 && (
                <button type="button" onClick={() => setBuoc('ds')} className={nutPhu}>{dich('ui1.quet.xemDaQuet', { n: trang.length })}</button>
              )}
            </div>
          </div>
        )}

        {buoc === 'chinh' && tc && (
          <div className="space-y-3">
            <KhungChinhGoc url={tc.nguonUrl} rong={tc.rong} cao={tc.cao} goc={tc.goc} onDoi={doiGoc} />
            <div className="flex flex-wrap justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => doiGoc(khungMacDinh(tc.rong, tc.cao, 0))} className={nutPhu}>{dich('ui1.quet.layCaAnh')}</button>
                <button type="button" className={nutPhu} onClick={() => void timLaiGoc(tc).then((r) => {
                  doiGoc(r.goc);
                  if (!r.timThay) toast.info(dich('ui1.quet.vanChuaThay'));
                })}>{dich('ui1.quet.tuTimLai')}</button>
              </div>
              <button type="button" onClick={xongChinh} className={nutChinh}><Check size={16} /> {dich('ui1.quet.xongTrang')}</button>
            </div>
          </div>
        )}

        {buoc === 'ds' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={dich('ui1.quet.cheDoAria')}>
              {CHE_DO.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={cheDo === c} onClick={() => doiCheDo(c)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${cheDo === c ? 'border-foreground bg-foreground text-background' : 'border-border text-foreground hover:bg-accent'}`}>
                  {dich(`ui1.quet.cd_${c}`)}
                </button>
              ))}
            </div>
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label={dich('ui1.quet.cacTrangAria')}>
              {trang.map((t, i) => (
                <li key={t.id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
                  <div className="relative flex aspect-[3/4] items-center justify-center bg-accent">
                    {t.ketQuaUrl && <img src={t.ketQuaUrl} alt={dich('ui1.quet.trangN', { n: i + 1 })} className="h-full w-full object-contain" />}
                    {(t.dangDung || !t.ketQuaUrl) && <Loader2 className="absolute animate-spin text-muted-foreground" aria-label={dich('ui1.quet.dangXuLy')} />}
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-background/90 px-1.5 text-xs font-medium tabular-nums text-foreground">{i + 1}</span>
                  </div>
                  <div className="flex justify-between p-1">
                    <button type="button" className={nutNho} disabled={i === 0} onClick={() => doiCho(i, i - 1)} aria-label={dich('ui1.quet.lenTruoc', { n: i + 1 })}><ArrowLeft size={15} /></button>
                    <button type="button" className={nutNho} onClick={() => xoayTrang(t.id)} aria-label={dich('ui1.quet.xoay', { n: i + 1 })}><RotateCw size={15} /></button>
                    <button type="button" className={nutNho} onClick={() => { setDangChinh(i); setBuoc('chinh'); }} aria-label={dich('ui1.quet.chinhGoc', { n: i + 1 })}><Crop size={15} /></button>
                    <button type="button" className={nutNho} onClick={() => xoaTrang(t.id)} aria-label={dich('ui1.quet.xoa', { n: i + 1 })}><Trash2 size={15} /></button>
                    <button type="button" className={nutNho} disabled={i === trang.length - 1} onClick={() => doiCho(i, i + 1)} aria-label={dich('ui1.quet.raSau', { n: i + 1 })}><ArrowRight size={15} /></button>
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap justify-between gap-2">
              <button type="button" onClick={() => setBuoc('chup')} className={nutPhu}><Camera size={16} /> {dich('ui1.quet.themTrang')}</button>
              <div className="flex flex-wrap gap-2">
                {onDungAnh && (
                  <button type="button" onClick={() => void dungAnh()} disabled={!trang[0]?.ketQua || trang[0].dangDung} className={nutPhu}>
                    <Send size={16} /> {nhanDungAnh ?? dich('ui1.quet.guiDoc')}
                  </button>
                )}
                <button type="button" onClick={() => void xuatPdf()} disabled={!trang.length || dangBan || dangXuat} className={nutChinh}>
                  {dangXuat ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} {dich('ui1.quet.taiPdf')}
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Bốn tay kéo trên ảnh. SVG có viewBox = kích thước ảnh nguồn, nên toạ độ tay kéo là toạ độ ảnh
 * thật; đổi từ điểm chạm màn hình bằng `getScreenCTM().inverse()` — đúng cả khi ảnh bị co,
 * có viền đen hai bên. `touch-action: none` để kéo góc không cuộn cả hộp thoại.
 */
export function KhungChinhGoc({ url, rong, cao, goc, onDoi }: { url: string; rong: number; cao: number; goc: BonGoc; onDoi: (g: BonGoc) => void }) {
  const { t: dich } = useTranslation();
  const svg = useRef<SVGSVGElement>(null);
  const dangKeo = useRef<number>(-1);
  const r = Math.max(rong, cao) * 0.022;
  const TEN = ['tt', 'tp', 'dp', 'dt'];

  const doi = (i: number, x: number, y: number) => {
    const g = goc.map((p) => ({ ...p })) as BonGoc;
    g[i] = { x: Math.min(rong, Math.max(0, x)), y: Math.min(cao, Math.max(0, y)) };
    onDoi(g);
  };

  const diemAnh = (e: SuKienTro) => {
    const s = svg.current;
    const m = s?.getScreenCTM();
    if (!s || !m) return null;
    const p = s.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    return p.matrixTransform(m.inverse());
  };

  const phim = (i: number) => (e: KeyboardEvent) => {
    const buoc = Math.max(rong, cao) * (e.shiftKey ? 0.02 : 0.005);
    const d = { ArrowLeft: [-buoc, 0], ArrowRight: [buoc, 0], ArrowUp: [0, -buoc], ArrowDown: [0, buoc] }[e.key];
    if (!d) return;
    e.preventDefault();
    doi(i, goc[i].x + d[0], goc[i].y + d[1]);
  };

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${rong} ${cao}`}
      preserveAspectRatio="xMidYMid meet"
      className="max-h-[62vh] w-full touch-none select-none rounded-xl bg-black"
      onPointerMove={(e) => {
        if (dangKeo.current < 0) return;
        const p = diemAnh(e);
        if (p) doi(dangKeo.current, p.x, p.y);
      }}
      onPointerUp={() => { dangKeo.current = -1; }}
      onPointerCancel={() => { dangKeo.current = -1; }}
      role="group"
      aria-label={dich('ui1.quet.khungAria')}
    >
      <image href={url} x={0} y={0} width={rong} height={cao} />
      {/* Làm tối phần ngoài tờ giấy để thấy rõ vùng sẽ giữ lại. */}
      <path
        d={`M0 0H${rong}V${cao}H0Z M${goc.map((p) => `${p.x} ${p.y}`).join(' L')}Z`}
        fill="rgba(0,0,0,0.45)"
        fillRule="evenodd"
      />
      <polygon points={goc.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="hsl(var(--primary))" strokeWidth={r * 0.3} />
      {goc.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x} cy={p.y} r={r * 2.4} fill="transparent"
            className="cursor-grab"
            tabIndex={0}
            role="slider"
            aria-label={dich(`ui1.quet.goc_${TEN[i]}`)}
            aria-valuetext={`${Math.round(p.x)}, ${Math.round(p.y)}`}
            onKeyDown={phim(i)}
            onPointerDown={(e) => {
              e.preventDefault();
              dangKeo.current = i;
              svg.current?.setPointerCapture?.(e.pointerId);
            }}
          />
          <circle cx={p.x} cy={p.y} r={r} fill="hsl(var(--primary) / 0.25)" stroke="white" strokeWidth={r * 0.25} pointerEvents="none" />
        </g>
      ))}
    </svg>
  );
}
