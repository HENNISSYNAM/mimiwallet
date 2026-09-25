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
import { lichThue, type MocThue } from './lich-thue.ts';
import { chuanHoaTrangThai } from '../doanh-nghiep/trang-thai.ts';
import { sanSangThue, type SanSangThue } from './san-sang-thue.ts';

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
}

/** `s`: số liệu doanh thu năm `nam` nếu nơi gọi đã đọc (tránh đọc hai lần). */
export async function docLichCongTy(
  db: Db, companyId: string, o: { nam: number; homNay: string; laDemo: boolean; s?: SoLieuDoanhThu },
): Promise<LichCongTy> {
  const s = o.s ?? await docSoLieuDoanhThu(db, companyId, o.nam, o.laDemo);
  const [{ cong_ty, ho_so }, { data: ctNguoi }] = await Promise.all([
    docHoSo(db, companyId),
    db.from('companies').select('employee_count').eq('id', companyId).maybeSingle(),
  ]);
  const dung = dungSuKien({ nam: o.nam, homNay: o.homNay, congTy: cong_ty, hoSo: ho_so, doanhThu: doanhThuQuyTuSoLieu(s) });
  const lich = lichThue({
    sk: dung.su_kien, sl: suyLuan(dung.su_kien), homNay: o.homNay,
    trangThai: chuanHoaTrangThai(cong_ty.theo_mst?.trang_thai).trang_thai,
    soNguoi: (ctNguoi?.employee_count as string | null) ?? null,
  });
  return { lich, loaiNguoiNop: dung.su_kien.loai ?? null, soChuaRo: s.so_chua_ro, tienChuaRo: s.chua_ro, sanSang: sanSangThue(lich, s) };
}
