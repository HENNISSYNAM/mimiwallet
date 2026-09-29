import { supabase } from '@/integrations/supabase/client';
import { idCongTyDangDung } from '@/lib/congTyDangDung';
import type { TraLoiNao } from '@/lib/troLy';

/**
 * Lịch sử hỏi MIMI cho thanh bên trái, kiểu ChatGPT/Claude (29/09/2026).
 *
 * Nguồn là bảng `hoi_thoai_tro_ly` máy chủ đã ghi cho mỗi câu hỏi (MIMI-P1-002): RLS chỉ cho người hỏi đọc và xoá
 * dòng của chính mình, hạn lưu 180 ngày. Bảng lưu từng lượt hỏi–đáp, chưa có mã "cuộc hỏi" — nên giao diện gom các
 * lượt liền nhau (cách nhau không quá KHOANG_CACH_CUOC) thành một cuộc. Không đổi schema, không lưu xuống trình duyệt.
 */

export const KHOANG_CACH_CUOC = 30 * 60 * 1000;
const SO_DONG_TOI_DA = 300;

export interface DongLichSu { id: string; cau_hoi: string; tao_luc: string }

export interface CuocHoi {
  /** Mã dòng đầu tiên của cuộc — ổn định khi cuộc có thêm lượt. */
  id: string;
  tieuDe: string;
  /** Mã các dòng theo thứ tự thời gian. */
  ids: string[];
  batDau: number;
  cuoiCung: number;
}

const rutGon = (s: string, n = 60) => {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};

/** Gom các lượt thành cuộc hỏi, mới nhất trước. Hàm thuần — kiểm bằng test. */
export function gomCuoc(dong: DongLichSu[], khoang = KHOANG_CACH_CUOC): CuocHoi[] {
  const tang = [...dong]
    .map((d) => ({ ...d, t: Date.parse(d.tao_luc) }))
    .filter((d) => Number.isFinite(d.t))
    .sort((a, b) => a.t - b.t);
  const cuoc: CuocHoi[] = [];
  for (const d of tang) {
    const cuoi = cuoc[cuoc.length - 1];
    if (cuoi && d.t - cuoi.cuoiCung <= khoang) {
      cuoi.ids.push(d.id);
      cuoi.cuoiCung = d.t;
    } else {
      cuoc.push({ id: d.id, tieuDe: rutGon(d.cau_hoi) || 'Câu hỏi', ids: [d.id], batDau: d.t, cuoiCung: d.t });
    }
  }
  return cuoc.reverse();
}

const ngayVN = (t: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(t);
const soNgay = (ngay: string) => Date.UTC(+ngay.slice(0, 4), +ngay.slice(5, 7) - 1, +ngay.slice(8, 10)) / 86_400_000;

export type NhomNgay = 'hom_nay' | 'hom_qua' | 'bay_ngay' | 'ba_muoi_ngay' | 'cu_hon';
export const TEN_NHOM_NGAY: Record<NhomNgay, string> = {
  hom_nay: 'Hôm nay', hom_qua: 'Hôm qua', bay_ngay: '7 ngày qua', ba_muoi_ngay: '30 ngày qua', cu_hon: 'Cũ hơn',
};

/** Chia cuộc theo ngày giờ Việt Nam của lượt cuối, giữ thứ tự mới nhất trước. */
export function nhomTheoNgay(cuoc: CuocHoi[], bayGio = Date.now()): { nhom: NhomNgay; cuoc: CuocHoi[] }[] {
  const homNay = soNgay(ngayVN(bayGio));
  const ra = new Map<NhomNgay, CuocHoi[]>();
  for (const c of cuoc) {
    const cach = homNay - soNgay(ngayVN(c.cuoiCung));
    const nhom: NhomNgay = cach <= 0 ? 'hom_nay' : cach === 1 ? 'hom_qua' : cach <= 7 ? 'bay_ngay' : cach <= 30 ? 'ba_muoi_ngay' : 'cu_hon';
    ra.set(nhom, [...(ra.get(nhom) ?? []), c]);
  }
  return (Object.keys(TEN_NHOM_NGAY) as NhomNgay[]).filter((n) => ra.has(n)).map((n) => ({ nhom: n, cuoc: ra.get(n)! }));
}

/** Danh sách lượt gần nhất của người dùng ở công ty đang dùng (RLS lọc theo người hỏi). */
export async function docLichSu(): Promise<DongLichSu[]> {
  const cid = await idCongTyDangDung();
  if (!cid) return [];
  const { data, error } = await supabase
    .from('hoi_thoai_tro_ly')
    .select('id, cau_hoi, tao_luc')
    .eq('company_id', cid)
    .order('tao_luc', { ascending: false })
    .limit(SO_DONG_TOI_DA);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Nội dung đầy đủ của một cuộc, để mở lại trong khung trợ lý. Đề xuất cũ không mở lại — số liệu đã cũ. */
export async function docCuoc(ids: string[]): Promise<{ cau: string; traLoi: TraLoiNao; luc: number }[]> {
  const { data, error } = await supabase
    .from('hoi_thoai_tro_ly')
    .select('id, cau_hoi, cau_tra_loi, che_do, do_day, tao_luc')
    .in('id', ids)
    .order('tao_luc', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((d) => ({
    cau: d.cau_hoi,
    luc: Date.parse(d.tao_luc),
    traLoi: {
      cau: d.cau_tra_loi,
      buoc: [],
      ket_qua: [],
      che_do: d.che_do === 'mo_hinh' ? 'mo_hinh' : 'co_dinh',
      do_day: d.do_day as TraLoiNao['do_day'],
      hoi_thoai_id: d.id,
    },
  }));
}

/** Xoá một cuộc (mọi lượt của nó). Nhật ký quyết định vẫn giữ — bảng đó không bị xoá theo. */
export async function xoaCuoc(ids: string[]): Promise<void> {
  const { error } = await supabase.from('hoi_thoai_tro_ly').delete().in('id', ids);
  if (error) throw new Error(error.message);
}
