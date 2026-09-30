import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { nguoiDungHienTai } from '@/lib/nguoiDung';
import { congTyDangDung, lamMoiCongTy } from '@/lib/congTyDangDung';

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
  const user = await nguoiDungHienTai();
  if (!user) return null;
  // Công ty đang dùng theo bảng thành viên — người được mời cũng thấy đúng công ty mình.
  const ct = await congTyDangDung();
  return { id: ct?.id ?? null, ten: ct?.ten ?? null };
}

/** Đổi người dùng: bỏ công ty đã nhớ của người trước (xem lib/datLaiKhiDoiNguoi.ts). */
export function xoaBoNhoCongTy() {
  boNho = null;
}

export function baoCongTyDoi() {
  // Xoá bộ nhớ của lớp chung rồi báo mọi nơi đọc lại (cùng tên sự kiện).
  lamMoiCongTy();
}

export function useCongTy(): CongTy | null {
  const [ct, setCt] = useState<CongTy | null>(boNho);
  useEffect(() => {
    let huy = false;
    const tai = async () => {
      const v = await docCongTy().catch(() => null);
      if (v) boNho = v;
      // Đã đăng xuất (v = null) thì cũng xoá khỏi màn hình, không giữ tên công ty của người trước.
      if (!huy) setCt(v);
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
