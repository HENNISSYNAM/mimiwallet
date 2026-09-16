import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Công ty đang dùng (cũ nhất — cùng quy tắc `resolveCompany`), cho thanh bên, thanh dưới
 * điện thoại và Cài đặt. Một nơi đọc, nhiều nơi dùng; đổi thông tin công ty thì gọi
 * `baoCongTyDoi()` để mọi nơi đọc lại.
 */
export interface CongTy {
  id: string | null;
  ten: string | null;
}

const SU_KIEN = 'mimi:cong-ty-doi';
let boNho: CongTy | null = null;

async function docCongTy(): Promise<CongTy | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('companies').select('id, name').eq('user_id', user.id)
    .order('created_at', { ascending: true }).limit(1).maybeSingle();
  return { id: data?.id ?? null, ten: data?.name ?? null };
}

export function baoCongTyDoi() {
  window.dispatchEvent(new Event(SU_KIEN));
}

export function useCongTy(): CongTy | null {
  const [ct, setCt] = useState<CongTy | null>(boNho);
  useEffect(() => {
    let huy = false;
    const tai = async () => {
      const v = await docCongTy().catch(() => null);
      if (v) boNho = v;
      if (!huy && v) setCt(v);
    };
    void tai();
    window.addEventListener(SU_KIEN, tai);
    return () => {
      huy = true;
      window.removeEventListener(SU_KIEN, tai);
    };
  }, []);
  return ct;
}
