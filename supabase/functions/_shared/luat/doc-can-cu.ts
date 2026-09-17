/**
 * Đối chiếu từng câu trích trong `he-luat.ts` với kho văn bản Công báo đã cào.
 *
 * VÌ SAO PHẢI ĐỐI CHIẾU LÚC CHẠY, KHÔNG TIN HẰNG SỐ TRONG MÃ. Câu trích trong `he-luat.ts` là
 * chữ do người viết mã chép vào. Nếu chép sai một chữ, hoặc kho nạp lại bản khác, thì MIMI vẫn
 * nói "theo Nghị định 68/2026 Điều 3..." trong khi câu đó không có thật — đúng kiểu bịa trích
 * dẫn mà sản phẩm này không được phép. Nên trước khi trả lời, hàm dưới đây lấy đúng đoạn của
 * Điều được dẫn trong kho, so chữ, và gắn cờ `da_doi_chieu`. Giao diện chỉ đóng dấu "đã đối
 * chiếu Công báo" cho căn cứ nào khớp; căn cứ không khớp hiện nguyên trạng "chưa đối chiếu được".
 *
 * So chữ sau khi gộp khoảng trắng (đoạn trong kho ngắt dòng giữa câu) và chuẩn hoá Unicode NFC.
 */
import { CAN_CU, VAN_BAN } from './he-luat.ts';
import { hieuLucTaiNgay, nhanHieuLuc, type HieuLucTaiNgay, type QuanHeHieuLuc } from './hieu-luc.ts';

export interface CanCuDaKiem {
  id: string;
  van_ban: string;
  ten_van_ban: string;
  vi_tri: string;
  y: string;
  trich: string;
  url: string | null;
  ngay_ban_hanh: string | null;
  /** Câu trích tìm thấy nguyên văn trong kho. */
  da_doi_chieu: boolean;
  /**
   * MIMI-P0-003: tình trạng hiệu lực của văn bản tại ngày kiểm, theo quan hệ kho đã ghi nhận.
   * null = chưa kiểm được (đọc bảng quan hệ lỗi) — không có nghĩa là còn hiệu lực.
   */
  hieu_luc: HieuLucTaiNgay | null;
  /** Nhãn hiệu lực cho người đọc. */
  nhan_hieu_luc: string;
}

export function chuanHoaChu(s: string): string {
  return s.normalize('NFC').replace(/\s+/g, ' ').trim();
}

export function coTrich(noiDung: string, trich: string): boolean {
  return chuanHoaChu(noiDung).includes(chuanHoaChu(trich));
}

/** Nhãn Điều của một đoạn, bỏ phần "(tiếp)" — kho cắt Điều dài thành nhiều đoạn. */
export function dieuCuaDoan(nhan: string | null): string {
  return (nhan ?? '').replace(/\s*\(tiếp\)\s*$/u, '').trim();
}

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

/**
 * MIMI-P0-003: tình trạng hiệu lực của các văn bản tại một ngày, từ bảng `quan_he_hieu_luc`.
 * Lỗi đọc → null ("chưa kiểm được"), để nơi gọi không coi văn bản là còn hiệu lực.
 */
export async function docHieuLuc(db: Db, soHieu: string[], ngay: string): Promise<Map<string, HieuLucTaiNgay> | null> {
  const ds = [...new Set(soHieu.filter(Boolean))];
  const ra = new Map<string, HieuLucTaiNgay>();
  if (!ds.length) return ra;
  try {
    const r = await db.from('quan_he_hieu_luc')
      .select('so_hieu_nguon, so_hieu_dich, loai, hieu_luc_tu, do_tin_cay, co_ngoai_le, trich')
      .in('so_hieu_dich', ds)
      .limit(2000);
    if (r.error) throw new Error(r.error.message);
    const quanHe = (r.data ?? []) as QuanHeHieuLuc[];
    for (const sh of ds) ra.set(sh, hieuLucTaiNgay(sh, quanHe, ngay));
    return ra;
  } catch (e) {
    console.error('doc hieu luc:', e instanceof Error ? e.message : e);
    return null;
  }
}

export const NHAN_CHUA_KIEM_HIEU_LUC = 'Chưa kiểm được tình trạng hiệu lực';

/**
 * Lấy căn cứ theo id, kèm đường dẫn Công báo và kết quả đối chiếu.
 *
 * Không ném lỗi khi kho hỏng: trả `da_doi_chieu: false` để màn hình nói thật là chưa đối chiếu
 * được, thay vì mất cả câu trả lời.
 */
export async function kiemCanCu(db: Db, ids: string[], ngay: string = new Date().toISOString().slice(0, 10)): Promise<CanCuDaKiem[]> {
  const canCu = [...new Set(ids)].filter((id) => CAN_CU[id]).map((id) => ({ id, ...CAN_CU[id] }));
  if (!canCu.length) return [];

  const soHieu = [...new Set(canCu.map((c) => c.van_ban))];
  const dieuCan = new Set(canCu.map((c) => `${c.van_ban}|${c.dieu}`));
  const noiDung = new Map<string, string>();
  const vanBan = new Map<string, { url: string | null; ngay_ban_hanh: string | null }>();

  try {
    const vb = await db.from('van_ban_phap_luat').select('ma_cong_bao, so_hieu, url, ngay_ban_hanh').in('so_hieu', soHieu);
    if (vb.error) throw new Error(vb.error.message);
    const theoMa = new Map<string, string>();
    for (const r of (vb.data ?? []) as Row[]) {
      theoMa.set(String(r.ma_cong_bao), String(r.so_hieu));
      vanBan.set(String(r.so_hieu), { url: r.url ?? null, ngay_ban_hanh: r.ngay_ban_hanh ?? null });
    }
    if (theoMa.size) {
      const dn = await db.from('doan_phap_luat')
        .select('ma_cong_bao, thu_tu, nhan, noi_dung')
        .in('ma_cong_bao', [...theoMa.keys()])
        .order('thu_tu', { ascending: true })
        .limit(2000);
      if (dn.error) throw new Error(dn.error.message);
      for (const r of (dn.data ?? []) as Row[]) {
        const sh = theoMa.get(String(r.ma_cong_bao));
        if (!sh) continue;
        const khoa = `${sh}|${dieuCuaDoan(r.nhan)}`;
        if (!dieuCan.has(khoa)) continue;
        noiDung.set(khoa, `${noiDung.get(khoa) ?? ''}\n${String(r.noi_dung ?? '')}`);
      }
    }
  } catch (e) {
    console.error('kiem can cu:', e instanceof Error ? e.message : e);
  }

  const hieuLuc = await docHieuLuc(db, soHieu, ngay);

  return canCu.map((c) => {
    const vb = vanBan.get(c.van_ban);
    const hl = hieuLuc ? hieuLuc.get(c.van_ban) ?? null : null;
    const doan = noiDung.get(`${c.van_ban}|${c.dieu}`);
    return {
      id: c.id,
      van_ban: c.van_ban,
      ten_van_ban: VAN_BAN[c.van_ban]?.ten ?? c.van_ban,
      vi_tri: c.vi_tri,
      y: c.y,
      trich: c.trich,
      url: vb?.url ?? null,
      ngay_ban_hanh: vb?.ngay_ban_hanh ?? VAN_BAN[c.van_ban]?.ngay_ban_hanh ?? null,
      da_doi_chieu: !!doan && coTrich(doan, c.trich),
      hieu_luc: hl,
      nhan_hieu_luc: hl ? nhanHieuLuc(hl) : NHAN_CHUA_KIEM_HIEU_LUC,
    };
  });
}

/** Căn cứ có văn bản kho ghi nhận đã hết hiệu lực (toàn bộ) tại ngày kiểm. */
export const hetHieuLuc = (ds: CanCuDaKiem[]): CanCuDaKiem[] => ds.filter((c) => c.hieu_luc?.trang_thai === 'het_hieu_luc');

/** Căn cứ nào chưa đối chiếu được — để màn hình nói rõ chỗ nào chưa chắc. */
export const chuaDoiChieu = (ds: CanCuDaKiem[]): CanCuDaKiem[] => ds.filter((c) => !c.da_doi_chieu);
