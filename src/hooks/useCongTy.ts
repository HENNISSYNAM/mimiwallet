import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Công ty đang dùng (cũ nhất — cùng quy tắc `resolveCompany`), cho thanh bên, thanh dưới
 * điện thoại, màu giao diện và Cài đặt. Một nơi đọc, nhiều nơi dùng; đổi ở Cài đặt thì gọi
 * `baoCongTyDoi()` để mọi nơi đọc lại.
 */
export interface CongTy {
  id: string | null;
  ten: string | null;
  /** Sắc độ màu nhấn người dùng chọn; null = bảng màu mặc định. */
  mau: number | null;
}

const SU_KIEN = 'mimi:cong-ty-doi';
let boNho: CongTy | null = null;

// `mau_dai_dien` có sau migration 20260915200000; kiểu sinh sẵn chưa có cột này.
type BangTho = { from: (bang: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

async function docCongTy(): Promise<CongTy | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await (supabase as unknown as BangTho)
    .from('companies').select('id, name, mau_dai_dien').eq('user_id', user.id)
    .order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (error) {
    // Cột màu chưa có (migration chưa chạy) thì vẫn phải có tên công ty.
    const { data: coBan } = await supabase.from('companies').select('id, name').eq('user_id', user.id)
      .order('created_at', { ascending: true }).limit(1).maybeSingle();
    return { id: coBan?.id ?? null, ten: coBan?.name ?? null, mau: null };
  }
  const mau = data?.mau_dai_dien;
  return { id: data?.id ?? null, ten: data?.name ?? null, mau: typeof mau === 'number' ? mau : null };
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
