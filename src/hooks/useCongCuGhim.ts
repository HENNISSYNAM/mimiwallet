import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CONG_CU_MAC_DINH, CONG_CU_THEO_KHOA, SO_CONG_CU_TOI_DA, type CongCu } from '@/lib/congCu';

/**
 * Công cụ người dùng ghim (bảng `cong_cu_ghim`, RLS chỉ dòng của mình). Chưa chọn gì thì dùng
 * bộ mặc định — chưa ghi vào CSDL cho tới khi người dùng đổi lần đầu. Mọi nơi hiện công cụ
 * (thanh bên, MIMI Assistant, bảng "Thêm") dùng chung hook và nghe cùng một sự kiện.
 */

type BangTho = { from: (bang: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const SU_KIEN = 'mimi:cong-cu-doi';
let boNho: { khoa: string[]; laMacDinh: boolean } | null = null;

const hopLe = (ds: string[]) => ds.filter((k) => CONG_CU_THEO_KHOA[k]);

export function useCongCuGhim() {
  const [trangThai, setTrangThai] = useState(boNho);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const tai = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await (supabase as unknown as BangTho).from('cong_cu_ghim')
      .select('khoa, thu_tu').eq('user_id', user.id).order('thu_tu', { ascending: true });
    if (error) {
      setLoi('Chưa đọc được công cụ đã ghim — đang hiện bộ mặc định.');
      boNho = { khoa: CONG_CU_MAC_DINH, laMacDinh: true };
    } else {
      const khoa = hopLe(((data ?? []) as { khoa: string }[]).map((r) => r.khoa));
      boNho = khoa.length ? { khoa, laMacDinh: false } : { khoa: CONG_CU_MAC_DINH, laMacDinh: true };
      setLoi(null);
    }
    setTrangThai(boNho);
  }, []);

  useEffect(() => {
    void tai();
    const nghe = () => void tai();
    window.addEventListener(SU_KIEN, nghe);
    return () => window.removeEventListener(SU_KIEN, nghe);
  }, [tai]);

  const luu = useCallback(async (ds: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    setDangLuu(true);
    setLoi(null);
    const bang = (supabase as unknown as BangTho).from('cong_cu_ghim');
    const { error: loiXoa } = await bang.delete().eq('user_id', user.id);
    const { error: loiGhi } = loiXoa
      ? { error: loiXoa }
      : ds.length
        ? await (supabase as unknown as BangTho).from('cong_cu_ghim').insert(ds.map((khoa, i) => ({ user_id: user.id, khoa, thu_tu: i })))
        : { error: null };
    setDangLuu(false);
    if (loiGhi) {
      setLoi('Chưa lưu được công cụ. Thử lại sau.');
      await tai();
      return false;
    }
    boNho = { khoa: ds, laMacDinh: false };
    setTrangThai(boNho);
    window.dispatchEvent(new Event(SU_KIEN));
    return true;
  }, [tai]);

  const khoa = trangThai?.khoa ?? CONG_CU_MAC_DINH;

  const ghim = useCallback(async (k: string) => {
    if (khoa.includes(k) || !CONG_CU_THEO_KHOA[k]) return true;
    if (khoa.length >= SO_CONG_CU_TOI_DA) {
      setLoi(`Tối đa ${SO_CONG_CU_TOI_DA} công cụ. Bỏ ghim bớt rồi thêm.`);
      return false;
    }
    return luu([...khoa, k]);
  }, [khoa, luu]);

  const boGhim = useCallback((k: string) => luu(khoa.filter((x) => x !== k)), [khoa, luu]);

  return {
    ds: khoa.map((k) => CONG_CU_THEO_KHOA[k]).filter(Boolean) as CongCu[],
    laMacDinh: trangThai?.laMacDinh ?? true,
    daTai: trangThai !== null,
    ghim,
    boGhim,
    /** Thay cả danh sách — dùng khi khảo sát đầu vào chọn công cụ theo ngành. */
    datLai: luu,
    dangLuu,
    loi,
  };
}
