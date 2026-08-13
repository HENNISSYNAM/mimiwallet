import { supabase } from '@/integrations/supabase/client';

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
  | 'report_exported';

export function track(name: EventName, props: Record<string, string | number | boolean> = {}) {
  void (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      // Anonymous events would be unattributable anyway, and the RLS policy
      // requires user_id = auth.uid(), so a signed-out call cannot be stored.
      if (!userId) return;
      await supabase.from('product_events').insert({ user_id: userId, name, props });
    } catch {
      // See above: never let measurement break the product.
    }
  })();
}
