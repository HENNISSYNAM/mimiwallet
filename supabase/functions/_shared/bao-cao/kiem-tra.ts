/**
 * Kiểm số báo cáo tài chính bằng ĐẲNG THỨC KẾ TOÁN — toán, không phải luật: đúng với mọi mẫu báo cáo.
 * Chỉ kiểm khi có đủ mọi vế; thiếu vế thì bỏ qua (nói rõ), không coi là sai.
 * Hàm thuần.
 */
import type { DongPhanLoai } from './phan-loai.ts';
import type { LoaiTaiLieu } from './nhan-dang.ts';

export interface KetQuaKiem {
  ten: string;
  cong_thuc: string;
  /** Cột giá trị được kiểm (0 = cột đầu, thường là kỳ này / cuối năm). */
  cot: number;
  trai: number;
  phai: number;
  lech: number;
  dat: boolean;
}

type Ve = { khoa: string; dau: 1 | -1 };
interface DangThuc { ten: string; cong_thuc: string; trai: string; phai: Ve[]; /** Vế phải chỉ tính khi có ít nhất các khoá này. */ bat_buoc?: string[] }

const cong = (...k: string[]): Ve[] => k.map((khoa) => ({ khoa, dau: 1 as const }));
const tru = (khoa: string): Ve => ({ khoa, dau: -1 });

const DANG_THUC: Partial<Record<LoaiTaiLieu, DangThuc[]>> = {
  can_doi_ke_toan: [
    { ten: 'Tổng tài sản = Tổng nguồn vốn', cong_thuc: 'Tổng tài sản − Tổng nguồn vốn = 0', trai: 'tong_tai_san', phai: cong('tong_nguon_von') },
    { ten: 'Tổng tài sản = Ngắn hạn + Dài hạn', cong_thuc: 'Tổng tài sản = Tài sản ngắn hạn + Tài sản dài hạn', trai: 'tong_tai_san', phai: cong('tai_san_ngan_han', 'tai_san_dai_han') },
    { ten: 'Tổng nguồn vốn = Nợ phải trả + Vốn chủ sở hữu', cong_thuc: 'Tổng nguồn vốn = Nợ phải trả + Vốn chủ sở hữu', trai: 'tong_nguon_von', phai: cong('no_phai_tra', 'von_chu_so_huu') },
  ],
  ket_qua_kinh_doanh: [
    { ten: 'Doanh thu thuần', cong_thuc: 'Doanh thu thuần = Doanh thu bán hàng − Giảm trừ doanh thu', trai: 'doanh_thu_thuan', phai: [...cong('doanh_thu_ban_hang'), tru('giam_tru_doanh_thu')], bat_buoc: ['doanh_thu_ban_hang'] },
    { ten: 'Lợi nhuận gộp', cong_thuc: 'Lợi nhuận gộp = Doanh thu thuần − Giá vốn', trai: 'loi_nhuan_gop', phai: [...cong('doanh_thu_thuan'), tru('gia_von')] },
    { ten: 'Lợi nhuận khác', cong_thuc: 'Lợi nhuận khác = Thu nhập khác − Chi phí khác', trai: 'loi_nhuan_khac', phai: [...cong('thu_nhap_khac'), tru('chi_phi_khac')] },
    { ten: 'Lợi nhuận trước thuế', cong_thuc: 'Lợi nhuận trước thuế = Lợi nhuận thuần + Lợi nhuận khác', trai: 'loi_nhuan_truoc_thue', phai: cong('loi_nhuan_thuan', 'loi_nhuan_khac') },
    { ten: 'Lợi nhuận sau thuế', cong_thuc: 'Lợi nhuận sau thuế = Lợi nhuận trước thuế − Thuế TNDN', trai: 'loi_nhuan_sau_thue', phai: [...cong('loi_nhuan_truoc_thue'), tru('thue_tndn_hien_hanh'), tru('thue_tndn_hoan_lai'), tru('thue_tndn')], bat_buoc: ['loi_nhuan_truoc_thue'] },
  ],
  luu_chuyen_tien_te: [
    { ten: 'Lưu chuyển tiền thuần', cong_thuc: 'Lưu chuyển thuần = Kinh doanh + Đầu tư + Tài chính', trai: 'lctt_thuan', phai: cong('lctt_kinh_doanh', 'lctt_dau_tu', 'lctt_tai_chinh') },
    { ten: 'Tiền cuối kỳ', cong_thuc: 'Tiền cuối kỳ = Tiền đầu kỳ + Lưu chuyển thuần + Ảnh hưởng tỷ giá', trai: 'tien_cuoi_ky', phai: cong('tien_dau_ky', 'lctt_thuan', 'anh_huong_ty_gia'), bat_buoc: ['tien_dau_ky', 'lctt_thuan'] },
  ],
};

/**
 * Giá trị của một nhóm ở cột `cot`: lấy dòng TỔNG (không phải dòng "trong đó") đầu tiên của nhóm.
 * Tờ báo cáo đôi khi lặp một nhóm ở hai nơi — lấy dòng đầu, như người đọc báo cáo.
 */
function giaTri(dong: DongPhanLoai[], khoa: string, cot: number): number | null {
  const d = dong.find((x) => x.nhom?.khoa === khoa && !x.la_chi_tiet && x.gia_tri[cot] !== null && x.gia_tri[cot] !== undefined);
  return d ? (d.gia_tri[cot] as number) : null;
}

/** Sai lệch cho phép: 1 đơn vị (làm tròn khi báo cáo ghi theo nghìn/triệu đồng). */
const DUNG_SAI = 1;

export function kiemDangThuc(loai: LoaiTaiLieu, dong: DongPhanLoai[], soCot: number): KetQuaKiem[] {
  const ds = DANG_THUC[loai];
  if (!ds) return [];
  const ra: KetQuaKiem[] = [];
  for (let cot = 0; cot < Math.min(soCot, 2); cot++) {
    for (const dt of ds) {
      const trai = giaTri(dong, dt.trai, cot);
      if (trai === null) continue;
      const batBuoc = dt.bat_buoc ?? dt.phai.map((v) => v.khoa);
      if (batBuoc.some((k) => giaTri(dong, k, cot) === null)) continue;
      // Thuế và giảm trừ đôi khi ghi số dương cho khoản trừ: vế "trừ" luôn lấy trị tuyệt đối rồi trừ.
      const phai = dt.phai.reduce((s, v) => {
        const g = giaTri(dong, v.khoa, cot);
        if (g === null) return s;
        return v.dau === 1 ? s + g : s - Math.abs(g);
      }, 0);
      const lech = trai - phai;
      ra.push({ ten: dt.ten, cong_thuc: dt.cong_thuc, cot, trai, phai, lech, dat: Math.abs(lech) <= DUNG_SAI });
    }
  }
  return ra;
}
