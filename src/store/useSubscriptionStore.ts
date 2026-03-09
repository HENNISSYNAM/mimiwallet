import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export const TIERS = {
  starter: {
    price_id: "price_1T8tgnLass6OCaReGllSME4X",
    product_id: "prod_U77wv2cPzLebdl",
    name: "Starter",
    price: 490000,
  },
  growth: {
    price_id: "price_1T8thHLass6OCaReod0wzAse",
    product_id: "prod_U77xQit3Bcf50H",
    name: "Growth",
    price: 990000,
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
