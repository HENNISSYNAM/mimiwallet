/**
 * Hợp đồng dữ liệu giữa edge function `tro-ly` và màn MIMI Assistant.
 *
 * MỘT BẢN DUY NHẤT. Giao diện nhập lại chính file này (`src/lib/troLy.ts`), nên file
 * không được import gì — trình duyệt và Deno cùng đọc được.
 *
 * NGUYÊN TẮC. Mô hình (khi có) chỉ viết câu trả lời. Số liệu, bảng và đề xuất hành
 * động do mã của MIMI tính từ dữ liệu thật và kiểm quyền — mô hình không bịa được một
 * mã yêu cầu chi hay một con số vào đây.
 */

export type NhomNangLuc = 'tro_ly' | 'chi_phi' | 'chung_tu' | 'ngan_hang' | 'ai_token' | 'bao_cao' | 'ket_noi';

export const NHOM_NANG_LUC: readonly NhomNangLuc[] = ['tro_ly', 'chi_phi', 'chung_tu', 'ngan_hang', 'ai_token', 'bao_cao', 'ket_noi'];

export type DonVi = 'vnd' | 'usd' | 'token' | 'phan_tram' | 'so' | 'ngay' | 'chu';

export type O = number | string | null;

export interface MucSoLieu {
  nhan: string;
  gia_tri: O;
  don_vi: DonVi;
  ghi_chu?: string;
  can_chu_y?: boolean;
}

export type The =
  | { loai: 'so_lieu'; tieu_de: string; muc: MucSoLieu[] }
  /** `con_lai`: số dòng không hiện (bảng chỉ gửi vài dòng đầu). */
  | { loai: 'bang'; tieu_de: string; cot: { nhan: string; don_vi: DonVi }[]; dong: O[][]; con_lai?: number }
  | { loai: 'ghi_chu'; muc_do: 'can_chu_y' | 'thong_tin'; cau: string };

/**
 * Việc MIMI được phép ĐỀ XUẤT. Mỗi loại chạy bằng đúng backend đã có (tac-tu,
 * chi-phi-ai, bank-link, tro-ly), sau khi người dùng xác nhận trên màn hình.
 * Không có loại nào chuyển tiền: "duyệt" chỉ cho phép trả, người trả vẫn là người.
 */
export const LOAI_DE_XUAT = [
  'duyet_yeu_cau',
  'tu_choi_yeu_cau',
  'tam_dung_agent',
  'dong_bo_chi_phi_ai',
  'cap_nhat_bang_gia',
  'dong_bo_ngan_hang',
  'luu_chung_tu_quet',
  'mo_trang',
] as const;

export type LoaiDeXuat = (typeof LOAI_DE_XUAT)[number];

export interface DeXuat {
  /** Khoá ổn định trong một câu trả lời, để giao diện nhớ đề xuất nào đã làm. */
  khoa: string;
  loai: LoaiDeXuat;
  /** Chữ trên nút. */
  nhan: string;
  /** Câu nói rõ bấm xác nhận sẽ làm gì — hiện trong hộp xác nhận. */
  mo_ta: string;
  tham_so: Record<string, string | number | null>;
}

export interface NguonDuLieu {
  ten: string;
  mo_ta: string;
}

export interface TrangChiTiet {
  nhan: string;
  duong_dan: string;
}

export interface KetQuaNangLuc {
  nang_luc: string;
  nhom: NhomNangLuc;
  /** Tóm tắt bằng lời, dùng làm câu trả lời khi không có mô hình, và làm dữ liệu cho mô hình khi có. */
  tom_tat: string;
  the: The[];
  de_xuat: DeXuat[];
  nguon: NguonDuLieu[];
  trang: TrangChiTiet[];
}

export interface BuocXuLy {
  ten: 'hieu' | 'du_lieu' | 'phan_tich' | 'de_xuat';
  cau: string;
}

export interface TraLoi {
  cau: string;
  buoc: BuocXuLy[];
  ket_qua: KetQuaNangLuc[];
  /** `co_dinh`: chưa có mô hình, MIMI nhận câu hỏi bằng bộ luật và trả lời bằng câu dựng sẵn. */
  che_do: 'mo_hinh' | 'co_dinh';
}

export interface ViecHomNay {
  khoa: string;
  nhom: NhomNangLuc;
  cau: string;
  /** Câu hỏi gửi cho trợ lý khi người dùng bấm vào việc này. */
  hoi: string;
  muc_do: 'can_chu_y' | 'thong_tin';
}

export interface KetNoiHienThi {
  khoa: string;
  ten: string;
  loai: 'ngan_hang' | 'thue' | 'ai';
  trang_thai: 'dang_chay' | 'can_xu_ly' | 'chua_ket_noi' | 'chi_nhap_file';
  cau: string;
  duong_dan: string;
}

export interface BoiCanh {
  cong_ty: string | null;
  viec: ViecHomNay[];
  ket_noi: KetNoiHienThi[];
  /** Có mô hình hiểu câu tự do và đọc ảnh chứng từ hay không. */
  co_mo_hinh: boolean;
}

export interface KetQuaQuet {
  loai: 'hoa_don' | 'bien_lai' | 'khac';
  so_hoa_don: string | null;
  ky_hieu: string | null;
  ngay: string | null;
  ben_ban: string | null;
  ma_so_thue_ben_ban: string | null;
  tien_truoc_thue: number | null;
  tien_thue: number | null;
  tong_tien: number | null;
  /** Trường mô hình không đọc chắc — giao diện yêu cầu người dùng xem lại. */
  can_xem_lai: string[];
}
