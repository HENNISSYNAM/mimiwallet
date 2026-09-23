import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { nguoiDungHienTai } from '@/lib/nguoiDung';
import { CONG_CU_MAC_DINH, CONG_CU_THEO_KHOA, SO_CONG_CU_TOI_DA, type CongCu } from '@/lib/congCu';

/**
 * Công cụ người dùng ghim (bảng `cong_cu_ghim`, RLS chỉ dòng của mình). Chưa chọn gì thì dùng
 * bộ mặc định — chưa ghi vào CSDL cho tới khi người dùng đổi lần đầu. Mọi nơi hiện công cụ
 * (thanh bên, MIMI Assistant, bảng "Thêm") dùng chung hook và nghe cùng một sự kiện.
 */

type BangTho = { from: (bang: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const SU_KIEN = 'mimi:cong-cu-doi';
let boNho: { khoa: string[]; laMacDinh: boolean } | null = null;
/**
 * Một lần đọc dùng chung cho mọi nơi đang chờ.
 *
 * Thanh bên, khung trang và trang MIMI Assistant cùng gọi hook này khi mở. Trước
 * đây mỗi nơi tự đọc, nên một lần mở trang Trợ lý đo ra 6 lần gọi
 * `cong_cu_ghim` — cùng một câu hỏi, cùng một câu trả lời. `boNho` đã có từ đầu
 * nhưng `useEffect` vẫn gọi `tai()` vô điều kiện, nên nó chỉ nhớ mà không ai hỏi.
 */
let dangDoc: Promise<{ khoa: string[]; laMacDinh: boolean; loi: string | null }> | null = null;

async function docChung(): Promise<{ khoa: string[]; laMacDinh: boolean; loi: string | null }> {
  if (dangDoc) return dangDoc;
  dangDoc = (async () => {
    const user = await nguoiDungHienTai();
    if (!user) return { khoa: CONG_CU_MAC_DINH, laMacDinh: true, loi: null };
    const { data, error } = await (supabase as unknown as BangTho).from('cong_cu_ghim')
      .select('khoa, thu_tu').eq('user_id', user.id).order('thu_tu', { ascending: true });
    if (error) {
      return { khoa: CONG_CU_MAC_DINH, laMacDinh: true, loi: 'Chưa đọc được công cụ đã ghim — đang hiện bộ mặc định.' };
    }
    const khoa = hopLe(((data ?? []) as { khoa: string }[]).map((r) => r.khoa));
    return khoa.length ? { khoa, laMacDinh: false, loi: null } : { khoa: CONG_CU_MAC_DINH, laMacDinh: true, loi: null };
  })();
  try {
    return await dangDoc;
  } finally {
    dangDoc = null;
  }
}

const hopLe = (ds: string[]) => ds.filter((k) => CONG_CU_THEO_KHOA[k]);

export function useCongCuGhim() {
  const [trangThai, setTrangThai] = useState(boNho);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const tai = useCallback(async () => {
    const r = await docChung();
    boNho = { khoa: r.khoa, laMacDinh: r.laMacDinh };
    setLoi(r.loi);
    setTrangThai(boNho);
  }, []);

  useEffect(() => {
    // Đã có trong bộ nhớ thì dùng luôn; chỉ đọc khi chưa ai đọc. Đổi ghim ở một
    // nơi thì sự kiện `SU_KIEN` báo cho mọi nơi khác — `luu` đã cập nhật
    // `boNho` trước khi phát, nên nơi nghe chỉ cần lấy lại từ đó.
    if (boNho === null) void tai();
    const nghe = () => { if (boNho) setTrangThai(boNho); else void tai(); };
    window.addEventListener(SU_KIEN, nghe);
    return () => window.removeEventListener(SU_KIEN, nghe);
  }, [tai]);

  const luu = useCallback(async (ds: string[]) => {
    const user = await nguoiDungHienTai();
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
