import { supabase } from '@/integrations/supabase/client';
import { idNguoiDung } from './nguoiDung';
import { idCongTyDangDung } from './congTyDangDung';
import { lamSachDuongDan } from './ghiLoi';

/**
 * Phản hồi tại điểm chạm (29/09/2026) — học cơ chế Voice of Customer của Filum: hỏi ĐÚNG LÚC, MỘT câu mỗi lần,
 * gom về một bảng (`phan_hoi_khach`), đóng vòng trong 24 giờ (docs/DONG_VONG_PHAN_HOI.md).
 *
 * Mỗi câu hỏi chỉ hỏi một lần cho mỗi công ty trên một máy (nhớ bằng localStorage; không đọc được thì vẫn hỏi —
 * hỏi thừa một lần không hại bằng không bao giờ hỏi). Gửi hỏng thì nuốt: đo lường không được làm hỏng sản phẩm.
 */

export type CauHoi = 'sao_ke_khop' | 'doanh_thu_dung' | 'doi_soat_de_kho' | 'sean_ellis';

const khoa = (c: CauHoi, cty: string | null) => `mimi.phan_hoi.${c}.${cty ?? 'chung'}`;

export function daHoi(c: CauHoi, cty: string | null): boolean {
  try { return localStorage.getItem(khoa(c, cty)) !== null; } catch { return false; }
}

export function danhDauDaHoi(c: CauHoi, cty: string | null, cach: 'tra_loi' | 'bo_qua'): void {
  try { localStorage.setItem(khoa(c, cty), cach); } catch { /* không lưu được thì thôi */ }
}

export async function guiPhanHoi(c: CauHoi, p: { tra_loi: string; diem?: number | null; ghi_chu?: string | null }): Promise<boolean> {
  try {
    const userId = await idNguoiDung();
    if (!userId) return false;
    const companyId = await idCongTyDangDung().catch(() => null);
    const ghiChu = p.ghi_chu?.trim() ? p.ghi_chu.trim().slice(0, 500) : null;
    const dong = {
      user_id: userId, cau_hoi: c, tra_loi: p.tra_loi.slice(0, 40), diem: p.diem ?? null, ghi_chu: ghiChu,
      trang: typeof window !== 'undefined' ? lamSachDuongDan(window.location.pathname) : null,
    };
    // Bảng mới chưa có trong kiểu sinh sẵn.
    const bang = (supabase as unknown as { from: (b: string) => { insert: (d: unknown) => PromiseLike<{ error: { message: string } | null }> } }).from('phan_hoi_khach');
    let { error } = await bang.insert({ ...dong, ...(companyId ? { company_id: companyId } : {}) });
    if (error && companyId) ({ error } = await bang.insert(dong));
    return !error;
  } catch {
    return false;
  }
}

/** Ngày đầu tiên máy này thấy công ty (giờ VN) — để hỏi câu Sean Ellis ở ngày thứ 14. */
export function soNgayDaDung(cty: string | null, homNay = new Date()): number {
  const k = `mimi.lan_dau.${cty ?? 'chung'}`;
  const ngay = homNay.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  try {
    const dau = localStorage.getItem(k);
    if (!dau) { localStorage.setItem(k, ngay); return 0; }
    return Math.round((Date.parse(`${ngay}T00:00:00Z`) - Date.parse(`${dau}T00:00:00Z`)) / 86_400_000);
  } catch {
    return 0;
  }
}
