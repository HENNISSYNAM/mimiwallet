/**
 * ĐIỂM SẴN SÀNG VAY VỐN (16/10/2026) — chủ doanh nghiệp tự xem hồ sơ dòng tiền của mình trông thế nào trước khi đi vay.
 *
 * KHÔNG PHẢI ĐIỂM TÍN DỤNG. Chấm điểm tín dụng cho bên thứ ba là hoạt động thông tin tín dụng, cần giấy phép của Ngân
 * hàng Nhà nước (Nghị định 58/2021/NĐ-CP); MIMI không có giấy phép đó, không đọc dữ liệu CIC, và chưa có dữ liệu nợ xấu
 * thật để kiểm định điểm này có dự báo được việc trả nợ hay không. Repo này từng gỡ một "điểm tín dụng 701" là số cứng
 * (docs/BAN_GIAO_MIMI.md). Nên điểm ở đây:
 *   - chỉ dành cho chính chủ doanh nghiệp xem, không gửi cho ai;
 *   - là phép cộng trọng số CÔNG KHAI của sáu yếu tố, mỗi yếu tố nói rõ cách tính và cách cải thiện;
 *   - tính trên dòng tiền ĐÃ LÀM SẠCH (tiền vay, góp vốn, người nhà, hoàn tiền bị loại) — một khoản vay cũ không làm
 *     hồ sơ trông đẹp hơn để đi vay khoản mới;
 *   - không tính khi chưa đủ 3 tháng đã khép sổ.
 * Trọng số là ĐỀ XUẤT minh hoạ của MIMI, chưa được kiểm định với dữ liệu vỡ nợ — câu này hiện cùng điểm.
 */

export interface DauVaoSanSang {
  /** Tiền vào kinh doanh đã làm sạch và tiền ra của các tháng ĐÃ KHÉP SỔ, cũ → mới. */
  thang: { khoa: string; vao: number; ra: number }[];
  cong_no_qua_han: number;
  /** Tỷ lệ tiền vào của khách lớn nhất trên tổng tiền vào đã làm sạch (0..1); null = không biết tên khách. */
  ty_le_khach_lon_nhat: number | null;
  /** Tiền vào bị nghi không phải doanh thu mà CHỦ CHƯA XÁC NHẬN, và tổng tiền vào (chưa làm sạch) cùng kỳ. */
  tien_nghi_chua_xac_nhan: number;
  tong_tien_vao: number;
}

export type KhoaYeuTo = 'lich_su' | 'dong_tien_rong' | 'on_dinh' | 'thu_no' | 'tap_trung' | 'minh_bach';

export interface YeuTo {
  khoa: KhoaYeuTo;
  diem: number;
  toi_da: number;
  /** Con số đứng sau điểm, đã viết thành chữ để người đọc hiểu. */
  gia_tri: string;
  /** Một câu: làm gì để tăng điểm này. Rỗng khi đã tối đa. */
  goi_y: string;
  /** Con số thô (số tháng, hoặc tỷ lệ 0..1) để giao diện tự viết câu theo ngôn ngữ; null = không đo được. */
  so: number | null;
}

export type MucSanSang = 'vung' | 'kha' | 'can_cai_thien';

export type KetQuaSanSang =
  | { co_diem: true; diem: number; muc: MucSanSang; yeu_to: YeuTo[]; so_thang: number }
  | { co_diem: false; ly_do: string; so_thang: number };

export const SO_THANG_TOI_THIEU = 3;
export const TRONG_SO: Record<KhoaYeuTo, number> = { lich_su: 20, dong_tien_rong: 25, on_dinh: 20, thu_no: 15, tap_trung: 10, minh_bach: 10 };

/** Nội suy tuyến tính, kẹp 0..1: x ở `xau` → 0, ở `tot` → 1 (xau có thể lớn hơn tot). */
const thang01 = (x: number, xau: number, tot: number) => Math.min(1, Math.max(0, (x - xau) / (tot - xau)));
const pt = (x: number) => `${Math.round(x * 100)}%`;

export function tinhDiemSanSang(v: DauVaoSanSang): KetQuaSanSang {
  const n = v.thang.length;
  if (n < SO_THANG_TOI_THIEU) {
    return { co_diem: false, so_thang: n, ly_do: `Cần ít nhất ${SO_THANG_TOI_THIEU} tháng sao kê đã khép sổ; hiện có ${n}. MIMI không chấm khi chưa đủ dữ liệu.` };
  }
  const vao = v.thang.map((t) => t.vao);
  const tbVao = vao.reduce((s, x) => s + x, 0) / n;
  const tbRa = v.thang.reduce((s, t) => s + t.ra, 0) / n;
  const rong = tbVao - tbRa;
  const bienRong = tbVao > 0 ? rong / tbVao : -1;
  const lech = Math.sqrt(vao.reduce((s, x) => s + (x - tbVao) ** 2, 0) / n);
  const cv = tbVao > 0 ? lech / tbVao : 1;
  const tyNo = tbVao > 0 ? v.cong_no_qua_han / tbVao : (v.cong_no_qua_han > 0 ? 1 : 0);
  const tyNghi = v.tong_tien_vao > 0 ? v.tien_nghi_chua_xac_nhan / v.tong_tien_vao : 0;

  const yeu: YeuTo[] = [];
  const them = (khoa: KhoaYeuTo, ty: number, gia_tri: string, goi_y: string, so: number | null) => {
    const diem = Math.round(TRONG_SO[khoa] * ty);
    yeu.push({ khoa, diem, toi_da: TRONG_SO[khoa], gia_tri, goi_y: diem >= TRONG_SO[khoa] ? '' : goi_y, so });
  };
  them('lich_su', thang01(n, SO_THANG_TOI_THIEU - 1, 12), `${n} tháng sao kê đã khép sổ`, 'Kết nối hoặc tải thêm sao kê cũ — bên cho vay thường xem 6–12 tháng.', n);
  them('dong_tien_rong', thang01(bienRong, -0.1, 0.15), `Dòng tiền ròng ${pt(bienRong)} tiền vào mỗi tháng`, 'Dòng tiền ròng dương và đều là điều đầu tiên bên cho vay xem; giảm chi cố định hoặc thu nợ trước.', bienRong);
  them('on_dinh', thang01(cv, 0.6, 0.15), `Tiền vào lệch trung bình ${pt(cv)} giữa các tháng`, 'Doanh thu càng đều càng dễ vay; hợp đồng định kỳ hoặc khách thường xuyên giúp giảm dao động.', cv);
  them('thu_no', thang01(tyNo, 0.5, 0), `Công nợ quá hạn bằng ${pt(tyNo)} tiền vào một tháng`, 'Nhắc khách trả hoá đơn quá hạn — vừa có tiền, vừa đẹp hồ sơ.', tyNo);
  if (v.ty_le_khach_lon_nhat === null) them('tap_trung', 0.5, 'Chưa biết tên người trả tiền để đo', 'Sao kê có tên người chuyển giúp đo mức phụ thuộc vào một khách.', null);
  else them('tap_trung', thang01(v.ty_le_khach_lon_nhat, 0.6, 0.2), `Khách lớn nhất chiếm ${pt(v.ty_le_khach_lon_nhat)} tiền vào`, 'Phụ thuộc một khách là rủi ro bên cho vay trừ điểm; mở thêm khách giúp hồ sơ vững hơn.', v.ty_le_khach_lon_nhat);
  them('minh_bach', thang01(tyNghi, 0.2, 0), tyNghi > 0 ? `${pt(tyNghi)} tiền vào là khoản nghi chưa xác nhận` : 'Mọi khoản nghi đã được bạn xác nhận', 'Xác nhận các khoản MIMI chỉ ra (vay, người nhà, góp vốn) để doanh thu trên hồ sơ là số thật.', tyNghi);

  const diem = yeu.reduce((s, y) => s + y.diem, 0);
  const muc: MucSanSang = diem >= 75 ? 'vung' : diem >= 50 ? 'kha' : 'can_cai_thien';
  return { co_diem: true, diem, muc, yeu_to: yeu, so_thang: n };
}

export const TEN_YEU_TO: Record<KhoaYeuTo, string> = {
  lich_su: 'Độ dài lịch sử', dong_tien_rong: 'Dòng tiền ròng', on_dinh: 'Độ ổn định doanh thu',
  thu_no: 'Kỷ luật thu nợ', tap_trung: 'Phụ thuộc khách lớn', minh_bach: 'Doanh thu đã xác nhận',
};
export const TEN_MUC: Record<MucSanSang, string> = { vung: 'Hồ sơ dòng tiền vững', kha: 'Khá — còn chỗ cải thiện', can_cai_thien: 'Nên cải thiện trước khi vay' };
export const LOI_KHONG_PHAI_DIEM_TIN_DUNG =
  'Không phải điểm tín dụng: MIMI không đọc dữ liệu CIC, không gửi điểm cho ai, không cho vay. Trọng số là đề xuất minh hoạ, chưa kiểm định với dữ liệu trả nợ thật; mỗi bên cho vay có tiêu chí riêng.';
