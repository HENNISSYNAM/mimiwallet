/**
 * HÀNG DUYỆT của văn phòng kế toán (16/11/2026) — "Cursor cho công việc tài chính": agent đề xuất, NGƯỜI duyệt.
 *
 * Mỗi đề xuất là một thay đổi xem lại được: khách nào, agent đề xuất gì, bằng chứng (dòng sao kê, quy tắc / nguồn, độ tin
 * cậy) và tác động lên con số (khoảng doanh thu trước → sau, phía của ngưỡng 01 tỷ / 03 tỷ).
 *
 * Hai loại:
 *   - PHÂN LOẠI TIỀN VÀO — duyệt được. "Chấp nhận" đi qua đúng đường ghi quyết định của người đã có: edge function
 *     `to-khai`, hành động `xac_nhan_tien_vao` (kiểm thành viên + quyền `sua_ho_so_thue` + phạm vi cơ sở ở máy chủ, ghi
 *     `revenue_classifications`, một dòng `revenue_classification_events` và `nhat_ky_quyet_dinh`). Ở đây KHÔNG ghi gì.
 *     Gồm: khoản chưa ai quyết (đề xuất theo quy tắc đọc nội dung, hoặc mặc định thận trọng "tính là doanh thu"), và
 *     khoản MIMI đã tự phân loại (`confirmed_role = mimi_tu_dong`) mà chưa người nào ký nhận.
 *   - HẠN THUẾ, TỜ KHAI SẴN SÀNG, DÒNG TIỀN, HỒ SƠ VIỆC, NGƯỠNG — chỉ dẫn đường tới trang làm việc đó.
 *
 * AGENT NGOÀI (22/11/2026): agent của kế toán nối qua MCP gửi ý kiến (`de_xuat_agent_ngoai`). Ý kiến đó thay gợi ý của
 * quy tắc cho khoản chưa người nào quyết, ghi rõ nguồn `agent_ngoai` + tên agent — vẫn chỉ là đề xuất, người duyệt.
 *
 * Duyệt hàng loạt CHỈ cho đề xuất không thể làm giảm doanh thu (xác nhận là tiền bán hàng). Mọi đề xuất loại khỏi
 * doanh thu phải duyệt từng cái. Hàm thuần, tất định.
 */
import { anhHuong, goiYPhanLoai, type LoaiPhanLoai } from '../doanh-thu/phan-loai.ts';
import type { KetQuaDoChacChan } from '../doanh-thu/do-chac-chan.ts';
import { ngayVN, type SoLieuDoanhThu } from '../doanh-thu/so-lieu.ts';
import { LY_DO_THAN_TRONG, VAI_MIMI } from '../phan-loai/tu-phan-loai.ts';
import { duocLam, type VaiTro } from '../quyen/vai-tro.ts';
import { chieuTien } from '../tien/chieu-tien.ts';
import type { KhachVanPhong, MucKhach, TenAgentVP } from './danh-muc.ts';

// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

export const TOI_DA_PHAN_LOAI_MOI_KHACH = 20;
export const TOI_DA_HANG_DUYET = 300;

export type LoaiDeXuat = 'phan_loai' | 'han_thue' | 'to_khai_san_sang' | 'dong_tien' | 'viec' | 'nguong';
export type Phia = 'tren' | 'duoi' | 'chua_chac';

export interface DongBangChung { transaction_id: string; ngay: string; so_tien: number; noi_dung: string }

export interface DeXuat {
  /** Khoá ổn định: cùng một đề xuất → cùng khoá ở mọi lần tải (giao diện nhớ "đã bỏ qua"). */
  khoa: string;
  company_id: string;
  ten_khach: string;
  loai: LoaiDeXuat;
  agent: TenAgentVP;
  muc: MucKhach;
  /** Chấp nhận được ngay trên hàng (đề xuất phân loại + vai trò của người xem được xác nhận cho khách này). */
  co_the_duyet: boolean;
  /** Chỉ đề xuất không thể làm giảm doanh thu. */
  duyet_hang_loat: boolean;
  phan_loai: {
    transaction_id: string;
    de_xuat: LoaiPhanLoai;
    /** Loại đang ghi (null: chưa ai quyết). */
    hien_tai: LoaiPhanLoai | null;
    /** MIMI đã tự phân loại khoản này, chưa người nào ký nhận. */
    may_da_quyet: boolean;
    anh_huong: 'include' | 'exclude' | 'pending';
  } | null;
  bang_chung: {
    dong: DongBangChung[];
    nguon: 'quy_tac_noi_dung' | 'than_trong' | 'lich_thue' | 'so_lieu' | 'agent_ngoai';
    ly_do: string | null;
    /** Tên khoá MCP của agent đã gửi ý kiến (chỉ khi nguon = agent_ngoai). */
    agent_ngoai?: string;
    tin_cay: 'cao' | 'trung_binh' | 'thap';
  };
  tac_dong: {
    truoc: { can_duoi: number; can_tren: number };
    sau: { can_duoi: number; can_tren: number };
    nguong: { ma: string; gia_tri: number; truoc: Phia; sau: Phia }[];
    /** Phía của ít nhất một ngưỡng đổi sau khi chấp nhận. */
    doi_phia: boolean;
  } | null;
  so: number | null;
  ngay: string | null;
  ten_viec: string | null;
}

const NGUONG_XET = new Set(['mien_thue_1_ty', 'phuong_phap_3_ty']);
const phiaCua = (duoi: number, tren: number, T: number): Phia => (duoi > T ? 'tren' : tren <= T ? 'duoi' : 'chua_chac');
const noiDung = (t: Row) => [t.counter_account_name, t.merchant_name ?? t.payment_reference].filter(Boolean).join(' — ') || '—';
const so = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/**
 * Khoảng doanh thu sau khi chấp nhận một khoản, đúng công thức của `tinhDoChacChan`:
 *   cận dưới = max(0, giá trị − có thể giảm), cận trên = giá trị + có thể tăng + khoảng trống.
 * Khoản chưa quyết số tiền a đang nằm trong "giá trị" và "có thể giảm":
 *   xác nhận là doanh thu → có thể giảm − a (cận dưới lên); loại ra → giá trị − a và có thể giảm − a (cận trên xuống).
 * Khoản máy đã quyết (không còn "chưa rõ"): người ký nhận đúng loại đó → số không đổi.
 */
export function khoangSau(
  s: Pick<SoLieuDoanhThu, 'uoc_tinh' | 'chua_ro' | 'am_bat_thuong'>, dc: KetQuaDoChacChan, a: number, hieuLuc: 'include' | 'exclude' | 'pending', chuaRo: boolean,
): { can_duoi: number; can_tren: number } {
  const gia = so(s.uoc_tinh), giam = so(s.chua_ro) + so(s.am_bat_thuong), tren = so(dc.can_tren);
  if (!chuaRo || hieuLuc === 'pending') return { can_duoi: so(dc.can_duoi), can_tren: tren };
  if (hieuLuc === 'include') return { can_duoi: Math.max(0, gia - (giam - a)), can_tren: tren };
  return { can_duoi: Math.max(0, (gia - a) - (giam - a)), can_tren: tren - a };
}

export interface DauVaoPhanLoai {
  company_id: string;
  ten: string;
  vai_tro: VaiTro;
  nam: number;
  giaoDich: Row[];
  xacNhan: Row[];
  noiBo: Set<string>;
  s: Pick<SoLieuDoanhThu, 'uoc_tinh' | 'chua_ro' | 'am_bat_thuong'>;
  dc: KetQuaDoChacChan;
  /** Ý kiến mới nhất của agent ngoài theo transaction_id. */
  ngoai?: Map<string, YKienNgoai>;
}

export interface YKienNgoai { loai: LoaiPhanLoai; ly_do: string; ten_agent: string }

/** Đề xuất phân loại tiền vào của MỘT khách, nặng trước, tối đa `TOI_DA_PHAN_LOAI_MOI_KHACH`. */
export function deXuatPhanLoai(d: DauVaoPhanLoai): DeXuat[] {
  const theoGd = new Map(d.xacNhan.map((x) => [String(x.transaction_id), x]));
  const duyet = duocLam(d.vai_tro, 'sua_ho_so_thue');
  const truoc = { can_duoi: so(d.dc.can_duoi), can_tren: so(d.dc.can_tren) };
  const nguong = d.dc.nguong.filter((n) => NGUONG_XET.has(n.ma));
  const daThay = new Set<string>();
  const ra: DeXuat[] = [];
  for (const t of d.giaoDich) {
    const id = String(t.id);
    if (daThay.has(id) || d.noiBo.has(id)) continue;
    daThay.add(id);
    if (!ngayVN(t.transaction_date).startsWith(String(d.nam)) || chieuTien(t) !== 'vao') continue;
    const a = Math.round(Math.abs(Number(t.amount)));
    if (!(Number(t.amount) > 0) || !a) continue;
    const x = theoGd.get(id);
    const mayQuyet = !!x && x.confirmed_role === VAI_MIMI;
    const nguoiQuyet = !!x && !mayQuyet && (x.revenue_effect === 'include' || x.revenue_effect === 'exclude');
    if (nguoiQuyet) continue;
    const g = goiYPhanLoai({ merchant_name: t.merchant_name ?? null, counter_account_name: t.counter_account_name ?? null, payment_reference: t.payment_reference ?? null });
    const yk = d.ngoai?.get(id);
    const deXuat: LoaiPhanLoai = yk ? yk.loai : mayQuyet ? (x!.confirmed_type as LoaiPhanLoai) : (g?.loai ?? 'business_revenue');
    const hl = anhHuong(deXuat);
    const chuaRo = !x || x.revenue_effect === 'pending';
    const sau = khoangSau(d.s, d.dc, a, hl, chuaRo);
    const ng = nguong.map((n) => ({
      ma: n.ma, gia_tri: n.gia_tri,
      truoc: phiaCua(truoc.can_duoi, truoc.can_tren, n.gia_tri),
      sau: phiaCua(sau.can_duoi, sau.can_tren, n.gia_tri),
    }));
    const doiPhia = ng.some((n) => n.truoc !== n.sau);
    // Loại khỏi doanh thu mà chưa người nào quyết (kể cả khi máy đã ghi) là rủi ro khai thiếu: không bao giờ "xanh".
    const muc: MucKhach = doiPhia ? 'do' : hl === 'exclude' ? 'vang' : 'xanh';
    ra.push({
      khoa: `pl:${d.company_id}:${id}`,
      company_id: d.company_id, ten_khach: d.ten, loai: 'phan_loai', agent: 'phan_loai', muc,
      co_the_duyet: duyet,
      duyet_hang_loat: duyet && hl === 'include',
      phan_loai: { transaction_id: id, de_xuat: deXuat, hien_tai: x ? (x.confirmed_type as LoaiPhanLoai) ?? null : null, may_da_quyet: mayQuyet, anh_huong: hl },
      bang_chung: yk
        ? {
          dong: [{ transaction_id: id, ngay: ngayVN(t.transaction_date), so_tien: a, noi_dung: noiDung(t) }],
          // Agent ngoài là mô hình đọc cùng bằng chứng: không bao giờ "cao" — kế toán vẫn phải xem.
          nguon: 'agent_ngoai', ly_do: yk.ly_do, tin_cay: 'trung_binh', agent_ngoai: yk.ten_agent,
        }
        : {
          dong: [{ transaction_id: id, ngay: ngayVN(t.transaction_date), so_tien: a, noi_dung: noiDung(t) }],
          nguon: g ? 'quy_tac_noi_dung' : 'than_trong',
          ly_do: g?.ly_do ?? LY_DO_THAN_TRONG,
          // Quy tắc đọc thấy dấu hiệu rõ trong nội dung: trung bình (máy đọc chữ, có thể nhầm). Không dấu hiệu: thấp.
          tin_cay: g ? 'trung_binh' : 'thap',
        },
      tac_dong: { truoc, sau, nguong: ng, doi_phia: doiPhia },
      so: a, ngay: ngayVN(t.transaction_date), ten_viec: null,
    });
  }
  return ra.sort(soSanhDeXuat).slice(0, TOI_DA_PHAN_LOAI_MOI_KHACH);
}

/** Đề xuất chỉ dẫn đường của một khách: hạn / tờ khai sẵn sàng, dòng tiền, hồ sơ việc, ngưỡng. */
export function deXuatDieuHuong(k: KhachVanPhong, coPhanLoai: boolean): DeXuat[] {
  const goc = { company_id: k.id, ten_khach: k.ten, co_the_duyet: false, duyet_hang_loat: false, phan_loai: null, tac_dong: null };
  const ra: DeXuat[] = [];
  const moc = k.thue?.moc_ke_tiep;
  if (k.thue && moc && moc.con_lai !== null && moc.con_lai <= 30) {
    const sanSang = k.thue.trang_thai === 'san_sang';
    ra.push({
      ...goc, khoa: `${sanSang ? 'tk' : 'han'}:${k.id}:${moc.han ?? moc.ten}`, loai: sanSang ? 'to_khai_san_sang' : 'han_thue', agent: 'thue',
      muc: sanSang ? 'xanh' : moc.con_lai <= 7 ? 'do' : 'vang',
      bang_chung: { dong: [], nguon: 'lich_thue', ly_do: k.thue.ten_viec, tin_cay: 'cao' },
      so: moc.con_lai, ngay: moc.han, ten_viec: moc.ten,
    });
  }
  if (k.dong_tien_30_ngay && k.dong_tien_30_ngay.rong < 0) {
    ra.push({
      ...goc, khoa: `dt:${k.id}:${k.dong_tien_30_ngay.tu}`, loai: 'dong_tien', agent: 'du_bao', muc: 'vang',
      bang_chung: { dong: [], nguon: 'so_lieu', ly_do: null, tin_cay: 'cao' },
      so: -k.dong_tien_30_ngay.rong, ngay: k.dong_tien_30_ngay.tu, ten_viec: null,
    });
  }
  if (k.viec_mo.so > 0) {
    ra.push({
      ...goc, khoa: `viec:${k.id}`, loai: 'viec', agent: 'tai_lieu', muc: k.viec_mo.chan > 0 ? 'do' : 'vang',
      bang_chung: { dong: [], nguon: 'so_lieu', ly_do: null, tin_cay: 'cao' },
      so: k.viec_mo.so, ngay: null, ten_viec: null,
    });
  }
  // Ngưỡng chưa chắc mà không còn khoản nào để duyệt ở đây (vd. khoảng trống tháng thiếu sao kê): dẫn tới trang nhắc thuế.
  if (k.doanh_thu?.can_xem && !coPhanLoai) {
    const n = k.doanh_thu.nguong.find((x) => NGUONG_XET.has(x.ma) && x.phia === 'chua_chac');
    ra.push({
      ...goc, khoa: `ng:${k.id}:${n?.ma ?? ''}`, loai: 'nguong', agent: 'phan_loai', muc: 'do',
      bang_chung: { dong: [], nguon: 'so_lieu', ly_do: null, tin_cay: 'cao' },
      so: n?.gia_tri ?? null, ngay: null, ten_viec: null,
    });
  }
  return ra;
}

const HANG: Record<MucKhach, number> = { do: 0, vang: 1, xanh: 2 };

export function soSanhDeXuat(a: DeXuat, b: DeXuat): number {
  return (HANG[a.muc] - HANG[b.muc])
    || (Number(!!b.tac_dong?.doi_phia) - Number(!!a.tac_dong?.doi_phia))
    || ((a.loai === 'han_thue' || a.loai === 'to_khai_san_sang') && (b.loai === 'han_thue' || b.loai === 'to_khai_san_sang') ? (a.so ?? 0) - (b.so ?? 0) : 0)
    || ((b.so ?? 0) - (a.so ?? 0))
    || (a.khoa < b.khoa ? -1 : a.khoa > b.khoa ? 1 : 0);
}
