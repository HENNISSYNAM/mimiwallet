/**
 * Đọc dữ liệu thật của một công ty rồi tính lịch thuế (`lich-thue.ts`).
 *
 * Một hàm cho hai nơi: `tax-summary` (màn hình) và cron `thong-bao` (nhắc hạn). Trước 25/09/2026 cron
 * nhắc theo lịch chung cả nước — "Còn 7 ngày tới hạn tờ khai quý 3" gửi cả cho hộ không phải khai quý,
 * đúng cái mâu thuẫn đã gỡ trên màn hình. Cùng một hàm thì hai nơi không thể nói khác nhau.
 */
import { docSoLieuDoanhThu, type SoLieuDoanhThu } from '../doanh-thu/so-lieu.ts';
import { doanhThuQuyTuSoLieu, docHoSo, dungSuKien } from './doc-su-kien.ts';
import { suyLuan } from './he-luat.ts';
import { lichThue, type MocThue, type TraLoiNghiaVu } from './lich-thue.ts';
import { docTraLoiNghiaVu } from './ho-so-nghia-vu.ts';
import { chuanHoaTrangThai } from '../doanh-nghiep/trang-thai.ts';
import { sanSangThue, type SanSangThue } from './san-sang-thue.ts';
import type { ChiaHoatDong } from '../doanh-thu/theo-hoat-dong.ts';
import { hoSoTheoMst, type HoSoMst } from '../mst/ho-so-mst.ts';

// deno-lint-ignore no-explicit-any
type Db = any;

export interface LichCongTy {
  lich: MocThue[];
  loaiNguoiNop: string | null;
  /** Tiền vào năm nay chưa ai xác nhận có phải doanh thu — việc cần làm trước khi khai. */
  soChuaRo: number;
  tienChuaRo: number;
  /** Prompt 4 mục 14: một đối tượng sẵn sàng khai thuế cho mọi màn. */
  sanSang: SanSangThue;
  /** Doanh thu năm của ĐÚNG nguồn đang dùng để khai, chia theo nhóm hoạt động (null: chưa có doanh thu). */
  hoatDong: ChiaHoatDong | null;
  /** Điều MIMI biết nhờ mã số thuế (11/10/2026) — cùng lần đọc với lịch, để trang hiện "vì sao biết". */
  hoSoMst: HoSoMst;
  /** Câu trả lời đã lưu cho các câu "cần xác minh" (12/10/2026) — trang hiện để người dùng sửa lại. */
  traLoi: TraLoiNghiaVu;
}

/** `s`: số liệu doanh thu năm `nam` nếu nơi gọi đã đọc (tránh đọc hai lần). */
export async function docLichCongTy(
  db: Db, companyId: string, o: { nam: number; homNay: string; laDemo: boolean; s?: SoLieuDoanhThu },
): Promise<LichCongTy> {
  const s = o.s ?? await docSoLieuDoanhThu(db, companyId, o.nam, o.laDemo);
  const [{ cong_ty, ho_so }, { data: ctNguoi }, traLoi] = await Promise.all([
    docHoSo(db, companyId),
    db.from('companies').select('employee_count').eq('id', companyId).maybeSingle(),
    docTraLoiNghiaVu(db, companyId),
  ]);
  const dung = dungSuKien({ nam: o.nam, homNay: o.homNay, congTy: cong_ty, hoSo: ho_so, doanhThu: doanhThuQuyTuSoLieu(s) });
  const hoSoMst = hoSoTheoMst(cong_ty);
  const lich = lichThue({
    sk: dung.su_kien, sl: suyLuan(dung.su_kien), homNay: o.homNay,
    trangThai: chuanHoaTrangThai(cong_ty.theo_mst?.trang_thai).trang_thai,
    soNguoi: (ctNguoi?.employee_count as string | null) ?? null,
    donViTrucThuoc: hoSoMst.don_vi_truc_thuoc,
    // Sửa L16 (12/10/2026): câu trả lời người dùng đã lưu ở `ho_so_thue` — trước đây không truyền, nên lịch
    // hỏi mãi cùng một câu. Chưa trả lời = null → mốc vẫn "cần xác minh", không đoán.
    kyKhaiGtgt: traLoi.ky_khai_gtgt,
    sieuNho: traLoi.sieu_nho,
    phuongPhapTndn: traLoi.phuong_phap_tndn,
    traLuong: traLoi.tra_luong,
  });
  const hoatDong = dung.su_kien.hoatDong ?? null;
  // Chỉ hộ kinh doanh: nhóm hoạt động quyết định dòng và tỷ lệ trên tờ khai của hộ.
  const chuaRoNhom = dung.su_kien.loai === 'ho_kinh_doanh' && hoatDong
    ? { so_tien: hoatDong.nhom.chua_ro.so_tien, so_khoan: hoatDong.nhom.chua_ro.so_khoan } : null;
  return {
    lich, loaiNguoiNop: dung.su_kien.loai ?? null, soChuaRo: s.so_chua_ro, tienChuaRo: s.chua_ro,
    sanSang: sanSangThue(lich, s, chuaRoNhom, dung.su_kien.loai ?? null), hoatDong, hoSoMst, traLoi,
  };
}
