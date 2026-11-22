/**
 * Phía máy chủ của MCP bàn kế toán (22/11/2026): xác thực khoá, chạy ba công cụ, quản lý khoá.
 *
 * QUYỀN = QUYỀN CỦA NGƯỜI TẠO KHOÁ. Khoá gắn với MỘT người (kế toán); agent thấy đúng những khách người đó thấy ở
 * /dashboard/van-phong (`docThanhVien`: chủ sở hữu / quản trị / kế toán, không bị giới hạn một cơ sở). Không nhận
 * `user_id` từ agent; `company_id` agent gửi chỉ được dùng SAU khi đã khớp với tập công ty đó.
 *
 * KHÔNG GHI SỔ. Chỉ ghi `de_xuat_agent_ngoai` (ý kiến). Sổ (`revenue_classifications`) chỉ đổi khi người bấm duyệt.
 */
import { docDanhMucKhach, docThanhVien } from '../van-phong/danh-muc.ts';
import { LOAI_PHAN_LOAI, type LoaiPhanLoai } from '../doanh-thu/phan-loai.ts';
import { VAI_MIMI } from '../phan-loai/tu-phan-loai.ts';
import { chieuTien } from '../tien/chieu-tien.ts';
import { bamKhoa, hienKhoa, laKhoaTacTu, sinhKhoa } from '../tac-tu/khoa.ts';
import type { KetQuaChay } from './may-chu.ts';

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

export const TOI_DA_KHOA_MOI_NGUOI = 10;
export const KICH_THUOC_TRANG_MCP = 50;
export const GIOI_HAN_HANG_MAC_DINH = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOAI_DE_XUAT = new Set(['phan_loai', 'han_thue', 'to_khai_san_sang', 'dong_tien', 'viec', 'nguong']);

const loi = (ma: string, cau: string, status: number): KetQuaChay => ({ status, body: { error: cau, ma } });

export interface KhoaHopLe { id: string; user_id: string; ten: string }

// ── Xác thực ────────────────────────────────────────────────────────────────

/** Khoá đúng khuôn, có trong bảng, chưa thu hồi → người sở hữu. Sai thì `null` (người gọi đếm lần sai). */
export async function xacThucKhoaMcp(db: Db, khoa: string | null): Promise<KhoaHopLe | null> {
  if (!laKhoaTacTu(khoa)) return null;
  const { data, error } = await db.from('khoa_mcp').select('id, user_id, ten, thu_hoi_luc')
    .eq('khoa_bam', await bamKhoa(khoa)).maybeSingle();
  if (error) throw new Error(`Không đọc được khoá MCP: ${error.message}`);
  if (!data || data.thu_hoi_luc) return null;
  await db.from('khoa_mcp').update({ dung_lan_cuoi: new Date().toISOString() }).eq('id', data.id);
  return { id: String(data.id), user_id: String(data.user_id), ten: String(data.ten) };
}

// ── Kiểm đầu vào (thuần) ────────────────────────────────────────────────────

export interface DeXuatHopLe { company_id: string; transaction_id: string; loai: LoaiPhanLoai; ly_do: string }

export function kiemDeXuat(d: Record<string, unknown>): { ok: true; v: DeXuatHopLe } | { ok: false; cau: string } {
  const company_id = String(d.company_id ?? '').trim();
  const transaction_id = String(d.transaction_id ?? '').trim();
  const loai = String(d.loai ?? '');
  const ly_do = String(d.ly_do ?? '').replace(/\s+/g, ' ').trim();
  if (!UUID_RE.test(company_id)) return { ok: false, cau: 'company_id không hợp lệ — lấy từ danh_sach_khach.' };
  if (!UUID_RE.test(transaction_id)) return { ok: false, cau: 'transaction_id không hợp lệ — lấy từ hang_duyet.' };
  if (!(LOAI_PHAN_LOAI as readonly string[]).includes(loai) || loai === 'unknown') {
    return { ok: false, cau: `loai phải là một trong: ${LOAI_PHAN_LOAI.filter((l) => l !== 'unknown').join(', ')}.` };
  }
  if (ly_do.length < 5 || ly_do.length > 300) return { ok: false, cau: 'ly_do dài 5–300 ký tự, dựa trên bằng chứng kế toán kiểm lại được.' };
  return { ok: true, v: { company_id: company_id.toLowerCase(), transaction_id: transaction_id.toLowerCase(), loai: loai as LoaiPhanLoai, ly_do } };
}

export function kiemLocHang(d: Record<string, unknown>): { ok: true; company_id: string | null; loai: string | null; gioi_han: number } | { ok: false; cau: string } {
  const cid = d.company_id == null || d.company_id === '' ? null : String(d.company_id).trim();
  if (cid !== null && !UUID_RE.test(cid)) return { ok: false, cau: 'company_id không hợp lệ.' };
  const loai = d.loai == null || d.loai === '' ? null : String(d.loai);
  if (loai !== null && !LOAI_DE_XUAT.has(loai)) return { ok: false, cau: 'loai không hợp lệ.' };
  const g = d.gioi_han == null ? GIOI_HAN_HANG_MAC_DINH : Number(d.gioi_han);
  if (!Number.isInteger(g) || g < 1 || g > 100) return { ok: false, cau: 'gioi_han từ 1 đến 100.' };
  return { ok: true, company_id: cid?.toLowerCase() ?? null, loai, gioi_han: g };
}

// ── Chạy công cụ ────────────────────────────────────────────────────────────

export async function chayCongCuMcp(db: Db, k: KhoaHopLe, ten: string, d: Record<string, unknown>): Promise<KetQuaChay> {
  if (ten === 'danh_sach_khach') {
    const trang = d.trang == null ? 1 : Number(d.trang);
    if (!Number.isInteger(trang) || trang < 1 || trang > 1000) return loi('THAM_SO', 'trang từ 1 đến 1000.', 400);
    const dm = await docDanhMucKhach(db, k.user_id, { trang, kichThuoc: KICH_THUOC_TRANG_MCP });
    return {
      status: 200,
      body: {
        hom_nay: dm.hom_nay, tong: dm.tong, trang: dm.trang, so_trang: dm.so_trang, dem: dm.dem,
        khach: dm.khach.map((x) => ({
          company_id: x.id, ten: x.ten, vai_tro_cua_ban: x.vai_tro, muc: x.muc, ly_do: x.ly_do,
          doanh_thu: x.doanh_thu, tien_vao_cho_xac_nhan: x.tien_vao_cho_xac_nhan, thue: x.thue,
          viec_mo: x.viec_mo, dong_tien_30_ngay: x.dong_tien_30_ngay, loi: x.loi,
        })),
      },
    };
  }

  if (ten === 'hang_duyet') {
    const l = kiemLocHang(d);
    if (l.ok === false) return loi('THAM_SO', (l as { cau: string }).cau, 400);
    const dm = await docDanhMucKhach(db, k.user_id, { kichThuoc: 1 });
    const loc = dm.hang_duyet.filter((x) => (!l.company_id || x.company_id === l.company_id) && (!l.loai || x.loai === l.loai));
    return {
      status: 200,
      body: {
        tong: loc.length,
        de_xuat: loc.slice(0, l.gioi_han).map((x) => ({
          company_id: x.company_id, ten_khach: x.ten_khach, loai: x.loai, muc: x.muc,
          phan_loai: x.phan_loai, bang_chung: x.bang_chung, tac_dong: x.tac_dong, so: x.so, ngay: x.ngay, ten_viec: x.ten_viec,
        })),
      },
    };
  }

  if (ten === 'de_xuat_phan_loai') {
    const kq = kiemDeXuat(d);
    if (kq.ok === false) return loi('THAM_SO', (kq as { cau: string }).cau, 400);
    const v = kq.v;

    const { duoc } = await docThanhVien(db, k.user_id);
    const cty = duoc.find((t) => t.company_id.toLowerCase() === v.company_id);
    if (!cty) {
      return loi('KHONG_DU_QUYEN', 'Bạn không làm sổ cho khách này (hoặc chỉ được xem một cơ sở).', 403);
    }

    const { data: gd, error: e1 } = await db.from('transactions').select('id, company_id, amount, type, is_synthetic')
      .eq('id', v.transaction_id).eq('company_id', v.company_id).maybeSingle();
    if (e1) throw new Error(`Không đọc được giao dịch: ${e1.message}`);
    // Dòng thử của sandbox ở khách thật không hiện trong hàng duyệt (`locMinhHoa`) → coi như không có.
    if (!gd || (gd.is_synthetic === true && !cty.la_demo)) return loi('KHONG_THAY', 'Không thấy khoản này ở khách đó.', 404);
    if (!(Number(gd.amount) > 0) || chieuTien(gd) !== 'vao') return loi('THAM_SO', 'Khoản này không phải tiền vào.', 400);

    const { data: pl, error: e2 } = await db.from('revenue_classifications').select('confirmed_type, revenue_effect, confirmed_role')
      .eq('company_id', v.company_id).eq('transaction_id', v.transaction_id).maybeSingle();
    if (e2) throw new Error(`Không đọc được phân loại: ${e2.message}`);
    if (daCoNguoiQuyet(pl)) {
      return { status: 409, body: { error: 'Khoản này đã có người quyết; không cần đề xuất.', ma: 'DA_CO_NGUOI_QUYET', loai_da_ghi: pl!.confirmed_type } };
    }

    const { data: cu } = await db.from('de_xuat_agent_ngoai').select('id')
      .eq('company_id', v.company_id).eq('transaction_id', v.transaction_id).eq('khoa_mcp_id', k.id).maybeSingle();
    const { data: ghi, error: e3 } = await db.from('de_xuat_agent_ngoai').upsert({
      company_id: v.company_id, transaction_id: v.transaction_id, loai: v.loai, ly_do: v.ly_do,
      khoa_mcp_id: k.id, nguon: 'mcp', user_id: k.user_id, tao_luc: new Date().toISOString(),
    }, { onConflict: 'company_id,transaction_id,khoa_mcp_id' }).select('id, loai, ly_do, tao_luc').single();
    if (e3) throw new Error(`Không ghi được đề xuất: ${e3.message}`);
    return { status: 200, body: { de_xuat: { ...ghi, agent: k.ten }, thay_y_kien_cu: !!cu, so_da_doi: false } };
  }

  return loi('THAM_SO', `Không có công cụ "${ten}".`, 400);
}

/** Người (không phải MIMI tự động) đã chọn tính / không tính khoản này. */
export function daCoNguoiQuyet(pl: Row | null | undefined): boolean {
  return !!pl && pl.confirmed_role !== VAI_MIMI && (pl.revenue_effect === 'include' || pl.revenue_effect === 'exclude');
}

// ── Quản lý khoá (gọi từ `van-phong` bằng phiên đăng nhập) ──────────────────

export interface KhoaHien { id: string; ten: string; hien: string; tao_luc: string; dung_lan_cuoi: string | null }

export function kiemTenKhoa(ten: unknown): string | null {
  const t = String(ten ?? '').replace(/\s+/g, ' ').trim();
  return t.length >= 1 && t.length <= 60 ? t : null;
}

export async function danhSachKhoaMcp(db: Db, userId: string): Promise<KhoaHien[]> {
  const { data, error } = await db.from('khoa_mcp').select('id, ten, hien, tao_luc, dung_lan_cuoi')
    .eq('user_id', userId).is('thu_hoi_luc', null).order('tao_luc', { ascending: false }).limit(TOI_DA_KHOA_MOI_NGUOI);
  if (error) throw new Error(`Không đọc được khoá MCP: ${error.message}`);
  return (data ?? []) as KhoaHien[];
}

/** Tạo khoá. Khoá thô trả về ĐÚNG MỘT LẦN; bảng chỉ giữ bản băm. */
export async function taoKhoaMcp(db: Db, userId: string, tenTho: unknown): Promise<KetQuaChay> {
  const ten = kiemTenKhoa(tenTho);
  if (!ten) return loi('THAM_SO', 'Tên khoá dài 1–60 ký tự, ví dụ "Claude của chị Lan".', 400);
  const dang = await danhSachKhoaMcp(db, userId);
  if (dang.length >= TOI_DA_KHOA_MOI_NGUOI) return loi('QUA_NHIEU', `Tối đa ${TOI_DA_KHOA_MOI_NGUOI} khoá. Thu hồi khoá không dùng trước.`, 400);
  const khoa = sinhKhoa();
  const { data, error } = await db.from('khoa_mcp').insert({ user_id: userId, ten, khoa_bam: await bamKhoa(khoa), hien: hienKhoa(khoa) })
    .select('id, ten, hien, tao_luc, dung_lan_cuoi').single();
  if (error) throw new Error(`Không tạo được khoá MCP: ${error.message}`);
  return { status: 200, body: { khoa_moi: khoa, khoa: data } };
}

export async function thuHoiKhoaMcp(db: Db, userId: string, id: unknown): Promise<KetQuaChay> {
  const s = String(id ?? '');
  if (!UUID_RE.test(s)) return loi('THAM_SO', 'id khoá không hợp lệ.', 400);
  // Lọc theo user_id: không thu hồi được khoá của người khác.
  const { data, error } = await db.from('khoa_mcp').update({ thu_hoi_luc: new Date().toISOString() })
    .eq('id', s).eq('user_id', userId).is('thu_hoi_luc', null).select('id');
  if (error) throw new Error(`Không thu hồi được khoá: ${error.message}`);
  if (!data?.length) return loi('KHONG_THAY', 'Không thấy khoá này.', 404);
  return { status: 200, body: { da_thu_hoi: s } };
}
