import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  AlertTriangle, BookOpen, Check, ChevronRight, CircleDot, Copy, Download, Info, KeyRound, ListChecks, Loader2,
  MoreHorizontal, Pause, Play, Plug, Plus, QrCode, Receipt, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Trash2,
  UserPlus, Wallet, X,
} from 'lucide-react';
import { toast } from 'sonner';
import i18n from 'i18next';
import { Trans, useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { nguoiDungHienTai } from '@/lib/nguoiDung';
import { idCongTyDangDung } from '@/lib/congTyDangDung';
import type { Database } from '@/integrations/supabase/types';
import { SUPABASE_URL } from '@/lib/env';
import { DIEM_GOI_TAC_TU as DIEM_GOI, goiTacTu as goi } from '@/lib/goiTacTu';
import { canXacMinh, type DauHieu } from '@/lib/batThuong';
import HopXacMinh from '@/components/canh-bao/HopXacMinh';
import { docSoTienBangChu } from '@/lib/soTienBangChu';
import { taoChuoiVietQr } from '@/lib/vietqr';
import { DANH_SACH_NGAN_HANG } from '@/lib/nganHang';
import { NHOM_CHI, TRANG_THAI_GIU_HAN_MUC, dauThangVN } from '@/lib/tacTu';
import { tomTatChinhSach } from '@/lib/chinhSachVanBan';
import {
  MOC_GAN_CHAM_HAN_MUC, THU_TU_TRANG_THAI, canChuY, cauTomTatKiemSoat, giaiDoan, giuTheoNgay, ketQuaDanhGia, khopTuKhoa, kiemTruocYeuCau,
  locYeuCau, luatDaKhop, lyDoCua, nganSachQuanhKhoan, nhanMa, nhomTrungTen, thoiGianGiu, tienTrinh, tinhKpi, tinhSuDung,
  tomTatLuat, trangThaiHienThi, yeuCauDoiTaiKhoan,
  type ChinhSachRow, type DongGiu, type Kpi, type MucChuY, type NguoiNhan, type TacTu, type TrangThaiBuoc,
  type TrangThaiHienThi, type YeuCau,
} from '@/lib/kiemSoatChi';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoiTroLy } from '@/components/tro-ly/LoiTroLy';
import { dinhDangTien, soSanhTien, truTien, type TienVND } from '@/lib/tien';
import { baoKetQua } from '@/lib/mimiLamHo';
import { nhanTrangThaiYc, tenNhomChi } from '@/lib/nhanDich';

/**
 * Kiểm soát chi — trung tâm điều hành chi tiêu của agent.
 *
 * Người mở trang này gần như luôn vì có việc: một khoản chờ duyệt, một lệnh chờ
 * trả, một cảnh báo. Nên đầu trang là bốn con số, rồi việc cần làm, rồi mới tới
 * agent và cấu hình. Cấu hình (người nhận, chính sách, nhật ký) lui vào tab riêng.
 *
 * GIỮ NGUYÊN LOGIC. Cùng các truy vấn Supabase, cùng các hành động của edge
 * function `tac-tu`, cùng quy tắc: MIMI KHÔNG CHUYỂN TIỀN — "Đã duyệt" hiện mã
 * VietQR để bạn trả trong app ngân hàng, "Đã chi" chỉ đến từ sao kê. Mọi con số
 * và nhãn suy ra ở `lib/kiemSoatChi.ts`, không có số liệu mẫu.
 *
 * CON TRỎ "MIMI LÀM HỘ" tìm đích bằng `data-mimi` và bấm bằng `click()`, nên tab
 * là nút thường (không phải Radix Tabs, vốn kích hoạt bằng mousedown) và kịch bản
 * bấm mở tab trước khi tới ô trong tab đó. Các nút tiền và nút không hoàn tác vẫn
 * mang `data-mimi-khong-tu-bam`.
 */

type NhatKy = Database['public']['Tables']['nhat_ky_tac_tu']['Row'];

const dong = dinhDangTien;
const tenNganHang = (bin: string) => DANH_SACH_NGAN_HANG.find((n) => n.bin === bin)?.ten ?? bin;
const luc = (s: string | null) =>
  s ? new Date(s).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—';
const chuCai = (email: string | null) => (email?.split('@')[0] ?? '').slice(0, 2).toUpperCase() || '—';

/** Nhãn trạng thái agent theo ngôn ngữ đang chọn; mã lạ hiện nguyên mã. */
const tenTrangThaiTacTu = (tt: string) => i18n.t(`app.tacTu.ttAgent.${tt}`, { defaultValue: tt });

/**
 * Nhật ký lưu mã sự kiện cho máy (`them_nguoi_nhan`), nhưng người đọc cần một
 * câu. Mã lạ — ví dụ sự kiện máy chủ mới thêm mà trang chưa biết — hiện nguyên
 * mã thay vì biến mất.
 */
const tenSuKien = (ma: string) => i18n.t(`app.tacTu.suKien.${ma}`, { defaultValue: ma });
const ketQuaXin = (ma: string | undefined) => (ma ? i18n.t(`app.tacTu.ketQuaXin.${ma}`, { defaultValue: '' }) : '');

function chiTietNhatKy(n: NhatKy): string {
  const c = (n.chi_tiet && typeof n.chi_tiet === 'object' && !Array.isArray(n.chi_tiet)
    ? n.chi_tiet
    : {}) as Record<string, unknown>;
  const tien = typeof c.so_tien === 'number' ? dong(c.so_tien) : null;

  switch (n.su_kien) {
    case 'them_nguoi_nhan':
    case 'xoa_nguoi_nhan': {
      const ten = (c.ten_chu_tai_khoan ?? c.ten) as string | undefined;
      const bin = c.ngan_hang_bin as string | undefined;
      return [ten, bin ? tenNganHang(bin) : null, c.so_tai_khoan as string | undefined].filter(Boolean).join(' · ');
    }
    case 'xin_chi':
      return [tien, ketQuaXin(c.ket_qua as string | undefined)].filter(Boolean).join(' · ');
    case 'doi_trang_thai':
      return `${tenTrangThaiTacTu(String(c.tu))} → ${tenTrangThaiTacTu(String(c.sang))}`;
    case 'tu_choi':
      return [tien, c.ghi_chu as string | undefined].filter(Boolean).join(' · ');
    default:
      return tien ?? '';
  }
}

const DIEM_MCP = `${SUPABASE_URL}/functions/v1/mcp`;

/* ── Kiểu dáng ─────────────────────────────────────────────────────────
 * Nền graphite nhạt của layout, khối trắng viền mảnh, bo 8px. Nút chính màu chữ
 * (gần đen). Xanh lá chỉ cho thành công, đỏ chỉ cho lỗi và hành động phá huỷ,
 * vàng MIMI chỉ là chấm nhấn nhỏ cho thứ cần để mắt.
 */
const vien = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const vienTrong = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';
const nutGoc = `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 sm:min-h-9 ${vien}`;
const nutChinh = `${nutGoc} bg-foreground text-background hover:bg-foreground/85`;
const nutPhu = `${nutGoc} border border-border bg-card text-foreground hover:bg-accent`;
const nutNho = `inline-flex h-8 items-center justify-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${vien}`;
const nutNhoChinh = `${nutNho} bg-foreground text-background hover:bg-foreground/85`;
const nutNhoPhu = `${nutNho} border border-border bg-card text-foreground hover:bg-accent`;
const o = `w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground ${vien}`;
const khoi = 'rounded-lg border border-border bg-card';
const nhanNho = 'text-[11px] font-medium uppercase tracking-wide text-muted-foreground';
const lienKet = `rounded text-xs font-medium text-muted-foreground hover:text-foreground ${vien}`;

/* ── Tab ───────────────────────────────────────────────────────────── */
// Tên tab lấy từ bộ dịch (app.tacTu.tab.<khoa>).
const CAC_TAB = [
  { khoa: 'tong-quan' },
  { khoa: 'yeu-cau' },
  { khoa: 'agents' },
  { khoa: 'chinh-sach' },
  { khoa: 'nguoi-nhan' },
  { khoa: 'nhat-ky' },
] as const;
type KhoaTab = (typeof CAC_TAB)[number]['khoa'];

interface XacNhan {
  tieuDe: string;
  mo: string;
  nut: string;
  nguyHiem?: boolean;
  lam: () => void | Promise<void>;
}

export default function TacTuPage() {
  const { t: tr } = useTranslation();
  const [thamSo, datThamSo] = useSearchParams();
  const [dangTai, setDangTai] = useState(true);
  const [emailChu, setEmailChu] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  /** yeu_cau_id → user_id của người tạo, cho các khoản chủ doanh nghiệp tạo (nhật ký `xin_chi`, nguoi = nguoi_dung). */
  const [nguoiTao, setNguoiTao] = useState<Record<string, string>>({});
  const [dsTacTu, setDsTacTu] = useState<TacTu[]>([]);
  const [chinhSach, setChinhSach] = useState<Record<string, ChinhSachRow>>({});
  const [nguoiNhan, setNguoiNhan] = useState<NguoiNhan[]>([]);
  const [yeuCau, setYeuCau] = useState<YeuCau[]>([]);
  const [giuThang, setGiuThang] = useState<DongGiu[]>([]);
  const [nhatKy, setNhatKy] = useState<NhatKy[]>([]);
  /**
   * Đọc lỗi (29/09/2026): trước đây bật thông báo rồi ghi mảng rỗng — trang nói "Chưa có agent nào" và
   * "Không có khoản nào chờ" trong khi có khoản đang chờ duyệt. Giờ giữ dữ liệu lần đọc trước và nói rõ.
   */
  const [loiTai, setLoiTai] = useState<string | null>(null);
  const [daDocDuoc, setDaDocDuoc] = useState(false);
  const [khoaMoi, setKhoaMoi] = useState<{ ten: string; khoa: string } | null>(null);
  const [dangLam, setDangLam] = useState<string | null>(null);
  const [yeuCauMo, setYeuCauMo] = useState<string | null>(null);
  const [tuChoiMo, setTuChoiMo] = useState<YeuCau | null>(null);
  const [xacNhan, setXacNhan] = useState<XacNhan | null>(null);
  /** TCCN-01: máy chủ dừng việc duyệt vì khoản có dấu hiệu bất thường. */
  const [xacMinh, setXacMinh] = useState<{ y: YeuCau; themNguoiNhan: boolean; dauHieu: DauHieu[]; lichSuDu: boolean } | null>(null);
  const [moTao, setMoTao] = useState(false);
  const [locTrangThai, setLocTrangThai] = useState<TrangThaiHienThi | 'tat_ca'>('tat_ca');
  const [tim, setTim] = useState('');

  const tabTrenUrl = thamSo.get('tab');
  const tab: KhoaTab = CAC_TAB.some((t) => t.khoa === tabTrenUrl) ? (tabTrenUrl as KhoaTab) : 'tong-quan';
  const chonTab = useCallback((k: KhoaTab) => {
    datThamSo((cu) => {
      const moi = new URLSearchParams(cu);
      if (k === 'tong-quan') moi.delete('tab');
      else moi.set('tab', k);
      return moi;
    }, { replace: true });
  }, [datThamSo]);

  const tai = useCallback(async () => {
    try {
      const user = await nguoiDungHienTai();
      if (!user) return;
      setEmailChu(user.email ?? null);
      setUserId(user.id);
      const id = await idCongTyDangDung();
      if (!id) return;
      const cty = { id };

      const [tt, cs, nn, yc, dang, giu, nk, tao] = await Promise.all([
        supabase.from('tac_tu').select('*').eq('company_id', cty.id).order('created_at', { ascending: true }),
        supabase.from('chinh_sach_chi').select('*').eq('company_id', cty.id),
        supabase.from('nguoi_nhan_duoc_phep').select('*').eq('company_id', cty.id).order('created_at', { ascending: true }),
        supabase.from('yeu_cau_chi').select('*').eq('company_id', cty.id).order('created_at', { ascending: false }).limit(100),
        // Khoản còn chờ quyết/chờ trả đọc RIÊNG, không giới hạn 100 dòng mới nhất: một khoản chờ duyệt cũ
        // hơn 100 yêu cầu gần đây từng biến mất khỏi "Cần duyệt" — đúng khoản người dùng phải quyết.
        supabase.from('yeu_cau_chi').select('*').eq('company_id', cty.id).in('trang_thai', ['cho_duyet', 'da_duyet'])
          .order('created_at', { ascending: false }),
        supabase.from('yeu_cau_chi').select('tac_tu_id, so_tien, created_at').eq('company_id', cty.id)
          .in('trang_thai', [...TRANG_THAI_GIU_HAN_MUC])
          .gte('created_at', dauThangVN(new Date()).toISOString()),
        supabase.from('nhat_ky_tac_tu').select('*').eq('company_id', cty.id).order('created_at', { ascending: false }).limit(30),
        // Người yêu cầu: khoản do chủ doanh nghiệp tạo được nhật ký ghi `nguoi_dung` kèm user_id.
        supabase.from('nhat_ky_tac_tu').select('yeu_cau_id, user_id').eq('company_id', cty.id)
          .eq('su_kien', 'xin_chi').eq('nguoi', 'nguoi_dung').order('created_at', { ascending: false }).limit(500),
      ]);

      // Không nuốt lỗi: bảng chưa có (migration chưa chạy) trông y hệt "chưa có agent nào".
      const loi = [tt, cs, nn, yc, dang, giu, nk, tao].find((r) => r.error)?.error;
      if (loi) {
        toast.error(tr('app.tacTu.toast.loiDoc', { loi: loi.message }));
        setLoiTai(loi.message);
        return;
      }
      setLoiTai(null);
      setDaDocDuoc(true);

      setDsTacTu(tt.data ?? []);
      setChinhSach(Object.fromEntries((cs.data ?? []).map((r) => [r.tac_tu_id, r])));
      setNguoiNhan(nn.data ?? []);
      const gan = yc.data ?? [];
      const daCo = new Set(gan.map((y) => y.id));
      setYeuCau([...gan, ...(dang.data ?? []).filter((y) => !daCo.has(y.id))]);
      setGiuThang(giu.data ?? []);
      setNhatKy(nk.data ?? []);
      setNguoiTao(Object.fromEntries(
        (tao.data ?? [])
          .filter((r) => r.yeu_cau_id && r.user_id)
          .map((r) => [r.yeu_cau_id as string, r.user_id as string]),
      ));
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => { void tai(); }, [tai]);

  // Có lệnh đã duyệt chờ trả thì tự tải lại: sao kê về là trạng thái đổi.
  const coLenhChoTra = yeuCau.some((y) => y.trang_thai === 'da_duyet' || y.trang_thai === 'cho_duyet');
  useEffect(() => {
    if (!coLenhChoTra) return;
    const t = setInterval(() => { void tai(); }, 30_000);
    return () => clearInterval(t);
  }, [coLenhChoTra, tai]);

  const lam = async (nhan: string, hanhDong: string, du: Record<string, unknown> = {}, thanhCong?: string) => {
    setDangLam(nhan);
    try {
      const kq = await goi(hanhDong, du);
      if (thanhCong) toast.success(thanhCong);
      await tai();
      return kq;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('app.chung.khongThucHienDuoc'));
      return null;
    } finally {
      setDangLam(null);
    }
  };

  /* ── Dữ liệu suy ra ─────────────────────────────────────────────── */
  const suDung = useMemo(() => tinhSuDung(giuThang, new Date()), [giuThang]);
  const tenTacTu = useMemo(() => Object.fromEntries(dsTacTu.map((t) => [t.id, t.ten])), [dsTacTu]);
  const kpi = useMemo(
    () => tinhKpi({ yeuCau, dsTacTu, chinhSach, giu: giuThang, now: new Date() }),
    [yeuCau, dsTacTu, chinhSach, giuThang],
  );
  const chuY = useMemo(
    () => canChuY({ yeuCau, dsTacTu, chinhSach, suDung, nguoiNhan, now: new Date() }),
    [yeuCau, dsTacTu, chinhSach, suDung, nguoiNhan],
  );
  const bieuDo = useMemo(() => giuTheoNgay(giuThang, new Date()), [giuThang]);
  const choDuyet = yeuCau.filter((y) => y.trang_thai === 'cho_duyet');
  const choTra = yeuCau.filter((y) => y.trang_thai === 'da_duyet');
  const dsDangDung = dsTacTu.filter((t) => t.trang_thai !== 'thu_hoi');
  const dsThuHoi = dsTacTu.filter((t) => t.trang_thai === 'thu_hoi');
  const soChoTheoAgent = useMemo(() => {
    const m: Record<string, number> = {};
    for (const y of yeuCau) if (y.trang_thai === 'cho_duyet') m[y.tac_tu_id] = (m[y.tac_tu_id] ?? 0) + 1;
    return m;
  }, [yeuCau]);
  const canhBaoNguoiNhan = yeuCauDoiTaiKhoan(yeuCau).length + nhomTrungTen(nguoiNhan).length;
  const yMo = yeuCau.find((y) => y.id === yeuCauMo) ?? null;
  const chuSoHuu = emailChu ?? tr('app.tacTu.chuDn');

  /* ── Hành động (cùng API như trước) ─────────────────────────────── */
  const duyet = async (y: YeuCau, themNguoiNhan: boolean, daXacMinh = false) => {
    setDangLam(y.id);
    try {
      const kq = await goi('duyet', { yeu_cau_id: y.id, them_nguoi_nhan: themNguoiNhan, ...(daXacMinh ? { da_xac_minh: true } : {}) });
      toast.success(tr('app.tacTu.toast.daDuyet'));
      await tai();
      return kq;
    } catch (e) {
      // Khoản có dấu hiệu bất thường: không báo lỗi, mở hộp xác minh.
      const cx = canXacMinh(e);
      if (cx) setXacMinh({ y, themNguoiNhan, ...cx });
      else toast.error(e instanceof Error ? e.message : tr('app.chung.khongThucHienDuoc'));
      return null;
    } finally {
      setDangLam(null);
    }
  };
  const tuChoi = (y: YeuCau, ghiChu: string) =>
    lam(y.id, 'tu_choi', { yeu_cau_id: y.id, ghi_chu: ghiChu }, tr('app.tacTu.toast.daTuChoi'));
  const huy = (y: YeuCau) =>
    setXacNhan({
      tieuDe: tr('app.tacTu.xn.huyTieuDe', { tien: dong(y.so_tien) }),
      mo: tr('app.tacTu.xn.huyMo'),
      nut: tr('app.tacTu.xn.huyNut'),
      lam: () => { void lam(y.id, 'huy', { yeu_cau_id: y.id }, tr('app.tacTu.toast.daHuyLenh')); },
    });
  const doiTrangThai = (t: TacTu, tt: 'hoat_dong' | 'tam_dung') =>
    void lam(t.id, 'doi_trang_thai', { tac_tu_id: t.id, trang_thai: tt }, tr('app.tacTu.toast.daDoiTrangThai'));
  const thuHoi = (t: TacTu) =>
    setXacNhan({
      tieuDe: tr('app.tacTu.xn.thuHoiTieuDe', { ten: t.ten }),
      mo: tr('app.tacTu.xn.thuHoiMo'),
      nut: tr('app.tacTu.xn.thuHoiNut'),
      nguyHiem: true,
      lam: () => { void lam(t.id, 'doi_trang_thai', { tac_tu_id: t.id, trang_thai: 'thu_hoi' }, tr('app.tacTu.toast.daThuHoi')); },
    });
  const xoayKhoa = (t: TacTu) =>
    setXacNhan({
      tieuDe: tr('app.tacTu.xn.khoaTieuDe', { ten: t.ten }),
      mo: tr('app.tacTu.xn.khoaMo'),
      nut: tr('app.tacTu.xn.khoaNut'),
      lam: async () => {
        const kq = await lam(t.id, 'xoay_khoa', { tac_tu_id: t.id });
        if (kq?.khoa) setKhoaMoi({ ten: t.ten, khoa: kq.khoa });
      },
    });
  const boNguoiNhan = (n: NguoiNhan) =>
    setXacNhan({
      tieuDe: tr('app.tacTu.xn.boTieuDe', { ten: n.ten_chu_tai_khoan }),
      mo: tr('app.tacTu.xn.boMo'),
      nut: tr('app.tacTu.xn.boNut'),
      nguyHiem: true,
      lam: () => { void lam(n.id, 'xoa_nguoi_nhan', { id: n.id }, tr('app.tacTu.toast.daBoNguoiNhan')); },
    });
  /**
   * Chủ doanh nghiệp tạo khoản chi. Máy chủ chạy đúng `xinChi` của agent được chọn,
   * nên kết quả có thể là tự duyệt, chờ duyệt hoặc bị luật từ chối. Mở ngay khung
   * quyết định của dòng vừa tạo để người tạo đọc lý do, không chỉ một toast.
   */
  const taoYeuCau = async (du: Record<string, unknown>) => {
    const kq = await lam('tao_yeu_cau', 'tao_yeu_cau', du);
    const y = kq?.yeu_cau as { id: string; trang_thai: string } | undefined;
    if (!y) return;
    setMoTao(false);
    if (kq.trung_lap) {
      toast.info(tr('app.tacTu.toast.trungLap'));
    } else if (y.trang_thai === 'tu_choi') {
      toast.warning(tr('app.tacTu.toast.luatTuChoi'));
    } else {
      toast.success(y.trang_thai === 'da_duyet' ? tr('app.tacTu.toast.trongChinhSach') : tr('app.tacTu.toast.daTaoChoDuyet'));
    }
    setYeuCauMo(y.id);
  };

  if (dangTai) {
    return (
      <p className="flex items-center gap-2 py-16 text-sm text-muted-foreground" role="status">
        <Loader2 size={15} className="animate-spin" /> {tr('app.tacTu.dangDoc')}
      </p>
    );
  }

  if (loiTai && !daDocDuoc) {
    return (
      <div role="alert" className="mx-auto max-w-3xl rounded-2xl border border-destructive/40 bg-card p-6">
        <p className="text-sm font-semibold text-foreground">{tr('app.tacTu.loiTieuDe')}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {tr('app.tacTu.loiMo', { loi: loiTai })}
        </p>
        <button onClick={() => void tai()} className="mt-3 rounded-xl border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent">
          {tr('app.chung.thuLai')}
        </button>
      </div>
    );
  }

  const nguoiYeuCau = (y: YeuCau) => (nguoiTao[y.id] ? (nguoiTao[y.id] === userId ? tr('app.tacTu.nguoiYc.ban') : tr('app.tacTu.nguoiYc.nguoiDung')) : tr('app.tacTu.nguoiYc.agent'));
  const hanhDongBang = {
    tenTacTu,
    nguoiYeuCau,
    dangLam,
    xem: (id: string) => setYeuCauMo(id),
    duyet: (y: YeuCau) => void duyet(y, false),
    tuChoi: (y: YeuCau) => setTuChoiMo(y),
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-16">
      {loiTai && (
        <p role="alert" className="rounded-lg border border-mimi-amber/40 bg-mimi-amber/10 px-3 py-2 text-sm text-foreground">
          {tr('app.tacTu.loiCu', { loi: loiTai })}{' '}
          <button onClick={() => void tai()} className="font-medium underline">{tr('app.chung.thuLai')}</button>
        </p>
      )}
      {/* ── Đầu trang ─────────────────────────────────────────────── */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <nav aria-label={tr('app.chung.duongDan')}>
            <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <li>{tr('app.tacTu.dau.agent')}</li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-foreground">{tr('app.tacTu.dau.tieuDe')}</li>
            </ol>
          </nav>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{tr('app.tacTu.dau.tieuDe')}</h1>
          <p className="mt-1 truncate text-sm text-muted-foreground" title={tr('app.tacTu.dau.moTa')}>
            {tr('app.tacTu.dau.moTa')}
          </p>
        </div>
        <div className="grid grid-cols-[auto_1fr_1fr] gap-2 sm:flex sm:shrink-0">
          <button onClick={() => void tai()} aria-label={tr('app.chung.taiLai')} title={tr('app.chung.taiLai')} className={`${nutPhu} px-2.5`}>
            <RefreshCw size={15} />
          </button>
          {/* Nhãn ngắn trên điện thoại: ba nút chung một hàng 375px mà nhãn dài thì xuống dòng lởm chởm. */}
          <Link to="/dashboard/chinh-sach" aria-label={tr('app.tacTu.dau.caiDatCs')} className={nutPhu}>
            <SlidersHorizontal size={15} aria-hidden />
            <span className="sm:hidden" aria-hidden>{tr('app.tacTu.dau.chinhSach')}</span>
            <span className="hidden sm:inline" aria-hidden>{tr('app.tacTu.dau.caiDatCs')}</span>
          </Link>
          <button onClick={() => setMoTao(true)} aria-label={tr('app.tacTu.dau.taoYc')} className={nutChinh}>
            <Plus size={15} aria-hidden />
            <span className="sm:hidden" aria-hidden>{tr('app.tacTu.dau.taoYcNgan')}</span>
            <span className="hidden sm:inline" aria-hidden>{tr('app.tacTu.dau.taoYc')}</span>
          </button>
        </div>
      </header>

      {khoaMoi && <KhoaMoi ten={khoaMoi.ten} khoa={khoaMoi.khoa} dongLai={() => setKhoaMoi(null)} />}

      <LoiTroLy cau={cauTomTatKiemSoat({ kpi, soChoTra: choTra.length })} />

      <HangKpi kpi={kpi} moXemXet={() => { setLocTrangThai('can_xem_xet'); chonTab('yeu-cau'); }} />

      <ThanhTab
        tab={tab}
        chon={chonTab}
        dem={{
          'yeu-cau': kpi.canDuyet > 0 ? <Dem so={kpi.canDuyet} /> : null,
          'nguoi-nhan': canhBaoNguoiNhan > 0 ? <span className="h-1.5 w-1.5 rounded-full bg-mimi-amber" aria-label={tr('app.tacTu.coCanhBao')} /> : null,
        }}
      />

      {/* ── Tổng quan ─────────────────────────────────────────────── */}
      {tab === 'tong-quan' && (
        <div id="khu-tong-quan" role="tabpanel" aria-labelledby="tab-tong-quan" className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-5">
            <section data-mimi={choDuyet.length > 0 ? 'tac-tu.cho-duyet' : undefined} aria-labelledby="tq-cho-duyet">
              <DauKhu
                id="tq-cho-duyet"
                tieuDe={tr('app.tacTu.tq.canDuyet')}
                dem={choDuyet.length}
                phai={<button onClick={() => { setLocTrangThai('tat_ca'); chonTab('yeu-cau'); }} className={lienKet}>{tr('app.tacTu.tq.tatCaYc')} <ChevronRight size={12} className="inline" /></button>}
              />
              {choDuyet.length > 0
                ? <BangYeuCau rows={choDuyet} {...hanhDongBang} />
                : <Trong>{tr('app.tacTu.tq.khongChoDuyet')}</Trong>}
            </section>

            {choTra.length > 0 && (
              <section aria-labelledby="tq-cho-tra">
                <DauKhu id="tq-cho-tra" tieuDe={tr('app.tacTu.tq.choTra')} dem={choTra.length} />
                <BangYeuCau rows={choTra} {...hanhDongBang} />
              </section>
            )}

            <section aria-labelledby="tq-bieu-do" className={`${khoi} p-4`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="tq-bieu-do" className="text-sm font-semibold text-foreground">{tr('app.tacTu.tq.bieuDo')}</h2>
                <p className="text-xs text-muted-foreground">{tr('app.tacTu.tq.bieuDoMo')}</p>
              </div>
              <BieuDoGiu ds={bieuDo} />
            </section>

            <section data-mimi="tac-tu.danh-sach" aria-labelledby="tq-agent">
              <DauKhu
                id="tq-agent"
                tieuDe={tr('app.tacTu.tq.hoatDong')}
                dem={dsDangDung.length}
                phai={<button onClick={() => chonTab('agents')} className={lienKet}>{tr('app.tacTu.tq.quanLy')} <ChevronRight size={12} className="inline" /></button>}
              />
              {dsDangDung.length === 0 ? (
                <Trong>
                  {tr('app.tacTu.tq.chuaCoAgent')}{' '}
                  <button onClick={() => chonTab('agents')} className={`${lienKet} text-foreground underline underline-offset-4`}>{tr('app.tacTu.tq.themDau')}</button>
                </Trong>
              ) : (
                <BangAgent
                  ds={dsDangDung}
                  chinhSach={chinhSach}
                  suDung={suDung}
                  soCho={soChoTheoAgent}
                  chuSoHuu={chuSoHuu}
                  dangLam={dangLam}
                  doiTrangThai={doiTrangThai}
                  xoayKhoa={xoayKhoa}
                  thuHoi={thuHoi}
                />
              )}
            </section>
          </div>

          <aside className="space-y-5" aria-label={tr('app.tacTu.tq.aside')}>
            <section aria-labelledby="tq-chu-y" className={khoi}>
              <h2 id="tq-chu-y" className="flex items-center justify-between border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
                {tr('app.tacTu.tq.chuY')} {chuY.length > 0 && <Dem so={chuY.length} />}
              </h2>
              {chuY.length === 0 ? (
                <p className="px-4 py-5 text-sm text-muted-foreground">{tr('app.tacTu.tq.khongGi')}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {chuY.map((m) => (
                    <li key={m.khoa}>
                      <MucCanChuY
                        m={m}
                        mo={() => (m.yeuCauId ? setYeuCauMo(m.yeuCauId) : m.tab ? chonTab(m.tab) : undefined)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="tq-nhanh" className={khoi}>
              <h2 id="tq-nhanh" className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">{tr('app.tacTu.tq.nhanh')}</h2>
              <ul className="divide-y divide-border">
                <li><ThaoTacNhanh icon={SlidersHorizontal} ten={tr('app.tacTu.tq.nhanhCs')} mo={tr('app.tacTu.tq.nhanhCsMo')} to="/dashboard/chinh-sach" /></li>
                <li><ThaoTacNhanh icon={Plus} ten={tr('app.tacTu.tq.nhanhAgent')} mo={tr('app.tacTu.tq.nhanhAgentMo')} bam={() => chonTab('agents')} /></li>
                <li><ThaoTacNhanh icon={UserPlus} ten={tr('app.tacTu.tq.nhanhNn')} mo={tr('app.tacTu.tq.nhanhNnMo')} bam={() => chonTab('nguoi-nhan')} /></li>
                <li><ThaoTacNhanh icon={Plug} ten={tr('app.tacTu.tq.nhanhYc')} mo={tr('app.tacTu.tq.nhanhYcMo')} bam={() => setMoTao(true)} /></li>
                <li><ThaoTacNhanh icon={BookOpen} ten={tr('app.tacTu.tq.nhanhNk')} mo={tr('app.tacTu.tq.nhanhNkMo')} bam={() => chonTab('nhat-ky')} /></li>
              </ul>
            </section>
          </aside>
        </div>
      )}

      {/* ── Yêu cầu chi ───────────────────────────────────────────── */}
      {tab === 'yeu-cau' && (
        <div id="khu-yeu-cau" role="tabpanel" aria-labelledby="tab-yeu-cau" className="space-y-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div role="group" aria-label={tr('app.tacTu.yc.loc')} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 lg:pb-0">
              {(['tat_ca', ...THU_TU_TRANG_THAI] as const).map((k) => {
                const so = k === 'tat_ca' ? yeuCau.length : yeuCau.filter((y) => trangThaiHienThi(y) === k).length;
                const dang = locTrangThai === k;
                return (
                  <button
                    key={k}
                    aria-pressed={dang}
                    onClick={() => setLocTrangThai(k)}
                    className={`${nutNho} shrink-0 border ${dang ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground hover:bg-accent'}`}
                  >
                    {k === 'tat_ca' ? tr('app.chung.tatCa') : nhanTrangThaiYc(k)}
                    <span className="tabular-nums opacity-60">{so}</span>
                  </button>
                );
              })}
            </div>
            <label className="relative block lg:w-80">
              <span className="sr-only">{tr('app.tacTu.yc.tim')}</span>
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input type="search" value={tim} onChange={(e) => setTim(e.target.value)} placeholder={tr('app.tacTu.yc.timPh')} className={`${o} pl-8`} />
            </label>
          </div>
          {(() => {
            if (yeuCau.length === 0) return <Trong>{tr('app.tacTu.yc.trong')}</Trong>;
            const ds = locYeuCau(yeuCau, { trangThai: locTrangThai, tim }, tenTacTu);
            return ds.length === 0 ? <Trong>{tr('app.tacTu.yc.khongKhop')}</Trong> : <BangYeuCau rows={ds} {...hanhDongBang} />;
          })()}
          <p className="text-xs text-muted-foreground">{tr('app.tacTu.yc.toiDa')}</p>
        </div>
      )}

      {/* ── Agents ────────────────────────────────────────────────── */}
      {tab === 'agents' && (
        <div id="khu-agents" role="tabpanel" aria-labelledby="tab-agents" className="space-y-4">
          <section className={`${khoi} p-4`} aria-labelledby="ag-them">
            <h2 id="ag-them" className="text-sm font-semibold text-foreground">{tr('app.tacTu.ag.them')}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {tr('app.tacTu.ag.themMo')}
            </p>
            <ThemTacTu
              dangLam={dangLam === 'tao'}
              tao={async (ten, moTa) => {
                const kq = await lam('tao', 'tao_tac_tu', { ten, mo_ta: moTa || null });
                if (kq?.khoa) setKhoaMoi({ ten, khoa: kq.khoa });
                // Báo cho con trỏ mèo (nếu nó đang chờ nút này) kết quả THẬT của yêu cầu, không phải cú bấm.
                baoKetQua(kq
                  ? { dich: 'tac-tu.them', ok: true, cau: tr('app.tacTu.mimi.themAgentOk', { ten }) }
                  : { dich: 'tac-tu.them', ok: false, cau: tr('app.tacTu.mimi.themAgentLoi') });
              }}
            />
          </section>
          {dsDangDung.length === 0 ? (
            <Trong>{tr('app.tacTu.ag.trong')}</Trong>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {dsDangDung.map((t) => (
                <TheTacTu
                  key={t.id}
                  t={t}
                  cs={chinhSach[t.id]}
                  suDung={suDung[t.id] ?? { ngay: 0, thang: 0 }}
                  soCho={soChoTheoAgent[t.id] ?? 0}
                  chuSoHuu={chuSoHuu}
                  dangLam={dangLam === t.id}
                  doiTrangThai={doiTrangThai}
                  xoayKhoa={xoayKhoa}
                  thuHoi={thuHoi}
                />
              ))}
            </div>
          )}
          {dsThuHoi.length > 0 && (
            <details className={`${khoi} px-4 py-3`}>
              <summary className={`cursor-pointer rounded text-sm text-muted-foreground ${vien}`}>{tr('app.tacTu.ag.daThuHoi', { n: dsThuHoi.length })}</summary>
              <ul className="mt-2 divide-y divide-border text-sm">
                {dsThuHoi.map((t) => (
                  <li key={t.id} className="flex justify-between gap-3 py-2">
                    <span className="truncate text-foreground">{t.ten}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{tr('app.tacTu.ag.lanCuoi', { luc: luc(t.dung_lan_cuoi) })}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* ── Chính sách ────────────────────────────────────────────── */}
      {tab === 'chinh-sach' && (
        <div id="khu-chinh-sach" role="tabpanel" aria-labelledby="tab-chinh-sach" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{tr('app.tacTu.cs.mo')}</p>
            <Link to="/dashboard/chinh-sach" className={`${nutPhu} shrink-0`}><SlidersHorizontal size={15} /> {tr('app.tacTu.dau.caiDatCs')}</Link>
          </div>
          <BangChinhSach ds={dsDangDung} chinhSach={chinhSach} soNguoiNhan={nguoiNhan.length} />
          <p className={`${khoi} flex items-start gap-2 p-3 text-xs text-muted-foreground`}>
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-foreground" />
            {tr('app.tacTu.cs.luonBat')}
          </p>
        </div>
      )}

      {/* ── Người nhận ────────────────────────────────────────────── */}
      {tab === 'nguoi-nhan' && (
        <div id="khu-nguoi-nhan" role="tabpanel" aria-labelledby="tab-nguoi-nhan">
          <KhuNguoiNhan
            nguoiNhan={nguoiNhan}
            yeuCau={yeuCau}
            dangLam={dangLam}
            them={async (du) => {
              const kq = await lam('nguoi_nhan', 'them_nguoi_nhan', du, tr('app.tacTu.toast.daThemNguoiNhan'));
              baoKetQua(kq !== null
                ? { dich: 'tac-tu.nguoi-nhan.them', ok: true, cau: tr('app.tacTu.mimi.themNnOk') }
                : { dich: 'tac-tu.nguoi-nhan.them', ok: false, cau: tr('app.tacTu.mimi.themNnLoi') });
            }}
            bo={boNguoiNhan}
            xem={(id) => setYeuCauMo(id)}
          />
        </div>
      )}

      {/* ── Nhật ký ───────────────────────────────────────────────── */}
      {tab === 'nhat-ky' && (
        <div id="khu-nhat-ky" role="tabpanel" aria-labelledby="tab-nhat-ky" className={khoi}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground"><ShieldCheck size={15} /> {tr('app.tacTu.nk.tieuDe')}</h2>
            <p className="text-xs text-muted-foreground">{tr('app.tacTu.nk.mo')}</p>
          </div>
          {nhatKy.length === 0 ? (
            <p className="px-4 py-5 text-sm text-muted-foreground">{tr('app.tacTu.nk.trong')}</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {nhatKy.map((n) => (
                <li key={n.id} className="grid gap-0.5 px-4 py-2.5 sm:grid-cols-[120px_70px_minmax(0,1fr)] sm:gap-3">
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">{luc(n.created_at)}</span>
                  <span className="text-xs text-muted-foreground">{n.nguoi === 'tac_tu' ? tr('app.tacTu.nk.agent') : n.nguoi === 'he_thong' ? tr('app.tacTu.nk.saoKe') : tr('app.tacTu.nk.ban')}</span>
                  <span className="min-w-0 text-foreground">
                    <span className="font-medium">
                      {n.su_kien === 'xin_chi' && n.nguoi === 'nguoi_dung' ? tr('app.tacTu.nk.taoYc') : tenSuKien(n.su_kien)}
                    </span>
                    {n.tac_tu_id && tenTacTu[n.tac_tu_id] ? ` · ${tenTacTu[n.tac_tu_id]}` : ''}
                    {chiTietNhatKy(n) && <span className="text-muted-foreground"> · {chiTietNhatKy(n)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Lớp phủ ───────────────────────────────────────────────── */}
      <Sheet open={yMo !== null} onOpenChange={(m) => { if (!m) setYeuCauMo(null); }}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          {yMo && (
            <PanelQuyetDinh
              key={yMo.id}
              y={yMo}
              tenTacTu={tenTacTu[yMo.tac_tu_id] ?? tr('app.tacTu.nguoiYc.agent')}
              nguoiYeuCau={nguoiYeuCau(yMo)}
              cs={chinhSach[yMo.tac_tu_id]}
              suDung={suDung[yMo.tac_tu_id]}
              dangLam={dangLam === yMo.id}
              duyet={(them) => void duyet(yMo, them)}
              tuChoi={() => setTuChoiMo(yMo)}
              huy={() => huy(yMo)}
            />
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={moTao} onOpenChange={setMoTao}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <FormTaoYeuCau
            ds={dsDangDung}
            chinhSach={chinhSach}
            suDung={suDung}
            nguoiNhan={nguoiNhan}
            dangGui={dangLam === 'tao_yeu_cau'}
            gui={(du) => void taoYeuCau(du)}
            moAgents={() => { setMoTao(false); chonTab('agents'); }}
          />
        </SheetContent>
      </Sheet>

      <HopTuChoi
        key={tuChoiMo?.id ?? 'dong'}
        y={tuChoiMo}
        dangLam={tuChoiMo ? dangLam === tuChoiMo.id : false}
        dongLai={() => setTuChoiMo(null)}
        xacNhan={async (ghiChu) => {
          if (!tuChoiMo) return;
          const y = tuChoiMo;
          setTuChoiMo(null);
          await tuChoi(y, ghiChu);
        }}
      />

      <HopXacMinh
        dauHieu={xacMinh?.dauHieu ?? null}
        lichSuDu={xacMinh?.lichSuDu ?? true}
        onHuy={() => setXacMinh(null)}
        onVanDuyet={() => {
          const x = xacMinh;
          setXacMinh(null);
          if (x) void duyet(x.y, x.themNguoiNhan, true);
        }}
      />
      <AlertDialog open={xacNhan !== null} onOpenChange={(m) => { if (!m) setXacNhan(null); }}>
        <AlertDialogContent className="rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{xacNhan?.tieuDe}</AlertDialogTitle>
            <AlertDialogDescription>{xacNhan?.mo}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">{tr('app.chung.huy')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { void xacNhan?.lam(); }}
              className={`rounded-lg ${xacNhan?.nguyHiem ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-foreground text-background hover:bg-foreground/85'}`}
            >
              {xacNhan?.nut}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ═══ Khối dùng chung ══════════════════════════════════════════════════ */

function Dem({ so }: { so: number }) {
  return <span className="rounded-full bg-accent px-1.5 text-[11px] font-semibold tabular-nums text-foreground">{so}</span>;
}

function Trong({ children }: { children: ReactNode }) {
  return <p className={`${khoi} px-4 py-5 text-sm text-muted-foreground`}>{children}</p>;
}

function DauKhu({ id, tieuDe, dem, phai }: { id: string; tieuDe: string; dem?: number; phai?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 id={id} className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {tieuDe} {dem !== undefined && dem > 0 && <Dem so={dem} />}
      </h2>
      {phai}
    </div>
  );
}

function ThanhTab({ tab, chon, dem }: { tab: KhoaTab; chon: (k: KhoaTab) => void; dem: Partial<Record<KhoaTab, ReactNode>> }) {
  const { t: tr } = useTranslation();
  const nut = useRef<Array<HTMLButtonElement | null>>([]);
  // Mũi tên trái/phải, Home, End — cách di chuyển giữa tab mà người dùng bàn phím chờ đợi.
  const khiPhim = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = CAC_TAB.length;
    const toi = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (toi === undefined) return;
    e.preventDefault();
    chon(CAC_TAB[toi].khoa);
    nut.current[toi]?.focus();
  };
  return (
    <div role="tablist" aria-label={tr('app.tacTu.tabList')} className="-mx-4 flex overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
      {CAC_TAB.map((t, i) => {
        const dang = t.khoa === tab;
        return (
          <button
            key={t.khoa}
            ref={(el) => { nut.current[i] = el; }}
            id={`tab-${t.khoa}`}
            role="tab"
            aria-selected={dang}
            aria-controls={`khu-${t.khoa}`}
            tabIndex={dang ? 0 : -1}
            data-mimi={`tac-tu.tab.${t.khoa}`}
            onClick={() => chon(t.khoa)}
            onKeyDown={(e) => khiPhim(e, i)}
            className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm transition-colors ${vienTrong} ${
              dang ? 'border-foreground font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tr(`app.tacTu.tab.${t.khoa}`)}
            {dem[t.khoa]}
          </button>
        );
      })}
    </div>
  );
}

/* ── KPI ───────────────────────────────────────────────────────────── */
function HangKpi({ kpi, moXemXet }: { kpi: Kpi; moXemXet: () => void }) {
  const { t: tr } = useTranslation();
  const chuaCo = kpi.coAgent ? null : tr('app.tacTu.kpi.chuaCoAgent');
  const ns = kpi.nganSachThang;
  const daDungPct = ns && Number(ns.tran) > 0 ? Math.min(100, Math.round((Number(truTien(ns.tran, ns.conLai)) / Number(ns.tran)) * 100)) : 0;
  return (
    <section
      aria-label={tr('app.tacTu.kpi.nhom')}
      data-mimi="tac-tu.kpi"
      className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4"
    >
      <TheKpi icon={ListChecks} nhan={tr('app.tacTu.kpi.canDuyet')} trong={chuaCo}
        gia={String(kpi.canDuyet)} phu={kpi.canDuyet > 0 ? tr('app.tacTu.kpi.choQuyet') : tr('app.tacTu.kpi.khongCho')} />
      <TheKpi icon={Receipt} nhan={tr('app.tacTu.kpi.chiHomNay')} trong={chuaCo}
        gia={dong(kpi.daChiHomNay.tong)}
        phu={tr('app.tacTu.kpi.chiHomNayPhu', { n: kpi.daChiHomNay.soKhoan, giu: dong(kpi.daGiuHomNay) })} />
      <TheKpi icon={Wallet} nhan={tr('app.tacTu.kpi.nganSach')}
        trong={ns ? null : kpi.coAgent ? tr('app.tacTu.kpi.chuaCoAgentHd') : tr('app.tacTu.kpi.chuaCoAgent')}
        gia={ns ? dong(ns.conLai) : ''}
        phu={ns ? tr('app.tacTu.kpi.nganSachPhu', { pct: daDungPct, tran: dong(ns.tran), n: ns.soAgent }) : undefined}
        thanh={ns ? daDungPct : undefined} />
      <TheKpi icon={AlertTriangle} nhan={tr('app.tacTu.kpi.canXem')} trong={chuaCo}
        gia={String(kpi.canXemXet)} phu={tr('app.tacTu.kpi.canXemPhu')}
        nhan_chu_y={kpi.canXemXet > 0} bam={kpi.coAgent ? moXemXet : undefined} />
    </section>
  );
}

function TheKpi({
  icon: Icon, nhan, gia, trong, phu, thanh, nhan_chu_y, bam,
}: {
  icon: typeof Wallet;
  nhan: string;
  gia: string;
  trong: string | null;
  phu?: string;
  thanh?: number;
  nhan_chu_y?: boolean;
  bam?: () => void;
}) {
  const { t: tr } = useTranslation();
  const noiDung = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="grid h-7 w-7 place-items-center rounded-md border border-border text-foreground" aria-hidden>
            <Icon size={14} />
          </span>
          {nhan}
          {nhan_chu_y && <span className="h-1.5 w-1.5 rounded-full bg-mimi-amber" aria-label={tr('app.tacTu.kpi.deMat')} />}
        </span>
        {bam && <ChevronRight size={16} className="text-muted-foreground" aria-hidden />}
      </span>
      {trong ? (
        <span className="mt-3 block text-sm text-muted-foreground">{trong}</span>
      ) : (
        <>
          <span className="mt-2 block font-mono text-2xl font-semibold tabular-nums text-foreground">{gia}</span>
          {thanh !== undefined && (
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-accent" aria-hidden>
              <span className={`block h-full rounded-full ${thanh >= MOC_GAN_CHAM_HAN_MUC * 100 ? 'bg-mimi-amber' : 'bg-foreground/70'}`} style={{ width: `${thanh}%` }} />
            </span>
          )}
          {phu && <span className="mt-1.5 block text-xs text-muted-foreground">{phu}</span>}
        </>
      )}
    </>
  );
  const lop = `min-w-[240px] shrink-0 snap-start rounded-lg border border-border bg-card p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:min-w-0`;
  return bam ? (
    <button onClick={bam} className={`${lop} transition-colors hover:bg-accent/50 ${vien}`}>{noiDung}</button>
  ) : (
    <div className={lop}>{noiDung}</div>
  );
}

/* ── Nhãn trạng thái ───────────────────────────────────────────────── */
const LOP_TRANG_THAI: Record<TrangThaiHienThi, string> = {
  dang_cho: 'bg-accent text-muted-foreground',
  can_xem_xet: 'border border-foreground/20 bg-card text-foreground',
  da_duyet: 'bg-mimi-green/10 text-mimi-green',
  tu_choi: 'bg-destructive/10 text-destructive',
};

function NhanTrangThai({ y }: { y: YeuCau }) {
  useTranslation();
  const tt = trangThaiHienThi(y);
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${LOP_TRANG_THAI[tt]}`}>
      {tt === 'can_xem_xet' && <span className="h-1.5 w-1.5 rounded-full bg-mimi-amber" aria-hidden />}
      {nhanTrangThaiYc(tt)}
    </span>
  );
}

/* ── Bảng yêu cầu ──────────────────────────────────────────────────── */
interface HanhDongBang {
  tenTacTu: Record<string, string>;
  nguoiYeuCau: (y: YeuCau) => string;
  dangLam: string | null;
  xem: (id: string) => void;
  duyet: (y: YeuCau) => void;
  tuChoi: (y: YeuCau) => void;
}

function BangYeuCau({ rows, ...hd }: { rows: YeuCau[] } & HanhDongBang) {
  const { t: tr } = useTranslation();
  return (
    <>
      <div className={`hidden overflow-x-auto md:block ${khoi}`}>
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-border bg-accent/50 text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">{tr('app.tacTu.bang.nguoiYc')}</th>
              <th scope="col" className="px-3 py-2 font-medium">{tr('app.tacTu.bang.agent')}</th>
              <th scope="col" className="px-3 py-2 font-medium">{tr('app.tacTu.bang.ncc')}</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">{tr('app.tacTu.bang.soTien')}</th>
              <th scope="col" className="px-3 py-2 font-medium">{tr('app.tacTu.bang.chinhSach')}</th>
              <th scope="col" className="px-3 py-2 font-medium">{tr('app.tacTu.bang.trangThai')}</th>
              <th scope="col" className="px-3 py-2 font-medium">{tr('app.tacTu.bang.thoiGian')}</th>
              <th scope="col" className="px-3 py-2"><span className="sr-only">{tr('app.tacTu.bang.hanhDong')}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((y) => (
              <tr key={y.id} className="align-middle transition-colors hover:bg-accent/40">
                <td className="px-3 py-2.5 font-medium text-foreground">{hd.nguoiYeuCau(y)}</td>
                <td className="px-3 py-2.5">
                  <span className="block max-w-[150px] truncate text-foreground">{hd.tenTacTu[y.tac_tu_id] ?? '—'}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="block max-w-[220px] truncate text-foreground">{y.ten_nguoi_nhan ?? tr('app.chung.chuaRoTen')}</span>
                  <span className="block max-w-[220px] truncate text-xs text-muted-foreground">{y.muc_dich}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono font-semibold tabular-nums text-foreground">{dong(y.so_tien)}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                  <span className="block max-w-[170px] truncate">{tomTatLuat(y)}</span>
                </td>
                <td className="px-3 py-2.5">
                  <NhanTrangThai y={y} />
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">{giaiDoan(y)}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-muted-foreground tabular-nums">{luc(y.created_at)}</td>
                <td className="px-3 py-2.5"><NutHang y={y} {...hd} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 md:hidden">
        {rows.map((y) => (
          <li key={y.id} className={`${khoi} p-3`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{y.ten_nguoi_nhan ?? tr('app.chung.chuaRoTen')}</p>
                <p className="truncate text-xs text-muted-foreground">{hd.nguoiYeuCau(y)} · {hd.tenTacTu[y.tac_tu_id] ?? tr('app.tacTu.nguoiYc.agent')} · {luc(y.created_at)}</p>
              </div>
              <NhanTrangThai y={y} />
            </div>
            <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-foreground">{dong(y.so_tien)}</p>
            <p className="truncate text-xs text-muted-foreground">{y.muc_dich}</p>
            <p className="mt-1 text-xs text-muted-foreground">{tr('app.tacTu.bang.chinhSachDong', { luat: tomTatLuat(y), giai: giaiDoan(y) })}</p>
            <div className="mt-3"><NutHang y={y} diDong {...hd} /></div>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * Duyệt nhanh ngay trên dòng chỉ cho khoản "Đang chờ". Khoản "Cần xem xét"
 * (người nhận mới, đổi số tài khoản) phải mở khung chi tiết để đọc cảnh báo trước.
 */
function NutHang({ y, diDong, dangLam, xem, duyet, tuChoi }: { y: YeuCau; diDong?: boolean } & HanhDongBang) {
  const chinh = diDong ? nutChinh : nutNhoChinh;
  const phu = diDong ? nutPhu : nutNhoPhu;
  const dang = dangLam === y.id;
  const lop = diDong ? 'grid grid-cols-3 gap-2' : 'flex justify-end gap-1.5';
  const { t: tr } = useTranslation();

  if (y.trang_thai === 'cho_duyet') {
    const canXem = trangThaiHienThi(y) === 'can_xem_xet';
    return (
      <div className={lop}>
        {canXem ? (
          <button onClick={() => xem(y.id)} className={`${chinh} ${diDong ? 'col-span-2' : ''}`}>
            <AlertTriangle size={13} /> {tr('app.tacTu.nut.xemXet')}
          </button>
        ) : (
          <button data-mimi="tac-tu.duyet" data-mimi-khong-tu-bam disabled={dang} onClick={() => duyet(y)} className={chinh}>
            {dang ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {tr('app.tacTu.nut.duyet')}
          </button>
        )}
        <button data-mimi="tac-tu.tu-choi" data-mimi-khong-tu-bam disabled={dang} onClick={() => tuChoi(y)} className={phu}>
          {tr('app.tacTu.nut.tuChoi')}
        </button>
        {!canXem && <button onClick={() => xem(y.id)} className={phu}>{tr('app.chung.xem')}</button>}
      </div>
    );
  }
  if (y.trang_thai === 'da_duyet') {
    return (
      <div className={lop}>
        <button onClick={() => xem(y.id)} className={`${chinh} ${diDong ? 'col-span-3' : ''}`}><QrCode size={13} /> {tr('app.tacTu.nut.tra')}</button>
      </div>
    );
  }
  return (
    <div className={lop}>
      <button onClick={() => xem(y.id)} className={`${phu} ${diDong ? 'col-span-3' : ''}`}>{tr('app.chung.xem')}</button>
    </div>
  );
}

/* ── Biểu đồ ───────────────────────────────────────────────────────── */
function BieuDoGiu({ ds }: { ds: Array<{ ngay: number; tong: number }> }) {
  const { t: tr } = useTranslation();
  const max = Math.max(0, ...ds.map((d) => d.tong));
  if (max === 0) return <p className="mt-4 text-sm text-muted-foreground">{tr('app.tacTu.bd.trong')}</p>;
  return (
    <figure className="mt-3">
      <p className="text-[11px] text-muted-foreground">{tr('app.tacTu.bd.caoNhat')} <span className="font-mono tabular-nums text-foreground">{dong(max)}</span></p>
      <div className="mt-2 flex h-32 items-end gap-[3px] border-b border-border" aria-hidden>
        {ds.map((d) => (
          <div
            key={d.ngay}
            title={tr('app.tacTu.bd.ngayTien', { ngay: d.ngay, tien: dong(d.tong) })}
            className={`flex-1 rounded-t-sm ${d.tong > 0 ? 'bg-foreground/70 hover:bg-foreground' : 'bg-accent'}`}
            style={{ height: d.tong > 0 ? `${Math.max(3, (d.tong / max) * 100)}%` : '2px' }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground" aria-hidden>
        <span>01</span>
        <span>{String(ds.length).padStart(2, '0')}</span>
      </div>
      <table className="sr-only">
        <caption>{tr('app.tacTu.bd.caption')}</caption>
        <tbody>
          {ds.filter((d) => d.tong > 0).map((d) => (
            <tr key={d.ngay}><th scope="row">{tr('app.tacTu.bd.ngay', { ngay: d.ngay })}</th><td>{dong(d.tong)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/* ── Cần chú ý, thao tác nhanh ─────────────────────────────────────── */
function MucCanChuY({ m, mo }: { m: MucChuY; mo: () => void }) {
  const cham = { nguy: 'bg-destructive', canh_bao: 'bg-mimi-amber', thong_tin: 'bg-muted-foreground' }[m.muc];
  return (
    <button onClick={mo} className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 ${vienTrong}`}>
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cham}`} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{m.tieuDe}</span>
        <span className="block text-xs text-muted-foreground">{m.mo}</span>
        {m.luc && <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground tabular-nums">{luc(m.luc)}</span>}
      </span>
      <ChevronRight size={15} className="mt-1 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}

function ThaoTacNhanh({ icon: Icon, ten, mo, to, bam }: { icon: typeof Wallet; ten: string; mo: string; to?: string; bam?: () => void }) {
  const noiDung = (
    <>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border text-foreground" aria-hidden><Icon size={15} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{ten}</span>
        <span className="block truncate text-xs text-muted-foreground">{mo}</span>
      </span>
      <ChevronRight size={15} className="shrink-0 text-muted-foreground" aria-hidden />
    </>
  );
  const lop = `flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/50 ${vienTrong}`;
  return to ? <Link to={to} className={lop}>{noiDung}</Link> : <button onClick={bam} className={lop}>{noiDung}</button>;
}

/* ── Agent ─────────────────────────────────────────────────────────── */
interface HanhDongAgent {
  doiTrangThai: (t: TacTu, tt: 'hoat_dong' | 'tam_dung') => void;
  xoayKhoa: (t: TacTu) => void;
  thuHoi: (t: TacTu) => void;
}

function ChamTrangThaiAgent({ tt }: { tt: string }) {
  const lop = tt === 'hoat_dong' ? 'bg-mimi-green' : tt === 'tam_dung' ? 'bg-muted-foreground' : 'bg-destructive/60';
  return <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${lop}`} aria-hidden />;
}

function NhanTrangThaiAgent({ tt }: { tt: string }) {
  const lop = tt === 'hoat_dong' ? 'bg-mimi-green/10 text-mimi-green' : 'bg-accent text-muted-foreground';
  useTranslation();
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${lop}`}>
      <ChamTrangThaiAgent tt={tt} /> {tenTrangThaiTacTu(tt)}
    </span>
  );
}

function MenuTacTu({ t, dangLam, doiTrangThai, xoayKhoa, thuHoi }: { t: TacTu; dangLam: boolean } & HanhDongAgent) {
  const { t: tr } = useTranslation();
  return (
    // modal={false}: menu mở hộp xác nhận; menu modal để lại khoá con trỏ trên trang sau khi hộp đóng.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button aria-label={tr('app.tacTu.menu.hanhDongCho', { ten: t.ten })} disabled={dangLam} className={`${nutNho} w-8 px-0 text-muted-foreground hover:bg-accent hover:text-foreground`}>
          {dangLam ? <Loader2 size={15} className="animate-spin" /> : <MoreHorizontal size={16} />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-lg">
        {t.trang_thai === 'hoat_dong' ? (
          <DropdownMenuItem onSelect={() => doiTrangThai(t, 'tam_dung')}><Pause size={14} className="mr-2" /> {tr('app.tacTu.menu.tamDung')}</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => doiTrangThai(t, 'hoat_dong')}><Play size={14} className="mr-2" /> {tr('app.tacTu.menu.batLai')}</DropdownMenuItem>
        )}
        <DropdownMenuItem data-mimi="tac-tu.khoa-moi" data-mimi-khong-tu-bam onSelect={() => xoayKhoa(t)}>
          <KeyRound size={14} className="mr-2" /> {tr('app.tacTu.menu.khoaMoi')}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`/dashboard/chinh-sach?agent=${t.id}`}><SlidersHorizontal size={14} className="mr-2" /> {tr('app.tacTu.menu.suaCs')}</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-mimi="tac-tu.thu-hoi"
          data-mimi-khong-tu-bam
          onSelect={() => thuHoi(t)}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <Trash2 size={14} className="mr-2" /> {tr('app.tacTu.menu.thuHoi')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Hạn mức còn lại, không âm, chính xác tới đồng. */
const conLaiTien = (tran: TienVND, daDung: TienVND): TienVND => {
  const c = truTien(tran, daDung);
  return soSanhTien(c, 0) > 0 ? c : 0;
};

function ThanhDung({ nhan, da, tran }: { nhan: string; da: TienVND; tran: TienVND }) {
  // Độ dài thanh chỉ cần gần đúng; số in ra lấy giá trị chính xác.
  const pct = Number(tran) > 0 ? Math.min(100, (Number(da) / Number(tran)) * 100) : 100;
  const { t: tr } = useTranslation();
  return (
    <div>
      <div className="flex justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{nhan}</span>
        <span className="font-mono tabular-nums text-foreground">{dong(da)} <span className="text-muted-foreground">/ {dong(tran)}</span></span>
      </div>
      <div
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-accent"
        role="progressbar"
        aria-label={tr('app.tacTu.thanhDung', { nhan, da: dong(da), tran: dong(tran) })}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <div className={`h-full rounded-full ${pct >= MOC_GAN_CHAM_HAN_MUC * 100 ? 'bg-mimi-amber' : 'bg-foreground/70'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function BangAgent({
  ds, chinhSach, suDung, soCho, chuSoHuu, dangLam, ...hd
}: {
  ds: TacTu[];
  chinhSach: Record<string, ChinhSachRow>;
  suDung: Record<string, { ngay: TienVND; thang: TienVND }>;
  soCho: Record<string, number>;
  chuSoHuu: string;
  dangLam: string | null;
} & HanhDongAgent) {
  const { t: tr } = useTranslation();
  return (
    <>
      <div className={`hidden overflow-x-auto md:block ${khoi}`}>
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-border bg-accent/50 text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">{tr('app.tacTu.agentBang.agent')}</th>
              <th scope="col" className="px-3 py-2 font-medium">{tr('app.tacTu.agentBang.chuSoHuu')}</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">{tr('app.tacTu.agentBang.dangCho')}</th>
              <th scope="col" className="px-3 py-2 font-medium">{tr('app.tacTu.agentBang.homNay')}</th>
              <th scope="col" className="px-3 py-2 font-medium">{tr('app.tacTu.agentBang.thangNay')}</th>
              <th scope="col" className="px-3 py-2 font-medium">{tr('app.tacTu.agentBang.ganNhat')}</th>
              <th scope="col" className="px-3 py-2 font-medium">{tr('app.tacTu.agentBang.trangThai')}</th>
              <th scope="col" className="px-3 py-2"><span className="sr-only">{tr('app.tacTu.bang.hanhDong')}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ds.map((t) => {
              const cs = chinhSach[t.id];
              const su = suDung[t.id] ?? { ngay: 0, thang: 0 };
              return (
                <tr key={t.id} className="align-middle">
                  <td className="px-3 py-2.5">
                    <span className="block max-w-[180px] truncate font-medium text-foreground">{t.ten}</span>
                    <span className="block max-w-[180px] truncate text-xs text-muted-foreground">{t.mo_ta ?? tr('app.tacTu.agentBang.chuaMoTa')}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-[10px] font-semibold text-foreground" aria-hidden>{chuCai(chuSoHuu)}</span>
                      <span className="max-w-[150px] truncate text-xs text-foreground" title={chuSoHuu}>{chuSoHuu}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-foreground">{soCho[t.id] ?? 0}</td>
                  <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-foreground">{cs ? `${dong(su.ngay)} / ${dong(cs.han_muc_ngay)}` : '—'}</td>
                  <td className="w-44 px-3 py-2.5">{cs ? <ThanhDung nhan="" da={su.thang} tran={cs.han_muc_thang} /> : <span className="text-xs text-muted-foreground">{tr('app.tacTu.agentBang.chuaCs')}</span>}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-muted-foreground tabular-nums">{t.dung_lan_cuoi ? luc(t.dung_lan_cuoi) : tr('app.tacTu.agentBang.chuaGoi')}</td>
                  <td className="px-3 py-2.5"><NhanTrangThaiAgent tt={t.trang_thai} /></td>
                  <td className="px-3 py-2.5 text-right"><MenuTacTu t={t} dangLam={dangLam === t.id} {...hd} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="grid gap-2 md:hidden">
        {ds.map((t) => (
          <TheTacTu
            key={t.id}
            t={t}
            cs={chinhSach[t.id]}
            suDung={suDung[t.id] ?? { ngay: 0, thang: 0 }}
            soCho={soCho[t.id] ?? 0}
            chuSoHuu={chuSoHuu}
            dangLam={dangLam === t.id}
            {...hd}
          />
        ))}
      </div>
    </>
  );
}

function TheTacTu({
  t, cs, suDung, soCho, chuSoHuu, dangLam, ...hd
}: {
  t: TacTu;
  cs: ChinhSachRow | undefined;
  suDung: { ngay: TienVND; thang: TienVND };
  soCho: number;
  chuSoHuu: string;
  dangLam: boolean;
} & HanhDongAgent) {
  const { t: tr } = useTranslation();
  const tomTat = cs ? tomTatChinhSach(cs, 0) : null;
  return (
    <article className={`${khoi} p-4`} aria-label={tr('app.tacTu.the.aria', { ten: t.ten })}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">{t.ten}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ChamTrangThaiAgent tt={t.trang_thai} />
            {tenTrangThaiTacTu(t.trang_thai)}
          </p>
        </div>
        <MenuTacTu t={t} dangLam={dangLam} {...hd} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div className="min-w-0"><dt className="text-muted-foreground">{tr('app.tacTu.agentBang.chuSoHuu')}</dt><dd className="truncate text-foreground" title={chuSoHuu}>{chuSoHuu}</dd></div>
        <div><dt className="text-muted-foreground">{tr('app.tacTu.the.choDuyet')}</dt><dd className="text-foreground"><Trans i18nKey="app.tacTu.the.soYc" values={{ n: soCho }} components={{ s: <span className="font-mono tabular-nums" /> }} /></dd></div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">{tr('app.tacTu.the.chinhSach')}</dt>
          <dd className="truncate text-foreground">{tomTat ? tr('app.tacTu.the.duyet', { duyet: tomTat.duyet }) : tr('app.tacTu.the.chuaCo')}</dd>
        </div>
        <div><dt className="text-muted-foreground">{tr('app.tacTu.agentBang.ganNhat')}</dt><dd className="font-mono tabular-nums text-foreground">{t.dung_lan_cuoi ? luc(t.dung_lan_cuoi) : tr('app.tacTu.agentBang.chuaGoi')}</dd></div>
      </dl>
      {cs && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <ThanhDung nhan={tr('app.tacTu.agentBang.homNay')} da={suDung.ngay} tran={cs.han_muc_ngay} />
          <ThanhDung nhan={tr('app.tacTu.agentBang.thangNay')} da={suDung.thang} tran={cs.han_muc_thang} />
        </div>
      )}
    </article>
  );
}

function ThemTacTu({ tao, dangLam }: { tao: (ten: string, moTa: string) => void; dangLam: boolean }) {
  const [ten, setTen] = useState('');
  const [moTa, setMoTa] = useState('');
  const { t: tr } = useTranslation();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        tao(ten.trim(), moTa.trim());
        setTen('');
        setMoTa('');
      }}
      className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
    >
      <label className="block">
        <span className="sr-only">{tr('app.tacTu.themAg.ten')}</span>
        <input data-mimi="tac-tu.ten" value={ten} onChange={(e) => setTen(e.target.value)} placeholder={tr('app.tacTu.themAg.ten')} maxLength={80} className={o} />
      </label>
      <label className="block">
        <span className="sr-only">{tr('app.tacTu.themAg.lamGi')}</span>
        <input value={moTa} onChange={(e) => setMoTa(e.target.value)} placeholder={tr('app.tacTu.themAg.lamGiPh')} maxLength={300} className={o} />
      </label>
      <button data-mimi="tac-tu.them" data-mimi-khong-tu-bam disabled={dangLam || ten.trim().length < 2} className={nutChinh}>
        {dangLam ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} {tr('app.tacTu.themAg.nut')}
      </button>
    </form>
  );
}

/* ── Chính sách ────────────────────────────────────────────────────── */
function BangChinhSach({ ds, chinhSach, soNguoiNhan }: { ds: TacTu[]; chinhSach: Record<string, ChinhSachRow>; soNguoiNhan: number }) {
  const { t: tr } = useTranslation();
  const coCs = ds.filter((t) => chinhSach[t.id]);
  if (coCs.length === 0) return <Trong>{tr('app.tacTu.bangCs.trong')}</Trong>;
  const tenNhom = (cs: ChinhSachRow) =>
    cs.nhom_chi_duoc_phep === null ? tr('app.tacTu.bangCs.moiNhom') : cs.nhom_chi_duoc_phep.map((n) => tenNhomChi(n)).join(', ');
  return (
    <>
      <div className={`hidden overflow-x-auto md:block ${khoi}`}>
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border bg-accent/50 text-left text-xs text-muted-foreground">
            <tr>
              {(['agent', 'phaiDuyet', 'moiKhoan', 'moiNgay', 'moiThang', 'nhomChi', 'nguoiLa', 'tanSuat', 'hetHan'] as const).map((c) => (
                <th key={c} scope="col" className="px-3 py-2 font-medium">{tr(`app.tacTu.bangCs.cot.${c}`)}</th>
              ))}
              <th scope="col" className="px-3 py-2"><span className="sr-only">{tr('app.chung.sua')}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {coCs.map((t) => {
              const cs = chinhSach[t.id];
              const tt = tomTatChinhSach(cs, soNguoiNhan);
              return (
                <tr key={t.id}>
                  <td className="px-3 py-2.5 font-medium text-foreground">{t.ten}</td>
                  <td className="px-3 py-2.5">{tt.duyet}</td>
                  <td className="px-3 py-2.5 font-mono tabular-nums">{dong(cs.han_muc_moi_lan)}</td>
                  <td className="px-3 py-2.5 font-mono tabular-nums">{dong(cs.han_muc_ngay)}</td>
                  <td className="px-3 py-2.5 font-mono tabular-nums">{dong(cs.han_muc_thang)}</td>
                  <td className="max-w-[200px] truncate px-3 py-2.5" title={tenNhom(cs)}>{tenNhom(cs)}</td>
                  <td className="px-3 py-2.5">{tt['nguoi-la']}</td>
                  <td className="px-3 py-2.5">{tt['tan-suat']}</td>
                  <td className="px-3 py-2.5">{tt['het-han']}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Link to={`/dashboard/chinh-sach?agent=${t.id}`} className={nutNhoPhu}>{tr('app.chung.sua')}</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {coCs.map((t) => {
          const cs = chinhSach[t.id];
          const tt = tomTatChinhSach(cs, soNguoiNhan);
          return (
            <li key={t.id} className={`${khoi} p-3`}>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-foreground">{t.ten}</p>
                <Link to={`/dashboard/chinh-sach?agent=${t.id}`} className={nutPhu}>{tr('app.chung.sua')}</Link>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <dt className="text-muted-foreground">{tr('app.tacTu.bangCs.cot.phaiDuyet')}</dt><dd>{tt.duyet}</dd>
                <dt className="text-muted-foreground">{tr('app.tacTu.bangCs.moiKhoanNgay')}</dt><dd className="font-mono tabular-nums">{dong(cs.han_muc_moi_lan)} / {dong(cs.han_muc_ngay)}</dd>
                <dt className="text-muted-foreground">{tr('app.tacTu.bangCs.cot.moiThang')}</dt><dd className="font-mono tabular-nums">{dong(cs.han_muc_thang)}</dd>
                <dt className="text-muted-foreground">{tr('app.tacTu.bangCs.cot.nhomChi')}</dt><dd>{tenNhom(cs)}</dd>
                <dt className="text-muted-foreground">{tr('app.tacTu.bangCs.cot.nguoiLa')}</dt><dd>{tt['nguoi-la']}</dd>
                <dt className="text-muted-foreground">{tr('app.tacTu.bangCs.tanSuatHetHan')}</dt><dd>{tt['tan-suat']} · {tt['het-han']}</dd>
              </dl>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/* ── Người nhận ────────────────────────────────────────────────────── */
function KhuNguoiNhan({
  nguoiNhan, yeuCau, dangLam, them, bo, xem,
}: {
  nguoiNhan: NguoiNhan[];
  yeuCau: YeuCau[];
  dangLam: string | null;
  them: (du: Record<string, unknown>) => void;
  bo: (n: NguoiNhan) => void;
  xem: (id: string) => void;
}) {
  const [tim, setTim] = useState('');
  const [nganHang, setNganHang] = useState('tat_ca');
  const [giu, setGiu] = useState<'tat_ca' | 'moi' | 'du'>('tat_ca');
  const { t: tr } = useTranslation();
  const now = new Date();
  const doiTk = yeuCauDoiTaiKhoan(yeuCau);
  const trungTen = nhomTrungTen(nguoiNhan);
  const idTrungTen = new Set(trungTen.flat().map((n) => n.id));
  const binCo = [...new Set(nguoiNhan.map((n) => n.ngan_hang_bin))];
  const ds = nguoiNhan.filter((n) => {
    const g = thoiGianGiu(n, now);
    return (
      (nganHang === 'tat_ca' || n.ngan_hang_bin === nganHang) &&
      (giu === 'tat_ca' || (giu === 'moi' ? g.moi : !g.moi)) &&
      khopTuKhoa([n.ten_chu_tai_khoan, n.so_tai_khoan, n.ghi_chu, tenNganHang(n.ngan_hang_bin)], tim)
    );
  });
  const nhanGiu = (n: NguoiNhan) => {
    const g = thoiGianGiu(n, now);
    return g.moi ? tr('app.tacTu.nn.moiThem', { gio: g.conGio }) : tr('app.tacTu.nn.du24');
  };

  return (
    <div className="space-y-4">
      {doiTk.length > 0 && (
        <section aria-labelledby="nn-doi-tk" className="rounded-lg border border-destructive/40 bg-card p-4">
          <h2 id="nn-doi-tk" className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle size={15} /> {tr('app.tacTu.nn.doiTk')}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {tr('app.tacTu.nn.doiTkMo')}
          </p>
          <ul className="mt-2 divide-y divide-border">
            {doiTk.map((y) => (
              <li key={y.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0 text-foreground">
                  {y.ten_nguoi_nhan ?? tr('app.chung.chuaRoTen')} <span className="text-muted-foreground">· {tenNganHang(y.ngan_hang_bin)} · <span className="font-mono">{y.so_tai_khoan}</span> · {dong(y.so_tien)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <NhanTrangThai y={y} />
                  <button onClick={() => xem(y.id)} className={nutNhoPhu}>{tr('app.chung.xem')}</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {trungTen.length > 0 && (
        <section aria-labelledby="nn-trung-ten" className={`${khoi} p-4`}>
          <h2 id="nn-trung-ten" className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="h-2 w-2 rounded-full bg-mimi-amber" aria-hidden /> {tr('app.tacTu.nn.trungTen')}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{tr('app.tacTu.nn.trungTenMo')}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {trungTen.map((g) => (
              <li key={g[0].id} className="text-foreground">
                {g[0].ten_chu_tai_khoan}: <span className="font-mono text-muted-foreground">{g.map((n) => `${tenNganHang(n.ngan_hang_bin)} ${n.so_tai_khoan}`).join(' · ')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="nn-them" className={`${khoi} p-4`}>
        <h2 id="nn-them" className="text-sm font-semibold text-foreground">{tr('app.tacTu.nn.them')}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {tr('app.tacTu.nn.themMo')}
        </p>
        <ThemNguoiNhan dangLam={dangLam === 'nguoi_nhan'} them={them} />
      </section>

      <div className="flex flex-col gap-2 md:flex-row">
        <label className="relative block md:flex-1">
          <span className="sr-only">{tr('app.tacTu.nn.tim')}</span>
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input type="search" value={tim} onChange={(e) => setTim(e.target.value)} placeholder={tr('app.tacTu.nn.timPh')} className={`${o} pl-8`} />
        </label>
        <label className="block md:w-56">
          <span className="sr-only">{tr('app.tacTu.nn.locNh')}</span>
          <select value={nganHang} onChange={(e) => setNganHang(e.target.value)} className={o}>
            <option value="tat_ca">{tr('app.tacTu.nn.moiNh')}</option>
            {binCo.map((b) => <option key={b} value={b}>{tenNganHang(b)}</option>)}
          </select>
        </label>
        <label className="block md:w-56">
          <span className="sr-only">{tr('app.tacTu.nn.locGiu')}</span>
          <select value={giu} onChange={(e) => setGiu(e.target.value as typeof giu)} className={o}>
            <option value="tat_ca">{tr('app.tacTu.nn.moiTt')}</option>
            <option value="moi">{tr('app.tacTu.nn.moi')}</option>
            <option value="du">{tr('app.tacTu.nn.du24')}</option>
          </select>
        </label>
      </div>

      {nguoiNhan.length === 0 ? (
        <Trong>{tr('app.tacTu.nn.trong')}</Trong>
      ) : ds.length === 0 ? (
        <Trong>{tr('app.tacTu.nn.khongKhop')}</Trong>
      ) : (
        <>
          <div className={`hidden overflow-x-auto md:block ${khoi}`}>
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-border bg-accent/50 text-left text-xs text-muted-foreground">
                <tr>
                  {(['chuTk', 'nganHang', 'stk', 'ghiChu', 'trangThai', 'themLuc'] as const).map((c) => (
                    <th key={c} scope="col" className="px-3 py-2 font-medium">{tr(`app.tacTu.nn.cot.${c}`)}</th>
                  ))}
                  <th scope="col" className="px-3 py-2"><span className="sr-only">{tr('app.tacTu.nn.bo')}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ds.map((n) => (
                  <tr key={n.id}>
                    <td className="px-3 py-2.5 font-medium text-foreground">
                      <span className="flex items-center gap-1.5">
                        {idTrungTen.has(n.id) && <span className="h-1.5 w-1.5 rounded-full bg-mimi-amber" aria-label={tr('app.tacTu.nn.trungTenAria')} />}
                        {n.ten_chu_tai_khoan}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{tenNganHang(n.ngan_hang_bin)}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">{n.so_tai_khoan}</td>
                    <td className="max-w-[180px] truncate px-3 py-2.5 text-muted-foreground">{n.ghi_chu ?? '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{nhanGiu(n)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-muted-foreground tabular-nums">{luc(n.created_at)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button data-mimi="tac-tu.nguoi-nhan.xoa" data-mimi-khong-tu-bam onClick={() => bo(n)} aria-label={tr('app.tacTu.nn.boTen', { ten: n.ten_chu_tai_khoan })} className={`${nutNho} w-8 px-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive`}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2 md:hidden">
            {ds.map((n) => (
              <li key={n.id} className={`${khoi} flex items-start justify-between gap-3 p-3`}>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    {idTrungTen.has(n.id) && <span className="h-1.5 w-1.5 rounded-full bg-mimi-amber" aria-label={tr('app.tacTu.nn.trungTenAria')} />}
                    <span className="truncate">{n.ten_chu_tai_khoan}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{tenNganHang(n.ngan_hang_bin)} · <span className="font-mono">{n.so_tai_khoan}</span></p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{nhanGiu(n)}{n.ghi_chu ? ` · ${n.ghi_chu}` : ''}</p>
                </div>
                <button data-mimi="tac-tu.nguoi-nhan.xoa" data-mimi-khong-tu-bam onClick={() => bo(n)} aria-label={tr('app.tacTu.nn.boTen', { ten: n.ten_chu_tai_khoan })} className={`${nutPhu} w-11 shrink-0 px-0 text-muted-foreground hover:text-destructive`}>
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ThemNguoiNhan({ them, dangLam }: { them: (du: Record<string, unknown>) => void; dangLam: boolean }) {
  const [bin, setBin] = useState(DANH_SACH_NGAN_HANG[0]?.bin ?? '');
  const [stk, setStk] = useState('');
  const [ten, setTen] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const { t: tr } = useTranslation();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        them({ ngan_hang_bin: bin, so_tai_khoan: stk, ten_chu_tai_khoan: ten, ghi_chu: ghiChu || null });
        setStk('');
        setTen('');
        setGhiChu('');
      }}
      className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]"
    >
      <label className="block"><span className="sr-only">{tr('app.tacTu.nn.form.nganHang')}</span>
        <select data-mimi="tac-tu.nguoi-nhan.ngan-hang" value={bin} onChange={(e) => setBin(e.target.value)} className={o}>
          {DANH_SACH_NGAN_HANG.map((n) => <option key={n.bin} value={n.bin}>{n.ten}</option>)}
        </select>
      </label>
      <label className="block"><span className="sr-only">{tr('app.tacTu.nn.form.stk')}</span>
        <input data-mimi="tac-tu.nguoi-nhan.stk" value={stk} onChange={(e) => setStk(e.target.value)} placeholder={tr('app.tacTu.nn.form.stk')} inputMode="numeric" className={o} />
      </label>
      <label className="block"><span className="sr-only">{tr('app.tacTu.nn.form.tenChu')}</span>
        <input data-mimi="tac-tu.nguoi-nhan.ten" value={ten} onChange={(e) => setTen(e.target.value)} placeholder={tr('app.tacTu.nn.form.tenChu')} className={o} />
      </label>
      <label className="block"><span className="sr-only">{tr('app.tacTu.nn.form.ghiChu')}</span>
        <input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder={tr('app.tacTu.nn.form.ghiChu')} className={o} />
      </label>
      <button data-mimi="tac-tu.nguoi-nhan.them" data-mimi-khong-tu-bam disabled={dangLam || stk.length < 6 || ten.trim().length < 2} className={nutChinh}>
        <Plus size={14} /> {tr('app.tacTu.nn.form.them')}
      </button>
    </form>
  );
}

/* ── Panel quyết định ──────────────────────────────────────────────── */
// Chữ đọc cho trình đọc màn hình lấy từ bộ dịch: app.tacTu.buoc.<trạng thái>.
const KIEU_BUOC: Record<TrangThaiBuoc, { cham: string }> = {
  xong: { cham: 'border-mimi-green bg-mimi-green' },
  dang: { cham: 'border-foreground bg-card' },
  cho: { cham: 'border-border bg-card' },
  dung: { cham: 'border-border bg-accent' },
};

function PanelQuyetDinh({
  y, tenTacTu, nguoiYeuCau, cs, suDung, dangLam, duyet, tuChoi, huy,
}: {
  y: YeuCau;
  tenTacTu: string;
  nguoiYeuCau: string;
  cs: ChinhSachRow | undefined;
  suDung: { ngay: TienVND; thang: TienVND } | undefined;
  dangLam: boolean;
  duyet: (themNguoiNhan: boolean) => void;
  tuChoi: () => void;
  huy: () => void;
}) {
  const [themNguoiNhan, setThemNguoiNhan] = useState(false);
  const [hienQr, setHienQr] = useState(false);
  const { t: tr } = useTranslation();
  const luat = luatDaKhop(y);
  const ghiChuNguoi = lyDoCua(y).find((l) => l.ma === 'NGUOI_DUYET_TU_CHOI');
  const kq = ketQuaDanhGia(y);
  const ns = nganSachQuanhKhoan(y, cs, suDung, new Date());
  const choDuyet = y.trang_thai === 'cho_duyet';
  const nguoiLa = luat.some((l) => l.ma === 'NGUOI_NHAN_MOI');
  const doiTk = luat.some((l) => l.ma === 'DOI_SO_TAI_KHOAN');
  const quaHan = y.trang_thai === 'da_duyet' && y.het_han_luc ? new Date(y.het_han_luc).getTime() < Date.now() : false;

  const ketQua = {
    duyet: { chu: tr('app.tacTu.pq.duyet'), mo: tr('app.tacTu.pq.duyetMo'), lop: 'text-mimi-green', icon: <Check size={16} /> },
    tu_choi: { chu: tr('app.tacTu.pq.tuChoi'), mo: tr('app.tacTu.pq.tuChoiMo'), lop: 'text-destructive', icon: <X size={16} /> },
    can_nguoi: {
      chu: tr('app.tacTu.pq.canNguoi'),
      mo: y.cach_quyet === 'nguoi_duyet' ? (y.trang_thai === 'tu_choi' ? tr('app.tacTu.pq.canNguoiTuChoi') : tr('app.tacTu.pq.canNguoiDuyet')) : tr('app.tacTu.pq.canNguoiCho'),
      lop: 'text-foreground',
      icon: <span className="h-2.5 w-2.5 rounded-full bg-mimi-amber" />,
    },
  };
  const k = kq ? ketQua[kq] : { chu: tr('app.tacTu.pq.chuaXet'), mo: tr('app.tacTu.pq.chuaXetMo'), lop: 'text-muted-foreground', icon: <CircleDot size={16} /> };

  return (
    <>
      <SheetHeader className="space-y-1 border-b border-border px-5 py-4 pr-12 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <NhanTrangThai y={y} />
          <span className="text-xs text-muted-foreground">{giaiDoan(y)} · {tenTacTu} · {luc(y.created_at)}</span>
        </div>
        <SheetTitle className="font-mono text-3xl font-semibold tabular-nums">{dong(y.so_tien)}</SheetTitle>
        {/* Đọc lại bằng chữ: một số 0 thừa là chuyển gấp mười lần. Xem lib/soTienBangChu.ts. */}
        <SheetDescription>{tr('app.tacTu.pq.bangChu')} <span className="text-foreground">{docSoTienBangChu(Math.round(y.so_tien))}</span></SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <section aria-labelledby="pq-ket-qua" className={`${khoi} p-3`}>
          <h3 id="pq-ket-qua" className={nhanNho}>{tr('app.tacTu.pq.ketQua')}</h3>
          <p className={`mt-1 flex items-center gap-2 text-lg font-semibold ${k.lop}`}>{k.icon} {k.chu}</p>
          <p className="text-xs text-muted-foreground">{k.mo}</p>
        </section>

        {doiTk && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs">
            <p className="font-semibold text-destructive">{tr('app.tacTu.pq.doiTk')}</p>
            <p className="mt-1 text-muted-foreground">
              {tr('app.tacTu.pq.doiTkMo')}
            </p>
          </div>
        )}
        {/*
          NGƯỜI NHẬN MỚI LÀ CHỖ LỪA ĐẢO CHEN VÀO. Ở Đông Nam Á 48% thiệt hại do lừa
          đảo đi qua chuyển khoản, và hai phần ba vụ xảy ra trong 24 giờ kể từ lần
          liên lạc đầu (GASA 2025) — tức là kẻ gian thắng bằng sự vội. Khối này làm
          chậm đúng một nhịp, và chỉ cho cách kiểm không phụ thuộc kênh kẻ gian đang dùng.
        */}
        {nguoiLa && choDuyet && (
          <div className="rounded-lg border border-border bg-card p-3 text-xs">
            <p className="flex items-center gap-2 font-semibold text-foreground"><span className="h-2 w-2 rounded-full bg-mimi-amber" aria-hidden /> {tr('app.tacTu.pq.lanDau')}</p>
            <p className="mt-1 text-muted-foreground">
              {tr('app.tacTu.pq.lanDauMo')}
            </p>
            <label className="mt-2 flex items-start gap-2 text-foreground">
              <input type="checkbox" className="mt-0.5" checked={themNguoiNhan} onChange={(e) => setThemNguoiNhan(e.target.checked)} />
              {tr('app.tacTu.pq.daKiem')}
            </label>
          </div>
        )}

        <section aria-labelledby="pq-luat">
          <h3 id="pq-luat" className={nhanNho}>{tr('app.tacTu.pq.viSao')}</h3>
          {luat.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">{tr('app.tacTu.pq.chuaCo')}</p>
          ) : (
            <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
              {luat.map((l) => (
                <li key={l.ma} className="px-3 py-2">
                  {/* Mã luật (VUOT_HAN_MUC_NGAY…) là của máy; người đọc cần tên luật và câu giải thích. */}
                  <p className="text-sm font-medium text-foreground">{nhanMa(l.ma)}</p>
                  {l.cau && <p className="mt-0.5 text-xs text-muted-foreground">{l.cau}</p>}
                </li>
              ))}
            </ul>
          )}
          {ghiChuNguoi && <p className="mt-2 text-xs text-muted-foreground">{tr('app.tacTu.pq.ghiChuTuChoi')} <span className="text-foreground">{ghiChuNguoi.cau}</span></p>}
        </section>

        <section aria-labelledby="pq-chi-tiet">
          <h3 id="pq-chi-tiet" className={nhanNho}>{tr('app.tacTu.pq.chiTiet')}</h3>
          <dl className="mt-2 grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">{tr('app.tacTu.pq.nguoiYc')}</dt>
            <dd className="text-foreground">{nguoiYeuCau === tr('app.tacTu.nguoiYc.agent') ? tr('app.tacTu.pq.agentTen', { ten: tenTacTu }) : tr('app.tacTu.pq.tinhVao', { nguoi: nguoiYeuCau, ten: tenTacTu })}</dd>
            <dt className="text-muted-foreground">{tr('app.tacTu.pq.mucDich')}</dt><dd className="text-foreground">{y.muc_dich}</dd>
            <dt className="text-muted-foreground">{tr('app.tacTu.pq.nguoiNhan')}</dt>
            <dd className="text-foreground">{y.ten_nguoi_nhan ?? tr('app.tacTu.pq.chuaRoTen')} <span className="text-muted-foreground">· {tenNganHang(y.ngan_hang_bin)} · <span className="font-mono">{y.so_tai_khoan}</span></span></dd>
            <dt className="text-muted-foreground">{tr('app.tacTu.pq.nhomChi')}</dt><dd className="text-foreground">{tenNhomChi(y.nhom_chi)}</dd>
            <dt className="text-muted-foreground">{tr('app.tacTu.pq.noiDungCk')}</dt><dd className="font-mono text-foreground">{y.ma_tham_chieu}</dd>
          </dl>
        </section>

        <section aria-labelledby="pq-ngan-sach">
          <h3 id="pq-ngan-sach" className={nhanNho}>{tr('app.tacTu.pq.nganSach')}</h3>
          {!cs ? (
            <p className="mt-1 text-sm text-muted-foreground">{tr('app.tacTu.pq.chuaCs')}</p>
          ) : !ns ? (
            <p className="mt-1 text-sm text-muted-foreground">{tr('app.tacTu.pq.thangTruoc')}</p>
          ) : (
            <>
              <div className="mt-2 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-accent/50 text-left text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-1.5 font-medium"><span className="sr-only">{tr('app.tacTu.pq.ky')}</span></th>
                      <th scope="col" className="px-3 py-1.5 text-right font-medium">{tr('app.tacTu.pq.hanMuc')}</th>
                      <th scope="col" className="px-3 py-1.5 text-right font-medium">{tr('app.tacTu.pq.conLaiKhong')}</th>
                      <th scope="col" className="px-3 py-1.5 text-right font-medium">{tr('app.tacTu.pq.conLaiCa')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono tabular-nums">
                    {ns.dong.map((d) => {
                      const sau = truTien(d.tran, d.tinhCa);
                      const vuot = soSanhTien(sau, 0) < 0;
                      return (
                        <tr key={d.nhan}>
                          <th scope="row" className="px-3 py-1.5 text-left font-sans font-medium text-foreground">{d.nhan}</th>
                          <td className="px-3 py-1.5 text-right">{dong(d.tran)}</td>
                          <td className="px-3 py-1.5 text-right">{dong(truTien(d.tran, d.khongTinh))}</td>
                          <td className={`px-3 py-1.5 text-right ${vuot ? 'text-destructive' : ''}`}>{vuot ? tr('app.tacTu.pq.vuot', { tien: dong(truTien(d.tinhCa, d.tran)) }) : dong(sau)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {ns.daTinh ? tr('app.tacTu.pq.daTinh') : tr('app.tacTu.pq.khongTinh')} {tr('app.tacTu.pq.soDaDung')}
              </p>
            </>
          )}
        </section>

        <section aria-labelledby="pq-chung-tu">
          <h3 id="pq-chung-tu" className={nhanNho}>{tr('app.tacTu.pq.chungTu')}</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li className="flex items-start gap-2">
              {y.so_hoa_don ? <Check size={14} className="mt-0.5 shrink-0 text-mimi-green" /> : <CircleDot size={14} className="mt-0.5 shrink-0 text-muted-foreground" />}
              <span>{tr('app.tacTu.pq.soHd')} <span className="font-mono text-foreground">{y.so_hoa_don ?? tr('app.tacTu.pq.chuaGui')}</span></span>
            </li>
            <li className="flex items-start gap-2">
              {y.trang_thai === 'da_chi' ? <Check size={14} className="mt-0.5 shrink-0 text-mimi-green" /> : <CircleDot size={14} className="mt-0.5 shrink-0 text-muted-foreground" />}
              <span>
                {tr('app.tacTu.pq.saoKe')}{' '}
                {y.trang_thai === 'da_chi'
                  ? <span className="font-mono text-foreground">{dong(y.so_tien_thuc_chi ?? y.so_tien)} · {luc(y.da_chi_luc)}</span>
                  : <span className="text-foreground">{tr('app.tacTu.pq.chua')}</span>}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Info size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
              <span>{tr('app.tacTu.pq.hdDauVao')} <Link to="/dashboard/chung-tu" className={`font-medium text-foreground underline underline-offset-4 ${vien}`}>{tr('app.tacTu.pq.doiChieu')}</Link></span>
            </li>
          </ul>
        </section>

        <section aria-labelledby="pq-tien-trinh">
          <h3 id="pq-tien-trinh" className={nhanNho}>{tr('app.tacTu.pq.tienTrinh')}</h3>
          <ol className="mt-3">
            {tienTrinh(y).map((b, i, ds) => (
              <li key={b.ten} className="relative flex gap-3 pb-4 last:pb-0">
                {i < ds.length - 1 && <span aria-hidden className="absolute left-[6px] top-4 h-full w-px bg-border" />}
                <span aria-hidden className={`relative mt-1 h-[13px] w-[13px] shrink-0 rounded-full border-2 ${KIEU_BUOC[b.trangThai].cham}`} />
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${b.trangThai === 'dung' ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {b.ten} <span className="sr-only">— {tr(`app.tacTu.buoc.${b.trangThai}`)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {b.mo}{b.luc && <span className="font-mono tabular-nums"> · {luc(b.luc)}</span>}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {y.trang_thai === 'da_duyet' && (
          <section aria-labelledby="pq-tra">
            <h3 id="pq-tra" className={nhanNho}>{tr('app.tacTu.pq.thanhToan')}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              <Trans i18nKey="app.tacTu.pq.noiDungCkGiu" values={{ ma: y.ma_tham_chieu }} components={{ c: <code className="font-semibold text-foreground" /> }} />
              {quaHan && <span className="text-destructive"> {tr('app.tacTu.pq.quaHan')}</span>}
            </p>
            <button data-mimi="tac-tu.tra-qr" data-mimi-khong-tu-bam onClick={() => setHienQr((v) => !v)} className={`${nutChinh} mt-2 w-full`}>
              <QrCode size={14} /> {hienQr ? tr('app.tacTu.pq.anQr') : tr('app.tacTu.pq.traQr')}
            </button>
            {hienQr && <MaQrTra y={y} />}
          </section>
        )}

        <p className="flex items-start gap-2 rounded-lg bg-accent/60 p-3 text-xs text-muted-foreground">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-foreground" />
          {tr('app.tacTu.pq.baoVe')}
        </p>
      </div>

      {choDuyet && (
        <div className="grid grid-cols-2 gap-2 border-t border-border bg-card px-5 py-3">
          <button data-mimi="tac-tu.tu-choi" data-mimi-khong-tu-bam disabled={dangLam} onClick={tuChoi} className={nutPhu}>
            <X size={14} /> {tr('app.tacTu.nut.tuChoi')}
          </button>
          <button data-mimi="tac-tu.duyet" data-mimi-khong-tu-bam disabled={dangLam} onClick={() => duyet(themNguoiNhan)} className={nutChinh}>
            {dangLam ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {tr('app.tacTu.nut.duyet')}
          </button>
        </div>
      )}
      {y.trang_thai === 'da_duyet' && (
        <div className="border-t border-border bg-card px-5 py-3">
          <button data-mimi="tac-tu.huy" data-mimi-khong-tu-bam disabled={dangLam} onClick={huy} className={`${nutPhu} w-full`}>
            <X size={14} /> {tr('app.tacTu.pq.huyLenh')}
          </button>
        </div>
      )}
    </>
  );
}

function HopTuChoi({
  y, dangLam, dongLai, xacNhan,
}: {
  y: YeuCau | null;
  dangLam: boolean;
  dongLai: () => void;
  xacNhan: (ghiChu: string) => void;
}) {
  const [ghiChu, setGhiChu] = useState('');
  const { t: tr } = useTranslation();
  return (
    <Dialog open={y !== null} onOpenChange={(m) => { if (!m) dongLai(); }}>
      <DialogContent className="rounded-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tr('app.tacTu.tuChoi.tieuDe', { tien: y ? dong(y.so_tien) : '' })}</DialogTitle>
          <DialogDescription>{tr('app.tacTu.tuChoi.mo')}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); xacNhan(ghiChu); }}
          className="space-y-4"
        >
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">{tr('app.tacTu.tuChoi.lyDo')}</span>
            <textarea value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} maxLength={200} rows={3} className={o} />
          </label>
          <DialogFooter className="gap-2 sm:gap-2">
            <button type="button" onClick={dongLai} className={nutPhu}>{tr('app.chung.huy')}</button>
            <button type="submit" disabled={dangLam} className={nutChinh}>{tr('app.tacTu.tuChoi.nut')}</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Chữ kết luận lấy từ bộ dịch: app.tacTu.ketLuan.<mã>.
const KET_LUAN_KIEM: Record<'tu_choi' | 'cho_duyet' | 'tu_dong_duyet', { lop: string }> = {
  tu_dong_duyet: { lop: 'bg-mimi-green/10 text-mimi-green' },
  cho_duyet: { lop: 'border border-foreground/20 bg-card text-foreground' },
  tu_choi: { lop: 'bg-destructive/10 text-destructive' },
};

/** Mã chống trùng cho một lần mở form: bấm Gửi hai lần hay mạng chập thì máy chủ trả lại đúng khoản cũ. */
const taoMaYeuCau = () =>
  `nguoi-dung-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

/**
 * Tạo yêu cầu chi từ màn hình.
 *
 * Khoản chi luôn tính vào ngân sách của MỘT agent và đi qua đúng chính sách của
 * agent đó (`tao_yeu_cau` → `xinChi`) — chủ doanh nghiệp không có lối tắt qua luật,
 * và nhật ký ghi rõ người tạo. Khối "Kiểm tra trước" chỉ là ước tính
 * (`kiemTruocYeuCau`); máy chủ mới là nơi quyết.
 */
function FormTaoYeuCau({
  ds, chinhSach, suDung, nguoiNhan, dangGui, gui, moAgents,
}: {
  ds: TacTu[];
  chinhSach: Record<string, ChinhSachRow>;
  suDung: Record<string, { ngay: TienVND; thang: TienVND }>;
  nguoiNhan: NguoiNhan[];
  dangGui: boolean;
  gui: (du: Record<string, unknown>) => void;
  moAgents: () => void;
}) {
  const [maYeuCau] = useState(taoMaYeuCau);
  const [tacTuId, setTacTuId] = useState(ds.find((t) => t.trang_thai === 'hoat_dong')?.id ?? ds[0]?.id ?? '');
  const [cachNhan, setCachNhan] = useState<'danh_sach' | 'khac'>(nguoiNhan.length ? 'danh_sach' : 'khac');
  const [nguoiNhanId, setNguoiNhanId] = useState(nguoiNhan[0]?.id ?? '');
  const [bin, setBin] = useState(DANH_SACH_NGAN_HANG[0]?.bin ?? '');
  const [stk, setStk] = useState('');
  const [tenNhan, setTenNhan] = useState('');
  const [soTienSo, setSoTienSo] = useState('');
  const [nhomChi, setNhomChi] = useState<string>(NHOM_CHI[0]);
  const [mucDich, setMucDich] = useState('');
  const [soHoaDon, setSoHoaDon] = useState('');
  const { t: tr } = useTranslation();

  const lenhMcp = `claude mcp add --transport http mimi ${DIEM_MCP} --header "x-mimi-agent-key: ${tr('app.tacTu.form.khoaCuaAgent')}"`;
  const dauForm = (
    <SheetHeader className="text-left">
      <SheetTitle>{tr('app.tacTu.form.tieuDe')}</SheetTitle>
      <SheetDescription>
        {tr('app.tacTu.form.mo')}
      </SheetDescription>
    </SheetHeader>
  );

  if (ds.length === 0) {
    return (
      <>
        {dauForm}
        <div className={`${khoi} mt-5 p-4`}>
          <p className="text-sm text-foreground">{tr('app.tacTu.form.chuaCoAgent')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{tr('app.tacTu.form.chuaCoAgentMo')}</p>
          <button onClick={moAgents} className={`${nutChinh} mt-3`}><Plus size={14} /> {tr('app.tacTu.form.themAgent')}</button>
        </div>
      </>
    );
  }

  const t = ds.find((x) => x.id === tacTuId);
  const cs = t ? chinhSach[t.id] : undefined;
  const su = t ? suDung[t.id] : undefined;
  const nnChon = cachNhan === 'danh_sach' ? nguoiNhan.find((n) => n.id === nguoiNhanId) : undefined;
  const nhan = nnChon
    ? { bin: nnChon.ngan_hang_bin, stk: nnChon.so_tai_khoan, ten: nnChon.ten_chu_tai_khoan }
    : { bin, stk: stk.replace(/\s/g, ''), ten: tenNhan.trim() };
  const soTien = Number(soTienSo || 0);
  const stkHopLe = /^\d{6,19}$/.test(nhan.stk);
  const hopLe =
    Boolean(t) && soTien > 0 && stkHopLe && mucDich.trim().length >= 3 &&
    (cachNhan === 'danh_sach' ? Boolean(nnChon) : nhan.ten.length >= 2);
  const kiem = t && soTien > 0 && stkHopLe
    ? kiemTruocYeuCau({ soTien, nhomChi, nganHangBin: nhan.bin, soTaiKhoan: nhan.stk }, t, cs, su, nguoiNhan, new Date())
    : null;
  const nhanTruong = 'mb-1 block text-xs font-medium text-muted-foreground';

  return (
    <>
      {dauForm}
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!hopLe || !t) return;
          gui({
            tac_tu_id: t.id,
            so_tien: soTien,
            ngan_hang_bin: nhan.bin,
            so_tai_khoan: nhan.stk,
            ten_nguoi_nhan: nhan.ten || null,
            nhom_chi: nhomChi,
            muc_dich: mucDich.trim(),
            so_hoa_don: soHoaDon.trim() || null,
            ma_yeu_cau: maYeuCau,
          });
        }}
      >
        <div>
          <label htmlFor="tyc-agent" className={nhanTruong}>{tr('app.tacTu.form.tinhVao')}</label>
          <select id="tyc-agent" value={tacTuId} onChange={(e) => setTacTuId(e.target.value)} className={o}>
            {ds.map((x) => (
              <option key={x.id} value={x.id}>{x.ten}{x.trang_thai === 'tam_dung' ? tr('app.tacTu.form.tamDung') : ''}</option>
            ))}
          </select>
          {cs && (
            <p className="mt-1 text-xs text-muted-foreground">
              <Trans
                i18nKey="app.tacTu.form.conLai"
                values={{
                  ngay: dong(conLaiTien(cs.han_muc_ngay, su?.ngay ?? 0)),
                  thang: dong(conLaiTien(cs.han_muc_thang, su?.thang ?? 0)),
                  moiKhoan: dong(cs.han_muc_moi_lan),
                }}
                components={{ s: <span className="font-mono tabular-nums text-foreground" /> }}
              />
            </p>
          )}
        </div>

        <fieldset>
          <legend className={nhanTruong}>{tr('app.tacTu.form.nguoiNhan')}</legend>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-accent p-1" role="group" aria-label={tr('app.tacTu.form.cachChon')}>
            {([['danh_sach', tr('app.tacTu.form.trongDs')], ['khac', tr('app.tacTu.form.tkKhac')]] as const).map(([k, chu]) => (
              <button
                key={k}
                type="button"
                aria-pressed={cachNhan === k}
                onClick={() => setCachNhan(k)}
                className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${vien} ${cachNhan === k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {chu}
              </button>
            ))}
          </div>
          {cachNhan === 'danh_sach' ? (
            nguoiNhan.length ? (
              <select aria-label={tr('app.tacTu.form.chonNn')} value={nguoiNhanId} onChange={(e) => setNguoiNhanId(e.target.value)} className={`${o} mt-2`}>
                {nguoiNhan.map((n) => (
                  <option key={n.id} value={n.id}>{n.ten_chu_tai_khoan} · {tenNganHang(n.ngan_hang_bin)} · {n.so_tai_khoan}</option>
                ))}
              </select>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">{tr('app.tacTu.form.dsTrong')}</p>
            )
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <select aria-label={tr('app.tacTu.form.nhNn')} value={bin} onChange={(e) => setBin(e.target.value)} className={o}>
                {DANH_SACH_NGAN_HANG.map((n) => <option key={n.bin} value={n.bin}>{n.ten}</option>)}
              </select>
              <input aria-label={tr('app.tacTu.form.stkNn')} value={stk} onChange={(e) => setStk(e.target.value)} placeholder={tr('app.tacTu.form.stk')} inputMode="numeric" className={`${o} font-mono`} />
              <input aria-label={tr('app.tacTu.form.tenChu')} value={tenNhan} onChange={(e) => setTenNhan(e.target.value)} placeholder={tr('app.tacTu.form.tenChu')} className={`${o} sm:col-span-2`} />
            </div>
          )}
        </fieldset>

        <div>
          <label htmlFor="tyc-so-tien" className={nhanTruong}>{tr('app.tacTu.form.soTien')}</label>
          <div className="relative">
            <input
              id="tyc-so-tien"
              value={soTien > 0 ? soTien.toLocaleString('vi-VN') : ''}
              onChange={(e) => setSoTienSo(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 14))}
              inputMode="numeric"
              placeholder="0"
              className={`${o} pr-8 font-mono text-lg tabular-nums`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden>đ</span>
          </div>
          {/* Đọc lại bằng chữ: một số 0 thừa là chuyển gấp mười lần. */}
          {soTien > 0 && <p className="mt-1 text-xs text-muted-foreground">{tr('app.tacTu.form.bangChu')} <span className="text-foreground">{docSoTienBangChu(soTien)}</span></p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="tyc-nhom" className={nhanTruong}>{tr('app.tacTu.form.nhomChi')}</label>
            <select id="tyc-nhom" value={nhomChi} onChange={(e) => setNhomChi(e.target.value)} className={o}>
              {NHOM_CHI.map((n) => <option key={n} value={n}>{tenNhomChi(n)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="tyc-hoa-don" className={nhanTruong}>{tr('app.tacTu.form.soHd')} <span className="font-normal">{tr('app.tacTu.form.neuCo')}</span></label>
            <input id="tyc-hoa-don" value={soHoaDon} onChange={(e) => setSoHoaDon(e.target.value)} maxLength={60} className={`${o} font-mono`} />
          </div>
        </div>

        <div>
          <label htmlFor="tyc-muc-dich" className={nhanTruong}>{tr('app.tacTu.form.mucDich')}</label>
          <textarea id="tyc-muc-dich" value={mucDich} onChange={(e) => setMucDich(e.target.value)} maxLength={300} rows={2} placeholder={tr('app.tacTu.form.mucDichPh')} className={o} />
        </div>

        {kiem && (
          <section aria-labelledby="tyc-kiem" aria-live="polite" className={`${khoi} p-3`}>
            <div className="flex items-center justify-between gap-2">
              <h3 id="tyc-kiem" className={nhanNho}>{tr('app.tacTu.form.kiemTruoc')}</h3>
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${KET_LUAN_KIEM[kiem.ketLuan].lop}`}>
                {kiem.ketLuan === 'cho_duyet' && <span className="h-1.5 w-1.5 rounded-full bg-mimi-amber" aria-hidden />}
                {tr(`app.tacTu.ketLuan.${kiem.ketLuan}`)}
              </span>
            </div>
            <ul className="mt-2 space-y-1 text-xs">
              {kiem.dong.map((d) => (
                <li key={d.cau} className="flex items-start gap-2 text-foreground">
                  {d.muc === 'chan' ? <X size={13} className="mt-0.5 shrink-0 text-destructive" aria-hidden />
                    : d.muc === 'hoi' ? <AlertTriangle size={13} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                      : <Check size={13} className="mt-0.5 shrink-0 text-mimi-green" aria-hidden />}
                  {d.cau}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {tr('app.tacTu.form.uocTinh')}
            </p>
          </section>
        )}

        <button
          type="submit"
          data-mimi="tac-tu.tao-yeu-cau.gui"
          data-mimi-khong-tu-bam
          disabled={!hopLe || dangGui}
          className={`${nutChinh} w-full`}
        >
          {dangGui ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {tr('app.tacTu.form.gui')}
        </button>
        <p className="text-xs text-muted-foreground">
          {tr('app.tacTu.form.sauDuyet')}
        </p>
      </form>

      <details className="mt-6 border-t border-border pt-4">
        <summary className={`cursor-pointer rounded text-sm font-medium text-foreground ${vien}`}>{tr('app.tacTu.form.kyThuat')}</summary>
        <ol className="mt-3 space-y-3 text-xs text-muted-foreground">
          <li>{tr('app.tacTu.form.b1')}</li>
          <li>
            {tr('app.tacTu.form.b2')}
            <pre className="mt-1.5 overflow-x-auto rounded-lg bg-accent p-3 font-mono text-[11px] text-foreground">{lenhMcp}</pre>
          </li>
          <li>{tr('app.tacTu.form.b3')}</li>
        </ol>
        <button type="button" onClick={moAgents} className={`${nutPhu} mt-3`}>{tr('app.tacTu.form.moTab')}</button>
      </details>
    </>
  );
}

function KhoaMoi({ ten, khoa, dongLai }: { ten: string; khoa: string; dongLai: () => void }) {
  const { t: tr } = useTranslation();
  const viDu = `curl -X POST ${DIEM_GOI} \\
  -H "x-mimi-agent-key: ${khoa}" \\
  -H "Content-Type: application/json" \\
  -d '{"hanh_dong":"xin_chi","so_tien":500000,"ngan_hang_bin":"970422","so_tai_khoan":"0123456789","nhom_chi":"ha_tang_ai","muc_dich":"Nạp tiền API tháng này","ma_yeu_cau":"don-001"}'`;
  const lenhClaude = `claude mcp add --transport http mimi ${DIEM_MCP} --header "x-mimi-agent-key: ${khoa}"`;
  const cauHinhCursor = JSON.stringify(
    { mcpServers: { mimi: { url: DIEM_MCP, headers: { 'x-mimi-agent-key': khoa } } } },
    null,
    2,
  );
  const chep = (s: string) =>
    navigator.clipboard.writeText(s).then(() => toast.success(tr('app.chung.daChep')), () => toast.error(tr('app.chung.khongChepDuoc')));

  return (
    <section aria-labelledby="khoa-moi" className="rounded-lg border border-foreground/25 bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <h2 id="khoa-moi" className="flex items-center gap-2 text-sm font-semibold text-foreground"><KeyRound size={15} /> {tr('app.tacTu.khoa.tieuDe', { ten })}</h2>
        <button onClick={dongLai} aria-label={tr('app.chung.dong')} className={`${nutNho} w-8 px-0 text-muted-foreground hover:bg-accent`}><X size={16} /></button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        <Trans i18nKey="app.tacTu.khoa.motLan" components={{ b: <strong className="text-foreground" /> }} />
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg bg-accent px-3 py-2 font-mono text-xs">{khoa}</code>
        <button onClick={() => chep(khoa)} className={nutPhu}><Copy size={14} /> {tr('app.chung.chep')}</button>
      </div>
      {/* Lệnh cài đặt là việc của người phụ trách kỹ thuật: thu gọn, chủ doanh nghiệp chỉ cần chép khoá. */}
      <details className="mt-4 rounded-lg border border-border p-4">
        <summary className={`cursor-pointer rounded text-xs font-semibold text-foreground ${vien}`}>{tr('app.tacTu.khoa.huongDan')}</summary>
        <p className="mt-1 text-xs text-muted-foreground">
          {tr('app.tacTu.khoa.danMotDong')}
        </p>
        <p className="mt-3 text-[11px] font-medium text-muted-foreground">{tr('app.tacTu.khoa.claude')}</p>
        <div className="mt-1 flex items-start gap-2">
          <pre className="flex-1 overflow-x-auto rounded-lg bg-accent p-2 text-[11px]">{lenhClaude}</pre>
          <button onClick={() => chep(lenhClaude)} aria-label={tr('app.tacTu.khoa.chepClaude')} className={`${nutPhu} px-2.5`}><Copy size={13} /></button>
        </div>
        <p className="mt-3 text-[11px] font-medium text-muted-foreground">{tr('app.tacTu.khoa.cursor')}</p>
        <div className="mt-1 flex items-start gap-2">
          <pre className="flex-1 overflow-x-auto rounded-lg bg-accent p-2 text-[11px]">{cauHinhCursor}</pre>
          <button onClick={() => chep(cauHinhCursor)} aria-label={tr('app.tacTu.khoa.chepCursor')} className={`${nutPhu} px-2.5`}><Copy size={13} /></button>
        </div>
        <details className="mt-3">
          <summary className={`cursor-pointer rounded text-xs text-muted-foreground ${vien}`}>{tr('app.tacTu.khoa.api')}</summary>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-accent p-3 text-[11px] leading-relaxed">{viDu}</pre>
        <p className="mt-2 text-xs text-muted-foreground">
          <Trans i18nKey="app.tacTu.khoa.hanhDong" components={{ c: <code /> }} />
        </p>
        </details>
      </details>
    </section>
  );
}

function MaQrTra({ y }: { y: YeuCau }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const { t: tr } = useTranslation();

  useEffect(() => {
    if (!ref.current) return;
    try {
      const chuoi = taoChuoiVietQr({
        bankBin: y.ngan_hang_bin,
        accountNumber: y.so_tai_khoan,
        amount: y.so_tien,
        addInfo: y.ma_tham_chieu,
      });
      QRCode.toCanvas(ref.current, chuoi, { width: 220, margin: 1 }, (e) => {
        if (e) setLoi(i18n.t('app.tacTu.qr.loiVe'));
      });
    } catch (e) {
      setLoi(e instanceof Error ? e.message : i18n.t('app.tacTu.qr.loiDung'));
    }
  }, [y]);

  /*
   * TRẢ NGAY TRÊN CHÍNH ĐIỆN THOẠI NÀY.
   *
   * Người duyệt thường mở MIMI trên điện thoại — và không thể dùng camera của
   * một máy để quét mã đang hiện trên màn hình của chính máy đó. Hai lối thay
   * thế người Việt vẫn dùng khi chuyển khoản: lưu ảnh mã rồi mở từ thư viện ảnh
   * trong app ngân hàng, hoặc chép từng dòng. Nội dung chuyển khoản phải giữ
   * nguyên để sao kê tự khớp, nên nó là một dòng chép riêng.
   */
  const luuAnh = () => {
    if (!ref.current) return;
    const a = document.createElement('a');
    a.href = ref.current.toDataURL('image/png');
    a.download = `MIMI-${y.ma_tham_chieu ?? 'lenh-tra'}.png`;
    a.click();
  };

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-col items-start gap-2">
        <canvas ref={ref} className="rounded-lg border border-border bg-white p-2" />
        <button type="button" disabled={Boolean(loi)} onClick={luuAnh} className={nutPhu}>
          <Download size={14} /> {tr('app.tacTu.qr.luuAnh')}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {loi ?? tr('app.tacTu.qr.huongDan')}
      </p>
      <div className="rounded-lg border border-border px-3">
        <DongChep nhan={tr('app.tacTu.qr.nganHang')} giaTri={tenNganHang(y.ngan_hang_bin)} />
        <DongChep nhan={tr('app.tacTu.qr.stk')} giaTri={y.so_tai_khoan} />
        <DongChep nhan={tr('app.tacTu.qr.soTien')} giaTri={String(Math.round(y.so_tien))} hien={dong(y.so_tien)} />
        <DongChep nhan={tr('app.tacTu.qr.noiDung')} giaTri={y.ma_tham_chieu ?? ''} />
      </div>
      <p className="text-xs text-muted-foreground">
        {tr('app.tacTu.qr.kiemTen')}
      </p>
    </div>
  );
}

function DongChep({ nhan, giaTri, hien }: { nhan: string; giaTri: string; hien?: string }) {
  const { t: tr } = useTranslation();
  const chep = () =>
    navigator.clipboard.writeText(giaTri).then(
      () => toast.success(tr('app.tacTu.qr.daChep', { muc: nhan.split(' — ')[0].toLowerCase() })),
      () => toast.error(tr('app.chung.khongChepDuoc')),
    );
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border py-2 first:border-t-0">
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{nhan}</p>
        <p className="truncate font-mono text-sm text-foreground">{hien ?? giaTri}</p>
      </div>
      <button type="button" onClick={() => void chep()} disabled={!giaTri} className={`${nutPhu} shrink-0`}>
        <Copy size={14} /> {tr('app.chung.chep')}
      </button>
    </div>
  );
}
