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

import type { VaiTro } from '../quyen/vai-tro.ts';

export type NhomNangLuc = 'tro_ly' | 'chi_phi' | 'chung_tu' | 'ngan_hang' | 'ai_token' | 'bao_cao' | 'ket_noi';

export const NHOM_NANG_LUC: readonly NhomNangLuc[] = ['tro_ly', 'chi_phi', 'chung_tu', 'ngan_hang', 'ai_token', 'bao_cao', 'ket_noi'];

export type DonVi = 'vnd' | 'usd' | 'token' | 'phan_tram' | 'so' | 'ngay' | 'chu';

export type O = number | string | null;

/**
 * MIMI-P1-001 — bằng chứng đứng sau một con số: đúng những bản ghi đã cộng vào nó.
 * `id` có thể bị cắt (xem `so_ban_ghi`); `ma_bam` chụp nội dung tập bản ghi lúc trả lời, để sau
 * này dữ liệu đổi thì biết câu trả lời cũ không còn khớp.
 */
export type LoaiBangChung =
  | 'giao_dich' | 'hoa_don_vao' | 'hoa_don_ban' | 'yeu_cau_chi' | 'chung_tu_quet'
  | 'chi_phi_ai' | 'token_ai' | 'van_ban_luat';

export interface BangChung {
  loai: LoaiBangChung;
  id: string[];
  so_ban_ghi: number;
  ma_bam?: string;
}

export interface MucSoLieu {
  nhan: string;
  gia_tri: O;
  don_vi: DonVi;
  ghi_chu?: string;
  can_chu_y?: boolean;
  /** MIMI-P1-001: bản ghi đứng sau con số này. Thiếu = con số suy ra từ số khác hoặc từ luật. */
  bang_chung?: BangChung[];
}

export type The =
  | { loai: 'so_lieu'; tieu_de: string; muc: MucSoLieu[] }
  /** `con_lai`: số dòng không hiện (bảng chỉ gửi vài dòng đầu). */
  | { loai: 'bang'; tieu_de: string; cot: { nhan: string; don_vi: DonVi }[]; dong: O[][]; con_lai?: number; bang_chung?: BangChung[] }
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

/**
 * MIMI-P0-002: độ đầy đủ của một nguồn dữ liệu đứng sau câu trả lời.
 * `partial` = truy vấn bị cắt; `stale` = đồng bộ đã cũ; `unavailable` = chưa có kết nối (không phải số 0).
 */
export type TrangThaiDoDay = 'complete' | 'partial' | 'stale' | 'unavailable';

export interface DoDayNguon {
  nguon: string;
  ten: string;
  row_count: number;
  total_available: number | null;
  truncated: boolean;
  period_from: string | null;
  period_to: string | null;
  last_synced_at: string | null;
  coverage_status: TrangThaiDoDay;
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
  /** Độ đầy đủ của từng nguồn năng lực này đã đọc. Rỗng khi năng lực không đọc CSDL. */
  do_day?: DoDayNguon[];
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
  /** Trạng thái xấu nhất trong mọi nguồn đã đọc cho câu trả lời này. */
  do_day: TrangThaiDoDay;
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

/** Ba thẻ "MIMI vừa phân tích cho bạn" ở màn đầu — tính từ dữ liệu thật, không có thì null/rỗng. */
export interface PhanTichNhanh {
  chi_phi_ai: null | {
    thang_nay_usd: number;
    /** So với cùng kỳ tháng trước; null khi tháng trước chưa có số. */
    thay_doi_phan_tram: number | null;
    ngan_sach_usd: number | null;
    phan_tram_ngan_sach: number | null;
    /** 5 tháng gần nhất, cũ trước. `usd` null = tháng đó chưa có số liệu (không phải 0). */
    theo_thang: { khoa: string; nhan: string; usd: number | null }[];
  };
  toi_uu: { y: string[]; tiet_kiem_usd: number | null; hoi: string };
  can_xac_nhan: {
    so_khoan: number;
    tong_tien: number;
    muc: { yeu_cau_id: string; muc_dich: string; nguoi_nhan: string; agent: string; so_tien: number; ngay: string; duyet: DeXuat | null }[];
  };
}

/**
 * Phần thuế của màn đầu — nền cho cá nhân hoá.
 *
 * `co_ho_so` false nghĩa là người dùng chưa trả lời khảo sát đầu vào (tư cách nộp thuế, ngành),
 * nên màn đầu hỏi trước khi kết luận: ngành khác nhau thì mẫu tờ khai khác nhau.
 */
export interface ThueManDau {
  co_ho_so: boolean;
  ho_so: {
    loai_nguoi_nop: 'ho_kinh_doanh' | 'doanh_nghiep' | null;
    nhom_nganh: string[];
    kenh: string | null;
    phuong_phap_tncn: 'doanh_thu' | 'thu_nhap' | null;
    bat_dau_kinh_doanh: string | null;
    da_nop_thue_trong_nam: boolean | null;
    nganh_dac_thu: string | null;
    doanh_thu_nam_truoc: number | null;
    co_quan_he_lien_ket: boolean | null;
  };
  nam: number;
  doanh_thu_nam: number | null;
  nguon_doanh_thu: 'hoa_don_dien_tu' | 'ngan_hang' | 'tu_khai' | null;
  tam_tinh: boolean;
  quy_vuot: number | null;
  nghia_vu: { id: string; cau: string; mau: string | null; han: string | null }[];
  thieu: { truong: string; cau: string }[];
}

export interface BoiCanh {
  cong_ty: string | null;
  viec: ViecHomNay[];
  ket_noi: KetNoiHienThi[];
  phan_tich: PhanTichNhanh;
  /** null khi chưa đọc được hồ sơ thuế (lỗi đọc, không phải "chưa có hồ sơ"). */
  thue: ThueManDau | null;
  /** Có mô hình hiểu câu tự do và đọc ảnh chứng từ hay không. */
  co_mo_hinh: boolean;
  /** MIMI-P1-003: vai trò của người đang đăng nhập trong công ty này (bản máy chủ cũ không gửi). */
  vai_tro?: VaiTro;
  cong_ty_id?: string;
  /** Các công ty người dùng thuộc về, để đổi công ty đang làm việc. */
  cong_ty_cua_toi?: { id: string; ten: string | null; vai_tro: VaiTro }[];
  /** MIMI-P0-002: độ đầy đủ của các nguồn màn đầu đã đọc. Bản máy chủ cũ không gửi. */
  do_day?: DoDayNguon[];
  do_day_chung?: TrangThaiDoDay;
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
