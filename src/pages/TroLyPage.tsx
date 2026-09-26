import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCongCuGhim } from '@/hooks/useCongCuGhim';
import { duongDanCongCu } from '@/lib/congCu';
import { IconCongCu } from '@/components/cong-cu/IconCongCu';
import { KhoCongCu } from '@/components/cong-cu/KhoCongCu';
import {
  AlertTriangle, ArrowDown, ArrowRight, ArrowUp, Check, ChevronDown, ChevronRight, FileText, LayoutGrid, Lightbulb, Loader2,
  Monitor, Pencil, Plus, Puzzle, RotateCcw, ScrollText, X,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HopTaiUngDung } from '@/components/layout/HopTaiUngDung';
import { toast } from 'sonner';
import { docCaiDat, laLenhPet, luuCaiDat, SU_KIEN_LENH_PET } from '@/lib/petMimi';
import { useTranslation } from 'react-i18next';
import { NenVongHat } from '@/components/tro-ly/NenVongHat';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { NutQuetChungTu } from '@/components/chung-tu/NutQuetChungTu';
import { DauKetNoi } from '@/components/tro-ly/DauKetNoi';
import { NutBangChung } from '@/components/tro-ly/NutBangChung';
import { dongBoSaoKe, goiTroLy } from '@/lib/goiTroLy';
import { goiTacTu } from '@/lib/goiTacTu';
import { canXacMinh, type DauHieu } from '@/lib/batThuong';
import HopXacMinh from '@/components/canh-bao/HopXacMinh';
import { goiChiPhiAi } from '@/lib/goiChiPhiAi';
import {
  canXacNhan, dinhDang, dinhTien, dungLichSu, GOI_Y_THEO_NHOM, laCotSo, NHOM_NANG_LUC, TEN_NHOM, thucHienDeXuat,
  type BoiCanh, type DeXuat, type DoDayNguon, type KetNoiHienThi, type KetQuaNangLuc, type KetQuaQuet, type NhomNangLuc, type PhanTichNhanh,
  type The, type ThueManDau, type TraLoi,
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
import { daHoanKhaoSatTrongPhien, KhaoSatThue } from '@/components/onboarding/KhaoSatThue';
import type { HoSoThue } from '@/lib/heLuat';

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

const KHOA_TRANG_THAI_KET_NOI: Record<KetNoiHienThi['trang_thai'], string> = {
  dang_chay: 'man.troLy.trangThai.dangChay',
  can_xu_ly: 'man.troLy.trangThai.canXuLy',
  chua_ket_noi: 'man.troLy.trangThai.chuaKetNoi',
  chi_nhap_file: 'man.troLy.trangThai.chiNhapFile',
};

const MAU_CHAM_KET_NOI: Record<KetNoiHienThi['trang_thai'], string> = {
  dang_chay: 'bg-mimi-green', can_xu_ly: 'bg-mimi-amber', chua_ket_noi: 'bg-muted-foreground/40', chi_nhap_file: 'bg-primary/60',
};

const THE = 'flex flex-col rounded-2xl border border-border bg-card p-5 text-left';

export default function TroLyPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
  const [moTaiApp, setMoTaiApp] = useState(false);
  const [moNhom, setMoNhom] = useState(false);
  const [timKetNoi, setTimKetNoi] = useState('');
  const [suaKhaoSat, setSuaKhaoSat] = useState(false);
  const congCu = useCongCuGhim();
  const [thamSo, datThamSo] = useSearchParams();
  const daHoiTuDuongDan = useRef(false);
  const cuoiHoiThoai = useRef<HTMLDivElement>(null);

  const taiBoiCanh = useCallback(async () => {
    try {
      setBoiCanh((await goiTroLy('boi_canh')) as BoiCanh);
      setLoiBoiCanh(null);
    } catch (e) {
      setLoiBoiCanh(e instanceof Error ? e.message : t('man.troLy.loi.boiCanh'));
    }
  }, []);

  useEffect(() => { void taiBoiCanh(); }, [taiBoiCanh]);

  useEffect(() => {
    if (luot.length) cuoiHoiThoai.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [luot.length]);

  const hoi = useCallback(async (cauHoi: string, pv: NhomNangLuc | null = phamVi) => {
    const cau = cauHoi.trim();
    if (!cau || dangHoi) return;
    // `/pet`: ẩn/hiện pet MIMI (pet không có khung chat riêng — lệnh gõ ở đây).
    if (laLenhPet(cau)) {
      const c = docCaiDat();
      luuCaiDat({ ...c, an: !c.an });
      window.dispatchEvent(new Event(SU_KIEN_LENH_PET));
      setNhap('');
      toast(c.an ? 'Đã hiện lại pet MIMI.' : 'Đã ẩn pet MIMI. Gõ /pet hoặc Alt+Shift+M để hiện lại.');
      return;
    }
    const id = ++demLuot.current;
    const lichSu = dungLichSu(luot);
    setLuot((ds) => [...ds, { id, cau, phamVi: pv }]);
    setNhap('');
    setMoTrangChiTiet(false);
    setDangHoi(true);
    try {
      const traLoi = (await goiTroLy('hoi', { cau, pham_vi: pv, lich_su: lichSu })) as TraLoi;
      setLuot((ds) => ds.map((l) => (l.id === id ? { ...l, traLoi } : l)));
    } catch (e) {
      setLuot((ds) => ds.map((l) => (l.id === id ? { ...l, loi: e instanceof Error ? e.message : t('man.troLy.loi.hoi') } : l)));
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

  /** TCCN-01: việc duyệt bị máy chủ dừng lại vì khoản có dấu hiệu bất thường. */
  const [xacMinh, setXacMinh] = useState<{ luotId: number; dx: DeXuat; dauHieu: DauHieu[]; lichSuDu: boolean } | null>(null);

  const lamDeXuat = useCallback(async (luotId: number, dx: DeXuat, daXacMinh = false) => {
    if (dx.loai === 'mo_trang') {
      navigate(String(dx.tham_so.duong_dan ?? '/dashboard'));
      return;
    }
    const k = `${luotId}:${dx.khoa}`;
    setViec((m) => ({ ...m, [k]: { trangThai: 'dang', cau: '' } }));
    let quyetDinhId: number | null = null;
    try {
      /**
       * MIMI-P1-002: ghi quyết định trước khi chạy. Máy chủ tra lại đề xuất theo khoá và trả bản
       * chính thức — giao diện chạy theo bản đó, nên tham số ở trình duyệt không quyết định việc gì.
       */
      const hoiThoaiId = luot.find((l) => l.id === luotId)?.traLoi?.hoi_thoai_id ?? null;
      const xn = await goiTroLy('xac_nhan', { de_xuat_khoa: dx.khoa, hoi_thoai_id: hoiThoaiId });
      quyetDinhId = typeof xn.quyet_dinh_id === 'number' ? xn.quyet_dinh_id : null;
      const dxThat = (xn.de_xuat ?? dx) as DeXuat;
      const cau = await thucHienDeXuat(dxThat, { goiTacTu, goiChiPhiAi, goiTroLy, dongBoSaoKe }, { daXacMinh });
      setViec((m) => ({ ...m, [k]: { trangThai: 'xong', cau } }));
      if (quyetDinhId) void goiTroLy('ket_qua_quyet_dinh', { quyet_dinh_id: quyetDinhId, ok: true, cau }).catch(() => {});
      // Thẻ ở màn đầu sẽ tải lại và khoản vừa làm biến khỏi thẻ — nên báo kết quả bằng toast.
      if (luotId === LUOT_MAN_DAU) toast.success(cau);
      void taiBoiCanh();
    } catch (e) {
      const cx = canXacMinh(e);
      if (cx) {
        // Không phải lỗi: máy chủ dừng lại chờ xác minh. Trả nút về như cũ và mở hộp dấu hiệu.
        setViec((m) => { const { [k]: _bo, ...con } = m; return con; });
        if (quyetDinhId) {
          void goiTroLy('ket_qua_quyet_dinh', { quyet_dinh_id: quyetDinhId, ok: false, cau: 'Dừng lại chờ xác minh người nhận.', ma_loi: 'CAN_XAC_MINH' }).catch(() => {});
        }
        setXacMinh({ luotId, dx, ...cx });
        return;
      }
      const cau = e instanceof Error ? e.message : t('man.troLy.loi.viec');
      setViec((m) => ({ ...m, [k]: { trangThai: 'loi', cau } }));
      if (quyetDinhId) void goiTroLy('ket_qua_quyet_dinh', { quyet_dinh_id: quyetDinhId, ok: false, cau }).catch(() => {});
      if (luotId === LUOT_MAN_DAU) toast.error(cau);
    }
  }, [navigate, taiBoiCanh, luot]);

  const viecKhac = (boiCanh?.viec ?? []).filter((v) => !VIEC_DA_CO_THE.has(v.khoa));
  const ketNoi = boiCanh?.ket_noi ?? [];
  const soCanXuLy = ketNoi.filter((k) => k.trang_thai === 'can_xu_ly').length;
  const boDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
  const ketNoiLoc = ketNoi.filter((k) => boDau(k.ten).includes(boDau(timKetNoi.trim())));
  const coHoiThoai = luot.length > 0;
  const goiYMeo = phamVi
    ? GOI_Y_THEO_NHOM[phamVi].slice(0, 2)
    : [GOI_Y_THEO_NHOM.ai_token[0], GOI_Y_THEO_NHOM.chung_tu[0]];

  return (
    <div className="pb-10">
      <HopXacMinh
        dauHieu={xacMinh?.dauHieu ?? null}
        lichSuDu={xacMinh?.lichSuDu ?? true}
        onHuy={() => setXacMinh(null)}
        onVanDuyet={() => {
          const x = xacMinh;
          setXacMinh(null);
          if (x) void lamDeXuat(x.luotId, x.dx, true);
        }}
      />
      {/* Nền vòng hạt tràn hết vùng nội dung: bù lại phần đệm của <main>. */}
      <section
        aria-label={t('man.troLy.vungHoi')}
        className={`mimi-tro-ly-nen relative -mx-4 -mt-4 overflow-hidden px-4 lg:-mx-6 lg:-mt-6 lg:px-6 ${coHoiThoai ? 'pb-8 pt-8' : 'pb-10 pt-10 sm:pt-14'}`}
      >
        <NenVongHat />
        <div className="relative z-10 mx-auto w-full max-w-4xl text-center">
          <h2 className={`font-display font-semibold tracking-tight text-foreground ${coHoiThoai ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-5xl'}`}>
            {t('man.troLy.tieuDe')}
          </h2>
          {!coHoiThoai && (
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              {t('man.troLy.gioiThieu', { congTy: boiCanh?.cong_ty ?? t('man.troLy.congTyBan') })}
            </p>
          )}

          {/* Ô hỏi, chip nhóm việc nằm bên trong như mẫu */}
          <form
            onSubmit={(e) => { e.preventDefault(); void hoi(nhap); }}
            className="mx-auto mt-7 max-w-3xl rounded-2xl border border-border bg-card text-left shadow-[0_8px_30px_hsla(220,30%,20%,0.08)]"
          >
            <label htmlFor="o-hoi-mimi" className="sr-only">{t('man.troLy.nhanOHoi')}</label>
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
              placeholder={t('man.troLy.oHoiPlaceholder')}
              className="block w-full resize-none rounded-t-2xl bg-transparent px-5 pt-4 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <div className="flex items-end gap-2 px-3 pb-3 pt-2">
              {/* Như ChatGPT: "+" để đưa tệp vào, bên cạnh là một nút chọn — không hàng chip cuộn ngang. */}
              <NutQuetChungTu
                coMoHinh={boiCanh ? boiCanh.co_mo_hinh : undefined}
                onDaLuu={() => void taiBoiCanh()}
                nhanAn={t('man.troLy.taiAnhChungTu')}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus size={20} />
              </NutQuetChungTu>
              <Popover open={moNhom} onOpenChange={setMoNhom}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={t('man.troLy.nhomViec', { nhom: phamVi ? TEN_NHOM[phamVi] : t('man.troLy.tatCaViec') })}
                    className="inline-flex h-9 min-w-0 items-center gap-1 rounded-full px-3 text-sm text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="truncate">{phamVi ? TEN_NHOM[phamVi] : t('man.troLy.tatCaViec')}</span>
                    <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-60 rounded-2xl p-1.5">
                  <div role="group" aria-label={t('man.troLy.chonNhomViec')}>
                    {([null, ...NHOM_NANG_LUC] as (NhomNangLuc | null)[]).map((n) => (
                      <button
                        key={n ?? 'tat_ca'}
                        type="button"
                        aria-pressed={phamVi === n}
                        onClick={() => { setPhamVi(n); setMoNhom(false); }}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent"
                      >
                        {n ? TEN_NHOM[n] : t('man.troLy.tatCaViec')}
                        {phamVi === n && <Check size={14} className="text-primary" aria-hidden />}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <button
                type="submit"
                disabled={!nhap.trim() || dangHoi}
                aria-label={t('man.troLy.guiCauHoi')}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {dangHoi ? <Loader2 size={17} className="animate-spin" /> : <ArrowUp size={18} />}
              </button>
            </div>
          </form>

          {/* Dải dưới ô hỏi, kiểu ChatGPT: một hàng gọn, kính trắng mờ, bấm mới mở danh sách. */}
          <div className="mx-auto max-w-3xl px-3 text-left">
            <nav
              aria-label={t('man.troLy.congCuVaKetNoi')}
              className="flex items-center gap-0.5 rounded-b-xl border-x border-b border-white/80 bg-white/70 px-1.5 py-0.5 text-[13px] text-muted-foreground shadow-[0_4px_14px_hsla(220,30%,20%,0.04)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
            >
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 hover:bg-white/90 hover:text-foreground dark:hover:bg-white/10">
                    <LayoutGrid size={14} aria-hidden /> {t('man.chung.congCu')}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 rounded-2xl p-1.5">
                  <ul aria-label={t('man.chung.congCuCuaBan')}>
                    {congCu.ds.map((c) => (
                      <li key={c.khoa}>
                        <Link to={duongDanCongCu(c)} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-accent">
                          <IconCongCu khoa={c.khoa} size={16} className="text-muted-foreground" /> {c.ten}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="my-1 border-t border-border" />
                  <button type="button" onClick={() => setMoKhoCongCu(true)} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent">
                    <span className="flex items-center gap-2.5"><Plus size={16} className="text-muted-foreground" aria-hidden /> {t('man.troLy.tuyChinhCongCu')}</span>
                    <ChevronRight size={15} className="text-muted-foreground" aria-hidden />
                  </button>
                </PopoverContent>
              </Popover>

              <Popover onOpenChange={(v) => { if (!v) setTimKetNoi(''); }}>
                <PopoverTrigger asChild>
                  <button type="button" className="inline-flex h-8 items-center gap-2 rounded-lg px-2 hover:bg-white/90 hover:text-foreground dark:hover:bg-white/10">
                    <span className="flex -space-x-1.5" aria-hidden>
                      {['tong_cuc_thue', 'openai', 'anthropic'].map((k) => (
                        <span key={k} className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-white bg-white shadow-sm">
                          <DauKetNoi khoa={k} tron />
                        </span>
                      ))}
                    </span>
                    {t('man.ten.ketNoi')}
                    {soCanXuLy > 0 && <span className="rounded-full bg-mimi-amber/15 px-1.5 text-xs font-semibold text-mimi-amber">{soCanXuLy}</span>}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 rounded-2xl p-1.5">
                  <input
                    value={timKetNoi}
                    onChange={(e) => setTimKetNoi(e.target.value)}
                    placeholder={t('man.troLy.timKetNoiPlaceholder')}
                    aria-label={t('man.troLy.timKetNoi')}
                    className="h-9 w-full rounded-lg bg-transparent px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  {!boiCanh && !loiBoiCanh && <p className="px-2.5 py-2 text-sm text-muted-foreground">{t('man.troLy.dangDocKetNoi')}</p>}
                  <ul aria-label={t('man.troLy.cacKetNoi')} className="max-h-72 overflow-y-auto">
                    {ketNoiLoc.map((k) => (
                      <li key={k.khoa}>
                        <Link to={k.duong_dan} title={k.cau} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-accent">
                          <DauKetNoi khoa={k.khoa} />
                          <span className="flex-1">{k.ten}</span>
                          {k.trang_thai === 'chua_ket_noi'
                            ? <Plus size={16} className="text-muted-foreground" aria-hidden />
                            : <span className={`h-2 w-2 rounded-full ${MAU_CHAM_KET_NOI[k.trang_thai]}`} aria-hidden />}
                          <span className="sr-only">{t(KHOA_TRANG_THAI_KET_NOI[k.trang_thai])}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="my-1 border-t border-border" />
                  <Link to="/dashboard/ket-noi" className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-accent">
                    <span className="flex items-center gap-2.5"><Puzzle size={16} className="text-muted-foreground" aria-hidden /> {t('man.troLy.quanLyKetNoi')}</span>
                    <ChevronRight size={15} className="text-muted-foreground" aria-hidden />
                  </Link>
                </PopoverContent>
              </Popover>

              <span className="ml-auto" />
              <button
                type="button"
                onClick={() => setMoTaiApp(true)}
                aria-label={t('man.troLy.dungNhuUngDung')}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 hover:bg-white/90 hover:text-foreground dark:hover:bg-white/10"
              >
                <Monitor size={14} aria-hidden /> <span className="hidden sm:inline">{t('man.troLy.dungNhuUngDungNgan')}</span>
              </button>
            </nav>
          </div>
          <KhoCongCu mo={moKhoCongCu} onDong={() => setMoKhoCongCu(false)} />
          <HopTaiUngDung mo={moTaiApp} onDong={() => setMoTaiApp(false)} />

          {boiCanh && !boiCanh.co_mo_hinh && (
            <p className="mx-auto mt-4 max-w-lg text-xs leading-relaxed text-muted-foreground">
              {t('man.troLy.cheDoCoDinh')}
            </p>
          )}
          {loiBoiCanh && <p className="mt-4 text-sm text-destructive">{loiBoiCanh}</p>}
        </div>
      </section>

      {/* Màn đầu: MIMI vừa phân tích cho bạn */}
      {!coHoiThoai && (
        <div className="mx-auto mt-8 max-w-5xl">
          {/*
            Cá nhân hoá từ khảo sát đầu vào: chưa trả lời thì hỏi (ngành quyết định mẫu tờ khai),
            trả lời rồi thì nói đúng nghĩa vụ thuế của người này.
          */}
          {boiCanh?.thue && ((!boiCanh.thue.co_ho_so && !daHoanKhaoSatTrongPhien()) || suaKhaoSat) && (
            <div className="mb-6">
              <KhaoSatThue
                hoSo={boiCanh.thue.ho_so as HoSoThue}
                onXong={() => { setSuaKhaoSat(false); void taiBoiCanh(); }}
              />
            </div>
          )}
          {boiCanh?.thue?.co_ho_so && !suaKhaoSat && (
            <div className="mb-6">
              <TheThueCuaBan thue={boiCanh.thue} onSua={() => setSuaKhaoSat(true)} />
            </div>
          )}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">{t('man.troLy.vuaPhanTich')}</h2>
            <button
              type="button"
              aria-expanded={moTrangChiTiet}
              onClick={() => setMoTrangChiTiet((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <LayoutGrid size={15} /> {t('man.chung.trangChiTiet')}
            </button>
          </div>

          {moTrangChiTiet && (
            <div className="mb-4 grid gap-1 rounded-xl border border-border bg-card p-2 sm:grid-cols-2 lg:grid-cols-4" role="region" aria-label={t('man.chung.trangChiTiet')}>
              {TRANG_CHI_TIET.map((tr) => (
                <Link key={tr.duong_dan} to={tr.duong_dan} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-accent">
                  <span className="text-foreground">{t(tr.khoa)}</span>
                  <span className="text-xs text-muted-foreground">{TEN_NHOM[tr.nhom]}</span>
                </Link>
              ))}
            </div>
          )}

          {viecKhac.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2" role="region" aria-label={t('man.troLy.cungCanDeY')}>
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
            <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 size={15} className="animate-spin" /> {t('man.troLy.dangDocSoLieu')}</p>
          ) : null}

          {hienMeo && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm" role="note">
              <Lightbulb size={17} className="mt-0.5 shrink-0 text-mimi-amber" aria-hidden />
              <p className="flex-1 leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{t('man.troLy.meoNhanh')}</span> {t('man.troLy.banCoTheHoi')}{' '}
                {goiYMeo.map((g, i) => (
                  <span key={g}>
                    {i > 0 && ` ${t('man.troLy.hoac')} `}“<button type="button" onClick={() => void hoi(g, phamVi)} className="text-foreground underline underline-offset-4 hover:text-primary">{g}</button>”
                  </span>
                ))}{' '}
                {t('man.troLy.deMimiXuLy')}
              </p>
              <button type="button" onClick={() => setHienMeo(false)} aria-label={t('man.troLy.anMeo')} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
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
              <RotateCcw size={14} /> {t('man.troLy.cuocHoiMoi')}
            </button>
          </div>
          {luot.map((l) => (
            <article key={l.id} aria-label={t('man.troLy.cauHoiLa', { cau: l.cau })} className="flex flex-col gap-4">
              <div className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] text-primary-foreground">{l.cau}</p>
              </div>
              {!l.traLoi && !l.loi && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={15} className="animate-spin" /> {t('man.troLy.dangTinh')}
                </p>
              )}
              {l.loi && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
                  <span className="text-foreground">{l.loi}</span>
                  <button type="button" onClick={() => void hoi(l.cau, l.phamVi)} className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4">
                    <RotateCcw size={14} /> {t('man.troLy.hoiLai')}
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
            <AlertDialogCancel>{t('man.chung.deSau')}</AlertDialogCancel>
            <AlertDialogAction
              data-mimi-khong-tu-bam={xacNhan && dinhTien(xacNhan.dx) ? '' : undefined}
              className={xacNhan?.dx.loai === 'tu_choi_yeu_cau' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
              onClick={() => { if (xacNhan) void lamDeXuat(xacNhan.luotId, xacNhan.dx); setXacNhan(null); }}
            >
              {xacNhan?.dx.loai === 'duyet_yeu_cau' ? t('man.chung.xacNhanDuyet') : xacNhan?.dx.loai === 'tu_choi_yeu_cau' ? t('man.chung.xacNhanTuChoi') : t('man.chung.xacNhan')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Màn đầu ─────────────────────────────────────────────────────────────────

function TheChiPhiAi({ p }: { p: PhanTichNhanh['chi_phi_ai'] }) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="the-chi-phi-ai" className={THE}>
      <h3 id="the-chi-phi-ai" className="text-base font-semibold text-foreground">{t('man.troLy.the.chiPhiAi')}</h3>
      {!p ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{t('man.troLy.the.chuaCoChiPhiAi')}</p>
          <Link to="/dashboard/chi-phi-ai" className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-primary hover:underline">
            {t('man.troLy.the.taiFileHoacBat')} <ArrowRight size={14} />
          </Link>
        </>
      ) : (
        <>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-foreground">{dinhDang(p.thang_nay_usd, 'usd')}</p>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            {p.thay_doi_phan_tram === null ? t('man.troLy.the.chuaCoThangTruoc') : (
              <>
                {p.thay_doi_phan_tram >= 0 ? <ArrowUp size={14} aria-hidden /> : <ArrowDown size={14} aria-hidden />}
                {t('man.troLy.the.soVoiCungKy', { phanTram: Math.abs(p.thay_doi_phan_tram) })}
              </>
            )}
          </p>
          {p.ngan_sach_usd !== null && (
            <p className={`mt-1 text-sm ${p.phan_tram_ngan_sach !== null && p.phan_tram_ngan_sach >= 100 ? 'font-medium text-mimi-amber' : 'text-muted-foreground'}`}>
              {t('man.troLy.the.daDungNganSach', { phanTram: p.phan_tram_ngan_sach, nganSach: dinhDang(p.ngan_sach_usd, 'usd') })}
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
  const { t } = useTranslation();
  const lonNhat = Math.max(0, ...ds.map((d) => d.usd ?? 0));
  return (
    <figure className="mt-auto pt-5">
      <div className="flex h-24 items-end gap-3" aria-hidden>
        {ds.map((d, i) => (
          <div key={d.khoa} className="flex h-full flex-1 flex-col items-center justify-end" title={d.usd === null ? t('man.troLy.the.cotChuaCoSoLieu', { nhan: d.nhan }) : `${d.nhan}: ${dinhDang(d.usd, 'usd')}`}>
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
        <caption>{t('man.troLy.the.bieuDoCaption')}</caption>
        <tbody>
          {ds.map((d) => <tr key={d.khoa}><th scope="row">{d.nhan}</th><td>{d.usd === null ? t('man.troLy.the.chuaCoSoLieu') : dinhDang(d.usd, 'usd')}</td></tr>)}
        </tbody>
      </table>
    </figure>
  );
}

function TheToiUu({ p, onHoi }: { p: PhanTichNhanh['toi_uu']; onHoi: (cau: string) => void }) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="the-toi-uu" className={THE}>
      <h3 id="the-toi-uu" className="text-base font-semibold text-foreground">{t('man.troLy.the.deXuatToiUu')}</h3>
      <p className="text-sm text-muted-foreground">{t('man.troLy.the.tuSoLieuThat')}</p>
      <ul className="mt-3 space-y-2">
        {p.y.map((y) => (
          <li key={y} className="flex gap-2 text-sm text-foreground">
            <Check size={16} className="mt-0.5 shrink-0 text-mimi-green" aria-hidden /> {y}
          </li>
        ))}
      </ul>
      {p.tiet_kiem_usd !== null && (
        <div className="mt-4 rounded-xl bg-mimi-green/10 px-4 py-3">
          <p className="text-xs text-muted-foreground">{t('man.troLy.the.tietKiemUocTinh')}</p>
          <p className="font-display text-xl font-semibold tabular-nums text-foreground">~ {dinhDang(p.tiet_kiem_usd, 'usd')} {t('man.troLy.the.moi30Ngay')}</p>
        </div>
      )}
      <button type="button" onClick={() => onHoi(p.hoi)} className="mt-auto inline-flex items-center gap-1 self-start pt-4 text-sm font-medium text-primary hover:underline">
        {t('man.troLy.the.hoiChiTiet')} <ArrowRight size={14} />
      </button>
    </section>
  );
}

function TheCanXacNhan({ p, viec, onDuyet }: {
  p: PhanTichNhanh['can_xac_nhan'];
  viec: Record<string, TrangThaiViec>;
  onDuyet: (dx: DeXuat) => void;
}) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="the-can-xac-nhan" className={THE}>
      <h3 id="the-can-xac-nhan" className="text-base font-semibold text-foreground">{t('man.troLy.the.canBanXacNhan')}</h3>
      <p className="text-sm text-muted-foreground">
        {p.so_khoan
          ? t('man.troLy.the.khoanCanPheDuyet', { so: p.so_khoan, tien: dinhDang(p.tong_tien, 'vnd') })
          : t('man.troLy.the.khongCoKhoanCho')}
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
                      aria-label={t('man.troLy.the.pheDuyetCho', { tien: dinhDang(m.so_tien, 'vnd'), nguoiNhan: m.nguoi_nhan })}
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50"
                    >
                      {tt?.trangThai === 'dang' && <Loader2 size={13} className="animate-spin" />} {t('man.troLy.the.pheDuyet')}
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
          {t('man.troLy.the.xemCa', { so: p.so_khoan })} <ArrowRight size={14} />
        </Link>
      )}
    </section>
  );
}

/** Thẻ thuế cá nhân hoá — dựng từ khảo sát đầu vào và doanh thu thật. */
function TheThueCuaBan({ thue, onSua }: { thue: ThueManDau; onSua: () => void }) {
  const { t } = useTranslation();
  const h = thue.ho_so;
  const moTa = [
    h.loai_nguoi_nop ? t(`man.khaoSat.loai.${h.loai_nguoi_nop}`) : null,
    ...h.nhom_nganh.map((n) => t(`man.khaoSat.nganh.${n}`)),
    h.kenh ? t(`man.khaoSat.kenh.${h.kenh}`) : null,
    h.nganh_dac_thu && h.nganh_dac_thu !== 'khong' ? t(`man.khaoSat.dacThu.${h.nganh_dac_thu}`) : null,
  ].filter(Boolean).join(' · ');

  return (
    <section aria-labelledby="the-thue-cua-ban" className="rounded-2xl border border-border bg-card p-5 text-left">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id="the-thue-cua-ban" className="flex items-center gap-2 text-base font-semibold text-foreground">
            <ScrollText size={17} className="text-primary" aria-hidden /> {t('man.khaoSat.the.tieuDe', { nam: thue.nam })}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{moTa}</p>
        </div>
        <button type="button" onClick={onSua} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <Pencil size={13} aria-hidden /> {t('man.khaoSat.the.suaCauTraLoi')}
        </button>
      </div>

      <p className="mt-3 text-sm text-foreground">
        {thue.doanh_thu_nam === null
          ? t('man.khaoSat.the.chuaCoDoanhThu')
          : t(thue.tam_tinh ? 'man.khaoSat.the.doanhThuTamTinh' : 'man.khaoSat.the.doanhThuCaNam', { tien: dinhDang(thue.doanh_thu_nam, 'vnd') })}
      </p>

      {thue.nghia_vu.length > 0 && (
        <ul className="mt-3 space-y-2">
          {thue.nghia_vu.map((n) => (
            <li key={n.id} className="rounded-xl bg-accent/60 px-3 py-2">
              <p className="text-sm text-foreground">{n.cau}</p>
              {(n.mau || n.han) && (
                <p className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {n.mau && <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">{t('man.khaoSat.the.mau', { mau: n.mau })}</span>}
                  {n.han && <span className="rounded-full bg-card px-2 py-0.5">{t('man.khaoSat.the.han', { ngay: dinhDang(n.han, 'ngay') })}</span>}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {thue.thieu.length > 0 && (
        <p className="mt-3 flex gap-2 text-sm text-mimi-amber">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
          <span><span className="font-medium">{t('man.khaoSat.the.canBoSung')}:</span> {thue.thieu[0].cau}</span>
        </p>
      )}

      <Link to="/dashboard/to-khai" className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-110">
        <ScrollText size={15} /> {t('man.khaoSat.the.soanToKhai')}
      </Link>
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
  const { t } = useTranslation();
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
        <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label={t('man.troLy.mimiDaLamGi')}>
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
  const { t } = useTranslation();
  if (!r.the.length && !r.de_xuat.length && !r.trang.length) return null;
  return (
    <section aria-label={TEN_NHOM[r.nhom]} className="rounded-xl border border-border bg-card p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{TEN_NHOM[r.nhom]}</p>
      <div className="flex flex-col gap-4">
        {r.the.map((t, i) => <TheKetQua key={i} the={t} />)}
      </div>

      {r.de_xuat.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2 border-t border-border pt-4" aria-label={t('man.troLy.viecBanCoTheLam')}>
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

      {!!r.do_day?.length && <DoDayKetQua ds={r.do_day} />}

      {(r.trang.length > 0 || r.nguon.length > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {r.trang.map((tr) => (
            <Link key={tr.duong_dan} to={tr.duong_dan} className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80">
              {tr.nhan}
            </Link>
          ))}
          {r.nguon.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {t('man.troLy.nguon')}{' '}
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

const ngayNgan = (s: string) => s.slice(0, 10).split('-').reverse().join('/');

/**
 * MIMI-P0-002: mỗi kết quả nói rõ dữ liệu đứng sau nó — bao nhiêu dòng, kỳ nào, đồng bộ lúc nào,
 * có đủ hay không. Cảnh báo chi tiết đã nằm ở thẻ đầu kết quả; dòng này là nhãn tra cứu nhanh.
 */
function DoDayKetQua({ ds }: { ds: DoDayNguon[] }) {
  const { t } = useTranslation();
  return (
    <ul className="mt-4 flex flex-col gap-1 border-t border-border pt-3 text-xs text-muted-foreground" aria-label={t('man.troLy.nguon')}>
      {ds.map((d) => (
        <li key={d.nguon} className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              d.coverage_status === 'complete' ? 'bg-mimi-green/10 text-mimi-green' : 'bg-mimi-amber/15 text-mimi-amber'
            }`}
          >
            {t(`man.troLy.doDay.${d.coverage_status}`)}
          </span>
          <span>{t('man.troLy.doDay.dong', { ten: d.ten, so: new Intl.NumberFormat('vi-VN').format(d.row_count) })}</span>
          {d.period_from && d.period_to && (
            <span>· {t('man.troLy.doDay.ky', { tu: ngayNgan(d.period_from), den: ngayNgan(d.period_to) })}</span>
          )}
          {d.last_synced_at && <span>· {t('man.troLy.doDay.dongBo', { luc: ngayNgan(d.last_synced_at) })}</span>}
        </li>
      ))}
    </ul>
  );
}

function TheKetQua({ the }: { the: The }) {
  const { t } = useTranslation();
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
              {/* P1-001: mở đúng những bản ghi đã cộng vào con số này. */}
              {!!m.bang_chung?.length && <dd><NutBangChung bangChung={m.bang_chung} /></dd>}
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
      {!!the.con_lai && <p className="mt-2 text-xs text-muted-foreground">{t('man.troLy.conDongNua', { so: the.con_lai })}</p>}
    </div>
  );
}

