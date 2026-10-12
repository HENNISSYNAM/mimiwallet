/**
 * NHỮNG GÌ MIMI BIẾT NHỜ MÃ SỐ THUẾ — suy đủ, không suy quá (11/10/2026).
 *
 * Vì sao có file này: trang Nhắc thuế nói "doanh nghiệp tạm nộp TNDN theo quý" mà không cho người
 * dùng thấy MIMI dựa vào đâu để biết họ là doanh nghiệp, còn hoạt động hay không, nộp ở cơ quan thuế
 * nào. Mọi điều đó đã nằm trong bản ghi Tổng cục Thuế (`tra-cuu.ts`) — chỉ chưa ai đọc ra cho người xem.
 *
 * CHỈ SUY TỪ BẢY TRƯỜNG API TRẢ (orgType, taxID, name, address, taxDepartment, status, updatedAt) và
 * từ HÌNH của chính mã số. Không có ngành nghề, không có ngày thành lập — nên không có dòng nào nói về
 * hai thứ đó. Mỗi dòng ghi rõ nguồn: "theo hình mã số" hay "theo bản ghi Tổng cục Thuế".
 *
 * Hàm thuần — máy chủ (`doc-lich-thue.ts` → `tax-summary`) gọi; trình duyệt chỉ hiện kết quả.
 */
import { chuanHoaTrangThai, TEN_TRANG_THAI, type TrangThaiDoanhNghiep } from '../doanh-nghiep/trang-thai.ts';
import { tinhTuDiaChi } from './tra-cuu.ts';

export type LoaiTheoHinhMst = 'ho_kinh_doanh' | 'doanh_nghiep' | 'don_vi_truc_thuoc';

export const TEN_LOAI_THEO_MST: Record<LoaiTheoHinhMst, string> = {
  ho_kinh_doanh: 'Hộ kinh doanh / cá nhân kinh doanh',
  doanh_nghiep: 'Doanh nghiệp',
  don_vi_truc_thuoc: 'Đơn vị trực thuộc (chi nhánh, văn phòng đại diện, địa điểm kinh doanh)',
};

export interface DieuSuyTuMst {
  truong: 'mst' | 'loai' | 'trang_thai' | 'co_quan_thue' | 'tinh' | 'ten';
  nhan: string;
  gia_tri: string;
  /** Nguồn của đúng dòng này — để người dùng biết dòng nào là suy từ hình mã số, dòng nào là ghi của cơ quan thuế. */
  nguon: 'hinh_ma_so' | 'tong_cuc_thue';
  vi_sao: string;
}

export interface HoSoMst {
  mst: string | null;
  /** Tên đăng ký thuế (null khi chưa tra được). */
  ten: string | null;
  loai: LoaiTheoHinhMst | null;
  /** MST 13 số (10 số + "-xxx"): đơn vị trực thuộc. Nghĩa vụ khai của nhóm này khác — xem lịch thuế. */
  don_vi_truc_thuoc: boolean;
  /** MST của đơn vị chủ quản (10 số đầu) khi là đơn vị trực thuộc. */
  mst_chu_quan: string | null;
  trang_thai: TrangThaiDoanhNghiep;
  /** Câu gốc của cơ quan thuế — luôn giữ, vì bảng dịch có thể sai. */
  trang_thai_goc: string | null;
  co_quan_thue: string | null;
  tinh: string | null;
  /** Đã tra được bản ghi Tổng cục Thuế chưa. false: chỉ biết điều suy từ hình mã số. */
  da_tra: boolean;
  tra_luc: string | null;
  dieu_suy: DieuSuyTuMst[];
}

/** Đầu vào tối thiểu — khớp `HoSoCongTy` của `luat/doc-su-kien.ts` mà không phụ thuộc file đó. */
export interface DauVaoHoSoMst {
  mst: string | null;
  loai_theo_mst: 'ho_kinh_doanh' | 'doanh_nghiep' | null;
  theo_mst: { ten: string | null; dia_chi: string | null; co_quan_thue: string | null; trang_thai: string | null; tra_luc: string } | null;
}

const VI_SAO_TRANG_THAI: Partial<Record<TrangThaiDoanhNghiep, string>> = {
  dang_hoat_dong: 'Đang hoạt động: các kỳ khai thường áp dụng như bình thường.',
  tam_ngung: 'Tạm ngừng: kỳ nằm trọn trong thời gian tạm ngừng thì không phải khai — MIMI hỏi từng kỳ trong lịch bên dưới.',
  khong_o_dia_chi: 'Cơ quan thuế ghi không hoạt động tại địa chỉ đăng ký: MIMI không tự coi các kỳ khai là bắt buộc hay miễn — cần bạn xác nhận.',
  ngung_chua_dong_mst: 'Ngừng hoạt động nhưng chưa đóng mã số thuế: MIMI không tự coi các kỳ khai là bắt buộc hay miễn — cần bạn xác nhận.',
  da_dong_mst: 'Mã số thuế đã chấm dứt hiệu lực: MIMI không tự coi các kỳ khai là bắt buộc — cần bạn xác nhận.',
  chua_ro: 'MIMI chưa đọc được trạng thái — không suy ra nghĩa vụ từ dòng này.',
};

export function hoSoTheoMst(v: DauVaoHoSoMst): HoSoMst {
  const mst = v.mst?.replace(/\s/g, '') || null;
  const truc = !!mst && /^\d{10}-\d{3}$/.test(mst);
  const t = v.theo_mst;
  // Hình mã số thắng `loai_theo_mst` ở đúng một chỗ: đuôi -xxx chỉ đơn vị trực thuộc mới có.
  const loai: LoaiTheoHinhMst | null = truc ? 'don_vi_truc_thuoc' : v.loai_theo_mst;
  const tt = chuanHoaTrangThai(t?.trang_thai);
  const tinh = tinhTuDiaChi(t?.dia_chi);
  const dieu: DieuSuyTuMst[] = [];

  if (mst) {
    dieu.push({
      truong: 'mst', nhan: 'Mã số thuế', gia_tri: mst, nguon: 'hinh_ma_so',
      vi_sao: /^\d{12}$/.test(mst)
        ? 'Mã 12 số là số định danh cá nhân — chỉ hộ kinh doanh và cá nhân dùng thay mã số thuế.'
        : truc ? `Mã 10 số kèm đuôi "-${mst.slice(11)}" là mã của đơn vị trực thuộc đơn vị chủ quản ${mst.slice(0, 10)}.` : 'Mã 10 số là mã của doanh nghiệp, tổ chức.',
    });
  }
  if (loai) {
    dieu.push({
      truong: 'loai', nhan: 'Loại người nộp thuế', gia_tri: TEN_LOAI_THEO_MST[loai],
      nguon: truc || (!t && loai === 'ho_kinh_doanh') ? 'hinh_ma_so' : 'tong_cuc_thue',
      vi_sao: loai === 'ho_kinh_doanh'
        ? 'Hộ kinh doanh khai theo Nghị định 68/2026/NĐ-CP: thông báo doanh thu năm hoặc khai theo quý, tuỳ doanh thu.'
        : loai === 'doanh_nghiep'
          ? 'Doanh nghiệp tạm nộp TNDN theo quý và quyết toán năm (Nghị định 252/2026/NĐ-CP); kỳ khai GTGT theo tháng hoặc quý.'
          : 'Đơn vị trực thuộc có thể tự khai hoặc do đơn vị chủ quản khai thay tuỳ loại thuế — MIMI chưa có căn cứ đã đối chiếu để khẳng định, nên hỏi bạn ở lịch bên dưới.',
    });
  }
  if (t) {
    if (t.ten) dieu.push({ truong: 'ten', nhan: 'Tên đăng ký thuế', gia_tri: t.ten, nguon: 'tong_cuc_thue', vi_sao: 'Tên ghi trên tờ khai và giấy tờ gửi cơ quan thuế.' });
    dieu.push({
      truong: 'trang_thai', nhan: 'Trạng thái', gia_tri: tt.cau_goc ? `${TEN_TRANG_THAI[tt.trang_thai]} — "${tt.cau_goc}"` : TEN_TRANG_THAI[tt.trang_thai],
      nguon: 'tong_cuc_thue', vi_sao: VI_SAO_TRANG_THAI[tt.trang_thai] ?? '',
    });
    if (t.co_quan_thue) dieu.push({ truong: 'co_quan_thue', nhan: 'Cơ quan thuế quản lý', gia_tri: t.co_quan_thue, nguon: 'tong_cuc_thue', vi_sao: 'Nơi nhận tờ khai và nơi bạn nộp tiền thuế (chọn đúng cơ quan này trên Cổng dịch vụ công).' });
    if (tinh) dieu.push({ truong: 'tinh', nhan: 'Tỉnh/thành', gia_tri: tinh, nguon: 'tong_cuc_thue', vi_sao: 'Đọc từ đoạn cuối địa chỉ đăng ký thuế.' });
  }

  return {
    mst, ten: t?.ten ?? null, loai, don_vi_truc_thuoc: truc, mst_chu_quan: truc && mst ? mst.slice(0, 10) : null,
    trang_thai: tt.trang_thai, trang_thai_goc: tt.cau_goc, co_quan_thue: t?.co_quan_thue ?? null, tinh,
    da_tra: !!t, tra_luc: t?.tra_luc ?? null, dieu_suy: dieu,
  };
}
