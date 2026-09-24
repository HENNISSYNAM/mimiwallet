import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { idCongTyDangDung } from '@/lib/congTyDangDung';

/*
 * GỠ STRIPE 24/09/2026: `create-checkout`, `check-subscription`, `customer-portal` đã gỡ khỏi máy
 * chủ. Trạng thái gói đọc từ `subscriptions`; trả tiền bằng chuyển khoản (`SubscriptionPayment`).
 * `price_id` / `product_id` dưới đây chỉ còn là khoá nhận diện gói, không gọi Stripe nữa.
 *
 * Ghi chú cũ — đường thanh toán này KHÔNG thu được tiền ở Việt Nam.
 *
 * Stripe không nhận merchant Việt Nam. Muốn dùng phải lập pháp nhân nước ngoài,
 * và kể cả thế thì khách của MIMI — hộ kinh doanh — cũng không trả bằng thẻ
 * quốc tế. Nghĩa là toàn bộ createCheckout/customer-portal bên dưới hiện là
 * đường cụt, không phải tính năng đang chạy.
 *
 * Đường thay thế đã dựng ở _shared/billing/subscription.ts: chuyển khoản ngân
 * hàng kèm mã tham chiếu, MIMI tự đọc sao kê của chính mình để đối soát. Không
 * cần giấy phép, không mất phí cổng, và dùng đúng thứ sản phẩm đang bán.
 *
 * Giá dưới đây cũng đã lệch với trang chủ: Landing quảng cáo 249.000đ còn ở đây
 * thu 990.000đ — gấp bốn lần. Đã sửa về đúng giá đang niêm yết.
 */
export const TIERS = {
  starter: {
    price_id: "price_1T8tgnLass6OCaReGllSME4X",
    product_id: "prod_U77wv2cPzLebdl",
    name: "Starter",
    price: 149000,
  },
  growth: {
    price_id: "price_1T8thHLass6OCaReod0wzAse",
    product_id: "prod_U77xQit3Bcf50H",
    name: "Growth",
    price: 249000,
  },
} as const;

interface SubscriptionState {
  subscribed: boolean;
  /** Khoá gói trong `TIERS` đang còn hạn, hoặc null. */
  plan: string | null;
  /** Số lượt xuất tờ khai còn lại (10.000đ một lượt). */
  conLuot: number;
  productId: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  checkSubscription: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  subscribed: false,
  plan: null,
  conLuot: 0,
  productId: null,
  subscriptionEnd: null,
  loading: false,

  /*
   * Đọc thẳng `subscriptions` và `luot_to_khai` của công ty đang dùng (RLS cho thành viên đọc).
   *
   * Trước 24/09/2026 chỗ này hỏi `check-subscription` — tức hỏi Stripe — trong khi tiền thật đi
   * bằng chuyển khoản và được ghi vào `subscriptions`. Khách trả tiền xong, màn hình vẫn báo
   * chưa có gói.
   */
  checkSubscription: async () => {
    set({ loading: true });
    try {
      const id = await idCongTyDangDung();
      if (!id) return;
      const [{ data: goi }, { data: luot }] = await Promise.all([
        supabase.from('subscriptions').select('plan, current_period_end').eq('company_id', id).maybeSingle(),
        supabase.from('luot_to_khai').select('thay_doi').eq('company_id', id),
      ]);
      const homNay = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      const conHan = !!goi && goi.current_period_end >= homNay;
      const tier = conHan ? TIERS[goi.plan as keyof typeof TIERS] : undefined;
      set({
        subscribed: conHan,
        plan: conHan ? goi.plan : null,
        productId: tier?.product_id ?? null,
        subscriptionEnd: conHan ? goi.current_period_end : null,
        conLuot: (luot ?? []).reduce((s, r) => s + Number(r.thay_doi), 0),
      });
    } catch (e) {
      console.error('doc thue bao:', e);
    } finally {
      set({ loading: false });
    }
  },
}));
