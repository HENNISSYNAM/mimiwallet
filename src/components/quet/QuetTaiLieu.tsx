import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as SuKienTro } from 'react';
import { ArrowLeft, ArrowRight, Camera, Check, Crop, FileDown, ImagePlus, Loader2, RotateCw, ScanLine, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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

const CAU_LOI: Record<LoiMayAnh, string> = {
  bi_tu_choi: 'MIMI chưa được phép dùng máy ảnh. Bật quyền máy ảnh cho trang này trong cài đặt trình duyệt — hoặc chọn ảnh có sẵn bên dưới.',
  khong_co: 'Không tìm thấy máy ảnh trên thiết bị này. Chọn ảnh có sẵn, hoặc mở MIMI trên điện thoại để chụp.',
  khong_ho_tro: 'Trình duyệt không cho mở máy ảnh ở đây. Chọn ảnh có sẵn, hoặc chụp bằng máy ảnh điện thoại.',
  loi: 'Chưa mở được máy ảnh (có thể ứng dụng khác đang dùng). Chọn ảnh có sẵn hoặc thử lại.',
};

/** Đổi lỗi getUserMedia thành lý do người dùng hiểu được. */
export function loiMayAnh(e: unknown): LoiMayAnh {
  const ten = (e as { name?: string } | null)?.name ?? '';
  if (ten === 'NotAllowedError' || ten === 'PermissionDeniedError' || ten === 'SecurityError') return 'bi_tu_choi';
  if (ten === 'NotFoundError' || ten === 'DevicesNotFoundError' || ten === 'OverconstrainedError') return 'khong_co';
  return 'loi';
}

const CHE_DO: { khoa: CheDoQuet; nhan: string }[] = [
  { khoa: 'tai_lieu', nhan: 'Tài liệu' },
  { khoa: 'mau', nhan: 'Màu' },
  { khoa: 'goc', nhan: 'Ảnh gốc' },
];

const kichCo = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
let dem = 0;
const idMoi = () => `t${Date.now().toString(36)}${(dem++).toString(36)}`;

export function QuetTaiLieu({ mo, onDong, onDungAnh, nhanDungAnh = 'Gửi MIMI đọc', cheDoMacDinh = 'tai_lieu', tenTep = 'quet-mimi' }: {
  mo: boolean;
  onDong: () => void;
  /** Có thì hiện nút đưa trang đầu (data URL JPEG) vào luồng sẵn có — đọc chứng từ, đính kèm. */
  onDungAnh?: (anh: string) => void;
  nhanDungAnh?: string;
  cheDoMacDinh?: CheDoQuet;
  tenTep?: string;
}) {
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
      toast.error(e instanceof Error ? e.message : 'Chưa dựng được trang này.');
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
      if (!a.timThay) toast.info('Chưa thấy rõ mép tờ giấy — kéo bốn góc tròn vào đúng bốn góc giấy.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không đọc được ảnh này.');
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
        toast.error(`Không đọc được ảnh ${f.name}.`);
      }
    }
    setDangNhan(false);
    setBuoc('ds');
    if (lech) toast.info(`${lech} trang chưa thấy rõ mép giấy — bấm "Chỉnh góc" ở trang đó.`);
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
      toast.success(`Đã tải ${ten} — ${trang.length} trang, ${kichCo(pdf.length)}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chưa tạo được PDF.');
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
      toast.error(e instanceof Error ? e.message : 'Không đọc được trang.');
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
          <DialogTitle className="flex items-center gap-2"><ScanLine size={18} aria-hidden /> Quét giấy tờ</DialogTitle>
          <DialogDescription>
            {buoc === 'chup' && 'Đặt tờ giấy trên mặt bàn tối màu, đủ sáng, chụp thẳng từ trên xuống. Ảnh xử lý ngay trên máy bạn.'}
            {buoc === 'chinh' && 'Kéo bốn góc tròn vào đúng bốn góc tờ giấy. MIMI sẽ nắn phẳng phần bên trong.'}
            {buoc === 'ds' && `${trang.length} trang. Sắp lại, xoay, hoặc thêm trang rồi tải một tệp PDF khổ A4.`}
          </DialogDescription>
        </DialogHeader>

        {/* Ô chọn ảnh dùng chung cho mọi bước. `capture` mở thẳng máy ảnh sau trên điện thoại. */}
        <input ref={oChon} type="file" accept="image/*" multiple className="hidden" aria-label="Chọn ảnh giấy tờ" onChange={(e) => void chonTep(e.target.files)} />
        <input ref={oChup} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Chụp bằng máy ảnh điện thoại" onChange={(e) => void chonTep(e.target.files)} />

        {buoc === 'chup' && (
          <div className="space-y-3">
            <div className="relative flex aspect-[3/4] max-h-[60vh] w-full items-center justify-center overflow-hidden rounded-xl bg-black sm:aspect-[4/3]">
              <video ref={video} playsInline muted className={`h-full w-full object-contain ${camSan ? '' : 'hidden'}`} />
              {!camSan && !loiCam && <Loader2 className="animate-spin text-white/70" aria-label="Đang mở máy ảnh" />}
              {loiCam && <p role="alert" className="max-w-sm px-6 text-center text-sm text-white">{CAU_LOI[loiCam]}</p>}
              {dangNhan && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-white" role="status">
                  <Loader2 size={16} className="mr-2 animate-spin" /> Đang tìm mép tờ giấy…
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {camSan && (
                <button type="button" onClick={chup} disabled={dangNhan} className={nutChinh}>
                  <Camera size={16} /> Chụp trang
                </button>
              )}
              {loiCam && (
                <button type="button" onClick={() => oChup.current?.click()} disabled={dangNhan} className={nutChinh}>
                  <Camera size={16} /> Chụp bằng máy ảnh
                </button>
              )}
              <button type="button" onClick={() => oChon.current?.click()} disabled={dangNhan} className={nutPhu}>
                <ImagePlus size={16} /> Chọn ảnh có sẵn
              </button>
              {loiCam && loiCam !== 'khong_ho_tro' && (
                <button type="button" onClick={() => void batMayAnh()} className={nutPhu}>Thử mở lại máy ảnh</button>
              )}
              {trang.length > 0 && (
                <button type="button" onClick={() => setBuoc('ds')} className={nutPhu}>Xem {trang.length} trang đã quét</button>
              )}
            </div>
          </div>
        )}

        {buoc === 'chinh' && tc && (
          <div className="space-y-3">
            <KhungChinhGoc url={tc.nguonUrl} rong={tc.rong} cao={tc.cao} goc={tc.goc} onDoi={doiGoc} />
            <div className="flex flex-wrap justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => doiGoc(khungMacDinh(tc.rong, tc.cao, 0))} className={nutPhu}>Lấy cả ảnh</button>
                <button type="button" className={nutPhu} onClick={() => void timLaiGoc(tc).then((r) => {
                  doiGoc(r.goc);
                  if (!r.timThay) toast.info('Vẫn chưa thấy rõ mép giấy — kéo góc bằng tay nhé.');
                })}>Tự tìm lại</button>
              </div>
              <button type="button" onClick={xongChinh} className={nutChinh}><Check size={16} /> Xong trang này</button>
            </div>
          </div>
        )}

        {buoc === 'ds' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Chế độ quét">
              {CHE_DO.map((c) => (
                <button key={c.khoa} type="button" role="radio" aria-checked={cheDo === c.khoa} onClick={() => doiCheDo(c.khoa)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${cheDo === c.khoa ? 'border-foreground bg-foreground text-background' : 'border-border text-foreground hover:bg-accent'}`}>
                  {c.nhan}
                </button>
              ))}
            </div>
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Các trang đã quét">
              {trang.map((t, i) => (
                <li key={t.id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
                  <div className="relative flex aspect-[3/4] items-center justify-center bg-accent">
                    {t.ketQuaUrl && <img src={t.ketQuaUrl} alt={`Trang ${i + 1}`} className="h-full w-full object-contain" />}
                    {(t.dangDung || !t.ketQuaUrl) && <Loader2 className="absolute animate-spin text-muted-foreground" aria-label="Đang xử lý trang" />}
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-background/90 px-1.5 text-xs font-medium tabular-nums text-foreground">{i + 1}</span>
                  </div>
                  <div className="flex justify-between p-1">
                    <button type="button" className={nutNho} disabled={i === 0} onClick={() => doiCho(i, i - 1)} aria-label={`Đưa trang ${i + 1} lên trước`}><ArrowLeft size={15} /></button>
                    <button type="button" className={nutNho} onClick={() => xoayTrang(t.id)} aria-label={`Xoay trang ${i + 1}`}><RotateCw size={15} /></button>
                    <button type="button" className={nutNho} onClick={() => { setDangChinh(i); setBuoc('chinh'); }} aria-label={`Chỉnh góc trang ${i + 1}`}><Crop size={15} /></button>
                    <button type="button" className={nutNho} onClick={() => xoaTrang(t.id)} aria-label={`Xoá trang ${i + 1}`}><Trash2 size={15} /></button>
                    <button type="button" className={nutNho} disabled={i === trang.length - 1} onClick={() => doiCho(i, i + 1)} aria-label={`Đưa trang ${i + 1} ra sau`}><ArrowRight size={15} /></button>
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap justify-between gap-2">
              <button type="button" onClick={() => setBuoc('chup')} className={nutPhu}><Camera size={16} /> Thêm trang</button>
              <div className="flex flex-wrap gap-2">
                {onDungAnh && (
                  <button type="button" onClick={() => void dungAnh()} disabled={!trang[0]?.ketQua || trang[0].dangDung} className={nutPhu}>
                    <Send size={16} /> {nhanDungAnh}
                  </button>
                )}
                <button type="button" onClick={() => void xuatPdf()} disabled={!trang.length || dangBan || dangXuat} className={nutChinh}>
                  {dangXuat ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} Tải PDF
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
  const svg = useRef<SVGSVGElement>(null);
  const dangKeo = useRef<number>(-1);
  const r = Math.max(rong, cao) * 0.022;
  const TEN = ['trên trái', 'trên phải', 'dưới phải', 'dưới trái'];

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
      aria-label="Khung chỉnh bốn góc tờ giấy"
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
            aria-label={`Góc ${TEN[i]}`}
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
