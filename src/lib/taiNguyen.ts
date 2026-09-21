import { supabase } from '@/integrations/supabase/client';

/**
 * Tài nguyên: bài do admin đăng (bảng `tai_nguyen`, xem migration 20260916200000).
 *
 * Quyền nằm ở RLS: khách chỉ đọc được bài đã xuất bản; chỉ admin đọc nháp và ghi. Các hàm kiểm
 * dữ liệu ở đây chỉ để báo lỗi sớm cho người soạn — CSDL kiểm lại đúng những ràng buộc đó.
 */

export const LOAI_TAI_NGUYEN = ['su_kien', 'blog', 'goc_nhin', 'bao_cao', 'tin_tuc', 'tuyen_dung'] as const;
export type LoaiTaiNguyen = (typeof LOAI_TAI_NGUYEN)[number];

export const CAU_HINH_LOAI: Record<LoaiTaiNguyen, { duong: string; ten: string; mo: string; rong: string }> = {
  su_kien: { duong: 'su-kien', ten: 'Sự kiện & Webinar', mo: 'Trực tiếp và xem lại', rong: 'Chưa có sự kiện nào được công bố.' },
  blog: { duong: 'blog', ten: 'Blog', mo: 'Những gì chúng tôi đang xây', rong: 'Chưa có bài blog nào.' },
  goc_nhin: { duong: 'goc-nhin', ten: 'Góc nhìn', mo: 'Thuế, tiền và doanh nghiệp nhỏ', rong: 'Chưa có bài góc nhìn nào.' },
  bao_cao: { duong: 'bao-cao', ten: 'Báo cáo', mo: 'Nghiên cứu chuyên sâu', rong: 'Chưa có báo cáo nào được công bố.' },
  tin_tuc: { duong: 'tin-tuc', ten: 'Tin tức', mo: 'MIMI trên báo chí và thông cáo', rong: 'Chưa có tin tức nào.' },
  tuyen_dung: { duong: 'tuyen-dung', ten: 'Tuyển dụng', mo: 'Vị trí đang mở', rong: 'Hiện chưa có vị trí nào đang mở.' },
};

export const loaiTuDuong = (duong: string | undefined): LoaiTaiNguyen | null =>
  LOAI_TAI_NGUYEN.find((l) => CAU_HINH_LOAI[l].duong === duong) ?? null;

export const duongDanBai = (b: { loai: LoaiTaiNguyen; slug: string }) =>
  b.loai === 'tuyen_dung' ? `/tuyen-dung/${b.slug}` : `/tai-nguyen/${CAU_HINH_LOAI[b.loai].duong}/${b.slug}`;

export const duongDanLoai = (l: LoaiTaiNguyen) => (l === 'tuyen_dung' ? '/tuyen-dung' : `/tai-nguyen/${CAU_HINH_LOAI[l].duong}`);

export interface BaiTaiNguyen {
  id: string;
  loai: LoaiTaiNguyen;
  slug: string;
  tieu_de: string;
  tom_tat: string;
  noi_dung: string;
  anh_bia: string | null;
  duong_dan_ngoai: string | null;
  bat_dau: string | null;
  ket_thuc: string | null;
  dia_diem: string | null;
  hinh_thuc: string | null;
  trang_thai: 'nhap' | 'xuat_ban';
  xuat_ban_luc: string | null;
  tao_luc: string;
  sua_luc: string;
}

export type BanSoan = Omit<BaiTaiNguyen, 'id' | 'xuat_ban_luc' | 'tao_luc' | 'sua_luc'>;

export const BAN_SOAN_TRONG = (loai: LoaiTaiNguyen = 'blog'): BanSoan => ({
  loai, slug: '', tieu_de: '', tom_tat: '', noi_dung: '', anh_bia: null, duong_dan_ngoai: null,
  bat_dau: null, ket_thuc: null, dia_diem: null, hinh_thuc: null, trang_thai: 'nhap',
});

/** "Thuế hộ kinh doanh 2026!" → "thue-ho-kinh-doanh-2026". */
export function taoSlug(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
}

const HTTPS = /^https:\/\/\S+$/;

/** Lỗi theo trường; rỗng là hợp lệ. Cùng ràng buộc với CHECK trong migration. */
export function kiemBanSoan(b: BanSoan): Partial<Record<keyof BanSoan, string>> {
  const loi: Partial<Record<keyof BanSoan, string>> = {};
  const td = b.tieu_de.trim();
  if (td.length < 3 || td.length > 200) loi.tieu_de = 'Tiêu đề cần từ 3 đến 200 ký tự.';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(b.slug) || b.slug.length > 120) loi.slug = 'Đường dẫn chỉ gồm chữ thường không dấu, số và gạch nối.';
  if (b.tom_tat.length > 500) loi.tom_tat = 'Tóm tắt tối đa 500 ký tự.';
  if (b.noi_dung.length > 100_000) loi.noi_dung = 'Nội dung quá dài.';
  if (b.anh_bia && (!HTTPS.test(b.anh_bia) || b.anh_bia.length > 1000)) loi.anh_bia = 'Ảnh bìa phải là đường dẫn https.';
  if (b.duong_dan_ngoai && (!HTTPS.test(b.duong_dan_ngoai) || b.duong_dan_ngoai.length > 1000)) loi.duong_dan_ngoai = 'Đường dẫn phải bắt đầu bằng https://';
  if (b.bat_dau && b.ket_thuc && new Date(b.ket_thuc) < new Date(b.bat_dau)) loi.ket_thuc = 'Kết thúc phải sau lúc bắt đầu.';
  if (b.dia_diem && b.dia_diem.length > 300) loi.dia_diem = 'Địa điểm tối đa 300 ký tự.';
  if (b.hinh_thuc && b.hinh_thuc.length > 100) loi.hinh_thuc = 'Hình thức tối đa 100 ký tự.';
  return loi;
}

/* ── Nội dung: định dạng tối giản, không HTML ─────────────────────────────────
 * "# " tiêu đề, "## " tiêu đề nhỏ, "- " gạch đầu dòng, dòng trống tách đoạn,
 * [chữ](https://…) là liên kết. Mọi thứ khác là chữ thường — React tự thoát ký tự,
 * nên người soạn không chèn được thẻ hay script nào. */

export type DoanChu = { loai: 'chu'; chu: string } | { loai: 'lien_ket'; chu: string; href: string };
export type KhoiNoiDung =
  | { loai: 'h2' | 'h3' | 'p'; doan: DoanChu[] }
  | { loai: 'ul'; muc: DoanChu[][] };

export function tachDong(dong: string): DoanChu[] {
  const ra: DoanChu[] = [];
  const re = /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g;
  let tu = 0;
  for (let m = re.exec(dong); m; m = re.exec(dong)) {
    if (m.index > tu) ra.push({ loai: 'chu', chu: dong.slice(tu, m.index) });
    ra.push({ loai: 'lien_ket', chu: m[1], href: m[2] });
    tu = m.index + m[0].length;
  }
  if (tu < dong.length) ra.push({ loai: 'chu', chu: dong.slice(tu) });
  return ra;
}

export function phanTichNoiDung(s: string): KhoiNoiDung[] {
  const khoi: KhoiNoiDung[] = [];
  let doan: string[] = [];
  let ds: string[] = [];
  const dongDoan = () => {
    if (doan.length) khoi.push({ loai: 'p', doan: tachDong(doan.join(' ')) });
    doan = [];
  };
  const dongDs = () => {
    if (ds.length) khoi.push({ loai: 'ul', muc: ds.map(tachDong) });
    ds = [];
  };
  for (const tho of s.replace(/\r\n?/g, '\n').split('\n')) {
    const d = tho.trim();
    if (!d) { dongDoan(); dongDs(); continue; }
    if (d.startsWith('## ')) { dongDoan(); dongDs(); khoi.push({ loai: 'h3', doan: tachDong(d.slice(3)) }); continue; }
    if (d.startsWith('# ')) { dongDoan(); dongDs(); khoi.push({ loai: 'h2', doan: tachDong(d.slice(2)) }); continue; }
    if (d.startsWith('- ')) { dongDoan(); ds.push(d.slice(2)); continue; }
    dongDs();
    doan.push(d);
  }
  dongDoan();
  dongDs();
  return khoi;
}

/* ── Đọc/ghi ───────────────────────────────────────────────────────────────── */

type BangTho = { from: (bang: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const bang = () => (supabase as unknown as BangTho).from('tai_nguyen');

const COT = 'id, loai, slug, tieu_de, tom_tat, noi_dung, anh_bia, duong_dan_ngoai, bat_dau, ket_thuc, dia_diem, hinh_thuc, trang_thai, xuat_ban_luc, tao_luc, sua_luc';
const COT_DS = 'id, loai, slug, tieu_de, tom_tat, anh_bia, duong_dan_ngoai, bat_dau, ket_thuc, dia_diem, hinh_thuc, trang_thai, xuat_ban_luc, tao_luc, sua_luc';

/** Bài đã xuất bản của một loại, mới nhất trước. RLS tự lọc bài nháp với khách. */
export async function docDanhSach(loai: LoaiTaiNguyen, gioiHan = 50): Promise<BaiTaiNguyen[]> {
  const { data, error } = await bang().select(COT_DS).eq('loai', loai).eq('trang_thai', 'xuat_ban')
    .order('xuat_ban_luc', { ascending: false }).limit(gioiHan);
  if (error) throw new Error(error.message);
  return (data ?? []).map((b: BaiTaiNguyen) => ({ ...b, noi_dung: '' }));
}

export async function docBai(loai: LoaiTaiNguyen, slug: string): Promise<BaiTaiNguyen | null> {
  const { data, error } = await bang().select(COT).eq('loai', loai).eq('slug', slug).eq('trang_thai', 'xuat_ban').maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

/** Admin: mọi bài, kể cả nháp. Khách gọi hàm này chỉ nhận bài đã xuất bản (RLS). */
export async function docTatCaChoAdmin(): Promise<BaiTaiNguyen[]> {
  const { data, error } = await bang().select(COT).order('sua_luc', { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  return data ?? [];
}

const chuanHoa = (b: BanSoan) => ({
  ...b,
  tieu_de: b.tieu_de.trim(),
  tom_tat: b.tom_tat.trim(),
  anh_bia: b.anh_bia?.trim() || null,
  duong_dan_ngoai: b.duong_dan_ngoai?.trim() || null,
  dia_diem: b.dia_diem?.trim() || null,
  hinh_thuc: b.hinh_thuc?.trim() || null,
  bat_dau: b.bat_dau || null,
  ket_thuc: b.ket_thuc || null,
});

export async function luuBai(id: string | null, b: BanSoan): Promise<BaiTaiNguyen> {
  const loi = kiemBanSoan(b);
  const dau = Object.values(loi)[0];
  if (dau) throw new Error(dau);
  const q = id ? bang().update(chuanHoa(b)).eq('id', id) : bang().insert(chuanHoa(b));
  const { data, error } = await q.select(COT).single();
  if (error) {
    if (error.code === '23505') throw new Error('Đường dẫn này đã có bài khác dùng.');
    if (error.code === '42501' || /row-level security/i.test(error.message)) throw new Error('Tài khoản này không có quyền admin.');
    throw new Error(error.message);
  }
  return data;
}

export async function xoaBai(id: string): Promise<void> {
  const { error } = await bang().delete().eq('id', id);
  if (error) throw new Error(error.message);
}
