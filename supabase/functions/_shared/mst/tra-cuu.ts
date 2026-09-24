/**
 * Tra mã số thuế với dữ liệu Tổng cục Thuế (qua XInvoice), và ghi điều tra được vào công ty.
 *
 * VÌ SAO CÓ FILE NÀY. Người dùng đã gõ mã số thuế, rồi vẫn bị hỏi "bạn là hộ kinh doanh hay
 * doanh nghiệp", "tên cửa hàng", "tỉnh nào" — những điều chính mã đó đã trả lời. Chủ hộ nói
 * thẳng (24/09/2026): mấy thông tin mã số thuế đã cung cấp thì không hỏi lại nữa.
 *
 * API TRẢ ĐÚNG BẢY TRƯỜNG: orgType, taxID, name, address, taxDepartment, status, updatedAt.
 * Không có ngành nghề, không có ngày bắt đầu kinh doanh — nên nhóm ngành, nơi bán, cách tính
 * thuế vẫn phải hỏi. Ghi ra đây để lần sau không ai đi tìm chúng trong response.
 *
 * DỮ LIỆU NÀY CHỈ MÁY CHỦ GHI. Các cột `*_theo_mst` trên `companies` có trigger giữ lại
 * (`giu_thong_tin_theo_mst`): trình duyệt sửa được `tax_id` nhưng không tự viết được "theo
 * Tổng cục Thuế". Đổi mã số thuế thì trigger xoá sạch điều tra cũ, và lần đọc sau tra lại.
 *
 * Tra hỏng không được làm hỏng trang thuế: mọi lỗi ở đây chỉ ghi log, người dùng vẫn được hỏi
 * như trước — chậm hơn một câu, chứ không sai.
 */

export const XINVOICE_URL = 'https://api.xinvoice.vn/gdt-api/tax-payer-records';

export interface BanGhiThue {
  orgType?: string;
  taxID?: string;
  name?: string;
  address?: string;
  taxDepartment?: string;
  status?: string;
  updatedAt?: string;
}

export type LoaiTheoMst = 'ho_kinh_doanh' | 'doanh_nghiep';

const boDau = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/**
 * 10 số cho doanh nghiệp (kèm `-001` nếu là đơn vị trực thuộc), 12 số cho hộ kinh doanh và cá
 * nhân: từ 01/07/2025 số định danh cá nhân dùng thay mã số thuế cho nhóm đó.
 */
export function mstDungHinh(ma: string): boolean {
  return /^\d{10}(-\d{3})?$|^\d{12}$/.test(ma.replace(/\s/g, ''));
}

/** Người nộp thuế còn hoạt động. Mọi trạng thái khác (tạm ngừng, đã đóng MST…) là không. */
export function dangHoatDong(status: string | null | undefined): boolean {
  return (status ?? '').startsWith('NNT đang hoạt động');
}

/**
 * Một mã trả về NHIỀU bản ghi (cơ sở chính, chi nhánh, bản ghi cũ đã đóng). Ưu tiên: còn hoạt
 * động trước đã đóng; mã khớp chính xác trước mã đơn vị trực thuộc.
 */
export function chonBanGhi(ds: BanGhiThue[], ma: string): BanGhiThue | undefined {
  const diem = (r: BanGhiThue) => (dangHoatDong(r.status) ? 2 : 0) + (r.taxID === ma ? 1 : 0);
  return [...ds].sort((a, b) => diem(b) - diem(a))[0];
}

/**
 * Hộ kinh doanh hay doanh nghiệp, theo đăng ký thuế.
 *
 * Mã 12 số là số định danh cá nhân — chỉ cá nhân và hộ kinh doanh dùng, nên biết ngay kể cả khi
 * chưa tra được. Mã 10 số thì phải nhìn `orgType`; loại lạ thì trả null để còn hỏi, không đoán.
 */
export function loaiTheoMst(ma: string, orgType: string | null | undefined): LoaiTheoMst | null {
  const t = boDau(orgType ?? '');
  if (/ho kinh doanh|^ca nhan/.test(t)) return 'ho_kinh_doanh';
  if (/doanh nghiep|chi nhanh/.test(t)) return 'doanh_nghiep';
  if (/^\d{12}$/.test(ma.replace(/\s/g, ''))) return 'ho_kinh_doanh';
  return null;
}

/** Tỉnh/thành là đoạn cuối của địa chỉ đăng ký ("…, Phường Tân Mỹ, TP Hồ Chí Minh"). */
export function tinhTuDiaChi(diaChi: string | null | undefined): string | null {
  const doan = (diaChi ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  return doan.length >= 2 ? doan[doan.length - 1] : null;
}

export type KetQuaTra =
  | { trang_thai: 'thay'; ban_ghi: BanGhiThue; tong_so_ban_ghi: number; so_con_hoat_dong: number; con_hoat_dong: boolean }
  | { trang_thai: 'khong_thay' }
  | { trang_thai: 'loi'; cau: string; ma_http?: number };

export interface CauHinhXInvoice { clientId: string; apiKey: string }

export async function traCuuMst(ma: string, cfg: CauHinhXInvoice, goi: typeof fetch = fetch): Promise<KetQuaTra> {
  const sach = ma.replace(/\s/g, '');
  if (!mstDungHinh(sach)) return { trang_thai: 'loi', cau: 'Mã số thuế phải là 10 số (doanh nghiệp) hoặc 12 số (hộ kinh doanh).', ma_http: 400 };
  const res = await goi(`${XINVOICE_URL}/${encodeURIComponent(sach)}`, {
    headers: { Accept: 'application/json', 'client-id': cfg.clientId, 'api-key': cfg.apiKey },
    // Tra chậm thì bỏ, đừng giữ trang thuế chờ. (jsdom khi chạy test không có hàm này.)
    signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(10_000) : undefined,
  });
  if (!res.ok) return { trang_thai: 'loi', cau: `Tra cứu thất bại (${res.status})`, ma_http: 502 };
  const body = await res.json().catch(() => null) as { success?: boolean; data?: unknown } | null;
  const ds: BanGhiThue[] = Array.isArray(body?.data) ? body.data as BanGhiThue[] : [];
  if (!body?.success || ds.length === 0) return { trang_thai: 'khong_thay' };
  const chon = chonBanGhi(ds, sach) as BanGhiThue;
  return {
    trang_thai: 'thay',
    ban_ghi: chon,
    tong_so_ban_ghi: ds.length,
    so_con_hoat_dong: ds.filter((r) => dangHoatDong(r.status)).length,
    con_hoat_dong: dangHoatDong(chon.status),
  };
}

// deno-lint-ignore no-explicit-any
type Db = any;

/** Không thấy mã thì một ngày sau mới tra lại: mã mới cấp có khi chưa lên dữ liệu ngay. */
const TRA_LAI_KHI_KHONG_THAY_MS = 24 * 3600 * 1000;

const LOAI_TAI_KHOAN: Record<LoaiTheoMst, string> = { ho_kinh_doanh: 'household', doanh_nghiep: 'business' };

/**
 * Tra mã số thuế của công ty nếu chưa tra, rồi ghi vào `companies` bằng service role.
 *
 * Chỉ ĐIỀN chỗ trống ở `province` và `account_type` — không đè điều người dùng đã tự khai.
 * Không đổi `name`: đó là tên người dùng quen gọi ("Tạp hoá Minh Anh"); tên đăng ký nằm ở
 * `ten_theo_mst` và chỉ dùng ở chỗ cần tên pháp lý (tờ khai, giấy tờ).
 */
export async function dongBoMstCongTy(
  db: Db, companyId: string, cfg: CauHinhXInvoice | null, o: { bayGio?: Date; goi?: typeof fetch } = {},
): Promise<void> {
  if (!cfg) return;
  try {
    const { data: ct, error } = await db.from('companies')
      .select('tax_id, mst_tra_luc, ten_theo_mst, province, account_type, user_id')
      .eq('id', companyId).maybeSingle();
    if (error || !ct?.tax_id || !mstDungHinh(ct.tax_id)) return;
    /*
     * KHÔNG TRA CHO TÀI KHOẢN DEMO. Demo dùng chung, ai cũng gõ được mã số thuế vào đó — và mã
     * trong demo (0312345678, và một mã trông như số điện thoại) có thể là của người thật. Tra
     * ra thì demo hiện tên, địa chỉ một doanh nghiệp có thật cạnh sổ sách bịa.
     */
    const { data: chu } = await db.from('profiles').select('is_demo').eq('user_id', ct.user_id).maybeSingle();
    if (chu?.is_demo) return;
    const bayGio = o.bayGio ?? new Date();
    if (ct.mst_tra_luc) {
      if (ct.ten_theo_mst) return; // đã tra thấy
      if (bayGio.getTime() - new Date(ct.mst_tra_luc).getTime() < TRA_LAI_KHI_KHONG_THAY_MS) return;
    }
    const kq = await traCuuMst(ct.tax_id, cfg, o.goi);
    if (kq.trang_thai === 'loi') { console.error('tra mst:', kq.cau); return; }
    if (kq.trang_thai === 'khong_thay') {
      await db.from('companies').update({ mst_tra_luc: bayGio.toISOString() }).eq('id', companyId).eq('tax_id', ct.tax_id);
      return;
    }
    const r = kq.ban_ghi;
    const loai = loaiTheoMst(ct.tax_id, r.orgType);
    const tinh = tinhTuDiaChi(r.address);
    // `.eq('tax_id', …)`: người dùng đổi mã giữa chừng thì không ghi điều tra của mã cũ.
    await db.from('companies').update({
      ten_theo_mst: r.name || null,
      dia_chi_theo_mst: r.address || null,
      co_quan_thue: r.taxDepartment || null,
      loai_theo_mst: loai,
      trang_thai_mst: r.status || null,
      mst_tra_luc: bayGio.toISOString(),
      ...(!ct.province && tinh ? { province: tinh } : {}),
      ...(!ct.account_type && loai ? { account_type: LOAI_TAI_KHOAN[loai] } : {}),
    }).eq('id', companyId).eq('tax_id', ct.tax_id);
  } catch (e) {
    console.error('tra mst:', e instanceof Error ? e.message : e);
  }
}

/** Đọc cấu hình từ biến môi trường của edge function. Thiếu thì null — không tra, không vỡ. */
export function cauHinhXInvoice(): CauHinhXInvoice | null {
  // deno-lint-ignore no-explicit-any
  const env = (globalThis as any).Deno?.env;
  const clientId = env?.get('XINVOICE_CLIENT_ID');
  const apiKey = env?.get('XINVOICE_API_KEY');
  return clientId && apiKey ? { clientId, apiKey } : null;
}
