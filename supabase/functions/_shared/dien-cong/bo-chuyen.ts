/**
 * ĐIỀN HỘ TRÊN CỔNG NGOÀI — phần thuần, dùng chung máy chủ (Deno) và bộ chạy tại máy (Node). 10/10/2026.
 *
 * Việc của file này: (1) sổ bộ chuyển (adapter) — biểu mẫu nào, phiên bản nào, đang ở trạng thái nào; (2) lấy GIÁ TRỊ
 * cần điền từ bản nháp tờ khai MÁY CHỦ đã tính và lưu (`to_khai_nhap.du_lieu`). Không tính thuế, không đọc trang web,
 * không có mô hình AI ở đây: con số đi thẳng từ bản nháp đã băm, sai một ô là dừng.
 *
 * PHẠM VI PHIÊN BẢN ĐẦU: một loại người nộp (hộ kinh doanh), một mẫu (01/TKN-CNKD — Thông báo doanh thu/Tờ khai thuế
 * năm), chỉ các dòng [08a]–[08e] và [11] (hộ không bán qua sàn có chức năng thanh toán, không làm đại lý). Bản nháp có
 * số ở dòng ngoài phạm vi thì bộ chuyển TỪ CHỐI, không điền một phần.
 */

export type TrangThaiBoChuyen = 'thu_nghiem' | 'chua_xac_minh';

export interface BoChuyen {
  id: string;
  phien_ban: string;
  mau: '01/TKN-CNKD';
  ten: string;
  /** `thu_nghiem`: chỉ chạy trên biểu mẫu giả có nhãn môi trường thử. `chua_xac_minh`: chưa ai kiểm trên cổng thật. */
  trang_thai: TrangThaiBoChuyen;
  /** Bộ chuyển chưa xác minh luôn tắt — không bật chỉ vì build qua hoặc chạy được trên biểu mẫu giả. */
  bat: boolean;
  /** Origin tab được phép. `http://127.0.0.1:*` = biểu mẫu thử chạy tại máy. */
  origin: string[];
  ky_ho_tro: readonly ('nam' | '6_thang_dau')[];
}

export const BO_CHUYEN: readonly BoChuyen[] = [
  {
    id: 'tkn-cnkd-thu',
    phien_ban: '0.1.0',
    mau: '01/TKN-CNKD',
    ten: 'Biểu mẫu thử 01/TKN-CNKD (môi trường thử)',
    trang_thai: 'thu_nghiem',
    bat: true,
    origin: ['http://127.0.0.1:*'],
    ky_ho_tro: ['nam', '6_thang_dau'],
  },
  {
    id: 'tkn-cnkd-cong-thue',
    phien_ban: '0.0.0',
    mau: '01/TKN-CNKD',
    ten: 'Cổng thuế thật — 01/TKN-CNKD',
    trang_thai: 'chua_xac_minh',
    bat: false,
    origin: ['https://thuedientu.gdt.gov.vn', 'https://canhan.gdt.gov.vn', 'https://dichvucong.gdt.gov.vn'],
    ky_ho_tro: [],
  },
];

export function timBoChuyen(id: string): BoChuyen | null {
  return BO_CHUYEN.find((b) => b.id === id) ?? null;
}

/** Origin của tab có nằm trong phạm vi bộ chuyển không. `*` chỉ thay cho cổng (port). */
export function originHopLe(boChuyen: BoChuyen, url: string): boolean {
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  return boChuyen.origin.some((m) => {
    if (m.endsWith(':*')) return `${u.protocol}//${u.hostname}` === m.slice(0, -2) && u.port !== '';
    return u.origin === m;
  });
}

export type KieuTruong = 'chon' | 'chu' | 'so_tien' | 'danh_dau';

/** Một ô cần điền. `gia_tri` là chuỗi chuẩn: tiền là số nguyên đồng không dấu chấm; đánh dấu là 'co' | 'khong'. */
export interface TruongDien {
  khoa: string;
  nhan: string;
  kieu: KieuTruong;
  gia_tri: string;
}

/** Thông tin chủ thể phải khớp trên trang trước khi điền — sai MST/kỳ là dừng. */
export interface ChuThe {
  mst: string;
  ten: string | null;
  ky_loai: 'nam' | '6_thang_dau';
  nam: number;
}

export type KetQuaLay =
  | { ok: true; chu_the: ChuThe; truong: TruongDien[] }
  | { ok: false; ly_do: string };

interface DongNhap { ma: string | null; o: Record<string, number | null> }
interface DuLieuNhap {
  mau?: string;
  chi_tieu?: { ma: string; gia_tri: string | null }[];
  danh_dau?: { nhan: string; chon: boolean }[];
  dong?: DongNhap[];
  san_sang?: { trang_thai?: string };
}

const DONG_DIEN = ['[08a]', '[08b]', '[08c]', '[08d]', '[08e]'] as const;
const DONG_TONG = '[11]';
/** Dòng có trên mẫu nhưng ngoài phạm vi phiên bản đầu: có số khác 0 là từ chối. */
const DONG_NGOAI_PHAM_VI = /^\[(08g|09[a-g]?|10)\]$/;

/** Tiền đồng phải là số nguyên an toàn, không âm. Trả chuỗi chữ số hoặc null nếu không hợp lệ. */
export function chuanTien(v: unknown): string | null {
  if (v === null || v === undefined) return '0';
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0) return null;
  return String(v);
}

/**
 * Lấy các ô cần điền từ bản nháp. Không tính lại gì: chỉ chép số máy chủ đã lưu, và kiểm tổng [11] bằng tổng các
 * dòng — lệch là bản nháp hỏng, từ chối.
 */
export function layTruongTKN(
  duLieu: unknown,
  ky: { loai: string; nam: number },
  hoSo: { mst: string | null; ten: string | null },
): KetQuaLay {
  const d = (duLieu ?? {}) as DuLieuNhap;
  if (d.mau !== '01/TKN-CNKD') return { ok: false, ly_do: 'Bộ chuyển này chỉ điền mẫu 01/TKN-CNKD.' };
  if (ky.loai !== 'nam' && ky.loai !== '6_thang_dau') return { ok: false, ly_do: 'Mẫu 01/TKN-CNKD chỉ có kỳ năm hoặc 6 tháng đầu năm.' };
  if (d.san_sang?.trang_thai === 'bi_chan') return { ok: false, ly_do: 'Bản nháp còn vướng mắc chặn — gỡ vướng mắc rồi lưu bản nháp mới.' };
  if (!hoSo.mst || !/^\d{10}(-\d{3})?$/.test(hoSo.mst)) return { ok: false, ly_do: 'Hồ sơ chưa có mã số thuế hợp lệ — không xác nhận được đúng người nộp trên cổng.' };

  const dong = Array.isArray(d.dong) ? d.dong : [];
  const truong: TruongDien[] = [
    { khoa: 'ky_loai', nhan: '[01] Kỳ tính thuế', kieu: 'chon', gia_tri: ky.loai },
    { khoa: 'ky_nam', nhan: 'Năm', kieu: 'chu', gia_tri: String(ky.nam) },
  ];
  const dd = Array.isArray(d.danh_dau) ? d.danh_dau : [];
  truong.push({ khoa: 'dd_1', nhan: dd[0]?.nhan ?? 'Đánh dấu 1', kieu: 'danh_dau', gia_tri: dd[0]?.chon ? 'co' : 'khong' });
  truong.push({ khoa: 'dd_2', nhan: dd[1]?.nhan ?? 'Đánh dấu 2', kieu: 'danh_dau', gia_tri: dd[1]?.chon ? 'co' : 'khong' });

  let tongDong = 0;
  for (const ma of DONG_DIEN) {
    const x = dong.find((r) => r.ma === ma);
    const t = chuanTien(x?.o?.tong_dt ?? null);
    if (t === null) return { ok: false, ly_do: `Số tiền dòng ${ma} không hợp lệ (phải là số nguyên đồng, không âm).` };
    tongDong += Number(t);
    truong.push({ khoa: `dt_${ma.slice(1, -1)}`, nhan: `${ma} Tổng doanh thu`, kieu: 'so_tien', gia_tri: t });
  }
  for (const r of dong) {
    if (r.ma && DONG_NGOAI_PHAM_VI.test(r.ma)) {
      const t = chuanTien(r.o?.tong_dt ?? null);
      if (t === null || t !== '0') return { ok: false, ly_do: `Bản nháp có số ở dòng ${r.ma} — ngoài phạm vi bộ chuyển phiên bản đầu. Điền tay trên cổng.` };
    }
    for (const k of ['thue_gtgt', 'thue_tncn']) {
      const t = chuanTien(r.o?.[k] ?? null);
      if (t === null || t !== '0') return { ok: false, ly_do: `Bản nháp có số thuế phải nộp ở dòng ${r.ma ?? '?'} — phiên bản đầu chỉ điền thông báo doanh thu.` };
    }
  }
  const tong = chuanTien(dong.find((r) => r.ma === DONG_TONG)?.o?.tong_dt ?? null);
  if (tong === null) return { ok: false, ly_do: 'Tổng cộng [11] không hợp lệ.' };
  if (!Number.isSafeInteger(tongDong) || Number(tong) !== tongDong) {
    return { ok: false, ly_do: `Tổng [11] (${tong}) không bằng tổng các dòng (${tongDong}) — bản nháp không nhất quán, không điền.` };
  }
  truong.push({ khoa: 'dt_11', nhan: '[11] Tổng cộng', kieu: 'so_tien', gia_tri: tong });

  return { ok: true, chu_the: { mst: hoSo.mst, ten: hoSo.ten, ky_loai: ky.loai, nam: ky.nam }, truong };
}

/** Mã băm của "kế hoạch": cùng bản nháp + cùng bộ chuyển + cùng các ô → cùng mã. Đổi một thứ là mã khác. */
export function chuoiKeHoach(o: { nhap_id: string; ma_bam_nhap: string; bo_chuyen: string; phien_ban: string; chu_the: ChuThe; truong: TruongDien[] }): string {
  return JSON.stringify([o.nhap_id, o.ma_bam_nhap, o.bo_chuyen, o.phien_ban, o.chu_the, o.truong.map((t) => [t.khoa, t.kieu, t.gia_tri])]);
}

export type TrangThaiPhien = 'tao' | 'dang_dien' | 'tam_dung' | 'da_doi_chieu' | 'lech' | 'ban_giao' | 'dung' | 'loi' | 'het_han' | 'huy';

/** Phiên còn được chạy tiếp không. Kiểm khi bắt đầu, trước mỗi hành động ghi, và khi tiếp tục. */
export function kiemPhien(p: {
  trang_thai: TrangThaiPhien;
  het_han: string;
  nhap_id: string;
  ma_bam_nhap: string;
  bo_chuyen: string;
  phien_ban: string;
}, ctx: {
  bayGio: Date;
  duocSoanToKhai: boolean;
  nhapHienTai: { id: string; ma_bam: string } | null;
  /** Bản nháp mới nhất cùng mẫu, cùng kỳ — có bản mới hơn thì kế hoạch cũ mất hiệu lực. */
  nhapMoiNhatCungKy: { id: string } | null;
}): string[] {
  const loi: string[] = [];
  if (!ctx.duocSoanToKhai) loi.push('Bạn không còn quyền soạn tờ khai của công ty này.');
  if (['ban_giao', 'dung', 'loi', 'het_han', 'huy', 'lech'].includes(p.trang_thai)) loi.push(`Phiên đã kết thúc (${p.trang_thai}).`);
  if (new Date(p.het_han).getTime() <= ctx.bayGio.getTime()) loi.push('Phiên đã hết hạn — tạo phiên mới.');
  if (!ctx.nhapHienTai) loi.push('Bản nháp đã bị xoá.');
  else if (ctx.nhapHienTai.ma_bam !== p.ma_bam_nhap) loi.push('Bản nháp đã đổi sau khi tạo phiên.');
  if (ctx.nhapMoiNhatCungKy && ctx.nhapMoiNhatCungKy.id !== p.nhap_id) loi.push('Đã có bản nháp mới hơn cho cùng kỳ — kế hoạch cũ mất hiệu lực.');
  const bc = timBoChuyen(p.bo_chuyen);
  if (!bc || !bc.bat) loi.push('Bộ chuyển đang tắt.');
  else if (bc.phien_ban !== p.phien_ban) loi.push('Bộ chuyển đã đổi phiên bản — tạo phiên mới.');
  return loi;
}
