import { supabase } from '@/integrations/supabase/client';
import { idNguoiDung } from './nguoiDung';
import { idCongTyDangDung } from './congTyDangDung';

/**
 * Record that something happened, so launch produces evidence instead of
 * opinions.
 *
 * Deliberately first-party: this app reads people's bank statements, and
 * bolting on a third-party analytics SDK would open another route for their
 * data to leave, in exchange for some charts. One table in the same database
 * answers the questions worth asking without that trade.
 *
 * **Never pass money, account numbers, tax codes, names or transaction
 * descriptions.** `props` is jsonb, so it will accept anything — the only guard
 * is discipline at the call site. Event names and non-identifying context only.
 *
 * Failures are swallowed on purpose. Measurement must never be able to break
 * the thing it measures; a lost event is a gap in a chart, a thrown error in a
 * bank flow is a lost customer.
 */

export type EventName =
  | 'signup'
  | 'login'
  | 'onboarding_completed'
  | 'bank_link_started'
  | 'bank_link_succeeded'
  | 'bank_link_failed'
  | 'sync_run'
  | 'threshold_viewed'
  | 'threshold_crossed_shown'
  | 'qr_created'
  | 'qr_paid'
  | 'gdt_synced'
  | 'invoice_created'
  | 'report_exported'
  // Nguoi dung dong the "Bat dau tu dau". Dong la mot cau tra loi that: no cho
  // biet huong dan khong huu ich, hoac ho da biet phai lam gi.
  | 'batdau_dismissed'
  // Mở ứng dụng khi đã đăng nhập, tối đa một lần mỗi ngày (giờ VN) mỗi công ty — để đo "quay lại sau 7
  // ngày" (view hanh_trinh_kich_hoat). Các mốc kích hoạt khác tính thẳng từ bảng nghiệp vụ.
  | 'app_opened';

export function track(name: EventName, props: Record<string, string | number | boolean> = {}) {
  void (async () => {
    try {
      const userId = await idNguoiDung();
      // Anonymous events would be unattributable anyway, and the RLS policy
      // requires user_id = auth.uid(), so a signed-out call cannot be stored.
      if (!userId) return;
      // Gắn công ty đang dùng: hành trình kích hoạt tính theo công ty. Máy chủ chỉ nhận company_id của
      // công ty mình là thành viên; bị từ chối (vừa rời công ty) thì ghi không kèm công ty.
      const companyId = await idCongTyDangDung().catch(() => null);
      const { error } = await supabase.from('product_events').insert({ user_id: userId, name, props, ...(companyId ? { company_id: companyId } : {}) });
      if (error && companyId) await supabase.from('product_events').insert({ user_id: userId, name, props });
    } catch {
      // See above: never let measurement break the product.
    }
  })();
}

const ngayVN = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });

/**
 * Ghi 'app_opened' tối đa một lần mỗi ngày (giờ VN) cho mỗi công ty. Nhớ bằng localStorage; không đọc
 * được (chế độ riêng tư) thì vẫn ghi — thừa một dòng trong ngày không làm sai chỉ số "có quay lại".
 */
export async function ghiMoUngDung(): Promise<void> {
  const cty = await idCongTyDangDung().catch(() => null);
  const khoa = `mimi.mo_ung_dung.${cty ?? 'chung'}`;
  const homNay = ngayVN();
  try {
    if (localStorage.getItem(khoa) === homNay) return;
    localStorage.setItem(khoa, homNay);
  } catch { /* không lưu được thì vẫn ghi */ }
  track('app_opened');
}
