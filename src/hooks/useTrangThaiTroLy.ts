import { useEffect, useState } from 'react';
import { goiTroLy } from '@/lib/goiTroLy';

/**
 * Máy chủ đã bật đọc ảnh chứng từ chưa — hỏi `tro-ly` hành động `trang_thai` (nhẹ) một lần cho
 * cả phiên. Nút quét trên thanh dưới điện thoại cần biết trước khi mở máy ảnh, để không bắt
 * người dùng chụp xong mới báo "chưa bật".
 */
let boNho: boolean | undefined;
let dangHoi: Promise<boolean | undefined> | null = null;

export function useCoMoHinh(): boolean | undefined {
  const [co, setCo] = useState<boolean | undefined>(boNho);
  useEffect(() => {
    if (boNho !== undefined) return;
    dangHoi ??= goiTroLy('trang_thai').then((r) => (boNho = !!r.co_mo_hinh)).catch(() => undefined);
    let huy = false;
    void dangHoi.then((v) => { if (!huy) setCo(v); });
    return () => { huy = true; };
  }, []);
  return co;
}
