import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

/*
 * CẢNH BÁO — đường thanh toán này KHÔNG thu được tiền ở Việt Nam.
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
  productId: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  checkSubscription: () => Promise<void>;
  createCheckout: (priceId: string) => Promise<void>;
  openPortal: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  subscribed: false,
  productId: null,
  subscriptionEnd: null,
  loading: false,

  checkSubscription: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (!error && data) {
        set({
          subscribed: data.subscribed,
          productId: data.product_id,
          subscriptionEnd: data.subscription_end,
        });
      }
    } catch (e) {
      console.error('check-subscription error:', e);
    } finally {
      set({ loading: false });
    }
  },

  createCheckout: async (priceId: string) => {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { priceId },
    });
    if (error) throw error;
    if (data?.url) window.open(data.url, '_blank');
  },

  openPortal: async () => {
    const { data, error } = await supabase.functions.invoke('customer-portal');
    if (error) throw error;
    if (data?.url) window.open(data.url, '_blank');
  },
}));
