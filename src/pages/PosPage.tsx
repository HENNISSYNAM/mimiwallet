/**
 * Màn BÁN TẠI QUẦY (/pos) — chạy trên máy POS Android (Sunmi, PAX…, 5–8 inch, Chrome/WebView) và điện thoại.
 *
 * Nguyên tắc màn hình:
 *   - toàn màn hình, không thanh bên; nút ≥ 48px (đa số 64px+), không có gì chỉ hiện khi rê chuột;
 *   - ngang (1280×720): trái là số tiền + món nhanh, phải là bàn phím; dọc (720×1280): xếp chồng;
 *   - mất mạng vẫn bán được TIỀN MẶT (xếp hàng trên máy, `lib/pos/hangDoi.ts`); chuyển khoản cần mạng và
 *     nói thẳng như vậy.
 *
 * Mọi việc ghi đều qua edge function `pos` (kiểm vai trò ở máy chủ). Ẩn nút ở đây chỉ là cho gọn mắt.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { taoChuoiVietQr } from '@/lib/vietqr';
import { bamPhim, dinhDangDong, soTienTuChuoi, type PhimSo } from '@/lib/pos/banPhim';
import { dongBoHangDoi, docHangDoi, sinhClientId, themVaoHangDoi, type BanCho } from '@/lib/pos/hangDoi';
import { goiPos, type BanPos, type CauHinhPos, type SanPhamPos, type TaiKhoanNhan, type TongHop } from '@/lib/pos/goiPos';
import { LoiGoiHam } from '@/lib/loiGoiHam';
import { idCongTyDangDung } from '@/lib/congTyDangDung';
import { noi } from '@/lib/loa';
import { cauNoi } from '../../supabase/functions/_shared/soat-bill/cau-noi.ts';

type Buoc = 'nhap' | 'chon' | 'qr' | 'xong';
/** Lần bán vừa xong, để hiện màn thành công và in biên lai — kể cả lần còn nằm trong hàng đợi. */
interface BanXong { ban: Pick<BanPos, 'amount' | 'method' | 'reference' | 'note' | 'items' | 'sold_at'>; ngoaiTuyen: boolean }

const CHO_QUA_PHUT = 3;
const HOI_MOI_MS = 3000;

const dong = (n: number) => `${dinhDangDong(n)} ₫`;

function NutPhim({ nhan, onClick, rong, label }: { nhan: string; onClick: () => void; rong?: boolean; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label ?? nhan}
      onClick={onClick}
      className={`min-h-[64px] rounded-2xl bg-muted text-3xl font-semibold text-foreground active:scale-95 active:bg-muted-foreground/20 transition select-none touch-manipulation ${rong ? 'col-span-2' : ''}`}
    >
      {nhan}
    </button>
  );
}

export default function PosPage() {
  const { t } = useTranslation();
  const [cauHinh, setCauHinh] = useState<CauHinhPos | null>(null);
  const [loiMo, setLoiMo] = useState<string | null>(null);
  const [soChuoi, setSoChuoi] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [gio, setGio] = useState<{ ten: string; so_luong: number; don_gia: number }[]>([]);
  const [buoc, setBuoc] = useState<Buoc>('nhap');
  const [dangGui, setDangGui] = useState(false);
  const [thongBao, setThongBao] = useState<string | null>(null);
  const [coMang, setCoMang] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  const [soCho, setSoCho] = useState(() => docHangDoi().length);
  const [banCho, setBanCho] = useState<BanPos | null>(null);
  const [tkNhan, setTkNhan] = useState<TaiKhoanNhan | null>(null);
  const [batDauCho, setBatDauCho] = useState(0);
  const [lauQua, setLauQua] = useState(false);
  const [xong, setXong] = useState<BanXong | null>(null);
  const [suaMon, setSuaMon] = useState<SanPhamPos[] | null>(null);
  const [xemBan, setXemBan] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const soTien = soTienTuChuoi(soChuoi);

  const tai = useCallback(async () => {
    setLoiMo(null);
    try {
      setCauHinh(await goiPos<CauHinhPos>('cau_hinh'));
    } catch (e) {
      setLoiMo(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const lamMoiTongHop = useCallback(async () => {
    try {
      const r = await goiPos<{ tong_hop: TongHop; ban: BanPos[]; ngay: string }>('tong_hop');
      if (!r?.tong_hop) return;
      setCauHinh((c) => (c ? { ...c, tong_hop: r.tong_hop, ban: r.ban ?? [], ngay: r.ngay } : c));
    } catch { /* tổng hợp là phụ: lỗi thì giữ số cũ */ }
  }, []);

  /** Gửi hàng đợi ngoại tuyến. An toàn khi gọi nhiều lần: máy chủ khoá theo client_id. */
  const dongBo = useCallback(async () => {
    if (!docHangDoi().length) return;
    const kq = await dongBoHangDoi(async (b: BanCho) => {
      try {
        const { company_id, ...du } = b;
        await goiPos('tao_ban', company_id ? { ...du, company_id } : du);
        return { ok: true as const };
      } catch (e) {
        return { ok: false as const, status: e instanceof LoiGoiHam ? e.status : null, cau: e instanceof Error ? e.message : String(e) };
      }
    });
    setSoCho(kq.con_lai);
    if (kq.da_gui) { setThongBao(t('pos.daGuiHangDoi', { so: kq.da_gui })); void lamMoiTongHop(); }
    if (kq.bi_tu_choi.length) setThongBao(t('pos.tuChoiHangDoi', { cau: kq.bi_tu_choi[0].cau }));
  }, [t, lamMoiTongHop]);

  useEffect(() => { void tai(); }, [tai]);

  useEffect(() => {
    const len = () => { setCoMang(true); void dongBo(); };
    const xuong = () => setCoMang(false);
    window.addEventListener('online', len);
    window.addEventListener('offline', xuong);
    const hen = window.setInterval(() => { if (navigator.onLine !== false) void dongBo(); }, 30_000);
    void dongBo();
    return () => { window.removeEventListener('online', len); window.removeEventListener('offline', xuong); window.clearInterval(hen); };
  }, [dongBo]);

  // Vẽ VietQR: chuỗi dựng tại máy (`lib/vietqr.ts`, có test CRC) từ tài khoản và mã máy chủ trả về.
  useEffect(() => {
    if (buoc !== 'qr' || !banCho || !tkNhan || !canvasRef.current) return;
    try {
      const chuoi = taoChuoiVietQr({ bankBin: tkNhan.bin, accountNumber: tkNhan.account_number, amount: banCho.amount, addInfo: banCho.reference });
      void QRCode.toCanvas(canvasRef.current, chuoi, { width: 280, margin: 1 }).catch(() => setThongBao(t('pos.loiMoQuay')));
    } catch (e) {
      setThongBao(e instanceof Error ? e.message : String(e));
    }
  }, [buoc, banCho, tkNhan, t]);

  const xongBan = useCallback((b: BanXong) => {
    setXong(b);
    setBuoc('xong');
    setSoChuoi('');
    setGhiChu('');
    setGio([]);
    setBanCho(null);
    setLauQua(false);
    void lamMoiTongHop();
  }, [lamMoiTongHop]);

  // Hỏi máy chủ lần bán chuyển khoản đã có tiền về chưa.
  useEffect(() => {
    if (buoc !== 'qr' || !banCho) return;
    const hen = window.setInterval(async () => {
      if (Date.now() - batDauCho > CHO_QUA_PHUT * 60_000) setLauQua(true);
      try {
        const r = await goiPos<{ ban: BanPos }>('trang_thai', { id: banCho.id });
        if (r.ban?.status === 'paid') {
          // Quầy Tin: chỉ đọc "Đã nhận" khi tiền NGÂN HÀNG thật đóng đơn — xác nhận tay không có bằng chứng tiền về.
          if (r.ban.paid_basis === 'bank_match') noi(cauNoi('khop_ma', { so_tien: r.ban.amount }));
          xongBan({ ban: r.ban, ngoaiTuyen: false });
        } else if (r.ban?.status === 'cancelled') { setBuoc('nhap'); setBanCho(null); setThongBao(t('pos.daHuy')); }
      } catch { /* mạng chập chờn: hỏi lại lần sau */ }
    }, HOI_MOI_MS);
    return () => window.clearInterval(hen);
  }, [buoc, banCho, batDauCho, xongBan, t]);

  const themMon = (m: SanPhamPos) => {
    setGio((g) => {
      const co = g.find((x) => x.ten === m.ten);
      const moi = co ? g.map((x) => (x.ten === m.ten ? { ...x, so_luong: x.so_luong + 1 } : x)) : [...g, { ten: m.ten, so_luong: 1, don_gia: m.gia }];
      setSoChuoi(String(moi.reduce((s, x) => s + x.so_luong * x.don_gia, 0)));
      return moi;
    });
  };

  const bam = (p: PhimSo) => {
    // Gõ tay thì bỏ danh sách món: số trên màn hình là số người bán quyết.
    if (gio.length) setGio([]);
    setSoChuoi((s) => bamPhim(s, p));
  };

  const thuTienMat = async () => {
    const yc: BanCho = {
      client_id: sinhClientId(), so_tien: soTien, phuong_thuc: 'cash', ghi_chu: ghiChu.trim() || null,
      dong_hang: gio, ban_luc: new Date().toISOString(), company_id: null,
    };
    const choNgoaiTuyen = async () => {
      yc.company_id = await idCongTyDangDung().catch(() => null);
      if (!themVaoHangDoi(yc)) { setThongBao(t('pos.khongLuuDuoc')); return; }
      setSoCho(docHangDoi().length);
      xongBan({ ban: { amount: soTien, method: 'cash', reference: '', note: yc.ghi_chu, items: gio, sold_at: yc.ban_luc }, ngoaiTuyen: true });
    };
    if (!coMang) return choNgoaiTuyen();
    setDangGui(true);
    try {
      const { company_id: _bo, ...du } = yc;
      const r = await goiPos<{ ban: BanPos }>('tao_ban', du);
      xongBan({ ban: r.ban, ngoaiTuyen: false });
    } catch (e) {
      if (e instanceof LoiGoiHam && (e.status === 0 || e.status >= 500)) await choNgoaiTuyen();
      else setThongBao(e instanceof Error ? e.message : String(e));
    } finally {
      setDangGui(false);
    }
  };

  const thuChuyenKhoan = async () => {
    setDangGui(true);
    try {
      const r = await goiPos<{ ban: BanPos; tai_khoan_nhan?: TaiKhoanNhan }>('tao_ban', {
        client_id: sinhClientId(), so_tien: soTien, phuong_thuc: 'transfer', ghi_chu: ghiChu.trim() || null, dong_hang: gio, ban_luc: new Date().toISOString(),
      });
      setBanCho(r.ban);
      setTkNhan(r.tai_khoan_nhan ?? cauHinh?.tai_khoan_nhan ?? null);
      setBatDauCho(Date.now());
      setLauQua(false);
      setBuoc('qr');
    } catch (e) {
      setThongBao(e instanceof Error ? e.message : String(e));
    } finally {
      setDangGui(false);
    }
  };

  const xacNhanTay = async () => {
    if (!banCho) return;
    try {
      const r = await goiPos<{ ban: BanPos }>('xac_nhan_tay', { id: banCho.id });
      if (r.ban?.status === 'paid') xongBan({ ban: r.ban, ngoaiTuyen: false });
    } catch (e) { setThongBao(e instanceof Error ? e.message : String(e)); }
  };

  const huy = async () => {
    if (!banCho) return;
    try {
      await goiPos('huy', { id: banCho.id });
      setBanCho(null);
      setBuoc('nhap');
      setThongBao(t('pos.daHuy'));
      void lamMoiTongHop();
    } catch (e) { setThongBao(e instanceof Error ? e.message : String(e)); }
  };

  const luuMon = async () => {
    if (!suaMon) return;
    try {
      const r = await goiPos<{ san_pham: SanPhamPos[] }>('luu_san_pham', { san_pham: suaMon.filter((m) => m.ten.trim()) });
      setCauHinh((c) => (c ? { ...c, san_pham: r.san_pham } : c));
      setSuaMon(null);
    } catch (e) { setThongBao(e instanceof Error ? e.message : String(e)); }
  };

  if (!cauHinh && !loiMo) {
    return <div className="flex h-[100dvh] items-center justify-center bg-background text-2xl text-muted-foreground">{t('pos.dangTai')}</div>;
  }
  if (loiMo && !cauHinh) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <p className="text-2xl font-semibold">{t('pos.loiMoQuay')}</p>
        <p className="max-w-lg text-lg text-muted-foreground">{loiMo}</p>
        <div className="flex gap-3">
          <button type="button" onClick={() => void tai()} className="min-h-[56px] rounded-xl bg-primary px-6 text-lg font-semibold text-primary-foreground">{t('pos.thuLai')}</button>
          <Link to="/dashboard" className="flex min-h-[56px] items-center rounded-xl border px-6 text-lg">{t('pos.veMimi')}</Link>
        </div>
      </div>
    );
  }
  const ch = cauHinh!;
  const th = ch.tong_hop;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      {/* In 58mm: chỉ biên lai hiện khi in, khổ giấy 58mm. Máy in nhiệt Sunmi/PAX in được qua hộp in của trình duyệt. */}
      <style>{`
        @media print {
          @page { size: 58mm auto; margin: 0; }
          body * { visibility: hidden !important; }
          #bien-lai-58, #bien-lai-58 * { visibility: visible !important; }
          #bien-lai-58 { position: absolute; left: 0; top: 0; display: block !important; }
        }
      `}</style>

      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-2">
        <Link to="/dashboard" className="flex min-h-[48px] items-center rounded-lg px-2 text-base text-muted-foreground">← {t('pos.veMimi')}</Link>
        <h1 className="text-xl font-bold">{ch.cong_ty.ten ?? t('pos.tieuDe')}</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${coMang ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`} data-testid="trang-thai-mang">
          {coMang ? t('pos.coMang') : t('pos.matMang')}
        </span>
        {soCho > 0 && <span className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-900">{t('pos.choGui', { so: soCho })}</span>}
        <button type="button" onClick={() => setXemBan((x) => !x)} className="ml-auto flex min-h-[48px] flex-wrap items-center gap-x-3 rounded-lg px-3 text-left" data-testid="tong-hop-ngay">
          <span className="font-semibold">{t('pos.homNay')}: {t('pos.soLan', { so: th.so_lan })} · {dong(th.tong)}</span>
          <span className="text-sm text-muted-foreground">{t('pos.tienMat')} {dong(th.tien_mat.tong)} · {t('pos.chuyenKhoan')} {dong(th.chuyen_khoan.tong)}{th.dang_cho ? ` · ${t('pos.dangChoTien', { so: th.dang_cho })}` : ''}</span>
        </button>
      </header>

      {thongBao && (
        <div role="status" className="flex shrink-0 items-center gap-3 bg-amber-50 px-4 py-2 text-base text-amber-950">
          <span className="flex-1">{thongBao}</span>
          <button type="button" onClick={() => setThongBao(null)} className="min-h-[48px] min-w-[48px] rounded-lg text-xl" aria-label={t('pos.dong')}>×</button>
        </div>
      )}

      {xemBan && (
        <div className="max-h-[40vh] shrink-0 overflow-y-auto border-b px-4 py-2">
          <p className="mb-1 font-semibold">{t('pos.xemBan')}</p>
          {ch.ban.length === 0 ? <p className="text-muted-foreground">{t('pos.chuaBan')}</p> : (
            <ul className="divide-y">
              {ch.ban.map((b) => (
                <li key={b.id} className="flex items-center gap-3 py-2 text-base">
                  <span className="w-16 text-muted-foreground">{new Date(b.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="flex-1">{b.method === 'cash' ? t('pos.tienMat') : t('pos.chuyenKhoan')} · {b.reference}</span>
                  <span className="font-semibold">{dong(b.amount)}</span>
                  <span className="w-20 text-right text-sm text-muted-foreground">{t(`pos.trangThai.${b.status}`)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto">
        {buoc === 'nhap' && (
          <div className="flex h-full flex-col gap-4 p-4 landscape:flex-row">
            <section className="flex min-h-0 flex-col gap-3 landscape:w-1/2">
              <div className="rounded-2xl bg-muted/50 px-4 py-3">
                <p className="text-base text-muted-foreground">{t('pos.soTien')}</p>
                <p className="break-all text-5xl font-bold tabular-nums" data-testid="so-tien">{soTien ? dong(soTien) : <span className="text-muted-foreground">0 ₫</span>}</p>
              </div>
              <label className="block">
                <span className="text-base text-muted-foreground">{t('pos.ghiChu')}</span>
                <input value={ghiChu} maxLength={200} onChange={(e) => setGhiChu(e.target.value)} placeholder={t('pos.ghiChuViDu')} className="mt-1 h-14 w-full rounded-xl border bg-background px-4 text-lg" />
              </label>
              <div className="flex items-center justify-between">
                <p className="font-semibold">{t('pos.monNhanh')}</p>
                {ch.quyen.sua_san_pham && (
                  <button type="button" onClick={() => setSuaMon(ch.san_pham.length ? ch.san_pham.map((m) => ({ ten: m.ten, gia: m.gia })) : [{ ten: '', gia: 0 }])} className="min-h-[48px] rounded-lg px-3 text-base text-primary">{t('pos.suaMon')}</button>
                )}
              </div>
              {ch.san_pham.length === 0 ? (
                <p className="text-base text-muted-foreground">{t('pos.chuaCoMon')}</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                  {ch.san_pham.map((m) => {
                    const sl = gio.find((g) => g.ten === m.ten)?.so_luong;
                    return (
                      <button key={m.ten} type="button" onClick={() => themMon(m)} className="relative min-h-[64px] rounded-xl border bg-card px-3 py-2 text-left active:bg-muted">
                        <span className="block text-base font-medium leading-tight">{m.ten}</span>
                        <span className="block text-sm text-muted-foreground">{dong(m.gia)}</span>
                        {sl ? <span className="absolute right-2 top-2 rounded-full bg-primary px-2 text-sm font-bold text-primary-foreground">×{sl}</span> : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
            <section className="flex flex-col gap-3 landscape:w-1/2">
              <div className="grid flex-1 grid-cols-3 gap-2" role="group" aria-label={t('pos.nhapSoTien')}>
                {(['1', '2', '3', '4', '5', '6', '7', '8', '9'] as PhimSo[]).map((p) => <NutPhim key={p} nhan={p} onClick={() => bam(p)} />)}
                <NutPhim nhan="000" onClick={() => bam('000')} />
                <NutPhim nhan="0" onClick={() => bam('0')} />
                <NutPhim nhan="⌫" label={t('pos.xoa')} onClick={() => bam('xoa')} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setGio([]); setSoChuoi(''); }} className="min-h-[72px] rounded-2xl border px-5 text-lg">{t('pos.xoaHet')}</button>
                <button type="button" disabled={!soTien} onClick={() => setBuoc('chon')} className="min-h-[72px] flex-1 rounded-2xl bg-primary text-2xl font-bold text-primary-foreground disabled:opacity-40">
                  {t('pos.thuTien')}{soTien ? ` ${dong(soTien)}` : ''}
                </button>
              </div>
            </section>
          </div>
        )}

        {buoc === 'chon' && (
          <div className="flex h-full flex-col items-center justify-center gap-6 p-6">
            <p className="text-2xl">{t('pos.chonCach')}</p>
            <p className="text-5xl font-bold tabular-nums">{dong(soTien)}</p>
            <div className="grid w-full max-w-3xl gap-4 landscape:grid-cols-2">
              <button type="button" disabled={dangGui} onClick={() => void thuTienMat()} className="min-h-[120px] rounded-3xl bg-emerald-600 text-3xl font-bold text-white active:bg-emerald-700 disabled:opacity-50">
                💵 {t('pos.tienMat')}
              </button>
              <button type="button" disabled={dangGui || !coMang || !ch.tai_khoan_nhan} onClick={() => void thuChuyenKhoan()} className="min-h-[120px] rounded-3xl bg-sky-700 px-4 text-3xl font-bold text-white active:bg-sky-800 disabled:opacity-40">
                🏦 {t('pos.chuyenKhoan')}
                {(!coMang || !ch.tai_khoan_nhan) && <span className="mt-1 block text-base font-normal">{!coMang ? t('pos.canMang') : t('pos.chuaCoTaiKhoan')}</span>}
              </button>
            </div>
            <button type="button" onClick={() => setBuoc('nhap')} className="min-h-[56px] rounded-xl border px-8 text-lg">{t('pos.quayLai')}</button>
          </div>
        )}

        {buoc === 'qr' && banCho && (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-4 landscape:flex-row landscape:gap-10">
            <div className="flex flex-col items-center gap-2">
              <p className="text-xl">{t('pos.quetMa')}</p>
              <canvas ref={canvasRef} className="rounded-xl bg-white p-2" data-testid="ma-vietqr" />
            </div>
            <div className="flex max-w-md flex-col items-center gap-3 text-center landscape:items-start landscape:text-left">
              <p className="text-5xl font-bold tabular-nums">{dong(banCho.amount)}</p>
              {tkNhan && <p className="text-lg">{tkNhan.bank_name} · {tkNhan.account_number}{tkNhan.account_name ? ` · ${tkNhan.account_name}` : ''}</p>}
              <p className="text-lg">{t('pos.noiDungCk')}: <b className="font-mono text-2xl tracking-wider">{banCho.reference}</b></p>
              <p className="text-lg text-muted-foreground" aria-live="polite">{t('pos.dangCho')}</p>
              {tkNhan && !tkNhan.tu_dong_khop && <p className="text-base text-amber-800">{t('pos.khongTuThay')}</p>}
              {lauQua && <p className="text-base font-semibold text-amber-800">{t('pos.lauQua', { phut: CHO_QUA_PHUT })}</p>}
              <div className="flex flex-wrap gap-2">
                {ch.quyen.xac_nhan_tay ? (
                  <button type="button" onClick={() => void xacNhanTay()} className="min-h-[56px] rounded-xl bg-emerald-600 px-5 text-lg font-semibold text-white">{t('pos.daNhanTien')}</button>
                ) : (lauQua && <p className="text-sm text-muted-foreground">{t('pos.chiChuXacNhan')}</p>)}
                <button type="button" onClick={() => void huy()} className="min-h-[56px] rounded-xl border px-5 text-lg">{t('pos.huyBan')}</button>
                {lauQua && <button type="button" onClick={() => { setLauQua(false); setBatDauCho(Date.now()); }} className="min-h-[56px] rounded-xl border px-5 text-lg">{t('pos.choTiep')}</button>}
              </div>
            </div>
          </div>
        )}

        {buoc === 'xong' && xong && (
          <div className="flex h-full flex-col items-center justify-center gap-5 bg-emerald-50 p-6 text-center" data-testid="man-da-thu">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-600 text-6xl text-white">✓</div>
            <p className="text-4xl font-bold text-emerald-800">{t('pos.daThu')}</p>
            <p className="text-6xl font-bold tabular-nums">{dong(xong.ban.amount)}</p>
            <p className="text-xl">{xong.ban.method === 'cash' ? t('pos.tienMat') : t('pos.chuyenKhoan')}{xong.ban.reference ? ` · ${xong.ban.reference}` : ''}</p>
            <p className="text-lg text-muted-foreground">{xong.ngoaiTuyen ? t('pos.daLuuMay') : t('pos.vaoSo')}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => window.print()} className="min-h-[64px] rounded-2xl border bg-background px-6 text-xl">🖨 {t('pos.inBienLai')}</button>
              <button type="button" onClick={() => { setXong(null); setBuoc('nhap'); }} className="min-h-[64px] rounded-2xl bg-primary px-8 text-xl font-bold text-primary-foreground">{t('pos.banTiep')}</button>
            </div>
          </div>
        )}
      </main>

      {xong && (
        <div id="bien-lai-58" className="hidden" style={{ width: '58mm', padding: '2mm', fontFamily: 'monospace', fontSize: '11px', color: '#000', background: '#fff' }}>
          <div style={{ textAlign: 'center', fontWeight: 700 }}>{ch.cong_ty.ten ?? 'MIMI'}</div>
          <div style={{ textAlign: 'center' }}>{t('pos.bienLai')}</div>
          <div>{t('pos.ma')}: {xong.ban.reference || t('pos.choDongBo')}</div>
          <div>{t('pos.thoiGian')}: {new Date(xong.ban.sold_at).toLocaleString('vi-VN')}</div>
          <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />
          {xong.ban.items?.map((m) => (
            <div key={m.ten} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{m.so_luong}× {m.ten}</span><span>{dinhDangDong(m.so_luong * m.don_gia)}</span></div>
          ))}
          {xong.ban.note && <div>{xong.ban.note}</div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px dashed #000', marginTop: '2mm' }}><span>{t('pos.tong')}</span><span>{dong(xong.ban.amount)}</span></div>
          <div>{t('pos.hinhThuc')}: {xong.ban.method === 'cash' ? t('pos.tienMat') : t('pos.chuyenKhoan')}</div>
          <div style={{ textAlign: 'center', marginTop: '2mm' }}>{t('pos.camOn')}</div>
        </div>
      )}

      {suaMon && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 landscape:items-center" role="dialog" aria-label={t('pos.suaMon')}>
          <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-background p-4 landscape:rounded-3xl">
            <p className="mb-3 text-xl font-semibold">{t('pos.suaMon')}</p>
            {suaMon.map((m, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <input aria-label={t('pos.tenMon')} placeholder={t('pos.tenMon')} value={m.ten} maxLength={60} onChange={(e) => setSuaMon(suaMon.map((x, j) => (j === i ? { ...x, ten: e.target.value } : x)))} className="h-14 flex-1 rounded-xl border px-3 text-lg" />
                <input aria-label={t('pos.gia')} placeholder={t('pos.gia')} inputMode="numeric" value={m.gia || ''} onChange={(e) => setSuaMon(suaMon.map((x, j) => (j === i ? { ...x, gia: Number(e.target.value.replace(/\D/g, '')) || 0 } : x)))} className="h-14 w-36 rounded-xl border px-3 text-lg" />
                <button type="button" aria-label={t('pos.xoa')} onClick={() => setSuaMon(suaMon.filter((_, j) => j !== i))} className="h-14 w-14 rounded-xl border text-xl">×</button>
              </div>
            ))}
            <div className="mt-3 flex flex-wrap gap-2">
              {suaMon.length < 24 && <button type="button" onClick={() => setSuaMon([...suaMon, { ten: '', gia: 0 }])} className="min-h-[56px] rounded-xl border px-4 text-lg">+ {t('pos.themMon')}</button>}
              <button type="button" onClick={() => void luuMon()} className="min-h-[56px] rounded-xl bg-primary px-6 text-lg font-semibold text-primary-foreground">{t('pos.luuMon')}</button>
              <button type="button" onClick={() => setSuaMon(null)} className="min-h-[56px] rounded-xl px-4 text-lg">{t('pos.dong')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
