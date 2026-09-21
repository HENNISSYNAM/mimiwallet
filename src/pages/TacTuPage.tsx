import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  AlertTriangle, BookOpen, Check, ChevronRight, CircleDot, Copy, Download, Info, KeyRound, ListChecks, Loader2,
  MoreHorizontal, Pause, Play, Plug, Plus, QrCode, Receipt, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Trash2,
  UserPlus, Wallet, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { SUPABASE_URL } from '@/lib/env';
import { DIEM_GOI_TAC_TU as DIEM_GOI, goiTacTu as goi } from '@/lib/goiTacTu';
import { canXacMinh, type DauHieu } from '@/lib/batThuong';
import HopXacMinh from '@/components/canh-bao/HopXacMinh';
import { docSoTienBangChu } from '@/lib/soTienBangChu';
import { taoChuoiVietQr } from '@/lib/vietqr';
import { DANH_SACH_NGAN_HANG } from '@/lib/nganHang';
import { NHOM_CHI, TEN_NHOM_CHI, TRANG_THAI_GIU_HAN_MUC, dauThangVN, type NhomChi } from '@/lib/tacTu';
import { tomTatChinhSach } from '@/lib/chinhSachVanBan';
import {
  MOC_GAN_CHAM_HAN_MUC, NHAN_TRANG_THAI, THU_TU_TRANG_THAI, canChuY, cauTomTatKiemSoat, giaiDoan, giuTheoNgay, ketQuaDanhGia, khopTuKhoa, kiemTruocYeuCau,
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

const dong = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;
const tenNganHang = (bin: string) => DANH_SACH_NGAN_HANG.find((n) => n.bin === bin)?.ten ?? bin;
const luc = (s: string | null) =>
  s ? new Date(s).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—';
const chuCai = (email: string | null) => (email?.split('@')[0] ?? '').slice(0, 2).toUpperCase() || '—';

const TRANG_THAI_TAC_TU: Record<string, string> = {
  hoat_dong: 'Đang hoạt động',
  tam_dung: 'Tạm dừng',
  thu_hoi: 'Đã thu hồi',
};

/**
 * Nhật ký lưu mã sự kiện cho máy (`them_nguoi_nhan`), nhưng người đọc cần một
 * câu. Mã lạ — ví dụ sự kiện máy chủ mới thêm mà trang chưa biết — hiện nguyên
 * mã thay vì biến mất.
 */
const SU_KIEN: Record<string, string> = {
  tao_tac_tu: 'Tạo agent',
  xoay_khoa: 'Cấp khoá mới',
  doi_trang_thai: 'Đổi trạng thái agent',
  luu_chinh_sach: 'Sửa chính sách chi',
  them_nguoi_nhan: 'Thêm người nhận',
  xoa_nguoi_nhan: 'Bỏ người nhận',
  xin_chi: 'Agent xin chi',
  xin_chi_sai_khuon: 'Agent gửi yêu cầu thiếu thông tin',
  duyet: 'Duyệt khoản chi',
  tu_choi: 'Từ chối khoản chi',
  huy: 'Huỷ khoản chi',
  da_chi: 'Sao kê xác nhận đã chi',
};

const KET_QUA_XIN: Record<string, string> = {
  tu_dong_duyet: 'tự duyệt',
  cho_duyet: 'chờ bạn duyệt',
  tu_choi: 'bị từ chối',
};

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
      return [tien, KET_QUA_XIN[c.ket_qua as string]].filter(Boolean).join(' · ');
    case 'doi_trang_thai':
      return `${TRANG_THAI_TAC_TU[c.tu as string] ?? c.tu} → ${TRANG_THAI_TAC_TU[c.sang as string] ?? c.sang}`;
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
const CAC_TAB = [
  { khoa: 'tong-quan', ten: 'Tổng quan' },
  { khoa: 'yeu-cau', ten: 'Yêu cầu chi' },
  { khoa: 'agents', ten: 'Agents' },
  { khoa: 'chinh-sach', ten: 'Chính sách' },
  { khoa: 'nguoi-nhan', ten: 'Người nhận' },
  { khoa: 'nhat-ky', ten: 'Nhật ký' },
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmailChu(user.email ?? null);
      setUserId(user.id);
      const { data: cty } = await supabase
        .from('companies').select('id').eq('user_id', user.id)
        .order('created_at', { ascending: true }).limit(1).maybeSingle();
      if (!cty) return;

      const [tt, cs, nn, yc, giu, nk, tao] = await Promise.all([
        supabase.from('tac_tu').select('*').eq('company_id', cty.id).order('created_at', { ascending: true }),
        supabase.from('chinh_sach_chi').select('*').eq('company_id', cty.id),
        supabase.from('nguoi_nhan_duoc_phep').select('*').eq('company_id', cty.id).order('created_at', { ascending: true }),
        supabase.from('yeu_cau_chi').select('*').eq('company_id', cty.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('yeu_cau_chi').select('tac_tu_id, so_tien, created_at').eq('company_id', cty.id)
          .in('trang_thai', [...TRANG_THAI_GIU_HAN_MUC])
          .gte('created_at', dauThangVN(new Date()).toISOString()),
        supabase.from('nhat_ky_tac_tu').select('*').eq('company_id', cty.id).order('created_at', { ascending: false }).limit(30),
        // Người yêu cầu: khoản do chủ doanh nghiệp tạo được nhật ký ghi `nguoi_dung` kèm user_id.
        supabase.from('nhat_ky_tac_tu').select('yeu_cau_id, user_id').eq('company_id', cty.id)
          .eq('su_kien', 'xin_chi').eq('nguoi', 'nguoi_dung').order('created_at', { ascending: false }).limit(500),
      ]);

      // Không nuốt lỗi: bảng chưa có (migration chưa chạy) trông y hệt "chưa có agent nào".
      const loi = [tt, cs, nn, yc, giu, nk, tao].find((r) => r.error)?.error;
      if (loi) toast.error(`Không đọc được dữ liệu agent: ${loi.message}`);

      setDsTacTu(tt.data ?? []);
      setChinhSach(Object.fromEntries((cs.data ?? []).map((r) => [r.tac_tu_id, r])));
      setNguoiNhan(nn.data ?? []);
      setYeuCau(yc.data ?? []);
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
      toast.error(e instanceof Error ? e.message : 'Không thực hiện được');
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
  const chuSoHuu = emailChu ?? 'Chủ doanh nghiệp';

  /* ── Hành động (cùng API như trước) ─────────────────────────────── */
  const duyet = async (y: YeuCau, themNguoiNhan: boolean, daXacMinh = false) => {
    setDangLam(y.id);
    try {
      const kq = await goi('duyet', { yeu_cau_id: y.id, them_nguoi_nhan: themNguoiNhan, ...(daXacMinh ? { da_xac_minh: true } : {}) });
      toast.success('Đã duyệt. Mã QR để trả nằm trong khung chi tiết.');
      await tai();
      return kq;
    } catch (e) {
      // Khoản có dấu hiệu bất thường: không báo lỗi, mở hộp xác minh.
      const cx = canXacMinh(e);
      if (cx) setXacMinh({ y, themNguoiNhan, ...cx });
      else toast.error(e instanceof Error ? e.message : 'Không thực hiện được');
      return null;
    } finally {
      setDangLam(null);
    }
  };
  const tuChoi = (y: YeuCau, ghiChu: string) =>
    lam(y.id, 'tu_choi', { yeu_cau_id: y.id, ghi_chu: ghiChu }, 'Đã từ chối.');
  const huy = (y: YeuCau) =>
    setXacNhan({
      tieuDe: `Huỷ lệnh trả ${dong(y.so_tien)}?`,
      mo: 'Khoản này sẽ không còn được trả. Agent cần gửi yêu cầu mới nếu vẫn cần chi.',
      nut: 'Huỷ lệnh',
      lam: () => { void lam(y.id, 'huy', { yeu_cau_id: y.id }, 'Đã huỷ lệnh trả.'); },
    });
  const doiTrangThai = (t: TacTu, tt: 'hoat_dong' | 'tam_dung') =>
    void lam(t.id, 'doi_trang_thai', { tac_tu_id: t.id, trang_thai: tt }, 'Đã đổi trạng thái.');
  const thuHoi = (t: TacTu) =>
    setXacNhan({
      tieuDe: `Thu hồi "${t.ten}"?`,
      mo: 'Khoá mất hiệu lực vĩnh viễn và mọi khoản chưa trả của agent này bị huỷ. Không hoàn tác được.',
      nut: 'Thu hồi agent',
      nguyHiem: true,
      lam: () => { void lam(t.id, 'doi_trang_thai', { tac_tu_id: t.id, trang_thai: 'thu_hoi' }, 'Đã thu hồi agent.'); },
    });
  const xoayKhoa = (t: TacTu) =>
    setXacNhan({
      tieuDe: `Cấp khoá mới cho "${t.ten}"?`,
      mo: 'Khoá cũ ngừng hoạt động ngay. Khoá mới chỉ hiện đúng một lần.',
      nut: 'Cấp khoá mới',
      lam: async () => {
        const kq = await lam(t.id, 'xoay_khoa', { tac_tu_id: t.id });
        if (kq?.khoa) setKhoaMoi({ ten: t.ten, khoa: kq.khoa });
      },
    });
  const boNguoiNhan = (n: NguoiNhan) =>
    setXacNhan({
      tieuDe: `Bỏ ${n.ten_chu_tai_khoan} khỏi danh sách?`,
      mo: 'Từ giờ tài khoản này bị coi là người nhận ngoài danh sách, theo chính sách của từng agent.',
      nut: 'Bỏ người nhận',
      nguyHiem: true,
      lam: () => { void lam(n.id, 'xoa_nguoi_nhan', { id: n.id }, 'Đã bỏ khỏi danh sách.'); },
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
      toast.info('Yêu cầu này đã được gửi trước đó — mở lại khoản cũ.');
    } else if (y.trang_thai === 'tu_choi') {
      toast.warning('Luật từ chối khoản này. Lý do nằm trong khung chi tiết.');
    } else {
      toast.success(y.trang_thai === 'da_duyet' ? 'Trong chính sách — đã duyệt. Trả bằng mã QR trong khung chi tiết.' : 'Đã tạo, đang chờ duyệt.');
    }
    setYeuCauMo(y.id);
  };

  if (dangTai) {
    return (
      <p className="flex items-center gap-2 py-16 text-sm text-muted-foreground" role="status">
        <Loader2 size={15} className="animate-spin" /> Đang đọc agent và yêu cầu chi…
      </p>
    );
  }

  const nguoiYeuCau = (y: YeuCau) => (nguoiTao[y.id] ? (nguoiTao[y.id] === userId ? 'Bạn' : 'Người dùng') : 'Agent');
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
      {/* ── Đầu trang ─────────────────────────────────────────────── */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <nav aria-label="Đường dẫn">
            <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <li>Agent</li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-foreground">Kiểm soát chi</li>
            </ol>
          </nav>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Kiểm soát chi</h1>
          <p className="mt-1 truncate text-sm text-muted-foreground" title="Agent xin chi, MIMI xét theo chính sách của bạn. MIMI không giữ và không chuyển tiền.">
            Agent xin chi, MIMI xét theo chính sách của bạn. MIMI không giữ và không chuyển tiền.
          </p>
        </div>
        <div className="grid grid-cols-[auto_1fr_1fr] gap-2 sm:flex sm:shrink-0">
          <button onClick={() => void tai()} aria-label="Tải lại" title="Tải lại" className={`${nutPhu} px-2.5`}>
            <RefreshCw size={15} />
          </button>
          {/* Nhãn ngắn trên điện thoại: ba nút chung một hàng 375px mà nhãn dài thì xuống dòng lởm chởm. */}
          <Link to="/dashboard/chinh-sach" aria-label="Cài đặt chính sách" className={nutPhu}>
            <SlidersHorizontal size={15} aria-hidden />
            <span className="sm:hidden" aria-hidden>Chính sách</span>
            <span className="hidden sm:inline" aria-hidden>Cài đặt chính sách</span>
          </Link>
          <button onClick={() => setMoTao(true)} aria-label="Tạo yêu cầu chi" className={nutChinh}>
            <Plus size={15} aria-hidden />
            <span className="sm:hidden" aria-hidden>Tạo yêu cầu</span>
            <span className="hidden sm:inline" aria-hidden>Tạo yêu cầu chi</span>
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
          'nguoi-nhan': canhBaoNguoiNhan > 0 ? <span className="h-1.5 w-1.5 rounded-full bg-mimi-amber" aria-label="có cảnh báo" /> : null,
        }}
      />

      {/* ── Tổng quan ─────────────────────────────────────────────── */}
      {tab === 'tong-quan' && (
        <div id="khu-tong-quan" role="tabpanel" aria-labelledby="tab-tong-quan" className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-5">
            <section data-mimi={choDuyet.length > 0 ? 'tac-tu.cho-duyet' : undefined} aria-labelledby="tq-cho-duyet">
              <DauKhu
                id="tq-cho-duyet"
                tieuDe="Cần bạn duyệt"
                dem={choDuyet.length}
                phai={<button onClick={() => { setLocTrangThai('tat_ca'); chonTab('yeu-cau'); }} className={lienKet}>Tất cả yêu cầu <ChevronRight size={12} className="inline" /></button>}
              />
              {choDuyet.length > 0
                ? <BangYeuCau rows={choDuyet} {...hanhDongBang} />
                : <Trong>Không có khoản nào chờ bạn duyệt.</Trong>}
            </section>

            {choTra.length > 0 && (
              <section aria-labelledby="tq-cho-tra">
                <DauKhu id="tq-cho-tra" tieuDe="Đã duyệt · chờ bạn trả" dem={choTra.length} />
                <BangYeuCau rows={choTra} {...hanhDongBang} />
              </section>
            )}

            <section aria-labelledby="tq-bieu-do" className={`${khoi} p-4`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="tq-bieu-do" className="text-sm font-semibold text-foreground">Hạn mức đã dùng theo ngày</h2>
                <p className="text-xs text-muted-foreground">Tháng này · tính cả khoản đang chờ duyệt</p>
              </div>
              <BieuDoGiu ds={bieuDo} />
            </section>

            <section data-mimi="tac-tu.danh-sach" aria-labelledby="tq-agent">
              <DauKhu
                id="tq-agent"
                tieuDe="Hoạt động của agent"
                dem={dsDangDung.length}
                phai={<button onClick={() => chonTab('agents')} className={lienKet}>Quản lý agent <ChevronRight size={12} className="inline" /></button>}
              />
              {dsDangDung.length === 0 ? (
                <Trong>
                  Chưa có agent nào.{' '}
                  <button onClick={() => chonTab('agents')} className={`${lienKet} text-foreground underline underline-offset-4`}>Thêm agent đầu tiên</button>
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

          <aside className="space-y-5" aria-label="Cần chú ý và thao tác nhanh">
            <section aria-labelledby="tq-chu-y" className={khoi}>
              <h2 id="tq-chu-y" className="flex items-center justify-between border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
                Cần chú ý {chuY.length > 0 && <Dem so={chuY.length} />}
              </h2>
              {chuY.length === 0 ? (
                <p className="px-4 py-5 text-sm text-muted-foreground">Không có gì cần xử lý.</p>
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
              <h2 id="tq-nhanh" className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">Thao tác nhanh</h2>
              <ul className="divide-y divide-border">
                <li><ThaoTacNhanh icon={SlidersHorizontal} ten="Cài đặt chính sách" mo="Ngưỡng duyệt, hạn mức, nhóm chi" to="/dashboard/chinh-sach" /></li>
                <li><ThaoTacNhanh icon={Plus} ten="Thêm agent" mo="Mỗi agent một khoá, một chính sách" bam={() => chonTab('agents')} /></li>
                <li><ThaoTacNhanh icon={UserPlus} ten="Thêm người nhận" mo="Tài khoản agent được phép trả" bam={() => chonTab('nguoi-nhan')} /></li>
                <li><ThaoTacNhanh icon={Plug} ten="Tạo yêu cầu chi" mo="Tính vào hạn mức của một agent" bam={() => setMoTao(true)} /></li>
                <li><ThaoTacNhanh icon={BookOpen} ten="Xem nhật ký" mo="Mọi thay đổi, chỉ thêm không sửa" bam={() => chonTab('nhat-ky')} /></li>
              </ul>
            </section>
          </aside>
        </div>
      )}

      {/* ── Yêu cầu chi ───────────────────────────────────────────── */}
      {tab === 'yeu-cau' && (
        <div id="khu-yeu-cau" role="tabpanel" aria-labelledby="tab-yeu-cau" className="space-y-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div role="group" aria-label="Lọc theo trạng thái" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 lg:pb-0">
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
                    {k === 'tat_ca' ? 'Tất cả' : NHAN_TRANG_THAI[k]}
                    <span className="tabular-nums opacity-60">{so}</span>
                  </button>
                );
              })}
            </div>
            <label className="relative block lg:w-80">
              <span className="sr-only">Tìm yêu cầu</span>
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input type="search" value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm agent, người nhận, mục đích…" className={`${o} pl-8`} />
            </label>
          </div>
          {(() => {
            if (yeuCau.length === 0) return <Trong>Chưa có yêu cầu nào. Yêu cầu hiện ở đây khi agent xin chi, hoặc khi bạn bấm "Tạo yêu cầu chi".</Trong>;
            const ds = locYeuCau(yeuCau, { trangThai: locTrangThai, tim }, tenTacTu);
            return ds.length === 0 ? <Trong>Không có yêu cầu nào khớp bộ lọc.</Trong> : <BangYeuCau rows={ds} {...hanhDongBang} />;
          })()}
          <p className="text-xs text-muted-foreground">Hiện tối đa 100 yêu cầu gần nhất.</p>
        </div>
      )}

      {/* ── Agents ────────────────────────────────────────────────── */}
      {tab === 'agents' && (
        <div id="khu-agents" role="tabpanel" aria-labelledby="tab-agents" className="space-y-4">
          <section className={`${khoi} p-4`} aria-labelledby="ag-them">
            <h2 id="ag-them" className="text-sm font-semibold text-foreground">Thêm agent</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Agent mới mặc định phải xin duyệt mọi khoản và chỉ được chi cho người nhận trong danh sách — nới ra khi bạn đã tin nó.
            </p>
            <ThemTacTu
              dangLam={dangLam === 'tao'}
              tao={async (ten, moTa) => {
                const kq = await lam('tao', 'tao_tac_tu', { ten, mo_ta: moTa || null });
                if (kq?.khoa) setKhoaMoi({ ten, khoa: kq.khoa });
              }}
            />
          </section>
          {dsDangDung.length === 0 ? (
            <Trong>Chưa có agent nào. Thêm một agent ở trên — ví dụ "Bot mua quảng cáo" hay "Trợ lý mua hàng" — rồi dán khoá vào cấu hình của nó.</Trong>
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
              <summary className={`cursor-pointer rounded text-sm text-muted-foreground ${vien}`}>Đã thu hồi ({dsThuHoi.length})</summary>
              <ul className="mt-2 divide-y divide-border text-sm">
                {dsThuHoi.map((t) => (
                  <li key={t.id} className="flex justify-between gap-3 py-2">
                    <span className="truncate text-foreground">{t.ten}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">hoạt động lần cuối {luc(t.dung_lan_cuoi)}</span>
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
            <p className="text-sm text-muted-foreground">Mỗi agent một chính sách. Sửa từng luật và đọc văn bản chính sách ở trang cài đặt.</p>
            <Link to="/dashboard/chinh-sach" className={`${nutPhu} shrink-0`}><SlidersHorizontal size={15} /> Cài đặt chính sách</Link>
          </div>
          <BangChinhSach ds={dsDangDung} chinhSach={chinhSach} soNguoiNhan={nguoiNhan.length} />
          <p className={`${khoi} flex items-start gap-2 p-3 text-xs text-muted-foreground`}>
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-foreground" />
            Luôn bật cho mọi agent: người nhận mới thêm chưa đủ 24 giờ không được tự duyệt; cùng tên người nhận mà khác số tài khoản so với 180 ngày qua thì phải có người duyệt.
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
            them={(du) => lam('nguoi_nhan', 'them_nguoi_nhan', du, 'Đã thêm người nhận.')}
            bo={boNguoiNhan}
            xem={(id) => setYeuCauMo(id)}
          />
        </div>
      )}

      {/* ── Nhật ký ───────────────────────────────────────────────── */}
      {tab === 'nhat-ky' && (
        <div id="khu-nhat-ky" role="tabpanel" aria-labelledby="tab-nhat-ky" className={khoi}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground"><ShieldCheck size={15} /> Nhật ký</h2>
            <p className="text-xs text-muted-foreground">Chỉ thêm, không sửa được — kể cả bởi MIMI. 30 sự kiện gần nhất.</p>
          </div>
          {nhatKy.length === 0 ? (
            <p className="px-4 py-5 text-sm text-muted-foreground">Chưa có sự kiện nào.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {nhatKy.map((n) => (
                <li key={n.id} className="grid gap-0.5 px-4 py-2.5 sm:grid-cols-[120px_70px_minmax(0,1fr)] sm:gap-3">
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">{luc(n.created_at)}</span>
                  <span className="text-xs text-muted-foreground">{n.nguoi === 'tac_tu' ? 'agent' : n.nguoi === 'he_thong' ? 'sao kê' : 'bạn'}</span>
                  <span className="min-w-0 text-foreground">
                    <span className="font-medium">
                      {n.su_kien === 'xin_chi' && n.nguoi === 'nguoi_dung' ? 'Tạo yêu cầu chi' : SU_KIEN[n.su_kien] ?? n.su_kien}
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
              tenTacTu={tenTacTu[yMo.tac_tu_id] ?? 'Agent'}
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
            <AlertDialogCancel className="rounded-lg">Huỷ</AlertDialogCancel>
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
    <div role="tablist" aria-label="Khu kiểm soát chi" className="-mx-4 flex overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
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
            {t.ten}
            {dem[t.khoa]}
          </button>
        );
      })}
    </div>
  );
}

/* ── KPI ───────────────────────────────────────────────────────────── */
function HangKpi({ kpi, moXemXet }: { kpi: Kpi; moXemXet: () => void }) {
  const chuaCo = kpi.coAgent ? null : 'Chưa có agent';
  const ns = kpi.nganSachThang;
  const daDungPct = ns && ns.tran > 0 ? Math.min(100, Math.round(((ns.tran - ns.conLai) / ns.tran) * 100)) : 0;
  return (
    <section
      aria-label="Chỉ số chi tiêu"
      data-mimi="tac-tu.kpi"
      className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4"
    >
      <TheKpi icon={ListChecks} nhan="Yêu cầu cần duyệt" trong={chuaCo}
        gia={String(kpi.canDuyet)} phu={kpi.canDuyet > 0 ? 'Chờ bạn quyết' : 'Không có khoản nào chờ'} />
      <TheKpi icon={Receipt} nhan="Tổng chi hôm nay" trong={chuaCo}
        gia={dong(kpi.daChiHomNay.tong)}
        phu={`${kpi.daChiHomNay.soKhoan} khoản ngân hàng đã xác nhận · ${dong(kpi.daGiuHomNay)} đã duyệt hoặc đang chờ`} />
      <TheKpi icon={Wallet} nhan="Ngân sách còn lại"
        trong={ns ? null : kpi.coAgent ? 'Chưa có agent đang hoạt động' : 'Chưa có agent'}
        gia={ns ? dong(ns.conLai) : ''}
        phu={ns ? `Đã dùng ${daDungPct}% của ${dong(ns.tran)} · tháng này · ${ns.soAgent} agent` : undefined}
        thanh={ns ? daDungPct : undefined} />
      <TheKpi icon={AlertTriangle} nhan="Khoản chi cần xem xét" trong={chuaCo}
        gia={String(kpi.canXemXet)} phu="Người nhận mới hoặc đổi số tài khoản"
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
  const noiDung = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="grid h-7 w-7 place-items-center rounded-md border border-border text-foreground" aria-hidden>
            <Icon size={14} />
          </span>
          {nhan}
          {nhan_chu_y && <span className="h-1.5 w-1.5 rounded-full bg-mimi-amber" aria-label="cần để mắt" />}
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
  const tt = trangThaiHienThi(y);
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${LOP_TRANG_THAI[tt]}`}>
      {tt === 'can_xem_xet' && <span className="h-1.5 w-1.5 rounded-full bg-mimi-amber" aria-hidden />}
      {NHAN_TRANG_THAI[tt]}
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
  return (
    <>
      <div className={`hidden overflow-x-auto md:block ${khoi}`}>
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-border bg-accent/50 text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Người yêu cầu</th>
              <th scope="col" className="px-3 py-2 font-medium">Agent</th>
              <th scope="col" className="px-3 py-2 font-medium">Nhà cung cấp</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Số tiền</th>
              <th scope="col" className="px-3 py-2 font-medium">Chính sách</th>
              <th scope="col" className="px-3 py-2 font-medium">Trạng thái</th>
              <th scope="col" className="px-3 py-2 font-medium">Thời gian</th>
              <th scope="col" className="px-3 py-2"><span className="sr-only">Hành động</span></th>
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
                  <span className="block max-w-[220px] truncate text-foreground">{y.ten_nguoi_nhan ?? 'Chưa rõ tên'}</span>
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
                <p className="truncate text-sm font-medium text-foreground">{y.ten_nguoi_nhan ?? 'Chưa rõ tên'}</p>
                <p className="truncate text-xs text-muted-foreground">{hd.nguoiYeuCau(y)} · {hd.tenTacTu[y.tac_tu_id] ?? 'Agent'} · {luc(y.created_at)}</p>
              </div>
              <NhanTrangThai y={y} />
            </div>
            <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-foreground">{dong(y.so_tien)}</p>
            <p className="truncate text-xs text-muted-foreground">{y.muc_dich}</p>
            <p className="mt-1 text-xs text-muted-foreground">Chính sách: {tomTatLuat(y)} · {giaiDoan(y)}</p>
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

  if (y.trang_thai === 'cho_duyet') {
    const canXem = trangThaiHienThi(y) === 'can_xem_xet';
    return (
      <div className={lop}>
        {canXem ? (
          <button onClick={() => xem(y.id)} className={`${chinh} ${diDong ? 'col-span-2' : ''}`}>
            <AlertTriangle size={13} /> Xem xét
          </button>
        ) : (
          <button data-mimi="tac-tu.duyet" data-mimi-khong-tu-bam disabled={dang} onClick={() => duyet(y)} className={chinh}>
            {dang ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Duyệt
          </button>
        )}
        <button data-mimi="tac-tu.tu-choi" data-mimi-khong-tu-bam disabled={dang} onClick={() => tuChoi(y)} className={phu}>
          Từ chối
        </button>
        {!canXem && <button onClick={() => xem(y.id)} className={phu}>Xem</button>}
      </div>
    );
  }
  if (y.trang_thai === 'da_duyet') {
    return (
      <div className={lop}>
        <button onClick={() => xem(y.id)} className={`${chinh} ${diDong ? 'col-span-3' : ''}`}><QrCode size={13} /> Trả</button>
      </div>
    );
  }
  return (
    <div className={lop}>
      <button onClick={() => xem(y.id)} className={`${phu} ${diDong ? 'col-span-3' : ''}`}>Xem</button>
    </div>
  );
}

/* ── Biểu đồ ───────────────────────────────────────────────────────── */
function BieuDoGiu({ ds }: { ds: Array<{ ngay: number; tong: number }> }) {
  const max = Math.max(0, ...ds.map((d) => d.tong));
  if (max === 0) return <p className="mt-4 text-sm text-muted-foreground">Tháng này chưa có khoản nào dùng hạn mức.</p>;
  return (
    <figure className="mt-3">
      <p className="text-[11px] text-muted-foreground">Cao nhất <span className="font-mono tabular-nums text-foreground">{dong(max)}</span></p>
      <div className="mt-2 flex h-32 items-end gap-[3px] border-b border-border" aria-hidden>
        {ds.map((d) => (
          <div
            key={d.ngay}
            title={`Ngày ${d.ngay}: ${dong(d.tong)}`}
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
        <caption>Hạn mức đã dùng theo ngày trong tháng này</caption>
        <tbody>
          {ds.filter((d) => d.tong > 0).map((d) => (
            <tr key={d.ngay}><th scope="row">Ngày {d.ngay}</th><td>{dong(d.tong)}</td></tr>
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
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${lop}`}>
      <ChamTrangThaiAgent tt={tt} /> {TRANG_THAI_TAC_TU[tt] ?? tt}
    </span>
  );
}

function MenuTacTu({ t, dangLam, doiTrangThai, xoayKhoa, thuHoi }: { t: TacTu; dangLam: boolean } & HanhDongAgent) {
  return (
    // modal={false}: menu mở hộp xác nhận; menu modal để lại khoá con trỏ trên trang sau khi hộp đóng.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button aria-label={`Hành động cho ${t.ten}`} disabled={dangLam} className={`${nutNho} w-8 px-0 text-muted-foreground hover:bg-accent hover:text-foreground`}>
          {dangLam ? <Loader2 size={15} className="animate-spin" /> : <MoreHorizontal size={16} />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-lg">
        {t.trang_thai === 'hoat_dong' ? (
          <DropdownMenuItem onSelect={() => doiTrangThai(t, 'tam_dung')}><Pause size={14} className="mr-2" /> Tạm dừng</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => doiTrangThai(t, 'hoat_dong')}><Play size={14} className="mr-2" /> Bật lại</DropdownMenuItem>
        )}
        <DropdownMenuItem data-mimi="tac-tu.khoa-moi" data-mimi-khong-tu-bam onSelect={() => xoayKhoa(t)}>
          <KeyRound size={14} className="mr-2" /> Cấp khoá mới
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`/dashboard/chinh-sach?agent=${t.id}`}><SlidersHorizontal size={14} className="mr-2" /> Sửa chính sách</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-mimi="tac-tu.thu-hoi"
          data-mimi-khong-tu-bam
          onSelect={() => thuHoi(t)}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <Trash2 size={14} className="mr-2" /> Thu hồi
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThanhDung({ nhan, da, tran }: { nhan: string; da: number; tran: number }) {
  const pct = tran > 0 ? Math.min(100, (da / tran) * 100) : 100;
  return (
    <div>
      <div className="flex justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{nhan}</span>
        <span className="font-mono tabular-nums text-foreground">{dong(da)} <span className="text-muted-foreground">/ {dong(tran)}</span></span>
      </div>
      <div
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-accent"
        role="progressbar"
        aria-label={`${nhan}: đã dùng ${dong(da)} trên ${dong(tran)}`}
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
  suDung: Record<string, { ngay: number; thang: number }>;
  soCho: Record<string, number>;
  chuSoHuu: string;
  dangLam: string | null;
} & HanhDongAgent) {
  return (
    <>
      <div className={`hidden overflow-x-auto md:block ${khoi}`}>
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-border bg-accent/50 text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Agent</th>
              <th scope="col" className="px-3 py-2 font-medium">Người sở hữu</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Đang chờ</th>
              <th scope="col" className="px-3 py-2 font-medium">Hôm nay</th>
              <th scope="col" className="px-3 py-2 font-medium">Tháng này</th>
              <th scope="col" className="px-3 py-2 font-medium">Hoạt động gần nhất</th>
              <th scope="col" className="px-3 py-2 font-medium">Trạng thái</th>
              <th scope="col" className="px-3 py-2"><span className="sr-only">Hành động</span></th>
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
                    <span className="block max-w-[180px] truncate text-xs text-muted-foreground">{t.mo_ta ?? 'Chưa có mô tả'}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-[10px] font-semibold text-foreground" aria-hidden>{chuCai(chuSoHuu)}</span>
                      <span className="max-w-[150px] truncate text-xs text-foreground" title={chuSoHuu}>{chuSoHuu}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-foreground">{soCho[t.id] ?? 0}</td>
                  <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-foreground">{cs ? `${dong(su.ngay)} / ${dong(cs.han_muc_ngay)}` : '—'}</td>
                  <td className="w-44 px-3 py-2.5">{cs ? <ThanhDung nhan="" da={su.thang} tran={cs.han_muc_thang} /> : <span className="text-xs text-muted-foreground">Chưa có chính sách</span>}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-muted-foreground tabular-nums">{t.dung_lan_cuoi ? luc(t.dung_lan_cuoi) : 'Chưa gọi'}</td>
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
  suDung: { ngay: number; thang: number };
  soCho: number;
  chuSoHuu: string;
  dangLam: boolean;
} & HanhDongAgent) {
  const tomTat = cs ? tomTatChinhSach(cs, 0) : null;
  return (
    <article className={`${khoi} p-4`} aria-label={`Agent ${t.ten}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">{t.ten}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ChamTrangThaiAgent tt={t.trang_thai} />
            {TRANG_THAI_TAC_TU[t.trang_thai] ?? t.trang_thai}
          </p>
        </div>
        <MenuTacTu t={t} dangLam={dangLam} {...hd} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div className="min-w-0"><dt className="text-muted-foreground">Người sở hữu</dt><dd className="truncate text-foreground" title={chuSoHuu}>{chuSoHuu}</dd></div>
        <div><dt className="text-muted-foreground">Đang chờ duyệt</dt><dd className="text-foreground"><span className="font-mono tabular-nums">{soCho}</span> yêu cầu</dd></div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Chính sách</dt>
          <dd className="truncate text-foreground">{tomTat ? `Duyệt: ${tomTat.duyet}` : 'Chưa có'}</dd>
        </div>
        <div><dt className="text-muted-foreground">Hoạt động gần nhất</dt><dd className="font-mono tabular-nums text-foreground">{t.dung_lan_cuoi ? luc(t.dung_lan_cuoi) : 'Chưa gọi'}</dd></div>
      </dl>
      {cs && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <ThanhDung nhan="Hôm nay" da={suDung.ngay} tran={cs.han_muc_ngay} />
          <ThanhDung nhan="Tháng này" da={suDung.thang} tran={cs.han_muc_thang} />
        </div>
      )}
    </article>
  );
}

function ThemTacTu({ tao, dangLam }: { tao: (ten: string, moTa: string) => void; dangLam: boolean }) {
  const [ten, setTen] = useState('');
  const [moTa, setMoTa] = useState('');
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
        <span className="sr-only">Tên agent</span>
        <input data-mimi="tac-tu.ten" value={ten} onChange={(e) => setTen(e.target.value)} placeholder="Tên agent" maxLength={80} className={o} />
      </label>
      <label className="block">
        <span className="sr-only">Agent làm gì</span>
        <input value={moTa} onChange={(e) => setMoTa(e.target.value)} placeholder="Nó làm gì (không bắt buộc)" maxLength={300} className={o} />
      </label>
      <button data-mimi="tac-tu.them" data-mimi-khong-tu-bam disabled={dangLam || ten.trim().length < 2} className={nutChinh}>
        {dangLam ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Thêm agent
      </button>
    </form>
  );
}

/* ── Chính sách ────────────────────────────────────────────────────── */
function BangChinhSach({ ds, chinhSach, soNguoiNhan }: { ds: TacTu[]; chinhSach: Record<string, ChinhSachRow>; soNguoiNhan: number }) {
  const coCs = ds.filter((t) => chinhSach[t.id]);
  if (coCs.length === 0) return <Trong>Chưa có agent nào có chính sách.</Trong>;
  const tenNhom = (cs: ChinhSachRow) =>
    cs.nhom_chi_duoc_phep === null ? 'Mọi nhóm' : cs.nhom_chi_duoc_phep.map((n) => TEN_NHOM_CHI[n as NhomChi] ?? n).join(', ');
  return (
    <>
      <div className={`hidden overflow-x-auto md:block ${khoi}`}>
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border bg-accent/50 text-left text-xs text-muted-foreground">
            <tr>
              {['Agent', 'Phải duyệt', 'Mỗi khoản', 'Mỗi ngày', 'Mỗi tháng', 'Nhóm chi', 'Người nhận lạ', 'Tần suất', 'Hết hạn'].map((c) => (
                <th key={c} scope="col" className="px-3 py-2 font-medium">{c}</th>
              ))}
              <th scope="col" className="px-3 py-2"><span className="sr-only">Sửa</span></th>
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
                    <Link to={`/dashboard/chinh-sach?agent=${t.id}`} className={nutNhoPhu}>Sửa</Link>
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
                <Link to={`/dashboard/chinh-sach?agent=${t.id}`} className={nutPhu}>Sửa</Link>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <dt className="text-muted-foreground">Phải duyệt</dt><dd>{tt.duyet}</dd>
                <dt className="text-muted-foreground">Mỗi khoản / ngày</dt><dd className="font-mono tabular-nums">{dong(cs.han_muc_moi_lan)} / {dong(cs.han_muc_ngay)}</dd>
                <dt className="text-muted-foreground">Mỗi tháng</dt><dd className="font-mono tabular-nums">{dong(cs.han_muc_thang)}</dd>
                <dt className="text-muted-foreground">Nhóm chi</dt><dd>{tenNhom(cs)}</dd>
                <dt className="text-muted-foreground">Người nhận lạ</dt><dd>{tt['nguoi-la']}</dd>
                <dt className="text-muted-foreground">Tần suất · hết hạn</dt><dd>{tt['tan-suat']} · {tt['het-han']}</dd>
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
    return g.moi ? `Mới thêm · chưa tự duyệt (còn ~${g.conGio} giờ)` : 'Đủ 24 giờ';
  };

  return (
    <div className="space-y-4">
      {doiTk.length > 0 && (
        <section aria-labelledby="nn-doi-tk" className="rounded-lg border border-destructive/40 bg-card p-4">
          <h2 id="nn-doi-tk" className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle size={15} /> Tài khoản nhận thay đổi
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Các yêu cầu dưới đây dùng số tài khoản khác lần trả trước cho cùng người nhận — dấu hiệu thường gặp của lừa đảo
            giả danh nhà cung cấp. Gọi xác nhận qua số điện thoại bạn lưu từ trước.
          </p>
          <ul className="mt-2 divide-y divide-border">
            {doiTk.map((y) => (
              <li key={y.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0 text-foreground">
                  {y.ten_nguoi_nhan ?? 'Chưa rõ tên'} <span className="text-muted-foreground">· {tenNganHang(y.ngan_hang_bin)} · <span className="font-mono">{y.so_tai_khoan}</span> · {dong(y.so_tien)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <NhanTrangThai y={y} />
                  <button onClick={() => xem(y.id)} className={nutNhoPhu}>Xem</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {trungTen.length > 0 && (
        <section aria-labelledby="nn-trung-ten" className={`${khoi} p-4`}>
          <h2 id="nn-trung-ten" className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="h-2 w-2 rounded-full bg-mimi-amber" aria-hidden /> Cùng tên, nhiều số tài khoản trong danh sách
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Có thể đúng (một người dùng hai tài khoản), nhưng nên kiểm lại tài khoản nào còn dùng.</p>
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
        <h2 id="nn-them" className="text-sm font-semibold text-foreground">Thêm người nhận được phép</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Agent chỉ chi được cho những tài khoản này (trừ khi chính sách của nó cho phép hỏi bạn khi gặp người lạ).
        </p>
        <ThemNguoiNhan dangLam={dangLam === 'nguoi_nhan'} them={them} />
      </section>

      <div className="flex flex-col gap-2 md:flex-row">
        <label className="relative block md:flex-1">
          <span className="sr-only">Tìm người nhận</span>
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input type="search" value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm tên, số tài khoản, ghi chú…" className={`${o} pl-8`} />
        </label>
        <label className="block md:w-56">
          <span className="sr-only">Lọc ngân hàng</span>
          <select value={nganHang} onChange={(e) => setNganHang(e.target.value)} className={o}>
            <option value="tat_ca">Mọi ngân hàng</option>
            {binCo.map((b) => <option key={b} value={b}>{tenNganHang(b)}</option>)}
          </select>
        </label>
        <label className="block md:w-56">
          <span className="sr-only">Lọc thời gian giữ</span>
          <select value={giu} onChange={(e) => setGiu(e.target.value as typeof giu)} className={o}>
            <option value="tat_ca">Mọi trạng thái</option>
            <option value="moi">Mới thêm (dưới 24 giờ)</option>
            <option value="du">Đủ 24 giờ</option>
          </select>
        </label>
      </div>

      {nguoiNhan.length === 0 ? (
        <Trong>Danh sách đang trống.</Trong>
      ) : ds.length === 0 ? (
        <Trong>Không có người nhận nào khớp bộ lọc.</Trong>
      ) : (
        <>
          <div className={`hidden overflow-x-auto md:block ${khoi}`}>
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-border bg-accent/50 text-left text-xs text-muted-foreground">
                <tr>
                  {['Chủ tài khoản', 'Ngân hàng', 'Số tài khoản', 'Ghi chú', 'Trạng thái', 'Thêm lúc'].map((c) => (
                    <th key={c} scope="col" className="px-3 py-2 font-medium">{c}</th>
                  ))}
                  <th scope="col" className="px-3 py-2"><span className="sr-only">Bỏ</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ds.map((n) => (
                  <tr key={n.id}>
                    <td className="px-3 py-2.5 font-medium text-foreground">
                      <span className="flex items-center gap-1.5">
                        {idTrungTen.has(n.id) && <span className="h-1.5 w-1.5 rounded-full bg-mimi-amber" aria-label="cùng tên với tài khoản khác" />}
                        {n.ten_chu_tai_khoan}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{tenNganHang(n.ngan_hang_bin)}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">{n.so_tai_khoan}</td>
                    <td className="max-w-[180px] truncate px-3 py-2.5 text-muted-foreground">{n.ghi_chu ?? '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{nhanGiu(n)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-muted-foreground tabular-nums">{luc(n.created_at)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button data-mimi="tac-tu.nguoi-nhan.xoa" data-mimi-khong-tu-bam onClick={() => bo(n)} aria-label={`Bỏ ${n.ten_chu_tai_khoan}`} className={`${nutNho} w-8 px-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive`}>
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
                    {idTrungTen.has(n.id) && <span className="h-1.5 w-1.5 rounded-full bg-mimi-amber" aria-label="cùng tên với tài khoản khác" />}
                    <span className="truncate">{n.ten_chu_tai_khoan}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{tenNganHang(n.ngan_hang_bin)} · <span className="font-mono">{n.so_tai_khoan}</span></p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{nhanGiu(n)}{n.ghi_chu ? ` · ${n.ghi_chu}` : ''}</p>
                </div>
                <button data-mimi="tac-tu.nguoi-nhan.xoa" data-mimi-khong-tu-bam onClick={() => bo(n)} aria-label={`Bỏ ${n.ten_chu_tai_khoan}`} className={`${nutPhu} w-11 shrink-0 px-0 text-muted-foreground hover:text-destructive`}>
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
      <label className="block"><span className="sr-only">Ngân hàng</span>
        <select data-mimi="tac-tu.nguoi-nhan.ngan-hang" value={bin} onChange={(e) => setBin(e.target.value)} className={o}>
          {DANH_SACH_NGAN_HANG.map((n) => <option key={n.bin} value={n.bin}>{n.ten}</option>)}
        </select>
      </label>
      <label className="block"><span className="sr-only">Số tài khoản</span>
        <input data-mimi="tac-tu.nguoi-nhan.stk" value={stk} onChange={(e) => setStk(e.target.value)} placeholder="Số tài khoản" inputMode="numeric" className={o} />
      </label>
      <label className="block"><span className="sr-only">Tên chủ tài khoản</span>
        <input data-mimi="tac-tu.nguoi-nhan.ten" value={ten} onChange={(e) => setTen(e.target.value)} placeholder="Tên chủ tài khoản" className={o} />
      </label>
      <label className="block"><span className="sr-only">Ghi chú</span>
        <input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="Ghi chú" className={o} />
      </label>
      <button data-mimi="tac-tu.nguoi-nhan.them" data-mimi-khong-tu-bam disabled={dangLam || stk.length < 6 || ten.trim().length < 2} className={nutChinh}>
        <Plus size={14} /> Thêm
      </button>
    </form>
  );
}

/* ── Panel quyết định ──────────────────────────────────────────────── */
const KIEU_BUOC: Record<TrangThaiBuoc, { cham: string; doc: string }> = {
  xong: { cham: 'border-mimi-green bg-mimi-green', doc: 'đã xong' },
  dang: { cham: 'border-foreground bg-card', doc: 'đang ở bước này' },
  cho: { cham: 'border-border bg-card', doc: 'chưa tới' },
  dung: { cham: 'border-border bg-accent', doc: 'không áp dụng' },
};

function PanelQuyetDinh({
  y, tenTacTu, nguoiYeuCau, cs, suDung, dangLam, duyet, tuChoi, huy,
}: {
  y: YeuCau;
  tenTacTu: string;
  nguoiYeuCau: string;
  cs: ChinhSachRow | undefined;
  suDung: { ngay: number; thang: number } | undefined;
  dangLam: boolean;
  duyet: (themNguoiNhan: boolean) => void;
  tuChoi: () => void;
  huy: () => void;
}) {
  const [themNguoiNhan, setThemNguoiNhan] = useState(false);
  const [hienQr, setHienQr] = useState(false);
  const luat = luatDaKhop(y);
  const ghiChuNguoi = lyDoCua(y).find((l) => l.ma === 'NGUOI_DUYET_TU_CHOI');
  const kq = ketQuaDanhGia(y);
  const ns = nganSachQuanhKhoan(y, cs, suDung, new Date());
  const choDuyet = y.trang_thai === 'cho_duyet';
  const nguoiLa = luat.some((l) => l.ma === 'NGUOI_NHAN_MOI');
  const doiTk = luat.some((l) => l.ma === 'DOI_SO_TAI_KHOAN');
  const quaHan = y.trang_thai === 'da_duyet' && y.het_han_luc ? new Date(y.het_han_luc).getTime() < Date.now() : false;

  const ketQua = {
    duyet: { chu: 'Duyệt', mo: 'Trong chính sách — MIMI tự duyệt.', lop: 'text-mimi-green', icon: <Check size={16} /> },
    tu_choi: { chu: 'Từ chối', mo: 'Luật chặn khoản này. Không ai duyệt lại được — agent phải gửi yêu cầu mới.', lop: 'text-destructive', icon: <X size={16} /> },
    can_nguoi: {
      chu: 'Cần người xem',
      mo: y.cach_quyet === 'nguoi_duyet' ? (y.trang_thai === 'tu_choi' ? 'Luật đưa lên hỏi, và bạn đã từ chối.' : 'Luật đưa lên hỏi, và bạn đã duyệt.') : 'Luật không cho tự duyệt — chờ bạn quyết.',
      lop: 'text-foreground',
      icon: <span className="h-2.5 w-2.5 rounded-full bg-mimi-amber" />,
    },
  };
  const k = kq ? ketQua[kq] : { chu: 'Chưa xét', mo: 'MIMI chưa xét khoản này theo chính sách.', lop: 'text-muted-foreground', icon: <CircleDot size={16} /> };

  return (
    <>
      <SheetHeader className="space-y-1 border-b border-border px-5 py-4 pr-12 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <NhanTrangThai y={y} />
          <span className="text-xs text-muted-foreground">{giaiDoan(y)} · {tenTacTu} · {luc(y.created_at)}</span>
        </div>
        <SheetTitle className="font-mono text-3xl font-semibold tabular-nums">{dong(y.so_tien)}</SheetTitle>
        {/* Đọc lại bằng chữ: một số 0 thừa là chuyển gấp mười lần. Xem lib/soTienBangChu.ts. */}
        <SheetDescription>Bằng chữ: <span className="text-foreground">{docSoTienBangChu(Math.round(y.so_tien))}</span></SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <section aria-labelledby="pq-ket-qua" className={`${khoi} p-3`}>
          <h3 id="pq-ket-qua" className={nhanNho}>Kết quả đánh giá</h3>
          <p className={`mt-1 flex items-center gap-2 text-lg font-semibold ${k.lop}`}>{k.icon} {k.chu}</p>
          <p className="text-xs text-muted-foreground">{k.mo}</p>
        </section>

        {doiTk && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs">
            <p className="font-semibold text-destructive">Số tài khoản khác lần trả trước cho cùng người nhận</p>
            <p className="mt-1 text-muted-foreground">
              Đây là dấu hiệu thường gặp của lừa đảo giả danh nhà cung cấp. Chỉ duyệt sau khi đã gọi xác nhận qua số điện
              thoại bạn lưu từ trước.
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
            <p className="flex items-center gap-2 font-semibold text-foreground"><span className="h-2 w-2 rounded-full bg-mimi-amber" aria-hidden /> Lần đầu chi cho tài khoản này</p>
            <p className="mt-1 text-muted-foreground">
              Kẻ gian thường giả làm nhà cung cấp và gửi số tài khoản mới. Gọi xác nhận qua số điện thoại bạn đã lưu từ
              trước — không dùng số nằm trong tin nhắn đề nghị chuyển tiền.
            </p>
            <label className="mt-2 flex items-start gap-2 text-foreground">
              <input type="checkbox" className="mt-0.5" checked={themNguoiNhan} onChange={(e) => setThemNguoiNhan(e.target.checked)} />
              Tôi đã kiểm đúng tài khoản — thêm vào danh sách người nhận được phép
            </label>
          </div>
        )}

        <section aria-labelledby="pq-luat">
          <h3 id="pq-luat" className={nhanNho}>Vì sao</h3>
          {luat.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">Chưa có.</p>
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
          {ghiChuNguoi && <p className="mt-2 text-xs text-muted-foreground">Ghi chú khi bạn từ chối: <span className="text-foreground">{ghiChuNguoi.cau}</span></p>}
        </section>

        <section aria-labelledby="pq-chi-tiet">
          <h3 id="pq-chi-tiet" className={nhanNho}>Chi tiết</h3>
          <dl className="mt-2 grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Người yêu cầu</dt>
            <dd className="text-foreground">{nguoiYeuCau === 'Agent' ? `Agent ${tenTacTu}` : `${nguoiYeuCau} · tính vào ngân sách của ${tenTacTu}`}</dd>
            <dt className="text-muted-foreground">Mục đích</dt><dd className="text-foreground">{y.muc_dich}</dd>
            <dt className="text-muted-foreground">Người nhận</dt>
            <dd className="text-foreground">{y.ten_nguoi_nhan ?? 'chưa rõ tên'} <span className="text-muted-foreground">· {tenNganHang(y.ngan_hang_bin)} · <span className="font-mono">{y.so_tai_khoan}</span></span></dd>
            <dt className="text-muted-foreground">Nhóm chi</dt><dd className="text-foreground">{TEN_NHOM_CHI[y.nhom_chi as NhomChi] ?? y.nhom_chi}</dd>
            <dt className="text-muted-foreground">Nội dung chuyển khoản</dt><dd className="font-mono text-foreground">{y.ma_tham_chieu}</dd>
          </dl>
        </section>

        <section aria-labelledby="pq-ngan-sach">
          <h3 id="pq-ngan-sach" className={nhanNho}>Ngân sách của agent</h3>
          {!cs ? (
            <p className="mt-1 text-sm text-muted-foreground">Agent chưa có chính sách.</p>
          ) : !ns ? (
            <p className="mt-1 text-sm text-muted-foreground">Chỉ tính cho khoản tạo trong tháng này — hạn mức của tháng trước đã quay vòng.</p>
          ) : (
            <>
              <div className="mt-2 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-accent/50 text-left text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-1.5 font-medium"><span className="sr-only">Kỳ</span></th>
                      <th scope="col" className="px-3 py-1.5 text-right font-medium">Hạn mức</th>
                      <th scope="col" className="px-3 py-1.5 text-right font-medium">Còn lại, không tính khoản này</th>
                      <th scope="col" className="px-3 py-1.5 text-right font-medium">Còn lại, tính cả khoản này</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono tabular-nums">
                    {ns.dong.map((d) => {
                      const sau = d.tran - d.tinhCa;
                      return (
                        <tr key={d.nhan}>
                          <th scope="row" className="px-3 py-1.5 text-left font-sans font-medium text-foreground">{d.nhan}</th>
                          <td className="px-3 py-1.5 text-right">{dong(d.tran)}</td>
                          <td className="px-3 py-1.5 text-right">{dong(d.tran - d.khongTinh)}</td>
                          <td className={`px-3 py-1.5 text-right ${sau < 0 ? 'text-destructive' : ''}`}>{sau < 0 ? `Vượt ${dong(-sau)}` : dong(sau)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {ns.daTinh ? 'Khoản này đang được tính vào hạn mức.' : 'Khoản này không trừ vào hạn mức; cột cuối cho biết nếu nó được tính.'} Số đã dùng tính tới hiện tại, gồm cả khoản chờ duyệt.
              </p>
            </>
          )}
        </section>

        <section aria-labelledby="pq-chung-tu">
          <h3 id="pq-chung-tu" className={nhanNho}>Chứng từ</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li className="flex items-start gap-2">
              {y.so_hoa_don ? <Check size={14} className="mt-0.5 shrink-0 text-mimi-green" /> : <CircleDot size={14} className="mt-0.5 shrink-0 text-muted-foreground" />}
              <span>Số hoá đơn agent gửi kèm: <span className="font-mono text-foreground">{y.so_hoa_don ?? 'chưa gửi'}</span></span>
            </li>
            <li className="flex items-start gap-2">
              {y.trang_thai === 'da_chi' ? <Check size={14} className="mt-0.5 shrink-0 text-mimi-green" /> : <CircleDot size={14} className="mt-0.5 shrink-0 text-muted-foreground" />}
              <span>
                Sao kê xác nhận đã chi:{' '}
                {y.trang_thai === 'da_chi'
                  ? <span className="font-mono text-foreground">{dong(y.so_tien_thuc_chi ?? y.so_tien)} · {luc(y.da_chi_luc)}</span>
                  : <span className="text-foreground">chưa</span>}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Info size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
              <span>Hoá đơn điện tử đầu vào: <Link to="/dashboard/chung-tu" className={`font-medium text-foreground underline underline-offset-4 ${vien}`}>đối chiếu ở Chứng từ chi phí</Link></span>
            </li>
          </ul>
        </section>

        <section aria-labelledby="pq-tien-trinh">
          <h3 id="pq-tien-trinh" className={nhanNho}>Tiến trình</h3>
          <ol className="mt-3">
            {tienTrinh(y).map((b, i, ds) => (
              <li key={b.ten} className="relative flex gap-3 pb-4 last:pb-0">
                {i < ds.length - 1 && <span aria-hidden className="absolute left-[6px] top-4 h-full w-px bg-border" />}
                <span aria-hidden className={`relative mt-1 h-[13px] w-[13px] shrink-0 rounded-full border-2 ${KIEU_BUOC[b.trangThai].cham}`} />
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${b.trangThai === 'dung' ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {b.ten} <span className="sr-only">— {KIEU_BUOC[b.trangThai].doc}</span>
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
            <h3 id="pq-tra" className={nhanNho}>Thanh toán</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Nội dung chuyển khoản: <code className="font-semibold text-foreground">{y.ma_tham_chieu}</code> — giữ nguyên để sao kê
              tự xác nhận đã chi.
              {quaHan && <span className="text-destructive"> Lệnh đã quá 72 giờ — kiểm lại trước khi trả.</span>}
            </p>
            <button data-mimi="tac-tu.tra-qr" data-mimi-khong-tu-bam onClick={() => setHienQr((v) => !v)} className={`${nutChinh} mt-2 w-full`}>
              <QrCode size={14} /> {hienQr ? 'Ẩn mã QR' : 'Trả bằng mã QR'}
            </button>
            {hienQr && <MaQrTra y={y} />}
          </section>
        )}

        <p className="flex items-start gap-2 rounded-lg bg-accent/60 p-3 text-xs text-muted-foreground">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-foreground" />
          Agent không tự vượt được hạn mức hay quyền duyệt: khoản bị luật từ chối không có nút duyệt, chỉ khoản đang chờ mới
          duyệt được và chỉ bằng phiên đăng nhập của bạn. MIMI không chuyển tiền.
        </p>
      </div>

      {choDuyet && (
        <div className="grid grid-cols-2 gap-2 border-t border-border bg-card px-5 py-3">
          <button data-mimi="tac-tu.tu-choi" data-mimi-khong-tu-bam disabled={dangLam} onClick={tuChoi} className={nutPhu}>
            <X size={14} /> Từ chối
          </button>
          <button data-mimi="tac-tu.duyet" data-mimi-khong-tu-bam disabled={dangLam} onClick={() => duyet(themNguoiNhan)} className={nutChinh}>
            {dangLam ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Duyệt
          </button>
        </div>
      )}
      {y.trang_thai === 'da_duyet' && (
        <div className="border-t border-border bg-card px-5 py-3">
          <button data-mimi="tac-tu.huy" data-mimi-khong-tu-bam disabled={dangLam} onClick={huy} className={`${nutPhu} w-full`}>
            <X size={14} /> Huỷ lệnh trả
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
  return (
    <Dialog open={y !== null} onOpenChange={(m) => { if (!m) dongLai(); }}>
      <DialogContent className="rounded-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Từ chối {y ? dong(y.so_tien) : ''}</DialogTitle>
          <DialogDescription>Agent sẽ đọc được lý do. Để trống thì ghi "Chủ doanh nghiệp từ chối."</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); xacNhan(ghiChu); }}
          className="space-y-4"
        >
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Lý do từ chối</span>
            <textarea value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} maxLength={200} rows={3} className={o} />
          </label>
          <DialogFooter className="gap-2 sm:gap-2">
            <button type="button" onClick={dongLai} className={nutPhu}>Huỷ</button>
            <button type="submit" disabled={dangLam} className={nutChinh}>Từ chối khoản này</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const KET_LUAN_KIEM: Record<'tu_choi' | 'cho_duyet' | 'tu_dong_duyet', { chu: string; lop: string }> = {
  tu_dong_duyet: { chu: 'Sẽ tự duyệt', lop: 'bg-mimi-green/10 text-mimi-green' },
  cho_duyet: { chu: 'Cần duyệt', lop: 'border border-foreground/20 bg-card text-foreground' },
  tu_choi: { chu: 'Sẽ bị từ chối', lop: 'bg-destructive/10 text-destructive' },
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
  suDung: Record<string, { ngay: number; thang: number }>;
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

  const lenhMcp = `claude mcp add --transport http mimi ${DIEM_MCP} --header "x-mimi-agent-key: <khoá của agent>"`;
  const dauForm = (
    <SheetHeader className="text-left">
      <SheetTitle>Tạo yêu cầu chi</SheetTitle>
      <SheetDescription>
        Tính vào ngân sách của một agent và đi qua đúng chính sách của agent đó — kể cả bạn cũng không có lối tắt qua luật.
        MIMI không chuyển tiền.
      </SheetDescription>
    </SheetHeader>
  );

  if (ds.length === 0) {
    return (
      <>
        {dauForm}
        <div className={`${khoi} mt-5 p-4`}>
          <p className="text-sm text-foreground">Chưa có agent nào để tính ngân sách.</p>
          <p className="mt-1 text-xs text-muted-foreground">Mỗi khoản chi thuộc về một agent và chính sách của nó. Thêm agent trước.</p>
          <button onClick={moAgents} className={`${nutChinh} mt-3`}><Plus size={14} /> Thêm agent</button>
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
          <label htmlFor="tyc-agent" className={nhanTruong}>Tính vào ngân sách của agent</label>
          <select id="tyc-agent" value={tacTuId} onChange={(e) => setTacTuId(e.target.value)} className={o}>
            {ds.map((x) => (
              <option key={x.id} value={x.id}>{x.ten}{x.trang_thai === 'tam_dung' ? ' (tạm dừng)' : ''}</option>
            ))}
          </select>
          {cs && (
            <p className="mt-1 text-xs text-muted-foreground">
              Hôm nay còn <span className="font-mono tabular-nums text-foreground">{dong(Math.max(0, cs.han_muc_ngay - (su?.ngay ?? 0)))}</span>
              {' · '}tháng này còn <span className="font-mono tabular-nums text-foreground">{dong(Math.max(0, cs.han_muc_thang - (su?.thang ?? 0)))}</span>
              {' · '}mỗi khoản tối đa <span className="font-mono tabular-nums text-foreground">{dong(cs.han_muc_moi_lan)}</span>
            </p>
          )}
        </div>

        <fieldset>
          <legend className={nhanTruong}>Người nhận</legend>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-accent p-1" role="group" aria-label="Cách chọn người nhận">
            {([['danh_sach', 'Trong danh sách'], ['khac', 'Tài khoản khác']] as const).map(([k, chu]) => (
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
              <select aria-label="Chọn người nhận" value={nguoiNhanId} onChange={(e) => setNguoiNhanId(e.target.value)} className={`${o} mt-2`}>
                {nguoiNhan.map((n) => (
                  <option key={n.id} value={n.id}>{n.ten_chu_tai_khoan} · {tenNganHang(n.ngan_hang_bin)} · {n.so_tai_khoan}</option>
                ))}
              </select>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Danh sách người nhận đang trống — chọn "Tài khoản khác".</p>
            )
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <select aria-label="Ngân hàng người nhận" value={bin} onChange={(e) => setBin(e.target.value)} className={o}>
                {DANH_SACH_NGAN_HANG.map((n) => <option key={n.bin} value={n.bin}>{n.ten}</option>)}
              </select>
              <input aria-label="Số tài khoản người nhận" value={stk} onChange={(e) => setStk(e.target.value)} placeholder="Số tài khoản" inputMode="numeric" className={`${o} font-mono`} />
              <input aria-label="Tên chủ tài khoản" value={tenNhan} onChange={(e) => setTenNhan(e.target.value)} placeholder="Tên chủ tài khoản" className={`${o} sm:col-span-2`} />
            </div>
          )}
        </fieldset>

        <div>
          <label htmlFor="tyc-so-tien" className={nhanTruong}>Số tiền</label>
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
          {soTien > 0 && <p className="mt-1 text-xs text-muted-foreground">Bằng chữ: <span className="text-foreground">{docSoTienBangChu(soTien)}</span></p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="tyc-nhom" className={nhanTruong}>Nhóm chi</label>
            <select id="tyc-nhom" value={nhomChi} onChange={(e) => setNhomChi(e.target.value)} className={o}>
              {NHOM_CHI.map((n) => <option key={n} value={n}>{TEN_NHOM_CHI[n]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="tyc-hoa-don" className={nhanTruong}>Số hoá đơn <span className="font-normal">(nếu có)</span></label>
            <input id="tyc-hoa-don" value={soHoaDon} onChange={(e) => setSoHoaDon(e.target.value)} maxLength={60} className={`${o} font-mono`} />
          </div>
        </div>

        <div>
          <label htmlFor="tyc-muc-dich" className={nhanTruong}>Mục đích</label>
          <textarea id="tyc-muc-dich" value={mucDich} onChange={(e) => setMucDich(e.target.value)} maxLength={300} rows={2} placeholder="Ví dụ: Gia hạn phần mềm kế toán tháng 9" className={o} />
        </div>

        {kiem && (
          <section aria-labelledby="tyc-kiem" aria-live="polite" className={`${khoi} p-3`}>
            <div className="flex items-center justify-between gap-2">
              <h3 id="tyc-kiem" className={nhanNho}>Kiểm tra trước</h3>
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${KET_LUAN_KIEM[kiem.ketLuan].lop}`}>
                {kiem.ketLuan === 'cho_duyet' && <span className="h-1.5 w-1.5 rounded-full bg-mimi-amber" aria-hidden />}
                {KET_LUAN_KIEM[kiem.ketLuan].chu}
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
              Ước tính theo chính sách hiện tại. Khi gửi, MIMI xét đầy đủ — gồm cả tần suất và đổi số tài khoản.
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
          {dangGui ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Gửi yêu cầu
        </button>
        <p className="text-xs text-muted-foreground">
          Được duyệt thì khoản chuyển sang "Chờ bạn trả" — bạn vẫn trả bằng app ngân hàng, và nó chỉ thành "Đã chi" khi sao kê xác nhận.
        </p>
      </form>

      <details className="mt-6 border-t border-border pt-4">
        <summary className={`cursor-pointer rounded text-sm font-medium text-foreground ${vien}`}>Để agent tự xin chi — dành cho người phụ trách kỹ thuật</summary>
        <ol className="mt-3 space-y-3 text-xs text-muted-foreground">
          <li>1. Mỗi agent một khoá, chỉ hiện một lần lúc tạo agent hoặc cấp khoá mới.</li>
          <li>
            2. Dán vào Terminal, thay phần trong ngoặc nhọn bằng khoá của agent:
            <pre className="mt-1.5 overflow-x-auto rounded-lg bg-accent p-3 font-mono text-[11px] text-foreground">{lenhMcp}</pre>
          </li>
          <li>3. Agent gửi yêu cầu chi; khoản cần bạn quyết hiện ở Tổng quan và tab Yêu cầu chi.</li>
        </ol>
        <button type="button" onClick={moAgents} className={`${nutPhu} mt-3`}>Mở tab Agents</button>
      </details>
    </>
  );
}

function KhoaMoi({ ten, khoa, dongLai }: { ten: string; khoa: string; dongLai: () => void }) {
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
    navigator.clipboard.writeText(s).then(() => toast.success('Đã chép.'), () => toast.error('Không chép được — bôi đen rồi chép tay.'));

  return (
    <section aria-labelledby="khoa-moi" className="rounded-lg border border-foreground/25 bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <h2 id="khoa-moi" className="flex items-center gap-2 text-sm font-semibold text-foreground"><KeyRound size={15} /> Khoá của "{ten}" — gửi cho người cài đặt agent</h2>
        <button onClick={dongLai} aria-label="Đóng" className={`${nutNho} w-8 px-0 text-muted-foreground hover:bg-accent`}><X size={16} /></button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Khoá chỉ hiện <strong className="text-foreground">một lần</strong>. MIMI chỉ lưu bản băm nên không xem lại được — mất thì cấp khoá mới.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg bg-accent px-3 py-2 font-mono text-xs">{khoa}</code>
        <button onClick={() => chep(khoa)} className={nutPhu}><Copy size={14} /> Chép</button>
      </div>
      {/* Lệnh cài đặt là việc của người phụ trách kỹ thuật: thu gọn, chủ doanh nghiệp chỉ cần chép khoá. */}
      <details className="mt-4 rounded-lg border border-border p-4">
        <summary className={`cursor-pointer rounded text-xs font-semibold text-foreground ${vien}`}>Hướng dẫn cài đặt cho người phụ trách kỹ thuật</summary>
        <p className="mt-1 text-xs text-muted-foreground">
          Dán một dòng dưới đây vào công cụ AI. Trợ lý sẽ tự thấy các việc "xem hạn mức", "xin chi", "xem yêu cầu".
        </p>
        <p className="mt-3 text-[11px] font-medium text-muted-foreground">Claude Code — dán vào Terminal</p>
        <div className="mt-1 flex items-start gap-2">
          <pre className="flex-1 overflow-x-auto rounded-lg bg-accent p-2 text-[11px]">{lenhClaude}</pre>
          <button onClick={() => chep(lenhClaude)} aria-label="Chép lệnh Claude Code" className={`${nutPhu} px-2.5`}><Copy size={13} /></button>
        </div>
        <p className="mt-3 text-[11px] font-medium text-muted-foreground">Cursor — dán vào file mcp.json</p>
        <div className="mt-1 flex items-start gap-2">
          <pre className="flex-1 overflow-x-auto rounded-lg bg-accent p-2 text-[11px]">{cauHinhCursor}</pre>
          <button onClick={() => chep(cauHinhCursor)} aria-label="Chép cấu hình Cursor" className={`${nutPhu} px-2.5`}><Copy size={13} /></button>
        </div>
        <details className="mt-3">
          <summary className={`cursor-pointer rounded text-xs text-muted-foreground ${vien}`}>Gọi API trực tiếp</summary>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-accent p-3 text-[11px] leading-relaxed">{viDu}</pre>
        <p className="mt-2 text-xs text-muted-foreground">
          Hành động của agent: <code>xem_chinh_sach</code>, <code>xin_chi</code>, <code>xem_yeu_cau</code>. Gửi cùng{' '}
          <code>ma_yeu_cau</code> khi thử lại để không sinh khoản chi thứ hai.
        </p>
        </details>
      </details>
    </section>
  );
}

function MaQrTra({ y }: { y: YeuCau }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [loi, setLoi] = useState<string | null>(null);

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
        if (e) setLoi('Không vẽ được mã QR.');
      });
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Không dựng được mã VietQR.');
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
          <Download size={14} /> Lưu ảnh mã QR
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {loi ?? 'Trả trên máy tính: quét mã bằng app ngân hàng. Trả ngay trên điện thoại này: lưu ảnh mã rồi mở từ thư viện ảnh trong app ngân hàng, hoặc chép từng dòng dưới đây.'}
      </p>
      <div className="rounded-lg border border-border px-3">
        <DongChep nhan="Ngân hàng" giaTri={tenNganHang(y.ngan_hang_bin)} />
        <DongChep nhan="Số tài khoản" giaTri={y.so_tai_khoan} />
        <DongChep nhan="Số tiền" giaTri={String(Math.round(y.so_tien))} hien={dong(y.so_tien)} />
        <DongChep nhan="Nội dung chuyển khoản — giữ nguyên" giaTri={y.ma_tham_chieu ?? ''} />
      </div>
      <p className="text-xs text-muted-foreground">
        Kiểm tên người nhận app ngân hàng hiện ra trước khi xác nhận. Sao kê về tới MIMI thì khoản này tự chuyển sang "Đã chi".
      </p>
    </div>
  );
}

function DongChep({ nhan, giaTri, hien }: { nhan: string; giaTri: string; hien?: string }) {
  const chep = () =>
    navigator.clipboard.writeText(giaTri).then(
      () => toast.success(`Đã chép ${nhan.split(' — ')[0].toLowerCase()}.`),
      () => toast.error('Không chép được — bôi đen rồi chép tay.'),
    );
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border py-2 first:border-t-0">
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{nhan}</p>
        <p className="truncate font-mono text-sm text-foreground">{hien ?? giaTri}</p>
      </div>
      <button type="button" onClick={() => void chep()} disabled={!giaTri} className={`${nutPhu} shrink-0`}>
        <Copy size={14} /> Chép
      </button>
    </div>
  );
}
