/**
 * Đọc một tệp báo cáo tài chính / tờ khai thuế (các sheet đã đọc thành bảng) → nhận dạng, phân loại từng
 * dòng, kiểm số. Hàm thuần — chạy được ngay trong trình duyệt, tệp không cần rời máy người dùng.
 */
import { docBang, type O } from './doc-bang.ts';
import { nhanDang, type NhanDang } from './nhan-dang.ts';
import { coSo, phanLoaiDong, type DongPhanLoai } from './phan-loai.ts';
import { kiemDangThuc, type KetQuaKiem } from './kiem-tra.ts';

export interface SheetDaPhanLoai {
  ten_sheet: string;
  nhan_dang: NhanDang;
  don_vi: { nhan: string; he_so: number } | null;
  cot_gia_tri: string[];
  dong: DongPhanLoai[];
  /** Dòng có số liệu / đã xếp được nhóm — để nói rõ độ phủ, không nói "đã phân loại hết" khi chưa. */
  so_dong_co_so: number;
  so_dong_da_xep: number;
  kiem_tra: KetQuaKiem[];
}

export function docBaoCao(sheets: { ten: string; bang: O[][] }[]): SheetDaPhanLoai[] {
  const ra: SheetDaPhanLoai[] = [];
  for (const sh of sheets) {
    const b = docBang(sh.bang);
    if (!b.dong.length) continue;
    const nd = nhanDang(b.dau_trang, sh.ten);
    const dong = b.dong.map((d) => phanLoaiDong(nd.loai, d));
    const coSoLieu = dong.filter(coSo);
    const soCot = Math.max(0, ...dong.map((d) => d.gia_tri.length));
    ra.push({
      ten_sheet: sh.ten, nhan_dang: nd, don_vi: b.don_vi, cot_gia_tri: b.cot_gia_tri, dong,
      so_dong_co_so: coSoLieu.length, so_dong_da_xep: coSoLieu.filter((d) => d.nhom).length,
      kiem_tra: kiemDangThuc(nd.loai, dong, soCot),
    });
  }
  return ra;
}
